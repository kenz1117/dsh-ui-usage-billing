// @vitest-environment jsdom
/** UI 剧本：宿主原生设置复用完整设置分区，并提供完全隐藏后的恢复入口（issue #108）。 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react'
import { UsageBilling } from '../src/client/UsageBilling.tsx'
import { NativeSettingsSection } from '../src/client/NativeSettingsSection.tsx'
import { BILLING_CARD_STORAGE_KEY } from '../src/client/usage-billing-settings.ts'
import { createBillingBudgetStore } from '../src/client/budget-store.ts'
import { bindSnapshotSelector } from './bind-snapshot-selector'
import { zh } from '../src/client/locales.ts'
import { notifiedKeys } from '../src/client/domain/notify.ts'

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

function makeProps(): {
  props: Parameters<typeof UsageBilling>[0]
  openFromCommand: () => void
  commandHandler: () => (() => void) | undefined
} {
  const budgetStore = createBillingBudgetStore().create()
  let commandHandler: (() => void) | undefined
  const props = {
    wide: true,
    t,
    recoveryEntryAvailable: true,
    checkModels: async () => ({
      checked: true, available: true, models: 0, failures: 0, okProviders: [], badProviders: [],
    }),
    publishCosts: () => {},
    registerOpen: (handler: () => void) => {
      commandHandler = handler
      return () => { commandHandler = undefined }
    },
    renderSlot: () => null,
    useStore: bindSnapshotSelector(budgetStore),
    actions: budgetStore.actions,
  } as unknown as Parameters<typeof UsageBilling>[0]
  return {
    props,
    openFromCommand: () => { commandHandler?.() },
    commandHandler: () => commandHandler,
  }
}

beforeEach(() => {
  localStorage.clear()
  notifiedKeys.clear()
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
    total: { calls: 0, input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cost: 0, reasoning: 0 },
    byModel: {}, byDay: {}, byDayModels: {}, byDayModelsSite: {},
  }), { status: 200, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('宿主原生设置页', () => {
  it('复刻完整设置分区，并可从完全隐藏恢复完整卡片', () => {
    localStorage.setItem(BILLING_CARD_STORAGE_KEY, JSON.stringify({ mode: 'hidden', metric: 'money', span: 'day', showDelta: true }))
    const { props } = makeProps()
    const { getByTestId, queryByTestId } = render(<><UsageBilling {...props} /><NativeSettingsSection {...props} /></>)
    const native = within(getByTestId('native-billing-settings'))

    expect(queryByTestId('billing-trigger')).toBeNull()
    expect(queryByTestId('billing-rail-button')).toBeNull()
    expect(native.queryByTestId('billing-dashboard-head')).toBeNull()
    expect(native.queryByTestId('billing-tab-nav')).toBeNull()
    expect(native.queryByTestId('billing-footer')).toBeNull()
    // 完整分组保留，但宿主已有导航，插件二级锚点栏不再挤压内容宽度。
    expect(native.queryByTestId('billing-settings-nav')).toBeNull()
    for (const id of [
      'billing-density-motion-card',
      'billing-budget',
      'billing-peak-alert-settings',
      'billing-toggle-setting',
      'billing-display-setting',
      'billing-user-prices',
      'billing-plugin-info',
    ]) expect(native.getByTestId(id)).toBeTruthy()
    expect(native.getByTestId('billing-card-mode-hidden').getAttribute('aria-pressed')).toBe('true')
    expect(native.getByTestId('billing-card-mode-hidden-hint').textContent).toContain('恢复显示')

    fireEvent.click(native.getByTestId('billing-card-mode-full'))

    expect(getByTestId('billing-trigger')).toBeTruthy()
    expect(native.getByTestId('billing-card-mode-full').getAttribute('aria-pressed')).toBe('true')
    expect(JSON.parse(localStorage.getItem(BILLING_CARD_STORAGE_KEY) ?? '{}').mode).toBe('full')
  })

  it('原生设置与仪表盘设置双向同步，嵌入实例不抢占 /usage 回调', async () => {
    const { props, openFromCommand, commandHandler } = makeProps()
    const { getByTestId, queryByTestId } = render(<><UsageBilling {...props} /><NativeSettingsSection {...props} /></>)
    const native = within(getByTestId('native-billing-settings'))

    fireEvent.click(native.getByTestId('billing-card-mode-hidden'))
    expect(queryByTestId('billing-trigger')).toBeNull()
    expect(queryByTestId('billing-rail-button')).toBeNull()

    await waitFor(() => { expect(commandHandler()).toBeTypeOf('function') })
    await act(async () => { openFromCommand() })
    await waitFor(() => { expect(getByTestId('billing-dashboard')).toBeTruthy() })
    const dashboard = within(getByTestId('billing-dashboard'))
    fireEvent.click(dashboard.getByTestId('billing-tab-settings'))
    await waitFor(() => { expect(dashboard.getByTestId('billing-card-setting')).toBeTruthy() })
    fireEvent.click(dashboard.getByTestId('billing-card-mode-compact'))

    expect(getByTestId('billing-rail-button')).toBeTruthy()
    expect(native.getByTestId('billing-card-mode-compact').getAttribute('aria-pressed')).toBe('true')
    expect(JSON.parse(localStorage.getItem(BILLING_CARD_STORAGE_KEY) ?? '{}').mode).toBe('compact')
  })

  it('只挂载原生设置时不注册弹窗打开回调', async () => {
    const { props, commandHandler } = makeProps()
    render(<NativeSettingsSection {...props} />)
    await act(async () => {})
    expect(commandHandler()).toBeUndefined()
  })
})
