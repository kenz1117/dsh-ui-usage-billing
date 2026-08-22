// @vitest-environment jsdom

/**
 * Peak-alert engine unit tests: preference persistence (localStorage), the
 * disabled/mode/dedupe gates of computePeakAlert, and the negative case when
 * no switch is approaching.
 */

import { afterEach, describe, expect, it } from 'vitest'
import { computePeakAlert, DEFAULT_PEAK_ALERT_CONFIG, loadPeakAlertConfig, savePeakAlertConfig } from '../src/client/peak-alert.ts'

afterEach(() => { localStorage.clear() })

/** 北京时间 08:45（UTC 00:45，周五）→ 距 09:00 峰时边界 15 分钟。 */
const BASE_NOW_MS = Date.UTC(2026, 7, 21, 0, 45)

describe('config persistence', () => {
  it('round-trips a saved config', () => {
    savePeakAlertConfig({ enabled: true, leadMin: 5, position: 'center', webNotify: false, mode: 'peak' })
    expect(loadPeakAlertConfig()).toEqual({ enabled: true, leadMin: 5, position: 'center', webNotify: false, mode: 'peak' })
  })

  it('falls back to defaults on missing or corrupt config', () => {
    expect(loadPeakAlertConfig()).toEqual(DEFAULT_PEAK_ALERT_CONFIG)
    localStorage.setItem('dsh-billing-peak-alert-v1', '{oops')
    expect(loadPeakAlertConfig()).toEqual(DEFAULT_PEAK_ALERT_CONFIG)
  })
})

describe('computePeakAlert', () => {
  it('returns null when disabled', () => {
    expect(computePeakAlert(BASE_NOW_MS, { ...DEFAULT_PEAK_ALERT_CONFIG, enabled: false }, 0)).toBeNull()
  })

  it('hits when a switch is within the lead window', () => {
    const hit = computePeakAlert(BASE_NOW_MS, { ...DEFAULT_PEAK_ALERT_CONFIG, enabled: true, leadMin: 30, mode: 'both' }, 0)
    expect(hit).not.toBeNull()
    expect(hit?.entering).toBe('peak')
    expect(hit?.atMs).toBe(BASE_NOW_MS + 15 * 60_000)
  })

  it('respects the mode filter', () => {
    // 即将进入峰时：mode=offPeak 应忽略。
    expect(computePeakAlert(BASE_NOW_MS, { ...DEFAULT_PEAK_ALERT_CONFIG, enabled: true, leadMin: 30, mode: 'offPeak' }, 0)).toBeNull()
    expect(computePeakAlert(BASE_NOW_MS, { ...DEFAULT_PEAK_ALERT_CONFIG, enabled: true, leadMin: 30, mode: 'peak' }, 0)).not.toBeNull()
  })

  it('ignores the already-alerted switch point', () => {
    const hit = computePeakAlert(BASE_NOW_MS, { ...DEFAULT_PEAK_ALERT_CONFIG, enabled: true, leadMin: 30, mode: 'both' }, 0)
    expect(computePeakAlert(BASE_NOW_MS, { ...DEFAULT_PEAK_ALERT_CONFIG, enabled: true, leadMin: 30, mode: 'both' }, hit?.atMs ?? 0)).toBeNull()
  })

  it('returns null when no switch is approaching', () => {
    // 北京时间 12:30（UTC 04:30，周五）：距 14:00 边界 90 分钟，超出 30 分钟提前量。
    const noon = Date.UTC(2026, 7, 21, 4, 30)
    expect(computePeakAlert(noon, { ...DEFAULT_PEAK_ALERT_CONFIG, enabled: true, leadMin: 30, mode: 'both' }, 0)).toBeNull()
  })
})
