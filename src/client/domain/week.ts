/**
 * 周/7天窗口聚合：KPI 范围求和、自然周累计（issue #39 口径）、近 7 天费用序列。
 * 纯函数（日期取本地时区），无 React 依赖。`KpiDayRow` 是 byDay 行的最小字段，
 * `dayTokensOf` 在 `streak.ts` 内已抽出，复用同口径。
 */

import { localDayStamp } from '../pricing.ts'
import { dayTokensOf } from './streak.ts'
import type { AvgCostRange, KpiAgg, KpiDayRow } from './types.ts'

/**
 * 近 7 天费用序列（含今天，缺日补 0）：触发卡 hover 速览的迷你柱数据源。
 * 导出供测试：纯函数（日期取本地时区）。
 * @param byDay - 按日费用表。
 * @returns 7 个 `{ date, cost }`，最旧在前。
 */
export function lastSevenDays(byDay: Record<string, { cost: number }>): readonly { date: string; cost: number }[] {
  const out: { date: string; cost: number }[] = []
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date()
    day.setDate(day.getDate() - offset)
    const stamp = localDayStamp(day.getTime())
    out.push({ date: stamp, cost: byDay[stamp]?.cost ?? 0 })
  }
  return out
}

/**
 * 本自然周（周一起算）到 `today` 的累计值（issue #39）：标签「本周」的语义是
 * 自然周，近 7 天滚动窗口会在周一把上周用量卷进来（周一时它与当月几乎相等，
 * 用户误解为统计错误）。周一 = `getDay() === 1`；`pick` 决定日行取哪个维度。
 * @param byDay - 按日聚合表（key = `YYYY-MM-DD` 本地时区）。
 * @param today - 今天的本地日期戳。
 * @param pick - 日行取值（缺省取 cost；token 视角传 input+output 合计）。
 * @returns 本周一到今天的合计；`today` 本身不在表里（无调用）时为 0。
 */
export function sinceMondayOf<T>(
  byDay: Record<string, T>,
  today: string,
  pick: (row: T) => number = (row) => (row as unknown as { cost: number }).cost,
): number {
  const now = new Date(`${today}T00:00:00`)
  // getDay(): 0=周日 … 6=周六；周一起算 → 偏移 = (day + 6) % 7 天。
  const offsetDays = (now.getDay() + 6) % 7
  let sum = 0
  for (let back = 0; back <= offsetDays; back += 1) {
    const day = new Date(now)
    day.setDate(day.getDate() - back)
    const row = byDay[localDayStamp(day.getTime())]
    if (row !== undefined) sum += pick(row)
  }
  return sum
}

/**
 * 按范围聚合 byDay（issue #47）：今日 / 近 7 天（含今天）/ 本周（周一起）/
 * 本月。日期戳字典序即时间序（与 dailyBurnRate 同口径）；累计口径由调用方
 * 直接取 total（含搜索估值兜底），不走此函数。
 */
export function sumByDayRange(
  byDay: Record<string, KpiDayRow>,
  today: string,
  range: Exclude<AvgCostRange, 'all' | 'custom'>,
): KpiAgg {
  const now = new Date(`${today}T00:00:00`)
  // 周一起算偏移（issue #39 口径）；近 7 天 = 今天往前 6 天。
  const weekOffset = (now.getDay() + 6) % 7
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - weekOffset)
  const weekStartStamp = localDayStamp(weekStart.getTime())
  const days7Start = new Date(now)
  days7Start.setDate(days7Start.getDate() - 6)
  const range7Start = localDayStamp(days7Start.getTime())
  return sumByDayWhere(byDay, date => range === 'today' ? date === today
    : range === '7d' ? date >= range7Start && date <= today
    : range === 'week' ? date >= weekStartStamp && date <= today
    : date.startsWith(today.slice(0, 7)))
}

/** 自定义本地日期范围：起止日均完整包含，字典序边界与 byDay 键一致。 */
export function sumByDayCustomRange(
  byDay: Record<string, KpiDayRow>,
  start: string,
  end: string,
): KpiAgg {
  return sumByDayWhere(byDay, date => date >= start && date <= end)
}

function sumByDayWhere(byDay: Record<string, KpiDayRow>, include: (date: string) => boolean): KpiAgg {
  let cost = 0
  let calls = 0
  let input = 0
  let output = 0
  let cacheHit = 0
  let cacheMiss = 0
  let cacheWrite = 0
  let reasoning = 0
  let peakDay: string | undefined
  let peakTokens = 0
  for (const [date, row] of Object.entries(byDay)) {
    if (!include(date)) continue
    cost += row.cost
    calls += row.calls
    input += row.input
    output += row.output
    cacheHit += row.cacheHit
    cacheMiss += row.cacheMiss
    cacheWrite += row.cacheWrite ?? 0
    reasoning += row.reasoning ?? 0
    // 峰值日 = 范围内当日 Token（input + output，dayTokensOf 统一口径）最大的日。
    const dayTokens = dayTokensOf(row)
    if (dayTokens > peakTokens) {
      peakTokens = dayTokens
      peakDay = date
    }
  }
  return { cost, calls, input, output, cacheHit, cacheMiss, cacheWrite, reasoning, peakDay, peakTokens }
}
