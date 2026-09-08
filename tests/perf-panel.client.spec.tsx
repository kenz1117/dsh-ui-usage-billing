// @vitest-environment jsdom
/**
 * PerfPanel component test: renders per-model TTFT/P50/P90/speed/latency rows
 * and the hourly twin-series curve from the optional `perf` doc; an absent
 * `perf` renders an empty state (older snapshots) rather than fabrication.
 */

import { describe, expect, it } from 'vitest'
import type { ReactElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { PerfPanel, type ClientPerf } from '../src/client/PerfPanel.tsx'
import type { TrendSeriesModel } from '../src/client/TrendChart.tsx'
import { zh } from '../src/client/locales.ts'

const t = (key: Parameters<typeof zh>[0]): string => (zh as Record<string, string>)[key] ?? key

const MODELS: readonly TrendSeriesModel[] = [
  { key: 'flash', name: 'DeepSeek V4 Flash', color: '#3b82f6' },
  { key: 'glm', name: 'GLM-5.2', color: '#06b6d4' },
]

const PERF: ClientPerf = {
  byModel: {
    flash: { samples: 10, ttftAvg: 200, ttftP50: 180, ttftP90: 350, tpsAvg: 100, latencyAvg: 900, estimatedSamples: 2 },
    glm: { samples: 5, ttftAvg: 400, ttftP50: 390, ttftP90: 600, latencyAvg: 1200, estimatedSamples: 0 },
  },
  byHour: {
    '2026-08-15T09': { samples: 3, ttftAvg: 150, tpsAvg: 120 },
    '2026-08-15T10': { samples: 4, ttftAvg: 220, tpsAvg: 90 },
  },
}

function renderPanel(perf: ClientPerf | undefined): ReactElement {
  return <PerfPanel perf={perf} models={MODELS} t={t} />
}

describe('PerfPanel', () => {
  it('renders per-model latency rows and the hourly curve from the perf doc', () => {
    cleanup()
    const { container } = render(renderPanel(PERF))
    // 模型表与双模型行：TTFT 均值、生成速度、总延迟、估算样本。
    expect(screen.getByTestId('billing-perf-table')).toBeTruthy()
    expect(screen.getByText('DeepSeek V4 Flash')).toBeTruthy()
    expect(screen.getByText('GLM-5.2')).toBeTruthy()
    expect(screen.getAllByText('200 ms').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('1200 ms').length).toBeGreaterThanOrEqual(1)
    // 小时曲线容器存在（svg + 双序列）。
    expect(screen.getByTestId('billing-perf-hour')).toBeTruthy()
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('renders an empty state when the perf doc is absent (older snapshot)', () => {
    cleanup()
    render(renderPanel(undefined))
    expect(screen.getByTestId('billing-perf-empty')).toBeTruthy()
    expect(screen.queryByTestId('billing-perf-table')).toBeNull()
  })

  it('abbreviates oversized table values so fixed columns never overlap (issue #41)', () => {
    cleanup()
    render(renderPanel({
      byModel: {
        flash: { samples: 1119, ttftAvg: 25209, ttftP50: 23070, ttftP90: 23070, ttftMax: 122141, tpsAvg: 27094, latencyAvg: 42838, estimatedSamples: 0 },
      },
      byHour: {},
    }))
    // 长毫秒值转 s/min、生成速度转 k：fixed 列宽下不再溢出叠进右列。
    const table = screen.getByTestId('billing-perf-table')
    expect(table.textContent).toContain('2.0 min')
    expect(table.textContent).toContain('42.8 s')
    expect(table.textContent).toContain('27.1k')
    expect(table.textContent).not.toContain('122141')
  })
})
