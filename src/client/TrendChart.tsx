/**
 * TrendChart: dependency-free SVG chart of daily cost + calls.
 *
 * The columns are STACKED per day — one bar per day, with each model's cost
 * as a colored segment inside the bar, so the daily total reads at a glance
 * and the model mix stays visible. The blue line is the total call volume
 * across all models, plotted on its own right-hand axis.
 * A hover crosshair shows the day's model breakdown. No chart library — the
 * surface stays self-contained and offline.
 */

import { useMemo, useState } from 'react'
import css from './UsageBilling.module.css'
import { cnyToUsd, formatMoney, type CostCurrency } from './pricing.ts'

/** One model's legend identity: key, display name, and brand color. */
export interface TrendSeriesModel {
  /** Stats key (`byModel` key), also the `byModel` map key. */
  key: string
  /** Human-readable model name. */
  name: string
  /** Resolved brand color for the bar and legend swatch (empty = single-color fallback). */
  color: string
}

/** One day row fed to the chart. */
export interface TrendPoint {
  /** ISO date `YYYY-MM-DD`. */
  date: string
  /** Total cost that day. */
  cost: number
  /** API calls that day (total across models). */
  calls: number
  /** Per-model cost that day (stats key → CNY); absent entries plot zero. */
  byModel?: Readonly<Record<string, number>>
}

/** Fixed viewBox; the SVG scales to its container. */
const W = 680
const H = 220
const PAD = { top: 18, right: 40, bottom: 26, left: 46 }

/** Split a date into `M/D` for axis labels. */
function shortDate(iso: string): string {
  const [, month, day] = iso.split('-')
  return `${Number(month)}/${Number(day)}`
}

/** Compact tick label for the calls axis: `1.2K` / `3.4M`. */
function shortNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(Math.round(value))
}

/** Ticks every `step` items for sparse axis labels. */
function tickIndexes(length: number, step: number): number[] {
  const out: number[] = []
  for (let i = 0; i < length; i += step) out.push(i)
  if (length > 0 && out[out.length - 1] !== length - 1) out.push(length - 1)
  return out
}

/** Single-color fallback identity used when the stats carry no per-model detail. */
const TOTAL_MODEL: TrendSeriesModel = { key: '__total__', name: '总计', color: '' }

/** One stacked segment: one model's cost inside one day's bar. */
interface Bar {
  date: string
  model: TrendSeriesModel
  /** Bar left edge x. */
  x: number
  /** Cumulative cost of the segments below this one (stack base). */
  base: number
  /** Cost value this model contributed that day. */
  value: number
  /** Whether this segment is the day's top one (gets the rounded cap). */
  topRounded: boolean
}

/**
 * Render the daily stacked cost bars plus the total-calls line.
 * @param props.data - sorted daily rows (ascending date).
 * @param props.models - the model legend, in bar order.
 * @param props.currency - display currency for the cost labels.
 */
export function TrendChart({ data, models = [], currency = 'cny' }: { data: readonly TrendPoint[]; models?: readonly TrendSeriesModel[]; currency?: CostCurrency }): React.ReactNode {
  const [hover, setHover] = useState<number | null>(null)
  const money = (cny: number): string => formatMoney(currency === 'usd' ? cnyToUsd(cny) : cny, currency)

  const layout = useMemo(() => {
    const n = data.length
    if (n === 0) return null
    const plotW = W - PAD.left - PAD.right
    const plotH = H - PAD.top - PAD.bottom
    const inner = (i: number): number => {
      if (n === 1) return PAD.left + plotW / 2
      return PAD.left + (plotW * i) / (n - 1)
    }
    // 刻度按「单日总费用」：堆叠柱顶端即当日总费用，直方更饱满。
    const maxCost = Math.max(
      ...data.map(d => Math.max(d.cost, Object.values(d.byModel ?? {}).reduce((sum, v) => sum + v, 0))),
      0.0001,
    )
    const yCost = (value: number): number => PAD.top + plotH - (value / maxCost) * plotH
    // 调用量比例尺：独立右轴，柱（费用）与线（调用）各用各的刻度。
    const maxCalls = Math.max(...data.map(d => d.calls), 1)
    const yCalls = (value: number): number => PAD.top + plotH - (value / maxCalls) * plotH

    const groupW = plotW / n
    const barW = Math.min(18, groupW * 0.6)

    // 堆叠柱：每天一根柱，各模型费用自下而上拼成色段；顶部段圆角收尾。
    const bars: Bar[] = data.flatMap((d, i) => {
      const x = inner(i) - barW / 2
      if (models.length === 0) {
        // 无模型明细：单色总费用柱兜底。
        return [{ date: d.date, model: TOTAL_MODEL, x, base: 0, value: d.cost, topRounded: true }]
      }
      // 顶部圆角给当天最后一个有量的模型段。
      let topKey: string | null = null
      for (const model of models) {
        if ((d.byModel?.[model.key] ?? 0) > 0) topKey = model.key
      }
      let acc = 0
      return models.map((model) => {
        const value = d.byModel?.[model.key] ?? 0
        const bar: Bar = { date: d.date, model, x, base: acc, value, topRounded: model.key === topKey }
        acc += value
        return bar
      })
    })

    const costTicks = [0, 0.25, 0.5, 0.75, 1].map(f => maxCost * f).reverse()
    const callsTicks = [0, 0.25, 0.5, 0.75, 1].map(f => maxCalls * f).reverse()
    // 调用量折线路径：柱 = 每日分模型费用，线 = 每日总调用次数。
    const linePath = data.map((d, i) => {
      const y = yCalls(d.calls)
      return `${i === 0 ? 'M' : 'L'}${inner(i)} ${y}`
    }).join(' ')
    return { n, plotW, plotH, inner, yCost, yCalls, barW, bars, costTicks, callsTicks, linePath }
  }, [data, models])

  if (layout === null) {
    return <div className={css.chartEmpty}>暂无趋势数据</div>
  }

  const { n, plotW, plotH, inner, yCost, yCalls, barW, bars, costTicks, callsTicks, linePath } = layout
  const activePoint = hover === null ? undefined : data[hover]
  const indices = tickIndexes(n, Math.max(1, Math.ceil(n / 8)))

  return (
    <div className={css.chartWrap}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={css.chartSvg}
        role="img"
        aria-label="Daily cost by model and total calls"
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
                {money(value)}
              </text>
            </g>
          )
        })}

        {/* Stacked per-day cost bars: one bar per day, per-model segments. */}
        {bars.map(bar => (bar.value > 0 ? (
          <rect
            key={`${bar.date}-${bar.model.key}`}
            x={bar.x}
            y={yCost(bar.base + bar.value)}
            width={barW}
            height={yCost(bar.base) - yCost(bar.base + bar.value)}
            rx={bar.topRounded ? 2 : 0}
            className={bar.model.color === '' ? css.chartBar : css.chartStack}
            style={bar.model.color === '' ? undefined : { fill: bar.model.color }}
          />
        ) : null))}

        {/* Calls line (right axis): the daily call volume trend. */}
        <path d={linePath} fill="none" className={css.chartLine} />
        {/* Right-axis call labels. */}
        {callsTicks.map((value, idx) => {
          const y = yCalls(value)
          return (
            <text key={`calls-${idx}`} x={W - PAD.right + 8} y={y + 3} textAnchor="start" className={css.chartAxisLabel}>
              {shortNumber(value)}
            </text>
          )
        })}

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
        {hover !== null && (
          <line x1={inner(hover)} x2={inner(hover)} y1={PAD.top} y2={PAD.top + plotH} className={css.chartCrosshair} />
        )}
      </svg>

      {/* Hover tooltip: the day's model breakdown. */}
      {activePoint !== undefined && hover !== null && (
        <div
          className={css.chartTooltip}
          style={{ left: `${(inner(hover) / W) * 100}%`, top: `${(yCost(activePoint.cost) / H) * 100}%` }}
        >
          <div className={css.chartTooltipDate}>{activePoint.date}</div>
          {models.filter(model => (activePoint.byModel?.[model.key] ?? 0) > 0).map(model => (
            <div key={model.key} className={css.chartTooltipRow}>
              <span className={css.chartTooltipSwatch} style={{ background: model.color }} />
              {model.name} <strong>{money(activePoint.byModel?.[model.key] ?? 0)}</strong>
            </div>
          ))}
          <div className={css.chartTooltipRow}>
            <span className={css.chartLegendBar} />
            总计 <strong>{money(activePoint.cost)}</strong>
          </div>
          <div className={css.chartTooltipRow}>
            <span className={css.chartLegendLine} />
            调用 <strong>{activePoint.calls.toLocaleString()}</strong>
          </div>
        </div>
      )}

      {/* Model legend: colored squares are per-model cost, the line is calls. */}
      {models.length > 0 && (
        <div className={css.chartLegend}>
          {models.map(model => (
            <span key={model.key}>
              <span className={css.chartTooltipSwatch} style={{ background: model.color }} />
              {model.name}
            </span>
          ))}
          <span>
            <span className={css.chartLegendLine} />
            调用
          </span>
        </div>
      )}
    </div>
  )
}
