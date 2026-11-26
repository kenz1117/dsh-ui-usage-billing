import { type ProviderBalance, type RelayQuota, type SubscriptionQuota } from '../../pricing-shared.ts';
import type { BillingCardSpan } from '../usage-billing-settings.ts';
import type { UsageBillingKey } from '../locales.ts';
import type { UsageStats } from './types.ts';
type ModelStats = Pick<UsageStats, 'byDayModels' | 'byDayModelsSite' | 'byModel'>;
interface Lead {
    name: string;
    cost: number;
    calls: number;
    sources: Set<string>;
    unattributedCalls: number;
}
/** Rank metered models on the same day/model costs as the dashboard, including custom prices. */
export declare function floatingLeads(stats: ModelStats, span: BillingCardSpan, today: string): {
    paid: Lead | undefined;
    plan: Lead | undefined;
};
export declare function floatingStatus(leads: ReturnType<typeof floatingLeads>, balances: readonly ProviderBalance[], relays: readonly RelayQuota[], quotas: readonly SubscriptionQuota[], threshold: number, t: (key: UsageBillingKey) => string): {
    direct: {
        name: string;
        text: string;
        low: boolean;
    } | undefined;
    sub: {
        name: string;
        text: string;
        low: boolean;
    } | undefined;
};
export {};
//# sourceMappingURL=floating-model.d.ts.map