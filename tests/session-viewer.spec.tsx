// @vitest-environment jsdom
/**
 * U-7：会话全屏查看器。
 *
 * 面板只显示前 20 行（SESSION_DISPLAY_LIMIT）；「查看全部 N 个会话」按钮打开
 * fixed 浮层，显示服务端全量（封顶 100 行）+ 标题/项目/id 子串搜索 + 关闭。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { UsageBilling } from '../src/client/UsageBilling.tsx'
import { filterSessionsForViewer } from '../src/client/domain/session-viewer.ts'
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

/** 构造 n 个会话行：title 带序号（「会话 i」），项目路径交替两个目录。 */
function makeSessions(n: number): { id: string; title: string; cwd: string; calls: number; cost: number; lastActive: number }[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `sess-${String(i).padStart(2, '0')}`,
    title: `会话 ${i}`,
    cwd: i % 2 === 0 ? '/home/ken/project-alpha' : '/home/ken/project-beta',
    calls: 3,
    cost: 0.1 + i / 100,
    lastActive: Date.parse('2026-10-18T10:00:00Z') + i * 60_000,
  }))
}

describe('filterSessionsForViewer（纯函数）', () => {
  const rows = makeSessions(3)

  it('空查询返回全量', () => {
    expect(filterSessionsForViewer(rows, '')).toHaveLength(3)
    expect(filterSessionsForViewer(rows, '  ')).toHaveLength(3)
  })

  it('按标题 / cwd 尾段 / id 子串过滤（大小写不敏感）', () => {
    expect(filterSessionsForViewer(rows, '会话 1')).toHaveLength(1)
    expect(filterSessionsForViewer(rows, 'beta')).toHaveLength(1)
    expect(filterSessionsForViewer(rows, 'project-')).toHaveLength(3)
    expect(filterSessionsForViewer(rows, 'SESS-02')).toHaveLength(1)
    expect(filterSessionsForViewer(rows, 'no-match')).toHaveLength(0)
  })
})

describe('会话全屏查看器（组件集成）', () => {
  function makeProps(sessions: ReturnType<typeof makeSessions>): ComponentProps<typeof UsageBilling> {
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

  async function openProvidersTab(sessions: ReturnType<typeof makeSessions>, total?: number) {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/billing/usage-stats')) {
        return new Response(JSON.stringify({
          total: { calls: 0, input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cost: 0, reasoning: 0 },
          byModel: {}, byDay: {}, byDayModels: {}, byDayModelsSite: {},
          bySession: sessions,
          // 真实会话总数（服务端未封顶下发）；旧快照没有该字段 → 省略。
          ...(total === undefined ? {} : { bySessionTotal: total }),
        }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    }) as unknown as typeof fetch)
    const rendered = render(<UsageBilling {...makeProps(sessions)} />)
    fireEvent.click(rendered.getByTestId('billing-trigger'))
    await waitFor(() => { expect(rendered.getByTestId('billing-dashboard')).toBeTruthy() })
    fireEvent.click(rendered.getByTestId('billing-tab-providers'))
    await waitFor(() => { expect(rendered.getByTestId('billing-panel-sessions')).toBeTruthy() })
    return rendered
  }

  it('25 个会话：面板 20 行 + 查看全部按钮带计数', async () => {
    const { getByTestId } = await openProvidersTab(makeSessions(25))
    const panel = getByTestId('billing-panel-sessions')
    // 面板表格（非浮层）行数 = 20（SESSION_DISPLAY_LIMIT）
    const panelTable = panel.querySelector('[data-testid="billing-sessions-table"]')
    expect(panelTable?.querySelectorAll('tbody tr').length).toBe(20)
    expect(getByTestId('billing-sessions-view-all').textContent).toContain('25')
  })

  it('打开浮层显示全量 25 行；关闭后消失', async () => {
    const { getByTestId, queryByTestId } = await openProvidersTab(makeSessions(25))
    fireEvent.click(getByTestId('billing-sessions-view-all'))
    const viewer = getByTestId('billing-session-viewer')
    expect(viewer.querySelector('tbody')?.querySelectorAll('tr').length).toBe(25)
    fireEvent.click(getByTestId('billing-session-viewer-close'))
    expect(queryByTestId('billing-session-viewer')).toBeNull()
  })

  it('浮层内搜索过滤行（标题子串），清空恢复全量', async () => {
    const { getByTestId } = await openProvidersTab(makeSessions(25))
    fireEvent.click(getByTestId('billing-sessions-view-all'))
    const search = getByTestId('billing-session-viewer-search')
    fireEvent.change(search, { target: { value: '会话 2' } })
    await waitFor(() => {
      // 会话 2、会话 20~24 共 6 行（子串命中）
      expect(getByTestId('billing-session-viewer-list')?.querySelectorAll('tbody tr').length).toBe(6)
    })
    fireEvent.change(search, { target: { value: '' } })
    await waitFor(() => {
      expect(getByTestId('billing-session-viewer-list')?.querySelectorAll('tbody tr').length).toBe(25)
    })
  })
})

describe('会话真实总数（1.8.7：bySessionTotal）', () => {
  // 服务端 bySession 封顶 100 行、真实总数另下发——面板此前把封顶行数当总数，
  // 会话更多时「共 N 个会话」是错的（审计 P1-6）。
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

  async function openSessionsTab(sessions: ReturnType<typeof makeSessions>, total?: number) {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/billing/usage-stats')) {
        return new Response(JSON.stringify({
          total: { calls: 0, input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cost: 0, reasoning: 0 },
          byModel: {}, byDay: {}, byDayModels: {}, byDayModelsSite: {},
          bySession: sessions,
          ...(total === undefined ? {} : { bySessionTotal: total }),
        }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    }) as unknown as typeof fetch)
    const rendered = render(<UsageBilling {...makeProps()} />)
    fireEvent.click(rendered.getByTestId('billing-trigger'))
    await waitFor(() => { expect(rendered.getByTestId('billing-dashboard')).toBeTruthy() })
    fireEvent.click(rendered.getByTestId('billing-tab-providers'))
    await waitFor(() => { expect(rendered.getByTestId('billing-panel-sessions')).toBeTruthy() })
    return rendered
  }

  it('下发真实总数时面板说真话：共 300 个会话；查看按钮说明只看花费前 25 个', async () => {
    const { getByTestId } = await openSessionsTab(makeSessions(25), 300)
    const panel = getByTestId('billing-panel-sessions')
    expect(panel.textContent).toContain('共 300 个会话')
    expect(panel.textContent).not.toContain('共 25 个会话')
    // 明细被封顶 → 查看器只能列出花费前 N 个，按钮不说「全部」
    expect(getByTestId('billing-sessions-view-all').textContent).toContain('花费前 25')
  })

  it('旧快照没有 bySessionTotal 时回退按明细行数（既有行为不变）', async () => {
    const { getByTestId } = await openSessionsTab(makeSessions(25))
    const panel = getByTestId('billing-panel-sessions')
    expect(panel.textContent).toContain('共 25 个会话')
    expect(getByTestId('billing-sessions-view-all').textContent).toContain('查看全部 25 个会话')
  })
})
