/**
 * usage-stats 工具开关的共享设置契约（node 与 client 两端共用）。
 *
 * 宿主把已注册的设置命名空间服务给浏览器；node 半区在 apply 阶段读一次该值决定
 * 是否向模型注入 `usage_stats` 工具（工具注入是启动期决策，改开关后重载应用生效），
 * client 半区在「设置」Tab 渲染开关并写入同一命名空间。缺省的默认行为是关闭——
 * 避免该工具默认占用模型每次请求的上下文（coding 场景通常在仪表盘看用量）。
 */
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
/** 默认浮窗偏好：综合模式、无指定目标（向后兼容现有综合速览卡）。 */
export declare const DEFAULT_FLOAT_WINDOW_PREFS: FloatWindowPrefs;
/** localStorage key（与 budget store 的 `dsh.ui-usage-billing.*` 命名空间一致）。 */
export declare const FLOAT_WINDOW_STORAGE_KEY = "dsh.ui-usage-billing.float";
/** 读取浮窗偏好（含损坏/缺失回退到默认）。仅在浏览器半区调用。 */
export declare function loadFloatWindowPrefs(): FloatWindowPrefs;
/** 写入浮窗偏好。失败静默（展示偏好非关键）。 */
export declare function saveFloatWindowPrefs(prefs: FloatWindowPrefs): void;
//# sourceMappingURL=usage-billing-settings.d.ts.map