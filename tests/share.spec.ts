/**
 * Share-derivation unit tests: peak/off-peak cost split by turn start time
 * (Beijing peak 9-12 / 14-18) and the last-7-days series feeding the trigger
 * hover card's mini bars.
 */

import { describe, expect, it } from 'vitest'
import { lastSevenDays, peakOffpeakCost } from '../src/client/UsageBilling.tsx'

/** 北京时间某小时的当日时间戳（tierAt 口径：UTC 小时 + 8）。 */
function atBeijingHour(hour: number): number {
  const date = new Date()
  date.setUTCHours(hour - 8, 0, 0, 0)
  return date.getTime()
}

describe('peakOffpeakCost', () => {
  it('splits turn costs by Beijing peak hours', () => {
    const share = peakOffpeakCost([
      { startedAt: atBeijingHour(10), cost: 1 }, // 高峰
      { startedAt: atBeijingHour(15), cost: 2 }, // 高峰
      { startedAt: atBeijingHour(13), cost: 4 }, // 空闲
      { startedAt: atBeijingHour(23), cost: 8 }, // 空闲
    ])
    expect(share.peak).toBe(3)
    expect(share.offPeak).toBe(12)
  })

  it('returns zeros for an empty list', () => {
    expect(peakOffpeakCost([])).toEqual({ peak: 0, offPeak: 0 })
  })
})

describe('lastSevenDays', () => {
  it('returns seven entries ending today, filling gaps with zero', () => {
    const today = new Date()
    const pad = (n: number): string => String(n).padStart(2, '0')
    const stamp = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
    const days = lastSevenDays({ [stamp]: { cost: 1.5 } })
    expect(days).toHaveLength(7)
    expect(days.at(-1)).toEqual({ date: stamp, cost: 1.5 })
    // 其余六天无记录补 0。
    expect(days.slice(0, 6).every(d => d.cost === 0)).toBe(true)
  })
})
