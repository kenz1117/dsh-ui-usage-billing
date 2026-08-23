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
/** 原生币订阅月费（金额 + 币种 + 计费周期）。 */
export interface SubscriptionMount {
    amount: number;
    currency: 'CNY' | 'USD';
    period: 'month' | 'week' | 'day';
}
/** One plan row: provider id (after plan alias) → plan shape + optional subscription fee. */
export interface PlanKnowledgeEntry {
    type: PlanType;
    /** 原生币订阅月费（如 $10/月）；code 计划用，折算后计入「本月预计」。 */
    subscription?: SubscriptionMount;
    /** 自动识别的档位月费与周期额度口径（订阅卡片展示）。 */
    tier?: PlanTier;
}
/**
 * 订阅/计划 provider id → plan 知识（引用 dsh-spend 的 code/token 双口径）。
 * 覆盖我们实际会识别到的订阅通道；其余按量 API 不计入此表（默认 token）。
 */
export declare const PLAN_KNOWLEDGE: Readonly<Record<string, PlanKnowledgeEntry>>;
/**
 * 订阅/plan provider id 变体 → PLAN_KNOWLEDGE 规范键（引用 dsh-spend 的别名归一化）。
 * 部署配置的订阅 provider id 写法不一（glm/zhipu/bigmodel、ark/volcengine、
 * kimi/moonshot、xiaomi…），先归一化再匹配，提升"自动识别"覆盖率。
 * 注意：裸 qwen/dashscope/tongyi 等是按量 API（token 计费）而非订阅，不归一到
 * 订阅键——只有显式 token-plan 后缀才由 SUBSCRIPTION_ID_RE 判定为订阅。
 */
export declare const PLAN_PROVIDER_ALIASES: Readonly<Record<string, string>>;
/** 归一化订阅 provider id：别名命中则映射到规范键，否则原样返回。 */
export declare function normalizePlanProvider(providerId: string): string;
/** provider id（llm-pi-ai 设置键）→ plan 知识；未命中默认 token。 */
export declare function planTypeOf(providerId: string): PlanType;
/**
 * 订阅月费折算为人民币：原生币 × 实时汇率（USD→CNY）。汇率缺失时返回 0，
 * 避免用假设汇率造成失真（跨币种保护：金额统一折成 CNY 再相加）。
 */
export declare function subscriptionFeeCnyOf(providerId: string, rate: number | undefined): number;
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