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
export type PlanType = 'code' | 'token';
/**
 * 订阅档位知识（自动识别的「档位月费 + 周期额度口径」）：供订阅卡片在
 * 厂商官方未提供实时额度接口时展示参考口径。currency 为原生币种；费用与
 * 额度按官方订阅周期（天/周/月）计量时，periodDays 表述该重置周期。
 */
export interface PlanTier {
    /** 档位月费（原生币种值）。 */
    amount: number;
    currency: 'CNY' | 'USD';
    /** 周期额度口径：每 periodDays 天重置的一个额度窗。 */
    periodDays: number;
    /** 周期请求额度（若有）。 */
    requests?: number;
    /** 周期 token 额度（若有）。 */
    tokens?: number;
    /** 额度口径的人话描述（官方未公布精确额度时）。 */
    label?: string;
}
/** One plan row: provider id (after alias) → plan shape + optional subscription fee. */
export interface PlanKnowledgeEntry {
    type: PlanType;
    /** 订阅月费（人民币元）；code 计划用，计入「本月预计」。 */
    subscriptionCny?: number;
    /** 自动识别的档位月费与周期额度口径（订阅卡片展示）。 */
    tier?: PlanTier;
}
/**
 * 订阅/计划 provider id → plan 知识（引用 dsh-spend 的 code/token 双口径）。
 * 覆盖我们实际会识别到的订阅通道；其余按量 API 不计入此表（默认 token）。
 */
export declare const PLAN_KNOWLEDGE: Readonly<Record<string, PlanKnowledgeEntry>>;
/** provider id（llm-pi-ai 设置键）→ plan 知识；未命中默认 token。 */
export declare function planTypeOf(providerId: string): PlanType;
/** 订阅月费（人民币元）；非 code 或未配置时为 0。 */
export declare function subscriptionCnyOf(providerId: string): number;
/** 自动识别的档位月费与周期额度口径（订阅卡片展示）；无档位知识返回 undefined。 */
export declare function tierInfoOf(providerId: string): PlanTier | undefined;
export interface FallbackRate {
    /** 归一化模型 id（计费键，与 catalogEntries 的 key 同口径）。 */
    key: string;
    input: number;
    cacheHit: number;
    output: number;
}
export declare const FALLBACK_RATES: readonly FallbackRate[];
//# sourceMappingURL=plan-knowledge.d.ts.map