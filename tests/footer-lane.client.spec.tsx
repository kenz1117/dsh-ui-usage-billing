// @vitest-environment jsdom
/**
 * 侧栏 footer 同槽占位（社区约定 §20.4 / §25「卡片型占用者」方案 A）。
 *
 * 宿主不向占位者暴露同槽邻居信息，占位事实只能从 DOM 反推。本剧本锁三件事：
 * 1) 测量：数出同排的可见占位者（展开 display:contents 的槽位外壳、
 *    排除隐藏项与自己的子树）；
 * 2) 判定：横向行有邻居 → 图标钮；纵向栈 → 图标钮；独占/测不到行 → 宽卡；
 * 3) 组件：同槽有邻居时触发卡真的收成 36×36 图标钮（不再 width:100%，
 *    否则把邻居推出面板外——用户看到的「别的插件像没加载」）。
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { measureFooterLane, resolveTriggerForm } from '../src/client/footer-lane.ts'
import { UsageBilling } from '../src/client/UsageBilling.tsx'
import { notifiedKeys } from '../src/client/domain/notify.ts'
import { createBillingBudgetStore } from '../src/client/budget-store.ts'
import { bindSnapshotSelector } from './bind-snapshot-selector'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

/** 复刻宿主侧栏 footer 结构：`.footerActions` 是 flex 行，每个占用者一个 display:contents 槽位外壳。 */
function buildRow(direction: 'row' | 'column' = 'row'): HTMLDivElement {
  const row = document.createElement('div')
  row.style.display = 'flex'
  if (direction === 'column') row.style.flexDirection = 'column'
  return row
}

/** 把元素塞进一个 display:contents 的槽位外壳（宿主渲染结构）。 */
function intoSlot(row: HTMLElement, child: HTMLElement): void {
  const shell = document.createElement('div')
  shell.style.display = 'contents'
  shell.appendChild(child)
  row.appendChild(shell)
}

describe('footer-lane 测量与判定', () => {
  it('独占一行时没有邻居，判定为宽卡', () => {
    const row = buildRow()
    const self = document.createElement('span')
    intoSlot(row, self)
    document.body.appendChild(row)

    const facts = measureFooterLane(self)
    expect(facts.row).toBe(row)
    expect(facts.stacked).toBe(false)
    expect(facts.neighbors).toBe(0)
    expect(resolveTriggerForm(facts)).toBe('card')
  })

  it('同排有邻居时判定为图标钮（方案 A：禁止 width:100%）', () => {
    const row = buildRow()
    const self = document.createElement('span')
    intoSlot(row, self)
    const sibling = document.createElement('button')
    intoSlot(row, sibling)
    document.body.appendChild(row)

    const facts = measureFooterLane(self)
    expect(facts.neighbors).toBe(1)
    expect(resolveTriggerForm(facts)).toBe('icon')
  })

  it('邻居被隐藏（display:none）时不算占位，回到宽卡', () => {
    const row = buildRow()
    const self = document.createElement('span')
    intoSlot(row, self)
    const sibling = document.createElement('button')
    sibling.style.display = 'none'
    intoSlot(row, sibling)
    document.body.appendChild(row)

    expect(resolveTriggerForm(measureFooterLane(self))).toBe('card')
  })

  it('纵向栈（手机端侧栏浮层）即便没有邻居也收成图标钮', () => {
    const row = buildRow('column')
    const self = document.createElement('span')
    intoSlot(row, self)
    document.body.appendChild(row)

    const facts = measureFooterLane(self)
    expect(facts.stacked).toBe(true)
    expect(resolveTriggerForm(facts)).toBe('icon')
  })

  it('测不到行时保守按宽卡（没有行就没有横向挤占问题）', () => {
    // 脱离文档的普通包裹层：向上没有 flex 行，也不是 body。
    const detached = document.createElement('div')
    const self = document.createElement('span')
    detached.appendChild(self)

    const facts = measureFooterLane(self)
    expect(facts.row).toBeNull()
    expect(resolveTriggerForm(facts)).toBe('card')
  })

  it('body 不是 footer 行：页面上的其它元素不会被数成邻居', () => {
    const self = document.createElement('span')
    document.body.appendChild(self)
    const other = document.createElement('div')
    document.body.appendChild(other)

    expect(measureFooterLane(self).row).toBeNull()
  })
})

describe('触发卡的共享态（形态 A）', () => {
  const props = () => {
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
    } as unknown as Parameters<typeof UsageBilling>[0]
  }

  it('同槽有邻居时渲染 36×36 图标钮，不再渲染宽卡', () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      total: { calls: 0, input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cost: 0, reasoning: 0 },
      byModel: {}, byDay: {}, byDayModels: {}, byDayModelsSite: {},
    }), { status: 200, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch)
    notifiedKeys.clear()

    // 复刻宿主：footer 行是 flex，里面另一个插件占了入口（各自一个槽位外壳）。
    // 渲染容器是行里的「我方槽位」——直接渲染进行容器会清掉行里的其它孩子。
    const row = document.createElement('div')
    row.style.display = 'flex'
    const ourSlot = document.createElement('div')
    const otherSlot = document.createElement('div')
    otherSlot.appendChild(document.createElement('button'))
    row.appendChild(ourSlot)
    row.appendChild(otherSlot)
    document.body.appendChild(row)

    const { queryByTestId, getByTestId } = render(<UsageBilling {...props()} />, { container: ourSlot })

    expect(getByTestId('billing-trigger-shared')).toBeTruthy()
    expect(queryByTestId('billing-trigger')).toBeNull()
  })

  it('独占一行时仍是宽卡（不受共享态影响）', () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      total: { calls: 0, input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cost: 0, reasoning: 0 },
      byModel: {}, byDay: {}, byDayModels: {}, byDayModelsSite: {},
    }), { status: 200, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch)
    notifiedKeys.clear()

    const { getByTestId, queryByTestId } = render(<UsageBilling {...props()} />)

    expect(getByTestId('billing-trigger')).toBeTruthy()
    expect(queryByTestId('billing-trigger-shared')).toBeNull()
  })
})
