/**
 * Share/recost-derivation unit tests: the byTier peak/off-peak split feeding
 * the trend panel (per-call attribution now lives in the server document) and
 * the user-price display re-costing over the day×model grid.
 */

import { describe, expect, it } from 'vitest'
import { recostWithUserPrices, lastSevenDays, type UsageStats } from '../src/client/UsageBilling.tsx'
import { applyUserPrices, getUserPrices } from '../src/client/pricing.ts'

/** 最小可用统计文档：day×model 一格 + 同日聚合。 */
function statsFixture(): UsageStats {
  return {
    total: { calls: 2, input: 200, output: 100, cacheHit: 100, cacheMiss: 100, cost: 0.001, reasoning: 0 },
    byModel: {
      flash: { calls: 1, input: 100, output: 50, cacheHit: 50, cacheMiss: 50, cost: 0.0006, reasoning: 0 },
      mystery: { calls: 1, input: 100, output: 50, cacheHit: 50, cacheMiss: 50, cost: 0, reasoning: 0 },
    },
    byDay: {
      '2026-08-21': { calls: 2, input: 200, output: 100, cacheHit: 100, cacheMiss: 100, cost: 0.001, reasoning: 0 },
    },
    byDayModels: {
      '2026-08-21': {
        flash: { calls: 1, input: 100, output: 50, cacheHit: 50, cacheMiss: 50, cost: 0.0006 },
        mystery: { calls: 1, input: 100, output: 50, cacheHit: 50, cacheMiss: 50, cost: 0 },
      },
    },
  }
}

describe('recostWithUserPrices', () => {
  it('re-costs user-priced models over the day×model grid and derives byDay/byModel/total', () => {
    applyUserPrices([{ key: 'mystery', input: 2, cacheHit: 0.2, output: 6 }])
    try {
      // mystery：miss 50×¥2 + hit 50×¥0.2 + out 50×¥6 = 100+10+300 = ¥410 / 1M。
      const recosted = recostWithUserPrices(statsFixture())
      const cell = recosted.byDayModels?.['2026-08-21']?.mystery
      expect(cell?.cost).toBeCloseTo(410 / 1_000_000, 12)
      // flash 未配价：保留宿主计价。
      expect(recosted.byDayModels?.['2026-08-21']?.flash.cost).toBe(0.0006)
      // byDay / byModel / total 从重算后的网格派生。
      expect(recosted.byDay['2026-08-21']?.cost).toBeCloseTo(0.0006 + 410 / 1_000_000, 12)
      expect(recosted.byModel.mystery.cost).toBeCloseTo(410 / 1_000_000, 12)
      expect(recosted.byModel.flash.cost).toBe(0.0006)
      expect(recosted.total.cost).toBeCloseTo(0.0006 + 410 / 1_000_000, 12)
    } finally {
      applyUserPrices([])
    }
  })

  it('returns the document untouched when no user prices are set', () => {
    applyUserPrices([])
    expect(getUserPrices()).toBeUndefined()
    const stats = statsFixture()
    expect(recostWithUserPrices(stats)).toBe(stats)
  })

  it('re-costs a model by source origin when a bound price exists', () => {
    // 带 byDayModelsSite 的统计：flash 在某中转站 origin 下的用量。
    const stats: UsageStats = {
      total: { calls: 1, input: 100, output: 50, cacheHit: 50, cacheMiss: 50, cost: 0.0006, reasoning: 0 },
      byModel: { flash: { calls: 1, input: 100, output: 50, cacheHit: 50, cacheMiss: 50, cost: 0.0006, reasoning: 0 } },
      byDay: { '2026-08-21': { calls: 1, input: 100, output: 50, cacheHit: 50, cacheMiss: 50, cost: 0.0006, reasoning: 0 } },
      byDayModels: { '2026-08-21': { flash: { calls: 1, input: 100, output: 50, cacheHit: 50, cacheMiss: 50, cost: 0.0006 } } },
      byDayModelsSite: {
        '2026-08-21': {
          flash: { 'site:https://api.relay.com': { calls: 1, input: 100, output: 50, cacheHit: 50, cacheMiss: 50, cost: 0.0006 } },
        },
      },
    }
    applyUserPrices([{ key: 'flash', origin: 'https://api.relay.com', input: 1, cacheHit: 0.1, output: 3 }])
    try {
      const recosted = recostWithUserPrices(stats)
      const cost = recosted.byDayModels?.['2026-08-21']?.flash.cost
      // miss 50×¥1 + hit 50×¥0.1 + out 50×¥3 = 50+5+150 = ¥205 / 1M。
      expect(cost).toBeCloseTo(205 / 1_000_000, 12)
    } finally {
      applyUserPrices([])
    }
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
