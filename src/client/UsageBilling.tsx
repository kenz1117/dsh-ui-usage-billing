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
  type BillingCardPrefs,
  DEFAULT_ENABLE_USAGE_STATS_TOOL,
  type LiveCostBarPrefs,
  LIVE_COST_BAR_PREF_EVENT,
  loadBillingCardPrefs,
  type FloatWindowPrefs,
  loadFloatWindowPrefs,
  loadLiveCostBarPrefs,
  loadSiteListPrefs,
  loadUserPrices,
  saveBillingCardPrefs,
  saveFloatWindowPrefs,
  saveLiveCostBarPrefs,
  saveSiteListPrefs,
  saveUserPrices,
  type SiteListPrefs,
  type UserPriceMap,
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
  applyLiveCatalogModels, applyLivePricing, applyUserPrices, catalogEntries, canonModelId, cnyToUsd, computeCost, convertUnitPrice,
  DEFAULT_PEAK_SHARE, formatMoney, formatPercent, formatTokens, formatUnitPrice, getRateInfo, getUserPrices, isPromoActive,
  modelOf, normalizeOriginInput, resolveToken, tierAt, userOriginPriceEntryOf, userPriceOf, type CatalogModel, type CostCurrency, type TokenUsageBuckets,
} from './pricing.ts'
import type { BalanceResponse, LivePricing, ProviderBalance, ReconcileNotice, RelayQuota, RelayResponse } from '../pricing-shared.ts'
import type { SubscriptionQuota, SubscriptionResponse } from '../pricing-shared.ts'
import { NS, zh, en, type UsageBillingKey } from './locales.ts'
import { localizeProviderName } from './provider-display.ts'
import { tierInfoOf } from './plan-knowledge.ts'
import { vendorLogoOf } from './vendor-logos.ts'
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
 * Tab 定义（顺序即渲染顺序）：概览=主数字/KPI/热力图，账单=厂商计费与订阅，
 * 用量=Token 用量，趋势=趋势图/每轮费用，费率=模型单价表，设置=预算与峰谷提醒。
 * 导出供测试断言 tab 与文案 key 对齐、decor 锚点落在正确分区。
 */
export const DASHBOARD_TABS: readonly { id: DashboardTab; labelKey: UsageBillingKey }[] = [
  { id: 'overview', labelKey: 'tabOverview' },
  { id: 'providers', labelKey: 'tabProviders' },
  { id: 'token', labelKey: 'tabToken' },
  { id: 'trends', labelKey: 'tabTrends' },
  { id: 'pricing', labelKey: 'tabPricing' },
  { id: 'settings', labelKey: 'tabSettings' },
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
  'Anthropic': ['claude', 'anthropic'],
  'Mistral AI': ['mistral', 'ministral', 'devstral'],
  'Cohere': ['cohere', 'command'],
  '美团': ['longcat', 'meituan'],
  '面壁智能': ['minicpm', 'modelbest'],
  '小红书': ['dots', 'rednote', 'xiaohongshu'],
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
  'minimax-cn': 'MiniMax',
  'minimax-token-plan': 'MiniMax',
  'minimax-token-plan-cn': 'MiniMax',
  'hunyuan-token-plan': '腾讯混元',
  'tencent-token-plan': '腾讯混元',
  'hy-token-plan': '腾讯混元',
  'xinghuo-token-plan': '讯飞星火',
  'xfyun-coding': '讯飞星火',
  'spark-coding': '讯飞星火',
  'huawei-token-plan': '华为云',
  'pangu-token-plan': '华为云',
  'huawei-maas-token-plan': '华为云',
  'volcengine-agent-plan': '字节豆包',
  'ark-agent-plan': '字节豆包',
  'baidu-token-plan': '百度文心',
  'ernie-token-plan': '百度文心',
  'wenxin-token-plan': '百度文心',
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
 * 用户自定义单价显示重估：聚合发生在宿主进程（按内置目录计价），用户价只在
 * 客户端显示层生效。对 byDayModels（day×model 完整二维）中命中用户价的模型
 * 逐格平价重算 cost，并派生 byDay / byModel / total 的 cost。其余视图
 * （bySite / byTier / bySession / byTurn）保持宿主原值——逐格时刻或行级归属
 * 在客户端不可得，口径差异在设置面板注明。导出供测试：纯函数。
 * @param stats - 服务端聚合文档。
 * @returns 重估后的文档；无用户价或缺 byDayModels 时原样返回。
 */
export function recostWithUserPrices(stats: UsageStats): UsageStats {
  const entries = getUserPrices()
  if (entries === undefined || stats.byDayModels === undefined) return stats
  // 逐 day×model 重算：用户价 = 用户填的实付单价（促销不叠加）；带低谷档时按
  // DEFAULT_PEAK_SHARE 比例混合（格内无调用时刻，无法逐笔分档）。
  const rate = getRateInfo().rate
  // 是否启用「按来源（origin）」精确重估：需存在带 origin 的用户价 + 服务端三维数据。
  const hasOriginData = stats.byDayModelsSite !== undefined
  const byDay: UsageStats['byDay'] = {}
  const byDayModels: UsageStats['byDayModels'] = {}
  const modelCost = new Map<string, number>()
  let totalCost = 0
  // 判断某模型是否命中「带来源」的用户价条目（用于决定是否走 origin 拆分重算）。
  const hasOriginEntry = (key: string): boolean =>
    entries.some(e => e.origin !== undefined && e.origin !== ''
      && (e.key === key || canonModelId(e.key) === canonModelId(key)))
  const costFromPrice = (price: { currency?: 'CNY' | 'USD'; input: number; cacheHit: number; output: number; offPeak?: { input: number; cacheHit: number; output: number } } | undefined,
    cell: { cacheHit: number; cacheMiss: number; output: number }, fallback: number): number => {
    if (price === undefined) return fallback
    const hit = Math.min(cell.cacheHit, cell.cacheMiss + cell.cacheHit)
    const flat = (band: { input: number; cacheHit: number; output: number }): number => {
      const raw = (cell.cacheMiss * band.input + hit * band.cacheHit + cell.output * band.output) / 1_000_000
      return price.currency === 'USD' ? raw * rate : raw
    }
    // 用户价带低谷档：峰/谷两档按固定比例混合（格内无时刻，与宿主逐笔分档口径近似）。
    if (price.offPeak === undefined) return flat(price)
    return flat(price) * DEFAULT_PEAK_SHARE + flat(price.offPeak) * (1 - DEFAULT_PEAK_SHARE)
  }
  for (const [date, models] of Object.entries(stats.byDayModels)) {
    let dayCost = 0
    const dayModels: Record<string, { calls: number; input: number; output: number; cacheHit: number; cacheMiss: number; cost: number }> = {}
    for (const [key, cell] of Object.entries(models)) {
      const priceDefault = userPriceOf(key)
      // 带来源价的兜底：三维站点数据缺失或无匹配站点桶时，用该条来源价重估整格，
      // 而不是静默回退宿主原价（issue #18：用户填了来源价却「没有效果」）。
      const originFallback = priceDefault ?? userOriginPriceEntryOf(key)
      const originEntry = hasOriginData && hasOriginEntry(key)
      let cost: number
      if ((originFallback !== undefined || originEntry) && originEntry && stats.byDayModelsSite?.[date]?.[key] !== undefined) {
        // 按「模型×站点」分布逐来源重算：带 origin 价宽松命中，其余回落默认价或内置。
        let siteCost = 0
        for (const [siteKey, siteCell] of Object.entries(stats.byDayModelsSite[date][key])) {
          const origin = siteKey.startsWith('site:') ? siteKey.slice('site:'.length) : undefined
          const sitePrice = origin !== undefined ? userPriceOf(key, origin) : undefined
          siteCost += costFromPrice(sitePrice ?? originFallback, siteCell, siteCell.cost)
        }
        cost = siteCost
      } else {
        cost = costFromPrice(originFallback, cell, cell.cost)
      }
      dayCost += cost
      dayModels[key] = { ...cell, cost }
      modelCost.set(key, (modelCost.get(key) ?? 0) + cost)
    }
    // byDayModels 与 byDay 同源同键：缺日时按无前置数据跳过（渲染已有缺日兜底）。
    const prevDay = stats.byDay[date]
    if (prevDay !== undefined) byDay[date] = { ...prevDay, cost: dayCost }
    byDayModels[date] = dayModels
    totalCost += dayCost
  }
  return {
    ...stats,
    total: { ...stats.total, cost: totalCost },
    byDay,
    byDayModels,
    byModel: Object.fromEntries(Object.entries(stats.byModel).map(([key, cell]) => {
      const cost = modelCost.get(key)
      return [key, cost === undefined ? cell : { ...cell, cost }]
    })),
  }
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
  /** 数据来自旧算法折叠的持久账本行（原始日志已删，无法重算）。 */
  stale?: boolean
  calls: number
  cost: number
  lastActive: number
}

/** 订阅额度查询状态的文案（ok 时无需额外标注，返回空串）。 */
function subscriptionStatusText(status: SubscriptionQuota['status'], t: (key: UsageBillingKey) => string): string {
  switch (status) {
    case 'ok': return ''
    case 'not-configured': return t('subscriptionNotConfigured')
    case 'unauthorized': return t('subscriptionUnauthorized')
    case 'rate-limited': return t('subscriptionRateLimited')
    case 'invalid-response': return t('subscriptionInvalid')
    default: return t('subscriptionUnavailable')
  }
}

/** 订阅额度窗口的类型标签（本次 / 本周 / 本月 / 计费周期）。 */
function subscriptionWindowLabel(kind: SubscriptionQuota['windows'][number]['kind'], t: (key: UsageBillingKey) => string): string {
  switch (kind) {
    case 'session': return t('subscriptionSession')
    case 'weekly': return t('subscriptionWeekly')
    case 'monthly': return t('subscriptionMonthly')
    case 'billing': return t('subscriptionBilling')
  }
}

/** 中转站程序类型的徽标文案（New API / Sub2API / 未识别）。 */
function relayKindText(kind: RelayQuota['kind'], t: (key: UsageBillingKey) => string): string {
  switch (kind) {
    case 'new-api': return t('relayKindNewApi')
    case 'sub2api': return t('relayKindSub2Api')
    default: return t('relayKindUnknown')
  }
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
  /** 宿主进程时区（IANA 名 + UTC 偏移）：天按此切分，副标题据此标注；旧快照可能缺失。 */
  timezone?: { name: string; offset: string }
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
    /** 显式缓存写入（cacheMiss 子集，部分厂商单独报告）；1.0.8 起新增，旧快照缺失。 */
    cacheWrite?: number
    cost: number
    /** 输出中的 reasoning（思考）token；已含在 output 内。 */
    reasoning: number
    /** 联网搜索请求的估算调用数（已按次估值计入 cost）；1.0.9 起新增，旧快照缺失。 */
    searchCalls?: number
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
  /** 模型 × 日期 × 站点 三维统计（[date][modelKey][siteKey]）：按 origin 绑定自定义价的
   *  显示层重估数据源；旧快照可能缺失。 */
  byDayModelsSite?: Record<string, Record<string, Record<string, {
    calls: number
    input: number
    output: number
    cacheHit: number
    cacheMiss: number
    cost: number
  }>>>
  /**
   * 峰谷分桶（全量逐调用真实判档）：1.0.8 起服务端按调用时刻精确归桶，
   * 峰谷占比条优先用它（覆盖全部历史调用）；旧快照缺失时回退逐轮估算。
   */
  byTier?: { peak: { cost: number; calls: number }; offPeak: { cost: number; calls: number } }
  /** 工具调用次数排行（键 = 工具名，按次数倒序）；旧快照缺失。 */
  byTool?: Record<string, number>
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
  /** 联网搜索请求的单次费用估算（人民币元，配置回显）；0 或缺省 = 未启用估算。 */
  searchCallEstimateCny?: number
  /** 按角色费用归因（估算口径：输出实测，输入按消息长度摊分）；旧快照可能缺失。 */
  byRole?: { user: number; assistant: number; tool: number }
  /** 性能指标（TTFT/生成速度/总延迟）按模型与按小时；旧快照可能缺失。 */
  perf?: ClientPerf
  /** 旧版算法账本行兜底的会话数（模型归属可能失真）；0 或缺省 = 全部数据可信。 */
  staleLedgerSessions?: number
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
    const isObj = (v: unknown): boolean => v !== null && typeof v === 'object'
    return {
      total: candidate.total ?? EMPTY_STATS.total,
      byModel: candidate.byModel ?? {},
      byDay: candidate.byDay ?? {},
      ...(candidate.byDayModels !== undefined ? { byDayModels: candidate.byDayModels } : {}),
      // 模型×日期×站点三维（issue #16）：旧快照缺失；透传供按 origin 重估。
      ...(isObj(candidate.byDayModelsSite) ? { byDayModelsSite: candidate.byDayModelsSite } : {}),
      ...(candidate.updatedAt !== undefined ? { updatedAt: candidate.updatedAt } : {}),
      ...(typeof candidate.budget === 'number' ? { budget: candidate.budget } : {}),
      ...(typeof candidate.lowBalanceThreshold === 'number' ? { lowBalanceThreshold: candidate.lowBalanceThreshold } : {}),
      ...(Array.isArray(candidate.bySession) ? { bySession: candidate.bySession } : {}),
      ...(Array.isArray(candidate.byTurn) ? { byTurn: candidate.byTurn } : {}),
      ...(Array.isArray(candidate.byWorkspace) ? { byWorkspace: candidate.byWorkspace } : {}),
      // 可选聚合维度：旧快照缺失。此前白名单漏掉 bySite / unpricedModels /
      // staleLedgerSessions，导致中转站面板与旧账本提示从未收到数据，一并补上。
      ...(isObj(candidate.bySite) ? { bySite: candidate.bySite } : {}),
      ...(isObj(candidate.byTier) ? { byTier: candidate.byTier } : {}),
      ...(isObj(candidate.byTool) ? { byTool: candidate.byTool } : {}),
      ...(Array.isArray(candidate.unpricedModels) ? { unpricedModels: candidate.unpricedModels } : {}),
      ...(typeof candidate.staleLedgerSessions === 'number' ? { staleLedgerSessions: candidate.staleLedgerSessions } : {}),
      // 联网搜索估算：旧快照缺失；数值存在才透传（渲染处据 searchCalls 判定显示）。
      ...(typeof candidate.searchCallEstimateCny === 'number' ? { searchCallEstimateCny: candidate.searchCallEstimateCny } : {}),
      // 角色归因：旧快照缺失；仅接受对象形状（durable 边界，字段值由渲染处数值化兜底）。
      ...(candidate.byRole !== null && typeof candidate.byRole === 'object'
        ? { byRole: candidate.byRole as { user: number; assistant: number; tool: number } }
        : {}),
      // 性能指标：旧快照缺失；仅接受含 byModel/byHourModel 的对象形状。
      ...(candidate.perf !== null && typeof candidate.perf === 'object'
        && candidate.perf.byModel !== null && typeof candidate.perf.byModel === 'object'
        && candidate.perf.byHourModel !== null && typeof candidate.perf.byHourModel === 'object'
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
/** 实时定价重试链是否已在进行：挂载/开弹窗/轮询多个调用点会并发触发 loadLivePricing，
 *  若都在 `builtin` 时各自起 setTimeout 重试链会叠加出多余请求，这里只保留一条。 */
let livePricingRetryPending = false

async function loadLivePricing(attempt = 0): Promise<void> {
  const MAX_ATTEMPTS = 4
  try {
    const response = await fetch(PRICING_PATH)
    if (!response.ok) {
      livePricingRetryPending = false
      return
    }
    const text = await response.text()
    const parsed = JSON.parse(text) as unknown
    if (parsed === null || typeof parsed !== 'object' || !('source' in parsed)) {
      livePricingRetryPending = false
      return
    }
    const pricing = parsed as LivePricing
    if (pricing.source === 'builtin' && attempt < MAX_ATTEMPTS - 1) {
      // 节点端启动拉取可能仍在进行中：稍后重试，避免把「更新中」误判成永久内置。
      if (attempt === 0) {
        // 已有重试链在跑则不叠加新链；否则标记并启动本链。
        if (livePricingRetryPending) return
        livePricingRetryPending = true
      }
      setTimeout(() => { void loadLivePricing(attempt + 1) }, 2000)
      return
    }
    livePricingRetryPending = false
    applyLivePricing(pricing)
  } catch {
    // 拉取失败：维持内置目录与内置汇率（默认值降级）。
    livePricingRetryPending = false
  }
}

/**
 * 一次拉取 `/api/billing/balance` 的完整响应（余额行 + 对账提示）。余额与对账
 * 提示来自同一响应体，拆成两个函数会导致每 30 秒对同一端点发两次请求，故合并
 * 为单次 fetch；失败返回空值（余额 []、对账 undefined），由调用方降级。
 * @returns the balances and reconcile notice (both degraded on any failure).
 */
async function fetchBalanceDoc(): Promise<{ balances: readonly ProviderBalance[]; reconcile?: ReconcileNotice }> {
  try {
    const response = await fetch(BALANCE_PATH)
    if (!response.ok) return { balances: [] }
    const text = await response.text()
    const parsed = JSON.parse(text) as unknown
    if (parsed === null || typeof parsed !== 'object') return { balances: [] }
    const doc = parsed as Partial<BalanceResponse>
    return {
      balances: Array.isArray(doc.balances) ? doc.balances : [],
      ...(doc.reconcile === undefined ? {} : { reconcile: doc.reconcile }),
    }
  } catch {
    return { balances: [] }
  }
}

/**
 * 拉取官方余额差对账提示（drift 时非空），供余额面板展示；失败返回 undefined。
 * 复用 {@link fetchBalanceDoc} 的同一响应，导出供对账提示渲染测试单独解析。
 * @returns the reconcile notice, or undefined on any failure / no drift.
 */
export async function fetchReconcile(): Promise<ReconcileNotice | undefined> {
  return (await fetchBalanceDoc()).reconcile
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
 * 拉取中转站额度（New API / Sub2API 的余额与滚动窗口）；失败抛出（调用方据此保留旧快照）。
 * @returns the relay-site quota rows（成功但无中转配置时为空数组）。
 */
async function fetchRelayQuotas(): Promise<readonly RelayQuota[]> {
  const response = await fetch(RELAY_PATH)
  if (!response.ok) throw new Error(`relay-quotas HTTP ${String(response.status)}`)
  const text = await response.text()
  const parsed = JSON.parse(text) as unknown
  if (parsed !== null && typeof parsed === 'object' && 'quotas' in parsed) {
    return (parsed as RelayResponse).quotas
  }
  throw new Error('relay-quotas: invalid response')
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
    /** 近 7 天迷你柱数据：cost=当日费用，tokens=当日消耗 token（input+output）。 */
    days: readonly { date: string; cost: number; tokens: number }[]
    /** 卡面主指标视角：花费金额 / Token 消耗。 */
    cardPrefs: BillingCardPrefs
    /** 当月/今日/本周 累计 token（tokens 视角的主副行数字；口径与悬浮窗总 Token 一致）。 */
    monthTokens: number
    todayTokens: number
    weekTokens: number
    /** hover 速览「主力直联/订阅消耗」+ 对应余额/配额数值文本与低值标记。 */
    vendorStatus: {
      direct: { name: string; text: string; low: boolean } | undefined
      sub: { name: string; text: string; low: boolean } | undefined
    }
  /** hover 速览「数据卡」用量数值（累计）：总 Token / 输入 / 输出 / 缓存 / 调用。 */
  dash: {
    totalToken: number
    input: number
    output: number
    cacheRead: number
    calls: number
   }
  /** 模型用量悬浮窗偏好（模式 + 指定订阅卡目标）。 */
  floatPrefs: FloatWindowPrefs
  /** 订阅配额列表（「指定订阅卡」模式的数据来源）。 */
  subscriptions: readonly SubscriptionQuota[]
  },
): React.ReactNode {
  const {
    wide, t, onOpen, monthCost, todayCost, weekCost, days, vendorStatus, dash,
    floatPrefs, subscriptions, cardPrefs, monthTokens, todayTokens, weekTokens,
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
        title={`${t('title')} · ${formatMoney(monthCost)}`}
      >
        {cardIcon}
      </button>
    )
  }

  // 近 7 天 sparkline 高度：随卡面视角取当日费用或当日 token，归一化到 4~16px。
  const tokenView = cardPrefs.metric === 'tokens'
  const sparkValues = days.map(d => (tokenView ? d.tokens : d.cost))
  const sparkMax = Math.max(...sparkValues, 0)
  const sparkHeights = sparkValues.map(v => sparkMax > 0 ? 4 + (v / sparkMax) * 12 : 4)

  return (
    <span className={css.triggerWrap}>
      <button
        type="button"
        className={css.trigger}
        data-testid="billing-trigger"
        onClick={onOpen}
        title={`${t('title')} · ${formatMoney(monthCost)}`}
      >
        <span className={css.triggerIcon} data-testid="billing-trigger-icon">{cardIcon}</span>
        {/* 设计 trigger-card：当月 = 标签 + ¥ + 数字(分离)，下方一行 今日/本周 副行。
            tokens 视角：无币符，主副行均为 K/M/B 缩写（口径与悬浮窗总 Token 一致）。 */}
        <span className={css.triggerMain}>
          <span className={css.triggerPrimary}>
            <span className={css.triggerLabel}>
              {tokenView ? t('triggerMonthTokens') : t('triggerMonth')}
            </span>
            {tokenView ? (
              <span className={css.triggerMetric} data-testid="billing-trigger-month-tokens">{formatTokens(monthTokens)}</span>
            ) : (
              <>
                <span className={css.triggerYen} aria-hidden="true">{formatMoney(monthCost).charAt(0)}</span>
                <span className={css.triggerMetric}>{formatMoney(monthCost).slice(1)}</span>
              </>
            )}
          </span>
          <span className={css.triggerSub} data-testid="billing-trigger-today">
            {tokenView
              ? `${t('triggerToday')} ${formatTokens(todayTokens)} · ${t('weekCost')} ${formatTokens(weekTokens)}`
              : `${t('triggerToday')} ${formatMoney(todayCost)} · ${t('weekCost')} ${formatMoney(weekCost)}`}
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
              <span className={css.triggerPopEmpty}>{t('floatNoTargets')}</span>
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
                                ? t('subscriptionExhausted')
                                : t('subscriptionRemaining').replace('{pct}', String(window.remainingPercent))}
                            </span>
                            {window.resetsAt !== undefined && (
                              <span className={css.subscriptionReset}>
                                {t('subscriptionReset').replace('{date}', `${localDayStamp(new Date(window.resetsAt).getTime())} ${formatClock(new Date(window.resetsAt).getTime())}`)}
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
            {/* 设计 pop-card：顶部金流光条 ::before + 标题行 + 3 列指标网格 + 主力消耗模型行 */}
            <span className={css.popHead}>
              <span className={css.popTitle}>{t('popTitle')}</span>
            </span>
            <span className={css.metricGrid}>
              <span className={css.metricCell}>
                <span className={css.metricLabel}>{t('monthCost')}</span>
                <span className={clsx(css.metricValue, css.metricValuePrimary)}>{formatMoney(monthCost)}</span>
              </span>
              <span className={css.metricCell}>
                <span className={css.metricLabel}>{t('tokenTotal')}</span>
                <span className={css.metricValue}>{formatTokens(dash.totalToken)}</span>
              </span>
              <span className={css.metricCell}>
                <span className={css.metricLabel}>{t('input')}</span>
                <span className={css.metricValue}>{formatTokens(dash.input)}</span>
              </span>
              <span className={css.metricCell}>
                <span className={css.metricLabel}>{t('output')}</span>
                <span className={css.metricValue}>{formatTokens(dash.output)}</span>
              </span>
              <span className={css.metricCell}>
                <span className={css.metricLabel}>{t('cacheHit')}</span>
                <span className={clsx(css.metricValue, css.metricValueSuccess)}>{formatTokens(dash.cacheRead)}</span>
              </span>
              <span className={css.metricCell}>
                <span className={css.metricLabel}>{t('calls')}</span>
                <span className={css.metricValue}>{dash.calls.toLocaleString()}</span>
              </span>
            </span>
            <span className={css.popModel}>
              <span className={css.popModelLabel}>{t('popTodayModel')}</span>
              {(vendorStatus.direct !== undefined || vendorStatus.sub !== undefined)
                ? (
                  <>
                    {vendorStatus.direct !== undefined && (
                      <span className={css.popModelRow}>
                        <span className={clsx(css.popDot, css.popDotDirect)} aria-hidden="true" />
                        <span className={css.popTagPrimary}>{t('popDirectLead')}</span>
                        <span className={css.popModelName}>{vendorStatus.direct.name}</span>
                        <span className={clsx(css.popModelStatus, vendorStatus.direct.low && css.popModelStatusLow)}>
                          {vendorStatus.direct.text}
                        </span>
                      </span>
                    )}
                    {vendorStatus.sub !== undefined && (
                      <span className={css.popModelRow}>
                        <span className={clsx(css.popDot, css.popDotSub)} aria-hidden="true" />
                        <span className={css.popTagSub}>{t('popSubLead')}</span>
                        <span className={css.popModelName}>{vendorStatus.sub.name}</span>
                        <span className={clsx(css.popModelStatus, vendorStatus.sub.low && css.popModelStatusLow)}>
                          {vendorStatus.sub.text}
                        </span>
                      </span>
                    )}
                  </>
                )
                : (
                  <span className={css.popModelRow}>
                    <span className={clsx(css.popDot, css.popDotNeutral)} aria-hidden="true" />
                    <span className={css.popModelStatus}>{t('popNoConsumption')}</span>
                  </span>
                )}
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
  // 双参签名：局部需要插值文案（如促销截止日期）时传 params。
  t: (key: UsageBillingKey, params?: Record<string, unknown>) => string
  onClose: () => void
  /** 用户自定义单价表（localStorage 持久化；设置面板读写）。 */
  userPrices: UserPriceMap
  /** 用户自定义单价更新（父组件写回 localStorage 并重估显示）。 */
  onUserPrices: (next: UserPriceMap) => void
  health: ModelHealth
  balances: readonly ProviderBalance[]
  /** 官方余额差对账提示（drift 时非空，展示在余额区块）。 */
  reconcile?: ReconcileNotice
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
  /** 计费卡显示偏好（设置 Tab 编辑）。 */
  cardPrefs: BillingCardPrefs
  /** 计费卡显示偏好更新（父组件持久化）。 */
  onCardPrefs: (next: BillingCardPrefs) => void
  /** 中转站列表展示偏好（issue #17：隐藏未识别条目，设置 Tab 编辑）。 */
  sitePrefs: SiteListPrefs
  /** 中转站列表展示偏好更新（父组件持久化）。 */
  onSitePrefs: (next: SiteListPrefs) => void
  /** 即时代费条（平价消耗胶囊）显示偏好（设置 Tab 编辑，跨树经 CustomEvent 通知 dock）。 */
  liveCostPrefs: LiveCostBarPrefs
  /** 即时代费条显示偏好更新（父组件持久化并广播）。 */
  onLiveCostPrefs: (next: LiveCostBarPrefs) => void
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
        <button type="button" className={css.balanceDetailClose} aria-label={t('close')} onClick={onClose}>×</button>
      </span>
      <span className={css.balanceDetailGrid}>
        {total !== undefined && <BalanceDetailRow label={t('balance')} value={total} />}
        {granted !== undefined && <BalanceDetailRow label={t('balanceGranted')} value={granted} />}
        {topped !== undefined && <BalanceDetailRow label={t('balanceTopped')} value={topped} />}
        <BalanceDetailRow label={t('balanceDaily')} value={money(dailyBurn)} />
        <BalanceDetailRow label={t('balanceDaysLong')} value={`${days} ${t('balanceDaysUnit')}`} />
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

/**
 * 设置 Tab 的自定义单价卡：JSON 编辑器形式（紧凑优先）。保存时逐行校验
 * （三价非负有限数；currency 仅认 USD），写回 localStorage 并触发显示重估；
 * 覆盖优先级高于内置目录 / models.dev / dsh-spend。
 */
function UserPriceCard({ userPrices, onUserPrices, t }: {
  userPrices: UserPriceMap
  onUserPrices: (next: UserPriceMap) => void
  t: (key: UsageBillingKey, params?: Record<string, unknown>) => string
}): React.ReactNode {
  // 本地编辑副本：增删改都在列表内完成，点「保存」才提交；行内价格输入框不会改坏结构。
  const [drafts, setDrafts] = useState<UserPriceMap>(() => [...userPrices])
  const update = (i: number, patch: Partial<UserPriceMap[number]>): void =>
    setDrafts(list => list.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))
  const remove = (i: number): void => setDrafts(list => list.filter((_, idx) => idx !== i))
  const add = (): void => setDrafts(list => [...list, { key: '', input: 0, cacheHit: 0, output: 0 as number }])
  // 低谷档草稿态（字符串，留空 = 平档）：与主档独立编辑，三值有效才成档。
  const offPeakOf = (i: number): { input: string; cacheHit: string; output: string } => {
    const off = drafts[i]?.offPeak
    return {
      input: off === undefined ? '' : String(off.input),
      cacheHit: off === undefined ? '' : String(off.cacheHit),
      output: off === undefined ? '' : String(off.output),
    }
  }
  const setOffPeak = (i: number, field: 'input' | 'cacheHit' | 'output', raw: string): void =>
    setDrafts(list => list.map((row, idx) => {
      if (idx !== i) return row
      const next = { ...offPeakOf(i), [field]: raw }
      const touched = [next.input, next.cacheHit, next.output].some(v => v.trim() !== '')
      const values = [next.input, next.cacheHit, next.output].map(v => Number(v))
      const valid = touched && values.every(v => Number.isFinite(v) && v >= 0) && values.some(v => v > 0)
      const { offPeak, ...rest } = row
      void offPeak
      return valid
        ? { ...rest, offPeak: { input: values[0] ?? 0, cacheHit: values[1] ?? 0, output: values[2] ?? 0 } }
        : rest
    }))
  // 保存：丢弃空模型行；来源规范化（补协议/取 origin——手填差异是自定义价失效主因之一）。
  const save = (): void => onUserPrices(drafts
    .filter(row => row.key.trim() !== '')
    .map(row => ({
      ...row,
      key: row.key.trim(),
      ...(row.origin === undefined || row.origin.trim() === ''
        ? {}
        : { origin: normalizeOriginInput(row.origin.trim()) }),
    })))
  // 模型输入指引：目录键 + 探活命中的模型 id（datalist——key 填错是「无效果」的另一主因）。
  const modelKeys = catalogEntries().map(entry => entry.key)
  // 币种切换：CNY = 移除 currency 字段（缺省即 CNY），USD = 显式标记（exactOptionalPropertyTypes）。
  const setCurrency = (i: number, cur: 'CNY' | 'USD'): void =>
    setDrafts(list => list.map((row, idx) => {
      if (idx !== i) return row
      const { currency, ...rest } = row
      return cur === 'USD' ? { ...rest, currency: 'USD' } : rest
    }))
  const num = (v: number): string => (Number.isFinite(v) && v !== 0 ? String(v) : '')
  const setNum = (i: number, field: 'input' | 'cacheHit' | 'output', raw: string): void => {
    const value = Number(raw)
    update(i, { [field]: Number.isFinite(value) && value >= 0 ? value : 0 })
  }
  return (
    <section className={css.setCard} data-testid="billing-user-prices">
      <div className={css.setCardHead}>
        <div className={css.setCardMeta}>
          <h3 className={css.setCardTitle}>{t('userPrices')}</h3>
          <p className={css.setCardDesc}>{t('userPricesHint')}</p>
        </div>
      </div>
      <div className={css.ctlCol}>
        <datalist id="billing-price-model-keys">
          {modelKeys.map(key => <option key={key} value={key} />)}
        </datalist>
        {drafts.map((row, i) => (
          <div key={i} className={css.userPriceRow} data-testid="billing-user-price-row">
            <div className={css.userPriceField}>
              <span className={css.ctlLabel}>{t('userPriceModel')}</span>
              <input
                className={css.userPriceInput}
                data-testid="billing-user-price-model"
                type="text"
                list="billing-price-model-keys"
                value={row.key}
                placeholder="flash"
                aria-label={t('userPriceModel')}
                onChange={e => update(i, { key: e.target.value })}
              />
            </div>
            <div className={css.userPriceField}>
              <span className={css.ctlLabel}>{t('userPriceSource')}</span>
              <input
                className={css.userPriceInput}
                data-testid="billing-user-price-origin"
                type="text"
                value={row.origin ?? ''}
                placeholder={t('userPriceSourceHint')}
                aria-label={t('userPriceSource')}
                onChange={e => update(i, { origin: e.target.value.trim() })}
              />
            </div>
            {(['input', 'cacheHit', 'output'] as const).map(kind => (
              <div key={kind} className={css.userPriceField}>
                <span className={css.ctlLabel}>{kind === 'input' ? t('tokenMiss') : kind === 'cacheHit' ? t('tokenHit') : t('tokenOutput')}</span>
                <input
                  className={css.userPriceInputNum}
                  type="number"
                  min={0}
                  step={0.01}
                  value={num(row[kind])}
                  onChange={e => setNum(i, kind, e.target.value)}
                />
              </div>
            ))}
            <div className={css.userPriceField}>
              <span className={css.ctlLabel}>{t('userPriceCurrency')}</span>
              <div className={css.ctlGroup}>
                <button
                  type="button"
                  className={clsx(css.floatModeBtn, row.currency !== 'USD' && css.floatModeBtnOn)}
                  onClick={() => setCurrency(i, 'CNY')}
                >
                  CNY
                </button>
                <button
                  type="button"
                  className={clsx(css.floatModeBtn, row.currency === 'USD' && css.floatModeBtnOn)}
                  onClick={() => setCurrency(i, 'USD')}
                >
                  USD
                </button>
              </div>
            </div>
            <button type="button" className={css.userPriceRemove} aria-label={t('userPriceRemove')} onClick={() => remove(i)}>
              {t('userPriceRemove')}
            </button>
            {(() => {
              // 低谷价子行：三桶留空 = 平档；三值有效即按峰/谷混合估算（issue #18）。
              const off = offPeakOf(i)
              return (
                <div className={css.userPriceOffPeak} data-testid="billing-user-price-offpeak">
                  <span className={css.ctlLabel}>{t('userPriceOffPeak')}</span>
                  {(['input', 'cacheHit', 'output'] as const).map(kind => (
                    <input
                      key={kind}
                      className={css.userPriceInputNum}
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder={kind === 'input' ? t('tokenMiss') : kind === 'cacheHit' ? t('tokenHit') : t('tokenOutput')}
                      aria-label={`${t('userPriceOffPeak')} ${kind === 'input' ? t('tokenMiss') : kind === 'cacheHit' ? t('tokenHit') : t('tokenOutput')}`}
                      value={off[kind]}
                      onChange={e => setOffPeak(i, kind, e.target.value)}
                    />
                  ))}
                </div>
              )
            })()}
          </div>
        ))}
        <div className={css.ctlRow}>
          <button type="button" className={css.exportButton} data-testid="billing-user-price-add" onClick={add}>
            {t('userPriceAdd')}
          </button>
          <button type="button" className={css.exportButton} data-testid="billing-user-price-save" onClick={save}>
            {t('userPriceSave')}
          </button>
        </div>
      </div>
    </section>
  )
}

function BillingDashboard({
  stats, t, onClose, userPrices, onUserPrices, health, balances, reconcile, quotas, relayQuotas, currency, onCurrency, turns,
  renderSlot, budgetEnabled, budgetAmount, onToggleBudget, onBudgetAmount,
  peakConfig, onPeakConfig, onPreviewPeak, floatPrefs, onFloatPrefs, cardPrefs, onCardPrefs, sitePrefs, onSitePrefs,
  liveCostPrefs, onLiveCostPrefs, quotasStale,
}: BillingDashboardProps): React.ReactNode {
  // 趋势图指标：费用（堆叠/默认）或 Token（单色总量）。
  const [trendMetric, setTrendMetric] = useState<TrendMetric>('cost')
  const { total, byModel, byDay } = stats
  // 分区 Tab：默认概览；各区块已进入二级 Tab，全部默认展开（无折叠交互）。
  const [tab, setTab] = useState<DashboardTab>('overview')
  // 趋势窗口：7 天 / 30 天切换（30 天窗口数据不足时按日补零）。
  const [trendDays, setTrendDays] = useState<7 | 30>(7)
  // 对账偏差忽略：用户可能同时在其它 agent / 直接接入 API 里消耗官方余额，此时 drift
  // 属正常。点击「忽略今天」后当天不再显示（localStorage 持久化，仅客户端侧）。
  const [reconcileDismissedDay, setReconcileDismissedDay] = useState<string>(() => {
    try { return window.localStorage.getItem('dsh-billing:reconcile-dismissed') ?? '' } catch { return '' }
  })
  const dayStampLocal = (): string => {
    const d = new Date()
    const pad = (n: number): string => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  const dismissReconcile = useCallback((): void => {
    const day = dayStampLocal()
    setReconcileDismissedDay(day)
    try { window.localStorage.setItem('dsh-billing:reconcile-dismissed', day) } catch { /* 写入失败可忽略 */ }
  }, [])
  // 概览用量热力图范围：月（日历月）/ 年（GitHub 风格年度贡献图，含月份与周几标注）。
  const [heatmapRange, setHeatmapRange] = useState<'month' | 'year'>('month')

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
    price === 0 ? t('free') : formatUnitPrice(convertUnitPrice(price, native, currency, rateInfo.rate), currency === 'usd' ? 'USD' : 'CNY')

  // 每轮成本异常标记：按起始时间升序传给 flagAnomalies（最近的在末尾）。
  const roundFlags: AnomalyFlag[] = useMemo(
    () => flagAnomalies([...turns].reverse()),
    [turns],
  )

  // 峰谷费用分摊：服务端全量逐调用判档的 byTier（1.0.8 起）；旧快照缺失时不渲染峰谷条。
  const peakShare = { peak: stats.byTier?.peak.cost ?? 0, offPeak: stats.byTier?.offPeak.cost ?? 0 }

  // 挪谷省钱额：峰时费用若全部按低谷单价（高峰的一半）计，可省下的金额。
  // 仅峰谷分档模型受影响；保守按峰时费用的一半计（与官方 2x 刊例一致）。
  const offPeakSavings = peakShare.peak / 2

  // 费用构成（估算）：角色归因三段（用户输入 / 助手输出 / 工具结果）。
  const roleRows = useMemo(() => {
    const role = stats.byRole
    if (role === undefined) return []
    const total = role.user + role.assistant + role.tool
    if (total <= 0) return []
    return [
      { label: t('roleUser'), value: role.user, seg: css.shareSegUser },
      { label: t('roleAssistant'), value: role.assistant, seg: css.shareSegAssistant },
      { label: t('roleTool'), value: role.tool, seg: css.shareSegTool },
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
    if (balance.error === 'unconfigured') return t('balanceUnconfigured')
    if (balance.error === 'unauthorized') return t('balanceUnauthorized')
    if (balance.error === 'unreachable') return t('balanceUnreachable')
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
            title={t('balanceDays').replace('{days}', String(days))}
            aria-label={`${balance.displayName} ${t('balanceDays').replace('{days}', String(days))}`}
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
      // 有预算时中心标签显示「预算」，否则显示「本月」（注释与实现一致）。
      label: Number.isFinite(budgetPct) ? t('budget') : t('monthCost'),
    }
  }, [budgetEnabled, budgetAmount, monthCost, yearCost, t])

  // Hero 底部预算进度条：与环形仪表盘同口径（预算启用且 >0），仅在启用预算时展示。
  const heroBudgetPct = budgetEnabled && budgetAmount > 0 ? (monthCost / budgetAmount) * 100 : 0

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
  // 中转站额度的可见行（issue #17）：默认隐藏「未识别」类型的占位条目。
  const visibleRelayRows = useMemo(
    () => (sitePrefs.hideUnidentified ? relayQuotas.filter(row => row.kind !== 'unknown') : relayQuotas),
    [relayQuotas, sitePrefs.hideUnidentified],
  )
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
    // 订阅 vendor 的归一化索引：normalize(vendor名) → vendor名。用于让模型 provider 名
    // 与订阅 vendor 名在大小写/空格/连字符差异时也能归到同一组。
    const vendorByNorm = new Map<string, string>()
    for (const vendor of subscriptionsByVendor.keys()) vendorByNorm.set(normalizeProvider(vendor), vendor)
    for (const row of modelRows) {
      // 厂商组 key：优先取「与某订阅 vendor 归一化匹配」的名字；订阅豁免模型（plan=true）
      // 即使 catalog 未收录（provider 反推为 Custom），也用模型 id 反推的厂商名归组，
      // 让订阅卡与模型明细落在同一厂商组，避免被甩到 Custom 独立组。
      let vendorName = row.provider
      if (row.plan === true) {
        const inferred = providerFromModelKey(row.key)
        if (inferred !== undefined) vendorName = inferred
      }
      const key = vendorByNorm.get(normalizeProvider(vendorName)) ?? vendorName
      const list = modelsByVendor.get(key)
      if (list === undefined) modelsByVendor.set(key, [row])
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
    <Modal open onClose={onClose} title={t('title')} headless className={clsx(css.dashboardModal, 'dsh-billing-modal')}>
      <div className={css.dashboard} data-testid="billing-dashboard">
        {/* Header */}
        <div className={css.dashboardHead} data-testid="billing-dashboard-head">
          <div>
            {/* ZINE: 装饰孔位（head 锚点：窗口 chrome），由主题插件注入；未注入时为空 */}
            {renderSlot('billing.dashboard.decor', { position: 'head' })}
            <div className={css.headTitleRow}>
              <h2 className={css.dashboardTitle}>
                {t('title')}
              </h2>
              {/* ZINE: 装饰孔位（headTitle 锚点：标题胶带） */}
              {renderSlot('billing.dashboard.decor', { position: 'headTitle' })}
            </div>
            <p className={css.dashboardSubtitle}>
              {t('lastUpdated')} {latestDate}
              {stats.timezone === undefined ? null : ` · ${stats.timezone.name} (${stats.timezone.offset})`}
            </p>
          </div>
          <div className={css.dashboardRight}>
            <span className={css.currencyToggle} role="group" aria-label={t('currency')}>
              {(['cny', 'usd'] as const).map(unit => (
                <button
                  key={unit}
                  type="button"
                  className={clsx(css.currencyButton, currency === unit && css.currencyButtonActive)}
                  aria-pressed={currency === unit}
                  data-testid={`billing-currency-${unit}`}
                  title={unit === 'cny' ? t('currencyCny') : t('currencyUsd')}
                  onClick={() => { onCurrency(unit) }}
                >
                  {unit === 'cny' ? '¥ CNY' : '$ USD'}
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
              aria-label={t('close')}
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
        <nav className={css.tabNav} data-testid="billing-tab-nav" role="tablist" aria-label={t('title')}>
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
              {/* 对账说明条：官方余额变动与本地账本当日费用偏差超阈值（drift）时，
                  以一条中性说明提示「本面板只统计本机 dsh 会话」，避免用户以为统计有误。
                  属信息性说明而非告警；点击「知道了」当天不再显示，非 drift 不渲染。 */}
              {reconcile?.kind === 'drift' && reconcile.spent !== undefined && reconcileDismissedDay !== dayStampLocal() && (
                <div className={css.reconcileNotice} data-testid="billing-reconcile-notice" role="note">
                  <span className={css.reconcileIcon} aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9" />
                      <line x1="12" y1="10" x2="12" y2="16" />
                      <line x1="12" y1="7.5" x2="12.01" y2="7.5" />
                    </svg>
                  </span>
                  <span className={css.reconcileText}>
                    {t('reconcileDrift')
                      .replace('{provider}', reconcile.provider ?? '')
                      .replace('{spent}', money(reconcile.spent))
                      .replace('{today}', money(reconcile.todayOfficialCost ?? 0))}
                  </span>
                  <button
                    type="button"
                    className={css.reconcileDismiss}
                    data-testid="billing-reconcile-dismiss"
                    onClick={dismissReconcile}
                  >
                    {t('reconcileDismiss')}
                  </button>
                </div>
              )}
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
                      {t('monthCost')}
                    </span>
                    <div className={css.heroReadout}>
                      <span className={css.heroCurrency} aria-hidden="true">{currency === 'usd' ? '$' : '¥'}</span>
                      <span className={css.heroValue}>
                        {money(monthCost).slice(1)}
                      </span>
                    </div>
                    {/* 调用副行：呼应设计 Hero 的「758 调用」读法。 */}
                    <span className={css.heroMeta}>
                      {total.calls.toLocaleString()} {t('calls')}
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
                {/* 预算进度条：设计 Hero 的底部预算行——标签 + 进度 + 「已用/总额 · 百分比」。
                    与环形仪表盘同口径，仅在启用预算且金额 >0 时展示；环形仪表盘本身始终可见。 */}
                {budgetEnabled && budgetAmount > 0 && (
                  <div className={css.heroBudget} data-testid="billing-hero-budget">
                    <span className={css.heroBudgetLabel}>{t('budget')}</span>
                    <div
                      className={css.heroBudgetTrack}
                      role="progressbar"
                      aria-valuenow={Math.min(heroBudgetPct, 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={t('budget')}
                    >
                      <div
                        className={clsx(css.heroBudgetFill, heroBudgetPct >= 100 && css.heroBudgetFillOver)}
                        style={{ width: `${Math.min(heroBudgetPct, 100)}%` }}
                      />
                    </div>
                    <span className={css.heroBudgetValue}>
                      {money(monthCost)} / {money(budgetAmount)} · {heroBudgetPct.toFixed(1)}%
                    </span>
                  </div>
                )}
                <div className={css.heroSide}>
                  <div className={css.heroSideItem}>
                    <span className={css.heroSideLabel}>
                      {t('yearCost')}
                    </span>
                    <span className={css.heroSideValue}>
                      {money(yearCost)}
                    </span>
                  </div>
                  <div className={css.heroSideItem}>
                    <span className={css.heroSideLabel}>
                      {t('todayCost')}
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
                        {t('monthProjected')}
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
                  {t('unpricedHint').replace('{count}', String(stats.unpricedModels?.length ?? 0))}
                </div>
              )}

              {/* 联网搜索估算提示：搜索请求无用量事件，费用按次估值计入，口径透明。 */}
              {(stats.total.searchCalls ?? 0) > 0 && (
                <div className={css.unpricedHint} data-testid="billing-search-estimate-hint">
                  {t('searchEstimateHint')
                    .replace('{count}', String(stats.total.searchCalls ?? 0))
                    .replace('{each}', money(stats.searchCallEstimateCny ?? 0))}
                </div>
              )}

              {/* KPI grid */}
              <section className={css.kpiGrid} data-testid="billing-kpi-grid">
                <div className={css.kpiTile} data-testid="billing-kpi-tile">
                  <span className={css.kpiLabel}>{t('cacheHitRate')}</span>
                  <span className={clsx(css.kpiValue, css.kpiGreen)}>{formatPercent(cacheHitRate)}</span>
                  <span className={css.kpiDetail}>
                    {formatTokens(total.cacheHit)} / {formatTokens(total.cacheHit + total.cacheMiss)}
                  </span>
                </div>
                <div className={css.kpiTile}>
                  <span className={css.kpiLabel}>{t('tokens')}</span>
                  <span className={css.kpiValue}>{formatTokens(total.input + total.output)}</span>
                  <span className={css.kpiDetail}>
                    {t('inputTokens')} {formatTokens(total.input)} · {t('outputTokens')} {formatTokens(total.output)}
                  </span>
                </div>
                <div className={css.kpiTile}>
                  <span className={css.kpiLabel}>{t('avgCost')}</span>
                  <span className={css.kpiValue}>{money(avgPerCall)}</span>
                  <span className={css.kpiDetail}>{t('calls')} {total.calls.toLocaleString()}</span>
                </div>
                <div className={css.kpiTile}>
                  <span className={css.kpiLabel}>{t('calls')}</span>
                  <span className={css.kpiValue}>{total.calls.toLocaleString()}</span>
                  <span className={css.kpiDetail}>{modelRows.length} {t('models')}</span>
                </div>
              </section>

              {/* 用量热力图：概览常驻区块（月历信息密度高，进入二级 Tab 后不再折叠）。
              头部带「活跃天数 / 连续使用」摘要与 月/年 范围切换。 */}
              <section className={css.panel} data-testid="billing-panel-heatmap">
                <div className={css.panelHead}>
                  <h3 className={css.panelTitle}>
                    {t('heatmap')}
                  </h3>
                  <div className={css.heatmapRangeSwitch} data-testid="billing-heatmap-range" role="group" aria-label={t('heatmap')}>
                    {(['month', 'year'] as const).map(r => (
                      <button
                        key={r}
                        type="button"
                        className={clsx(css.heatmapRangeButton, heatmapRange === r && css.heatmapRangeButtonActive)}
                        data-testid={`billing-heatmap-range-${r}`}
                        aria-pressed={heatmapRange === r}
                        onClick={() => { setHeatmapRange(r) }}
                      >
                        {r === 'month' ? t('heatmapMonth') : t('heatmapYear')}
                      </button>
                    ))}
                  </div>
                  <span className={css.panelHint} data-testid="billing-heatmap-summary">
                    {t('activeDays')} {activeDays} · {t('streakDays')} {streakDays}
                  </span>
                </div>
                <UsageHeatmap days={heatmapDays} currency={currency} t={t} range={heatmapRange} />
              </section>
            </div>
          )}

          {tab === 'settings' && (
            <div className={css.tabPanel} data-testid="billing-tab-panel-settings">
              {/* 1. 月度预算：set-card——头部(标题+说明+开关) + 控制列(金额/进度/说明)。 */}
              <section className={css.setCard} data-testid="billing-budget">
                <div className={css.setCardHead}>
                  <div className={css.setCardMeta}>
                    <h3 className={css.setCardTitle}>{t('budget')}</h3>
                    <p className={css.setCardDesc}>{t('budgetHint')}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={budgetEnabled}
                    aria-label={t('budget')}
                    data-testid="billing-budget-toggle"
                    className={clsx(css.switch, budgetEnabled && css.switchOn)}
                    onClick={onToggleBudget}
                  >
                    <span className={css.switchKnob} />
                  </button>
                </div>
                {budgetEnabled && (
                  <div className={css.ctlCol}>
                    <div className={css.ctlRow}>
                      <span className={css.ctlLabel}>{t('budgetAmount')}</span>
                      <span className={css.inp} data-testid="billing-budget-input-wrap">
                        {/* 单位符号：预算以人民币元计，避免误填分/美元。 */}
                        <span className={css.affix} aria-hidden="true">¥</span>
                        <input
                          className={css.budgetInput}
                          data-testid="billing-budget-input"
                          type="number"
                          min={0}
                          step={1}
                          value={budgetAmount === 0 ? '' : budgetAmount}
                          placeholder={stats.budget !== undefined ? String(stats.budget) : '0'}
                          aria-label={`${t('budget')}（${currency === 'usd' ? 'USD' : 'CNY'}）`}
                          title={`${t('budget')}（${currency === 'usd' ? 'USD' : 'CNY'}）`}
                          onChange={(e) => { onBudgetAmount(e.target.valueAsNumber) }}
                        />
                      </span>
                    </div>
                    {budgetAmount > 0 && (() => {
                      const pct = (monthCost / budgetAmount) * 100
                      return (
                        <div className={css.ctlRowStretch}>
                          <div
                            className={css.prog}
                            role="progressbar"
                            aria-valuenow={Math.min(pct, 100)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={t('budget')}
                            data-testid="billing-budget-track"
                          >
                            {/* 分档变色：≥80% 琥珀警示，≥100% 红色脉冲。 */}
                            <div
                              className={clsx(css.progFill, pct >= 100 && css.budgetFillOver, pct >= 80 && pct < 100 && css.budgetFillWarn)}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      )
                    })()}
                    {budgetAmount > 0 && (
                      <p className={css.setCardDesc} data-testid="billing-budget-value">
                        {t('budgetSummary').replace('{used}', money(monthCost)).replace('{total}', money(budgetAmount))}
                      </p>
                    )}
                  </div>
                )}
              </section>

              {/* 2. 峰谷切换提醒：set-card——头部 + 控制列(提前量/位置/模式/系统通知/预览)。 */}
              <section className={css.setCard} data-testid="billing-peak-alert-settings">
                <div className={css.setCardHead}>
                  <div className={css.setCardMeta}>
                    <h3 className={css.setCardTitle}>{t('peakAlert')}</h3>
                    <p className={css.setCardDesc}>{t('peakAlertHint')}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={peakConfig.enabled}
                    aria-label={t('peakAlert')}
                    data-testid="billing-peak-alert-toggle"
                    className={clsx(css.switch, peakConfig.enabled && css.switchOn)}
                    onClick={() => { onPeakConfig({ ...peakConfig, enabled: !peakConfig.enabled }) }}
                  >
                    <span className={css.switchKnob} />
                  </button>
                </div>
                {peakConfig.enabled && (
                  <div className={css.ctlCol}>
                    <label className={css.ctlRow}>
                      <span className={css.ctlLabel}>{t('peakAlertLeadMin')}</span>
                      <span className={css.inp}>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          step={1}
                          value={peakConfig.leadMin}
                          className={css.budgetInput}
                          aria-label={t('peakAlertLeadMin')}
                          onChange={(e) => {
                            const v = Number(e.target.valueAsNumber)
                            onPeakConfig({
                              ...peakConfig,
                              leadMin: Number.isFinite(v) ? Math.min(30, Math.max(1, Math.round(v))) : peakConfig.leadMin,
                            })
                          }}
                        />
                      </span>
                    </label>
                    <div className={css.ctlRow}>
                      <span className={css.ctlLabel}>{t('peakAlertPos')}</span>
                      <div className={css.ctlGroup} role="radiogroup" aria-label={t('peakAlertPos')}>
                        {(['bottom-right', 'center'] as const).map(pos => (
                          <label key={pos} className={css.rdo}>
                            <input
                              type="radio"
                              name="peak-pos"
                              checked={peakConfig.position === pos}
                              onChange={() => onPeakConfig({ ...peakConfig, position: pos })}
                            />
                            <span className={css.rdoDot} aria-hidden="true" />
                            {pos === 'bottom-right' ? t('peakAlertPosCorner') : t('peakAlertPosCenter')}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className={css.ctlRow}>
                      <span className={css.ctlLabel}>{t('peakAlertMode')}</span>
                      <div className={css.ctlGroup} role="radiogroup" aria-label={t('peakAlertMode')}>
                        {(['both', 'peak', 'offPeak'] as const).map(m => (
                          <label key={m} className={css.rdo}>
                            <input
                              type="radio"
                              name="peak-mode"
                              checked={peakConfig.mode === m}
                              onChange={() => onPeakConfig({ ...peakConfig, mode: m })}
                            />
                            <span className={css.rdoDot} aria-hidden="true" />
                            {m === 'both' ? t('peakAlertModeBoth') : m === 'peak' ? t('peakAlertModePeak') : t('peakAlertModeOff')}
                          </label>
                        ))}
                      </div>
                    </div>
                    <label className={css.ctlRow}>
                      <span className={css.ctlLabel}>{t('peakAlertWebNotify')}</span>
                      <input
                        type="checkbox"
                        checked={peakConfig.webNotify}
                        aria-label={t('peakAlertWebNotify')}
                        onChange={(e) => { onPeakConfig({ ...peakConfig, webNotify: e.target.checked }) }}
                      />
                    </label>
                    <div className={css.ctlRow}>
                      <button type="button" className={css.btn} onClick={onPreviewPeak}>
                        {t('peakAlertPreview')}
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* 3. 功能开关：三个纯显隐/工具开关聚合为一行三列（usage_stats 工具 /
                  平价消耗胶囊 / 中转站列表），缩短设置页纵向长度。 */}
              <section className={css.setCard} data-testid="billing-toggle-setting">
                <div className={css.setGrid3}>
                  <div className={css.setCell} data-testid="billing-usage-stats-tool-setting">
                    <div className={css.setCardHead}>
                      <div className={css.setCardMeta}>
                        <h3 className={css.setCardTitle}>{t('usageStatsTool')}</h3>
                        <p className={css.setCardDesc}>{t('usageStatsToolHint')}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={usageStatsEnabled}
                        aria-label={t('usageStatsTool')}
                        data-testid="billing-usage-stats-tool-toggle"
                        className={clsx(css.switch, usageStatsEnabled && css.switchOn)}
                        onClick={toggleUsageStats}
                      >
                        <span className={css.switchKnob} />
                      </button>
                    </div>
                  </div>
                  <div className={css.setCell} data-testid="billing-livecost-setting">
                    <div className={css.setCardHead}>
                      <div className={css.setCardMeta}>
                        <h3 className={css.setCardTitle}>{t('liveCostBar')}</h3>
                        <p className={css.setCardDesc}>{t('liveCostBarHint')}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={liveCostPrefs.show}
                        aria-label={t('liveCostBar')}
                        data-testid="billing-livecost-toggle"
                        className={clsx(css.switch, liveCostPrefs.show && css.switchOn)}
                        onClick={() => onLiveCostPrefs({ show: !liveCostPrefs.show })}
                      >
                        <span className={css.switchKnob} />
                      </button>
                    </div>
                  </div>
                  <div className={css.setCell} data-testid="billing-site-list-setting">
                    <div className={css.setCardHead}>
                      <div className={css.setCardMeta}>
                        <h3 className={css.setCardTitle}>{t('siteListDisplay')}</h3>
                        <p className={css.setCardDesc}>{t('siteListDisplayHint')}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={sitePrefs.hideUnidentified}
                        aria-label={t('siteListDisplay')}
                        data-testid="billing-site-hide-unidentified"
                        className={clsx(css.switch, sitePrefs.hideUnidentified && css.switchOn)}
                        onClick={() => onSitePrefs({ hideUnidentified: !sitePrefs.hideUnidentified })}
                      >
                        <span className={css.switchKnob} />
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* 4. 展示内容：模型用量悬浮窗（模式 / 订阅目标）与计费卡主指标聚合为
                  一行两列；订阅目标多选随模式展开在本 cell 内，不跨列。 */}
              <section className={css.setCard} data-testid="billing-display-setting">
                <div className={css.setGrid2}>
                  <div className={css.setCell} data-testid="billing-float-setting">
                    <div className={css.setCardHead}>
                      <div className={css.setCardMeta}>
                        <h3 className={css.setCardTitle}>{t('floatWindow')}</h3>
                        <p className={css.setCardDesc}>{t('floatWindowHint')}</p>
                      </div>
                    </div>
                    <div className={css.ctlCol}>
                      <div className={css.ctlRow}>
                        <span className={css.ctlLabel}>{t('floatMode')}</span>
                        <div className={css.ctlGroup} data-testid="billing-float-mode">
                          <button
                            type="button"
                            className={clsx(css.floatModeBtn, floatPrefs.mode === 'combined' && css.floatModeBtnOn)}
                            data-testid="billing-float-mode-combined"
                            onClick={() => onFloatPrefs({ mode: 'combined', targets: floatPrefs.targets })}
                          >
                            {t('floatModeCombined')}
                          </button>
                          <button
                            type="button"
                            className={clsx(css.floatModeBtn, floatPrefs.mode === 'subscription' && css.floatModeBtnOn)}
                            data-testid="billing-float-mode-subscription"
                            onClick={() => onFloatPrefs({ mode: 'subscription', targets: floatPrefs.targets })}
                          >
                            {t('floatModeSubscription')}
                          </button>
                        </div>
                      </div>
                      {floatPrefs.mode === 'subscription' && (
                        <div className={css.ctlRow}>
                          <span className={css.ctlLabel}>{t('floatTargets')}</span>
                          <span className={css.ctlGroup} data-testid="billing-float-targets">
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
                              <span className={css.setCardDesc}>{t('floatNoTargetsHint')}</span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={css.setCell} data-testid="billing-card-setting">
                    <div className={css.setCardHead}>
                      <div className={css.setCardMeta}>
                        <h3 className={css.setCardTitle}>{t('cardDisplay')}</h3>
                        <p className={css.setCardDesc}>{t('cardDisplayHint')}</p>
                      </div>
                    </div>
                    <div className={css.ctlCol}>
                      <div className={css.ctlRow}>
                        <span className={css.ctlLabel}>{t('cardMetric')}</span>
                        <div className={css.ctlGroup} data-testid="billing-card-metric">
                          <button
                            type="button"
                            className={clsx(css.floatModeBtn, cardPrefs.metric === 'money' && css.floatModeBtnOn)}
                            data-testid="billing-card-money"
                            onClick={() => onCardPrefs({ metric: 'money' })}
                          >
                            {t('cardMetricMoney')}
                          </button>
                          <button
                            type="button"
                            className={clsx(css.floatModeBtn, cardPrefs.metric === 'tokens' && css.floatModeBtnOn)}
                            data-testid="billing-card-tokens"
                            onClick={() => onCardPrefs({ metric: 'tokens' })}
                          >
                            {t('cardMetricTokens')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 5. 自定义单价：set-card——已存价列表 + 新增行；显示层重估，口径差异见说明。 */}
              <UserPriceCard userPrices={userPrices} onUserPrices={onUserPrices} t={t} />

              {/* 6. 插件信息卡：作者 / 仓库 / 版本 / 许可证（设置 Tab 常驻）。 */}
              <PluginInfoCard t={t} version={stats.pluginVersion} />
            </div>
          )}

          {tab === 'trends' && (
            <div className={css.tabPanel} data-testid="billing-tab-panel-trends">
              {/* 1. 费用趋势：ub-card —— 头部(标题 + 7天/30天 与 费用/Token 分段) + 堆叠面积图。 */}
              <section
                className={clsx(css.ubCard, css.trendPanel)}
                data-testid="billing-panel-trend"
              >
                <div className={css.ubCardHead}>
                  <h3 className={css.ubCardTitle}>
                    {t('trend')}
                  </h3>
                  {renderSlot('billing.dashboard.decor', { position: 'trend' })}
                  <span className={css.ubCardControlGroup}>
                    <span className={css.rangeToggle} role="group" aria-label={t('trend')}>
                      {([7, 30] as const).map(days => (
                        <button
                          key={days}
                          type="button"
                          className={clsx(css.rangeButton, trendDays === days && css.rangeButtonActive)}
                          aria-pressed={trendDays === days}
                          data-testid={`billing-trend-${days}d`}
                          onClick={() => { setTrendDays(days) }}
                        >
                          {days === 7 ? t('trend7d') : t('trend30d')}
                        </button>
                      ))}
                    </span>
                    <span className={css.rangeToggle} role="group" aria-label={t('trendMetric')}>
                      {(['cost', 'tokens'] as const).map(m => (
                        <button
                          key={m}
                          type="button"
                          className={clsx(css.rangeButton, trendMetric === m && css.rangeButtonActive)}
                          aria-pressed={trendMetric === m}
                          data-testid={`billing-trend-metric-${m}`}
                          onClick={() => { setTrendMetric(m) }}
                        >
                          {m === 'cost' ? t('trendMetricCost') : t('trendMetricTokens')}
                        </button>
                      ))}
                    </span>
                  </span>
                  <span className={css.ubCardSub}>
                    {latestDate}
                  </span>
                </div>
                <TrendChart data={trend} models={chartModels} currency={currency} metric={trendMetric} />
              </section>

              {/* 2. 每轮费用：ub-card —— 头部(标题 + 异常徽标) + 说明 + 柱状图。 */}
              {turns.length > 0 && (
                <section className={css.ubCard} data-testid="billing-panel-rounds">
                  <div className={css.ubCardHead}>
                    <h3 className={css.ubCardTitle}>
                      {t('rounds')}
                    </h3>
                    {roundFlags.length > 0 && (
                      <span className={css.ubTagError} data-testid="billing-rounds-flag-count">
                        {roundFlags.length} {t('anomaly')}
                      </span>
                    )}
                  </div>
                  <p className={css.ubCardSub}>
                    {t('roundsHint').replace('{count}', String(turns.length))}
                  </p>
                  <RoundCostChart
                    rounds={turns}
                    flags={roundFlags}
                    currency={currency}
                    t={t}
                  />
                </section>
              )}

              {/* 3. 峰谷时段占比：ub-card —— 头部 + 分摊条 + 图例（+ 挪谷省钱提示）。 */}
              {stats.byTier !== undefined && (() => {
                const shareTotal = peakShare.peak + peakShare.offPeak
                if (shareTotal <= 0) return null
                const peakPct = (peakShare.peak / shareTotal) * 100
                return (
                  <section className={css.ubCard} data-testid="billing-panel-share">
                    <div className={css.ubCardHead}>
                      <h3 className={css.ubCardTitle}>
                        {t('peakShare')}
                      </h3>
                      <span className={css.ubCardSub}>
                        {t('peakSharePerCall')}
                      </span>
                    </div>
                    <div className={css.shareTrack} data-testid="billing-share-track">
                      <div className={clsx(css.shareSeg, css.shareSegPeak)} style={{ width: `${peakPct}%` }} />
                      <div className={clsx(css.shareSeg, css.shareSegOff)} style={{ width: `${100 - peakPct}%` }} />
                    </div>
                    <div className={css.shareLegend}>
                      <span className={css.shareItem}>
                        <span className={css.shareDot} style={{ background: 'var(--dsw-static-blue-500)' }} />
                        {t('peak')}
                        <span className={css.shareValue} data-testid="billing-share-peak">
                          {money(peakShare.peak)} · {peakPct.toFixed(1)}%
                        </span>
                      </span>
                      <span className={css.shareItem}>
                        <span className={css.shareDot} style={{ background: 'color-mix(in srgb, var(--dsw-static-blue-500) 30%, var(--dsw-alias-bg-module-platform))' }} />
                        {t('offPeak')}
                        <span className={css.shareValue} data-testid="billing-share-offpeak">
                          {money(peakShare.offPeak)} · {(100 - peakPct).toFixed(1)}%
                        </span>
                      </span>
                    </div>
                    {/* 挪谷省钱提示：峰时费用若发生在低谷档可省的金额（官方峰价为谷价 2 倍）。 */}
                    {offPeakSavings > 0 && (
                      <div className={css.staleNotice} data-testid="billing-share-savings">
                        {t('offPeakSavings').replace('{amount}', money(offPeakSavings))}
                      </div>
                    )}
                  </section>
                )
              })()}
            </div>
          )}

          {tab === 'providers' && (
            <div className={css.tabPanel} data-testid="billing-tab-panel-providers">
              {/* 中转站额度：识别出的 New API / Sub2API 的余额与滚动窗口；未识别
                  程序类型的占位行可隐藏（issue #17，默认隐藏）。 */}
              {visibleRelayRows.length > 0 && (
                <section className={css.panel} data-testid="billing-panel-relay-quota">
                  <div className={css.panelHead}>
                    <h3 className={css.panelTitle}>{t('panelRelayQuota')}</h3>
                  </div>
                  <div className={css.providerGroupList} data-testid="billing-relay-quotas">
                    {visibleRelayRows.map(row => (
                      <div key={row.route} className={css.siteRow} data-testid="billing-relay-quota">
                        <span className={css.siteRowName}>
                          <span className={clsx(css.siteKindTag, RELAY_KIND_CLASS[row.kind])}>{relayKindText(row.kind, t)}</span>
                          <span className={css.siteRowTitle}>{row.origin}</span>
                        </span>
                        <span className={css.siteRowMeta}>
                          {row.balance !== undefined && (
                            <span className={css.siteRowCost}>{t('relayBalance')} {row.balance.toFixed(2)}</span>
                          )}
                          {(row.windows?.length ?? 0) > 0
                            ? row.windows?.map(window => {
                              const low = window.remainingPercent < 20
                              return (
                                <span key={window.kind} className={clsx(css.siteRowCalls, low && css.siteRowCallsLow)}>{t('relayWindowUsed')} {window.usedPercent}%</span>
                              )
                            })
                            : <span className={css.siteRowCalls}>{t('relayNoQuota')}</span>}
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
                    {t('providerBilling')}
                  </h3>
                  {renderSlot('billing.dashboard.decor', { position: 'models' })}
                  {/* 更新时间精确到时分秒；旧快照没有时间戳时留空。 */}
                  <span className={css.panelHint}>
                    {stats.updatedAt !== undefined
                      ? `${t('lastUpdated')} ${formatClock(stats.updatedAt)}`
                      : ''}
                  </span>
                </div>
                {quotasStale && (
                  <div className={css.staleNotice} data-testid="billing-subscriptions-stale">
                    {t('subscriptionsStale')}
                  </div>
                )}
                {providerGroups.length === 0 ? (
                  <div className={css.emptyRow} data-testid="billing-provider-empty">
                    {t('noData')}
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
                                <span className={css.providerGroupBalanceLabel}>{t('balance')}</span>
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
                                  <th>{t('model')}</th>
                                  <th className={css.numCol}>{t('calls')}</th>
                                  <th className={css.numCol}>{t('inputTokens')}</th>
                                  <th className={css.numCol}>{t('outputTokens')}</th>
                                  <th className={css.numCol}>{t('cacheHitRate')}</th>
                                  <th className={css.numCol}>{t('actual')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.models.map(row => (
                                  <tr key={row.key}>
                                    <td>
                                      <span className={css.modelCell}>
                                        <VendorLogo provider={row.provider} colorVar={row.color} />
                                        <span>
                                          <span className={css.modelName}>
                                            {row.name}
                                            {/* 未收录：真实 id 不在计费目录，费用按兜底档估算，明确标注。 */}
                                            {row.uncatalogued && (
                                              <span className={css.uncataloguedTag} data-testid="billing-uncatalogued-tag">
                                                {t('uncatalogued')}
                                              </span>
                                            )}
                                            {/* 估算价：厂商未公布官方按量单价，避免误当正式定价。 */}
                                            {row.estimatedPricing && (
                                              <span className={css.estimatedTag} data-testid="billing-estimated-tag">
                                                {t('estimatedPricing')}
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
                                        ? <span className={css.planTag}>{t('subscriptionIncluded')}</span>
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
                                        ? t('subscriptionFeePerMonth').replace('{amount}', tier.currency === 'USD' ? `$${tier.amount}` : `¥${tier.amount}`)
                                        : undefined
                                      return (
                                        <span className={css.subscriptionPlan} data-kind="code">
                                          {tierFee ?? (quota.subscriptionAmount !== undefined && quota.subscriptionAmount > 0
                                            ? t('subscriptionFeePerMonth').replace('{amount}', money(quota.subscriptionAmount))
                                            : t('planTypeCode'))}
                                          {tier?.label !== undefined && (
                                            <span className={css.subscriptionTier} data-testid={`billing-tier-${quota.provider}`}>
                                              {tier.label}
                                            </span>
                                          )}
                                          {tier !== undefined && (
                                            <span className={css.subscriptionAuto} data-testid={`billing-auto-${quota.provider}`}>
                                              {t('subscriptionAutoDetect')}
                                            </span>
                                          )}
                                        </span>
                                      )
                                    })()}
                                    {quota.planType === 'token' && <span className={css.subscriptionPlan} data-kind="token">{t('planTypeToken')}</span>}
                                    {quota.plan !== undefined && <span className={css.subscriptionPlan}>{quota.plan}</span>}
                                  </div>
                                  {statusText !== '' && <div className={css.subscriptionStatus}>{statusText}</div>}
                                  {quota.windows.length === 0 && statusText === '' && (
                                    <div className={css.subscriptionStatus}>{t('subscriptionNoApi')}</div>
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
                                              ? t('subscriptionExhausted')
                                              : t('subscriptionRemaining').replace('{pct}', String(window.remainingPercent))}
                                          </span>
                                          {window.resetsAt !== undefined && (
                                            <span className={css.subscriptionReset}>
                                              {/* 重置时间完整显示（本地时区）；与「剩余%」上下排布，不再横挤进度条。 */}
                                              {t('subscriptionReset').replace('{date}', `${localDayStamp(new Date(window.resetsAt).getTime())} ${formatClock(new Date(window.resetsAt).getTime())}`)}
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
              <div className={css.exportBar} data-testid="billing-export-bar" role="group" aria-label={t('export')}>
                <span className={css.exportLabel}>{t('export')}</span>
                <button
                  type="button"
                  className={css.exportButton}
                  data-testid="billing-export-day"
                  onClick={() => { downloadText(exportFileName('usage-daily', 'csv', Object.keys(byDay)), dayRowsCsv(byDay), 'text/csv') }}
                >
                  {t('exportCsvDay')}
                </button>
                {stats.bySession !== undefined && (
                  <button
                    type="button"
                    className={css.exportButton}
                    data-testid="billing-export-sessions"
                    onClick={() => { downloadText(exportFileName('usage-sessions', 'csv', Object.keys(byDay)), sessionRowsCsv(stats.bySession ?? []), 'text/csv') }}
                  >
                    {t('exportCsvSession')}
                  </button>
                )}
                {stats.bySite !== undefined && (
                  <button
                    type="button"
                    className={css.exportButton}
                    data-testid="billing-export-sites"
                    onClick={() => { downloadText(exportFileName('usage-sites', 'csv', Object.keys(byDay)), siteRowsCsv(stats.bySite ?? {}), 'text/csv') }}
                  >
                    {t('exportCsvSite')}
                  </button>
                )}
                <button
                  type="button"
                  className={css.exportButton}
                  data-testid="billing-export-json"
                  onClick={() => { downloadText(exportFileName('usage-stats', 'json', Object.keys(byDay)), JSON.stringify(stats, null, 2), 'application/json') }}
                >
                  {t('exportJson')}
                </button>
              </div>
              {/* 费用构成（估算）：输出成本实测计价，输入成本按 user/tool 消息
              文本长度占比摊分（日志无角色级 token 实测，标注估算口径）。 */}
              {roleRows.length > 0 && (
                <section className={css.panel} data-testid="billing-panel-roles">
                  <div className={css.panelHead}>
                    <h3 className={css.panelTitle}>
                      {t('roleCost')}
                    </h3>
                    <span className={css.panelHint}>
                      {t('roleHint')}
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
              {/* 官方 vs 三方汇总：设计 stat-card 两列——label + 大数 + 调用/占比。 */}
              {bucketSummary !== undefined && (() => {
                const totalCost = bucketSummary.officialCost + bucketSummary.thirdCost
                const officialPct = totalCost > 0 ? (bucketSummary.officialCost / totalCost) * 100 : 0
                return (
                  <div className={css.ubStatGrid} data-testid="billing-panel-buckets">
                    <div className={css.ubStatCard}>
                      <span className={css.ubStatLabel}>{t('official')}（=DeepSeek 直连）</span>
                      <span className={css.ubStatValue}>{money(bucketSummary.officialCost)}</span>
                      <span className={css.ubStatDetail}>{bucketSummary.officialCalls} {t('calls')} · {officialPct.toFixed(1)}%</span>
                    </div>
                    <div className={css.ubStatCard}>
                      <span className={css.ubStatLabel}>{t('thirdParty')}（中转）</span>
                      <span className={css.ubStatValue}>{money(bucketSummary.thirdCost)}</span>
                      <span className={css.ubStatDetail}>{bucketSummary.thirdCalls} {t('calls')} · {(100 - officialPct).toFixed(1)}%</span>
                    </div>
                  </div>
                )
              })()}
              {/* 工作区统计：设计 rowlist —— 名称 + 费用/调用 + 下钻箭头（点击展开前 5 会话）。 */}
              {stats.byWorkspace !== undefined && stats.byWorkspace.length > 0 && (
                <section className={css.ubCard} data-testid="billing-panel-workspaces">
                  <div className={css.ubCardHead}>
                    <h3 className={css.ubCardTitle}>
                      {t('workspaces')}
                    </h3>
                    <span className={css.ubCardSub}>
                      {t('workspacesHint')}
                    </span>
                  </div>
                  <ul className={css.rowlist}>
                    {stats.byWorkspace.map(row => (
                      <Fragment key={row.name}>
                        <li>
                          <button
                            type="button"
                            className={css.rowline}
                            data-testid={`billing-workspace-${row.name}`}
                            onClick={() => { setExpandedProject(expandedProject === row.name ? undefined : row.name) }}
                          >
                            <span className={css.rowlineName}>{row.name}</span>
                            <span className={css.rowlineRight}>
                              <span className={css.num}>{money(row.cost)}</span>
                              <span className={css.rowlineMuted}>{row.calls} {t('calls')}</span>
                              <span className={css.rowlineChev} aria-hidden="true">›</span>
                            </span>
                          </button>
                        </li>
                        {/* 项目下钻：展开时列出该项目成本最高的会话（最多 5 条）。 */}
                        {expandedProject === row.name && (
                          <li className={css.rowlineDrillWrap}>
                            {stats.bySession
                              ?.filter(s => projectName(s.cwd) === row.name)
                              .slice(0, 5)
                              .map(s => (
                                <div key={s.id} className={css.rowlineDrill}>
                                  <span className={css.rowlineName}>{s.title ?? s.id.slice(0, 8)}</span>
                                  <span className={css.rowlineRight}>
                                    <span className={css.num}>{money(s.cost)}</span>
                                    <span className={css.rowlineMuted}>{s.calls} {t('calls')}</span>
                                  </span>
                                </div>
                              ))}
                          </li>
                        )}
                      </Fragment>
                    ))}
                  </ul>
                </section>
              )}
              {/* 会话明细：设计 card——表（标题/项目/调用/费用/最后活跃）+ 溢出说明。 */}
              {stats.bySession !== undefined && (
                <section className={css.ubCard} data-testid="billing-panel-sessions">
                  <div className={css.ubCardHead}>
                    <h3 className={css.ubCardTitle}>
                      {t('sessions')}
                    </h3>
                    <span className={css.ubCardSub}>
                      {stats.bySession.length > SESSION_DISPLAY_LIMIT
                        ? t('sessionOverflow')
                          .replace('{limit}', String(SESSION_DISPLAY_LIMIT))
                          .replace('{total}', String(stats.bySession.length))
                        : `${stats.bySession.length}`}
                    </span>
                  </div>
                  {/* 置信度提示：部分会话数据出自旧版算法的账本行（原日志已删，无法重算）。 */}
                  {(stats.staleLedgerSessions ?? 0) > 0 && (
                    <div className={css.staleNotice} data-testid="billing-sessions-stale">
                      {t('staleLedgerNotice').replace('{count}', String(stats.staleLedgerSessions))}
                    </div>
                  )}
                  <div className={css.ubTablewrap} data-testid="billing-sessions-table">
                    <table className={css.ubTable}>
                      <thead>
                        <tr>
                          <th>{t('sessionTitle')}</th>
                          <th>{t('project')}</th>
                          <th className={css.numCol}>{t('calls')}</th>
                          <th className={css.numCol}>{t('actual')}</th>
                          <th className={css.numCol}>{t('lastActive')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.bySession.length === 0 && (
                          <tr>
                            <td colSpan={5} className={css.emptyRow}>{t('noData')}</td>
                          </tr>
                        )}
                        {stats.bySession.slice(0, SESSION_DISPLAY_LIMIT).map(row => (
                          <tr key={row.id}>
                            <td>
                              <span className={css.modelName}>{row.title ?? row.id.slice(0, 8)}</span>
                              {row.stale === true && (
                                <span className={clsx(css.ubTag, css.ubTagNeutral)} data-testid="billing-session-stale">
                                  {t('sessionStaleBadge')}
                                </span>
                              )}
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
              {/* Token 洞察：独立于费用的 token 统计（每日堆叠[结构/模型双视角] / 模型占比 / 结构 KPI / 导出）。 */}
              <TokenPanel stats={stats} trendDays={trendDays} onTrendDays={setTrendDays} models={chartModels} t={t} />
              {/* 性能：按模型 TTFT/P50/P90/生成速度/总延迟 + 按小时曲线（并入「用量」分区）。 */}
              {stats.perf !== undefined && (
                <section className={css.panel} data-testid="billing-panel-perf">
                  <div className={css.panelHead}>
                    <h3 className={css.panelTitle}>
                      {t('perfTitle')}
                    </h3>
                    <span className={css.panelHint}>
                      {t('perfHint')}
                    </span>
                  </div>
                  <PerfPanel perf={stats.perf} models={chartModels} t={t} />
                </section>
              )}
            </div>
          )}

          {tab === 'pricing' && (
            <div className={css.tabPanel} data-testid="billing-tab-panel-pricing">
              {/* 1. 汇率与峰谷说明条（中性 alert）。 */}
              <div className={css.ubAlert} role="note">
                <div className={css.ubAlertLeft}>
                  <span className={css.ubRate} data-testid="billing-rate">
                    {t('todayRate')} 1 USD = {formatMoney(rateInfo.rate)}
                  </span>
                  <span className={clsx(css.ubTag, rateInfo.live ? css.ubTagSuccess : css.ubTagNeutral)}>
                    {rateInfo.live ? t('rateLive') : t('rateBuiltin')}
                  </span>
                </div>
                <p className={css.ubAlertNote}>{t('pricingTip')}</p>
              </div>

              {/* 2. 模型单价表：ub-card —— 头部(标题+单位) + 表格（模型点+名 / 峰谷 chips / 未收录行）。 */}
              <section className={css.ubCard} data-testid="billing-panel-pricing">
                <div className={css.ubCardHead}>
                  <h3 className={css.ubCardTitle}>{t('pricing')}</h3>
                  <span className={css.ubCardSub}>{t('pricingUnit')}</span>
                </div>
                <div className={css.ubTablewrap}>
                  <table className={css.ubTable}>
                    <thead>
                      <tr>
                        <th>{t('thModel')}</th>
                        <th className={css.numCol}>{t('thInputMiss')}</th>
                        <th className={css.numCol}>{t('thInputHit')}</th>
                        <th className={css.numCol}>{t('output')}</th>
                        <th className={css.numCol}>{t('band')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catalogEntries().map((entry) => {
                        const hasPrice = entry.price.input > 0 || entry.price.output > 0
                        return (
                          // Fragment 携 key：一个目录条目渲染主行 + 附加计价子行多个 tr。
                          <Fragment key={entry.key}>
                          <tr>
                            <td>
                              <span className={css.ubModel}>
                                <VendorLogo provider={entry.provider} colorVar={resolveToken(entry.colorVar)} />
                                <span className={css.ubModelName}>
                                  {entry.name}
                                  {/* 探活命中但无内置/models.dev 价：明确标注，不参与计价。 */}
                                  {entry.uncatalogued && (
                                    <span className={css.ubTagAlert} data-testid="billing-price-uncatalogued">
                                      {t('uncatalogued')}
                                    </span>
                                  )}
                                  {/* 限时促销：生效期内在模型名后挂折扣徽章，悬停提示恢复时点；过期自动消失。 */}
                                  {entry.promo !== undefined && isPromoActive(entry.promo, Date.now()) && (
                                    <span
                                      className={css.ubTagPromo}
                                      data-testid="billing-price-promo"
                                      title={entry.promo.endsAtMs === undefined
                                        // 无截止日的长期活动：提示待厂商公告，不显示具体日期。
                                        ? t('promoOpenEnded')
                                        : t('promoUntil', { date: new Date(entry.promo.endsAtMs).toLocaleDateString() })}
                                    >
                                      {entry.promo.note ?? t('promoBadge')}
                                    </span>
                                  )}
                                </span>
                              </span>
                            </td>
                            <td className={css.numCol}>
                              {hasPrice ? unitMoney(entry.price.input, entry.price.currency) : <span className={css.na}>—</span>}
                            </td>
                            <td className={css.numCol}>
                              {hasPrice ? unitMoney(entry.price.cacheHit, entry.price.currency) : <span className={css.na}>—</span>}
                            </td>
                            <td className={css.numCol}>
                              {hasPrice ? unitMoney(entry.price.output, entry.price.currency) : <span className={css.na}>—</span>}
                            </td>
                            <td className={css.numCol}>
                              {hasPrice && entry.price.offPeak !== undefined && entry.peakHours !== undefined
                                ? (
                                  <span className={css.ubPricepair}>
                                    <span className={css.ubChipPeak}>
                                      {/* 延迟档语义（Gemini Standard/Flex）与时段语义（峰谷）标签不同。 */}
                                      <span className={css.ubChipLabel}>{entry.tierSemantics === 'latency' ? t('ubStd') : t('ubPeak')}</span>
                                      <span className={css.num}>
                                        {unitMoney(entry.price.input, entry.price.currency)} / {unitMoney(entry.price.output, entry.price.currency)}
                                      </span>
                                    </span>
                                    <span className={css.ubChipOff}>
                                      <span className={css.ubChipLabel}>{entry.tierSemantics === 'latency' ? 'Flex' : t('ubOff')}</span>
                                      <span className={css.num}>
                                        {unitMoney(entry.price.offPeak.input, entry.price.currency)} / {unitMoney(entry.price.offPeak.output, entry.price.currency)}
                                      </span>
                                    </span>
                                  </span>
                                )
                                : hasPrice
                                  ? <span className={css.flatTag}>{t('flat')}</span>
                                  : <span className={css.na}>—</span>}
                            </td>
                          </tr>
                          {/* 附加计价子行：Batch / 显式缓存等参考价，缩进挂在模型名下，不参与计费。 */}
                          {(entry.extraRows ?? []).map(row => (
                            <tr key={`${entry.key}:${row.label}`} className={css.ubExtraRow}>
                              <td>
                                <span className={css.ubExtraName}>{row.label}</span>
                                {row.note !== undefined && <span className={css.ubExtraNote}>{row.note}</span>}
                              </td>
                              <td className={css.numCol}>{row.input === undefined ? <span className={css.na}>—</span> : unitMoney(row.input, entry.price.currency)}</td>
                              <td className={css.numCol}><span className={css.na}>—</span></td>
                              <td className={css.numCol}>{row.output === undefined ? <span className={css.na}>—</span> : unitMoney(row.output, entry.price.currency)}</td>
                              <td className={css.numCol}><span className={css.na}>—</span></td>
                            </tr>
                          ))}
                          </Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 3. 计价说明：ub-card —— 头部 + 说明列表。 */}
              <section className={css.ubCard}>
                <div className={css.ubCardHead}>
                  <h3 className={css.ubCardTitle}>{t('pricingNotes')}</h3>
                </div>
                <ul className={css.ubNotes}>
                  <li className={css.ubNotesItem}>
                    <span className={css.ubNotesTerm}>{t('cacheHit')}</span>
                    <span className={css.ubNotesDesc}>{t('noteCache')}</span>
                  </li>
                  <li className={css.ubNotesItem}>
                    <span className={css.ubNotesTerm}>{t('peakBand')}</span>
                    <span className={css.ubNotesDesc}>{t('noteBand')}</span>
                  </li>
                  <li className={css.ubNotesItem}>
                    <span className={css.ubNotesTerm}>{t('pricingSource')}</span>
                    <span className={css.ubNotesDesc}>{t('noteSource')}</span>
                  </li>
                </ul>
              </section>
            </div>
          )}

          {/* ZINE: 装饰孔位（footer 锚点：条码装饰底部），所有 Tab 共享常驻。 */}
          {renderSlot('billing.dashboard.decor', { position: 'footer' })}
        </div>

        {/* 底部公共细条（ub-footer）：轮询说明 + 版本/许可证，所有 Tab 共享。 */}
        <footer className={css.modalFooter} data-testid="billing-footer">
          <span>{t('footer')}</span>
          <span>{t('footerCredit').replace('{version}', stats.pluginVersion === undefined ? '—' : `v${stats.pluginVersion}`)}</span>
        </footer>
      </div>
    </Modal>
  )
}

/**
 * VendorLogo: 模型名前显示厂商 logo（内嵌 SVG data URI，来自 models.dev）。
 * 未收录 logo 的厂商（字节豆包/文心/讯飞/商汤/百川/零一/面壁/小红书 等）回退为
 * 品牌色字母徽章，保证所有厂商都有可辨识标记，且不引入外部素材/版权风险。
 */
function VendorLogo({ provider, colorVar }: { provider: string; colorVar?: string }): React.ReactNode {
  const logo = vendorLogoOf(provider)
  if (logo !== undefined) {
    return <img className={css.vendorLogo} src={logo} alt="" aria-hidden="true" />
  }
  return (
    <span
      className={css.vendorLetter}
      style={colorVar !== undefined ? { background: colorVar } : undefined}
      aria-hidden="true"
    >
      {provider.trim().charAt(0).toUpperCase()}
    </span>
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
  const [reconcile, setReconcile] = useState<ReconcileNotice | undefined>(undefined)
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
  // 中转站列表展示偏好（issue #17）：默认隐藏「未知路由 / 未识别」占位条目。
  const [sitePrefs, setSitePrefs] = useState<SiteListPrefs>(() => loadSiteListPrefs())
  const updateSitePrefs = useCallback((next: SiteListPrefs): void => {
    setSitePrefs(next)
    saveSiteListPrefs(next)
  }, [])
  // 即时代费条（平价消耗胶囊）显示偏好：localStorage 持久化；LiveCostBar 与本组件
  // 分属两个 React 树，写回后广播 CustomEvent 让 dock 上的胶囊条即时显隐。
  const [liveCostPrefs, setLiveCostPrefs] = useState<LiveCostBarPrefs>(() => loadLiveCostBarPrefs())
  const updateLiveCostPrefs = useCallback((next: LiveCostBarPrefs): void => {
    setLiveCostPrefs(next)
    saveLiveCostBarPrefs(next)
    window.dispatchEvent(new CustomEvent(LIVE_COST_BAR_PREF_EVENT))
  }, [])
  // 计费卡显示偏好：localStorage 持久化（修改即写回，仅 client 侧）。
  const [cardPrefs, setCardPrefs] = useState<BillingCardPrefs>(() => loadBillingCardPrefs())
  const updateCardPrefs = useCallback((next: BillingCardPrefs): void => {
    setCardPrefs(next)
    saveBillingCardPrefs(next)
  }, [])
  // 用户自定义单价：localStorage 读取一次性注入计价层（修改通过设置面板 applyUserPrices）。
  const [userPrices, setUserPrices] = useState<UserPriceMap>(() => {
    const stored = loadUserPrices()
    applyUserPrices(stored)
    return stored
  })
  const updateUserPrices = useCallback((next: UserPriceMap): void => {
    setUserPrices(next)
    applyUserPrices(next)
    saveUserPrices(next)
  }, [])
  // 显示重估后的统计：用户价变化或新快照到达时重新计算（无用户价时原样返回）。
  const displayStats = useMemo(() => recostWithUserPrices(stats), [stats, userPrices])
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
      // 用户自定义价显示重估：宿主按内置目录计价，客户端按用户价覆盖显示成本。
      if (data !== null) setStats(recostWithUserPrices(data))
    })
    void fetchBalanceDoc().then(({ balances, reconcile }) => {
      // 余额服务端恒返回内置行（空=失败），失败时保留旧快照。
      if (balances.length > 0) setBalances(balances)
      setReconcile(reconcile)
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
      // 成功返回空数组是合法结果（用户删光中转配置），必须清空旧快照；
      // 只有请求失败（catch）才保留旧值，与订阅的 stale 语义区分开。
      setRelayQuotas(list)
    }).catch(() => {
      // 刷新失败：保留上次成功快照。
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
  // 近 7 天柱状数据（费用 + 当日 token 合并一份，供 trigger 按视角取列）。
  // token 口径与悬浮窗「总 Token」一致：input + output（缓存读单列，不并入）。
  const last7 = useMemo(
    () => lastSevenDays(stats.byDay).map((day) => {
      const row = stats.byDay[day.date]
      return { date: day.date, cost: day.cost, tokens: row === undefined ? 0 : row.input + row.output }
    }),
    [stats.byDay],
  )
  // tokens 视角的主副行数字：当月/今日/本周 累计 token。
  const monthTokens = Object.entries(stats.byDay)
    .filter(([date]) => date.startsWith(today.slice(0, 7)))
    .reduce((sum, [, day]) => sum + day.input + day.output, 0)
  const todayTokens = (() => {
    const row = stats.byDay[today]
    return row === undefined ? 0 : row.input + row.output
  })()
  const weekTokens = last7.reduce((sum, day) => sum + day.tokens, 0)

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
  // 墙钟 tick：驱动峰谷切换提醒按时间周期重算。提醒提前量最小 1 分钟，30 秒
  // 粒度足以在切换前命中；否则开着面板等到切换点也不会触发（原实现只在挂载/
  // 配置变更时算一次）。
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), STATS_REFRESH_INTERVAL_MS)
    return () => { clearInterval(timer) }
  }, [])
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
    const body = t('budgetTierBody')
      .replace('{cost}', formatMoney(monthCost))
      .replace('{budget}', formatMoney(effectiveBudget))
      .replace('{pct}', String(top))
    // 通知发送失败（部分平台限制）不影响标记：当天不再重试，避免轮询轰炸。
    try {
      new Notification(t('budget'), { body })
    } catch {
      // 平台拒绝构造通知：静默跳过，进度条分档变色兜底。
    }
  }, [budgetEnabled, effectiveBudget, monthCost, tierAlertDays, actions, t])

  // 峰/谷切换前提醒（增强版）：距进入下一档不足提前量且该切换点未提醒过时，
  // 弹可视化浮层 +（可选的）系统通知。`lastTierSwitchAt` 去重跨重启生效，
  // 与旧的系统通知共用同一份去重，避免一条切换提醒弹两次。
  useEffect(() => {
    const upcoming = computePeakAlert(nowMs, peakConfig, lastTierSwitchAt)
    if (upcoming === null) return
    actions.markTierSwitchAlerted(upcoming.atMs)
    setPeakHit(upcoming)
    if (!peakConfig.webNotify) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const minutes = Math.max(1, Math.round((upcoming.atMs - nowMs) / 60_000))
    const title = upcoming.entering === 'peak' ? t('peakAlertTitlePeak') : t('peakAlertTitleOff')
    const body = upcoming.entering === 'peak'
      ? t('tierAlertEnterPeak').replace('{minutes}', String(minutes))
      : t('tierAlertEnterOff').replace('{minutes}', String(minutes))
    try {
      new Notification(title, { body })
    } catch {
      // 平台拒绝构造通知：静默跳过，浮层始终可见。
    }
  }, [nowMs, lastTierSwitchAt, peakConfig, actions, t])

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
    const body = t('balanceLowBody')
      .replace('{name}', lowBalanceRow.name)
      .replace('{balance}', formatMoney(lowBalanceRow.cny))
      .replace('{days}', lowBalanceRow.days === undefined ? '—' : String(lowBalanceRow.days))
    // 通知发送失败（部分平台限制）不影响标记：当天不再重试，避免轮询轰炸。
    try {
      new Notification(t('balance'), { body })
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
          ? t('balanceUnauthorized')
          : bal?.error === 'unreachable' || bal?.error === 'invalid'
            ? t('balanceUnreachable')
            : t('balanceUnconfigured')
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
        return { text: t('subscriptionNoApi'), low: false }
      }
      const lowest = q.windows.reduce((min, window) => Math.min(min, window.remainingPercent), 100)
      return {
        text: lowest <= 0 ? t('subscriptionExhausted') : t('subscriptionRemaining').replace('{pct}', String(lowest)),
        low: lowest < 20,
      }
    }
    return {
      direct: directEntry === undefined ? undefined : { name: directEntry[0], ...balanceStatus(directEntry[0]) },
      sub: subEntry === undefined ? undefined : { name: subEntry[0], ...quotaStatus(subEntry[0]) },
    }
  }, [stats.byDayModels, stats.byModel, stats.lowBalanceThreshold, balances, quotas, today])

  // hover 速览「数据卡」数值：全量累计用量（参考图风格）。
  const dash = useMemo(() => {
    const total = stats.total
    return {
      totalToken: total.input + total.output,
      input: total.input,
      output: total.output,
      cacheRead: total.cacheHit,
      calls: total.calls,
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
        cardPrefs={cardPrefs}
        monthTokens={monthTokens}
        todayTokens={todayTokens}
        weekTokens={weekTokens}
        floatPrefs={floatPrefs}
        subscriptions={quotas}
      />
      {open && (
        <BillingDashboard
          stats={displayStats}
          t={t}
          onClose={close}
          userPrices={userPrices}
          onUserPrices={updateUserPrices}
          health={health}
          balances={balances}
          {...(reconcile === undefined ? {} : { reconcile })}
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
          cardPrefs={cardPrefs}
          onCardPrefs={updateCardPrefs}
          sitePrefs={sitePrefs}
          onSitePrefs={updateSitePrefs}
          liveCostPrefs={liveCostPrefs}
          onLiveCostPrefs={updateLiveCostPrefs}
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
