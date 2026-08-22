/**
 * Export unit tests: CSV builders escape cells and keep stable column order;
 * file names carry the date range of the exported data.
 */

import { describe, expect, it } from 'vitest'
import { dayRowsCsv, exportFileName, sessionRowsCsv } from '../src/client/export.ts'

describe('dayRowsCsv', () => {
  it('emits a header and one line per date, sorted ascending', () => {
    const csv = dayRowsCsv({
      '2026-08-16': { calls: 2, input: 1000, output: 200, cacheHit: 100, cacheMiss: 900, cost: 0.5 },
      '2026-08-14': { calls: 1, input: 500, output: 100, cacheHit: 0, cacheMiss: 500, cost: 0.125 },
    })
    const lines = csv.split('\n')
    expect(lines[0]).toBe('date,calls,input,output,cache_hit,cache_miss,cost_cny')
    expect(lines[1]).toBe('2026-08-14,1,500,100,0,500,0.13')
    expect(lines[2]).toBe('2026-08-16,2,1000,200,100,900,0.50')
  })

  it('keeps only the header for an empty table', () => {
    expect(dayRowsCsv({}).split('\n')).toHaveLength(1)
  })
})

describe('sessionRowsCsv', () => {
  it('escapes commas, quotes and newlines in title cells', () => {
    const csv = sessionRowsCsv([
      { id: 's1', title: '修复 "登录", bug', cwd: '/home/ken/shop-web', calls: 3, cost: 1.2, lastActive: Date.UTC(2026, 7, 16, 8, 0, 0) },
    ])
    expect(csv).toContain('"修复 ""登录"", bug"')
    expect(csv).toContain('shop-web')
    expect(csv).toContain('2026-08-16T08:00:00.000Z')
  })

  it('falls back to empty cells when title/cwd are absent and lastActive is 0', () => {
    const csv = sessionRowsCsv([{ id: 's2', calls: 1, cost: 0.1, lastActive: 0 }])
    expect(csv.split('\n')[1]).toBe('s2,,,1,0.10,')
  })
})

describe('exportFileName', () => {
  it('carries the first and last date as the range', () => {
    expect(exportFileName('usage-daily', 'csv', ['2026-08-16', '2026-08-14'])).toBe('usage-daily-2026-08-14_2026-08-16.csv')
  })

  it('omits the range when there are no dates', () => {
    expect(exportFileName('usage-stats', 'json', [])).toBe('usage-stats.json')
  })
})
