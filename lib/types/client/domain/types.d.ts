/**
 * 客户端共享类型（无运行时副作用）：UsageBilling.tsx 与各 domain/api/ 助手之间
 * 的接口契约。`UsageStats` 是服务端聚合文档，100+ 字段按需扩展；本文件是
 * 唯一权威定义点，不要在别处重复。
 */
import type { CatalogModel } from '../pricing.ts';
import type { ClientPerf } from '../PerfPanel.tsx';
import type { ProviderBalance, SubscriptionQuota } from '../../pricing-shared.ts';
export type { ProviderBalance, RelayQuota, SubscriptionQuota } from '../../pricing-shared.ts';
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
/** Idle health state before the probe settles. */
export declare const IDLE_HEALTH: ModelHealth;
/** 仪表盘分区 Tab id。 */
export type DashboardTab = 'overview' | 'queue' | 'agents' | 'token' | 'trends' | 'providers' | 'pricing' | 'settings';
import type { UsageBillingKey } from '../locales.ts';
/**
 * Tab 定义（顺序即渲染顺序）：概览=主数字/KPI/热力图，队列=低谷任务（新宿主预览），
 * 账单=厂商计费与订阅，用量=Token 用量，趋势=趋势图/每轮费用，费率=模型单价表，
 * 设置=预算与峰谷提醒。导出供测试断言 tab 与文案 key 对齐。
 */
export declare const DASHBOARD_TABS: readonly {
    id: DashboardTab;
    labelKey: UsageBillingKey;
}[];
/** Hero + KPI 统计范围；`all` 用总量，`custom` 用持久化的本地起止日期。 */
export type AvgCostRange = 'today' | '7d' | 'week' | 'month' | 'all' | 'custom';
/** 全局 KPI 按日聚合行的最小字段（byDay 行 = ModelUsage，结构兼容）。 */
export interface KpiDayRow {
    cost: number;
    calls: number;
    input: number;
    output: number;
    cacheHit: number;
    cacheMiss: number;
    cacheWrite?: number;
    reasoning?: number;
}
/** 全局 KPI 聚合结果：KPI 七卡按所选范围重算所需的全部字段。 */
export interface KpiAgg {
    cost: number;
    calls: number;
    input: number;
    output: number;
    cacheHit: number;
    cacheMiss: number;
    cacheWrite: number;
    reasoning: number;
    /** 范围内总处理 Token（缓存读+缓存写+输出）最大的日期戳；窗口无数据时 undefined。 */
    peakDay: string | undefined;
    /** 峰值日的总处理 Token 量；窗口无数据时 0。 */
    peakTokens: number;
}
/** v1.5 Tab 徽章数据信号：空字符串 / 数字 / 状态字。`kind` 决定色调。 */
/** v1.5 Tab 徽章。 */
/** 会话明细行（与服务端 SessionUsageRow 同形；旧快照可能缺失整个 bySession）。 */
export interface SessionBillingRow {
    id: string;
    title?: string;
    cwd?: string;
    /**
     * 直接父会话 id（仅子智能体会话携带）：宿主把子智能体落成独立会话，
     * header 的 origin: subagent + parentSession 指向委派它的对话。
     */
    parentId?: string;
    /** 全部后代子会话费用合计（服务端递归算好）；无后代时缺失。 */
    subCost?: number;
    /** 全部后代子会话调用数；无后代时缺失。 */
    subCalls?: number;
    /** 数据来自旧算法折叠的持久账本行（原始日志已删，无法重算）。 */
    stale?: boolean;
    calls: number;
    cost: number;
    lastActive: number;
    /** 展示层合并标记（issue #42）：同标题会话归并后的段数（>1 时行尾显示 ×N）。 */
    mergedCount?: number;
    /** 合并组的段明细（展示层专用）：一级行默认收起，展开后逐段显示。合并函数需 push，故非 readonly。 */
    children?: SessionBillingRow[];
    /** 挂到本组下的子智能体行（展示层专用）：与段明细并列展开，带子智能体徽标。 */
    subs?: SessionBillingRow[];
}
/** One model row derived from stats + the pricing catalog. */
export interface ModelRow {
    key: string;
    name: string;
    provider: string;
    color: string;
    calls: number;
    input: number;
    output: number;
    cacheHitRate: number;
    estimated: number;
    actual?: number;
    /** Billed through a subscription plan (no per-token cost). */
    plan: boolean;
    /** 真实 model id 不在计费目录（落回「其他」）：费用未估算，标注反馈。 */
    uncatalogued: boolean;
    /** 目录单价为估算价（厂商未公布官方按量价）：标注以免误当正式定价。 */
    estimatedPricing: boolean;
    /** 走官方 DeepSeek 直连的调用数（其余为第三方中转/代理）。 */
    officialCalls: number;
    /** 走官方渠道的费用（CNY）；三方费用 = actual - officialCost。 */
    officialCost: number;
}
/** 组的入口种类：组头徽章用（direct=直连路由、site=中转站点、unknown=未知入口、vendor=纯订阅/余额组）。 */
export type ProviderChannelKind = 'direct' | 'site' | 'unknown' | 'vendor';
/**
 * 按厂商聚合的计费组：模型用量 + 订阅额度 + 厂商余额。
 * 余额与健康点只挂在厂商组头部（同厂商只显示一次），不再随每行重复。
 */
export interface ProviderBillingGroup {
    /**
     * 跨语言/显示名稳定的组标识，用于展开状态持久化（issue #77 审计 S2）：
     * 通道组 `ch:<siteKey>`、纯订阅组 `sub:<vendorId>`、纯余额组 `bal:<providerId>`。
     * name 会随语言切换变化，不能做持久化 key。
     */
    id: string;
    /** 厂商显示名（模型厂商；订阅通道无厂商时用订阅名/自身 id）。 */
    name: string;
    /** 该厂商下的模型用量行（按费用降序，已过滤 calls>0）。 */
    models: readonly ModelRow[];
    /** 归并到该厂商的订阅额度卡片。 */
    subscriptions: readonly SubscriptionQuota[];
    /** 该厂商余额（同厂商只显示一次）。 */
    balance: ProviderBalance | undefined;
    /** 健康点状态：按厂商名与 health 的在线/失效列表匹配。 */
    dot: string | undefined;
    /** 入口种类；纯订阅/余额组无入口为 vendor。 */
    channelKind: ProviderChannelKind;
}
/** 组件注入面：探活 + 计费指标写入（billing 自身写入，主题插件经服务读取）。 */
export interface UsageBillingInjected {
    checkModels: () => Promise<ModelHealth>;
    publishCosts: (costs: {
        todayCost: number;
        monthCost: number;
    }) => void;
    registerOpen: (handler: () => void) => () => void;
    /**
     * 跳转到宿主会话（跨插件导航）：面板点会话行时调用。
     * 返回 'opened' 已跳转 / 'unavailable' 宿主无通道（老到没有）/ 'failed' 通道报错。
     */
    navigateToSession: (sessionId: string) => 'opened' | 'unavailable' | 'failed';
}
/** Usage stats structure from `.dsh-usage-stats.json`. */
export interface UsageStats {
    /** 服务端聚合时间戳（毫秒）；旧快照可能缺失。 */
    updatedAt?: number;
    /**
     * 本次下发的是「上次算好的」文档（聚合超响应预算或失败时的回落）：
     * 内存里最近一次完成的聚合，或落盘快照。面板据此提示数据滞后，
     * 避免把旧值（如重命名前的会话标题）当成最新值读。
     */
    staleSnapshot?: boolean;
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
        /** 联网搜索请求的估算调用数（已按次估值计入 cost）；1.0.9 起新增，旧快照缺失。 */
        searchCalls?: number;
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
    /** 模型 × 日期 × 站点 三维统计（[date][modelKey][siteKey]）：按 origin 绑定自定义价的
     *  显示层重估数据源；旧快照可能缺失。 */
    byDayModelsSite?: Record<string, Record<string, Record<string, {
        calls: number;
        input: number;
        output: number;
        cacheHit: number;
        cacheMiss: number;
        cost: number;
        /** 该格全部调用都走订阅通道（聚合侧按三维格置位）；旧快照缺失，回退全局口径。 */
        plan?: boolean;
    }>>>;
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
    /** 联网搜索请求的单次费用估算（人民币元，配置回显）；0 或缺省 = 未启用估算。 */
    searchCallEstimateCny?: number;
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
    /** 本轮未完整计入的会话数（跨轮次稳定）；0 或缺省 = 全部会话已统计。 */
    unreadableSessions?: number;
    /** 未统计中因会话格式拒读的子集（过新待宿主升级、过旧需迁移）；0 或缺省 = 无格式拒读。 */
    unreadableFormatSessions?: number;
    /** 未统计中无账本存档、完全未计入的子集；0 或缺省 = 拒读会话均有存档兜底。 */
    unreadableNoLedgerSessions?: number;
    /** 插件版本号（服务端读自包 package.json；旧快照缺失）。 */
    pluginVersion?: string;
}
/** Empty snapshot: shown before (or without) real host data — zeros, never fabricated samples. */
export declare const EMPTY_STATS: UsageStats;
//# sourceMappingURL=types.d.ts.map