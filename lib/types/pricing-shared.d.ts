/**
 * Live-pricing wire types shared by the node half (which fetches and caches
 * once at boot) and the browser half (which applies the overrides on top of
 * the built-in catalog). An absent field means the built-in value still
 * applies — the dashboard degrades to the catalog, never to fabricated data.
 */
/** One model's unit prices as reported by the router, in USD per 1M tokens. */
export interface LivePrice {
    /** Uncached input price per 1M tokens. */
    input: number;
    /** Cache-hit input price per 1M tokens (estimated as 10% of input; the router list carries no cache band). */
    cacheHit: number;
    /** Output price per 1M tokens. */
    output: number;
}
/** Response of `/api/billing/pricing` consumed by the dashboard. */
export interface LivePricing {
    /** live = at least one fetch succeeded; builtin = full fallback to the catalog. */
    source: 'live' | 'builtin';
    /** USD → CNY mid rate (present when the rate fetch succeeded). */
    rate?: number;
    /** Overrides keyed by built-in catalog key (present when router matches succeeded). */
    prices?: Record<string, LivePrice>;
}
//# sourceMappingURL=pricing-shared.d.ts.map