// @vitest-environment jsdom
/**
 * TokenPanel component test: renders the token KPIs, daily stacked chart and
 * the per-model token ranking from the usage-stats doc.
 */

import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { TokenPanel } from '../src/client/TokenPanel.tsx'
import { zh } from '../src/client/locales.ts'

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

const STATS = {
  total: { calls: 10, input: 700, output: 500, cacheHit: 400, cacheMiss: 300, cost: 1, reasoning: 200 },
  byDay: {
    '2026-08-15': { calls: 10, input: 700, output: 500, cacheHit: 400, cacheMiss: 300, cost: 1, reasoning: 200 },
  },
  byModel: {
    flash: { calls: 10, input: 700, output: 500, cacheHit: 400, cacheMiss: 300, cost: 1, reasoning: 200 },
  },
  byDayModels: {},
  pluginVersion: '0.9.5',
}

describe('TokenPanel', () => {
  it('renders token KPIs, the daily chart and the per-model ranking', () => {
    render(<TokenPanel stats={STATS} trendDays={7} onTrendDays={() => {}} t={t} />)
    expect(screen.getByTestId('billing-token-panel')).toBeTruthy()
    expect(screen.getByTestId('billing-token-kpis')).toBeTruthy()
    // 缓存命中率 400/(400+300)=57.1%（结构 KPI 与模型行各有此值）；思考占比 200/500=40%；输入/输出 700/500=1.40。
    expect(screen.getAllByText('57.1%').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('40.0%')).toBeTruthy()
    expect(screen.getByText('1.40')).toBeTruthy()
    expect(screen.getByTestId('billing-token-daily')).toBeTruthy()
    expect(screen.getByTestId('billing-token-models')).toBeTruthy()
    expect(screen.getAllByTestId('billing-token-model').length).toBeGreaterThanOrEqual(1)
    // 导出按钮存在。
    expect(screen.getByTestId('billing-token-export-csv')).toBeTruthy()
    expect(screen.getByTestId('billing-token-export-json')).toBeTruthy()
  })

  it('renders an empty state for the model ranking when there are no calls', () => {
    const empty = { ...STATS, byModel: {} }
    render(<TokenPanel stats={empty} trendDays={7} onTrendDays={() => {}} t={t} />)
    expect(screen.getByText(zh['billing.noData'])).toBeTruthy()
  })

  it('shows an exact per-day token breakdown tooltip on hover', () => {
    // 今天是 7 天窗口的最后一天；jsdom 里 getBoundingClientRect 全 0，
    // mouseMove 的 x → Infinity → 索引收敛到最后一天，正好命中今天的柱。
    const p = (n: number): string => String(n).padStart(2, '0')
    const now = new Date()
    const today = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
    const day = { calls: 3, input: 12618118, output: 595174, cacheHit: 5355392, cacheMiss: 7262726, cost: 1, reasoning: 100 }
    const stats = { ...STATS, byDay: { ...STATS.byDay, [today]: day } }
    const { container } = render(<TokenPanel stats={stats} trendDays={7} onTrendDays={() => {}} t={t} />)
    const svg = container.querySelector('[data-testid="billing-token-daily"] svg')
    expect(svg).not.toBeNull()
    fireEvent.mouseMove(svg!, { clientX: 300, clientY: 60 })
    const tooltip = screen.getByTestId('billing-token-tooltip')
    expect(tooltip.textContent).toContain(today)
    // 精确数字（千分位、不缩写）：总量与三个分项一一核对。
    expect(tooltip.textContent).toContain((day.cacheHit + day.cacheMiss + day.output).toLocaleString())
    expect(tooltip.textContent).toContain(day.cacheHit.toLocaleString())
    expect(tooltip.textContent).toContain(day.cacheMiss.toLocaleString())
    expect(tooltip.textContent).toContain(day.output.toLocaleString())
    // 离开后关闭。
    fireEvent.mouseLeave(svg!)
    expect(screen.queryByTestId('billing-token-tooltip')).toBeNull()
  })
})
