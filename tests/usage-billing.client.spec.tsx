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
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-web-react'
import { UsageBilling, providerFromModelKey } from '../src/client/UsageBilling.tsx'
import { createBillingBudgetStore } from '../src/client/budget-store.ts'
import { zh } from '../src/client/locales.ts'

beforeEach(() => { localStorage.clear() })

afterEach(() => {
  cleanup()
})

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

describe('UsageBilling surface', () => {
  it('opens the dashboard modal on trigger click without throwing', async () => {
    // 预算 store 份额：测试经 create().create() 的 sanctioned 路径提供真实实例。
    const budgetStore = createBillingBudgetStore().create()
    const props = {
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
    const { container } = render(<UsageBilling {...props} />)
    const trigger = container.querySelector('button')
    expect(trigger).not.toBeNull()
    fireEvent.click(trigger!)
    // 弹窗标题出现说明 BillingDashboard 成功渲染。
    expect(await screen.findByText('使用统计')).toBeTruthy()
    // 预算开关默认关闭：开关存在但不渲染进度与金额。
    expect(screen.getByTestId('billing-budget-toggle').getAttribute('aria-checked')).toBe('false')
    expect(screen.queryByTestId('billing-budget-track')).toBeNull()
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
