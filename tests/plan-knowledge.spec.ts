/**
 * Plan-knowledge unit test (adapted from dsh-spend's dual-basis cost model):
 * `planTypeOf` / `subscriptionCnyOf` classify subscription channels as `code`
 * (counted by subscription fee) and everything else as `token` (per-token).
 */

import { describe, expect, it } from 'vitest'
import { planTypeOf, subscriptionFeeCnyOf, tierInfoOf, normalizePlanProvider, PLAN_KNOWLEDGE } from '../src/client/plan-knowledge.ts'

describe('planTypeOf', () => {
  it('classifies known subscription channels as code', () => {
    expect(planTypeOf('opencode-go')).toBe('code')
    expect(planTypeOf('kimi-coding')).toBe('code')
    expect(planTypeOf('zai-coding-cn')).toBe('code')
    // MiniMax CN：与 xiaomi-token-plan-cn / qwen-token-plan-cn 同口径，订阅卡片
    // 必须按 code 计算月费，否则会把它误归到 token 桶里丢档位知识。`minimax-cn`
    // 是 DSH pi-ai catalog 自己 ship 的官方国内 route id，与 plugin 起的别名
    // `minimax-token-plan-cn` 等价。
    expect(planTypeOf('minimax-cn')).toBe('code')
    expect(planTypeOf('minimax-token-plan-cn')).toBe('code')
  })

  it('defaults unknown providers to token (pay-as-you-go)', () => {
    expect(planTypeOf('deepseek')).toBe('token')
    expect(planTypeOf('openai')).toBe('token')
    expect(planTypeOf('qwen')).toBe('token')
  })
})

describe('subscriptionFeeCnyOf (native currency × live rate)', () => {
  it('converts the OpenCode Go USD fee via the live rate', () => {
    expect(subscriptionFeeCnyOf('opencode-go', 7.1)).toBe(71)
  })

  it('returns 0 when the rate is unavailable (no assumed-rate distortion)', () => {
    expect(subscriptionFeeCnyOf('opencode-go', undefined)).toBe(0)
    expect(subscriptionFeeCnyOf('opencode-go', 0)).toBe(0)
  })

  it('returns 0 for code plans without a fee or for token plans', () => {
    expect(subscriptionFeeCnyOf('kimi-coding', 7.1)).toBe(0)
    expect(subscriptionFeeCnyOf('deepseek', 7.1)).toBe(0)
  })

  it('classifies every known plan entry as code', () => {
    for (const [provider, entry] of Object.entries(PLAN_KNOWLEDGE)) {
      expect(entry.type, provider).toBe('code')
    }
  })
})

describe('plan provider alias normalization', () => {
  it('maps provider-id variants onto the canonical plan key', () => {
    expect(normalizePlanProvider('glm')).toBe('zai-coding-cn')
    expect(normalizePlanProvider('xiaomi')).toBe('xiaomi-token-plan-cn')
    expect(normalizePlanProvider('moonshot')).toBe('kimi-coding')
    expect(normalizePlanProvider('deepseek')).toBe('deepseek')
  })

  it('classifies aliased subscription variants as code plans (pay-as-you-go stays token)', () => {
    expect(planTypeOf('glm')).toBe('code')
    expect(planTypeOf('bigmodel')).toBe('code')
    expect(planTypeOf('kimi')).toBe('code')
    // 裸按量 API 名（qwen/dashscope/aliyun）不被归一到订阅键，仍按 token。
    expect(planTypeOf('qwen')).toBe('token')
    expect(planTypeOf('dashscope')).toBe('token')
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
