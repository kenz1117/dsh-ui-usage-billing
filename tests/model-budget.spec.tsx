// @vitest-environment jsdom
/**
 * U-3：按模型预算。
 *
 * 纯函数（本月每模型消耗 / 档位判定）+ store 行为（setModelBudget 正数写入、
 * 零/负数移除、档位标记）+ 设置页 UI（本月消耗模型逐行展示预算输入框）。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { UsageBilling } from '../src/client/UsageBilling.tsx'
import { crossedModelBudgetTiers, monthCostByModel } from '../src/client/domain/model-budget.ts'
import { createBillingBudgetStore } from '../src/client/budget-store.ts'
import { notifiedKeys } from '../src/client/domain/notify.ts'
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
// 纯函数用例按参数传月份，固定串即可；UI 用例的 fixture 用当前月（见下方 CURRENT_MONTH）。
const MONTH = '2026-10'
// 组件按本地时区当前月过滤（today.slice(0, 7)）；fixture 跟随当前月，避免硬编码
// 月份跨月后「本月消耗模型行」消失、测试静默失效（2026-11-02 审计实录）。
const CURRENT_MONTH = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

function dayModels(cells: Record<string, number>): Record<string, Record<string, { cost: number }>> {
  const out: Record<string, Record<string, { cost: number }>> = {}
  for (const [date, perModel] of Object.entries(cells)) {
    out[`${MONTH}-${date}`] = Object.fromEntries(Object.entries(perModel).map(([k, cost]) => [k, { cost }]))
  }
  return out
}

describe('monthCostByModel（纯函数）', () => {
  it('按月前缀归并各模型 cost；跨月数据不计入', () => {
    const byDayModels = {
      ...dayModels({ '01': { flash: 1 }, pro: {} } as never),
    }
    // 手写而非复用 dayModels（它只接 cost 数）：
    const doc: Record<string, Record<string, { cost: number }>> = {
      '2026-10-01': { flash: { cost: 1.5 }, pro: { cost: 2 } },
      '2026-10-31': { flash: { cost: 0.5 } },
      '2026-09-30': { flash: { cost: 99 } },
    }
    void byDayModels
    expect(monthCostByModel(doc, MONTH)).toEqual({ flash: 2, pro: 2 })
  })

  it('undefined / 空表返回空对象', () => {
    expect(monthCostByModel(undefined, MONTH)).toEqual({})
    expect(monthCostByModel({}, MONTH)).toEqual({})
  })
})

describe('crossedModelBudgetTiers（纯函数）', () => {
  it('按 80/100 档判定；无预算或零消耗返回空', () => {
    expect(crossedModelBudgetTiers(85, 100)).toEqual([80])
    expect(crossedModelBudgetTiers(100, 100)).toEqual([80, 100])
    expect(crossedModelBudgetTiers(50, 100)).toEqual([])
    expect(crossedModelBudgetTiers(10, 0)).toEqual([])
    expect(crossedModelBudgetTiers(0, 10)).toEqual([])
  })
})

describe('budget store 按模型预算（store 行为）', () => {
  it('setModelBudget：正数写入、零/负数移除；markModelTierAlerted 就地补表', () => {
    const store = createBillingBudgetStore().create()
    type Snap = { modelBudgets: Record<string, number>; modelTierAlertDays: Record<string, string> }
    const snap = (): Snap => store.getSnapshot() as Snap
    // 框架 actions 已绑定 state 草稿（调用方只传业务参数，同 realdata spec 用法）
    store.actions.setModelBudget('flash', 10)
    expect(snap().modelBudgets['flash']).toBe(10)
    store.actions.setModelBudget('flash', 0)
    expect(snap().modelBudgets['flash']).toBeUndefined()
    store.actions.setModelBudget('flash', -5)
    expect(snap().modelBudgets['flash']).toBeUndefined()
    // 旧持久化状态缺字段：mark 就地补空表
    store.actions.markModelTierAlerted(['flash:80'], '2026-10-18')
    expect(snap().modelTierAlertDays['flash:80']).toBe('2026-10-18')
  })
})

describe('按模型预算（设置页 UI）', () => {
  function makeProps(): ComponentProps<typeof UsageBilling> {
    const budgetStore = createBillingBudgetStore().create()
    return {
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
    } as unknown as ComponentProps<typeof UsageBilling>
  }

  it('设置页展示本月消耗模型行 + 预算输入；输入写回 store', async () => {
    const stats = {
      total: { calls: 2, input: 300, output: 100, cacheHit: 200, cacheMiss: 100, cost: 2, reasoning: 0 },
      byModel: { flash: { calls: 1, input: 200, output: 50, cacheHit: 100, cacheMiss: 100, cost: 1.5, reasoning: 0 } },
      byDay: {},
      byDayModels: {
        // 组件按本地时区当前月过滤（today.slice(0, 7)）；fixture 跟随当前月，
        // 避免硬编码月份跨月后「本月消耗模型行」消失、测试静默失效。
        [`${CURRENT_MONTH}-18`]: { flash: { calls: 1, input: 200, output: 50, cacheHit: 100, cacheMiss: 100, cost: 1.5 } },
      },
      byDayModelsSite: {},
    }
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/billing/usage-stats')) {
        return new Response(JSON.stringify(stats), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    }) as unknown as typeof fetch)

    const rendered = render(<UsageBilling {...makeProps()} />)
    fireEvent.click(rendered.getByTestId('billing-trigger'))
    await waitFor(() => { expect(rendered.getByTestId('billing-dashboard')).toBeTruthy() })
    fireEvent.click(rendered.getByTestId('billing-tab-settings'))
    await waitFor(() => { expect(rendered.getByTestId('billing-model-budgets')).toBeTruthy() })

    // flash 行存在且显示本月消耗（¥1.50）
    const input = rendered.getByTestId('billing-model-budget-flash') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(rendered.getByTestId('billing-model-budget-cost-flash').textContent).toContain('1.50')

    // 输入预算 → store 写回（input value 反映）
    fireEvent.change(input, { target: { value: '10' } })
    await waitFor(() => { expect(input.value).toBe('10') })
  })
})
