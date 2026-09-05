/**
 * 提供商（通道）优先分组（P2/P3 合并后）：厂商区块的一级归属是调用实际发生的
 * llm 入口（腾讯云 TokenHub / 腾讯云 Token Plan / 未知路由），模型品牌只是行内
 * 徽标 + 副标；订阅通道行显示「订阅包含 ≈目录价预估」。
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

async function openProvidersTab() {
  const { container } = render(<UsageBilling {...makeProps()} />)
  fireEvent.click(container.querySelector('button')!)
  await screen.findByText('使用统计')
  fireEvent.click(await screen.findByTestId('billing-tab-providers'))
  await screen.findByTestId('billing-panel-providers')
  return screen.getByTestId('billing-panel-providers')
}

describe('provider-first channel grouping', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const body = url.includes('/api/billing/pricing')
        ? { source: 'builtin' }
        : {
            total: { calls: 2, input: 10000, output: 5000, cacheHit: 0, cacheMiss: 10000, cost: 1, reasoning: 0, officialCalls: 0, officialCost: 0 },
            byModel: { 'glm-5.3-flash': { calls: 2, input: 10000, output: 5000, cacheHit: 0, cacheMiss: 10000, cost: 1, reasoning: 0, officialCalls: 0, officialCost: 0, plan: false } },
            byDayModelsSite: {
              '2026-09-05': {
                'glm-5.3-flash': { 'site:https://tokenhub.tencentmaas.com': { calls: 2, input: 10000, output: 5000, cacheHit: 0, cacheMiss: 10000, cost: 1 } },
              },
            },
            updatedAt: 0,
          }
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
    }))
  })

  it('groups models under their gateway channel inside the providers section', async () => {
    const panel = await openProvidersTab()
    await waitFor(() => {
      expect(panel.textContent).toContain('腾讯云 TokenHub')
    })
    const groups = screen.getAllByTestId('billing-provider-group')
    const tokenhub = groups.find(group => group.textContent?.includes('腾讯云 TokenHub'))
    expect(tokenhub).toBeDefined()
    expect(tokenhub!.textContent).toContain('GLM-5.3-Flash')
    expect(tokenhub!.textContent).toContain('¥1.00')
  })

  it('labels unknown routes via locale instead of a raw bucket key', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const body = url.includes('/api/billing/pricing')
        ? { source: 'builtin' }
        : {
            total: { calls: 2, input: 10000, output: 5000, cacheHit: 0, cacheMiss: 10000, cost: 1, reasoning: 0, officialCalls: 0, officialCost: 0 },
            byModel: { 'glm-5.3-flash': { calls: 2, input: 10000, output: 5000, cacheHit: 0, cacheMiss: 10000, cost: 1, reasoning: 0, officialCalls: 0, officialCost: 0, plan: false } },
            byDayModelsSite: {
              '2026-09-05': {
                'glm-5.3-flash': { unknown: { calls: 2, input: 10000, output: 5000, cacheHit: 0, cacheMiss: 10000, cost: 1 } },
              },
            },
            updatedAt: 0,
          }
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
    }))
    const panel = await openProvidersTab()
    await waitFor(() => {
      expect(panel.textContent).toContain(t('channelUnknown'))
    })
  })
})

describe('subscription channel shows catalog-price estimate (P3)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const body = url.includes('/api/billing/pricing')
        ? { source: 'builtin' }
        : {
            total: { calls: 2, input: 10000, output: 5000, cacheHit: 0, cacheMiss: 10000, cost: 0, reasoning: 0, officialCalls: 0, officialCost: 0 },
            byModel: { 'glm-5.3': { calls: 2, input: 10000, output: 5000, cacheHit: 0, cacheMiss: 10000, cost: 0, reasoning: 0, officialCalls: 0, officialCost: 0, plan: true } },
            byDayModelsSite: {
              '2026-09-05': {
                'glm-5.3': { 'site:https://api.lkeap.cloud.tencent.com': { calls: 2, input: 10000, output: 5000, cacheHit: 0, cacheMiss: 10000, cost: 0 } },
              },
            },
            updatedAt: 0,
          }
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
    }))
  })

  it('shows 订阅包含 ≈ estimate for plan-channel model rows', async () => {
    const panel = await openProvidersTab()
    await waitFor(() => {
      expect(panel.textContent).toContain('腾讯云 Token Plan')
    })
    const groups = screen.getAllByTestId('billing-provider-group')
    const plan = groups.find(group => group.textContent?.includes('腾讯云 Token Plan'))
    expect(plan).toBeDefined()
    expect(plan!.textContent).toContain('GLM-5.3')
    // 订阅通道行：订阅包含 + 目录价预估（glm-5.3：输入 ¥8 / 输出 ¥28 → 0.22 元）。
    expect(plan!.textContent).toContain('订阅包含 ≈¥0.22')
  })
})
