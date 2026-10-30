// @vitest-environment jsdom
/**
 * UsageBilling surface smoke test: clicking the sidebar footer trigger must
 * open the dashboard modal without throwing. A render throw unmounts the
 * whole plugin surface in the host (the reported "modal flashes and the
 * footer trigger disappears" symptom).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { bindSnapshotSelector } from './bind-snapshot-selector'
import { UsageBilling } from '../src/client/UsageBilling.tsx'
import { providerFromModelKey } from '../src/client/domain/provider-aliases.ts'
import { rechargeUrlOf } from '../src/client/domain/recharge.ts'
import { createBillingBudgetStore } from '../src/client/budget-store.ts'
import { zh } from '../src/client/locales.ts'

beforeEach(() => { localStorage.clear() })

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
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

  it('drives the dashboard copy from the language toggle, independently of the currency (issue #69)', async () => {
    const { container } = render(<UsageBilling {...makeProps()} />)
    fireEvent.click(container.querySelector('button')!)
    await screen.findByText('使用统计')
    // 首次打开：语言偏好由已存币种播种一次（默认 CNY → 中文）。
    expect(screen.getByText('概览')).toBeTruthy()
    // 切到 USD 不再改变语言：币种与语言已解耦（第三种币种 EUR 使旧绑定无解）。
    fireEvent.click(screen.getByTestId('billing-currency-usd'))
    expect(screen.getByText('概览')).toBeTruthy()
    // 语言开关是切换文案的唯一入口，且不动宿主全局语言。
    fireEvent.click(screen.getByTestId('billing-language-en'))
    expect(await screen.findByText('Overview')).toBeTruthy()
    expect(screen.queryByText('概览')).toBeNull()
    // 切回 CNY 也不会把文案拉回中文。
    fireEvent.click(screen.getByTestId('billing-currency-cny'))
    expect(screen.getByText('Overview')).toBeTruthy()
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
    // 修改即写入 localStorage（span/showDelta 字段一并持久化，默认日口径+显示徽章）。
    expect(JSON.parse(localStorage.getItem('dsh.ui-usage-billing.card')!)).toEqual({ mode: 'full', metric: 'tokens', span: 'day', showDelta: true })
    // 弹窗开着 trigger 也常驻：主行切为缩写 token（K/M/B），金额币符消失。
    expect(screen.getByTestId('billing-trigger-span-tokens').textContent).toBe('0')
    expect(screen.getByTestId('billing-trigger').textContent).not.toContain('¥')
    // 切回金额：tokens 主数字消失、币符恢复。
    fireEvent.click(await screen.findByTestId('billing-card-money'))
    expect(screen.queryByTestId('billing-trigger-span-tokens')).toBeNull()
    expect(screen.getByTestId('billing-trigger').textContent).toContain('¥')
  })

  it('hides the trigger day-over-day badge from the billing-card settings (issue #93)', async () => {
    // 喂两天数据（昨日 2 元 / 今日 1 元）让环比非零：默认显示 ▼ 50.0%。
    const pad = (n: number): string => String(n).padStart(2, '0')
    const stamp = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const today = new Date()
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const dayRow = (cost: number) => ({ calls: 1, input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cost })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ total: dayRow(3), byDay: { [stamp(yesterday)]: dayRow(2), [stamp(today)]: dayRow(1) } }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )))
    render(<UsageBilling {...makeProps()} />)
    // 数据到达后徽章默认渲染（昨日缺失时不渲染，所以先等它出现）。
    expect(await screen.findByTestId('billing-trigger-delta').then(el => el.textContent)).toBe('▼ 50.0%')
    // 设置 Tab → 计费卡显示：关掉「今日环比」徽章。
    fireEvent.click(screen.getByTestId('billing-trigger'))
    fireEvent.click(await screen.findByTestId('billing-tab-settings'))
    fireEvent.click(await screen.findByTestId('billing-card-delta-hide'))
    // 修改即持久化（showDelta: false），且卡面徽章立即消失。
    expect(JSON.parse(localStorage.getItem('dsh.ui-usage-billing.card')!)).toEqual({ mode: 'full', metric: 'money', span: 'day', showDelta: false })
    expect(screen.queryByTestId('billing-trigger-delta')).toBeNull()
    // 重新打开开关徽章恢复。
    fireEvent.click(await screen.findByTestId('billing-card-delta-show'))
    expect(screen.getByTestId('billing-trigger-delta').textContent).toBe('▼ 50.0%')
  })

  it('scrolls only the plugin dashboard body when a settings anchor is clicked (issue #94)', async () => {
    // scrollIntoView 会滚动所有可滚动祖先：宿主 modal 外壳被波及、标题栏错位。
    // 回归锁：锚点点击只允许走 dashboardBody 的 scrollTo，禁止 scrollIntoView。
    const scrollSpy = vi.fn()
    const scrollIntoViewSpy = vi.fn()
    const proto = Element.prototype as unknown as Record<string, unknown>
    const origScrollTo = proto.scrollTo
    const origScrollIntoView = proto.scrollIntoView
    proto.scrollTo = scrollSpy
    proto.scrollIntoView = scrollIntoViewSpy
    try {
      render(<UsageBilling {...makeProps()} />)
      fireEvent.click(screen.getByTestId('billing-trigger'))
      await screen.findByText('使用统计')
      fireEvent.click(await screen.findByTestId('billing-tab-settings'))
      fireEvent.click(screen.getByTestId('billing-settings-nav-alert'))
      expect(scrollIntoViewSpy).not.toHaveBeenCalled()
      expect(scrollSpy).toHaveBeenCalledTimes(1)
      expect(scrollSpy.mock.calls[0]?.[0]).toMatchObject({ behavior: 'smooth' })
    } finally {
      proto.scrollTo = origScrollTo
      proto.scrollIntoView = origScrollIntoView
    }
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

  it('applies an exact custom date range to Hero and KPI and persists both dates (issue #107)', async () => {
    const pad = (n: number): string => String(n).padStart(2, '0')
    const day = (offset: number): string => {
      const date = new Date()
      date.setDate(date.getDate() + offset)
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    }
    const row = (cost: number, calls: number) => ({
      cost, calls, input: cost * 200, output: cost * 100,
      cacheHit: cost * 100, cacheMiss: cost * 100, reasoning: cost * 50,
    })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      total: row(10, 6),
      byDay: { [day(-2)]: row(5, 1), [day(-1)]: row(2, 2), [day(0)]: row(3, 3) },
    }), { status: 200, headers: { 'content-type': 'application/json' } })))

    render(<UsageBilling {...makeProps()} />)
    fireEvent.click(screen.getByTestId('billing-trigger'))
    await screen.findByText('使用统计')
    await screen.findByTestId('billing-kpi-range-custom')
    fireEvent.click(screen.getByTestId('billing-kpi-range-custom'))

    const start = screen.getByTestId('billing-kpi-custom-start') as HTMLInputElement
    const end = screen.getByTestId('billing-kpi-custom-end') as HTMLInputElement
    expect(start.value).toBe(day(-1))
    expect(end.value).toBe(day(-1))
    expect(screen.getByTestId('billing-hero-range-label').textContent).toBe(day(-1))
    expect(screen.getByTestId('billing-hero-range-value').textContent).toBe('2.00')
    expect(screen.getByTestId('billing-kpi-avg').textContent).toContain('¥1.00')
    expect(screen.getByTestId('billing-kpi-avg').textContent).toContain('2')

    // Crossing the other endpoint keeps a valid closed interval instead of mixing all history.
    fireEvent.change(start, { target: { value: day(0) } })
    expect(end.value).toBe(day(0))
    expect(screen.getByTestId('billing-hero-range-value').textContent).toBe('3.00')
    fireEvent.change(end, { target: { value: day(-1) } })
    expect(start.value).toBe(day(-1))
    expect(end.value).toBe(day(-1))
    expect(JSON.parse(localStorage.getItem('dsh.ui-usage-billing.kpi-custom-range')!)).toEqual({ start: day(-1), end: day(-1) })
    expect(localStorage.getItem('dsh.ui-usage-billing.kpi-range')).toBe('custom')

    cleanup()
    render(<UsageBilling {...makeProps()} />)
    fireEvent.click(screen.getByTestId('billing-trigger'))
    await screen.findByText('使用统计')
    expect(screen.getByTestId('billing-kpi-range-custom').getAttribute('aria-pressed')).toBe('true')
    expect((screen.getByTestId('billing-kpi-custom-start') as HTMLInputElement).value).toBe(day(-1))
    expect(screen.getByTestId('billing-hero-range-value').textContent).toBe('2.00')
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

describe('UserPriceCard numeric input drafts (per-keystroke round-trip fix)', () => {
  const openUserPriceRow = async (): Promise<HTMLInputElement> => {
    const { container } = render(<UsageBilling {...makePropsForPrice()} />)
    fireEvent.click(container.querySelector('button')!)
    await screen.findByText('使用统计')
    fireEvent.click(await screen.findByTestId('billing-tab-settings'))
    fireEvent.click(await screen.findByTestId('billing-user-price-add'))
    const line = await screen.findByTestId('billing-user-price-normal')
    return line.querySelectorAll('input')[0] as HTMLInputElement
  }
  // makeProps 是上层 describe 的局部量，这里复用同一形状。
  const makePropsForPrice = (): ComponentProps<typeof UsageBilling> => {
    const budgetStore = createBillingBudgetStore().create()
    return {
      wide: true,
      t,
      checkModels: async () => ({
        checked: true, available: true, models: 1, failures: 0, okProviders: [], badProviders: [],
      }),
      publishCosts: () => {},
      registerOpen: () => () => {},
      renderSlot: () => null,
      useStore: bindSnapshotSelector(budgetStore),
      actions: budgetStore.actions,
    } as unknown as ComponentProps<typeof UsageBilling>
  }

  it('keeps the raw keystrokes while editing and normalizes only on blur', async () => {
    const input = await openUserPriceRow()
    // 逐键输入 1.50：浏览器对 number 输入把未完成的 "1." 报为空串（badInput），
    // 有效串原样上报——草稿保留原始串。旧实现 parse→String 回填会把 "1.50" 的
    // 尾零在键入瞬间归一成 "1.5"，显示与用户输入打架（本组断言的回归守卫点）。
    const keystrokes: readonly [string, string][] = [
      ['1', '1'],
      ['', ''],      // 键入 "1." 的中间态：浏览器上报空串
      ['1.5', '1.5'],
      ['1.50', '1.50'],
    ]
    for (const [typed, visible] of keystrokes) {
      fireEvent.change(input, { target: { value: typed } })
      expect(input.value).toBe(visible)
    }
    // 失焦：草稿丢弃，显示回落到已提交值的规范形。
    fireEvent.blur(input)
    expect(input.value).toBe('1.5')
  })

  it('commits valid values immediately so the draft row stays usable', async () => {
    const input = await openUserPriceRow()
    fireEvent.change(input, { target: { value: '2.25' } })
    // 清空再失焦：提交值已是 2.25（清空动作本身提交 0，不影响此前保存的语义验证），
    // 但编辑中显示保留空串草稿，不再被立即回填为旧值。
    fireEvent.change(input, { target: { value: '' } })
    expect(input.value).toBe('')
    fireEvent.change(input, { target: { value: '3' } })
    fireEvent.blur(input)
    expect(input.value).toBe('3')
  })
})
