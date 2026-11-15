/**
 * 通道可见性（issue #126 需求）：按通道桶隐藏部分提供商 / 通道。
 *
 * 钉三条不变量：
 * 1. 隐藏通道的用量从 total / byDay / byDayModels / byModel / bySite /
 *    byDayModelsSite 中**完整扣除**（不多扣不少扣）；
 * 2. **无法归属通道的用量保留**（旧格式会话没有三维维度——宁可多算，不可静默丢数）；
 * 3. 无三维数据时过滤整体不生效（不把用量显示成 0）。
 */

import { describe, expect, it } from 'vitest'
import {
  channelUsageOf, filterStatsByChannels, groupChannelsByName,
} from '../src/client/domain/channel-visibility.ts'
import type { UsageStats } from '../src/client/domain/types.ts'

function cell(calls: number, cost: number, input = 100, output = 50) {
  return { calls, input, output, cacheHit: 0, cacheMiss: input, cost }
}

function statsOf(): UsageStats {
  return {
    version: 4,
    total: { calls: 30, input: 3000, output: 1500, cacheHit: 0, cacheMiss: 3000, cost: 30, reasoning: 0 },
    byModel: {
      'flash': { calls: 20, input: 2000, output: 1000, cacheHit: 0, cacheMiss: 2000, cost: 20, reasoning: 0 },
      'pro': { calls: 10, input: 1000, output: 500, cacheHit: 0, cacheMiss: 1000, cost: 10, reasoning: 0 },
    },
    byDay: {
      '2026-11-14': { calls: 30, input: 3000, output: 1500, cacheHit: 0, cacheMiss: 3000, cost: 30, reasoning: 0 },
    },
    byDayModels: {
      '2026-11-14': {
        'flash': cell(20, 20, 2000, 1000),
        'pro': cell(10, 10, 1000, 500),
      },
    },
    byDayModelsSite: {
      '2026-11-14': {
        'flash': {
          'site:https://relay.example': cell(10, 15, 1000, 500),
          'direct:deepseek': cell(10, 5, 1000, 500),
        },
        'pro': {
          'direct:deepseek': cell(10, 10, 1000, 500),
        },
      },
    },
    bySite: {
      'site:https://relay.example': { calls: 10, input: 1000, output: 500, cacheHit: 0, cacheMiss: 1000, cost: 15, reasoning: 0 },
      'direct:deepseek': { calls: 20, input: 2000, output: 1000, cacheHit: 0, cacheMiss: 2000, cost: 15, reasoning: 0 },
    },
    bySession: [],
  } as unknown as UsageStats
}

describe('channelUsageOf', () => {
  it('aggregates each channel bucket over all days, cost descending', () => {
    const rows = channelUsageOf(statsOf())
    expect(rows.map(row => row.siteKey)).toEqual(['direct:deepseek', 'site:https://relay.example'])
    expect(rows[0]).toMatchObject({ siteKey: 'direct:deepseek', calls: 20, cost: 15 })
  })

  it('returns nothing when the three-dimensional dimension is missing', () => {
    const stats = statsOf()
    delete (stats as { byDayModelsSite?: unknown }).byDayModelsSite
    expect(channelUsageOf(stats)).toEqual([])
  })
})

describe('groupChannelsByName', () => {
  it('merges buckets sharing a display name', () => {
    const rows = channelUsageOf(statsOf())
    const groups = groupChannelsByName(rows, siteKey => siteKey === 'direct:deepseek' ? 'DeepSeek 官方' : 'relay.example')
    expect(groups.map(g => g.name).sort()).toEqual(['DeepSeek 官方', 'relay.example'])
    const official = groups.find(g => g.name === 'DeepSeek 官方')
    expect(official?.siteKeys).toEqual(['direct:deepseek'])
    expect(official?.cost).toBe(15)
    expect(official?.tokens).toBe(3000)
  })
})

describe('filterStatsByChannels', () => {
  it('excludes the hidden channel from every channel-attributable dimension', () => {
    const filtered = filterStatsByChannels(statsOf(), new Set(['site:https://relay.example']))
    // 隐藏中转站：其 10 次调用 / ¥15 从总量扣除（其余维度同步）。
    expect(filtered.total.calls).toBe(20)
    expect(filtered.total.cost).toBe(15)
    expect(filtered.byDay['2026-11-14']?.calls).toBe(20)
    expect(filtered.byDay['2026-11-14']?.cost).toBe(15)
    expect(filtered.byModel['flash']?.calls).toBe(10)
    expect(filtered.byModel['flash']?.cost).toBe(5)
    expect(filtered.byModel['pro']?.calls).toBe(10)
    expect(filtered.byDayModels['2026-11-14']?.['flash']?.calls).toBe(10)
    expect(filtered.byDayModels['2026-11-14']?.['flash']?.cost).toBe(5)
    expect(filtered.bySite['site:https://relay.example']).toBeUndefined()
    expect(filtered.bySite['direct:deepseek']?.cost).toBe(15)
    expect(Object.keys(filtered.byDayModelsSite?.['2026-11-14']?.['flash'] ?? {})).toEqual(['direct:deepseek'])
  })

  it('keeps usage that cannot be attributed to a channel (old-format rows)', () => {
    // 旧格式会话的账本行没有三维维度：其用量只在 byDay/byModel/total 里，
    // 隐藏通道不得把它一并扣掉（宁可多算，不可静默丢数）。
    const stats = statsOf()
    stats.byDay['2026-11-13'] = { calls: 7, input: 700, output: 350, cacheHit: 0, cacheMiss: 700, cost: 7, reasoning: 0 }
    stats.byModel['legacy'] = { calls: 7, input: 700, output: 350, cacheHit: 0, cacheMiss: 700, cost: 7, reasoning: 0 }
    stats.total.calls += 7
    stats.total.cost += 7
    const filtered = filterStatsByChannels(stats, new Set(['site:https://relay.example']))
    expect(filtered.total.calls).toBe(27)
    expect(filtered.total.cost).toBe(22)
    expect(filtered.byDay['2026-11-13']?.calls).toBe(7)
    expect(filtered.byModel['legacy']?.cost).toBe(7)
  })

  it('is a no-op when nothing is hidden or the channel dimension is missing', () => {
    const stats = statsOf()
    expect(filterStatsByChannels(stats, new Set())).toBe(stats)
    const withoutDim = statsOf()
    delete (withoutDim as { byDayModelsSite?: unknown }).byDayModelsSite
    expect(filterStatsByChannels(withoutDim, new Set(['direct:deepseek']))).toBe(withoutDim)
  })
})
