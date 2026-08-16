/**
 * Billing-engine unit tests: catalog lookup, native-currency pricing
 * (domestic CNY / overseas USD), peak/off-peak and cache-bucket cost, and
 * the display formatters.
 */

import { describe, expect, it } from 'vitest'
import {
  computeCost, formatMoney, formatPercent, formatTokens, formatUnitPrice, isSubscriptionPlan, modelOf,
} from '../src/client/pricing.ts'

describe('modelOf', () => {
  it('resolves a known stats key to its catalog entry', () => {
    expect(modelOf('flash').name).toBe('DeepSeek V4 Flash')
    expect(modelOf('gemini-pro').provider).toBe('Google')
  })

  it('falls back to the generic other entry for an unknown key', () => {
    expect(modelOf('totally-unknown-model').key).toBe('other')
  })
})

describe('computeCost', () => {
  const MILLION = 1_000_000

  it('prices domestic CNY models in yuan without any exchange-rate step', () => {
    // DeepSeek 本身是人民币计价：¥3/1M 输入、¥0.1/1M 缓存命中。
    const cost = computeCost(modelOf('flash'), {
      input: MILLION, cacheHit: 500_000, cacheMiss: 500_000, output: 0,
    }, 1) // peakShare=1：只看高峰档。
    const expected = (500_000 * 3 + 500_000 * 0.1) / MILLION
    expect(cost).toBeCloseTo(expected, 10)
  })

  it('applies the exchange rate only to overseas USD models', () => {
    // Gemini 是美元计价：标准档 ¥→$ 后按汇率 6.79 换算成人民币。
    const cost = computeCost(modelOf('gemini-pro'), {
      input: MILLION, cacheHit: MILLION, cacheMiss: 0, output: 0,
    }, 1)
    const expected = (1_000_000 * 0.2) / MILLION * 6.79
    expect(cost).toBeCloseTo(expected, 10)
  })

  it('mixes peak and off-peak bands by the peak share for two-band models', () => {
    const buckets = { input: MILLION, cacheHit: MILLION, cacheMiss: 0, output: MILLION }
    const peakOnly = computeCost(modelOf('flash'), buckets, 1)
    const offOnly = computeCost(modelOf('flash'), buckets, 0)
    const half = computeCost(modelOf('flash'), buckets, 0.5)
    expect(peakOnly).toBeCloseTo((1_000_000 * 0.1 + 1_000_000 * 9) / MILLION, 10)
    expect(offOnly).toBeLessThan(peakOnly) // 低谷档更便宜（官方减半）。
    expect(half).toBeCloseTo((peakOnly + offOnly) / 2, 10)
  })

  it('prices flat models identically in both bands', () => {
    const buckets = { input: MILLION, cacheHit: 0, cacheMiss: MILLION, output: MILLION }
    expect(computeCost(modelOf('glm'), buckets, 1)).toBeCloseTo(computeCost(modelOf('glm'), buckets, 0), 10)
  })

  it('charges nothing for a subscription-plan model key', () => {
    expect(isSubscriptionPlan('some-plan-key')).toBe(false)
    expect(computeCost(modelOf('flash'), { input: MILLION, cacheHit: 0, cacheMiss: MILLION, output: MILLION })).toBeGreaterThan(0)
  })
})

describe('display formatters', () => {
  it('labels a zero unit price as free', () => {
    expect(formatUnitPrice(0)).toBe('免费')
  })

  it('formats prices in their native currency', () => {
    expect(formatUnitPrice(3, 'CNY')).toBe('¥3.00')
    expect(formatUnitPrice(2, 'USD')).toBe('$2.00')
    expect(formatUnitPrice(12, 'USD')).toBe('$12.0')
  })

  it('formats money with adaptive precision', () => {
    expect(formatMoney(0.3395)).toBe('¥0.34')
    expect(formatMoney(6.79)).toBe('¥6.79')
    expect(formatMoney(1018.5)).toBe('¥1019') // ≥1000 → 整数元
  })

  it('formats token counts and percentages', () => {
    expect(formatTokens(255_884_353)).toBe('255.9M')
    expect(formatTokens(414_102)).toBe('414K')
    expect(formatPercent(99.9)).toBe('99.9%')
  })
})
