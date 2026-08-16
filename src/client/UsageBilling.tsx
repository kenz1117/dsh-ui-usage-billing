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

import { useCallback, useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SidebarFooterActionOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import { TrendChart, type TrendPoint } from './TrendChart.tsx'
import {
  applyLivePricing, computeCost, formatMoney, formatPercent, formatTokens, formatUnitPrice, getRateInfo,
  MODEL_CATALOG, modelOf, resolveToken, type TokenUsageBuckets,
} from './pricing.ts'
import type { BalanceResponse, LivePricing, ProviderBalance } from '../pricing-shared.ts'
import { NS, type UsageBillingKey } from './locales.ts'
import css from './UsageBilling.module.css'

/** Model-connectivity health reported by the host model directory probe. */
export interface ModelHealth {
  /** Whether the probe completed (false while still loading). */
  checked: boolean
  /** True when at least one connected provider answered its model catalog. */
  available: boolean
  /** Connected provider count. */
  providers: number
  /** Provider count whose catalog probe failed. */
  failures: number
  /** Display names of providers that answered their model catalog (live). */
  okProviders: readonly string[]
  /** Display names of providers whose catalog probe failed. */
  badProviders: readonly string[]
}

/** Idle health state before the probe settles. */
const IDLE_HEALTH: ModelHealth = {
  checked: false, available: false, providers: 0, failures: 0,
  okProviders: [], badProviders: [],
}

/**
 * The dashboard's display names (中文厂商名) never equal the provider names a
 * user actually configures (deepseek, zhipu, qwen…), so the dot match also
 * accepts a bidirectional substring hit and a display-name alias list.
 */
const PROVIDER_ALIASES: Readonly<Record<string, readonly string[]>> = {
  'DeepSeek': ['deepseek'],
  '智谱 AI': ['zhipu', 'glm', 'z.ai'],
  '阿里通义': ['qwen', 'tongyi', 'dashscope', 'aliyun'],
  '字节豆包': ['doubao', 'volcengine', 'ark'],
  '月之暗面': ['moonshot', 'kimi'],
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

/** Resolve one provider's dot state: green when live, red when failed, gray when unknown. */
function providerDot(health: ModelHealth, provider: string): string | undefined {
  if (!health.checked) return css.healthIdle
  if (health.okProviders.some(live => providerMatches(provider, live))) return css.healthOk
  if (health.badProviders.some(live => providerMatches(provider, live))) return css.healthBad
  return css.healthIdle
}

/** Usage stats structure from `.dsh-usage-stats.json`. */
interface UsageStats {
  /** 服务端聚合时间戳（毫秒）；旧快照可能缺失。 */
  updatedAt?: number
  total: {
    calls: number
    input: number
    output: number
    cacheHit: number
    cacheMiss: number
    cost: number
  }
  byModel: Record<string, {
    calls: number
    input: number
    output: number
    cacheHit: number
    cacheMiss: number
    cost: number
  }>
  byDay: Record<string, {
    calls: number
    input: number
    output: number
    cacheHit: number
    cacheMiss: number
    cost: number
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
}

/** Path to the usage-stats endpoint served by this plugin's node half. */
const USAGE_STATS_PATH = '/api/billing/usage-stats'

/** Path to the live-pricing endpoint served by this plugin's node half. */
const PRICING_PATH = '/api/billing/pricing'

/** Path to the account-balance endpoint served by this plugin's node half. */
const BALANCE_PATH = '/api/billing/balance'

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
  total: { calls: 0, input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cost: 0 },
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

/** Full props type for the UsageBilling component. */
type UsageBillingProps =
  PropsRuntime<'sidebar.footer.action'>
  & SidebarFooterActionOwnerProps
  & InjectFace<{ checkModels: () => Promise<ModelHealth> }>
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
}

/**
 * Sidebar footer trigger: compact pill in wide mode, icon in rail mode.
 * @param props - framework props plus `wide` column state.
 */
function UsageBillingTrigger(props: UsageBillingProps & { onOpen: () => void; monthCost: number; todayCost: number }): React.ReactNode {
  const { wide, t, onOpen, monthCost, todayCost } = props
  // 银行卡 icon：计费语义，窄栏与宽栏共用。
  const cardIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 9.5h19" />
      <rect x="6" y="12" width="4" height="3.5" rx="0.75" />
    </svg>
  )
  if (!wide) {
    return (
      <button type="button" className={css.railButton} onClick={onOpen} title={`${t('billing.title')} · ${formatMoney(monthCost)}`}>
        {cardIcon}
      </button>
    )
  }
  return (
    <button type="button" className={css.trigger} onClick={onOpen} title={`${t('billing.title')} · 本月 ${formatMoney(monthCost)}`}>
      <span className={css.triggerIcon}>{cardIcon}</span>
      {/* 左块：今日费用为重点 */}
      <span className={css.triggerToday}>
        <span className={css.triggerMeta}>今日</span>
        <span className={css.triggerAmount}>{formatMoney(todayCost)}</span>
      </span>
      <span className={css.triggerDivider} />
      {/* 右块：当月费用为次要 */}
      <span className={css.triggerMonth}>
        <span className={css.triggerMeta}>当月</span>
        <span className={css.triggerAmountSub}>{formatMoney(monthCost)}</span>
      </span>
    </button>
  )
}

/** Props of the billing dashboard modal. */
interface BillingDashboardProps {
  stats: UsageStats
  t: (key: UsageBillingKey) => string
  onClose: () => void
  health: ModelHealth
  balances: readonly ProviderBalance[]
}

/**
 * The centered billing dashboard modal.
 * @param props - stats, locale function, close handler, model health, balances.
 */
function BillingDashboard({ stats, t, onClose, health, balances }: BillingDashboardProps): React.ReactNode {
  const { total, byModel, byDay } = stats
  // Pricing table starts collapsed; the billing table stays open.
  const [pricingOpen, setPricingOpen] = useState(false)

  // 当前汇率与来源：供单价表标题展示（实时 / 内置）。
  const rateInfo = getRateInfo()

  // 按提供方归一化匹配余额（deepseek ↔ DeepSeek）。
  const balanceFor = (provider: string): ProviderBalance | undefined =>
    balances.find(balance => normalizeProvider(balance.provider) === normalizeProvider(provider))

  // 余额列单元格：按查询状态渲染金额或占位文案。
  const renderBalance = (balance: ProviderBalance | undefined): React.ReactNode => {
    if (balance === undefined) return <span className={css.na}>—</span>
    if (balance.error === 'unconfigured') return t('billing.balanceUnconfigured')
    if (balance.error === 'unauthorized') return t('billing.balanceUnauthorized')
    if (balance.error === 'unreachable') return t('billing.balanceUnreachable')
    if (balance.totalBalance === undefined) return <span className={css.na}>—</span>
    return balance.currency === 'USD'
      ? `$${balance.totalBalance.toFixed(2)}`
      : formatMoney(balance.totalBalance)
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

  // 最近 7 天窗口（含今天）：不足一周的日期补零，图表固定为整周。
  const trendDates = useMemo(() => {
    const out: string[] = []
    for (let offset = 6; offset >= 0; offset -= 1) {
      const day = new Date()
      day.setDate(day.getDate() - offset)
      out.push(localDayStamp(day.getTime()))
    }
    return out
  }, [])
  const latestDate = trendDates.at(-1) ?? today

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
      return { date, cost: day?.cost ?? 0, calls: day?.calls ?? 0, byModel }
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
        const buckets: TokenUsageBuckets = {
          input: data.input,
          cacheHit: data.cacheHit,
          cacheMiss: data.cacheMiss,
          output: data.output,
        }
        return {
          key,
          name: entry.name,
          provider: entry.provider,
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
        }
      })
      .sort((a, b) => (b.actual ?? b.estimated) - (a.actual ?? a.estimated))
      .map((row, index) => ({
        ...row,
        color: CHART_PALETTE[index % CHART_PALETTE.length] ?? '#8b95a3',
      })),
    [byModel],
  )

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
    <Modal open onClose={onClose} title={t('billing.title')} headless className={css.dashboardModal ?? ''}>
      <div className={css.dashboard}>
        {/* Header */}
        <div className={css.dashboardHead}>
          <div>
            <h2 className={css.dashboardTitle}>{t('billing.title')}</h2>
            <p className={css.dashboardSubtitle}>
              {t('billing.lastUpdated')} {latestDate}
            </p>
          </div>
          <div className={css.dashboardRight}>
            {health.checked && (
              <span className={clsx(css.healthBadge, health.available ? css.healthBadgeOk : css.healthBadgeBad)}>
                <span className={clsx(css.healthDot, health.available ? css.healthOk : css.healthBad)} aria-hidden="true" />
                {health.available
                  ? `${health.providers} 模型可用${health.failures > 0 ? ` · ${health.failures} 失效` : ''}`
                  : `${health.failures} 模型不可用`}
              </span>
            )}
            <button type="button" className={css.closeButton} aria-label={t('billing.close')} onClick={onClose}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className={css.dashboardBody}>
          {/* Hero: 本月主数字 + 右侧 本年/今日 次统计，克制排版无渐变 */}
          <section className={css.hero}>
            <div className={css.heroMain}>
              <span className={css.heroLabel}>{t('billing.monthCost')}</span>
              <span className={css.heroValue}>{formatMoney(monthCost)}</span>
              <span className={css.heroMeta}>
                {monthCalls.toLocaleString()} {t('billing.calls')}
              </span>
            </div>
            <div className={css.heroSide}>
              <div className={css.heroSideItem}>
                <span className={css.heroSideLabel}>{t('billing.yearCost')}</span>
                <span className={css.heroSideValue}>{formatMoney(yearCost)}</span>
              </div>
              <div className={css.heroSideItem}>
                <span className={css.heroSideLabel}>{t('billing.todayCost')}</span>
                <span className={css.heroSideValue}>
                  {formatMoney(todayCost)}
                  <span className={clsx(css.delta, deltaPct >= 0 ? css.deltaUp : css.deltaDown)}>
                    {deltaPct >= 0 ? '▲' : '▼'} {Math.abs(deltaPct).toFixed(1)}%
                  </span>
                </span>
              </div>
            </div>
          </section>

          {/* KPI grid */}
          <section className={css.kpiGrid}>
            <div className={css.kpiTile}>
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
              <span className={css.kpiValue}>{formatMoney(avgPerCall)}</span>
              <span className={css.kpiDetail}>{t('billing.calls')} {total.calls.toLocaleString()}</span>
            </div>
            <div className={css.kpiTile}>
              <span className={css.kpiLabel}>{t('billing.calls')}</span>
              <span className={css.kpiValue}>{total.calls.toLocaleString()}</span>
              <span className={css.kpiDetail}>{modelRows.length} {t('billing.models')}</span>
            </div>
          </section>

          {/* Trend chart */}
          <section className={css.panel}>
            <div className={css.panelHead}>
              <h3 className={css.panelTitle}>{t('billing.trend')}</h3>
              <span className={css.panelHint}>{latestDate}</span>
            </div>
            <TrendChart data={trend} models={chartModels} />
          </section>

          {/* Model billing table */}
          <section className={css.panel}>
            <div className={css.panelHead}>
              <h3 className={css.panelTitle}>{t('billing.models')}</h3>
              {/* 更新时间精确到时分秒；旧快照没有时间戳时留空。 */}
              <span className={css.panelHint}>
                {stats.updatedAt !== undefined
                  ? `${t('billing.lastUpdated')} ${formatClock(stats.updatedAt)}`
                  : ''}
              </span>
            </div>
            <div className={css.tableScroll}>
              <table className={css.modelTable}>
                <thead>
                  <tr>
                    <th>{t('billing.models')}</th>
                    <th className={css.numCol}>{t('billing.calls')}</th>
                    <th className={css.numCol}>{t('billing.inputTokens')}</th>
                    <th className={css.numCol}>{t('billing.outputTokens')}</th>
                    <th className={css.numCol}>{t('billing.cacheHitRate')}</th>
                    <th className={css.numCol}>{t('billing.actual')}</th>
                    <th className={css.numCol}>{t('billing.balance')}</th>
                  </tr>
                </thead>
                <tbody>
                  {modelRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className={css.emptyRow}>{t('billing.noData')}</td>
                    </tr>
                  )}
                  {modelRows.map(row => (
                    <tr key={row.key}>
                      <td>
                        <span className={css.modelCell}>
                          {/* The one per-model dot doubles as the health state. */}
                          <span className={clsx(css.modelDot, providerDot(health, row.provider))} aria-hidden="true" />
                          <span>
                            <span className={css.modelName}>{row.name}</span>
                            <span className={css.modelProvider}>{row.provider}</span>
                          </span>
                        </span>
                      </td>
                      <td className={css.numCol}>{row.calls.toLocaleString()}</td>
                      <td className={css.numCol}>{formatTokens(row.input)}</td>
                      <td className={css.numCol}>{formatTokens(row.output)}</td>
                      <td className={css.numCol}>{formatPercent(row.cacheHitRate)}</td>
                      <td className={css.numCol}>
                        {row.plan
                          ? <span className={css.planTag}>订阅包含</span>
                          : row.actual !== undefined ? formatMoney(row.actual) : <span className={css.na}>—</span>}
                      </td>
                      <td className={css.numCol}>{renderBalance(balanceFor(row.provider))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Pricing table — collapsed by default */}
          <section className={css.panel}>
            <button
              type="button"
              className={css.pricingToggle}
              onClick={() => { setPricingOpen(prev => !prev) }}
              aria-expanded={pricingOpen}
            >
              <span className={css.pricingToggleText}>
                <span className={css.panelTitle}>{t('billing.pricing')}</span>
                <span className={css.panelHint}>
                  {t('billing.todayRate')} 1 USD = {formatMoney(rateInfo.rate)}
                  <span className={clsx(css.rateBadge, rateInfo.live ? css.rateBadgeLive : css.rateBadgeBuiltin)}>
                    {rateInfo.live ? t('billing.rateLive') : t('billing.rateBuiltin')}
                  </span>
                </span>
              </span>
              <svg className={clsx(css.pricingChevron, pricingOpen && css.pricingChevronOpen)} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {pricingOpen && (
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
                    {MODEL_CATALOG.map(entry => (
                      <tr key={entry.key}>
                        <td>
                          <span className={css.modelCell}>
                            <span className={css.modelDot} style={{ background: resolveToken(entry.colorVar) }} />
                            <span>
                              <span className={css.modelName}>{entry.name}</span>
                              <span className={css.modelProvider}>{entry.provider}</span>
                            </span>
                          </span>
                        </td>
                        <td className={css.numCol}>
                          {entry.price.offPeak !== undefined
                            ? (
                              <span className={css.bandPrice}>
                                <span>{formatUnitPrice(entry.price.input, entry.price.currency)}</span>
                                <span className={css.bandPriceOff}>{formatUnitPrice(entry.price.offPeak.input, entry.price.currency)}</span>
                              </span>
                            )
                            : formatUnitPrice(entry.price.input, entry.price.currency)}
                        </td>
                        <td className={css.numCol}>
                          {entry.price.offPeak !== undefined
                            ? (
                              <span className={css.bandPrice}>
                                <span>{formatUnitPrice(entry.price.cacheHit, entry.price.currency)}</span>
                                <span className={css.bandPriceOff}>
                                  {formatUnitPrice(entry.price.offPeak.cacheHit, entry.price.currency)}
                                </span>
                              </span>
                            )
                            : formatUnitPrice(entry.price.cacheHit, entry.price.currency)}
                        </td>
                        <td className={css.numCol}>
                          {entry.price.offPeak !== undefined
                            ? (
                              <span className={css.bandPrice}>
                                <span>{formatUnitPrice(entry.price.output, entry.price.currency)}</span>
                                <span className={css.bandPriceOff}>
                                  {formatUnitPrice(entry.price.offPeak.output, entry.price.currency)}
                                </span>
                              </span>
                            )
                            : formatUnitPrice(entry.price.output, entry.price.currency)}
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
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
  const { t, checkModels } = props
  // Start empty; swap in real host data when the server serves valid JSON.
  const [stats, setStats] = useState<UsageStats>(EMPTY_STATS)
  const [health, setHealth] = useState<ModelHealth>(IDLE_HEALTH)
  const [balances, setBalances] = useState<readonly ProviderBalance[]>([])
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
  // answers its model catalog (live credentials), red when none do.
  useEffect(() => {
    let mounted = true
    void checkModels().then((result) => {
      if (mounted) setHealth(result)
    })
    return () => { mounted = false }
  }, [checkModels])

  const today = localDayStamp()
  // 触发胶囊的主数字：当月累计（byDay 按 YYYY-MM 前缀归并）。
  const monthCost = Object.entries(stats.byDay)
    .filter(([date]) => date.startsWith(today.slice(0, 7)))
    .reduce((sum, [, day]) => sum + day.cost, 0)

  return (
    <>
      <UsageBillingTrigger
        {...props}
        onOpen={openDashboard}
        monthCost={monthCost}
        todayCost={stats.byDay[today]?.cost ?? 0}
      />
      {open && (
        <BillingDashboard stats={stats} t={t} onClose={close} health={health} balances={balances} />
      )}
    </>
  )
}
