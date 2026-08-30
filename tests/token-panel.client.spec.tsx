// @vitest-environment jsdom
/**
 * TokenPanel component test: renders the token KPIs, daily stacked chart (both
 * the structure view and the per-model view) and the per-model token ranking
 * from the usage-stats doc, plus the focus interaction and JSON export shape.
 */

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { TokenPanel, tokenDailyJson } from '../src/client/TokenPanel.tsx'
import { zh } from '../src/client/locales.ts'

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

// 本文件无 vitest globals（临时本地配置未开 globals），RTL 的自动 cleanup 不生效，手动清理。
afterEach(() => { cleanup() })

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

/** 本地时区 `YYYY-MM-DD`（与 TokenPanel 的窗口生成一致，指向 7 天窗口最后一天）。 */
function todayStamp(): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  const now = new Date()
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
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
    expect(screen.getByText(zh['noData'])).toBeTruthy()
  })

  it('shows an exact per-day token breakdown tooltip on hover', () => {
    // 今天是 7 天窗口的最后一天；jsdom 里 getBoundingClientRect 全 0，
    // mouseMove 的 x → Infinity → 索引收敛到最后一天，正好命中今天的柱。
    const today = todayStamp()
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

  it('hides the view toggle for legacy snapshots without byDayModels', () => {
    const legacy = { ...STATS } as Partial<typeof STATS>
    delete legacy.byDayModels
    render(<TokenPanel stats={legacy as typeof STATS} trendDays={7} onTrendDays={() => {}} t={t} />)
    // 旧快照降级：视角切换钮不存在，默认停留在结构视角。
    expect(screen.queryByTestId('billing-token-view-model')).toBeNull()
    expect(screen.queryByTestId('billing-token-view-structure')).toBeNull()
    // 模型 Token 表行不可点（无聚焦光标类）。
    const row = screen.getAllByTestId('billing-token-model')[0] as HTMLElement
    expect(row.className).not.toContain('modelRowFocusable')
  })

  it('stacks the model view by per-model tokens and focuses a model from the legend', () => {
    const today = todayStamp()
    // flash 段 = 60+40+50 = 150；pro 段 = 150+50+80 = 280 → 图例 pro 在前。
    const stats = {
      ...STATS,
      byModel: {
        ...STATS.byModel,
        pro: { calls: 6, input: 200, output: 80, cacheHit: 150, cacheMiss: 50, cost: 0.6, reasoning: 0 },
      },
      byDayModels: {
        [today]: {
          flash: { calls: 4, input: 100, output: 50, cacheHit: 60, cacheMiss: 40, cost: 0.4 },
          pro: { calls: 6, input: 200, output: 80, cacheHit: 150, cacheMiss: 50, cost: 0.6 },
        },
      },
    }
    const brandModels = [
      { key: 'flash', name: 'Flash', color: '#3b82f6' },
      { key: 'pro', name: 'Pro', color: '#06b6d4' },
    ]
    const { container } = render(<TokenPanel stats={stats} trendDays={7} onTrendDays={() => {}} models={brandModels} t={t} />)
    // 默认结构视角；切到按模型。
    expect(screen.getByTestId('billing-token-view-model').getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(screen.getByTestId('billing-token-view-model'))
    expect(screen.getByTestId('billing-token-view-model').getAttribute('aria-pressed')).toBe('true')
    // 图例全量展示且按窗口总量降序：pro(280) 在 flash(150) 之前。
    const items = [...container.querySelectorAll('[data-testid^="billing-token-legend-"]')]
    expect(items.map(el => el.getAttribute('data-testid'))).toEqual(['billing-token-legend-pro', 'billing-token-legend-flash'])
    // 堆叠段使用趋势页同款品牌色。
    const svg = container.querySelector('[data-testid="billing-token-daily"] svg')!
    const fills = [...svg.querySelectorAll('rect')].map(r => r.getAttribute('fill'))
    expect(fills).toContain('#3b82f6')
    expect(fills).toContain('#06b6d4')
    // 聚焦 flash：pro 段弱化到 0.15，flash 段保持原色；再次点击解除。
    fireEvent.click(screen.getByTestId('billing-token-legend-flash'))
    for (const r of [...svg.querySelectorAll('rect')]) {
      if (r.getAttribute('fill') === '#3b82f6') expect(r.getAttribute('opacity')).toBe('1')
      if (r.getAttribute('fill') === '#06b6d4') expect(r.getAttribute('opacity')).toBe('0.15')
    }
    expect(screen.getByTestId('billing-token-legend-flash').getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByTestId('billing-token-legend-flash'))
    for (const r of [...svg.querySelectorAll('rect')]) {
      expect(r.getAttribute('opacity')).toBe('1')
    }
  })

  it('shows a per-model tooltip with exact hit/miss/output rows in the model view', () => {
    const today = todayStamp()
    const stats = {
      ...STATS,
      byDayModels: {
        [today]: {
          flash: { calls: 4, input: 100, output: 50, cacheHit: 60, cacheMiss: 40, cost: 0.4 },
          pro: { calls: 6, input: 200, output: 80, cacheHit: 150, cacheMiss: 50, cost: 0.6 },
        },
      },
    }
    const brandModels = [
      { key: 'flash', name: 'Flash', color: '#3b82f6' },
      { key: 'pro', name: 'Pro', color: '#06b6d4' },
    ]
    const { container } = render(<TokenPanel stats={stats} trendDays={7} onTrendDays={() => {}} models={brandModels} t={t} />)
    fireEvent.click(screen.getByTestId('billing-token-view-model'))
    const svg = container.querySelector('[data-testid="billing-token-daily"] svg')!
    fireEvent.mouseMove(svg, { clientX: 300, clientY: 60 })
    const tooltip = screen.getByTestId('billing-token-tooltip')
    expect(tooltip.textContent).toContain(today)
    // 每模型一行：名称 + 精确总量，附 命中/未命中/输出 明细小字；无 reasoning 列（数据边界）。
    expect(tooltip.textContent).toContain('Pro')
    expect(tooltip.textContent).toContain('Flash')
    expect(tooltip.textContent).toContain((280).toLocaleString())
    expect(tooltip.textContent).toContain((150).toLocaleString())
    expect(tooltip.textContent).toContain(`命中 150 · 未命中 50 · 输出 80`)
    expect(tooltip.textContent).toContain(`命中 60 · 未命中 40 · 输出 50`)
    expect(tooltip.textContent).not.toContain('思考')
  })

  it('focuses a model from the model-table row and clears focus on view switches', () => {
    const today = todayStamp()
    const stats = {
      ...STATS,
      byModel: {
        ...STATS.byModel,
        pro: { calls: 6, input: 200, output: 80, cacheHit: 150, cacheMiss: 50, cost: 0.6, reasoning: 0 },
      },
      byDayModels: {
        [today]: {
          flash: { calls: 4, input: 100, output: 50, cacheHit: 60, cacheMiss: 40, cost: 0.4 },
          pro: { calls: 6, input: 200, output: 80, cacheHit: 150, cacheMiss: 50, cost: 0.6 },
        },
      },
    }
    const brandModels = [
      { key: 'flash', name: 'Flash', color: '#3b82f6' },
      { key: 'pro', name: 'Pro', color: '#06b6d4' },
    ]
    render(<TokenPanel stats={stats} trendDays={7} onTrendDays={() => {}} models={brandModels} t={t} />)
    // 结构视角下点「模型 Token」表第二行（pro，总量 280 < flash 1200）→ 直接切到按模型并聚焦 pro。
    const rows = screen.getAllByTestId('billing-token-model')
    expect((rows[0] as HTMLElement).textContent).toContain('DeepSeek V4 Flash')
    fireEvent.click(rows[1])
    expect(screen.getByTestId('billing-token-view-model').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('billing-token-legend-pro').getAttribute('aria-pressed')).toBe('true')
    // 视角切换清除聚焦：回结构再进按模型，无模型处于聚焦态。
    fireEvent.click(screen.getByTestId('billing-token-view-structure'))
    fireEvent.click(screen.getByTestId('billing-token-view-model'))
    expect(screen.getByTestId('billing-token-legend-pro').getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByTestId('billing-token-legend-flash').getAttribute('aria-pressed')).toBe('false')
  })

  it('exports a JSON document with per-day per-model token cells and no reasoning column', () => {
    const doc = JSON.parse(tokenDailyJson(
      [{ date: '2026-08-30', miss: 40, hit: 60, output: 50, reasoning: 10 }],
      [],
      [{ date: '2026-08-30', models: { flash: { hit: 60, miss: 40, output: 50, total: 150 } }, total: 150 }],
      STATS.total,
    )) as { days: unknown[]; dayModels: { date: string; models: Record<string, Record<string, number>>; total: number }[]; total: unknown }
    // 按日 × 模型明细在位，且单元恪守「无 reasoning」归因边界。
    expect(doc.dayModels).toHaveLength(1)
    expect(Object.keys(doc.dayModels[0]!.models.flash!)).toEqual(['hit', 'miss', 'output', 'total'])
    expect(doc.dayModels[0]!.total).toBe(150)
  })
})
