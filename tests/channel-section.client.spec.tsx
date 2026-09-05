/**
 * 按通道聚合区块（P2）：明细 Tab 从 byDayModelsSite 汇总出「通道 → 模型」
 * 视图——同一模型经不同通道（腾讯云 TokenHub / 官方直连 / 未知路由）的
 * 用量与费用分组展示；厂商模型行同步出现通道徽标。
 *
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { bindSnapshotSelector } from './bind-snapshot-selector'
import { UsageBilling } from '../src/client/UsageBilling.tsx'
import { createBillingBudgetStore } from '../src/client/budget-store.ts'
import { zh } from '../src/client/locales.ts'

beforeEach(() => { localStorage.clear() })
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

const usage = { calls: 2, input: 100, output: 50, cacheHit: 0, cacheMiss: 100, cost: 1, reasoning: 0, officialCalls: 0, officialCost: 0 }

/** 通道视图 fixture：glm-5.3-flash 全部经 tokenhub 站点。 */
const STATS = {
  total: usage,
  byModel: { 'glm-5.3-flash': { ...usage, plan: false } },
  byDayModelsSite: {
    '2026-09-05': {
      'glm-5.3-flash': { 'site:https://tokenhub.tencentmaas.com': { calls: 2, input: 100, output: 50, cost: 1 } },
    },
  },
  updatedAt: 0,
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

async function openDashboard(): Promise<void> {
  const { container } = render(<UsageBilling {...makeProps()} />)
  fireEvent.click(container.querySelector('button')!)
  await screen.findByText('使用统计')
  fireEvent.click(await screen.findByTestId('billing-tab-providers'))
  await screen.findByTestId('billing-panel-providers')
}

describe('channel aggregation section (P2)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const body = url.includes('/api/billing/pricing') ? { source: 'builtin' } : STATS
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
    }))
  })

  it('groups usage by channel with per-model rows and vendor-row channel tags', async () => {
    await openDashboard()
    await waitFor(() => {
      expect(screen.queryByTestId('billing-panel-channels')).not.toBeNull()
    })
    // 已知 origin 显示品牌名；行含模型（目录显示名）与费用。
    const group = screen.getByTestId('billing-channel-group')
    expect(group.textContent).toContain('腾讯云 TokenHub')
    expect(group.textContent).toContain('GLM-5.3-Flash')
    expect(group.textContent).toContain('¥1.00')
    // 厂商模型行带通道徽标（direct:/unknown 通道不标）。
    const tags = screen.getAllByTestId('billing-channel-tag')
    expect(tags.some(tag => tag.textContent === '腾讯云 TokenHub')).toBe(true)
  })

  it('labels unknown routes via locale instead of a raw bucket key', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const body = url.includes('/api/billing/pricing')
        ? { source: 'builtin' }
        : {
            ...STATS,
            byDayModelsSite: {
              '2026-09-05': { 'glm-5.3-flash': { unknown: { calls: 2, input: 100, output: 50, cost: 1 } } },
            },
          }
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
    }))
    await openDashboard()
    await waitFor(() => {
      expect(screen.queryByTestId('billing-panel-channels')).not.toBeNull()
    })
    // unknown 桶不产生通道徽标；通道组名走「未知路由」文案。
    expect(screen.getByTestId('billing-channel-group').textContent).toContain(t('channelUnknown'))
    expect(screen.queryAllByTestId('billing-channel-tag')).toHaveLength(0)
  })
})
