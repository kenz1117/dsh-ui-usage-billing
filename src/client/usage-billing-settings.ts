/**
 * usage-stats 工具开关的共享设置契约（node 与 client 两端共用）。
 *
 * 旧宿主（≤0.1.6）把该开关存设置命名空间；宿主 0.1.7+ 起注册面移除，改存插件
 * 条目 config 的 volatile 字段（Config schema 投影），写回经 settings.update，
 * 提交后引用原位更新、`usage_stats` 工具即时注册/注销（无需重载应用）。
 * client 半区在「设置」Tab 渲染开关并经 /api/billing/usage-tool 写入，node 半区
 * 按宿主世代选择通道。缺省的默认行为是关闭——避免该工具默认占用模型每次请求
 * 的上下文（coding 场景通常在仪表盘看用量）。
 */

// type-only import：`UserPriceEntry` 是结构契约，运行时无依赖、不引入 node 侧耦合。
import type { CostCurrency, UserPriceEntry } from './pricing.ts'

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

/**
 * localStorage 读写的统一出口（各偏好对的脚手架此前逐对重复）：
 * 失败一律静默——这些都是展示偏好，storage 满/私聊禁用不该拖垮面板。
 */

/** 写入一个字符串值。失败静默。 */
function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore: storage full / unavailable — display preference is non-critical.
  }
}

/** 读原始字符串；缺失/不可用返回 undefined。 */
function readRaw(key: string): string | undefined {
  try {
    return localStorage.getItem(key) ?? undefined
  } catch {
    return undefined
  }
}

/** 读并 JSON 解析；缺失/损坏返回 undefined（各 loader 的默认值/校验在调用方）。 */
function readJson(key: string): unknown {
  const raw = readRaw(key)
  if (raw === undefined) return undefined
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return undefined
  }
}

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

/** 默认浮窗偏好：综合模式、无指定目标。 */
export const DEFAULT_FLOAT_WINDOW_PREFS: FloatWindowPrefs = { mode: 'combined', targets: [] }

/** localStorage key（与 budget store 的 `dsh.ui-usage-billing.*` 命名空间一致）。 */
export const FLOAT_WINDOW_STORAGE_KEY = 'dsh.ui-usage-billing.float'

/** 读取浮窗偏好（含损坏/缺失回退到默认）。仅在浏览器半区调用。
 *  返回全新对象（含 targets 数组拷贝），避免调用方就地修改污染共享默认值。 */
export function loadFloatWindowPrefs(): FloatWindowPrefs {
  const fallback = (): FloatWindowPrefs => ({ ...DEFAULT_FLOAT_WINDOW_PREFS, targets: [...DEFAULT_FLOAT_WINDOW_PREFS.targets] })
  const parsed = readJson(FLOAT_WINDOW_STORAGE_KEY)
  if (parsed === null || typeof parsed !== 'object') return fallback()
  const prefs = parsed as Partial<FloatWindowPrefs>
  return {
    mode: prefs.mode === 'subscription' ? 'subscription' : 'combined',
    targets: Array.isArray(prefs.targets)
      ? prefs.targets.filter((entry): entry is string => typeof entry === 'string')
      : [],
  }
}

/** 写入浮窗偏好。失败静默（展示偏好非关键）。 */
export function saveFloatWindowPrefs(prefs: FloatWindowPrefs): void {
  writeStored(FLOAT_WINDOW_STORAGE_KEY, JSON.stringify(prefs))
}

/** 左下角计费卡的主指标视角。 */
export type BillingCardMetric = 'money' | 'tokens'

/** 计费卡主数字的统计范围（单值卡面，issue #47 反馈）。 */
export type BillingCardSpan = 'day' | 'week' | 'month'

/**
 * 计费卡显示偏好：卡面主数字与迷你柱的计价视角 + 主数字统计范围。
 * 纯 client 偏好，存 localStorage（不依赖 node 半区接口/设置 schema）。
 */
export interface BillingCardPrefs {
  /** 主指标：花费金额（CNY/USD 按币种）/ Token 消耗。 */
  metric: BillingCardMetric
  /** 主数字统计范围：今日 / 本周 / 本月（默认今日）。 */
  span: BillingCardSpan
}

/** 默认计费卡偏好：花费金额 + 今日口径。 */
export const DEFAULT_BILLING_CARD_PREFS: BillingCardPrefs = { metric: 'money', span: 'day' }

/** localStorage key（与 budget store 的 `dsh.ui-usage-billing.*` 命名空间一致）。 */
export const BILLING_CARD_STORAGE_KEY = 'dsh.ui-usage-billing.card'

/** 读取计费卡偏好（含损坏/缺失回退到默认）。仅在浏览器半区调用。 */
export function loadBillingCardPrefs(): BillingCardPrefs {
  const parsed = readJson(BILLING_CARD_STORAGE_KEY)
  if (parsed === null || typeof parsed !== 'object') return { ...DEFAULT_BILLING_CARD_PREFS }
  const prefs = parsed as Partial<BillingCardPrefs>
  return {
    metric: prefs.metric === 'tokens' ? 'tokens' : 'money',
    span: prefs.span === 'week' || prefs.span === 'month' ? prefs.span : 'day',
  }
}

/** 写入计费卡偏好。失败静默（展示偏好非关键）。 */
export function saveBillingCardPrefs(prefs: BillingCardPrefs): void {
  writeStored(BILLING_CARD_STORAGE_KEY, JSON.stringify(prefs))
}

/** 概览 KPI 全局统计范围（今日/近7天/本周/本月/累计），与组件内 AvgCostRange 同构。 */
export type KpiRangePref = 'today' | '7d' | 'week' | 'month' | 'all'

/** localStorage key（与其他 `dsh.ui-usage-billing.*` 偏好同命名空间）。 */
export const KPI_RANGE_STORAGE_KEY = 'dsh.ui-usage-billing.kpi-range'

/** 读取 KPI 全局范围偏好（损坏/越界回退「累计」）。仅在浏览器半区调用。 */
export function loadKpiRange(): KpiRangePref {
  const raw = readRaw(KPI_RANGE_STORAGE_KEY)
  return raw === 'today' || raw === '7d' || raw === 'week' || raw === 'month' || raw === 'all' ? raw : 'all'
}

/** 写入 KPI 全局范围偏好。失败静默（展示偏好非关键）。 */
export function saveKpiRange(range: KpiRangePref): void {
  writeStored(KPI_RANGE_STORAGE_KEY, range)
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
  const parsed = readJson(SITE_LIST_STORAGE_KEY)
  if (parsed === null || typeof parsed !== 'object') return { ...DEFAULT_SITE_LIST_PREFS }
  return { hideUnidentified: (parsed as Partial<SiteListPrefs>).hideUnidentified !== false }
}

/** 写入站点列表偏好。失败静默（展示偏好非关键）。 */
export function saveSiteListPrefs(prefs: SiteListPrefs): void {
  writeStored(SITE_LIST_STORAGE_KEY, JSON.stringify(prefs))
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
  /** 胶囊位置：toolbar = 输入框内部工具行内联 chip（默认，issue #47）；below = 输入框下方；above = 输入框上方。 */
  position: 'below' | 'above' | 'toolbar'
}

/** 默认即时代费条偏好：显示在输入框内部（工具行内联 chip，issue #47 反馈「上方/下方」都打断输入视线）。 */
export const DEFAULT_LIVE_COST_BAR_PREFS: LiveCostBarPrefs = { show: true, position: 'toolbar' }

/** localStorage key（与其他 `dsh.ui-usage-billing.*` 偏好同命名空间）。 */
export const LIVE_COST_BAR_STORAGE_KEY = 'dsh.ui-usage-billing.livecost'

/** 设置 Tab 切换后派发的 CustomEvent 名（LiveCostBar 监听它即时显隐）。 */
export const LIVE_COST_BAR_PREF_EVENT = 'dsh.ui-usage-billing.livecost-pref'

/** 读取即时代费条偏好（含损坏/缺失回退到默认）。仅在浏览器半区调用。 */
export function loadLiveCostBarPrefs(): LiveCostBarPrefs {
  const parsed = readJson(LIVE_COST_BAR_STORAGE_KEY)
  if (parsed === null || typeof parsed !== 'object') return { ...DEFAULT_LIVE_COST_BAR_PREFS }
  const prefs = parsed as Partial<LiveCostBarPrefs>
  // 只有显式 false 才隐藏，其余（缺字段/非法值）一律按显示兜底；
  // position 仅认显式合法值，缺字段/非法值回默认（issue #47 起默认 toolbar，
  // 老用户已存的 below/above 不受影响）。
  return {
    show: prefs.show !== false,
    position: prefs.position === 'above' || prefs.position === 'toolbar' || prefs.position === 'below'
      ? prefs.position
      : DEFAULT_LIVE_COST_BAR_PREFS.position,
  }
}

/** 写入即时代费条偏好。失败静默（展示偏好非关键）。 */
export function saveLiveCostBarPrefs(prefs: LiveCostBarPrefs): void {
  writeStored(LIVE_COST_BAR_STORAGE_KEY, JSON.stringify(prefs))
}

/**
 * 显示币种（¥ / ≈$）。纯 client 偏好，存 localStorage；仪表盘、侧边栏卡片与
 * 输入框胶囊分属不同 React 树，跨树同步走 localStorage + `CURRENCY_PREF_EVENT`
 * CustomEvent（同文档即时生效，跨标签页靠 storage 事件）——与即时代费条偏好同一套做法。
 */
export const CURRENCY_STORAGE_KEY = 'dsh.ui-usage-billing.currency'

/** 币种切换后派发的 CustomEvent 名（另一棵树监听它即时重读）。 */
export const CURRENCY_PREF_EVENT = 'dsh.ui-usage-billing.currency-pref'

/** 默认币种：人民币（保持历史行为）。 */
export const DEFAULT_CURRENCY: CostCurrency = 'cny'

/** 读取显示币种（损坏/缺失/非法值一律回退默认）。仅在浏览器半区调用。 */
export function loadCurrency(): CostCurrency {
  const raw = readRaw(CURRENCY_STORAGE_KEY)
  return raw === 'usd' || raw === 'cny' || raw === 'eur' ? raw : DEFAULT_CURRENCY
}

/** 写入显示币种。失败静默（展示偏好非关键）。 */
export function saveCurrency(currency: CostCurrency): void {
  writeStored(CURRENCY_STORAGE_KEY, currency)
}

/**
 * 被固定的模型（峰谷指示点）：费率表里点击圆点固定，固定后在输入框旁常驻显示。
 * 与币种偏好同一套做法：localStorage + CustomEvent，因为胶囊与弹窗分属两棵 React 树。
 */
export const PINNED_MODELS_STORAGE_KEY = 'dsh.ui-usage-billing.pinned'

/** 固定列表变更后派发的 CustomEvent 名。 */
export const PINNED_MODELS_EVENT = 'dsh.ui-usage-billing.pinned-pref'

/** 读取固定模型列表（损坏/非数组/非字符串项一律丢弃）。 */
export function loadPinnedModels(): string[] {
  const raw = readJson(PINNED_MODELS_STORAGE_KEY)
  return Array.isArray(raw) ? raw.filter((k): k is string => typeof k === 'string' && k !== '') : []
}

/** 写入固定模型列表。失败静默（展示偏好非关键）。 */
export function savePinnedModels(keys: readonly string[]): void {
  writeStored(PINNED_MODELS_STORAGE_KEY, JSON.stringify(keys))
}

/**
 * 厂商（提供商）组的展开集合与「仅看今日」过滤（issue #77）。
 * 纯 client 偏好，存 localStorage（不依赖 node 半区接口/设置 schema）。
 */

/** localStorage key：当前展开的厂商组名列表（默认收起，仅记录用户展开过的组）。 */
export const PROVIDER_EXPANDED_STORAGE_KEY = 'dsh.ui-usage-billing.provider-expanded'

/**
 * 读取展开的厂商组 id 列表（审计 S2）。
 * 持久化内容是带前缀的稳定 id（`ch:` / `sub:` / `bal:`）；v1.4.14 前存的是
 * 本地化显示名（无冒号前缀），切语言即失效——这里直接丢弃旧格式，用户重新
 * 展开一次即可，不做不可逆的名称猜测迁移。
 */
export function loadProviderExpanded(): string[] {
  const raw = readJson(PROVIDER_EXPANDED_STORAGE_KEY)
  if (!Array.isArray(raw)) return []
  return raw.filter((k): k is string => typeof k === 'string' && /^(ch|sub|bal):/.test(k))
}

/** 写入展开的厂商组名列表。失败静默（展示偏好非关键）。 */
export function saveProviderExpanded(names: readonly string[]): void {
  writeStored(PROVIDER_EXPANDED_STORAGE_KEY, JSON.stringify(names))
}

/** localStorage key：「仅看今日」开关（默认关）。 */
export const PROVIDERS_TODAY_STORAGE_KEY = 'dsh.ui-usage-billing.providers-today'

/** 读取「仅看今日」开关。 */
export function loadProvidersTodayOnly(): boolean {
  return readRaw(PROVIDERS_TODAY_STORAGE_KEY) === '1'
}

/** 写入「仅看今日」开关。失败静默（展示偏好非关键）。 */
export function saveProvidersTodayOnly(enabled: boolean): void {
  writeStored(PROVIDERS_TODAY_STORAGE_KEY, enabled ? '1' : '0')
}

/** 界面语言（与币种解耦后独立持久化）。 */
export type BillingLanguage = 'zh' | 'en'

/** localStorage key（与其他 `dsh.ui-usage-billing.*` 偏好同命名空间）。 */
export const LANGUAGE_STORAGE_KEY = 'dsh.ui-usage-billing.language'

/** 语言切换后派发的 CustomEvent 名（另一棵树监听它即时重读）。 */
export const LANGUAGE_PREF_EVENT = 'dsh.ui-usage-billing.language-pref'

/**
 * 读取界面语言。**迁移关键**：历史版本的语言是从币种推导的（选 $ 就是英文），
 * 因此当尚无语言偏好时，**从已存的币种播种一次**并写回；升级后没有任何人
 * 的界面语言会静默改变，且播种只发生一次。
 * @returns 界面语言。
 */
export function loadLanguage(): BillingLanguage {
  const raw = readRaw(LANGUAGE_STORAGE_KEY)
  if (raw === 'en' || raw === 'zh') return raw
  const seeded: BillingLanguage = loadCurrency() === 'usd' ? 'en' : 'zh'
  saveLanguage(seeded)
  return seeded
}

/** 写入界面语言。失败静默（展示偏好非关键）。 */
export function saveLanguage(language: BillingLanguage): void {
  writeStored(LANGUAGE_STORAGE_KEY, language)
}

/**
 * 切换某个模型的固定状态。
 * @param key - 目录键。
 * @returns 切换后的列表（已写入）。
 */
export function togglePinnedModel(key: string): string[] {
  const current = loadPinnedModels()
  const next = current.includes(key) ? current.filter(k => k !== key) : [...current, key]
  savePinnedModels(next)
  return next
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
  const parsed = readJson(USER_PRICES_STORAGE_KEY)
  if (parsed === undefined || parsed === null) return []
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
}

/** 写入用户自定义价。失败静默（展示偏好非关键）。 */
export function saveUserPrices(prices: UserPriceMap): void {
  writeStored(USER_PRICES_STORAGE_KEY, JSON.stringify(prices))
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
  const parsed = readJson(PERF_VIEW_STORAGE_KEY)
  if (parsed === null || typeof parsed !== 'object') return { ...DEFAULT_PERF_VIEW_PREFS }
  const prefs = parsed as Partial<PerfViewPrefs>
  return {
    metric: prefs.metric === 'tps' ? 'tps' : 'ttft',
    // models 缺省 = 从未碰过图例（跟随默认前 5）；空数组 = 用户显式全关，需保留。
    ...(Array.isArray(prefs.models) ? { models: prefs.models.filter(entry => typeof entry === 'string') } : {}),
  }
}

/** 写入性能视图偏好。失败静默（展示偏好非关键）。 */
export function savePerfViewPrefs(prefs: PerfViewPrefs): void {
  writeStored(PERF_VIEW_STORAGE_KEY, JSON.stringify(prefs))
}
