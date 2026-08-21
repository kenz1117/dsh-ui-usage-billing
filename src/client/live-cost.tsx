/**
 * LiveCostBar: the session-scope cost ticker mounted on the composer's dock,
 * showing the current session's accumulated spend and the latest turn's cost.
 *
 * It rides `conversation.composer.dock` (the stats-line family seat under the
 * composer card, same posture as ui-conversation's own StatsLine), so it stays
 * visible while working without opening the full dashboard. Data comes from the
 * same `/api/billing/usage-stats` endpoint the dashboard polls; the bar reads
 * the current session id off the framework snapshot (`useSession` parent of
 * `sessionId`) and matches `bySession` (session total) and `byTurn` (latest
 * turn cost). Rendering is a pure function of the snapshot, never a side effect.
 */

import { useEffect, useMemo, useState } from 'react'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import { formatMoney } from './pricing.ts'
import css from './UsageBilling.module.css'

/** The usage-stats shape the composer bar needs (a thin slice, not the whole doc). */
export interface LiveStats {
  bySession?: readonly { id: string; cost: number }[]
  byTurn?: readonly { sessionId: string; turn: number; cost: number }[]
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

/** Endpoint the node half serves (same constant the dashboard uses). */
const USAGE_STATS_PATH = '/api/billing/usage-stats'

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

/** Props: the session-scope snapshot selector the framework injects. */
export interface LiveCostBarProps {
  useSession: SnapshotSelectorHook<ConversationSnapshot>
  /** The owning dock's locale seat (bound to the billing NS). */
  t: (key: 'billing.liveTurn' | 'billing.liveSession') => string
}

/**
 * Render the live cost ticker for the current session.
 * @param props - framework session snapshot hook and locale.
 */
export function LiveCostBar({ useSession, t }: LiveCostBarProps): React.ReactNode {
  const sessionId = useSession(s => s.sessionId)
  // 拉取即时代费数据：挂载时一次 + 周期刷新（与仪表盘同频）。
  const [stats, setStats] = useState<LiveStats | null>(null)
  useEffect(() => {
    let cancelled = false
    const load = (): void => {
      void loadLiveStats().then((data) => {
        if (!cancelled && data !== null) setStats(data)
      })
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

  const money = (cny: number): string => formatMoney(cny, 'cny')

  if (sessionId === undefined || (sessionCost <= 0 && turnCost <= 0)) return null
  return (
    <span className={css.liveCostBar} data-testid="billing-live-cost-bar">
      <span className={css.liveCostItem} data-testid="billing-live-turn">
        {t('billing.liveTurn')} {money(turnCost)}
      </span>
      <span className={css.liveCostSep} aria-hidden="true">·</span>
      <span className={css.liveCostItem} data-testid="billing-live-session">
        {t('billing.liveSession')} {money(sessionCost)}
      </span>
    </span>
  )
}
