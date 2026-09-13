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
import { bindSnapshotSelector } from './bind-snapshot-selector'
import { UsageBilling, providerFromModelKey, rechargeUrlOf } from '../src/client/UsageBilling.tsx'
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

  it('keeps the hover quick-view width fixed regardless of the trigger card (issue #45)', () => {
    // 悬浮卡尺寸固定（CSS 层 = 宿主默认侧栏下的计费卡宽），JS 不再按触发卡
    // rect 内联设置宽度——侧栏被其他插件挤压、用户拖宽侧栏都不影响悬浮卡。
    const { container } = render(<UsageBilling {...makeProps()} />)
    const trigger = container.querySelector('button')!
    fireEvent.mouseEnter(trigger)
    const pop = document.body.querySelector('[data-testid="billing-trigger-pop"]') as HTMLElement
    expect(pop).not.toBeNull()
    expect(pop.style.width).toBe('')
  })

  it('switches the trigger card main metric between cost and token usage from the settings tab', async () => {
    render(<UsageBilling {...makeProps()} />)
    const card = screen.getByTestId('billing-trigger')
    // 默认 money 视角：主数字带 ¥ 币符，tokens 主数字不渲染（单值卡面，issue #47 反馈）。
    expect(card.textContent).toContain('¥')
    expect(screen.queryByTestId('billing-trigger-span-tokens')).toBeNull()
    // 设置 Tab → 计费卡显示：切到 Token 消耗。
    fireEvent.click(card)
    await screen.findByText('使用统计')
    fireEvent.click(await screen.findByTestId('billing-tab-settings'))
    fireEvent.click(await screen.findByTestId('billing-card-tokens'))
    // 修改即写入 localStorage（span 字段一并持久化，默认日口径）。
    expect(JSON.parse(localStorage.getItem('dsh.ui-usage-billing.card')!)).toEqual({ metric: 'tokens', span: 'day' })
    // 弹窗开着 trigger 也常驻：主行切为缩写 token（K/M/B），金额币符消失。
    expect(screen.getByTestId('billing-trigger-span-tokens').textContent).toBe('0')
    expect(screen.getByTestId('billing-trigger').textContent).not.toContain('¥')
    // 切回金额：tokens 主数字消失、币符恢复。
    fireEvent.click(await screen.findByTestId('billing-card-money'))
    expect(screen.queryByTestId('billing-trigger-span-tokens')).toBeNull()
    expect(screen.getByTestId('billing-trigger').textContent).toContain('¥')
  })

  it('shows the hover quick-view cache-hit cell as a hit-rate percentage (issue #47 feedback)', () => {
    const { container } = render(<UsageBilling {...makeProps()} />)
    const trigger = container.querySelector('button')!
    fireEvent.mouseEnter(trigger)
    const pop = document.body.querySelector('[data-testid="billing-trigger-pop"]') as HTMLElement
    expect(pop).not.toBeNull()
    // 悬浮卡行2「缓存命中」显示命中率百分比（无数据为 0.0%），不再是 Token 量。
    expect(pop.textContent).toContain('0.0%')
  })

  it('persists the overview KPI global range across remounts (issue #47 feedback)', async () => {
    render(<UsageBilling {...makeProps()} />)
    fireEvent.click(screen.getByTestId('billing-trigger'))
    await screen.findByText('使用统计')
    // 默认累计：all 按下。切到本周并持久化。
    expect(screen.getByTestId('billing-kpi-range-all').getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(await screen.findByTestId('billing-kpi-range-week'))
    expect(localStorage.getItem('dsh.ui-usage-billing.kpi-range')).toBe('week')
    cleanup()
    // 重新挂载：范围保持上次选择（本周），不再回到默认。
    render(<UsageBilling {...makeProps()} />)
    fireEvent.click(screen.getByTestId('billing-trigger'))
    await screen.findByText('使用统计')
    expect(screen.getByTestId('billing-kpi-range-week').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('billing-kpi-range-all').getAttribute('aria-pressed')).toBe('false')
  })

  it('renders the hero gauge as a remaining-budget dial with used/total beneath (issue #47 feedback)', async () => {
    render(<UsageBilling {...makeProps()} />)
    fireEvent.click(screen.getByTestId('billing-trigger'))
    await screen.findByText('使用统计')
    // 默认未启用预算：圆环整体不渲染（不再有「本月占本年」装饰回退）。
    expect(screen.queryByTestId('billing-hero-gauge')).toBeNull()
    // 设置 Tab 开启预算并设 10 元后回概览（默认金额 0 时不渲染圆环）。
    fireEvent.click(await screen.findByTestId('billing-tab-settings'))
    fireEvent.click(await screen.findByTestId('billing-budget-toggle'))
    fireEvent.change(await screen.findByTestId('billing-budget-input'), { target: { value: '10' } })
    fireEvent.click(await screen.findByTestId('billing-tab-overview'))
    const gauge = await screen.findByTestId('billing-hero-gauge')
    // 中心 = 剩余预算两位小数（默认 10 元未动）+ 「剩余预算」标签。
    expect(gauge.textContent).toContain('¥10.00')
    expect(gauge.textContent).toContain('剩余预算')
    // 圆环下方 = 已用/总额读数（原底部进度行的数值，无百分比，无独立进度条）。
    expect(gauge.textContent).toContain('¥0 / ¥10.0')
    expect(screen.queryByTestId('billing-hero-budget')).toBeNull()
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
      expect(JSON.parse(localStorage.getItem('dsh.ui-usage-billing.livecost')!)).toEqual({ show: false, position: 'toolbar' })
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

describe('rechargeUrlOf (issue #47 账单页官方充值入口)', () => {
  it('maps the exact normalized provider to its official top-up page', () => {
    expect(rechargeUrlOf('DeepSeek')).toBe('https://platform.deepseek.com/top_up')
    expect(rechargeUrlOf('MiniMax')).toBe('https://platform.minimax.cn/console/recharge-records')
    expect(rechargeUrlOf('月之暗面')).toBe('https://platform.kimi.com/console/pay')
  })

  it('matches alias prefixes so region variants reuse the vendor URL', () => {
    // 归一化后带 region/产品后缀的名字走前缀命中，与该厂商主充值页一致。
    expect(rechargeUrlOf('月之暗面 Kimi For Coding')).toBe('https://platform.kimi.com/console/pay')
    expect(rechargeUrlOf('智谱 AI GLM')).toBe('https://open.bigmodel.cn/finance-center/finance/pay')
  })

  it('covers xiaomi and the chinese channel group names (issue #47 反馈：非 DeepSeek 组也要有充值入口)', () => {
    // 小米 MiMo 开放平台；'mi'/'mimo' 前缀等价。
    expect(rechargeUrlOf('xiaomi-token-plan-cn')).toBe('https://platform.xiaomimimo.com/console/balance')
    expect(rechargeUrlOf('mi-mimo')).toBe('https://platform.xiaomimimo.com/console/balance')
    expect(rechargeUrlOf('mimo-cn')).toBe('https://platform.xiaomimimo.com/console/balance')
    // 账单分组名是通道显示名：中文组名靠「腾讯云」前缀命中映射到腾讯云充值中心。
    expect(rechargeUrlOf('腾讯云 Token Plan')).toBe('https://console.cloud.tencent.com/expense/recharge')
    expect(rechargeUrlOf('腾讯云 TokenHub')).toBe('https://console.cloud.tencent.com/expense/recharge')
    // 前缀命中按键序：'minimax-cn' 必须被 'minimax' 摘走，不被更短的 'mi' 劫持。
    expect(rechargeUrlOf('minimax-cn')).toBe('https://platform.minimax.cn/console/recharge-records')
    expect(rechargeUrlOf('kimi-coding')).toBe('https://platform.kimi.com/console/pay')
  })

  it('returns undefined for vendors without a known official top-up page', () => {
    expect(rechargeUrlOf('某私有网关')).toBeUndefined()
    expect(rechargeUrlOf('')).toBeUndefined()
  })
})
