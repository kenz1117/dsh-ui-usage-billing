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
 * prices spare-capacity traffic at -50%; DeepSeek V4 splits peak
 * (09:00-12:00 / 14:00-18:00 Beijing) at 2x the off-peak rate. The estimator
 * mixes both bands by a configured peak share ({@link DEFAULT_PEAK_SHARE}).
 */
/**
 * USD → CNY rate for display. Source: China Foreign Exchange Trade System
 * mid-rate 6.7878 on 2026-08-14; rounded to 6.79. Only applies to overseas
 * USD-priced models — domestic models never pass through this rate.
 */
export declare const USD_TO_CNY = 6.79;
/** Default share of traffic assumed to fall in the peak band (0..1). */
export declare const DEFAULT_PEAK_SHARE = 0.5;
/**
 * Model keys served through a subscription plan (e.g. a coding plan or topic
 * plan) instead of metered per-token API billing. Usage through these routes
 * costs no tokens: the estimator treats them as ¥0 and the billing table
 * labels them 订阅包含. Add any model key your deployment serves through a
 * plan here; leave empty when every route is pay-as-you-go.
 */
export declare const SUBSCRIPTION_PLAN_KEYS: readonly string[];
/** Whether one stats model key is billed through a subscription plan. */
export declare function isSubscriptionPlan(key: string): boolean;
/** Usage buckets consumed by one model (counts in raw tokens). */
export interface TokenUsageBuckets {
    /** Uncached input tokens. */
    input: number;
    /** Cache-hit input tokens. */
    cacheHit: number;
    /** Cache-miss input tokens (already included in `input` by some providers). */
    cacheMiss: number;
    /** Output tokens. */
    output: number;
}
/** Per-1M-token price in the model's native currency for one billing band. */
export interface PriceBand {
    /** Input (uncached) price per 1M tokens. */
    input: number;
    /** Cache-hit input price per 1M tokens. */
    cacheHit: number;
    /** Cache-miss input price per 1M tokens (absent when folded into `input`). */
    cacheMiss?: number;
    /** Output price per 1M tokens. */
    output: number;
}
/** A model's price table, optionally split into peak/off-peak bands. */
export interface ModelPrice extends PriceBand {
    /** 计价币种：国内模型直接人民币（CNY），国外模型美元（USD）。 */
    currency: 'CNY' | 'USD';
    /** Off-peak band (Gemini Flex / DeepSeek 低谷档); absent = flat pricing. */
    offPeak?: PriceBand;
}
/** One catalog entry: identity, brand color token, and price. */
export interface ModelEntry {
    /** Model key used by `.dsh-usage-stats.json` `byModel`. */
    key: string;
    /** Human-readable model name. */
    name: string;
    /** Provider label. */
    provider: string;
    /** CSS variable name (without the leading `--`) used as the brand accent. */
    colorVar: string;
    /** Price table (peak band when a split exists). */
    price: ModelPrice;
    /** Peak-hour window label for time-of-day priced models. */
    peakHours?: string;
}
/**
 * Built-in catalog of current mainstream models as of 2026-08-16, priced from
 * each provider's official price page. Domestic providers are OpenAI-API
 * compatible and publish RMB prices directly; overseas providers publish USD
 * and convert through the exchange rate at estimate time. Retired models
 * (GPT-4o family, Gemini 2.x, GLM-4.x-lite, older Qwen) are deliberately
 * absent, as are Anthropic Claude models (their native API is not
 * OpenAI-compatible, so the harness cannot drive them directly). DeepSeek
 * keys match the harness stats file so real usage prices from the catalog;
 * unknown keys fall back to `other`.
 *
 * Time-of-day billing (peak/off-peak) is now real: DeepSeek V4 officially
 * splits peak (09:00-12:00 / 14:00-18:00 Beijing) at 2x the off-peak rate
 * from 2026-08-17, and Gemini's Flex tier discounts spare-capacity traffic.
 */
export declare const MODEL_CATALOG: readonly ModelEntry[];
/** Lookup a model by its stats key; falls back to the generic `other` entry. */
export declare function modelOf(key: string): ModelEntry;
/** Resolve a price-table row by its CSS variable name (theme token or fallback color). */
export declare function resolveToken(name: string): string;
/**
 * Estimate the CNY cost of one model's token usage, mixing the peak and
 * off-peak bands by the given peak share (flat-priced models cost the same in
 * both bands).
 * @param entry - the catalog entry whose prices apply.
 * @param buckets - token usage counts.
 * @param peakShare - share of traffic in the peak band (0..1); defaults to {@link DEFAULT_PEAK_SHARE}.
 * @returns the estimated cost in CNY.
 */
export declare function computeCost(entry: ModelEntry, buckets: TokenUsageBuckets, peakShare?: number): number;
/** Format a CNY amount with adaptive precision. */
export declare function formatMoney(cny: number): string;
/**
 * Format a per-1M-token price in its native currency (free when the rate is
 * zero): CNY for domestic models, USD for overseas ones.
 */
export declare function formatUnitPrice(price: number, currency?: 'CNY' | 'USD'): string;
/** Format a large token count with B/M/K suffix. */
export declare function formatTokens(value: number): string;
/** Format a percentage. */
export declare function formatPercent(value: number): string;
//# sourceMappingURL=pricing.d.ts.map