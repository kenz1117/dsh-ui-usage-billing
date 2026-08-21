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
import { MODEL_CATALOG, computeCost, modelOf } from './client/pricing.ts'

/**
 * Real provider model ids map to their billing-catalog keys. Unknown ids stay
 * as-is and price zero (they are not in the catalog; subscription-plan routes
 * like kimi-coding / token plans fall here and therefore cost nothing).
 */
export const MODEL_KEY_ALIASES: Readonly<Record<string, string>> = {
  'deepseek-v4-flash': 'flash',
  'deepseek-v4-pro': 'pro',
  'glm-5.2': 'glm',
  'qwen3.8-max': 'qwen-3.8-max',
  'qwen3.7-max': 'qwen-max',
  'qwen-max': 'qwen-max',
  'hunyuan-t1': 'hunyuan-t1',
  'step-3.7-flash': 'step',
  'seed-2.0-mini': 'doubao-mini',
  // 月之暗面 Kimi：coding plan 通道的 model id 是短名 k3。
  'k3': 'kimi-k3',
  'kimi-k3': 'kimi-k3',
}

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
 */
export function foldUsage(acc: ModelUsage, usage: TokenUsage, key: string, subscription: boolean): void {
  const cacheHit = usage.cacheReadTokens ?? 0
  const cacheMiss = usage.inputTokens + (usage.cacheWriteTokens ?? 0)
  acc.calls += 1
  acc.input += usage.inputTokens + cacheHit + (usage.cacheWriteTokens ?? 0)
  acc.output += usage.outputTokens
  acc.cacheHit += cacheHit
  acc.cacheMiss += cacheMiss
  // 订阅套餐不计费；计费表里没有的模型（未知/订阅）也记 0。费用按本次调用
  // 增量累加（计价是线性的）：同一桶内混入订阅/未知调用时，后面免费调用
  // 不再把整个桶的 cost 覆盖成 0。
  if (!subscription && MODEL_CATALOG.some(entry => entry.key === key)) {
    acc.cost += computeCost(modelOf(key), {
      input: cacheHit + cacheMiss,
      cacheHit,
      cacheMiss,
      output: usage.outputTokens,
    })
  }
}

/** Local-time date stamp (the host runs in the user's timezone). */
export function dayStamp(time: number): string {
  const date = new Date(time)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
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

/** 会话明细行的响应封顶：控制 payload 体积，重度用户的完整长尾不逐行下发。 */
export const SESSION_ROW_LIMIT = 100

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

/**
 * Fold one session's events into a {@link SessionFold}. 每个 LLM 调用归属到
 * 其前置 request/header 记录的模型；同时提取最新会话标题与最后活跃时间。
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
    lastActive: 0,
  }
  let key = 'other'
  let subscription = false
  for (const event of events) {
    fold.lastActive = Math.max(fold.lastActive, event.time)
    // session/title 由 dsh-session-title 经声明合并注册，本包不引用它，
    // 故按持久化数据的字面类型判定并做运行时收窄（durable 边界）。
    if (event.type === 'session/title') {
      const title = (event.data as { title?: unknown }).title
      if (typeof title === 'string' && title.length > 0) fold.title = title
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
    const modelKey = key
    const day = dayStamp(event.time)
    foldUsage(fold.total, usage, modelKey, subscription)
    foldUsage(usageCell(fold.byModel, modelKey), usage, modelKey, subscription)
    foldUsage(usageCell(fold.byDay, day), usage, modelKey, subscription)
    foldUsage(modelDayCell(fold.byDayModels, day, modelKey), usage, modelKey, subscription)
    if (subscription) fold.planCalls.set(modelKey, (fold.planCalls.get(modelKey) ?? 0) + 1)
  }
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
      for (const { meta, fold } of folds) {
        mergeUsageInto(total, fold.total)
        for (const [modelKey, cell] of fold.byModel) mergeUsageInto(usageCell(byModel, modelKey), cell)
        for (const [day, cell] of fold.byDay) mergeUsageInto(usageCell(byDay, day), cell)
        for (const [day, models] of fold.byDayModels) {
          for (const [modelKey, cell] of models) mergeUsageInto(modelDayCell(byDayModels, day, modelKey), cell)
        }
        for (const [modelKey, count] of fold.planCalls) {
          planCalls.set(modelKey, (planCalls.get(modelKey) ?? 0) + count)
        }
        if (fold.total.calls > 0) {
          sessionRows.push({
            id: String(meta.id),
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
        version: 2,
        updatedAt: now,
        source: 'session-logs',
        total,
        byModel: toRecord(byModel),
        byDay: toRecord(byDay),
        byDayModels: toModelDayRecord(byDayModels),
        bySession: sessionRows.slice(0, SESSION_ROW_LIMIT),
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
