/**
 * Billing-engine unit tests: catalog lookup, native-currency pricing
 * (domestic CNY / overseas USD), peak/off-peak and cache-bucket cost, and
 * the display formatters.
 */

import { describe, expect, it, afterEach } from 'vitest'
import {
  applyLivePricing, computeCost, formatMoney, formatPercent, formatTokens, formatUnitPrice, getRateInfo,
  isSubscriptionPlan, modelOf,
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

  it('crosses cache-hit pricing with peak/off-peak bands', () => {
    // 缓存 × 时段多维交叉：高峰档内用高峰缓存价，低谷档内用低谷缓存价，
    // 再按时段占比混合（DeepSeek V4 高峰 09:00-12:00 / 14:00-18:00，北京时间）。
    const buckets = { input: 2 * MILLION, cacheHit: MILLION, cacheMiss: MILLION, output: MILLION }
    const peakOnly = computeCost(modelOf('flash'), buckets, 1)
    const offOnly = computeCost(modelOf('flash'), buckets, 0)
    // 高峰：缓存命中 ¥0.1、未命中 ¥3、输出 ¥9（每 1M）。
    const expectedPeak = (MILLION * 0.1 + MILLION * 3 + MILLION * 9) / MILLION
    expect(peakOnly).toBeCloseTo(expectedPeak, 10)
    // 低谷：缓存命中 ¥0.05、未命中 ¥1.5、输出 ¥4.5（每 1M）。
    const expectedOff = (MILLION * 0.05 + MILLION * 1.5 + MILLION * 4.5) / MILLION
    expect(offOnly).toBeCloseTo(expectedOff, 10)
    // 各半混合：两个档位各贡献一半。
    expect(computeCost(modelOf('flash'), buckets, 0.5)).toBeCloseTo((expectedPeak + expectedOff) / 2, 10)
  })

  it('charges nothing for a subscription-plan model key', () => {
    expect(isSubscriptionPlan('some-plan-key')).toBe(false)
    expect(computeCost(modelOf('flash'), { input: MILLION, cacheHit: 0, cacheMiss: MILLION, output: MILLION })).toBeGreaterThan(0)
  })
})

describe('live pricing overrides', () => {
  const MILLION = 1_000_000

  afterEach(() => {
    // 清掉实时覆盖（模块级状态），避免影响后续用例；缺省字段即回退内置值。
    applyLivePricing({ source: 'builtin' })
  })

  it('uses the live exchange rate for USD models when provided', () => {
    applyLivePricing({ source: 'live', rate: 7.5 })
    const cost = computeCost(modelOf('gemini-pro'), { input: MILLION, cacheHit: MILLION, cacheMiss: 0, output: 0 }, 1)
    // 标准档缓存命中 $0.2/1M，按 live 汇率 7.5 换算。
    expect(cost).toBeCloseTo((1_000_000 * 0.2) / MILLION * 7.5, 10)
  })

  it('overrides a matched model price with the live USD table', () => {
    applyLivePricing({ source: 'live', prices: { flash: { input: 2, cacheHit: 0.2, output: 8 } } })
    const row = modelOf('flash')
    expect(row.price.currency).toBe('USD')
    const cost = computeCost(row, { input: MILLION, cacheHit: 0, cacheMiss: MILLION, output: MILLION }, 1)
    // 美元单价 × 内置汇率 6.79（未给 rate 时）。
    expect(cost).toBeCloseTo((1_000_000 * 2 + 1_000_000 * 8) / MILLION * 6.79, 10)
  })

  it('keeps the built-in catalog when no live data applies', () => {
    applyLivePricing({ source: 'builtin' })
    expect(modelOf('flash').price.currency).toBe('CNY')
    expect(modelOf('flash').name).toBe('DeepSeek V4 Flash')
    expect(modelOf('gemini-pro').price.currency).toBe('USD')
  })

  it('reports the built-in rate and source when no live rate is applied', () => {
    applyLivePricing({ source: 'builtin' })
    expect(getRateInfo()).toEqual({ rate: 6.79, live: false })
  })

  it('reports the live rate and source once applied', () => {
    applyLivePricing({ source: 'live', rate: 7.5 })
    expect(getRateInfo()).toEqual({ rate: 7.5, live: true })
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
