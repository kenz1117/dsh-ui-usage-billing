/**
 * Live-pricing upstream unit tests: models.dev extra-model builder keeps only
 * mainstream providers, skips catalog-covered keys, drops unpriced rows, and
 * defaults the cache band to 10% of input when the source omits it.
 */

import { describe, expect, it } from 'vitest'
import { buildExtraModels } from '../src/pricing-fetch.ts'

describe('buildExtraModels', () => {
  const DATA = {
    deepseek: {
      models: {
        'deepseek-v4.5-flash': { name: 'DeepSeek V4.5 Flash', cost: { input: 1.2, output: 6, cache_read: 0.1 } },
        // 已在内置目录/别名表覆盖 → 跳过。
        'deepseek-v4-flash': { name: 'V4 Flash', cost: { input: 3, output: 9 } },
        // 免费 / 未公布价格 → 跳过。
        'deepseek-free': { name: 'Free', cost: { input: 0, output: 0 } },
      },
    },
    // 未映射厂商 → 整组跳过。
    'random-vendor': { models: { 'v1': { name: 'V1', cost: { input: 1, output: 2 } } } },
  }

  it('keeps every priced, non-catalog model regardless of provider whitelist', () => {
    const extras = buildExtraModels(DATA)
    // random-vendor 虽非主流厂商，但有价模型也会纳入（不再按白名单过滤）。
    // deepseek-v4-flash 经别名归一到 flash，命中内置目录 → 跳过。
    expect(extras).toHaveLength(2)
    expect(extras.map(e => e.key)).toContain('v1')
    expect(extras.find(e => e.key === 'deepseek-v4.5-flash')).toMatchObject({ provider: 'DeepSeek', name: 'DeepSeek V4.5 Flash' })
  })

  it('defaults the cache band to 10% of input when the source omits it', () => {
    const extras = buildExtraModels({
      deepseek: { models: { 'x': { name: 'X', cost: { input: 2, output: 10 } } } },
    })
    expect(extras[0]?.price.cacheHit).toBeCloseTo(0.2, 10)
  })

  it('returns an empty list for non-object or null input', () => {
    expect(buildExtraModels(null)).toEqual([])
    expect(buildExtraModels('nope')).toEqual([])
  })
})
