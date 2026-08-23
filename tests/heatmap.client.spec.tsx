// @vitest-environment jsdom
/**
 * UsageHeatmap (month) rendering test: week-row layout with 7-column grid,
 * the 1st of 2026-08 (Saturday) lands on the 7th column, and a nonzero day
 * lights a level-1+ cell.
 */

import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { UsageHeatmap, type HeatmapDay } from '../src/client/heatmap.tsx'
import { activeDaysOf, streakDaysOf } from '../src/client/UsageBilling.tsx'

const t = (key: 'billing.costAbbr' | 'billing.noData' | 'billing.heatmapLess' | 'billing.heatmapMore'): string =>
  key === 'billing.noData' ? '多' : key === 'billing.heatmapLess' ? '少' : key === 'billing.heatmapMore' ? '多' : '费用'

/** 固定锚点：2026-08-21，使格子数量、首行排布等断言确定化。 */
const NOW = new Date(2026, 7, 21)

/** 2026-08 内的有值日与无值日。 */
const DAYS: HeatmapDay[] = [
  { date: '2026-08-01', value: 8 },
  { date: '2026-08-15', value: 12 },
  { date: '2026-08-16', value: 0 },
]

describe('UsageHeatmap', () => {
  it('renders one cell per day of the current month (1st through today)', () => {
    const { getAllByTestId } = render(<UsageHeatmap days={DAYS} currency="cny" now={NOW} t={t} />)
    const cells = getAllByTestId('heatmap-cell')
    // 本月 1~today 天数：2026-08-21 = 21 天（8/21 = 周五）。
    expect(cells).toHaveLength(21)
  })

  it('lights the cell of a nonzero-cost day', () => {
    const { getAllByTestId } = render(<UsageHeatmap days={DAYS} currency="cny" now={NOW} t={t} />)
    const lit = getAllByTestId('heatmap-cell').filter(cell => Number(cell.getAttribute('data-level')) > 0)
    expect(lit.length).toBeGreaterThanOrEqual(2)
  })

  it('arranges cells in 7-column week rows (August 2026: 1st is Saturday)', () => {
    // 2026-08-01 是周六（getDay()=6）→ 第一行应有 6 个上月补位 + 1 个格子 = 7 列。
    const { container } = render(<UsageHeatmap days={DAYS} currency="cny" now={NOW} t={t} />)
    const grid = container.querySelector('[aria-label="daily cost heatmap"]') as HTMLElement
    // 完整月视图：上月补位 6 + 本月 31 = 37 格 → 6 行 × 7 = 42 个子元素。
    expect(grid.children.length).toBe(42)
    // 第 1 行只有第 7 列（周六）有格子，其余 6 个是上月补位。
    const firstRowChildren = [...grid.children].slice(0, 7)
    const firstRowButtons = firstRowChildren.filter(el => el.tagName === 'BUTTON')
    expect(firstRowButtons).toHaveLength(1)
  })

  it('reveals the date and amount on hover', () => {
    const { getAllByTestId, getByTestId } = render(<UsageHeatmap days={DAYS} currency="cny" now={NOW} t={t} />)
    fireEvent.mouseEnter(getAllByTestId('heatmap-cell')[0]!)
    const hover = getByTestId('heatmap-hover')
    expect(hover.textContent).toMatch(/· ¥/)
  })

  it('renders 52 weeks of compact cells in year range', () => {
    const { getAllByTestId } = render(<UsageHeatmap days={DAYS} currency="cny" now={NOW} t={t} range="year" />)
    const cells = getAllByTestId('heatmap-year-cell')
    // 52 周 × 7 天。
    expect(cells.length).toBe(52 * 7)
    // 有值日点亮（≥2 个 data-level>0）。
    const lit = cells.filter(cell => Number(cell.getAttribute('data-level')) > 0)
    expect(lit.length).toBeGreaterThanOrEqual(2)
  })
})

describe('active / streak day counting', () => {
  const byDay = { '2026-08-15': { cost: 1 }, '2026-08-16': { cost: 2 } }

  it('counts distinct active days (any recorded day)', () => {
    expect(activeDaysOf(byDay)).toBe(2)
  })

  it('counts consecutive days ending on the anchor day', () => {
    // 锚点 2026-08-16：8/16、8/15 连续，8/14 无记录 → 2。
    expect(streakDaysOf(byDay, new Date(2026, 7, 16).getTime())).toBe(2)
  })

  it('returns 0 when the anchor day has no record', () => {
    // 锚点 2026-08-17 无记录 → 0。
    expect(streakDaysOf(byDay, new Date(2026, 7, 17).getTime())).toBe(0)
  })
})
