/**
 * usage-stats 工具开关的共享设置契约（node 与 client 两端共用）。
 *
 * 宿主把已注册的设置命名空间服务给浏览器；node 半区在 apply 阶段读一次该值决定
 * 是否向模型注入 `usage_stats` 工具（工具注入是启动期决策，改开关后重载应用生效），
 * client 半区在「设置」Tab 渲染开关并写入同一命名空间。缺省的默认行为是关闭——
 * 避免该工具默认占用模型每次请求的上下文（coding 场景通常在仪表盘看用量）。
 */
import type { CostCurrency, UserPriceEntry } from './pricing.ts';
/** 设置命名空间 id（小写 kebab-case）。 */
export declare const BILLING_SETTINGS_NAMESPACE = "ui-usage-billing";
/** 该命名空间下用户可编辑的字段名。 */
export declare const ENABLE_USAGE_STATS_TOOL_FIELD = "enableUsageStatsTool";
/** 该命名空间下用户可编辑的子集。 */
export interface UsageBillingSettings {
    /** 是否向模型注入 `usage_stats` 动态工具（默认 false：不注入）。 */
    enableUsageStatsTool: boolean;
}
/** 默认值：工具不注入（贴合 issue 诉求）。 */
export declare const DEFAULT_ENABLE_USAGE_STATS_TOOL = false;
/** 模型用量悬浮窗的展示模式。 */
export type FloatWindowMode = 'combined' | 'subscription';
/**
 * 模型用量悬浮窗（左下角计费卡 hover 浮窗）的展示偏好。
 * 纯 client 偏好，存 localStorage（不依赖 node 半区接口/设置 schema）。
 */
export interface FloatWindowPrefs {
    /** 展示模式：综合（当前样式）/ 指定订阅卡。 */
    mode: FloatWindowMode;
    /** `subscription` 模式下可切换展示的订阅通道 provider id 列表（每次显示一张）。 */
    targets: string[];
}
/** 默认浮窗偏好：综合模式、无指定目标。 */
export declare const DEFAULT_FLOAT_WINDOW_PREFS: FloatWindowPrefs;
/** localStorage key（与 budget store 的 `dsh.ui-usage-billing.*` 命名空间一致）。 */
export declare const FLOAT_WINDOW_STORAGE_KEY = "dsh.ui-usage-billing.float";
/** 读取浮窗偏好（含损坏/缺失回退到默认）。仅在浏览器半区调用。
 *  返回全新对象（含 targets 数组拷贝），避免调用方就地修改污染共享默认值。 */
export declare function loadFloatWindowPrefs(): FloatWindowPrefs;
/** 写入浮窗偏好。失败静默（展示偏好非关键）。 */
export declare function saveFloatWindowPrefs(prefs: FloatWindowPrefs): void;
/** 左下角计费卡的主指标视角。 */
export type BillingCardMetric = 'money' | 'tokens';
/** 计费卡主数字的统计范围（单值卡面，issue #47 反馈）。 */
export type BillingCardSpan = 'day' | 'week' | 'month';
/**
 * 计费卡显示偏好：卡面主数字与迷你柱的计价视角 + 主数字统计范围。
 * 纯 client 偏好，存 localStorage（不依赖 node 半区接口/设置 schema）。
 */
export interface BillingCardPrefs {
    /** 主指标：花费金额（CNY/USD 按币种）/ Token 消耗。 */
    metric: BillingCardMetric;
    /** 主数字统计范围：今日 / 本周 / 本月（默认今日）。 */
    span: BillingCardSpan;
}
/** 默认计费卡偏好：花费金额 + 今日口径。 */
export declare const DEFAULT_BILLING_CARD_PREFS: BillingCardPrefs;
/** localStorage key（与 budget store 的 `dsh.ui-usage-billing.*` 命名空间一致）。 */
export declare const BILLING_CARD_STORAGE_KEY = "dsh.ui-usage-billing.card";
/** 读取计费卡偏好（含损坏/缺失回退到默认）。仅在浏览器半区调用。 */
export declare function loadBillingCardPrefs(): BillingCardPrefs;
/** 写入计费卡偏好。失败静默（展示偏好非关键）。 */
export declare function saveBillingCardPrefs(prefs: BillingCardPrefs): void;
/** 概览 KPI 全局统计范围（今日/近7天/本周/本月/累计），与组件内 AvgCostRange 同构。 */
export type KpiRangePref = 'today' | '7d' | 'week' | 'month' | 'all';
/** localStorage key（与其他 `dsh.ui-usage-billing.*` 偏好同命名空间）。 */
export declare const KPI_RANGE_STORAGE_KEY = "dsh.ui-usage-billing.kpi-range";
/** 读取 KPI 全局范围偏好（损坏/越界回退「累计」）。仅在浏览器半区调用。 */
export declare function loadKpiRange(): KpiRangePref;
/** 写入 KPI 全局范围偏好。失败静默（展示偏好非关键）。 */
export declare function saveKpiRange(range: KpiRangePref): void;
/**
 * 中转站列表（中转站分布 / 中转站额度）的展示偏好（issue #17）。
 * 纯 client 偏好，存 localStorage（不依赖 node 半区接口/设置 schema）。
 */
export interface SiteListPrefs {
    /** 隐藏「未知路由」（bySite 的 unknown 桶）与「未识别」类型的中转站占位条目；默认隐藏。 */
    hideUnidentified: boolean;
}
/** 默认站点列表偏好：隐藏无参考价值的占位条目，净化账单列表。 */
export declare const DEFAULT_SITE_LIST_PREFS: SiteListPrefs;
/** localStorage key（与其他 `dsh.ui-usage-billing.*` 偏好同命名空间）。 */
export declare const SITE_LIST_STORAGE_KEY = "dsh.ui-usage-billing.sites";
/** 读取站点列表偏好（含损坏/缺失回退到默认）。仅在浏览器半区调用。 */
export declare function loadSiteListPrefs(): SiteListPrefs;
/** 写入站点列表偏好。失败静默（展示偏好非关键）。 */
export declare function saveSiteListPrefs(prefs: SiteListPrefs): void;
/**
 * 即时代费条（平价消耗胶囊，composer dock 的 LiveCostBar）的显示偏好。
 * 纯 client 偏好，存 localStorage（不依赖 node 半区接口/设置 schema）；
 * 设置 Tab 与 LiveCostBar 分属两个 React 树，跨树同步走 localStorage +
 * `LIVE_COST_BAR_PREF_EVENT` CustomEvent（同文档即时生效，跨标签页靠 storage 事件）。
 */
export interface LiveCostBarPrefs {
    /** 是否显示输入框下方的即时代费条胶囊（默认 true：保持历史行为）。 */
    show: boolean;
    /** 胶囊位置：toolbar = 输入框内部工具行内联 chip（默认，issue #47）；below = 输入框下方；above = 输入框上方。 */
    position: 'below' | 'above' | 'toolbar';
}
/** 默认即时代费条偏好：显示在输入框内部（工具行内联 chip，issue #47 反馈「上方/下方」都打断输入视线）。 */
export declare const DEFAULT_LIVE_COST_BAR_PREFS: LiveCostBarPrefs;
/** localStorage key（与其他 `dsh.ui-usage-billing.*` 偏好同命名空间）。 */
export declare const LIVE_COST_BAR_STORAGE_KEY = "dsh.ui-usage-billing.livecost";
/** 设置 Tab 切换后派发的 CustomEvent 名（LiveCostBar 监听它即时显隐）。 */
export declare const LIVE_COST_BAR_PREF_EVENT = "dsh.ui-usage-billing.livecost-pref";
/** 读取即时代费条偏好（含损坏/缺失回退到默认）。仅在浏览器半区调用。 */
export declare function loadLiveCostBarPrefs(): LiveCostBarPrefs;
/** 写入即时代费条偏好。失败静默（展示偏好非关键）。 */
export declare function saveLiveCostBarPrefs(prefs: LiveCostBarPrefs): void;
/**
 * 显示币种（¥ / ≈$）。纯 client 偏好，存 localStorage；仪表盘、侧边栏卡片与
 * 输入框胶囊分属不同 React 树，跨树同步走 localStorage + `CURRENCY_PREF_EVENT`
 * CustomEvent（同文档即时生效，跨标签页靠 storage 事件）——与即时代费条偏好同一套做法。
 */
export declare const CURRENCY_STORAGE_KEY = "dsh.ui-usage-billing.currency";
/** 币种切换后派发的 CustomEvent 名（另一棵树监听它即时重读）。 */
export declare const CURRENCY_PREF_EVENT = "dsh.ui-usage-billing.currency-pref";
/** 默认币种：人民币（保持历史行为）。 */
export declare const DEFAULT_CURRENCY: CostCurrency;
/** 读取显示币种（损坏/缺失/非法值一律回退默认）。仅在浏览器半区调用。 */
export declare function loadCurrency(): CostCurrency;
/** 写入显示币种。失败静默（展示偏好非关键）。 */
export declare function saveCurrency(currency: CostCurrency): void;
/**
 * 被固定的模型（峰谷指示点）：费率表里点击圆点固定，固定后在输入框旁常驻显示。
 * 与币种偏好同一套做法：localStorage + CustomEvent，因为胶囊与弹窗分属两棵 React 树。
 */
export declare const PINNED_MODELS_STORAGE_KEY = "dsh.ui-usage-billing.pinned";
/** 固定列表变更后派发的 CustomEvent 名。 */
export declare const PINNED_MODELS_EVENT = "dsh.ui-usage-billing.pinned-pref";
/** 读取固定模型列表（损坏/非数组/非字符串项一律丢弃）。 */
export declare function loadPinnedModels(): string[];
/** 写入固定模型列表。失败静默（展示偏好非关键）。 */
export declare function savePinnedModels(keys: readonly string[]): void;
/** 界面语言（与币种解耦后独立持久化）。 */
export type BillingLanguage = 'zh' | 'en';
/** localStorage key（与其他 `dsh.ui-usage-billing.*` 偏好同命名空间）。 */
export declare const LANGUAGE_STORAGE_KEY = "dsh.ui-usage-billing.language";
/** 语言切换后派发的 CustomEvent 名（另一棵树监听它即时重读）。 */
export declare const LANGUAGE_PREF_EVENT = "dsh.ui-usage-billing.language-pref";
/**
 * 读取界面语言。**迁移关键**：历史版本的语言是从币种推导的（选 $ 就是英文），
 * 因此当尚无语言偏好时，**从已存的币种播种一次**并写回；升级后没有任何人
 * 的界面语言会静默改变，且播种只发生一次。
 * @returns 界面语言。
 */
export declare function loadLanguage(): BillingLanguage;
/** 写入界面语言。失败静默（展示偏好非关键）。 */
export declare function saveLanguage(language: BillingLanguage): void;
/**
 * 切换某个模型的固定状态。
 * @param key - 目录键。
 * @returns 切换后的列表（已写入）。
 */
export declare function togglePinnedModel(key: string): string[];
/** 用户自定义单价（与 client/pricing.ts 的 `UserPriceEntry` 同形；type import，无运行时依赖）。 */
export type StoredUserPrice = UserPriceEntry;
/** 自定义价表：模型（+可选来源）→ 单价，条目列表（支持同名模型绑定不同中转站 origin）。 */
export type UserPriceMap = UserPriceEntry[];
/** localStorage key（与其他 `dsh.ui-usage-billing.*` 偏好同命名空间）。 */
export declare const USER_PRICES_STORAGE_KEY = "dsh.ui-usage-billing.prices";
/**
 * 读取用户自定义价（写入侧已校验，这里挡住手工改坏的非数字行 与 旧版单行对象格式）。
 * 旧版（1.0.9 及更早）存的是 `Record<目录键, {input,cacheHit,output,currency?}>`，
 * 迁移为「条目列表」（origin 缺省 = 该模型默认价）。仅在浏览器半区调用。
 */
export declare function loadUserPrices(): UserPriceMap;
/** 写入用户自定义价。失败静默（展示偏好非关键）。 */
export declare function saveUserPrices(prices: UserPriceMap): void;
/** 性能曲线的指标视角。 */
export type PerfMetric = 'ttft' | 'tps';
/**
 * 性能面板的视图偏好：当前指标 tab 与点亮的模型曲线集合。
 * 纯 client 偏好，存 localStorage（不依赖 node 半区接口/设置 schema）。
 */
export interface PerfViewPrefs {
    /** 当前指标：首字延时（ms）/ 生成速度（tok/s）。 */
    metric: PerfMetric;
    /** 点亮的模型键列表；缺省 = 按样本数前 5（用户未碰过图例时跟随默认）。 */
    models?: string[];
}
/** 默认性能视图偏好：首字延时 tab；模型集合跟随默认（前 5）。 */
export declare const DEFAULT_PERF_VIEW_PREFS: PerfViewPrefs;
/** localStorage key（与其他 `dsh.ui-usage-billing.*` 偏好同命名空间）。 */
export declare const PERF_VIEW_STORAGE_KEY = "dsh.ui-usage-billing.perf";
/** 读取性能视图偏好（含损坏/缺失回退到默认）。仅在浏览器半区调用。 */
export declare function loadPerfViewPrefs(): PerfViewPrefs;
/** 写入性能视图偏好。失败静默（展示偏好非关键）。 */
export declare function savePerfViewPrefs(prefs: PerfViewPrefs): void;
//# sourceMappingURL=usage-billing-settings.d.ts.map