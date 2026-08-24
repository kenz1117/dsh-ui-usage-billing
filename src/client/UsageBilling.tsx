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

import { useCallback, useEffect, useMemo, useState, Fragment } from 'react'
import clsx from 'clsx'
import type { InjectFace, PropsLocale, PropsRenderSlots, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type { SidebarFooterActionOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  DEFAULT_ENABLE_USAGE_STATS_TOOL,
  type FloatWindowPrefs,
  loadFloatWindowPrefs,
  saveFloatWindowPrefs,
} from './usage-billing-settings.ts'
import { TrendChart, type TrendMetric, type TrendPoint } from './TrendChart.tsx'
import { PerfPanel, type ClientPerf } from './PerfPanel.tsx'
import { PluginInfoCard } from './PluginInfoCard.tsx'
import { TokenPanel } from './TokenPanel.tsx'
import { RoundCostChart, type RoundChartRow } from './round-chart.tsx'
import { UsageHeatmap, type HeatmapDay } from './heatmap.tsx'
import { flagAnomalies, type AnomalyFlag } from './anomaly.ts'
import { dayRowsCsv, downloadText, exportFileName, sessionRowsCsv, siteRowsCsv } from './export.ts'
import type { createBillingBudgetStore } from './budget-store.ts'
import {
  applyLiveCatalogModels, applyLivePricing, catalogEntries, cnyToUsd, computeCost, convertUnitPrice,
  formatMoney, formatPercent, formatTokens, formatUnitPrice, getRateInfo,
  modelOf, resolveToken, tierAt, type CatalogModel, type CostCurrency, type TokenUsageBuckets,
} from './pricing.ts'
import type { BalanceResponse, LivePricing, ProviderBalance, RelayQuota, RelayResponse } from '../pricing-shared.ts'
import type { SubscriptionQuota, SubscriptionResponse } from '../pricing-shared.ts'
import { NS, zh, en, type UsageBillingKey } from './locales.ts'
import { localizeProviderName } from './provider-display.ts'
import { tierInfoOf } from './plan-knowledge.ts'
import { computePeakAlert, loadPeakAlertConfig, savePeakAlertConfig, type PeakAlertConfig, type PeakAlertHit } from './peak-alert.ts'
import { PeakAlertBanner } from './PeakAlertBanner.tsx'
import css from './UsageBilling.module.css'

/** Model-connectivity health reported by the host model directory probe. */
export interface ModelHealth {
  /** Whether the probe completed (false while still loading). */
  checked: boolean
  /** True when at least one connected provider answered its model catalog. */
  available: boolean
  /** 可用模型总数：累加每个厂商成功 advertise 的模型数，而非厂商数。 */
  models: number
  /** 失效厂商数（目录探测失败的厂商；失败信息不细分到模型级）。 */
  failures: number
  /** Display names of providers that answered their model catalog (live). */
  okProviders: readonly string[]
  /** Display names of providers whose catalog probe failed. */
  badProviders: readonly string[]
  /** 探活得到的模型清单（系统里实际配置/预制的模型；无价格，费率表据此对标）。 */
  catalog?: readonly CatalogModel[]
}

/** 会话明细面板最多展示的行数（完整长尾在服务端另有一层封顶）。 */
const SESSION_DISPLAY_LIMIT = 20

/** 仪表盘分区 Tab id。 */
export type DashboardTab = 'overview' | 'token' | 'trends' | 'providers' | 'pricing' | 'settings'

/**
 * Tab 定义（顺序即渲染顺序）：概览=主数字/KPI/热力图，趋势=趋势图/每轮费用，
 * 明细=厂商计费与订阅，统计=工作区/会话明细，费率=模型单价表，设置=预算与峰谷提醒。
 * 导出供测试断言 tab 与文案 key 对齐、decor 锚点落在正确分区。
 */
export const DASHBOARD_TABS: readonly { id: DashboardTab; labelKey: UsageBillingKey }[] = [
  { id: 'overview', labelKey: 'billing.tabOverview' },
  { id: 'token', labelKey: 'billing.tabToken' },
  { id: 'trends', labelKey: 'billing.tabTrends' },
  { id: 'providers', labelKey: 'billing.tabProviders' },
  { id: 'pricing', labelKey: 'billing.tabPricing' },
  { id: 'settings', labelKey: 'billing.tabSettings' },
]

/** 项目名取 cwd 的末级目录；无 cwd 时由调用方回退为 em dash。 */
function projectName(cwd: string | undefined): string | undefined {
  if (cwd === undefined) return undefined
  return cwd.split(/[\\/]/).filter(Boolean).pop() ?? cwd
}

/** 预算提醒档位（百分比）：跨档时桌面通知，每档每天最多一次。 */
const BUDGET_ALERT_TIERS: readonly number[] = [50, 80, 100]

/** Idle health state before the probe settles. */
const IDLE_HEALTH: ModelHealth = {
  checked: false, available: false, models: 0, failures: 0,
  okProviders: [], badProviders: [],
}

/**
 * The dashboard's display names (中文厂商名) never equal the provider names a
 * user actually configures (deepseek, zhipu, qwen…), so the dot match also
 * accepts a bidirectional substring hit and a display-name alias list.
 * 导出供一致性守卫测试：catalog 每个厂商都必须在此登记（Custom 除外），
 * 防止新增厂商漏配导致健康绿灯不亮。
 */
export const PROVIDER_ALIASES: Readonly<Record<string, readonly string[]>> = {
  'DeepSeek': ['deepseek'],
  '智谱 AI': ['zhipu', 'glm', 'z.ai'],
  '阿里通义': ['qwen', 'tongyi', 'dashscope', 'aliyun'],
  '字节豆包': ['doubao', 'volcengine', 'ark'],
  '月之暗面': ['moonshot', 'kimi'],
  '小米': ['xiaomi', 'mi', 'mimo'],
  'MiniMax': ['minimax'],
  '百度文心': ['ernie', 'wenxin', 'qianfan', 'baidu'],
  '腾讯混元': ['hunyuan', 'tencent'],
  '零一万物': ['01.ai', 'lingyi', 'yi'],
  '阶跃星辰': ['step', 'stepfun', 'step-3.7'],
  '科大讯飞': ['spark', 'xfyun', 'iflytek'],
  '商汤': ['sensenova', 'sensetime'],
  '百川智能': ['baichuan'],
  'OpenAI': ['openai'],
  'Google': ['google', 'gemini'],
  'xAI': ['xai', 'grok'],
  'Meta': ['meta', 'llama'],
}

/** Normalize a provider name for dot matching: lower case, no spaces. */
function normalizeProvider(name: string): string {
  return name.trim().toLowerCase().replace(/[\s_/-]+/g, '')
}

/** Whether one normalized name is a substring of the other (length-guarded). */
function providerNameHits(display: string, live: string): boolean {
  if (display.length === 0 || live.length === 0) return false
  if (display === live) return true
  const [short, long] = display.length <= live.length ? [display, live] : [live, display]
  // 太短的片段（如单字母）不做子串判断，避免误匹配。
  return short.length >= 3 && long.includes(short)
}

/** Whether a catalog display name matches one live provider name. */
function providerMatches(display: string, live: string): boolean {
  const displayKey = normalizeProvider(display)
  const liveKey = normalizeProvider(live)
  if (providerNameHits(displayKey, liveKey)) return true
  const aliases = PROVIDER_ALIASES[display]
  return aliases !== undefined && aliases.some(alias => providerNameHits(normalizeProvider(alias), liveKey))
}

/**
 * 从真实 model id 反推提供方显示名：目录未收录的模型（key 落回「其他」）
 * 只靠 entry.provider（Custom）永远点不亮健康灯，这里用厂商别名对 model id
 * 做强匹配（别名作为完整 id / 前缀 / 独立段）与弱匹配（长别名子串），
 * 命中即显示厂商名并点亮健康点；无命中保持 Custom。
 * 导出供守卫测试：短别名（mi/yi）仅允许前缀形式，防止 minimax 等误吞。
 */
export function providerFromModelKey(modelKey: string): string | undefined {
  // 强匹配保留原始连字符（normalize 会吞掉 `-`，前缀/独立段判断就失效了）。
  const key = modelKey.trim().toLowerCase()
  const compact = key.replace(/[\s_/-]+/g, '')
  if (compact.length === 0) return undefined
  // 强匹配：别名作为完整 id 或前缀/独立段（deepseek-chat、qwen-max、mi-mimo-2.5）。
  for (const [display, aliases] of Object.entries(PROVIDER_ALIASES)) {
    for (const alias of aliases) {
      const a = normalizeProvider(alias)
      if (a.length === 0) continue
      if (key === a) return display
      if (key.startsWith(`${a}-`) || key.startsWith(`${a}/`) || key.startsWith(`${a}_`)) return display
      if (key.includes(`${a}-`) || key.includes(`${a}/`) || key.includes(`${a}_`)) return display
    }
  }
  // 弱匹配：长别名（≥4 字符）作为 id 子串（mimo2.5 → mimo → 小米）；短别名
  // 已在强匹配覆盖（前缀形式），这里不参与，避免误配。
  for (const [display, aliases] of Object.entries(PROVIDER_ALIASES)) {
    for (const alias of aliases) {
      const a = normalizeProvider(alias)
      if (a.length < 4) continue
      if (compact.includes(a)) return display
    }
  }
  return undefined
}

/**
 * 订阅套餐 provider id → 所属模型厂商（用于把订阅额度归并到对应厂商组）。
 * 厂商名与 PROVIDER_ALIASES 保持一致，使订阅卡片与模型用量落在同一组下。
 * opencode 是跨厂商订阅通道、无单一模型厂商，按自身显示名独立成组。
 */
const SUBSCRIPTION_VENDORS: Readonly<Record<string, string>> = {
  'kimi-coding': '月之暗面',
  'zai-coding-cn': '智谱 AI',
  'zai-coding': '智谱 AI',
  'qwen-token-plan': '阿里通义',
  'qwen-token-plan-cn': '阿里通义',
  'xiaomi-token-plan-ams': '小米',
  'xiaomi-token-plan-cn': '小米',
  'xiaomi-token-plan-sgp': '小米',
  'volcengine-token-plan': '字节豆包',
  'ark-token-plan': '字节豆包',
  'doubao-token-plan': '字节豆包',
  'ernie': '百度文心',
  'baidu': '百度文心',
  'wenxin': '百度文心',
  'minimax': 'MiniMax',
  'minimax-token-plan': 'MiniMax',
  'minimax-token-plan-cn': 'MiniMax',
  'opencode': 'OpenCode',
  'opencode-go': 'OpenCode',
}

/** 仅供测试：暴露厂商映射表（subscriptionVendorOf 仍是唯一消费入口）。 */
export const SUBSCRIPTION_VENDORS_FOR_TEST: Readonly<Record<string, string>> = SUBSCRIPTION_VENDORS

/** 订阅套餐归并到的厂商显示名；未知 id 回退为从 model id 反推或 id 本身。 */
function subscriptionVendorOf(provider: string): string {
  const mapped = SUBSCRIPTION_VENDORS[provider]
  if (mapped !== undefined) return mapped
  return providerFromModelKey(provider) ?? provider
}

/** 余额不足告警的默认阈值（人民币元）：宿主 Config 未配置时客户端兜底。 */
const DEFAULT_LOW_BALANCE_THRESHOLD = 50

/**
 * 日均消耗（元/天）：取最近 7 天（含今天）总花费 ÷ 有记录天数；无记录返回 0
 * （此时可用天数无法估算，调用方不显示天数提示）。日期戳字典序即时间序。
 */
function dailyBurnRate(byDay: Record<string, { cost: number }>, today: string): number {
  const dates = Object.keys(byDay).filter(d => d <= today).sort().slice(-7)
  if (dates.length === 0) return 0
  const total = dates.reduce((sum, d) => sum + (byDay[d]?.cost ?? 0), 0)
  return total / dates.length
}

/**
 * 本月预计总花费：按本月已有记录的平均日消耗 × 本月天数外推；无本月记录时
 * 回退为最近 7 天日均 × 本月天数；无任何记录时返回 0（调用方不展示）。
 * 导出供测试：纯函数，不依赖组件。
 * @param byDay - 按日费用表。
 * @param monthPrefix - 本月前缀（YYYY-MM）。
 * @param today - 今日日期戳（YYYY-MM-DD）。
 * @returns 本月预计花费（人民币元）；无数据时为 0。
 */
export function projectMonthCost(byDay: Record<string, { cost: number }>, monthPrefix: string, today: string): number {
  const dates = Object.keys(byDay).filter(d => d.startsWith(monthPrefix))
  // 本月总天数：取当月最后一日的日号（用下月第 0 天）。
  const monthLen = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const avg = dates.length > 0
    ? dates.reduce((sum, d) => sum + (byDay[d]?.cost ?? 0), 0) / dates.length
    : dailyBurnRate(byDay, today)
  if (avg <= 0) return 0
  return avg * monthLen
}

/**
 * 峰谷时段费用分摊：按每轮的起始时刻（北京时间高峰 9-12 / 14-18）把费用
 * 归入高峰 / 空闲两档。导出供测试：纯函数。
 * @param turns - 每轮费用行（需带 startedAt 与 cost）。
 * @returns 两档费用合计（人民币元）。
 */
export function peakOffpeakCost(turns: readonly { startedAt: number; cost: number }[]): { peak: number; offPeak: number } {
  let peak = 0
  let offPeak = 0
  for (const turn of turns) {
    if (tierAt(turn.startedAt) === 'peak') peak += turn.cost
    else offPeak += turn.cost
  }
  return { peak, offPeak }
}

/** 近 7 天费用序列（含今天，缺日补 0）：触发卡 hover 速览的迷你柱数据源。
 * 导出供测试：纯函数（日期取本地时区）。 */
export function activeDaysOf(byDay: Record<string, { cost: number }>): number {
  return Object.keys(byDay).length
}

/** 连续使用天数：从今天往前连续「有调用记录」的天数；今天无记录则为 0。
 * 导出供测试：纯函数（日期取本地时区）。 */
export function streakDaysOf(byDay: Record<string, { cost: number }>, now = Date.now()): number {
  let streak = 0
  const cursor = new Date(now)
  for (;;) {
    const key = localDayStamp(cursor.getTime())
    if (!(key in byDay)) break
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/**
 * 近 7 天费用序列（含今天，缺日补 0）：触发卡 hover 速览的迷你柱数据源。
 * 导出供测试：纯函数（日期取本地时区）。
 * @param byDay - 按日费用表。
 * @returns 7 个 `{ date, cost }`，最旧在前。
 */
export function lastSevenDays(byDay: Record<string, { cost: number }>): readonly { date: string; cost: number }[] {
  const out: { date: string; cost: number }[] = []
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date()
    day.setDate(day.getDate() - offset)
    const stamp = localDayStamp(day.getTime())
    out.push({ date: stamp, cost: byDay[stamp]?.cost ?? 0 })
  }
  return out
}

/** Resolve one provider's dot state: green when live, red when failed, gray when unknown. */
function providerDot(health: ModelHealth, provider: string): string | undefined {
  if (!health.checked) return css.healthIdle
  if (health.okProviders.some(live => providerMatches(provider, live))) return css.healthOk
  if (health.badProviders.some(live => providerMatches(provider, live))) return css.healthBad
  return css.healthIdle
}

/** 会话明细行（与服务端 SessionUsageRow 同形；旧快照可能缺失整个 bySession）。 */
interface SessionBillingRow {
  id: string
  title?: string
  cwd?: string
  calls: number
  cost: number
  lastActive: number
}

/** 订阅额度查询状态的文案（ok 时无需额外标注，返回空串）。 */
function subscriptionStatusText(status: SubscriptionQuota['status'], t: (key: UsageBillingKey) => string): string {
  switch (status) {
    case 'ok': return ''
    case 'not-configured': return t('billing.subscriptionNotConfigured')
    case 'unauthorized': return t('billing.subscriptionUnauthorized')
    case 'rate-limited': return t('billing.subscriptionRateLimited')
    case 'invalid-response': return t('billing.subscriptionInvalid')
    default: return t('billing.subscriptionUnavailable')
  }
}

/** 订阅额度窗口的类型标签（本次 / 本周 / 本月 / 计费周期）。 */
function subscriptionWindowLabel(kind: SubscriptionQuota['windows'][number]['kind'], t: (key: UsageBillingKey) => string): string {
  switch (kind) {
    case 'session': return t('billing.subscriptionSession')
    case 'weekly': return t('billing.subscriptionWeekly')
    case 'monthly': return t('billing.subscriptionMonthly')
    case 'billing': return t('billing.subscriptionBilling')
  }
}

/** 站点桶的归属类别（bySite 的 key 前缀）。 */
type SiteBucketKind = 'site' | 'direct' | 'unknown'

/** 由 bySite 的 key 解析站点行显示名与类别。 */
function siteBucketLabel(key: string, t: (key: UsageBillingKey) => string): { name: string; kind: SiteBucketKind } {
  if (key.startsWith('site:')) return { name: key.slice(5), kind: 'site' }
  if (key.startsWith('direct:')) return { name: key.slice(7), kind: 'direct' }
  return { name: t('billing.relayUnknown'), kind: 'unknown' }
}

/** 站点类别的文案（中转站 / 直连 / 未知路由）。 */
function siteKindText(kind: SiteBucketKind, t: (key: UsageBillingKey) => string): string {
  switch (kind) {
    case 'site': return t('billing.relaySite')
    case 'direct': return t('billing.relayDirect')
    default: return t('billing.relayUnknown')
  }
}

/** 中转站程序类型的徽标文案（New API / Sub2API / 未识别）。 */
function relayKindText(kind: RelayQuota['kind'], t: (key: UsageBillingKey) => string): string {
  switch (kind) {
    case 'new-api': return t('billing.relayKindNewApi')
    case 'sub2api': return t('billing.relayKindSub2Api')
    default: return t('billing.relayKindUnknown')
  }
}

/** 站点类别对应的样式类（bySite 桶与中转站额度徽标共用配色）。 */
const SITE_KIND_CLASS: Record<SiteBucketKind, string | undefined> = {
  site: css.siteKindSite,
  direct: css.siteKindDirect,
  unknown: css.siteKindUnknown,
}

/** 中转站程序类型对应的样式类（复用站点类别配色）。 */
const RELAY_KIND_CLASS: Record<RelayQuota['kind'], string | undefined> = {
  'new-api': css.siteKindSite,
  sub2api: css.siteKindDirect,
  unknown: css.siteKindUnknown,
}

/** Usage stats structure from `.dsh-usage-stats.json`. */
export interface UsageStats {
  /** 服务端聚合时间戳（毫秒）；旧快照可能缺失。 */
  updatedAt?: number
  /** 月度预算（人民币元）：宿主 Config 注入；未配置时不渲染预算条。 */
  budget?: number
  /** 余额不足告警阈值（人民币元）：宿主 Config 注入；未配置时客户端用默认值。 */
  lowBalanceThreshold?: number
  /** 会话明细（按费用倒序，服务端已封顶）；旧快照可能缺失。 */
  bySession?: readonly SessionBillingRow[]
  total: {
    calls: number
    input: number
    output: number
    cacheHit: number
    cacheMiss: number
    cost: number
    /** 输出中的 reasoning（思考）token；已含在 output 内。 */
    reasoning: number
  }
  byModel: Record<string, {
    calls: number
    input: number
    output: number
    cacheHit: number
    cacheMiss: number
    cost: number
    reasoning: number
    /** Billed through a subscription plan (no per-token cost). */
    plan?: boolean
    /** 走官方 DeepSeek 直连的调用数（其余为第三方）；旧快照可能缺失。 */
    officialCalls?: number
    /** 走官方渠道的费用（CNY）；旧快照可能缺失。 */
    officialCost?: number
  }>
  byDay: Record<string, {
    calls: number
    input: number
    output: number
    cacheHit: number
    cacheMiss: number
    cost: number
    reasoning: number
  }>
  /** 模型 × 日期 二维统计（趋势图堆叠柱的输入）；旧快照可能缺失，渲染时降级为单色柱。 */
  byDayModels?: Record<string, Record<string, {
    calls: number
    input: number
    output: number
    cacheHit: number
    cacheMiss: number
    cost: number
  }>>
  /** 每轮费用明细（服务端聚合路径恒带）；旧快照可能缺失。 */
  byTurn?: readonly {
    sessionId: string
    turn: number
    model: string
    input: number
    output: number
    cacheHit: number
    cacheMiss: number
    cost: number
    startedAt: number
    endedAt?: number
  }[]
  /** 工作区聚合（按 cwd 末级目录）；旧快照可能缺失。 */
  byWorkspace?: readonly {
    name: string
    calls: number
    cost: number
    input: number
    output: number
    lastActive: number
  }[]
  /** 中转站归组（key = `site:<origin>` / `direct:<provider>` / `unknown`）；旧快照可能缺失。 */
  bySite?: Record<string, {
    calls: number
    input: number
    output: number
    cacheHit: number
    cacheMiss: number
    cost: number
    reasoning: number
  }>
  /** 不可计价模型 id（未收录/无价，费用按 0 计）；旧快照可能缺失。 */
  unpricedModels?: readonly string[]
  /** 按角色费用归因（估算口径：输出实测，输入按消息长度摊分）；旧快照可能缺失。 */
  byRole?: { user: number; assistant: number; tool: number }
  /** 性能指标（TTFT/生成速度/总延迟）按模型与按小时；旧快照可能缺失。 */
  perf?: ClientPerf
  /** 插件版本号（服务端读自包 package.json；旧快照缺失）。 */
  pluginVersion?: string
}

/** Path to the usage-stats endpoint served by this plugin's node half. */
const USAGE_STATS_PATH = '/api/billing/usage-stats'

/** Path to the live-pricing endpoint served by this plugin's node half. */
const PRICING_PATH = '/api/billing/pricing'

/** Path to the account-balance endpoint served by this plugin's node half. */
const BALANCE_PATH = '/api/billing/balance'

/** Path to the subscription-plan quota endpoint served by this plugin's node half. */
const SUBSCRIPTIONS_PATH = '/api/billing/subscriptions'

/** Path to the relay-site quota endpoint served by this plugin's node half. */
const RELAY_PATH = '/api/billing/relay-quotas'

/** 弹窗打开期间统计与定价的自动刷新间隔（毫秒）。 */
const STATS_REFRESH_INTERVAL_MS = 30_000

/**
 * 本地时区（北京时间）日期戳：与服务端聚合的 dayStamp 一致。不要用
 * `toISOString()`——那是 UTC，北京时间的凌晨 0-8 点会取到前一天。
 */
function localDayStamp(time = Date.now()): string {
  const date = new Date(time)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** 本地时区时钟：`HH:MM:SS`。 */
function formatClock(time: number): string {
  const date = new Date(time)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/**
 * 高区分度图表色板：趋势图柱、图例与计费表圆点按模型分配。不用模型品牌色
 * （目录里多为蓝色系，视觉上几乎分不开），保证每个模型一眼可辨。
 */
const CHART_PALETTE: readonly string[] = [
  '#3b82f6', '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981',
  '#ef4444', '#ec4899', '#6366f1', '#f97316', '#14b8a6',
]

/** Empty snapshot: shown before (or without) real host data — zeros, never fabricated samples. */
const EMPTY_STATS: UsageStats = {
  total: { calls: 0, input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cost: 0, reasoning: 0 },
  byModel: {},
  byDay: {},
  byDayModels: {},
}

/** Try to load stats from the server; returns null when no valid JSON stats are served. */
async function loadUsageStats(): Promise<UsageStats | null> {
  try {
    const response = await fetch(USAGE_STATS_PATH)
    if (!response.ok) return null
    // The web server's SPA fallback answers unknown paths with HTML, so a
    // 200 is not proof of JSON; parse the text and only accept objects.
    const text = await response.text()
    const parsed = JSON.parse(text) as unknown
    if (parsed === null || typeof parsed !== 'object' || !('total' in parsed)) return null
    // 缺字段快照兜底：聚合升级前的旧文件可能缺 byDay/byModel，按空统计渲染，
    // 避免渲染路径读 undefined 抛错导致整个插件 surface 被卸载。
    const candidate = parsed as Partial<UsageStats>
    return {
      total: candidate.total ?? EMPTY_STATS.total,
      byModel: candidate.byModel ?? {},
      byDay: candidate.byDay ?? {},
      ...(candidate.byDayModels !== undefined ? { byDayModels: candidate.byDayModels } : {}),
      ...(candidate.updatedAt !== undefined ? { updatedAt: candidate.updatedAt } : {}),
      ...(typeof candidate.budget === 'number' ? { budget: candidate.budget } : {}),
      ...(typeof candidate.lowBalanceThreshold === 'number' ? { lowBalanceThreshold: candidate.lowBalanceThreshold } : {}),
      ...(Array.isArray(candidate.bySession) ? { bySession: candidate.bySession } : {}),
      ...(Array.isArray(candidate.byTurn) ? { byTurn: candidate.byTurn } : {}),
      ...(Array.isArray(candidate.byWorkspace) ? { byWorkspace: candidate.byWorkspace } : {}),
      // 角色归因：旧快照缺失；仅接受对象形状（durable 边界，字段值由渲染处数值化兜底）。
      ...(candidate.byRole !== null && typeof candidate.byRole === 'object'
        ? { byRole: candidate.byRole as { user: number; assistant: number; tool: number } }
        : {}),
      // 性能指标：旧快照缺失；仅接受含 byModel/byHour 的对象形状。
      ...(candidate.perf !== null && typeof candidate.perf === 'object'
        && candidate.perf.byModel !== null && typeof candidate.perf.byModel === 'object'
        && candidate.perf.byHour !== null && typeof candidate.perf.byHour === 'object'
        ? { perf: candidate.perf as ClientPerf }
        : {}),
      ...(typeof candidate.pluginVersion === 'string' ? { pluginVersion: candidate.pluginVersion } : {}),
    }
  } catch {
    return null
  }
}

/**
 * Apply the node half's live pricing snapshot. The node half refreshes once
 * at boot, so an early `builtin` answer may just mean the refresh is still
 * in flight — retry briefly before settling for the built-in values.
 * Any final failure keeps the built-in catalog and rate — degrade, never
 * fabricate.
 * @param attempt - current retry index (0-based).
 */
async function loadLivePricing(attempt = 0): Promise<void> {
  const MAX_ATTEMPTS = 4
  try {
    const response = await fetch(PRICING_PATH)
    if (!response.ok) return
    const text = await response.text()
    const parsed = JSON.parse(text) as unknown
    if (parsed === null || typeof parsed !== 'object' || !('source' in parsed)) return
    const pricing = parsed as LivePricing
    if (pricing.source === 'builtin' && attempt < MAX_ATTEMPTS - 1) {
      // 节点端启动拉取可能仍在进行中：稍后重试，避免把「更新中」误判成永久内置。
      setTimeout(() => { void loadLivePricing(attempt + 1) }, 2000)
      return
    }
    applyLivePricing(pricing)
  } catch {
    // 拉取失败：维持内置目录与内置汇率（默认值降级）。
  }
}

/**
 * 拉取各提供方账户余额（供模型计费明细表的余额列）；失败返回空列表。
 * @returns the balance rows, or an empty list on any failure.
 */
async function fetchBalances(): Promise<readonly ProviderBalance[]> {
  try {
    const response = await fetch(BALANCE_PATH)
    if (!response.ok) return []
    const text = await response.text()
    const parsed = JSON.parse(text) as unknown
    if (parsed !== null && typeof parsed === 'object' && 'balances' in parsed) {
      return (parsed as BalanceResponse).balances
    }
    return []
  } catch {
    return []
  }
}

/**
 * 拉取订阅套餐剩余额度（供订阅面板）；失败返回空列表。
 * @returns the quota rows, or an empty list on any failure.
 */
async function fetchSubscriptions(): Promise<readonly SubscriptionQuota[]> {
  const response = await fetch(SUBSCRIPTIONS_PATH)
  if (!response.ok) throw new Error(`subscriptions HTTP ${String(response.status)}`)
  const text = await response.text()
  const parsed = JSON.parse(text) as unknown
  if (parsed !== null && typeof parsed === 'object' && 'quotas' in parsed) {
    return (parsed as SubscriptionResponse).quotas
  }
  throw new Error('subscriptions: invalid response')
}

/**
 * 拉取中转站额度（New API / Sub2API 的余额与滚动窗口）；失败返回空列表。
 * @returns the relay-site quota rows, or an empty list on any failure.
 */
async function fetchRelayQuotas(): Promise<readonly RelayQuota[]> {
  try {
    const response = await fetch(RELAY_PATH)
    if (!response.ok) return []
    const text = await response.text()
    const parsed = JSON.parse(text) as unknown
    if (parsed !== null && typeof parsed === 'object' && 'quotas' in parsed) {
      return (parsed as RelayResponse).quotas
    }
    return []
  } catch {
    return []
  }
}

/**
 * 读取 usage_stats 工具开关当前值（插件自带接口，不依赖宿主浏览器设置白名单）。
 * @returns 当前是否注入；读取失败（服务未起/非 JSON）返回 undefined。
 */
async function loadUsageTool(): Promise<boolean | undefined> {
  try {
    const response = await fetch('/api/billing/usage-tool')
    if (!response.ok) return undefined
    const parsed = JSON.parse(await response.text()) as { enabled?: unknown }
    return typeof parsed.enabled === 'boolean' ? parsed.enabled : undefined
  } catch {
    return undefined
  }
}

/**
 * 写 usage_stats 工具开关（插件自带接口）。工具注入是启动期决策，重启应用后生效。
 * @param enabled - 是否注入。
 * @returns 是否写成功。
 */
async function saveUsageTool(enabled: boolean): Promise<boolean> {
  try {
    const response = await fetch('/api/billing/usage-tool', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    if (!response.ok) return false
    const parsed = JSON.parse(await response.text()) as { ok?: unknown }
    return parsed.ok === true
  } catch {
    return false
  }
}

/** 组件注入面：探活 + 计费指标写入（billing 自身写入，主题插件经服务读取）。 */
export interface UsageBillingInjected {
  checkModels: () => Promise<ModelHealth>
  publishCosts: (costs: { todayCost: number; monthCost: number }) => void
  registerOpen: (handler: () => void) => () => void
}

/** 预算 store 的 props 份额（useStore 读取 + actions 写面）。 */
type BillingBudgetStoreProps = PropsStore<ReturnType<typeof createBillingBudgetStore>>

/** Full props type for the UsageBilling component. */
type UsageBillingProps =
  PropsRuntime<'sidebar.footer.action'>
  & SidebarFooterActionOwnerProps
  & InjectFace<UsageBillingInjected>
  & PropsRenderSlots<'billing.dashboard.decor'>
  & BillingBudgetStoreProps
  & PropsLocale<typeof NS>

/** One model row derived from stats + the pricing catalog. */
interface ModelRow {
  key: string
  name: string
  provider: string
  color: string
  calls: number
  input: number
  output: number
  cacheHitRate: number
  estimated: number
  actual?: number
  /** Billed through a subscription plan (no per-token cost). */
  plan: boolean
  /** 真实 model id 不在计费目录（落回「其他」）：费用未估算，标注反馈。 */
  uncatalogued: boolean
  /** 目录单价为估算价（厂商未公布官方按量价）：标注以免误当正式定价。 */
  estimatedPricing: boolean
  /** 走官方 DeepSeek 直连的调用数（其余为第三方中转/代理）。 */
  officialCalls: number
  /** 走官方渠道的费用（CNY）；三方费用 = actual - officialCost。 */
  officialCost: number
}

/**
 * 按厂商聚合的计费组：模型用量 + 订阅额度 + 厂商余额。
 * 余额与健康点只挂在厂商组头部（同厂商只显示一次），不再随每行重复。
 */
interface ProviderBillingGroup {
  /** 厂商显示名（模型厂商；订阅通道无厂商时用订阅名/自身 id）。 */
  name: string
  /** 该厂商下的模型用量行（按费用降序，已过滤 calls>0）。 */
  models: readonly ModelRow[]
  /** 归并到该厂商的订阅额度卡片。 */
  subscriptions: readonly SubscriptionQuota[]
  /** 该厂商余额（同厂商只显示一次）。 */
  balance: ProviderBalance | undefined
  /** 健康点状态：按厂商名与 health 的在线/失效列表匹配。 */
  dot: string | undefined
}

/**
 * Sidebar footer trigger: compact pill in wide mode, icon in rail mode.
 * ZINE 模式下入口由主题插件的贴纸层承担，本触发器由 CSS
 * （body[data-zine-mode] 选择器）隐藏，组件本身无 zine 分支。
 * @param props - framework props plus `wide` column state.
 */
function UsageBillingTrigger(
  props: UsageBillingProps & {
    onOpen: () => void
    monthCost: number
    todayCost: number
    weekCost: number
    days: readonly { date: string; cost: number }[]
    /** hover 速览「主力直联/订阅消耗」+ 对应余额/配额数值文本与低值标记。 */
    vendorStatus: {
      direct: { name: string; text: string; low: boolean } | undefined
      sub: { name: string; text: string; low: boolean } | undefined
    }
  /** hover 速览「数据卡」用量数值（累计）：总 Token / 输入 / 输出 / 缓存 / 调用 / 更新时间。 */
  dash: {
    totalToken: number
    input: number
    output: number
    cacheRead: number
    calls: number
     updatedAt: string | undefined
   }
  /** 模型用量悬浮窗偏好（模式 + 指定订阅卡目标）。 */
  floatPrefs: FloatWindowPrefs
  /** 订阅配额列表（「指定订阅卡」模式的数据来源）。 */
  subscriptions: readonly SubscriptionQuota[]
  },
): React.ReactNode {
  const {
    wide, t, onOpen, monthCost, todayCost, weekCost, days, vendorStatus, dash,
    floatPrefs, subscriptions,
  } = props

  // 「指定订阅卡」浮窗：可用订阅列表 + 当前展示索引（每次一张，可前后切换）。
  const targetSubs = useMemo(
    () => floatPrefs.targets
      .map(id => subscriptions.find(s => s.provider === id))
      .filter((s): s is SubscriptionQuota => s !== undefined),
    [floatPrefs.targets, subscriptions],
  )
  const [subIndex, setSubIndex] = useState(0)
  const effectiveSubIndex = targetSubs.length === 0 ? 0 : Math.min(subIndex, targetSubs.length - 1)
  const currentSub = targetSubs[effectiveSubIndex]
  // 浮窗 pointer-events:none 无法点击切换；多张订阅卡时每 1.5s 自动轮播。
  useEffect(() => {
    if (floatPrefs.mode !== 'subscription' || targetSubs.length < 2) return
    const timer = setInterval(() => setSubIndex((index) => (index + 1) % targetSubs.length), 1500)
    return () => clearInterval(timer)
  }, [floatPrefs.mode, targetSubs.length])

  // 计费 icon：圆角矩 + 细线描边，窄栏与宽栏共用。
  const cardIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M4 7h16v11H4z" />
      <path d="M4 10h16" />
      <path d="M8 14h3" />
    </svg>
  )

  if (!wide) {
    return (
      <button
        type="button"
        className={css.railButton}
        data-testid="billing-rail-button"
        onClick={onOpen}
        title={`${t('billing.title')} · ${formatMoney(monthCost)}`}
      >
        {cardIcon}
      </button>
    )
  }

  // 近 7 天 sparkline 高度：按当日费用归一化到 4~16px。
  const sparkMax = Math.max(...days.map(d => d.cost), 0)
  const sparkHeights = days.map(d => sparkMax > 0 ? 4 + (d.cost / sparkMax) * 12 : 4)

  return (
    <span className={css.triggerWrap}>
      <button
        type="button"
        className={css.trigger}
        data-testid="billing-trigger"
        onClick={onOpen}
        title={`${t('billing.title')} · ${formatMoney(monthCost)}`}
      >
        <span className={css.triggerIcon} data-testid="billing-trigger-icon">{cardIcon}</span>
        {/* 本月费用为主数字，右侧 sparkline 常驻（近 7 天趋势一眼可读）。 */}
        <span className={css.triggerBody}>
          <span className={css.triggerRow}>
            <span className={css.triggerMeta}>{t('billing.triggerMonth')}</span>
            <span className={css.triggerAmount}>{formatMoney(monthCost)}</span>
          </span>
          <span className={css.triggerSub} data-testid="billing-trigger-today">
            {t('billing.triggerToday')} {formatMoney(todayCost)} · {weekCost > 0 ? `${t('billing.weekCost')} ${formatMoney(weekCost)}` : ''}
          </span>
        </span>
        <span className={css.triggerSpark} data-testid="billing-trigger-spark" aria-hidden="true">
          {sparkHeights.map((h, index) => (
            <span
              key={days[index]?.date ?? String(index)}
              className={index === sparkHeights.length - 1 ? css.triggerSparkHot : css.triggerSparkBar}
              style={{ height: `${h}px` }}
            />
          ))}
        </span>
      </button>
      {/* hover 速览：参考图风格「数据卡」——标题 + 更新时间 + 两列指标网格 + 底部主力消耗/额度提醒。
          纯 CSS 悬停呈现；「展开详情」按钮可点，其余不抢点击。 */}
      <span className={clsx(css.triggerPop, floatPrefs.mode === 'subscription' && css.triggerPopSubscription)} data-testid="billing-trigger-pop" aria-hidden="true">
        {floatPrefs.mode === 'subscription' ? (
          <>
            {targetSubs.length === 0 ? (
              <span className={css.triggerPopEmpty}>{t('billing.floatNoTargets')}</span>
            ) : (
              <>
                {currentSub !== undefined && (
                  <div className={css.floatSub} data-testid="billing-float-subscription">
                    <div className={css.floatSubHead}>
                      <span className={css.floatSubName}>{currentSub.displayName}</span>
                      {currentSub.plan !== undefined && <span className={css.floatSubPlan}>{currentSub.plan}</span>}
                    </div>
                    {currentSub.windows.map(window => (() => {
                      const used = Math.min(100, Math.max(0, window.usedPercent))
                      const remaining = Math.min(100, Math.max(0, window.remainingPercent))
                      const exhausted = remaining <= 0
                      return (
                        <div key={window.kind} className={css.subscriptionWindow}>
                          <span className={css.subscriptionWindowLabel}>{subscriptionWindowLabel(window.kind, t)}</span>
                          <span className={css.subscriptionTrack} aria-hidden="true">
                            <span
                              className={clsx(
                                css.subscriptionFill,
                                used >= 100 && css.subscriptionFillOver,
                                used >= 80 && used < 100 && css.subscriptionFillWarn,
                              )}
                              style={{ width: `${used}%` }}
                            />
                          </span>
                          <span className={css.subscriptionMeta}>
                            <span className={clsx(css.subscriptionPct, exhausted && css.subscriptionExhausted)}>
                              {exhausted
                                ? t('billing.subscriptionExhausted')
                                : t('billing.subscriptionRemaining').replace('{pct}', String(window.remainingPercent))}
                            </span>
                            {window.resetsAt !== undefined && (
                              <span className={css.subscriptionReset}>
                                {t('billing.subscriptionReset').replace('{date}', `${localDayStamp(new Date(window.resetsAt).getTime())} ${formatClock(new Date(window.resetsAt).getTime())}`)}
                              </span>
                            )}
                          </span>
                        </div>
                      )
                    })())}
                  </div>
                )}
                {targetSubs.length > 1 && (
                  <span className={css.triggerPopSwitcher} data-testid="billing-float-switcher">
                    <span className={css.triggerPopSwitchCount}>{effectiveSubIndex + 1}/{targetSubs.length}</span>
                  </span>
                )}
              </>
            )}
          </>
        ) : (
          <>
        <span className={css.triggerPopMetrics}>
          <span className={css.triggerPopMetric}>
            <span className={css.triggerPopMetricLabel}>{t('billing.monthCost')}</span>
            <span className={clsx(css.triggerPopMetricValue, css.triggerPopMetricHighlight)}>{formatMoney(monthCost)}</span>
          </span>
          <span className={css.triggerPopMetric}>
            <span className={css.triggerPopMetricLabel}>{t('billing.tokenTotal')}</span>
            <span className={css.triggerPopMetricValue}>{formatTokens(dash.totalToken)}</span>
          </span>
          <span className={css.triggerPopMetric}>
            <span className={css.triggerPopMetricLabel}>{t('billing.input')}</span>
            <span className={css.triggerPopMetricValue}>{formatTokens(dash.input)}</span>
          </span>
          <span className={css.triggerPopMetric}>
            <span className={css.triggerPopMetricLabel}>{t('billing.output')}</span>
            <span className={css.triggerPopMetricValue}>{formatTokens(dash.output)}</span>
          </span>
          <span className={css.triggerPopMetric}>
            <span className={css.triggerPopMetricLabel}>{t('billing.cacheHit')}</span>
            <span className={css.triggerPopMetricValue}>{formatTokens(dash.cacheRead)}</span>
          </span>
          <span className={css.triggerPopMetric}>
            <span className={css.triggerPopMetricLabel}>{t('billing.calls')}</span>
            <span className={css.triggerPopMetricValue}>{dash.calls.toLocaleString()}</span>
          </span>
        </span>
        <span className={css.triggerPopFoot}>
          <span className={css.triggerPopFootTitle}>{t('billing.popTodayModel')}</span>
          <span className={css.triggerPopFootNotes}>
            {vendorStatus.direct !== undefined && (
              <span className={css.triggerPopFootNote}>
                <span className={clsx(css.triggerPopBadge, css.triggerPopBadgeDirect)}>{t('billing.popDirectLead')}</span>
                <span className={css.triggerPopFootName}>{vendorStatus.direct.name}</span>
                <span className={clsx(css.triggerPopFootStatus, vendorStatus.direct.low && css.triggerPopFootStatusLow)}>
                  {vendorStatus.direct.text}
                </span>
              </span>
            )}
            {vendorStatus.sub !== undefined && (
              <span className={css.triggerPopFootNote}>
                <span className={clsx(css.triggerPopBadge, css.triggerPopBadgeSub)}>{t('billing.popSubLead')}</span>
                <span className={css.triggerPopFootName}>{vendorStatus.sub.name}</span>
                <span className={clsx(css.triggerPopFootStatus, vendorStatus.sub.low && css.triggerPopFootStatusLow)}>
                  {vendorStatus.sub.text}
                </span>
              </span>
            )}
            {vendorStatus.direct === undefined && vendorStatus.sub === undefined && (
              <span className={css.triggerPopFootNote}>{t('billing.popNoConsumption')}</span>
            )}
          </span>
        </span>
          </>
        )}
      </span>
    </span>
  )
}

/** Dashboard 装饰孔位渲染面：仅供 BillingDashboard 透传 renderSlot。 */
type DashboardRenderSlots = PropsRenderSlots<'billing.dashboard.decor'>

/** Props of the billing dashboard modal. */
interface BillingDashboardProps {
  stats: UsageStats
  t: (key: UsageBillingKey) => string
  onClose: () => void
  health: ModelHealth
  balances: readonly ProviderBalance[]
  quotas: readonly SubscriptionQuota[]
  /** 中转站额度（New API / Sub2API 的余额与滚动窗口）。 */
  relayQuotas: readonly RelayQuota[]
  /** 显示币种（成本金额按此币种换算显示）。 */
  currency: CostCurrency
  onCurrency: (currency: CostCurrency) => void
  /** 每轮费用明细（服务端按起始时间倒序下发）。 */
  turns: readonly RoundChartRow[]
  renderSlot: DashboardRenderSlots['renderSlot']
  /** 预算偏好（开关 + 金额）：由父组件从 store 读下传。 */
  budgetEnabled: boolean
  /** 生效预算金额（用户金额优先，宿主默认兜底；0 = 未设置）。 */
  budgetAmount: number
  onToggleBudget: () => void
  onBudgetAmount: (value: number) => void
  /** 峰谷提醒偏好（由父组件从 localStorage 读下传）。 */
  peakConfig: PeakAlertConfig
  /** 峰谷提醒偏好更新（父组件持久化）。 */
  onPeakConfig: (config: PeakAlertConfig) => void
  /** 预览峰谷提醒浮层（不触真实去重）。 */
  onPreviewPeak: () => void
  /** 模型用量悬浮窗偏好（设置 Tab 编辑）。 */
  floatPrefs: FloatWindowPrefs
  /** 模型用量悬浮窗偏好更新（父组件持久化）。 */
  onFloatPrefs: (next: FloatWindowPrefs) => void
  /** 订阅刷新是否失败（保留旧快照并标记缓存）。 */
  quotasStale: boolean
}

/**
 * The centered billing dashboard modal.
 * @param props - stats, locale function, close handler, model health, balances, renderSlot.
 */
/** 余额详情弹窗：点击「约可撑 N 天」圆圈后展示余额构成与可用天数估算。 */
function BalanceDetailPopover({
  balance, days, dailyBurn, money, t, onClose,
}: {
  balance: ProviderBalance
  days: number
  dailyBurn: number
  money: (cny: number) => string
  t: (key: UsageBillingKey) => string
  onClose: () => void
}): React.ReactNode {
  // 金额按余额原生币种显示（USD 直接美元；其余经 money 折成用户展示币种）。
  const fmt = (value: number | undefined): string | undefined =>
    value === undefined ? undefined : (balance.currency === 'USD' ? `$${value.toFixed(2)}` : money(value))
  const total = fmt(balance.totalBalance)
  const granted = fmt(balance.grantedBalance)
  const topped = fmt(balance.toppedUpBalance)
  return (
    <span className={css.balanceDetailPop} data-testid="billing-balance-detail-pop">
      <span className={css.balanceDetailHead}>
        <span className={css.balanceDetailTitle}>{balance.displayName}</span>
        <button type="button" className={css.balanceDetailClose} aria-label={t('billing.close')} onClick={onClose}>×</button>
      </span>
      <span className={css.balanceDetailGrid}>
        {total !== undefined && <BalanceDetailRow label={t('billing.balance')} value={total} />}
        {granted !== undefined && <BalanceDetailRow label={t('billing.balanceGranted')} value={granted} />}
        {topped !== undefined && <BalanceDetailRow label={t('billing.balanceTopped')} value={topped} />}
        <BalanceDetailRow label={t('billing.balanceDaily')} value={money(dailyBurn)} />
        <BalanceDetailRow label={t('billing.balanceDaysLong')} value={`${days} ${t('billing.balanceDaysUnit')}`} />
      </span>
    </span>
  )
}

/** 余额详情弹窗里的一行 label / value。 */
function BalanceDetailRow({ label, value }: { label: string; value: string }): React.ReactNode {
  return (
    <span className={css.balanceDetailRow}>
      <span className={css.balanceDetailLabel}>{label}</span>
      <span className={css.balanceDetailValue}>{value}</span>
    </span>
  )
}

function BillingDashboard({
  stats, t, onClose, health, balances, quotas, relayQuotas, currency, onCurrency, turns,
  renderSlot, budgetEnabled, budgetAmount, onToggleBudget, onBudgetAmount,
  peakConfig, onPeakConfig, onPreviewPeak, floatPrefs, onFloatPrefs, quotasStale,
}: BillingDashboardProps): React.ReactNode {
  // 趋势图指标：费用（堆叠/默认）或 Token（单色总量）。
  const [trendMetric, setTrendMetric] = useState<TrendMetric>('cost')
  const { total, byModel, byDay } = stats
  // 分区 Tab：默认概览；各区块已进入二级 Tab，全部默认展开（无折叠交互）。
  const [tab, setTab] = useState<DashboardTab>('overview')
  // 趋势窗口：7 天 / 30 天切换（30 天窗口数据不足时按日补零）。
  const [trendDays, setTrendDays] = useState<7 | 30>(7)

  // 浮窗「指定订阅卡」的可选目标：只列已接入（查询成功且有额度数据）的订阅，
  // 避免内置 alias 造成的同名重复与未接入项。
  const subscriptionOptions = useMemo(
    () => quotas
      .filter(quota => quota.status === 'ok' && quota.windows.length > 0)
      .map(quota => ({ id: quota.provider, label: quota.displayName })),
    [quotas],
  )

  // 余额详情弹窗：记录打开的厂商（按 provider 标识）；点击「约可撑 N 天」圆圈切换。
  const [balanceDetailFor, setBalanceDetailFor] = useState<string | undefined>()
  // 项目下钻：记录当前展开的项目名；点击项目行切换展开/收起。
  const [expandedProject, setExpandedProject] = useState<string | undefined>()

  // usage_stats 工具开关：经插件自带的 HTTP 接口读写（不依赖宿主浏览器设置白名单）。
  // 挂载时读一次当前值；点按乐观切换并回写，写失败回滚。工具注入是启动期决策，重启生效。
  const [usageStatsEnabled, setUsageStatsEnabled] = useState(DEFAULT_ENABLE_USAGE_STATS_TOOL)
  useEffect(() => {
    let mounted = true
    void loadUsageTool().then((enabled) => {
      if (mounted && enabled !== undefined) setUsageStatsEnabled(enabled)
    })
    return () => { mounted = false }
  }, [])
  const toggleUsageStats = useCallback(() => {
    const next = !usageStatsEnabled
    setUsageStatsEnabled(next)
    void saveUsageTool(next).then((ok) => {
      if (!ok) setUsageStatsEnabled(!next)
    })
  }, [usageStatsEnabled])

  // 当前汇率与来源：供单价表标题展示（实时 / 内置）。
  const rateInfo = getRateInfo()

  // 显示币种换算：usd 时把 CNY 金额按当前汇率换算显示。
  const money = (cny: number): string => formatMoney(currency === 'usd' ? cnyToUsd(cny) : cny, currency)

  // 界面语言跟随币种：USD→英文，CNY→中文；厂商显示名据此本地化。
  const lang = currency === 'usd' ? 'en' : 'zh'
  const providerName = (name: string): string => localizeProviderName(name, lang)

  // 费率表单价：按用户所选币种换算后再格式化（原生币种 × 汇率）；0 价显示"免费"。
  // 切 USD 时把 ¥ 计价模型换算成 $，费率表不再固定显示人民币。
  const unitMoney = (price: number, native: 'CNY' | 'USD'): string =>
    price === 0 ? t('billing.free') : formatUnitPrice(convertUnitPrice(price, native, currency, rateInfo.rate), currency === 'usd' ? 'USD' : 'CNY')

  // 每轮成本异常标记：按起始时间升序传给 flagAnomalies（最近的在末尾）。
  const roundFlags: AnomalyFlag[] = useMemo(
    () => flagAnomalies([...turns].reverse()),
    [turns],
  )

  // 峰谷时段费用分摊：按每轮起始时刻精确判定（北京时间高峰 9-12 / 14-18）。
  const peakShare = useMemo(() => peakOffpeakCost(turns), [turns])

  // 费用构成（估算）：角色归因三段（用户输入 / 助手输出 / 工具结果）。
  const roleRows = useMemo(() => {
    const role = stats.byRole
    if (role === undefined) return []
    const total = role.user + role.assistant + role.tool
    if (total <= 0) return []
    return [
      { label: t('billing.roleUser'), value: role.user, seg: css.shareSegUser },
      { label: t('billing.roleAssistant'), value: role.assistant, seg: css.shareSegAssistant },
      { label: t('billing.roleTool'), value: role.tool, seg: css.shareSegTool },
    ].map(row => ({ ...row, pct: (row.value / total) * 100 }))
  }, [stats.byRole, t])

  // A1: 日均消耗（最近 7 天）——余额列据此估算可用天数；无消耗记录时 0（不显示天数）。
  const dailyBurn = dailyBurnRate(byDay, localDayStamp())

  // 按提供方归一化匹配余额（deepseek ↔ DeepSeek）。
  const balanceFor = (provider: string): ProviderBalance | undefined =>
    balances.find(balance => normalizeProvider(balance.provider) === normalizeProvider(provider))

  // 订阅型厂商隐藏「余额」栏：该组模型全部走订阅且未配置按量余额时，只保留订阅额度，
  // 避免「1 套餐 + 余额未配置」的困惑（按量余额与订阅是两套独立计费）。
  const hideBalanceForGroup = (group: ProviderBillingGroup): boolean =>
    group.balance?.error === 'unconfigured'
    && group.models.length > 0
    && group.models.every(model => model.plan)

  // 余额列单元格：按查询状态渲染金额或占位文案；余额有效且日均消耗可估时
  // 附「约可撑 N 天」圆形徽标（A1），点击弹出余额详情；剩余不足 3 天时红色强调。
  const renderBalance = (balance: ProviderBalance | undefined): React.ReactNode => {
    if (balance === undefined) return <span className={css.na}>—</span>
    if (balance.error === 'unconfigured') return t('billing.balanceUnconfigured')
    if (balance.error === 'unauthorized') return t('billing.balanceUnauthorized')
    if (balance.error === 'unreachable') return t('billing.balanceUnreachable')
    if (balance.totalBalance === undefined) return <span className={css.na}>—</span>
    const amount = balance.currency === 'USD'
      ? `$${balance.totalBalance.toFixed(2)}`
      : money(balance.totalBalance)
    // USD 余额按当前汇率折成人民币，与日均消耗（元）同口径。
    const balanceCny = balance.currency === 'USD' ? balance.totalBalance * rateInfo.rate : balance.totalBalance
    const days = dailyBurn > 0 ? Math.floor(balanceCny / dailyBurn) : undefined
    return (
      <span className={css.balanceCell}>
        <span>{amount}</span>
        {days !== undefined && days >= 0 && (
          <button
            type="button"
            className={clsx(css.balanceDaysBadge, days <= 3 && css.balanceDaysBadgeLow)}
            data-testid="billing-balance-days-badge"
            title={t('billing.balanceDays').replace('{days}', String(days))}
            aria-label={`${balance.displayName} ${t('billing.balanceDays').replace('{days}', String(days))}`}
            onClick={() => { setBalanceDetailFor(balanceDetailFor === balance.provider ? undefined : balance.provider) }}
          >
            ?
          </button>
        )}
        {balanceDetailFor === balance.provider && (
          <BalanceDetailPopover
            balance={balance}
            days={days ?? 0}
            dailyBurn={dailyBurn}
            money={money}
            t={t}
            onClose={() => { setBalanceDetailFor(undefined) }}
          />
        )}
      </span>
    )
  }

  const cacheHitRate = total.cacheHit + total.cacheMiss > 0
    ? (total.cacheHit / (total.cacheHit + total.cacheMiss)) * 100
    : 0

  // Latest date from the day series (real data when served, demo otherwise).
  const dates = Object.keys(byDay).sort()
  const today = localDayStamp()
  const todayCost = byDay[today]?.cost ?? 0
  // 当年 / 当月 / 当日 三维：按 byDay 的日期前缀归并（无需额外数据）。
  const monthPrefix = today.slice(0, 7)
  const yearPrefix = today.slice(0, 4)
  const monthCost = dates.reduce((sum, d) => sum + (d.startsWith(monthPrefix) ? (byDay[d]?.cost ?? 0) : 0), 0)
  const monthCalls = dates.reduce((sum, d) => sum + (d.startsWith(monthPrefix) ? (byDay[d]?.calls ?? 0) : 0), 0)
  const yearCost = dates.reduce((sum, d) => sum + (d.startsWith(yearPrefix) ? (byDay[d]?.cost ?? 0) : 0), 0)

  // 本月预计总花费（forecast）：按本月已有记录的平均日消耗 × 本月天数外推的
  // 按量部分 + 各订阅套餐（code 计划）的月度订阅费（dsh-spend 双口径：订阅制
  // 按订阅费计入，按量按 token 估算）。无任何按量记录且无订阅费时为 0。
  const monthCostProjected = useMemo(() => {
    const usageProjected = projectMonthCost(byDay, monthPrefix, today)
    const subscription = quotas.reduce(
      (sum, quota) => sum + (quota.planType === 'code' ? (quota.subscriptionAmount ?? 0) : 0),
      0,
    )
    return usageProjected + subscription
  }, [byDay, monthPrefix, today, quotas])

  // Hero 环形仪表盘：预算启用且有金额时显示「本月已用占预算」；否则回退为
  // 「本月占本年累计」的装饰占比（始终有内容，视觉上是一个完整的仪表盘）。
  const heroGauge = useMemo(() => {
    const budgetPct = budgetEnabled && budgetAmount > 0 ? (monthCost / budgetAmount) * 100 : NaN
    const pct = Number.isFinite(budgetPct)
      ? Math.max(0, Math.min(100, budgetPct))
      : yearCost > 0 ? Math.max(0, Math.min(100, (monthCost / yearCost) * 100)) : 0
    return {
      pct,
      // 超支（>=100% 或用预算口径）时环形转红。
      over: Number.isFinite(budgetPct) && budgetPct >= 100,
      // 有预算时中心标签显示「预算」，否则显示「本月」。
      label: t('billing.budget'),
    }
  }, [budgetEnabled, budgetAmount, monthCost, yearCost, t])

  // 最近 N 天窗口（含今天）：缺失的日期补零，图表固定为整段区间。
  const trendDates = useMemo(() => {
    const out: string[] = []
    for (let offset = trendDays - 1; offset >= 0; offset -= 1) {
      const day = new Date()
      day.setDate(day.getDate() - offset)
      out.push(localDayStamp(day.getTime()))
    }
    return out
  }, [trendDays])
  const latestDate = trendDates.at(-1) ?? today

  // 热力图输入：按日费用（YYYY-MM-DD → 金额）。
  const heatmapDays: HeatmapDay[] = useMemo(
    () => Object.entries(byDay).map(([date, day]) => ({ date, value: day.cost })),
    [byDay],
  )
  // 活跃天数（有调用记录的天数）与连续使用天数（从今天往前连续的活跃日）。
  const activeDays = activeDaysOf(byDay)
  const streakDays = streakDaysOf(byDay)

  // Trend series for the SVG chart: each day's total plus its per-model cost
  // breakdown (byDayModels feeds the stacked columns; absent → single-color).
  const trend: TrendPoint[] = useMemo(
    () => trendDates.map((date) => {
      const byModel: Record<string, number> = {}
      const dayModels = stats.byDayModels?.[date]
      if (dayModels !== undefined) {
        for (const [key, data] of Object.entries(dayModels)) {
          if (data.cost > 0) byModel[key] = data.cost
        }
      }
      const day = byDay[date]
      return {
        date,
        cost: day?.cost ?? 0,
        calls: day?.calls ?? 0,
        byModel,
        tokens: day === undefined ? 0 : day.input + day.output + day.cacheHit + day.cacheMiss,
      }
    }),
    [trendDates, byDay, stats.byDayModels],
  )

  // Model rows: estimated cost from the pricing catalog, actual from stats.
  // 先按费用排序，再按序分配高区分度图表色：品牌色系太接近，无法区分模型。
  const modelRows: ModelRow[] = useMemo(
    () => Object.entries(byModel)
      .filter(([, data]) => data.calls > 0)
      .map(([key, data]) => {
        const entry = modelOf(key)
        // 目录未收录（key 落回「其他」）时：展示真实 model id 而非占位名，
        // 并尝试从 id 反推提供方（B5），否则健康点永远点不亮。
        const uncatalogued = entry.key === 'other'
        const inferredProvider = uncatalogued ? providerFromModelKey(key) : undefined
        const buckets: TokenUsageBuckets = {
          input: data.input,
          cacheHit: data.cacheHit,
          cacheMiss: data.cacheMiss,
          output: data.output,
        }
        return {
          key,
          name: uncatalogued ? key : entry.name,
          provider: inferredProvider ?? entry.provider,
          calls: data.calls,
          input: data.input,
          output: data.output,
          cacheHitRate: data.cacheHit + data.cacheMiss > 0
            ? (data.cacheHit / (data.cacheHit + data.cacheMiss)) * 100
            : 0,
          estimated: computeCost(entry, buckets),
          // 订阅标记来自服务端统计：只有该模型全部调用都走订阅通道才置位
          //（同一模型按量/订阅混合通道时显示实际金额，不误标「订阅包含」）。
          plan: data.plan === true,
          // exactOptionalPropertyTypes: absent actual when the stats carry none.
          ...(data.cost > 0 ? { actual: data.cost } : {}),
          uncatalogued,
          // 目录单价为估算价（未公布官方按量价）：行内标注，避免误当正式定价。
          estimatedPricing: entry.estimated === true,
          officialCalls: data.officialCalls ?? 0,
          officialCost: data.officialCost ?? 0,
        }
      })
      .sort((a, b) => (b.actual ?? b.estimated) - (a.actual ?? a.estimated))
      .map((row, index) => ({
        ...row,
        color: CHART_PALETTE[index % CHART_PALETTE.length] ?? '#8b95a3',
      })),
    [byModel],
  )

  // 官方 vs 三方汇总：官方 = DeepSeek 官方直连（officialCost/officialCalls），
  // 三方 = 总量 - 官方。仅当任一模型实际发生官方/三方费用时展示。
  const bucketSummary = useMemo(() => {
    let officialCost = 0
    let officialCalls = 0
    let thirdCalls = 0
    for (const row of modelRows) {
      const official = row.officialCost
      if (official > 0) officialCost += official
      officialCalls += row.officialCalls
      thirdCalls += Math.max(0, row.calls - row.officialCalls)
    }
    const thirdCost = Math.max(0, (modelRows.reduce((sum, r) => sum + (r.actual ?? 0), 0)) - officialCost)
    if (officialCost <= 0 && thirdCost <= 0 && officialCalls <= 0 && thirdCalls <= 0) return undefined
    return { officialCost, officialCalls, thirdCost, thirdCalls }
  }, [modelRows])

  // 按厂商聚合：模型用量与订阅额度都归并到同一厂商组，余额只在厂商头部显示一次。
  // 厂商组同时容纳非订阅按量模型（无订阅额度也成组）与订阅套餐（无用量也成组）。
  const providerGroups: ProviderBillingGroup[] = useMemo(() => {
    const subscriptionsByVendor = new Map<string, SubscriptionQuota[]>()
    for (const quota of quotas) {
      if (quota.status === 'not-configured') continue
      const vendor = subscriptionVendorOf(quota.provider)
      const list = subscriptionsByVendor.get(vendor)
      if (list === undefined) subscriptionsByVendor.set(vendor, [quota])
      else list.push(quota)
    }
    const modelsByVendor = new Map<string, ModelRow[]>()
    for (const row of modelRows) {
      const list = modelsByVendor.get(row.provider)
      if (list === undefined) modelsByVendor.set(row.provider, [row])
      else list.push(row)
    }
    const names = new Set<string>([...modelsByVendor.keys(), ...subscriptionsByVendor.keys()])
    const groups = [...names]
      .map(name => ({
        name,
        models: modelsByVendor.get(name) ?? [],
        subscriptions: subscriptionsByVendor.get(name) ?? [],
        balance: balanceFor(name),
        dot: providerDot(health, name),
      }))
    // 纯余额组：自定义 Provider（custom: 前缀）或无对应模型/订阅的余额行，
    // 以独立厂商组呈现（内置厂商的「未配置」行不补组，避免噪音）。
    const claimed = new Set(groups.map(group => normalizeProvider(group.name)))
    for (const balance of balances) {
      if (claimed.has(normalizeProvider(balance.provider))) continue
      if (balance.error === undefined || balance.provider.startsWith('custom:')) {
        groups.push({
          name: balance.displayName,
          models: [],
          subscriptions: [],
          balance,
          dot: providerDot(health, balance.displayName),
        })
      }
    }
    return groups
      .sort((a, b) => {
        const costOf = (group: ProviderBillingGroup): number =>
          group.models.reduce((sum, m) => sum + (m.actual ?? m.estimated), 0)
        const diff = costOf(b) - costOf(a)
        if (diff !== 0) return diff
        // 有模型用量的组排在纯订阅组之前；同为纯订阅组保持原顺序（排序稳定）。
        if (a.models.length === 0 && b.models.length === 0) return 0
        if (b.models.length === 0) return -1
        if (a.models.length === 0) return 1
        return a.name.localeCompare(b.name, 'zh')
      })
  }, [modelRows, quotas, balances, health])

  // Total: real stats value when present, otherwise the estimated sum.
  const estimatedTotal = modelRows.reduce((sum, row) => sum + row.estimated, 0)
  const displayTotal = total.cost > 0 ? total.cost : estimatedTotal
  const avgPerCall = total.calls > 0 ? displayTotal / total.calls : 0

  // Trend-chart legend: model rows sort by cost desc, so the stack bottoms
  // with the most expensive model (visually stable baseline).
  const chartModels = useMemo(
    () => modelRows.map(row => ({ key: row.key, name: row.name, color: row.color })),
    [modelRows],
  )

  // Range summary for the hero delta.
  const prevDayCost = trend.length >= 2 ? (trend.at(-2)?.cost ?? 0) : 0
  const deltaPct = prevDayCost > 0 ? ((todayCost - prevDayCost) / prevDayCost) * 100 : 0

  return (
    <Modal open onClose={onClose} title={t('billing.title')} headless className={clsx(css.dashboardModal, 'dsh-billing-modal')}>
      <div className={css.dashboard} data-testid="billing-dashboard">
        {/* Header */}
        <div className={css.dashboardHead} data-testid="billing-dashboard-head">
          <div>
            {/* ZINE: 装饰孔位（head 锚点：窗口 chrome），由主题插件注入；未注入时为空 */}
            {renderSlot('billing.dashboard.decor', { position: 'head' })}
            <div className={css.headTitleRow}>
              <h2 className={css.dashboardTitle}>
                {t('billing.title')}
              </h2>
              {/* ZINE: 装饰孔位（headTitle 锚点：标题胶带） */}
              {renderSlot('billing.dashboard.decor', { position: 'headTitle' })}
            </div>
            <p className={css.dashboardSubtitle}>
              {t('billing.lastUpdated')} {latestDate}
            </p>
          </div>
          <div className={css.dashboardRight}>
            <span className={css.currencyToggle} role="group" aria-label={t('billing.currency')}>
              {(['cny', 'usd'] as const).map(unit => (
                <button
                  key={unit}
                  type="button"
                  className={clsx(css.currencyButton, currency === unit && css.currencyButtonActive)}
                  aria-pressed={currency === unit}
                  data-testid={`billing-currency-${unit}`}
                  title={unit === 'cny' ? t('billing.currencyCny') : t('billing.currencyUsd')}
                  onClick={() => { onCurrency(unit) }}
                >
                  {unit === 'cny' ? '¥' : '$'}
                </button>
              ))}
            </span>
            {health.checked && (
              <span className={clsx(css.healthBadge, health.available ? css.healthBadgeOk : css.healthBadgeBad)}>
                <span className={clsx(css.healthDot, health.available ? css.healthOk : css.healthBad)} aria-hidden="true" />
                {health.available
                  ? `${health.models} 模型可用${health.failures > 0 ? ` · ${health.failures} 厂商失效` : ''}`
                  : `${health.failures} 厂商不可用`}
              </span>
            )}
            <button
              type="button"
              className={css.closeButton}
              aria-label={t('billing.close')}
              data-testid="billing-close"
              onClick={onClose}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab 导航：概览 / 趋势 / 厂商 / 明细（分区后各区块默认展开）。 */}
        <nav className={css.tabNav} data-testid="billing-tab-nav" role="tablist" aria-label={t('billing.title')}>
          {DASHBOARD_TABS.map(item => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={clsx(css.tabButton, tab === item.id && css.tabButtonActive)}
              data-testid={`billing-tab-${item.id}`}
              onClick={() => { setTab(item.id) }}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </nav>

        {/* Scrollable body: 按 Tab 条件渲染分区。 */}
        <div className={css.dashboardBody}>
          {tab === 'overview' && (
            <div className={css.tabPanel} data-testid="billing-tab-panel-overview">
              {/* Hero: 液晶读数大屏 —— 左上「本月费用」大数字液晶表，右上环形仪表盘，底部一条「本年 / 今日 / 本月预计」读数排。 */}
              <section
                className={css.hero}
                data-testid="billing-hero"
              >
                {/* ZINE: 装饰孔位（hero 锚点：撕角便签角标） */}
                {renderSlot('billing.dashboard.decor', { position: 'hero' })}
                <div className={css.heroTop}>
                  <div className={css.heroMain}>
                    <span className={css.heroLabel}>
                      {t('billing.monthCost')}
                    </span>
                    <div className={css.heroReadout}>
                      <span className={css.heroCurrency} aria-hidden="true">{currency === 'usd' ? '$' : '¥'}</span>
                      <span className={css.heroValue}>
                        {money(monthCost).slice(1)}
                      </span>
                    </div>
                    <span className={css.heroMeta}>
                      {monthCalls.toLocaleString()} {t('billing.calls')}
                    </span>
                  </div>
                  {/* 环形仪表盘：SVG stroke-dasharray 画弧，中心显示百分比与标签，
                  超支转红（预算口径下）。无预算时按本月占本年装饰。 */}
                  <div className={css.heroGauge} data-testid="billing-hero-gauge">
                    <svg
                      className={css.heroGaugeSvg}
                      viewBox="0 0 120 120"
                      aria-hidden="true"
                    >
                      <circle className={css.heroGaugeTrack} cx="60" cy="60" r="52" />
                      <circle
                        className={clsx(css.heroGaugeArc, heroGauge.over && css.heroGaugeArcOver)}
                        cx="60"
                        cy="60"
                        r="52"
                        style={{ strokeDasharray: `${(heroGauge.pct / 100) * 326.7} 326.7` }}
                      />
                    </svg>
                    <span className={css.heroGaugeCenter}>
                      <span className={clsx(css.heroGaugePct, heroGauge.over && css.heroGaugePctOver)}>
                        {heroGauge.pct.toFixed(0)}%
                      </span>
                      <span className={css.heroGaugeLabel}>{heroGauge.label}</span>
                    </span>
                  </div>
                </div>
                <div className={css.heroSide}>
                  <div className={css.heroSideItem}>
                    <span className={css.heroSideLabel}>
                      {t('billing.yearCost')}
                    </span>
                    <span className={css.heroSideValue}>
                      {money(yearCost)}
                    </span>
                  </div>
                  <div className={css.heroSideItem}>
                    <span className={css.heroSideLabel}>
                      {t('billing.todayCost')}
                    </span>
                    <span className={css.heroSideValue}>
                      {money(todayCost)}
                      <span className={clsx(css.delta, deltaPct >= 0 ? css.deltaUp : css.deltaDown)}>
                        {deltaPct >= 0 ? '▲' : '▼'} {Math.abs(deltaPct).toFixed(1)}%
                      </span>
                    </span>
                  </div>
                  {monthCostProjected > 0 && (
                    <div className={css.heroSideItem}>
                      <span className={css.heroSideLabel}>
                        {t('billing.monthProjected')}
                      </span>
                      <span className={css.heroSideValue}>
                        {money(monthCostProjected)}
                      </span>
                    </div>
                  )}
                  {/* 无本月预计时用占位行保持读数排三等分。 */}
                  {monthCostProjected <= 0 && <span className={css.heroSideSpacer} aria-hidden="true" />}
                </div>
              </section>

              {/* 未计价模型提示：目录外/无价模型费用按 0 计，提醒用户自查并反馈。 */}
              {(stats.unpricedModels?.length ?? 0) > 0 && (
                <div className={css.unpricedHint} data-testid="billing-unpriced-hint">
                  {t('billing.unpricedHint').replace('{count}', String(stats.unpricedModels?.length ?? 0))}
                </div>
              )}

              {/* KPI grid */}
              <section className={css.kpiGrid} data-testid="billing-kpi-grid">
                <div className={css.kpiTile} data-testid="billing-kpi-tile">
                  <span className={css.kpiLabel}>{t('billing.cacheHitRate')}</span>
                  <span className={clsx(css.kpiValue, css.kpiGreen)}>{formatPercent(cacheHitRate)}</span>
                  <span className={css.kpiDetail}>
                    {formatTokens(total.cacheHit)} / {formatTokens(total.cacheHit + total.cacheMiss)}
                  </span>
                </div>
                <div className={css.kpiTile}>
                  <span className={css.kpiLabel}>{t('billing.tokens')}</span>
                  <span className={css.kpiValue}>{formatTokens(total.input + total.output)}</span>
                  <span className={css.kpiDetail}>
                    {t('billing.inputTokens')} {formatTokens(total.input)} · {t('billing.outputTokens')} {formatTokens(total.output)}
                  </span>
                </div>
                <div className={css.kpiTile}>
                  <span className={css.kpiLabel}>{t('billing.avgCost')}</span>
                  <span className={css.kpiValue}>{money(avgPerCall)}</span>
                  <span className={css.kpiDetail}>{t('billing.calls')} {total.calls.toLocaleString()}</span>
                </div>
                <div className={css.kpiTile}>
                  <span className={css.kpiLabel}>{t('billing.calls')}</span>
                  <span className={css.kpiValue}>{total.calls.toLocaleString()}</span>
                  <span className={css.kpiDetail}>{modelRows.length} {t('billing.models')}</span>
                </div>
              </section>

              {/* 用量热力图：概览常驻区块（月历信息密度高，进入二级 Tab 后不再折叠）。
              头部带「活跃天数 / 连续使用」摘要与 月/年 范围切换。 */}
              <section className={css.panel} data-testid="billing-panel-heatmap">
                <div className={css.panelHead}>
                  <h3 className={css.panelTitle}>
                    {t('billing.heatmap')}
                  </h3>
                  <span className={css.panelHint} data-testid="billing-heatmap-summary">
                    {t('billing.activeDays')} {activeDays} · {t('billing.streakDays')} {streakDays}
                  </span>
                </div>
                <UsageHeatmap days={heatmapDays} currency={currency} t={t} range="month" />
              </section>
            </div>
          )}

          {tab === 'settings' && (
            <div className={css.tabPanel} data-testid="billing-tab-panel-settings">
              <div className={css.settingsHead}>
                <h3 className={css.settingsTitle}>{t('billing.settingsHead')}</h3>
                <p className={css.settingsHint}>{t('billing.settingsHint')}</p>
              </div>
              {/* 月度预算：开关控制显隐（持久化到 localStorage），金额可编辑，宿主 monthlyBudget 作为默认值；超支进度条转红。 */}
              <section className={css.budget} data-testid="billing-budget">
                <div className={css.budgetHead}>
                  <span className={css.budgetLabel}>{t('billing.budget')}</span>
                  <span className={css.budgetControls}>
                    {budgetEnabled && (
                      <span className={css.budgetInputWrap} data-testid="billing-budget-input-wrap">
                        {/* 单位符号：预算以人民币元计，避免误填分/美元。 */}
                        <span className={css.budgetUnit} aria-hidden="true">¥</span>
                        <input
                          className={css.budgetInput}
                          data-testid="billing-budget-input"
                          type="number"
                          min={0}
                          step={1}
                          value={budgetAmount === 0 ? '' : budgetAmount}
                          placeholder={stats.budget !== undefined ? String(stats.budget) : '0'}
                          aria-label={`${t('billing.budget')}（${currency === 'usd' ? 'USD' : 'CNY'}）`}
                          title={`${t('billing.budget')}（${currency === 'usd' ? 'USD' : 'CNY'}）`}
                          onChange={(e) => { onBudgetAmount(e.target.valueAsNumber) }}
                        />
                      </span>
                    )}
                    {budgetEnabled && budgetAmount > 0 && (() => {
                      const pct = (monthCost / budgetAmount) * 100
                      return (
                        <span className={css.budgetValue} data-testid="billing-budget-value">
                          {money(monthCost)} / {money(budgetAmount)} · {pct.toFixed(1)}%
                        </span>
                      )
                    })()}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={budgetEnabled}
                      aria-label={t('billing.budget')}
                      data-testid="billing-budget-toggle"
                      className={clsx(css.switch, budgetEnabled && css.switchOn)}
                      onClick={onToggleBudget}
                    >
                      <span className={css.switchKnob} />
                    </button>
                  </span>
                </div>
                <p className={css.budgetHint}>{t('billing.budgetHint')}</p>
                {budgetEnabled && budgetAmount > 0 && (() => {
                  const pct = (monthCost / budgetAmount) * 100
                  return (
                    <div className={css.budgetTrack} data-testid="billing-budget-track">
                      {/* 分档变色：≥80% 琥珀警示，≥100% 红色脉冲。 */}
                      <div
                        className={clsx(css.budgetFill, pct >= 100 && css.budgetFillOver, pct >= 80 && pct < 100 && css.budgetFillWarn)}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  )
                })()}
              </section>

              {/* 峰谷切换提醒：开关 + 提前量/位置/模式/系统通知 + 预览（偏好持久化到 localStorage）。 */}
              <section className={css.peakAlertPanel} data-testid="billing-peak-alert-settings">
                <div className={css.peakAlertPanelHead}>
                  <span className={css.peakAlertPanelLabel}>{t('billing.peakAlert')}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={peakConfig.enabled}
                    aria-label={t('billing.peakAlert')}
                    data-testid="billing-peak-alert-toggle"
                    className={clsx(css.switch, peakConfig.enabled && css.switchOn)}
                    onClick={() => { onPeakConfig({ ...peakConfig, enabled: !peakConfig.enabled }) }}
                  >
                    <span className={css.switchKnob} />
                  </button>
                </div>
                <p className={css.peakAlertHint}>{t('billing.peakAlertHint')}</p>
                {peakConfig.enabled && (
                  <div className={css.peakAlertPanelBody}>
                    <label className={css.peakAlertField}>
                      <span>{t('billing.peakAlertLeadMin')}</span>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        step={1}
                        value={peakConfig.leadMin}
                        className={css.peakAlertNum}
                        aria-label={t('billing.peakAlertLeadMin')}
                        onChange={(e) => {
                          const v = Number(e.target.valueAsNumber)
                          onPeakConfig({
                            ...peakConfig,
                            leadMin: Number.isFinite(v) ? Math.min(30, Math.max(1, Math.round(v))) : peakConfig.leadMin,
                          })
                        }}
                      />
                    </label>
                    <label className={css.peakAlertField}>
                      <span>{t('billing.peakAlertPosCorner')}</span>
                      <select
                        value={peakConfig.position}
                        className={css.peakAlertSelect}
                        onChange={(e) => { onPeakConfig({ ...peakConfig, position: e.target.value === 'center' ? 'center' : 'bottom-right' }) }}
                      >
                        <option value="bottom-right">{t('billing.peakAlertPosCorner')}</option>
                        <option value="center">{t('billing.peakAlertPosCenter')}</option>
                      </select>
                    </label>
                    <label className={css.peakAlertField}>
                      <span>{t('billing.peakAlert')}</span>
                      <select
                        value={peakConfig.mode}
                        className={css.peakAlertSelect}
                        onChange={(e) => {
                          const m = e.target.value
                          onPeakConfig({ ...peakConfig, mode: m === 'peak' || m === 'offPeak' ? m : 'both' })
                        }}
                      >
                        <option value="both">{t('billing.peakAlertModeBoth')}</option>
                        <option value="peak">{t('billing.peakAlertModePeak')}</option>
                        <option value="offPeak">{t('billing.peakAlertModeOff')}</option>
                      </select>
                    </label>
                    <label className={css.peakAlertCheck}>
                      <input
                        type="checkbox"
                        checked={peakConfig.webNotify}
                        onChange={(e) => { onPeakConfig({ ...peakConfig, webNotify: e.target.checked }) }}
                      />
                      <span>{t('billing.peakAlertWebNotify')}</span>
                    </label>
                    <button type="button" className={css.peakAlertPreview} onClick={onPreviewPeak}>
                      {t('billing.peakAlertPreview')}
                    </button>
                  </div>
                )}
              </section>

              {/* usage_stats 工具开关：设置命名空间持久化（默认关闭，重启生效）。 */}
              <section className={css.budget} data-testid="billing-usage-stats-tool-setting">
                <div className={css.budgetHead}>
                  <span className={css.budgetLabel}>{t('billing.usageStatsTool')}</span>
                  <span className={css.budgetControls}>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={usageStatsEnabled}
                      aria-label={t('billing.usageStatsTool')}
                      data-testid="billing-usage-stats-tool-toggle"
                      className={clsx(css.switch, usageStatsEnabled && css.switchOn)}
                      onClick={toggleUsageStats}
                    >
                      <span className={css.switchKnob} />
                    </button>
                  </span>
                </div>
                <p className={css.budgetHint}>{t('billing.usageStatsToolHint')}</p>
              </section>

              {/* 模型用量悬浮窗：展示模式（综合 / 指定订阅卡）+ 订阅目标多选。 */}
              <section className={css.budget} data-testid="billing-float-setting">
                <div className={css.budgetHead}>
                  <span className={css.budgetLabel}>{t('billing.floatWindow')}</span>
                </div>
                <div className={css.floatModeRow} data-testid="billing-float-mode">
                  <button
                    type="button"
                    className={clsx(css.floatModeBtn, floatPrefs.mode === 'combined' && css.floatModeBtnOn)}
                    data-testid="billing-float-mode-combined"
                    onClick={() => onFloatPrefs({ mode: 'combined', targets: floatPrefs.targets })}
                  >
                    {t('billing.floatModeCombined')}
                  </button>
                  <button
                    type="button"
                    className={clsx(css.floatModeBtn, floatPrefs.mode === 'subscription' && css.floatModeBtnOn)}
                    data-testid="billing-float-mode-subscription"
                    onClick={() => onFloatPrefs({ mode: 'subscription', targets: floatPrefs.targets })}
                  >
                    {t('billing.floatModeSubscription')}
                  </button>
                </div>
                {floatPrefs.mode === 'subscription' && (
                  <div className={css.floatTargets} data-testid="billing-float-targets">
                    {subscriptionOptions.map((option) => {
                      const on = floatPrefs.targets.includes(option.id)
                      return (
                        <label key={option.id} className={css.floatTarget}>
                          <input
                            type="checkbox"
                            checked={on}
                            data-testid={`billing-float-target-${option.id}`}
                            onChange={() => onFloatPrefs({
                              mode: 'subscription',
                              targets: on
                                ? floatPrefs.targets.filter(id => id !== option.id)
                                : [...floatPrefs.targets, option.id],
                            })}
                          />
                          <span className={css.floatTargetLabel}>{option.label}</span>
                        </label>
                      )
                    })}
                    {subscriptionOptions.length === 0 && (
                      <span className={css.budgetHint}>{t('billing.floatNoTargetsHint')}</span>
                    )}
                  </div>
                )}
                <p className={css.budgetHint}>{t('billing.floatWindowHint')}</p>
              </section>

              {/* 插件信息卡：作者 / 仓库 / 版本 / 许可证（设置 Tab 常驻）。 */}
              <PluginInfoCard t={t} version={stats.pluginVersion} />
            </div>
          )}

          {tab === 'trends' && (
            <div className={css.tabPanel} data-testid="billing-tab-panel-trends">
              {/* Trend chart */}
              <section
                className={clsx(css.panel, css.trendPanel)}
                data-testid="billing-panel-trend"
              >
                <div className={css.panelHead}>
                  <h3 className={css.panelTitle}>
                    {t('billing.trend')}
                  </h3>
                  {renderSlot('billing.dashboard.decor', { position: 'trend' })}
                  <span className={css.rangeToggle} role="group" aria-label={t('billing.trend')}>
                    {([7, 30] as const).map(days => (
                      <button
                        key={days}
                        type="button"
                        className={clsx(css.rangeButton, trendDays === days && css.rangeButtonActive)}
                        aria-pressed={trendDays === days}
                        data-testid={`billing-trend-${days}d`}
                        onClick={() => { setTrendDays(days) }}
                      >
                        {days === 7 ? t('billing.trend7d') : t('billing.trend30d')}
                      </button>
                    ))}
                  </span>
                  <span className={css.rangeToggle} role="group" aria-label={t('billing.trendMetric')}>
                    {(['cost', 'tokens'] as const).map(m => (
                      <button
                        key={m}
                        type="button"
                        className={clsx(css.rangeButton, trendMetric === m && css.rangeButtonActive)}
                        aria-pressed={trendMetric === m}
                        data-testid={`billing-trend-metric-${m}`}
                        onClick={() => { setTrendMetric(m) }}
                      >
                        {m === 'cost' ? t('billing.trendMetricCost') : t('billing.trendMetricTokens')}
                      </button>
                    ))}
                  </span>
                  <span className={css.panelHint}>
                    {latestDate}
                  </span>
                </div>
                <TrendChart data={trend} models={chartModels} currency={currency} metric={trendMetric} />
              </section>

              {/* 每轮费用 + 成本突增异常（趋势 Tab 内默认展开）。 */}
              {turns.length > 0 && (
                <section className={css.panel} data-testid="billing-panel-rounds">
                  <div className={css.panelHead}>
                    <h3 className={css.panelTitle}>
                      {t('billing.rounds')}
                    </h3>
                    {roundFlags.length > 0 && (
                      <span className={css.roundsFlagBadge} data-testid="billing-rounds-flag-count">
                        {roundFlags.length} {t('billing.anomaly')}
                      </span>
                    )}
                  </div>
                  <RoundCostChart
                    rounds={turns}
                    flags={roundFlags}
                    currency={currency}
                    t={t}
                  />
                </section>
              )}

              {/* 峰谷时段占比：近 N 轮费用按北京时间高峰/空闲分摊（精确到轮）。 */}
              {turns.length > 0 && (() => {
                const shareTotal = peakShare.peak + peakShare.offPeak
                if (shareTotal <= 0) return null
                const peakPct = (peakShare.peak / shareTotal) * 100
                return (
                  <section className={css.panel} data-testid="billing-panel-share">
                    <div className={css.panelHead}>
                      <h3 className={css.panelTitle}>
                        {t('billing.peakShare')}
                      </h3>
                      <span className={css.panelHint}>
                        {t('billing.peakShareHint').replace('{count}', String(turns.length))}
                      </span>
                    </div>
                    <div className={css.shareTrack} data-testid="billing-share-track">
                      <div className={clsx(css.shareSeg, css.shareSegPeak)} style={{ width: `${peakPct}%` }} />
                      <div className={clsx(css.shareSeg, css.shareSegOff)} style={{ width: `${100 - peakPct}%` }} />
                    </div>
                    <div className={css.shareLegend}>
                      <span className={css.shareItem}>
                        <span className={css.shareDot} style={{ background: 'var(--dsw-static-blue-500)' }} />
                        {t('billing.peak')}
                        <span className={css.shareValue} data-testid="billing-share-peak">
                          {money(peakShare.peak)} · {peakPct.toFixed(1)}%
                        </span>
                      </span>
                      <span className={css.shareItem}>
                        <span className={css.shareDot} style={{ background: 'color-mix(in srgb, var(--dsw-static-blue-500) 30%, var(--dsw-alias-bg-module-platform))' }} />
                        {t('billing.offPeak')}
                        <span className={css.shareValue} data-testid="billing-share-offpeak">
                          {money(peakShare.offPeak)} · {(100 - peakPct).toFixed(1)}%
                        </span>
                      </span>
                    </div>
                  </section>
                )
              })()}
            </div>
          )}

          {tab === 'providers' && (
            <div className={css.tabPanel} data-testid="billing-tab-panel-providers">
              {/* 中转站分布：按 provider 路由的 baseURL 归组（站点/直连/未知路由），
                  与「厂商计费」互补——先看钱从哪个站走，再看厂商明细。 */}
              {stats.bySite !== undefined && Object.keys(stats.bySite).length > 0 && (
                <section className={css.panel} data-testid="billing-panel-relay-sites">
                  <div className={css.panelHead}>
                    <h3 className={css.panelTitle}>{t('billing.panelRelay')}</h3>
                  </div>
                  <div className={css.providerGroupList} data-testid="billing-relay-sites">
                    {Object.entries(stats.bySite)
                      .sort((a, b) => (b[1].cost ?? 0) - (a[1].cost ?? 0))
                      .map(([siteKey, usage]) => {
                        const site = siteBucketLabel(siteKey, t)
                        return (
                          <div key={siteKey} className={css.siteRow} data-testid="billing-relay-site">
                            <span className={css.siteRowName}>
                              <span className={clsx(css.siteKindTag, SITE_KIND_CLASS[site.kind])}>{siteKindText(site.kind, t)}</span>
                              <span className={css.siteRowTitle}>{site.name}</span>
                            </span>
                            <span className={css.siteRowMeta}>
                              <span className={css.siteRowCost}>{money(usage.cost)}</span>
                              <span className={css.siteRowCalls}>{usage.calls} {t('billing.relayCalls')}</span>
                            </span>
                          </div>
                        )
                      })}
                  </div>
                </section>
              )}

              {/* 中转站额度：识别出的 New API / Sub2API 的余额与滚动窗口。 */}
              {relayQuotas.length > 0 && (
                <section className={css.panel} data-testid="billing-panel-relay-quota">
                  <div className={css.panelHead}>
                    <h3 className={css.panelTitle}>{t('billing.panelRelayQuota')}</h3>
                  </div>
                  <div className={css.providerGroupList} data-testid="billing-relay-quotas">
                    {relayQuotas.map(row => (
                      <div key={row.route} className={css.siteRow} data-testid="billing-relay-quota">
                        <span className={css.siteRowName}>
                          <span className={clsx(css.siteKindTag, RELAY_KIND_CLASS[row.kind])}>{relayKindText(row.kind, t)}</span>
                          <span className={css.siteRowTitle}>{row.origin}</span>
                        </span>
                        <span className={css.siteRowMeta}>
                          {row.balance !== undefined && (
                            <span className={css.siteRowCost}>{t('billing.relayBalance')} {row.balance.toFixed(2)}</span>
                          )}
                          {(row.windows?.length ?? 0) > 0
                            ? row.windows?.map(window => {
                              const low = window.remainingPercent < 20
                              return (
                                <span key={window.kind} className={clsx(css.siteRowCalls, low && css.siteRowCallsLow)}>{t('billing.relayWindowUsed')} {window.usedPercent}%</span>
                              )
                            })
                            : <span className={css.siteRowCalls}>{t('billing.relayNoQuota')}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {/* 厂商计费与订阅：单一容器按厂商聚合模型用量与订阅额度。
              厂商组同时容纳非订阅按量模型（无订阅额度也成组）与订阅套餐
              （无用量也成组）；余额与健康点只在厂商头部显示一次。 */}
              <section className={css.panel} data-testid="billing-panel-providers">
                <div className={css.panelHead}>
                  <h3 className={css.panelTitle}>
                    {t('billing.providerBilling')}
                  </h3>
                  {renderSlot('billing.dashboard.decor', { position: 'models' })}
                  {/* 更新时间精确到时分秒；旧快照没有时间戳时留空。 */}
                  <span className={css.panelHint}>
                    {stats.updatedAt !== undefined
                      ? `${t('billing.lastUpdated')} ${formatClock(stats.updatedAt)}`
                      : ''}
                  </span>
                </div>
                {quotasStale && (
                  <div className={css.staleNotice} data-testid="billing-subscriptions-stale">
                    {t('billing.subscriptionsStale')}
                  </div>
                )}
                {providerGroups.length === 0 ? (
                  <div className={css.emptyRow} data-testid="billing-provider-empty">
                    {t('billing.noData')}
                  </div>
                ) : (
                  <div className={css.providerGroupList} data-testid="billing-provider-groups">
                    {providerGroups.map(group => (
                      <div key={group.name} className={css.providerGroup} data-testid="billing-provider-group">
                        {/* 厂商组头部：厂商名 + 健康点 + 订阅套数 + 厂商余额（只显示一次）。 */}
                        <div className={css.providerGroupHead}>
                          <span className={css.providerGroupTitle}>
                            <span className={clsx(css.healthDot, group.dot)} aria-hidden="true" />
                            <span className={css.providerGroupName}>{providerName(group.name)}</span>
                          </span>
                          <span className={css.providerGroupMeta}>
                            {group.subscriptions.length > 0 && (
                              <span className={css.providerGroupBadge} data-testid="billing-provider-sub-count">
                                {group.subscriptions.length} 套餐
                              </span>
                            )}
                            {!hideBalanceForGroup(group) && group.balance !== undefined && (
                              <span className={css.providerGroupBalance} data-testid="billing-provider-balance">
                                <span className={css.providerGroupBalanceLabel}>{t('billing.balance')}</span>
                                {renderBalance(group.balance)}
                              </span>
                            )}
                          </span>
                        </div>
                        {/* 模型用量子表：无余额列（余额已在厂商头部显示一次）。 */}
                        {group.models.length > 0 && (
                          <div className={clsx(css.tableScroll, css.modelTableScroll)} data-testid="billing-table-scroll">
                            <table className={css.modelTable}>
                              <thead>
                                <tr>
                                  <th>{t('billing.model')}</th>
                                  <th className={css.numCol}>{t('billing.calls')}</th>
                                  <th className={css.numCol}>{t('billing.inputTokens')}</th>
                                  <th className={css.numCol}>{t('billing.outputTokens')}</th>
                                  <th className={css.numCol}>{t('billing.cacheHitRate')}</th>
                                  <th className={css.numCol}>{t('billing.actual')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.models.map(row => (
                                  <tr key={row.key}>
                                    <td>
                                      <span className={css.modelCell}>
                                        <span>
                                          <span className={css.modelName}>
                                            {row.name}
                                            {/* 未收录：真实 id 不在计费目录，费用按兜底档估算，明确标注。 */}
                                            {row.uncatalogued && (
                                              <span className={css.uncataloguedTag} data-testid="billing-uncatalogued-tag">
                                                {t('billing.uncatalogued')}
                                              </span>
                                            )}
                                            {/* 估算价：厂商未公布官方按量单价，避免误当正式定价。 */}
                                            {row.estimatedPricing && (
                                              <span className={css.estimatedTag} data-testid="billing-estimated-tag">
                                                {t('billing.estimatedPricing')}
                                              </span>
                                            )}
                                          </span>
                                          <span className={css.modelProvider}>{providerName(row.provider)}</span>
                                        </span>
                                      </span>
                                    </td>
                                    <td className={css.numCol}>{row.calls.toLocaleString()}</td>
                                    <td className={css.numCol}>{formatTokens(row.input)}</td>
                                    <td className={css.numCol}>{formatTokens(row.output)}</td>
                                    <td className={css.numCol}>{formatPercent(row.cacheHitRate)}</td>
                                    <td className={css.numCol}>
                                      {row.plan
                                        ? <span className={css.planTag}>{t('billing.subscriptionIncluded')}</span>
                                        : row.actual !== undefined
                                          ? (() => {
                                            const official = row.officialCost
                                            const third = row.actual - official
                                            // 纯官方 / 纯三方 / 混合三态：混合时分解展示。
                                            if (official > 0 && third > 0) {
                                              return (
                                                <span className={css.bucketCost}>
                                                  <span className={css.bucketOfficial}>{money(official)}</span>
                                                  <span className={css.bucketSep}>/</span>
                                                  <span className={css.bucketThird}>{money(third)}</span>
                                                </span>
                                              )
                                            }
                                            return money(row.actual)
                                          })()
                                          : <span className={css.na}>—</span>}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {/* 订阅额度卡片：归并到对应模型厂商，随厂商组展示。 */}
                        {group.subscriptions.length > 0 && (
                          <div className={css.subscriptionGrid} data-testid="billing-subscriptions-grid">
                            {group.subscriptions.map((quota) => {
                              const statusText = subscriptionStatusText(quota.status, t)
                              return (
                                <div key={quota.provider} className={css.subscriptionCard} data-testid="billing-subscription-card">
                                  <div className={css.subscriptionHead}>
                                    <span className={css.subscriptionName}>{providerName(quota.displayName)}</span>
                                    {/* plan 双口径徽标（dsh-spend）：订阅制/按量；订阅制附月费。 */}
                                    {quota.planType === 'code' && (() => {
                                      // 档位知识自动识别（原生币月费 + 周期额度口径）；无档位时回退 CNY 月费。
                                      const tier = tierInfoOf(quota.provider)
                                      const tierFee = tier !== undefined
                                        ? t('billing.subscriptionFeePerMonth').replace('{amount}', tier.currency === 'USD' ? `$${tier.amount}` : `¥${tier.amount}`)
                                        : undefined
                                      return (
                                        <span className={css.subscriptionPlan} data-kind="code">
                                          {tierFee ?? (quota.subscriptionAmount !== undefined && quota.subscriptionAmount > 0
                                            ? t('billing.subscriptionFeePerMonth').replace('{amount}', money(quota.subscriptionAmount))
                                            : t('billing.planTypeCode'))}
                                          {tier?.label !== undefined && (
                                            <span className={css.subscriptionTier} data-testid={`billing-tier-${quota.provider}`}>
                                              {tier.label}
                                            </span>
                                          )}
                                          {tier !== undefined && (
                                            <span className={css.subscriptionAuto} data-testid={`billing-auto-${quota.provider}`}>
                                              {t('billing.subscriptionAutoDetect')}
                                            </span>
                                          )}
                                        </span>
                                      )
                                    })()}
                                    {quota.planType === 'token' && <span className={css.subscriptionPlan} data-kind="token">{t('billing.planTypeToken')}</span>}
                                    {quota.plan !== undefined && <span className={css.subscriptionPlan}>{quota.plan}</span>}
                                  </div>
                                  {statusText !== '' && <div className={css.subscriptionStatus}>{statusText}</div>}
                                  {quota.windows.length === 0 && statusText === '' && (
                                    <div className={css.subscriptionStatus}>{t('billing.subscriptionNoApi')}</div>
                                  )}
                                  {quota.windows.map(window => (() => {
                                    const used = Math.min(100, Math.max(0, window.usedPercent))
                                    const remaining = Math.min(100, Math.max(0, window.remainingPercent))
                                    const exhausted = remaining <= 0
                                    return (
                                      <div key={window.kind} className={css.subscriptionWindow}>
                                        <span className={css.subscriptionWindowLabel}>{subscriptionWindowLabel(window.kind, t)}</span>
                                        <span className={css.subscriptionTrack} aria-hidden="true">
                                          {/* 进度条按「已用」比例填充（与预算条同语义）：用尽时满格红，行恒可见。 */}
                                          <span
                                            className={clsx(
                                              css.subscriptionFill,
                                              used >= 100 && css.subscriptionFillOver,
                                              used >= 80 && used < 100 && css.subscriptionFillWarn,
                                            )}
                                            style={{ width: `${used}%` }}
                                          />
                                        </span>
                                        <span className={css.subscriptionMeta}>
                                          <span className={clsx(css.subscriptionPct, exhausted && css.subscriptionExhausted)}>
                                            {exhausted
                                              ? t('billing.subscriptionExhausted')
                                              : t('billing.subscriptionRemaining').replace('{pct}', String(window.remainingPercent))}
                                          </span>
                                          {window.resetsAt !== undefined && (
                                            <span className={css.subscriptionReset}>
                                              {/* 重置时间完整显示（本地时区）；与「剩余%」上下排布，不再横挤进度条。 */}
                                              {t('billing.subscriptionReset').replace('{date}', `${localDayStamp(new Date(window.resetsAt).getTime())} ${formatClock(new Date(window.resetsAt).getTime())}`)}
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    )
                                  })())}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
              {/* 数据导出：按日 / 按会话 CSV 与全量 JSON（对账用），文件名带日期范围。 */}
              <div className={css.exportBar} data-testid="billing-export-bar" role="group" aria-label={t('billing.export')}>
                <span className={css.exportLabel}>{t('billing.export')}</span>
                <button
                  type="button"
                  className={css.exportButton}
                  data-testid="billing-export-day"
                  onClick={() => { downloadText(exportFileName('usage-daily', 'csv', Object.keys(byDay)), dayRowsCsv(byDay), 'text/csv') }}
                >
                  {t('billing.exportCsvDay')}
                </button>
                {stats.bySession !== undefined && (
                  <button
                    type="button"
                    className={css.exportButton}
                    data-testid="billing-export-sessions"
                    onClick={() => { downloadText(exportFileName('usage-sessions', 'csv', Object.keys(byDay)), sessionRowsCsv(stats.bySession ?? []), 'text/csv') }}
                  >
                    {t('billing.exportCsvSession')}
                  </button>
                )}
                {stats.bySite !== undefined && (
                  <button
                    type="button"
                    className={css.exportButton}
                    data-testid="billing-export-sites"
                    onClick={() => { downloadText(exportFileName('usage-sites', 'csv', Object.keys(byDay)), siteRowsCsv(stats.bySite ?? {}), 'text/csv') }}
                  >
                    {t('billing.exportCsvSite')}
                  </button>
                )}
                <button
                  type="button"
                  className={css.exportButton}
                  data-testid="billing-export-json"
                  onClick={() => { downloadText(exportFileName('usage-stats', 'json', Object.keys(byDay)), JSON.stringify(stats, null, 2), 'application/json') }}
                >
                  {t('billing.exportJson')}
                </button>
              </div>
              {/* 费用构成（估算）：输出成本实测计价，输入成本按 user/tool 消息
              文本长度占比摊分（日志无角色级 token 实测，标注估算口径）。 */}
              {roleRows.length > 0 && (
                <section className={css.panel} data-testid="billing-panel-roles">
                  <div className={css.panelHead}>
                    <h3 className={css.panelTitle}>
                      {t('billing.roleCost')}
                    </h3>
                    <span className={css.panelHint}>
                      {t('billing.roleHint')}
                    </span>
                  </div>
                  <div className={css.shareTrack} data-testid="billing-role-track">
                    {roleRows.map(row => (
                      <div key={row.label} className={clsx(css.shareSeg, row.seg)} style={{ width: `${row.pct}%` }} />
                    ))}
                  </div>
                  <div className={css.shareLegend}>
                    {roleRows.map(row => (
                      <span key={row.label} className={css.shareItem}>
                        <span className={clsx(css.shareDot, row.seg)} />
                        {row.label}
                        <span className={css.shareValue}>
                          {money(row.value)} · {row.pct.toFixed(1)}%
                        </span>
                      </span>
                    ))}
                  </div>
                </section>
              )}
              {/* 官方 vs 三方汇总：官方 = DeepSeek 官方直连，三方 = 其余中转/代理。 */}
              {bucketSummary !== undefined && (
                <section className={css.panel} data-testid="billing-panel-buckets">
                  <div className={css.panelHead}>
                    <h3 className={css.panelTitle}>
                      {t('billing.official')} / {t('billing.thirdParty')}
                    </h3>
                  </div>
                  <div className={css.bucketSummary}>
                    <div className={css.bucketStat}>
                      <span className={css.bucketStatLabel}>{t('billing.official')}</span>
                      <span className={css.bucketStatValue}>{money(bucketSummary.officialCost)}</span>
                      <span className={css.bucketStatSub}>{bucketSummary.officialCalls} {t('billing.calls')}</span>
                    </div>
                    <div className={css.bucketStat}>
                      <span className={css.bucketStatLabel}>{t('billing.thirdParty')}</span>
                      <span className={css.bucketStatValue}>{money(bucketSummary.thirdCost)}</span>
                      <span className={css.bucketStatSub}>{bucketSummary.thirdCalls} {t('billing.calls')}</span>
                    </div>
                  </div>
                </section>
              )}
              {/* 工作区统计：按 cwd 末级目录归并。 */}
              {stats.byWorkspace !== undefined && stats.byWorkspace.length > 0 && (
                <section className={css.panel} data-testid="billing-panel-workspaces">
                  <div className={css.panelHead}>
                    <h3 className={css.panelTitle}>
                      {t('billing.workspaces')}
                    </h3>
                  </div>
                  <div className={css.tableScroll}>
                    <table className={css.modelTable}>
                      <thead>
                        <tr>
                          <th>{t('billing.project')}</th>
                          <th className={css.numCol}>{t('billing.calls')}</th>
                          <th className={css.numCol}>{t('billing.inputTokens')}</th>
                          <th className={css.numCol}>{t('billing.outputTokens')}</th>
                          <th className={css.numCol}>{t('billing.actual')}</th>
                          <th className={css.numCol}>{t('billing.lastActive')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.byWorkspace.map(row => (
                          <Fragment key={row.name}>
                            <tr onClick={() => { setExpandedProject(expandedProject === row.name ? undefined : row.name) }} style={{ cursor: 'pointer' }}>
                              <td><span className={css.modelName}>{row.name}</span></td>
                              <td className={css.numCol}>{row.calls.toLocaleString()}</td>
                              <td className={css.numCol}>{formatTokens(row.input)}</td>
                              <td className={css.numCol}>{formatTokens(row.output)}</td>
                              <td className={css.numCol}>{money(row.cost)}</td>
                              <td className={css.numCol}>
                                {row.lastActive > 0 ? `${localDayStamp(row.lastActive)}` : '—'}
                              </td>
                            </tr>
                            {/* 项目下钻：展开时列出该项目成本最高的会话（最多 5 条）。 */}
                            {expandedProject === row.name && (
                              <tr>
                                <td colSpan={6} style={{ padding: '0' }}>
                                  <table className={css.modelTable} style={{ margin: 0, border: 'none', background: 'var(--dsw-alias-bg-layer-1)' }}>
                                    <tbody>
                                      {stats.bySession
                                        ?.filter(s => projectName(s.cwd) === row.name)
                                        .slice(0, 5)
                                        .map(s => (
                                          <tr key={s.id}>
                                            <td><span className={css.modelName}>{s.title ?? s.id.slice(0, 8)}</span></td>
                                            <td className={css.numCol}>{s.calls.toLocaleString()}</td>
                                            <td className={css.numCol}>{money(s.cost)}</td>
                                            <td className={css.numCol}>{localDayStamp(s.lastActive)}</td>
                                          </tr>
                                        ))}
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
              {/* 会话明细：按费用倒序，回答「钱花在哪」。 */}
              {stats.bySession !== undefined && (
                <section className={css.panel} data-testid="billing-panel-sessions">
                  <div className={css.panelHead}>
                    <h3 className={css.panelTitle}>
                      {t('billing.sessions')}
                    </h3>
                    <span className={css.panelHint}>
                      {stats.bySession.length > SESSION_DISPLAY_LIMIT
                        ? t('billing.sessionOverflow')
                          .replace('{limit}', String(SESSION_DISPLAY_LIMIT))
                          .replace('{total}', String(stats.bySession.length))
                        : `${stats.bySession.length}`}
                    </span>
                  </div>
                  <div className={css.tableScroll} data-testid="billing-sessions-table">
                    <table className={css.modelTable}>
                      <thead>
                        <tr>
                          <th>{t('billing.sessions')}</th>
                          <th>{t('billing.project')}</th>
                          <th className={css.numCol}>{t('billing.calls')}</th>
                          <th className={css.numCol}>{t('billing.actual')}</th>
                          <th className={css.numCol}>{t('billing.lastActive')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.bySession.length === 0 && (
                          <tr>
                            <td colSpan={5} className={css.emptyRow}>{t('billing.noData')}</td>
                          </tr>
                        )}
                        {stats.bySession.slice(0, SESSION_DISPLAY_LIMIT).map(row => (
                          <tr key={row.id}>
                            <td>
                              <span className={css.modelName}>{row.title ?? row.id.slice(0, 8)}</span>
                            </td>
                            <td>
                              <span className={css.modelProvider}>{projectName(row.cwd) ?? '—'}</span>
                            </td>
                            <td className={css.numCol}>{row.calls.toLocaleString()}</td>
                            <td className={css.numCol}>{money(row.cost)}</td>
                            <td className={css.numCol}>
                              {row.lastActive > 0 ? `${localDayStamp(row.lastActive)} ${formatClock(row.lastActive)}` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          )}

          {tab === 'token' && (
            <div className={css.tabPanel} data-testid="billing-tab-panel-token">
              {/* Token 洞察：独立于费用的 token 统计（每日堆叠 / 模型占比 / 结构 KPI / 导出）。 */}
              <TokenPanel stats={stats} currency={currency} trendDays={trendDays} onTrendDays={setTrendDays} t={t} />
              {/* 性能：按模型 TTFT/P50/P90/生成速度/总延迟 + 按小时曲线（并入「用量」分区）。 */}
              {stats.perf !== undefined && (
                <section className={css.panel} data-testid="billing-panel-perf">
                  <div className={css.panelHead}>
                    <h3 className={css.panelTitle}>
                      {t('billing.perfTitle')}
                    </h3>
                    <span className={css.panelHint}>
                      {t('billing.perfHint')}
                    </span>
                  </div>
                  <PerfPanel perf={stats.perf} models={chartModels} t={t} />
                </section>
              )}
            </div>
          )}

          {tab === 'pricing' && (
            <div className={css.tabPanel} data-testid="billing-tab-panel-pricing">
              {/* 模型单价表：独立 Tab 常驻展开，附汇率来源徽标。 */}
              <section
                className={css.panel}
                data-testid="billing-panel-pricing"
              >
                <div className={css.panelHead}>
                  <h3 className={css.panelTitle}>
                    {t('billing.pricing')}
                  </h3>
                  <span className={css.panelHint}>
                    {t('billing.todayRate')} 1 USD = {formatMoney(rateInfo.rate)}
                    <span className={clsx(css.rateBadge, rateInfo.live ? css.rateBadgeLive : css.rateBadgeBuiltin)}>
                      {rateInfo.live ? t('billing.rateLive') : t('billing.rateBuiltin')}
                    </span>
                  </span>
                </div>
                <p className={css.pricingTip}>{t('billing.pricingTip')}</p>
                <div className={css.tableScroll}>
                  <table className={css.pricingTable}>
                    <thead>
                      <tr>
                        <th>Model</th>
                        <th className={css.numCol}>{t('billing.input')}</th>
                        <th className={css.numCol}>{t('billing.cacheHit')}</th>
                        <th className={css.numCol}>{t('billing.output')}</th>
                        <th>{t('billing.band')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catalogEntries().map((entry) => {
                        const hasPrice = entry.price.input > 0 || entry.price.output > 0
                        return (
                          <tr key={entry.key}>
                            <td>
                              <span className={css.modelCell}>
                                <span className={css.modelDot} style={{ background: resolveToken(entry.colorVar) }} />
                                <span>
                                  <span className={css.modelName}>
                                    {entry.name}
                                    {/* 探活命中但无内置/models.dev 价：明确标注，不参与计价。 */}
                                    {entry.uncatalogued && (
                                      <span className={css.uncataloguedTag} data-testid="billing-price-uncatalogued">
                                        {t('billing.uncatalogued')}
                                      </span>
                                    )}
                                  </span>
                                  <span className={css.modelProvider}>{providerName(entry.provider)}</span>
                                </span>
                              </span>
                            </td>
                            <td className={css.numCol}>
                              {hasPrice ? entry.price.offPeak !== undefined
                                ? (
                                  <span className={css.bandPrice}>
                                    <span>{unitMoney(entry.price.input, entry.price.currency)}</span>
                                    <span className={css.bandPriceOff}>{unitMoney(entry.price.offPeak.input, entry.price.currency)}</span>
                                  </span>
                                )
                                : unitMoney(entry.price.input, entry.price.currency)
                                : <span className={css.na}>—</span>}
                            </td>
                            <td className={css.numCol}>
                              {hasPrice ? entry.price.offPeak !== undefined
                                ? (
                                  <span className={css.bandPrice}>
                                    <span>{unitMoney(entry.price.cacheHit, entry.price.currency)}</span>
                                    <span className={css.bandPriceOff}>
                                      {unitMoney(entry.price.offPeak.cacheHit, entry.price.currency)}
                                    </span>
                                  </span>
                                )
                                : unitMoney(entry.price.cacheHit, entry.price.currency)
                                : <span className={css.na}>—</span>}
                            </td>
                            <td className={css.numCol}>
                              {hasPrice ? entry.price.offPeak !== undefined
                                ? (
                                  <span className={css.bandPrice}>
                                    <span>{unitMoney(entry.price.output, entry.price.currency)}</span>
                                    <span className={css.bandPriceOff}>
                                      {unitMoney(entry.price.offPeak.output, entry.price.currency)}
                                    </span>
                                  </span>
                                )
                                : unitMoney(entry.price.output, entry.price.currency)
                                : <span className={css.na}>—</span>}
                            </td>
                            <td>
                              {entry.price.offPeak !== undefined && entry.peakHours !== undefined
                                ? (
                                  <span className={css.bandTag}>
                                    <span>{t('billing.peak')} {entry.peakHours}</span>
                                    <span className={css.bandTagOff}>{t('billing.offPeak')} 50%</span>
                                  </span>
                                )
                                : <span className={css.flatTag}>{t('billing.flat')}</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* ZINE: 装饰孔位（footer 锚点：条码装饰底部），所有 Tab 共享常驻。 */}
          {renderSlot('billing.dashboard.decor', { position: 'footer' })}
        </div>
      </div>
    </Modal>
  )
}

/**
 * UsageBilling: sidebar trigger plus the billing dashboard modal.
 * @param props - framework-provided sidebar and locale props.
 */
export function UsageBilling(props: UsageBillingProps): React.ReactNode {
  const { t: hostT, checkModels, publishCosts, registerOpen, renderSlot, useStore, actions } = props
  // Start empty; swap in real host data when the server serves valid JSON.
  const [stats, setStats] = useState<UsageStats>(EMPTY_STATS)
  const [health, setHealth] = useState<ModelHealth>(IDLE_HEALTH)
  const [balances, setBalances] = useState<readonly ProviderBalance[]>([])
  const [quotas, setQuotas] = useState<readonly SubscriptionQuota[]>([])
  // 订阅刷新是否失败：失败时保留上次成功快照并标记 stale（展示「缓存」）。
  const [quotasStale, setQuotasStale] = useState(false)
  const [relayQuotas, setRelayQuotas] = useState<readonly RelayQuota[]>([])
  const [currency, setCurrency] = useState<CostCurrency>('cny')
  // 模型用量悬浮窗偏好：localStorage 持久化（修改即写回，仅 client 侧）。
  const [floatPrefs, setFloatPrefs] = useState<FloatWindowPrefs>(() => loadFloatWindowPrefs())
  const updateFloatPrefs = useCallback((next: FloatWindowPrefs): void => {
    setFloatPrefs(next)
    saveFloatWindowPrefs(next)
  }, [])
  // 严格联动（仅本插件，不影响宿主全局语言）：币种=USD 时面板文案切英文，CNY 时切中文。
  // 用本包自带 zh/en 字典构建本地 t；key 未覆盖时回退宿主 t。
  const lang = currency === 'usd' ? 'en' : 'zh'
  const t = useCallback((key: Parameters<typeof hostT>[0], params?: Record<string, unknown>): string => {
    const dict = lang === 'en' ? en : zh
    // LocaleKeysOf 可能带额外 key，字典查找时收窄为本包声明的 UsageBillingKey。
    const text = dict[key as UsageBillingKey] ?? hostT(key)
    if (params === undefined) return text
    let out = text
    for (const [k, v] of Object.entries(params)) out = out.replaceAll(`{${k}}`, String(v))
    return out
  }, [lang, hostT])
  const [open, setOpen] = useState(false)
  const close = useCallback(() => { setOpen(false) }, [])

  // 重新拉取统计与余额：初次挂载、打开弹窗、弹窗期间轮询共用同一入口。
  const reloadStats = useCallback(() => {
    void loadUsageStats().then((data) => {
      if (data !== null) setStats(data)
    })
    void fetchBalances().then((list) => {
      if (list.length > 0) setBalances(list)
    })
    void fetchSubscriptions().then((list) => {
      if (list.length > 0) {
        setQuotas(list)
        setQuotasStale(false)
      } else {
        // 成功但无订阅数据：非 stale。
        setQuotasStale(false)
      }
    }).catch(() => {
      // 刷新失败：保留上次成功快照，标记缓存（stale）。
      setQuotasStale(true)
    })
    void fetchRelayQuotas().then((list) => {
      if (list.length > 0) setRelayQuotas(list)
    })
  }, [])

  const openDashboard = useCallback(() => {
    // 打开弹窗时先刷新一次统计与定价，避免看到的是上次挂载的旧数据。
    void reloadStats()
    void loadLivePricing()
    setOpen(true)
  }, [reloadStats])

  // Load stats on mount; also apply the live pricing snapshot in parallel.
  useEffect(() => {
    void reloadStats()
    void loadLivePricing()
  }, [reloadStats])

  // 常驻定时刷新统计与定价：左下角触发器与弹窗都保持最新，无需退出重进。
  useEffect(() => {
    const timer = setInterval(() => {
      void reloadStats()
      void loadLivePricing()
    }, STATS_REFRESH_INTERVAL_MS)
    return () => { clearInterval(timer) }
  }, [reloadStats])

  // Probe connected models: the sidebar dot turns green when any provider
  // answers its model catalog (live credentials), red when none do. 探活的
  // 模型清单（系统里实际配置/预制）同步注入 pricing，费率表据此对标显示。
  useEffect(() => {
    let mounted = true
    void checkModels().then((result) => {
      if (!mounted) return
      setHealth(result)
      applyLiveCatalogModels(result.catalog ?? [])
    })
    return () => { mounted = false }
  }, [checkModels])

  const today = localDayStamp()
  // 触发胶囊的主数字：当月累计（byDay 按 YYYY-MM 前缀归并）。
  const monthCost = Object.entries(stats.byDay)
    .filter(([date]) => date.startsWith(today.slice(0, 7)))
    .reduce((sum, [, day]) => sum + day.cost, 0)
  const todayCost = stats.byDay[today]?.cost ?? 0
  // 触发卡 hover 速览：本周累计 + 近 7 天迷你柱。
  const weekCost = lastSevenDays(stats.byDay).reduce((sum, d) => sum + d.cost, 0)
  const last7 = useMemo(() => lastSevenDays(stats.byDay), [stats.byDay])

  // 预算偏好：开关与金额经框架 store 读取；用户金额优先，宿主 monthlyBudget
  //（stats.budget）兜底为默认值。
  const budgetEnabled = useStore(s => s.enabled)
  const budgetAmount = useStore(s => s.amount)
  const tierAlertDays = useStore(s => s.tierAlertDays)
  const lastTierSwitchAt = useStore(s => s.lastTierSwitchAt)
  // 峰谷提醒偏好：localStorage 持久化；「同一切换点只提醒一次」由 budget store 去重。
  const [peakConfig, setPeakConfig] = useState<PeakAlertConfig>(() => loadPeakAlertConfig())
  const [peakHit, setPeakHit] = useState<PeakAlertHit | null>(null)
  const [peakPreview, setPeakPreview] = useState<PeakAlertHit | null>(null)
  const updatePeakConfig = useCallback((config: PeakAlertConfig) => {
    setPeakConfig(config)
    savePeakAlertConfig(config)
  }, [])
  const previewPeak = useCallback(() => {
    // 预览：3 分钟后进入与当前相反的档位（不触真实去重，关闭即消失）。
    setPeakPreview({ entering: tierAt(Date.now()) === 'peak' ? 'offPeak' : 'peak', atMs: Date.now() + 3 * 60_000 })
  }, [])
  const effectiveBudget = budgetAmount > 0 ? budgetAmount : (stats.budget ?? 0)
  const toggleBudget = useCallback(() => {
    const next = !budgetEnabled
    actions.setEnabled(next)
    // 开启预算的手势顺带申请通知权限：授权后跨档才会弹系统通知。
    if (next && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
  }, [actions, budgetEnabled])

  // 预算分档提醒：跨过 50% / 80% / 100% 时桌面通知（每档每天最多一次，标记
  // 持久化跨重启生效）。一次检查跨多档时只发最高档，并把跨过的档全部标记为
  // 当日已提醒；Notification 不可用或未授权时跳过——进度条分档变色（琥珀/红）
  // 始终留在界面上兜底。
  useEffect(() => {
    if (!budgetEnabled || effectiveBudget <= 0) return
    const pct = (monthCost / effectiveBudget) * 100
    const day = localDayStamp()
    const crossed = BUDGET_ALERT_TIERS.filter(tier => pct >= tier && tierAlertDays?.[String(tier)] !== day)
    if (crossed.length === 0) return
    const top = crossed[crossed.length - 1] ?? 100
    actions.markTierAlerted(crossed, day)
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const body = t('billing.budgetTierBody')
      .replace('{cost}', formatMoney(monthCost))
      .replace('{budget}', formatMoney(effectiveBudget))
      .replace('{pct}', String(top))
    // 通知发送失败（部分平台限制）不影响标记：当天不再重试，避免轮询轰炸。
    try {
      new Notification(t('billing.budget'), { body })
    } catch {
      // 平台拒绝构造通知：静默跳过，进度条分档变色兜底。
    }
  }, [budgetEnabled, effectiveBudget, monthCost, tierAlertDays, actions, t])

  // 峰/谷切换前提醒（增强版）：距进入下一档不足提前量且该切换点未提醒过时，
  // 弹可视化浮层 +（可选的）系统通知。`lastTierSwitchAt` 去重跨重启生效，
  // 与旧的系统通知共用同一份去重，避免一条切换提醒弹两次。
  useEffect(() => {
    const upcoming = computePeakAlert(Date.now(), peakConfig, lastTierSwitchAt)
    if (upcoming === null) return
    actions.markTierSwitchAlerted(upcoming.atMs)
    setPeakHit(upcoming)
    if (!peakConfig.webNotify) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const minutes = Math.max(1, Math.round((upcoming.atMs - Date.now()) / 60_000))
    const title = upcoming.entering === 'peak' ? t('billing.peakAlertTitlePeak') : t('billing.peakAlertTitleOff')
    const body = upcoming.entering === 'peak'
      ? t('billing.tierAlertEnterPeak').replace('{minutes}', String(minutes))
      : t('billing.tierAlertEnterOff').replace('{minutes}', String(minutes))
    try {
      new Notification(title, { body })
    } catch {
      // 平台拒绝构造通知：静默跳过，浮层始终可见。
    }
  }, [lastTierSwitchAt, peakConfig, actions, t])

  // 余额不足告警：任一提供方余额低于阈值（折算人民币）时每天提醒一次；
  // 与预算开关无关——余额是硬性约束，无论是否开启预算都要提醒。
  const lastBalanceAlertDay = useStore(s => s.lastBalanceAlertDay)
  const lowBalanceRow = useMemo(() => {
    if (balances.length === 0) return undefined
    const threshold = stats.lowBalanceThreshold ?? DEFAULT_LOW_BALANCE_THRESHOLD
    const burn = dailyBurnRate(stats.byDay, today)
    const rate = getRateInfo().rate
    for (const balance of balances) {
      if (balance.totalBalance === undefined || balance.error !== undefined) continue
      // USD 余额按当前汇率折成人民币，与阈值同口径。
      const cny = balance.currency === 'USD' ? balance.totalBalance * rate : balance.totalBalance
      if (cny >= threshold) continue
      // 天数仅在有消耗记录时提供；刚用或未用（无历史）时以金额告警为主。
      const days = burn > 0 ? Math.floor(cny / burn) : undefined
      return { name: balance.displayName, cny, days }
    }
    return undefined
  }, [balances, stats.lowBalanceThreshold, stats.byDay, today])
  useEffect(() => {
    if (lowBalanceRow === undefined) return
    const day = localDayStamp()
    if (lastBalanceAlertDay === day) return
    actions.markBalanceAlerted(day)
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const body = t('billing.balanceLowBody')
      .replace('{name}', lowBalanceRow.name)
      .replace('{balance}', formatMoney(lowBalanceRow.cny))
      .replace('{days}', lowBalanceRow.days === undefined ? '—' : String(lowBalanceRow.days))
    // 通知发送失败（部分平台限制）不影响标记：当天不再重试，避免轮询轰炸。
    try {
      new Notification(t('billing.balance'), { body })
    } catch {
      // 平台拒绝构造通知：静默跳过。
    }
  }, [lowBalanceRow, lastBalanceAlertDay, actions, t])

  // hover 速览「主力直联/订阅消耗」：本月按厂商聚合消耗，区分按量（直联）与订阅，
  // 并附余额/配额状态——余额仅按量厂商有意义，配额仅订阅厂商有意义。
  const vendorStatus = useMemo(() => {
    const prefix = today.slice(0, 7)
    const vendor = new Map<string, { cost: number; plan: boolean }>()
    for (const [date, models] of Object.entries(stats.byDayModels ?? {})) {
      if (!date.startsWith(prefix)) continue
      for (const [modelKey, usage] of Object.entries(models)) {
        if (usage.cost <= 0) continue
        const provider = modelOf(modelKey).provider ?? '其他'
        const isPlan = stats.byModel?.[modelKey]?.plan === true
        const cur = vendor.get(provider) ?? { cost: 0, plan: isPlan }
        cur.cost += usage.cost
        // 混合计费（部分订阅）视为存在按量 → 归直联桶。
        if (!isPlan) cur.plan = false
        vendor.set(provider, cur)
      }
    }
    const directEntry = [...vendor.entries()].filter(([, v]) => !v.plan).sort((a, b) => b[1].cost - a[1].cost)[0]
    const subEntry = [...vendor.entries()].filter(([, v]) => v.plan).sort((a, b) => b[1].cost - a[1].cost)[0]
    const balanceStatus = (name: string): { text: string; low: boolean } => {
      const bal = balances.find(b => normalizeProvider(b.provider) === normalizeProvider(name))
      if (bal === undefined || bal.totalBalance === undefined) {
        // 无余额/异常时给出状态文案（未配置 / 密钥无效 / 查询失败），而非空。
        const text = bal?.error === 'unauthorized'
          ? t('billing.balanceUnauthorized')
          : bal?.error === 'unreachable' || bal?.error === 'invalid'
            ? t('billing.balanceUnreachable')
            : t('billing.balanceUnconfigured')
        return { text, low: false }
      }
      const amount = bal.currency === 'USD' ? `$${bal.totalBalance.toFixed(2)}` : formatMoney(bal.totalBalance)
      const rate = getRateInfo().rate
      const cny = bal.currency === 'USD' ? bal.totalBalance * rate : bal.totalBalance
      return { text: amount, low: cny < (stats.lowBalanceThreshold ?? DEFAULT_LOW_BALANCE_THRESHOLD) }
    }
    const quotaStatus = (name: string): { text: string; low: boolean } => {
      const q = quotas.find(qq => qq.displayName === name || subscriptionVendorOf(qq.provider) === name)
      if (q === undefined || q.windows.length === 0) {
        return { text: t('billing.subscriptionNoApi'), low: false }
      }
      const lowest = q.windows.reduce((min, window) => Math.min(min, window.remainingPercent), 100)
      return {
        text: lowest <= 0 ? t('billing.subscriptionExhausted') : t('billing.subscriptionRemaining').replace('{pct}', String(lowest)),
        low: lowest < 20,
      }
    }
    return {
      direct: directEntry === undefined ? undefined : { name: directEntry[0], ...balanceStatus(directEntry[0]) },
      sub: subEntry === undefined ? undefined : { name: subEntry[0], ...quotaStatus(subEntry[0]) },
    }
  }, [stats.byDayModels, stats.byModel, stats.lowBalanceThreshold, balances, quotas, today])

  // hover 速览「数据卡」数值：全量累计用量 + 更新时间（参考图风格）。
  const dash = useMemo(() => {
    const total = stats.total
    return {
      totalToken: total.input + total.output,
      input: total.input,
      output: total.output,
      cacheRead: total.cacheHit,
      calls: total.calls,
      updatedAt: stats.updatedAt === undefined ? undefined : `${localDayStamp(stats.updatedAt)} ${formatClock(stats.updatedAt)}`,
    }
  }, [stats])

  // 费用摘要始终写入计费指标服务：服务与槽位一样按「无消费者即空转」设计，
  // 主题插件（如 StickerPad）存在时自行读取，缺席时发布无害。
  useEffect(() => {
    publishCosts({ todayCost, monthCost })
  }, [todayCost, monthCost, publishCosts])

  // dashboard 打开回调同样始终注册，供主题插件（如 StickerPad）触发。
  useEffect(() => registerOpen(openDashboard), [registerOpen, openDashboard])

  // 每轮费用明细：服务端按起始时间倒序下发；旧快照缺失时为空数组（面板不出现）。
  const turns: readonly RoundChartRow[] = useMemo(() => stats.byTurn ?? [], [stats.byTurn])

  return (
    <>
      {/* zine 模式下触发器由 CSS（body[data-zine-mode]）隐藏，入口交给主题贴纸层。 */}
      <UsageBillingTrigger
        {...props}
        t={t}
        onOpen={openDashboard}
        monthCost={monthCost}
        todayCost={todayCost}
        weekCost={weekCost}
        days={last7}
        vendorStatus={vendorStatus}
        dash={dash}
        floatPrefs={floatPrefs}
        subscriptions={quotas}
      />
      {open && (
        <BillingDashboard
          stats={stats}
          t={t}
          onClose={close}
          health={health}
          balances={balances}
          quotas={quotas}
          relayQuotas={relayQuotas}
          currency={currency}
          onCurrency={setCurrency}
          turns={turns}
          renderSlot={renderSlot}
          budgetEnabled={budgetEnabled}
          budgetAmount={effectiveBudget}
          onToggleBudget={toggleBudget}
          onBudgetAmount={actions.setAmount}
          peakConfig={peakConfig}
          onPeakConfig={updatePeakConfig}
          onPreviewPeak={previewPeak}
          floatPrefs={floatPrefs}
          onFloatPrefs={updateFloatPrefs}
          quotasStale={quotasStale}
        />
      )}
      {(peakHit !== null || peakPreview !== null) && (
        <PeakAlertBanner
          hit={(peakHit ?? peakPreview) as PeakAlertHit}
          config={peakConfig}
          t={t}
          onDismiss={() => { setPeakHit(null); setPeakPreview(null) }}
        />
      )}
    </>
  )
}
