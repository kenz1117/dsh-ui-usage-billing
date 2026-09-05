/**
 * Billing-engine unit tests: catalog lookup, native-currency pricing
 * (domestic CNY / overseas USD), peak/off-peak and cache-bucket cost,
 * time-limited launch promos, and the display formatters.
 */

import { describe, expect, it, afterEach } from 'vitest'
import {
  applyLiveCatalogModels, applyLivePricing, applyPromo, canonModelId, catalogEntries, cnyToUsd, computeCost,
  computeCostAt, convertUnitPrice, formatMoney, formatPercent, formatTokens, formatUnitPrice,
  applyUserModelAliases,
  getRateInfo, isPeakHour, isPromoActive, modelOf, MODEL_CATALOG, resolveCatalogKey, tierAt, tierCountdown,
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

  it('normalises MiniMax model ids so MiniMax-M3 resolves to the catalog entry', () => {
    // 真实日志 id `MiniMax-M3`（大小写各异）应归一化到目录键 `minimax`，而非标未收录。
    expect(resolveCatalogKey('MiniMax-M3')).toBe('minimax')
    expect(resolveCatalogKey('minimax-m3')).toBe('minimax')
    expect(resolveCatalogKey('MINIMAX-M2')).toBe('minimax')
    expect(modelOf('MiniMax-M3')).toMatchObject({ key: 'minimax', name: 'MiniMax-M3', provider: 'MiniMax' })
    expect(modelOf('MiniMax-M3').uncatalogued).toBeUndefined()
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

describe('legacy base prices (pre peak-era)', () => {
  const MILLION = 1_000_000
  // buckets：2M 输入（1M 命中 + 1M 未命中）+ 1M 输出，与峰谷组同构便于对照。
  const buckets = { input: 2 * MILLION, cacheHit: MILLION, cacheMiss: MILLION, output: MILLION }
  // 分界 = UTC 2026-08-16T16:00Z（北京 2026-08-17 周一 00:00）。
  const before = Date.UTC(2026, 7, 15, 10) // 北京 8-15 周六 18:00（峰谷时代前）
  const boundary = Date.parse('2026-08-16T16:00:00Z') // 分界整点：北京 00:00 谷档

  it('charges the official pre-peak base price for flash', () => {
    // 基础价：缓存命中 ¥0.02、未命中 ¥1、输出 ¥2（每 1M）。
    expect(computeCostAt(modelOf('flash'), buckets, before))
      .toBeCloseTo((MILLION * 0.02 + MILLION * 1 + MILLION * 2) / MILLION, 10)
  })

  it('charges the official pre-peak base price for pro', () => {
    // 基础价：缓存命中 ¥0.025、未命中 ¥3、输出 ¥6（每 1M）。
    expect(computeCostAt(modelOf('pro'), buckets, before))
      .toBeCloseTo((MILLION * 0.025 + MILLION * 3 + MILLION * 6) / MILLION, 10)
  })

  it('prices flash-vision-exp at the flash legacy base', () => {
    expect(computeCostAt(modelOf('flash-vision-exp'), buckets, before))
      .toBe(computeCostAt(modelOf('flash'), buckets, before))
  })

  it('switches to peak/off-peak bands at the boundary instant', () => {
    // 分界整点（北京周一 00:00）起按谷档：¥0.05 + ¥1.5 + ¥4.5 = ¥6.05，不再是基础价 ¥3.02。
    expect(computeCostAt(modelOf('flash'), buckets, boundary))
      .toBeCloseTo((MILLION * 0.05 + MILLION * 1.5 + MILLION * 4.5) / MILLION, 10)
  })

  it('keeps user prices authoritative over the legacy band', () => {
    // 用户价 = 实付价：即使事件在峰谷时代之前，也不套内置 legacy 口径。
    const priced = { ...modelOf('flash'), userPriced: true as const, price: { currency: 'CNY' as const, input: 9, cacheHit: 0.3, output: 27 } }
    expect(computeCostAt(priced, buckets, before))
      .toBeCloseTo((MILLION * 0.3 + MILLION * 9 + MILLION * 27) / MILLION, 10)
  })

  it('leaves non-DeepSeek models untouched by the legacy band', () => {
    expect(computeCostAt(modelOf('glm'), buckets, before))
      .toBe(computeCostAt(modelOf('glm'), buckets, boundary))
  })

  it('charges weekend peak hours in the v1 window (before the weekend off-peak boundary)', () => {
    // v1 规则（北京 8-17 00:00 ~ 8-23 00:00）：周末不豁免，周六 10:00 计峰。
    const satV1 = Date.UTC(2026, 7, 22, 2) // 北京 8-22（周六）10:00
    expect(computeCostAt(modelOf('flash'), buckets, satV1))
      .toBeCloseTo((MILLION * 0.1 + MILLION * 3 + MILLION * 9) / MILLION, 10)
  })

  it('charges weekend off-peak all day from the 08-23 boundary onward', () => {
    // 分界整点（北京 8-23 00:00 周日）起周末全天低谷；再下一个周六同样。
    const sunNew = Date.parse('2026-08-22T16:00:00Z') // 北京 8-23（周日）00:00 整
    const satAfter = Date.UTC(2026, 7, 29, 2) // 北京 8-29（周六）10:00
    const offPeakCost = (MILLION * 0.05 + MILLION * 1.5 + MILLION * 4.5) / MILLION
    expect(computeCostAt(modelOf('flash'), buckets, sunNew)).toBeCloseTo(offPeakCost, 10)
    expect(computeCostAt(modelOf('flash'), buckets, satAfter)).toBeCloseTo(offPeakCost, 10)
  })

  it('keeps weekday peaks unaffected by the weekend-boundary change', () => {
    // 周一 10:00 在分界前后都是峰时（周末规则变更不波及工作日）。
    const monBefore = Date.UTC(2026, 7, 17, 2) // 北京 8-17（周一）10:00
    const monAfter = Date.UTC(2026, 7, 24, 2) // 北京 8-24（周一）10:00
    const peakCost = (MILLION * 0.1 + MILLION * 3 + MILLION * 9) / MILLION
    expect(computeCostAt(modelOf('flash'), buckets, monBefore)).toBeCloseTo(peakCost, 10)
    expect(computeCostAt(modelOf('flash'), buckets, monAfter)).toBeCloseTo(peakCost, 10)
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

  it('keeps the full models.dev supplement out of the table while still pricing probed models from it', () => {
    // models.dev 补充是数千行全量清单：只允许通过探活匹配进入费率表，
    // 否则表格被网关厂商的全量模型撑爆。
    applyLivePricing({
      source: 'live',
      rate: 7.5,
      extraModels: [
        { key: 'acme-model-x', name: 'Acme X', provider: 'Acme', price: { input: 4, cacheHit: 0.8, output: 16 } },
        { key: 'nano-gpt-some-model', name: 'Nano GPT Some Model', provider: 'nano-gpt', price: { input: 1, cacheHit: 0.1, output: 2 } },
      ],
    })
    applyLiveCatalogModels([
      // 目录外但补充条目有价 → 复用其 USD 价渲染一行。
      { id: 'acme-model-x', name: 'Acme X', provider: 'Acme' },
    ])
    const entries = catalogEntries()
    // 未探活的补充模型不进表；探活命中的复用补充价（extraEntryOf 走 USD 直价，
    // 条目带 currency: 'USD'，费率表渲染时按 displayCurrency 汇率折算）。
    expect(entries.map(entry => entry.key)).not.toContain('nano-gpt-some-model')
    const acme = entries.find(entry => entry.key === 'acme-model-x')
    expect(acme).toMatchObject({ price: { currency: 'USD', input: 4, cacheHit: 0.8, output: 16 } })
    expect(acme?.uncatalogued).toBeUndefined()
  })
})

describe('time-limited promo (GLM-5.3-Flash)', () => {
  const MILLION = 1_000_000
  // 每档各 1M token：成本数值 = 未命中 + 命中 + 输出三个单价之和（元/百万口径）。
  const buckets = { input: MILLION, cacheHit: MILLION, cacheMiss: MILLION, output: MILLION }
  const entry = modelOf('glm-5.3-flash')
  // 判定时刻一律从 promo 元数据推导，不依赖真实时钟：促销过期后测试依旧稳定。
  const endsAtMs = entry.promo?.endsAtMs ?? 0

  it('lists the model with list price and the half-price window metadata', () => {
    expect(entry.name).toBe('GLM-5.3-Flash')
    expect(resolveCatalogKey('glm-5.3-flash')).toBe('glm-5.3-flash')
    // 归一化变体（大小写/分隔符/括号附注）落到同一目录键。
    expect(resolveCatalogKey('GLM.5.3 Flash(v2)')).toBe('glm-5.3-flash')
    // 目录永远保存刊例价（0.8 / 0.23 / 2.8），促销只是元数据不回写价格。
    expect(entry.price).toMatchObject({ currency: 'CNY', input: 0.8, cacheHit: 0.23, output: 2.8 })
    expect(entry.promo?.factor).toBe(0.5)
    expect(endsAtMs).toBeGreaterThan(0)
  })

  it('halves all bands for in-window events via computeCostAt', () => {
    const inside = endsAtMs - 3_600_000
    // 折后单价合计：(0.4 + 0.115 + 1.4) 元/百万 token。
    expect(computeCostAt(entry, buckets, inside)).toBeCloseTo(1.915, 10)
  })

  it('reverts to list price at and after the deadline', () => {
    const listTotal = 0.8 + 0.23 + 2.8
    expect(computeCostAt(entry, buckets, endsAtMs)).toBeCloseTo(listTotal, 10)
    expect(computeCostAt(entry, buckets, endsAtMs + 86_400_000)).toBeCloseTo(listTotal, 10)
  })

  it('follows the event time so past usage keeps its historical price', () => {
    // 同一批用量，事件落在促销期内按五折、过期后按刊例价：计价随事件时刻而非墙钟。
    const during = computeCostAt(entry, buckets, endsAtMs - 86_400_000)
    const after = computeCostAt(entry, buckets, endsAtMs + 86_400_000)
    expect(during).toBeCloseTo(after * 0.5, 10)
  })

  it('respects the explicit nowMs passed to computeCost', () => {
    const inside = endsAtMs - 3_600_000
    expect(computeCost(entry, buckets, 1, inside)).toBeCloseTo(1.915, 10)
    expect(computeCost(entry, buckets, 1, endsAtMs)).toBeCloseTo(3.83, 10)
  })

  it('scales every band including offPeak while active', () => {
    // DeepSeek V4 Flash 带 offPeak 分档：促销把主档与低谷档一起打折。
    const deepseekWithPromo = { ...modelOf('flash'), promo: { factor: 0.5, endsAtMs } }
    const priced = applyPromo(deepseekWithPromo, endsAtMs - 1000)
    expect(priced.price.input).toBeCloseTo(1.5, 10) // 主档 ¥3 → ¥1.5
    expect(priced.price.offPeak?.input).toBeCloseTo(0.75, 10) // 低谷 ¥1.5 → ¥0.75
  })

  it('returns the entry untouched outside the window or with an invalid factor', () => {
    const glm = modelOf('glm')
    // 无促销 / 已过期 / factor 非法：原样返回（引用相等，不改写任何字段）。
    expect(applyPromo(glm, endsAtMs - 1000)).toBe(glm)
    expect(applyPromo(entry, endsAtMs)).toBe(entry)
    const badFactor = { ...entry, promo: { factor: 1, endsAtMs } }
    expect(applyPromo(badFactor, endsAtMs - 1000)).toBe(badFactor)
    // 纯判定函数与 applyPromo 口径一致。
    expect(isPromoActive({ factor: 0.5, endsAtMs }, endsAtMs - 1000)).toBe(true)
    expect(isPromoActive({ factor: 0.5, endsAtMs }, endsAtMs)).toBe(false)
  })

  it('shows discounted unit prices in the rate table while active', () => {
    // 费率表行与计价同源（catalogEntries 折算）：生效中显示折后价，过期自动恢复刊例价。
    const rowDuring = catalogEntries(endsAtMs - 86_400_000).find(item => item.key === 'glm-5.3-flash')
    expect(rowDuring?.price.input).toBeCloseTo(0.4, 10)
    expect(rowDuring?.price.cacheHit).toBeCloseTo(0.115, 10)
    const rowAfter = catalogEntries(endsAtMs).find(item => item.key === 'glm-5.3-flash')
    expect(rowAfter?.price.input).toBeCloseTo(0.8, 10)
  })
})

describe('Qwen3.8 Max list price with extra pricing rows', () => {
  const entry = modelOf('qwen3.8-max')

  it('uses the official CNY list price', () => {
    // 人民币刊例：输入 12 / 缓存命中 1.5 / 输出 36（替换旧美元换算价）。
    expect(entry.key).toBe('qwen-3.8-max')
    expect(entry.price).toMatchObject({ currency: 'CNY', input: 12, cacheHit: 1.5, output: 36 })
  })

  it('carries batch and explicit-cache rows as display-only reference prices', () => {
    const rows = entry.extraRows ?? []
    // 四个附加维度齐全：显式缓存创建/命中 + Batch File + Batch Chat。
    expect(rows.map(row => row.label)).toEqual(['显式缓存创建', '显式缓存命中', 'Batch File', 'Batch Chat'])
    const batchFile = rows.find(row => row.label === 'Batch File')
    // Batch File 长期半价档：输入 6 / 输出 18。
    expect(batchFile).toMatchObject({ input: 6, output: 18 })
    // Batch Chat 原价与标准价一致；条目无促销元数据（限时活动按需求忽略）。
    expect(rows.find(row => row.label === 'Batch Chat')).toMatchObject({ input: 12, output: 36 })
    expect(entry.promo).toBeUndefined()
  })

  it('keeps extra rows untouched by the promo pipeline in catalogEntries', () => {
    // 促销折算只作用 price 桶，附加参考价在任何时刻都保持原值。
    const folded = catalogEntries(Date.now()).find(item => item.key === 'qwen-3.8-max')
    expect(folded?.extraRows?.find(row => row.label === 'Batch File')?.input).toBe(6)
  })
})

describe('Qwen3.8 Flash list price with extra pricing rows', () => {
  const entry = modelOf('qwen3.8-flash')

  it('uses the official CNY list price', () => {
    // 人民币刊例：输入 1 / 缓存命中 0.1 / 输出 3。
    expect(entry.key).toBe('qwen-3.8-flash')
    expect(entry.price).toMatchObject({ currency: 'CNY', input: 1, cacheHit: 0.1, output: 3 })
  })

  it('carries batch and explicit-cache rows as display-only reference prices', () => {
    const rows = entry.extraRows ?? []
    // 四个附加维度齐全：显式缓存创建/命中 + Batch File + Batch Chat。
    expect(rows.map(row => row.label)).toEqual(['显式缓存创建', '显式缓存命中', 'Batch File', 'Batch Chat'])
    // Batch File 长期半价档：输入 0.5 / 输出 1.5；Batch Chat 与标准价一致。
    expect(rows.find(row => row.label === 'Batch File')).toMatchObject({ input: 0.5, output: 1.5 })
    expect(rows.find(row => row.label === 'Batch Chat')).toMatchObject({ input: 1, output: 3 })
    expect(entry.promo).toBeUndefined()
  })
})

describe('Qwen3.7-Max list price with open-ended promo', () => {
  const entry = modelOf('qwen-max')

  it('uses the official CNY list price with the 50% promo folded by catalogEntries', () => {
    // 刊例：输入 12 / 缓存命中 1.2 / 输出 36；整单限时 5 折（折后 6/0.6/18）。
    expect(entry.key).toBe('qwen-max')
    expect(entry.price).toMatchObject({ currency: 'CNY', input: 12, cacheHit: 1.2, output: 36 })
    // 厂商未公布截止日：promo 无 endsAtMs，表示长期生效直至公告。
    expect(entry.promo).toMatchObject({ factor: 0.5, note: '限时 5 折' })
    const folded = catalogEntries(Date.now()).find(item => item.key === 'qwen-max')
    // 费率表显示折后单价。
    expect(folded?.price).toMatchObject({ input: 6, cacheHit: 0.6, output: 18 })
    // 远期时刻不设截止自动恢复——无限期促销在任意远期时刻仍生效。
    expect(catalogEntries(Date.UTC(2027, 0, 1)).find(item => item.key === 'qwen-max')?.price.input).toBe(6)
  })

  it('carries batch and explicit-cache rows as display-only reference prices', () => {
    const rows = entry.extraRows ?? []
    // 四个附加维度齐全；Batch File 长期半价档：输入 6 / 输出 18（= 折后标准价）。
    expect(rows.map(row => row.label)).toEqual(['显式缓存创建', '显式缓存命中', 'Batch File', 'Batch Chat'])
    expect(rows.find(row => row.label === 'Batch File')).toMatchObject({ input: 6, output: 18 })
    expect(rows.find(row => row.label === 'Batch Chat')).toMatchObject({ input: 12, output: 36 })
    // 促销管线不折算附加参考价。
    const folded = catalogEntries(Date.now()).find(item => item.key === 'qwen-max')
    expect(folded?.extraRows?.find(row => row.label === 'Batch File')?.input).toBe(6)
  })
})

describe('resolveCatalogKey derived variants (Tencent TokenHub gateway ids)', () => {
  it('resolves date-stamped snapshot ids via trailing-digit stripping', () => {
    // TokenHub / 官方按日期滚动的快照 id：-202605 / -0731 一律落到目录键。
    expect(resolveCatalogKey('deepseek-v4-flash-202605')).toBe('flash')
    expect(resolveCatalogKey('deepseek-v4-pro-202606')).toBe('pro')
    expect(resolveCatalogKey('deepseek-v4-flash-0731')).toBe('flash')
  })

  it('resolves org-prefixed ids (openrouter style) after stripping the prefix', () => {
    expect(resolveCatalogKey('deepseek/deepseek-v4-flash')).toBe('flash')
    expect(resolveCatalogKey('deepseek/deepseek-v4-flash-vision-exp')).toBe('flash-vision-exp')
  })

  it('resolves TokenHub short ids via aliases', () => {
    expect(resolveCatalogKey('hy3')).toBe('hunyuan')
  })

  it('keeps genuine catalog keys with digit tails intact', () => {
    // 目录键本身以数字段结尾（版本号）：直接查命中，永不进入派生分支。
    expect(resolveCatalogKey('mistral-large-2512')).toBe('mistral-large-2512')
    expect(resolveCatalogKey('command-a-03-2025')).toBe('command-a-03-2025')
  })

  it('keeps unknown models unresolved (never silently priced as another model)', () => {
    expect(resolveCatalogKey('totally-new-model-x')).toBe('totally-new-model-x')
  })
})

describe('applyUserModelAliases (config seam)', () => {
  afterEach(() => {
    applyUserModelAliases(undefined)
  })

  it('lets user aliases bind uncatalogued ids to catalog keys', () => {
    applyUserModelAliases({ 'hy4-preview': 'hunyuan' })
    expect(resolveCatalogKey('hy4-preview')).toBe('hunyuan')
    // 清除后回退原样（未收录）。
    applyUserModelAliases(undefined)
    expect(resolveCatalogKey('hy4-preview')).toBe('hy4-preview')
  })
})
