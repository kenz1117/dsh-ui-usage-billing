import { applyBuiltinCatalog } from '../src/client/pricing.ts'
import { BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES } from '../src/builtin-catalog.ts'

// 测试套件承担宿主注入角色：目录与别名表在模块加载时全量注入（宿主 activate
// 同一入口），否则聚合/计价消费方读到空目录。
applyBuiltinCatalog(BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES)

// @vitest-environment jsdom
/**
 * Token 口径回归（issue #85）：stats.input 本身已含缓存命中与未命中
 * （foldUsage：input = cacheHit + cacheMiss），趋势图/热力图再把缓存字段叠
 * 加进去就是约 2 倍。两处必须与用量 KPI / 触发卡同口径：input + output。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { bindSnapshotSelector } from './bind-snapshot-selector'
import { UsageBilling, dayTokensOf } from '../src/client/UsageBilling.tsx'
import { createBillingBudgetStore } from '../src/client/budget-store.ts'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

beforeEach(() => { localStorage.clear() })

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

/** One day's stats row shape as the node half aggregates it. */
function day(calls: number, input: number, output: number, cacheHit: number, cacheMiss: number, cost: number) {
  return { calls, input, output, cacheHit, cacheMiss, cost }
}

/** 本地时区今日日期戳（与组件的 localDayStamp 同规则）。 */
function todayStamp(): string {
  const date = new Date()
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// 今日明细满足聚合不变量 input = cacheHit + cacheMiss：
// 正确口径 3M + 1M = 4M（「4.0M」）；重复计数 3M + 1M + 1M + 2M = 7M（「7.0M」）。
const STATS = {
  total: day(3, 3_000_000, 1_000_000, 1_000_000, 2_000_000, 5),
  byModel: {},
  byDay: { [todayStamp()]: day(3, 3_000_000, 1_000_000, 1_000_000, 2_000_000, 5) },
}

/** 组件 props：数据桥 stub 空实现 + 真实预算 store 实例。 */
function makeProps(): ComponentProps<typeof UsageBilling> {
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

describe('dayTokensOf (issue #85 caliber)', () => {
  it('returns input + output without re-adding cache buckets', () => {
    // input 已含 hit+miss：再叠缓存字段即约 2 倍（issue 实测比值 1.99）。
    expect(dayTokensOf({ input: 3_000_000, output: 1_000_000 })).toBe(4_000_000)
  })
})

describe('trend / heatmap token caliber (issue #85)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify(STATS), { status: 200, headers: { 'content-type': 'application/json' } })))
  })

  it('renders heatmap tokens as input + output', async () => {
    const { container } = render(<UsageBilling {...makeProps()} />)
    fireEvent.click(container.querySelector('button')!)
    await screen.findByText('使用统计')
    // 概览热力图切到 Token 口径：合计 = input + output = 4.0M，而非 7.0M。
    fireEvent.click(await screen.findByTestId('billing-heatmap-metric-tokens'))
    const summary = await screen.findByTestId('billing-heatmap-summary')
    expect(summary.textContent).toContain('4.0M')
    expect(summary.textContent).not.toContain('7.0M')
  })

  it('renders trend tokens as input + output', async () => {
    const { container } = render(<UsageBilling {...makeProps()} />)
    fireEvent.click(container.querySelector('button')!)
    await screen.findByText('使用统计')
    fireEvent.click(await screen.findByTestId('billing-tab-trends'))
    fireEvent.click(await screen.findByTestId('billing-trend-metric-tokens'))
    // Token 指标下单色柱：纵轴顶刻度 = 当日 Token 最大值。
    // 正确口径顶刻度 4.0M；旧重复计数实现会标 7.0M（回归判别点）。
    const svg = await screen.findByLabelText('Daily cost by model and total calls')
    expect(svg).not.toBeNull()
    const text = svg.textContent ?? ''
    expect(text).toContain('4.0M')
    expect(text).not.toContain('7.0M')
  })
})
