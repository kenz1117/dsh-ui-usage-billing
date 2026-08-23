/**
 * UsageHeatmap: dependency-free month calendar heatmap of daily cost.
 *
 * Styled after an "activity map": one large rounded cell per day with the
 * date number printed inside, laid out in a 7-column grid (Sunday-first).
 * Week-first data layout: each week is one array element of 7 cells, so the
 * grid auto-rows place them correctly without per-cell gridColumnStart hacks.
 * Cell intensity is the day's cost quantized to five levels against the month
 * maximum (mint-green gradient, like the reference activity map). Leading
 * slots before the 1st and trailing slots after the last day carry the
 * cross-month dates as gray placeholders; future days of this month render as
 * gray placeholders too. Hover shows the exact date and amount.
 */

import { useMemo, useState } from 'react'
import css from './UsageBilling.module.css'
import { cnyToUsd, formatMoney, type CostCurrency } from './pricing.ts'

/** One heatmap day. */
export interface HeatmapDay {
  /** ISO date `YYYY-MM-DD` (local calendar). */
  date: string
  /** Value to intensity-map (daily cost in CNY). */
  value: number
}

/** A grid cell (placeholder = non-interactive gray slot, cross-month or future). */
interface Cell {
  date: string
  /** Printed date number (previous/next-month days keep their own number). */
  dayNum: number
  value: number
  level: 0 | 1 | 2 | 3 | 4
  /** true = gray placeholder (leading previous month, future days, trailing next month). */
  placeholder: boolean
}

const LEVEL_COLORS: readonly string[] = [
  'var(--dsw-alias-bg-layer-2)',
  'color-mix(in srgb, var(--dsw-static-green-500) 22%, var(--dsw-alias-bg-layer-2))',
  'color-mix(in srgb, var(--dsw-static-green-500) 45%, var(--dsw-alias-bg-layer-2))',
  'color-mix(in srgb, var(--dsw-static-green-500) 70%, var(--dsw-alias-bg-layer-2))',
  'var(--dsw-static-green-500)',
]

/** Local-time `YYYY-MM-DD` stamp (matches the dashboard's day keys). */
function dayStamp(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Build the current-month cells arranged in week rows (Sunday-first).
 * The grid is a complete calendar month view: leading slots before the 1st
 * carry the previous month's date number, trailing slots after the last day
 * carry the next month's date number, and every future day of this month is a
 * gray placeholder — so the rectangle always fills whole weeks, like the
 * reference activity map.
 */
function buildMonthWeeks(days: readonly HeatmapDay[], now: Date): Cell[][] {
  const byDate = new Map<string, number>()
  for (const day of days) byDate.set(day.date, day.value)
  let max = 0
  for (const value of byDate.values()) if (value > max) max = value

  const year = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // The 1st of this month falls on which Sunday-first weekday?
  const firstDow = new Date(year, month, 1).getDay()
  // Full month view: leading previous month + all current-month days.
  const totalCells = firstDow + daysInMonth
  const totalWeeks = Math.ceil(totalCells / 7)
  const weeks: Cell[][] = []

  for (let week = 0; week < totalWeeks; week += 1) {
    const row: Cell[] = []
    for (let col = 0; col < 7; col += 1) {
      const cellIndex = week * 7 + col
      const dayNum = cellIndex - firstDow + 1
      if (dayNum < 1) {
        // 上月补位：灰色卡片，显示其自身日期数字（与参考图首行一致）。
        const d = new Date(year, month, dayNum)
        row.push({ date: dayStamp(d), dayNum: d.getDate(), value: 0, level: 0, placeholder: true })
        continue
      }
      if (dayNum > daysInMonth) {
        // 下月补位：灰色卡片，显示其自身日期数字，凑满最后一行。
        const d = new Date(year, month + 1, dayNum - daysInMonth)
        row.push({ date: dayStamp(d), dayNum: d.getDate(), value: 0, level: 0, placeholder: true })
        continue
      }
      const date = new Date(year, month, dayNum)
      const iso = dayStamp(date)
      const value = byDate.get(iso) ?? 0
      let level: 0 | 1 | 2 | 3 | 4 = 0
      if (value > 0 && max > 0) {
        const scaled = Math.ceil((value / max) * 4)
        level = (Math.min(4, Math.max(1, scaled)) as 1 | 2 | 3 | 4)
      }
      // 未来日期（> today）无花费，按灰色占位处理。
      const isFuture = dayNum > today
      row.push({ date: iso, dayNum, value: isFuture ? 0 : value, level: isFuture ? 0 : level, placeholder: isFuture })
    }
    weeks.push(row)
  }
  return weeks
}

/**
 * Build the GitHub-style year cells (column = week, row = Sunday..Saturday),
 * covering the last 52 weeks up to the current week. Future days render as
 * level-0 gray; the column-flow grid lays each week's 7 cells vertically.
 */
function buildYearWeeks(days: readonly HeatmapDay[], now: Date): Cell[][] {
  const byDate = new Map<string, number>()
  for (const day of days) byDate.set(day.date, day.value)
  let max = 0
  for (const value of byDate.values()) if (value > max) max = value

  const today = dayStamp(now)
  const thisSunday = new Date(now)
  thisSunday.setHours(0, 0, 0, 0)
  thisSunday.setDate(thisSunday.getDate() - thisSunday.getDay())
  const firstSunday = new Date(thisSunday)
  firstSunday.setDate(thisSunday.getDate() - 51 * 7)

  const weeks: Cell[][] = []
  for (let week = 0; week < 52; week += 1) {
    const row: Cell[] = []
    for (let dow = 0; dow < 7; dow += 1) {
      const date = new Date(firstSunday)
      date.setDate(firstSunday.getDate() + week * 7 + dow)
      const iso = dayStamp(date)
      const future = iso > today
      const value = future ? 0 : (byDate.get(iso) ?? 0)
      let level: 0 | 1 | 2 | 3 | 4 = 0
      if (!future && value > 0 && max > 0) {
        const scaled = Math.ceil((value / max) * 4)
        level = (Math.min(4, Math.max(1, scaled)) as 1 | 2 | 3 | 4)
      }
      row.push({ date: iso, dayNum: date.getDate(), value, level, placeholder: future })
    }
    weeks.push(row)
  }
  return weeks
}

/**
 * Render the month or year heatmap.
 * @param props.days - daily cost rows (keys are `YYYY-MM-DD`).
 * @param props.currency - display currency for the hover amount.
 * @param props.now - anchor date (defaults to today); injectable for tests.
 * @param props.t - locale function (used for the legend labels).
 * @param props.range - `month` (calendar month) or `year` (last 52 weeks, GitHub style).
 */
export function UsageHeatmap({ days, currency, now, t, range = 'month' }: { days: readonly HeatmapDay[]; currency: CostCurrency; now?: Date; range?: 'month' | 'year'; t: (key: 'billing.costAbbr' | 'billing.noData' | 'billing.heatmapLess' | 'billing.heatmapMore') => string }): React.ReactNode {
  const [hover, setHover] = useState<Cell | null>(null)
  const money = (cny: number): string => formatMoney(currency === 'usd' ? cnyToUsd(cny) : cny, currency)
  // monthWeeks 无条件计算，保证跨 range 切换时 hooks 顺序稳定。
  const monthWeeks = useMemo(() => buildMonthWeeks(days, now ?? new Date()), [days, now])

  if (range === 'year') {
    // Year view: compact per-week column grid (GitHub style); tooltip via title.
    const yearWeeks = buildYearWeeks(days, now ?? new Date())
    return (
      <div className={css.heatmap}>
        <div className={css.heatmapYearScroll}>
          <div className={css.heatmapYearGrid} role="img" aria-label="yearly cost heatmap" data-testid="heatmap-year-grid">
            {yearWeeks.flat().map(cell => (
              <button
                key={cell.date}
                type="button"
                className={css.heatmapYearCell}
                data-testid="heatmap-year-cell"
                data-level={cell.level}
                style={{ background: LEVEL_COLORS[cell.level] }}
                title={`${cell.date} · ${money(cell.value)}`}
                aria-label={`${cell.date}: ${money(cell.value)}`}
              />
            ))}
          </div>
        </div>
        <div className={css.heatmapFooter}>
          <span className={css.heatmapLegendText}>{t('billing.heatmapLess')}</span>
          <span className={css.heatmapLegend}>
            {LEVEL_COLORS.map((color, level) => <i key={level} style={{ background: color }} />)}
          </span>
          <span className={css.heatmapLegendText}>{t('billing.heatmapMore')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={css.heatmap}>
      <div className={css.heatmapGrid} role="img" aria-label="daily cost heatmap">
        {monthWeeks.map(week =>
          week.map((cell) => {
            if (cell.placeholder) return <div key={cell.date} className={css.heatmapCellEmpty}>{cell.dayNum}</div>
            return (
              <button
                key={cell.date}
                type="button"
                className={css.heatmapCell}
                data-testid="heatmap-cell"
                data-level={cell.level}
                style={{ background: LEVEL_COLORS[cell.level] }}
                title={`${cell.date} · ${money(cell.value)}`}
                aria-label={`${cell.date}: ${money(cell.value)}`}
                onMouseEnter={() => { setHover(cell) }}
                onMouseLeave={() => { setHover(null) }}
                onFocus={() => { setHover(cell) }}
                onBlur={() => { setHover(null) }}
              >
                {cell.dayNum}
              </button>
            )
          }),
        )}
      </div>
      <div className={css.heatmapFooter}>
        <span className={css.heatmapLegendText}>{t('billing.heatmapLess')}</span>
        <span className={css.heatmapLegend}>
          {LEVEL_COLORS.map((color, level) => <i key={level} style={{ background: color }} />)}
        </span>
        <span className={css.heatmapLegendText}>{t('billing.heatmapMore')}</span>
        {hover !== null && (
          <span className={css.heatmapHover} data-testid="heatmap-hover">
            {hover.date} · {money(hover.value)}
          </span>
        )}
      </div>
    </div>
  )
}
