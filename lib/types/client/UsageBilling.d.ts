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
import type { InjectFace, PropsLocale, PropsRenderSlots, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type { SidebarFooterActionOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client';
import type { createBillingBudgetStore } from './budget-store.ts';
import { NS, type UsageBillingKey } from './locales.ts';
/** Model-connectivity health reported by the host model directory probe. */
export interface ModelHealth {
    /** Whether the probe completed (false while still loading). */
    checked: boolean;
    /** True when at least one connected provider answered its model catalog. */
    available: boolean;
    /** 可用模型总数：累加每个厂商成功 advertise 的模型数，而非厂商数。 */
    models: number;
    /** 失效厂商数（目录探测失败的厂商；失败信息不细分到模型级）。 */
    failures: number;
    /** Display names of providers that answered their model catalog (live). */
    okProviders: readonly string[];
    /** Display names of providers whose catalog probe failed. */
    badProviders: readonly string[];
}
/** 仪表盘分区 Tab id。 */
export type DashboardTab = 'overview' | 'trends' | 'providers' | 'details' | 'pricing';
/**
 * Tab 定义（顺序即渲染顺序）：概览=主数字/预算/KPI/热力图，趋势=趋势图/每轮费用，
 * 厂商=厂商计费与订阅，明细=工作区/会话明细，单价=模型单价表。导出供测试断言
 * tab 与文案 key 对齐、decor 锚点落在正确分区。
 */
export declare const DASHBOARD_TABS: readonly {
    id: DashboardTab;
    labelKey: UsageBillingKey;
}[];
/**
 * The dashboard's display names (中文厂商名) never equal the provider names a
 * user actually configures (deepseek, zhipu, qwen…), so the dot match also
 * accepts a bidirectional substring hit and a display-name alias list.
 * 导出供一致性守卫测试：catalog 每个厂商都必须在此登记（Custom 除外），
 * 防止新增厂商漏配导致健康绿灯不亮。
 */
export declare const PROVIDER_ALIASES: Readonly<Record<string, readonly string[]>>;
/**
 * 从真实 model id 反推提供方显示名：目录未收录的模型（key 落回「其他」）
 * 只靠 entry.provider（Custom）永远点不亮健康灯，这里用厂商别名对 model id
 * 做强匹配（别名作为完整 id / 前缀 / 独立段）与弱匹配（长别名子串），
 * 命中即显示厂商名并点亮健康点；无命中保持 Custom。
 * 导出供守卫测试：短别名（mi/yi）仅允许前缀形式，防止 minimax 等误吞。
 */
export declare function providerFromModelKey(modelKey: string): string | undefined;
/**
 * 本月预计总花费：按本月已有记录的平均日消耗 × 本月天数外推；无本月记录时
 * 回退为最近 7 天日均 × 本月天数；无任何记录时返回 0（调用方不展示）。
 * 导出供测试：纯函数，不依赖组件。
 * @param byDay - 按日费用表。
 * @param monthPrefix - 本月前缀（YYYY-MM）。
 * @param today - 今日日期戳（YYYY-MM-DD）。
 * @returns 本月预计花费（人民币元）；无数据时为 0。
 */
export declare function projectMonthCost(byDay: Record<string, {
    cost: number;
}>, monthPrefix: string, today: string): number;
/** 组件注入面：探活 + 计费指标写入（billing 自身写入，主题插件经服务读取）。 */
export interface UsageBillingInjected {
    checkModels: () => Promise<ModelHealth>;
    publishCosts: (costs: {
        todayCost: number;
        monthCost: number;
    }) => void;
    registerOpen: (handler: () => void) => () => void;
}
/** 预算 store 的 props 份额（useStore 读取 + actions 写面）。 */
type BillingBudgetStoreProps = PropsStore<ReturnType<typeof createBillingBudgetStore>>;
/** Full props type for the UsageBilling component. */
type UsageBillingProps = PropsRuntime<'sidebar.footer.action'> & SidebarFooterActionOwnerProps & InjectFace<UsageBillingInjected> & PropsRenderSlots<'billing.dashboard.decor'> & BillingBudgetStoreProps & PropsLocale<typeof NS>;
/**
 * UsageBilling: sidebar trigger plus the billing dashboard modal.
 * @param props - framework-provided sidebar and locale props.
 */
export declare function UsageBilling(props: UsageBillingProps): React.ReactNode;
export {};
//# sourceMappingURL=UsageBilling.d.ts.map