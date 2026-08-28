/**
 * PerfPanel: per-model latency/perf table + per-hour TTFT/generation-speed curve.
 *
 * Reads the optional `perf` field of the usage-stats document (aggregated by
 * the host from session logs). Renders a per-model table of TTFT mean/P50/P90,
 * generation speed, total latency and estimated-step count, plus a small
 * dependency-free SVG twin-series hourly curve (TTFT in ms on the left axis,
 * tokens/s on the right). Absent `perf` (older snapshot or stream-less logs)
 * renders an empty state; the panel never fabricates samples.
 */

import { useMemo } from 'react'
import css from './UsageBilling.module.css'
import type { TrendSeriesModel } from './TrendChart.tsx'
import type { UsageBillingKey } from './locales.ts'

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

/** 每小时性能统计（与服务端 `HourPerf` 同形）。 */
export interface PerfHourData {
  samples: number
  ttftAvg: number
  tpsAvg?: number
}

/** 性能指标文档（服务端可选 `perf` 字段；旧快照缺失）。 */
export interface ClientPerf {
  byModel: Record<string, PerfModelData>
  byHour: Record<string, PerfHourData>
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

/** 数字趋势曲线端点：`{ ttftMs, tps? }` 按小时键升序。 */
interface HourPoint {
  key: string
  ttftMs: number
  tps?: number
}

/** 最近窗口内的小时点（键升序，尾部补齐空白，最旧在前）。 */
function sortHourPoints(byHour: Record<string, PerfHourData>): HourPoint[] {
  const keys = Object.keys(byHour).sort()
  const points: HourPoint[] = []
  for (const key of keys.slice(-MAX_HOURS)) {
    const data = byHour[key]
    if (data === undefined) continue
    points.push({ key, ttftMs: data.ttftAvg, ...(data.tpsAvg === undefined ? {} : { tps: data.tpsAvg }) })
  }
  return points
}

/** 短小时标签 `MM-DD HH`（跨天在小时键上有日期，直接截取即可辨识）。 */
function shortHour(key: string): string {
  return key.slice(5, 13).replace('T', ' ')
}

/**
 * Render the performance panel.
 * @param props.perf - the optional perf doc; `undefined`/empty renders an empty state.
 * @param props.models - model legend (key/name/color) for the table swatches and curve legend.
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

  // 小时序列：TTFT 折线（左轴 ms）+ 速度折线（右轴 tok/s）。
  const hourLayout = useMemo(() => {
    const points = perf === undefined ? [] : sortHourPoints(perf.byHour)
    if (points.length === 0) return null
    const n = points.length
    const plotW = W - PAD.left - PAD.right
    const plotH = H - PAD.top - PAD.bottom
    const inner = (i: number): number => (n === 1 ? PAD.left + plotW / 2 : PAD.left + (plotW * i) / (n - 1))
    const maxTtft = Math.max(...points.map(p => p.ttftMs), 1)
    const maxTps = Math.max(...points.map(p => p.tps ?? 0), 1)
    const yTtft = (v: number): number => PAD.top + plotH - (v / maxTtft) * plotH
    const yTps = (v: number): number => PAD.top + plotH - (v / maxTps) * plotH
    const ttftPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${inner(i)} ${yTtft(p.ttftMs)}`).join(' ')
    const tpsPath = points.some(p => p.tps !== undefined)
      ? points.map((p, i) => `${i === 0 ? 'M' : 'L'}${inner(i)} ${yTps(p.tps ?? 0)}`).join(' ')
      : ''
    const step = Math.max(1, Math.ceil(n / 8))
    const indices: number[] = []
    for (let i = 0; i < n; i += step) indices.push(i)
    if (n > 0 && indices[indices.length - 1] !== n - 1) indices.push(n - 1)
    const ttftTicks = [0, 0.5, 1].map(f => maxTtft * f).reverse()
    return { points, n, inner, yTtft, ttftPath, tpsPath, indices, ttftTicks, maxTps }
  }, [perf])

  if (perf === undefined || rows.length === 0) {
    return <div className={css.chartEmpty} data-testid="billing-perf-empty">{t('billing.perfEmpty')}</div>
  }

  return (
    <div data-testid="billing-perf-panel">
      {/* 按模型性能表：样本数、TTFT 均值/P50/P90、生成速度、总延迟、估算样本。 */}
      <div className={css.tableScroll} data-testid="billing-perf-table">
        <table className={css.modelTable}>
          <thead>
            <tr>
              <th>{t('billing.model')}</th>
              <th className={css.numCol}>{t('billing.perfSamples')}</th>
              <th className={css.numCol}>{t('billing.perfTtft')}</th>
              <th className={css.numCol}>{t('billing.perfP50')}</th>
              <th className={css.numCol}>{t('billing.perfP90')}</th>
              <th className={css.numCol}>{t('billing.perfMax')}</th>
              <th className={css.numCol}>{t('billing.perfTps')}</th>
              <th className={css.numCol}>{t('billing.perfLatency')}</th>
              <th className={css.numCol}>{t('billing.perfEstimated')}</th>
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

      {/* 按小时 TTFT / 速度曲线：最近窗口双折线（左轴毫秒，右轴 tok/s）。 */}
      {hourLayout !== null && (
        <div className={css.chartWrap} data-testid="billing-perf-hour">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className={css.chartSvg}
            role="img"
            aria-label="Hourly TTFT and generation speed by model"
          >
            {hourLayout.ttftTicks.map((value, idx) => {
              const y = hourLayout.yTtft(value)
              return (
                <g key={`ttft-${idx}`}>
                  <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} className={css.chartGrid} />
                  <text x={PAD.left - 8} y={y + 3} textAnchor="end" className={css.chartAxisLabel}>
                    {value.toFixed(0)}
                  </text>
                </g>
              )
            })}
            <path d={hourLayout.ttftPath} fill="none" className={css.chartLine} />
            {hourLayout.tpsPath !== '' && <path d={hourLayout.tpsPath} fill="none" className={css.chartLine} style={{ stroke: 'var(--dsw-static-amber-500)', strokeDasharray: '4 4' }} />}
            {hourLayout.indices.map((i) => {
              const point = hourLayout.points[i]
              if (point === undefined) return null
              return (
                <text key={point.key} x={hourLayout.inner(i)} y={H - 6} textAnchor="middle" className={css.chartAxisLabel}>
                  {shortHour(point.key)}
                </text>
              )
            })}
            <text x={W - PAD.right + 8} y={PAD.top + 4} textAnchor="start" className={css.chartAxisLabel}>
              {t('billing.perfTpsUnit')} {hourLayout.maxTps.toFixed(0)}
            </text>
          </svg>
          <div className={css.chartLegend}>
            <span>
              <span className={css.chartLegendLine} />
              {t('billing.perfTtft')} (ms)
            </span>
            <span>
              <span className={css.chartLegendLine} style={{ background: 'var(--dsw-static-amber-500)' }} />
              {t('billing.perfTps')} ({t('billing.perfTpsUnit')})
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
