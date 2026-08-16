/**
 * TrendChart: dependency-free SVG combo chart of daily cost (area line) and
 * daily call volume (bars) with a hover crosshair. No chart library — the
 * surface stays self-contained and offline.
 */

import { useMemo, useState } from 'react'
import css from './UsageBilling.module.css'
import { formatMoney } from './pricing.ts'

/** One day row fed to the chart. */
export interface TrendPoint {
  /** ISO date `YYYY-MM-DD`. */
  date: string
  /** USD cost that day. */
  cost: number
  /** API calls that day. */
  calls: number
}

/** Fixed viewBox; the SVG scales to its container. */
const W = 680
const H = 220
const PAD = { top: 18, right: 16, bottom: 26, left: 46 }

/** Split a date into `M/D` for axis labels. */
function shortDate(iso: string): string {
  const [, month, day] = iso.split('-')
  return `${Number(month)}/${Number(day)}`
}

/** Build an SVG path string through points with a smooth monotone-ish curve. */
function linePath(points: readonly { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0]!.x} ${points[0]!.y}`
  let d = `M ${points[0]!.x} ${points[0]!.y}`
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]!
    const curr = points[i]!
    // Quadratic midpoint smoothing keeps the curve inside the data range.
    const mx = (prev.x + curr.x) / 2
    d += ` C ${mx} ${prev.y}, ${mx} ${curr.y}, ${curr.x} ${curr.y}`
  }
  return d
}

/** Ticks every `step` items for sparse axis labels. */
function tickIndexes(length: number, step: number): number[] {
  const out: number[] = []
  for (let i = 0; i < length; i += step) out.push(i)
  if (length > 0 && out[out.length - 1] !== length - 1) out.push(length - 1)
  return out
}

/**
 * Render the daily trend chart.
 * @param props.data - sorted daily rows (ascending date).
 */
export function TrendChart({ data }: { data: readonly TrendPoint[] }): React.ReactNode {
  const [hover, setHover] = useState<number | null>(null)

  const layout = useMemo(() => {
    const n = data.length
    if (n === 0) return null
    const maxCost = Math.max(...data.map(d => d.cost), 0.0001)
    const maxCalls = Math.max(...data.map(d => d.calls), 1)
    const plotW = W - PAD.left - PAD.right
    const plotH = H - PAD.top - PAD.bottom
    const inner = (i: number): number => {
      if (n === 1) return PAD.left + plotW / 2
      return PAD.left + (plotW * i) / (n - 1)
    }
    const yCost = (value: number): number => PAD.top + plotH - (value / maxCost) * plotH
    const yCalls = (value: number): number => PAD.top + plotH - (value / maxCalls) * plotH
    const barW = Math.min(16, (plotW / n) * 0.5)
    const line = linePath(data.map((d, i) => ({ x: inner(i), y: yCost(d.cost) })))
    const area = line.length === 0 ? '' : `${line} L ${inner(n - 1)} ${PAD.top + plotH} L ${inner(0)} ${PAD.top + plotH} Z`
    const costTicks = [0, 0.25, 0.5, 0.75, 1].map(f => maxCost * f).reverse()
    const callTicks = [0, 0.25, 0.5, 0.75, 1].map(f => maxCalls * f).reverse()
    return {
      n, plotW, plotH, inner, yCost, yCalls, barW, line, area,
      costTicks, callTicks, maxCost, maxCalls,
    }
  }, [data])

  if (layout === null) {
    return <div className={css.chartEmpty}>暂无趋势数据</div>
  }

  const { n, plotW, inner, yCost, yCalls, barW, line, area, costTicks, callTicks } = layout
  const active = hover === null ? null : data[hover]!
  const indices = tickIndexes(n, Math.max(1, Math.ceil(n / 8)))

  return (
    <div className={css.chartWrap}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={css.chartSvg}
        role="img"
        aria-label="Daily cost and call volume trend"
        onMouseLeave={() => { setHover(null) }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = ((e.clientX - rect.left) / rect.width) * W
          const ratio = (x - PAD.left) / plotW
          const index = Math.round(ratio * (n - 1))
          setHover(Math.min(Math.max(index, 0), n - 1))
        }}
      >
        <defs>
          <linearGradient id="billing-cost-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--dsw-static-blue-500)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--dsw-static-blue-500)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines with cost labels (left axis). */}
        {costTicks.map((value, idx) => {
          const y = yCost(value)
          return (
            <g key={`cost-${idx}`}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} className={css.chartGrid} />
              <text x={PAD.left - 8} y={y + 3} textAnchor="end" className={css.chartAxisLabel}>
                {formatMoney(value)}
              </text>
            </g>
          )
        })}

        {/* Right-axis call labels. */}
        {callTicks.map((value, idx) => {
          const y = yCalls(value)
          return (
            <text key={`calls-${idx}`} x={W - PAD.right + 8} y={y + 3} className={css.chartAxisLabel}>
              {value >= 1000 ? `${Math.round(value / 1000)}k` : String(Math.round(value))}
            </text>
          )
        })}

        {/* Call volume bars. */}
        {data.map((d, i) => (
          <rect
            key={d.date}
            x={inner(i) - barW / 2}
            y={yCalls(d.calls)}
            width={barW}
            height={Math.max(1, PAD.top + layout.plotH - yCalls(d.calls))}
            rx={2}
            className={css.chartBar}
          />
        ))}

        {/* Cost area + line. */}
        <path d={area} fill="url(#billing-cost-fill)" />
        <path d={line} fill="none" className={css.chartLine} strokeWidth={2} />

        {/* X-axis date labels. */}
        {indices.map(i => (
          <text key={data[i]!.date} x={inner(i)} y={H - 6} textAnchor="middle" className={css.chartAxisLabel}>
            {shortDate(data[i]!.date)}
          </text>
        ))}

        {/* Hover crosshair and point. */}
        {active !== null && (
          <>
            <line x1={inner(hover!)} x2={inner(hover!)} y1={PAD.top} y2={PAD.top + layout.plotH} className={css.chartCrosshair} />
            <circle cx={inner(hover!)} cy={yCost(active.cost)} r={4.5} className={css.chartDot} />
          </>
        )}
      </svg>

      {/* Hover tooltip. */}
      {active !== null && hover !== null && (
        <div
          className={css.chartTooltip}
          style={{ left: `${(inner(hover) / W) * 100}%`, top: `${(yCost(active.cost) / H) * 100}%` }}
        >
          <div className={css.chartTooltipDate}>{active.date}</div>
          <div className={css.chartTooltipRow}>
            <span className={css.chartLegendLine} />
            费用 <strong>{formatMoney(active.cost)}</strong>
          </div>
          <div className={css.chartTooltipRow}>
            <span className={css.chartLegendBar} />
            调用 <strong>{active.calls.toLocaleString()}</strong>
          </div>
        </div>
      )}

      {/* Inline legend. */}
      <div className={css.chartLegend}>
        <span><span className={css.chartLegendLine} />每日费用</span>
        <span><span className={css.chartLegendBar} />调用次数</span>
      </div>
    </div>
  )
}

