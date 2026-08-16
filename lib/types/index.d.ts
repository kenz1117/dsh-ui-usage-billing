/**
 * Usage billing surface plugin, node half.
 *
 * Serves `/api/billing/usage-stats`: real usage aggregated from every
 * persisted session log (see `aggregate.ts`) — the browser dashboard reads it
 * instead of showing an empty snapshot. When `sessionPersistence` is
 * unavailable (or aggregation fails), the configured `statsPath` /
 * `DSH_USAGE_STATS` / conventional JSON file is served as a fallback, and a
 * missing file answers `{ error }` so the dashboard shows zeros, never
 * fabricated samples.
 */
import type { Context } from '@deepseek-ai/cordis';
/** Plugin configuration. */
export interface UsageBillingConfig {
    /** Absolute path to a `.dsh-usage-stats.json` fallback file. */
    statsPath?: string;
    /** 订阅制（coding / token / agent plan）provider id 列表；默认 kimi-coding、xiaomi-token-plan-cn。 */
    subscriptionProviders?: string[];
}
/** Required services: the web server and the persisted session log store. */
export declare const inject: string[];
/**
 * Host plugin body: serve real aggregated usage to the browser dashboard.
 * @param ctx - host context carrying webServer and sessionPersistence.
 * @param config - optional statsPath override.
 */
export declare function apply(ctx: Context, config?: UsageBillingConfig): void;
//# sourceMappingURL=index.d.ts.map