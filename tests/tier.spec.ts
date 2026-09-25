import { applyBuiltinCatalog } from '../src/client/pricing.ts'
import { BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES } from '../src/builtin-catalog.ts'

// 测试套件承担宿主注入角色：目录与别名表在模块加载时全量注入（宿主 activate
// 同一入口），否则聚合/计价消费方读到空目录。
applyBuiltinCatalog(BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES)

/**
 * Peak/off-peak countdown and switch-notice derivation tests. Beijing peak
 * windows are 09:00–12:00 / 14:00–18:00 on weekdays; Saturday/Sunday are
 * all-day off-peak with no boundaries (issue #33).
 */

import { describe, expect, it } from 'vitest'
import { channelCountdown, channelUpcomingSwitch, formatSwitchCountdown, rateChannelOf, tierAt, tierCountdown, upcomingTierSwitch } from '../src/client/pricing.ts'

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

describe('rateChannelOf', () => {
  it('maps DeepSeek catalog models to the metered time-of-day window', () => {
    expect(rateChannelOf('flash', true)).toBe('deepseek-metered')
    expect(rateChannelOf('pro', false)).toBe('deepseek-metered')
  })

  it('maps zhipu models to the coding-plan window only when the plan exists', () => {
    expect(rateChannelOf('glm-5.3', true)).toBe('zhipu-coding-plan')
    // 无订阅（或按量）时智谱价全天统一，不涉及峰谷。
    expect(rateChannelOf('glm-5.3', false)).toBe('none')
  })

  it('returns none for unknown or missing models', () => {
    expect(rateChannelOf('some-unknown-model', true)).toBe('none')
    expect(rateChannelOf(undefined, true)).toBe('none')
    expect(rateChannelOf('', true)).toBe('none')
  })
})

describe('channelCountdown / channelUpcomingSwitch', () => {
  it('returns null for the none channel', () => {
    expect(channelCountdown(beijing(21, 10), 'none')).toBeNull()
    expect(channelUpcomingSwitch(beijing(21, 10), 'none', 60 * 60 * 1000)).toBeNull()
  })

  it('zhipu window: peak is 14:00–18:00 on weekdays only', () => {
    // 周五 13:00：谷档，距 14:00 峰起点 1h。
    const before = channelCountdown(beijing(21, 13), 'zhipu-coding-plan')
    expect(before?.tier).toBe('offPeak')
    expect(before?.nextSwitchInMs).toBe(60 * 60 * 1000)
    // 周五 15:00：峰档，距 18:00 峰终点 3h。
    const inside = channelCountdown(beijing(21, 15), 'zhipu-coding-plan')
    expect(inside?.tier).toBe('peak')
    expect(inside?.nextSwitchInMs).toBe(3 * 60 * 60 * 1000)
    // DeepSeek 的 09:00 边界对智谱窗口不存在：周五 10:00 仍是谷档，
    // 下一切换是当天 14:00（4h）。
    const morning = channelCountdown(beijing(21, 10), 'zhipu-coding-plan')
    expect(morning?.tier).toBe('offPeak')
    expect(morning?.nextSwitchInMs).toBe(4 * 60 * 60 * 1000)
  })

  it('zhipu window: weekend has no boundary, rolling to Monday 14:00', () => {
    // 周六 10:00 → 周一 14:00：周六剩余 14h + 周日 24h + 周一 14h = 52h。
    const saturday = channelCountdown(beijing(22, 10), 'zhipu-coding-plan')
    expect(saturday?.tier).toBe('offPeak')
    expect(saturday?.nextSwitchInMs).toBe(52 * 60 * 60 * 1000)
  })

  it('zhipu channel announces the 14:00 peak start within the lead window', () => {
    const soon = channelUpcomingSwitch(beijing(21, 13, 45), 'zhipu-coding-plan', 30 * 60 * 1000)
    expect(soon).not.toBeNull()
    expect(soon?.entering).toBe('peak')
    expect(soon?.atMs).toBe(beijing(21, 14))
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

/**
 * 中国法定节假日的峰谷判档（issue #73）。
 * 官方口径（2026-09-19 API 峰谷时间说明）：调休上班的周末、中国法定节假日
 * 全天均按空闲时段计费。
 */
describe('中国法定节假日', () => {
  /**
   * 北京时间任意日期的 epoch 毫秒。**不要复用上面的 beijing()**：它按固定
   * 2026-08 日历、且只在 hour ≥ 8 时成立；跨月/跨年用例必须按 YYYY-MM-DD 构造。
   */
  function beijingDate(date: string, hour: number, minute = 0): number {
    const [year, month, day] = date.split('-').map(Number)
    // 北京 = UTC+8：按字面量构造 UTC 后整体减 8h，任意小时（含跨日）都正确。
    return Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1, hour, minute, 0, 0) - 8 * 3_600_000
  }

  it('法定节假日落在工作日时按低谷计', () => {
    // 中秋节（周五）16:33：修复前判 peak，现应为 offPeak。
    expect(tierAt(beijingDate('2026-09-25', 16, 33))).toBe('offPeak')
    // 国庆（周四 / 周一）落在峰段内同样是低谷。
    expect(tierAt(beijingDate('2026-10-01', 10))).toBe('offPeak')
    expect(tierAt(beijingDate('2026-10-05', 15))).toBe('offPeak')
  })

  it('调休上班的周末仍按低谷（不做「非空闲日 → 高峰」的反向推断）', () => {
    // 2026-09-20 是周日调休上班日，官方同样按空闲时段计费。
    expect(tierAt(beijingDate('2026-09-20', 10))).toBe('offPeak')
  })

  it('普通工作日与假期后首个工作日仍是高峰（回归保护）', () => {
    expect(tierAt(beijingDate('2026-09-24', 16, 33))).toBe('peak')
    expect(tierAt(beijingDate('2026-10-08', 10))).toBe('peak')
  })

  it('倒计时跨过长假（扫描窗口必须覆盖 > 9 天）', () => {
    // 节前最后工作日的深夜 20:00 → 10-08 09:00 = 181h（≈7.5 天）：
    // 原 7 天窗口扫不到，会落进兜底伪边界（把 10-01 09:00 当成切换点）。
    const beforeRun = tierCountdown(beijingDate('2026-09-30', 20))
    expect(beforeRun.tier).toBe('offPeak')
    expect(beforeRun.nextSwitchInMs).toBe(181 * 60 * 60 * 1000)
    // 假期最后一夜 23:00 → 10-08 09:00 = 10h。
    expect(tierCountdown(beijingDate('2026-10-07', 23)).nextSwitchInMs).toBe(10 * 60 * 60 * 1000)
  })

  it('表中未收录的年份退化为「仅周末低谷」，不引入伪边界', () => {
    // 2027-01-01 是周五；表只收录到 2026，故仍按工作日峰段判——需每年更新表。
    expect(tierAt(beijingDate('2027-01-01', 10))).toBe('peak')
    expect(tierCountdown(beijingDate('2027-01-01', 10)).nextSwitchInMs).toBe(2 * 60 * 60 * 1000)
  })

  it('智谱 Coding Plan 不套用 DeepSeek 的节假日口径', () => {
    // 智谱积分口径未见官方节假日说明，故节假日仍按工作日 14:00–18:00 判峰。
    // 若官方后续确认适用，同一批调用改成传 holidays=true 即可。
    expect(channelCountdown(beijingDate('2026-10-05', 15), 'zhipu-coding-plan')?.tier).toBe('peak')
  })
})
