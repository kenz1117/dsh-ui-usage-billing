import { applyBuiltinCatalog } from '../src/client/pricing.ts'
import { BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES } from '../src/builtin-catalog.ts'

// 测试套件承担宿主注入角色：目录与别名表在模块加载时全量注入（宿主 activate
// 同一入口），否则费率表读到空目录。
applyBuiltinCatalog(BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES)

/**
 * 费率表 sticky 表头契约（issue #113）。
 *
 * 判据：费率表**自己**是滚动容器（挂 .ubTablewrapPricing），表头才能粘住——
 * position:sticky 相对最近的滚动容器定位，外层 .ubTablewrap 高度自适应从
 * 不滚动时 sticky 形同虚设。jsdom 不做布局，粘不住与否测不出，故此处只锁
 * 「类名绑定」，CSS 侧的 max-height / position:sticky 契约由 scripts/lint.mjs
 * 守卫 8 把关。
 *
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { bindSnapshotSelector } from './bind-snapshot-selector'
import { UsageBilling } from '../src/client/UsageBilling.tsx'
import { createBillingBudgetStore } from '../src/client/budget-store.ts'
import { zh } from '../src/client/locales.ts'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

describe('费率表 sticky 表头', () => {
  it('费率表挂独立滚动容器类名，表头随表体滚动固定', async () => {
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

    const { getByTestId } = render(<UsageBilling {...props} />)
    fireEvent.click(getByTestId('billing-trigger'))
    await waitFor(() => {
      expect(getByTestId('billing-dashboard')).toBeTruthy()
    })

    fireEvent.click(getByTestId('billing-tab-pricing'))
    await waitFor(() => {
      expect(getByTestId('billing-tab-panel-pricing')).toBeTruthy()
    })

    // 表体容器：必须同时是通用表格容器与「独立滚动容器」变体。
    // 类名在 CSS Modules 下带模块哈希后缀（ubTablewrap_e63324），故用前缀
    // 匹配并排除变体名，避免 ubTablewrapPricing 同时满足第一个断言。
    const table = getByTestId('billing-pricing-table')
    expect(table.className).toMatch(/ubTablewrap(?!Pricing)/)
    expect(table.className).toMatch(/ubTablewrapPricing/)

    // 表头存在且有列名（sticky 的落点就是这些 th）。
    const head = table.querySelector('thead')
    expect(head).toBeTruthy()
    expect(head?.querySelectorAll('th').length ?? 0).toBeGreaterThan(0)
  })
})
