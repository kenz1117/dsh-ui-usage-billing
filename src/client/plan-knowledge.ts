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

/**
 * 订阅档位知识（自动识别的「档位月费 + 周期额度口径」）：供订阅卡片在
 * 厂商官方未提供实时额度接口时展示参考口径。currency 为原生币种；费用与
 * 额度按官方订阅周期（天/周/月）计量时，periodDays 表述该重置周期。
 */
export interface PlanTier {
  /** 档位月费（原生币种值）。 */
  amount: number
  currency: 'CNY' | 'USD'
  /** 周期额度口径：每 periodDays 天重置的一个额度窗。 */
  periodDays: number
  /** 周期请求额度（若有）。 */
  requests?: number
  /** 周期 token 额度（若有）。 */
  tokens?: number
  /** 额度口径的人话描述（官方未公布精确额度时）。 */
  label?: string
}

/** 原生币订阅月费（金额 + 币种 + 计费周期）。 */
export interface SubscriptionMount {
  amount: number
  currency: 'CNY' | 'USD'
  period: 'month' | 'week' | 'day'
}

/** One plan row: provider id (after plan alias) → plan shape + optional subscription fee. */
export interface PlanKnowledgeEntry {
  type: PlanType
  /** 原生币订阅月费（如 $10/月）；code 计划用，折算后计入「本月预计」。 */
  subscription?: SubscriptionMount
  /** 自动识别的档位月费与周期额度口径（订阅卡片展示）。 */
  tier?: PlanTier
}

/**
 * 订阅/计划 provider id → plan 知识（引用 dsh-spend 的 code/token 双口径）。
 * 覆盖我们实际会识别到的订阅通道；其余按量 API 不计入此表（默认 token）。
 */
export const PLAN_KNOWLEDGE: Readonly<Record<string, PlanKnowledgeEntry>> = {
  'opencode-go': {
    type: 'code',
    // OpenCode Go 订阅制 $10/月，额度按周 $30（V4 Flash 约 79,050 请求/周）。
    subscription: { amount: 10, currency: 'USD', period: 'month' },
    tier: { amount: 10, currency: 'USD', periodDays: 7, label: '周额度 $30' },
  },
  opencode: {
    type: 'code',
    subscription: { amount: 10, currency: 'USD', period: 'month' },
    tier: { amount: 10, currency: 'USD', periodDays: 7, label: '周额度 $30' },
  },
  'kimi-coding': { type: 'code' },
  'zai-coding-cn': { type: 'code' },
  'zai-coding': { type: 'code' },
  'qwen-token-plan': { type: 'code' },
  'qwen-token-plan-cn': { type: 'code' },
  'xiaomi-token-plan-ams': { type: 'code' },
  'xiaomi-token-plan-cn': { type: 'code' },
  'xiaomi-token-plan-sgp': { type: 'code' },
  'volcengine-token-plan': { type: 'code' },
  'ark-token-plan': { type: 'code' },
  'doubao-token-plan': { type: 'code' },
  'minimax': { type: 'code' },
  'minimax-cn': { type: 'code' },
  'minimax-token-plan': { type: 'code' },
  'minimax-token-plan-cn': { type: 'code' },
  'minimax-cn': { type: 'code' },
}

/**
 * 订阅/plan provider id 变体 → PLAN_KNOWLEDGE 规范键（引用 dsh-spend 的别名归一化）。
 * 部署配置的订阅 provider id 写法不一（glm/zhipu/bigmodel、ark/volcengine、
 * kimi/moonshot、xiaomi…），先归一化再匹配，提升"自动识别"覆盖率。
 * 注意：裸 qwen/dashscope/tongyi 等是按量 API（token 计费）而非订阅，不归一到
 * 订阅键——只有显式 token-plan 后缀才由 SUBSCRIPTION_ID_RE 判定为订阅。
 */
export const PLAN_PROVIDER_ALIASES: Readonly<Record<string, string>> = {
  // 智谱 / GLM 系 → z.ai coding（国内）
  'glm': 'zai-coding-cn',
  'bigmodel': 'zai-coding-cn',
  'zhipu': 'zai-coding-cn',
  'zhipuai': 'zai-coding-cn',
  'zai': 'zai-coding',
  // 火山 / 方舟 / 豆包 → 火山 token plan
  'ark': 'volcengine-token-plan',
  'volcengine': 'volcengine-token-plan',
  'doubao': 'doubao-token-plan',
  // 月之暗面 → kimi coding
  'moonshot': 'kimi-coding',
  'kimi': 'kimi-coding',
  // 小米 → 小米 token plan（国内）
  'xiaomi': 'xiaomi-token-plan-cn',
  // opencode
  'opencode': 'opencode-go',
}

/** 归一化订阅 provider id：别名命中则映射到规范键，否则原样返回。 */
export function normalizePlanProvider(providerId: string): string {
  if (providerId === '') return providerId
  return PLAN_PROVIDER_ALIASES[providerId] ?? providerId
}

/** provider id（llm-pi-ai 设置键）→ plan 知识；未命中默认 token。 */
export function planTypeOf(providerId: string): PlanType {
  return PLAN_KNOWLEDGE[normalizePlanProvider(providerId)]?.type ?? 'token'
}

/**
 * 订阅月费折算为人民币：原生币 × 实时汇率（USD→CNY）。汇率缺失时返回 0，
 * 避免用假设汇率造成失真（跨币种保护：金额统一折成 CNY 再相加）。
 */
export function subscriptionFeeCnyOf(providerId: string, rate: number | undefined): number {
  const mount = PLAN_KNOWLEDGE[normalizePlanProvider(providerId)]?.subscription
  if (mount === undefined) return 0
  if (mount.currency === 'CNY') return mount.amount
  return rate !== undefined && rate > 0 ? mount.amount * rate : 0
}

/** 自动识别的档位月费与周期额度口径（订阅卡片展示）；无档位知识返回 undefined。 */
export function tierInfoOf(providerId: string): PlanTier | undefined {
  const entry = PLAN_KNOWLEDGE[normalizePlanProvider(providerId)]
  return entry?.type === 'code' ? entry.tier : undefined
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
