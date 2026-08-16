/**
 * UsageBilling: sidebar footer trigger + full billing dashboard modal.
 *
 * The trigger sits above Settings in the sidebar footer (rail shows an icon,
 * wide shows a pill with the running total). Clicking opens a centered modal
 * dashboard: hero total, KPI tiles, a dependency-free SVG daily trend chart,
 * a per-model billing table priced from the built-in catalog, and a pricing
 * table. Data comes from the host's `/api/billing/usage-stats` endpoint;
 * before real data arrives the dashboard shows an empty (zero) snapshot,
 * never fabricated samples.
 */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { SidebarFooterActionOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client';
import { NS } from './locales.ts';
/** Model-connectivity health reported by the host model directory probe. */
export interface ModelHealth {
    /** Whether the probe completed (false while still loading). */
    checked: boolean;
    /** True when at least one connected provider answered its model catalog. */
    available: boolean;
    /** Connected provider count. */
    providers: number;
    /** Provider count whose catalog probe failed. */
    failures: number;
    /** Display names of providers that answered their model catalog (live). */
    okProviders: readonly string[];
    /** Display names of providers whose catalog probe failed. */
    badProviders: readonly string[];
}
/** Full props type for the UsageBilling component. */
type UsageBillingProps = PropsRuntime<'sidebar.footer.action'> & SidebarFooterActionOwnerProps & InjectFace<{
    checkModels: () => Promise<ModelHealth>;
}> & PropsLocale<typeof NS>;
/**
 * UsageBilling: sidebar trigger plus the billing dashboard modal.
 * @param props - framework-provided sidebar and locale props.
 */
export declare function UsageBilling(props: UsageBillingProps): React.ReactNode;
export {};
//# sourceMappingURL=UsageBilling.d.ts.map