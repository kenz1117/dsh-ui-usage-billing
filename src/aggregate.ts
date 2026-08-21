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
import { MODEL_CATALOG, MODEL_KEY_ALIASES, computeCostAt, modelOf } from './client/pricing.ts'

// 模型别名（真实 provider id → 计费目录键）统一定义在 client/pricing.ts，
// 聚合层折叠与客户端渲染共用同一张表，避免两侧不一致导致「未收录」。
export { MODEL_KEY_ALIASES }

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

/** Aggregation tuning options. */
export interface AggregateOptions {
  /** 订阅制 provider id 列表；默认 {@link DEFAULT_SUBSCRIPTION_PROVIDERS}。 */
  subscriptionProviders?: readonly string[]
}

/** One model's aggregated usage plus estimated cost in CNY. */
export interface ModelUsage {
  calls: number
  input: number
  output: number
  cacheHit: number
  cacheMiss: number
  cost: number
  /** 该模型本次统计的所有调用是否都走订阅通道（coding/token plan）；混合通道不置位。 */
  plan?: boolean
}

/** Zeroed usage accumulator. */
export function emptyUsage(): ModelUsage {
  return { calls: 0, input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cost: 0 }
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
 */
export function foldUsage(acc: ModelUsage, usage: TokenUsage, key: string, subscription: boolean, timeMs: number): void {
  const cacheHit = usage.cacheReadTokens ?? 0
  const cacheMiss = usage.inputTokens + (usage.cacheWriteTokens ?? 0)
  acc.calls += 1
  acc.input += usage.inputTokens + cacheHit + (usage.cacheWriteTokens ?? 0)
  acc.output += usage.outputTokens
  acc.cacheHit += cacheHit
  acc.cacheMiss += cacheMiss
  // 订阅套餐不计费；计费表里没有的模型（未知/订阅）也记 0。费用按本次调用
  // 增量累加（计价是线性的）：同一桶内混入订阅/未知调用时，后面免费调用
  // 不再把整个桶的 cost 覆盖成 0。时段按本次调用的实际时刻精确判定。
  if (!subscription && MODEL_CATALOG.some(entry => entry.key === key)) {
    acc.cost += computeCostAt(modelOf(key), {
      input: cacheHit + cacheMiss,
      cacheHit,
      cacheMiss,
      output: usage.outputTokens,
    }, timeMs)
  }
}

/** Local-time date stamp (the host runs in the user's timezone). */
export function dayStamp(time: number): string {
  const date = new Date(time)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
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
  /** 日志里最新的 session/title 文本（无标题事件时 undefined）。 */
  title?: string
  /** 最后一个事件的时间戳（毫秒）；空日志为 0。 */
  lastActive: number
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
 * @returns the per-session fold (cached by the incremental aggregator).
 */
export function foldSession(events: readonly { type: string; time: number; data: never }[], subscriptionProviders: ReadonlySet<string>): SessionFold {
  const fold: SessionFold = {
    total: emptyUsage(),
    byModel: new Map(),
    byDay: new Map(),
    byDayModels: new Map(),
    planCalls: new Map(),
    turns: [],
    lastActive: 0,
  }
  let key = 'other'
  let subscription = false
  const turns = new Map<number, TurnState>()
  for (const event of events) {
    fold.lastActive = Math.max(fold.lastActive, event.time)
    // session/title 由 dsh-session-title 经声明合并注册，本包不引用它，
    // 故按持久化数据的字面类型判定并做运行时收窄（durable 边界）。
    if (event.type === 'session/title') {
      const title = (event.data as { title?: unknown }).title
      if (typeof title === 'string' && title.length > 0) fold.title = title
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
    if (event.type === 'request/header') {
      const { model, provider } = (event.data as { header: { config: { model: string; provider: string } } }).header.config
      key = MODEL_KEY_ALIASES[model] ?? model
      // 订阅套餐 provider 的调用即使撞名计费表也一律免费。
      subscription = subscriptionProviders.has(provider)
      continue
    }
    if (event.type !== 'assistant/message') continue
    const usage = (event.data as { usage?: TokenUsage }).usage
    if (usage === undefined) continue
    // 归属到最近的 request/header 记录的模型，token 按缓存分桶累加。
    // 时段按本次调用的实际时刻（event.time）精确判定，不再按固定比例混合。
    const modelKey = key
    const day = dayStamp(event.time)
    foldUsage(fold.total, usage, modelKey, subscription, event.time)
    foldUsage(usageCell(fold.byModel, modelKey), usage, modelKey, subscription, event.time)
    foldUsage(usageCell(fold.byDay, day), usage, modelKey, subscription, event.time)
    foldUsage(modelDayCell(fold.byDayModels, day, modelKey), usage, modelKey, subscription, event.time)
    if (subscription) fold.planCalls.set(modelKey, (fold.planCalls.get(modelKey) ?? 0) + 1)
    // 每轮明细：同一轮内的调用累加进该轮状态（模型取最近一次的归属）。
    const turn = (event.data as { turn?: number }).turn ?? -1
    const state = turnState(turns, turn)
    state.model = modelKey
    state.input += usage.inputTokens + (usage.cacheReadTokens ?? 0) + (usage.cacheWriteTokens ?? 0)
    state.output += usage.outputTokens
    state.cacheHit += usage.cacheReadTokens ?? 0
    state.cacheMiss += usage.inputTokens + (usage.cacheWriteTokens ?? 0)
    if (!subscription && MODEL_CATALOG.some(entry => entry.key === modelKey)) {
      state.cost += computeCostAt(modelOf(modelKey), {
        input: (usage.cacheReadTokens ?? 0) + usage.inputTokens + (usage.cacheWriteTokens ?? 0),
        cacheHit: usage.cacheReadTokens ?? 0,
        cacheMiss: usage.inputTokens + (usage.cacheWriteTokens ?? 0),
        output: usage.outputTokens,
      }, event.time)
    }
    if (state.startedAt === Number.MAX_SAFE_INTEGER) state.startedAt = event.time
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

/** Accumulate one ModelUsage into another (merge step of the incremental aggregator). */
function mergeUsageInto(acc: ModelUsage, cell: ModelUsage): void {
  acc.calls += cell.calls
  acc.input += cell.input
  acc.output += cell.output
  acc.cacheHit += cell.cacheHit
  acc.cacheMiss += cell.cacheMiss
  acc.cost += cell.cost
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
      for (const meta of metas) {
        const id = String(meta.id)
        seen.add(id)
        const stamp = await stampOf(meta)
        const hit = cache.get(id)
        if (hit !== undefined && stamp !== null && hit.stamp === stamp) {
          folds.push({ meta, fold: hit.fold })
          continue
        }
        const { events } = await persistence.readFrom(meta.id, 0)
        // durable 边界：日志事件是外部 JSON，foldSession 内做运行时收窄。
        const fold = foldSession(events as { type: string; time: number; data: never }[], subscriptionProviders)
        cache.set(id, { stamp, fold })
        folds.push({ meta, fold })
      }
      // 已删除会话的缓存一并清除，避免内存随历史膨胀。
      for (const key of [...cache.keys()]) {
        if (!seen.has(key)) cache.delete(key)
      }

      const total = emptyUsage()
      const byModel = new Map<string, ModelUsage>()
      const byDay = new Map<string, ModelUsage>()
      const byDayModels = new Map<string, Map<string, ModelUsage>>()
      const planCalls = new Map<string, number>()
      const sessionRows: SessionUsageRow[] = []
      const turnRows: TurnUsageRow[] = []
      const workspaceMap = new Map<string, WorkspaceUsageRow>()
      for (const { meta, fold } of folds) {
        const sessionId = String(meta.id)
        mergeUsageInto(total, fold.total)
        for (const [modelKey, cell] of fold.byModel) mergeUsageInto(usageCell(byModel, modelKey), cell)
        for (const [day, cell] of fold.byDay) mergeUsageInto(usageCell(byDay, day), cell)
        for (const [day, models] of fold.byDayModels) {
          for (const [modelKey, cell] of models) mergeUsageInto(modelDayCell(byDayModels, day, modelKey), cell)
        }
        for (const [modelKey, count] of fold.planCalls) {
          planCalls.set(modelKey, (planCalls.get(modelKey) ?? 0) + count)
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
