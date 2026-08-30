// @vitest-environment jsdom
/**
 * LiveCostBar derivation unit test: the pure helpers `sessionCostOf` and
 * `turnCostOf` map the usage-stats slice onto the current session's cumulative
 * and latest-turn cost; `lowQuotaChips` picks the subscription windows running
 * low. All degrade cleanly on missing input.
 *
 * Also covers the live-cost capsule display pref (设置 Tab「平价消耗胶囊」开关):
 * `loadLiveCostBarPrefs` degrade-to-default parsing and the component's
 * visibility gate driven by localStorage + the cross-tree CustomEvent.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { LiveCostBar, lowQuotaChips, sessionCostOf, turnCostOf, type LiveStats, type QuotaSlice } from '../src/client/live-cost.tsx'
import {
  LIVE_COST_BAR_PREF_EVENT,
  LIVE_COST_BAR_STORAGE_KEY,
  loadLiveCostBarPrefs,
  saveLiveCostBarPrefs,
} from '../src/client/usage-billing-settings.ts'
import { zh } from '../src/client/locales.ts'

beforeEach(() => { localStorage.clear() })

afterEach(() => { cleanup() })

const t = ((key: string): string => (zh as Record<string, string>)[key] ?? key) as (key: keyof typeof zh) => string

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

describe('loadLiveCostBarPrefs / saveLiveCostBarPrefs (平价消耗胶囊显隐)', () => {
  it('defaults to shown when the key is missing', () => {
    expect(loadLiveCostBarPrefs()).toEqual({ show: true })
  })

  it('round-trips an explicit hide through save + load', () => {
    saveLiveCostBarPrefs({ show: false })
    expect(loadLiveCostBarPrefs()).toEqual({ show: false })
    saveLiveCostBarPrefs({ show: true })
    expect(loadLiveCostBarPrefs()).toEqual({ show: true })
  })

  it('falls back to shown on corrupt JSON or non-boolean values (only explicit false hides)', () => {
    localStorage.setItem(LIVE_COST_BAR_STORAGE_KEY, '{broken json')
    expect(loadLiveCostBarPrefs()).toEqual({ show: true })
    localStorage.setItem(LIVE_COST_BAR_STORAGE_KEY, '{"show":"yes"}')
    expect(loadLiveCostBarPrefs()).toEqual({ show: true })
    localStorage.setItem(LIVE_COST_BAR_STORAGE_KEY, '{"show":false}')
    expect(loadLiveCostBarPrefs()).toEqual({ show: false })
  })
})

describe('LiveCostBar visibility gate (设置 Tab 开关跨树生效)', () => {
  const sessionId = 'sess-1' as SessionId

  it('renders nothing when the pref hides the capsule (pure display gate)', () => {
    localStorage.setItem(LIVE_COST_BAR_STORAGE_KEY, '{"show":false}')
    const view = render(<LiveCostBar sessionId={sessionId} t={t} />)
    // 关闭后整条不渲染（返回 null，dock 槽位安全）。
    expect(screen.queryByTestId('billing-live-cost-bar')).toBeNull()
    view.unmount()
  })

  it('renders the capsule by default and re-reads the pref on the broadcast CustomEvent (same document) and the storage event (cross tab)', async () => {
    const view = render(<LiveCostBar sessionId={sessionId} t={t} />)
    // 默认显示：fee-bar 胶囊条在 dock 上常驻。
    expect(screen.getByTestId('billing-live-cost-bar')).toBeTruthy()
    // 设置 Tab 关闭：写 localStorage + 广播 CustomEvent → 胶囊条即时消失。
    localStorage.setItem(LIVE_COST_BAR_STORAGE_KEY, '{"show":false}')
    await act(async () => { window.dispatchEvent(new Event(LIVE_COST_BAR_PREF_EVENT)) })
    expect(screen.queryByTestId('billing-live-cost-bar')).toBeNull()
    // 其它标签页同步：storage 事件也能驱动重读。
    localStorage.setItem(LIVE_COST_BAR_STORAGE_KEY, '{"show":true}')
    await act(async () => { window.dispatchEvent(new StorageEvent('storage')) })
    expect(screen.getByTestId('billing-live-cost-bar')).toBeTruthy()
    view.unmount()
  })
})
