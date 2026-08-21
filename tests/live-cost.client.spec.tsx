/**
 * LiveCostBar derivation unit test: the pure helpers `sessionCostOf` and
 * `turnCostOf` map the usage-stats slice onto the current session's cumulative
 * and latest-turn cost, degrading to 0 when the session or its spend is absent.
 */

import { describe, expect, it } from 'vitest'
import { sessionCostOf, turnCostOf, type LiveStats } from '../src/client/live-cost.tsx'

const BASE: LiveStats = {
  bySession: [
    { id: 'sess-1', title: 'fix bug', cwd: '/a', calls: 3, cost: 2.4, lastActive: 5 },
    { id: 'sess-2', title: 'api', cwd: '/b', calls: 1, cost: 0.5, lastActive: 5 },
  ],
  byTurn: [
    { sessionId: 'sess-1', turn: 2, model: 'flash', input: 1, output: 1, cacheHit: 0, cacheMiss: 1, cost: 1.2, startedAt: 5 },
    { sessionId: 'sess-1', turn: 1, model: 'flash', input: 1, output: 1, cacheHit: 0, cacheMiss: 1, cost: 1.2, startedAt: 4 },
    { sessionId: 'sess-2', turn: 1, model: 'flash', input: 1, output: 1, cacheHit: 0, cacheMiss: 1, cost: 0.5, startedAt: 5 },
  ],
}

describe('sessionCostOf', () => {
  it('returns the matching session cumulative cost', () => {
    expect(sessionCostOf(BASE, 'sess-1')).toBe(2.4)
  })

  it('returns 0 for an absent session or when stats is null', () => {
    expect(sessionCostOf(BASE, 'sess-3')).toBe(0)
    expect(sessionCostOf(null, 'sess-1')).toBe(0)
    expect(sessionCostOf(BASE, undefined)).toBe(0)
  })
})

describe('turnCostOf', () => {
  it('returns the latest turn cost for the session', () => {
    expect(turnCostOf(BASE, 'sess-1')).toBe(1.2)
    expect(turnCostOf(BASE, 'sess-2')).toBe(0.5)
  })

  it('returns 0 for an absent session, no turns, or no stats', () => {
    expect(turnCostOf(BASE, 'sess-3')).toBe(0)
    expect(turnCostOf({ bySession: BASE.bySession, byTurn: [] }, 'sess-1')).toBe(0)
    expect(turnCostOf(null, 'sess-1')).toBe(0)
    expect(turnCostOf(BASE, undefined)).toBe(0)
  })
})
