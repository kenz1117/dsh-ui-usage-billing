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
import { type ClientPerf } from './PerfPanel.tsx';
import type { createBillingBudgetStore } from './budget-store.ts';
import { type CatalogModel } from './pricing.ts';
import type { ReconcileNotice } from '../pricing-shared.ts';
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
    /** 探活得到的模型清单（系统里实际配置/预制的模型；无价格，费率表据此对标）。 */
    catalog?: readonly CatalogModel[];
}
/** 仪表盘分区 Tab id。 */
export type DashboardTab = 'overview' | 'token' | 'trends' | 'providers' | 'pricing' | 'settings';
/**
 * Tab 定义（顺序即渲染顺序）：概览=主数字/KPI/热力图，账单=厂商计费与订阅，
 * 用量=Token 用量，趋势=趋势图/每轮费用，费率=模型单价表，设置=预算与峰谷提醒。
 * 导出供测试断言 tab 与文案 key 对齐、decor 锚点落在正确分区。
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
/** 仅供测试：暴露厂商映射表（subscriptionVendorOf 仍是唯一消费入口）。 */
export declare const SUBSCRIPTION_VENDORS_FOR_TEST: Readonly<Record<string, string>>;
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
/**
 * 用户自定义单价显示重估：聚合发生在宿主进程（按内置目录计价），用户价只在
 * 客户端显示层生效。对 byDayModels（day×model 完整二维）中命中用户价的模型
 * 逐格平价重算 cost，并派生 byDay / byModel / total 的 cost。其余视图
 * （bySite / byTier / bySession / byTurn）保持宿主原值——逐格时刻或行级归属
 * 在客户端不可得，口径差异在设置面板注明。导出供测试：纯函数。
 * @param stats - 服务端聚合文档。
 * @returns 重估后的文档；无用户价或缺 byDayModels 时原样返回。
 */
export declare function recostWithUserPrices(stats: UsageStats): UsageStats;
/** 近 7 天费用序列（含今天，缺日补 0）：触发卡 hover 速览的迷你柱数据源。
 * 导出供测试：纯函数（日期取本地时区）。 */
export declare function activeDaysOf(byDay: Record<string, {
    cost: number;
}>): number;
/** 连续使用天数：从今天往前连续「有调用记录」的天数；今天无记录则为 0。
 * 导出供测试：纯函数（日期取本地时区）。 */
export declare function streakDaysOf(byDay: Record<string, {
    cost: number;
}>, now?: number): number;
/**
 * 近 7 天费用序列（含今天，缺日补 0）：触发卡 hover 速览的迷你柱数据源。
 * 导出供测试：纯函数（日期取本地时区）。
 * @param byDay - 按日费用表。
 * @returns 7 个 `{ date, cost }`，最旧在前。
 */
export declare function lastSevenDays(byDay: Record<string, {
    cost: number;
}>): readonly {
    date: string;
    cost: number;
}[];
/** 会话明细行（与服务端 SessionUsageRow 同形；旧快照可能缺失整个 bySession）。 */
interface SessionBillingRow {
    id: string;
    title?: string;
    cwd?: string;
    /** 数据来自旧算法折叠的持久账本行（原始日志已删，无法重算）。 */
    stale?: boolean;
    calls: number;
    cost: number;
    lastActive: number;
}
/** Usage stats structure from `.dsh-usage-stats.json`. */
export interface UsageStats {
    /** 服务端聚合时间戳（毫秒）；旧快照可能缺失。 */
    updatedAt?: number;
    /** 宿主进程时区（IANA 名 + UTC 偏移）：天按此切分，副标题据此标注；旧快照可能缺失。 */
    timezone?: {
        name: string;
        offset: string;
    };
    /** 月度预算（人民币元）：宿主 Config 注入；未配置时不渲染预算条。 */
    budget?: number;
    /** 余额不足告警阈值（人民币元）：宿主 Config 注入；未配置时客户端用默认值。 */
    lowBalanceThreshold?: number;
    /** 会话明细（按费用倒序，服务端已封顶）；旧快照可能缺失。 */
    bySession?: readonly SessionBillingRow[];
    total: {
        calls: number;
        input: number;
        output: number;
        cacheHit: number;
        cacheMiss: number;
        /** 显式缓存写入（cacheMiss 子集，部分厂商单独报告）；1.0.8 起新增，旧快照缺失。 */
        cacheWrite?: number;
        cost: number;
        /** 输出中的 reasoning（思考）token；已含在 output 内。 */
        reasoning: number;
    };
    byModel: Record<string, {
        calls: number;
        input: number;
        output: number;
        cacheHit: number;
        cacheMiss: number;
        cost: number;
        reasoning: number;
        /** Billed through a subscription plan (no per-token cost). */
        plan?: boolean;
        /** 走官方 DeepSeek 直连的调用数（其余为第三方）；旧快照可能缺失。 */
        officialCalls?: number;
        /** 走官方渠道的费用（CNY）；旧快照可能缺失。 */
        officialCost?: number;
    }>;
    byDay: Record<string, {
        calls: number;
        input: number;
        output: number;
        cacheHit: number;
        cacheMiss: number;
        cost: number;
        reasoning: number;
    }>;
    /** 模型 × 日期 二维统计（趋势图堆叠柱的输入）；旧快照可能缺失，渲染时降级为单色柱。 */
    byDayModels?: Record<string, Record<string, {
        calls: number;
        input: number;
        output: number;
        cacheHit: number;
        cacheMiss: number;
        cost: number;
    }>>;
    /**
     * 峰谷分桶（全量逐调用真实判档）：1.0.8 起服务端按调用时刻精确归桶，
     * 峰谷占比条优先用它（覆盖全部历史调用）；旧快照缺失时回退逐轮估算。
     */
    byTier?: {
        peak: {
            cost: number;
            calls: number;
        };
        offPeak: {
            cost: number;
            calls: number;
        };
    };
    /** 工具调用次数排行（键 = 工具名，按次数倒序）；旧快照缺失。 */
    byTool?: Record<string, number>;
    /** 每轮费用明细（服务端聚合路径恒带）；旧快照可能缺失。 */
    byTurn?: readonly {
        sessionId: string;
        turn: number;
        model: string;
        input: number;
        output: number;
        cacheHit: number;
        cacheMiss: number;
        cost: number;
        startedAt: number;
        endedAt?: number;
    }[];
    /** 工作区聚合（按 cwd 末级目录）；旧快照可能缺失。 */
    byWorkspace?: readonly {
        name: string;
        calls: number;
        cost: number;
        input: number;
        output: number;
        lastActive: number;
    }[];
    /** 中转站归组（key = `site:<origin>` / `direct:<provider>` / `unknown`）；旧快照可能缺失。 */
    bySite?: Record<string, {
        calls: number;
        input: number;
        output: number;
        cacheHit: number;
        cacheMiss: number;
        cost: number;
        reasoning: number;
    }>;
    /** 不可计价模型 id（未收录/无价，费用按 0 计）；旧快照可能缺失。 */
    unpricedModels?: readonly string[];
    /** 按角色费用归因（估算口径：输出实测，输入按消息长度摊分）；旧快照可能缺失。 */
    byRole?: {
        user: number;
        assistant: number;
        tool: number;
    };
    /** 性能指标（TTFT/生成速度/总延迟）按模型与按小时；旧快照可能缺失。 */
    perf?: ClientPerf;
    /** 旧版算法账本行兜底的会话数（模型归属可能失真）；0 或缺省 = 全部数据可信。 */
    staleLedgerSessions?: number;
    /** 插件版本号（服务端读自包 package.json；旧快照缺失）。 */
    pluginVersion?: string;
}
/**
 * 拉取官方余额差对账提示（drift 时非空），供余额面板展示；失败返回 undefined。
 * 复用 {@link fetchBalanceDoc} 的同一响应，导出供对账提示渲染测试单独解析。
 * @returns the reconcile notice, or undefined on any failure / no drift.
 */
export declare function fetchReconcile(): Promise<ReconcileNotice | undefined>;
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