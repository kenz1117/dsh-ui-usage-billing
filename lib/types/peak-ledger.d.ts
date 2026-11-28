import { type ModelEntry, type TokenUsageBuckets } from './client/pricing.ts';
import type { indexPeakHistory } from './peak-schedule-history.ts';
export type PeakIndex = ReturnType<typeof indexPeakHistory>;
export declare function scheduleTier(schedule: PeakIndex, source: string | undefined, entry: ModelEntry, model: string, time: number): "peak" | "offPeak" | undefined;
/** Old site buckets lack raw provider ids. Only trust the historical routing fingerprint
 * when its (unescaped) alias/origin fields can be decoded without ambiguity. */
export declare function legacyScheduleSource(fingerprint: string | undefined): (site: string) => boolean;
export declare const tokenFields: readonly ["input", "output", "cacheHit", "cacheMiss", "cacheWrite"];
export declare const emptyTokens: () => Required<TokenUsageBuckets>;
export declare function addTokens(target: Required<TokenUsageBuckets>, cell: TokenUsageBuckets, sign?: number): void;
export declare const emptyPrice: () => {
    cost: number;
    inputCost: number;
    outputCost: number;
    peakCost: number;
    offCost: number;
};
export type LedgerPrice = ReturnType<typeof emptyPrice>;
export declare function addPrice(target: LedgerPrice, price: LedgerPrice): void;
export declare function priceLedgerTokens(entry: ModelEntry, cell: TokenUsageBuckets, day: string, schedule?: PeakIndex, source?: string): LedgerPrice;
//# sourceMappingURL=peak-ledger.d.ts.map