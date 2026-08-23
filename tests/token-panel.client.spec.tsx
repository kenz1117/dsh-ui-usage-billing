// @vitest-environment jsdom
/**
 * TokenPanel component test: renders the token KPIs, daily stacked chart and
 * the per-model token ranking from the usage-stats doc.
 */

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
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
    render(<TokenPanel stats={STATS} currency="cny" trendDays={7} onTrendDays={() => {}} t={t} />)
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
    render(<TokenPanel stats={empty} currency="cny" trendDays={7} onTrendDays={() => {}} t={t} />)
    expect(screen.getByText(zh['billing.noData'])).toBeTruthy()
  })
})
