// @vitest-environment jsdom
/**
 * 会话行跳转（跨插件导航）的面板级契约。
 *
 * 面板的会话标题是一枚按钮：点击交给宿主会话选择通道（`navigateToSession`），
 * 与行内展开互不抢事件（按钮 stopPropagation）。宿主无通道 / 通道报错时，
 * 面板在会话表上方给一行可读提示，而不是静默无反应。
 *
 * 真机点击验证的说明：本仓的 DSH Web 页面里，宿主自己的「设置」按钮同样点不动
 * （Browser 合成点击进不了宿主的 React 事件系统），故交互断言一律在组件层做。
 */

import { applyBuiltinCatalog } from '../src/client/pricing.ts'
import { BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES } from '../src/builtin-catalog.ts'

applyBuiltinCatalog(BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { bindSnapshotSelector } from './bind-snapshot-selector'
import { UsageBilling } from '../src/client/UsageBilling.tsx'
import { createBillingBudgetStore } from '../src/client/budget-store.ts'
import { zh } from '../src/client/locales.ts'
import { contextStore } from '../src/client/context-store.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const STATS = {
  total: { calls: 100, input: 1_000_000, output: 100_000, cacheHit: 400_000, cacheMiss: 600_000, cost: 3.2 },
  byModel: {},
  byDay: {},
  bySession: [
    { id: 'sess-alpha', title: '修复登录 bug', cwd: '/home/ken/shop-web', calls: 80, cost: 2.4, lastActive: Date.UTC(2026, 7, 16, 8, 0, 0) },
    { id: 'sess-beta', cwd: '/home/ken/api-server', calls: 20, cost: 0.8, lastActive: Date.UTC(2026, 7, 15, 9, 30, 0) },
  ],
}

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

function makeProps(navigateToSession: (id: string) => 'opened' | 'unavailable' | 'failed'): ComponentProps<typeof UsageBilling> {
  const budgetStore = createBillingBudgetStore().create()
  return {
    wide: true,
    t,
    checkModels: async () => ({
      checked: true, available: true, models: 1, failures: 0, okProviders: [], badProviders: [],
    }),
    publishCosts: () => {},
    registerOpen: () => () => {},
    navigateToSession,
    renderSlot: () => null,
    useStore: bindSnapshotSelector(budgetStore),
    actions: budgetStore.actions,
  } as unknown as ComponentProps<typeof UsageBilling>
}

/** 打开仪表盘并切到「明细/厂商」页（会话表所在面板）。 */
async function openSessionTable(navigateToSession: (id: string) => 'opened' | 'unavailable' | 'failed'): Promise<void> {
  const { container } = render(<UsageBilling {...makeProps(navigateToSession)} />)
  fireEvent.click(container.querySelector('button')!)
  await screen.findByTestId('billing-tab-panel-overview')
  fireEvent.click(screen.getByTestId('billing-tab-providers'))
  await screen.findByTestId('billing-sessions-table')
}

describe('session row navigation', () => {
  beforeEach(() => {
    localStorage.clear()
    // store 是模块级单例：前序用例发布过的上下文快照不该影响后续用例。
    contextStore.publish({})
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const body = url.includes('/api/billing/pricing') ? { source: 'builtin' } : STATS
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
    }))
  })

  it('turns each session title into a jump button that asks the host to open it', async () => {
    const opened: string[] = []
    await openSessionTable((id) => {
      opened.push(id)
      return 'opened'
    })

    const buttons = screen.getAllByTestId('billing-session-open')
    expect(buttons.length).toBeGreaterThan(0)
    fireEvent.click(buttons[0])
    expect(opened).toContain('sess-alpha')
  })

  it('renders the context occupancy card once the host projection arrives', async () => {
    contextStore.publish({ projectedTokens: 4000, contextWindow: 16_000, systemTokens: 900, toolsTokens: 700, messageTokens: 2400 })
    const { container } = render(<UsageBilling {...makeProps(() => 'opened')} />)
    fireEvent.click(container.querySelector('button')!)
    await screen.findByTestId('billing-tab-panel-overview')
    // 上下文是独立的一级分区：切到「上下文」Tab 才渲染。
    fireEvent.click(screen.getByTestId('billing-tab-context'))
    await screen.findByTestId('billing-tab-panel-context')

    const card = screen.getByTestId('billing-context-card')
    expect(card.textContent).toContain('25%')
    expect(screen.getByTestId('billing-context-breakdown').textContent).toContain('系统')
  })

  it('shows an empty notice (not a fabricated zero) when the host serves no projection', async () => {
    const { container } = render(<UsageBilling {...makeProps(() => 'opened')} />)
    fireEvent.click(container.querySelector('button')!)
    await screen.findByTestId('billing-tab-panel-overview')
    fireEvent.click(screen.getByTestId('billing-tab-context'))
    await screen.findByTestId('billing-tab-panel-context')
    expect(screen.queryByTestId('billing-context-card')).toBeNull()
    expect(screen.getByTestId('billing-context-empty')).toBeTruthy()
  })

  it('shows a readable notice when the host cannot open the session', async () => {
    await openSessionTable(() => 'unavailable')

    fireEvent.click(screen.getAllByTestId('billing-session-open')[0])
    expect(screen.getByTestId('billing-session-nav-notice').textContent).toContain(t('sessionOpenUnavailable'))
  })

  it('shows a readable notice when the host channel fails', async () => {
    await openSessionTable(() => 'failed')

    fireEvent.click(screen.getAllByTestId('billing-session-open')[0])
    expect(screen.getByTestId('billing-session-nav-notice').textContent).toContain(t('sessionOpenFailed'))
  })
})
