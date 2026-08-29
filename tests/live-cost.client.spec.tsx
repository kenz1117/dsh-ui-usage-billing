/**
 * LiveCostBar derivation unit test: the pure helpers `sessionCostOf` and
 * `turnCostOf` map the usage-stats slice onto the current session's cumulative
 * and latest-turn cost; `lowQuotaChips` picks the subscription windows running
 * low. All degrade cleanly on missing input.
 */

import { describe, expect, it } from 'vitest'
import { lowQuotaChips, sessionCostOf, turnCostOf, type LiveStats, type QuotaSlice } from '../src/client/live-cost.tsx'

const BASE: LiveStats = {
  bySession: [
    { id: 'sess-1', cost: 2.4 },
    { id: 'sess-2', cost: 0.5 },
  ],
  byTurn: [
    { sessionId: 'sess-1', turn: 2, cost: 1.2 },
    { sessionId: 'sess-1', turn: 1, cost: 1.2 },
    { sessionId: 'sess-2', turn: 1, cost: 0.5 },
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
    expect(turnCostOf({ bySession: BASE.bySession ?? [], byTurn: [] }, 'sess-1')).toBe(0)
    expect(turnCostOf(null, 'sess-1')).toBe(0)
    expect(turnCostOf(BASE, undefined)).toBe(0)
  })
})

describe('lowQuotaChips', () => {
  const quotas: QuotaSlice[] = [
    { displayName: 'Kimi For Coding', status: 'ok', windows: [{ kind: 'monthly', remainingPercent: 70 }] },
    { displayName: 'Z.ai GLM', status: 'ok', windows: [{ kind: 'monthly', remainingPercent: 12 }, { kind: 'weekly', remainingPercent: 5 }] },
    { displayName: '小米 Token', status: 'ok', windows: [{ kind: 'monthly', remainingPercent: 25 }] },
  ]

  it('keeps only windows at or below the threshold, sorted ascending, capped at 3', () => {
    const chips = lowQuotaChips(quotas)
    expect(chips.map(c => c.pct)).toEqual([5, 12])
  })

  it('skips failed / unconfigured plans and takes the default threshold', () => {
    const bad: QuotaSlice[] = [
      { displayName: 'Unconfigured', status: 'not-configured', windows: [{ kind: 'monthly', remainingPercent: 0 }] },
      { displayName: 'Healthy', status: 'ok', windows: [{ kind: 'monthly', remainingPercent: 80 }] },
    ]
    expect(lowQuotaChips(bad)).toEqual([])
  })
})
