// @vitest-environment jsdom
/**
 * UsageBilling surface smoke test: clicking the sidebar footer trigger must
 * open the dashboard modal without throwing. A render throw unmounts the
 * whole plugin surface in the host (the reported "modal flashes and the
 * footer trigger disappears" symptom).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ComponentProps } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-test-runtime'
import { UsageBilling, providerFromModelKey } from '../src/client/UsageBilling.tsx'
import { createBillingBudgetStore } from '../src/client/budget-store.ts'
import { zh } from '../src/client/locales.ts'

beforeEach(() => { localStorage.clear() })

afterEach(() => {
  cleanup()
})

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

describe('UsageBilling surface', () => {
  // 共享 props：预算 store 真实实例、装饰孔位空实现、zh 字典 t。
  const makeProps = (): ComponentProps<typeof UsageBilling> => {
    const budgetStore = createBillingBudgetStore().create()
    return {
      wide: true,
      t,
      checkModels: async () => ({
        checked: true, available: true, models: 1, failures: 0, okProviders: [], badProviders: [],
      }),
      // 装饰孔位在单测中无注册者：renderSlot 返回 null；数据桥 stub 空实现。
      publishCosts: () => {},
      registerOpen: () => () => {},
      renderSlot: () => null,
      useStore: bindSnapshotSelector(budgetStore),
      actions: budgetStore.actions,
    } as unknown as ComponentProps<typeof UsageBilling>
  }

  it('opens the dashboard modal on trigger click without throwing', async () => {
    const { container } = render(<UsageBilling {...makeProps()} />)
    const trigger = container.querySelector('button')
    expect(trigger).not.toBeNull()
    fireEvent.click(trigger!)
    // 弹窗标题说明 BillingDashboard 成功渲染。
    expect(await screen.findByText('使用统计')).toBeTruthy()
    // 预算设置在设置 Tab：先切换再操作。
    fireEvent.click(await screen.findByTestId('billing-tab-settings'))
    // 预算开关默认关闭：开关存在但不渲染进度与金额。
    expect(screen.getByTestId('billing-budget-toggle').getAttribute('aria-checked')).toBe('false')
    expect(screen.queryByTestId('billing-budget-track')).toBeNull()
    // usage_stats 工具开关：默认关闭（初始未开启，经插件自带接口读写）。
    const usageStatsToggle = screen.getByTestId('billing-usage-stats-tool-toggle')
    expect(usageStatsToggle.getAttribute('aria-checked')).toBe('false')
  })

  it('switches the dashboard copy to English when the currency is set to USD (strict bilingual binding)', async () => {
    const { container } = render(<UsageBilling {...makeProps()} />)
    fireEvent.click(container.querySelector('button')!)
    await screen.findByText('使用统计')
    // 默认 CNY：面板为中文文案。
    expect(screen.getByText('概览')).toBeTruthy()
    // 切到 USD：本插件文案联动为英文（「概览」→「Overview」），不动宿主全局语言。
    fireEvent.click(screen.getByTestId('billing-currency-usd'))
    expect(await screen.findByText('Overview')).toBeTruthy()
    expect(screen.queryByText('概览')).toBeNull()
  })

  it('switches the trigger card main metric between cost and token usage from the settings tab', async () => {
    render(<UsageBilling {...makeProps()} />)
    const card = screen.getByTestId('billing-trigger')
    // 默认 money 视角：副行带 ¥ 币符，tokens 主数字不渲染。
    expect(card.textContent).toContain('¥')
    expect(screen.queryByTestId('billing-trigger-month-tokens')).toBeNull()
    // 设置 Tab → 计费卡显示：切到 Token 消耗。
    fireEvent.click(card)
    await screen.findByText('使用统计')
    fireEvent.click(await screen.findByTestId('billing-tab-settings'))
    fireEvent.click(await screen.findByTestId('billing-card-tokens'))
    // 修改即写入 localStorage。
    expect(JSON.parse(localStorage.getItem('dsh.ui-usage-billing.card')!)).toEqual({ metric: 'tokens' })
    // 弹窗开着 trigger 也常驻：主行切为缩写 token（K/M/B），副行不再带币符。
    expect(screen.getByTestId('billing-trigger-month-tokens').textContent).toBe('0')
    expect(screen.getByTestId('billing-trigger').textContent).not.toContain('¥')
    // 切回金额：tokens 主数字消失、币符恢复。
    fireEvent.click(await screen.findByTestId('billing-card-money'))
    expect(screen.queryByTestId('billing-trigger-month-tokens')).toBeNull()
    expect(screen.getByTestId('billing-trigger').textContent).toContain('¥')
  })

  it('shows the live-cost capsule toggle by default and persists hiding it with a cross-tree broadcast', async () => {
    // LiveCostBar 与设置面板分属两个 React 树：切换要广播 CustomEvent 通知 dock 侧。
    const events: string[] = []
    const listener = (): void => { events.push('livecost') }
    window.addEventListener('dsh.ui-usage-billing.livecost-pref', listener)
    try {
      render(<UsageBilling {...makeProps()} />)
      fireEvent.click(screen.getByTestId('billing-trigger'))
      await screen.findByText('使用统计')
      fireEvent.click(await screen.findByTestId('billing-tab-settings'))
      // 默认显示：开关 aria-checked=true，localStorage 无记录（升级用户零感知）。
      const toggle = await screen.findByTestId('billing-livecost-toggle')
      expect(toggle.getAttribute('aria-checked')).toBe('true')
      expect(localStorage.getItem('dsh.ui-usage-billing.livecost')).toBeNull()
      // 关闭：状态翻转、localStorage 持久化、广播 CustomEvent（dock 侧即时显隐信号）。
      fireEvent.click(toggle)
      expect(toggle.getAttribute('aria-checked')).toBe('false')
      expect(JSON.parse(localStorage.getItem('dsh.ui-usage-billing.livecost')!)).toEqual({ show: false })
      expect(events).toEqual(['livecost'])
    } finally {
      window.removeEventListener('dsh.ui-usage-billing.livecost-pref', listener)
    }
  })
})

describe('providerFromModelKey (B5 model-id fallback)', () => {
  it('matches known vendor prefixes and segments', () => {
    expect(providerFromModelKey('deepseek-chat')).toBe('DeepSeek')
    expect(providerFromModelKey('qwen-max')).toBe('阿里通义')
    expect(providerFromModelKey('glm-4.6')).toBe('智谱 AI')
    expect(providerFromModelKey('kimi-k2.7-hs')).toBe('月之暗面')
  })

  it('matches the mimo model id to Xiaomi without swallowing minimax', () => {
    // 弱匹配：mimo 是小米模型名的核心词，与 mi-mimo-2.5 前缀形式都命中。
    expect(providerFromModelKey('mi-mimo-2.5')).toBe('小米')
    expect(providerFromModelKey('mimo2.5')).toBe('小米')
    // minimax 不走短别名 mi 的子串，而是命中自己的前缀。
    expect(providerFromModelKey('minimax-4.0')).toBe('MiniMax')
  })

  it('falls back to undefined for unknown ids', () => {
    expect(providerFromModelKey('totally-unknown-model-x')).toBeUndefined()
    expect(providerFromModelKey('')).toBeUndefined()
  })
})
