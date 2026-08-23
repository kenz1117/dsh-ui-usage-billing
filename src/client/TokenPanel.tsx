/**
 * TokenPanel: 「Token」分区——把 token 从费用里独立出来洞察。
 * 三个板块 + 导出，全部由 `UsageStats` 的 byDay/byModel/total 派生，服务端零改动：
 *  1. 每日 Token 堆叠趋势（未命中输入 / 缓存命中 / 输出[含 reasoning]），7/30 天切换；
 *  2. 模型 Token 总量排行 + 占比；
 *  3. Token 结构 KPI（缓存命中率 / reasoning 占比 / 输入:输出比 / 峰值日）。
 */

import { useMemo } from 'react'
import clsx from 'clsx'
import css from './UsageBilling.module.css'
import type { UsageBillingKey } from './locales.ts'
import { formatTokens, modelOf, type CostCurrency } from './pricing.ts'
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

/** 每日 token 堆叠图元。 */
interface DailyBucket {
  date: string
  miss: number
  hit: number
  output: number
  reasoning: number
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

/** 导出按日 token CSV。 */
function tokenDayCsv(days: readonly DailyBucket[]): string {
  const head = 'date,missInput,cacheHit,output,reasoning,total'
  const rows = days.map(d => `${d.date},${d.miss},${d.hit},${d.output},${d.reasoning},${d.miss + d.hit + d.output}`)
  return [head, ...rows].join('\n')
}

/**
 * Token 洞察面板。
 * @param props.stats - usage-stats 文档（byDay/byModel/total）。
 * @param props.trendDays - 每日 token 窗口（7/30 天）。
 * @param props.onTrendDays - 切换趋势窗口。
 */
export function TokenPanel(props: {
  stats: UsageStats
  currency: CostCurrency
  trendDays: 7 | 30
  onTrendDays: (d: 7 | 30) => void
  t: (key: UsageBillingKey) => string
}): React.ReactNode {
  const { stats, currency: _currency, trendDays, onTrendDays, t } = props
  const { byDay, byModel, total } = stats

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

  // 每日堆叠图布局。
  const chart = useMemo(() => {
    const n = days.length
    if (n === 0) return null
    const plotW = W - PAD.left - PAD.right
    const plotH = H - PAD.top - PAD.bottom
    const max = Math.max(...days.map(d => d.miss + d.hit + d.output), 1)
    const y = (v: number): number => PAD.top + plotH - (v / max) * plotH
    const groupW = plotW / n
    const barW = Math.min(20, groupW * 0.6)
    const inner = (i: number): number => (n === 1 ? PAD.left + plotW / 2 : PAD.left + (plotW * i) / (n - 1))
    const step = Math.max(1, Math.ceil(n / 8))
    const indices: number[] = []
    for (let i = 0; i < n; i += step) indices.push(i)
    if (n > 0 && indices[indices.length - 1] !== n - 1) indices.push(n - 1)
    return { n, plotW, plotH, max, y, barW, inner, indices }
  }, [days])

  // 导出：按日 token CSV + token 汇总 JSON。
  const exportTokenCsv = (): void => {
    const blob = new Blob([tokenDayCsv(days)], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `token-daily-${localStamp()}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const exportTokenJson = (): void => {
    const blob = new Blob([JSON.stringify({ days, models, total }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `token-${localStamp()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

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
          <span className={css.kpiDetail}>{formatTokens(kpis.hit)} / {formatTokens(kpis.hit + kpis.miss)}</span>
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

      {/* 每日 token 堆叠趋势。 */}
      <section className={css.panel} data-testid="billing-token-daily">
        <div className={css.panelHead}>
          <h3 className={css.panelTitle}>{t('billing.tokenDaily')}</h3>
          <span className={css.rangeToggle} role="group" aria-label={t('billing.tokenDaily')}>
            {([7, 30] as const).map(d => (
              <button key={d} type="button" className={clsx(css.rangeButton, trendDays === d && css.rangeButtonActive)} aria-pressed={trendDays === d} onClick={() => { onTrendDays(d) }} data-testid={`billing-token-${d}d`}>
                {d === 7 ? t('billing.trend7d') : t('billing.trend30d')}
              </button>
            ))}
          </span>
        </div>
        {chart === null ? (
          <div className={css.chartEmpty}>{t('billing.trendEmpty')}</div>
        ) : (
          <div className={css.chartWrap}>
            <svg viewBox={`0 0 ${W} ${H}`} className={css.chartSvg} role="img" aria-label={t('billing.tokenDaily')}>
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
              {days.map((d, i) => {
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
              })}
              {chart.indices.map((i) => {
                const d = days[i]
                if (d === undefined) return null
                return <text key={d.date} x={chart.inner(i)} y={H - 6} textAnchor="middle" className={css.chartAxisLabel}>{d.date.slice(5)}</text>
              })}
            </svg>
            <div className={css.chartLegend}>
              <span><span className={css.chartTooltipSwatch} style={{ background: MISS_COLOR }} />{t('billing.tokenMiss')}</span>
              <span><span className={css.chartTooltipSwatch} style={{ background: HIT_COLOR }} />{t('billing.tokenHit')}</span>
              <span><span className={css.chartTooltipSwatch} style={{ background: OUTPUT_COLOR }} />{t('billing.tokenOutput')}</span>
            </div>
          </div>
        )}
      </section>

      {/* 模型 token 排行与占比。 */}
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
                  <tr key={m.key} data-testid="billing-token-model">
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
    </div>
  )
}
