// @vitest-environment jsdom
/**
 * PerfPanel component test: renders per-model TTFT/P50/P90/speed/latency rows
 * plus the per-hour per-model comparison curve (metric tabs, toggleable model
 * chips, hover crosshair + tooltip). Absent `perf` renders an empty state
 * (older snapshots) rather than fabrication; a perf doc without `byHourModel`
 * (older host) degrades the chart area to a hint while keeping the table.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import type { ReactElement } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { PerfPanel, type ClientPerf } from '../src/client/PerfPanel.tsx'
import type { TrendSeriesModel } from '../src/client/TrendChart.tsx'
import { zh, type UsageBillingKey } from '../src/client/locales.ts'

const t = (key: UsageBillingKey): string => (zh as Record<string, string>)[key] ?? key

const MODELS: readonly TrendSeriesModel[] = [
  { key: 'flash', name: 'DeepSeek V4 Flash', color: '#3b82f6' },
  { key: 'glm', name: 'GLM-5.2', color: '#06b6d4' },
]

const PERF: ClientPerf = {
  byModel: {
    flash: { samples: 10, ttftAvg: 200, ttftP50: 180, ttftP90: 350, tpsAvg: 100, latencyAvg: 900, estimatedSamples: 2 },
    glm: { samples: 5, ttftAvg: 400, ttftP50: 390, ttftP90: 600, latencyAvg: 1200, estimatedSamples: 0 },
  },
  byHourModel: {
    '2026-08-15T09': { flash: { samples: 3, ttftAvg: 150, tpsAvg: 120 }, glm: { samples: 2, ttftAvg: 380 } },
    '2026-08-15T10': { flash: { samples: 4, ttftAvg: 220, tpsAvg: 90 } },
  },
}

function renderPanel(perf: ClientPerf | undefined): ReactElement {
  return <PerfPanel perf={perf} models={MODELS} t={t} />
}

/** Count rendered curve segments (each continuous per-model run is one path). */
function pathCount(): number {
  return document.querySelectorAll('[data-testid="billing-perf-hour"] path').length
}

describe('PerfPanel', () => {
  beforeEach(() => { localStorage.clear() })

  it('renders per-model latency rows and the per-model hourly curve', () => {
    cleanup()
    const { container } = render(renderPanel(PERF))
    // 模型表与双模型行：TTFT 均值、生成速度、总延迟、估算样本（名称同时出现在表格行与 chip）。
    expect(screen.getByTestId('billing-perf-table')).toBeTruthy()
    expect(screen.getAllByText('DeepSeek V4 Flash').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('GLM-5.2').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('200 ms').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('1200 ms').length).toBeGreaterThanOrEqual(1)
    // ≤5 个模型默认全部点亮：flash（连续两小时 1 段）+ glm（仅 09 点 1 段）。
    expect(screen.getByTestId('billing-perf-hour')).toBeTruthy()
    expect(screen.getByTestId('billing-perf-chip-flash').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('billing-perf-chip-glm').getAttribute('aria-pressed')).toBe('true')
    expect(pathCount()).toBe(2)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('renders an empty state when the perf doc is absent (older snapshot)', () => {
    cleanup()
    render(renderPanel(undefined))
    expect(screen.getByTestId('billing-perf-empty')).toBeTruthy()
    expect(screen.queryByTestId('billing-perf-table')).toBeNull()
  })

  it('switches metric tabs and drops models without a measurable value', () => {
    cleanup()
    render(renderPanel(PERF))
    // glm 无任何 tps 样本：切到生成速度视图后只剩 flash 一条线。
    fireEvent.click(screen.getByTestId('billing-perf-tab-tps'))
    expect(screen.getByTestId('billing-perf-tab-tps').getAttribute('aria-pressed')).toBe('true')
    expect(pathCount()).toBe(1)
    // 切回首字延时视图恢复双线。
    fireEvent.click(screen.getByTestId('billing-perf-tab-ttft'))
    expect(pathCount()).toBe(2)
  })

  it('shows a hover tooltip with the snapped hour and lit models', () => {
    cleanup()
    const { container } = render(renderPanel(PERF))
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    // jsdom 里 getBoundingClientRect 全 0 → x → Infinity → 索引收敛到最后一小时。
    fireEvent.mouseMove(svg!, { clientX: 300, clientY: 60 })
    const tooltip = screen.getByTestId('billing-perf-tooltip')
    // 最后一小时 = 2026-08-15T10：标签 + flash 行；该小时 glm 无样本 → 不出现。
    expect(tooltip.textContent).toContain('08-15 10')
    expect(tooltip.textContent).toContain('DeepSeek V4 Flash')
    expect(tooltip.textContent).toContain('220 ms')
    expect(within(tooltip).queryByText('GLM-5.2')).toBeNull()
    // 移出鼠标 → tooltip 消失。
    fireEvent.mouseLeave(svg!)
    expect(screen.queryByTestId('billing-perf-tooltip')).toBeNull()
  })

  it('toggles a model chip off and persists the selection', () => {
    cleanup()
    render(renderPanel(PERF))
    fireEvent.click(screen.getByTestId('billing-perf-chip-flash'))
    // flash 熄灭：只剩 glm 的 09 点一段；chip 状态与 localStorage 同步写回。
    expect(screen.getByTestId('billing-perf-chip-flash').getAttribute('aria-pressed')).toBe('false')
    expect(pathCount()).toBe(1)
    expect(JSON.parse(localStorage.getItem('dsh.ui-usage-billing.perf') ?? '{}'))
      .toMatchObject({ metric: 'ttft', models: ['glm'] })
    // 重新点亮 → 双线恢复。
    fireEvent.click(screen.getByTestId('billing-perf-chip-flash'))
    expect(pathCount()).toBe(2)
  })

  it('seeds the metric tab from localStorage on mount', () => {
    cleanup()
    localStorage.setItem('dsh.ui-usage-billing.perf', JSON.stringify({ metric: 'tps' }))
    render(renderPanel(PERF))
    expect(screen.getByTestId('billing-perf-tab-tps').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('billing-perf-tab-ttft').getAttribute('aria-pressed')).toBe('false')
  })

  it('keeps the tab + chip toolbar visible with a hint when no model is lit', () => {
    cleanup()
    const { container } = render(renderPanel(PERF))
    // 逐个熄灭全部模型：曲线区换成空态提示，但工具条（tab + chips）不能消失。
    fireEvent.click(screen.getByTestId('billing-perf-chip-flash'))
    fireEvent.click(screen.getByTestId('billing-perf-chip-glm'))
    expect(screen.getByTestId('billing-perf-chip-flash').getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByTestId('billing-perf-chip-glm').getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByTestId('billing-perf-tab-ttft')).toBeTruthy()
    expect(screen.getByTestId('billing-perf-chart-empty')).toBeTruthy()
    expect(container.querySelector('svg')).toBeNull()
    // 选择已写回 localStorage（空集是合法偏好）。
    expect(JSON.parse(localStorage.getItem('dsh.ui-usage-billing.perf') ?? '{}'))
      .toMatchObject({ metric: 'ttft', models: [] })
    // 重新点亮任一模型 → 曲线立即可用，无需刷新。
    fireEvent.click(screen.getByTestId('billing-perf-chip-flash'))
    expect(screen.queryByTestId('billing-perf-chart-empty')).toBeNull()
    expect(pathCount()).toBe(1)
  })

  it('degrades the chart area to a hint when byHourModel is missing (older host)', () => {
    cleanup()
    render(renderPanel({ byModel: PERF.byModel, byHourModel: {} }))
    // 表格仍渲染；曲线区显示空态提示而非报错/ fabrication。
    expect(screen.getByTestId('billing-perf-table')).toBeTruthy()
    expect(screen.getByTestId('billing-perf-chart-empty')).toBeTruthy()
    expect(screen.queryByTestId('billing-perf-hour')).toBeNull()
  })
})
