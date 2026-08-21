/**
 * Month-forecast unit test: project the current month's spend from the daily
 * series, falling back to the 7-day burn rate when the month has no records.
 */

import { describe, expect, it } from 'vitest'
import { projectMonthCost } from '../src/client/UsageBilling.tsx'

/** Mutable-by-design fixture: byDay maps date → { cost } (calls/tokens suffice with cost). */
function day(cost: number) {
  return { cost }
}

describe('projectMonthCost', () => {
  it('extrapolates from the current month average when records exist', () => {
    // 本月已有 3 天记录，日均 (1+2+3)/3 = 2；本月 31 天 → 62。
    // 用固定 today 落入本月（假设当前月为 8 月，31 天），使 monthPrefix 稳定。
    const prefix = '2026-08'
    const byDay = {
      '2026-08-01': day(1),
      '2026-08-05': day(2),
      '2026-08-10': day(3),
    }
    const projected = projectMonthCost(byDay, prefix, '2026-08-10')
    // 八月为 31 天：日均 2 × 31 = 62。
    expect(projected).toBeCloseTo(62, 10)
  })

  it('falls back to the 7-day burn rate when the month has no records', () => {
    // 本月无记录，但最近 7 天有记录（跨月）：用 7 天日均外推整个月。
    const prefix = '2026-08'
    const byDay = {
      '2026-07-28': day(7),
      '2026-07-29': day(7),
      '2026-07-30': day(7),
      '2026-07-31': day(7),
    }
    // 7 天窗口只取 <= today 的最近 7 条：今天 08-01，窗口为 07-26..08-01 的
    // 有记录项（07-28..07-31 共 4 条），日均 7，8 月 31 天 → 217。
    const projected = projectMonthCost(byDay, prefix, '2026-08-01')
    expect(projected).toBeCloseTo(217, 10)
  })

  it('returns 0 when there is no spend data at all', () => {
    expect(projectMonthCost({}, '2026-08', '2026-08-01')).toBe(0)
  })
})
