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
 * 用户自定义模型别名（插件配置 `modelKeyAliases`，聚合启动时注入）：真实日志
 * model id → 计费目录键。优先级高于内置别名表——目录外的新模型无需等发版，
 * 配置一条别名即完成识别与计价（键必须是内置目录的既有 key）。
 */
let userModelAliases: Readonly<Record<string, string>> | undefined

/**
 * 注入用户自定义模型别名（node 半区在插件启动时调用一次）。纯内存状态：
 * 聚合折叠与客户端渲染共用同一份（两侧一致性由同一注入点保证）。
 * @param aliases - `model id → 目录键` 映射；undefined/空 = 清除，回退内置表。
 */
export function applyUserModelAliases(aliases: Readonly<Record<string, string>> | undefined): void {
  userModelAliases = aliases !== undefined && Object.keys(aliases).length > 0 ? aliases : undefined
}

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

/**
 * 峰谷计价时代分界（UTC 2026-08-16T16:00:00Z，即北京时间 2026-08-17 00:00）：
 * DeepSeek V4 自此起按峰/谷两档计价。此前官方只有基础价一档——历史事件若
 * 套现行峰/谷档价会把成本高估约 50%（谷价 = 基础价 × 1.5）。半开区间：该
 * 时刻及之后按峰谷档计。
 */
export const PEAK_ERA_START_MS = Date.parse('2026-08-16T16:00:00Z')

/**
 * 周末全谷规则分界（UTC 2026-08-22T16:00:00Z，即北京时间 2026-08-23 00:00）：
 * 官方自此刻起周六/周日全天不区分峰谷（高峰时段收窄为工作日）；生效前的
 * 周末仍按 v1 峰谷规则（周六日 9-12 / 14-18 同样是高峰时段）。历史事件的
 * 档位判定按事件所在时段适用各自的规则，不得统一套现行规则重算历史。
 */
export const WEEKEND_OFFPEAK_START_MS = Date.parse('2026-08-22T16:00:00Z')

/**
 * flash 系调价分界（UTC 2026-09-10T04:00:00Z，即北京时间 2026-09-10 12:00）：
 * 官方自此刻起 V4 Flash / V4 Flash Vision (Exp) 调价——谷档 1.5/0.05/4.5 →
 * 1/0.02/4（峰 = 谷 × 2）。目录条目写现行（新）价；分界前的历史事件由
 * {@link computeCostAt} 按 {@link FLASH_REPRICED_OFFPEAK} 回算旧价，与
 * {@link PEAK_ERA_START_MS} 同一「按事件时刻分段适用规则」口径。
 * V4 Pro 不在本分界内：官方取消了 09-14 的路由计划，pro 长期按刊例计费。
 */
export const FLASH_REPRICE_MS = Date.parse('2026-09-10T04:00:00Z')

/**
 * flash 系调价前的官方谷档价（CNY / 1M tokens）：{@link FLASH_REPRICE_MS}
 * 之前的 flash / flash-vision-exp 事件按此回算（峰档 = 谷档 × 2）。
 * 用户价 = 实付价，与 legacy 口径相同地跳过本表。
 */
const FLASH_PRE_REPRICE_BAND: PriceBand = { input: 1.5, cacheHit: 0.05, output: 4.5 }
const FLASH_REPRICED_OFFPEAK: Readonly<Record<string, PriceBand>> = {
  flash: FLASH_PRE_REPRICE_BAND,
  'flash-vision-exp': FLASH_PRE_REPRICE_BAND,
}

/**
 * DeepSeek V4 峰谷时代之前的官方基础价（CNY / 1M tokens）：官方中文定价页
 * 峰谷改版前的基础价档（缓存写沿用历史规则按命中价计）。键为内置目录键，
 * flash-vision-exp 与 flash 同价。仅当事件时刻早于 {@link PEAK_ERA_START_MS}
 * 且条目未被用户价覆盖（用户价是实付价，优先于一切内置口径）时启用；
 * 币种固定 CNY——内置 DeepSeek 目录即人民币刊例，不随 live 覆盖漂移。
 */
const LEGACY_DEEPSEEK_BANDS: Readonly<Record<string, PriceBand>> = {
  flash: { input: 1, cacheHit: 0.02, output: 2 },
  'flash-vision-exp': { input: 1, cacheHit: 0.02, output: 2 },
  pro: { input: 3, cacheHit: 0.025, output: 6 },
}

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
  return tierAtWithBounds(timeMs, TIER_BOUNDARY_MINUTES)
}

/** 按给定峰段边界判档：周末全天低谷；工作日分钟数落在任一 [b(i), b(i+1)) 峰段即为高峰。 */
function tierAtWithBounds(timeMs: number, bounds: readonly number[]): PriceTierId {
  if (isBeijingWeekend(timeMs)) return 'offPeak'
  const minute = Math.floor(beijingMillisOfDay(timeMs) / 60_000)
  for (let i = 0; i + 1 < bounds.length; i += 2) {
    const start = bounds[i] ?? 0
    const end = bounds[i + 1] ?? 0
    if (minute >= start && minute < end) return 'peak'
  }
  return 'offPeak'
}

/** 时刻是否落在北京时间周末（周六/周日）。 */
function isBeijingWeekend(timeMs: number): boolean {
  const day = new Date(timeMs + 8 * 3_600_000).getUTCDay()
  return day === 0 || day === 6
}

/** 峰谷切换边界（北京时间的当日分钟数）：09:00 / 12:00 / 14:00 / 18:00。 */
const TIER_BOUNDARY_MINUTES: readonly number[] = [540, 720, 840, 1080]

/**
 * 智谱 Coding Plan 的高峰边界（北京时间当日分钟）：工作日 14:00–18:00 为高峰，
 * 额度按基础积分全额抵扣；其余时段（含周末全天）按基础积分 5 折抵扣。
 */
const ZHIPU_CODING_PLAN_BOUNDARY_MINUTES: readonly number[] = [840, 1080]

/** 北京时间的当日毫秒数（0–86,400,000）。 */
function beijingMillisOfDay(timeMs: number): number {
  return (((timeMs + 8 * 3_600_000) % 86_400_000) + 86_400_000) % 86_400_000
}

/**
 * 当前峰谷档位与距下一切换的时长。导出供测试：纯函数。
 *
 * 下一切换点统一定义为档位真正变化的最近边界：自当前时刻起逐天扫描工作日的
 * 09:00 / 12:00 / 14:00 / 18:00，候选时刻的档位由 {@link tierAt} 判定——
 * 周末（周六/周日）北京全天低谷、没有边界，扫描自然跳过；工作日深夜跨周末
 * 时落到周一 09:00 而非周末伪边界（issue #33）。
 * 最坏情形（周五 18:00 后 → 周一 09:00）约 63h，7 天窗口必然覆盖。
 * @param nowMs - 当前时刻（epoch 毫秒）。
 * @returns 当前档位与到下一切换边界的毫秒数。
 */
export function tierCountdown(nowMs: number): { tier: PriceTierId; nextSwitchInMs: number } {
  return tierCountdownWithBounds(nowMs, TIER_BOUNDARY_MINUTES)
}

/** 按给定峰段边界计算当前档位与距下一切换的时长（扫描结构与 tierCountdown 相同）。 */
function tierCountdownWithBounds(nowMs: number, bounds: readonly number[]): { tier: PriceTierId; nextSwitchInMs: number } {
  const tier = tierAtWithBounds(nowMs, bounds)
  const dayMs = beijingMillisOfDay(nowMs)
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const dayStart = dayOffset * 86_400_000 - dayMs
    for (const boundary of bounds) {
      const inMs = dayStart + boundary * 60_000
      // 当天已过的边界不是候选；未来的边界按同一边界集判档位是否真变化。
      if (inMs <= 0) continue
      if (tierAtWithBounds(nowMs + inMs, bounds) !== tier) {
        return { tier, nextSwitchInMs: inMs }
      }
    }
  }
  // 不可达兜底：7 天窗口内必有档位切换（任一工作日至少一对边界）。
  const firstBoundary = bounds[0] ?? 0
  return { tier, nextSwitchInMs: 86_400_000 - dayMs + firstBoundary * 60_000 }
}

/**
 * 峰/谷切换预告：距下次切换不足 leadMs 时返回即将进入的档位与切换时刻，
 * 否则 null。导出供测试：纯函数。
 * @param nowMs - 当前时刻（epoch 毫秒）。
 * @param leadMs - 提前量（毫秒）。
 */
export function upcomingTierSwitch(nowMs: number, leadMs: number): { entering: PriceTierId; atMs: number } | null {
  return upcomingSwitchWithBounds(nowMs, TIER_BOUNDARY_MINUTES, leadMs)
}

/** 按给定峰段边界的切换预告（扫描结构与 upcomingTierSwitch 相同）。 */
function upcomingSwitchWithBounds(nowMs: number, bounds: readonly number[], leadMs: number): { entering: PriceTierId; atMs: number } | null {
  const { nextSwitchInMs } = tierCountdownWithBounds(nowMs, bounds)
  if (nextSwitchInMs > leadMs) return null
  const atMs = nowMs + nextSwitchInMs
  // 边界另一侧的档位即即将进入的档位（边界时刻本身按新档位计）。
  return { entering: tierAtWithBounds(atMs, bounds), atMs }
}

/** 计费通道的峰谷窗口：无窗口 / DeepSeek 按量分时 / 智谱 Coding Plan 积分分时。 */
export type RateChannel = 'none' | 'deepseek-metered' | 'zhipu-coding-plan'

/**
 * 由会话当前模型与订阅状态推断峰谷窗口。DeepSeek 目录模型恒为按量分时；
 * 智谱模型仅在持有 Z.ai Coding Plan（status ok）时适用积分分时——智谱按量价
 * 全天统一，不涉及峰谷。其余模型（含未收录）返回 none：不显示档位、不提醒，
 * 峰谷提示严格跟随当前对话实际使用的模型而非全局规则。
 * @param modelKey - 当前会话最近一轮的计费目录键（归因模型 key）；无轮次时 undefined。
 * @param hasZhipuPlan - 是否存在状态正常的 Z.ai Coding Plan 订阅。
 * @returns 命中的峰谷窗口种类。
 */
export function rateChannelOf(modelKey: string | undefined, hasZhipuPlan: boolean): RateChannel {
  if (modelKey === undefined || modelKey === '') return 'none'
  const resolved = resolveCatalogKey(modelKey)
  const provider = modelCatalog().find(entry => entry.key === resolved)?.provider
  if (provider === 'DeepSeek') return 'deepseek-metered'
  if (hasZhipuPlan && provider === '智谱 AI') return 'zhipu-coding-plan'
  return 'none'
}

/** 按计费通道的峰谷倒计时：none 返回 null（调用方据此隐藏档位 UI 与切换预告）。 */
export function channelCountdown(nowMs: number, channel: RateChannel): { tier: PriceTierId; nextSwitchInMs: number } | null {
  switch (channel) {
    case 'deepseek-metered': return tierCountdownWithBounds(nowMs, TIER_BOUNDARY_MINUTES)
    case 'zhipu-coding-plan': return tierCountdownWithBounds(nowMs, ZHIPU_CODING_PLAN_BOUNDARY_MINUTES)
    case 'none': return null
  }
}

/** 按计费通道的切换预告：语义同 upcomingTierSwitch，窗口取自通道；none 恒 null。 */
export function channelUpcomingSwitch(nowMs: number, channel: RateChannel, leadMs: number): { entering: PriceTierId; atMs: number } | null {
  switch (channel) {
    case 'deepseek-metered': return upcomingSwitchWithBounds(nowMs, TIER_BOUNDARY_MINUTES, leadMs)
    case 'zhipu-coding-plan': return upcomingSwitchWithBounds(nowMs, ZHIPU_CODING_PLAN_BOUNDARY_MINUTES, leadMs)
    case 'none': return null
  }
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
   * 分档折扣覆盖：厂商对不同档位给不同折扣时逐档指定（如 GPT-5.6 Sol 促销为
   * 缓存 0.8 / 输入 0.8 / 输出 2/3）。缺省档位沿用 {@link factor}；单档取值
   * 仅 (0,1) 区间有效，非法值回落 factor。
   */
  factors?: Partial<Record<'input' | 'cacheHit' | 'cacheMiss' | 'output', number>>
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
  /**
   * 厂商已下线的模型（请求由继任型号服务、按继任单价计）：不进费率表面板，
   * 目录条目与历史回算保留——存量用量仍按原键计价与显示，删条目会破坏历史计算。
   */
  retired?: boolean
}

/**
 * 内置目录与别名表的运行时注入态：数据本体在 src/builtin-catalog.ts（仅随 node
 * 半构建发布）。宿主半区在插件 activate 时同步注入；客户端在 /api/billing/pricing
 * 首次响应时注入。未注入时目录为空——计价消费方走 UNSEEDED_OTHER 兜底（不产生
 * 费用），费率表渲染加载态，不视为错误。
 */
let builtinCatalog: readonly ModelEntry[] = []
let builtinAliases: Readonly<Record<string, string>> = {}

/**
 * 注入内置目录与别名表（两侧各调用一次：宿主 activate、客户端首个 pricing 响应）。
 * 重复注入整体替换并重建归一化索引。
 * @param catalog - 内置目录条目（BUILTIN_MODEL_CATALOG 全量）。
 * @param aliases - 内置别名表（BUILTIN_MODEL_KEY_ALIASES 全量）。
 */
export function applyBuiltinCatalog(
  catalog: readonly ModelEntry[],
  aliases: Readonly<Record<string, string>>,
): void {
  builtinCatalog = catalog
  builtinAliases = aliases
  canonIndexCache = undefined
}

/** 内置目录当前快照：未注入为空数组（client 首帧前渲染加载态）。 */
export function modelCatalog(): readonly ModelEntry[] {
  return builtinCatalog
}

/** 内置别名表当前快照：未注入为空对象。 */
export function modelKeyAliases(): Readonly<Record<string, string>> {
  return builtinAliases
}

/** 未注入时的目录兜底条目：与内置 other 条目同价（零价，不计费）。 */
const UNSEEDED_OTHER: ModelEntry = {
  key: 'other',
  name: '其他模型',
  provider: 'Custom',
  colorVar: 'dsw-static-neutral-bluish-500',
  price: { currency: 'CNY', input: 0, cacheHit: 0, cacheMiss: 0, output: 0 },
}

// ==== 以下为原目录 JSDoc 保留（条目结构说明），数据见 src/builtin-catalog.ts ====


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
 * 惰性构建：注入前目录为空，构建无意义；每次 applyBuiltinCatalog 后重建。
 */
let canonIndexCache: ReadonlyMap<string, string> | undefined

function canonIndex(): ReadonlyMap<string, string> {
  if (canonIndexCache !== undefined) return canonIndexCache
  const map = new Map<string, string>()
  const add = (candidate: string, target: string): void => {
    const canon = canonModelId(candidate)
    if (canon !== '' && !map.has(canon)) map.set(canon, target)
  }
  for (const entry of builtinCatalog) add(entry.key, entry.key)
  for (const [alias, key] of Object.entries(builtinAliases)) add(alias, key)
  for (const rate of FALLBACK_RATES) add(rate.key, rate.key)
  canonIndexCache = map
  return map
}

/**
 * 解析真实日志模型 id → 计费目录键。先精确别名映射（既有行为）；未命中时做
 * 归一化匹配（忽略大小写/分隔符/括号附注），命中内置目录 / 别名目标 / 兜底键 /
 * models.dev 补充键即返回其真实键；完全未知时保持原样（回退 other，不计费）。
 * 供聚合层折叠与客户端渲染共用，两侧一致。
 * @param id - 真实模型 id（日志里出现的形式）。
 * @returns 计费目录键。
 */
/**
 * 由一个未知模型 id 派生候选 id（仅当直接查全部未命中时才尝试）：
 * - 剥离组织前缀（`deepseek/deepseek-v4-flash` → `deepseek-v4-flash`）；
 * - 剥离尾部纯数字段（`deepseek-v4-flash-202605` / `-0731` → `deepseek-v4-flash`，
 *   覆盖 TokenHub / 官方按日期滚动的快照 id）；
 * - 两者组合派生。目录键本身（如 `mistral-large-2512`、`command-a-03-2025`）
 *   在直接查就已命中，永不进入派生分支，不受剥段影响。
 */
function derivedKeyCandidates(id: string): string[] {
  const out: string[] = []
  const push = (value: string): void => {
    if (value !== '' && !out.includes(value)) out.push(value)
  }
  const stripTrailingDigits = (value: string): void => {
    let base = value
    for (;;) {
      const next = base.replace(/[-_]\d{3,}$/u, '')
      if (next === base || next === '') return
      base = next
      push(base)
    }
  }
  const slash = id.lastIndexOf('/')
  if (slash > 0 && slash < id.length - 1) {
    const bare = id.slice(slash + 1)
    push(bare)
    stripTrailingDigits(bare)
  }
  stripTrailingDigits(id)
  return out
}

/** 查一个候选 id（用户别名 → 内置别名 → 目录归一化 → models.dev 补充）；未命中返回 undefined。 */
function lookupCandidate(candidate: string): string | undefined {
  const alias = userModelAliases?.[candidate] ?? modelKeyAliases()[candidate]
  if (alias !== undefined) return alias
  const canon = canonModelId(candidate)
  if (canon === '') return undefined
  const hit = canonIndex().get(canon)
  if (hit !== undefined) return hit
  const extraHit = (liveExtraModels ?? []).find(item => canonModelId(item.key) === canon)
  return extraHit?.key
}

export function resolveCatalogKey(id: string): string {
  const exact = userModelAliases?.[id] ?? modelKeyAliases()[id] ?? id
  if (exact === id) {
    // 精确别名未命中：做归一化匹配；命中即返回目标键。
    const canon = canonModelId(id)
    if (canon !== '') {
      const hit = canonIndex().get(canon)
      if (hit !== undefined) return hit
      const extraHit = (liveExtraModels ?? []).find(item => canonModelId(item.key) === canon)
      if (extraHit !== undefined) return extraHit.key
    }
    // 派生候选（剥组织前缀 / 尾部日期段）按同一口径匹配；全部未命中保持原样
    // （回退 other，不计费），绝不静默按其他模型的价格记账。
    for (const candidate of derivedKeyCandidates(id)) {
      const hit = lookupCandidate(candidate)
      if (hit !== undefined) return hit
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
  const found = modelCatalog().find(entry => entry.key === resolved)
  // 目录未命中时查 models.dev 补充条目（与宿主预制提供方对齐的实时价）。
  const extra = liveExtraModels?.find(item => item.key === resolved)
  const base = found ?? (extra !== undefined ? extraEntryOf(extra) : modelCatalog().at(-1) ?? UNSEEDED_OTHER)
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
  if (modelCatalog().some(entry => entry.key === resolved)) return true
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
 * 把限时促销折入条目单价：生效期内返回 price 主档与 offPeak 逐档乘折扣系数的
 * 副本（某档在 promo.factors 有合法覆盖时用覆盖值，否则用 promo.factor），
 * 其余字段原样保留；不在促销期（过期/未开始/factor 非法）原样返回。
 * 幂等由调用方保证——计价与费率表显示各自只折一次，勿对已折价副本重复应用。
 * @param entry - 目录条目（price 保持刊例价口径）。
 * @param nowMs - 判定时刻（epoch ms）。
 */
export function applyPromo(entry: ModelEntry, nowMs: number): ModelEntry {
  const { promo } = entry
  if (promo === undefined || !isPromoActive(promo, nowMs)) return entry
  // 分档覆盖只在厂商逐档给不同折扣时填写；未填档位沿用 factor。
  const factorOf = (field: 'input' | 'cacheHit' | 'cacheMiss' | 'output'): number =>
    promo.factors?.[field] ?? promo.factor
  const scaled = (band: PriceBand): PriceBand => ({
    input: band.input * factorOf('input'),
    cacheHit: band.cacheHit * factorOf('cacheHit'),
    ...(band.cacheMiss !== undefined ? { cacheMiss: band.cacheMiss * factorOf('cacheMiss') } : {}),
    output: band.output * factorOf('output'),
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
 * 内置条目按 nowMs 折算限时促销（生效中的条目显示折后单价，过期自动恢复刊例价），
 * 并滤除已下线条目（retired：官方下线的型号不进面板，目录与历史回算保留）。
 * @param nowMs - 促销判定时刻；缺省当前时刻。
 */
export function catalogEntries(nowMs: number = Date.now()): readonly ModelEntry[] {
  const entries: ModelEntry[] = [
    ...modelCatalog()
      .filter(entry => entry.retired !== true)
      .map(entry => applyPromo(entry, nowMs)),
  ]
  const known = new Set<string>(entries.map(entry => entry.key.toLowerCase()))
  const knownCanon = new Set<string>(entries.map(entry => canonModelId(entry.key)))
  for (const model of liveCatalogModels ?? []) {
    const rawKey = model.id.toLowerCase()
    const builtin = (() => {
      const aliasKey = resolveCatalogKey(model.id)
      return modelCatalog().find(item => item.key === aliasKey)
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
 * v1 峰谷档判定（峰谷开闸起、周末全谷分界止）：不豁免周末——该时段官方
 * 高峰时段为每天 9-12 / 14-18（周六日同样计峰）。仅用于历史事件计费；
 * 「当前时刻」的档位（提醒/时段条/费率展示）一律走 {@link tierAt} 现行规则。
 */
function tariffV1At(timeMs: number): PriceTierId {
  const beijingHour = (new Date(timeMs).getUTCHours() + 8) % 24
  return isPeakHour(beijingHour) ? 'peak' : 'offPeak'
}

/**
 * 按调用时刻精确判定高峰/空闲档并计价（P0-1：替代固定比例混合）。时刻未知
 * （null/NaN，理论不发生在真实事件流）时回退 {@link DEFAULT_PEAK_SHARE} 混合，
 * 保持旧语义不低估。平档模型（无 offPeak）两个时段同价。限时促销与峰谷档
 * 同口径：按事件时刻判定该笔流量当时享受的单价。
 *
 * 历史正确性（按变更节点分段适用规则，不统一套现行价重算历史）：
 * - 早于 {@link PEAK_ERA_START_MS} 的事件按当时官方基础价
 *   （{@link LEGACY_DEEPSEEK_BANDS}）计费；
 * - 峰谷开闸至 {@link WEEKEND_OFFPEAK_START_MS} 之间按 v1 规则（周末不豁免，
 *   周六日 9-12 / 14-18 计峰）；
 * - 周末全谷分界起按现行规则（{@link tierAt}，周六日全天低谷）。
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
  // 峰谷时代之前的历史流量按当时基础价计（用户价 = 实付价，跳过内置 legacy 口径）。
  const legacy = timeMs < PEAK_ERA_START_MS && entry.userPriced !== true
    ? LEGACY_DEEPSEEK_BANDS[entry.key]
    : undefined
  if (legacy !== undefined) return priceBandCost(legacy, buckets, 'CNY')
  // flash 系 2026-09-10 12:00 调价分界：分界前的事件按官方旧谷档价回算
  // （峰档 = 谷档 × 2，档位判定沿用当时的分段规则）；用户价跳过本表。
  const repriced = timeMs < FLASH_REPRICE_MS && entry.userPriced !== true
    ? FLASH_REPRICED_OFFPEAK[entry.key]
    : undefined
  if (repriced !== undefined) {
    const tier = timeMs < WEEKEND_OFFPEAK_START_MS ? tariffV1At(timeMs) : tierAt(timeMs)
    const band = tier === 'peak'
      ? { input: repriced.input * 2, cacheHit: repriced.cacheHit * 2, output: repriced.output * 2 }
      : repriced
    return priceBandCost(band, buckets, 'CNY')
  }
  if (priced.price.offPeak === undefined) return priceBandCost(priced.price, buckets, priced.price.currency)
  // 档位判定按事件时刻分段适用规则：v1 窗口不豁免周末，分界起周末全谷。
  const tier = timeMs < WEEKEND_OFFPEAK_START_MS ? tariffV1At(timeMs) : tierAt(timeMs)
  const band = tier === 'peak' ? priced.price : priced.price.offPeak
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
