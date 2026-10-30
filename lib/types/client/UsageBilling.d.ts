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
 *
 * v1.5.2 拆分（refactor）：纯函数 / 类型 / fetch 抽到 `client/domain/` 与
 * `client/api/`，常量抽到 `client/constants.ts`，本文件只保留组件本身
 * （UsageBilling / BillingDashboard / UsageBillingTrigger / UserPriceCard /
 * PositionMenu / SubscriptionWindowRow / BalanceDetailPopover+Row）。
 */
import type { InjectFace, PropsLocale, PropsRenderSlots, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type { SidebarFooterActionOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client';
import type { createBillingBudgetStore } from './budget-store.ts';
import { NS } from './locales.ts';
import { type UsageBillingInjected } from './domain/types.ts';
/** 预算 store 的 props 份额（useStore 读取 + actions 写面）。 */
type BillingBudgetStoreProps = PropsStore<ReturnType<typeof createBillingBudgetStore>>;
/** Full props type for the UsageBilling component. */
export type UsageBillingProps = PropsRuntime<'sidebar.footer.action'> & SidebarFooterActionOwnerProps & InjectFace<UsageBillingInjected> & PropsRenderSlots<'billing.dashboard.decor'> & BillingBudgetStoreProps & PropsLocale<typeof NS> & {
    /** 原生设置页嵌入模式：只渲染完整设置分区，不渲染侧栏入口与弹窗外壳。 */
    embeddedSettings?: boolean;
};
/**
 * UsageBilling: sidebar trigger plus the billing dashboard modal.
 * @param props - framework-provided sidebar and locale props.
 */
export declare function UsageBilling(props: UsageBillingProps): React.ReactNode;
export {};
//# sourceMappingURL=UsageBilling.d.ts.map