/**
 * Real-usage aggregation: folds every persisted session log into the
 * usage-stats document the dashboard renders.
 *
 * Each LLM call is attributed to the model of the `request/header` event that
 * precedes its `assistant/message` usage event. Costs are estimated with the
 * shared billing catalog (`pricing.ts`, in CNY), so only models the catalog
 * prices incur a cost — subscription-plan routes and unknown models price
 * zero while their tokens still count. Pure functions only: the persistence
 * handle is injected, so the fold is unit-testable without a host.
 */

import { stat } from 'node:fs/promises'
import type { SessionHeader } from '@deepseek-ai/dsh-session/types'
import type { SessionPersistence } from '@deepseek-ai/dsh-session-persistence'
import type { TokenUsage } from '@deepseek-ai/dsh-llm'
import { isPriced, MODEL_KEY_ALIASES, resolveCatalogKey, computeCostAt, modelOf } from './client/pricing.ts'

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

/** Aggregation tuning options. */
export interface AggregateOptions {
  /** 订阅制 provider id 列表；默认 {@link DEFAULT_SUBSCRIPTION_PROVIDERS}。 */
  subscriptionProviders?: readonly string[]
  /** 官方渠道 provider id 列表；默认按 {@link isOfficialProvider} 判定（DeepSeek 官方直连）。 */
  officialProviderIds?: readonly string[]
}

/** One model's aggregated usage plus estimated cost in CNY. */
export interface ModelUsage {
  calls: number
  input: number
  output: number
  cacheHit: number
  cacheMiss: number
  cost: number
  /** 输出中的 reasoning（思考）token；已包含在 `output` 内，单列用于结构展示。 */
  reasoning: number
  /** 该模型本次统计的所有调用是否都走订阅通道（coding/token plan）；混合通道不置位。 */
  plan?: boolean
  /** 走官方渠道的调用数（DeepSeek 官方直连；其余为三方）。 */
  officialCalls: number
  /** 走官方渠道的费用（CNY）；三方费用 = cost - officialCost。 */
  officialCost: number
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
  total: ModelUsage
  byModel: Record<string, ModelUsage>
  byDay: Record<string, ModelUsage>
  /** 模型 × 日期 二维统计：趋势图按模型堆叠的输入（[date][modelKey]）。 */
  byDayModels: Record<string, Record<string, ModelUsage>>
  /** 会话明细：按费用倒序，封顶 {@link SESSION_ROW_LIMIT} 行；旧快照可能缺失。 */
  bySession: SessionUsageRow[]
  /** 每轮费用明细：按起始时间倒序，封顶 {@link TURN_ROW_LIMIT} 行；旧快照可能缺失。 */
  byTurn?: TurnUsageRow[]
  /** 工作区聚合：按 cwd 末级目录归并，按费用倒序；旧快照可能缺失。 */
  byWorkspace?: WorkspaceUsageRow[]
  /**
   * 按角色费用归因（人民币元）：助手输出成本为实测计价；输入成本按会话内
   * 用户消息 / 工具结果的文本长度占比启发式摊分（日志无角色级 token 实测，
   * 属估算口径，UI 需标注）。旧快照可能缺失。
   */
  byRole?: RoleCost
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
interface SessionFold {
  total: ModelUsage
  byModel: Map<string, ModelUsage>
  byDay: Map<string, ModelUsage>
  byDayModels: Map<string, Map<string, ModelUsage>>
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
 * 其前置 request/header 记录的模型；同时提取最新会话标题、最后活跃时间，
 * 并按轮次折叠每轮费用明细（turn/start → turn/end；调用按 (turn) 归组）。
 * @param events - the session's persisted events in log order.
 * @param subscriptionProviders - provider ids billed through subscription plans.
 * @param officialProviderIds - provider ids treated as the official DeepSeek channel
 *   (default: any `deepseek`-prefixed id). Others count as third-party.
 * @returns the per-session fold (cached by the incremental aggregator).
 */
export function foldSession(
  events: readonly { type: string; time: number; data: never }[],
  subscriptionProviders: ReadonlySet<string>,
  officialProviderIds?: ReadonlySet<string>,
): SessionFold {
  const fold: SessionFold = {
    total: emptyUsage(),
    byModel: new Map(),
    byDay: new Map(),
    byDayModels: new Map(),
    planCalls: new Map(),
    turns: [],
    perf: [],
    roles: { userChars: 0, toolChars: 0, inputCost: 0, outputCost: 0 },
    lastActive: 0,
  }
  let key = 'other'
  let subscription = false
  let official = false
  const turns = new Map<number, TurnState>()
  // 性能时间状态机：按 (turn, step) 归属 request/header 与内容 chunk 的时刻。
  const steps = new Map<string, StepPerf>()
  // 最近一次 step/start 打开的 step；request/header 不带 turn/step，需借此归属。
  let lastOpenStepKey: string | undefined
  for (const event of events) {
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
      // request/header 是该 step 的 TTFT 起点；归属到最近打开的 step（无独立请求头的
      // 工具续写步骤保持 undefined，以 step/start 起算估算）。
      if (lastOpenStepKey !== undefined) {
        const stepState = steps.get(lastOpenStepKey)
        if (stepState !== undefined && stepState.requestTime === undefined) stepState.requestTime = event.time
      }
      continue
    }
    if (event.type === 'assistant/chunk') {
      // 内容增量（block-start/text-delta/reasoning-delta/tool-call-delta/block-end）
      // 才记录首/末内容时刻；usage/finish 无正文，不算内容。TTFT 以首个内容 chunk 为准。
      const data = event.data as { turn?: unknown; step?: unknown; chunk?: { type?: string } }
      const turn = data.turn
      const step = data.step
      const chunk = data.chunk
      if (typeof turn === 'number' && typeof step === 'number' && chunk !== undefined && chunk.type !== 'usage' && chunk.type !== 'finish') {
        const state = steps.get(`${turn}:${step}`)
        if (state !== undefined) {
          if (state.firstContentTime === undefined) state.firstContentTime = event.time
          state.lastContentTime = event.time
        }
      }
      continue
    }
    if (event.type !== 'assistant/message') continue
    const usage = (event.data as { usage?: TokenUsage }).usage
    if (usage === undefined) continue
    // 归属到最近的 request/header 记录的模型，token 按缓存分桶累加。
    // 时段按本次调用的实际时刻（event.time）精确判定，不再按固定比例混合。
    const modelKey = key
    const day = dayStamp(event.time)
    foldUsage(fold.total, usage, modelKey, subscription, event.time, official)
    foldUsage(usageCell(fold.byModel, modelKey), usage, modelKey, subscription, event.time, official)
    foldUsage(usageCell(fold.byDay, day), usage, modelKey, subscription, event.time, official)
    foldUsage(modelDayCell(fold.byDayModels, day, modelKey), usage, modelKey, subscription, event.time, official)
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
  acc.cost += cell.cost
  acc.officialCalls += cell.officialCalls
  acc.officialCost += cell.officialCost
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
  const cache = new Map<string, { stamp: string | null; fold: SessionFold }>()
  let lastDoc: UsageStatsDocument | undefined
  let lastAt = 0

  /** 失效键：日志文件的 mtime+size；拿不到（后端无 locate / 文件丢失）时每次重折。 */
  const stampOf = async (meta: SessionHeader): Promise<string | null> => {
    const location = persistence.locate?.(meta)
    if (location === undefined) return null
    try {
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

      const metas = await persistence.list()
      const seen = new Set<string>()
      const folds: { meta: SessionHeader; fold: SessionFold }[] = []
      // skipped：记录未能读取的会话 id，聚合末尾统一告警。
      const skipped: string[] = []
      for (const meta of metas) {
        const id = String(meta.id)
        seen.add(id)
        const stamp = await stampOf(meta)
        const hit = cache.get(id)
        if (hit !== undefined && stamp !== null && hit.stamp === stamp) {
          folds.push({ meta, fold: hit.fold })
          continue
        }
        // 单个损坏/不可读的会话日志（如 zstd torn frame）不能拖垮整份聚合：
        // 跳到下一个会话，避免面板整体归零。失败会话放进 skipped 末尾告警。
        try {
          const { events } = await persistence.readFrom(meta.id, 0)
          // durable 边界：日志事件是外部 JSON，foldSession 内做运行时收窄。
          const fold = foldSession(events as { type: string; time: number; data: never }[], subscriptionProviders, officialProviderIds)
          cache.set(id, { stamp, fold })
          folds.push({ meta, fold })
        } catch (error) {
          skipped.push(id)
          console.warn('[usage-billing] skip unreadable session', id, error)
        }
      }
      // 已删除会话的缓存一并清除，避免内存随历史膨胀。
      for (const key of [...cache.keys()]) {
        if (!seen.has(key)) cache.delete(key)
      }
      // 只读路径无坏会话时无需区分：stampOf 命中或新会话，失败均已在上面跳过。
      if (skipped.length > 0) {
        console.warn(`[usage-billing] aggregated ${folds.length} sessions, skipped ${skipped.length} unreadable:`, skipped)
      }

      const total = emptyUsage()
      const byModel = new Map<string, ModelUsage>()
      const byDay = new Map<string, ModelUsage>()
      const byDayModels = new Map<string, Map<string, ModelUsage>>()
      const planCalls = new Map<string, number>()
      const sessionRows: SessionUsageRow[] = []
      const turnRows: TurnUsageRow[] = []
      const workspaceMap = new Map<string, WorkspaceUsageRow>()
      // 角色归因跨会话累加：字符占比与输入/输出成本分别求和后再摊分。
      const roles: RoleFold = { userChars: 0, toolChars: 0, inputCost: 0, outputCost: 0 }
      // 性能样本跨会话累加（按模型 / 小时分桶，聚合时才算均值/分位）。
      const perfModel = new Map<string, PerfModelAccum>()
      const perfHour = new Map<string, PerfHourAccum>()
      for (const { meta, fold } of folds) {
        const sessionId = String(meta.id)
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
        // 工作区聚合：按 cwd 末级目录归并（cwd 未知归入占位名）。
        const wsName = workspaceNameOf(meta.cwd)
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
            ...(meta.cwd !== undefined ? { cwd: meta.cwd } : {}),
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

      // 性能指标：按模型（含 P90）、按小时聚合；无任何可测样本时整个 perf 字段缺失。
      const perf: PerfStats | undefined = perfModel.size === 0
        ? undefined
        : {
          byModel: Object.fromEntries([...perfModel].map(([model, acc]) => [model, {
            samples: acc.ttfts.length,
            ttftAvg: mean(acc.ttfts),
            ttftP50: percentile(acc.ttfts, 0.5),
            ttftP90: percentile(acc.ttfts, 0.9),
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
        total,
        byModel: toRecord(byModel),
        byDay: toRecord(byDay),
        byDayModels: toModelDayRecord(byDayModels),
        bySession: sessionRows.slice(0, SESSION_ROW_LIMIT),
        byTurn: turnRows.slice(0, TURN_ROW_LIMIT),
        byWorkspace: workspaces.slice(0, SESSION_ROW_LIMIT),
        ...(perf === undefined ? {} : { perf }),
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
