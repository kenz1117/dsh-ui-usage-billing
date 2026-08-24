// @vitest-environment jsdom
/**
 * 余额差对账提示渲染测试：当 `/api/billing/balance` 返回 `reconcile.kind === 'drift'`
 * 时，概览 Tab 顶部出现一条对账提示条；非 drift（如 ok）则不渲染。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-web-react'
import { UsageBilling, fetchReconcile } from '../src/client/UsageBilling.tsx'
import { createBillingBudgetStore } from '../src/client/budget-store.ts'
import { zh } from '../src/client/locales.ts'

beforeEach(() => { localStorage.clear() })

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

/** stub `/api/billing/usage-stats`（空文档）与 `/api/billing/balance`（给定 balances+reconcile）。 */
function stubBalanceApi(reconcile: object | undefined): void {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input)
    if (url.endsWith('/api/billing/usage-stats')) {
      const body = JSON.stringify({
        version: 3, source: 'session-logs',
        total: { calls: 0, input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cost: 0, reasoning: 0, officialCalls: 0, officialCost: 0 },
        byModel: {}, byDay: {}, byDayModels: {}, bySession: [],
      })
      return { ok: true, status: 200, json: async () => JSON.parse(body), text: async () => body }
    }
    if (url.endsWith('/api/billing/balance')) {
      const body = JSON.stringify({ balances: [], ...(reconcile === undefined ? {} : { reconcile }) })
      return { ok: true, status: 200, json: async () => JSON.parse(body), text: async () => body }
    }
    // 订阅/中转站等其它拉取：返回空，避免网络错误。
    return { ok: true, json: async () => ({ quotas: [] }) }
  }))
}

const makeProps = (): ComponentProps<typeof UsageBilling> => {
  const budgetStore = createBillingBudgetStore().create()
  return {
    wide: true,
    t,
    checkModels: async () => ({ checked: true, available: true, models: 1, failures: 0, okProviders: [], badProviders: [] }),
    publishCosts: () => {},
    registerOpen: () => () => {},
    renderSlot: () => null,
    useStore: bindSnapshotSelector(budgetStore),
    actions: budgetStore.actions,
  } as unknown as ComponentProps<typeof UsageBilling>
}

describe('余额差对账提示渲染', () => {
  it('fetchReconcile parses a drift notice from the balance response', async () => {
    stubBalanceApi({ kind: 'drift', spent: 12, todayOfficialCost: 2 })
    const notice = await fetchReconcile()
    expect(notice).toMatchObject({ kind: 'drift', spent: 12, todayOfficialCost: 2 })
  })

  it('renders the drift notice when balance reconcile reports drift', async () => {
    stubBalanceApi({ kind: 'drift', spent: 12, todayOfficialCost: 2 })
    const { container } = render(<UsageBilling {...makeProps()} />)
    fireEvent.click(container.querySelector('button')!)
    await screen.findByText('使用统计')
    // 诊断：字典应包含对账文案 key。
    expect(zh['billing.reconcileDrift'] as string).toBeTruthy()
    // 概览 Tab 顶部出现对账提示条。
    expect(await screen.findByTestId('billing-reconcile-notice')).toBeTruthy()
  })

  it('renders no notice when the reconcile kind is ok', async () => {
    stubBalanceApi({ kind: 'ok', spent: 5, todayOfficialCost: 5 })
    const { container } = render(<UsageBilling {...makeProps()} />)
    fireEvent.click(container.querySelector('button')!)
    await screen.findByText('使用统计')
    expect(screen.queryByTestId('billing-reconcile-notice')).toBeNull()
  })

  it('dismisses the drift notice for the rest of the day', async () => {
    stubBalanceApi({ kind: 'drift', spent: 12, todayOfficialCost: 2 })
    const { container } = render(<UsageBilling {...makeProps()} />)
    fireEvent.click(container.querySelector('button')!)
    await screen.findByText('使用统计')
    expect(await screen.findByTestId('billing-reconcile-notice')).toBeTruthy()
    // 点击前未记录忽略。
    expect(localStorage.getItem('dsh-billing:reconcile-dismissed')).toBeNull()
    fireEvent.click(screen.getByTestId('billing-reconcile-dismiss'))
    // 点击后横幅消失，且 localStorage 记下当天，避免当天再次出现。
    expect(screen.queryByTestId('billing-reconcile-notice')).toBeNull()
    expect(localStorage.getItem('dsh-billing:reconcile-dismissed')).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
  })
})
