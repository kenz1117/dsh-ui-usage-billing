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
import type { SessionPersistence } from '@deepseek-ai/dsh-session-persistence';
import type { TokenUsage } from '@deepseek-ai/dsh-llm';
/**
 * Real provider model ids map to their billing-catalog keys. Unknown ids stay
 * as-is and price zero (they are not in the catalog; subscription-plan routes
 * like kimi-coding / token plans fall here and therefore cost nothing).
 */
export declare const MODEL_KEY_ALIASES: Readonly<Record<string, string>>;
/** One model's aggregated usage plus estimated cost in CNY. */
export interface ModelUsage {
    calls: number;
    input: number;
    output: number;
    cacheHit: number;
    cacheMiss: number;
    cost: number;
}
/** Zeroed usage accumulator. */
export declare function emptyUsage(): ModelUsage;
/**
 * Fold one token usage event into an accumulator and re-price its cost.
 * The stats `input` is the TOTAL prompt tokens (cacheHit + cacheMiss), so the
 * miss bucket is uncached input plus cache writes.
 * @param acc - the accumulator to mutate.
 * @param usage - the provider-reported usage of one call.
 * @param key - the billing-catalog key this call belongs to.
 */
export declare function foldUsage(acc: ModelUsage, usage: TokenUsage, key: string): void;
/** Local-time date stamp (the host runs in the user's timezone). */
export declare function dayStamp(time: number): string;
/**
 * The persistence surface the aggregate reads: enough of
 * `SessionPersistence` to list sessions and read each log once.
 */
export type UsagePersistence = Pick<SessionPersistence, 'list' | 'readFrom'>;
/**
 * Aggregate real usage from every persisted session log.
 * @param persistence - the session persistence service.
 * @returns the usage-stats document (same shape the dashboard expects).
 */
export declare function aggregateUsage(persistence: UsagePersistence): Promise<unknown>;
//# sourceMappingURL=aggregate.d.ts.map