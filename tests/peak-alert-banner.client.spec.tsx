// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { PeakAlertBanner } from '../src/client/PeakAlertBanner.tsx'
import { DEFAULT_PEAK_ALERT_CONFIG } from '../src/client/peak-alert.ts'
import { zh } from '../src/client/locales.ts'

const t = (key: string, params?: Record<string, unknown>): string => {
  let text = (zh as Record<string, string>)[key] ?? key
  for (const [name, value] of Object.entries(params ?? {})) text = text.replace(`{${name}}`, String(value))
  return text
}

afterEach(cleanup)

describe('PeakAlertBanner queue annotation', () => {
  it('states that queued tasks wait while admitted tasks continue into peak', () => {
    render(<PeakAlertBanner
      hit={{ entering: 'peak', atMs: Date.now() + 180_000, channel: 'deepseek-metered', queueCount: 3 }}
      config={DEFAULT_PEAK_ALERT_CONFIG}
      t={t}
      onDismiss={vi.fn()}
    />)
    expect(screen.getByTestId('billing-peak-queue-note').textContent).toBe('3 个排队任务将等待下一低谷；已开始任务继续执行')
  })

  it('announces ordered starts at off-peak and omits an empty queue note', () => {
    const { rerender } = render(<PeakAlertBanner
      hit={{ entering: 'offPeak', atMs: Date.now() + 180_000, channel: 'deepseek-metered', queueCount: 2 }}
      config={DEFAULT_PEAK_ALERT_CONFIG}
      t={t}
      onDismiss={vi.fn()}
    />)
    expect(screen.getByTestId('billing-peak-queue-note').textContent).toBe('2 个排队任务将按顺序启动')
    rerender(<PeakAlertBanner
      hit={{ entering: 'offPeak', atMs: Date.now() + 180_000, channel: 'deepseek-metered' }}
      config={DEFAULT_PEAK_ALERT_CONFIG}
      t={t}
      onDismiss={vi.fn()}
    />)
    expect(screen.queryByTestId('billing-peak-queue-note')).toBeNull()
  })
})
