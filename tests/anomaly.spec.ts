/**
 * Cost-spike anomaly detection unit tests (P1-2).
 */

import { describe, expect, it } from 'vitest'
import { flagAnomalies, type AnomalyRound } from '../src/client/anomaly.ts'

/** One round row helper: spread defaults under the caller's overrides. */
function round(partial: Partial<AnomalyRound>): AnomalyRound {
  return { sessionId: 's1', turn: 0, cost: 0, output: 0, input: 0, cacheHit: 0, cacheMiss: 0, ...partial }
}

describe('flagAnomalies', () => {
  it('flags a turn whose cost exceeds the rolling baseline', () => {
    const rounds = [
      round({ turn: 1, cost: 1, output: 100, input: 100 }),
      round({ turn: 2, cost: 1, output: 100, input: 100 }),
      round({ turn: 3, cost: 1, output: 100, input: 100 }),
      // 10x 基线成本 → 突增；输出/输入未同步放大 → 无归因 chip。
      round({ turn: 4, cost: 10, output: 100, input: 100 }),
    ]
    const flags = flagAnomalies(rounds)
    expect(flags).toHaveLength(1)
    expect(flags[0]?.sessionId).toBe('s1')
    expect(flags[0]?.turn).toBe(4)
    expect(flags[0]?.cost).toBe(10)
    expect(flags[0]?.reasons).toEqual([])
  })

  it('attributes output growth when output also spikes', () => {
    const rounds = [
      round({ turn: 1, cost: 1, output: 100, input: 100 }),
      round({ turn: 2, cost: 10, output: 1000, input: 100 }),
    ]
    const flags = flagAnomalies(rounds)
    expect(flags[0]?.reasons).toContain('output-growth')
    expect(flags[0]?.reasons).not.toContain('context-bloat')
  })

  it('attributes context bloat when input also spikes', () => {
    const rounds = [
      round({ turn: 1, cost: 1, output: 100, input: 100 }),
      round({ turn: 2, cost: 10, output: 100, input: 1000 }),
    ]
    const flags = flagAnomalies(rounds)
    expect(flags[0]?.reasons).toContain('context-bloat')
  })

  it('attributes a cache-hit drop when the hit rate falls sharply', () => {
    const rounds = [
      round({ turn: 1, cost: 1, output: 100, input: 100, cacheHit: 90, cacheMiss: 10 }),
      // 成本突增 + 命中率从 90% 掉到 10%。
      round({ turn: 2, cost: 10, output: 100, input: 100, cacheHit: 10, cacheMiss: 90 }),
    ]
    const flags = flagAnomalies(rounds)
    expect(flags[0]?.reasons).toContain('cache-hit-drop')
  })

  it('skips zero-cost turns in the baseline and never flags them', () => {
    const rounds = [
      round({ turn: 1, cost: 0 }), // 订阅/未知模型：不参与基线。
      round({ turn: 2, cost: 1, output: 100, input: 100 }),
      round({ turn: 3, cost: 10, output: 1000, input: 100 }),
    ]
    const flags = flagAnomalies(rounds)
    expect(flags).toHaveLength(1)
    expect(flags[0]?.turn).toBe(3)
  })

  it('honors a cost threshold and returns nothing when disabled', () => {
    const rounds = [
      round({ turn: 1, cost: 1, output: 100, input: 100 }),
      round({ turn: 2, cost: 1.5, output: 150, input: 100 }), // 低于默认 2x 阈值。
    ]
    expect(flagAnomalies(rounds)).toEqual([])
    expect(flagAnomalies(rounds, { window: 0 })).toEqual([])
    expect(flagAnomalies(rounds, { threshold: 0 })).toEqual([])
  })

  it('keeps flags in input order across sessions', () => {
    const rounds = [
      round({ sessionId: 'a', turn: 1, cost: 1, output: 100, input: 100 }),
      round({ sessionId: 'a', turn: 2, cost: 1, output: 100, input: 100 }),
      round({ sessionId: 'b', turn: 5, cost: 10, output: 100, input: 100 }),
      round({ sessionId: 'c', turn: 2, cost: 10, output: 100, input: 100 }),
    ]
    const flags = flagAnomalies(rounds)
    expect(flags.map(flag => `${flag.sessionId}:${flag.turn}`)).toEqual(['b:5', 'c:2'])
  })
})
