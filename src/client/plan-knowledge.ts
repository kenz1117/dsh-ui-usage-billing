/**
 * Plan-knowledge reference (adapted from dsh-spend's `knowledge.js`, MIT):
 * billing-plan shape (code = subscription, token = usage) for known providers,
 * plus official token rates as a pricing fallback for providers whose models
 * are not covered by the built-in catalog or models.dev.
 *
 * The cost model follows dsh-spend's dual-basis:
 * - `code` plan (OpenCode Go, Coding/Token plans, etc.): the monthly cost is
 *   the subscription fee, counted into the projected month total.
 * - `token` plan (pay-as-you-go API providers): cost = tokens × unit price.
 *
 * We keep our own live-pricing path (models.dev + OpenRouter) for token plans;
 * this table only fills the subscription amount, the plan type, and a fallback
 * rate for the few models those live sources may miss.
 */

/** Plan type: code = subscription + quota, token = per-token usage. */
export type PlanType = 'code' | 'token'

/** One plan row: provider id (after alias) → plan shape + optional subscription fee. */
export interface PlanKnowledgeEntry {
  type: PlanType
  /** 订阅月费（人民币元）；code 计划用，计入「本月预计」。 */
  subscriptionCny?: number
}

/**
 * 订阅/计划 provider id → plan 知识（引用 dsh-spend 的 code/token 双口径）。
 * 覆盖我们实际会识别到的订阅通道；其余按量 API 不计入此表（默认 token）。
 */
export const PLAN_KNOWLEDGE: Readonly<Record<string, PlanKnowledgeEntry>> = {
  'opencode-go': { type: 'code', subscriptionCny: 70 },
  opencode: { type: 'code', subscriptionCny: 70 },
  'kimi-coding': { type: 'code', subscriptionCny: 0 },
  'zai-coding-cn': { type: 'code', subscriptionCny: 0 },
  'zai-coding': { type: 'code', subscriptionCny: 0 },
  'qwen-token-plan': { type: 'code', subscriptionCny: 0 },
  'qwen-token-plan-cn': { type: 'code', subscriptionCny: 0 },
  'xiaomi-token-plan-ams': { type: 'code', subscriptionCny: 0 },
  'xiaomi-token-plan-cn': { type: 'code', subscriptionCny: 0 },
  'xiaomi-token-plan-sgp': { type: 'code', subscriptionCny: 0 },
  'volcengine-token-plan': { type: 'code', subscriptionCny: 0 },
  'ark-token-plan': { type: 'code', subscriptionCny: 0 },
  'doubao-token-plan': { type: 'code', subscriptionCny: 0 },
  'minimax': { type: 'code', subscriptionCny: 0 },
  'minimax-token-plan': { type: 'code', subscriptionCny: 0 },
}

/** provider id（llm-pi-ai 设置键）→ plan 知识；未命中默认 token。 */
export function planTypeOf(providerId: string): PlanType {
  return PLAN_KNOWLEDGE[providerId]?.type ?? 'token'
}

/** 订阅月费（人民币元）；非 code 或未配置时为 0。 */
export function subscriptionCnyOf(providerId: string): number {
  const entry = PLAN_KNOWLEDGE[providerId]
  return entry?.type === 'code' ? (entry.subscriptionCny ?? 0) : 0
}

/* ── dsh-spend 官方价表兜底（USD / 1M tokens）──────────────────────────────
 * models.dev / OpenRouter 抓不到时的回退，仅覆盖部分高频模型。币种统一折算
 * 为 USD（dsh-spend 原始口径），费用经 `computeCostAt` 按汇率换算人民币。 */

export interface FallbackRate {
  /** 归一化模型 id（计费键，与 catalogEntries 的 key 同口径）。 */
  key: string
  input: number
  cacheHit: number
  output: number
}

export const FALLBACK_RATES: readonly FallbackRate[] = [
  { key: 'deepseek-v4-flash', input: 0.14, cacheHit: 0.0028, output: 0.28 },
  { key: 'deepseek-v4-pro', input: 0.435, cacheHit: 0.003625, output: 0.87 },
  { key: 'gpt-5.6-sol', input: 5, cacheHit: 0.5, output: 30 },
  { key: 'gpt-5.6-terra', input: 2, cacheHit: 0.2, output: 12 },
  { key: 'gpt-5.6-luna', input: 0.2, cacheHit: 0.02, output: 1.2 },
  { key: 'glm-5.2', input: 1.4, cacheHit: 0.26, output: 4.4 },
  { key: 'qwen3.8-max', input: 2, cacheHit: 0.21, output: 6 },
  { key: 'kimi-k3', input: 2.82, cacheHit: 0.28, output: 14.08 },
  { key: 'grok-4.6', input: 2, cacheHit: 0.5, output: 6 },
  { key: 'gemini-2.5-pro', input: 1.25, cacheHit: 0.125, output: 10 },
]
