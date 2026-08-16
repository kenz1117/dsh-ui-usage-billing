// @vitest-environment jsdom
/**
 * TrendChart rendering smoke test: the grouped bars + calls line must render
 * without throwing (a throw unmounts the whole plugin surface in the host).
 */

import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { TrendChart, type TrendPoint } from '../src/client/TrendChart.tsx'

/** Seven-day window with two models and per-model cost detail. */
const DATA: TrendPoint[] = ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15', '2026-08-16'].map(
  (date, i) => ({
    date,
    cost: i * 2,
    calls: i * 5,
    byModel: { flash: i, pro: i > 0 ? i * 2 : 0 },
  }),
)

const MODELS = [
  { key: 'flash', name: 'DeepSeek V4 Flash', color: 'rgb(59, 130, 246)' },
  { key: 'pro', name: 'DeepSeek V4 Pro', color: 'rgb(65, 118, 230)' },
]

describe('TrendChart', () => {
  it('renders grouped bars and the calls line without throwing', () => {
    const { container } = render(<TrendChart data={DATA} models={MODELS} />)
    expect(container.querySelector('svg')).not.toBeNull()
    // 两个模型 × 7 天中费用 > 0 的柱。
    expect(container.querySelectorAll('rect').length).toBeGreaterThan(0)
  })

  it('renders the single-color fallback when no model detail exists', () => {
    const { container } = render(<TrendChart data={DATA} models={[]} />)
    expect(container.querySelectorAll('rect').length).toBeGreaterThan(0)
  })

  it('renders an empty state for no data', () => {
    const { container } = render(<TrendChart data={[]} models={MODELS} />)
    expect(container.textContent).toContain('暂无趋势数据')
  })

  it('survives hover over the chart (crosshair path must not throw)', () => {
    // 回归：hover 十字线读取 plotH，漏解构曾导致 ReferenceError 并卸载整个
    // 插件 surface（宿主里表现为「弹窗闪退 + 触发组件消失」）。
    const { container } = render(<TrendChart data={DATA} models={MODELS} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    fireEvent.mouseMove(svg!, { clientX: 300, clientY: 60 })
    fireEvent.mouseMove(svg!, { clientX: 340, clientY: 80 })
  })
})
