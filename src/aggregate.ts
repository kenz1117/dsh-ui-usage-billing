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
 * `SessionPersistence` to list sessions and read each log once.
 */
export type UsagePersistence = Pick<SessionPersistence, 'list' | 'readFrom'>

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
 * Aggregate real usage from every persisted session log.
 * @param persistence - the session persistence service.
 * @param options - aggregation tuning (e.g. subscription-plan providers).
 * @returns the usage-stats document (same shape the dashboard expects).
 */
export async function aggregateUsage(persistence: UsagePersistence, options: AggregateOptions = {}): Promise<UsageStatsDocument> {
  const subscriptionProviders = new Set(options.subscriptionProviders ?? DEFAULT_SUBSCRIPTION_PROVIDERS)
  const total = emptyUsage()
  const byModel = new Map<string, ModelUsage>()
  const byDay = new Map<string, ModelUsage>()
  // 模型 × 日期 二维聚合：趋势图按模型堆叠展示的输入（byDayModels[date][modelKey]）。
  const byModelDay = new Map<string, Map<string, ModelUsage>>()
  // 每个模型 key 走订阅通道的调用数：等于总调用数才置 plan，混合通道不标。
  const planCalls = new Map<string, number>()
  for (const meta of await persistence.list()) {
    const { events } = await persistence.readFrom(meta.id, 0)
    let key = 'other'
    let subscription = false
    for (const event of events) {
      if (event.type === 'request/header') {
        const { model, provider } = event.data.header.config
        key = MODEL_KEY_ALIASES[model] ?? model
        // 订阅套餐 provider 的调用即使撞名计费表也一律免费。
        subscription = subscriptionProviders.has(provider)
        continue
      }
      if (event.type !== 'assistant/message' || event.data.usage === undefined) continue
      // 归属到最近的 request/header 记录的模型，token 按缓存分桶累加。
      const modelKey = key
      const day = dayStamp(event.time)
      foldUsage(total, event.data.usage, modelKey, subscription)
      foldUsage(usageCell(byModel, modelKey), event.data.usage, modelKey, subscription)
      foldUsage(usageCell(byDay, day), event.data.usage, modelKey, subscription)
      foldUsage(modelDayCell(byModelDay, day, modelKey), event.data.usage, modelKey, subscription)
      if (subscription) planCalls.set(modelKey, (planCalls.get(modelKey) ?? 0) + 1)
    }
  }
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
  return {
    version: 2,
    updatedAt: Date.now(),
    source: 'session-logs',
    total,
    byModel: toRecord(byModel),
    byDay: toRecord(byDay),
    byDayModels: toModelDayRecord(byModelDay),
  }
}
