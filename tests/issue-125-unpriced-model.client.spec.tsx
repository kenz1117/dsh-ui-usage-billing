// @vitest-environment jsdom
/**
 * issue #125：中转站模型 id 带路由前缀（`cn:deepseek v4.1`）→ 费用恒为 0。
 *
 * 计价修复（冒号分段归一 + `deepseek-v4.1` 别名）由 tests/pricing.spec.ts 覆盖；
 * 本文件钉两条**可发现性**回归——用户补价的前提是「看得见未收录的模型 id」：
 * 1. 概览横幅直接列出未收录 id（此前只能回会话日志手抄，抄错即「自定义价无效」）；
 * 2. 「去补价」按钮跳到设置页的自定义单价分区，且未收录 id 进该分区的候选列表。
 */

import { applyBuiltinCatalog } from '../src/client/pricing.ts'
import { BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES } from '../src/builtin-catalog.ts'

// 测试套件承担宿主注入角色：目录与别名表在模块加载时全量注入（宿主 activate
// 同一入口），否则计价消费方读到空目录。
applyBuiltinCatalog(BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { bindSnapshotSelector } from './bind-snapshot-selector'
import { UsageBilling } from '../src/client/UsageBilling.tsx'
import { createBillingBudgetStore } from '../src/client/budget-store.ts'
import { zh } from '../src/client/locales.ts'

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

/** 未收录模型 id（中转站路由前缀形态；两条一起给，验证列表而非单条渲染）。 */
const UNPRICED = ['cn:deepseek v4.1', 'cn：deepseek v4.1']

beforeEach(() => {
  localStorage.clear()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function stubUsageStats(configured: () => unknown[] = () => []): void {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    const body = url.endsWith('/pricing-models')
      ? { models: configured().map(key => ({ key, name: key, channel: 'Relay', route: 'relay', origin: 'https://relay.test' })), partial: false }
      : url.includes('/api/billing/pricing')
      ? { source: 'builtin' }
      : {
          total: { calls: 2, input: 10000, output: 5000, cacheHit: 0, cacheMiss: 10000, cost: 0, reasoning: 0 },
          byModel: {
            'cn:deepseek v4.1': { calls: 2, input: 10000, output: 5000, cacheHit: 0, cacheMiss: 10000, cost: 0, reasoning: 0, officialCalls: 0, officialCost: 0 },
          },
          byDay: {},
          byDayModels: {},
          byDayModelsSite: {},
          unpricedModels: UNPRICED,
          updatedAt: 0,
        }
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
  }))
}

function makeProps(): ComponentProps<typeof UsageBilling> {
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

describe('issue #125 未收录模型的可发现性', () => {
  it('locks and deduplicates selections, preserves edits across discovery and requires explicit prices', async () => {
    let keys = ['relay：unknown', 'flash']
    stubUsageStats(() => keys)
    render(<UsageBilling {...makeProps()} />)
    fireEvent.click(screen.getByTestId('billing-trigger'))
    fireEvent.click(await screen.findByTestId('billing-unpriced-fix'))
    const picker = await screen.findByTestId('billing-price-picker')
    const select = (key: string) => fireEvent.change(picker, { target: { value: JSON.stringify([key, 'https://relay.test']) } })
    await waitFor(() => expect(picker.textContent).toContain('relay：unknown'))
    select('relay：unknown'); select('relay：unknown')
    expect(screen.getAllByTestId('billing-user-price-row')).toHaveLength(1)
    expect((screen.getByTestId('billing-user-price-model') as HTMLInputElement).readOnly).toBe(true)
    const save = screen.getByTestId('billing-user-price-save') as HTMLButtonElement
    expect(save.disabled).toBe(true)
    const inputs = screen.getByTestId('billing-user-price-normal').querySelectorAll('input')
    for (const input of inputs) fireEvent.change(input, { target: { value: '0' } })
    expect(save.disabled).toBe(false)
    const off = screen.getByTestId('billing-user-price-offpeak').querySelectorAll('input')
    fireEvent.change(off[0]!, { target: { value: '0' } }); expect(save.disabled).toBe(true)
    for (const input of [...off].slice(1)) fireEvent.change(input, { target: { value: '0' } })
    expect(save.disabled).toBe(false)
    keys = ['flash', 'added']
    fireEvent.focus(window)
    await waitFor(() => expect(picker.textContent).toContain('added'))
    expect(inputs[0]!.value).toBe('0')
    select('flash')
    expect(screen.getAllByTestId('billing-user-price-row')).toHaveLength(2)
    expect(Number(screen.getAllByTestId('billing-user-price-normal')[1]!.querySelector('input')!.value)).toBeGreaterThan(0)
    fireEvent.click(save)
    const rows = JSON.parse(localStorage.getItem('dsh.ui-usage-billing.prices')!)
    expect(rows[0]).toEqual({ key: 'relay：unknown', origin: 'https://relay.test', input: 0, output: 0, cacheHit: 0, offPeak: { input: 0, output: 0, cacheHit: 0 } })
  })

  it('shows partial discovery, ignores malformed rows, and unlocks identity only on Edit', async () => {
    stubUsageStats(() => [42, 'valid:relay'])
    render(<UsageBilling {...makeProps()} />)
    fireEvent.click(screen.getByTestId('billing-trigger'))
    fireEvent.click(await screen.findByTestId('billing-unpriced-fix'))
    const picker = await screen.findByTestId('billing-price-picker')
    await screen.findByText(t('priceModelsPartial'))
    expect(picker.textContent).toContain('valid:relay')
    expect(picker.textContent).not.toContain('42')
    fireEvent.change(picker, { target: { value: JSON.stringify(['valid:relay', 'https://relay.test']) } })
    const model = screen.getByTestId('billing-user-price-model') as HTMLInputElement
    const origin = screen.getByTestId('billing-user-price-origin') as HTMLInputElement
    expect(model.readOnly).toBe(true)
    expect(origin.readOnly).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: t('userPriceEditIdentity') }))
    expect(model.readOnly).toBe(false)
    expect(origin.readOnly).toBe(false)
    expect(document.activeElement).toBe(model)
    expect(model.value).toBe('valid:relay')
    expect(origin.value).toBe('https://relay.test')
    fireEvent.change(origin, { target: { value: 'alt.test/v1' } })
    for (const input of screen.getByTestId('billing-user-price-normal').querySelectorAll('input')) {
      fireEvent.change(input, { target: { value: '1' } })
    }
    fireEvent.click(screen.getByTestId('billing-user-price-save'))
    expect(JSON.parse(localStorage.getItem('dsh.ui-usage-billing.prices')!)[0]).toMatchObject({
      key: 'valid:relay', origin: 'https://alt.test', input: 1,
    })
  })

  it('概览横幅列出未收录模型 id', async () => {
    stubUsageStats()
    render(<UsageBilling {...makeProps()} />)
    fireEvent.click(screen.getByTestId('billing-trigger'))
    const hint = await screen.findByTestId('billing-unpriced-hint')
    await waitFor(() => {
      expect(hint.textContent).toContain('cn:deepseek v4.1')
      expect(hint.textContent).toContain('cn：deepseek v4.1')
    })
  })

  it('「去补价」跳到设置页的自定义单价分区，未收录 id 进候选列表', async () => {
    stubUsageStats()
    render(<UsageBilling {...makeProps()} />)
    fireEvent.click(screen.getByTestId('billing-trigger'))
    const fix = await screen.findByTestId('billing-unpriced-fix')
    fireEvent.click(fix)
    // 落到设置分区：自定义单价卡可见（高级分区未被搜索过滤隐藏）。
    const card = await screen.findByTestId('billing-user-prices')
    expect(card.closest('[hidden]')).toBeNull()
    // 未收录 id 进候选（用户直接选，不必手抄）。
    const options = Array.from(card.querySelectorAll('datalist option')).map(option => option.getAttribute('value'))
    for (const id of UNPRICED) expect(options).toContain(id)
  })
})
