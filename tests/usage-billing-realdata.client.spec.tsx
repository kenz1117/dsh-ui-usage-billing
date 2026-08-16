// @vitest-environment jsdom
/**
 * UsageBilling real-data smoke test: feeds the surface a realistic
 * usage-stats snapshot (multi-model, multi-day, byDayModels) through the
 * same fetch the browser uses, then opens the modal. Any render throw here
 * unmounts the whole plugin surface in the host.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { UsageBilling } from '../src/client/UsageBilling.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

/** One day's stats row shape as the node half aggregates it. */
function day(calls: number, input: number, output: number, cacheHit: number, cacheMiss: number, cost: number) {
  return { calls, input, output, cacheHit, cacheMiss, cost }
}

/** Realistic multi-model multi-day snapshot (7-day window). */
const REAL_STATS = {
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
    const { container } = render(<UsageBilling {...({
      wide: true,
      t,
      checkModels: async () => ({
        checked: true, available: true, providers: 1, failures: 0, okProviders: [], badProviders: [],
      }),
    } as never)} />)
    const trigger = container.querySelector('button')
    expect(trigger).not.toBeNull()
    fireEvent.click(trigger!)
    // 弹窗标题 + 真实数据渲染完成（趋势面板存在）。
    expect(await screen.findByText('使用统计')).toBeTruthy()
    await waitFor(() => {
      expect(screen.queryByText('每日费用与调用趋势')).not.toBeNull()
    })
  })
})
