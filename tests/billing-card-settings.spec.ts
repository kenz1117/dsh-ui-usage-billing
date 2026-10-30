// @vitest-environment jsdom
/** 侧栏入口显示偏好的兼容读取、持久化与防锁死纯函数契约（issue #108）。 */

import { beforeEach, describe, expect, it } from 'vitest'
import {
  BILLING_CARD_STORAGE_KEY,
  DEFAULT_BILLING_CARD_PREFS,
  loadBillingCardPrefs,
  resolveBillingCardMode,
  saveBillingCardPrefs,
} from '../src/client/usage-billing-settings.ts'

beforeEach(() => { localStorage.clear() })

describe('计费卡显示偏好', () => {
  it('老偏好没有 mode 字段时保持完整卡片', () => {
    localStorage.setItem(BILLING_CARD_STORAGE_KEY, JSON.stringify({ metric: 'tokens', span: 'month', showDelta: false }))

    expect(loadBillingCardPrefs()).toEqual({ mode: 'full', metric: 'tokens', span: 'month', showDelta: false })
    expect(DEFAULT_BILLING_CARD_PREFS.mode).toBe('full')
  })

  it('非法 mode 回退完整卡片，三档合法值均可持久化', () => {
    localStorage.setItem(BILLING_CARD_STORAGE_KEY, JSON.stringify({ mode: 'bogus' }))
    expect(loadBillingCardPrefs().mode).toBe('full')

    for (const mode of ['full', 'compact', 'hidden'] as const) {
      saveBillingCardPrefs({ mode, metric: 'money', span: 'day', showDelta: true })
      expect(loadBillingCardPrefs().mode).toBe(mode)
    }
  })

  it('无 /usage 时 hidden 强制降级 compact，其余模式不变', () => {
    expect(resolveBillingCardMode('hidden', false)).toBe('compact')
    expect(resolveBillingCardMode('hidden', true)).toBe('hidden')
    expect(resolveBillingCardMode('compact', false)).toBe('compact')
    expect(resolveBillingCardMode('full', false)).toBe('full')
  })
})
