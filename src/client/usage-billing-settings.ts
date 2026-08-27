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

/** 模型用量悬浮窗的展示模式。 */
export type FloatWindowMode = 'combined' | 'subscription'

/**
 * 模型用量悬浮窗（左下角计费卡 hover 浮窗）的展示偏好。
 * 纯 client 偏好，存 localStorage（不依赖 node 半区接口/设置 schema）。
 */
export interface FloatWindowPrefs {
  /** 展示模式：综合（当前样式）/ 指定订阅卡。 */
  mode: FloatWindowMode
  /** `subscription` 模式下可切换展示的订阅通道 provider id 列表（每次显示一张）。 */
  targets: string[]
}

/** 默认浮窗偏好：综合模式、无指定目标（向后兼容现有综合速览卡）。 */
export const DEFAULT_FLOAT_WINDOW_PREFS: FloatWindowPrefs = { mode: 'combined', targets: [] }

/** localStorage key（与 budget store 的 `dsh.ui-usage-billing.*` 命名空间一致）。 */
export const FLOAT_WINDOW_STORAGE_KEY = 'dsh.ui-usage-billing.float'

/** 读取浮窗偏好（含损坏/缺失回退到默认）。仅在浏览器半区调用。
 *  返回全新对象（含 targets 数组拷贝），避免调用方就地修改污染共享默认值。 */
export function loadFloatWindowPrefs(): FloatWindowPrefs {
  try {
    const raw = localStorage.getItem(FLOAT_WINDOW_STORAGE_KEY)
    if (raw === null) return { ...DEFAULT_FLOAT_WINDOW_PREFS, targets: [...DEFAULT_FLOAT_WINDOW_PREFS.targets] }
    const parsed = JSON.parse(raw) as Partial<FloatWindowPrefs>
    return {
      mode: parsed.mode === 'subscription' ? 'subscription' : 'combined',
      targets: Array.isArray(parsed.targets)
        ? parsed.targets.filter((entry): entry is string => typeof entry === 'string')
        : [],
    }
  } catch {
    return { ...DEFAULT_FLOAT_WINDOW_PREFS, targets: [...DEFAULT_FLOAT_WINDOW_PREFS.targets] }
  }
}

/** 写入浮窗偏好。失败静默（展示偏好非关键）。 */
export function saveFloatWindowPrefs(prefs: FloatWindowPrefs): void {
  try {
    localStorage.setItem(FLOAT_WINDOW_STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // ignore: storage full / unavailable — display preference is non-critical.
  }
}

/** 左下角计费卡的主指标视角。 */
export type BillingCardMetric = 'money' | 'tokens'

/**
 * 计费卡显示偏好：卡面主行/副行与迷你柱的计价视角。
 * 纯 client 偏好，存 localStorage（不依赖 node 半区接口/设置 schema）。
 */
export interface BillingCardPrefs {
  /** 主指标：花费金额（CNY/USD 按币种）/ Token 消耗。 */
  metric: BillingCardMetric
}

/** 默认计费卡偏好：花费金额（向后兼容现有金额视图）。 */
export const DEFAULT_BILLING_CARD_PREFS: BillingCardPrefs = { metric: 'money' }

/** localStorage key（与 budget store 的 `dsh.ui-usage-billing.*` 命名空间一致）。 */
export const BILLING_CARD_STORAGE_KEY = 'dsh.ui-usage-billing.card'

/** 读取计费卡偏好（含损坏/缺失回退到默认）。仅在浏览器半区调用。 */
export function loadBillingCardPrefs(): BillingCardPrefs {
  try {
    const raw = localStorage.getItem(BILLING_CARD_STORAGE_KEY)
    if (raw === null) return { ...DEFAULT_BILLING_CARD_PREFS }
    const parsed = JSON.parse(raw) as Partial<BillingCardPrefs>
    return { metric: parsed.metric === 'tokens' ? 'tokens' : 'money' }
  } catch {
    return { ...DEFAULT_BILLING_CARD_PREFS }
  }
}

/** 写入计费卡偏好。失败静默（展示偏好非关键）。 */
export function saveBillingCardPrefs(prefs: BillingCardPrefs): void {
  try {
    localStorage.setItem(BILLING_CARD_STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // ignore: storage full / unavailable — display preference is non-critical.
  }
}
