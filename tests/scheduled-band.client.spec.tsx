// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { applyBuiltinCatalog } from '../src/client/pricing.ts'
import { BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES } from '../src/builtin-catalog.ts'
import { effectiveRule, scheduleKey, type PeakSchedule } from '../src/peak-schedule.ts'
import { scheduledCountdown, modelBand, ruleForTurn, scheduleFields } from '../src/client/scheduled-band.ts'
import { computePeakAlert, DEFAULT_PEAK_ALERT_CONFIG } from '../src/client/peak-alert.ts'
import { LiveCostBar } from '../src/client/live-cost.tsx'
import { LIVE_COST_BAR_STORAGE_KEY } from '../src/client/usage-billing-settings.ts'
import { RoundCostChart } from '../src/client/round-chart.tsx'
import type { SessionId } from '@deepseek-ai/dsh-session/types'

const now = Date.UTC(2026, 10, 25, 2) // Wednesday 10:00 Beijing: native peak
const source = 'site:https://relay.example'
const turn = { sessionId: 's', turn: 1, model: 'flash', scheduleSource: source, cost: 1, input: 1, output: 1, cacheHit: 0, cacheMiss: 1, startedAt: now }
const schedule: PeakSchedule = { version: 2, models: { [scheduleKey(source, 'flash')]: { windows: [602, 720] } } }
beforeEach(() => applyBuiltinCatalog(BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES))
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); applyBuiltinCatalog([], {}) })

describe('source-scoped peak displays', () => {
  it('matches only the exact pair; the alert and indicator share the switch instant', () => {
    expect(modelBand(now, 'flash', false, turn, schedule)).toEqual({ tier: 'offPeak', nextSwitchInMs: 120000 })
    for (const scheduleSource of [undefined, 'direct:deepseek-account', 'site:https://elsewhere.example']) {
      expect(modelBand(now, 'flash', false, { model: 'flash', scheduleSource }, schedule)?.tier).toBe('peak')
    }
    expect(modelBand(now, 'pro', false, turn, schedule)?.tier).toBe('peak')
    const cfg = { ...DEFAULT_PEAK_ALERT_CONFIG, enabled: true }
    expect(computePeakAlert(now, cfg, 0, 'deepseek-metered', ruleForTurn(turn, schedule))?.atMs).toBe(now + 120000)
    expect(computePeakAlert(now, cfg, 0, 'deepseek-metered')).toBeNull() // queue retains native calendar
  })
  it('finds local-midnight switches, skips adjacent windows, and emits no imaginary switch for fixed bands', () => {
    const band = (time: string, overrides: Parameters<typeof effectiveRule>[1]) => scheduledCountdown(Date.parse(time), 'deepseek-metered', effectiveRule(source, { windows: [0, 1440], weekendOffPeak: false, ...overrides }))
    expect(band('2026-11-25T18:29Z', { utcOffsetMinutes: 330, holidays: ['20261126'] })).toEqual({ tier: 'peak', nextSwitchInMs: 60000 })
    expect(band('2026-11-25T00:59Z', { utcOffsetMinutes: 0, windows: [0, 60, 60, 120] })?.nextSwitchInMs).toBe(61 * 60000)
    for (const windows of [[], [0, 1440]]) expect(band('2026-11-25T00:00Z', { windows })?.nextSwitchInMs).toBe(Infinity)
    expect(band('2026-01-01T00:00Z', { utcOffsetMinutes: 0, holidays: ['20270101'] })?.nextSwitchInMs).toBe(365 * 86400000)
    // Countdown uses fixed wall-clock offsets and elapsed UTC minutes, never host DST.
    for (const [time, minutes] of [
      ['2026-03-08T06:59Z', 61],  // one minute before the New York spring jump
      ['2026-11-01T05:59Z', 121], // one minute before the New York fall repeat
    ] as const) {
      expect(band(time, { utcOffsetMinutes: -300, windows: [0, 180] })).toEqual({
        tier: 'peak', nextSwitchInMs: minutes * 60000,
      })
    }
  })
  it('colors each historical row by its recorded tier', () => {
    const view = render(<RoundCostChart rounds={[{ ...turn, scheduleTier: 'offPeak' }, { ...turn, turn: 2 }]} flags={[]} currency="cny" t={key => key} />)
    const cols = view.container.querySelectorAll('[class*="roundsBarCol_"]')
    expect(cols[0]?.className).toContain('roundsBarColOff')
    expect(cols[1]?.className).toContain('roundsBarColPeak')
  })
  it('drops only a malformed optional schedule', () => {
    expect(scheduleFields({ version: 2, models: { bad: {} } })).toEqual({})
    expect(scheduleFields(schedule)).toEqual({ peakSchedule: schedule })
  })
  it('reads the active session pair from the wire and hides countdown text for constant bands', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(now)
    localStorage.setItem(LIVE_COST_BAR_STORAGE_KEY, '{"show":true,"position":"below"}')
    vi.stubGlobal('fetch', vi.fn(async (input: unknown) => new Response(JSON.stringify(String(input).includes('usage-stats') ? {
      byTurn: [{ ...turn, sessionId: 'different', scheduleSource: undefined, turn: 20 }, turn],
      peakSchedule: { version: 2, models: { [scheduleKey(source, 'flash')]: { windows: [] } } },
    } : { quotas: [] }))))
    render(<LiveCostBar sessionId={'s' as SessionId} t={key => key} seat="below" />)
    expect((await screen.findByTestId('billing-live-tier')).textContent).toBe('tierOff')
    expect(screen.getByTestId('billing-live-cost-bar').textContent).not.toMatch(/tierTo|Infinity|NaN/)
  })
})
