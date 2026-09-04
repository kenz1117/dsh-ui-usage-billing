/**
 * Peak/off-peak countdown and switch-notice derivation tests. Beijing peak
 * windows are 09:00–12:00 / 14:00–18:00 on weekdays; Saturday/Sunday are
 * all-day off-peak with no boundaries (issue #33).
 */

import { describe, expect, it } from 'vitest'
import { formatSwitchCountdown, tierCountdown, upcomingTierSwitch } from '../src/client/pricing.ts'

/**
 * 北京时间某星期几某时刻的 epoch 毫秒。固定 2026-08 的日历：
 * 20=周四、21=周五、22=周六、23=周日、24=周一。
 */
function beijing(day: number, hour: number, minute = 0): number {
  // 北京时间 = UTC+8：北京 hour → UTC (hour-8) 小时（可跨到前一日）。
  return Date.UTC(2026, 7, day, (hour + 24 - 8) % 24, minute, 0, 0)
}

describe('tierCountdown', () => {
  it('reports peak with the switch to off-peak at 12:00', () => {
    const { tier, nextSwitchInMs } = tierCountdown(beijing(21, 10))
    expect(tier).toBe('peak')
    // 10:00 → 12:00 = 2h = 7,200,000 ms。
    expect(nextSwitchInMs).toBe(2 * 60 * 60 * 1000)
  })

  it('reports off-peak between 12:00 and 14:00', () => {
    const { tier, nextSwitchInMs } = tierCountdown(beijing(21, 13))
    expect(tier).toBe('offPeak')
    expect(nextSwitchInMs).toBe(60 * 60 * 1000)
  })

  it('rolls over to the next weekday 09:00 after 18:00 (issue #33)', () => {
    // 周五深夜：次日是周六（周末全天低谷，09:00 不是真边界），
    // 倒计时必须跳到周一 09:00（58h），而非周末伪边界的 10h。
    const fridayNight = tierCountdown(beijing(21, 23))
    expect(fridayNight.tier).toBe('offPeak')
    expect(fridayNight.nextSwitchInMs).toBe(58 * 60 * 60 * 1000)
    // 周四深夜：次日周五是工作日，次日 09:00 正常（10h）。
    const thursdayNight = tierCountdown(beijing(20, 23))
    expect(thursdayNight.tier).toBe('offPeak')
    expect(thursdayNight.nextSwitchInMs).toBe(10 * 60 * 60 * 1000)
    // 12:00 整点（边界时刻）按新档位计：进入 off-peak。
    expect(tierCountdown(beijing(21, 12)).tier).toBe('offPeak')
  })

  it('points weekend any-time to the next Monday 09:00', () => {
    // 周六 10:00 → 周一 09:00 = 47h。
    expect(tierCountdown(beijing(22, 10)).nextSwitchInMs).toBe(47 * 60 * 60 * 1000)
    // 周日深夜 23:30 → 周一 09:00 = 9h30m。
    expect(tierCountdown(beijing(23, 23, 30)).nextSwitchInMs).toBe(9 * 60 * 60 * 1000 + 30 * 60 * 1000)
  })

  it('skips the weekend from a Friday evening peak window edge', () => {
    // 周五 18:30（峰区刚结束）：下一真变化是周一 09:00（62h30m）。
    const { tier, nextSwitchInMs } = tierCountdown(beijing(21, 18, 30))
    expect(tier).toBe('offPeak')
    expect(nextSwitchInMs).toBe(62 * 60 * 60 * 1000 + 30 * 60 * 1000)
  })
})

describe('upcomingTierSwitch', () => {
  it('returns the entering tier when within the lead window', () => {
    // 周五 11:58，提前量 5 分钟 → 12:00 进入 off-peak。
    const upcoming = upcomingTierSwitch(beijing(21, 11, 58), 5 * 60_000)
    expect(upcoming).not.toBeNull()
    expect(upcoming?.entering).toBe('offPeak')
    expect(upcoming?.atMs).toBe(beijing(21, 12))
  })

  it('returns null when the switch is beyond the lead window', () => {
    // 11:00，提前量 5 分钟 → 下一切换 12:00（1 小时后）超出窗口。
    expect(upcomingTierSwitch(beijing(21, 11), 5 * 60_000)).toBeNull()
  })

  it('never announces a weekend pseudo-boundary as an imminent switch (issue #33)', () => {
    // 周五 23:58：旧实现把周六 09:00 当切换点（lead 10h 内可命中预告）；
    // 真实下一切换在周一 09:00（约 57h 后），任何常规提前量都不应预告。
    expect(upcomingTierSwitch(beijing(21, 23, 58), 10 * 60_000)).toBeNull()
    // 周一 08:58：周一 09:00 是真边界，2 分钟内正常预告转峰。
    const monday = upcomingTierSwitch(beijing(24, 8, 58), 5 * 60_000)
    expect(monday?.entering).toBe('peak')
    expect(monday?.atMs).toBe(beijing(24, 9))
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
