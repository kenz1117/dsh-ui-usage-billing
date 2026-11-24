import type { ProviderBalance, RelayQuota, SubscriptionQuota } from '../../pricing-shared.ts';
import type { BillingCardSpan } from '../usage-billing-settings.ts';
import type { UsageBillingKey } from '../locales.ts';
import type { UsageStats } from './types.ts';
type ModelStats = Pick<UsageStats, 'byDayModels' | 'byDayModelsSite' | 'byModel'>;
interface Lead {
    name: string;
    cost: number;
    calls: number;
    sources: Set<string>;
}
/** Retain displayed costs for paid-only days. For mixed days use recorded costs to avoid pricing plan calls. */
export declare function floatingLeads(stats: ModelStats, span: BillingCardSpan, today: string, recordedDays?: Record<string, Record<string, {
    calls: number;
    input: number;
    output: number;
    cacheHit: number;
    cacheMiss: number;
    cacheWrite?: number;
    cost: number;
}>> | undefined): {
    paid: Lead | undefined;
    plan: Lead | undefined;
};
export declare function floatingStatus(leads: ReturnType<typeof floatingLeads>, balances: readonly ProviderBalance[], relays: readonly RelayQuota[], quotas: readonly SubscriptionQuota[], threshold: number, t: (key: UsageBillingKey) => string): {
    direct: {
        text: string;
        low: boolean;
        name: string;
    } | undefined;
    sub: {
        text: string;
        low: boolean;
        name: string;
    } | undefined;
};
export {};
//# sourceMappingURL=floating-model.d.ts.map