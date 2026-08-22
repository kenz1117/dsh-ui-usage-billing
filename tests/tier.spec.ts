/**
 * Peak/off-peak countdown and switch-notice derivation tests. Beijing peak
 * windows are 09:00–12:00 / 14:00–18:00; switches land on those four
 * boundaries each day.
 */

import { describe, expect, it } from 'vitest'
import { formatSwitchCountdown, tierCountdown, upcomingTierSwitch } from '../src/client/pricing.ts'

/** 北京时间某小时某分钟的 epoch 毫秒。 */
function beijing(hour: number, minute = 0): number {
  // 构造一个「北京时间」时刻：换算成 UTC 再取时间戳。
  const date = new Date()
  date.setUTCHours(hour - 8, minute, 0, 0)
  return date.getTime()
}

describe('tierCountdown', () => {
  it('reports peak with the switch to off-peak at 12:00', () => {
    const { tier, nextSwitchInMs } = tierCountdown(beijing(10))
    expect(tier).toBe('peak')
    // 10:00 → 12:00 = 2h = 7,200,000 ms。
    expect(nextSwitchInMs).toBe(2 * 60 * 60 * 1000)
  })

  it('reports off-peak between 12:00 and 14:00', () => {
    const { tier, nextSwitchInMs } = tierCountdown(beijing(13))
    expect(tier).toBe('offPeak')
    expect(nextSwitchInMs).toBe(60 * 60 * 1000)
  })

  it('rolls over to the next morning 09:00 after 18:00', () => {
    const { tier, nextSwitchInMs } = tierCountdown(beijing(23))
    expect(tier).toBe('offPeak')
    // 23:00 → 次日 09:00 = 10h。
    expect(nextSwitchInMs).toBe(10 * 60 * 60 * 1000)
    // 12:00 整点（边界时刻）按新档位计：进入 off-peak。
    expect(tierCountdown(beijing(12)).tier).toBe('offPeak')
  })
})

describe('upcomingTierSwitch', () => {
  it('returns the entering tier when within the lead window', () => {
    // 11:58，提前量 5 分钟 → 12:00 进入 off-peak。
    const upcoming = upcomingTierSwitch(beijing(11, 58), 5 * 60_000)
    expect(upcoming).not.toBeNull()
    expect(upcoming?.entering).toBe('offPeak')
    expect(upcoming?.atMs).toBe(beijing(12))
  })

  it('returns null when the switch is beyond the lead window', () => {
    // 11:00，提前量 5 分钟 → 下一切换 12:00（1 小时后）超出窗口。
    expect(upcomingTierSwitch(beijing(11), 5 * 60_000)).toBeNull()
  })
})

describe('formatSwitchCountdown', () => {
  it('formats hours and minutes compactly', () => {
    expect(formatSwitchCountdown(10 * 60 * 60 * 1000)).toBe('10h00m')
    expect(formatSwitchCountdown(45 * 60 * 1000)).toBe('45m')
    expect(formatSwitchCountdown(2 * 60 * 60 * 1000 + 23 * 60 * 1000)).toBe('2h23m')
  })

  it('rounds up to at least one minute', () => {
    expect(formatSwitchCountdown(30_000)).toBe('1m')
  })
})
