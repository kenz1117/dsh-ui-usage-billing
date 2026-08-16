// @vitest-environment jsdom
/**
 * UsageBilling surface smoke test: clicking the sidebar footer trigger must
 * open the dashboard modal without throwing. A render throw unmounts the
 * whole plugin surface in the host (the reported "modal flashes and the
 * footer trigger disappears" symptom).
 */

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { UsageBilling } from '../src/client/UsageBilling.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
})

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

describe('UsageBilling surface', () => {
  it('opens the dashboard modal on trigger click without throwing', async () => {
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
    // 弹窗标题出现说明 BillingDashboard 成功渲染。
    expect(await screen.findByText('使用统计')).toBeTruthy()
  })
})
