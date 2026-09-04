/**
 * usage-stats 工具开关的共享设置契约（node 与 client 两端共用）。
 *
 * 宿主把已注册的设置命名空间服务给浏览器；node 半区在 apply 阶段读一次该值决定
 * 是否向模型注入 `usage_stats` 工具（工具注入是启动期决策，改开关后重载应用生效），
 * client 半区在「设置」Tab 渲染开关并写入同一命名空间。缺省的默认行为是关闭——
 * 避免该工具默认占用模型每次请求的上下文（coding 场景通常在仪表盘看用量）。
 */

// type-only import：`UserPriceEntry` 是结构契约，运行时无依赖、不引入 node 侧耦合。
import type { UserPriceEntry } from './pricing.ts'

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

/**
 * 中转站列表（中转站分布 / 中转站额度）的展示偏好（issue #17）。
 * 纯 client 偏好，存 localStorage（不依赖 node 半区接口/设置 schema）。
 */
export interface SiteListPrefs {
  /** 隐藏「未知路由」（bySite 的 unknown 桶）与「未识别」类型的中转站占位条目；默认隐藏。 */
  hideUnidentified: boolean
}

/** 默认站点列表偏好：隐藏无参考价值的占位条目，净化账单列表。 */
export const DEFAULT_SITE_LIST_PREFS: SiteListPrefs = { hideUnidentified: true }

/** localStorage key（与其他 `dsh.ui-usage-billing.*` 偏好同命名空间）。 */
export const SITE_LIST_STORAGE_KEY = 'dsh.ui-usage-billing.sites'

/** 读取站点列表偏好（含损坏/缺失回退到默认）。仅在浏览器半区调用。 */
export function loadSiteListPrefs(): SiteListPrefs {
  try {
    const raw = localStorage.getItem(SITE_LIST_STORAGE_KEY)
    if (raw === null) return { ...DEFAULT_SITE_LIST_PREFS }
    const parsed = JSON.parse(raw) as Partial<SiteListPrefs>
    return { hideUnidentified: parsed.hideUnidentified !== false }
  } catch {
    return { ...DEFAULT_SITE_LIST_PREFS }
  }
}

/** 写入站点列表偏好。失败静默（展示偏好非关键）。 */
export function saveSiteListPrefs(prefs: SiteListPrefs): void {
  try {
    localStorage.setItem(SITE_LIST_STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // ignore: storage full / unavailable — display preference is non-critical.
  }
}

/**
 * 即时代费条（平价消耗胶囊，composer dock 的 LiveCostBar）的显示偏好。
 * 纯 client 偏好，存 localStorage（不依赖 node 半区接口/设置 schema）；
 * 设置 Tab 与 LiveCostBar 分属两个 React 树，跨树同步走 localStorage +
 * `LIVE_COST_BAR_PREF_EVENT` CustomEvent（同文档即时生效，跨标签页靠 storage 事件）。
 */
export interface LiveCostBarPrefs {
  /** 是否显示输入框下方的即时代费条胶囊（默认 true：保持历史行为）。 */
  show: boolean
  /** 胶囊位置：below = 输入框下方（默认，历史行为）；above = 输入框上方。 */
  position: 'below' | 'above'
}

/** 默认即时代费条偏好：显示在输入框下方（升级用户零感知）。 */
export const DEFAULT_LIVE_COST_BAR_PREFS: LiveCostBarPrefs = { show: true, position: 'below' }

/** localStorage key（与其他 `dsh.ui-usage-billing.*` 偏好同命名空间）。 */
export const LIVE_COST_BAR_STORAGE_KEY = 'dsh.ui-usage-billing.livecost'

/** 设置 Tab 切换后派发的 CustomEvent 名（LiveCostBar 监听它即时显隐）。 */
export const LIVE_COST_BAR_PREF_EVENT = 'dsh.ui-usage-billing.livecost-pref'

/** 读取即时代费条偏好（含损坏/缺失回退到默认）。仅在浏览器半区调用。 */
export function loadLiveCostBarPrefs(): LiveCostBarPrefs {
  try {
    const raw = localStorage.getItem(LIVE_COST_BAR_STORAGE_KEY)
    if (raw === null) return { ...DEFAULT_LIVE_COST_BAR_PREFS }
    const parsed = JSON.parse(raw) as Partial<LiveCostBarPrefs>
    // 只有显式 false 才隐藏，其余（缺字段/非法值）一律按显示兜底；
    // position 非法值同样回退 below。
    return {
      show: parsed.show !== false,
      position: parsed.position === 'above' ? 'above' : 'below',
    }
  } catch {
    return { ...DEFAULT_LIVE_COST_BAR_PREFS }
  }
}

/** 写入即时代费条偏好。失败静默（展示偏好非关键）。 */
export function saveLiveCostBarPrefs(prefs: LiveCostBarPrefs): void {
  try {
    localStorage.setItem(LIVE_COST_BAR_STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // ignore: storage full / unavailable — display preference is non-critical.
  }
}

/** 用户自定义单价（与 client/pricing.ts 的 `UserPriceEntry` 同形；type import，无运行时依赖）。 */
export type StoredUserPrice = UserPriceEntry

/** 自定义价表：模型（+可选来源）→ 单价，条目列表（支持同名模型绑定不同中转站 origin）。 */
export type UserPriceMap = UserPriceEntry[]

/** localStorage key（与其他 `dsh.ui-usage-billing.*` 偏好同命名空间）。 */
export const USER_PRICES_STORAGE_KEY = 'dsh.ui-usage-billing.prices'

/**
 * 读取用户自定义价（写入侧已校验，这里挡住手工改坏的非数字行 与 旧版单行对象格式）。
 * 旧版（1.0.9 及更早）存的是 `Record<目录键, {input,cacheHit,output,currency?}>`，
 * 迁移为「条目列表」（origin 缺省 = 该模型默认价）。仅在浏览器半区调用。
 */
export function loadUserPrices(): UserPriceMap {
  try {
    const raw = localStorage.getItem(USER_PRICES_STORAGE_KEY)
    if (raw === null) return []
    const parsed = JSON.parse(raw) as unknown
    if (parsed === null) return []
    const out: UserPriceMap = []
    const push = (key: string, value: unknown): void => {
      if (value === null || typeof value !== 'object') return
      const row = value as Record<string, unknown>
      const input = Number(row.input)
      const cacheHit = Number(row.cacheHit)
      const output = Number(row.output)
      if (![input, cacheHit, output].every(v => Number.isFinite(v) && v >= 0)) return
      // 低谷档三桶（可选）：全部有效才保留，任一缺失/非法回落平档。
      const off = row.offPeak
      let offPeak: { input: number; cacheHit: number; output: number } | undefined
      if (off !== null && typeof off === 'object') {
        const offRow = off as Record<string, unknown>
        const offInput = Number(offRow.input)
        const offCacheHit = Number(offRow.cacheHit)
        const offOutput = Number(offRow.output)
        if ([offInput, offCacheHit, offOutput].every(v => Number.isFinite(v) && v >= 0)) {
          offPeak = { input: offInput, cacheHit: offCacheHit, output: offOutput }
        }
      }
      out.push({
        key,
        ...(typeof row.origin === 'string' && row.origin !== '' ? { origin: row.origin } : {}),
        input,
        cacheHit,
        output,
        ...(offPeak !== undefined ? { offPeak } : {}),
        ...(row.currency === 'USD' ? { currency: 'USD' as const } : {}),
      })
    }
    if (Array.isArray(parsed)) {
      for (const entry of parsed) {
        if (entry === null || typeof entry !== 'object') continue
        const row = entry as Record<string, unknown>
        if (typeof row.key !== 'string' || row.key === '') continue
        push(row.key, entry)
      }
    } else if (typeof parsed === 'object') {
      // 旧版单行对象：`{ [目录键]: 价 }` → 转条目列表（origin 缺省）。
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        push(key, value)
      }
    }
    return out
  } catch {
    return []
  }
}

/** 写入用户自定义价。失败静默（展示偏好非关键）。 */
export function saveUserPrices(prices: UserPriceMap): void {
  try {
    localStorage.setItem(USER_PRICES_STORAGE_KEY, JSON.stringify(prices))
  } catch {
    // ignore: storage full / unavailable — display preference is non-critical.
  }
}

/** 性能曲线的指标视角。 */
export type PerfMetric = 'ttft' | 'tps'

/**
 * 性能面板的视图偏好：当前指标 tab 与点亮的模型曲线集合。
 * 纯 client 偏好，存 localStorage（不依赖 node 半区接口/设置 schema）。
 */
export interface PerfViewPrefs {
  /** 当前指标：首字延时（ms）/ 生成速度（tok/s）。 */
  metric: PerfMetric
  /** 点亮的模型键列表；缺省 = 按样本数前 5（用户未碰过图例时跟随默认）。 */
  models?: string[]
}

/** 默认性能视图偏好：首字延时 tab；模型集合跟随默认（前 5）。 */
export const DEFAULT_PERF_VIEW_PREFS: PerfViewPrefs = { metric: 'ttft' }

/** localStorage key（与其他 `dsh.ui-usage-billing.*` 偏好同命名空间）。 */
export const PERF_VIEW_STORAGE_KEY = 'dsh.ui-usage-billing.perf'

/** 读取性能视图偏好（含损坏/缺失回退到默认）。仅在浏览器半区调用。 */
export function loadPerfViewPrefs(): PerfViewPrefs {
  try {
    const raw = localStorage.getItem(PERF_VIEW_STORAGE_KEY)
    if (raw === null) return { ...DEFAULT_PERF_VIEW_PREFS }
    const parsed = JSON.parse(raw) as Partial<PerfViewPrefs>
    return {
      metric: parsed.metric === 'tps' ? 'tps' : 'ttft',
      // models 缺省 = 从未碰过图例（跟随默认前 5）；空数组 = 用户显式全关，需保留。
      ...(Array.isArray(parsed.models) ? { models: parsed.models.filter(entry => typeof entry === 'string') } : {}),
    }
  } catch {
    return { ...DEFAULT_PERF_VIEW_PREFS }
  }
}

/** 写入性能视图偏好。失败静默（展示偏好非关键）。 */
export function savePerfViewPrefs(prefs: PerfViewPrefs): void {
  try {
    localStorage.setItem(PERF_VIEW_STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // ignore: storage full / unavailable — display preference is non-critical.
  }
}
