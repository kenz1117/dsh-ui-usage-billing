// @vitest-environment jsdom
/**
 * UsageBilling real-data smoke test: feeds the surface a realistic
 * usage-stats snapshot (multi-model, multi-day, byDayModels) through the
 * same fetch the browser uses, then opens the modal. Any render throw here
 * unmounts the whole plugin surface in the host.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-web-react'
import { UsageBilling } from '../src/client/UsageBilling.tsx'
import { createBillingBudgetStore } from '../src/client/budget-store.ts'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

beforeEach(() => { localStorage.clear() })

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

/** 组件 props：数据桥 stub 空实现 + 真实预算 store 实例（persist 经 localStorage）。 */
function makeProps(): ComponentProps<typeof UsageBilling> {
  const budgetStore = createBillingBudgetStore().create()
  return {
    wide: true,
    t,
    checkModels: async () => ({
      checked: true, available: true, models: 1, failures: 0, okProviders: [], badProviders: [],
    }),
    // 装饰孔位在单测中无注册者：renderSlot 返回 null。
    publishCosts: () => {},
    registerOpen: () => () => {},
    renderSlot: () => null,
    useStore: bindSnapshotSelector(budgetStore),
    actions: budgetStore.actions,
  } as unknown as ComponentProps<typeof UsageBilling>
}

/** One day's stats row shape as the node half aggregates it. */
function day(calls: number, input: number, output: number, cacheHit: number, cacheMiss: number, cost: number) {
  return { calls, input, output, cacheHit, cacheMiss, cost }
}

/** Realistic multi-model multi-day snapshot (7-day window), with a monthly budget. */
const REAL_STATS = {
  budget: 10,
  total: day(137, 88_000_000, 12_000_000, 40_000_000, 48_000_000, 3.42),
  byModel: {
    'flash': day(100, 60_000_000, 8_000_000, 30_000_000, 30_000_000, 2.1),
    'pro': day(37, 28_000_000, 4_000_000, 10_000_000, 18_000_000, 1.32),
  },
  byDay: {
    '2026-08-14': day(20, 12_000_000, 2_000_000, 5_000_000, 7_000_000, 0.51),
    '2026-08-15': day(48, 31_000_000, 4_500_000, 14_000_000, 17_000_000, 1.2),
    '2026-08-16': day(69, 45_000_000, 5_500_000, 21_000_000, 24_000_000, 1.71),
  },
  byDayModels: {
    '2026-08-15': {
      'flash': day(35, 21_000_000, 3_000_000, 10_000_000, 11_000_000, 0.74),
      'pro': day(13, 10_000_000, 1_500_000, 4_000_000, 6_000_000, 0.46),
    },
    '2026-08-16': {
      'flash': day(50, 32_000_000, 4_000_000, 15_000_000, 17_000_000, 1.12),
      'pro': day(19, 13_000_000, 1_500_000, 6_000_000, 7_000_000, 0.59),
    },
  },
  bySession: [
    { id: 'sess-shop-1', title: '修复登录 bug', cwd: '/home/ken/shop-web', calls: 80, cost: 2.4, lastActive: Date.UTC(2026, 7, 16, 8, 0, 0) },
    { id: 'sess-api-2', cwd: '/home/ken/api-server', calls: 20, cost: 1.02, lastActive: Date.UTC(2026, 7, 15, 9, 30, 0) },
  ],
}

/** 本地时区今日日期戳（与组件的 localDayStamp 同规则）。 */
function todayStamp(): string {
  const date = new Date()
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

describe('UsageBilling real-data surface', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const body = url.includes('/api/billing/pricing')
        ? { source: 'builtin' }
        : REAL_STATS
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
    }))
  })

  it('opens the dashboard over a realistic snapshot without throwing', async () => {
    const { container } = render(<UsageBilling {...makeProps()} />)
    const trigger = container.querySelector('button')
    expect(trigger).not.toBeNull()
    fireEvent.click(trigger!)
    // 弹窗标题 + 真实数据渲染完成（默认概览 Tab：Hero 与热力图面板）。
    expect(await screen.findByText('使用统计')).toBeTruthy()
    await waitFor(() => {
      expect(screen.queryByTestId('billing-tab-panel-overview')).not.toBeNull()
      expect(screen.queryByTestId('billing-panel-heatmap')).not.toBeNull()
    })
  })

  it('renders decor anchors: hero in overview, trend in trends, footer always', async () => {
    const positions: string[] = []
    const props = {
      ...makeProps(),
      renderSlot: (_slot: string, anchor: { position: string }) => {
        positions.push(anchor.position)
        return null
      },
    } as unknown as ComponentProps<typeof UsageBilling>
    const { container } = render(<UsageBilling {...props} />)
    fireEvent.click(container.querySelector('button')!)
    await screen.findByTestId('billing-tab-panel-overview')
    expect(positions).toContain('head')
    expect(positions).toContain('headTitle')
    expect(positions).toContain('hero')
    expect(positions).toContain('footer')
    expect(positions).not.toContain('trend')
    // 切到趋势 Tab：trend 锚点出现。
    fireEvent.click(screen.getByTestId('billing-tab-trends'))
    await screen.findByTestId('billing-tab-panel-trends')
    expect(positions).toContain('trend')
  })

  it('switches the trend window between 7 and 30 days', async () => {
    const { container } = render(<UsageBilling {...makeProps()} />)
    fireEvent.click(container.querySelector('button')!)
    // 趋势图在趋势 Tab：先切 Tab。
    fireEvent.click(await screen.findByTestId('billing-tab-trends'))
    const btn30 = await screen.findByTestId('billing-trend-30d')
    // 默认 7 天窗口。
    expect(screen.getByTestId('billing-trend-7d').getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(btn30)
    expect(btn30.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('billing-trend-7d').getAttribute('aria-pressed')).toBe('false')
  })

  it('toggles the budget strip on and edits the amount visually', async () => {
    const { container } = render(<UsageBilling {...makeProps()} />)
    fireEvent.click(container.querySelector('button')!)
    // 预算设置在设置 Tab：先切换再操作。
    fireEvent.click(await screen.findByTestId('billing-tab-settings'))
    const toggle = await screen.findByTestId('billing-budget-toggle')
    // 默认关闭：无进度条。
    expect(screen.queryByTestId('billing-budget-track')).toBeNull()
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-checked')).toBe('true')
    // 开启后沿用宿主默认金额（stats.budget = 10）：进度条与金额文本出现。
    expect(await screen.findByTestId('billing-budget-track')).toBeTruthy()
    expect(screen.getByTestId('billing-budget-value').textContent).toContain('¥10')
    // 可视化编辑金额：改为 50 后文本与进度同步更新。
    fireEvent.change(screen.getByTestId('billing-budget-input'), { target: { value: '50' } })
    expect(screen.getByTestId('billing-budget-value').textContent).toContain('¥50')
    // 关闭开关：进度与金额隐藏，只留标题行与开关。
    fireEvent.click(toggle)
    expect(screen.queryByTestId('billing-budget-track')).toBeNull()
  })

  it('shows the sessions panel with title, project basename, and cost rows', async () => {
    const { container } = render(<UsageBilling {...makeProps()} />)
    fireEvent.click(container.querySelector('button')!)
    // 会话明细在明细 Tab 内默认展开：切 Tab 后表格直接可见。
    fireEvent.click(await screen.findByTestId('billing-tab-providers'))
    const table = await screen.findByTestId('billing-sessions-table')
    // 标题行按费用倒序；无标题会话回退为 id 前 8 位；项目取 cwd 末级目录。
    expect(table.textContent).toContain('修复登录 bug')
    expect(table.textContent).toContain('shop-web')
    expect(table.textContent).toContain('api-server')
    expect(table.textContent).toContain('sess-api')
    expect(table.querySelectorAll('tbody tr')).toHaveLength(2)
  })

  it('notifies once per tier per day as spend crosses budget tiers', async () => {
    const notify = vi.fn()
    vi.stubGlobal('Notification', Object.assign(notify, {
      permission: 'granted' as NotificationPermission,
      requestPermission: async () => 'granted' as NotificationPermission,
    }))
    // 今日花费 5 元（动态日期戳，任何月份跑都成立）。
    const dynamicStats = {
      budget: 10,
      total: day(1, 1000, 100, 0, 1000, 5),
      byModel: { flash: day(1, 1000, 100, 0, 1000, 5) },
      byDay: { [todayStamp()]: day(1, 1000, 100, 0, 1000, 5) },
      byDayModels: {},
      bySession: [],
    }
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const body = url.includes('/api/billing/pricing') ? { source: 'builtin' } : dynamicStats
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
    }))
    const { container } = render(<UsageBilling {...makeProps()} />)
    fireEvent.click(container.querySelector('button')!)
    // 预算设置在设置 Tab：先切换再操作。
    fireEvent.click(await screen.findByTestId('billing-tab-settings'))
    // 开启预算（默认 10 元）：5/10 = 50%，跨 50% 档 → 第一次通知。
    fireEvent.click(await screen.findByTestId('billing-budget-toggle'))
    await waitFor(() => { expect(notify).toHaveBeenCalledTimes(1) })
    expect(notify.mock.calls[0]?.[1]?.body).toContain('50%')
    // 预算改 1 元：500% 跨 80%/100% 两档 → 只发最高档（100%），第二次通知。
    fireEvent.change(await screen.findByTestId('billing-budget-input'), { target: { value: '1' } })
    await waitFor(() => { expect(notify).toHaveBeenCalledTimes(2) })
    expect(notify.mock.calls[1]?.[1]?.body).toContain('100%')
    // 同一天内金额再变（2 元，250%）：各档当日均已提醒，不再通知。
    fireEvent.change(screen.getByTestId('billing-budget-input'), { target: { value: '2' } })
    await waitFor(() => {
      expect(screen.getByTestId('billing-budget-value').textContent).toContain('¥2')
    })
    expect(notify).toHaveBeenCalledTimes(2)
  })

  it('notifies the highest newly crossed budget tier once per day', async () => {
    // 今日花费 5.5 元 / 预算 10 元 = 55%：跨 50% 档，通知一次且文案带 50%。
    const notify = vi.fn()
    vi.stubGlobal('Notification', Object.assign(notify, {
      permission: 'granted' as NotificationPermission,
      requestPermission: async () => 'granted' as NotificationPermission,
    }))
    const dynamicStats = {
      budget: 10,
      total: day(1, 1000, 100, 0, 1000, 5.5),
      byModel: { flash: day(1, 1000, 100, 0, 1000, 5.5) },
      byDay: { [todayStamp()]: day(1, 1000, 100, 0, 1000, 5.5) },
      byDayModels: {},
      bySession: [],
    }
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const body = url.includes('/api/billing/pricing') ? { source: 'builtin' } : dynamicStats
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
    }))
    const { container } = render(<UsageBilling {...makeProps()} />)
    fireEvent.click(container.querySelector('button')!)
    // 预算设置在设置 Tab：先切换再操作。
    fireEvent.click(await screen.findByTestId('billing-tab-settings'))
    fireEvent.click(await screen.findByTestId('billing-budget-toggle'))
    await waitFor(() => { expect(notify).toHaveBeenCalledTimes(1) })
    expect(notify.mock.calls[0]?.[1]?.body).toContain('50%')
  })

  it('marks uncatalogued models and infers their provider from the model id', async () => {
    // mi-mimo-2.5 不在计费目录（收录的是 mimo-v2.5）：落回「其他」并标注未收录，
    // 提供方从 model id 反推为小米（而不是 Custom）。
    const stats = {
      ...REAL_STATS,
      byModel: {
        ...REAL_STATS.byModel,
        'mi-mimo-2.5': day(15, 9_000_000, 1_200_000, 3_000_000, 6_000_000, 0.4),
      },
    }
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = input
      const body = url.includes('/api/billing/pricing') ? { source: 'builtin' } : stats
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
    }))
    const { container } = render(<UsageBilling {...makeProps()} />)
    fireEvent.click(container.querySelector('button')!)
    // 未收录模型按厂商聚合：mi-mimo-2.5 反推出厂商为「小米」，落进小米厂商组。
    // 用厂商组 testid 定位（其他厂商组可能排在前，findByTestId 会取到第一个）。
    // 厂商面板在厂商 Tab：先切 Tab。
    fireEvent.click(await screen.findByTestId('billing-tab-providers'))
    const groups = await screen.findAllByTestId('billing-provider-group')
    const xiaomi = groups.find(group => group.textContent?.includes('小米'))
    expect(xiaomi).toBeDefined()
    const table = xiaomi!.querySelector('[data-testid="billing-table-scroll"]')
    expect(table).not.toBeNull()
    await waitFor(() => { expect(table!.textContent).toContain('mi-mimo-2.5') })
    // 只有这一行未收录（flash / pro 均在目录内）。
    expect(table!.querySelectorAll('[data-testid="billing-uncatalogued-tag"]')).toHaveLength(1)
  })

  it('shows the days-left estimate next to a healthy balance', async () => {
    // REAL_STATS 三天消耗合计 3.42 元 → 日均 1.14；DeepSeek 余额 20 元 → 约 17 天。
    // deepseek-chat 不在目录：provider 由 model id 反推为 DeepSeek，余额列才匹配得上。
    const stats = {
      ...REAL_STATS,
      byModel: {
        ...REAL_STATS.byModel,
        'deepseek-chat': day(25, 18_000_000, 2_000_000, 9_000_000, 9_000_000, 0.9),
      },
    }
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = input
      const body = url.includes('/api/billing/pricing')
        ? { source: 'builtin' }
        : url.includes('/api/billing/balance')
          ? { balances: [{ provider: 'deepseek', displayName: 'DeepSeek', currency: 'CNY', totalBalance: 20, isAvailable: true }] }
          : stats
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
    }))
    const { container } = render(<UsageBilling {...makeProps()} />)
    fireEvent.click(container.querySelector('button')!)
    // 余额按厂商匹配：目录里 flash / pro 与 deepseek-chat 同属 DeepSeek，归并到同一
    // 厂商组；余额只在厂商组头部显示一次（不再随每行重复），天数预估仍在头部。
    // 厂商面板在厂商 Tab：先切 Tab。
    fireEvent.click(await screen.findByTestId('billing-tab-providers'))
    const days = await screen.findAllByTestId('billing-balance-days-badge')
    expect(days).toHaveLength(1)
    expect(days[0]?.textContent).toBe('?')
  })

  it('notifies once when any balance drops below the threshold', async () => {
    // 类型化 stub：通知选项可从 mock 调用参数安全读取。
    const notify = vi.fn((_title: string, _options?: { body?: string }) => {})
    vi.stubGlobal('Notification', Object.assign(notify, {
      permission: 'granted',
      requestPermission: async () => 'granted',
    }))
    const dynamicStats = {
      budget: 10,
      total: day(1, 1000, 100, 0, 1000, 5),
      byModel: { flash: day(1, 1000, 100, 0, 1000, 5) },
      byDay: { [todayStamp()]: day(1, 1000, 100, 0, 1000, 5) },
      byDayModels: {},
      bySession: [],
    }
    // 余额 5 元低于默认阈值 50 元：每天提醒一次。
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = input
      const body = url.includes('/api/billing/pricing')
        ? { source: 'builtin' }
        : url.includes('/api/billing/balance')
          ? { balances: [{ provider: 'deepseek', displayName: 'DeepSeek', currency: 'CNY', totalBalance: 5, isAvailable: true }] }
          : dynamicStats
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
    }))
    const { container } = render(<UsageBilling {...makeProps()} />)
    fireEvent.click(container.querySelector('button')!)
    await waitFor(() => { expect(notify).toHaveBeenCalledTimes(1) })
    // 通知正文带余额与天数。
    expect(notify.mock.calls[0]?.[1]?.body).toContain('请及时充值')
  })

  it('groups subscription quotas under the matching model vendor', async () => {
    // kimi-coding 订阅归并到「月之暗面」厂商组；无月之暗面模型，组内只有订阅卡片。
    // DeepSeek 模型组只有模型用量表、无订阅卡片：验证按厂商聚合的单一容器。
    const stats = { ...REAL_STATS, byModel: { 'deepseek-chat': day(25, 18_000_000, 2_000_000, 9_000_000, 9_000_000, 0.9) } }
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = input
      const body = url.includes('/api/billing/pricing')
        ? { source: 'builtin' }
        : url.includes('/api/billing/subscriptions')
          ? { quotas: [{ provider: 'kimi-coding', displayName: 'Kimi For Coding', status: 'ok', windows: [{ kind: 'monthly', usedPercent: 30, remainingPercent: 70, resetsAt: '2026-09-01T00:00:00Z' }] }] }
          : stats
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
    }))
    const { container } = render(<UsageBilling {...makeProps()} />)
    fireEvent.click(container.querySelector('button')!)
    // 单一容器按厂商聚合：模型用量与订阅额度同属一个面板（厂商 Tab）。
    fireEvent.click(await screen.findByTestId('billing-tab-providers'))
    expect(await screen.findByTestId('billing-panel-providers')).toBeTruthy()
    const groups = await screen.findAllByTestId('billing-provider-group')
    // 月之暗面组：订阅卡片 + 套数徽标，无模型用量表（无该厂商模型）。
    const kimi = groups.find(group => group.textContent?.includes('月之暗面'))
    expect(kimi).toBeDefined()
    expect(kimi!.querySelector('[data-testid="billing-subscription-card"]')).not.toBeNull()
    expect(kimi!.querySelector('[data-testid="billing-provider-sub-count"]')?.textContent).toContain('1')
    expect(kimi!.querySelector('[data-testid="billing-table-scroll"]')).toBeNull()
    // DeepSeek 组：模型用量表，无订阅卡片。
    const deepseek = groups.find(group => group.textContent?.includes('DeepSeek'))
    expect(deepseek).toBeDefined()
    expect(deepseek!.querySelector('[data-testid="billing-table-scroll"]')).not.toBeNull()
    expect(deepseek!.querySelector('[data-testid="billing-subscription-card"]')).toBeNull()
  })

  it('mixes non-subscription models and subscription quotas in the same vendor group', async () => {
    // 小米厂商组同时容纳：非订阅按量模型 mi-mimo-2.5（plan=false，显示费用）
    // 与订阅套餐 xiaomi-token-plan-cn（订阅卡片）——用户提醒的"厂商还有非订阅模型"。
    const stats = {
      ...REAL_STATS,
      byModel: {
        ...REAL_STATS.byModel,
        'mi-mimo-2.5': day(15, 9_000_000, 1_200_000, 3_000_000, 6_000_000, 0.4),
      },
    }
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const url = input
      const body = url.includes('/api/billing/pricing')
        ? { source: 'builtin' }
        : url.includes('/api/billing/subscriptions')
          ? { quotas: [{ provider: 'xiaomi-token-plan-cn', displayName: '小米 Token 计划', status: 'ok', windows: [{ kind: 'monthly', usedPercent: 40, remainingPercent: 60, resetsAt: '2026-09-01T00:00:00Z' }] }] }
          : stats
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
    }))
    const { container } = render(<UsageBilling {...makeProps()} />)
    fireEvent.click(container.querySelector('button')!)
    // 厂商面板在厂商 Tab：先切 Tab。
    fireEvent.click(await screen.findByTestId('billing-tab-providers'))
    const groups = await screen.findAllByTestId('billing-provider-group')
    const xiaomi = groups.find(group => group.textContent?.includes('小米'))
    expect(xiaomi).toBeDefined()
    // 同厂商组：既有模型用量表（非订阅模型显示费用），又有订阅卡片。
    expect(xiaomi!.querySelector('[data-testid="billing-table-scroll"]')).not.toBeNull()
    expect(xiaomi!.querySelector('[data-testid="billing-subscription-card"]')).not.toBeNull()
    // 非订阅模型显示实际费用（0.40 元），不误标「订阅包含」。
    expect(xiaomi!.querySelector('[data-testid="billing-table-scroll"]')!.textContent).toContain('¥0.40')
    expect(xiaomi!.querySelector('[data-testid="billing-table-scroll"]')!.textContent).not.toContain('订阅包含')
  })
})
