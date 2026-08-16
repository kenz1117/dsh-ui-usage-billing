/**
 * TrendChart: dependency-free SVG stacked bar chart of daily cost per model.
 * Each day's column stacks every model's share in its brand color, so the
 * total trend and the per-model composition are visible at once. A hover
 * crosshair shows the day's model breakdown. No chart library — the surface
 * stays self-contained and offline.
 */

import { useMemo, useState } from 'react'
import css from './UsageBilling.module.css'
import { formatMoney } from './pricing.ts'

/** One model's legend identity: key, display name, and brand color. */
export interface TrendSeriesModel {
  /** Stats key (`byModel` key), also the `byModel` map key. */
  key: string
  /** Human-readable model name. */
  name: string
  /** Resolved brand color for the stack segment and legend swatch. */
  color: string
}

/** One day row fed to the chart. */
export interface TrendPoint {
  /** ISO date `YYYY-MM-DD`. */
  date: string
  /** Total cost that day. */
  cost: number
  /** API calls that day. */
  calls: number
  /** Per-model cost that day (stats key → CNY); absent entries stack zero. */
  byModel?: Readonly<Record<string, number>>
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

/** Ticks every `step` items for sparse axis labels. */
function tickIndexes(length: number, step: number): number[] {
  const out: number[] = []
  for (let i = 0; i < length; i += step) out.push(i)
  if (length > 0 && out[out.length - 1] !== length - 1) out.push(length - 1)
  return out
}

/** One day's stacked geometry: the column x and its per-model segments. */
interface Column {
  date: string
  x: number
  segments: readonly Segment[]
  total: number
}

/** One stacked segment within a day's column. */
interface Segment {
  model: TrendSeriesModel
  y0: number
  y1: number
  /** Top segment carries the column's rounded corners; others are squared. */
  rounded: boolean
}

/**
 * Render the daily per-model stacked cost chart.
 * @param props.data - sorted daily rows (ascending date).
 * @param props.models - the model legend, in stack order (bottom first).
 */
export function TrendChart({ data, models = [] }: { data: readonly TrendPoint[]; models?: readonly TrendSeriesModel[] }): React.ReactNode {
  const [hover, setHover] = useState<number | null>(null)

  const layout = useMemo(() => {
    const n = data.length
    if (n === 0) return null
    const maxCost = Math.max(...data.map(d => d.cost), 0.0001)
    const plotW = W - PAD.left - PAD.right
    const plotH = H - PAD.top - PAD.bottom
    const inner = (i: number): number => {
      if (n === 1) return PAD.left + plotW / 2
      return PAD.left + (plotW * i) / (n - 1)
    }
    const yCost = (value: number): number => PAD.top + plotH - (value / maxCost) * plotH
    const barW = Math.min(18, (plotW / n) * 0.5)
    // 堆叠段：每个日期按 models 顺序自下而上累计各模型当日费用。
    const columns: Column[] = data.map((d, i) => {
      let acc = 0
      const segments: Segment[] = models.map((model) => {
        const value = d.byModel?.[model.key] ?? 0
        const y0 = acc
        acc += value
        return { model, y0, y1: acc, rounded: false }
      })
      const top = segments.at(-1)
      if (top !== undefined) top.rounded = true
      return { date: d.date, x: inner(i), segments, total: acc }
    })
    const costTicks = [0, 0.25, 0.5, 0.75, 1].map(f => maxCost * f).reverse()
    return { n, plotW, plotH, inner, yCost, barW, columns, costTicks, maxCost }
  }, [data, models])

  if (layout === null) {
    return <div className={css.chartEmpty}>暂无趋势数据</div>
  }

  const { n, plotW, inner, yCost, barW, columns, costTicks } = layout
  const activeColumn = hover === null ? undefined : columns[hover]
  const activePoint = hover === null ? undefined : data[hover]
  const indices = tickIndexes(n, Math.max(1, Math.ceil(n / 8)))

  return (
    <div className={css.chartWrap}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={css.chartSvg}
        role="img"
        aria-label="Daily cost by model"
        onMouseLeave={() => { setHover(null) }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = ((e.clientX - rect.left) / rect.width) * W
          const ratio = (x - PAD.left) / plotW
          const index = Math.round(ratio * (n - 1))
          setHover(Math.min(Math.max(index, 0), n - 1))
        }}
      >
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

        {/* Stacked per-model cost columns. */}
        {columns.map(column => (
          <g key={column.date}>
            {column.segments.map(segment => (
              <rect
                key={segment.model.key}
                x={column.x - barW / 2}
                y={yCost(segment.y1)}
                width={barW}
                height={Math.max(segment.y1 - segment.y0 > 0 ? 1 : 0, yCost(segment.y0) - yCost(segment.y1))}
                rx={segment.rounded ? 3 : 0}
                className={css.chartStack}
                style={{ fill: segment.model.color }}
              />
            ))}
          </g>
        ))}

        {/* X-axis date labels. */}
        {indices.map((i) => {
          const point = data[i]
          if (point === undefined) return null
          return (
            <text key={point.date} x={inner(i)} y={H - 6} textAnchor="middle" className={css.chartAxisLabel}>
              {shortDate(point.date)}
            </text>
          )
        })}

        {/* Hover crosshair. */}
        {activeColumn !== undefined && hover !== null && (
          <line x1={inner(hover)} x2={inner(hover)} y1={PAD.top} y2={PAD.top + layout.plotH} className={css.chartCrosshair} />
        )}
      </svg>

      {/* Hover tooltip: the day's model breakdown. */}
      {activeColumn !== undefined && activePoint !== undefined && hover !== null && (
        <div
          className={css.chartTooltip}
          style={{ left: `${(inner(hover) / W) * 100}%`, top: `${(yCost(activeColumn.total) / H) * 100}%` }}
        >
          <div className={css.chartTooltipDate}>{activePoint.date}</div>
          {activeColumn.segments.filter(segment => segment.y1 - segment.y0 > 0).map(segment => (
            <div key={segment.model.key} className={css.chartTooltipRow}>
              <span className={css.chartTooltipSwatch} style={{ background: segment.model.color }} />
              {segment.model.name} <strong>{formatMoney(segment.y1 - segment.y0)}</strong>
            </div>
          ))}
          <div className={css.chartTooltipRow}>
            <span className={css.chartLegendBar} />
            总计 <strong>{formatMoney(activeColumn.total)}</strong>
          </div>
          <div className={css.chartTooltipRow}>
            <span className={css.chartLegendLine} />
            调用 <strong>{activePoint.calls.toLocaleString()}</strong>
          </div>
        </div>
      )}

      {/* Model legend. */}
      {models.length > 0 && (
        <div className={css.chartLegend}>
          {models.map(model => (
            <span key={model.key}>
              <span className={css.chartTooltipSwatch} style={{ background: model.color }} />
              {model.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
