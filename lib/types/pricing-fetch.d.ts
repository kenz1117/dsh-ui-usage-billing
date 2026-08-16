/**
 * One-shot live pricing refresh for the billing dashboard.
 *
 * Fetches the USD → CNY mid rate and the OpenRouter model price list, maps
 * matched models onto the built-in catalog keys, and returns the combined
 * LivePricing. Every fetch failure degrades to the built-in values: the node
 * half caches whatever succeeded and the browser dashboard falls back to the
 * catalog for the rest — a total outage answers `{ source: 'builtin' }`.
 */
import type { LivePricing } from './pricing-shared.ts';
/**
 * Fetch the live pricing once at boot. Both upstreams run in parallel; a
 * failure in either degrades independently to the built-in value.
 * @returns the live pricing snapshot (builtin when everything failed).
 */
export declare function fetchLivePricing(): Promise<LivePricing>;
//# sourceMappingURL=pricing-fetch.d.ts.map