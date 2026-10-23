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
 *
 * v1.5.2 拆分（refactor）：纯函数 / 类型 / fetch 抽到 `client/domain/` 与
 * `client/api/`，常量抽到 `client/constants.ts`，本文件只保留组件本身
 * （UsageBilling / BillingDashboard / UsageBillingTrigger / UserPriceCard /
 * PositionMenu / SubscriptionWindowRow / BalanceDetailPopover+Row）。
 */

import { useCallback, useEffect, useMemo, useRef, useState, Fragment, type ReactNode, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import type { InjectFace, PropsLocale, PropsRenderSlots, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type { SidebarFooterActionOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { Menu, Modal, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import type { MenuEntry } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  type BillingCardPrefs,
  DEFAULT_ENABLE_USAGE_STATS_TOOL,
  type LiveCostBarPrefs,
  CURRENCY_PREF_EVENT,
  LIVE_COST_BAR_PREF_EVENT,
  loadBillingCardPrefs,
  loadKpiRange,
  type FloatWindowPrefs,
  loadFloatWindowPrefs,
  loadCurrency,
  loadPinnedModels,
  PINNED_MODELS_EVENT,
  loadProviderExpanded,
  loadProvidersTodayOnly,
  saveProviderExpanded,
  saveProvidersTodayOnly,
  loadLanguage,
  loadLiveCostBarPrefs,
  loadSiteListPrefs,
  loadUserPrices,
  saveBillingCardPrefs,
  saveFloatWindowPrefs,
  saveKpiRange,
  LANGUAGE_PREF_EVENT,
  saveCurrency,
  togglePinnedModel,
  saveLanguage,
  saveLiveCostBarPrefs,
  saveSiteListPrefs,
  saveUserPrices,
  loadDensity,
  saveDensity,
  loadMotion,
  saveMotion,
  DENSITY_PREF_EVENT,
  MOTION_PREF_EVENT,
  type DensityPref,
  type MotionPref,
  type SiteListPrefs,
  type UserPriceMap,
} from './usage-billing-settings.ts'
import { TrendChart, type TrendMetric, type TrendPoint } from './TrendChart.tsx'
import { PerfPanel } from './PerfPanel.tsx'
import { PluginInfoCard } from './PluginInfoCard.tsx'
import { TokenPanel, shortNumber } from './TokenPanel.tsx'
import { RoundCostChart, type RoundChartRow } from './round-chart.tsx'
import { UsageHeatmap, type HeatmapDay } from './heatmap.tsx'
import { flagAnomalies, type AnomalyFlag } from './anomaly.ts'
import { dayRowsCsv, downloadText, exportFileName, sessionRowsCsv, siteRowsCsv } from './export.ts'
import type { createBillingBudgetStore } from './budget-store.ts'
import { EMPTY_MODEL_BUDGETS, EMPTY_MODEL_TIER_ALERT_DAYS } from './budget-store.ts'
import { convertFromCny,
  applyLiveCatalogModels, applyUserPrices, catalogEntries, computeCost, convertUnitPrice,
  formatMoney, formatPercent, formatTokens, formatUnitPrice, getRateInfo, isPromoActive,
  channelCountdown, localDayStamp, modelOf, normalizeOriginInput, rateChannelOf, tierAt, type CostCurrency, type TokenUsageBuckets,
} from './pricing.ts'
import type { ProviderBalance, ReconcileNotice, RelayQuota } from '../pricing-shared.ts'
import type { SubscriptionQuota } from '../pricing-shared.ts'
import { NS, zh, en, type UsageBillingKey } from './locales.ts'
import { bandStateOf } from './band-dot.ts'
import type { BillingLanguage } from './usage-billing-settings.ts'
import { localizeRowLabel } from './label-display.ts'
import { filterRateRows } from './rate-search.ts'
import { localizeProviderName, channelDisplayName, directChannelRoute } from './provider-display.ts'
import { tierInfoOf } from './plan-knowledge.ts'
import { computePeakAlert, loadPeakAlertConfig, savePeakAlertConfig, type PeakAlertConfig, type PeakAlertHit } from './peak-alert.ts'
import { PeakAlertBanner } from './PeakAlertBanner.tsx'
import css from './UsageBilling.module.css'

// v1.5.2 拆分：以下 import 来自新抽出的模块
import {
  BUDGET_ALERT_TIERS,
  CHART_PALETTE,
  DEFAULT_LOW_BALANCE_THRESHOLD,
  EMPTY_STATS,
  SESSION_DISPLAY_LIMIT,
  STATS_REFRESH_CLOSED_MS,
  STATS_REFRESH_INTERVAL_MS,
} from './constants.ts'
import {
  DASHBOARD_TABS,
  IDLE_HEALTH,
  type AvgCostRange,
  type DashboardTab,
  type KpiAgg,
  type ModelHealth,
  type ModelRow,
  type ProviderBillingGroup,
  type ProviderChannelKind,
  type SessionBillingRow,
  type UsageBillingInjected,
  type UsageStats,
} from './domain/types.ts'
import { TAB_ICONS } from './domain/icons.tsx'
import { BillingChevronDown } from './domain/host-version.ts'
import { dailyBurnRate, projectMonthCost } from './domain/forecast.ts'
import { activeDaysOf, dayTokensOf, streakDaysOf } from './domain/streak.ts'
import { lastSevenDays, sinceMondayOf, sumByDayRange } from './domain/week.ts'
import { crossedModelBudgetTiers, monthCostByModel } from './domain/model-budget.ts'
import { normalizeProvider, providerFromModelKey } from './domain/provider-aliases.ts'
import { subscriptionVendorOf } from './domain/subscription-vendors.ts'
import { rechargeUrlOf } from './domain/recharge.ts'
import { recostWithUserPrices } from './domain/recost.ts'
import { notifyAcrossInstances, notifyAllowed } from './domain/notify.ts'
import { buildSessionDisplay } from './domain/provider-merge.ts'
import { contextStore, occupancyBreakdown, occupancyRatio } from './context-store.ts'
import { agentTreeStats, buildAgentTree } from './domain/agent-tree.ts'
import { filterSessionsForViewer } from './domain/session-viewer.ts'
import { settingsSectionHidden } from './settings-search.ts'
import { formatClock, providerCostOf, providerDot, relayKindText, RELAY_KIND_CLASS, subFamilyOf, subscriptionStatusText, subscriptionWindowLabel } from './domain/kpi.ts'
import { loadUsageStats } from './api/usage-stats.ts'
import { fetchBalanceDoc } from './api/balance.ts'
import { fetchSubscriptions } from './api/subscriptions.ts'
import { fetchRelayQuotas } from './api/relay.ts'
import { loadUsageTool, saveUsageTool } from './api/usage-tool.ts'
import { lastPricingSyncedAt, loadLivePricing, syncPricingNow } from './api/pricing.ts'

/** 把 Tab id + 当前状态映射为徽章（null = 不渲染徽章）。 */
/** 订阅窗口行（已用比例进度条 + 剩余文案 + 重置时刻）：悬浮速览与订阅卡共用。 */
function SubscriptionWindowRow({ window, t }: { window: SubscriptionQuota['windows'][number]; t: (key: UsageBillingKey) => string }): React.ReactNode {
  const used = Math.min(100, Math.max(0, window.usedPercent))
  const remaining = Math.min(100, Math.max(0, window.remainingPercent))
  const exhausted = remaining <= 0
  return (
    <div className={css.subscriptionWindow}>
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
}

/** V-2 同款「?」提示：把设置卡的长描述收进悬停气泡，卡面只留标题。 */
function HelpTip({ label, t }: {
  label: string
  t: (key: UsageBillingKey) => string
}): React.ReactNode {
  void t
  return (
    <Tooltip label={label} side="top" maxWidth={280}>
      <span className={css.helpTip} role="note" aria-label={label}>?</span>
    </Tooltip>
  )
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

/** V-3 色弱友好：健康点的状态文本（绿=在线 / 红=失效 / 灰=未知）——三态不再
 *  仅靠颜色，读屏与悬停均可得（点本身保留形状，配 CSS ::after 差异化见模块）。 */
function healthDotLabel(dot: string | undefined, t: (key: UsageBillingKey) => string): string {
  if (dot === css.healthOk) return t('healthDotLive')
  if (dot === css.healthBad) return t('healthDotFailed')
  return t('healthDotUnknown')
}

/**
 * Sidebar footer trigger: compact pill in wide mode, icon in rail mode.
 * @param props - framework props plus `wide` column state.
 */
function UsageBillingTrigger(
  props: UsageBillingProps & {
    /** 显示币种（与仪表盘同一选择）；usd 时先按汇率换算再格式化。 */
    currency: CostCurrency
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
    /** hover 速览「数据卡」用量数值（累计）：输入 / 输出 / 缓存命中与未命中（算命中率用）。 */
  dash: {
    input: number
    output: number
    cacheRead: number
    cacheMiss: number
    calls: number
   }
  /** v1.5：今日 vs 昨日费用环比（百分比），触发卡涨跌徽章用。 */
  deltaPct?: number
  /** 模型用量悬浮窗偏好（模式 + 指定订阅卡目标）。 */
  floatPrefs: FloatWindowPrefs
  /** 订阅配额列表（「指定订阅卡」模式的数据来源）。 */
  subscriptions: readonly SubscriptionQuota[]
  /** 预算临界态：≥80% 进入警示（指针变红 + 卡片边缘红色脉冲），≥100% 加速脉冲。 */
  budgetPressure: 'none' | 'warn' | 'over'
  },
): React.ReactNode {
  // 币种跟随仪表盘选择：与 heatmap / round-chart / TrendChart 同一句式，先换算再格式化。
  const money = (cny: number): string => formatMoney(convertFromCny(cny, props.currency), props.currency)
  const {
    wide, t, onOpen, monthCost, todayCost, weekCost, days, vendorStatus, dash,
    floatPrefs, subscriptions, cardPrefs, monthTokens, todayTokens, weekTokens, budgetPressure, deltaPct = 0,
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

  // 速览卡 fixed 定位（issue #37）：桌面壳/宿主的侧栏容器可能 overflow:hidden，
  // absolute 弹层向上弹出会被几何裁剪（z-index 救不了裁剪）。改为 hover 时用
  // 触发卡的 viewport rect 把弹层 fixed 到其上方，彻底脱离侧栏的裁剪上下文。
  const wrapRef = useRef<HTMLSpanElement>(null)
  const [popOpen, setPopOpen] = useState(false)
  const [popPos, setPopPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 })
  // 浮窗 pointer-events:none 无法点击切换；多张订阅卡时每 1.5s 自动轮播。
  // 只在浮窗打开时轮播：此前常开后台标签页也每 1.5s 重渲染一次触发卡。
  useEffect(() => {
    if (!popOpen || floatPrefs.mode !== 'subscription' || targetSubs.length < 2) return
    const timer = setInterval(() => setSubIndex((index) => (index + 1) % targetSubs.length), 1500)
    return () => clearInterval(timer)
  }, [popOpen, floatPrefs.mode, targetSubs.length])
  // hover 桥接：弹层 portal 到 body 后不再是触发卡的 DOM 后代，鼠标从触发卡
  // 移向弹层会先触发触发卡的 mouseleave；延迟 120ms 关闭，期间进入弹层即取消。
  const popCloseTimer = useRef<number | undefined>(undefined)
  const openPop = useCallback(() => {
    window.clearTimeout(popCloseTimer.current)
    setPopOpen(true)
  }, [])
  const schedulePopClose = useCallback(() => {
    window.clearTimeout(popCloseTimer.current)
    popCloseTimer.current = window.setTimeout(() => setPopOpen(false), 120)
  }, [])
  useEffect(() => () => window.clearTimeout(popCloseTimer.current), [])
  const updatePopPos = useCallback(() => {
    const rect = wrapRef.current?.getBoundingClientRect()
    // 宽度不在此设置：悬浮卡尺寸固定（CSS .triggerPop），不随触发卡状态变化
    // （issue #45：侧栏被其他插件挤压时计费卡收窄自适应，悬浮卡保持默认宽）。
    if (rect !== undefined) setPopPos({ left: rect.left, top: rect.top - 8 })
  }, [])
  useEffect(() => {
    if (!popOpen) return
    // 侧栏内部滚动（capture 捕获非 window 的滚动容器）与窗口缩放都会移动触发卡。
    const onScroll = (): void => updatePopPos()
    /* 审计 S6：仅读取滚动位置，passive 让浏览器不必等待主线程即可滚动。 */
    window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true } as EventListenerOptions)
      window.removeEventListener('resize', onScroll)
    }
  }, [popOpen, updatePopPos])

  // 仪表指针水位：当日费用相对近 7 日均值（1.0 = 与日均持平，指针垂直；
  // 越高越向右满摆）。无数据归零位。窄栏 rail 图标与宽栏卡面共用同一角度。
  const gaugeAvg = days.length > 0 ? days.reduce((sum, d) => sum + d.cost, 0) / days.length : 0
  const gaugeWater = gaugeAvg > 0 ? Math.max(0, Math.min(1, todayCost / gaugeAvg)) : 0
  const gaugeAngle = -80 + gaugeWater * 160

  // 计费 icon：40 viewBox 半圆仪表——低透明度全程轨道弧 + 水位进度弧（弧长随
  // gaugeWater 伸缩）+ 五档主刻度与细分刻度 + 数据驱动指针。圆心 (20,29)、量程
  // 半径 15、扫角 ±80°，弧长 = 15 × 160° ≈ 41.9。
  const cardIcon = (
    <svg viewBox="3.5 10 34 22" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden="true">
      {/* 全程轨道弧（量程 -80° → +80°） */}
      <path d="M5.23 26.4A15 15 0 0 1 34.77 26.4" strokeWidth={3} opacity={0.16} />
      {/* 进度弧：当日水位占量程比例，弧长随 30s 轮询平滑伸缩 */}
      <path
        d="M5.23 26.4A15 15 0 0 1 34.77 26.4"
        strokeWidth={3}
        strokeDasharray={`${(41.9 * gaugeWater).toFixed(2)} 41.9`}
        className={css.triggerGaugeArc}
      />
      {/* 主刻度（五档） */}
      <path d="M5.23 26.4 8.18 26.92M10.36 17.51 12.29 19.81M20 14v3M27.71 19.81 29.64 17.51M31.82 26.92 34.77 26.4" strokeWidth={1.6} opacity={0.7} />
      {/* 细分刻度 */}
      <path d="M7.01 21.5 8.31 22.25M14.87 14.91 15.38 16.31M24.62 16.31 25.13 14.91M31.69 22.25 32.99 21.5" strokeWidth={1.2} opacity={0.38} />
      {/* 指针：角度随当日水位旋转；CSS transform + transition 让 30s 轮询更新时平滑摆动 */}
      <line
        x1="20"
        y1="29"
        x2="20"
        y2="19.5"
        strokeWidth={2}
        className={css.triggerGaugeNeedle}
        style={{ transform: `rotate(${gaugeAngle}deg)`, transformOrigin: '20px 29px' }}
      />
      {/* 中心轴点 */}
      <circle cx="20" cy="29" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )

  if (!wide) {
    return (
      <button
        type="button"
        className={clsx(
          css.railButton,
          budgetPressure !== 'none' && css.triggerBudgetPulse,
          budgetPressure === 'over' && css.triggerBudgetOver,
        )}
        data-testid="billing-rail-button"
        onClick={onOpen}
        title={`${t('title')} · ${money(cardPrefs.span === 'day' ? todayCost : cardPrefs.span === 'week' ? weekCost : monthCost)}`}
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
    <span
      ref={wrapRef}
      className={css.triggerWrap}
      onMouseEnter={() => { updatePopPos(); openPop() }}
      onMouseLeave={schedulePopClose}
      onFocusCapture={() => { updatePopPos(); openPop() }}
      onBlurCapture={() => setPopOpen(false)}
    >
      <button
        type="button"
        className={clsx(
          css.trigger,
          budgetPressure !== 'none' && css.triggerBudgetPulse,
          budgetPressure === 'over' && css.triggerBudgetOver,
        )}
        data-testid="billing-trigger"
        onClick={onOpen}
        title={`${t('title')} · ${money(cardPrefs.span === 'day' ? todayCost : cardPrefs.span === 'week' ? weekCost : monthCost)}`}
      >
        <span
          className={clsx(css.triggerIcon, budgetPressure !== 'none' && css.triggerBudgetHot)}
          data-testid="billing-trigger-icon"
        >
          {cardIcon}
        </span>
        {/* 设计 trigger-card：单值主数字（统计范围在设置里选：今日/本周/本月，默认今日），
            副行删除（issue #47 反馈：只显示一个值）。tokens 视角：无币符，K/M/B 缩写。 */}
        <span className={css.triggerMain}>
          <span className={css.triggerPrimary}>
            <span className={css.triggerLabel}>
              {tokenView
                ? (cardPrefs.span === 'day' ? t('triggerTodayTokens') : cardPrefs.span === 'week' ? t('triggerWeekTokens') : t('triggerMonthTokens'))
                : (cardPrefs.span === 'day' ? t('triggerToday') : cardPrefs.span === 'week' ? t('weekCost') : t('triggerMonth'))}
            </span>
            {(() => {
              const spanValue = cardPrefs.span === 'day'
                ? (tokenView ? todayTokens : todayCost)
                : cardPrefs.span === 'week'
                  ? (tokenView ? weekTokens : weekCost)
                  : (tokenView ? monthTokens : monthCost)
              /* v1.5：涨跌徽章 + count-up 光晕。
                 delta 按 span 口径计算：今日 vs 昨日 / 本周 vs 上周 / 本月 vs 上月。 */
              const deltaValue = cardPrefs.span === 'day' ? deltaPct : 0
              return tokenView ? (
                <span className={css.triggerMetric} data-testid="billing-trigger-span-tokens">{formatTokens(spanValue)}</span>
              ) : (
                /* 币符与数值同行（issue #51 修正）：column 布局下需显式包横排行，
                   否则 ¥ 与数字被拆成两行堆叠。 */
                <>
                  <span className={css.triggerValueRow}>
                    <span className={css.triggerYen} aria-hidden="true">{money(spanValue).charAt(0)}</span>
                    <span className={css.triggerMetric} data-testid="billing-trigger-span-money">{money(spanValue).slice(1)}</span>
                  </span>
                  {/* 涨跌徽章：设置里「今日环比」开关（issue #93）+ 非 zero delta 才显示 */}
                  {cardPrefs.showDelta && deltaValue !== 0 && (
                    <span
                      className={clsx(css.triggerDelta, deltaValue > 0 ? css.triggerDeltaUp : css.triggerDeltaDown)}
                      data-testid="billing-trigger-delta"
                    >
                      {deltaValue > 0 ? '▲' : '▼'} {Math.abs(deltaValue).toFixed(1)}%
                    </span>
                  )}
                  {/* count-up 光晕：值更新时短暂闪烁（动画令牌 --ds-t-pulse）。 */}
                  <span className={css.triggerGlow} aria-hidden="true" />
                </>
              )
            })()}
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
          portal 到 body（issue #37）：触发卡的 container-type 使其成为 fixed 后代的
          包含块，弹层坐标会被容器二次偏移（位置/宽度错乱的根源）；挂 body 后真正
          相对视口定位，同时脱离侧栏 overflow 裁剪。显隐由 React hover 态驱动，位置
          在 hover 进入与滚动/缩放时按触发卡 rect 重算；弹层自带 mouseenter/mouseleave
          与触发卡互为 hover 桥接（120ms 关闭延迟见 schedulePopClose）。 */}
      {createPortal(
      <span
        className={clsx(css.triggerPop, popOpen && css.triggerPopShown)}
        style={{ left: `${popPos.left}px`, top: `${popPos.top}px` }}
        data-testid="billing-trigger-pop"
        aria-hidden={!popOpen}
        onMouseEnter={openPop}
        onMouseLeave={schedulePopClose}
      >
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
                    {currentSub.windows.map(window => (
                      <SubscriptionWindowRow key={window.kind} window={window} t={t} />
                    ))}
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
            {/* 设计 pop-card：顶部金流光条 ::before + 标题行 + 两行三列网格（行1 日/周/月费用，
                行2 输入/输出/缓存命中；issue #47 反馈：主数字格与调用格移除）+ 主力消耗模型行 */}
            <span className={css.popHead}>
              <span className={css.popTitle}>{t('popTitle')}</span>
            </span>
            <span className={css.metricGrid}>
              <span className={css.metricCell}>
                <span className={css.metricLabel}>{t('floatPrimaryToday')}</span>
                <span className={css.metricValue}>{money(todayCost)}</span>
              </span>
              <span className={css.metricCell}>
                <span className={css.metricLabel}>{t('floatPrimaryWeek')}</span>
                <span className={css.metricValue}>{money(weekCost)}</span>
              </span>
              <span className={css.metricCell}>
                <span className={css.metricLabel}>{t('floatPrimaryMonth')}</span>
                <span className={css.metricValue}>{money(monthCost)}</span>
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
                <span className={clsx(css.metricValue, css.metricValueSuccess)}>
                  {formatPercent(
                    dash.cacheRead + dash.cacheMiss > 0 ? (dash.cacheRead / (dash.cacheRead + dash.cacheMiss)) * 100 : 0,
                  )}
                </span>
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
      </span>,
      document.body,
      )}
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
  /** 界面语言（与币种解耦，独立持久化）。 */
  language: BillingLanguage
  onLanguage: (language: BillingLanguage) => void
  /** 每轮费用明细（服务端按起始时间倒序下发）。 */
  turns: readonly RoundChartRow[]
  /**
   * 跳转宿主会话（跨插件导航）：会话行点击时调用；宿主无通道时返回 'unavailable'。
   */
  navigateToSession: (sessionId: string) => 'opened' | 'unavailable' | 'failed'
  renderSlot: DashboardRenderSlots['renderSlot']
  /** 预算偏好（开关 + 金额）：由父组件从 store 读下传。 */
  budgetEnabled: boolean
  /** 生效预算金额（用户金额优先，宿主默认兜底；0 = 未设置）。 */
  budgetAmount: number
  onToggleBudget: () => void
  onBudgetAmount: (value: number) => void
  /** U-3 按模型月度预算（模型目录键 → 人民币元）；缺键 = 不限。 */
  modelBudgets: Record<string, number>
  /** U-3 本月每模型消耗（用户价重估后口径）。 */
  monthModelCost: Record<string, number>
  /** U-3 按模型预算更新（value ≤ 0 = 移除限额）。 */
  onModelBudget: (key: string, value: number) => void
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
  /** 余额刷新超预算：本次余额来自上一次成功的查询（issue #104）。 */
  balanceStale?: boolean
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
    <span
      className={css.balanceDetailPop}
      data-testid="billing-balance-detail-pop"
      /* 弹窗点击不冒泡到厂商组头：否则切换折叠会连带收起弹窗（issue #77）。 */
      onClick={event => { event.stopPropagation() }}
    >
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
  // 勾选集合（行下标）：删除收敛到底部操作条「删除所选」，与新增/保存并列（issue #32）。
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set())
  const toggleSelect = (i: number): void =>
    setSelected(s => {
      const next = new Set(s)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })
  const removeSelected = (): void => {
    setDrafts(list => list.filter((_, idx) => !selected.has(idx)))
    setSelected(new Set())
  }
  const update = (i: number, patch: Partial<UserPriceMap[number]>): void =>
    setDrafts(list => list.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))
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
      // 从 updater 的当前行派生（而非渲染作用域的 drafts）：批量/连续输入时
      // 读到的是最新草稿，不丢同拍编辑的兄弟字段。
      const off = row.offPeak
      const next = {
        input: off === undefined ? '' : String(off.input),
        cacheHit: off === undefined ? '' : String(off.cacheHit),
        output: off === undefined ? '' : String(off.output),
        [field]: raw,
      }
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
  // 数字输入草稿（键 `${行}:main|off:${字段}`）：parse→String 每键回填会吞掉
  // 输入中的尾零/未完成小数（"1.50" 的 0 键入即被归一回 "1.5"，与用户输入打架）。
  // 草稿保留原始串，有效值照常即时提交（预览与保存不受影响），失焦丢弃草稿、
  // 显示回落到已提交值的规范形。
  const [numDrafts, setNumDrafts] = useState<Record<string, string>>({})
  const draftKey = (i: number, scope: 'main' | 'off', field: string): string => `${i}:${scope}:${field}`
  const clearNumDraft = (i: number, scope: 'main' | 'off', field: string): void =>
    setNumDrafts(d => {
      const key = draftKey(i, scope, field)
      if (d[key] === undefined) return d
      const next = { ...d }
      delete next[key]
      return next
    })
  const num = (v: number): string => (Number.isFinite(v) && v !== 0 ? String(v) : '')
  const setNum = (i: number, field: 'input' | 'cacheHit' | 'output', raw: string): void => {
    setNumDrafts(d => ({ ...d, [draftKey(i, 'main', field)]: raw }))
    if (raw === '') {
      // 清空 = 归零（原语义：主档三桶必填，0 显示为空占位）。
      update(i, { [field]: 0 })
      return
    }
    const value = Number(raw)
    if (Number.isFinite(value) && value >= 0) update(i, { [field]: value })
    // 非法串（如负数）只留草稿：行内保留上一有效值，失焦回落显示。
  }
  return (
    <section className={css.setCard} data-testid="billing-user-prices">
      <div className={css.setCardHead}>
        <div className={css.setCardMeta}>
          <h3 className={css.setCardTitle}>{t('userPrices')}<HelpTip label={t('userPricesHint')} t={t} /></h3>
        </div>
      </div>
      <div className={css.ctlCol}>
        <datalist id="billing-price-model-keys">
          {modelKeys.map(key => <option key={key} value={key} />)}
        </datalist>
        {drafts.map((row, i) => (
          <div key={i} className={css.userPriceRow} data-testid="billing-user-price-row">
            <input
              type="checkbox"
              className={css.userPriceCheck}
              data-testid="billing-user-price-select"
              checked={selected.has(i)}
              aria-label={t('userPriceSelect')}
              onChange={() => toggleSelect(i)}
            />
            <div className={css.userPriceBody}>
            <div className={css.userPriceLineMeta}>
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
            </div>
            {/* 主档/低谷档共用同一三桶输入行（标签、取值、回填不同，结构一致）。 */}
            {([
              {
                scope: 'main' as const,
                label: t('userPriceNormal'),
                testid: 'billing-user-price-normal',
                valueOf: (kind: 'input' | 'cacheHit' | 'output') => numDrafts[draftKey(i, 'main', kind)] ?? num(row[kind]),
                onChange: (kind: 'input' | 'cacheHit' | 'output', raw: string) => setNum(i, kind, raw),
              },
              // 低谷价子行：三桶留空 = 平档；三值有效即按峰/谷混合估算（issue #18）。
              {
                scope: 'off' as const,
                label: t('userPriceOffPeak'),
                testid: 'billing-user-price-offpeak',
                valueOf: (kind: 'input' | 'cacheHit' | 'output') => numDrafts[draftKey(i, 'off', kind)] ?? offPeakOf(i)[kind],
                onChange: (kind: 'input' | 'cacheHit' | 'output', raw: string) => {
                  setNumDrafts(d => ({ ...d, [draftKey(i, 'off', kind)]: raw }))
                  setOffPeak(i, kind, raw)
                },
              },
            ]).map(line => (
              <div key={line.testid} className={css.userPricePriceLine} data-testid={line.testid}>
                <span className={css.ctlLabel}>{line.label}</span>
                {(['input', 'cacheHit', 'output'] as const).map(kind => {
                  const kindLabel = kind === 'input' ? t('tokenMiss') : kind === 'cacheHit' ? t('tokenHit') : t('tokenOutput')
                  return (
                    <input
                      key={kind}
                      className={css.userPriceInputNum}
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder={kindLabel}
                      aria-label={`${line.label} ${kindLabel}`}
                      value={line.valueOf(kind)}
                      onChange={e => line.onChange(kind, e.target.value)}
                      onBlur={() => clearNumDraft(i, line.scope, kind)}
                    />
                  )
                })}
              </div>
            ))}
            </div>
          </div>
        ))}
        <div className={css.ctlRow}>
          <button type="button" className={css.exportButton} data-testid="billing-user-price-add" onClick={add}>
            {t('userPriceAdd')}
          </button>
          <button
            type="button"
            className={css.exportButton}
            data-testid="billing-user-price-remove-selected"
            disabled={selected.size === 0}
            onClick={removeSelected}
          >
            {t('userPriceRemoveSelected')}{selected.size > 0 ? ` (${selected.size})` : ''}
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
  stats, t, onClose, userPrices, onUserPrices, health, balances, reconcile, quotas, relayQuotas, currency, onCurrency, language, onLanguage, turns,
  renderSlot, budgetEnabled, budgetAmount, onToggleBudget, onBudgetAmount,
  modelBudgets, monthModelCost, onModelBudget,
  peakConfig, onPeakConfig, onPreviewPeak, floatPrefs, onFloatPrefs, cardPrefs, onCardPrefs, sitePrefs, onSitePrefs,
  liveCostPrefs, onLiveCostPrefs, quotasStale, balanceStale, navigateToSession,
}: BillingDashboardProps): React.ReactNode {
  // 上下文占用快照：宿主 token-meter 投影经会话作用域探针转发而来（无会话 / 老宿主
  // 无该投影 → undefined → 整块隐藏，不显示 0、不占位）。
  const contextOccupancy = useSyncExternalStore(contextStore.subscribe, contextStore.read)
  const contextRatio = occupancyRatio(contextOccupancy)
  const contextUsed = contextOccupancy?.projectedTokens ?? contextOccupancy?.pressureTokens
  const contextRows = occupancyBreakdown(contextOccupancy)
  // 智能体网络：从会话行的 parentId 还原委派链，逐级算链合计（哪次委派最贵）。
  const agentRoots = useMemo(() => buildAgentTree(stats.bySession ?? []), [stats.bySession])
  const agentSummary = useMemo(() => agentTreeStats(agentRoots), [agentRoots])
  // 会话跳转提示：宿主无通道 / 跳转失败时在会话表上方给一行可读反馈（不打断）。
  const [navNotice, setNavNotice] = useState<string | undefined>(undefined)
  const openSessionRow = useCallback((sessionId: string): void => {
    const result = navigateToSession(sessionId)
    if (result === 'opened') {
      setNavNotice(undefined)
      return
    }
    setNavNotice(result === 'unavailable' ? t('sessionOpenUnavailable') : t('sessionOpenFailed'))
  }, [navigateToSession, t])
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
  /* v1.5：概览提示条关闭（用户反馈「黄色说明挡视线」）——三条公告各自按天
     持久化（同 reconcile 模式），次日自动恢复显示。key 前缀 dsh-billing:。 */
  const [dismissedNotices, setDismissedNotices] = useState<ReadonlySet<string>>(() => {
    const keys = ['unpriced', 'search-estimate', 'unreadable']
    const out = new Set<string>()
    const today = new Date()
    const pad = (n: number): string => String(n).padStart(2, '0')
    const day = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
    try {
      for (const key of keys) {
        if (window.localStorage.getItem(`dsh-billing:notice-${key}-dismissed`) === day) out.add(key)
      }
    } catch { /* 读取失败按未关闭处理 */ }
    return out
  })
  const dismissNotice = useCallback((key: string): void => {
    const day = dayStampLocal()
    setDismissedNotices(prev => new Set(prev).add(key))
    try { window.localStorage.setItem(`dsh-billing:notice-${key}-dismissed`, day) } catch { /* 写入失败可忽略 */ }
  }, [])
  // 概览用量热力图范围：月（日历月）/ 半年（26 周大格，截图友好的主视觉图）/
  // 年（GitHub 风格年度贡献图，含月份与周几标注）；指标：费用 / Token 双口径。
  const [heatmapRange, setHeatmapRange] = useState<'month' | 'half' | 'year'>('month')
  const [heatmapMetric, setHeatmapMetric] = useState<'cost' | 'tokens'>('cost')
  /* v1.5 密度模式 / 动效强度：写 localStorage 即时同步 CustomEvent，
     触发 documentElement.dataset.density/motion 重写 CSS 变量。 */
  const [density, setDensityState] = useState<DensityPref>(loadDensity)
  const [motion, setMotionState] = useState<MotionPref>(loadMotion)
  /* v1.5 设置页当前活动组（左侧锚点高亮跟随）。alpha.1 用 click-set
     + 滚动；v1.5.1 加 IntersectionObserver 跟随滚动反向高亮。 */
  const [activeSettingsGroup, setActiveSettingsGroup] = useState<string>('budget')
  // 设置页全文搜索（U-4）：查询非空时，关键词未命中的分区隐藏（hidden 属性，
  // 保留 DOM 与锚点 id——清空搜索即恢复，锚点导航不受影响）。
  const [settingsQuery, setSettingsQuery] = useState('')
  const settingsSectionHiddenBy = (keywords: readonly string[]): boolean => settingsSectionHidden(settingsQuery, keywords)
  // v1.5.1 变更日志声称的 IntersectionObserver 此前并未落地（导航仅点击置
  // 高亮，滚动不跟随——用户感知为「没有导航」）。这里真正接上：观察全部
  // settings-* 分区，滚动到哪个分区高亮哪个锚点（取视口内最靠上的可见分区）。
  useEffect(() => {
    if (tab !== 'settings' || typeof IntersectionObserver === 'undefined') return
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[id^="settings-"]'))
      .filter(el => !el.closest('[hidden]'))
    if (sections.length === 0) return
    const observer = new IntersectionObserver((entries) => {
      let best: string | undefined
      let bestTop = Number.POSITIVE_INFINITY
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const top = entry.boundingClientRect.top
        if (top < bestTop) {
          bestTop = top
          best = entry.target.id
        }
      }
      if (best !== undefined) setActiveSettingsGroup(best.slice('settings-'.length))
    }, { rootMargin: '-80px 0px -55% 0px' })
    for (const section of sections) observer.observe(section)
    return () => { observer.disconnect() }
  }, [tab])
  const scrollToSettingsGroup = useCallback((id: string) => {
    setActiveSettingsGroup(id)
    if (typeof document === 'undefined') return
    const target = document.getElementById(`settings-${id}`)
    if (target === null) return
    // 不用 scrollIntoView：它会滚动所有可滚动祖先，目标在面板内已可见时宿主
    // modal 外壳仍被继续滚动，标题栏随之错位（issue #94）。改为只滚本面板的
    // dashboardBody 容器，宿主结构零波及。
    const scroller = target.closest(`.${css.dashboardBody}`)
    if (scroller === null) return
    const delta = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top
    scroller.scrollTo({ top: scroller.scrollTop + delta, behavior: 'smooth' })
  }, [])
  const setDensity = useCallback((d: DensityPref) => {
    setDensityState(d)
    saveDensity(d)
  }, [])
  const setMotion = useCallback((m: MotionPref) => {
    setMotionState(m)
    saveMotion(m)
  }, [])
  /* 把偏好应用到 documentElement——CSS 选择器 [data-density]/[data-motion] 派生 */
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.density = density
    document.documentElement.dataset.motion = motion
  }, [density, motion])
  /* 监听其他 React 树（同文档）的偏好变更——多仪表盘实例一致。 */
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onDensity = (event: Event): void => {
      const detail = (event as CustomEvent<{ density: DensityPref }>).detail
      if (detail?.density !== undefined) setDensityState(detail.density)
    }
    const onMotion = (event: Event): void => {
      const detail = (event as CustomEvent<{ motion: MotionPref }>).detail
      if (detail?.motion !== undefined) setMotionState(detail.motion)
    }
    window.addEventListener(DENSITY_PREF_EVENT, onDensity)
    window.addEventListener(MOTION_PREF_EVENT, onMotion)
    return () => {
      window.removeEventListener(DENSITY_PREF_EVENT, onDensity)
      window.removeEventListener(MOTION_PREF_EVENT, onMotion)
    }
  }, [])
  // KPI 全局统计范围（issue #47 反馈）：控制概览 KPI 七卡（含平均成本）的统计口径，
  // 默认累计；用户选择持久化到 localStorage，下次打开保持上次范围。
  const [kpiRange, setKpiRange] = useState<AvgCostRange>(loadKpiRange)

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

  // 合并会话的展开状态（issue #42）：一级默认收起，点击主行切换。
  const [expandedSessions, setExpandedSessions] = useState<ReadonlySet<string>>(new Set())
  // U-7 会话全屏查看器：开关 + 搜索查询；列表走原始 bySession（全量、平铺无折叠）。
  const [sessionViewerOpen, setSessionViewerOpen] = useState(false)
  const [sessionViewerQuery, setSessionViewerQuery] = useState('')
  const toggleSession = useCallback((id: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])
  // 同名会话合并行一次计算（此前渲染期调用两次：空态判断 + 行渲染各一遍全量排序）。
  const mergedSessions = useMemo(() => buildSessionDisplay(stats.bySession ?? []), [stats.bySession])
  // 会话明细数值列（调用/费用/最近活跃）：一级行与各级子智能体行共用（无行级闭包，提升到组件级）。
  const sessionNumCells = (r: SessionBillingRow): ReactNode => (
    <>
      <td className={css.numCol}>{r.calls.toLocaleString()}</td>
      <td className={css.numCol}>{money(r.cost)}</td>
      <td className={css.numCol}>
        {r.lastActive > 0 ? `${localDayStamp(r.lastActive)} ${formatClock(r.lastActive)}` : '—'}
      </td>
    </>
  )
  // 子智能体行递归渲染（issue #99 A）：一阶挂对话下，二阶起缩进嵌套；有下级者
  // 带链合计徽标（本行+全部下级），回答「哪一次委派最贵」。费用列恒为本行口径。
  // buildSessionDisplay 的环防护保证树无环，递归必然终止。
  const renderSubRow = (sub: SessionBillingRow, depth: number): ReactNode => (
    <Fragment key={sub.id}>
      <tr className={clsx(css.sessionChildRow, depth > 0 && css.sessionSubDeepRow)} data-testid="billing-session-sub-row">
        <td>
          <span className={clsx(css.ubTag, css.ubTagNeutral)}>{t('sessionSubRow')}</span>
          {(sub.subCalls ?? 0) > 0 && (
            <span className={clsx(css.ubTag, css.ubTagNeutral)} data-testid="billing-session-sub-chain">
              {sub.subCost !== undefined && sub.subCost > 0
                ? t('sessionSubCost').replace('{cost}', money(sub.subCost))
                : t('sessionSubCalls').replace('{calls}', (sub.subCalls ?? 0).toLocaleString())}
            </span>
          )}
          <span className={css.modelProvider}>{sub.title ?? sub.id.slice(0, 8)}</span>
        </td>
        {sessionNumCells(sub)}
      </tr>
      {sub.subs?.map(child => renderSubRow(child, depth + 1))}
    </Fragment>
  )
  // U-7 全屏查看器行：原始 bySession 全量（不做标题合并——搜索场景下平铺直接）
  // 按查询过滤标题 / 项目 / id。
  const viewerRows = useMemo(
    () => filterSessionsForViewer(stats.bySession ?? [], sessionViewerQuery),
    [stats.bySession, sessionViewerQuery],
  )
  // U-3 按模型预算行：本月有消耗的模型 ∪ 已设预算的模型，按本月消耗降序；
  // 目录内模型显示人类名，「其他」兜底条目显示原始 key。
  const modelBudgetRows = useMemo(() => {
    const keys = new Set<string>([...Object.keys(monthModelCost), ...Object.keys(modelBudgets)])
    return [...keys]
      .map(key => {
        const entry = modelOf(key)
        return { key, name: entry.key === 'other' ? undefined : entry.name, cost: monthModelCost[key] ?? 0 }
      })
      .sort((a, b) => b.cost - a.cost)
  }, [monthModelCost, modelBudgets])

  // 厂商（提供商）组展开状态（issue #77）：默认收起，点击组头展开模型明细与
  // 订阅额度。按稳定组 id 作 key（不随语言变），展开集合 localStorage 持久化。
  const [expandedProviders, setExpandedProviders] = useState<ReadonlySet<string>>(() => new Set(loadProviderExpanded()))
  const toggleProvider = useCallback((id: string) => {
    setExpandedProviders(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveProviderExpanded([...next])
      return next
    })
  }, [])
  // 「仅看今日」（issue #77）：只保留当日有消耗的厂商组与模型行，花费小计按
  // 当日计；余额与订阅额度是账户状态，数值本身不受过滤影响。localStorage 持久化。
  const [providersTodayOnly, setProvidersTodayOnly] = useState(() => loadProvidersTodayOnly())
  const toggleProvidersTodayOnly = useCallback(() => {
    setProvidersTodayOnly(prev => {
      const next = !prev
      saveProvidersTodayOnly(next)
      return next
    })
  }, [])


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
  // 价格目录手动同步：按钮进行中状态；完成（或失败）后 setState 触发重渲染，
  // 重渲染读取模块级 lastPricingSyncedAt 显示「上次同步」时间。
  const [pricingSyncing, setPricingSyncing] = useState(false)
  const syncPricing = useCallback(() => {
    if (pricingSyncing) return
    setPricingSyncing(true)
    void syncPricingNow().finally(() => { setPricingSyncing(false) })
  }, [pricingSyncing])
  const pricingSyncedAt = lastPricingSyncedAt

  // 显示币种换算：usd 时把 CNY 金额按当前汇率换算显示。
  const money = (cny: number): string => formatMoney(convertFromCny(cny, currency), currency)
  // 币种符号：单点推导，避免每个展示处各写一次三分支。
  const currencySymbol = currency === 'usd' ? '$' : currency === 'eur' ? '€' : '¥'

  // 界面语言跟随币种：USD→英文，CNY→中文；厂商显示名据此本地化。
  const lang = language
  const providerName = (name: string): string => localizeProviderName(name, lang)
  // 费率表搜索：不持久化——重开面板应当是完整表，而不是上次的过滤结果。
  const [pricingQuery, setPricingQuery] = useState('')
  // 峰谷指示点：只对真正有档位的模型渲染；固定列表跨树共享（胶囊在弹窗之外）。
  const [pinnedModels, setPinnedModels] = useState<readonly string[]>(() => loadPinnedModels())
  const [bandNow, setBandNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => { setBandNow(Date.now()) }, 30_000)
    return () => { clearInterval(timer) }
  }, [])
  const hasBandPlan = quotas.some(q => q.displayName === 'Z.ai Coding Plan' && q.status === 'ok')
  const bandLeadMs = peakConfig.leadMin * 60_000

  // 费率表单价：按用户所选币种换算后再格式化（原生币种 × 汇率）；0 价显示"免费"。
  // 切 USD 时把 ¥ 计价模型换算成 $，费率表不再固定显示人民币。
  const unitMoney = (price: number, native: 'CNY' | 'USD'): string =>
    price === 0 ? t('free') : formatUnitPrice(convertUnitPrice(price, native, currency, rateInfo.rate), currency === 'usd' ? 'USD' : currency === 'eur' ? 'EUR' : 'CNY')

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
            /* 圆圈点击切换余额详情，不冒泡到厂商组头的折叠切换（issue #77）。 */
            onClick={event => {
              event.stopPropagation()
              setBalanceDetailFor(balanceDetailFor === balance.provider ? undefined : balance.provider)
            }}
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

  // Hero 环形仪表盘：预算启用且有金额时显示「剩余预算」余量——弧 = 剩余比例
  // （满环 = 预算未动，花得越多弧越短），中心 = 剩余金额（两位小数），超支转红；
  // 未启用预算时圆环整体不渲染（issue #47 反馈）。
  const heroGauge = useMemo(() => {
    if (!(budgetEnabled && budgetAmount > 0)) return null
    const remain = budgetAmount - monthCost
    return {
      // 超支（余额耗尽）转红：弧空 + 中心数字变红。
      over: remain <= 0,
      // 弧画剩余比例：clamp 到 [0, 1]，超支时为 0（弧空）。
      remainRatio: Math.max(0, Math.min(1, remain / budgetAmount)),
      // 中心显示的剩余金额：超支按 0 计（负数余额由红色传达）。
      remainCny: Math.max(0, remain),
    }
  }, [budgetEnabled, budgetAmount, monthCost])

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

  // 热力图输入：按日指标（YYYY-MM-DD → 数值）。value 的含义跟随 heatmapMetric：
  // 费用（CNY）或 Token 总量（与趋势图/用量 KPI 同口径：输入 + 输出，issue #85）。
  const heatmapDays: HeatmapDay[] = useMemo(
    () => Object.entries(byDay).map(([date, day]) => ({
      date,
      value: heatmapMetric === 'tokens' ? dayTokensOf(day) : day.cost,
    })),
    [byDay, heatmapMetric],
  )
  // 区间合计：当前口径下全部有值日的总和（面板摘要展示，截图时的主数字）。
  const heatmapTotal = useMemo(() => heatmapDays.reduce((sum, day) => sum + day.value, 0), [heatmapDays])
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
        tokens: day === undefined ? 0 : dayTokensOf(day),
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

  // 按厂商聚合：模型用量与订阅额度都归并到同一厂商组，余额只在厂商头部显示一次。
  // 厂商组同时容纳非订阅按量模型（无订阅额度也成组）与订阅套餐（无用量也成组）。
  // 中转站额度的可见行（issue #17）：默认隐藏「未识别」类型的占位条目。
  const visibleRelayRows = useMemo(
    () => (sitePrefs.hideUnidentified ? relayQuotas.filter(row => row.kind !== 'unknown') : relayQuotas),
    [relayQuotas, sitePrefs.hideUnidentified],
  )
  // 提供商（通道）优先聚合：一级归属 = 调用实际发生的 llm 入口（腾讯云 TokenHub /
  // 腾讯云 Token Plan / DeepSeek 官方 / 直连·路由名 / 未知路由），模型品牌（目录
  // 厂商）只是行内徽标 + 副标——付费视角下「钱花给了哪个提供商」优先于「用了
  // 哪家的模型」。数据源：byDayModelsSite 模型×日×通道三维（FOLD_VERSION 8 起
  // 全量快照必含；旧快照缺失时模型统一落「未知路由」组，首次聚合后即恢复）。
  const providerGroups: ProviderBillingGroup[] = useMemo(() => {
    // 仅看今日（issue #77）：数据源收缩到当日（本地时区）一个桶——模型行与花费
    // 小计随之按当日计；余额与订阅额度是账户状态，数值本身不参与按日过滤。
    let siteSource = stats.byDayModelsSite
    if (providersTodayOnly) {
      const today = localDayStamp()
      siteSource = { [today]: stats.byDayModelsSite?.[today] ?? {} }
    }
    const cells = new Map<string, Map<string, { calls: number; input: number; output: number; cacheHit: number; cacheMiss: number; cost: number; allPlan: boolean }>>()
    for (const models of Object.values(siteSource ?? {})) {
      for (const [modelKey, sites] of Object.entries(models)) {
        for (const [siteKey, usage] of Object.entries(sites)) {
          let bucket = cells.get(siteKey)
          if (bucket === undefined) {
            bucket = new Map()
            cells.set(siteKey, bucket)
          }
          const cell = bucket.get(modelKey) ?? { calls: 0, input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cost: 0, allPlan: true }
          cell.calls += usage.calls
          cell.input += usage.input
          cell.output += usage.output
          cell.cacheHit += usage.cacheHit
          cell.cacheMiss += usage.cacheMiss
          cell.cost += usage.cost
          // 行 plan 按本格（通道）判定：聚合侧按三维格置位后，混通道模型在纯订阅
          // 通道的行也正确挂「订阅」徽标，不再借模型全局 plan（其它提供商的按量
          // 历史会把它压成 false）。旧快照格缺字段时回退模型全局口径。
          cell.allPlan = cell.allPlan && (usage.plan ?? stats.byModel?.[modelKey]?.plan === true)
          bucket.set(modelKey, cell)
        }
      }
    }
    const modelsByChannel = new Map<string, ModelRow[]>()
    for (const [siteKey, bucket] of cells) {
      // 未知通道（issue #82）：数据面已不计价（支出主体无法核实），目录价预估同步
      // 归零——否则 estimated 经组头 providerCostOf 的 actual ?? estimated 兜底顶上
      // 组头，金额只是换个名目继续显示。
      const unknownChannel = !siteKey.startsWith('direct:') && !siteKey.startsWith('site:')
      const rows = [...bucket.entries()]
        .filter(([, cell]) => cell.calls > 0)
        .map(([modelKey, cell], index) => {
          const entry = modelOf(modelKey)
          const uncatalogued = entry.key === 'other'
          // 未收录模型保留 id 反推的品牌（行内徽标/副标），不再决定分组。
          const provider = uncatalogued ? providerFromModelKey(modelKey) ?? entry.provider : entry.provider
          return {
            key: modelKey,
            name: uncatalogued ? modelKey : entry.name,
            provider,
            color: CHART_PALETTE[index % CHART_PALETTE.length] ?? '#8b95a3',
            calls: cell.calls,
            input: cell.input,
            output: cell.output,
            cacheHitRate: cell.cacheHit + cell.cacheMiss > 0 ? (cell.cacheHit / (cell.cacheHit + cell.cacheMiss)) * 100 : 0,
            // 目录价预估：订阅通道行即「套餐内预估开销」，按量行即未重估前的目录口径。
            estimated: unknownChannel ? 0 : computeCost(entry, { input: cell.input, cacheHit: cell.cacheHit, cacheMiss: cell.cacheMiss, output: cell.output }),
            plan: cell.allPlan,
            ...(cell.cost > 0 ? { actual: cell.cost } : {}),
            uncatalogued,
            estimatedPricing: entry.estimated === true,
            officialCalls: 0,
            officialCost: 0,
          }
        })
        .sort((a, b) => (b.actual ?? b.estimated) - (a.actual ?? a.estimated))
      if (rows.length > 0) modelsByChannel.set(siteKey, rows)
    }
    const channelNameOf = (siteKey: string): string => channelDisplayName(siteKey, lang) ?? t('channelUnknown')
    // 同显示名的桶合并为一组：direct:deepseek 与 direct:deepseek-official 都映射
    // 「DeepSeek 官方」，按 siteKey 分列会渲染出两个同名组；同名冲突时 kind 取
    // 优先级高者（官方直连组由 direct 与 site 两桶合并而成，按 direct 显示徽章）。
    const mergedByChannel = new Map<string, ModelRow[]>()
    const kindByChannel = new Map<string, ProviderChannelKind>()
    // 显示名 → 稳定 siteKey：同名多桶合并时跟随 kind 提升同步替换（审计 S2）。
    const idByChannel = new Map<string, string>()
    const kindOfSiteKey = (siteKey: string): ProviderChannelKind =>
      siteKey.startsWith('direct:') ? 'direct' : siteKey.startsWith('site:') ? 'site' : 'unknown'
    const kindRank: Record<ProviderChannelKind, number> = { direct: 2, site: 1, unknown: 0, vendor: 0 }
    for (const [siteKey, rows] of modelsByChannel) {
      const name = channelNameOf(siteKey)
      const existing = mergedByChannel.get(name)
      if (existing === undefined) {
        mergedByChannel.set(name, [...rows])
        kindByChannel.set(name, kindOfSiteKey(siteKey))
        idByChannel.set(name, siteKey)
      }
      else {
        existing.push(...rows)
        existing.sort((a, b) => (b.actual ?? b.estimated) - (a.actual ?? a.estimated))
        const prevKind = kindByChannel.get(name) ?? 'unknown'
        const nextKind = kindOfSiteKey(siteKey)
        if (kindRank[nextKind] > kindRank[prevKind]) {
          kindByChannel.set(name, nextKind)
          idByChannel.set(name, siteKey)
        }
      }
    }
    // 订阅挂接：显示名命中通道名（腾讯云 Token Plan）优先；否则 direct:<provider id>
    // 通道存在（直连订阅路由）即挂接；无模型用量的订阅保持独立成组（口径同旧版）。
    const subscriptionsByChannel = new Map<string, SubscriptionQuota[]>()
    const subGroupNames = new Map<string, string>()
    for (const quota of quotas) {
      if (quota.status === 'not-configured') continue
      const label = quota.displayName ?? subscriptionVendorOf(quota.provider)
      const directName = channelNameOf(`direct:${quota.provider}`)
      const merged = mergedByChannel.has(label) ? label : mergedByChannel.has(directName) ? directName : undefined
      const groupKey = merged ?? `sub:${subscriptionVendorOf(quota.provider)}`
      subGroupNames.set(groupKey, merged ?? subscriptionVendorOf(quota.provider))
      const list = subscriptionsByChannel.get(groupKey)
      if (list === undefined) subscriptionsByChannel.set(groupKey, [quota])
      else list.push(quota)
    }
    // 余额挂接：通道显示名直接匹配（腾讯云 TokenHub）；DeepSeek 官方通道别名到 deepseek 余额。
    const balanceForChannel = (name: string): ProviderBalance | undefined =>
      name === channelNameOf('direct:deepseek') || name === channelNameOf('site:https://api.deepseek.com')
        ? balanceFor('deepseek') ?? balanceFor(name)
        : balanceFor(name)
    const groups: ProviderBillingGroup[] = []
    for (const [name, rows] of mergedByChannel) {
      groups.push({
        id: `ch:${idByChannel.get(name) ?? name}`,
        name,
        models: rows,
        subscriptions: subscriptionsByChannel.get(name) ?? [],
        balance: balanceForChannel(name),
        // 健康点取该通道费用最高模型的品牌健康（通道本身不做探活）。
        dot: providerDot(health, rows[0]?.provider ?? ''),
        channelKind: kindByChannel.get(name) ?? 'unknown',
      })
    }
    for (const [groupKey, name] of subGroupNames) {
      if (mergedByChannel.has(groupKey)) continue
      groups.push({
        id: groupKey,
        name,
        models: [],
        subscriptions: subscriptionsByChannel.get(groupKey) ?? [],
        balance: balanceFor(name),
        dot: providerDot(health, name),
        channelKind: 'vendor',
      })
    }
    // 纯余额组：自定义 Provider（custom: 前缀）或无对应模型/订阅的余额行，
    // 以独立组呈现（内置厂商的「未配置」行不补组，避免噪音）。
    const claimed = new Set(groups.flatMap(group => [
      normalizeProvider(group.name),
      ...(group.balance !== undefined ? [normalizeProvider(group.balance.provider)] : []),
    ]))
    for (const balance of balances) {
      if (claimed.has(normalizeProvider(balance.provider))) continue
      if (balance.error === undefined || balance.provider.startsWith('custom:')) {
        groups.push({
          id: `bal:${balance.provider}`,
          name: balance.displayName,
          models: [],
          subscriptions: [],
          balance,
          dot: providerDot(health, balance.displayName),
          channelKind: 'vendor',
        })
      }
    }
    // 仅看今日：无当日模型消耗的组（纯订阅 / 纯余额组）一并隐藏。
    // 中转站列表开关（issue #17 扩展）：开启时「未知路由」组一并隐藏——
    // 用户反馈该开关只藏了未识别占位，供应商组里的「未知」还挂着。
    const visible = groups.filter(group => {
      if (sitePrefs.hideUnidentified && group.channelKind === 'unknown') return false
      return providersTodayOnly ? group.models.length > 0 : true
    })
    return visible
      .sort((a, b) => {
        const diff = providerCostOf(b) - providerCostOf(a)
        if (diff !== 0) return diff
        // 有模型用量的组排在纯订阅组之前；同为纯订阅组保持原顺序（排序稳定）。
        if (a.models.length === 0 && b.models.length === 0) return 0
        if (b.models.length === 0) return -1
        if (a.models.length === 0) return 1
        return a.name.localeCompare(b.name, 'zh')
      })
  }, [stats.byDayModelsSite, stats.byModel, quotas, balances, health, lang, t, providersTodayOnly, sitePrefs.hideUnidentified])

  /* v1.5 Tab 徽章数据信号：从已聚合的 providerGroups / stats / pricingSyncedAt 派生。
     放这里是为了引用顺序正确（providerGroups 在 line 2406 才声明）。
     useMemo 缓存——避免 Tab 重渲染时重算整张大表。 */

  // 一键展开/收起（issue #77）：只作用于有明细可展开的组（模型行或订阅卡）；
  // 纯余额组无内容可折叠，不参与计数与按钮文案判定。
  const collapsibleProviderIds = useMemo(
    () => providerGroups.filter(group => group.models.length > 0 || group.subscriptions.length > 0).map(group => group.id),
    [providerGroups],
  )
  const providersAllExpanded = collapsibleProviderIds.length > 0
    && collapsibleProviderIds.every(id => expandedProviders.has(id))
  const toggleAllProviders = (): void => {
    const next = new Set(providersAllExpanded ? [] : collapsibleProviderIds)
    setExpandedProviders(next)
    saveProviderExpanded([...next])
  }

  // 厂商视图与通道视图共用模型表（同列结构）：表头与模型名单元格各只保留一份
  // JSX，控制 bundle 体积（本仓自设成本线，非 Store 门禁）。showTags 时才渲染
  // 估算价标注与通道徽标（仅厂商视图）。
  const modelTableHead = (
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
  )
  const modelNameCell = (
    row: { key: string; name: string; provider: string; uncatalogued?: boolean; estimatedPricing?: boolean },
  ): React.ReactNode => {
    return (
      <span className={css.modelCell}>
        <span>
          <span className={css.modelName}>
            {row.name}
            {row.uncatalogued && (
              <span className={css.uncataloguedTag} data-testid="billing-uncatalogued-tag">
                {t('uncatalogued')}
              </span>
            )}
            {row.estimatedPricing && (
              <span className={css.estimatedTag} data-testid="billing-estimated-tag">
                {t('estimatedPricing')}
              </span>
            )}
          </span>
          <span className={css.modelProvider}>{providerName(row.provider)}</span>
        </span>
      </span>
    )
  }

  // Total: real stats value when present, otherwise the estimated sum.
  // 未知通道有调用时不回退按量等价（issue #82）：estimatedTotal 含未知通道 token
  // 现算值，而未知通道费用记 0，回退会让金额换个名目重新出现。
  const unknownChannelCalls = stats.bySite?.unknown?.calls ?? 0
  const estimatedTotal = modelRows.reduce((sum, row) => sum + row.estimated, 0)
  const displayTotal = total.cost > 0 || unknownChannelCalls > 0 ? total.cost : estimatedTotal

  // KPI 七卡按所选范围聚合（issue #47 反馈）：累计沿用「实际优先」口径（含搜索
  // 估值兜底）与 total 全字段；其余范围对 byDay 逐日聚合，除零时比例回 0。
  const kpiAgg = useMemo((): KpiAgg => {
    if (kpiRange === 'all') {
      let peakDay: string | undefined
      let peakTokens = 0
      for (const [date, row] of Object.entries(byDay)) {
        const dayTokens = dayTokensOf(row)
        if (dayTokens > peakTokens) {
          peakTokens = dayTokens
          peakDay = date
        }
      }
      return {
        cost: displayTotal,
        calls: total.calls,
        input: total.input,
        output: total.output,
        cacheHit: total.cacheHit,
        cacheMiss: total.cacheMiss,
        reasoning: total.reasoning ?? 0,
        peakDay,
        peakTokens,
      }
    }
    return sumByDayRange(byDay, localDayStamp(), kpiRange)
  }, [kpiRange, displayTotal, total, byDay])

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
            <div>
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
            <span className={css.currencyToggle} role="group" aria-label={t('language')}>
              {(['en', 'zh'] as const).map(code => (
                <button
                  key={code}
                  type="button"
                  className={clsx(css.currencyButton, language === code && css.currencyButtonActive)}
                  aria-pressed={language === code}
                  data-testid={`billing-language-${code}`}
                  onClick={() => { onLanguage(code) }}
                >
                  {code === 'en' ? 'EN' : '中'}
                </button>
              ))}
            </span>
            <span className={css.currencyToggle} role="group" aria-label={t('currency')}>
              {(['cny', 'usd', 'eur'] as const).map(unit => (
                <button
                  key={unit}
                  type="button"
                  className={clsx(css.currencyButton, currency === unit && css.currencyButtonActive)}
                  aria-pressed={currency === unit}
                  data-testid={`billing-currency-${unit}`}
                  title={unit === 'cny' ? t('currencyCny') : unit === 'usd' ? t('currencyUsd') : t('currencyEur')}
                  onClick={() => { onCurrency(unit) }}
                >
                  {unit === 'cny' ? '¥ CNY' : unit === 'usd' ? '$ USD' : '€ EUR'}
                </button>
              ))}
            </span>
            {health.checked && (
              <span className={clsx(css.healthBadge, health.available ? css.healthBadgeOk : css.healthBadgeBad)}>
                <span
                  className={clsx(css.healthDot, health.available ? css.healthOk : css.healthBad)}
                  role="img"
                  aria-label={health.available ? t('healthDotLive') : t('healthDotFailed')}
                  title={health.available ? t('healthDotLive') : t('healthDotFailed')}
                />
                {health.available
                  ? `${t('healthModelsLive').replace('{n}', String(health.models))}${health.failures > 0 ? ` · ${t('healthVendorsDown').replace('{n}', String(health.failures))}` : ''}`
                  : t('healthVendorsUnavailable').replace('{n}', String(health.failures))}
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

        {/* 数据滞后提示（聚合超预算/失败时的回落下发）：标题栏下、Tab 区之上——
            所有页签都看得见，别让「上一次计算」的值被当成最新读（issue #103）。 */}
        {stats.staleSnapshot === true && (
          <div className={css.staleNotice} data-testid="billing-stale-snapshot">
            {t('staleSnapshotNotice')}
          </div>
        )}

        {/* Tab 导航（v1.5 alpha.1.1 调整）：200px 左栏布局挤压右栏内容、退回顶部分段
           控件 + 徽章数据信号。data-testid 保留为 billing-tab-nav（兼容测试）。
           原 200px 左栏设计（.tabRail）保留在 CSS 里，待 v1.6 调研 modal 宽 ≥900
           后再启用（对应 desktop 全屏 modal 形态）。 */}
        <nav className={css.tabNav} data-testid="billing-tab-nav" role="tablist" aria-label={t('title')}>
          {DASHBOARD_TABS.map(item => {
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                aria-controls={`billing-tab-panel-${item.id}`}
                className={clsx(css.tabButton, tab === item.id && css.tabButtonActive)}
                data-testid={`billing-tab-${item.id}`}
                onClick={() => { setTab(item.id) }}
              >
                <span className={css.tabRailIcon} aria-hidden="true">{TAB_ICONS[item.id]}</span>
                <span className={css.tabNavLabel}>{t(item.labelKey)}</span>
              </button>
            )
          })}
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
              {/* 余额刷新超预算：余额数字来自上一次成功的查询，明确标注别当最新读
                  （issue #104：上游查询被拖住时服务端改为回旧值并标记）。 */}
              {balanceStale === true && (
                <div className={css.staleNotice} data-testid="billing-balance-stale">
                  {t('balanceStaleNotice')}
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
                  {/* v1.5：Hero 读数下方加「预计月底」预测（按当前日均速率推算）。 */}
                  <div className={css.heroMain}>
                    <span className={css.heroLabel}>
                      {t('monthCost')}
                    </span>
                    <div className={css.heroReadout}>
                      <span className={css.heroCurrency} aria-hidden="true">{currencySymbol}</span>
                      <span className={css.heroValue}>
                        {money(monthCost).slice(1)}
                      </span>
                    </div>
                    {/* 调用副行 + 本月预计（v1.5 新增：渐变弧下推预测）。 */}
                    <span className={css.heroMeta}>
                      {total.calls.toLocaleString()} {t('calls')}
                      {monthCostProjected > 0 && (
                        <span className={css.heroPred}>
                          {' '}{t('monthProjected')} {money(monthCostProjected)}
                        </span>
                      )}
                    </span>
                  </div>
                  {/* 环形余量仪表盘：SVG stroke-dasharray 画弧，弧 = 剩余预算比例
                  （满环 = 预算未动），中心 = 剩余金额（两位小数），超支弧空转红。
                  未启用预算时整个圆环不渲染（issue #47 反馈）。 */}
                  {heroGauge !== null && (
                    <div className={css.heroGauge} data-testid="billing-hero-gauge">
                      <div className={css.heroGaugeDial}>
                        <svg
                          className={css.heroGaugeSvg}
                          viewBox="0 0 120 120"
                          aria-hidden="true"
                        >
                          {/* v1.5：渐变弧——cyan(安全) → blue(警戒) → amber(危险)。 */}
                          <defs>
                            <linearGradient id="heroRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="var(--ds-cyan)" />
                              <stop offset="55%" stopColor="var(--ds-blue)" />
                              <stop offset="100%" stopColor="var(--ds-amber)" />
                            </linearGradient>
                          </defs>
                          <circle className={css.heroGaugeTrack} cx="60" cy="60" r="52" />
                          <circle
                            className={clsx(css.heroGaugeArc, heroGauge.over && css.heroGaugeArcOver)}
                            cx="60"
                            cy="60"
                            r="52"
                            style={{ strokeDasharray: `${heroGauge.remainRatio * 326.7} 326.7` }}
                            stroke={heroGauge.over ? undefined : 'url(#heroRingGrad)'}
                          />
                        </svg>
                        <span className={css.heroGaugeCenter}>
                          <span className={clsx(css.heroGaugeRemain, heroGauge.over && css.heroGaugeRemainOver)}>
                            {currencySymbol}{convertFromCny(heroGauge.remainCny, currency).toFixed(2)}
                          </span>
                          <span className={css.heroGaugeLabel}>{t('budgetRemain')}</span>
                        </span>
                      </div>
                      {/* 已用 / 预算总额读数：原底部进度行的数值移到这里（不带百分比）。 */}
                      <span className={css.heroGaugeSub}>{money(monthCost)} / {money(budgetAmount)}</span>
                    </div>
                  )}
                </div>
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

              {/* 未计价模型提示：目录外/无价模型费用按 0 计，提醒用户自查并反馈。
                  v1.5：加 × 关闭（按天持久化，次日恢复）。 */}
              {(stats.unpricedModels?.length ?? 0) > 0 && !dismissedNotices.has('unpriced') && (
                <div className={css.unpricedHint} data-testid="billing-unpriced-hint">
                  <span className={css.unpricedHintBody}>
                    {t('unpricedHint').replace('{count}', String(stats.unpricedModels?.length ?? 0))}
                  </span>
                  <button
                    type="button"
                    className={css.noticeDismiss}
                    data-testid="billing-unpriced-dismiss"
                    aria-label={t('close')}
                    onClick={() => { dismissNotice('unpriced') }}
                  >
                    ×
                  </button>
                </div>
              )}

              {/* 联网搜索估算提示：搜索请求无用量事件，费用按次估值计入，口径透明。 */}
              {(stats.total.searchCalls ?? 0) > 0 && !dismissedNotices.has('search-estimate') && (
                <div className={css.unpricedHint} data-testid="billing-search-estimate-hint">
                  <span className={css.unpricedHintBody}>
                    {t('searchEstimateHint')
                      .replace('{count}', String(stats.total.searchCalls ?? 0))
                      .replace('{each}', money(stats.searchCallEstimateCny ?? 0))}
                  </span>
                  <button
                    type="button"
                    className={css.noticeDismiss}
                    data-testid="billing-search-estimate-dismiss"
                    aria-label={t('close')}
                    onClick={() => { dismissNotice('search-estimate') }}
                  >
                    ×
                  </button>
                </div>
              )}

              {/* 数据完整性提示：读时拒读的会话未完整计入（原始日志未动）——
                  让今日/累计偏低可自助归因。无存档子集（完全未计入）与格式拒读
                  子集（过新升级宿主 / 过旧需迁移）各给一行（issue #84）。 */}
              {(stats.unreadableSessions ?? 0) > 0 && !dismissedNotices.has('unreadable') && (
                <div className={css.staleNotice} data-testid="billing-sessions-unreadable">
                  <div className={css.staleNoticeBody}>
                    {t('unreadableNotice').replace('{count}', String(stats.unreadableSessions))}
                    {(stats.unreadableNoLedgerSessions ?? 0) > 0 && (
                      <div className={css.staleNoticeSub} data-testid="billing-sessions-no-ledger">
                        {t('unreadableNoLedgerNotice').replace('{count}', String(stats.unreadableNoLedgerSessions))}
                      </div>
                    )}
                    {(stats.unreadableFormatSessions ?? 0) > 0 && (
                      <div className={css.staleNoticeSub} data-testid="billing-sessions-format-unsupported">
                        {t('unreadableFormatNotice').replace('{count}', String(stats.unreadableFormatSessions))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className={css.noticeDismiss}
                    data-testid="billing-unreadable-dismiss"
                    aria-label={t('close')}
                    onClick={() => { dismissNotice('unreadable') }}
                  >
                    ×
                  </button>
                </div>
              )}
              {/* KPI 七卡 + 全局统计范围（issue #47 反馈）：概览与用量两处 KPI 合并到
                  这里（缓存命中率/Token/平均成本/调用 + 思考占比/输入输出比/峰值日）；
                  范围切换从平均成本单卡提升为全局口径，控制全部指标，默认累计。 */}
              <div className={css.kpiZone}>
                <div className={css.kpiZoneHead}>
                  <span className={css.kpiZoneLabel}>{t('kpiRange')}</span>
                  <div className={css.heatmapRangeSwitch} data-testid="billing-kpi-range" role="group" aria-label={t('kpiRange')}>
                    {([
                      ['today', 'avgRangeToday'],
                      ['7d', 'avgRange7d'],
                      ['week', 'avgRangeWeek'],
                      ['month', 'avgRangeMonth'],
                      ['all', 'avgRangeAll'],
                    ] as const).map(([r, key]) => (
                      <button
                        key={r}
                        type="button"
                        className={clsx(css.heatmapRangeButton, kpiRange === r && css.heatmapRangeButtonActive)}
                        data-testid={`billing-kpi-range-${r}`}
                        aria-pressed={kpiRange === r}
                        onClick={() => { setKpiRange(r); saveKpiRange(r) }}
                      >
                        {t(key)}
                      </button>
                    ))}
                  </div>
                </div>
                <section className={css.kpiGrid} data-testid="billing-kpi-grid">
                  {/* v1.5：每 KPI 卡带 delta 徽章 + mini sparkline（最近 7 天趋势）。
                      delta 来自 byDay 按日聚合，sparkline 用纯色 CSS 渲染（无图表库）。 */}
                  {(() => {
                    // 预计算各指标的按日序列（最近 7 天）与今日 vs 昨日 delta
                    const days = Object.keys(byDay).sort().slice(-7)
                    const todayKey = localDayStamp()
                    const todayIdx = days.indexOf(todayKey)
                    const at = (arr: readonly number[], i: number): number => arr[i] ?? 0
                    const seriesCost = days.map(d => byDay[d]?.cost ?? 0)
                    const seriesCalls = days.map(d => byDay[d]?.calls ?? 0)
                    const seriesTokens = days.map(d => {
                      const row = byDay[d]
                      return row === undefined ? 0 : dayTokensOf(row)
                    })
                    const seriesCacheHit = days.map(d => {
                      const row = byDay[d]
                      return row !== undefined && (row.cacheHit + row.cacheMiss) > 0
                        ? (row.cacheHit / (row.cacheHit + row.cacheMiss)) * 100
                        : 0
                    })
                    const deltaCost = todayIdx > 0 && at(seriesCost, todayIdx - 1) > 0
                      ? ((at(seriesCost, todayIdx) - at(seriesCost, todayIdx - 1)) / at(seriesCost, todayIdx - 1)) * 100
                      : 0
                    const deltaCalls = todayIdx > 0 && at(seriesCalls, todayIdx - 1) > 0
                      ? ((at(seriesCalls, todayIdx) - at(seriesCalls, todayIdx - 1)) / at(seriesCalls, todayIdx - 1)) * 100
                      : 0
                    const deltaTokens = todayIdx > 0 && at(seriesTokens, todayIdx - 1) > 0
                      ? ((at(seriesTokens, todayIdx) - at(seriesTokens, todayIdx - 1)) / at(seriesTokens, todayIdx - 1)) * 100
                      : 0
                    const deltaCacheHit = todayIdx > 0 && at(seriesCacheHit, todayIdx - 1) > 0
                      ? at(seriesCacheHit, todayIdx) - at(seriesCacheHit, todayIdx - 1)
                      : 0
                    // 简化的 sparkline 渲染（7 根柱）
                    const renderSpark = (data: number[], color: string) => (
                      <svg viewBox="0 0 28 12" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: '12px' }}>
                        {data.map((v, i) => {
                          const max = Math.max(...data, 1)
                          const h = (v / max) * 10
                          const x = i * 4
                          return <rect key={i} x={x} y={12 - h} width="2.5" height={h} fill={color} opacity={i === data.length - 1 ? 1 : 0.6} />
                        })}
                      </svg>
                    )
                    const renderDelta = (pct: number) => (
                      <span className={clsx(css.kpiDelta, pct > 0 ? css.kpiDeltaUp : pct < 0 ? css.kpiDeltaDown : css.kpiDeltaFlat)}>
                        {pct > 0 ? '▲' : pct < 0 ? '▼' : ''} {Math.abs(pct).toFixed(1)}%
                      </span>
                    )
                    return (
                      <>
                        <div className={css.kpiTile} data-testid="billing-kpi-tile">
                          <div className={css.kpiLabelRow}>
                            {/* V-2 KPI 定义 tooltip：悬停一句话口径说明，不再靠猜。 */}
                            <Tooltip label={t('kpiDescCacheHit')} side="top" maxWidth={280}>
                              <span className={css.kpiLabel}>{t('cacheHitRate')}</span>
                            </Tooltip>
                            {renderDelta(deltaCacheHit)}
                          </div>
                          <span className={clsx(css.kpiValue, css.kpiGreen)}>
                            {formatPercent(kpiAgg.cacheHit + kpiAgg.cacheMiss > 0 ? (kpiAgg.cacheHit / (kpiAgg.cacheHit + kpiAgg.cacheMiss)) * 100 : 0)}
                          </span>
                          <div className={css.kpiSpark}>{renderSpark(seriesCacheHit, 'var(--ds-cyan)')}</div>
                          <span className={css.kpiDetail}>
                            {formatTokens(kpiAgg.cacheHit)} / {formatTokens(kpiAgg.cacheHit + kpiAgg.cacheMiss)}
                            {(total.cacheWrite ?? 0) > 0 ? ` · ${t('tokenCacheWrite')} ${formatTokens(total.cacheWrite ?? 0)}` : ''}
                          </span>
                        </div>
                        <div className={css.kpiTile}>
                          <div className={css.kpiLabelRow}>
                            <Tooltip label={t('kpiDescTokens')} side="top" maxWidth={280}>
                              <span className={css.kpiLabel}>{t('tokens')}</span>
                            </Tooltip>
                            {renderDelta(deltaTokens)}
                          </div>
                          <span className={css.kpiValue}>{formatTokens(kpiAgg.input + kpiAgg.output)}</span>
                          <div className={css.kpiSpark}>{renderSpark(seriesTokens, 'var(--ds-blue)')}</div>
                          <span className={css.kpiDetail}>
                            {t('inputTokens')} {formatTokens(kpiAgg.input)} · {t('outputTokens')} {formatTokens(kpiAgg.output)}
                          </span>
                        </div>
                        <div className={css.kpiTile} data-testid="billing-kpi-avg">
                          <div className={css.kpiLabelRow}>
                            <Tooltip label={t('kpiDescAvgCost')} side="top" maxWidth={280}>
                              <span className={css.kpiLabel}>{t('avgCost')}</span>
                            </Tooltip>
                            {renderDelta(deltaCost)}
                          </div>
                          <span className={css.kpiValue}>{money(kpiAgg.calls > 0 ? kpiAgg.cost / kpiAgg.calls : 0)}</span>
                          <div className={css.kpiSpark}>{renderSpark(seriesCost, 'var(--ds-blue)')}</div>
                          <span className={css.kpiDetail}>{t('calls')} {kpiAgg.calls.toLocaleString()}</span>
                        </div>
                        <div className={css.kpiTile}>
                          <div className={css.kpiLabelRow}>
                            <Tooltip label={t('kpiDescCalls')} side="top" maxWidth={280}>
                              <span className={css.kpiLabel}>{t('calls')}</span>
                            </Tooltip>
                            {renderDelta(deltaCalls)}
                          </div>
                          <span className={css.kpiValue}>{kpiAgg.calls.toLocaleString()}</span>
                          <div className={css.kpiSpark}>{renderSpark(seriesCalls, 'var(--ds-blue)')}</div>
                          <span className={css.kpiDetail}>{modelRows.length} {t('models')}</span>
                        </div>
                        <div className={css.kpiTile} data-testid="billing-kpi-think">
                          <div className={css.kpiLabelRow}>
                            <Tooltip label={t('kpiDescReasoning')} side="top" maxWidth={280}>
                              <span className={css.kpiLabel}>{t('tokenReasoningShare')}</span>
                            </Tooltip>
                          </div>
                          <span className={clsx(css.kpiValue, css.kpiGreen)}>
                            {formatPercent(kpiAgg.output > 0 ? (kpiAgg.reasoning / kpiAgg.output) * 100 : 0)}
                          </span>
                          <span className={css.kpiDetail}>{formatTokens(kpiAgg.reasoning)}</span>
                        </div>
                        <div className={css.kpiTile} data-testid="billing-kpi-io">
                          <div className={css.kpiLabelRow}>
                            <Tooltip label={t('kpiDescIo')} side="top" maxWidth={280}>
                              <span className={css.kpiLabel}>{t('tokenIo')}</span>
                            </Tooltip>
                          </div>
                          <span className={css.kpiValue}>{(kpiAgg.output > 0 ? kpiAgg.input / kpiAgg.output : 0).toFixed(2)}</span>
                          <span className={css.kpiDetail}>
                            {formatTokens(kpiAgg.input)} / {formatTokens(kpiAgg.output)}
                          </span>
                        </div>
                        <div className={css.kpiTile} data-testid="billing-kpi-peak">
                          <div className={css.kpiLabelRow}>
                            <Tooltip label={t('kpiDescPeak')} side="top" maxWidth={280}>
                              <span className={css.kpiLabel}>{t('tokenPeak')}</span>
                            </Tooltip>
                          </div>
                          <span className={css.kpiValue}>{kpiAgg.peakTokens > 0 ? shortNumber(kpiAgg.peakTokens) : '—'}</span>
                          <span className={css.kpiDetail}>{kpiAgg.peakDay ?? '—'}</span>
                        </div>
                      </>
                    )
                  })()}
                </section>
              </div>

              {/* 用量热力图：概览常驻区块（月历信息密度高，进入二级 Tab 后不再折叠）。
              头部带 费用/Token 指标切换、月/半年/年 范围切换与「合计 + 活跃天数 + 连续使用」摘要；
              半年视图 26 周大格是截图传播的主视觉。 */}
              <section className={css.panel} data-testid="billing-panel-heatmap">
                <div className={css.panelHead}>
                  <h3 className={css.panelTitle}>
                    {t('heatmap')}
                  </h3>
                  <div className={css.heatmapRangeSwitch} data-testid="billing-heatmap-metric" role="group" aria-label={t('heatmap')}>
                    {(['cost', 'tokens'] as const).map(m => (
                      <button
                        key={m}
                        type="button"
                        className={clsx(css.heatmapRangeButton, heatmapMetric === m && css.heatmapRangeButtonActive)}
                        data-testid={`billing-heatmap-metric-${m}`}
                        aria-pressed={heatmapMetric === m}
                        onClick={() => { setHeatmapMetric(m) }}
                      >
                        {m === 'cost' ? t('metricCost') : t('metricTokens')}
                      </button>
                    ))}
                  </div>
                  <div className={css.heatmapRangeSwitch} data-testid="billing-heatmap-range" role="group" aria-label={t('heatmap')}>
                    {(['month', 'half', 'year'] as const).map(r => (
                      <button
                        key={r}
                        type="button"
                        className={clsx(css.heatmapRangeButton, heatmapRange === r && css.heatmapRangeButtonActive)}
                        data-testid={`billing-heatmap-range-${r}`}
                        aria-pressed={heatmapRange === r}
                        onClick={() => { setHeatmapRange(r) }}
                      >
                        {r === 'month' ? t('heatmapMonth') : r === 'half' ? t('heatmapHalf') : t('heatmapYear')}
                      </button>
                    ))}
                  </div>
                  <span className={css.panelHint} data-testid="billing-heatmap-summary">
                    {t('heatmapTotal')} {heatmapMetric === 'tokens' ? formatTokens(heatmapTotal) : money(heatmapTotal)}
                    {' · '}{t('activeDays')} {activeDays} · {t('streakDays')} {streakDays}
                  </span>
                </div>
                <UsageHeatmap days={heatmapDays} currency={currency} t={t} range={heatmapRange} unit={heatmapMetric} />
              </section>
            </div>
          )}

          {tab === 'context' && (
              <div className={css.tabPanel} data-testid="billing-tab-panel-context">
                {/* 上下文占用（宿主 token-meter 投影，经会话作用域探针转发）：
                    无会话 / 宿主不上报 / 老宿主无该投影 → 整块不渲染（不显示 0、不占位）。 */}
                {contextOccupancy === undefined ? (
                  <p className={css.contextEmpty} data-testid="billing-context-empty">{t('contextNoData')}</p>
                ) : (
                  <>
                    <section className={css.contextCard} data-testid="billing-context-card">
                      <div className={css.contextHead}>
                        <span className={css.contextTitle}>{t('contextOccupancy')}</span>
                        {contextRatio !== undefined && (
                          <span className={css.contextRatio}>{`${String(Math.round(contextRatio * 100))}%`}</span>
                        )}
                      </div>
                      {contextRatio !== undefined && (
                        <div className={css.contextBar} data-testid="billing-context-bar" role="img"
                          aria-label={`${t('contextOccupancy')} ${String(Math.round(contextRatio * 100))}%`}>
                          <span className={css.contextBarFill} style={{ width: `${String(Math.round(contextRatio * 100))}%` }} />
                        </div>
                      )}
                      <div className={css.contextBody}>
                        {contextUsed !== undefined && (
                          <span className={css.contextValue}>{formatTokens(contextUsed)}</span>
                        )}
                        {contextOccupancy.contextWindow !== undefined && (
                          <span className={css.contextHint}>
                            {t('contextWindow').replace('{window}', formatTokens(contextOccupancy.contextWindow))}
                          </span>
                        )}
                      </div>
                      <div className={css.contextStats}>
                        {contextOccupancy.projectedTokens !== undefined && (
                          <div className={css.contextStat}>
                            <span className={css.contextStatLabel}>{t('contextNextRequest')}</span>
                            <span className={css.contextStatValue}>{formatTokens(contextOccupancy.projectedTokens)}</span>
                          </div>
                        )}
                        {contextOccupancy.pressureTokens !== undefined && (
                          <div className={css.contextStat}>
                            <span className={css.contextStatLabel}>{t('contextLastRequest')}</span>
                            <span className={css.contextStatValue}>{formatTokens(contextOccupancy.pressureTokens)}</span>
                          </div>
                        )}
                      </div>
                    </section>
                    {contextRows.length > 0 && (
                      <section className={css.contextCard} data-testid="billing-context-breakdown">
                        <div className={css.contextHead}>
                          <span className={css.contextTitle}>{t('contextComposition')}</span>
                        </div>
                        {(() => {
                          const max = Math.max(...contextRows.map(row => row.tokens), 1)
                          return (
                            <div className={css.contextBreakdown}>
                              {contextRows.map(row => (
                                <div key={row.key} className={css.contextBreakRow}>
                                  <span className={css.contextBreakLabel}>
                                    {t(row.key === 'system' ? 'contextSystem' : row.key === 'tools' ? 'contextTools' : 'contextMessages')}
                                  </span>
                                  <span className={css.contextBreakTrack}>
                                    <span className={css.contextBreakFill} style={{ width: `${String(Math.round((row.tokens / max) * 100))}%` }} />
                                  </span>
                                  <span className={css.contextBreakValue}>{formatTokens(row.tokens)}</span>
                                </div>
                              ))}
                            </div>
                          )
                        })()}
                        <p className={css.contextFootnote}>{t('contextCompositionHint')}</p>
                      </section>
                    )}
                  </>
                )}
              </div>
            )}
            {tab === 'agents' && (
              <div className={css.tabPanel} data-testid="billing-tab-panel-agents">
                <section className={css.agentSummary} data-testid="billing-agent-summary">
                  <span className={css.agentSummaryItem}>
                    <span className={css.agentSummaryValue}>{String(agentSummary.agents)}</span>
                    <span className={css.agentSummaryLabel}>{t('agentsCount')}</span>
                  </span>
                  <span className={css.agentSummaryItem}>
                    <span className={css.agentSummaryValue}>{String(agentSummary.delegations)}</span>
                    <span className={css.agentSummaryLabel}>{t('agentsDelegations')}</span>
                  </span>
                  <span className={css.agentSummaryItem}>
                    <span className={css.agentSummaryValue}>{String(agentSummary.roots)}</span>
                    <span className={css.agentSummaryLabel}>{t('agentsRoots')}</span>
                  </span>
                  {agentSummary.costliest !== undefined && agentSummary.costliest.chainCost > 0 && (
                    <span className={css.agentSummaryItem}>
                      <span className={css.agentSummaryValue}>{money(agentSummary.costliest.chainCost)}</span>
                      <span className={css.agentSummaryLabel}>{t('agentsMostExpensive')}</span>
                    </span>
                  )}
                </section>
                {agentRoots.length === 0 || agentSummary.delegations === 0 ? (
                  <p className={css.contextEmpty} data-testid="billing-agents-empty">{t('agentsNoData')}</p>
                ) : (
                  <div className={css.agentTree} data-testid="billing-agent-tree">
                    {(() => {
                      const renderNode = (node: ReturnType<typeof buildAgentTree>[number]): React.ReactNode => (
                        <div key={node.id} className={css.agentNode}>
                          <div className={css.agentRow} style={{ paddingLeft: `${String(node.depth * 16)}px` }}>
                            <span className={css.agentKind}>{node.depth === 0 ? t('agentsRoot') : t('agentsSubagent')}</span>
                            <span className={css.agentTitle}>{node.title ?? `${t('sessionUntitled')} · ${node.id.slice(0, 8)}`}</span>
                            <span className={css.agentCalls}>{node.calls.toLocaleString()}</span>
                            <span className={css.agentCost}>{money(node.cost)}</span>
                            {node.children.length > 0 && (
                              <span className={clsx(css.ubTag, css.ubTagNeutral)} data-testid="billing-agent-chain">
                                {t('agentsChainTotal')} {money(node.chainCost)}
                              </span>
                            )}
                          </div>
                          {node.children.map(renderNode)}
                        </div>
                      )
                      return agentRoots.map(renderNode)
                    })()}
                  </div>
                )}
              </div>
            )}
          {tab === 'settings' && (
            <div className={css.tabPanel} data-testid="billing-tab-panel-settings">
              {/* v1.5 设置页布局：左侧 180px 锚点 + 右侧分组 pane。5 组分类——预算 / 提醒 /
                  显示 / 高级 / 关于。每组对应原 section（id 兼容）。锚点导航点击
                  滚动；alpha.1 无 scroll-spy——v1.5.1 加 IntersectionObserver。 */}
              <div className={css.settingsLayout}>
                <aside className={css.settingsNav} data-testid="billing-settings-nav" role="navigation" aria-label="settings">
                  {/* v1.5 alpha.1.5：锚点图标从 emoji/字符（🔔◐✱ⓘ 渲染不一致）换成
                      与 TAB_ICONS 同风格的内联 stroke SVG。 */}
                  {[
                    {
                      id: 'display-pref',
                      icon: <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 3v10M11 3v10" /><circle cx="5" cy="6.5" r="1.8" /><circle cx="11" cy="9.5" r="1.8" /></svg>,
                      label: t('settingsNavDisplayPref'),
                    },
                    {
                      id: 'budget',
                      icon: <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 3l3 4 3-4M8 7v6M5.5 9.5h5M5.5 12h5" /></svg>,
                      label: t('settingsNavBudget'),
                    },
                    {
                      id: 'alert',
                      icon: <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2a4 4 0 0 1 4 4v3l1.5 2.5h-11L4 9V6a4 4 0 0 1 4-4z" /><path d="M6.5 13.5a1.5 1.5 0 0 0 3 0" /></svg>,
                      label: t('settingsNavAlert'),
                    },
                    {
                      id: 'display',
                      icon: <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6" /><path d="M8 2a6 6 0 0 1 0 12z" fill="currentColor" stroke="none" /></svg>,
                      label: t('settingsNavDisplay'),
                    },
                    {
                      id: 'advanced',
                      icon: <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M8 2v12M2.8 5l10.4 6M13.2 5L2.8 11" /></svg>,
                      label: t('settingsNavAdvanced'),
                      advanced: true,
                    },
                    {
                      id: 'about',
                      icon: <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6" /><path d="M8 7.5V11" /><circle cx="8" cy="5.2" r="0.9" fill="currentColor" stroke="none" /></svg>,
                      label: t('settingsNavAbout'),
                    },
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      className={clsx(
                        css.settingsNavItem,
                        activeSettingsGroup === item.id && css.settingsNavItemActive,
                        item.advanced && css.settingsNavItemAdvanced,
                      )}
                      data-testid={`billing-settings-nav-${item.id}`}
                      onClick={() => { scrollToSettingsGroup(item.id) }}
                    >
                      <span className={css.settingsNavIcon} aria-hidden="true">{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </aside>
                <div className={css.settingsPane}>
                  {/* U-4 设置页全文搜索：按关键词过滤分区（hidden 属性，锚点 id 保留）。 */}
                  <input
                    className={clsx(css.ubSearch, css.settingsSearch)}
                    type="search"
                    value={settingsQuery}
                    placeholder={t('settingsSearchPlaceholder')}
                    aria-label={t('settingsSearchPlaceholder')}
                    data-testid="billing-settings-search"
                    onChange={event => { setSettingsQuery(event.target.value) }}
                  />
                  {settingsQuery.trim() !== '' && allSettingsSectionsHidden(settingsQuery) && (
                    <p className={css.setCardDesc} data-testid="billing-settings-search-empty">
                      {t('settingsSearchEmpty').replace('{query}', settingsQuery.trim())}
                    </p>
                  )}
                  {/* v1.5 新增：密度模式与动效强度开关（设置 - 显示分组最前） */}
                  <div hidden={settingsSectionHiddenBy(SETTINGS_KEYWORDS.display)} className={css.setCard} id="settings-display-pref" data-testid="billing-density-motion-card">
                    <div className={css.setCardHead}>
                      <div className={css.setCardMeta}>
                        <h3 className={css.setCardTitle}>{t('settingsSectionDisplay')}</h3>
                      </div>
                    </div>
                    <div className={css.densityRow}>
                      <div className={css.densityLeft}>
                        <strong>{t('densityLabel')}</strong>
                        <span>{t('densityHint')}</span>
                      </div>
                      <div className={css.densityButtons} data-testid="billing-density-buttons">
                        {(['compact', 'default', 'comfortable'] as const).map(d => (
                          <button
                            key={d}
                            type="button"
                            className={clsx(
                              css.densityButton,
                              density === d && css.densityButtonActive,
                              d === 'comfortable' && css.densityButtonComfortable,
                            )}
                            data-testid={`billing-density-${d}`}
                            onClick={() => { setDensity(d) }}
                          >
                            {d === 'compact' ? t('densityCompact') : d === 'default' ? t('densityDefault') : t('densityComfortable')}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className={css.densityRow}>
                      <div className={css.densityLeft}>
                        <strong>{t('motionLabel')}</strong>
                        <span>{t('motionHint')}</span>
                      </div>
                      <div className={css.densityButtons} data-testid="billing-motion-buttons">
                        {(['off', 'subtle', 'rich'] as const).map(m => (
                          <button
                            key={m}
                            type="button"
                            className={clsx(css.densityButton, motion === m && css.densityButtonActive)}
                            data-testid={`billing-motion-${m}`}
                            onClick={() => { setMotion(m) }}
                          >
                            {m === 'off' ? t('motionOff') : m === 'subtle' ? t('motionSubtle') : t('motionRich')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
              {/* 1. 月度预算：set-card——头部(标题+说明+开关) + 控制列(金额/进度/说明)。 */}
              <section hidden={settingsSectionHiddenBy(SETTINGS_KEYWORDS.budget)} className={css.setCard} data-testid="billing-budget" id="settings-budget">
                <div className={css.setCardHead}>
                  <div className={css.setCardMeta}>
                    <h3 className={css.setCardTitle}>{t('budget')}<HelpTip label={t('budgetHint')} t={t} /></h3>
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
                          aria-label={`${t('budget')}（${currency === 'usd' ? 'USD' : currency === 'eur' ? 'EUR' : 'CNY'}）`}
                          title={`${t('budget')}（${currency === 'usd' ? 'USD' : currency === 'eur' ? 'EUR' : 'CNY'}）`}
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
                {/* U-3 按模型预算：本月消耗模型逐个设月度上限；与全局预算开关独立。 */}
                <div className={css.ctlCol} data-testid="billing-model-budgets">
                  <span className={css.modelBudgetTitle}>
                    {t('modelBudgetTitle')}
                    <HelpTip label={t('modelBudgetHint')} t={t} />
                  </span>
                  {modelBudgetRows.length === 0 && (
                    <p className={css.modelBudgetHint}>{t('emptyHint')}</p>
                  )}
                  <div className={css.modelBudgetList}>
                    {modelBudgetRows.map(row => (
                      <div key={row.key} className={css.modelBudgetRow}>
                        <span className={css.modelBudgetName} title={row.name ?? row.key}>
                          {row.name ?? row.key}
                        </span>
                        <span className={css.modelBudgetCost} data-testid={`billing-model-budget-cost-${row.key}`}>
                          {money(row.cost)}
                        </span>
                        <span className={css.inp}>
                          <span className={css.affix} aria-hidden="true">¥</span>
                          <input
                            className={css.budgetInput}
                            type="number"
                            min={0}
                            step={1}
                            value={modelBudgets[row.key] ?? ''}
                            placeholder={t('modelBudgetPlaceholder')}
                            aria-label={`${t('modelBudgetTitle')} · ${row.name ?? row.key}`}
                            data-testid={`billing-model-budget-${row.key}`}
                            onChange={e => { onModelBudget(row.key, e.target.valueAsNumber) }}
                          />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* 2. 峰谷切换提醒：set-card——头部 + 控制列(提前量/位置/模式/系统通知/预览)。 */}
              <section hidden={settingsSectionHiddenBy(SETTINGS_KEYWORDS.alert)} className={css.setCard} data-testid="billing-peak-alert-settings" id="settings-alert">
                <div className={css.setCardHead}>
                  <div className={css.setCardMeta}>
                    <h3 className={css.setCardTitle}>{t('peakAlert')}<HelpTip label={t('peakAlertHint')} t={t} /></h3>
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
              <section hidden={settingsSectionHiddenBy(SETTINGS_KEYWORDS.toggles)} className={css.setCard} data-testid="billing-toggle-setting" id="settings-display">
                <div className={css.setGrid3}>
                  <div className={css.setCell} data-testid="billing-usage-stats-tool-setting">
                    <div className={css.setCardHead}>
                      <div className={css.setCardMeta}>
                        <h3 className={css.setCardTitle}>{t('usageStatsTool')}<HelpTip label={t('usageStatsToolHint')} t={t} /></h3>
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
                        <h3 className={css.setCardTitle}>{t('liveCostBar')}<HelpTip label={t('liveCostBarHint')} t={t} /></h3>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={liveCostPrefs.show}
                        aria-label={t('liveCostBar')}
                        data-testid="billing-livecost-toggle"
                        className={clsx(css.switch, liveCostPrefs.show && css.switchOn)}
                        onClick={() => onLiveCostPrefs({ ...liveCostPrefs, show: !liveCostPrefs.show })}
                      >
                        <span className={css.switchKnob} />
                      </button>
                    </div>
                    {liveCostPrefs.show && (
                      <div className={css.rdoRow} data-testid="billing-livecost-position">
                        <span className={css.rdoLabel}>{t('liveCostBarPosition')}</span>
                        <PositionMenu liveCostPrefs={liveCostPrefs} onLiveCostPrefs={onLiveCostPrefs} t={t} />
                      </div>
                    )}
                  </div>
                  <div className={css.setCell} data-testid="billing-site-list-setting">
                    <div className={css.setCardHead}>
                      <div className={css.setCardMeta}>
                        <h3 className={css.setCardTitle}>{t('siteListDisplay')}<HelpTip label={t('siteListDisplayHint')} t={t} /></h3>
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
              <section hidden={settingsSectionHiddenBy(SETTINGS_KEYWORDS.displayExtra)} className={css.setCard} data-testid="billing-display-setting" id="settings-display-extra">
                <div className={css.setGrid2}>
                  <div className={css.setCell} data-testid="billing-float-setting">
                    <div className={css.setCardHead}>
                      <div className={css.setCardMeta}>
                        <h3 className={css.setCardTitle}>{t('floatWindow')}<HelpTip label={t('floatWindowHint')} t={t} /></h3>
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
                        <h3 className={css.setCardTitle}>{t('cardDisplay')}<HelpTip label={t('cardDisplayHint')} t={t} /></h3>
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
                            onClick={() => onCardPrefs({ ...cardPrefs, metric: 'money' })}
                          >
                            {t('cardMetricMoney')}
                          </button>
                          <button
                            type="button"
                            className={clsx(css.floatModeBtn, cardPrefs.metric === 'tokens' && css.floatModeBtnOn)}
                            data-testid="billing-card-tokens"
                            onClick={() => onCardPrefs({ ...cardPrefs, metric: 'tokens' })}
                          >
                            {t('cardMetricTokens')}
                          </button>
                        </div>
                      </div>
                      {/* 主数字统计范围（issue #47 反馈）：单值卡面显示日/周/月哪个数字，默认今日。 */}
                      <div className={css.ctlRow}>
                        <span className={css.ctlLabel}>{t('cardSpan')}</span>
                        <div className={css.ctlGroup} data-testid="billing-card-span">
                          {([
                            ['day', 'cardSpanDay'],
                            ['week', 'cardSpanWeek'],
                            ['month', 'cardSpanMonth'],
                          ] as const).map(([s, key]) => (
                            <button
                              key={s}
                              type="button"
                              className={clsx(css.floatModeBtn, cardPrefs.span === s && css.floatModeBtnOn)}
                              data-testid={`billing-card-span-${s}`}
                              aria-pressed={cardPrefs.span === s}
                              onClick={() => onCardPrefs({ ...cardPrefs, span: s })}
                            >
                              {t(key)}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* 「今日环比」涨跌徽章显隐（issue #93）：红色横条太醒目可关。 */}
                      <div className={css.ctlRow}>
                        <span className={css.ctlLabel}>{t('cardDeltaBadge')}</span>
                        <div className={css.ctlGroup} data-testid="billing-card-delta">
                          <button
                            type="button"
                            className={clsx(css.floatModeBtn, cardPrefs.showDelta && css.floatModeBtnOn)}
                            data-testid="billing-card-delta-show"
                            aria-pressed={cardPrefs.showDelta}
                            onClick={() => onCardPrefs({ ...cardPrefs, showDelta: true })}
                          >
                            {t('cardDeltaShow')}
                          </button>
                          <button
                            type="button"
                            className={clsx(css.floatModeBtn, !cardPrefs.showDelta && css.floatModeBtnOn)}
                            data-testid="billing-card-delta-hide"
                            aria-pressed={!cardPrefs.showDelta}
                            onClick={() => onCardPrefs({ ...cardPrefs, showDelta: false })}
                          >
                            {t('cardDeltaHide')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 5. 自定义单价：set-card——已存价列表 + 新增行；显示层重估，口径差异见说明。 */}
              <div hidden={settingsSectionHiddenBy(SETTINGS_KEYWORDS.advanced)} id="settings-advanced"><UserPriceCard userPrices={userPrices} onUserPrices={onUserPrices} t={t} /></div>

              {/* 6. 插件信息卡：作者 / 仓库 / 版本 / 许可证（设置 Tab 常驻）。 */}
              <div hidden={settingsSectionHiddenBy(SETTINGS_KEYWORDS.about)} id="settings-about"><PluginInfoCard t={t} version={stats.pluginVersion} /></div>

              {/* 更多作品：同作者的两个配套插件（设置-关于分组）。 */}
              <section hidden={settingsSectionHiddenBy(SETTINGS_KEYWORDS.about)} className={css.setCard} data-testid="billing-more-works">
                <div className={css.setCardHead}>
                  <div className={css.setCardMeta}>
                    <h3 className={css.setCardTitle}>{t('moreWorksTitle')}</h3>
                  </div>
                </div>
                <div className={css.moreWorkList}>
                  <a
                    className={css.moreWorkRow}
                    href="https://github.com/kenz1117/dsh-engram"
                    target="_blank"
                    rel="noreferrer"
                    data-testid="billing-ad-engram"
                  >
                    <span className={css.moreWorkName}>{t('adEngramName')}</span>
                    <span className={css.moreWorkDesc}>{t('adEngramDesc')}</span>
                  </a>
                  <a
                    className={css.moreWorkRow}
                    href="https://github.com/kenz1117/dsh-ui-rainbowspeak"
                    target="_blank"
                    rel="noreferrer"
                    data-testid="billing-ad-rainbowspeak"
                  >
                    <span className={css.moreWorkName}>{t('adRainbowName')}</span>
                    <span className={css.moreWorkDesc}>{t('adRainbowDesc')}</span>
                  </a>
                </div>
              </section>
                </div>{/* settingsPane */}
              </div>{/* settingsLayout */}
            </div>
          )}

          {tab === 'trends' && (
            <div className={css.tabPanel} data-testid="billing-tab-panel-trends">
              {/* 1. 费用趋势：ub-card —— 头部(标题 + 7天/30天 与 费用/Token 分段) + 堆叠面积图。 */}
              <section
                className={css.ubCard}
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
                <TrendChart data={trend} models={chartModels} currency={currency} metric={trendMetric} t={t} />
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
                        <span className={css.shareDot} style={{ background: 'var(--ds-blue)' }} />
                        {t('peak')}
                        <span className={css.shareValue} data-testid="billing-share-peak">
                          {money(peakShare.peak)} · {peakPct.toFixed(1)}%
                        </span>
                      </span>
                      <span className={css.shareItem}>
                        <span className={css.shareDot} style={{ background: 'color-mix(in srgb, var(--ds-blue) 30%, var(--dsb-3))' }} />
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
                {/* 控制行恒常显示（issue #77 反馈）：仅看今日过滤后组可能为空，
                控制行若随之落入空态分支，开关会被藏掉而关不回去。 */}
                <div className={css.providerCtlRow} data-testid="billing-provider-controls">
                  <button
                    type="button"
                    className={css.exportButton}
                    /* 审计 S5：没有可折叠组（全部纯余额 / 今日过滤为 0 组）时禁用，避免空点。 */
                    disabled={collapsibleProviderIds.length === 0}
                    onClick={toggleAllProviders}
                  >
                    {providersAllExpanded ? t('collapseAll') : t('expandAll')}
                  </button>
                  <span className={css.providerTodayToggle}>
                    <span>{t('todayOnly')}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={providersTodayOnly}
                      data-testid="billing-provider-today-toggle"
                      className={clsx(css.switch, providersTodayOnly && css.switchOn)}
                      onClick={toggleProvidersTodayOnly}
                    >
                      <span className={css.switchKnob} />
                    </button>
                  </span>
                </div>
                {providerGroups.length === 0 ? (
                  <div className={css.emptyState} data-testid="billing-provider-empty">
                    {/* v1.5：空态插画——坐标轴 + 脉冲点 + 引导文案。 */}
                    <span className={css.emptyIll} aria-hidden="true">
                      <svg viewBox="0 0 96 64" fill="none">
                        <line x1="6" y1="58" x2="90" y2="58" stroke="var(--ds-border-strong)" strokeWidth="1" />
                        <line x1="6" y1="6" x2="6" y2="58" stroke="var(--ds-border-strong)" strokeWidth="1" />
                        <path d="M14 50 L28 40 L42 44 L56 26 L70 30 L82 14" stroke="var(--ds-border-strong)" strokeWidth="1.5" strokeLinecap="round" fill="none" strokeDasharray="3 3" />
                      </svg>
                      <span className={css.emptyIllDot} />
                    </span>
                    <span className={css.emptyTitle}>{providersTodayOnly ? t('todayNoConsumption') : t('noData')}</span>
                    <span className={css.emptyDesc}>{t('emptyHint')}</span>
                  </div>
                ) : (
                  <div className={css.providerGroupList} data-testid="billing-provider-groups">
                    {providerGroups.map(group => {
                      // 折叠交互（issue #77）：有明细（模型行或订阅卡）的组默认收起，
                      // 点击组头切换；纯余额组无内容可展开，头部不可点、不显示箭头。
                      const collapsible = group.models.length > 0 || group.subscriptions.length > 0
                      const open = collapsible && expandedProviders.has(group.id)
                      return (
                      <div key={group.id} className={css.providerGroup} data-testid="billing-provider-group">
                        {/* 厂商组头部：健康点 + 入口种类徽章 + 厂商名 + 订阅套数；费用/余额在右侧固定槽。 */}
                        <div
                          className={clsx(css.providerGroupHead, collapsible && css.providerGroupCollapsible)}
                          data-testid="billing-provider-group-head"
                          aria-expanded={collapsible ? open : undefined}
                          /* 审计 U1：div 模拟折叠按钮时补齐键盘可达性（Tab 聚焦，Enter/Space 切换）。 */
                          role={collapsible ? 'button' : undefined}
                          tabIndex={collapsible ? 0 : undefined}
                          onClick={collapsible ? () => { toggleProvider(group.id) } : undefined}
                          onKeyDown={collapsible ? (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              toggleProvider(group.id)
                            }
                          } : undefined}
                        >
                          <span className={css.providerGroupTitle}>
                            <span
                              className={clsx(css.healthDot, group.dot)}
                              role="img"
                              aria-label={healthDotLabel(group.dot, t)}
                              title={healthDotLabel(group.dot, t)}
                            />
                            {(() => {
                              // 入口徽章：直连/中转/未知一眼可辨；vendor（纯订阅/余额组）无徽章。
                              // 直连组拆「直连 · X」为徽章 + 路由名；官方直连等无前缀名整名显示。
                              // 未知组徽章即文案，不再重复渲染「未知路由」名字。
                              const displayName = providerName(group.name)
                              const directRest = group.channelKind === 'direct' ? directChannelRoute(displayName) : undefined
                              const badge = group.channelKind === 'direct' ? t('directTag')
                                : group.channelKind === 'site' ? t('relayTag')
                                  : group.channelKind === 'unknown' ? t('unknownTag')
                                    : undefined
                              return (
                                <>
                                  {badge !== undefined && (
                                    <span
                                      className={clsx(
                                        css.kindBadge,
                                        group.channelKind === 'site' && css.kindBadgeRelay,
                                        group.channelKind === 'unknown' && css.kindBadgeUnknown,
                                      )}
                                      data-testid="billing-kind-badge"
                                    >
                                      {badge}
                                    </span>
                                  )}
                                  {group.channelKind !== 'unknown' && (
                                    <span className={css.providerGroupName}>{directRest ?? displayName}</span>
                                  )}
                                </>
                              )
                            })()}
                            {group.subscriptions.length > 0 && (
                              <span className={css.providerGroupBadge} data-testid="billing-provider-sub-count">
                                {group.subscriptions.length} {t('planCountUnit')}
                              </span>
                            )}
                          </span>
                          <span className={css.providerGroupMeta}>
                            {/* 费用合计：付费者视角的一级信息（issue #34）——充值与余额都针对厂商。
                                未知通道组显示「—」（issue #82）：支出主体无法核实，费用口径为空而非 0。 */}
                            <span className={css.providerGroupCost} data-testid="billing-provider-cost">
                              <span className={css.providerGroupCostLabel}>{t('cost')}</span>
                              {group.channelKind === 'unknown'
                                ? <span className={css.na}>—</span>
                                : <span className={css.providerGroupCostValue}>{money(providerCostOf(group))}</span>}
                            </span>
                            {/* 套餐徽章已移至组名后：原 64px 保列位空槽一并移除，费用/余额随之右移让位标题行。 */}
                            {!hideBalanceForGroup(group) && group.balance !== undefined ? (
                              <span className={css.providerGroupBalance} data-testid="billing-provider-balance">
                                <span className={css.providerGroupBalanceLabel}>{t('balance')}</span>
                                {renderBalance(group.balance)}
                              </span>
                            ) : (
                              /* 空占位：同上，无余额的组保持余额列位。 */
                              <span className={css.providerGroupBalance} aria-hidden="true" />
                            )}
                            {/* 官方充值入口（issue #47 反馈）：与余额状态解耦——只要厂商收录了
                                充值页就显示，余额未配置/查询失败/订阅型组（余额槽隐藏）同样可用；
                                「未知路由」等无法判定厂商的分组不显示。 */}
                            {rechargeUrlOf(group.name) !== undefined ? (
                              <a
                                className={css.providerGroupRecharge}
                                data-testid="billing-group-recharge"
                                href={rechargeUrlOf(group.name)}
                                target="_blank"
                                rel="noreferrer"
                                title={t('rechargeHint')}
                                aria-label={`${providerName(group.name)} ${t('recharge')}`}
                                /* 点充值外链不触发组头折叠切换。 */
                                onClick={event => { event.stopPropagation() }}
                              >
                                {t('recharge')}
                              </a>
                            ) : (
                              /* 空占位：无充值页的组保持按钮列位，费用槽不随按钮有无横移。 */
                              <span className={css.providerGroupRecharge} aria-hidden="true" />
                            )}
                          </span>
                        </div>
                        {/* v1.5 三段式：头部（厂家身份）→ 摘要行（4 列核心数据：调用/输入/输出/费用）→
                            展开明细（折叠后才渲染）。摘要行常驻，不被折叠门控——用户能 1 秒
                            识别厂家画像，再决定是否展开下钻。 */}
                        {group.models.length > 0 && (
                          <div className={css.providerStatRow} data-testid="billing-provider-stat-row">
                            {(() => {
                              const totals = group.models.reduce((acc, m) => ({
                                calls: acc.calls + m.calls,
                                input: acc.input + m.input,
                                output: acc.output + m.output,
                              }), { calls: 0, input: 0, output: 0 })
                              const hitRate = totals.input > 0
                                ? group.models.reduce((sum, m) => sum + m.cacheHitRate, 0) / group.models.length
                                : 0
                              return [
                                { lbl: t('calls'), val: totals.calls.toLocaleString(), sub: '' },
                                { lbl: t('inputTokens'), val: formatTokens(totals.input), sub: hitRate > 0 ? `${t('cacheHitRate')} ${hitRate.toFixed(0)}%` : '' },
                                { lbl: t('outputTokens'), val: formatTokens(totals.output), sub: '' },
                                { lbl: t('cost'), val: money(providerCostOf(group)), sub: group.models.length === 1 ? '' : `${group.models.length} ${t('models')}` },
                              ].map((cell, idx) => (
                                <div key={idx} className={css.providerStatCell}>
                                  <div className={css.providerStatLbl}>{cell.lbl}</div>
                                  <div className={css.providerStatVal}>{cell.val}</div>
                                  {cell.sub !== '' && <div className={css.providerStatSub}>{cell.sub}</div>}
                                </div>
                              ))
                            })()}
                          </div>
                        )}
                        {/* 展开明细（issue #77）：模型行与订阅卡收在组头之下，展开才渲染。 */}
                        {open && (<>
                        {/* 未知通道说明（issue #82）：组头费用显示「—」的原因。 */}
                        {group.channelKind === 'unknown' && (
                          <p className={css.unknownHint} data-testid="billing-unknown-hint">{t('unknownChannelHint')}</p>
                        )}
                        {/* 模型用量子表：无余额列（余额已在厂商头部显示一次）。 */}
                        {group.models.length > 0 && (
                          <div className={css.tableScroll} data-testid="billing-table-scroll">
                            <table className={css.modelTable}>
                              {modelTableHead}
                              <tbody>
                                {group.models.map(row => (
                                  <tr key={row.key}>
                                    <td>
                                      {modelNameCell(row)}
                                    </td>
                                    <td className={css.numCol}>{row.calls.toLocaleString()}</td>
                                    <td className={css.numCol}>{formatTokens(row.input)}</td>
                                    <td className={css.numCol}>{formatTokens(row.output)}</td>
                                    <td className={css.numCol}>{formatPercent(row.cacheHitRate)}</td>
                                    <td className={css.numCol}>
                                      {row.plan
                                        ? (
                                          /* 订阅包含胶囊：金额在前 + 「订阅」短标签在后（issue #47 反馈：
                                              「订阅包含 ≈¥0.61」太长导致胶囊换行，改为紧凑单行）。 */
                                          <span className={css.planTag}>
                                            {row.estimated > 0 ? <span>≈{money(row.estimated)}</span> : null}
                                            <span className={css.planTagBadge} data-testid="billing-plan-badge">{t('subscriptionTag')}</span>
                                          </span>
                                        )
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
                                          /* 无按量扣费记录（本格全部调用走订阅通道，cell.cost=0）：
                                              目录价可算就回退估算金额，避免该提供商下的订阅行只剩
                                              「—」。未知通道（issue #82，estimated 强制归零）与
                                              目录未收录模型（零价条目）仍显示「—」。 */
                                          : row.estimated > 0
                                            ? <span title={t('cellEstimateHint')}>≈{money(row.estimated)}</span>
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
                                <div key={quota.provider} className={clsx(css.subscriptionCard, css.subscriptionCardUpgraded)} data-testid="billing-subscription-card">
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
                                  {quota.windows.map(window => (
                                    <SubscriptionWindowRow key={window.kind} window={window} t={t} />
                                  ))}
                                </div>
                              )
                            })}
                          </div>
                        )}
                        </>
                        )}
                      </div>
                      )
                    })}
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
              {/* 会话明细：按工作区分组——组行内联合计（费用/调用），组内列出会话，
                  吸收原「工作区统计」卡片（下钻交互由平铺分组替代）。 */}
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
                    {/* U-7 会话全屏查看器：面板只显示前 20 行，全量（服务端封顶 100）+ 搜索走浮层。 */}
                    {stats.bySession.length > 0 && (
                      <button
                        type="button"
                        className={css.exportButton}
                        data-testid="billing-sessions-view-all"
                        onClick={() => { setSessionViewerOpen(true) }}
                      >
                        {t('sessionsViewAll').replace('{count}', String(stats.bySession.length))}
                      </button>
                    )}
                  </div>
                  {/* 置信度提示：部分会话数据出自旧版算法的账本行（原日志已删，无法重算）。 */}
                  {(stats.staleLedgerSessions ?? 0) > 0 && (
                    <div className={css.staleNotice} data-testid="billing-sessions-stale">
                      {t('staleLedgerNotice').replace('{count}', String(stats.staleLedgerSessions))}
                    </div>
                  )}
                  <div className={css.ubTablewrap} data-testid="billing-sessions-table">
                    {navNotice !== undefined && (
                      <div className={css.staleNotice} data-testid="billing-session-nav-notice" role="note">
                        {navNotice}
                      </div>
                    )}
                    <table className={css.ubTable}>
                      <thead>
                        <tr>
                          <th>{t('sessionTitle')}</th>
                          <th className={css.numCol}>{t('calls')}</th>
                          <th className={css.numCol}>{t('actual')}</th>
                          <th className={css.numCol}>{t('lastActive')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mergedSessions.length === 0 && (
                          <tr>
                            <td colSpan={4} className={css.emptyRow}>{t('noData')}</td>
                          </tr>
                        )}
                        {mergedSessions.slice(0, SESSION_DISPLAY_LIMIT).map(row => {
                          // 折叠态与数值列提取为局部闭包：一/二级行多处共用，收敛渲染重复。
                          const isGroup = row.children !== undefined || row.subs !== undefined
                          const open = isGroup && expandedSessions.has(row.id)
                          // 后代子智能体合计（合并组对成员段求和）：徽标展示，费用列仍为本行口径。
                          const family = subFamilyOf(row)
                          return (
                            <Fragment key={row.id}>
                              <tr
                                className={isGroup ? css.sessionGroupRow : undefined}
                                aria-expanded={isGroup ? open : undefined}
                                /* 审计 U1：折叠行键盘可达（Tab 聚焦，Enter/Space 切换）；
                                保留 tr 的 row 语义，不改 role 以免破坏表格结构。 */
                                tabIndex={isGroup ? 0 : undefined}
                                onClick={isGroup ? () => { toggleSession(row.id) } : undefined}
                                onKeyDown={isGroup ? (event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault()
                                    toggleSession(row.id)
                                  }
                                } : undefined}
                              >
                                <td>
                                  {/* 无标题会话可读化（issue #42）：短 id 前补「未命名会话」提示。 */}
                                  {/* 折叠箭头由 .sessionGroupRow .modelName::before 绘制（体积考量不放 span）。 */}
                                  {/* 标题本身是跳转按钮：点标题打开宿主会话（跨插件导航）；
                                      按钮 stopPropagation，箭头区仍走行内展开（互不抢事件）。 */}
                                  <span className={css.modelName}>
                                    <button
                                      type="button"
                                      className={css.sessionLink}
                                      data-testid="billing-session-open"
                                      title={t('sessionOpen')}
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        openSessionRow(row.id)
                                      }}
                                    >
                                      {row.title ?? `${t('sessionUntitled')} · ${row.id.slice(0, 8)}`}
                                      {(row.mergedCount ?? 1) > 1 ? ` ×${row.mergedCount}` : ''}
                                    </button>
                                  </span>
                                  {row.stale === true && (
                                    <span className={clsx(css.ubTag, css.ubTagNeutral)} data-testid="billing-session-stale">
                                      {t('sessionStaleBadge')}
                                    </span>
                                  )}
                                  {/* 子智能体归并徽标：本行费用不含后代，合计在此明示（对得上总额）。 */}
                                  {(family.calls > 0 || family.cost > 0) && (
                                    <span className={clsx(css.ubTag, css.ubTagNeutral)} data-testid="billing-session-sub">
                                      {family.cost > 0
                                        ? t('sessionSubCost').replace('{cost}', money(family.cost))
                                        : t('sessionSubCalls').replace('{calls}', family.calls.toLocaleString())}
                                    </span>
                                  )}
                                </td>
                                {sessionNumCells(row)}
                              </tr>
                              {/* 二级段明细（issue #42）：默认收起，点击一级展开。 */}
                              {open && row.children?.map(child => (
                                <tr key={child.id} className={css.sessionChildRow}>
                                  <td>
                                    <button
                                      type="button"
                                      className={css.sessionLink}
                                      data-testid="billing-session-open"
                                      title={t('sessionOpen')}
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        openSessionRow(child.id)
                                      }}
                                    >
                                      <span className={css.modelProvider}>{child.id.slice(0, 8)}</span>
                                    </button>
                                  </td>
                                  {sessionNumCells(child)}
                                </tr>
                              ))}
                              {/* 子智能体段（宿主独立会话，按父链挂树，issue #99 A）：
                                  一阶挂对话下，二阶起缩进嵌套在直接委派方之下；
                                  有下级者带链合计徽标（本行+全部下级，回答「哪次委派最贵」）。
                                  费用列恒为本行口径——徽标是展示拆分，总额桶不含重复。 */}
                              {open && row.subs?.map(sub => renderSubRow(sub, 0))}
                            </Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* U-7 会话全屏查看器：fixed 浮层覆盖仪表盘，全量列表（服务端封顶 100 行）
                      + 标题/项目/id 子串搜索。平铺无折叠——搜索场景下平铺比逐组展开更直接。 */}
                  {sessionViewerOpen && (
                    <div className={css.sessionViewer} data-testid="billing-session-viewer">
                      <div className={css.sessionViewerHead}>
                        <h3 className={css.sessionViewerTitle}>{t('sessions')}</h3>
                        <input
                          className={css.ubSearch}
                          type="search"
                          value={sessionViewerQuery}
                          placeholder={t('sessionViewerSearch')}
                          aria-label={t('sessionViewerSearch')}
                          data-testid="billing-session-viewer-search"
                          onChange={event => { setSessionViewerQuery(event.target.value) }}
                        />
                        <button
                          type="button"
                          className={css.exportButton}
                          data-testid="billing-session-viewer-close"
                          onClick={() => { setSessionViewerOpen(false); setSessionViewerQuery('') }}
                        >
                          {t('close')}
                        </button>
                      </div>
                      <div className={css.sessionViewerList} data-testid="billing-session-viewer-list">
                        <table className={css.ubTable}>
                          <thead>
                            <tr>
                              <th>{t('sessionTitle')}</th>
                              <th className={css.numCol}>{t('calls')}</th>
                              <th className={css.numCol}>{t('actual')}</th>
                              <th className={css.numCol}>{t('lastActive')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {viewerRows.length === 0 && (
                              <tr><td colSpan={4} className={css.emptyRow}>{t('noData')}</td></tr>
                            )}
                            {viewerRows.map(row => (
                              <tr key={row.id}>
                                <td>
                                  <span className={css.modelName}>
                                    {row.title ?? `${t('sessionUntitled')} · ${row.id.slice(0, 8)}`}
                                    {(row.mergedCount ?? 1) > 1 ? ` ×${row.mergedCount}` : ''}
                                  </span>
                                  {row.cwd !== undefined && (
                                    <span className={css.modelProvider}>{workspaceTailOf(row.cwd)}</span>
                                  )}
                                  {row.stale === true && (
                                    <span className={clsx(css.ubTag, css.ubTagNeutral)}>{t('sessionStaleBadge')}</span>
                                  )}
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
                    </div>
                  )}
                </section>
              )}
            </div>
          )}

          {tab === 'token' && (
            <div className={css.tabPanel} data-testid="billing-tab-panel-token">
              {/* Token 洞察：独立于费用的 token 统计（每日堆叠[结构/模型双视角] / 模型占比 / 结构 KPI / 导出）。 */}
              <TokenPanel stats={stats} trendDays={trendDays} onTrendDays={setTrendDays} models={chartModels} money={money} t={t} />
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
              {/* 1. 汇率与峰谷说明条（中性 alert）：汇率来源徽标 + 上次同步时间 + 手动同步按钮。 */}
              <div className={css.ubAlert} role="note">
                <div className={css.ubAlertLeft}>
                  <span className={css.ubRate} data-testid="billing-rate">
                    {t('todayRate')} 1 USD = {formatMoney(rateInfo.rate)}
                  </span>
                  <span className={clsx(css.ubTag, rateInfo.live ? css.ubTagSuccess : css.ubTagNeutral)}>
                    {rateInfo.live ? t('rateLive') : t('rateBuiltin')}
                  </span>
                  {pricingSyncedAt > 0 && (
                    <span className={css.ubTag} data-testid="billing-pricing-synced">
                      {t('pricingSyncedAt')} {new Date(pricingSyncedAt).toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  <button
                    type="button"
                    className={css.heatmapRangeButton}
                    data-testid="billing-pricing-sync"
                    disabled={pricingSyncing}
                    onClick={syncPricing}
                  >
                    {pricingSyncing ? t('pricingSyncing') : t('pricingSyncNow')}
                  </button>
                </div>
                <p className={css.ubAlertNote}>{t('pricingTip')}</p>
              </div>

              {/* 2. 模型单价表：ub-card —— 头部(标题+单位) + 表格（模型点+名 / 峰谷 chips / 未收录行）。 */}
              <section className={css.ubCard} data-testid="billing-panel-pricing">
                <div className={css.ubCardHead}>
                  <h3 className={css.ubCardTitle}>{t('pricing')}</h3>
                  <span className={css.ubCardSub}>{t('pricingUnit')}</span>
                  <input
                    className={css.ubSearch}
                    type="search"
                    value={pricingQuery}
                    placeholder={t('pricingSearch')}
                    aria-label={t('pricingSearch')}
                    data-testid="billing-pricing-search"
                    onChange={event => { setPricingQuery(event.target.value) }}
                  />
                </div>
                <div className={css.ubTablewrap}>
                  <table className={css.ubTable}>
                    <thead>
                      <tr>
                        <th>{t('thModel')}</th>
                        <th className={css.numCol}>{t('thInputMiss')}</th>
                        <th className={css.numCol}>{t('thInputHit')}</th>
                        <th className={css.numCol}>{t('output')}</th>
                        <th className={css.numCol} colSpan={2}>{t('band')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filterRateRows(catalogEntries(), pricingQuery).map((entry) => {
                        const hasPrice = entry.price.input > 0 || entry.price.output > 0
                        return (
                          // Fragment 携 key：一个目录条目渲染主行 + 附加计价子行多个 tr。
                          <Fragment key={entry.key}>
                          <tr>
                            <td>
                              <span className={css.ubModel}>
                                {(() => {
                                  const state = bandStateOf(channelCountdown(bandNow, rateChannelOf(entry.key, hasBandPlan)), bandLeadMs)
                                  if (state === null) return null
                                  const isPinned = pinnedModels.includes(entry.key)
                                  const label = `${entry.name} · ${t(state === 'peak' ? 'peak' : 'offPeak')} · ${t('bandPinHint')}`
                                  return (
                                    <button
                                      type="button"
                                      className={clsx(css.bandDot, css[state], isPinned && css.bandDotOn)}
                                      data-testid="billing-band-dot"
                                      aria-pressed={isPinned}
                                      aria-label={label}
                                      title={label}
                                      onClick={() => {
                                        setPinnedModels(togglePinnedModel(entry.key))
                                        window.dispatchEvent(new CustomEvent(PINNED_MODELS_EVENT))
                                      }}
                                    />
                                  )
                                })()}
                                <span className={css.ubModelName}>
                                  {entry.name}
                                  {/* 探活命中但无内置/models.dev 价：明确标注，不参与计价。 */}
                                  {entry.uncatalogued && (
                                    <span className={css.ubTagAlert} data-testid="billing-price-uncatalogued">
                                      {t('uncatalogued')}
                                    </span>
                                  )}
                                  {/* 限时促销：生效期内模型名后挂单字徽章（避免撑宽模型名称列）；
                                      详情用宿主 Tooltip 自绘浮层——原生 title 在宿主 webview 里
                                      不渲染悬停提示（用户只看到 help 问号光标），note 与恢复时点
                                      一并进气泡；过期自动消失。 */}
                                  {entry.promo !== undefined && isPromoActive(entry.promo, Date.now()) && (
                                    <Tooltip
                                      label={[
                                        entry.promo.note,
                                        entry.promo.endsAtMs === undefined
                                          // 无截止日的长期活动：提示待厂商公告，不显示具体日期。
                                          ? t('promoOpenEnded')
                                          : t('promoUntil', { date: new Date(entry.promo.endsAtMs).toLocaleDateString() }),
                                      ].filter(Boolean).join(' · ')}
                                      side="top"
                                      maxWidth={280}
                                    >
                                      <span className={css.ubTagPromo} data-testid="billing-price-promo">
                                        {t('promoBadge')}
                                      </span>
                                    </Tooltip>
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
                            {/* 时段拆两格：峰/谷各占一列，档位标签留在格内（峰/谷或 Standard/Flex）；
                                无分档模型合并两格显示全天统一。 */}
                            {hasPrice && entry.price.offPeak !== undefined && entry.peakHours !== undefined
                              ? (
                                <>
                                  <td className={css.numCol}>
                                    <span className={css.ubChipPeak}>
                                      {/* 延迟档语义（Gemini Standard/Flex）与时段语义（峰谷）标签不同。 */}
                                      <span className={css.ubChipLabel}>{entry.tierSemantics === 'latency' ? t('ubStd') : t('ubPeak')}</span>
                                      <span>
                                        {unitMoney(entry.price.input, entry.price.currency)}/{unitMoney(entry.price.output, entry.price.currency)}
                                      </span>
                                    </span>
                                  </td>
                                  <td className={css.numCol}>
                                    <span className={css.ubChipOff}>
                                      <span className={css.ubChipLabel}>{entry.tierSemantics === 'latency' ? 'Flex' : t('ubOff')}</span>
                                      <span>
                                        {unitMoney(entry.price.offPeak.input, entry.price.currency)} / {unitMoney(entry.price.offPeak.output, entry.price.currency)}
                                      </span>
                                    </span>
                                  </td>
                                </>
                              )
                              : <td className={css.numCol} colSpan={2}>
                                  {hasPrice ? <span className={css.flatTag}>{t('flat')}</span> : <span className={css.na}>—</span>}
                                </td>}
                          </tr>
                          {/* 附加计价子行：Batch / 显式缓存等参考价，缩进挂在模型名下，不参与计费。 */}
                          {(entry.extraRows ?? []).map(row => (
                            <tr key={`${entry.key}:${row.label}`} className={css.ubExtraRow}>
                              <td>
                                <span className={css.ubExtraName}>{localizeRowLabel(row.label, lang)}</span>
                                {row.note !== undefined && <span className={css.ubExtraNote}>{localizeRowLabel(row.note, lang)}</span>}
                              </td>
                              <td className={css.numCol}>{row.input === undefined ? <span className={css.na}>—</span> : unitMoney(row.input, entry.price.currency)}</td>
                              <td className={css.numCol}><span className={css.na}>—</span></td>
                              <td className={css.numCol}>{row.output === undefined ? <span className={css.na}>—</span> : unitMoney(row.output, entry.price.currency)}</td>
                              <td className={css.numCol} colSpan={2}><span className={css.na}>—</span></td>
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

/** 胶囊可落点的槽位（below 为默认值，与 usage-billing-settings 的回退一致）。 */
/** U-7 会话查看器的项目路径尾段：cwd 末级目录名（与工作区聚合同口径）；空回退 em dash。 */
function workspaceTailOf(cwd: string): string {
  const parts = cwd.split(/[\\/]/).filter(Boolean)
  return parts.at(-1) ?? '—'
}

/** U-4 设置页分区关键词：搜索查询对每组分词做大小写不敏感子串匹配，
 *  覆盖分区标题、说明与常见同义词（中英双份，避免依赖当前界面语言）。 */
const SETTINGS_KEYWORDS = {
  display: ['显示', '密度', '动效', '紧凑', '舒适', '克制', '丰富', 'display', 'density', 'motion', 'compact', 'comfortable'],
  budget: ['预算', '金额', '本月', '花费', '进度', 'budget', 'amount', 'spend', 'progress'],
  alert: ['峰谷', '峰', '谷', '提醒', '通知', '预览', '切换', 'peak', 'off-peak', 'alert', 'notify', 'preview'],
  toggles: ['usage_stats', '工具', '即时代费', '胶囊', '中转站', '站点', '隐藏', 'relay', 'site', 'live', 'cost', 'hide'],
  displayExtra: ['悬浮', '订阅', '计费卡', '指标', '环比', '主数字', 'float', 'subscription', 'card', 'metric', 'delta'],
  advanced: ['自定义', '单价', '价格', '低谷', 'custom', 'price'],
  about: ['关于', '版本', '作者', '许可', '仓库', 'about', 'version', 'author', 'license', 'repo'],
} as const

/** 全部分区是否都被搜索过滤隐藏（用于显示「没有匹配」空态提示）。 */
function allSettingsSectionsHidden(query: string): boolean {
  return Object.values(SETTINGS_KEYWORDS).every(keywords => settingsSectionHidden(query, keywords))
}

const LIVE_COST_POSITIONS = ['below', 'above', 'toolbar'] as const

/**
 * PositionMenu: 平价消耗胶囊的位置选择下拉（宿主 Menu 原语，compact 档对齐
 * 设置卡的 12px 控件基调）。触发按钮显示当前选中项文案，chevron 展开时旋转；
 * 列表走 portal 渲染，避免被设置面板的滚动容器裁剪。
 */
function PositionMenu({ liveCostPrefs, onLiveCostPrefs, t }: {
  liveCostPrefs: LiveCostBarPrefs
  onLiveCostPrefs: (next: LiveCostBarPrefs) => void
  t: (key: UsageBillingKey, params?: Record<string, unknown>) => string
}): React.ReactNode {
  const [open, setOpen] = useState(false)
  const labels: Record<LiveCostBarPrefs['position'], string> = {
    below: t('liveCostBarPosBelow'),
    above: t('liveCostBarPosAbove'),
    toolbar: t('liveCostBarPosToolbar'),
  }
  const items: MenuEntry[] = LIVE_COST_POSITIONS.map(id => ({ id, label: labels[id] }))
  return (
    <Menu
      open={open}
      align="end"
      portal
      compact
      items={items}
      selectedId={liveCostPrefs.position}
      onSelect={(id) => {
        setOpen(false)
        // 选项全部来自 LIVE_COST_POSITIONS，find 收窄回字面量联合。
        const position = LIVE_COST_POSITIONS.find(p => p === id)
        if (position === undefined) return
        onLiveCostPrefs({ ...liveCostPrefs, position })
      }}
      onClose={() => { setOpen(false) }}
      anchor={
        <button
          type="button"
          className={css.rdoSelect}
          data-testid="billing-livecost-position-select"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => { setOpen(!open) }}
        >
          <span>{labels[liveCostPrefs.position]}</span>
          <span className={clsx(css.rdoChevron, open && css.rdoChevronOpen)} aria-hidden>
            {/* 双世代图标解析（见文件顶部 BillingChevronDown 注释）；都缺失时跳过渲染，
                避免装饰性箭头把整个槽位拖崩。 */}
            {BillingChevronDown ? <BillingChevronDown /> : null}
          </span>
        </button>
      }
    />
  )
}

/**
 * UsageBilling: sidebar trigger plus the billing dashboard modal.
 * @param props - framework-provided sidebar and locale props.
 */
export function UsageBilling(props: UsageBillingProps): React.ReactNode {
  const { t: hostT, checkModels, publishCosts, registerOpen, navigateToSession, renderSlot, useStore, actions } = props
  // Start empty; swap in real host data when the server serves valid JSON.
  const [stats, setStats] = useState<UsageStats>(EMPTY_STATS)
  const [health, setHealth] = useState<ModelHealth>(IDLE_HEALTH)
  const [balances, setBalances] = useState<readonly ProviderBalance[]>([])
  const [reconcile, setReconcile] = useState<ReconcileNotice | undefined>(undefined)
  // 余额刷新超预算：服务端回上一次成功的余额并标记，面板据此提示（issue #104）。
  const [balanceStale, setBalanceStale] = useState(false)
  const [quotas, setQuotas] = useState<readonly SubscriptionQuota[]>([])
  // 订阅刷新是否失败：失败时保留上次成功快照并标记 stale（展示「缓存」）。
  const [quotasStale, setQuotasStale] = useState(false)
  const [relayQuotas, setRelayQuotas] = useState<readonly RelayQuota[]>([])
  // 币种选择：localStorage 持久化 + 跨树广播——侧边栏卡片与输入框胶囊
  // 不在弹窗树内，弹窗关闭后仍需跟随选择（issue #58）。
  const [currency, setCurrency] = useState<CostCurrency>(() => loadCurrency())
  // 界面语言：与币种解耦（issue #69）；首次读取从已存币种播种一次，升级后不静默改变。
  const [language, setLanguage] = useState<BillingLanguage>(() => loadLanguage())
  const updateLanguage = useCallback((next: BillingLanguage): void => {
    setLanguage(next)
    saveLanguage(next)
    window.dispatchEvent(new CustomEvent(LANGUAGE_PREF_EVENT))
  }, [])
  const updateCurrency = useCallback((next: CostCurrency): void => {
    setCurrency(next)
    saveCurrency(next)
    window.dispatchEvent(new CustomEvent(CURRENCY_PREF_EVENT))
  }, [])
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
  const lang = language
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
  //
  // 在途闸门（issue #104）：上一轮还没落地就跳过本轮。旧实现一轮接一轮地
  // 叠请求（每轮 4 个端点 × 30s 间隔），而浏览器对同源最多 6 条并发连接——
  // 服务端某次响应被拖住（实测 45~60s）时，多标签页各挂几条即占满连接池，
  // 宿主自己的资源请求排队，用户看到的是「整个 DSH 界面卡死」。
  // force=true 用于用户显式动作（打开弹窗 / 页面恢复可见）：这时宁可多打一轮，
  // 也不能让用户对着旧数据。
  const statsInFlight = useRef(false)
  const reloadStats = useCallback((force = false) => {
    if (statsInFlight.current && !force) return
    statsInFlight.current = true
    void Promise.all([
      loadUsageStats().then((data) => {
        // 存服务端原始文档：用户价显示重估的唯一出口是下方 displayStats memo。
        // 此前这里预存重估结果，memo 又重估一次——删除用户价后 recost 原样返回
        // 旧值，已重估的费用会粘到下一次轮询（最长 5 分钟）才被覆盖。
        if (data !== null) setStats(data)
      }),
      fetchBalanceDoc().then(({ balances, reconcile, stale }) => {
        // 余额服务端恒返回内置行（空=失败），失败时保留旧快照。
        if (balances.length > 0) setBalances(balances)
        setReconcile(reconcile)
        setBalanceStale(stale === true)
      }),
      fetchSubscriptions().then(({ quotas, stale }) => {
        if (quotas.length > 0) {
          setQuotas(quotas)
          // 服务端刷新超预算：额度来自上一次成功的查询 → 按缓存展示。
          setQuotasStale(stale === true)
        } else {
          // 成功但无订阅数据：非 stale。
          setQuotasStale(false)
        }
      }).catch(() => {
        // 刷新失败：保留上次成功快照，标记缓存（stale）。
        setQuotasStale(true)
      }),
      fetchRelayQuotas().then((list) => {
        // 成功返回空数组是合法结果（用户删光中转配置），必须清空旧快照；
        // 只有请求失败（catch）才保留旧值，与订阅的 stale 语义区分开。
        setRelayQuotas(list)
      }).catch(() => {
        // 刷新失败：保留上次成功快照。
      }),
    ]).catch(() => {
      // 兜底：各端点的失败已在各自链路里降级，这里只防未处理拒绝。
    }).finally(() => { statsInFlight.current = false })
  }, [])

  const openDashboard = useCallback(() => {
    // 打开弹窗时先刷新一次统计与定价，避免看到的是上次挂载的旧数据。
    void reloadStats(true)
    void loadLivePricing()
    setOpen(true)
  }, [reloadStats])

  // Load stats on mount; also apply the live pricing snapshot in parallel.
  useEffect(() => {
    void reloadStats()
    void loadLivePricing()
  }, [reloadStats])

  // 页面可见性：隐藏时暂停常驻轮询（后台标签页不该持续打宿主聚合），恢复
  // 可见时立即补一次刷新再回到节拍。jsdom 之外无 document 的环境视为可见。
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden)
  useEffect(() => {
    if (typeof document === 'undefined') return
    const onVisibility = (): void => {
      setVisible(!document.hidden)
      // 重新可见：立即补一次（隐藏期间可能错过多个节拍）。
      if (!document.hidden) {
        void reloadStats(true)
        void loadLivePricing()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => { document.removeEventListener('visibilitychange', onVisibility) }
  }, [reloadStats])

  // 常驻定时刷新统计与定价：左下角触发器与弹窗都保持最新，无需退出重进。
  // 弹窗打开 30s（用户正看，新鲜度优先）；关闭后降到 5 分钟；页面隐藏暂停。
  useEffect(() => {
    if (!visible) return
    const timer = setInterval(() => {
      void reloadStats()
      void loadLivePricing()
    }, open ? STATS_REFRESH_INTERVAL_MS : STATS_REFRESH_CLOSED_MS)
    return () => { clearInterval(timer) }
  }, [reloadStats, open, visible])

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
  // 触发层的费用/token 数字一律读 displayStats（用户价重估后的视图），
  // 与服务端原始文档 stats 区分——删价/改价即时生效，不等下一次轮询。
  const monthCost = Object.entries(displayStats.byDay)
    .filter(([date]) => date.startsWith(today.slice(0, 7)))
    .reduce((sum, [, day]) => sum + day.cost, 0)
  const todayCost = displayStats.byDay[today]?.cost ?? 0
  // v1.5：今日 vs 昨日费用环比（触发卡涨跌徽章用）。昨日缺失时为 0（不渲染徽章）。
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
  const prevDayCost = displayStats.byDay[yesterdayKey]?.cost ?? 0
  const deltaPct = prevDayCost > 0 ? ((todayCost - prevDayCost) / prevDayCost) * 100 : 0
  // 触发卡 hover 速览：本周累计 + 近 7 天迷你柱。
  // 「本周」按自然周（周一起算，与标签语义一致，issue #39）：周一时它 ≈ 当日，
  // 不再是「近 7 天」把上周用量卷进来、与当月几乎相等的错位。
  const weekCost = sinceMondayOf(displayStats.byDay, today)
  // 近 7 天柱状数据（费用 + 当日 token 合并一份，供 trigger 按视角取列）。
  // token 口径与悬浮窗「总 Token」一致：input + output（缓存读单列，不并入）。
  const last7 = useMemo(
    () => lastSevenDays(displayStats.byDay).map((day) => {
      const row = displayStats.byDay[day.date]
      return { date: day.date, cost: day.cost, tokens: row === undefined ? 0 : dayTokensOf(row) }
    }),
    [displayStats.byDay],
  )
  // tokens 视角的主副行数字：当月/今日/本周 累计 token（本周 = 自然周，issue #39）。
  const monthTokens = Object.entries(displayStats.byDay)
    .filter(([date]) => date.startsWith(today.slice(0, 7)))
    .reduce((sum, [, day]) => sum + dayTokensOf(day), 0)
  const todayTokens = (() => {
    const row = displayStats.byDay[today]
    return row === undefined ? 0 : dayTokensOf(row)
  })()
  const weekTokens = sinceMondayOf(displayStats.byDay, today, dayTokensOf)

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
    // 峰谷提醒未开启（默认关闭）时不起墙钟 tick——它唯一驱动的 computePeakAlert
    // 在 disabled 时恒返回 null，常开 tick 只会每 30s 空转整棵组件树。
    if (!peakConfig.enabled) return
    const timer = setInterval(() => setNowMs(Date.now()), STATS_REFRESH_INTERVAL_MS)
    return () => { clearInterval(timer) }
  }, [peakConfig.enabled])
  const updatePeakConfig = useCallback((config: PeakAlertConfig) => {
    setPeakConfig(config)
    savePeakAlertConfig(config)
  }, [])
  // 当前对话的峰谷窗口：跟随最近一轮调用的模型（byTurn 服务端按起始时间倒序）
  // 与订阅状态推导——DeepSeek 按量分时 / 智谱 Coding Plan 积分分时 / 其余不涉及。
  const hasZhipuPlan = quotas.some(q => q.displayName === 'Z.ai Coding Plan' && q.status === 'ok')
  const currentChannel = rateChannelOf(stats.byTurn?.[0]?.model, hasZhipuPlan)
  const previewPeak = useCallback(() => {
    // 预览：3 分钟后进入与当前相反的档位（不触真实去重，关闭即消失）；
    // 文案按当前通道口径渲染。
    setPeakPreview({
      entering: tierAt(Date.now()) === 'peak' ? 'offPeak' : 'peak',
      atMs: Date.now() + 3 * 60_000,
      channel: currentChannel,
    })
  }, [currentChannel])
  const effectiveBudget = budgetAmount > 0 ? budgetAmount : (stats.budget ?? 0)
  // 预算临界态：与设置页进度条同阈值分档（≥80% 警示 / ≥100% 超支），驱动触发卡
  // 指针变红与卡片边缘红色脉冲。未启用预算或无金额时恒为 none。
  const budgetPressure: 'none' | 'warn' | 'over' = budgetEnabled && effectiveBudget > 0
    ? (monthCost / effectiveBudget >= 1 ? 'over' : monthCost / effectiveBudget >= 0.8 ? 'warn' : 'none')
    : 'none'
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
    const crossed = BUDGET_ALERT_TIERS.filter(tier => pct >= tier && tierAlertDays?.[String(tier)] !== today)
    if (crossed.length === 0) return
    const top = crossed[crossed.length - 1] ?? 100
    actions.markTierAlerted(crossed, today)
    if (!notifyAllowed()) return
    const body = t('budgetTierBody')
      .replace('{cost}', formatMoney(monthCost))
      .replace('{budget}', formatMoney(effectiveBudget))
      .replace('{pct}', String(top))
    // 通知发送失败（部分平台限制）不影响标记：当天不再重试，避免轮询轰炸。
    // 认领失败 = 另一实例刚发过同档提醒，本实例跳过（issue #44）。
    notifyAcrossInstances(`budget:${top}:${today}`, () => { new Notification(t('budget'), { body }) })
  }, [budgetEnabled, effectiveBudget, monthCost, tierAlertDays, today, actions, t])

  // 峰/谷切换前提醒（增强版）：距进入下一档不足提前量且该切换点未提醒过时，
  // 弹可视化浮层 +（可选的）系统通知。峰谷窗口跟随当前对话实际使用的模型
  // （rateChannelOf）：DeepSeek 按量模型走分时价，智谱模型在持有 Z.ai Coding
  // Plan 时走积分分时，其余模型不提醒也不显示档位。`lastTierSwitchAt` 去重
  // 跨重启生效，与旧的系统通知共用同一份去重，避免一条切换提醒弹两次。
  // 「当前对话的模型」= 最近一轮调用（byTurn 服务端按起始时间倒序下发）的归因
  // 模型键；无任何轮次时视为不涉及峰谷。
  useEffect(() => {
    const upcoming = computePeakAlert(nowMs, peakConfig, lastTierSwitchAt, currentChannel)
    if (upcoming === null) return
    actions.markTierSwitchAlerted(upcoming.atMs)
    setPeakHit(upcoming)
    if (!peakConfig.webNotify || !notifyAllowed()) return
    const minutes = Math.max(1, Math.round((upcoming.atMs - nowMs) / 60_000))
    const title = t(upcoming.entering === 'peak' ? 'peakAlertTitlePeak' : 'peakAlertTitleOff')
    const body = t(upcoming.channel === 'zhipu-coding-plan'
      ? (upcoming.entering === 'peak' ? 'tierAlertEnterPeakZhipu' : 'tierAlertEnterOffZhipu')
      : (upcoming.entering === 'peak' ? 'tierAlertEnterPeak' : 'tierAlertEnterOff'))
      .replace('{minutes}', String(minutes))
    // 认领失败 = 另一实例刚发过同一切换点提醒，本实例跳过（issue #44）。
    notifyAcrossInstances(`peak:${upcoming.atMs}`, () => { new Notification(title, { body }) })
    // quotas/stats.byTurn 已经由 currentChannel 捕获，不重复列入依赖。
  }, [nowMs, lastTierSwitchAt, peakConfig, currentChannel, actions, t])

  // 余额不足告警：任一提供方余额低于阈值（折算人民币）时每天提醒一次；
  // 与预算开关无关——余额是硬性约束，无论是否开启预算都要提醒。
  const lastBalanceAlertDay = useStore(s => s.lastBalanceAlertDay)
  // U-3 按模型预算：预算表 + 提醒标记；本月每模型消耗（用户价重估口径）。
  // 两个字段是 v1.6.0 新增：宿主 store 引擎 rehydrate 按整体替换恢复持久化状态
  // （不与 init() 合并），v1.5.x 老状态缺这两键时读到 undefined，渲染/effect
  // 即崩并被槽位错误边界弹出（左下角胶囊消失）——读取点必须就地补空表兜底。
  const modelBudgets = useStore(s => s.modelBudgets ?? EMPTY_MODEL_BUDGETS)
  const modelTierAlertDays = useStore(s => s.modelTierAlertDays ?? EMPTY_MODEL_TIER_ALERT_DAYS)
  const monthModelCost = useMemo(
    () => monthCostByModel(displayStats.byDayModels, today.slice(0, 7)),
    [displayStats.byDayModels, today],
  )
  const lowThreshold = displayStats.lowBalanceThreshold ?? DEFAULT_LOW_BALANCE_THRESHOLD
  const lowBalanceRow = useMemo(() => {
    if (balances.length === 0) return undefined
    const burn = dailyBurnRate(displayStats.byDay, today)
    const rate = getRateInfo().rate
    for (const balance of balances) {
      if (balance.totalBalance === undefined || balance.error !== undefined) continue
      // USD 余额按当前汇率折成人民币，与阈值同口径。
      const cny = balance.currency === 'USD' ? balance.totalBalance * rate : balance.totalBalance
      if (cny >= lowThreshold) continue
      // 天数仅在有消耗记录时提供；刚用或未用（无历史）时以金额告警为主。
      const days = burn > 0 ? Math.floor(cny / burn) : undefined
      return { name: balance.displayName, cny, days }
    }
    return undefined
  }, [balances, displayStats.lowBalanceThreshold, displayStats.byDay, today])
  useEffect(() => {
    if (lowBalanceRow === undefined) return
    if (lastBalanceAlertDay === today) return
    actions.markBalanceAlerted(today)
    if (!notifyAllowed()) return
    const body = t('balanceLowBody')
      .replace('{name}', lowBalanceRow.name)
      .replace('{balance}', formatMoney(lowBalanceRow.cny))
      .replace('{days}', lowBalanceRow.days === undefined ? '—' : String(lowBalanceRow.days))
    // 通知发送失败（部分平台限制）不影响标记：当天不再重试，避免轮询轰炸。
    // 认领失败 = 另一实例刚发过当日余额提醒，本实例跳过（issue #44）。
    notifyAcrossInstances(`balance:${today}`, () => { new Notification(t('balance'), { body }) })
  }, [lowBalanceRow, lastBalanceAlertDay, today, actions, t])

  // U-3 按模型预算分档提醒：任一模型本月消耗跨 80% / 100% 时桌面通知
  // （每模型每档每天最多一次，跨多档只发最高档；标记与全局预算同套 store）。
  useEffect(() => {
    const marks: string[] = []
    let top: { model: string; tier: number; cost: number; budget: number } | undefined
    for (const [model, budget] of Object.entries(modelBudgets)) {
      if (!(budget > 0)) continue
      const cost = monthModelCost[model] ?? 0
      for (const tier of crossedModelBudgetTiers(cost, budget)) {
        const mark = `${model}:${tier}`
        if (modelTierAlertDays[mark] === today) continue
        marks.push(mark)
        if (top === undefined || tier > top.tier) top = { model, tier, cost, budget }
      }
    }
    if (marks.length === 0 || top === undefined) return
    actions.markModelTierAlerted(marks, today)
    if (!notifyAllowed()) return
    const body = t('modelBudgetBody')
      .replace('{model}', top.model)
      .replace('{cost}', formatMoney(top.cost))
      .replace('{budget}', formatMoney(top.budget))
      .replace('{pct}', String(top.tier))
    // 认领失败 = 另一实例刚发过同模型同档提醒，本实例跳过（issue #44 同款）。
    notifyAcrossInstances(`model-budget:${top.model}:${top.tier}:${today}`, () => { new Notification(t('modelBudgetTitle'), { body }) })
  }, [modelBudgets, monthModelCost, modelTierAlertDays, today, actions, t])

  // hover 速览「主力直联/订阅消耗」：本月按厂商聚合消耗，区分按量（直联）与订阅，
  // 并附余额/配额状态——余额仅按量厂商有意义，配额仅订阅厂商有意义。
  const vendorStatus = useMemo(() => {
    const prefix = today.slice(0, 7)
    const vendor = new Map<string, { cost: number; plan: boolean }>()
    for (const [date, models] of Object.entries(displayStats.byDayModels ?? {})) {
      if (!date.startsWith(prefix)) continue
      for (const [modelKey, usage] of Object.entries(models)) {
        if (usage.cost <= 0) continue
        const provider = modelOf(modelKey).provider
        const isPlan = displayStats.byModel?.[modelKey]?.plan === true
        const cur = vendor.get(provider) ?? { cost: 0, plan: isPlan }
        cur.cost += usage.cost
        // 混合计费（部分订阅）视为存在按量 → 归直联桶。
        if (!isPlan) cur.plan = false
        vendor.set(provider, cur)
      }
    }
    // 直联/订阅各取费用最高的渠道：单次遍历同时找两个最大值（稳定并列语义同 sort[0]）。
    let directEntry: [string, { cost: number; plan: boolean }] | undefined
    let subEntry: [string, { cost: number; plan: boolean }] | undefined
    for (const entry of vendor) {
      const top = entry[1].plan ? subEntry : directEntry
      if (top === undefined || entry[1].cost > top[1].cost) {
        if (entry[1].plan) subEntry = entry
        else directEntry = entry
      }
    }
    // 目录兜底条目（Custom/其他）不是真实渠道：用户给未收录模型配价后它可能成为
    // 主力（issue #40 反馈），按名查余额必然「未配置」。单渠道用户把唯一配置成功
    // 的渠道余额借过来显示（所有流量实际都走它）；多渠道时归属不明，隐藏该行
    // 而不是显示误导性的「未配置」。
    const balanceStatus = (name: string): { text: string; low: boolean } | undefined => {
      const bal = balances.find(b => normalizeProvider(b.provider) === normalizeProvider(name))
      if (bal === undefined || bal.totalBalance === undefined) {
        // 目录兜底条目（Custom）不是真实渠道：单渠道用户把唯一配置成功的渠道余额
        // 借过来显示（所有流量实际都走它）；多渠道时归属不明，隐藏该行而不是显示
        // 误导性的「未配置」（issue #40 反馈）。
        if (name === 'Custom') {
          const configured = balances.filter(b => b.totalBalance !== undefined && b.error === undefined)
          const only = configured[0]
          if (only !== undefined && configured.length === 1) return balanceStatus(only.provider)
          return undefined
        }
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
      return { text: amount, low: cny < lowThreshold }
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
    const directStatus = directEntry === undefined ? undefined : balanceStatus(directEntry[0])
    return {
      direct: directEntry === undefined || directStatus === undefined
        ? undefined
        : { name: directEntry[0], ...directStatus },
      sub: subEntry === undefined ? undefined : { name: subEntry[0], ...quotaStatus(subEntry[0]) },
    }
  }, [displayStats.byDayModels, displayStats.byModel, displayStats.lowBalanceThreshold, balances, quotas, today, t])

  // hover 速览「数据卡」数值：全量累计用量（参考图风格）。
  const dash = useMemo(() => {
    const total = displayStats.total
    return {
      input: total.input,
      output: total.output,
      cacheRead: total.cacheHit,
      cacheMiss: total.cacheMiss,
      calls: total.calls,
    }
  }, [displayStats])

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
      <UsageBillingTrigger
        {...props}
        t={t}
        currency={currency}
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
        budgetPressure={budgetPressure}
        deltaPct={deltaPct}
      />
      {open && (
        <BillingDashboard
          stats={displayStats}
          t={t}
          onClose={close}
          navigateToSession={navigateToSession}
          userPrices={userPrices}
          onUserPrices={updateUserPrices}
          health={health}
          balances={balances}
          {...(reconcile === undefined ? {} : { reconcile })}
          quotas={quotas}
          relayQuotas={relayQuotas}
          currency={currency}
          onCurrency={updateCurrency}
          language={language}
          onLanguage={updateLanguage}
          turns={turns}
          renderSlot={renderSlot}
          budgetEnabled={budgetEnabled}
          budgetAmount={effectiveBudget}
          modelBudgets={modelBudgets}
          monthModelCost={monthModelCost}
          onModelBudget={actions.setModelBudget}
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
          balanceStale={balanceStale}
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
