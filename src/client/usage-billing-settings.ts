/**
 * usage-stats 工具开关的共享设置契约（node 与 client 两端共用）。
 *
 * 宿主把已注册的设置命名空间服务给浏览器；node 半区在 apply 阶段读一次该值决定
 * 是否向模型注入 `usage_stats` 工具（工具注入是启动期决策，改开关后重载应用生效），
 * client 半区在「设置」Tab 渲染开关并写入同一命名空间。缺省的默认行为是关闭——
 * 避免该工具默认占用模型每次请求的上下文（coding 场景通常在仪表盘看用量）。
 */

/** 设置命名空间 id（小写 kebab-case）。 */
export const BILLING_SETTINGS_NAMESPACE = 'ui-usage-billing'

/** 该命名空间下用户可编辑的字段名。 */
export const ENABLE_USAGE_STATS_TOOL_FIELD = 'enableUsageStatsTool'

/** 该命名空间下用户可编辑的子集。 */
export interface UsageBillingSettings {
  /** 是否向模型注入 `usage_stats` 动态工具（默认 false：不注入）。 */
  enableUsageStatsTool: boolean
}

/** 默认值：工具不注入（贴合 issue 诉求）。 */
export const DEFAULT_ENABLE_USAGE_STATS_TOOL = false
