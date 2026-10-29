// @vitest-environment jsdom
/** Exact local-date range aggregation and persistence (issue #107). */

import { beforeEach, describe, expect, it } from 'vitest'
import { sumByDayCustomRange } from '../src/client/domain/week.ts'
import type { KpiDayRow } from '../src/client/domain/types.ts'
import {
  KPI_CUSTOM_RANGE_STORAGE_KEY,
  loadKpiCustomRange,
  saveKpiCustomRange,
} from '../src/client/usage-billing-settings.ts'

function row(cost: number, calls: number, tokens: number): KpiDayRow {
  return {
    cost, calls, input: tokens * 2, output: tokens,
    cacheHit: tokens, cacheMiss: tokens, reasoning: tokens / 2,
  }
}

function localDay(offset: number): string {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

beforeEach(() => { localStorage.clear() })

describe('sumByDayCustomRange', () => {
  const byDay = {
    '2026-10-26': row(1, 1, 10),
    '2026-10-27': { ...row(2, 2, 20), cacheWrite: 5 },
    '2026-10-28': { ...row(3, 3, 40), cacheWrite: 7 },
    '2026-10-29': row(4, 4, 30),
  }

  it('includes both date boundaries and recomputes every KPI field', () => {
    expect(sumByDayCustomRange(byDay, '2026-10-27', '2026-10-28')).toEqual({
      cost: 5,
      calls: 5,
      input: 120,
      output: 60,
      cacheHit: 60,
      cacheMiss: 60,
      cacheWrite: 12,
      reasoning: 30,
      peakDay: '2026-10-28',
      peakTokens: 120,
    })
  })

  it('supports yesterday alone and returns an empty aggregate for dates without data', () => {
    expect(sumByDayCustomRange(byDay, '2026-10-27', '2026-10-27')).toMatchObject({
      cost: 2, calls: 2, peakDay: '2026-10-27', peakTokens: 60,
    })
    expect(sumByDayCustomRange(byDay, '2026-09-01', '2026-09-30')).toEqual({
      cost: 0, calls: 0, input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cacheWrite: 0,
      reasoning: 0, peakDay: undefined, peakTokens: 0,
    })
  })
})

describe('custom KPI range persistence', () => {
  it('defaults to yesterday and round-trips an explicit range', () => {
    expect(loadKpiCustomRange()).toEqual({ start: localDay(-1), end: localDay(-1) })
    saveKpiCustomRange({ start: '2026-10-01', end: '2026-10-15' })
    expect(loadKpiCustomRange()).toEqual({ start: '2026-10-01', end: '2026-10-15' })
  })

  it.each([
    '{broken',
    '{"start":"2026-02-30","end":"2026-03-01"}',
    '{"start":"2026-10-20","end":"2026-10-01"}',
    '{"start":"","end":"2026-10-01"}',
  ])('fails closed to yesterday for corrupt or invalid value %s', value => {
    localStorage.setItem(KPI_CUSTOM_RANGE_STORAGE_KEY, value)
    expect(loadKpiCustomRange()).toEqual({ start: localDay(-1), end: localDay(-1) })
  })
})
