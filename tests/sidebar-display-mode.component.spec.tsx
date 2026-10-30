// @vitest-environment jsdom
/** UI 剧本：三档侧栏入口、/usage 打开回调与老宿主防锁死降级（issue #108）。 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react'
import { UsageBilling } from '../src/client/UsageBilling.tsx'
import { BILLING_CARD_STORAGE_KEY } from '../src/client/usage-billing-settings.ts'
import { createBillingBudgetStore } from '../src/client/budget-store.ts'
import { bindSnapshotSelector } from './bind-snapshot-selector'
import { zh } from '../src/client/locales.ts'
import { notifiedKeys } from '../src/client/domain/notify.ts'

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

function stubEmptyFetch(): void {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
    total: { calls: 0, input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cost: 0, reasoning: 0 },
    byModel: {}, byDay: {}, byDayModels: {}, byDayModelsSite: {},
  }), { status: 200, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch)
}

function storeMode(mode: 'full' | 'compact' | 'hidden'): void {
  localStorage.setItem(BILLING_CARD_STORAGE_KEY, JSON.stringify({ mode, metric: 'money', span: 'day', showDelta: true }))
}

function makeProps(recoveryEntryAvailable: boolean): {
  props: Parameters<typeof UsageBilling>[0]
  openFromCommand: () => void
  commandHandler: () => (() => void) | undefined
} {
  const budgetStore = createBillingBudgetStore().create()
  let commandHandler: (() => void) | undefined
  const props = {
    wide: true,
    t,
    recoveryEntryAvailable,
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
  stubEmptyFetch()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('侧栏入口三档显示', () => {
  it('宽侧栏强制紧凑图标，点击仍打开仪表盘', async () => {
    storeMode('compact')
    const { props } = makeProps(true)
    const { getByTestId, queryByTestId } = render(<UsageBilling {...props} />)

    expect(queryByTestId('billing-trigger')).toBeNull()
    fireEvent.click(getByTestId('billing-rail-button'))
    await waitFor(() => { expect(getByTestId('billing-dashboard')).toBeTruthy() })
  })

  it('完全隐藏后可经 /usage → 设置恢复完整卡片', async () => {
    storeMode('hidden')
    const { props, openFromCommand, commandHandler } = makeProps(true)
    const { getByTestId, queryByTestId } = render(<UsageBilling {...props} />)

    expect(queryByTestId('billing-trigger')).toBeNull()
    expect(queryByTestId('billing-rail-button')).toBeNull()
    await waitFor(() => { expect(commandHandler()).toBeTypeOf('function') })
    await act(async () => { openFromCommand() })
    await waitFor(() => { expect(getByTestId('billing-dashboard')).toBeTruthy() })

    fireEvent.click(getByTestId('billing-tab-settings'))
    await waitFor(() => { expect(getByTestId('billing-card-setting')).toBeTruthy() })
    expect(getByTestId('billing-card-mode-hidden-hint').textContent).toContain('恢复显示')
    fireEvent.click(getByTestId('billing-card-mode-full'))
    expect(getByTestId('billing-trigger')).toBeTruthy()
    expect(JSON.parse(localStorage.getItem(BILLING_CARD_STORAGE_KEY) ?? '{}').mode).toBe('full')
  })

  it('老宿主读到 hidden 也降级紧凑图标，并在设置中禁用隐藏', async () => {
    storeMode('hidden')
    const { props } = makeProps(false)
    const { getByTestId, queryByTestId } = render(<UsageBilling {...props} />)

    expect(queryByTestId('billing-trigger')).toBeNull()
    fireEvent.click(getByTestId('billing-rail-button'))
    await waitFor(() => { expect(getByTestId('billing-dashboard')).toBeTruthy() })
    fireEvent.click(getByTestId('billing-tab-settings'))
    await waitFor(() => { expect(getByTestId('billing-card-setting')).toBeTruthy() })
    expect(getByTestId('billing-card-mode-compact').getAttribute('aria-pressed')).toBe('true')
    expect(getByTestId('billing-card-mode-hidden')).toHaveProperty('disabled', true)
    expect(getByTestId('billing-card-mode-fallback').textContent).toContain('避免仪表盘无法打开')
  })

  it('设置页三档切换即时生效并写入 localStorage', async () => {
    storeMode('full')
    const { props } = makeProps(true)
    const { getByTestId, queryByTestId } = render(<UsageBilling {...props} />)

    fireEvent.click(getByTestId('billing-trigger'))
    await waitFor(() => { expect(getByTestId('billing-dashboard')).toBeTruthy() })
    fireEvent.click(getByTestId('billing-tab-settings'))
    await waitFor(() => { expect(getByTestId('billing-card-setting')).toBeTruthy() })

    const floatSetting = within(getByTestId('billing-float-setting'))
    const cardSetting = within(getByTestId('billing-card-setting'))
    const entryMode = floatSetting.getByTestId('billing-card-mode')
    expect(cardSetting.queryByTestId('billing-card-mode')).toBeNull()
    expect(entryMode.compareDocumentPosition(floatSetting.getByTestId('billing-float-mode')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    fireEvent.click(getByTestId('billing-card-mode-compact'))
    expect(queryByTestId('billing-trigger')).toBeNull()
    expect(getByTestId('billing-rail-button')).toBeTruthy()
    expect(JSON.parse(localStorage.getItem(BILLING_CARD_STORAGE_KEY) ?? '{}').mode).toBe('compact')

    fireEvent.click(getByTestId('billing-card-mode-hidden'))
    expect(queryByTestId('billing-trigger')).toBeNull()
    expect(queryByTestId('billing-rail-button')).toBeNull()
    expect(getByTestId('billing-card-mode-hidden-hint').textContent).toContain('/usage')
    expect(JSON.parse(localStorage.getItem(BILLING_CARD_STORAGE_KEY) ?? '{}').mode).toBe('hidden')

    fireEvent.click(getByTestId('billing-card-mode-full'))
    expect(getByTestId('billing-trigger')).toBeTruthy()
    expect(JSON.parse(localStorage.getItem(BILLING_CARD_STORAGE_KEY) ?? '{}').mode).toBe('full')
  })
})
