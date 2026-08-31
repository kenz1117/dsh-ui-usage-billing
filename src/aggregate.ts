/**
 * Real-usage aggregation: folds every persisted session log into the
 * usage-stats document the dashboard renders.
 *
 * Each LLM call is attributed to the `message.source` carried by its own
 * `assistant/message` event (copied from the request at write time); the
 * sparse `request/header` is only a fallback. Costs are estimated with the
 * shared billing catalog (`pricing.ts`, in CNY), so only models the catalog
 * prices incur a cost — subscription-plan routes and unknown models price
 * zero while their tokens still count. Pure functions only: the persistence
 * handle is injected, so the fold is unit-testable without a host.
 */

import { stat } from 'node:fs/promises'
import type { SessionHeader } from '@deepseek-ai/dsh-session/types'
import type { SessionPersistence } from '@deepseek-ai/dsh-session-persistence'
import type { TokenUsage } from '@deepseek-ai/dsh-llm'
import { isPriced, MODEL_KEY_ALIASES, resolveCatalogKey, computeCostAt, modelOf, tierAt } from './client/pricing.ts'

// 模型别名（真实 provider id → 计费目录键）统一定义在 client/pricing.ts，
// 聚合层折叠与客户端渲染共用同一张表，避免两侧不一致导致「未收录」。
export { MODEL_KEY_ALIASES, resolveCatalogKey }

/**
 * 走订阅套餐（coding / token plan / opencode 订阅）的 provider id：这些通道的
 * 调用按套餐计费，不再按 token 计费，因此即使模型 id 与计费表撞名也一律豁免。
 * 与 pi-ai 内置提供方对齐（含各地区变体：qwen/xiaomi 的 token-plan、opencode 与
 * opencode-go、zai-coding-cn）；部署可在 plugin config 的 `subscriptionProviders`
 * 中覆盖。
 */
export const DEFAULT_SUBSCRIPTION_PROVIDERS: readonly string[] = [
  'kimi-coding',
  'zai-coding-cn',
  'opencode',
  'opencode-go',
  'qwen-token-plan',
  'qwen-token-plan-cn',
  'xiaomi-token-plan-ams',
  'xiaomi-token-plan-cn',
  'xiaomi-token-plan-sgp',
]

/**
 * 官方渠道 provider id 判定：`deepseek` 前缀（DeepSeek 官方直连）视为官方，
 * 其余 provider（第三方中转/代理）视为「三方」。用于「官方 vs 三方」token、
 * 调用与费用分桶展示；部署可由配置覆盖（见 {@link AggregateOptions}）。
 */
export function isOfficialProvider(provider: string): boolean {
  return /^deepseek(?:-[a-z0-9-]+)?$/i.test(provider.trim())
}

// ── 中转站（站点）归组 ──────────────────────────────────────────────────────

/** 一个 provider 路由的站点视图（来自 llm-pi-ai providers 的 baseURL）。 */
export interface ProviderRouteView {
  /** 该路由配置的端点地址；无值 = 直连厂商（非中转站）。 */
  baseURL?: string
}

/** 站点归属分类：site=中转站（有 baseURL origin）；direct=直连；unknown=未知路由（配置已删）。 */
export type SiteKind = 'site' | 'direct' | 'unknown'

/** 一个 provider 路由归类后的站点引用。 */
export interface SiteRef {
  kind: SiteKind
  /** 站点归一化 origin（仅 site）。 */
  origin?: string
  /** 原 provider 路由名。 */
  provider: string
}

/** 由 baseURL 归一化出站点 origin（协议 + 主机 + 端口）；解析失败回退原值。 */
export function siteOriginOf(baseURL: string): string {
  try {
    return new URL(baseURL).origin
  } catch {
    return baseURL
  }
}

/**
 * 把一个 provider 路由归类为站点引用。判定顺序（与路由在 provider 配置里的状态一致）：
 * - 路由存在于当前配置且配了 baseURL → 中转站 `site`（按 origin 归组，同站多 key 合并）；
 * - 路由存在于当前配置但无 baseURL → 厂商直连 `direct`；
 * - 路由不在当前配置里 → `unknown`（改过名 / 删除过，是「读不到」而非「直连」）。
 * @param provider - 会话日志里的 provider 路由名（request/header 的 `config.provider`）。
 * @param routes - 当前 provider 路由视图（来自 llm-pi-ai providers）。
 */
export function siteRefOf(provider: string, routes: Readonly<Record<string, ProviderRouteView>>): SiteRef {
  const view = routes[provider]
  if (view !== undefined) {
    if (view.baseURL !== undefined) return { kind: 'site', origin: siteOriginOf(view.baseURL), provider }
    return { kind: 'direct', provider }
  }
  return { kind: 'unknown', provider }
}

/** 站点桶的稳定 key：`site:<origin>` 与 `direct:<provider>` 分开，`unknown` 单一桶。 */
export function siteBucketKey(ref: SiteRef): string {
  if (ref.kind === 'site') return `site:${ref.origin ?? ''}`
  if (ref.kind === 'direct') return `direct:${ref.provider}`
  return 'unknown'
}

/** Aggregation tuning options. */
export interface AggregateOptions {
  /** 订阅制 provider id 列表；默认 {@link DEFAULT_SUBSCRIPTION_PROVIDERS}。 */
  subscriptionProviders?: readonly string[]
  /** 官方渠道 provider id 列表；默认按 {@link isOfficialProvider} 判定（DeepSeek 官方直连）。 */
  officialProviderIds?: readonly string[]
  /** 每会话折叠缓存的上限（默认 {@link DEFAULT_MAX_CACHE_SESSIONS}）；
   *  超限时按最近使用先后淘汰最久未用的会话，防长期运行内存膨胀。 */
  maxCacheSessions?: number
  /** 中转站归组来源：返回当前 provider 路由视图（llm-pi-ai providers 的 baseURL）。
   *  每次聚合时调用取最新值；缺省时全部路由按「未知路由」处理（无配置发现）。 */
  resolveRoutes?: () => Readonly<Record<string, ProviderRouteView>>
  /** 工作区标题解析：给定会话 cwd 返回项目显示标题；undefined = 回退到 cwd 末级目录名
   *  （host 的 workspaceRegistry 为可选依赖，缺失时不注入，行为保持不变）。 */
  resolveWorkspaceTitle?: (cwd: string) => string | undefined
  /** 独立的持久用量账本。启用后，已经成功折叠过的会话即使随后从
   *  sessionPersistence 中永久删除，也会继续计入累计用量。 */
  ledger?: UsageLedgerStore
  /** 联网搜索请求（`web/deepseek-search-llm-request`，无用量事件）的单次费用
   *  估算（人民币元）；默认 {@link DEFAULT_SEARCH_CALL_ESTIMATE_CNY}，设 0 关闭。 */
  searchCallEstimateCny?: number
}

/** 每会话折叠缓存默认上限：超过则按 LRU 淘汰（P1-6 峰值内存治理）。 */
export const DEFAULT_MAX_CACHE_SESSIONS = 400

/** One model's aggregated usage plus estimated cost in CNY. */
export interface ModelUsage {
  calls: number
  input: number
  output: number
  cacheHit: number
  cacheMiss: number
  /**
   * 显式缓存写入 token（部分厂商单独计价的 cache creation）——已包含在
   * `cacheMiss` 内，单列供结构展示；旧快照缺失。
   */
  cacheWrite?: number
  cost: number
  /** 输出中的 reasoning（思考）token；已包含在 `output` 内，单列用于结构展示。 */
  reasoning: number
  /** 该模型本次统计的所有调用是否都走订阅通道（coding/token plan）；混合通道不置位。 */
  plan?: boolean
  /** 走官方渠道的调用数（DeepSeek 官方直连；其余为三方）。 */
  officialCalls: number
  /** 走官方渠道的费用（CNY）；三方费用 = cost - officialCost。 */
  officialCost: number
  /**
   * 联网搜索辅助请求的估算调用数（`web/deepseek-search-llm-request`，日志只有
   * 请求无用量事件）；已按每次 `searchCallEstimateCny` 估算计入 `cost`，不计
   * token。旧快照缺失。
   */
  searchCalls?: number
}

/** Zeroed usage accumulator. */
export function emptyUsage(): ModelUsage {
  return { calls: 0, input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cost: 0, reasoning: 0, officialCalls: 0, officialCost: 0 }
}

/**
 * Fold one token usage event into an accumulator and re-price its cost.
 * The stats `input` is the TOTAL prompt tokens (cacheHit + cacheMiss), so the
 * miss bucket is uncached input plus cache writes.
 * @param acc - the accumulator to mutate.
 * @param usage - the provider-reported usage of one call.
 * @param key - the billing-catalog key this call belongs to.
 * @param subscription - whether the call went through a subscription plan; such calls never cost money.
 * @param timeMs - the call's wall-clock time (epoch ms); drives peak/off-peak pricing.
 * @param official - whether the call went through the official DeepSeek channel (vs a third-party relay).
 */
export function foldUsage(acc: ModelUsage, usage: TokenUsage, key: string, subscription: boolean, timeMs: number, official = false): void {
  const cacheHit = usage.cacheReadTokens ?? 0
  const cacheMiss = usage.inputTokens + (usage.cacheWriteTokens ?? 0)
  acc.calls += 1
  acc.input += usage.inputTokens + cacheHit + (usage.cacheWriteTokens ?? 0)
  acc.output += usage.outputTokens
  acc.reasoning += usage.reasoningTokens ?? 0
  acc.cacheHit += cacheHit
  acc.cacheMiss += cacheMiss
  // 显式缓存写入是 cacheMiss 的子集，仅部分厂商单独报告；无该维度的调用不写字段。
  if ((usage.cacheWriteTokens ?? 0) > 0) acc.cacheWrite = (acc.cacheWrite ?? 0) + (usage.cacheWriteTokens ?? 0)
  // 官方/三方分桶：官方直连调用数与其费用分别累加；三方=总量-官方。
  if (official) acc.officialCalls += 1
  // 订阅套餐不计费；未定价的模型（目录与 models.dev 补充条目都没有）记 0。
  // 费用按本次调用增量累加（计价是线性的）：同一桶内混入订阅/未知调用时，
  // 后面免费调用不再把整个桶的 cost 覆盖成 0。时段按本次调用的实际时刻精确判定。
  if (!subscription && isPriced(key)) {
    const thisCost = computeCostAt(modelOf(key), {
      input: cacheHit + cacheMiss,
      cacheHit,
      cacheMiss,
      output: usage.outputTokens,
    }, timeMs)
    acc.cost += thisCost
    if (official) acc.officialCost += thisCost
  }
}

/**
 * 联网搜索辅助请求的单次费用估算默认值（人民币元）。DeepSeek 官方对搜索请求
 * （web_search 服务端工具注入上下文）照常计费，实测每次约 0.01~0.03 元，取中值；
 * 部署可在插件配置 `searchCallEstimateCny` 覆盖（设 0 关闭估算）。
 */
export const DEFAULT_SEARCH_CALL_ESTIMATE_CNY = 0.02

/**
 * Fold one auxiliary web-search LLM request (issue #15) into an accumulator.
 * 这类调用绕过对话通道直连官方端点，日志只记请求（无响应/用量事件），token
 * 不可知：按「每次估值」计入费用并单独累计 `searchCalls`，不产生 token 维度。
 * @param acc - the accumulator to mutate.
 * @param estimateCny - per-call cost estimate in CNY; 0 disables the estimate.
 */
export function foldSearchCall(acc: ModelUsage, estimateCny: number): void {
  acc.calls += 1
  acc.searchCalls = (acc.searchCalls ?? 0) + 1
  // 搜索请求固定走 api.deepseek.com 官方端点（web-search-deepseek provider 私有 fetch）。
  acc.officialCalls += 1
  if (estimateCny > 0) {
    acc.cost += estimateCny
    acc.officialCost += estimateCny
  }
}

/** Local-time date stamp (the host runs in the user's timezone). */
export function dayStamp(time: number): string {
  const date = new Date(time)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Local-time hour stamp `YYYY-MM-DDTHH` — the performance series bucket key. */
export function hourStamp(time: number): string {
  const date = new Date(time)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}`
}

/**
 * 宿主进程的 IANA 时区名与 UTC 偏移，供面板标注「天按哪个时区切分」。
 * `getTimezoneOffset` 是 UTC 以西的分钟数，符号与日常写法相反，故取反。
 * @returns `{ name, offset }`，如 `{ name: "Asia/Shanghai", offset: "UTC+08:00" }`。
 */
export function hostTimeZone(now = new Date()): { name: string; offset: string } {
  const minutes = -now.getTimezoneOffset()
  const sign = minutes < 0 ? '-' : '+'
  const abs = Math.abs(minutes)
  const hh = String(Math.floor(abs / 60)).padStart(2, '0')
  const mm = String(abs % 60).padStart(2, '0')
  let name: string
  try {
    name = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    name = 'UTC'
  }
  return { name, offset: `UTC${sign}${hh}:${mm}` }
}

/** cwd 未知时工作区聚合的占位名（UI 显示 em dash，保持语言无关）。 */
export const UNKNOWN_WORKSPACE_NAME = '—'

/** 工作区名：取 cwd 的末级目录名；无 cwd 时返回 {@link UNKNOWN_WORKSPACE_NAME}。 */
export function workspaceNameOf(cwd: string | undefined): string {
  if (cwd === undefined || cwd === '') return UNKNOWN_WORKSPACE_NAME
  const parts = cwd.split(/[\\/]/).filter(Boolean)
  return parts.at(-1) ?? UNKNOWN_WORKSPACE_NAME
}

/**
 * The persistence surface the aggregate reads: enough of
 * `SessionPersistence` to list sessions and read each log once; `locate`
 * is optional — backends exposing it give the incremental cache a cheap
 * invalidation stamp (artifact mtime + size), others always re-fold.
 */
export type UsagePersistence = Pick<SessionPersistence, 'list' | 'readFrom'> & Partial<Pick<SessionPersistence, 'locate'>>

/** The usage-stats document served to the billing dashboard. */
export interface UsageStatsDocument {
  version: number
  updatedAt: number
  source: 'session-logs'
  /** 宿主进程时区（IANA 名 + UTC 偏移）：天按此切分，面板据此标注。 */
  timezone?: { name: string; offset: string }
  total: ModelUsage
  byModel: Record<string, ModelUsage>
  byDay: Record<string, ModelUsage>
  /** 模型 × 日期 二维统计：趋势图按模型堆叠的输入（[date][modelKey]）。 */
  byDayModels: Record<string, Record<string, ModelUsage>>
  /**
   * 模型 × 日期 × 站点 三维统计（[date][modelKey][siteKey]）：供「按 origin 绑定
   * 自定义价」的显示层重估（issue #16）——只有这个维度能知道「某模型从某中转站
   * 消耗了多少 token」。旧算法快照缺失。
   */
  byDayModelsSite?: Record<string, Record<string, Record<string, ModelUsage>>>
  /**
   * 峰谷分桶（真实判档）：折叠时逐调用按 `tierAt(event.time)` 归入高峰/低谷桶，
   * 峰谷占比与「挪谷省钱」据此展示，不再按比例估算。旧快照可能缺失。
   */
  byTier?: { peak: ModelUsage; offPeak: ModelUsage }
  /** 工具调用次数排行（键 = 工具名，按调用数倒序）；token 无法按工具归因，仅计次。旧快照可能缺失。 */
  byTool?: Record<string, number>
  /** 会话明细：按费用倒序，封顶 {@link SESSION_ROW_LIMIT} 行；旧快照可能缺失。 */
  bySession: SessionUsageRow[]
  /** 每轮费用明细：按起始时间倒序，封顶 {@link TURN_ROW_LIMIT} 行；旧快照可能缺失。 */
  byTurn?: TurnUsageRow[]
  /** 工作区聚合：按 cwd 末级目录归并，按费用倒序；旧快照可能缺失。 */
  byWorkspace?: WorkspaceUsageRow[]
  /**
   * 中转站归组：按 provider 路由归类到站点（有 baseURL 按 origin 归组）、直连、未知路由；
   * key 为 {@link siteBucketKey} 的稳定值（`site:<origin>` / `direct:<provider>` / `unknown`）。
   * 旧快照可能缺失。
   */
  bySite?: Record<string, ModelUsage>
  /**
   * 按角色费用归因（人民币元）：助手输出成本为实测计价；输入成本按会话内
   * 用户消息 / 工具结果的文本长度占比启发式摊分（日志无角色级 token 实测，
   * 属估算口径，UI 需标注）。旧快照可能缺失。
   */
  byRole?: RoleCost
  /** 不可计价的模型 id（未收录 / 无价，费用按 0 计）；供面板提示用户自查与反馈。 */
  unpricedModels?: readonly string[]
  /** 联网搜索请求的单次费用估算（人民币元，配置回显）；0 或缺省 = 未启用估算。 */
  searchCallEstimateCny?: number
  /**
   * 性能指标（TTFT / 生成速度 / 总延迟）按模型与按小时聚合；旧快照可能缺失。
   * 口径：TTFT = request/header → 首个内容 chunk；生成速度 = 输出 token ÷ 生成时长；
   * 总延迟 = request/header → assistant/message。工具续写步骤无独立请求头，
   * 以 step/start 为起点估算并计 estimated。
   */
  perf?: PerfStats
}

/** 按角色费用归因：user / tool 为输入成本的启发式摊分，assistant 为输出成本实测。 */
export interface RoleCost {
  user: number
  assistant: number
  tool: number
}

/**
 * 性能指标（TTFT / 生成速度 / 总延迟）：按模型与按小时聚合，供「性能」面板渲染。
 * 旧快照（无 perf 字段）缺失时客户端按无数据兜底。
 */
export interface PerfStats {
  /** 按模型聚合（键 = 计费目录键；未收录模型原样保留）。 */
  byModel: Record<string, ModelPerf>
  /** 按小时聚合（键 = {@link hourStamp}，北京时间）。 */
  byHour: Record<string, HourPerf>
}

/** 一个模型的性能统计：首字延时均值 / P50 / P90、生成速度均值、总延迟均值。 */
export interface ModelPerf {
  /** 有效性能样本数（有可测 TTFT 的调用；不含损毁样本）。 */
  samples: number
  /** 平均首字延时（毫秒）。 */
  ttftAvg: number
  /** 首字延时 P50（毫秒）。 */
  ttftP50: number
  /** 首字延时 P90（毫秒）。 */
  ttftP90: number
  /** 首字延时最大值（毫秒）；定位偶发慢响应。 */
  ttftMax: number
  /** 首字延时尖峰样本数（> 10s）；定位服务端抖动。 */
  ttftSpikes: number
  /** 平均生成速度（tokens/s）；生成了有效输出且时长可测时存在。 */
  tpsAvg?: number
  /** 平均总延迟（首次请求 → 响应完成，毫秒）。 */
  latencyAvg: number
  /** 以 step/start 估算的样本数（工具续写步骤无独立 request/header）。 */
  estimatedSamples: number
}

/** 一个小时的性能统计（键 = {@link hourStamp}）。 */
export interface HourPerf {
  samples: number
  ttftAvg: number
  /** 平均生成速度（tokens/s）；该小时无可测生成窗口时缺失。 */
  tpsAvg?: number
}

/** 会话明细行：仪表盘「会话明细」面板的数据源。 */
export interface SessionUsageRow {
  /** 会话 id（字符串形式）。 */
  id: string
  /** 日志里最新的 session/title 文本；无标题事件时缺失。 */
  title?: string
  /** 会话创建时的工作目录（项目路径）；未知时缺失。 */
  cwd?: string
  calls: number
  cost: number
  /** 最后一个事件的时间戳（毫秒）。 */
  lastActive: number
  /** 数据来自旧算法折叠的持久账本行（日志已删/不可读，无法重算）；UI 据此标注置信度。 */
  stale?: boolean
}

/** 每轮费用明细行：仪表盘「每轮费用」图的数据源。 */
export interface TurnUsageRow {
  /** 会话 id（字符串形式）：不同会话的轮次号相互独立，展示时需区分。 */
  sessionId: string
  /** 会话内轮次号。 */
  turn: number
  /** 归因模型 key（计费目录键；未收录原样保留）。 */
  model: string
  input: number
  output: number
  cacheHit: number
  cacheMiss: number
  /** 该轮成本（人民币元，按调用时刻精确判高峰/空闲档）。 */
  cost: number
  /** 轮起始时刻（毫秒）。 */
  startedAt: number
  /** 轮结束时刻（毫秒）；未结束轮缺失。 */
  endedAt?: number
}

/** 会话内折叠的每轮行（不含 sessionId，合并时补齐）。 */
type SessionTurnRow = Omit<TurnUsageRow, 'sessionId'>

/** 工作区聚合行：按会话 cwd 的末级目录归并。 */
export interface WorkspaceUsageRow {
  /** 目录末级名；cwd 未知的会话归入「未命名」。 */
  name: string
  calls: number
  cost: number
  input: number
  output: number
  /** 该工作区最近一次活跃时刻（毫秒）。 */
  lastActive: number
}

/** 会话明细行的响应封顶：控制 payload 体积，重度用户的完整长尾不逐行下发。 */
export const SESSION_ROW_LIMIT = 100

/** 每轮费用行的响应封顶：同样控制 payload 体积。 */
export const TURN_ROW_LIMIT = 200

/** 聚合文档的短 TTL（毫秒）：合并密集轮询，TTL 内直接复用上次的合并结果。 */
export const AGGREGATE_TTL_MS = 5000

/** TTFT 尖峰阈值（毫秒）：超过计为一次尖峰样本，用于定位服务端抖动。 */
export const PERF_SPIKE_MS = 10_000

/** 单步性能样本（foldSession 的折叠产物；跨会话合并时按模型/小时再聚合）。 */
export interface PerfSample {
  /** 计费目录键（模型；未收录模型原样保留）。 */
  model: string
  /** 北京时间小时戳（{@link hourStamp}）——性能曲线的时间桶键。 */
  hour: string
  /** 首字延时（毫秒）；无效样本（超出 sane 上限）不入样本集。 */
  ttftMs: number
  /** 生成速度（tokens/s）；无有效生成窗口或无输出时缺失。 */
  tps?: number
  /** 总延迟（首次请求 → 响应完成，毫秒）；只测到内容但完成时刻优先于起点时缺失。 */
  latencyMs?: number
  /** 无独立 request/header，以 step/start 起算（工具续写步骤）。 */
  estimated: boolean
}

/** 一个 step 的性能时间状态机（keyed `${turn}:${step}`）。 */
interface StepPerf {
  /** step/start 时刻；无独立请求头时作为 TTFT 估算起点。 */
  startTime: number
  /** request/header 时刻（TTFT 起点）；工具续写步骤缺失。 */
  requestTime?: number
  /** 首个内容 chunk 时刻。 */
  firstContentTime?: number
  /** 最后一个内容 chunk 时刻。 */
  lastContentTime?: number
}

/** One persisted session's folded usage plus drill-down metadata. */
export interface SessionFold {
  total: ModelUsage
  byModel: Map<string, ModelUsage>
  byDay: Map<string, ModelUsage>
  byDayModels: Map<string, Map<string, ModelUsage>>
  /** 模型×日期×站点三维（issue #16）：供按 origin 绑定自定义价的显示层重估。 */
  byDayModelsSite: Map<string, Map<string, Map<string, ModelUsage>>>
  /** 峰谷分桶：折叠时按调用时刻精确判档（tierAt），键 = 'peak' / 'offPeak'。 */
  byTier: Map<string, ModelUsage>
  /** 工具调用次数（键 = 工具名；tool-call-delta 首见计数）。 */
  byTool: Map<string, number>
  /** 中转站归组：按 provider 路由归类到站点/直连/未知路由（key = {@link siteBucketKey}）。 */
  bySite: Map<string, ModelUsage>
  /** 不可计价模型 id（未收录/无价，且非订阅）集合；跨会话合并后输出给面板提示。 */
  unpricedModels: Set<string>
  /** 每个模型 key 在本会话内走订阅通道的调用数（合并时跨会话累加判定 plan）。 */
  planCalls: Map<string, number>
  /** 每轮费用明细（按轮次号升序，不含 sessionId）；sessionId 在合并时补齐。 */
  turns: SessionTurnRow[]
  /** 性能样本（有可测 TTFT 的调用，按事件次序折叠）。 */
  perf: PerfSample[]
  /** 角色归因中间量：消息文本长度（user/tool）与输入/输出成本实测拆分。 */
  roles: RoleFold
  /** 日志里最新的 session/title 文本（无标题事件时 undefined）。 */
  title?: string
  /** 最后一个事件的时间戳（毫秒）；空日志为 0。 */
  lastActive: number
}

/** 角色归因的会话级中间量：字符占比用于把输入成本摊到 user/tool。 */
interface RoleFold {
  userChars: number
  toolChars: number
  /** 输入侧成本（缓存命中 + 未命中 + 缓存写入，人民币元）。 */
  inputCost: number
  /** 输出侧成本（人民币元）。 */
  outputCost: number
}

/** JSON-safe form of one session fold, used by the durable usage ledger. */
export interface SerializedSessionFold {
  total: ModelUsage
  byModel: Record<string, ModelUsage>
  byDay: Record<string, ModelUsage>
  byDayModels: Record<string, Record<string, ModelUsage>>
  /** 1.0.10（issue #16）新增；模型×日期×站点三维，旧账本行缺失（合并按空处理）。 */
  byDayModelsSite?: Record<string, Record<string, Record<string, ModelUsage>>>
  /** 1.0.8 起新增；旧账本行缺失（合并时按空处理，不触发重折算）。 */
  byTier?: Record<string, ModelUsage>
  byTool?: Record<string, number>
  bySite: Record<string, ModelUsage>
  unpricedModels: string[]
  planCalls: Record<string, number>
  turns: SessionTurnRow[]
  perf: PerfSample[]
  roles: RoleFold
  lastActive: number
}

/** One independently retained session in the durable usage ledger. */
export interface UsageLedgerSession {
  id: string
  cwd?: string
  /** Stable log stamp (mtime + size) when the persistence backend exposes it. */
  stamp?: string
  /**
   * 折叠该行时的算法版本（{@link FOLD_VERSION}）。缺失 = 1.0.6 及更早写入的
   * 旧算法行（加载边界由迁移统一回填为 1）。
   */
  foldVersion?: number
  fold: SerializedSessionFold
}

/** On-disk durable usage ledger. Versioned independently from the dashboard document. */
export interface UsageLedgerDocument {
  version: 1
  updatedAt: number
  sessions: UsageLedgerSession[]
  /** 已应用的一次性配置迁移 id 列表（随文档落盘；缺省 = 尚未跑过任何迁移）。 */
  appliedMigrations?: string[]
}

/**
 * 折叠算法版本：归账语义变化时递增。v1 = 按 request/header 归账（稀疏 header 把
 * 两次 header 之间的用量串到上一个模型，订阅模型首当其冲，issue #14）；v2 =
 * `assistant/message` 自带 source 归账（1.0.7 起）；v3 = 联网搜索请求按次估算
 * 计费（issue #15，1.0.9 起）；v4 = 模型×日期×站点三维桶（issue #16，按 origin
 * 绑定自定义价的显示层重估）——旧行缺该维度，按无 origin 价处理。
 * 持久账本行据此区分新旧算法：日志已删/不可读而只能沿用旧行时，UI 标注置信度提示。
 */
export const FOLD_VERSION = 5

/**
 * 一次性账本迁移：id 唯一，apply 在加载边界对原始文档执行，已应用过的跳过。
 * 未来账本/schema 字段变更（重命名、拆桶、语义调整）时，在此追加一条迁移并
 * bump {@link UsageLedgerDocument.version}；引擎保证幂等，重启不会重复执行。
 * 可选字段的向后兼容回填（如 foldVersion）不 bump version：旧版本插件仍能读新文件。
 */
export interface LedgerMigration {
  id: string
  /** 对原始文档执行就地变更；返回是否产生了需要落盘的实际修改。 */
  apply(document: UsageLedgerDocument): boolean
}

/**
 * 账本迁移注册表。首条迁移给 1.0.6 及更早的行回填 foldVersion = 1（它们全部出自
 * header 归因算法）；此后新写入的行总带当前 {@link FOLD_VERSION}。
 */
export const LEDGER_MIGRATIONS: readonly LedgerMigration[] = [
  {
    id: 'fold-version-backfill',
    apply(document) {
      let changed = false
      for (const session of document.sessions) {
        if (session.foldVersion === undefined) {
          session.foldVersion = 1
          changed = true
        }
      }
      return changed
    },
  },
]

/**
 * 在加载边界对账本文档应用未执行的迁移，并记录已应用 id 供写回。
 * @param document - 从持久化读出的原始账本文档。
 * @param migrations - 待执行的迁移注册表；缺省用模块级 {@link LEDGER_MIGRATIONS}。
 * @returns 是否发生了需要重新落盘的修改。
 */
export function runLedgerMigrations(
  document: UsageLedgerDocument,
  migrations: readonly LedgerMigration[] = LEDGER_MIGRATIONS,
): boolean {
  const applied = new Set(document.appliedMigrations ?? [])
  let changed = false
  for (const migration of migrations) {
    if (applied.has(migration.id)) continue
    if (migration.apply(document)) changed = true
    applied.add(migration.id)
  }
  if (applied.size > 0 && (document.appliedMigrations === undefined
    || document.appliedMigrations.length !== applied.size
    || document.appliedMigrations.some(id => !applied.has(id)))) {
    document.appliedMigrations = [...applied]
    changed = true
  }
  return changed
}

/** Storage seam for the durable ledger; the host supplies an atomic file implementation. */
export interface UsageLedgerStore {
  load(): Promise<unknown | undefined>
  save(document: UsageLedgerDocument): Promise<void>
}

/** Serialize Map/Set-heavy fold state into a JSON-safe ledger entry. */
function serializeFold(fold: SessionFold): SerializedSessionFold {
  return {
    total: fold.total,
    byModel: Object.fromEntries(fold.byModel),
    byDay: Object.fromEntries(fold.byDay),
    byDayModels: Object.fromEntries([...fold.byDayModels].map(([day, models]) => [day, Object.fromEntries(models)])),
    byDayModelsSite: Object.fromEntries([...fold.byDayModelsSite].map(([day, models]) =>
      [day, Object.fromEntries([...models].map(([model, sites]) => [model, Object.fromEntries(sites)]))])),
    byTier: Object.fromEntries(fold.byTier),
    byTool: Object.fromEntries(fold.byTool),
    bySite: Object.fromEntries(fold.bySite),
    unpricedModels: [...fold.unpricedModels],
    planCalls: Object.fromEntries(fold.planCalls),
    turns: fold.turns,
    perf: fold.perf,
    roles: fold.roles,
    lastActive: fold.lastActive,
  }
}

/** Restore a JSON-safe ledger fold into the in-memory Map/Set representation. */
function deserializeFold(fold: SerializedSessionFold): SessionFold {
  return {
    total: fold.total,
    byModel: new Map(Object.entries(fold.byModel)),
    byDay: new Map(Object.entries(fold.byDay)),
    byDayModels: new Map(Object.entries(fold.byDayModels).map(([day, models]) => [day, new Map(Object.entries(models))])),
    // 1.0.10 前的账本行没有三维桶：按空处理（「按 origin 绑定自定义价」对这些会话不可用）。
    byDayModelsSite: new Map(Object.entries(fold.byDayModelsSite ?? {}).map(([day, models]) =>
      [day, new Map(Object.entries(models).map(([model, sites]) => [model, new Map(Object.entries(sites))]))])),
    // 1.0.8 前的账本行没有这两个桶：按空处理，峰谷占比等新维度对这些会话缺省。
    byTier: new Map(Object.entries(fold.byTier ?? {})),
    byTool: new Map(Object.entries(fold.byTool ?? {})),
    bySite: new Map(Object.entries(fold.bySite)),
    unpricedModels: new Set(fold.unpricedModels),
    planCalls: new Map(Object.entries(fold.planCalls)),
    turns: fold.turns,
    perf: fold.perf,
    roles: fold.roles,
    lastActive: fold.lastActive,
  }
}

/** Runtime boundary for a user-editable/corrupt ledger file. Invalid rows are ignored. */
function ledgerSessionsOf(value: unknown): UsageLedgerSession[] {
  if (value === null || typeof value !== 'object') return []
  const document = value as { version?: unknown; sessions?: unknown }
  if (document.version !== 1 || !Array.isArray(document.sessions)) return []
  return document.sessions.filter((entry): entry is UsageLedgerSession => {
    if (entry === null || typeof entry !== 'object') return false
    const row = entry as { id?: unknown; fold?: unknown }
    if (typeof row.id !== 'string' || row.id === '' || row.fold === null || typeof row.fold !== 'object') return false
    const fold = row.fold as Partial<SerializedSessionFold>
    return fold.total !== undefined
      && fold.byModel !== undefined
      && fold.byDay !== undefined
      && fold.byDayModels !== undefined
      && fold.bySite !== undefined
      && Array.isArray(fold.unpricedModels)
      && fold.planCalls !== undefined
      && Array.isArray(fold.turns)
      && Array.isArray(fold.perf)
      && fold.roles !== undefined
      && typeof fold.lastActive === 'number'
  })
}

/**
 * 消息文本长度：user/tool 角色分摊输入成本的启发式依据。字符串内容取其
 * 长度；内容块数组累计文本块长度；其余形状按 0 计（durable 边界收窄）。
 */
export function messageTextLength(message: unknown): number {
  if (message === null || typeof message !== 'object') return 0
  const content = (message as { content?: unknown }).content
  if (typeof content === 'string') return content.length
  if (!Array.isArray(content)) return 0
  let total = 0
  for (const block of content) {
    const text = (block as { text?: unknown } | null)?.text
    if (typeof text === 'string') total += text.length
  }
  return total
}

/** Get-or-create one model cell inside a usage map (avoids non-null assertions). */
function usageCell(map: Map<string, ModelUsage>, key: string): ModelUsage {
  const existing = map.get(key)
  if (existing !== undefined) return existing
  const fresh = emptyUsage()
  map.set(key, fresh)
  return fresh
}

/** Get-or-create one day's model cell inside the two-dimensional map. */
function modelDayCell(map: Map<string, Map<string, ModelUsage>>, day: string, modelKey: string): ModelUsage {
  let models = map.get(day)
  if (models === undefined) {
    models = new Map()
    map.set(day, models)
  }
  return usageCell(models, modelKey)
}

/** Get-or-create one day×model×site cell inside the three-dimensional map. */
function modelDaySiteCell(
  map: Map<string, Map<string, Map<string, ModelUsage>>>,
  day: string,
  modelKey: string,
  siteKey: string,
): ModelUsage {
  let models = map.get(day)
  if (models === undefined) {
    models = new Map()
    map.set(day, models)
  }
  let sites = models.get(modelKey)
  if (sites === undefined) {
    sites = new Map()
    models.set(modelKey, sites)
  }
  return usageCell(sites, siteKey)
}

/** 每轮折叠的中间状态：turn/start 设起点，turn/end 设终点，调用累加桶与成本。 */
interface TurnState {
  turn: number
  model: string
  input: number
  output: number
  cacheHit: number
  cacheMiss: number
  cost: number
  startedAt: number
  endedAt?: number
}

/** Get-or-create one turn's accumulation state. */
function turnState(turns: Map<number, TurnState>, turn: number): TurnState {
  const existing = turns.get(turn)
  if (existing !== undefined) return existing
  const fresh: TurnState = { turn, model: 'other', input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cost: 0, startedAt: Number.MAX_SAFE_INTEGER }
  turns.set(turn, fresh)
  return fresh
}

/**
 * Fold one session's events into a {@link SessionFold}. 每个 LLM 调用归属到
 * 其 `assistant/message` 自带 `message.source` 记录的模型（agent-loop 落盘时从
 * 当次请求复制，每个调用一条，不依赖稀疏的 request/header）；source 缺失时
 * 兜底到最近一次 request/header 的状态。同时提取最新会话标题、最后活跃时间，
 * 并按轮次折叠每轮费用明细（turn/start → turn/end；调用按 (turn) 归组）。
 * @param events - the session's persisted events in log order.
 * @param subscriptionProviders - provider ids billed through subscription plans.
 * @param officialProviderIds - provider ids treated as the official DeepSeek channel
 *   (default: any `deepseek`-prefixed id). Others count as third-party.
 * @param routes - 当前 provider 路由视图（中转站归组）。
 * @param searchCallEstimateCny - 联网搜索请求的单次费用估算（人民币元；0 关闭估算）。
 * @returns the per-session fold (cached by the incremental aggregator).
 */
export function foldSession(
  events: readonly { type: string; time: number; data: never; seq?: number }[],
  subscriptionProviders: ReadonlySet<string>,
  officialProviderIds?: ReadonlySet<string>,
  routes: Readonly<Record<string, ProviderRouteView>> = {},
  searchCallEstimateCny: number = DEFAULT_SEARCH_CALL_ESTIMATE_CNY,
): SessionFold {
  // Fork 种子过滤：从父会话 fork 出来的子会话，会把父会话的事件流整段拷贝进
  // 本会话日志作为构造种子，并在种子末尾追加一个 `session/end-seed` 边界事件，
  // 该事件的 `seq` = 种子事件数。种子事件在父会话里已经贡献过一次用量，若再
  // 折叠会重复计费，因此跳过 `seq < 边界` 的所有事件。
  // 多重 fork 链（A fork B fork C）会出现多个 end-seed：C 的种子包含 B 的
  // end-seed 与 B 的 own 事件，此时一律取**最后一个** end-seed 的 seq 作为边界，
  // 才能把 B 的 own 事件（对 C 而言也是种子）一并跳过。
  let seedBoundary = -1
  for (const event of events) {
    if (event.type === 'session/end-seed' && typeof event.seq === 'number' && Number.isFinite(event.seq)) {
      seedBoundary = Math.max(seedBoundary, event.seq)
    }
  }
  // Fork 种子去重边界。`session/end-seed` 既出现在 fork 子会话（父拷贝种子 + 子 own），
  // 也出现在 resume/continue 会话（每续写一段就在末尾标记一段结束），单看事件无法区分。
  // 只当 end-seed **之后确实还有事件**（seq > 边界，即真正的续写 / own 部分）时才把
  // `seq < 边界` 当父会话种子跳过；末尾就是 end-seed（其后无事件）的会话不做跳过，
  // 否则会把 resume 续写会话的全部真实调用（如 697 次的大会话）误当种子整体丢弃。
  if (seedBoundary >= 0) {
    const hasAfterSeed = events.some(event => typeof event.seq === 'number' && Number.isFinite(event.seq) && event.seq > seedBoundary)
    if (!hasAfterSeed) seedBoundary = -1
  }
  const fold: SessionFold = {
    total: emptyUsage(),
    byModel: new Map(),
    byDay: new Map(),
    byDayModels: new Map(),
    byDayModelsSite: new Map(),
    byTier: new Map(),
    byTool: new Map(),
    bySite: new Map(),
    unpricedModels: new Set(),
    planCalls: new Map(),
    turns: [],
    perf: [],
    roles: { userChars: 0, toolChars: 0, inputCost: 0, outputCost: 0 },
    lastActive: 0,
  }
  let key = 'other'
  let subscription = false
  let official = false
  // 站点桶/模型/订阅/官方的 header 兜底状态：assistant/message 自带 source 时
  // 以 source 为准；极旧格式日志缺 source 才落到这里维护的值。
  let siteBucket = 'unknown'
  const turns = new Map<number, TurnState>()
  // 性能时间状态机：按 (turn, step) 归属 request/header 与内容 chunk 的时刻。
  const steps = new Map<string, StepPerf>()
  // 最近一次 step/start 打开的 step；request/header 不带 turn/step，需借此归属。
  let lastOpenStepKey: string | undefined
  // 已计数的工具调用（key = `${turn}:${step}:${index}`）：tool-call-delta 的每个
  // 增量都重复携带工具名，只在首见时计一次调用。
  const toolSeen = new Set<string>()
  for (const event of events) {
    // Fork 种子跳过：`seq < 边界` 的事件是父会话拷贝来的种子，已计过一次费，
    // 不再折叠（多重 fork 链取最后一个 end-seed，见上方边界扫描）。
    if (seedBoundary >= 0 && typeof event.seq === 'number' && Number.isFinite(event.seq) && event.seq < seedBoundary) {
      continue
    }
    fold.lastActive = Math.max(fold.lastActive, event.time)
    // session/title 由 dsh-session-title 经声明合并注册，本包不引用它，
    // 故按持久化数据的字面类型判定并做运行时收窄（durable 边界）。
    if (event.type === 'session/title') {
      const title = (event.data as { title?: unknown }).title
      if (typeof title === 'string' && title.length > 0) fold.title = title
      continue
    }
    // 角色归因：用户消息与工具结果的文本长度（输入成本摊分的启发式依据）。
    if (event.type === 'user/message') {
      fold.roles.userChars += messageTextLength((event.data as { message?: unknown }).message)
      continue
    }
    if (event.type === 'tool/result') {
      fold.roles.toolChars += messageTextLength((event.data as { message?: unknown }).message)
      continue
    }
    if (event.type === 'turn/start') {
      const turn = (event.data as { turn?: number }).turn ?? -1
      const state = turnState(turns, turn)
      if (event.time < state.startedAt) state.startedAt = event.time
      continue
    }
    if (event.type === 'turn/end') {
      const turn = (event.data as { turn?: number }).turn ?? -1
      const state = turns.get(turn)
      if (state !== undefined) state.endedAt = event.time
      continue
    }
    if (event.type === 'step/start') {
      const turn = (event.data as { turn?: number }).turn
      const step = (event.data as { step?: number }).step
      if (typeof turn === 'number' && typeof step === 'number') {
        const stepKey = `${turn}:${step}`
        steps.set(stepKey, { startTime: event.time })
        lastOpenStepKey = stepKey
      }
      continue
    }
    if (event.type === 'request/header') {
      const { model, provider } = (event.data as { header: { config: { model: string; provider: string } } }).header.config
      key = resolveCatalogKey(model)
      // 订阅套餐 provider 的调用即使撞名计费表也一律免费。
      subscription = subscriptionProviders.has(provider)
      // 官方直连（DeepSeek 官方）vs 第三方中转/代理。
      official = officialProviderIds === undefined ? isOfficialProvider(provider) : officialProviderIds.has(provider)
      // 中转站归组：按当前路由映射到站点/直连/未知路由。
      siteBucket = siteBucketKey(siteRefOf(provider, routes))
      // request/header 是该 step 的 TTFT 起点；归属到最近打开的 step（无独立请求头的
      // 工具续写步骤保持 undefined，以 step/start 起算估算）。
      if (lastOpenStepKey !== undefined) {
        const stepState = steps.get(lastOpenStepKey)
        if (stepState !== undefined && stepState.requestTime === undefined) stepState.requestTime = event.time
      }
      continue
    }
    if (event.type === 'web/deepseek-search-llm-request') {
      // 联网搜索辅助请求（issue #15）：DSH 的搜索绕过对话通道直连官方
      // api.deepseek.com，日志只记请求、没有响应/用量事件，开放平台却照常
      // 计费。按「每次估值」计入费用（可配，设 0 关闭），token 维度不动；
      // 模型取请求 body 的 model（归一化到计费目录键），站点桶固定
      // direct:deepseek（不走 llm-pi-ai 路由，天然是官方直连）。
      const model = (event.data as { body?: { model?: unknown } }).body?.model
      const modelKey = typeof model === 'string' && model !== '' ? resolveCatalogKey(model) : 'other'
      const day = dayStamp(event.time)
      const siteKey = siteBucketKey({ kind: 'direct', provider: 'deepseek' })
      foldSearchCall(fold.total, searchCallEstimateCny)
      foldSearchCall(usageCell(fold.byModel, modelKey), searchCallEstimateCny)
      foldSearchCall(usageCell(fold.byDay, day), searchCallEstimateCny)
      foldSearchCall(modelDayCell(fold.byDayModels, day, modelKey), searchCallEstimateCny)
      foldSearchCall(modelDaySiteCell(fold.byDayModelsSite, day, modelKey, siteKey), searchCallEstimateCny)
      foldSearchCall(usageCell(fold.bySite, siteKey), searchCallEstimateCny)
      foldSearchCall(usageCell(fold.byTier, tierAt(event.time)), searchCallEstimateCny)
      continue
    }
    if (event.type === 'assistant/chunk') {
      const data = event.data as { turn?: unknown; step?: unknown; chunk?: { type?: string } }
      const turn = data.turn
      const step = data.step
      const chunk = data.chunk
      // 内容增量（block-start/text-delta/reasoning-delta/tool-call-delta/block-end）
      // 才记录首/末内容时刻；usage/finish 无正文，不算内容。TTFT 以首个内容 chunk 为准。
      if (typeof turn === 'number' && typeof step === 'number' && chunk !== undefined && chunk.type !== 'usage' && chunk.type !== 'finish') {
        const state = steps.get(`${turn}:${step}`)
        if (state !== undefined) {
          if (state.firstContentTime === undefined) state.firstContentTime = event.time
          state.lastContentTime = event.time
        }
      }
      // 工具调用计数：tool-call-delta 携带工具名（每个增量重复携带），按
      // (turn, step, index) 首见计一次；名字缺失记 unknown。
      if (chunk?.type === 'tool-call-delta' && typeof turn === 'number' && typeof step === 'number') {
        const index = (chunk as { index?: unknown }).index
        const name = (chunk as { name?: unknown }).name
        const seenKey = `${turn}:${step}:${typeof index === 'number' ? index : '-'}`
        if (!toolSeen.has(seenKey)) {
          toolSeen.add(seenKey)
          const toolName = typeof name === 'string' && name !== '' ? name : 'unknown'
          fold.byTool.set(toolName, (fold.byTool.get(toolName) ?? 0) + 1)
        }
      }
      continue
    }
    if (event.type !== 'assistant/message') continue
    const usage = (event.data as { usage?: TokenUsage }).usage
    if (usage === undefined) continue
    // 权威归属：`message.source` 是 agent-loop 从当次请求复制的 { provider, model }，
    // 每个调用一条；`request/header` 是稀疏事件（可能数十个调用才有一条），按它归属
    // 会把两次 header 之间的用量全部串到上一个模型（订阅模型首当其冲，issue #14）。
    // source 缺失（极旧格式日志）才兜底到 header 维护的状态。
    const source = (event.data as { message?: { source?: { kind?: unknown; provider?: unknown; model?: unknown } } }).message?.source
    if (source?.kind === 'model' && typeof source.provider === 'string' && typeof source.model === 'string') {
      key = resolveCatalogKey(source.model)
      subscription = subscriptionProviders.has(source.provider)
      official = officialProviderIds === undefined ? isOfficialProvider(source.provider) : officialProviderIds.has(source.provider)
      siteBucket = siteBucketKey(siteRefOf(source.provider, routes))
    }
    // 归属到本条 message 的权威模型，token 按缓存分桶累加。
    // 时段按本次调用的实际时刻（event.time）精确判定，不再按固定比例混合。
    const modelKey = key
    const day = dayStamp(event.time)
    // 不可计价模型（目录外/无价，且非订阅通道）收集到 unpriced 集合，供聚合层暴露给用户提示。
    if (!subscription && !isPriced(modelKey)) fold.unpricedModels.add(modelKey)
    foldUsage(fold.total, usage, modelKey, subscription, event.time, official)
    foldUsage(usageCell(fold.byModel, modelKey), usage, modelKey, subscription, event.time, official)
    foldUsage(usageCell(fold.byDay, day), usage, modelKey, subscription, event.time, official)
    foldUsage(modelDayCell(fold.byDayModels, day, modelKey), usage, modelKey, subscription, event.time, official)
    // 模型×日期×站点三维（issue #16）：供「按 origin 绑定自定义价」的显示层重估。
    foldUsage(modelDaySiteCell(fold.byDayModelsSite, day, modelKey, siteBucket), usage, modelKey, subscription, event.time, official)
    foldUsage(usageCell(fold.bySite, siteBucket), usage, modelKey, subscription, event.time, official)
    // 峰谷分桶：与计费同口径逐调用判档（tierAt），峰谷占比因此是真实数据。
    foldUsage(usageCell(fold.byTier, tierAt(event.time)), usage, modelKey, subscription, event.time, official)
    if (subscription) fold.planCalls.set(modelKey, (fold.planCalls.get(modelKey) ?? 0) + 1)
    // 每轮明细：同一轮内的调用累加进该轮状态（模型取最近一次的归属）。
    const turn = (event.data as { turn?: number }).turn ?? -1
    const state = turnState(turns, turn)
    state.model = modelKey
    state.input += usage.inputTokens + (usage.cacheReadTokens ?? 0) + (usage.cacheWriteTokens ?? 0)
    state.output += usage.outputTokens
    state.cacheHit += usage.cacheReadTokens ?? 0
    state.cacheMiss += usage.inputTokens + (usage.cacheWriteTokens ?? 0)
    if (!subscription && isPriced(modelKey)) {
      const buckets = {
        input: (usage.cacheReadTokens ?? 0) + usage.inputTokens + (usage.cacheWriteTokens ?? 0),
        cacheHit: usage.cacheReadTokens ?? 0,
        cacheMiss: usage.inputTokens + (usage.cacheWriteTokens ?? 0),
        output: usage.outputTokens,
      }
      const fullCost = computeCostAt(modelOf(modelKey), buckets, event.time)
      state.cost += fullCost
      // 角色归因：输出成本实测计价；输入成本 = 整次成本 - 输出部分，合并时
      // 再按 user/tool 消息字符占比摊分。
      const outputCost = computeCostAt(modelOf(modelKey), { input: 0, cacheHit: 0, cacheMiss: 0, output: usage.outputTokens }, event.time)
      fold.roles.outputCost += outputCost
      fold.roles.inputCost += fullCost - outputCost
    }
    if (state.startedAt === Number.MAX_SAFE_INTEGER) state.startedAt = event.time
    // 性能样本：该 step 的 TTFT / 生成速度 / 总延迟；无效样本不入集。
    // 工具续写步骤无独立 request/header（perfState.requestTime 缺失）时以 step/start 估算。
    const stepNum = (event.data as { step?: number }).step
    if (typeof stepNum === 'number') {
      const perfState = steps.get(`${turn}:${stepNum}`)
      if (perfState !== undefined) {
        const sample = perfSampleOf(perfState, modelKey, usage.outputTokens ?? 0, event.time)
        if (sample !== undefined) fold.perf.push(sample)
        steps.delete(`${turn}:${stepNum}`)
      }
    }
  }
  fold.turns = [...turns.values()]
    .filter(state => state.input > 0 || state.output > 0)
    .sort((a, b) => a.turn - b.turn)
    .map(state => ({
      turn: state.turn,
      model: state.model,
      input: state.input,
      output: state.output,
      cacheHit: state.cacheHit,
      cacheMiss: state.cacheMiss,
      cost: state.cost,
      startedAt: state.startedAt === Number.MAX_SAFE_INTEGER ? fold.lastActive : state.startedAt,
      ...(state.endedAt === undefined ? {} : { endedAt: state.endedAt }),
    }))
  return fold
}

/**
 * 生成一个 step 的性能样本；无效 / 超出 sane 上限（15 分钟）时返回 undefined，
 * 避免单条异常记录（时区错位 / 服务端抖动）拉偏均值。
 */
function perfSampleOf(state: StepPerf, model: string, outputTokens: number, endTime: number): PerfSample | undefined {
  const start = state.requestTime ?? state.startTime
  const first = state.firstContentTime
  const last = state.lastContentTime
  if (start === undefined || first === undefined || first < start) return undefined
  const ttftMs = first - start
  if (!Number.isFinite(ttftMs) || ttftMs < 0 || ttftMs > 900000) return undefined
  const genMs = last !== undefined && last > first ? last - first : undefined
  const latencyMs = endTime >= start ? endTime - start : undefined
  const tps = genMs !== undefined && genMs > 0 && outputTokens > 0 ? outputTokens / (genMs / 1000) : undefined
  return {
    model,
    hour: hourStamp(endTime),
    ttftMs,
    ...(tps === undefined || !Number.isFinite(tps) || tps <= 0 ? {} : { tps }),
    estimated: state.requestTime === undefined,
    ...(latencyMs === undefined ? {} : { latencyMs }),
  }
}

/** Accumulate one ModelUsage into another (merge step of the incremental aggregator). */
function mergeUsageInto(acc: ModelUsage, cell: ModelUsage): void {
  acc.calls += cell.calls
  acc.input += cell.input
  acc.output += cell.output
  acc.reasoning += cell.reasoning
  acc.cacheHit += cell.cacheHit
  acc.cacheMiss += cell.cacheMiss
  // 旧快照无 cacheWrite 维度：只在来源确实携带时才落字段（保持缺省语义）。
  if (cell.cacheWrite !== undefined) acc.cacheWrite = (acc.cacheWrite ?? 0) + cell.cacheWrite
  acc.cost += cell.cost
  acc.officialCalls += cell.officialCalls
  acc.officialCost += cell.officialCost
  // 旧快照无 searchCalls 维度：只在来源确实携带时才落字段（保持缺省语义）。
  if (cell.searchCalls !== undefined) acc.searchCalls = (acc.searchCalls ?? 0) + cell.searchCalls
}

/** 均值（数组非空时调用；空数组按 0 兜底）。 */
function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/** 分位数（0..1）：先拷贝排序，再线性插值；空数组返回 0。 */
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = (sorted.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) { const value = sorted[lo]; return value === undefined ? 0 : value }
  const a = sorted[lo]
  const b = sorted[hi]
  if (a === undefined || b === undefined) return 0
  return a + (b - a) * (idx - lo)
}

/** 按模型聚合的性能累加器。 */
interface PerfModelAccum {
  ttfts: number[]
  tps: number[]
  latencies: number[]
  estimated: number
}

/** 按小时聚合的性能累加器。 */
interface PerfHourAccum {
  ttfts: number[]
  tps: number[]
}

/**
 * 增量聚合器：按会话缓存折叠结果，用日志文件的 mtime+size 作失效键——
 * 日志没动的会话直接复用，只有写过的会话重新折叠；整份文档另有短 TTL
 * 合并密集轮询。缓存活在内存里（进程重启后首次全量折叠一次）。
 */
export interface UsageAggregator {
  /** Aggregate current usage, reusing cached per-session folds when their logs are untouched. */
  aggregate(): Promise<UsageStatsDocument>
}

/**
 * Create the incremental usage aggregator.
 * @param persistence - the session persistence service.
 * @param options - aggregation tuning (e.g. subscription-plan providers).
 * @returns the aggregator holding the per-session fold cache.
 */
export function createUsageAggregator(persistence: UsagePersistence, options: AggregateOptions = {}): UsageAggregator {
  const subscriptionProviders = new Set(options.subscriptionProviders ?? DEFAULT_SUBSCRIPTION_PROVIDERS)
  const officialProviderIds = options.officialProviderIds === undefined
    ? undefined
    : new Set(options.officialProviderIds)
  const maxCacheSessions = options.maxCacheSessions ?? DEFAULT_MAX_CACHE_SESSIONS
  const cache = new Map<string, { stamp: string | null; fold: SessionFold }>()
  // Durable rows stay JSON-safe in memory. The LRU above still bounds the
  // heavier Map/Set representation used for active-session incremental folds.
  const ledger = new Map<string, UsageLedgerSession>()
  let ledgerLoaded = false
  let ledgerNeedsSave = false
  // 加载边界跑迁移后留下的已应用 id；save 透传，避免每次重启都把迁移重跑一遍。
  let ledgerAppliedMigrations: string[] | undefined
  let lastDoc: UsageStatsDocument | undefined
  let lastAt = 0
  /** 每次聚合取最新的 provider 路由视图（中转站零配置发现）；缺省按空处理（全部未知路由）。 */
  const routesOf = (): Readonly<Record<string, ProviderRouteView>> => options.resolveRoutes?.() ?? {}
  // 联网搜索请求的单次费用估算（issue #15）；0 = 关闭估算（调用仍计数，不计费）。
  const searchEstimate = options.searchCallEstimateCny ?? DEFAULT_SEARCH_CALL_ESTIMATE_CNY

  const ensureLedgerLoaded = async (): Promise<void> => {
    if (ledgerLoaded || options.ledger === undefined) return
    ledgerLoaded = true
    try {
      const stored = await options.ledger.load()
      if (stored !== null && typeof stored === 'object' && (stored as UsageLedgerDocument).sessions !== undefined) {
        // 配置迁移：对原始文档执行未应用的迁移；有修改时重新落盘（下轮聚合写回）。
        const document = stored as UsageLedgerDocument
        if (runLedgerMigrations(document)) ledgerNeedsSave = true
        ledgerAppliedMigrations = document.appliedMigrations
      }
      for (const entry of ledgerSessionsOf(stored)) ledger.set(entry.id, entry)
    } catch (error) {
      // A damaged ledger must not take down the dashboard. The host store normally
      // tries its .bak first; if both fail, current logs rebuild a fresh ledger.
      console.warn('[usage-billing] failed to load durable usage ledger; rebuilding from current sessions:', error)
    }
  }

  /** 失效键：日志文件的 mtime+size；拿不到（后端无 locate / 文件丢失 / locate 抛错）时返回 null，
   *  让调用方每次重折。locate 调用也纳入 try，避免单个会话的 locate 异常把整份聚合拖垮。 */
  const stampOf = async (meta: SessionHeader): Promise<string | null> => {
    try {
      const location = persistence.locate?.(meta)
      if (location === undefined) return null
      const info = await stat(location.path)
      return `${String(info.mtimeMs)}:${String(info.size)}`
    } catch {
      return null
    }
  }

  return {
    async aggregate(): Promise<UsageStatsDocument> {
      const now = Date.now()
      if (lastDoc !== undefined && now - lastAt < AGGREGATE_TTL_MS) return lastDoc

      await ensureLedgerLoaded()

      let metas: readonly SessionHeader[]
      try {
        metas = await persistence.list()
      } catch (error) {
        if (options.ledger === undefined || ledger.size === 0) throw error
        // The independent ledger is also the last-resort source when the session
        // backend itself is temporarily unavailable; no live rows are pruned.
        console.warn('[usage-billing] session list unavailable; serving durable usage ledger:', error)
        metas = []
      }
      const seen = new Set<string>()
      const included = new Set<string>()
      const folds: { id: string; cwd?: string; fold: SessionFold; staleLedger?: true }[] = []
      // skipped：记录未能读取的会话 id，聚合末尾统一告警。
      const skipped: string[] = []
      let staleLedgerSessions = 0
      for (const meta of metas) {
        const id = String(meta.id)
        seen.add(id)
        const stamp = await stampOf(meta)
        const hit = cache.get(id)
        if (hit !== undefined && stamp !== null && hit.stamp === stamp) {
          // LRU touch：复用命中的会话移到缓存末尾，供上方上限清理优先淘汰最久未用。
          cache.delete(id)
          cache.set(id, hit)
          folds.push({ id, ...(meta.cwd === undefined ? {} : { cwd: meta.cwd }), fold: hit.fold })
          included.add(id)
          continue
        }
        // 单个损坏/不可读的会话日志（如 zstd torn frame）不能拖垮整份聚合：
        // 跳到下一个会话，避免面板整体归零。失败会话放进 skipped 末尾告警。
        try {
          const { events } = await persistence.readFrom(meta.id, 0)
          // P0-4 竞态加固：读取期间日志被写入（mtime+size 变化），本轮的折叠可能基于
          // 半截内容，丢弃待下一轮重读，避免把不完整事件当作真实用量输出。
          const after = await stampOf(meta)
          if (stamp !== null && after !== stamp) continue
          // durable 边界：日志事件是外部 JSON，foldSession 内做运行时收窄。
          const fold = foldSession(events as { type: string; time: number; data: never; seq: number }[], subscriptionProviders, officialProviderIds, routesOf(), searchEstimate)
          cache.set(id, { stamp, fold })
          folds.push({ id, ...(meta.cwd === undefined ? {} : { cwd: meta.cwd }), fold })
          included.add(id)
          if (options.ledger !== undefined) {
            const entry: UsageLedgerSession = {
              id,
              ...(meta.cwd === undefined ? {} : { cwd: meta.cwd }),
              ...(stamp === null ? {} : { stamp }),
              foldVersion: FOLD_VERSION,
              fold: serializeFold(fold),
            }
            const previous = ledger.get(id)
            // A no-locate backend has no stable stamp, so compare the serialized row;
            // located logs use the cheap stamp and metadata check.
            const changed = previous === undefined
              || previous.stamp !== entry.stamp
              || previous.cwd !== entry.cwd
              || previous.foldVersion !== entry.foldVersion
              || (stamp === null && JSON.stringify(previous.fold) !== JSON.stringify(entry.fold))
            if (changed) {
              ledger.set(id, entry)
              ledgerNeedsSave = true
            }
          }
        } catch (error) {
          skipped.push(id)
          console.warn('[usage-billing] skip unreadable session', id, error)
        }
      }
      // 已删除会话的缓存一并清除，避免内存随历史膨胀。
      for (const key of [...cache.keys()]) {
        if (!seen.has(key)) cache.delete(key)
      }
      // P1-6 峰值内存治理：缓存会话数超过上限时，从最久未用的开始淘汰。
      while (cache.size > maxCacheSessions) {
        const oldest = cache.keys().next()
        if (oldest.done === true) break
        cache.delete(oldest.value)
      }
      // The durable ledger is deliberately not pruned by `seen`: missing rows are
      // history, not cache garbage. Unreadable live sessions also fall back to their
      // last successfully folded ledger row.
      if (options.ledger !== undefined) {
        for (const entry of ledger.values()) {
          if (included.has(entry.id)) continue
          try {
            // 缺失 foldVersion（迁移前的异常路径）按 v1 处理：保守标注旧算法。
            const stale = (entry.foldVersion ?? 1) < FOLD_VERSION
            folds.push({
              id: entry.id,
              ...(entry.cwd === undefined ? {} : { cwd: entry.cwd }),
              ...(stale ? { staleLedger: true as const } : {}),
              fold: deserializeFold(entry.fold),
            })
            included.add(entry.id)
            if (stale) staleLedgerSessions += 1
          } catch (error) {
            console.warn('[usage-billing] skip invalid durable ledger session', entry.id, error)
          }
        }
        if (ledgerNeedsSave) {
          try {
            await options.ledger.save({
              version: 1,
              updatedAt: now,
              sessions: [...ledger.values()],
              ...(ledgerAppliedMigrations === undefined ? {} : { appliedMigrations: ledgerAppliedMigrations }),
            })
            ledgerNeedsSave = false
          } catch (error) {
            // Keep serving the correct in-memory total; a later changed aggregation retries.
            console.warn('[usage-billing] failed to persist durable usage ledger:', error)
          }
        }
      }
      // 只读路径无坏会话时无需区分：stampOf 命中或新会话，失败均已在上面跳过。
      if (skipped.length > 0) {
        console.warn(`[usage-billing] aggregated ${folds.length} sessions, skipped ${skipped.length} unreadable:`, skipped)
      }

      const total = emptyUsage()
      const byModel = new Map<string, ModelUsage>()
      const byDay = new Map<string, ModelUsage>()
      const byDayModels = new Map<string, Map<string, ModelUsage>>()
      const byDayModelsSite = new Map<string, Map<string, Map<string, ModelUsage>>>()
      const byTier = new Map<string, ModelUsage>()
      const byTool = new Map<string, number>()
      const bySite = new Map<string, ModelUsage>()
      const unpricedModels = new Set<string>()
      const planCalls = new Map<string, number>()
      const sessionRows: SessionUsageRow[] = []
      const turnRows: TurnUsageRow[] = []
      const workspaceMap = new Map<string, WorkspaceUsageRow>()
      // 角色归因跨会话累加：字符占比与输入/输出成本分别求和后再摊分。
      const roles: RoleFold = { userChars: 0, toolChars: 0, inputCost: 0, outputCost: 0 }
      // 性能样本跨会话累加（按模型 / 小时分桶，聚合时才算均值/分位）。
      const perfModel = new Map<string, PerfModelAccum>()
      const perfHour = new Map<string, PerfHourAccum>()
      for (const { id: sessionId, cwd, fold, staleLedger } of folds) {
        mergeUsageInto(total, fold.total)
        roles.userChars += fold.roles.userChars
        roles.toolChars += fold.roles.toolChars
        roles.inputCost += fold.roles.inputCost
        roles.outputCost += fold.roles.outputCost
        for (const [modelKey, cell] of fold.byModel) mergeUsageInto(usageCell(byModel, modelKey), cell)
        for (const [day, cell] of fold.byDay) mergeUsageInto(usageCell(byDay, day), cell)
        for (const [day, models] of fold.byDayModels) {
          for (const [modelKey, cell] of models) mergeUsageInto(modelDayCell(byDayModels, day, modelKey), cell)
        }
        for (const [day, models] of fold.byDayModelsSite) {
          for (const [modelKey, sites] of models) {
            for (const [siteKey, cell] of sites) mergeUsageInto(modelDaySiteCell(byDayModelsSite, day, modelKey, siteKey), cell)
          }
        }
        for (const [siteKey, cell] of fold.bySite) mergeUsageInto(usageCell(bySite, siteKey), cell)
        for (const [tierKey, cell] of fold.byTier) mergeUsageInto(usageCell(byTier, tierKey), cell)
        for (const [toolName, count] of fold.byTool) byTool.set(toolName, (byTool.get(toolName) ?? 0) + count)
        for (const id of fold.unpricedModels) unpricedModels.add(id)
        for (const [modelKey, count] of fold.planCalls) {
          planCalls.set(modelKey, (planCalls.get(modelKey) ?? 0) + count)
        }
        // 性能样本入桶：按模型、按小时各聚合一份，供「性能」面板分别渲染。
        for (const sample of fold.perf) {
          let modelAccum = perfModel.get(sample.model)
          if (modelAccum === undefined) {
            modelAccum = { ttfts: [], tps: [], latencies: [], estimated: 0 }
            perfModel.set(sample.model, modelAccum)
          }
          modelAccum.ttfts.push(sample.ttftMs)
          if (sample.tps !== undefined) modelAccum.tps.push(sample.tps)
          if (sample.latencyMs !== undefined) modelAccum.latencies.push(sample.latencyMs)
          if (sample.estimated) modelAccum.estimated += 1
          let hourAccum = perfHour.get(sample.hour)
          if (hourAccum === undefined) {
            hourAccum = { ttfts: [], tps: [] }
            perfHour.set(sample.hour, hourAccum)
          }
          hourAccum.ttfts.push(sample.ttftMs)
          if (sample.tps !== undefined) hourAccum.tps.push(sample.tps)
        }
        // 每轮明细：跨会话的轮次统一按起始时间倒序（展示最近 N 轮）。
        for (const row of fold.turns) turnRows.push({ sessionId, ...row })
        // 工作区聚合：按 cwd 归并（优先用宿主工作区标题，未注入/未命中回退到末级目录名）。
        const wsName = (options.resolveWorkspaceTitle !== undefined && cwd !== undefined)
          ? (options.resolveWorkspaceTitle(cwd) ?? workspaceNameOf(cwd))
          : workspaceNameOf(cwd)
        const ws = workspaceMap.get(wsName) ?? { name: wsName, calls: 0, cost: 0, input: 0, output: 0, lastActive: 0 }
        ws.calls += fold.total.calls
        ws.cost += fold.total.cost
        ws.input += fold.total.input
        ws.output += fold.total.output
        ws.lastActive = Math.max(ws.lastActive, fold.lastActive)
        workspaceMap.set(wsName, ws)
        if (fold.total.calls > 0) {
          sessionRows.push({
            id: sessionId,
            // exactOptionalPropertyTypes：缺失的可选字段不带 key。
            ...(fold.title !== undefined ? { title: fold.title } : {}),
            ...(cwd !== undefined ? { cwd } : {}),
            ...(staleLedger === true ? { stale: true } : {}),
            calls: fold.total.calls,
            cost: fold.total.cost,
            lastActive: fold.lastActive,
          })
        }
      }
      sessionRows.sort((a, b) => b.cost - a.cost || b.lastActive - a.lastActive)
      turnRows.sort((a, b) => b.startedAt - a.startedAt)
      const workspaces = [...workspaceMap.values()].sort((a, b) => b.cost - a.cost || b.lastActive - a.lastActive)

      const toRecord = (map: Map<string, ModelUsage>): Record<string, ModelUsage> => {
        // exactOptionalPropertyTypes：只有全部调用都走订阅通道时才带 plan 字段。
        const record: Record<string, ModelUsage> = {}
        for (const [key, cell] of map) {
          if (planCalls.get(key) === cell.calls && cell.calls > 0) record[key] = { ...cell, plan: true }
          else record[key] = cell
        }
        return record
      }
      const toModelDayRecord = (map: Map<string, Map<string, ModelUsage>>): Record<string, Record<string, ModelUsage>> =>
        Object.fromEntries([...map].map(([day, models]) => [day, Object.fromEntries(models)]))
      const toModelDaySiteRecord = (map: Map<string, Map<string, Map<string, ModelUsage>>>): Record<string, Record<string, Record<string, ModelUsage>>> =>
        Object.fromEntries([...map].map(([day, models]) =>
          [day, Object.fromEntries([...models].map(([model, sites]) => [model, Object.fromEntries(sites)]))]))

      // 性能指标：按模型（含 P90）、按小时聚合；无任何可测样本时整个 perf 字段缺失。
      const perf: PerfStats | undefined = perfModel.size === 0
        ? undefined
        : {
          byModel: Object.fromEntries([...perfModel].map(([model, acc]) => [model, {
            samples: acc.ttfts.length,
            ttftAvg: mean(acc.ttfts),
            ttftP50: percentile(acc.ttfts, 0.5),
            ttftP90: percentile(acc.ttfts, 0.9),
            ttftMax: Math.max(...acc.ttfts),
            ttftSpikes: acc.ttfts.filter(ttft => ttft > PERF_SPIKE_MS).length,
            ...(acc.tps.length === 0 ? {} : { tpsAvg: mean(acc.tps) }),
            latencyAvg: acc.latencies.length === 0 ? 0 : mean(acc.latencies),
            estimatedSamples: acc.estimated,
          }])),
          byHour: Object.fromEntries([...perfHour].map(([hour, acc]) => [hour, {
            samples: acc.ttfts.length,
            ttftAvg: mean(acc.ttfts),
            ...(acc.tps.length === 0 ? {} : { tpsAvg: mean(acc.tps) }),
          }])),
        }
      lastDoc = {
        version: 3,
        updatedAt: now,
        source: 'session-logs',
        timezone: hostTimeZone(),
        total,
        byModel: toRecord(byModel),
        byDay: toRecord(byDay),
        byDayModels: toModelDayRecord(byDayModels),
        ...(byDayModelsSite.size === 0 ? {} : { byDayModelsSite: toModelDaySiteRecord(byDayModelsSite) }),
        bySession: sessionRows.slice(0, SESSION_ROW_LIMIT),
        byTurn: turnRows.slice(0, TURN_ROW_LIMIT),
        byWorkspace: workspaces.slice(0, SESSION_ROW_LIMIT),
        ...(byTier.size === 0 ? {} : { byTier: { peak: byTier.get('peak') ?? emptyUsage(), offPeak: byTier.get('offPeak') ?? emptyUsage() } }),
        ...(byTool.size === 0 ? {} : { byTool: Object.fromEntries([...byTool].sort((a, b) => b[1] - a[1])) }),
        ...(bySite.size === 0 ? {} : { bySite: toRecord(bySite) }),
        ...(unpricedModels.size === 0 ? {} : { unpricedModels: [...unpricedModels].sort() }),
        ...(searchEstimate > 0 ? { searchCallEstimateCny: searchEstimate } : {}),
        ...(perf === undefined ? {} : { perf }),
        ...(staleLedgerSessions > 0 ? { staleLedgerSessions } : {}),
        // 角色归因：输出成本为实测；输入成本按 user/tool 消息字符占比摊分
        //（无任何消息内容的日志按五五均分兜底，整体属估算口径）。
        byRole: (() => {
          const chars = roles.userChars + roles.toolChars
          const userShare = chars > 0 ? roles.userChars / chars : 0.5
          return {
            user: roles.inputCost * userShare,
            assistant: roles.outputCost,
            tool: roles.inputCost * (1 - userShare),
          }
        })(),
      }
      lastAt = now
      return lastDoc
    },
  }
}

/**
 * Aggregate real usage from every persisted session log (one-shot, no cache).
 * @param persistence - the session persistence service.
 * @param options - aggregation tuning (e.g. subscription-plan providers).
 * @returns the usage-stats document (same shape the dashboard expects).
 */
export async function aggregateUsage(persistence: UsagePersistence, options: AggregateOptions = {}): Promise<UsageStatsDocument> {
  return createUsageAggregator(persistence, options).aggregate()
}
