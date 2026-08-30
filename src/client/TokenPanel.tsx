/**
 * TokenPanel: 「Token」分区——把 token 从费用里独立出来洞察。
 * 四个板块 + 导出，全部由 `UsageStats` 派生，服务端零改动：
 *  1. 每日 Token 趋势，双视角切换（7/30 天）：
 *     - 按结构：未命中输入 / 缓存命中 / 输出[含 reasoning] 三桶堆叠；
 *     - 按模型：每天按模型堆叠，段 = 该模型当日「模型总 Token」（输入[含命中] + 输出），
 *       分色复用趋势页 `chartModels`（同模型同色跨页一致）；
 *       旧快照缺 `byDayModels` 时隐藏切换钮，仅保留结构视角。
 *     悬停显示当日精确明细；图例 / 「模型 Token」表格行可点击聚焦单个模型
 *     （目标段保持原色，其余段弱化，y 轴不变）。
 *     归因边界：reasoning 无按日 × 模型明细（`byDayModels` 无该字段），图与导出不含此列。
 *  2. 模型 Token 总量排行 + 占比（行点击 = 聚焦该模型并切到按模型视角）；
 *  3. Token 结构 KPI（缓存命中率 / reasoning 占比 / 输入:输出比 / 峰值日）+ 显式缓存写入；
 *  4. 工具调用排行（byTool 计次；token 无法按工具归因）。
 */

import { useMemo, useState } from 'react'
import clsx from 'clsx'
import css from './UsageBilling.module.css'
import type { UsageBillingKey } from './locales.ts'
import { formatTokens, modelOf } from './pricing.ts'
import type { TrendSeriesModel } from './TrendChart.tsx'
import type { UsageStats } from './UsageBilling.tsx'

/** 本地时区 `YYYY-MM-DD`（与服务端 dayStamp 一致）。 */
function localStamp(time = Date.now()): string {
  const d = new Date(time)
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 短数字刻度：`1.2M` / `3.4K`。 */
function shortNumber(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return String(Math.round(v))
}

/** 每日 token 堆叠图元（按结构视角）。 */
interface DailyBucket {
  date: string
  miss: number
  hit: number
  output: number
  reasoning: number
}

/** 按模型视角下某模型某日的 token 明细（`byDayModels` 无 reasoning 列）。 */
interface ModelDayCell {
  hit: number
  miss: number
  output: number
  /** 命中 + 未命中 + 输出（= 模型总 Token 口径）。 */
  total: number
}

/** 按模型视角的一天：各模型段 + 当日合计。 */
interface DayModelsRow {
  date: string
  models: Record<string, ModelDayCell>
  total: number
}

/** 模型 token 行。 */
interface ModelTokenRow {
  key: string
  name: string
  input: number
  output: number
  reasoning: number
  calls: number
  cacheHit: number
  cacheMiss: number
  cacheHitRate: number
  total: number
  /** 占总 token 比例（0..1）。 */
  share: number
}

const W = 680
const H = 200
const PAD = { top: 14, right: 18, bottom: 22, left: 46 }

const MISS_COLOR = 'var(--dsw-static-blue-500)'
// 缓存命中段：用青色系与输入（蓝）区分；`--dsw-static-cyan-500` 在宿主主题里不存在，
// 改用自定义青绿色（#14b8a6）保证可读性。
const HIT_COLOR = '#14b8a6'
const OUTPUT_COLOR = 'var(--dsw-static-amber-500)'

/** 聚焦时其余模型段的透明度：目标段保持原色，y 轴与柱总高不变。 */
const DIM_OPACITY = 0.15
/** 图例（`models` prop）未覆盖某模型时的兜底色（与 PerfPanel 的 colorOf 一致）。 */
const FALLBACK_MODEL_COLOR = '#8b95a3'

/** 每日 token 视角：结构三桶 或 按模型堆叠。 */
type TokenView = 'structure' | 'model'

/** 导出全量 JSON 文档：按日结构 + 模型排行 + 按日×模型明细 + 总量（无 reasoning 列）。 */
export function tokenDailyJson(
  days: readonly DailyBucket[],
  models: readonly ModelTokenRow[],
  dayModels: readonly DayModelsRow[],
  total: UsageStats['total'],
): string {
  return JSON.stringify({ days, models, dayModels, total }, null, 2)
}

/**
 * Token 洞察面板。
 * @param props.stats - usage-stats 文档（byDay/byModel/byDayModels/total）。
 * @param props.trendDays - 每日 token 窗口（7/30 天）。
 * @param props.onTrendDays - 切换趋势窗口。
 * @param props.models - 趋势页同款模型图例（key/name/色）：按模型视角的分色来源；缺省用兜底灰。
 */
export function TokenPanel(props: {
  stats: UsageStats
  trendDays: 7 | 30
  onTrendDays: (d: 7 | 30) => void
  models?: readonly TrendSeriesModel[]
  t: (key: UsageBillingKey) => string
}): React.ReactNode {
  const { stats, trendDays, onTrendDays, t } = props
  const brandModels = props.models ?? []
  const { byDay, byModel, total } = stats

  // 悬停的日期索引（null = 未悬停）：与 TrendChart 一致的十字线 + 明细 tooltip。
  const [hover, setHover] = useState<number | null>(null)
  // 每日 token 视角（默认按结构 = 历史行为）。
  const [view, setView] = useState<TokenView>('structure')
  // 聚焦的模型 key（null = 无）。仅按模型视角生效；切换视角即清除。
  const [focus, setFocus] = useState<string | null>(null)
  // 旧快照无按日 × 模型明细：隐藏视角切换，仅保留结构视角（既有降级先例）。
  const modelViewAvailable = stats.byDayModels !== undefined

  // 切换视角：按模型 → 按结构（或反向）都清除聚焦（结构视角没有模型维度）。
  const switchView = (next: TokenView): void => {
    setView(next)
    setFocus(null)
  }

  // 每日 token 窗口（缺日补 0）。
  const days: DailyBucket[] = useMemo(() => {
    const out: DailyBucket[] = []
    for (let offset = trendDays - 1; offset >= 0; offset -= 1) {
      const d = new Date()
      d.setDate(d.getDate() - offset)
      const date = localStamp(d.getTime())
      const day = byDay[date]
      out.push({
        date,
        miss: day?.cacheMiss ?? 0,
        hit: day?.cacheHit ?? 0,
        output: day?.output ?? 0,
        reasoning: day?.reasoning ?? 0,
      })
    }
    return out
  }, [byDay, trendDays])

  // 按模型视角的每日数据（缺日补 0；只收有 token 用量的模型段）。
  const modelDays: DayModelsRow[] = useMemo(() => {
    const out: DayModelsRow[] = []
    for (let offset = trendDays - 1; offset >= 0; offset -= 1) {
      const d = new Date()
      d.setDate(d.getDate() - offset)
      const date = localStamp(d.getTime())
      const cells = stats.byDayModels?.[date]
      const models: Record<string, ModelDayCell> = {}
      let dayTotal = 0
      if (cells !== undefined) {
        for (const [key, cell] of Object.entries(cells)) {
          const hit = cell.cacheHit ?? 0
          const miss = cell.cacheMiss ?? 0
          const output = cell.output ?? 0
          const cellTotal = hit + miss + output
          if (cellTotal <= 0) continue
          models[key] = { hit, miss, output, total: cellTotal }
          dayTotal += cellTotal
        }
      }
      out.push({ date, models, total: dayTotal })
    }
    return out
  }, [stats.byDayModels, trendDays])

  // 图例模型：窗口内有 token 用量的模型全量展示（不截断），按窗口总量降序；
  // 堆叠自下而上同序（大头沉底，基线稳定，与趋势页一致）。
  const legendModels: TrendSeriesModel[] = useMemo(() => {
    const totals = new Map<string, number>()
    for (const day of modelDays) {
      for (const [key, cell] of Object.entries(day.models)) {
        totals.set(key, (totals.get(key) ?? 0) + cell.total)
      }
    }
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([key]) => ({
        key,
        name: brandModels.find(m => m.key === key)?.name ?? modelOf(key).name,
        color: brandModels.find(m => m.key === key)?.color ?? FALLBACK_MODEL_COLOR,
      }))
  }, [modelDays, brandModels])

  // 生效的聚焦：模型被 7/30 窗口缩掉后自动失效。
  const activeFocus = focus !== null && legendModels.some(m => m.key === focus) ? focus : null

  // 聚焦入口：图例色块 / 模型 Token 表格行。同一份状态，两处联动；
  // 结构视角下点表格行 = 直接切到按模型并聚焦该模型（「查询这个模型」的自然动作）。
  const toggleFocus = (key: string): void => {
    if (!modelViewAvailable) return
    if (view !== 'model') {
      setView('model')
      setFocus(key)
      return
    }
    setFocus(current => (current === key ? null : key))
  }

  // 模型 token 排行。
  const models: ModelTokenRow[] = useMemo(() => {
    let grand = 0
    const rows = Object.entries(byModel)
      .filter(([, d]) => d.calls > 0)
      .map(([key, d]) => {
        const totalTokens = d.input + d.output
        grand += totalTokens
        const hitMiss = d.cacheHit + d.cacheMiss
        return {
          key,
          name: modelOf(key).name,
          input: d.input,
          output: d.output,
          reasoning: d.reasoning ?? 0,
          calls: d.calls,
          cacheHit: d.cacheHit,
          cacheMiss: d.cacheMiss,
          cacheHitRate: hitMiss > 0 ? (d.cacheHit / hitMiss) * 100 : 0,
          total: totalTokens,
          share: 0,
        }
      })
      .sort((a, b) => b.total - a.total)
    return rows.map(r => ({ ...r, share: grand > 0 ? r.total / grand : 0 }))
  }, [byModel])

  // 结构 KPI。（对旧快照缺失字段兜底：reasoning/cacheRead 等可能为 undefined。）
  const kpis = useMemo(() => {
    const hit = total.cacheHit ?? 0
    const miss = total.cacheMiss ?? 0
    const input = total.input ?? 0
    const output = total.output ?? 0
    const reasoning = total.reasoning ?? 0
    const hitMiss = hit + miss
    const cacheHitRate = hitMiss > 0 ? (hit / hitMiss) * 100 : 0
    const reasoningPct = output > 0 ? (reasoning / output) * 100 : 0
    const io = output > 0 ? input / output : 0
    let peak: DailyBucket | undefined
    for (const d of days) {
      const t2 = d.miss + d.hit + d.output
      if (peak === undefined || t2 > peak.miss + peak.hit + peak.output) peak = d
    }
    return { cacheHitRate, reasoningPct, io, peak, hit, miss, input, output, reasoning }
  }, [total, days])

  // 工具调用排行：取前 8 名，其余合并为「其他」。
  const toolRows = useMemo(() => {
    const entries = Object.entries(stats.byTool ?? {})
    const top = entries.slice(0, 8)
    const rest = entries.slice(8).reduce((sum, [, count]) => sum + count, 0)
    const totalCalls = entries.reduce((sum, [, count]) => sum + count, 0)
    return { top, rest: rest > 0 ? [['…', rest] as const] : [], totalCalls }
  }, [stats.byTool])

  // 每日堆叠图布局（两视角共用：同窗口同长度，仅 y 轴最大值口径不同）。
  const chart = useMemo(() => {
    const n = days.length
    if (n === 0) return null
    const plotW = W - PAD.left - PAD.right
    const plotH = H - PAD.top - PAD.bottom
    const max = view === 'model'
      ? Math.max(...modelDays.map(d => d.total), 1)
      : Math.max(...days.map(d => d.miss + d.hit + d.output), 1)
    const y = (v: number): number => PAD.top + plotH - (v / max) * plotH
    const groupW = plotW / n
    const barW = Math.min(20, groupW * 0.6)
    const inner = (i: number): number => (n === 1 ? PAD.left + plotW / 2 : PAD.left + (plotW * i) / (n - 1))
    const step = Math.max(1, Math.ceil(n / 8))
    const indices: number[] = []
    for (let i = 0; i < n; i += step) indices.push(i)
    if (n > 0 && indices[indices.length - 1] !== n - 1) indices.push(n - 1)
    return { n, plotW, plotH, max, y, barW, inner, indices }
  }, [days, modelDays, view])

  // 导出：按日 token CSV（结构口径，保持不变）+ 全量 JSON（含按日 × 模型明细）。
  const exportTokenCsv = (): void => {
    const blob = new Blob([tokenDayCsv(days)], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `token-daily-${localStamp()}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 0)
  }
  const exportTokenJson = (): void => {
    const blob = new Blob([tokenDailyJson(days, models, modelDays, total)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `token-${localStamp()}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 0)
  }

  // 悬停日的明细（tooltip 数据源）；未悬停或索引越界时不显示。
  const activeDay = hover === null ? undefined : days[hover]
  const activeModelDay = hover === null ? undefined : modelDays[hover]

  return (
    <div className={css.tokenPanel} data-testid="billing-token-panel">
      {/* 导出工具条。 */}
      <div className={css.exportBar} role="group" aria-label={t('billing.tokenExport')}>
        <span className={css.exportLabel}>{t('billing.export')}</span>
        <button type="button" className={css.exportButton} data-testid="billing-token-export-csv" onClick={exportTokenCsv}>
          {t('billing.tokenExportCsv')}
        </button>
        <button type="button" className={css.exportButton} data-testid="billing-token-export-json" onClick={exportTokenJson}>
          {t('billing.exportJson')}
        </button>
      </div>

      {/* Token 结构 KPI。 */}
      <div className={css.kpiGrid} data-testid="billing-token-kpis">
        <div className={css.kpiTile}>
          <span className={css.kpiLabel}>{t('billing.tokenCacheHitRate')}</span>
          <span className={css.kpiValue}>{kpis.cacheHitRate.toFixed(1)}%</span>
          {/* 显式缓存写入（cacheMiss 子集）在命中卡副行附带展示；无该维度时不显示。 */}
          <span className={css.kpiDetail}>
            {formatTokens(kpis.hit)} / {formatTokens(kpis.hit + kpis.miss)}
            {(total.cacheWrite ?? 0) > 0 ? ` · ${t('billing.tokenCacheWrite')} ${formatTokens(total.cacheWrite ?? 0)}` : ''}
          </span>
        </div>
        <div className={css.kpiTile}>
          <span className={css.kpiLabel}>{t('billing.tokenReasoningShare')}</span>
          <span className={css.kpiValue}>{kpis.reasoningPct.toFixed(1)}%</span>
          <span className={css.kpiDetail}>{formatTokens(kpis.reasoning)}</span>
        </div>
        <div className={css.kpiTile}>
          <span className={css.kpiLabel}>{t('billing.tokenIo')}</span>
          <span className={css.kpiValue}>{kpis.io.toFixed(2)}</span>
          <span className={css.kpiDetail}>{formatTokens(kpis.input)} / {formatTokens(kpis.output)}</span>
        </div>
        <div className={css.kpiTile}>
          <span className={css.kpiLabel}>{t('billing.tokenPeak')}</span>
          <span className={css.kpiValue}>{kpis.peak === undefined ? '—' : shortNumber(kpis.peak.miss + kpis.peak.hit + kpis.peak.output)}</span>
          <span className={css.kpiDetail}>{kpis.peak?.date ?? '—'}</span>
        </div>
      </div>

      {/* 每日 token 堆叠趋势（按结构 / 按模型 双视角）。 */}
      <section className={css.panel} data-testid="billing-token-daily">
        <div className={css.panelHead}>
          <h3 className={css.panelTitle}>{t('billing.tokenDaily')}</h3>
          <span className={css.panelHeadControls}>
            {/* 视角切换：旧快照无按日 × 模型明细时整体隐藏（保持结构视角）。 */}
            {modelViewAvailable && (
              <span className={css.rangeToggle} role="group" aria-label={t('billing.tokenDaily')}>
                {(['structure', 'model'] as const).map(v => (
                  <button key={v} type="button" className={clsx(css.rangeButton, view === v && css.rangeButtonActive)} aria-pressed={view === v} onClick={() => { switchView(v) }} data-testid={`billing-token-view-${v}`}>
                    {v === 'structure' ? t('billing.tokenViewStructure') : t('billing.tokenViewModel')}
                  </button>
                ))}
              </span>
            )}
            <span className={css.rangeToggle} role="group" aria-label={t('billing.tokenDaily')}>
              {([7, 30] as const).map(d => (
                <button key={d} type="button" className={clsx(css.rangeButton, trendDays === d && css.rangeButtonActive)} aria-pressed={trendDays === d} onClick={() => { onTrendDays(d) }} data-testid={`billing-token-${d}d`}>
                  {d === 7 ? t('billing.trend7d') : t('billing.trend30d')}
                </button>
              ))}
            </span>
          </span>
        </div>
        {(chart === null || (view === 'model' && legendModels.length === 0)) ? (
          <div className={css.chartEmpty}>{t('billing.trendEmpty')}</div>
        ) : (
          <div className={css.chartWrap}>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className={css.chartSvg}
              role="img"
              aria-label={t('billing.tokenDaily')}
              onMouseLeave={() => { setHover(null) }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const x = ((e.clientX - rect.left) / rect.width) * W
                const ratio = (x - PAD.left) / chart.plotW
                const index = Math.round(ratio * (chart.n - 1))
                setHover(Math.min(Math.max(index, 0), chart.n - 1))
              }}
            >
              {[0, 0.5, 1].map((f) => {
                const v = chart.max * f
                const yy = chart.y(v)
                return (
                  <g key={f}>
                    <line x1={PAD.left} x2={W - PAD.right} y1={yy} y2={yy} className={css.chartGrid} />
                    <text x={PAD.left - 8} y={yy + 3} textAnchor="end" className={css.chartAxisLabel}>{shortNumber(v)}</text>
                  </g>
                )
              })}
              {view === 'structure'
                ? days.map((d, i) => {
                    const x = chart.inner(i) - chart.barW / 2
                    const baseY = chart.y(0)
                    const yMiss = chart.y(d.miss)
                    const yHit = chart.y(d.miss + d.hit)
                    const yOut = chart.y(d.miss + d.hit + d.output)
                    return (
                      <g key={d.date}>
                        <rect x={x} y={yMiss} width={chart.barW} height={baseY - yMiss} fill={MISS_COLOR} />
                        <rect x={x} y={yHit} width={chart.barW} height={yMiss - yHit} fill={HIT_COLOR} />
                        <rect x={x} y={yOut} width={chart.barW} height={yHit - yOut} fill={OUTPUT_COLOR} />
                      </g>
                    )
                  })
                : modelDays.map((day, i) => {
                    // 按模型堆叠：段自下而上按图例序（窗口总量降序），零值段不画；
                    // 聚焦时其余模型段弱化，y 轴与柱总高保持不变。
                    const x = chart.inner(i) - chart.barW / 2
                    let acc = 0
                    return (
                      <g key={day.date}>
                        {legendModels.map((m) => {
                          const cell = day.models[m.key]
                          if (cell === undefined) return null
                          const y0 = chart.y(acc)
                          acc += cell.total
                          const y1 = chart.y(acc)
                          const dimmed = activeFocus !== null && m.key !== activeFocus
                          return (
                            <rect
                              key={m.key}
                              x={x}
                              y={y1}
                              width={chart.barW}
                              height={y0 - y1}
                              fill={m.color}
                              opacity={dimmed ? DIM_OPACITY : 1}
                            />
                          )
                        })}
                      </g>
                    )
                  })}
              {chart.indices.map((i) => {
                const d = days[i]
                if (d === undefined) return null
                return <text key={d.date} x={chart.inner(i)} y={H - 6} textAnchor="middle" className={css.chartAxisLabel}>{d.date.slice(5)}</text>
              })}
              {/* 悬停十字线：定位当前日期列。 */}
              {hover !== null && (
                <line x1={chart.inner(hover)} x2={chart.inner(hover)} y1={PAD.top} y2={PAD.top + chart.plotH} className={css.chartCrosshair} />
              )}
            </svg>
            {/* 悬停 tooltip：按结构给三桶精确值；按模型给当日逐模型 命中/未命中/输出 明细（数字不缩写）。 */}
            {hover !== null && view === 'structure' && activeDay !== undefined && (
              <div
                className={css.chartTooltip}
                data-testid="billing-token-tooltip"
                style={{
                  left: `${(chart.inner(hover) / W) * 100}%`,
                  top: `${(chart.y(activeDay.miss + activeDay.hit + activeDay.output) / H) * 100}%`,
                }}
              >
                <div className={css.chartTooltipHead}>
                  <span className={css.chartTooltipDate}>{activeDay.date}</span>
                  <strong>{(activeDay.miss + activeDay.hit + activeDay.output).toLocaleString()}</strong>
                </div>
                <div className={clsx(css.chartTooltipRow, css.chartTooltipSplit)}>
                  <span className={css.chartTooltipLabel}>
                    <span className={css.chartTooltipSwatch} style={{ background: HIT_COLOR }} />
                    {t('billing.tokenHit')}
                  </span>
                  <strong>{activeDay.hit.toLocaleString()}</strong>
                </div>
                <div className={clsx(css.chartTooltipRow, css.chartTooltipSplit)}>
                  <span className={css.chartTooltipLabel}>
                    <span className={css.chartTooltipSwatch} style={{ background: MISS_COLOR }} />
                    {t('billing.tokenMiss')}
                  </span>
                  <strong>{activeDay.miss.toLocaleString()}</strong>
                </div>
                <div className={clsx(css.chartTooltipRow, css.chartTooltipSplit)}>
                  <span className={css.chartTooltipLabel}>
                    <span className={css.chartTooltipSwatch} style={{ background: OUTPUT_COLOR }} />
                    {t('billing.tokenOutput')}
                  </span>
                  <strong>{activeDay.output.toLocaleString()}</strong>
                </div>
              </div>
            )}
            {hover !== null && view === 'model' && activeModelDay !== undefined && (
              <div
                className={css.chartTooltip}
                data-testid="billing-token-tooltip"
                style={{
                  left: `${(chart.inner(hover) / W) * 100}%`,
                  top: `${(chart.y(activeModelDay.total) / H) * 100}%`,
                }}
              >
                <div className={css.chartTooltipHead}>
                  <span className={css.chartTooltipDate}>{activeModelDay.date}</span>
                  <strong>{activeModelDay.total.toLocaleString()}</strong>
                </div>
                {legendModels.map((m) => {
                  const cell = activeModelDay.models[m.key]
                  if (cell === undefined) return null
                  return (
                    <div key={m.key} className={css.chartTooltipModel}>
                      <div className={clsx(css.chartTooltipRow, css.chartTooltipSplit)}>
                        <span className={css.chartTooltipLabel}>
                          <span className={css.chartTooltipSwatch} style={{ background: m.color }} />
                          {m.name}
                        </span>
                        <strong>{cell.total.toLocaleString()}</strong>
                      </div>
                      <div className={css.chartTooltipModelDetail}>
                        {t('billing.tokenHitShort')} {cell.hit.toLocaleString()} · {t('billing.tokenMissShort')} {cell.miss.toLocaleString()} · {t('billing.tokenOutput')} {cell.output.toLocaleString()}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div className={css.chartLegend}>
              {view === 'structure'
                ? (
                    <>
                      <span><span className={css.chartTooltipSwatch} style={{ background: MISS_COLOR }} />{t('billing.tokenMiss')}</span>
                      <span><span className={css.chartTooltipSwatch} style={{ background: HIT_COLOR }} />{t('billing.tokenHit')}</span>
                      <span><span className={css.chartTooltipSwatch} style={{ background: OUTPUT_COLOR }} />{t('billing.tokenOutput')}</span>
                    </>
                  )
                : legendModels.map(m => (
                  // 按模型图例：可点击聚焦（与「模型 Token」表格行联动），全量展示不截断。
                  <button
                    key={m.key}
                    type="button"
                    className={clsx(css.chartLegendItem, activeFocus === m.key && css.chartLegendItemActive)}
                    aria-pressed={activeFocus === m.key}
                    data-testid={`billing-token-legend-${m.key}`}
                    onClick={() => { toggleFocus(m.key) }}
                  >
                    <span className={css.chartTooltipSwatch} style={{ background: m.color }} />
                    {m.name}
                  </button>
                ))}
            </div>
          </div>
        )}
      </section>

      {/* 模型 token 排行与占比（行点击 = 聚焦该模型）。 */}
      <section className={css.panel} data-testid="billing-token-models">
        <div className={css.panelHead}>
          <h3 className={css.panelTitle}>{t('billing.tokenByModel')}</h3>
        </div>
        {models.length === 0 ? (
          <div className={css.emptyRow}>{t('billing.noData')}</div>
        ) : (
          <div className={css.tableScroll}>
            <table className={css.modelTable} data-testid="billing-token-model-table">
              <thead>
                <tr>
                  <th>{t('billing.model')}</th>
                  <th className={css.numCol}>{t('billing.inputTokens')}</th>
                  <th className={css.numCol}>{t('billing.outputTokens')}</th>
                  <th className={css.numCol}>{t('billing.tokenReasoningShort')}</th>
                  <th className={css.numCol}>{t('billing.cacheHitRate')}</th>
                  <th className={css.numCol}>{t('billing.tokenTotal')}</th>
                  <th className={css.numCol}>{t('billing.tokenShare')}</th>
                  <th className={css.numCol}>{t('billing.calls')}</th>
                </tr>
              </thead>
              <tbody>
                {models.map(m => (
                  <tr
                    key={m.key}
                    data-testid="billing-token-model"
                    className={clsx(modelViewAvailable && css.modelRowFocusable, activeFocus === m.key && css.modelRowActive)}
                    aria-selected={modelViewAvailable ? activeFocus === m.key : undefined}
                    onClick={modelViewAvailable ? () => { toggleFocus(m.key) } : undefined}
                  >
                    <td><span className={css.modelName}>{m.name}</span></td>
                    <td className={css.numCol}>{formatTokens(m.input)}</td>
                    <td className={css.numCol}>{formatTokens(m.output)}</td>
                    <td className={css.numCol}>{m.reasoning > 0 ? formatTokens(m.reasoning) : <span className={css.na}>—</span>}</td>
                    <td className={css.numCol}>{m.cacheHitRate.toFixed(1)}%</td>
                    <td className={css.numCol}>{formatTokens(m.total)}</td>
                    <td className={css.numCol}>
                      <span className={css.tokenModelShareRow}>
                        <span className={css.tokenModelBar}>
                          {/* 分段色：蓝=输入（含缓存命中）、琥珀=输出，段宽按各自 token 占比。 */}
                          <span className={css.tokenModelParts} style={{ width: `${(m.share * 100).toFixed(2)}%` }}>
                            <span className={css.tokenModelPartIn} style={{ width: `${m.total > 0 ? (m.input / m.total) * 100 : 0}%` }} />
                            <span className={css.tokenModelPartOut} style={{ width: `${m.total > 0 ? (m.output / m.total) * 100 : 0}%` }} />
                          </span>
                        </span>
                        {(m.share * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className={css.numCol}>{m.calls.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 工具调用排行：byTool 计次（token 无法按工具归因），展示 agent 循环的工具使用结构。 */}
      {toolRows.totalCalls > 0 && (
        <section className={css.panel} data-testid="billing-token-tools">
          <div className={css.panelHead}>
            <h3 className={css.panelTitle}>{t('billing.toolRank')}</h3>
          </div>
          <div className={css.tableScroll}>
            <table className={css.modelTable} data-testid="billing-tool-table">
              <thead>
                <tr>
                  <th>{t('billing.toolName')}</th>
                  <th className={css.numCol}>{t('billing.calls')}</th>
                  <th className={css.numCol}>{t('billing.tokenShare')}</th>
                </tr>
              </thead>
              <tbody>
                {[...toolRows.top, ...toolRows.rest].map(([name, count]) => (
                  <tr key={name} data-testid="billing-tool-row">
                    <td><span className={css.modelName}>{name}</span></td>
                    <td className={css.numCol}>{count.toLocaleString()}</td>
                    <td className={css.numCol}>{((count / toolRows.totalCalls) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

/** 导出按日 token CSV（结构口径）。 */
function tokenDayCsv(days: readonly DailyBucket[]): string {
  const head = 'date,missInput,cacheHit,output,reasoning,total'
  const rows = days.map(d => `${d.date},${d.miss},${d.hit},${d.output},${d.reasoning},${d.miss + d.hit + d.output}`)
  return [head, ...rows].join('\n')
}
