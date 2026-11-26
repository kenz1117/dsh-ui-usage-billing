// @vitest-environment jsdom
/**
 * U-4：设置页全文搜索。
 *
 * 纯函数（settingsSectionHidden）+ 组件集成（打开设置 Tab → 输入查询 →
 * 关键词未命中的分区隐藏、命中的保留、清空恢复、全不命中显示空态提示）。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { UsageBilling } from '../src/client/UsageBilling.tsx'
import { NativeSettingsSection } from '../src/client/NativeSettingsSection.tsx'
import css from '../src/client/UsageBilling.module.css'
import { MOTION_STORAGE_KEY } from '../src/client/usage-billing-settings.ts'
import { settingsSectionHidden } from '../src/client/settings-search.ts'
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

describe('settingsSectionHidden（纯函数）', () => {
  const keywords = ['预算', 'budget', '金额']

  it('空查询 / 纯空白不隐藏任何分区', () => {
    expect(settingsSectionHidden('', keywords)).toBe(false)
    expect(settingsSectionHidden('   ', keywords)).toBe(false)
  })

  it('关键词命中（精确子串 / 大小写不敏感）不隐藏', () => {
    expect(settingsSectionHidden('预算', keywords)).toBe(false)
    expect(settingsSectionHidden('BUDGET', keywords)).toBe(false)
    expect(settingsSectionHidden('dget', keywords)).toBe(false)
  })

  it('无命中隐藏', () => {
    expect(settingsSectionHidden('峰谷', keywords)).toBe(true)
  })
})

describe('设置页搜索（组件集成）', () => {
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

  function stubFetch(): void {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/billing/usage-stats')) {
        return new Response(JSON.stringify({
          total: { calls: 0, input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cost: 0, reasoning: 0 },
          byModel: {}, byDay: {}, byDayModels: {}, byDayModelsSite: {},
        }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    }) as unknown as typeof fetch)
  }

  async function openSettings(surface: 'dashboard' | 'native' = 'dashboard'): Promise<ReturnType<typeof render>> {
    stubFetch()
    if (surface === 'native') {
      const rendered = render(<NativeSettingsSection {...makeProps()} />)
      await act(async () => {})
      return rendered
    }
    const rendered = render(<UsageBilling {...makeProps()} />)
    fireEvent.click(rendered.getByTestId('billing-trigger'))
    await waitFor(() => { expect(rendered.getByTestId('billing-dashboard')).toBeTruthy() })
    fireEvent.click(rendered.getByTestId('billing-tab-settings'))
    await waitFor(() => { expect(rendered.getByTestId('billing-tab-panel-settings')).toBeTruthy() })
    return rendered
  }

  it('搜索「峰谷」：预算卡隐藏、峰谷卡保留', async () => {
    // Vitest disables the app CSS. Load these rules from source so the test checks
    // the authored display override against the card's normal display style.
    const source = readFileSync(resolve(process.cwd(), 'src/client/UsageBilling.module.css'), 'utf8')
    const style = document.createElement('style')
    style.textContent = [
      source.match(/^\.setCard\s*\{[^}]+\}/m)?.[0]?.replace('.setCard', `.${css.setCard}`),
      source.match(/^\.dashboard \[hidden\]\s*\{[^}]+\}/m)?.[0]?.replace('.dashboard', `.${css.dashboard}`),
    ].join('\n')
    document.head.append(style)
    try {
      const { getByTestId } = await openSettings()
      const input = getByTestId('billing-settings-search')
      const budget = getByTestId('billing-budget')
      const alert = getByTestId('billing-peak-alert-settings')
      expect(getComputedStyle(budget).display).toBe('flex')
      fireEvent.change(input, { target: { value: '峰谷' } })
      expect(getComputedStyle(budget).display).toBe('none')
      expect(getComputedStyle(alert).display).toBe('flex')
    } finally {
      style.remove()
    }
  })

  it.each([
    ['dashboard', 'rich', false, 'smooth'],
    ['dashboard', 'subtle', false, 'auto'],
    ['dashboard', 'off', false, 'auto'],
    ['dashboard', 'rich', true, 'auto'],
    ['native', 'rich', false, 'smooth'],
    ['native', 'subtle', false, 'auto'],
    ['native', 'off', false, 'auto'],
    ['native', 'rich', true, 'auto'],
  ] as const)('%s 模式从锚点滚动到预算卡，动效 %s，系统减弱动效 %s', async (surface, motion, reducedMotion, behavior) => {
    localStorage.setItem(MOTION_STORAGE_KEY, motion)
    const matchMedia = vi.fn((query: string) => ({ matches: query === '(prefers-reduced-motion: reduce)' && reducedMotion }))
    vi.stubGlobal('matchMedia', matchMedia)
    const { getByTestId } = await openSettings(surface)
    const nav = getByTestId('billing-settings-nav')
    const anchor = getByTestId('billing-settings-nav-budget')
    const card = getByTestId('billing-budget')
    const body = getByTestId('billing-tab-panel-settings').parentElement!
    const input = getByTestId<HTMLInputElement>('billing-settings-search')
    const scrollTo = vi.fn()
    const scrollIntoView = vi.fn(function (this: HTMLElement, _options: ScrollIntoViewOptions) {
      expect(this).toBe(card)
      expect(this.style.scrollMarginTop).toBe('62px')
    })
    Object.assign(body, { scrollTop: 100, scrollTo })
    Object.assign(card, { scrollIntoView })
    Object.defineProperty(body, 'clientTop', { value: 2 })
    nav.getBoundingClientRect = () => new DOMRect(0, 0, 400, 54)
    body.getBoundingClientRect = () => new DOMRect(0, 160, 400, 500)
    card.getBoundingClientRect = () => new DOMRect(0, 400, 400, 200)

    fireEvent.change(input, { target: { value: '预算' } })
    fireEvent.click(anchor)

    expect(input.value).toBe('预算')
    expect(getByTestId('billing-peak-alert-settings').hidden).toBe(true)
    expect(document.activeElement).toBe(card.querySelector('h3'))
    expect(anchor.getAttribute('aria-current')).toBe('location')
    if (surface === 'native') {
      expect(scrollIntoView).toHaveBeenCalledExactlyOnceWith({ block: 'start', behavior })
      expect(scrollTo).not.toHaveBeenCalled()
    } else {
      expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 276, behavior })
      expect(scrollIntoView).not.toHaveBeenCalled()
    }
  })

  it('显示锚点跳到仍可见的分区并保留过滤', async () => {
    const { getByTestId } = await openSettings()
    const input = getByTestId<HTMLInputElement>('billing-settings-search')
    fireEvent.change(input, { target: { value: 'visibility' } })
    const primary = getByTestId('billing-toggle-setting')
    const extra = getByTestId('billing-display-setting')
    const anchor = getByTestId('billing-settings-nav-display')
    fireEvent.click(anchor)
    expect(input.value).toBe('visibility')
    expect(primary.hidden).toBe(true)
    expect(extra.hidden).toBe(false)
    expect(document.activeElement).toBe(extra.querySelector('h3'))
    expect(anchor.getAttribute('aria-current')).toBe('location')
  })

  it.each(['dashboard', 'native'] as const)('%s 滚动露出被吸顶导航遮住的焦点', async surface => {
    const { getByTestId } = await openSettings(surface)
    const input = getByTestId('billing-settings-search')
    const nav = getByTestId('billing-settings-nav')
    const body = getByTestId('billing-tab-panel-settings').parentElement!
    nav.getBoundingClientRect = () => new DOMRect(0, 160, 400, 54)
    body.getBoundingClientRect = () => new DOMRect(0, 160, 400, 500)
    input.getBoundingClientRect = () => new DOMRect(0, 200, 400, 30)
    const scrollTo = vi.fn()
    Object.assign(body, { scrollTop: 100, scrollTo })
    const scrollIntoView = vi.fn(() => { expect(input.style.scrollMarginTop).toBe('62px') })
    Object.assign(input, { scrollIntoView })
    act(() => { input.focus() })
    if (surface === 'native') {
      await waitFor(() => { expect(scrollIntoView).toHaveBeenCalledExactlyOnceWith({ block: 'start', behavior: 'auto' }) })
      expect(scrollTo).not.toHaveBeenCalled()
    } else {
      await waitFor(() => { expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 78, behavior: 'auto' }) })
      expect(scrollIntoView).not.toHaveBeenCalled()
    }
  })

  it('清空搜索：全部分区恢复显示', async () => {
    const { getByTestId } = await openSettings()
    const input = getByTestId('billing-settings-search')
    fireEvent.change(input, { target: { value: '峰谷' } })
    await waitFor(() => { expect(getByTestId('billing-budget').hidden).toBe(true) })
    fireEvent.change(input, { target: { value: '' } })
    await waitFor(() => { expect(getByTestId('billing-budget').hidden).toBe(false) })
  })

  it('全部不命中：显示空态提示', async () => {
    const { getByTestId, queryByTestId } = await openSettings()
    const input = getByTestId('billing-settings-search')
    fireEvent.change(input, { target: { value: '不存在的关键词xyz' } })
    await waitFor(() => {
      expect(getByTestId('billing-budget').hidden).toBe(true)
      expect(queryByTestId('billing-settings-search-empty')).not.toBeNull()
    })
  })
})
