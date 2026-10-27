// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { UsageBilling } from '../src/client/UsageBilling.tsx'
import { createBillingBudgetStore } from '../src/client/budget-store.ts'
import { bindSnapshotSelector } from './bind-snapshot-selector'
import { PEAK_ALERT_KEY, DEFAULT_PEAK_ALERT_CONFIG } from '../src/client/peak-alert.ts'
import { zh } from '../src/client/locales.ts'

const BASE_NOW_MS = Date.UTC(2026, 7, 21, 0, 45) // Friday 08:45 Beijing, 15 min before peak

function json(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

function makeProps(): ComponentProps<typeof UsageBilling> {
  const budgetStore = createBillingBudgetStore().create()
  return {
    wide: true,
    t: (key: string) => (zh as Record<string, string>)[key] ?? key,
    checkModels: async () => ({ checked: true, available: true, models: 1, failures: 0, okProviders: [], badProviders: [] }),
    publishCosts: () => {},
    registerOpen: () => () => {},
    renderSlot: () => null,
    useStore: bindSnapshotSelector(budgetStore),
    actions: budgetStore.actions,
  } as unknown as ComponentProps<typeof UsageBilling>
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('peak alert queue-summary ordering', () => {
  it('waits for the first summary instead of dropping queue copy in a mount-time race', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(BASE_NOW_MS)
    localStorage.setItem(PEAK_ALERT_KEY, JSON.stringify({
      ...DEFAULT_PEAK_ALERT_CONFIG, enabled: true, leadMin: 30, webNotify: false,
    }))
    let resolveSummary!: (response: Response) => void
    const summaryResponse = new Promise<Response>(resolve => { resolveSummary = resolve })
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/billing/task-queue-summary')) return summaryResponse
      if (url.includes('/api/billing/usage-stats')) {
        return Promise.resolve(json({ byTurn: [{ model: 'deepseek-flash' }] }))
      }
      return Promise.resolve(json({}))
    }))

    render(<UsageBilling {...makeProps()} />)
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(screen.queryByTestId('billing-peak-alert')).toBeNull()

    await act(async () => {
      resolveSummary(json({ supported: true, tier: 'peak', nextSwitchInMs: 15 * 60_000, queuedCount: 2 }))
      await summaryResponse
      await Promise.resolve()
    })
    expect(screen.getByTestId('billing-peak-alert')).toBeTruthy()
    expect(screen.getByTestId('billing-peak-queue-note').textContent).toContain('2 个排队任务')
  })
})
