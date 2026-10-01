import { applyBuiltinCatalog } from '../src/client/pricing.ts'
import { BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES } from '../src/builtin-catalog.ts'

// 测试套件承担宿主注入角色：目录与别名表在模块加载时全量注入（宿主 activate
// 同一入口），否则聚合/计价消费方读到空目录。
applyBuiltinCatalog(BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES)

/**
 * 厂商组折叠、一键展开/收起、「仅看今日」过滤与持久化（issue #77）。
 * 另含稳定性审计修复：空态控制行常驻、按钮禁用、稳定组 id、键盘可达性。
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
import {
  PROVIDER_EXPANDED_STORAGE_KEY,
  PROVIDERS_TODAY_STORAGE_KEY,
} from '../src/client/usage-billing-settings.ts'

beforeEach(() => { localStorage.clear() })
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

/** 本地时区当日戳（与组件 localDayStamp 同口径）。 */
function todayStamp(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 前一天日期戳（仅用于 fixture 历史桶）。 */
function yesterdayStamp(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const cell = (cost: number, calls = 1) => ({ calls, input: 1000, output: 500, cacheHit: 0, cacheMiss: 1000, cost })

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

/** stub 统计接口：today 桶放 TokenHub 消耗（cost 3），昨天桶放 TokenHub（cost 10）
 * 与 unknown 通道的历史模型（cost 5，今日模式应整组消失）。 */
function stubStats(withToday: boolean): void {
  const byDayModelsSite: Record<string, Record<string, Record<string, ReturnType<typeof cell>>>> = {
    [yesterdayStamp()]: {
      'glm-5.3-flash': { 'site:https://tokenhub.tencentmaas.com': cell(10, 2) },
      'legacy-history-model': { unknown: cell(5) },
    },
  }
  if (withToday) {
    byDayModelsSite[todayStamp()] = {
      'glm-5.3-flash': { 'site:https://tokenhub.tencentmaas.com': cell(3) },
    }
  }
  const body = {
    total: { calls: 0, input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cost: 0, reasoning: 0, officialCalls: 0, officialCost: 0 },
    byModel: {},
    byDayModelsSite,
    updatedAt: 0,
  }
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    const payload = url.includes('/api/billing/pricing') ? { source: 'builtin' } : body
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } })
  }))
}

async function openProvidersTab() {
  const { container } = render(<UsageBilling {...makeProps()} />)
  fireEvent.click(container.querySelector('button')!)
  await screen.findByText('使用统计')
  fireEvent.click(await screen.findByTestId('billing-tab-providers'))
  await screen.findByTestId('billing-panel-providers')
  return screen.getByTestId('billing-panel-providers')
}

/** 打开「仅看今日」开关。 */
async function enableTodayOnly(): Promise<void> {
  fireEvent.click(await screen.findByTestId('billing-provider-today-toggle'))
}

describe('provider groups collapse by default (issue #77)', () => {
  beforeEach(() => { stubStats(true) })

  it('renders group heads without model tables until a head is clicked', async () => {
    await openProvidersTab()
    await waitFor(() => {
      expect(screen.getAllByTestId('billing-provider-group').length).toBeGreaterThan(0)
    })
    // 默认收起：所有模型用量表都不在文档中。
    expect(screen.queryAllByTestId('billing-table-scroll')).toHaveLength(0)
    const head = screen.getAllByTestId('billing-provider-group-head')[0]!
    expect(head.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(head)
    expect(head.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getAllByTestId('billing-table-scroll').length).toBeGreaterThan(0)
    // 再点收起。
    fireEvent.click(head)
    expect(head.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryAllByTestId('billing-table-scroll')).toHaveLength(0)
  })

  it('expands and collapses every collapsible group via the toolbar button', async () => {
    await openProvidersTab()
    await waitFor(() => expect(screen.getByText(t('expandAll'))).toBeTruthy())
    fireEvent.click(screen.getByText(t('expandAll')))
    expect(screen.getByText(t('collapseAll'))).toBeTruthy()
    // 两个有消耗的通道组（TokenHub + unknown）各有一张表。
    expect(screen.getAllByTestId('billing-table-scroll')).toHaveLength(2)
    fireEvent.click(screen.getByText(t('collapseAll')))
    expect(screen.queryAllByTestId('billing-table-scroll')).toHaveLength(0)
  })

  it('toggles a group from the keyboard (Enter / Space) and is Tab-focusable (audit U1)', async () => {
    await openProvidersTab()
    await waitFor(() => expect(screen.getAllByTestId('billing-provider-group-head').length).toBeGreaterThan(0))
    const head = screen.getAllByTestId('billing-provider-group-head')[0]!
    expect(head.tabIndex).toBe(0)
    fireEvent.keyDown(head, { key: 'Enter' })
    expect(head.getAttribute('aria-expanded')).toBe('true')
    fireEvent.keyDown(head, { key: ' ' })
    expect(head.getAttribute('aria-expanded')).toBe('false')
  })
})

describe('today-only filter (issue #77)', () => {
  beforeEach(() => { stubStats(true) })

  it('keeps only groups with same-day consumption and re-aggregates costs to today', async () => {
    const panel = await openProvidersTab()
    await waitFor(() => expect(panel.textContent).toContain('腾讯云 TokenHub'))
    // 全量：TokenHub 小计 = 今天 3 + 昨天 10 = ¥13.0；unknown 历史组可见。
    const tokenhubBefore = screen.getAllByTestId('billing-provider-group')
      .find(group => group.textContent?.includes('腾讯云 TokenHub'))!
    expect(tokenhubBefore.querySelector('[data-testid="billing-provider-cost"]')?.textContent).toContain('¥13.0')

    await enableTodayOnly()
    // unknown 历史组消失，仅剩 TokenHub。
    await waitFor(() => {
      const groups = screen.getAllByTestId('billing-provider-group')
      expect(groups).toHaveLength(1)
      expect(groups[0]!.textContent).toContain('腾讯云 TokenHub')
    })
    // 小计按当日重新聚合：¥3.0。
    const tokenhubToday = screen.getByTestId('billing-provider-group')
    expect(tokenhubToday.querySelector('[data-testid="billing-provider-cost"]')?.textContent).toContain('¥3.0')

    // 关闭开关恢复全量。
    fireEvent.click(screen.getByTestId('billing-provider-today-toggle'))
    await waitFor(() => expect(screen.getAllByTestId('billing-provider-group')).toHaveLength(2))
    const tokenhubRestored = screen.getAllByTestId('billing-provider-group')
      .find(group => group.textContent?.includes('腾讯云 TokenHub'))!
    expect(tokenhubRestored.querySelector('[data-testid="billing-provider-cost"]')?.textContent).toContain('¥13.0')
  })

  it('persists expanded groups by stable id and the today switch across remounts (audit S2)', async () => {
    await openProvidersTab()
    await waitFor(() => expect(screen.getAllByTestId('billing-provider-group-head').length).toBeGreaterThan(0))
    fireEvent.click(screen.getAllByTestId('billing-provider-group-head')[0]!)
    // 持久化内容是带前缀的稳定 id（ch:/sub:/bal:），不是本地化显示名。
    const stored = JSON.parse(localStorage.getItem(PROVIDER_EXPANDED_STORAGE_KEY) ?? '[]') as unknown
    expect(Array.isArray(stored)).toBe(true)
    expect((stored as string[]).every(id => /^(ch|sub|bal):/.test(id))).toBe(true)
    await enableTodayOnly()
    expect(localStorage.getItem(PROVIDERS_TODAY_STORAGE_KEY)).toBe('1')

    // 重挂载：偏好保持（组仍展开、今日开关仍开）。
    cleanup()
    await openProvidersTab()
    expect(screen.getByTestId('billing-provider-today-toggle').getAttribute('aria-checked')).toBe('true')
    await waitFor(() => {
      expect(screen.getAllByTestId('billing-table-scroll').length).toBeGreaterThan(0)
    })
  })
})

describe('today-only empty state keeps the toolbar reachable', () => {
  beforeEach(() => { stubStats(false) })

  it('shows a today-specific empty message, keeps the switch visible, and disables expand-all (S4/S5)', async () => {
    await openProvidersTab()
    await waitFor(() => expect(screen.getAllByTestId('billing-provider-group').length).toBeGreaterThan(0))
    await enableTodayOnly()
    // 空态：今日专属文案（不是「暂无计费数据」）。
    await waitFor(() => expect(screen.getByTestId('billing-provider-empty').textContent).toBe(t('todayNoConsumption')))
    // 控制行（含开关）恒常显示——昨天「开关找不回来」的回归点。
    const controls = screen.getByTestId('billing-provider-controls')
    expect(controls.contains(screen.getByTestId('billing-provider-today-toggle'))).toBe(true)
    // 无可展开组：一键展开按钮禁用。
    const expandButton = screen.getByText(t('expandAll')) as HTMLButtonElement
    expect(expandButton.disabled).toBe(true)
    // 开关可关闭，列表恢复。
    fireEvent.click(screen.getByTestId('billing-provider-today-toggle'))
    await waitFor(() => expect(screen.getAllByTestId('billing-provider-group').length).toBeGreaterThan(0))
    expect(expandButton.disabled).toBe(false)
  })
})
