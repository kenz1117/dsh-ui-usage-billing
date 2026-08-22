/**
 * Billing-engine unit tests: catalog lookup, native-currency pricing
 * (domestic CNY / overseas USD), peak/off-peak and cache-bucket cost, and
 * the display formatters.
 */

import { describe, expect, it, afterEach } from 'vitest'
import {
  applyLiveCatalogModels, applyLivePricing, canonModelId, catalogEntries, cnyToUsd, computeCost, computeCostAt, convertUnitPrice, formatMoney, formatPercent, formatTokens, formatUnitPrice,
  getRateInfo, isPeakHour, modelOf, MODEL_CATALOG, resolveCatalogKey, tierAt, tierCountdown,
} from '../src/client/pricing.ts'
import { PROVIDER_ALIASES } from '../src/client/UsageBilling.tsx'

describe('provider alias completeness', () => {
  it('maps every catalog provider display name to aliases (Custom exempt)', () => {
    // 一致性守卫：健康绿灯按 display name → 别名 → 实际 provider id 匹配。
    // 任何 catalog 厂商漏配别名都会让该厂商的模型行圆点永远落回灰色未连接。
    const displayNames = [...new Set(MODEL_CATALOG.map(entry => entry.provider))]
    for (const name of displayNames) {
      if (name === 'Custom') continue
      const aliases = PROVIDER_ALIASES[name]
      expect(aliases, `catalog provider "${name}" missing PROVIDER_ALIASES entry`).toBeDefined()
      expect(aliases?.length ?? 0).toBeGreaterThan(0)
    }
  })

  it('matches the xiaomi token-plan channel id to the 小米 dot', () => {
    // 订阅通道的 provider id 是 xiaomi-token-plan-cn 等变体：经别名前缀子串匹配。
    const aliases = PROVIDER_ALIASES['小米'] ?? []
    expect(aliases.some(alias => 'xiaomitokenplancn'.includes(alias))).toBe(true)
  })
})

describe('canonModelId / resolveCatalogKey', () => {
  it('canonicalizes case, separators, and parenthetical annotations', () => {
    expect(canonModelId('DeepSeek V4 PRO')).toBe('deepseekv4pro')
    expect(canonModelId('glm-5.2')).toBe('glm52')
    expect(canonModelId('gpt5.6 luna(go)')).toBe('gpt56luna')
    expect(canonModelId('deepseek.v4.flash')).toBe('deepseekv4flash')
  })

  it('resolves a normalized-but-not-exactly-aliased id to the catalog key', () => {
    // 'DeepSeek V4 PRO' 归一化后命中 'deepseek-v4-pro' → 'pro'（此前未收录）。
    expect(resolveCatalogKey('DeepSeek V4 PRO')).toBe('pro')
    // 已在内置目录的键原样返回。
    expect(resolveCatalogKey('glm')).toBe('glm')
    // 已知别名仍走原逻辑。
    expect(resolveCatalogKey('k3')).toBe('kimi-k3')
    // 完全未知 id 原样返回（回退 other，不计费）。
    expect(resolveCatalogKey('no-such-model')).toBe('no-such-model')
  })
})

describe('modelOf', () => {
  it('resolves a known stats key to its catalog entry', () => {
    expect(modelOf('flash').name).toBe('DeepSeek V4 Flash')
    expect(modelOf('gemini-pro').provider).toBe('Google')
  })

  it('falls back to the generic other entry for an unknown key', () => {
    expect(modelOf('totally-unknown-model').key).toBe('other')
  })
})

describe('estimated-price marker', () => {
  it('flags catalog entries whose price is an estimate rather than official', () => {
    // 讯飞/商汤未公布官方按量单价（公测/套餐制），表内为估算价：应带 estimated 标记。
    expect(modelOf('spark').estimated).toBe(true)
    expect(modelOf('sensenova').estimated).toBe(true)
  })

  it('leaves officially priced models unflagged', () => {
    expect(modelOf('flash').estimated).toBeUndefined()
    expect(modelOf('glm').estimated).toBeUndefined()
    // 小米 MiMo 2026-08 官方公布按量价：不再标估算。
    expect(modelOf('mimo-v2.5').estimated).toBeUndefined()
    expect(modelOf('mimo-v2.5-pro').estimated).toBeUndefined()
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

  it('resolves catalog rows for plan-channel models with a metered estimate', () => {
    // 订阅判定在服务端按通道（provider）进行，前端不做「模型 = 订阅」假设：
    // kimi-k3 / mimo-v2.5 走按量通道时按目录价估算，走订阅通道时由服务端记 0。
    expect(modelOf('kimi-k3').name).toBe('Kimi K3')
    expect(modelOf('mimo-v2.5').name).toBe('MiMo V2.5')
    expect(computeCost(modelOf('kimi-k3'), { input: MILLION, cacheHit: 0, cacheMiss: MILLION, output: MILLION })).toBeGreaterThan(0)
    expect(computeCost(modelOf('mimo-v2.5'), { input: MILLION, cacheHit: 0, cacheMiss: MILLION, output: MILLION })).toBeGreaterThan(0)
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

describe('peak/off-peak tier (P0-1)', () => {
  it('flags the official Beijing peak windows (09-12 / 14-18)', () => {
    expect(isPeakHour(9)).toBe(true)
    expect(isPeakHour(10)).toBe(true)
    expect(isPeakHour(11)).toBe(true)
    expect(isPeakHour(12)).toBe(false)
    expect(isPeakHour(13)).toBe(false)
    expect(isPeakHour(14)).toBe(true)
    expect(isPeakHour(17)).toBe(true)
    expect(isPeakHour(18)).toBe(false)
  })

  it('derives the tier from a wall-clock epoch in Beijing time', () => {
    // 北京时间 = UTC+8：北京时间 10 点 = UTC 02 点。
    const at = (beijingHour: number): number => Date.UTC(2026, 7, 21, (beijingHour + 24 - 8) % 24)
    expect(tierAt(at(10))).toBe('peak')
    expect(tierAt(at(13))).toBe('offPeak')
    expect(tierAt(at(15))).toBe('peak')
    expect(tierAt(at(20))).toBe('offPeak')
    expect(tierAt(null)).toBe('peak') // 未知时刻保守按高峰
  })

  it('charges the off-peak tier all day on Beijing weekends (Sat/Sun)', () => {
    // 2026-08-22 = 周六、2026-08-23 = 周日；周末即使落工作日的峰时窗口也按低谷。
    expect(tierAt(Date.UTC(2026, 7, 22, 4, 0))).toBe('offPeak') // 周六北京 12:00
    expect(tierAt(Date.UTC(2026, 7, 23, 7, 0))).toBe('offPeak') // 周日北京 15:00
    expect(tierAt(Date.UTC(2026, 7, 24, 2, 0))).toBe('peak')    // 周一北京 10:00（工作日峰时）
  })

  it('counts down to the next weekday peak on weekends', () => {
    // 周六北京 12:00：全天低谷，下一档是周一 09:00 峰时（45 小时后）。
    const sat = tierCountdown(Date.UTC(2026, 7, 22, 4, 0))
    expect(sat.tier).toBe('offPeak')
    expect(sat.nextSwitchInMs).toBe(45 * 3_600_000)
    // 工作日照常：周一北京 10:00 → 2 小时后进入 12:00 平价边界。
    const mon = tierCountdown(Date.UTC(2026, 7, 24, 2, 0))
    expect(mon.tier).toBe('peak')
    expect(mon.nextSwitchInMs).toBe(2 * 3_600_000)
  })
})

describe('computeCostAt (P0-1)', () => {
  const MILLION = 1_000_000
  const at = (beijingHour: number): number => Date.UTC(2026, 7, 21, (beijingHour + 24 - 8) % 24)
  const buckets = { input: 2 * MILLION, cacheHit: MILLION, cacheMiss: MILLION, output: MILLION }

  it('prices the peak band when the call falls in the peak window', () => {
    // 高峰：缓存命中 ¥0.1、未命中 ¥3、输出 ¥9（每 1M）。
    expect(computeCostAt(modelOf('flash'), buckets, at(10)))
      .toBeCloseTo((MILLION * 0.1 + MILLION * 3 + MILLION * 9) / MILLION, 10)
  })

  it('prices the off-peak band outside the window', () => {
    // 低谷：缓存命中 ¥0.05、未命中 ¥1.5、输出 ¥4.5（每 1M）。
    expect(computeCostAt(modelOf('flash'), buckets, at(13)))
      .toBeCloseTo((MILLION * 0.05 + MILLION * 1.5 + MILLION * 4.5) / MILLION, 10)
  })

  it('falls back to the peak-share mix when the time is missing', () => {
    expect(computeCostAt(modelOf('flash'), buckets, null)).toBeCloseTo(computeCost(modelOf('flash'), buckets, 0.5), 10)
  })

  it('prices flat models identically at any time', () => {
    expect(computeCostAt(modelOf('glm'), buckets, at(10))).toBeCloseTo(computeCostAt(modelOf('glm'), buckets, at(13)), 10)
  })
})

describe('currency display (P2-3)', () => {
  it('converts CNY to USD by the built-in rate', () => {
    expect(cnyToUsd(6.79)).toBeCloseTo(1, 10)
    expect(cnyToUsd(0)).toBe(0)
  })

  it('formats money in the requested currency', () => {
    // formatMoney 只负责符号与精度；汇率换算是调用方 cnyToUsd 的事。
    expect(formatMoney(6.79, 'usd')).toBe('$6.79')
    expect(formatMoney(cnyToUsd(6.79), 'usd')).toBe('$1.00')
    expect(formatMoney(10, 'usd')).toBe('$10.0')
    expect(formatMoney(0, 'usd')).toBe('$0')
    expect(formatMoney(Number.NaN, 'usd')).toBe('$0')
    expect(formatMoney(6.79)).toBe('¥6.79') // 默认仍是人民币
  })
})

describe('convertUnitPrice (rate table follows display currency)', () => {
  const RATE = 6.79

  it('keeps the value when native and target currencies match', () => {
    expect(convertUnitPrice(2, 'CNY', 'cny', RATE)).toBe(2)
    expect(convertUnitPrice(0.5, 'USD', 'usd', RATE)).toBe(0.5)
  })

  it('converts CNY to USD by dividing the rate', () => {
    expect(convertUnitPrice(6.79, 'CNY', 'usd', RATE)).toBeCloseTo(1, 10)
  })

  it('converts USD to CNY by multiplying the rate', () => {
    expect(convertUnitPrice(1, 'USD', 'cny', RATE)).toBeCloseTo(6.79, 10)
  })

  it('falls back to the native value when the rate is missing or invalid', () => {
    expect(convertUnitPrice(6.79, 'CNY', 'usd', 0)).toBe(6.79)
    expect(convertUnitPrice(6.79, 'CNY', 'usd', Number.NaN)).toBe(6.79)
  })
})

describe('catalogEntries (model health parity)', () => {
  it('merges probed config models, pricing the known ones and flagging unknown ones', () => {
    // 重置状态后再注入探活模型，避免污染其他用例（applyLivePricing 覆盖为 undefined）。
    applyLivePricing({ source: 'builtin' })
    applyLiveCatalogModels([
      // 内置目录已有（flash）→ 去重不重复。
      { id: 'deepseek-v4-flash', name: 'V4 Flash', provider: 'DeepSeek' },
      // models.dev 补充已有 → 用补充价，不重复。
      { id: 'kimi-k3', name: 'Kimi K3', provider: '月之暗面' },
      // 两者皆无 → 保留并标记未收录。
      { id: 'acme-model-x', name: 'Acme X', provider: 'Acme' },
    ])
    const entries = catalogEntries()
    const keys = entries.map(entry => entry.key)
    // 内置目录 + 补充外，追加探活未收录模型。
    expect(keys).toContain('acme-model-x')
    // 探活的 flash / kimi-k3 去重：不产生重复行。
    expect(keys.filter(k => k === 'flash')).toHaveLength(1)
    expect(keys.filter(k => k === 'kimi-k3')).toHaveLength(1)
    const acme = entries.find(entry => entry.key === 'acme-model-x')
    expect(acme).toMatchObject({ provider: 'Acme', uncatalogued: true })
  })
})
