// @vitest-environment jsdom
/**
 * 智能体网络 Tab 的面板级契约。
 *
 * 数据来自会话行的 parentId（宿主把子智能体落成独立会话）。面板回答三个问题：
 * 有多少智能体、发生了多少次委派、哪一支链最贵。
 */

import { applyBuiltinCatalog } from '../src/client/pricing.ts'
import { BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES } from '../src/builtin-catalog.ts'

applyBuiltinCatalog(BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { bindSnapshotSelector } from './bind-snapshot-selector'
import { UsageBilling } from '../src/client/UsageBilling.tsx'
import { createBillingBudgetStore } from '../src/client/budget-store.ts'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const STATS = {
  total: { calls: 100, input: 1_000_000, output: 100_000, cacheHit: 400_000, cacheMiss: 600_000, cost: 3.2 },
  byModel: {},
  byDay: {},
  bySession: [
    { id: 'root', title: '构建射击游戏', calls: 98, cost: 1.86, lastActive: Date.UTC(2026, 9, 18, 0, 54, 0) },
    { id: 'sub-a', title: '你是关卡美术', calls: 35, cost: 0.92, lastActive: Date.UTC(2026, 9, 18, 0, 55, 0), parentId: 'root' },
    { id: 'sub-b', title: '你是武器美术', calls: 35, cost: 0.86, lastActive: Date.UTC(2026, 9, 18, 0, 56, 0), parentId: 'root' },
  ],
}

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

function makeProps(): ComponentProps<typeof UsageBilling> {
  const budgetStore = createBillingBudgetStore().create()
  return {
    wide: true,
    t,
    checkModels: async () => ({
      checked: true, available: true, models: 1, failures: 0, okProviders: [], badProviders: [],
    }),
    publishCosts: () => {},
    registerOpen: () => () => {},
    navigateToSession: () => 'opened',
    renderSlot: () => null,
    useStore: bindSnapshotSelector(budgetStore),
    actions: budgetStore.actions,
  } as unknown as ComponentProps<typeof UsageBilling>
}

describe('agents tab', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const body = url.includes('/api/billing/pricing') ? { source: 'builtin' } : STATS
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
    }))
  })

  it('lists the delegation tree with chain totals', async () => {
    const { container } = render(<UsageBilling {...makeProps()} />)
    fireEvent.click(container.querySelector('button')!)
    await screen.findByTestId('billing-tab-panel-overview')
    fireEvent.click(screen.getByTestId('billing-tab-agents'))
    await screen.findByTestId('billing-tab-panel-agents')

    const tree = screen.getByTestId('billing-agent-tree')
    // 三个节点：根 + 两个子智能体。
    expect(tree.textContent).toContain('构建射击游戏')
    expect(tree.textContent).toContain('你是关卡美术')
    expect(tree.textContent).toContain('你是武器美术')
    // 根行带链合计徽标（自身 + 两个子智能体）。
    expect(screen.getAllByTestId('billing-agent-chain').length).toBe(1)
  })

  it('summarizes agents, delegations and conversations', async () => {
    const { container } = render(<UsageBilling {...makeProps()} />)
    fireEvent.click(container.querySelector('button')!)
    await screen.findByTestId('billing-tab-panel-overview')
    fireEvent.click(screen.getByTestId('billing-tab-agents'))
    const summary = await screen.findByTestId('billing-agent-summary')

    expect(summary.textContent).toContain(t('agentsCount'))
    expect(summary.textContent).toContain(t('agentsDelegations'))
    // 3 个智能体（根 + 2 子）、2 次委派、1 个对话根。
    expect(summary.textContent).toContain('3')
    expect(summary.textContent).toContain('2')
  })
})
