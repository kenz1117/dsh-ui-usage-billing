/**
 * Month-forecast unit test: 本月预计 = 已发生 + 近 7 天节奏 × 剩余天数。
 *
 * 口径回归（2026-10-23）：旧口径用「本月有记录天数」当分母求日均再乘整月天数，
 * 稀疏使用的月份被放大数倍——一个只有 4 天记录、其余 19 天没用的月份被外推成
 * 实际值的 4 倍。以下用例锁住新口径：只外推还没发生的天数，且近期没花钱不虚增。
 */

import { describe, expect, it } from 'vitest'
import { projectMonthCost } from '../src/client/domain/forecast.ts'

/** Mutable-by-design fixture: byDay maps date → { cost } (calls/tokens suffice with cost). */
function day(cost: number) {
  return { cost }
}

describe('projectMonthCost', () => {
  it('adds the recent 7-day pace to the days still left in the month', () => {
    // 本月已有 3 天记录，合计 6；today = 08-10（已过 10 天，8 月共 31 天 → 剩 21 天）。
    // 近 7 个自然日（08-04..08-10）合计 5 → 日均 5/7；预计 = 6 + (5/7)×21 = 21。
    const prefix = '2026-08'
    const byDay = {
      '2026-08-01': day(1),
      '2026-08-05': day(2),
      '2026-08-10': day(3),
    }
    const projected = projectMonthCost(byDay, prefix, '2026-08-10')
    expect(projected).toBeCloseTo(21, 10)
  })

  it('falls back to the 7-day burn rate when the month has no records', () => {
    // 本月无记录，但最近 7 天有记录（跨月）：用 7 天日均外推剩余天数。
    const prefix = '2026-08'
    const byDay = {
      '2026-07-28': day(7),
      '2026-07-29': day(7),
      '2026-07-30': day(7),
      '2026-07-31': day(7),
    }
    // 7 天窗口只取 <= today 的最近 7 条：今天 08-01，窗口为 07-26..08-01 的
    // 有记录项（07-28..07-31 共 4 条），日均 7；8 月剩 31-1 = 30 天 → 210。
    const projected = projectMonthCost(byDay, prefix, '2026-08-01')
    expect(projected).toBeCloseTo(210, 10)
  })

  it('returns 0 when there is no spend data at all', () => {
    expect(projectMonthCost({}, '2026-08', '2026-08-01')).toBe(0)
  })

  it('does not inflate a sparsely used month (regression: 4 busy days were ×4)', () => {
    // 全月只有 4 天各花 1 元，其余 19 天没动。
    const byDay = {
      '2026-08-01': day(1),
      '2026-08-20': day(1),
      '2026-08-21': day(1),
      '2026-08-22': day(1),
    }
    // today = 08-23：已发生 4；近 7 天（08-17..08-23）合计 3 → 日均 3/7；
    // 剩 31-23 = 8 天 → 4 + (3/7)×8 ≈ 7.43。
    // 旧口径（有记录天均 1 × 31）会给 31——放大了 4 倍。
    const projected = projectMonthCost(byDay, '2026-08', '2026-08-23')
    expect(projected).toBeCloseTo(4 + (3 / 7) * 8, 10)
    expect(projected).toBeLessThan(8)
  })

  it('does not project growth when nothing was spent in the last 7 days', () => {
    // 8 月只用过一次（月初 10 元），此后 19 天没动 → 预计 = 已发生。
    const byDay = { '2026-08-01': day(10) }
    expect(projectMonthCost(byDay, '2026-08', '2026-08-20')).toBeCloseTo(10, 10)
  })

  it('settles on the actual spend on the last day of the month', () => {
    const byDay = { '2026-08-31': day(5) }
    expect(projectMonthCost(byDay, '2026-08', '2026-08-31')).toBeCloseTo(5, 10)
  })
})
