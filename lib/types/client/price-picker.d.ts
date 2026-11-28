import type { PricingModel } from '../pricing-shared.ts';
import type { UsageStats } from './domain/types.ts';
/** Only the editor polls discovery. Refresh failures never reset edited rows. */
export declare function useConfiguredPrices(active: boolean): {
    models: PricingModel[];
    partial: boolean;
    pending: boolean;
};
export declare function priceIdentity(key: string, origin?: string): string;
export declare function priceOptions(configured: readonly PricingModel[], stats: UsageStats): {
    id: string;
    key: string;
    channel: string;
    origin: string;
    name: string;
}[];
//# sourceMappingURL=price-picker.d.ts.map