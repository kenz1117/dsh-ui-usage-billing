// @vitest-environment jsdom
/**
 * 逐轮费用图的**窗口口径**（1.8.7 修正）：
 *
 * 服务端 `byTurn` 按 startedAt **倒序**下发（最新在前，封顶 200 轮），组件要展示
 * 的是「最新 N 轮、最新的在右边」。此前组件直接 `slice(-N)`——取到的是「最近 200 轮
 * 里最旧的 40 轮」，左右顺序也是反的（看图等于看错轮次）。
 */

import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { RoundCostChart, type RoundChartRow } from '../src/client/round-chart.tsx'
import { formatMoney } from '../src/client/pricing.ts'
import { zh } from '../src/client/locales.ts'

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

/** 构造 n 轮：按服务端口径（startedAt 倒序，最新在前）；费用随轮次递增。 */
function makeRows(n: number): RoundChartRow[] {
  return Array.from({ length: n }, (_, i) => ({
    sessionId: 'sess-1',
    turn: i,
    model: 'flash',
    cost: i + 1,
    input: 100,
    output: 100,
    cacheHit: 0,
    cacheMiss: 100,
    startedAt: 1_700_000_000_000 + i * 60_000,
  })).reverse()
}

function renderChart(rows: readonly RoundChartRow[]): HTMLElement {
  const { container } = render(
    <RoundCostChart rounds={rows} flags={[]} currency="cny" t={t as never} />,
  )
  return container
}

function barLabels(container: HTMLElement): string[] {
  return [...container.querySelectorAll('[class*="roundsBarLabel"]')].map(el => el.textContent ?? '')
}

describe('逐轮图窗口口径（1.8.7）', () => {
  it('只渲染最新 40 轮，且从旧到新排列', () => {
    const container = renderChart(makeRows(60))
    const labels = barLabels(container)
    // 60 轮 → 取最新 40 轮（第 20~59 轮，费用 21~60）
    expect(labels).toHaveLength(40)
    expect(labels[0]).toBe(formatMoney(21, 'cny'))
    expect(labels[labels.length - 1]).toBe(formatMoney(60, 'cny'))
    // 升序（最新的在右边）：相邻标签的费用递增
    const costs = labels.map(text => Number(text.replace(/[^\d.]/g, '')))
    for (let i = 1; i < costs.length; i += 1) {
      expect(costs[i]).toBeGreaterThan(costs[i - 1])
    }
  })

  it('不足 40 轮时全量展示，顺序同样是旧→新', () => {
    const container = renderChart(makeRows(5))
    const labels = barLabels(container)
    expect(labels).toHaveLength(5)
    expect(labels[0]).toBe(formatMoney(1, 'cny'))
    expect(labels[4]).toBe(formatMoney(5, 'cny'))
  })

  it('入参若已是升序（旧快照），窗口与顺序同样正确（不依赖服务端顺序）', () => {
    const container = renderChart([...makeRows(60)].reverse())
    const labels = barLabels(container)
    expect(labels).toHaveLength(40)
    expect(labels[0]).toBe(formatMoney(21, 'cny'))
    expect(labels[39]).toBe(formatMoney(60, 'cny'))
  })
})
