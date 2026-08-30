/**
 * LiveCostBar: the session-scope cost ticker mounted on the composer's dock,
 * showing the current session's accumulated spend and the latest turn's cost.
 *
 * It rides `conversation.composer.dock` (the stats-line family seat under the
 * composer card, same posture as ui-conversation's own StatsLine), so it stays
 * visible while working without opening the full dashboard. Data comes from the
 * same `/api/billing/usage-stats` endpoint the dashboard polls; the bar reads
 * the current session id from the session-scope standard kit and matches
 * `bySession` (session total) and `byTurn` (latest turn cost). Rendering is a
 * pure function of props and polled data, never a side effect.
 *
 * The bar also carries two ambient signals: the current peak/off-peak pricing
 * tier with a switch countdown (DeepSeek time-of-day pricing), and quota chips
 * for subscription plans running low (≤20% remaining), so cost pressure is
 * visible without opening the dashboard.
 */

import { useEffect, useMemo, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { formatMoney, formatSwitchCountdown, tierCountdown } from './pricing.ts'
import { LIVE_COST_BAR_PREF_EVENT, loadLiveCostBarPrefs } from './usage-billing-settings.ts'
import type { UsageBillingKey } from './locales.ts'
import css from './UsageBilling.module.css'

/** The usage-stats shape the composer bar needs (a thin slice, not the whole doc). */
export interface LiveStats {
  bySession?: readonly { id: string; cost: number }[]
  byTurn?: readonly { sessionId: string; turn: number; cost: number }[]
}

/** 订阅额度的薄切片（/api/billing/subscriptions 响应的行）。 */
export interface QuotaSlice {
  displayName: string
  status: string
  windows: readonly { kind: string; remainingPercent: number }[]
}

/**
 * 当前会话累计费用：bySession 里会话 id 匹配的那行；缺省为 0。
 * 导出供测试：纯函数。
 * @param stats - 薄统计切片。
 * @param sessionId - 当前会话 id。
 * @returns 该会话累计费用（人民币元）。
 */
export function sessionCostOf(stats: LiveStats | null, sessionId: string | undefined): number {
  if (sessionId === undefined || stats?.bySession === undefined) return 0
  const row = stats.bySession.find(item => item.id === sessionId)
  return row?.cost ?? 0
}

/**
 * 当前轮费用：byTurn 里该会话最新一轮的 cost；缺省为 0。
 * byTurn 服务端按起始时间倒序下发，但求 max(turn) 更稳健（不依赖顺序）。
 * 导出供测试：纯函数。
 * @param stats - 薄统计切片。
 * @param sessionId - 当前会话 id。
 * @returns 最新一轮费用（人民币元）。
 */
export function turnCostOf(stats: LiveStats | null, sessionId: string | undefined): number {
  if (sessionId === undefined || stats?.byTurn === undefined) return 0
  let latest = 0
  let latestTurn = -1
  for (const item of stats.byTurn) {
    if (item.sessionId !== sessionId) continue
    if (latestTurn === -1 || item.turn > latestTurn) {
      latestTurn = item.turn
      latest = item.cost
    }
  }
  return latest
}

/**
 * 低额度预警 chips：查询成功（ok）且任一窗口剩余 ≤ threshold 的套餐，
 * 按剩余升序、最多 3 枚。导出供测试：纯函数。
 * @param quotas - 订阅额度行切片。
 * @param threshold - 剩余百分比阈值（默认 20%）。
 */
export function lowQuotaChips(
  quotas: readonly QuotaSlice[],
  threshold = 20,
): readonly { name: string; kind: string; pct: number }[] {
  const chips: { name: string; kind: string; pct: number }[] = []
  for (const quota of quotas) {
    if (quota.status !== 'ok') continue
    for (const win of quota.windows) {
      if (win.remainingPercent > threshold) continue
      chips.push({ name: quota.displayName, kind: win.kind, pct: win.remainingPercent })
    }
  }
  return chips.sort((a, b) => a.pct - b.pct).slice(0, 3)
}

/** Endpoint the node half serves (same constant the dashboard uses). */
const USAGE_STATS_PATH = '/api/billing/usage-stats'

/** 订阅额度端点（额度预警 chips 的数据源）。 */
const SUBSCRIPTIONS_PATH = '/api/billing/subscriptions'

/** Refresh cadence (ms): matching the dashboard so the bar stays current. */
const REFRESH_INTERVAL_MS = 30_000

/** Load the thin stats slice; null when the endpoint does not answer valid JSON. */
async function loadLiveStats(): Promise<LiveStats | null> {
  try {
    const response = await fetch(USAGE_STATS_PATH)
    if (!response.ok) return null
    const text = await response.text()
    const parsed = JSON.parse(text) as unknown
    if (parsed === null || typeof parsed !== 'object') return null
    const doc = parsed as LiveStats
    return {
      ...(Array.isArray(doc.bySession) ? { bySession: doc.bySession } : {}),
      ...(Array.isArray(doc.byTurn) ? { byTurn: doc.byTurn } : {}),
    }
  } catch {
    return null
  }
}

/** Load subscription quota slices; empty list on any failure. */
async function loadQuotas(): Promise<readonly QuotaSlice[]> {
  try {
    const response = await fetch(SUBSCRIPTIONS_PATH)
    if (!response.ok) return []
    const parsed = JSON.parse(await response.text()) as unknown
    if (parsed === null || typeof parsed !== 'object' || !('quotas' in parsed)) return []
    const quotas = (parsed as { quotas: unknown }).quotas
    return Array.isArray(quotas) ? quotas as QuotaSlice[] : []
  } catch {
    return []
  }
}

/** 额度窗口类型 → 文案 key（本次 / 本周 / 本月 / 计费周期）。 */
function windowLabelKey(kind: string): UsageBillingKey {
  switch (kind) {
    case 'session': return 'billing.subscriptionSession'
    case 'weekly': return 'billing.subscriptionWeekly'
    case 'monthly': return 'billing.subscriptionMonthly'
    default: return 'billing.subscriptionBilling'
  }
}

/** Props: the framework's session identity plus the owning dock's locale seat. */
export interface LiveCostBarProps {
  /** Current Session identity supplied by the session-scope standard kit. */
  sessionId: SessionId
  /** The owning dock's locale seat (bound to the billing NS). */
  t: (key: UsageBillingKey) => string
}

/**
 * Render the live cost ticker for the current session.
 * @param props - framework session identity and locale.
 */
export function LiveCostBar({ sessionId, t }: LiveCostBarProps): React.ReactNode {
  // 显示偏好（设置 Tab「平价消耗胶囊」开关）：挂载读一次；设置 Tab 与本组件分属
  // 两个 React 树，切换后经 LIVE_COST_BAR_PREF_EVENT（同文档）与 storage 事件
  // （跨标签页）通知这里重读 localStorage，胶囊条即时显隐。
  const [visible, setVisible] = useState(() => loadLiveCostBarPrefs().show)
  useEffect(() => {
    const reread = (): void => { setVisible(loadLiveCostBarPrefs().show) }
    window.addEventListener(LIVE_COST_BAR_PREF_EVENT, reread)
    window.addEventListener('storage', reread)
    return () => {
      window.removeEventListener(LIVE_COST_BAR_PREF_EVENT, reread)
      window.removeEventListener('storage', reread)
    }
  }, [])
  // 拉取即时代费数据：挂载时一次 + 周期刷新（与仪表盘同频）。
  const [stats, setStats] = useState<LiveStats | null>(null)
  const [quotas, setQuotas] = useState<readonly QuotaSlice[]>([])
  // 峰谷倒计时独立跳动（30 秒粒度足够，与数据轮询同频但无数据时也刷新）。
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    let cancelled = false
    const load = (): void => {
      void loadLiveStats().then((data) => {
        if (!cancelled && data !== null) setStats(data)
      })
      void loadQuotas().then((list) => {
        if (!cancelled) setQuotas(list)
      })
      if (!cancelled) setNowMs(Date.now())
    }
    load()
    const timer = setInterval(load, REFRESH_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
    // sessionId 变化时重新订阅，以对齐当前会话。
  }, [sessionId])

  // 当前会话累计费用与当前轮费用：由纯函数派生，便于测试。
  const sessionCost = useMemo(() => sessionCostOf(stats, sessionId), [stats, sessionId])
  const turnCost = useMemo(() => turnCostOf(stats, sessionId), [stats, sessionId])
  const tier = tierCountdown(nowMs)
  const chips = useMemo(() => lowQuotaChips(quotas), [quotas])

  const money = (cny: number): string => formatMoney(cny, 'cny')

  const hasCost = sessionCost > 0 || turnCost > 0
  const isPeak = tier.tier === 'peak'
  // 设置 Tab 里关闭「平价消耗胶囊」后整条不渲染（dock 槽位对 null 子元素安全，
  // 纯显隐门控：数据轮询与统计口径不受影响）。返回 null 放在全部 hook 之后。
  if (!visible) return null
  // 设计 fee-bar：档位 chip → 倒计时 → 档位说明 → 本轮/会话 → 额度预警 chips。
  return (
    <span className={css.feeBar} data-testid="billing-live-cost-bar">
      <span className={isPeak ? css.feeChipPrimary : css.feeChipOff} data-testid="billing-live-tier">
        {isPeak ? t('billing.tierPeak') : t('billing.tierOff')}
      </span>
      <span className={css.feeCount}>{formatSwitchCountdown(tier.nextSwitchInMs)}</span>
      <span className={css.feeSuffix}>{isPeak ? t('billing.tierToOff') : t('billing.tierToPeak')}</span>
      {hasCost && (
        <>
          <span className={css.feeSep} aria-hidden="true">·</span>
          <span className={css.feeItem} data-testid="billing-live-turn">
            {t('billing.liveTurn')} <span className={css.feeNum}>{money(turnCost)}</span>
          </span>
          <span className={css.feeSep} aria-hidden="true">·</span>
          <span className={css.feeItem} data-testid="billing-live-session">
            {t('billing.liveSession')} <span className={css.feeNum}>{money(sessionCost)}</span>
          </span>
        </>
      )}
      {/* 额度预警 chips：套餐窗口剩余 ≤20% 时浮现（剩余最少者优先，最多 3 枚）。 */}
      {chips.map(chip => (
        <span key={`${chip.name}:${chip.kind}`}>
          <span className={css.feeSep} aria-hidden="true">·</span>
          <span className={chip.pct <= 10 ? css.feeChipError : css.feeChipAlert} data-testid="billing-live-quota">
            {chip.name} {t(windowLabelKey(chip.kind))} {chip.pct}%
          </span>
        </span>
      ))}
    </span>
  )
}
