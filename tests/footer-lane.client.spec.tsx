// @vitest-environment jsdom
/**
 * 侧栏 footer 同槽占位（社区约定 §20.4 / §25「卡片型占用者」方案 A）。
 *
 * 宿主不向占位者暴露同槽邻居信息，占位事实只能从 DOM 反推。本剧本锁四件事：
 * 1) 测量：数出同排的可见占位者（**展开 display:contents 的槽位锚点**、
 *    排除隐藏项与自己的子树）；
 * 2) 判定：横向行有邻居 → 图标钮；纵向窄座 → 图标钮；纵向宽座 → 宽卡；
 *    独占/测不到行 → 宽卡；
 * 3) 组件：同槽有邻居时触发卡真的收成 36×36 图标钮（不再 width:100%，
 *    否则把邻居推出面板外——用户看到的「别的插件像没加载」）；
 * 4) 回归（issue #140）：夹具按**宿主真实结构**建——每个槽位只有一个
 *    `display:contents` 锚点，锚点里装着该槽的所有占用者。
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

/** 复刻宿主侧栏 footer 结构：`.footerActions` 是 flex 行。 */
function buildRow(direction: 'row' | 'column' = 'row'): HTMLDivElement {
  const row = document.createElement('div')
  row.style.display = 'flex'
  if (direction === 'column') row.style.flexDirection = 'column'
  return row
}

/**
 * 宿主把每个槽位渲染成**一个** `display:contents` 锚点，锚点里装着该槽的
 * 所有占用者（`scoped-slots.tsx` 的 `ANCHOR_STYLE` + `SlotOutlet`）。
 * 「每个占用者一个锚点」是错的，那正是 issue #140 里测不出来的原因。
 */
function intoSlot(row: HTMLElement, ...guests: HTMLElement[]): HTMLDivElement {
  const anchor = document.createElement('div')
  anchor.style.display = 'contents'
  for (const guest of guests) anchor.appendChild(guest)
  row.appendChild(anchor)
  return anchor
}

/** jsdom 不做布局：座位宽度得手工喂。 */
function setSeatWidth(row: HTMLElement, width: number): void {
  Object.defineProperty(row, 'clientWidth', { value: width, configurable: true })
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

  it('同一槽位锚点里有邻居时判定为图标钮（宿主真实结构，issue #140 根因一）', () => {
    // 宿主真实 DOM：.footerActions > div[data-slot] > (邻居, 自己)
    const row = buildRow()
    const self = document.createElement('span')
    const sibling = document.createElement('button')
    intoSlot(row, sibling, self)
    document.body.appendChild(row)

    const facts = measureFooterLane(self)
    expect(facts.neighbors).toBe(1)
    expect(resolveTriggerForm(facts)).toBe('icon')
  })

  it('邻居被隐藏（display:none）时不算占位，回到宽卡', () => {
    const row = buildRow()
    const self = document.createElement('span')
    const sibling = document.createElement('button')
    sibling.style.display = 'none'
    intoSlot(row, sibling, self)
    document.body.appendChild(row)

    expect(resolveTriggerForm(measureFooterLane(self))).toBe('card')
  })

  it('纵向窄座（客人按内容排、不拉伸）即便没有邻居也收成图标钮（§25.6）', () => {
    const row = buildRow('column')
    row.style.alignItems = 'center'
    setSeatWidth(row, 120)
    const self = document.createElement('span')
    intoSlot(row, self)
    document.body.appendChild(row)

    const facts = measureFooterLane(self)
    expect(facts.stacked).toBe(true)
    expect(facts.wideSeat).toBe(false)
    expect(resolveTriggerForm(facts)).toBe('icon')
  })

  it('纵向宽座（客人拉满整行、座位放得下宽卡）保留宽卡（issue #140 现象二）', () => {
    // 第三方皮肤（如 dsh-islands-ui）把 footer 座位改成整行宽座：客人被拉满
    // 整行宽度，宽卡放得下 —— 这时收窄只会白丢信息。
    const row = buildRow('column')
    row.style.alignItems = 'stretch'
    setSeatWidth(row, 264)
    const self = document.createElement('span')
    intoSlot(row, self)
    document.body.appendChild(row)

    const facts = measureFooterLane(self)
    expect(facts.stacked).toBe(true)
    expect(facts.wideSeat).toBe(true)
    expect(resolveTriggerForm(facts)).toBe('card')
  })

  it('纵向座位再宽也放不下宽卡时仍然收成图标钮', () => {
    const row = buildRow('column')
    row.style.alignItems = 'stretch'
    setSeatWidth(row, 100)
    const self = document.createElement('span')
    intoSlot(row, self)
    document.body.appendChild(row)

    expect(resolveTriggerForm(measureFooterLane(self))).toBe('icon')
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

    // 复刻宿主：footer 行是 flex，槽位锚点（display:contents）里还有别的插件。
    // React 渲染会清空容器原有子节点，所以渲染容器是锚点里的「我方那一格」。
    const row = document.createElement('div')
    row.style.display = 'flex'
    const anchor = document.createElement('div')
    anchor.style.display = 'contents'
    anchor.appendChild(document.createElement('button'))
    const ourSeat = document.createElement('div')
    anchor.appendChild(ourSeat)
    row.appendChild(anchor)
    document.body.appendChild(row)

    const { queryByTestId, getByTestId } = render(<UsageBilling {...props()} />, { container: ourSeat })

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
