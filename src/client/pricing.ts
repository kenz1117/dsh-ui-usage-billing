/**
 * Billing engine: per-model price tables and token-usage cost estimation.
 *
 * Each model's price table uses its NATIVE currency: domestic providers
 * (DeepSeek, 智谱, 通义…) publish RMB prices and store them directly;
 * overseas providers (OpenAI, Google, xAI, Meta) publish USD.
 * Cost is always computed and displayed in CNY — only USD-priced models go
 * through the exchange rate, never domestic ones.
 *
 * Google-style two-band billing is modeled per model: Gemini's Flex tier
 * prices spare-capacity traffic at -50%; DeepSeek splits peak
 * (weekdays 09:00-12:00 / 14:00-18:00 Beijing) at 2x the off-peak rate —
 * weekends (Sat/Sun, Beijing) are charged at the off-peak rate all day.
 * The estimator mixes both bands by a configured peak share ({@link DEFAULT_PEAK_SHARE}).
 *
 * Time-limited launch promos ({@link PricePromo}) never mutate the catalog:
 * entries keep list price and a promo window; the estimator and the rate
 * table apply the discount factor until the deadline, then auto-revert.
 */

import type { ExtraModelPrice, LivePrice, LivePricing } from '../pricing-shared.ts'
import { FALLBACK_RATES } from './plan-knowledge.ts'

/**
 * USD → CNY rate for display. Source: China Foreign Exchange Trade System
 * mid-rate 6.7878 on 2026-08-14; rounded to 6.79. Only applies to overseas
 * USD-priced models — domestic models never pass through this rate.
 * The node half may refresh this at boot via `/api/billing/pricing`; until a
 * live rate arrives the built-in value stays in force.
 */
export const USD_TO_CNY = 6.79

/** 运行时实时覆盖：undefined = 用内置目录与内置汇率（默认值降级）。 */
let liveRate: number | undefined
let livePrices: Readonly<Record<string, LivePrice>> | undefined
let liveExtraModels: readonly ExtraModelPrice[] | undefined
let liveCatalogModels: readonly CatalogModel[] | undefined

/**
 * 用户自定义单价（设置面板录入，localStorage 持久化）：覆盖内置/models.dev/
 * dsh-spend 的全部价格来源，用于新模型上线目录未跟、或厂商未公布按量价的场景。
 * 仅在客户端显示层生效——聚合发生在宿主进程，折叠时的成本仍按内置目录计算，
 * 客户端检测到用户价后对受影响视图做显示重估（见 UsageBilling 的 recost）。
 */
export interface UserPrice {
  /** 未命中输入单价（元或美元 / 每百万 token）。 */
  input: number
  /** 缓存命中输入单价。 */
  cacheHit: number
  /** 输出单价。 */
  output: number
  /** 计价币种；缺省 CNY。 */
  currency?: 'CNY' | 'USD'
  /** 低谷档三桶（元或美元 / 每百万 token）；缺省 = 平档（峰谷同价）。 */
  offPeak?: { input: number; cacheHit: number; output: number }
}

/** 一条用户自定义价：绑定「模型（计费目录键）+ 可选来源（中转站 origin）」。
 *  origin 缺省 = 该模型的默认价；带 origin = 仅该中转站的同名模型用此价。 */
export interface UserPriceEntry extends UserPrice {
  /** 计费目录键（如 `flash`、`minimax-m2.7`）。 */
  key: string
  /** 绑定来源（中转站 origin，如 `https://api.my-relay.com`）；缺省 = 默认价。 */
  origin?: string
}

let userPrices: Readonly<UserPriceEntry[]> | undefined

/**
 * 中转站 origin 宽松匹配：双方规范化到 `protocol://host[:port]` 后比较。
 * 宿主侧站点桶的 origin 来自 `new URL(baseURL).origin`，用户手填的来源常缺
 * 协议、带路径或尾斜杠——精确全等会让自定义价静默失效（issue #18）。
 * 规范化失败（无法解析成 URL）时回退小写去尾斜杠的字面比较。
 * @param a - 用户录入的来源（可缺协议/带路径）。
 * @param b - 宿主站点桶的 origin（`new URL().origin` 形态）。
 */
/**
 * 把用户手填的中转站来源规范化为 `protocol://host[:port]` 形态：缺协议补
 * `https://`、带路径取 origin。无法解析时回退小写去尾斜杠的字面值。
 * 与 {@link originsMatch} 的比较口径一致——保存前规范化一次，匹配时双向兜底。
 * @param raw - 用户录入的来源（可缺协议/带路径）。
 */
export function normalizeOriginInput(raw: string): string {
  const withProto = /:\/\//.test(raw) ? raw : `https://${raw}`
  try {
    return new URL(withProto).origin
  } catch {
    return raw.trim().toLowerCase().replace(/\/+$/, '')
  }
}

export function originsMatch(a: string, b: string): boolean {
  return normalizeOriginInput(a) === normalizeOriginInput(b)
}

/**
 * 注入用户自定义单价列表。每条含模型目录键 + 可选来源（origin）。空数组 = 清除全部
 * 自定义价，回退内置目录。
 * @param entries - 用户自定义价条目（列表）。
 */
export function applyUserPrices(entries: Readonly<UserPriceEntry[]>): void {
  userPrices = entries.length > 0 ? entries : undefined
}

/** 当前生效的用户自定义价条目（设置面板回显用）；未设置时 undefined。 */
export function getUserPrices(): Readonly<UserPriceEntry[]> | undefined {
  return userPrices
}

/** 精确键 → 归一化键两跳解析（复用 {@link resolveCatalogKey}）。 */
function resolvePriceKey(key: string): string {
  return resolveCatalogKey(key)
}

/**
 * 查一个模型（可选来源）的用户自定义价：优先「模型×来源」精确命中；无来源匹配时
 * 回落该模型的无来源默认价；再无则 undefined（走内置目录）。
 * @param key - 计费目录键。
 * @param origin - 调用来源（中转站 origin）；缺省仅查默认价。
 */
export function userPriceOf(key: string, origin?: string): UserPrice | undefined {
  const entry = userPriceEntryOf(key, origin)
  if (entry === undefined) return undefined
  return {
    input: entry.input,
    cacheHit: entry.cacheHit,
    output: entry.output,
    ...(entry.currency === undefined ? {} : { currency: entry.currency }),
    ...(entry.offPeak === undefined ? {} : { offPeak: entry.offPeak }),
  }
}

/**
 * 查一个模型（可选来源）的完整用户价条目（含 origin 绑定信息）。
 * 匹配优先级：origin 宽松精确命中（模型×来源）→ 无来源默认价。
 * @param key - 计费目录键。
 * @param origin - 调用来源（中转站 origin）；缺省仅查默认价。
 */
export function userPriceEntryOf(key: string, origin?: string): UserPriceEntry | undefined {
  if (userPrices === undefined) return undefined
  const resolved = resolvePriceKey(key)
  const canon = canonModelId(resolved)
  const modelHit = (entry: UserPriceEntry): boolean =>
    resolvePriceKey(entry.key) === resolved || canonModelId(entry.key) === canon
  // 带来源的精确命中：entry.key 归一化后匹配，且来源宽松一致（issue #18）。
  if (origin !== undefined) {
    for (const entry of userPrices) {
      if (entry.origin === undefined || entry.origin === '') continue
      if (modelHit(entry) && originsMatch(entry.origin, origin)) return entry
    }
  }
  // 无来源默认价：匹配模型名的无 origin 条目。
  for (const entry of userPrices) {
    if (entry.origin !== undefined && entry.origin !== '') continue
    if (modelHit(entry)) return entry
  }
  return undefined
}

/**
 * 查一个模型的「带来源」用户价条目（无视来源值，取第一条命中模型名的
 * 带 origin 条目）。供 recost 在三维站点数据缺失时兜底：用户填了来源价
 * 就按它重估，而不是静默回退宿主原价（issue #18）。
 * @param key - 计费目录键。
 */
export function userOriginPriceEntryOf(key: string): UserPriceEntry | undefined {
  if (userPrices === undefined) return undefined
  const resolved = resolvePriceKey(key)
  const canon = canonModelId(resolved)
  return userPrices.find(entry =>
    entry.origin !== undefined && entry.origin !== ''
    && (resolvePriceKey(entry.key) === resolved || canonModelId(entry.key) === canon))
}

/**
 * Apply the node half's live pricing snapshot. Absent fields keep the
 * built-in catalog and rate; callers never fabricate values.
 * @param pricing - the `/api/billing/pricing` response.
 */
export function applyLivePricing(pricing: LivePricing): void {
  // 实时汇率来自 HTTP 响应（wire 边界）：只接受有限正数，异常值（0/NaN/负）保留内置值，
  // 避免所有 USD 模型计价被算成 0 或 NaN。
  liveRate = typeof pricing.rate === 'number' && Number.isFinite(pricing.rate) && pricing.rate > 0
    ? pricing.rate
    : undefined
  livePrices = pricing.prices
  liveExtraModels = pricing.extraModels
}

/**
 * 注入探活得到的「系统里实际配置/预制的模型」清单（host 的 llm.models 返回
 * groups[].models[]，含模型 id/name，无价格）。费率表据此对标现实可用模型——
 * 有价的补价（内置目录 / models.dev 补充），无价的标「未收录」。纯内存状态，
 * 供 `catalogEntries()` 渲染。
 */
export function applyLiveCatalogModels(models: readonly CatalogModel[]): void {
  liveCatalogModels = models
}

/** 探活模型清单条目（host 的 ModelCatalogModel 投影出需要的字段）。 */
export interface CatalogModel {
  /** 模型 id（如 `deepseek-v4-flash`）。 */
  id: string
  /** 显示名；缺省用 id。 */
  name?: string
  /** 厂商显示名（探活 group 名）。 */
  provider: string
}

/** 当前汇率：实时覆盖优先，缺省回退内置固定值。 */
function currentRate(): number {
  return liveRate ?? USD_TO_CNY
}

/**
 * 当前生效的 USD → CNY 汇率及其来源：live = 启动时实时拉取成功，
 * builtin = 实时拉取失败、正在用内置默认值。
 */
export function getRateInfo(): { rate: number; live: boolean } {
  return { rate: currentRate(), live: liveRate !== undefined }
}

/** Default share of traffic assumed to fall in the peak band (0..1). */
export const DEFAULT_PEAK_SHARE = 0.5

/** 计费时段档位：高峰 / 空闲（官方 DeepSeek 刊例价：高峰 = 空闲 × 2）。 */
export type PriceTierId = 'peak' | 'offPeak'

/** 成本显示币种：人民币（国内模型直价）/ 美元（国外模型直价或换算显示）。 */
export type CostCurrency = 'cny' | 'usd'

/**
 * 工作日高峰时段判定（北京时间，UTC+8，无夏令时）：09:00–12:00、14:00–18:00。
 * 周末（周六/周日）北京全天为低谷，不调用本函数判定峰/平。
 * @param beijingHour - 北京时间的小时数（0–23）。
 */
export function isPeakHour(beijingHour: number): boolean {
  return (beijingHour >= 9 && beijingHour < 12) || (beijingHour >= 14 && beijingHour < 18)
}

/**
 * 由时刻（epoch 毫秒）推断计费时段；时刻未知/非法时按高峰计（保守：未知
 * 时刻不低估成本，与社区 dsh-usage-chart 的 tierAt 语义一致）。
 * 周末（北京时间周六/周日）全天不区分峰谷，统一按低谷价。
 * @param timeMs - Unix epoch 毫秒；null/undefined/NaN 视为未知。
 */
export function tierAt(timeMs: number | null | undefined): PriceTierId {
  if (timeMs === null || timeMs === undefined || !Number.isFinite(timeMs)) return 'peak'
  if (isBeijingWeekend(timeMs)) return 'offPeak'
  const beijingHour = (new Date(timeMs).getUTCHours() + 8) % 24
  return isPeakHour(beijingHour) ? 'peak' : 'offPeak'
}

/** 时刻是否落在北京时间周末（周六/周日）。 */
function isBeijingWeekend(timeMs: number): boolean {
  const day = new Date(timeMs + 8 * 3_600_000).getUTCDay()
  return day === 0 || day === 6
}

/** 距下一个工作日（周一）北京时间 09:00 峰时的毫秒数：周末全天低谷的下一档。 */
function nextWeekdayPeakInMs(nowMs: number): number {
  const bj = new Date(nowMs + 8 * 3_600_000)
  const day = bj.getUTCDay()
  const elapsed = bj.getUTCHours() * 3_600_000 + bj.getUTCMinutes() * 60_000 + bj.getUTCSeconds() * 1_000 + bj.getUTCMilliseconds()
  // 到周一：周日(0)=1 天、周六(6)=2 天。
  const toMonday = day === 0 ? 1 : 2
  return toMonday * 86_400_000 - elapsed + 9 * 3_600_000
}

/** 峰谷切换边界（北京时间的当日分钟数）：09:00 / 12:00 / 14:00 / 18:00。 */
const TIER_BOUNDARY_MINUTES: readonly number[] = [540, 720, 840, 1080]

/** 北京时间的当日毫秒数（0–86,400,000）。 */
function beijingMillisOfDay(timeMs: number): number {
  return (((timeMs + 8 * 3_600_000) % 86_400_000) + 86_400_000) % 86_400_000
}

/**
 * 当前峰谷档位与距下次切换的时长。导出供测试：纯函数。
 * @param nowMs - 当前时刻（epoch 毫秒）。
 * @returns 当前档位与到下一个切换边界的毫秒数。
 */
export function tierCountdown(nowMs: number): { tier: PriceTierId; nextSwitchInMs: number } {
  // 周末全天低谷：没有日内切换，下一档是下个工作日（周一）09:00 的峰时。
  if (isBeijingWeekend(nowMs)) {
    return { tier: 'offPeak', nextSwitchInMs: nextWeekdayPeakInMs(nowMs) }
  }
  const dayMs = beijingMillisOfDay(nowMs)
  for (const boundary of TIER_BOUNDARY_MINUTES) {
    const boundaryMs = boundary * 60_000
    if (dayMs < boundaryMs) {
      return { tier: tierAt(nowMs), nextSwitchInMs: boundaryMs - dayMs }
    }
  }
  // 18:00 之后：下一边界是明天 09:00（TIER_BOUNDARY_MINUTES[0] 首项）。
  const firstBoundary = TIER_BOUNDARY_MINUTES[0] ?? 0
  return { tier: tierAt(nowMs), nextSwitchInMs: 86_400_000 - dayMs + firstBoundary * 60_000 }
}

/**
 * 峰/谷切换预告：距下次切换不足 leadMs 时返回即将进入的档位与切换时刻，
 * 否则 null。导出供测试：纯函数。
 * @param nowMs - 当前时刻（epoch 毫秒）。
 * @param leadMs - 提前量（毫秒）。
 */
export function upcomingTierSwitch(nowMs: number, leadMs: number): { entering: PriceTierId; atMs: number } | null {
  const { nextSwitchInMs } = tierCountdown(nowMs)
  if (nextSwitchInMs > leadMs) return null
  const atMs = nowMs + nextSwitchInMs
  // 边界另一侧的档位即即将进入的档位（边界时刻本身按新档位计）。
  return { entering: tierAt(atMs), atMs }
}

/**
 * 切换倒计时短格式：`1h23m` / `45m` / `3m`。导出供测试：纯函数。
 * @param ms - 剩余毫秒数。
 */
export function formatSwitchCountdown(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return hours > 0 ? `${hours}h${String(rest).padStart(2, '0')}m` : `${rest}m`
}

/** Usage buckets consumed by one model (counts in raw tokens). */
export interface TokenUsageBuckets {
  /** Uncached input tokens. */
  input: number
  /** Cache-hit input tokens. */
  cacheHit: number
  /** Cache-miss input tokens (already included in `input` by some providers). */
  cacheMiss: number
  /** Output tokens. */
  output: number
}

/** Per-1M-token price in the model's native currency for one billing band. */
export interface PriceBand {
  /** Input (uncached) price per 1M tokens. */
  input: number
  /** Cache-hit input price per 1M tokens. */
  cacheHit: number
  /** Cache-miss input price per 1M tokens (absent when folded into `input`). */
  cacheMiss?: number
  /** Output price per 1M tokens. */
  output: number
}

/** A model's price table, optionally split into peak/off-peak bands. */
export interface ModelPrice extends PriceBand {
  /** 计价币种：国内模型直接人民币（CNY），国外模型美元（USD）。 */
  currency: 'CNY' | 'USD'
  /** Off-peak band (Gemini Flex / DeepSeek 低谷档); absent = flat pricing. */
  offPeak?: PriceBand
}

/**
 * 限时促销窗口（新模型上线折扣等厂商营销活动）：生效期内该条目所有档位
 * （主档与 offPeak）单价按 factor 折扣计价与显示，截止时刻起自动恢复刊例价。
 */
export interface PricePromo {
  /** 折扣系数（0.5 = 五折）；仅 (0,1) 区间有效，非法值视为无促销。 */
  factor: number
  /**
   * 截止时刻（epoch ms）：该时刻及之后恢复刊例价。缺省表示厂商未公布截止日
   * 的长期活动（如「限时 5 折直至另行通知」），持续生效直至收到公告后补填。
   */
  endsAtMs?: number
  /** 展示备注（如「限时 5 折至 …」），供界面提示活动性质。 */
  note?: string
}

/**
 * 附加计价行（纯展示参考价）：承载主三桶之外的厂商计价维度，如 Batch
 * 半价档、显式缓存创建/命中等。不参与估算计费——用量统计源只有
 * input/cacheHit/cacheMiss/output 四桶，无 batch 与显式缓存维度可区分。
 */
export interface PriceRow {
  /** 行标签（沿用目录单语风格，直接中文）。 */
  label: string
  /** 输入侧单价（元或美元 / 每百万 token）；缺省显示 —。 */
  input?: number
  /** 输出侧单价；缺省显示 —。 */
  output?: number
  /** 补充说明（如与标准价的关系）。 */
  note?: string
}

/**
 * 分档计价语义：厂商把「主档 / 低价档」的划分依据不同，界面需区分标注。
 * - `timeOfDay`（缺省）：按调用时刻分档（DeepSeek 峰谷时段），档位是客观的；
 * - `latency`：按用户选择的延迟档分档（Gemini Standard/Flex，Flex 半价换 1-15
 *   分钟延迟），与时刻无关；逐调用无法从日志判定实际档位，成本按比例估算。
 */
export type TierSemantics = 'timeOfDay' | 'latency'

/** One catalog entry: identity, brand color token, and price. */
export interface ModelEntry {
  /** Model key used by `.dsh-usage-stats.json` `byModel`. */
  key: string
  /** Human-readable model name. */
  name: string
  /** Provider label. */
  provider: string
  /** CSS variable name (without the leading `--`) used as the brand accent. */
  colorVar: string
  /** Price table (peak band when a split exists). */
  price: ModelPrice
  /** Peak-hour window label for time-of-day priced models. */
  peakHours?: string
  /** 分档语义；缺省 = 按时段（timeOfDay）。 */
  tierSemantics?: TierSemantics
  /**
   * 限时促销：生效期内 price 各档位按 factor 打折，过期自动恢复。
   * price 表本身永远保存刊例价，促销只在计价/显示出口处折算，不回写目录。
   */
  promo?: PricePromo
  /** 附加计价行（Batch / 显式缓存等展示性参考价），费率表在该模型行下方列出。 */
  extraRows?: readonly PriceRow[]
  /**
   * 单价为估算价：厂商未公布按量官方单价（公测 / 套餐制），表内价格为估算，
   * 展示时标注以免误当正式定价；正式定价公布后移除。
   */
  estimated?: boolean
  /** 探活命中但无内置/models.dev 价：费率表标「未收录」，不参与计价。 */
  uncatalogued?: boolean
  /** 该条目当前按用户自定义单价计价（设置面板可维护）；费率表标注「自定义」。 */
  userPriced?: boolean
}

/**
 * Built-in catalog of current mainstream models as of 2026-08-16, priced from
 * each provider's official price page. Domestic providers are OpenAI-API
 * compatible and publish RMB prices directly; overseas providers publish USD
 * and convert through the exchange rate at estimate time. Retired models
 * (GPT-4o family, Gemini 2.x, GLM-4.x-lite, older Qwen) are deliberately
 * absent, as are Anthropic Claude models (their native API is not
 * OpenAI-compatible, so the harness cannot drive them directly). DeepSeek
 * keys match the harness stats file so real usage prices from the catalog;
 * unknown keys fall back to `other`.
 *
 * Time-of-day billing (peak/off-peak) is now real: DeepSeek V4 officially
 * splits peak (09:00-12:00 / 14:00-18:00 Beijing) at 2x the off-peak rate
 * from 2026-08-17, and Gemini's Flex tier discounts spare-capacity traffic.
 */
export const MODEL_CATALOG: readonly ModelEntry[] = [
  // DeepSeek — V4 peak/off-peak rates (cloud.tencent.com TokenHub 2026-08-14),
  // RMB per 1M tokens: peak / off-peak (50%).
  {
    key: 'flash',
    name: 'DeepSeek V4 Flash',
    provider: 'DeepSeek',
    colorVar: 'dsw-static-blue-500',
    price: {
      currency: 'CNY',
      input: 3,
      cacheHit: 0.1,
      output: 9,
      offPeak: { input: 1.5, cacheHit: 0.05, output: 4.5 },
    },
    peakHours: '09:00-12:00 / 14:00-18:00',
  },
  {
    key: 'flash-vision-exp',
    name: 'DeepSeek V4 Flash Vision (Exp)',
    provider: 'DeepSeek',
    colorVar: 'dsw-static-blue-500',
    price: {
      currency: 'CNY',
      input: 3,
      cacheHit: 0.1,
      output: 9,
      offPeak: { input: 1.5, cacheHit: 0.05, output: 4.5 },
    },
    peakHours: '09:00-12:00 / 14:00-18:00',
  },
  {
    key: 'pro',
    name: 'DeepSeek V4 Pro',
    provider: 'DeepSeek',
    colorVar: 'dsw-static-deepseek-500',
    price: {
      currency: 'CNY',
      input: 9,
      cacheHit: 0.3,
      output: 27,
      offPeak: { input: 4.5, cacheHit: 0.15, output: 13.5 },
    },
    peakHours: '09:00-12:00 / 14:00-18:00',
  },
  // 智谱 GLM (OpenAI-compatible, 腾讯云 TokenHub 官方价 2026-08-14).
  {
    key: 'glm',
    name: 'GLM-5.2',
    provider: '智谱 AI',
    colorVar: 'dsw-static-blue-600',
    price: { currency: 'CNY', input: 8, cacheHit: 2, output: 28 },
  },
  {
    key: 'glm-5.3',
    name: 'GLM-5.3',
    provider: '智谱 AI',
    colorVar: 'dsw-static-blue-500',
    price: { currency: 'CNY', input: 8, cacheHit: 2, output: 28 },
  },
  {
    key: 'glm-5.3-flash',
    name: 'GLM-5.3-Flash',
    provider: '智谱 AI',
    colorVar: 'dsw-static-blue-300',
    // 官方刊例价（元 / 每百万 token）：输入 ¥0.8（未命中）/ ¥0.23（命中）/ 输出 ¥2.8。
    price: { currency: 'CNY', input: 0.8, cacheHit: 0.23, output: 2.8 },
    // 上线限时 5 折，至北京时间 2026-09-09 00:00（= 2026-09-08T16:00Z）；到期自动恢复刊例价。
    promo: { factor: 0.5, endsAtMs: Date.UTC(2026, 8, 8, 16, 0, 0), note: '限时 5 折' },
  },
  {
    key: 'glm-4.6',
    name: 'GLM-4.6',
    provider: '智谱 AI',
    colorVar: 'dsw-static-blue-400',
    price: { currency: 'CNY', input: 4, cacheHit: 0.8, output: 16 },
  },
  // 智谱 GLM 其余按量价（元 / 每百万 token，≤32K 档，官方 open.bigmodel.cn / 百炼）。
  {
    key: 'glm-4.5-air',
    name: 'GLM-4.5-Air',
    provider: '智谱 AI',
    colorVar: 'dsw-static-blue-300',
    price: { currency: 'CNY', input: 0.8, cacheHit: 0.16, output: 2 },
  },
  {
    key: 'glm-4.7',
    name: 'GLM-4.7',
    provider: '智谱 AI',
    colorVar: 'dsw-static-blue-400',
    price: { currency: 'CNY', input: 4, cacheHit: 1, output: 16 },
    // GLM-4.7 无公开按量价：按其在 coding-plan 的抵扣系数相对 GLM-5-Turbo 的比例估算。
    estimated: true,
  },
  {
    key: 'glm-5-turbo',
    name: 'GLM-5-Turbo',
    provider: '智谱 AI',
    colorVar: 'dsw-static-blue-500',
    price: { currency: 'CNY', input: 5, cacheHit: 1.2, output: 22 },
  },
  {
    key: 'glm-5.1',
    name: 'GLM-5.1',
    provider: '智谱 AI',
    colorVar: 'dsw-static-blue-600',
    price: { currency: 'CNY', input: 6, cacheHit: 1.2, output: 24 },
  },
  {
    key: 'glm-5v-turbo',
    name: 'GLM-5V-Turbo',
    provider: '智谱 AI',
    colorVar: 'dsw-static-blue-300',
    price: { currency: 'CNY', input: 5, cacheHit: 1.2, output: 22 },
  },
  // 阿里通义千问 (OpenAI-compatible, 百炼 2026-08).
  {
    key: 'qwen-3.8-max',
    name: 'Qwen3.8 Max',
    provider: '阿里通义',
    colorVar: 'dsw-static-blue-600',
    // 2026-08-06 发布；人民币刊例：输入 12 / 缓存命中 1.5 / 输出 36。
    price: { currency: 'CNY', input: 12, cacheHit: 1.5, output: 36 },
    // 附加计价维度（纯展示，估算计费仍走主价三桶）：
    // Batch File 为长期半价档；Batch Chat 原价与标准价一致（其限时活动按需求忽略）。
    extraRows: [
      { label: '显式缓存创建', input: 15 },
      { label: '显式缓存命中', input: 1 },
      { label: 'Batch File', input: 6, output: 18, note: '长期半价' },
      { label: 'Batch Chat', input: 12, output: 36, note: '与标准价一致' },
    ],
  },
  {
    key: 'qwen-3.8-flash',
    name: 'Qwen3.8 Flash',
    provider: '阿里通义',
    colorVar: 'dsw-static-blue-400',
    // 人民币刊例：输入 1 / 缓存命中 0.1 / 输出 3。
    price: { currency: 'CNY', input: 1, cacheHit: 0.1, output: 3 },
    // 附加计价维度（纯展示，估算计费仍走主价三桶）：
    // Batch File 为长期半价档；Batch Chat 原价与标准价一致。
    extraRows: [
      { label: '显式缓存创建', input: 1.25 },
      { label: '显式缓存命中', input: 0.1 },
      { label: 'Batch File', input: 0.5, output: 1.5, note: '长期半价' },
      { label: 'Batch Chat', input: 1, output: 3, note: '与标准价一致' },
    ],
  },
  {
    key: 'qwen-max',
    name: 'Qwen3.7-Max',
    provider: '阿里通义',
    colorVar: 'dsw-static-blue-300',
    // 官方刊例价（元 / 每百万 token，0-1M 单一档）：输入 ¥12 / 命中 ¥1.2 / 输出 ¥36。
    price: { currency: 'CNY', input: 12, cacheHit: 1.2, output: 36 },
    // 整单限时 5 折（输入 6 / 输出 18），官方未公布截止日；长期生效直至公告后补填。
    promo: { factor: 0.5, note: '限时 5 折' },
    // 附加计价维度（纯展示，估算计费仍走主价三桶）：Batch File 为长期半价档；
    // Batch Chat 原价与标准价一致（其限时活动按惯例忽略）。
    extraRows: [
      { label: '显式缓存创建', input: 15 },
      { label: '显式缓存命中', input: 1.2 },
      { label: 'Batch File', input: 6, output: 18, note: '长期半价' },
      { label: 'Batch Chat', input: 12, output: 36, note: '与标准价一致' },
    ],
  },
  {
    key: 'qwen-plus',
    name: 'Qwen3.5-Plus',
    provider: '阿里通义',
    colorVar: 'dsw-static-blue-500',
    // 官方刊例价（元 / 每百万 token，≤128K 档）：输入 ¥0.8 / 命中 ¥0.08 / 输出 ¥4.8。
    price: { currency: 'CNY', input: 0.8, cacheHit: 0.08, output: 4.8 },
    // 附加计价维度（纯展示，估算计费仍走主价三桶；≤128K 档官方价目）：
    // Batch File 为长期半价档；Batch Chat 原价与标准价一致。
    extraRows: [
      { label: '显式缓存创建', input: 1 },
      { label: '显式缓存命中', input: 0.08 },
      { label: 'Batch File', input: 0.4, output: 2.4, note: '长期半价' },
      { label: 'Batch Chat', input: 0.8, output: 4.8, note: '与标准价一致' },
    ],
  },
  {
    key: 'qwen-flash',
    name: 'Qwen3.5-Flash',
    provider: '阿里通义',
    colorVar: 'dsw-static-blue-400',
    // 官方刊例价（元 / 每百万 token）：输入 ¥0.2 / 命中 ¥0.02 / 输出 ¥2。
    price: { currency: 'CNY', input: 0.2, cacheHit: 0.02, output: 2 },
    // 附加计价维度（纯展示，估算计费仍走主价三桶）：显式缓存按百炼统一惯例
    // 创建 = 输入价 125%、命中 = 10%；批量推理支持情况未核实到官方依据，暂不列示。
    extraRows: [
      { label: '显式缓存创建', input: 0.25 },
      { label: '显式缓存命中', input: 0.02 },
    ],
  },
  // 字节豆包 (OpenAI-compatible, 火山方舟 2026).
  {
    key: 'doubao',
    name: 'Doubao Seed-2.0 Pro',
    provider: '字节豆包',
    colorVar: 'dsw-static-red-500',
    price: { currency: 'CNY', input: 3.2, cacheHit: 0.64, output: 16 },
  },
  {
    key: 'doubao-mini',
    name: 'Doubao Seed-2.0 Mini',
    provider: '字节豆包',
    colorVar: 'dsw-static-red-300',
    price: { currency: 'CNY', input: 0.2, cacheHit: 0.02, output: 2 },
  },
  {
    key: 'doubao-1.6',
    name: 'Doubao Seed-1.6',
    provider: '字节豆包',
    colorVar: 'dsw-static-red-400',
    price: { currency: 'CNY', input: 0.8, cacheHit: 0, output: 8 },
  },
  // 火山方舟 2026 新模型（官方 CNY 价 / 每百万 token）。
  {
    key: 'doubao-seed-evolving',
    name: 'Doubao-Seed-Evolving',
    provider: '字节豆包',
    colorVar: 'dsw-static-red-500',
    price: { currency: 'CNY', input: 6, cacheHit: 1.2, output: 30 },
  },
  {
    key: 'doubao-seed-2.1-pro',
    name: 'Doubao Seed-2.1 Pro',
    provider: '字节豆包',
    colorVar: 'dsw-static-red-400',
    price: { currency: 'CNY', input: 6, cacheHit: 1.2, output: 30 },
  },
  {
    key: 'doubao-seed-2.1-turbo',
    name: 'Doubao Seed-2.1 Turbo',
    provider: '字节豆包',
    colorVar: 'dsw-static-red-300',
    price: { currency: 'CNY', input: 3, cacheHit: 0.6, output: 15 },
  },
  // 月之暗面 Kimi (OpenAI-compatible, 腾讯云 TokenHub 官方价 2026-08-14).
  {
    key: 'kimi',
    name: 'Kimi K2.7 Code',
    provider: '月之暗面',
    colorVar: 'dsw-static-neutral-bluish-700',
    price: { currency: 'CNY', input: 6.5, cacheHit: 1.3, output: 27 },
  },
  {
    key: 'kimi-k2.7-hs',
    name: 'Kimi K2.7 Code HighSpeed',
    provider: '月之暗面',
    colorVar: 'dsw-static-neutral-bluish-600',
    price: { currency: 'CNY', input: 13, cacheHit: 2.6, output: 54 },
  },
  {
    key: 'kimi-k2.6',
    name: 'Kimi K2.6',
    provider: '月之暗面',
    colorVar: 'dsw-static-neutral-bluish-500',
    price: { currency: 'CNY', input: 6.5, cacheHit: 1.1, output: 27 },
  },
  {
    key: 'kimi-k3',
    name: 'Kimi K3',
    provider: '月之暗面',
    colorVar: 'dsw-static-neutral-bluish-500',
    price: { currency: 'CNY', input: 20, cacheHit: 2, output: 100 },
  },
  // 小米 MiMo (OpenAI-compatible; token plan 通道 model id 为 mimo-v2.5，
  // 按订阅豁免计费；按量单价 2026-08 官方公布：命中缓存 / 未命中 / 输出).
  {
    key: 'mimo-v2.5',
    name: 'MiMo V2.5',
    provider: '小米',
    colorVar: 'dsw-static-green-400',
    price: { currency: 'CNY', input: 1, cacheHit: 0.02, output: 2 },
  },
  {
    key: 'mimo-v2.5-pro',
    name: 'MiMo V2.5 Pro',
    provider: '小米',
    colorVar: 'dsw-static-green-400',
    price: { currency: 'CNY', input: 3, cacheHit: 0.025, output: 6 },
  },
  // MiniMax (OpenAI-compatible, TokenHub 2026-08-14).
  {
    key: 'minimax',
    name: 'MiniMax-M3',
    provider: 'MiniMax',
    colorVar: 'dsw-static-amber-500',
    price: { currency: 'CNY', input: 2.1, cacheHit: 0.42, output: 8.4 },
  },
  // MiniMax-M2.7 / M2.7-highspeed：官方按量价（元 / 每百万 token，2026-08）。
  {
    key: 'minimax-m2.7',
    name: 'MiniMax-M2.7',
    provider: 'MiniMax',
    colorVar: 'dsw-static-amber-400',
    price: { currency: 'CNY', input: 2.1, cacheHit: 0.42, output: 8.4 },
  },
  {
    key: 'minimax-m2.7-highspeed',
    name: 'MiniMax-M2.7-highspeed',
    provider: 'MiniMax',
    colorVar: 'dsw-static-amber-500',
    price: { currency: 'CNY', input: 4.2, cacheHit: 0.42, output: 16.8 },
  },
  // 百度文心 (OpenAI-compatible, 千帆 2026-08).
  {
    key: 'ernie',
    name: 'ERNIE-5.1',
    provider: '百度文心',
    colorVar: 'dsw-static-blue-300',
    price: { currency: 'CNY', input: 4, cacheHit: 0.4, output: 18 },
  },
  // 腾讯混元 (OpenAI-compatible, TokenHub 2026-08-14).
  {
    key: 'hunyuan',
    name: '混元 Hy3',
    provider: '腾讯混元',
    colorVar: 'dsw-static-amber-400',
    price: { currency: 'CNY', input: 1, cacheHit: 0.25, output: 4 },
  },
  {
    key: 'hunyuan-t1',
    name: '混元 T1',
    provider: '腾讯混元',
    colorVar: 'dsw-static-amber-300',
    price: { currency: 'CNY', input: 1, cacheHit: 0.1, output: 4 },
  },
  // 零一万物 (OpenAI-compatible, 2026-08).
  {
    key: 'yi',
    name: 'Yi-Lightning',
    provider: '零一万物',
    colorVar: 'dsw-static-green-500',
    price: { currency: 'CNY', input: 0.99, cacheHit: 0.1, output: 0.99 },
  },
  // 阶跃星辰 Step (OpenAI-compatible, platform.stepfun.com 2026-08; 缓存命中 ¥0.27).
  {
    key: 'step',
    name: 'Step 3.7 Flash',
    provider: '阶跃星辰',
    colorVar: 'dsw-static-neutral-bluish-400',
    price: { currency: 'CNY', input: 1.35, cacheHit: 0.27, output: 8.1 },
  },
  // 科大讯飞星火 (OpenAI-compatible, 2026-07 汇总; 套餐制，价格约)。
  {
    key: 'spark',
    name: 'Spark 4.0 Ultra',
    provider: '科大讯飞',
    colorVar: 'dsw-static-green-400',
    price: { currency: 'CNY', input: 5, cacheHit: 0.5, output: 10 },
    estimated: true,
  },
  // 商汤日日新 (OpenAI-compatible, 2026-07 汇总; 公测中，价格约)。
  {
    key: 'sensenova',
    name: 'SenseNova 6.5',
    provider: '商汤',
    colorVar: 'dsw-static-red-400',
    price: { currency: 'CNY', input: 4.5, cacheHit: 0.45, output: 9 },
    estimated: true,
  },
  // 百川智能 (OpenAI-compatible, 2026-07 汇总)。
  {
    key: 'baichuan',
    name: 'Baichuan M3-Plus',
    provider: '百川智能',
    colorVar: 'dsw-static-neutral-bluish-500',
    price: { currency: 'CNY', input: 5, cacheHit: 0.5, output: 9 },
  },
  // OpenAI — GPT-5.6 family (developers.openai.com/api/docs/pricing 2026-08).
  {
    key: 'gpt-5.6-sol',
    name: 'GPT-5.6 Sol',
    provider: 'OpenAI',
    colorVar: 'dsw-static-green-500',
    price: { currency: 'USD', input: 5, cacheHit: 0.5, output: 30 },
  },
  {
    key: 'gpt-5.6-terra',
    name: 'GPT-5.6 Terra',
    provider: 'OpenAI',
    colorVar: 'dsw-static-green-400',
    price: { currency: 'USD', input: 2, cacheHit: 0.2, output: 12 },
  },
  {
    key: 'gpt-5.6-luna',
    name: 'GPT-5.6 Luna',
    provider: 'OpenAI',
    colorVar: 'dsw-static-green-500',
    price: { currency: 'USD', input: 0.2, cacheHit: 0.02, output: 1.2 },
  },
  // Google — Gemini 3.x (ai.google.dev/gemini-api/docs/pricing 2026-08).
  // Google does NOT bill by time of day: Standard is the real-time full
  // price, while the Flex tier prices spare-capacity traffic at exactly -50%
  // (1-15 min latency). The estimator treats Standard as the peak band and
  // Flex as the off-peak band, mixed by the configured peak share.
  {
    key: 'gemini-pro',
    name: 'Gemini 3.1 Pro',
    provider: 'Google',
    colorVar: 'dsw-static-blue-600',
    price: {
      currency: 'USD',
      input: 2,
      cacheHit: 0.2,
      output: 12,
      offPeak: { input: 1, cacheHit: 0.1, output: 6 },
    },
    peakHours: 'Standard / Flex',
    tierSemantics: 'latency',
  },
  {
    key: 'gemini-flash',
    name: 'Gemini 3.6 Flash',
    provider: 'Google',
    colorVar: 'dsw-static-blue-400',
    price: {
      currency: 'USD',
      input: 1.5,
      cacheHit: 0.15,
      output: 7.5,
      offPeak: { input: 0.75, cacheHit: 0.075, output: 3.75 },
    },
    peakHours: 'Standard / Flex',
    tierSemantics: 'latency',
  },
  // xAI — current Grok family (docs.x.ai 2026-08).
  {
    key: 'grok',
    name: 'Grok 4.6',
    provider: 'xAI',
    colorVar: 'dsw-static-neutral-bluish-700',
    price: { currency: 'USD', input: 2, cacheHit: 0.5, output: 6 },
  },
  {
    key: 'grok-4.3',
    name: 'Grok 4.3',
    provider: 'xAI',
    colorVar: 'dsw-static-neutral-bluish-500',
    price: { currency: 'USD', input: 1.25, cacheHit: 0.2, output: 2.5 },
  },
  // Meta — Llama 4 (Together/OpenRouter list rates 2026-08).
  {
    key: 'llama',
    name: 'Llama 4 Maverick',
    provider: 'Meta',
    colorVar: 'dsw-static-red-500',
    price: { currency: 'USD', input: 0.2, cacheHit: 0.05, output: 0.6 },
  },
  {
    key: 'llama-scout',
    name: 'Llama 4 Scout',
    provider: 'Meta',
    colorVar: 'dsw-static-red-400',
    price: { currency: 'USD', input: 0.1, cacheHit: 0.025, output: 0.3 },
  },
  // Anthropic Claude / Mistral / Cohere：models.dev 公开美元价（USD / 每百万 token）。
  {
    key: 'claude-opus-4-6',
    name: 'Claude Opus 4.6',
    provider: 'Anthropic',
    colorVar: 'dsw-static-red-500',
    price: { currency: 'USD', input: 5, cacheHit: 0.5, output: 25 },
  },
  {
    key: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    provider: 'Anthropic',
    colorVar: 'dsw-static-red-400',
    price: { currency: 'USD', input: 3, cacheHit: 0.3, output: 15 },
  },
  {
    key: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    provider: 'Anthropic',
    colorVar: 'dsw-static-red-300',
    price: { currency: 'USD', input: 1, cacheHit: 0.1, output: 5 },
  },
  {
    key: 'claude-opus-5',
    name: 'Claude Opus 5',
    provider: 'Anthropic',
    colorVar: 'dsw-static-red-500',
    price: { currency: 'USD', input: 5, cacheHit: 0.5, output: 25 },
  },
  {
    key: 'claude-sonnet-5',
    name: 'Claude Sonnet 5',
    provider: 'Anthropic',
    colorVar: 'dsw-static-red-400',
    price: { currency: 'USD', input: 2, cacheHit: 0.2, output: 10 },
  },
  {
    key: 'mistral-large-2512',
    name: 'Mistral Large 3',
    provider: 'Mistral AI',
    colorVar: 'dsw-static-violet-500',
    price: { currency: 'USD', input: 0.5, cacheHit: 0.05, output: 1.5 },
  },
  {
    key: 'mistral-small-2603',
    name: 'Mistral Small 4',
    provider: 'Mistral AI',
    colorVar: 'dsw-static-violet-400',
    price: { currency: 'USD', input: 0.15, cacheHit: 0.015, output: 0.6 },
  },
  {
    key: 'ministral-8b-latest',
    name: 'Ministral 8B',
    provider: 'Mistral AI',
    colorVar: 'dsw-static-violet-300',
    price: { currency: 'USD', input: 0.1, cacheHit: 0.01, output: 0.1 },
  },
  {
    key: 'command-a-03-2025',
    name: 'Command A',
    provider: 'Cohere',
    colorVar: 'dsw-static-cyan-500',
    price: { currency: 'USD', input: 2.5, cacheHit: 0.25, output: 10 },
  },
  {
    key: 'command-r-08-2024',
    name: 'Command R',
    provider: 'Cohere',
    colorVar: 'dsw-static-cyan-400',
    price: { currency: 'USD', input: 0.15, cacheHit: 0.015, output: 0.6 },
  },
  // 国产新兴/开源模型：无官方公开价，按家族口径估算 CNY（标记 estimated）。
  {
    key: 'longcat-2.0',
    name: 'LongCat 2.0',
    provider: '美团',
    colorVar: 'dsw-static-amber-500',
    price: { currency: 'CNY', input: 4, cacheHit: 0.8, output: 16 },
    estimated: true,
  },
  {
    key: 'minicpm-v-4.5',
    name: 'MiniCPM-V 4.5',
    provider: '面壁智能',
    colorVar: 'dsw-static-green-500',
    price: { currency: 'CNY', input: 1, cacheHit: 0.2, output: 4 },
    estimated: true,
  },
  {
    key: 'ernie-4.5',
    name: 'ERNIE-4.5 300B',
    provider: '百度文心',
    colorVar: 'dsw-static-blue-300',
    price: { currency: 'CNY', input: 2, cacheHit: 0.4, output: 8 },
    estimated: true,
  },
  {
    key: 'dots-3-note-preview',
    name: 'Dots3-Note Preview',
    provider: '小红书',
    colorVar: 'dsw-static-red-500',
    price: { currency: 'CNY', input: 2, cacheHit: 0.4, output: 8 },
    estimated: true,
  },
  // 主流厂商缺失/新增模型：国内统一按官方 CNY 价；无公开价的按家族口径估算并标记 estimated。
  {
    key: 'qwen3.6-max',
    name: 'Qwen3.6 Max',
    provider: '阿里通义',
    colorVar: 'dsw-static-orange-500',
    // 官方刊例价（元 / 每百万 token，0-128K 档）：输入 ¥9 / 命中 ¥0.9 / 输出 ¥54。
    price: { currency: 'CNY', input: 9, cacheHit: 0.9, output: 54 },
    // 附加计价维度（纯展示，估算计费仍走主价三桶；128K-256K 档为 15/90）：
    // 显式缓存按百炼统一惯例 创建 = 输入价 125%、命中 = 10%；官方未标 Batch 调用。
    extraRows: [
      { label: '显式缓存创建', input: 11.25 },
      { label: '显式缓存命中', input: 0.9 },
    ],
  },
  {
    key: 'qwen3-coder-plus',
    name: 'Qwen3-Coder Plus',
    provider: '阿里通义',
    colorVar: 'dsw-static-orange-400',
    // 官方刊例价（元 / 每百万 token，0-32K 档）：输入 ¥4 / 命中 ¥0.8 / 输出 ¥16。
    price: { currency: 'CNY', input: 4, cacheHit: 0.8, output: 16 },
    // 附加计价维度（纯展示，估算计费仍走主价三桶；0-32K 档官方价目）：
    // 该模型不支持批量推理，无 Batch 档可列。
    extraRows: [
      { label: '显式缓存创建', input: 5 },
      { label: '显式缓存命中', input: 0.4 },
    ],
  },
  {
    key: 'qwen3-coder',
    name: 'Qwen3-Coder 480B',
    provider: '阿里通义',
    colorVar: 'dsw-static-orange-300',
    price: { currency: 'CNY', input: 4, cacheHit: 0.8, output: 16 },
    estimated: true,
  },
  {
    key: 'glm-4.5-x',
    name: 'GLM-4.5-X',
    provider: '智谱 AI',
    colorVar: 'dsw-static-blue-400',
    price: { currency: 'CNY', input: 4, cacheHit: 1, output: 16 },
    estimated: true,
  },
  {
    key: 'glm-5.2-fast',
    name: 'GLM-5.2 Fast',
    provider: '智谱 AI',
    colorVar: 'dsw-static-blue-300',
    price: { currency: 'CNY', input: 6, cacheHit: 1.2, output: 24 },
    estimated: true,
  },
  {
    key: 'kimi-k3-fast',
    name: 'Kimi K3 Fast',
    provider: '月之暗面',
    colorVar: 'dsw-static-cyan-400',
    price: { currency: 'CNY', input: 20, cacheHit: 2, output: 100 },
    estimated: true,
  },
  {
    key: 'kimi-k2.7-code-fast',
    name: 'Kimi K2.7 Code Fast',
    provider: '月之暗面',
    colorVar: 'dsw-static-cyan-400',
    price: { currency: 'CNY', input: 6.5, cacheHit: 1.3, output: 27 },
    estimated: true,
  },
  {
    key: 'kimi-k2.6-fast',
    name: 'Kimi K2.6 Fast',
    provider: '月之暗面',
    colorVar: 'dsw-static-cyan-300',
    price: { currency: 'CNY', input: 6.5, cacheHit: 1.1, output: 27 },
    estimated: true,
  },
  {
    key: 'kimi-k2.6-turbo',
    name: 'Kimi K2.6 Turbo',
    provider: '月之暗面',
    colorVar: 'dsw-static-cyan-300',
    price: { currency: 'CNY', input: 6.5, cacheHit: 1.1, output: 27 },
    estimated: true,
  },
  {
    key: 'kimi-k2-thinking-turbo',
    name: 'Kimi K2 Thinking Turbo',
    provider: '月之暗面',
    colorVar: 'dsw-static-cyan-300',
    // 官方：输入 ¥8（未命中）/ ¥1（命中）/ 输出 ¥58。
    price: { currency: 'CNY', input: 8, cacheHit: 1, output: 58 },
  },
  {
    key: 'doubao-seed-2.0-code',
    name: 'Doubao Seed-2.0 Code',
    provider: '字节豆包',
    colorVar: 'dsw-static-red-500',
    price: { currency: 'CNY', input: 3.2, cacheHit: 0.64, output: 16 },
  },
  {
    key: 'doubao-seed-2.0-lite',
    name: 'Doubao Seed-2.0 Lite',
    provider: '字节豆包',
    colorVar: 'dsw-static-red-300',
    price: { currency: 'CNY', input: 0.6, cacheHit: 0.12, output: 3.6 },
  },
  {
    key: 'other',
    name: '其他模型',
    provider: 'Custom',
    colorVar: 'dsw-static-neutral-bluish-500',
    // Fallback for any stats key absent from the catalog: unknown models carry no price.
    // 未知模型不估算费用：价格全部为 0，费率表显示「—」，计费引擎产出 0。
    price: { currency: 'CNY', input: 0, cacheHit: 0, cacheMiss: 0, output: 0 },
  },
]

/**
 * 真实 provider model id → 计费目录键（`MODEL_CATALOG[].key`）的映射。未知 id
 * 原样保留并落回 `other`（未知模型不估算费用）。聚合层（aggregate.ts）在折叠时
 * 用同一张表把日志里的 model id 归并为目录键，客户端渲染（`modelOf`）也按它
 * 解析，两侧共用一份映射，避免同一模型两侧不一致导致「未收录」。
 */
export const MODEL_KEY_ALIASES: Readonly<Record<string, string>> = {
  'deepseek-v4-flash': 'flash',
  'deepseek-v4-flash-vision-exp': 'flash-vision-exp',
  'deepseek-v4-pro': 'pro',
  'glm-5.2': 'glm',
  // 智谱 GLM 其余按量变体：独立目录键（点/横杠/大小写变体归一）。
  'glm-4.5-air': 'glm-4.5-air',
  'glm-4.5air': 'glm-4.5-air',
  'glm-4.7': 'glm-4.7',
  'glm-5-turbo': 'glm-5-turbo',
  'glm-5.1': 'glm-5.1',
  'glm-5.3-flash': 'glm-5.3-flash',
  'glm-5v-turbo': 'glm-5v-turbo',
  'glm-5v.1': 'glm-5v-turbo',
  // Anthropic Claude / Mistral / Cohere：id 变体归一（点/横杠/短名）。
  'claude-opus-4-6': 'claude-opus-4-6',
  'claude-opus-4.6': 'claude-opus-4-6',
  'claude-sonnet-4-6': 'claude-sonnet-4-6',
  'claude-sonnet-4.6': 'claude-sonnet-4-6',
  'claude-haiku-4-5': 'claude-haiku-4-5',
  'claude-haiku-4.5': 'claude-haiku-4-5',
  'claude-opus-5': 'claude-opus-5',
  'claude-sonnet-5': 'claude-sonnet-5',
  'mistral-large-2512': 'mistral-large-2512',
  'mistral-large-3': 'mistral-large-2512',
  'mistral-small-2603': 'mistral-small-2603',
  'mistral-small-4': 'mistral-small-2603',
  'ministral-8b-latest': 'ministral-8b-latest',
  'ministral-8b': 'ministral-8b-latest',
  'command-a-03-2025': 'command-a-03-2025',
  'command-a': 'command-a-03-2025',
  'command-r-08-2024': 'command-r-08-2024',
  'command-r': 'command-r-08-2024',
  // 国产新兴/开源模型 id 变体。
  'longcat-2.0': 'longcat-2.0',
  'longcat-2': 'longcat-2.0',
  'minicpm-v-4.5': 'minicpm-v-4.5',
  'minicpm-v-4.5-thinking': 'minicpm-v-4.5',
  'ernie-4.5': 'ernie-4.5',
  'ernie-4.5-300b': 'ernie-4.5',
  'dots-3-note-preview': 'dots-3-note-preview',
  'dots-3-note': 'dots-3-note-preview',
  'dots3-note-preview': 'dots-3-note-preview',
  'rednote-dots3': 'dots-3-note-preview',
  // 字节豆包新模型 id 变体（点/横杠/短名）。
  'doubao-seed-evolving': 'doubao-seed-evolving',
  'doubao-seed-evolve': 'doubao-seed-evolving',
  'doubao-seed-2.1-pro': 'doubao-seed-2.1-pro',
  'doubao-seed-2.1-pro-290000': 'doubao-seed-2.1-pro',
  'doubao-seed-2.1-turbo': 'doubao-seed-2.1-turbo',
  'doubao-seed-2-1-turbo': 'doubao-seed-2.1-turbo',
  'qwen3.8-max': 'qwen-3.8-max',
  'qwen3.8-flash': 'qwen-3.8-flash',
  'qwen3.7-max': 'qwen-max',
  // 主流缺失/新增模型别名（点/横杠/短名）。
  'qwen3.6-max': 'qwen3.6-max',
  'qwen3.6-max-preview': 'qwen3.6-max',
  'qwen3-coder-plus': 'qwen3-coder-plus',
  'qwen3-coder': 'qwen3-coder',
  'qwen3-coder-480b': 'qwen3-coder',
  'glm-4.5-x': 'glm-4.5-x',
  'glm-4.5x': 'glm-4.5-x',
  'glm-5.2-fast': 'glm-5.2-fast',
  'glm-5.2f': 'glm-5.2-fast',
  'kimi-k3-fast': 'kimi-k3-fast',
  'kimi-k3f': 'kimi-k3-fast',
  'kimi-k2.7-code-fast': 'kimi-k2.7-code-fast',
  'kimi-k2.7-code-f': 'kimi-k2.7-code-fast',
  'kimi-k2.6-fast': 'kimi-k2.6-fast',
  'kimi-k2.6-turbo': 'kimi-k2.6-turbo',
  'kimi-k2-thinking-turbo': 'kimi-k2-thinking-turbo',
  'doubao-seed-2.0-code': 'doubao-seed-2.0-code',
  'doubao-seed-2-0-code': 'doubao-seed-2.0-code',
  'doubao-seed-2.0-lite': 'doubao-seed-2.0-lite',
  'doubao-seed-2-0-lite': 'doubao-seed-2.0-lite',
  'qwen-max': 'qwen-max',
  'hunyuan-t1': 'hunyuan-t1',
  'step-3.7-flash': 'step',
  'seed-2.0-mini': 'doubao-mini',
  // 月之暗面 Kimi：coding plan 通道的 model id 是短名 k3。
  'k3': 'kimi-k3',
  'kimi-k3': 'kimi-k3',
  // MiniMax：官方 OpenAI 兼容 id 为 `MiniMax-M3`（目录键 `minimax`）。日志里大小写/型号后缀
  // 各异，统一归一化到目录键，避免「厂商计费与订阅」把 MiniMax-M3 标成未收录。
  'minimax-m1': 'minimax',
  'minimax-m2': 'minimax',
  'minimax-m3': 'minimax',
  // MiniMax-M2.7 / M2.7-highspeed：按量通道的独立目录键（点/横杠/大小写变体归一）。
  'minimax-m2.7': 'minimax-m2.7',
  'minimax-m2.7-highspeed': 'minimax-m2.7-highspeed',
  'minimax-m2.7-high-speed': 'minimax-m2.7-highspeed',
  'minimax-m2-7': 'minimax-m2.7',
  'minimax-m2-7-highspeed': 'minimax-m2.7-highspeed',
  'minimax-m2-7-high-speed': 'minimax-m2.7-highspeed',
}

/**
 * 模型 id 归一化：小写、去括号附注（如 `gpt5.6 luna(go)` 只看主体）、再去所有
 * 非字母数字分隔符（空格 / 横杠 / 点 / 下划线）。用于日志里的模型 id 与计费
 * 目录键做宽松匹配，提升「大小写/分隔符差异导致未收录」的识别率。
 * @param id - 原始模型 id（日志或目录键）。
 * @returns 归一化键（字母数字小写串）。
 */
export function canonModelId(id: string): string {
  return String(id).toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]+/g, '')
}

/**
 * 目录常量键的归一化索引：归一化键 → 真实计费键。只索引静态来源（内置目录、
 * 别名表、dsh-spend 兜底键）；models.dev 补充条目是运行时注入，单独实时匹配。
 */
const CATALOG_CANON_INDEX: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>()
  const add = (candidate: string, target: string): void => {
    const canon = canonModelId(candidate)
    if (canon !== '' && !map.has(canon)) map.set(canon, target)
  }
  for (const entry of MODEL_CATALOG) add(entry.key, entry.key)
  for (const [alias, key] of Object.entries(MODEL_KEY_ALIASES)) add(alias, key)
  for (const rate of FALLBACK_RATES) add(rate.key, rate.key)
  return map
})()

/**
 * 解析真实日志模型 id → 计费目录键。先精确别名映射（既有行为）；未命中时做
 * 归一化匹配（忽略大小写/分隔符/括号附注），命中内置目录 / 别名目标 / 兜底键 /
 * models.dev 补充键即返回其真实键；完全未知时保持原样（回退 other，不计费）。
 * 供聚合层折叠与客户端渲染共用，两侧一致。
 * @param id - 真实模型 id（日志里出现的形式）。
 * @returns 计费目录键。
 */
export function resolveCatalogKey(id: string): string {
  const exact = MODEL_KEY_ALIASES[id] ?? id
  if (exact === id) {
    // 精确别名未命中：做归一化匹配；命中即返回目标键。
    const canon = canonModelId(id)
    if (canon !== '') {
      const hit = CATALOG_CANON_INDEX.get(canon)
      if (hit !== undefined) return hit
      const extraHit = (liveExtraModels ?? []).find(item => canonModelId(item.key) === canon)
      if (extraHit !== undefined) return extraHit.key
    }
  }
  return exact
}

/** 取一个计费键的实时单价（实时覆盖 > dsh-spend 官方价兜底）。 */
function livePriceOf(key: string): LivePrice | undefined {
  const resolved = resolveCatalogKey(key)
  const live = livePrices?.[resolved]
  if (live !== undefined) return live
  const fallback = FALLBACK_RATES.find(rate => rate.key.toLowerCase() === resolved.toLowerCase())
  if (fallback === undefined) return undefined
  return { input: fallback.input, cacheHit: fallback.cacheHit, output: fallback.output }
}

/** Lookup a model by its stats key; falls back to the generic `other` entry. */
export function modelOf(key: string): ModelEntry {
  // 先按别名/归一化归并为目录键（catalog key 本身不在别名表里，原样通过）。
  const resolved = resolveCatalogKey(key)
  const found = MODEL_CATALOG.find(entry => entry.key === resolved)
  // 目录未命中时查 models.dev 补充条目（与宿主预制提供方对齐的实时价）。
  const extra = liveExtraModels?.find(item => item.key === resolved)
  const base = found ?? (extra !== undefined ? extraEntryOf(extra) : (() => {
    const fallback = MODEL_CATALOG.at(-1)
    if (fallback !== undefined) return fallback
    throw new Error('MODEL_CATALOG must not be empty')
  })())
  // 用户自定义价优先级最高：整表替换；带 offPeak 时保留峰谷分档，否则平档。
  const user = userPriceOf(resolved)
  if (user !== undefined) {
    return {
      ...base,
      userPriced: true,
      price: {
        currency: user.currency ?? 'CNY',
        input: user.input,
        cacheHit: user.cacheHit,
        output: user.output,
        ...(user.offPeak !== undefined ? { offPeak: user.offPeak } : {}),
      },
    }
  }
  const live = livePriceOf(resolved)
  if (live === undefined) return base
  // 实时价是路由器的美元单价（平档、无时段区分）：整表替换并走汇率换算。
  return { ...base, price: { currency: 'USD', input: live.input, cacheHit: live.cacheHit, output: live.output } }
}

/** models.dev 补充条目转为目录条目：USD 直价（走汇率换算），无峰谷分档。 */
function extraEntryOf(extra: ExtraModelPrice): ModelEntry {
  return {
    key: extra.key,
    name: extra.name,
    provider: extra.provider,
    colorVar: 'dsw-static-neutral-400',
    price: {
      currency: 'USD',
      input: extra.price.input,
      cacheHit: extra.price.cacheHit,
      output: extra.price.output,
    },
  }
}

/**
 * 模型是否可计价：内置目录、models.dev 补充、或 dsh-spend 官方价兜底命中。
 * 聚合层的计价闸门（目录外模型不产生费用，避免兜底档误估）。
 */
export function isPriced(key: string): boolean {
  const resolved = resolveCatalogKey(key)
  if (MODEL_CATALOG.some(entry => entry.key === resolved)) return true
  if ((liveExtraModels ?? []).some(item => item.key === resolved)) return true
  return FALLBACK_RATES.some(rate => rate.key.toLowerCase() === resolved.toLowerCase())
}

/**
 * 促销在 nowMs 是否生效：factor 必须落在 (0,1) 区间，截止时刻及之后视为过期；
 * endsAtMs 缺省表示长期活动，在 factor 合法期间持续生效。
 * 导出供测试：纯函数。
 * @param promo - 待判定的促销窗口。
 * @param nowMs - 判定时刻（epoch ms）。
 */
export function isPromoActive(promo: PricePromo, nowMs: number): boolean {
  const expired = promo.endsAtMs !== undefined && nowMs >= promo.endsAtMs
  return Number.isFinite(nowMs) && !expired && promo.factor > 0 && promo.factor < 1
}

/**
 * 把限时促销折入条目单价：生效期内返回 price 主档与 offPeak 全部乘 factor 的
 * 副本，其余字段原样保留；不在促销期（过期/未开始/factor 非法）原样返回。
 * 幂等由调用方保证——计价与费率表显示各自只折一次，勿对已折价副本重复应用。
 * @param entry - 目录条目（price 保持刊例价口径）。
 * @param nowMs - 判定时刻（epoch ms）。
 */
export function applyPromo(entry: ModelEntry, nowMs: number): ModelEntry {
  const { promo } = entry
  if (promo === undefined || !isPromoActive(promo, nowMs)) return entry
  const scaled = (band: PriceBand): PriceBand => ({
    input: band.input * promo.factor,
    cacheHit: band.cacheHit * promo.factor,
    ...(band.cacheMiss !== undefined ? { cacheMiss: band.cacheMiss * promo.factor } : {}),
    output: band.output * promo.factor,
  })
  return {
    ...entry,
    price: {
      ...scaled(entry.price),
      currency: entry.price.currency,
      ...(entry.price.offPeak !== undefined ? { offPeak: scaled(entry.price.offPeak) } : {}),
    },
  }
}

/**
 * 费率表渲染的完整目录：内置 + 探活命中的模型（无价标记未收录）。
 * models.dev 补充条目**不**整表渲染——那是数百网关厂商的全量模型清单（数千行），
 * 会把费率表撑爆；它们只作为目录外模型的计价回退源（见 {@link livePriceOf} /
 * {@link modelOf}）。探活模型在此逐个对价：内置已有的跳过去重；目录外但
 * models.dev 有价的按归一化 id 复用其 USD 价；两者皆无的标 `uncatalogued`。
 * 内置条目按 nowMs 折算限时促销（生效中的条目显示折后单价，过期自动恢复刊例价）。
 * @param nowMs - 促销判定时刻；缺省当前时刻。
 */
export function catalogEntries(nowMs: number = Date.now()): readonly ModelEntry[] {
  const entries: ModelEntry[] = [...MODEL_CATALOG.map(entry => applyPromo(entry, nowMs))]
  const known = new Set<string>(entries.map(entry => entry.key.toLowerCase()))
  const knownCanon = new Set<string>(entries.map(entry => canonModelId(entry.key)))
  for (const model of liveCatalogModels ?? []) {
    const rawKey = model.id.toLowerCase()
    const builtin = (() => {
      const aliasKey = resolveCatalogKey(model.id)
      return MODEL_CATALOG.find(item => item.key === aliasKey)
    })()
    // 内置目录收录：跳过，避免与内置行重复（key 用内置目录键）。
    if (builtin !== undefined) continue
    const idCanon = canonModelId(model.id)
    // 已收录（内置 / models.dev 补充）：按归一化 id 去重，避免同一模型的重复行。
    if (known.has(rawKey) || (idCanon !== '' && knownCanon.has(idCanon))) continue
    // 目录外但有 models.dev 价：直接复用其 USD 价（按归一化 id 匹配），否则走
    // dsh-spend 官方价兜底；两者都没有才标「未收录」。
    const extra = (liveExtraModels ?? []).find(item => canonModelId(item.key) === idCanon)
    let entry: ModelEntry
    if (extra !== undefined) {
      entry = extraEntryOf(extra)
      if (model.name !== undefined && model.name !== '') entry = { ...entry, name: model.name }
    } else {
      const fallbackLive = livePriceOf(rawKey)
      if (fallbackLive !== undefined) {
        entry = {
          key: rawKey,
          name: model.name ?? model.id,
          provider: model.provider,
          colorVar: 'dsw-static-neutral-400',
          price: { currency: 'USD', input: fallbackLive.input, cacheHit: fallbackLive.cacheHit, output: fallbackLive.output },
        }
      } else {
        const aliasKey = resolveCatalogKey(model.id)
        entry = {
          key: aliasKey,
          name: model.name ?? model.id,
          provider: model.provider,
          colorVar: 'dsw-static-neutral-400',
          price: { currency: 'USD', input: 0, cacheHit: 0, output: 0 },
          // 探活命中但无内置/models.dev/dsh-spend 价：标记未收录，费率表显示「未收录」。
          uncatalogued: true,
        }
      }
    }
    known.add(entry.key.toLowerCase())
    if (idCanon !== '') knownCanon.add(idCanon)
    entries.push(entry)
  }
  // 用户自定义价统一覆盖（含探活补充条目）：用户填的就是实付价，优先于促销与目录价。
  return entries.map(entry => {
    const user = userPriceOf(entry.key)
    if (user === undefined) return entry
    return {
      ...entry,
      userPriced: true,
      price: {
        currency: user.currency ?? 'CNY',
        input: user.input,
        cacheHit: user.cacheHit,
        output: user.output,
      },
    }
  })
}

/** Resolve a price-table row by its CSS variable name (theme token or fallback color). */
export function resolveToken(name: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim()
  return value !== '' ? value : '#8b95a3'
}

/**
 * Price one band's token usage in CNY. The stats `input` field is the TOTAL
 * prompt tokens (cacheHit + cacheMiss), so billing splits it: the cache-hit
 * share prices at the hit rate and the remaining share at the miss rate.
 * Providers that report only disjoint buckets carry `cacheMiss` explicitly;
 * otherwise the miss share is derived as `input - cacheHit`. Only USD-priced
 * bands go through the exchange rate.
 */
function priceBandCost(band: PriceBand, buckets: TokenUsageBuckets, currency: 'CNY' | 'USD'): number {
  const miss = buckets.cacheMiss > 0 ? buckets.cacheMiss : Math.max(0, buckets.input - buckets.cacheHit)
  const hit = Math.min(buckets.cacheHit, buckets.input)
  const raw = (
    (miss * (band.cacheMiss ?? band.input))
    + (hit * band.cacheHit)
    + (buckets.output * band.output)
  ) / 1_000_000
  // 统一成人民币：只有美元计价的国外模型需要乘汇率，国内模型原样就是 ¥。
  return currency === 'USD' ? raw * currentRate() : raw
}

/**
 * Estimate the CNY cost of one model's token usage, mixing the peak and
 * off-peak bands by the given peak share (flat-priced models cost the same in
 * both bands).
 *
 * 计费维度是「缓存命中价 × 时段价」的交叉：每个时段档内部分别按缓存命中
 * 价（cacheHit）与未命中价（input/cacheMiss）计价，两个时段档再按
 * peakShare 混合。时段定义以北京时间为准（如 DeepSeek V4 高峰
 * 09:00-12:00 / 14:00-18:00）。因聚合只有按日 token 量、没有请求级时间戳，
 * 时段只能按比例估算，而非逐请求判定。
 * @param entry - the catalog entry whose prices apply.
 * @param buckets - token usage counts.
 * @param peakShare - share of traffic in the peak band (0..1); defaults to {@link DEFAULT_PEAK_SHARE}.
 * @returns the estimated cost in CNY.
 */
export function computeCost(
  entry: ModelEntry,
  buckets: TokenUsageBuckets,
  peakShare = DEFAULT_PEAK_SHARE,
  nowMs: number = Date.now(),
): number {
  // 限时促销按判定时刻折算（无事件时刻的场景以当前时刻为准）。
  const priced = applyPromo(entry, nowMs)
  const peak = priceBandCost(priced.price, buckets, priced.price.currency)
  const off = priced.price.offPeak === undefined ? peak : priceBandCost(priced.price.offPeak, buckets, priced.price.currency)
  return peak * peakShare + off * (1 - peakShare)
}

/**
 * 按调用时刻精确判定高峰/空闲档并计价（P0-1：替代固定比例混合）。时刻未知
 * （null/NaN，理论不发生在真实事件流）时回退 {@link DEFAULT_PEAK_SHARE} 混合，
 * 保持旧语义不低估。平档模型（无 offPeak）两个时段同价。限时促销与峰谷档
 * 同口径：按事件时刻判定该笔流量当时享受的单价。
 * @param entry - the catalog entry whose prices apply.
 * @param buckets - token usage counts.
 * @param timeMs - the call's wall-clock time (epoch ms); null falls back to the peak-share mix.
 * @param peakShare - fallback mix used only when `timeMs` is missing.
 * @returns the estimated cost in CNY（USD 计价模型已按当前汇率折算）。
 */
export function computeCostAt(
  entry: ModelEntry,
  buckets: TokenUsageBuckets,
  timeMs: number | null | undefined,
  peakShare = DEFAULT_PEAK_SHARE,
): number {
  if (timeMs === null || timeMs === undefined || !Number.isFinite(timeMs)) return computeCost(entry, buckets, peakShare)
  // 促销与峰谷档同口径：按事件时刻判定该笔流量当时享受的单价。
  const priced = applyPromo(entry, timeMs)
  if (priced.price.offPeak === undefined) return priceBandCost(priced.price, buckets, priced.price.currency)
  const band = tierAt(timeMs) === 'peak' ? priced.price : priced.price.offPeak
  return priceBandCost(band, buckets, priced.price.currency)
}

/** 人民币 → 美元（显示换算用）：用当前生效汇率（实时优先，缺失回退内置），
 *  与计价链路的 `currentRate()` 同口径，避免实时汇率生效时 USD 显示与计价不一致。 */
export function cnyToUsd(cny: number): number {
  const rate = currentRate()
  return rate > 0 ? cny / rate : cny
}

/**
 * Format an amount with adaptive precision and the given currency symbol.
 * @param amount - the amount (CNY by default; pass `usd` for dollar display).
 * @param currency - display currency; default `cny`.
 */
export function formatMoney(amount: number, currency: CostCurrency = 'cny'): string {
  // 外部统计 JSON 的数字字段可能被写成字符串/非法值：先归一化，避免
  // toFixed 抛 TypeError 把整个渲染树打崩（插件 surface 会被卸载）。
  const value = Number(amount)
  if (!Number.isFinite(value)) return currency === 'cny' ? '¥0' : '$0'
  const symbol = currency === 'cny' ? '¥' : '$'
  if (value <= 0) return `${symbol}0`
  if (value >= 1000) return `${symbol}${value.toFixed(0)}`
  if (value >= 10) return `${symbol}${value.toFixed(1)}`
  if (value >= 0.1) return `${symbol}${value.toFixed(2)}`
  return `${symbol}${value.toFixed(3)}`
}

/**
 * Format a per-1M-token price in its native currency (free when the rate is
 * zero): CNY for domestic models, USD for overseas ones.
 */
export function formatUnitPrice(price: number, currency: 'CNY' | 'USD' = 'CNY'): string {
  if (price === 0) return '免费'
  if (currency === 'USD') {
    if (price >= 10) return `$${price.toFixed(1)}`
    return `$${price.toFixed(2)}`
  }
  if (price >= 10) return `¥${price.toFixed(1)}`
  return `¥${price.toFixed(2)}`
}

/**
 * 把一条「每百万 token」单价从原生币种换算到目标展示币种（按 USD→CNY 汇率）。
 * 汇率缺失/非法时回退原值，避免 0 汇率把价格算没。
 * @param price - 原生币种单价。
 * @param native - 模型原生币种。
 * @param target - 用户当前展示币种。
 * @param rate - USD→CNY 汇率（1 USD = rate CNY）。
 * @returns 换算到目标币种的单价；同币种或汇率不可用时原值。
 */
export function convertUnitPrice(price: number, native: 'CNY' | 'USD', target: CostCurrency, rate: number): number {
  if (rate <= 0 || !Number.isFinite(rate)) return price
  const targetCurrency: 'CNY' | 'USD' = target === 'usd' ? 'USD' : 'CNY'
  if (native === targetCurrency) return price
  return target === 'usd' ? price / rate : price * rate
}

/** Format a large token count with B/M/K suffix. */
export function formatTokens(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`
  return String(value)
}

/** Format a percentage. */
export function formatPercent(value: number): string {
  const normalized = Number(value)
  if (!Number.isFinite(normalized)) return '0.0%'
  return `${normalized.toFixed(1)}%`
}
