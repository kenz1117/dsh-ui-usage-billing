/**
 * RoundCostChart: dependency-free per-turn cost bars with spike markers.
 *
 * One bar per turn (most recent N, newest last), height scaled to the window
 * maximum. Turns flagged by {@link flagAnomalies} get a warning outline and a
 * corner marker; hover shows the turn's model, cost, and window time. Styling
 * lives in the billing CSS module (`.rounds*`).
 */

import { useMemo } from 'react'
import clsx from 'clsx'
import type { AnomalyFlag } from './anomaly.ts'
import css from './UsageBilling.module.css'
import { cnyToUsd, formatMoney, tierAt, type CostCurrency } from './pricing.ts'

/** 每轮费用图的一行（TurnUsageRow 的展示子集）。 */
export interface RoundChartRow {
  sessionId: string
  turn: number
  model: string
  cost: number
  input: number
  output: number
  cacheHit: number
  cacheMiss: number
  startedAt: number
  endedAt?: number
}

/** 每轮图最多渲染的轮数（服务端已封顶，这里再收敛渲染宽度）。 */
const DISPLAY_LIMIT = 40

/** Local time `HH:MM`. */
function clock(time: number): string {
  const date = new Date(time)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Local date + time for the hover line. */
function dateTime(time: number): string {
  const date = new Date(time)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * Render the per-turn cost bars.
 * @param props.rounds - turns, most recent last (ascending startedAt); oldest beyond the limit are dropped.
 * @param props.flags - spike flags matched by sessionId+turn.
 * @param props.currency - display currency for the amount labels.
 * @param props.t - locale function for the model label.
 */
export function RoundCostChart({ rounds, flags, currency, t }: {
  rounds: readonly RoundChartRow[]
  flags: readonly AnomalyFlag[]
  currency: CostCurrency
  t: (key: 'billing.model' | 'billing.costAbbr') => string
}): React.ReactNode {
  const visible = useMemo(() => rounds.slice(-DISPLAY_LIMIT), [rounds])
  const flagKey = useMemo(() => new Set(flags.map(flag => `${flag.sessionId}:${flag.turn}`)), [flags])
  const maxCost = useMemo(() => Math.max(0.0001, ...visible.map(round => round.cost)), [visible])
  if (visible.length === 0) return <div className={css.roundsEmpty}>{t('billing.model')} —</div>
  const money = (cny: number): string => formatMoney(currency === 'usd' ? cnyToUsd(cny) : cny, currency)

  return (
    <div className={css.rounds}>
      <div className={css.roundsBars} role="img" aria-label="cost per turn">
        {visible.map((round) => {
          const flagged = flagKey.has(`${round.sessionId}:${round.turn}`)
          const height = Math.max(1, (round.cost / maxCost) * 100)
          // 该轮起始时刻落在峰时/平价的背景色带（峰=琥珀、平价=中性）。
          const peak = tierAt(round.startedAt) === 'peak'
          return (
            <div key={`${round.sessionId}:${round.turn}`} className={clsx(css.roundsBarCol, peak ? css.roundsBarColPeak : css.roundsBarColOff)}>
              {/* 每根柱子顶部的费用数字：随柱高定位（bottom = height%），紧贴各自柱顶上方。 */}
              <span className={css.roundsBarLabel} style={{ bottom: `${height}%` }}>{money(round.cost)}</span>
              <div className={css.roundsBarWrap}>
                <div
                  className={flagged ? css.roundsBarFlagged : css.roundsBar}
                  style={{ height: `${height}%` }}
                  data-testid="round-bar"
                  title={`${t('billing.model')} ${round.model} · ${money(round.cost)} · ${dateTime(round.startedAt)}${round.endedAt !== undefined ? ` → ${clock(round.endedAt)}` : ''}`}
                >
                  {flagged && <span className={css.roundsFlagMark} aria-hidden="true" />}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className={css.roundsAxis}>
        <span>{t('billing.costAbbr')} {money(maxCost)}</span>
        <span>{visible.length} 轮</span>
      </div>
    </div>
  )
}
