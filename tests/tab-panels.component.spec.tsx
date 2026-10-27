// @vitest-environment jsdom
/**
 * UI 剧本 2（jsdom + @testing-library）：全部一级分区 panel testid 均存在。
 *
 * 概览/队列/账单/用量/趋势/上下文/智能体/费率/设置，
 * 每个 panel 都有 `data-testid="billing-tab-panel-<id>"`。本剧本打开 Modal 后
 * 逐个点击断言存在；切换逻辑在 usage-billing.client.spec.tsx 已覆盖。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { UsageBilling } from '../src/client/UsageBilling.tsx'
import { notifiedKeys } from '../src/client/domain/notify.ts'
import { createBillingBudgetStore } from '../src/client/budget-store.ts'
import { bindSnapshotSelector } from './bind-snapshot-selector'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  localStorage.clear()
  notifiedKeys.clear()
})

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

const TAB_IDS = ['overview', 'queue', 'providers', 'token', 'trends', 'context', 'agents', 'pricing', 'settings'] as const

describe('一级分区面板存在性', () => {
  it('逐个点击 9 个分区，每个 panel 都能渲染（条件渲染：仅 active panel 在 DOM）', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/billing/usage-stats')) {
        return new Response(JSON.stringify({
          total: { calls: 0, input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cost: 0, reasoning: 0 },
          byModel: {}, byDay: {}, byDayModels: {}, byDayModelsSite: {},
        }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      if (url.includes('/api/billing/task-queue')) {
        return new Response(JSON.stringify({
          supported: false, tier: 'peak', nextSwitchInMs: 0, tasks: [], workspaces: [], models: [],
        }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    }) as unknown as typeof fetch)

    const budgetStore = createBillingBudgetStore().create()
    const props = {
      wide: true,
      t,
      checkModels: async () => ({
        checked: true, available: true, models: 0, failures: 0, okProviders: [], badProviders: [],
      }),
      publishCosts: () => {},
      registerOpen: () => () => {},
      renderSlot: () => null,
      useStore: bindSnapshotSelector(budgetStore),
      actions: budgetStore.actions,
    } as unknown as Parameters<typeof UsageBilling>[0]

    const { getByTestId, queryByTestId } = render(<UsageBilling {...props} />)

    // 打开 Modal
    fireEvent.click(getByTestId('billing-trigger'))
    await waitFor(() => {
      expect(getByTestId('billing-dashboard')).toBeTruthy()
    })

    // 逐个点 6 Tab：每个 panel 都是「仅 active 渲染」——点击后旧 panel 卸载、新 panel 挂载
    for (const id of TAB_IDS) {
      fireEvent.click(getByTestId(`billing-tab-${id}`))
      await waitFor(() => {
        expect(queryByTestId(`billing-tab-panel-${id}`),
          `tab panel ${id} 缺失`).toBeTruthy()
      })
    }
  })
})
