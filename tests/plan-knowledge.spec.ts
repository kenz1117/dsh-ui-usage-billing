/**
 * Plan-knowledge unit test (adapted from dsh-spend's dual-basis cost model):
 * `planTypeOf` / `subscriptionCnyOf` classify subscription channels as `code`
 * (counted by subscription fee) and everything else as `token` (per-token).
 */

import { describe, expect, it } from 'vitest'
import { planTypeOf, subscriptionCnyOf, tierInfoOf, PLAN_KNOWLEDGE } from '../src/client/plan-knowledge.ts'

describe('planTypeOf', () => {
  it('classifies known subscription channels as code', () => {
    expect(planTypeOf('opencode-go')).toBe('code')
    expect(planTypeOf('kimi-coding')).toBe('code')
    expect(planTypeOf('zai-coding-cn')).toBe('code')
  })

  it('defaults unknown providers to token (pay-as-you-go)', () => {
    expect(planTypeOf('deepseek')).toBe('token')
    expect(planTypeOf('openai')).toBe('token')
    expect(planTypeOf('qwen')).toBe('token')
  })
})

describe('subscriptionCnyOf', () => {
  it('returns the subscription fee for code plans with a fee', () => {
    expect(subscriptionCnyOf('opencode-go')).toBeGreaterThan(0)
  })

  it('returns 0 for code plans without a fee or for token plans', () => {
    expect(subscriptionCnyOf('kimi-coding')).toBe(0)
    expect(subscriptionCnyOf('deepseek')).toBe(0)
  })

  it('classifies every known plan entry as code', () => {
    for (const [provider, entry] of Object.entries(PLAN_KNOWLEDGE)) {
      expect(entry.type, provider).toBe('code')
    }
  })
})

describe('tierInfoOf (auto-detected tier fee + quota vocabulary)', () => {
  it('returns the US-dollar tier fee and period quota for opencode family', () => {
    // opencode 订阅制：$10/月档位费 + 周额度口径。
    const tier = tierInfoOf('opencode-go')
    expect(tier).toBeDefined()
    expect(tier).toMatchObject({ amount: 10, currency: 'USD', periodDays: 7 })
    expect(tier?.label).toMatch(/\$30/)
  })

  it('returns undefined for code plans without a published tier', () => {
    // kimi-coding 未公布档位费/额度 → 无档位知识（卡片回退 CNY 月费）。
    expect(tierInfoOf('kimi-coding')).toBeUndefined()
  })

  it('returns undefined for token plans', () => {
    expect(tierInfoOf('deepseek')).toBeUndefined()
  })
})
