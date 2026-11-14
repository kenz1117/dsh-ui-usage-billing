/**
 * issue #123 回归：两条计费缺陷。
 *
 * 1. 上下文压缩摘要（`compaction/summary`）此前整段被聚合层跳过——压缩是一次
 *    真实的模型调用（厂商照常计费），漏计导致调用数/token/费用全部偏低
 *    （报告者实测 222 次压缩调用 ≈ $25.33）。
 * 2. 缓存写入（`cacheWriteTokens`）此前并入 cacheMiss 按普通输入价估算；厂商
 *    对「写入缓存」单独计价时（OpenAI/Anthropic 恒为输入价 125%）须按其单价计。
 *
 * 附带目录守卫：缓存写入单价只从有据的来源派生（厂商加价系数 / 条目内官方
 * 「显式缓存创建」价），不得凭空出现。
 */
import { describe, expect, it } from 'vitest'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { TokenUsage } from '@deepseek-ai/dsh-llm'
import { applyBuiltinCatalog, computeCost, modelOf, USD_TO_CNY } from '../src/client/pricing.ts'
import { BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES } from '../src/builtin-catalog.ts'
import { foldSession } from '../src/aggregate.ts'

// 测试套件承担宿主注入角色：目录与别名表在模块加载时全量注入。
applyBuiltinCatalog(BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES)

const MILLION = 1_000_000

/** Fold-session event row helper（durable 形状强转，与聚合层一致）。 */
const ev = (type: string, seq: number, time: number, data: Record<string, unknown>): SessionEvent =>
  ({ type, seq, time, data }) as unknown as SessionEvent

/** 压缩摘要事件：宿主落盘的 `compaction/summary`（自带 provider/model/usage）。 */
const compaction = (seq: number, time: number, usage: TokenUsage, model = 'gpt-6.1-sol'): SessionEvent =>
  ev('compaction/summary', seq, time, { provider: 'openai', model, usage })

/** 直连路由视图（provider 已注册 → 归位 direct，费用照计）。 */
const ROUTES = { openai: {} }

describe('issue #123：上下文压缩调用计入统计', () => {
  it('counts a compaction summary as a model call with tokens and cost', () => {
    // 报告者的最小用量：压缩调用写入缓存 100 万 token、无普通输入。
    const usage: TokenUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: MILLION }
    const fold = foldSession([compaction(0, 1_000, usage)], new Set(), undefined, ROUTES, 0)

    expect(fold.total.calls).toBe(1)
    expect(fold.total.output).toBe(0)
    expect(fold.total.cacheMiss).toBe(MILLION)
    expect(fold.total.cacheWrite).toBe(MILLION)
    // 费用按「缓存写入」单价（$2.50/百万）计，而不是普通输入价（$2）。
    const expectedUsd = 2.5
    expect(fold.total.cost).toBeCloseTo(expectedUsd * USD_TO_CNY, 10)

    // 各维度同步计入：模型 / 日期 / 通道 / 模型×日 / 模型×日×通道。
    expect(fold.byModel.get('gpt-6.1-sol')?.calls).toBe(1)
    expect(fold.byModel.get('gpt-6.1-sol')?.cacheWrite).toBe(MILLION)
    const day = Object.keys(Object.fromEntries(fold.byDay))[0]
    expect(day).toBeDefined()
    expect(fold.byDay.get(day!)?.calls).toBe(1)
    expect(fold.bySite.get('direct:openai')?.calls).toBe(1)
    expect(fold.byDayModels.get(day!)?.get('gpt-6.1-sol')?.calls).toBe(1)
    expect(fold.byDayModelsSite.get(day!)?.get('gpt-6.1-sol')?.get('direct:openai')?.calls).toBe(1)
  })

  it('prices a compaction summary with mixed buckets per the catalog rates', () => {
    // 输入 1000 + 缓存写入 500 + 输出 200（gpt-6.1-sol：$2 / $2.5 / $10 每百万）。
    const usage: TokenUsage = { inputTokens: 1_000, outputTokens: 200, cacheReadTokens: 0, cacheWriteTokens: 500 }
    const fold = foldSession([compaction(0, 1_000, usage)], new Set(), undefined, ROUTES, 0)
    const expectedUsd = (1_000 * 2 + 500 * 2.5 + 200 * 10) / MILLION
    expect(fold.total.cost).toBeCloseTo(expectedUsd * USD_TO_CNY, 10)
    expect(fold.total.input).toBe(1_500)
    expect(fold.total.output).toBe(200)
  })

  it('keeps role attribution consistent with the total (byRole sums to total cost)', () => {
    const usage: TokenUsage = { inputTokens: 1_000, outputTokens: 200, cacheReadTokens: 0, cacheWriteTokens: 500 }
    const fold = foldSession([compaction(0, 1_000, usage)], new Set(), undefined, ROUTES, 0)
    const roleSum = fold.roles.outputCost + fold.roles.inputCost
    expect(roleSum).toBeCloseTo(fold.total.cost, 10)
  })

  it('skips compaction events inherited from a forked parent (no double billing)', () => {
    // 分支继承：父会话拷贝来的事件（seq < seedLength）已在父会话计费一次。
    const usage: TokenUsage = { inputTokens: 1_000, outputTokens: 200, cacheReadTokens: 0, cacheWriteTokens: 500 }
    const fold = foldSession([
      compaction(0, 1_000, usage), // 种子（seq < 4）：不计费。
      ev('session/end-seed', 4, 1_002, {}),
      compaction(5, 2_000, usage), // 本会话 own 事件：计费。
    ], new Set(), undefined, ROUTES, 0, 4)
    expect(fold.total.calls).toBe(1)
    const expectedUsd = (1_000 * 2 + 500 * 2.5 + 200 * 10) / MILLION
    expect(fold.total.cost).toBeCloseTo(expectedUsd * USD_TO_CNY, 10)
  })

  it('ignores a compaction event without usage or without attribution fields', () => {
    const fold = foldSession([
      ev('compaction/summary', 0, 1_000, { provider: 'openai', model: 'gpt-6.1-sol' }),
      ev('compaction/summary', 1, 1_001, { usage: { inputTokens: 10, outputTokens: 1 } }),
    ], new Set(), undefined, ROUTES, 0)
    expect(fold.total.calls).toBe(0)
    expect(fold.total.cost).toBe(0)
  })
})

describe('issue #123：缓存写入独立计价', () => {
  it('prices cache writes at the vendor rate instead of the plain input rate', () => {
    // 报告者的对照：100 万缓存写入 token 官方 $2.50，旧口径按输入价估成 $2。
    const entry = modelOf('gpt-6.1-sol')
    expect(entry.price.cacheWrite).toBe(2.5)
    const cost = computeCost(entry, { input: 0, cacheHit: 0, cacheMiss: MILLION, cacheWrite: MILLION, output: 0 }, 1)
    expect(cost).toBeCloseTo(2.5 * USD_TO_CNY, 10)
  })

  it('splits ordinary miss and cache write out of the same miss bucket', () => {
    const entry = modelOf('gpt-6.1-sol')
    // 50 万普通输入 + 50 万缓存写入：$1 + $1.25。
    const cost = computeCost(entry, { input: MILLION, cacheHit: 0, cacheMiss: MILLION, cacheWrite: 500_000, output: 0 }, 1)
    expect(cost).toBeCloseTo((0.5 * 2 + 0.5 * 2.5) * USD_TO_CNY, 10)
  })

  it('falls back to the input rate for vendors without a cache-write rate', () => {
    // DeepSeek 不单列缓存写入费：缓存写入按输入价计（与旧口径逐字一致）。
    const entry = modelOf('flash')
    expect(entry.price.cacheWrite).toBeUndefined()
    const cost = computeCost(entry, { input: MILLION, cacheHit: 0, cacheMiss: MILLION, cacheWrite: MILLION, output: 0 }, 1)
    expect(cost).toBeCloseTo(computeCost(entry, { input: MILLION, cacheHit: 0, cacheMiss: MILLION, output: 0 }, 1), 10)
  })
})

describe('issue #123：目录守卫（缓存写入单价只从有据来源派生）', () => {
  it('derives the OpenAI/Anthropic cache-write rate as 125% of the input price', () => {
    for (const entry of BUILTIN_MODEL_CATALOG) {
      if (entry.provider !== 'OpenAI' && entry.provider !== 'Anthropic') continue
      if (!(entry.price.input > 0)) continue
      expect(entry.price.cacheWrite).toBeCloseTo(entry.price.input * 1.25, 6)
    }
  })

  it('prefers the official explicit cache-creation price recorded in the entry', () => {
    // 百炼各档比例不恒定：条目内官方「显式缓存创建」价优先于厂商系数。
    const qwen = modelOf('qwen-3.8-flash')
    const official = qwen.extraRows?.find(row => row.label === '显式缓存创建')?.input
    expect(official).toBe(1.25)
    expect(qwen.price.cacheWrite).toBe(official)
    // 厂商系数会给出 0.8 × 1.25 = 1.0——官方值优先，不按系数取值。
    expect(qwen.price.cacheWrite).not.toBeCloseTo(1, 6)
  })

  it('never produces a non-positive cache-write price', () => {
    for (const entry of BUILTIN_MODEL_CATALOG) {
      if (entry.price.cacheWrite === undefined) continue
      expect(entry.price.cacheWrite).toBeGreaterThan(0)
    }
  })
})
