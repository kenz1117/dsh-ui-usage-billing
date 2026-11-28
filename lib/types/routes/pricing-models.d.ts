import type { Context } from '@deepseek-ai/cordis';
import type { PricingModel } from '../pricing-shared.ts';
type PricingModelsResult = {
    models: PricingModel[];
    partial: boolean;
};
/** Static settings remain authoritative even when the registry is unavailable. */
export declare function configuredPricingModels(ctx: Context): Promise<PricingModelsResult>;
export declare function registerPricingModelsRoute(ctx: Context, trustedHosts: ReadonlySet<string>): void;
export {};
//# sourceMappingURL=pricing-models.d.ts.map