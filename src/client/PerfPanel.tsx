/**
 * PerfPanel: per-model latency/perf table + per-hour per-model comparison curve.
 *
 * Reads the optional `perf` field of the usage-stats document (aggregated by
 * the host from session logs). Renders a per-model table of TTFT mean/P50/P90,
 * generation speed, total latency and estimated-step count, plus a small
 * dependency-free SVG hourly curve: one colored polyline per lit model with a
 * metric tab (TTFT ms / tok/s) and clickable model chips; hovering snaps to the
 * nearest hour and shows a crosshair + tooltip listing every lit model's value.
 * Absent `perf` renders an empty state; the panel never fabricates samples.
 */

import { useMemo, useState } from 'react'
import clsx from 'clsx'
import css from './UsageBilling.module.css'
import type { TrendSeriesModel } from './TrendChart.tsx'
import type { UsageBillingKey } from './locales.ts'
import { loadPerfViewPrefs, savePerfViewPrefs, type PerfMetric, type PerfViewPrefs } from './usage-billing-settings.ts'

/** 每模型性能统计（与服务端 `ModelPerf` 同形）。 */
export interface PerfModelData {
  samples: number
  ttftAvg: number
  ttftP50: number
  ttftP90: number
  /** 首字延时最大值（毫秒）；1.0.8 起新增，旧快照缺失。 */
  ttftMax?: number
  /** 首字延时尖峰样本数（> 10s）；1.0.8 起新增，旧快照缺失。 */
  ttftSpikes?: number
  tpsAvg?: number
  latencyAvg: number
  estimatedSamples: number
}

/** 小时×模型性能统计（与服务端 `HourModelPerf` 同形）。 */
export interface PerfHourModelData {
  samples: number
  ttftAvg: number
  tpsAvg?: number
}

/** 性能指标文档（服务端可选 `perf` 字段；旧快照缺失）。 */
export interface ClientPerf {
  byModel: Record<string, PerfModelData>
  /** 小时 → 模型 → 小时统计；旧 host 文档缺失时图表区按空态兜底。 */
  byHourModel: Record<string, Record<string, PerfHourModelData>>
}

/** 一个模型的渲染行：模型 + 颜色 + 性能列。 */
interface PerfModelRow {
  key: string
  name: string
  color: string
  samples: number
  ttftAvg: number
  ttftP50: number
  ttftP90: number
  ttftMax?: number
  ttftSpikes?: number
  tpsAvg?: number
  latencyAvg: number
  estimatedSamples: number
}

/** Fixed viewBox for the hourly curve; the SVG scales to its container. */
const W = 680
const H = 180
const PAD = { top: 14, right: 42, bottom: 22, left: 46 }

/** 小时曲线最多展示的小时数（避免窗口内小时过多挤成一团）。 */
const MAX_HOURS = 48

/** 图例默认点亮的模型数（按样本数取前 N；长尾模型点击 chip 随时加入）。 */
const DEFAULT_LIT_MODELS = 5

/** 一条模型曲线上的有值小时点。 */
interface SeriesPoint {
  /** 小时索引（在窗口小时键数组中的下标）。 */
  i: number
  x: number
  y: number
  /** 当前指标的数值（ttftAvg 或 tpsAvg）。 */
  v: number
}

/** 一条模型曲线：折线段（无样本小时断开）+ 有值点。 */
interface PerfSeries {
  key: string
  name: string
  color: string
  /** 连续样本段的 SVG path（模型在该小时无样本时断开，不 fabricated 连线）。 */
  segments: string[]
  points: SeriesPoint[]
}

/** 小时曲线布局：比例尺 + 各模型曲线。 */
interface HourLayout {
  hourKeys: string[]
  n: number
  plotW: number
  plotH: number
  inner: (i: number) => number
  yOf: (v: number) => number
  series: PerfSeries[]
  /** 纵轴刻度值（降序）。 */
  ticks: number[]
  /** 横轴稀疏标注的小时下标。 */
  xTicks: number[]
  /** 点亮模型在窗口内的有值点总数（0 → 图表区显示空态提示）。 */
  totalPoints: number
}

/** 短小时标签 `MM-DD HH`（跨天在小时键上有日期，直接截取即可辨识）。 */
function shortHour(key: string): string {
  return key.slice(5, 13).replace('T', ' ')
}

/** 轴刻度数值格式：大值取整、小值保留 1 位小数。 */
function fmtTick(value: number): string {
  return value >= 100 ? String(Math.round(value)) : String(Number(value.toFixed(1)))
}

/** tooltip 数值格式：首字延时取整毫秒；生成速度保留 1 位小数并带单位。 */
function fmtValue(value: number, metric: PerfMetric, t: (key: UsageBillingKey) => string): string {
  return metric === 'ttft' ? `${Math.round(value)} ms` : `${value.toFixed(1)} ${t('perfTpsUnit')}`
}

/**
 * Render the performance panel.
 * @param props.perf - the optional perf doc; `undefined`/empty renders an empty state.
 * @param props.models - model legend (key/name/color) for the table swatches and curve chips.
 * @param props.t - locale function.
 */
export function PerfPanel({
  perf,
  models,
  t,
}: {
  perf: ClientPerf | undefined
  models: readonly TrendSeriesModel[]
  t: (key: UsageBillingKey) => string
}): React.ReactNode {
  // 视图偏好（指标 tab + 点亮模型）：localStorage 持久化（修改即写回，仅 client 侧）。
  const [prefs, setPrefs] = useState<PerfViewPrefs>(() => loadPerfViewPrefs())
  const [hover, setHover] = useState<number | null>(null)
  const updatePrefs = (next: PerfViewPrefs): void => {
    setPrefs(next)
    savePerfViewPrefs(next)
  }

  const colorOf = (model: string): string => models.find(m => m.key === model)?.color ?? '#8b95a3'

  // 模型行：按样本数降序（活跃模型靠前），色点取自模型图例。
  const rows: PerfModelRow[] = useMemo(() => {
    if (perf === undefined) return []
    return Object.entries(perf.byModel)
      .map(([key, data]) => ({
        key,
        // 目录键 → 显示名：未知键原样保留，避免误当已知模型。
        name: models.find(m => m.key === key)?.name ?? key,
        color: colorOf(key),
        samples: data.samples,
        ttftAvg: data.ttftAvg,
        ttftP50: data.ttftP50,
        ttftP90: data.ttftP90,
        ...(data.ttftMax !== undefined ? { ttftMax: data.ttftMax } : {}),
        ...(data.ttftSpikes !== undefined ? { ttftSpikes: data.ttftSpikes } : {}),
        ...(data.tpsAvg === undefined ? {} : { tpsAvg: data.tpsAvg }),
        latencyAvg: data.latencyAvg,
        estimatedSamples: data.estimatedSamples,
      }))
      .sort((a, b) => b.samples - a.samples || b.ttftP90 - a.ttftP90)
  }, [perf, models])

  // 点亮的模型：偏好里存过 → 按存档（过滤已下线模型，可为空集）；从未碰过图例 → 默认前 5。
  const litKeys: string[] = useMemo(() => {
    if (perf === undefined) return []
    if (prefs.models !== undefined) {
      const known = new Set(Object.keys(perf.byModel))
      return prefs.models.filter(key => known.has(key))
    }
    return rows.slice(0, DEFAULT_LIT_MODELS).map(row => row.key)
  }, [perf, rows, prefs.models])

  // 小时曲线布局：窗口小时键（升序、截尾 48）+ 点亮模型各自的有值点与折线段。
  const hourLayout: HourLayout | null = useMemo(() => {
    if (perf === undefined) return null
    const hourKeys = Object.keys(perf.byHourModel).sort().slice(-MAX_HOURS)
    if (hourKeys.length === 0) return null
    const n = hourKeys.length
    const plotW = W - PAD.left - PAD.right
    const plotH = H - PAD.top - PAD.bottom
    const inner = (i: number): number => (n === 1 ? PAD.left + plotW / 2 : PAD.left + (plotW * i) / (n - 1))
    const lit = new Set(litKeys)
    // 当前指标取值：生成速度缺失（该小时该模型无可测窗口）→ 断开不画。
    const valueOf = (cell: PerfHourModelData | undefined): number | undefined =>
      prefs.metric === 'ttft' ? cell?.ttftAvg : cell?.tpsAvg
    const series: PerfSeries[] = []
    let maxV = 0
    for (const row of rows) {
      if (!lit.has(row.key)) continue
      const points: SeriesPoint[] = []
      for (let i = 0; i < n; i++) {
        const hourKey = hourKeys[i]
        if (hourKey === undefined) continue
        const v = valueOf(perf.byHourModel[hourKey]?.[row.key])
        if (v === undefined || !Number.isFinite(v)) continue
        points.push({ i, x: inner(i), y: 0, v })
        if (v > maxV) maxV = v
      }
      series.push({ key: row.key, name: row.name, color: row.color, segments: [], points })
    }
    // 纵轴比例尺：0 → 点亮模型在窗口内的最大值（下限 1 防除零）；全空时也产出布局，
    // 由渲染层按 totalPoints === 0 显示空态提示（tab + chips 工具条保持可见）。
    const totalPoints = series.reduce((sum, s) => sum + s.points.length, 0)
    maxV = Math.max(maxV, 1)
    const yOf = (v: number): number => PAD.top + plotH - (v / maxV) * plotH
    for (const s of series) {
      let path = ''
      let prev = -2
      for (const p of s.points) {
        p.y = yOf(p.v)
        // 小时不连续 → 断开成新段（缺失样本不 fabricated 连线）。
        if (path !== '' && p.i !== prev + 1) {
          s.segments.push(path)
          path = ''
        }
        path += `${path === '' ? 'M' : 'L'}${p.x} ${p.y} `
        prev = p.i
      }
      if (path !== '') s.segments.push(path)
    }
    const step = Math.max(1, Math.ceil(n / 8))
    const xTicks: number[] = []
    for (let i = 0; i < n; i += step) xTicks.push(i)
    if (xTicks[xTicks.length - 1] !== n - 1) xTicks.push(n - 1)
    return {
      hourKeys, n, plotW, plotH, inner, yOf, series,
      ticks: [0, 0.5, 1].map(f => maxV * f).reverse(),
      xTicks, totalPoints,
    }
  }, [perf, rows, litKeys, prefs.metric])

  if (perf === undefined || rows.length === 0) {
    return <div className={css.chartEmpty} data-testid="billing-perf-empty">{t('perfEmpty')}</div>
  }

  const toggleModel = (key: string): void => {
    const lit = litKeys.includes(key)
    const next = lit ? litKeys.filter(k => k !== key) : [...litKeys, key]
    updatePrefs({ metric: prefs.metric, models: next })
  }
  const setMetric = (metric: PerfMetric): void => {
    updatePrefs({ metric, ...(prefs.models !== undefined ? { models: prefs.models } : {}) })
  }

  // hover 行：该小时有值（当前指标）的点亮模型。
  const tooltipRows = (hover === null || hourLayout === null)
    ? []
    : hourLayout.series.flatMap(s => {
      const p = s.points.find(pt => pt.i === hover)
      return p === undefined ? [] : [{ key: s.key, name: s.name, color: s.color, v: p.v }]
    })

  return (
    <div data-testid="billing-perf-panel">
      {/* 按模型性能表：样本数、TTFT 均值/P50/P90、生成速度、总延迟、估算样本。 */}
      <div className={css.tableScroll} data-testid="billing-perf-table">
        <table className={css.modelTable}>
          <thead>
            <tr>
              <th>{t('model')}</th>
              <th className={css.numCol}>{t('perfSamples')}</th>
              <th className={css.numCol}>{t('perfTtft')}</th>
              <th className={css.numCol}>{t('perfP50')}</th>
              <th className={css.numCol}>{t('perfP90')}</th>
              <th className={css.numCol}>{t('perfMax')}</th>
              <th className={css.numCol}>{t('perfTps')}</th>
              <th className={css.numCol}>{t('perfLatency')}</th>
              <th className={css.numCol}>{t('perfEstimated')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.key}>
                <td>
                  <span className={css.modelCell}>
                    <span className={css.modelDot} style={{ background: row.color }} />
                    <span className={css.modelName}>{row.name}</span>
                  </span>
                </td>
                <td className={css.numCol}>{row.samples.toLocaleString()}</td>
                <td className={css.numCol}>{row.ttftAvg.toFixed(0)} ms</td>
                <td className={css.numCol}>{row.ttftP50.toFixed(0)} ms</td>
                <td className={css.numCol}>{row.ttftP90.toFixed(0)} ms</td>
                <td className={css.numCol}>
                  {/* 最大 TTFT；有尖峰时在数值后附计数提示服务端抖动。 */}
                  {row.ttftMax === undefined
                    ? <span className={css.na}>—</span>
                    : <span>{row.ttftMax.toFixed(0)} ms{row.ttftSpikes !== undefined && row.ttftSpikes > 0 ? ` (${row.ttftSpikes}↑)` : ''}</span>}
                </td>
                <td className={css.numCol}>{row.tpsAvg === undefined ? <span className={css.na}>—</span> : `${row.tpsAvg.toFixed(1)}`}</td>
                <td className={css.numCol}>{row.latencyAvg.toFixed(0)} ms</td>
                <td className={css.numCol}>{row.estimatedSamples > 0 ? row.estimatedSamples : <span className={css.na}>—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 按小时×模型对比曲线：指标 tab + 模型 chips + hover 十字线/tooltip。 */}
      {hourLayout !== null && (
        <div data-testid="billing-perf-hour">
          <div className={css.perfBar}>
            <span className={css.rangeToggle} role="group" aria-label={t('perfTitle')}>
              {(['ttft', 'tps'] as const).map(metric => (
                <button
                  key={metric}
                  type="button"
                  className={clsx(css.rangeButton, prefs.metric === metric && css.rangeButtonActive)}
                  aria-pressed={prefs.metric === metric}
                  data-testid={`billing-perf-tab-${metric}`}
                  onClick={() => { setMetric(metric) }}
                >
                  {metric === 'ttft'
                    ? `${t('perfTtft')} (ms)`
                    : `${t('perfTps')} (${t('perfTpsUnit')})`}
                </button>
              ))}
            </span>
          </div>
          {/* 模型 chips：点击开/关该模型曲线；全选一键点亮全部。 */}
          <div className={css.perfChips} role="group" aria-label={t('model')}>
            <button
              type="button"
              className={css.perfChip}
              data-testid="billing-perf-chip-all"
              onClick={() => { updatePrefs({ metric: prefs.metric, models: rows.map(row => row.key) }) }}
            >
              {t('perfAll')}
            </button>
            {rows.map(row => {
              const lit = litKeys.includes(row.key)
              return (
                <button
                  key={row.key}
                  type="button"
                  className={clsx(css.perfChip, !lit && css.perfChipOff)}
                  style={lit ? { color: row.color, borderColor: `color-mix(in srgb, ${row.color} 45%, transparent)` } : undefined}
                  aria-pressed={lit}
                  data-testid={`billing-perf-chip-${row.key}`}
                  onClick={() => { toggleModel(row.key) }}
                >
                  <span
                    className={css.perfChipDot}
                    style={{ background: lit ? row.color : 'var(--dsw-alias-label-dimmed)' }}
                  />
                  {row.name}
                </button>
              )
            })}
          </div>
          {/* 有值点才画曲线区；全空（未选模型 / 该指标无数据）时空态提示，
              但 tab + chips 工具条保持可见，随时重新点亮。 */}
          {hourLayout.totalPoints > 0 ? (
            <div className={css.chartWrap}>
              <svg
                viewBox={`0 0 ${W} ${H}`}
                className={css.chartSvg}
                role="img"
                aria-label="Hourly perf comparison by model"
                onMouseLeave={() => { setHover(null) }}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const x = ((e.clientX - rect.left) / rect.width) * W
                  const ratio = (x - PAD.left) / hourLayout.plotW
                  const index = Math.round(ratio * (hourLayout.n - 1))
                  setHover(Math.min(Math.max(index, 0), hourLayout.n - 1))
                }}
              >
              {/* 纵向网格 + 左轴刻度（当前指标，单轴）。 */}
              {hourLayout.ticks.map((value, idx) => {
                const y = hourLayout.yOf(value)
                return (
                  <g key={`tick-${idx}`}>
                    <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} className={css.chartGrid} />
                    <text x={PAD.left - 8} y={y + 3} textAnchor="end" className={css.chartAxisLabel}>
                      {fmtTick(value)}
                    </text>
                  </g>
                )
              })}
              {/* 各模型曲线：颜色 = 模型图例色；无样本小时断开。 */}
              {hourLayout.series.map(s => s.segments.map((d, idx) => (
                <path
                  key={`${s.key}-${idx}`}
                  d={d}
                  fill="none"
                  className={css.chartLine}
                  style={{ stroke: s.color }}
                />
              )))}
              {/* 横轴小时标注。 */}
              {hourLayout.xTicks.map((i) => {
                const key = hourLayout.hourKeys[i]
                if (key === undefined) return null
                return (
                  <text key={key} x={hourLayout.inner(i)} y={H - 6} textAnchor="middle" className={css.chartAxisLabel}>
                    {shortHour(key)}
                  </text>
                )
              })}
              {/* Hover 十字线 + 吸附小时处各模型的高亮圆点。 */}
              {hover !== null && (
                <line
                  x1={hourLayout.inner(hover)}
                  x2={hourLayout.inner(hover)}
                  y1={PAD.top}
                  y2={PAD.top + hourLayout.plotH}
                  className={css.chartCrosshair}
                />
              )}
              {hover !== null && hourLayout.series.map(s => {
                const p = s.points.find(pt => pt.i === hover)
                if (p === undefined) return null
                return <circle key={`${s.key}-dot`} cx={p.x} cy={p.y} r={3.5} fill={s.color} className={css.chartHoverDot} />
              })}
            </svg>
            {/* Hover tooltip：小时标签 + 每个有值点亮模型一行。 */}
            {hover !== null && tooltipRows.length > 0 && (
              <div
                className={css.chartTooltip}
                data-testid="billing-perf-tooltip"
                style={{
                  left: `${(hourLayout.inner(hover) / W) * 100}%`,
                  top: `${((PAD.top + hourLayout.plotH / 2) / H) * 100}%`,
                }}
              >
                <div className={css.chartTooltipDate}>{shortHour(hourLayout.hourKeys[hover] ?? '')}</div>
                {tooltipRows.map(row => (
                  <div key={row.key} className={css.chartTooltipRow}>
                    <span className={css.chartTooltipSwatch} style={{ background: row.color }} />
                    {row.name} <strong>{fmtValue(row.v, prefs.metric, t)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
          ) : (
            <div className={css.chartEmpty} data-testid="billing-perf-chart-empty">{t('perfChartEmpty')}</div>
          )}
        </div>
      )}
      {/* 旧 host 文档缺 byHourModel（无任何小时数据）→ 空态提示（表格仍可用）。 */}
      {hourLayout === null && (
        <div className={css.chartEmpty} data-testid="billing-perf-chart-empty">{t('perfChartEmpty')}</div>
      )}
    </div>
  )
}
