/**
 * issue #127 回归：日志已删的存量账本行未重折。
 *
 * 报告者实测（1.8.3-alpha.10 / 宿主 0.2.2-rc.2）：冒号归一生效后，账单里
 * `cn:deepseek-v4.1-flash` 与 `flash` 仍分成两行同名 DeepSeek V4.1 Flash，
 * 前者恒记 0 费（概览继续弹「未收录计价」）。根因在账本兜底分支：反序列化的
 * 行原样入档，既不按 `resolveCatalogKey` 归并模型键，也不按目录价补算——
 * 而这两件事都不需要原始日志（token 数账本里就有）。
 *
 * 本文件锁定三件事：
 * 1. 兜底行的模型键归一后不再分裂成两行同名模型；
 * 2. 落盘时未收录、现已收录的模型按目录价补算（费用进总额，不再是 0）；
 * 3. 仍未收录的模型照旧留在「未收录」提示里（不误标已收录）。
 */
import { describe, expect, it } from 'vitest'
import { applyBuiltinCatalog, computeCost, modelOf, resolveCatalogKey } from '../src/client/pricing.ts'
import { BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES } from '../src/builtin-catalog.ts'
import {
  configFingerprint, createUsageAggregator, emptyUsage, FOLD_VERSION,
  DEFAULT_SEARCH_CALL_ESTIMATE_CNY, DEFAULT_SUBSCRIPTION_PROVIDERS,
  type ModelUsage, type UsageLedgerSession, type UsagePersistence,
} from '../src/aggregate.ts'

// 测试套件承担宿主注入角色：目录与别名表在模块加载时全量注入。
applyBuiltinCatalog(BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES)

/** 中转通道桶（报告者的中转站 origin）。 */
const SITE = 'site:https://relay.example.com'
/** 用量日（flash 调价分界 2026-09-10 之后，按现行价回算）。 */
const DAY = '2026-11-10'

/** 账本行里的一个 token 桶。 */
function cell(overrides: Partial<ModelUsage>): ModelUsage {
  return { ...emptyUsage(), ...overrides }
}

/** 两个桶相加（构造合计行用）。 */
function sumCell(a: ModelUsage, b: ModelUsage): ModelUsage {
  return {
    calls: a.calls + b.calls,
    input: a.input + b.input,
    output: a.output + b.output,
    cacheHit: a.cacheHit + b.cacheHit,
    cacheMiss: a.cacheMiss + b.cacheMiss,
    cost: a.cost + b.cost,
    reasoning: a.reasoning + b.reasoning,
    officialCalls: a.officialCalls + b.officialCalls,
    officialCost: a.officialCost + b.officialCost,
  }
}

/**
 * 一条「日志已删」的账本行：`flash`（落盘时已计价）与
 * `cn:deepseek-v4.1-flash`（落盘时未收录 → 恒 0 费）同处一行。
 */
function ledgerRow(id: string, opts: { foldVersion?: number; fingerprint?: string } = {}): UsageLedgerSession {
  const priced = cell({
    calls: 3_359, input: 1_430_000_000, output: 2_700_000,
    cacheHit: 1_393_250_000, cacheMiss: 36_750_000, cost: 99.5,
  })
  const unpriced = cell({
    calls: 1_536, input: 271_289_686, output: 1_400_000,
    cacheHit: 260_700_000, cacheMiss: 10_589_686, cost: 0,
  })
  const total = sumCell(priced, unpriced)
  return {
    id,
    stamp: 'stale-stamp',
    foldVersion: opts.foldVersion ?? 1,
    fingerprint: opts.fingerprint,
    fold: {
      total,
      byModel: { flash: priced, 'cn:deepseek-v4.1-flash': unpriced },
      byDay: { [DAY]: total },
      byDayModels: { [DAY]: { flash: priced, 'cn:deepseek-v4.1-flash': unpriced } },
      byDayModelsSite: {
        [DAY]: {
          flash: { [SITE]: priced },
          'cn:deepseek-v4.1-flash': { [SITE]: unpriced },
        },
      },
      bySite: { [SITE]: total },
      byTier: { peak: cell({ calls: 2_000, cost: 40 }), offPeak: cell({ calls: 2_895, cost: 59.5 }) },
      unpricedModels: ['cn:deepseek-v4.1-flash'],
      planCalls: {},
      turns: [],
      perfDigest: {},
      perfHourDigest: {},
      roles: { userChars: 100, toolChars: 100, inputCost: 99.5, outputCost: 0 },
      lastActive: 1_763_256_000_000,
    },
  }
}

/** 内存账本存储：load 返回预置行。 */
function ledgerStore(sessions: UsageLedgerSession[]) {
  let document = { version: 1 as const, updatedAt: 1, sessions, appliedMigrations: [] }
  return {
    store: {
      load: async () => document,
      save: async (next: typeof document) => { document = next },
    },
  }
}

/** 空会话库：日志全删，只剩账本行。 */
function emptyPersistence(): UsagePersistence {
  return {
    list: async () => [],
    readFrom: async () => ({ meta: { id: 'x' }, inheritedEventCount: 0, events: [] }),
  } as unknown as UsagePersistence
}

describe('issue #127：兜底账本行的键归一与补价', () => {
  it('merges the unnormalized model key into the catalog key (no duplicate rows)', async () => {
    // 前置：冒号归一在目录侧确实生效——问题出在兜底行没走归一。
    expect(resolveCatalogKey('cn:deepseek-v4.1-flash')).toBe('flash')
    expect(modelOf('cn:deepseek-v4.1-flash').name).toBe(modelOf('flash').name)

    const { store } = ledgerStore([ledgerRow('archived-1')])
    const aggregator = createUsageAggregator(emptyPersistence(), { ledger: store })
    const doc = await aggregator.aggregate()

    // 两行同名模型合成一行。
    expect(doc.byModel['cn:deepseek-v4.1-flash']).toBeUndefined()
    const flash = doc.byModel.flash
    expect(flash).toBeDefined()
    expect(flash?.calls).toBe(4_895)
    expect(flash?.input).toBe(1_701_289_686)
  })

  it('reprices the previously unpriced bucket at the catalog price', async () => {
    const { store } = ledgerStore([ledgerRow('archived-1')])
    const aggregator = createUsageAggregator(emptyPersistence(), { ledger: store })
    const doc = await aggregator.aggregate()

    // 补价口径：按目录价的峰/谷混合（与客户端「目录价预估」同口径）。
    const expected = computeCost(modelOf('flash'), {
      input: 271_289_686,
      cacheHit: 260_700_000,
      cacheMiss: 10_589_686,
      cacheWrite: 0,
      output: 1_400_000,
    })
    expect(expected).toBeGreaterThan(0)
    // 落盘时已计价的 99.5 原样保留，补价只加未收录那部分。
    expect(doc.byModel.flash?.cost).toBeCloseTo(99.5 + expected, 8)
    // 总额随之补齐（此前这笔钱整段缺失）。
    expect(doc.total.cost).toBeCloseTo(99.5 + expected, 8)
    // 通道桶同步补价。
    expect(doc.bySite?.[SITE]?.cost).toBeCloseTo(99.5 + expected, 8)
    // 角色归因合计仍等于总费用（输入/输出两侧随补价同步）。
    const roleSum = (doc.byRole?.user ?? 0) + (doc.byRole?.assistant ?? 0) + (doc.byRole?.tool ?? 0)
    expect(roleSum).toBeCloseTo(doc.total.cost, 8)
  })

  it('drops the model from the unpriced notice once it is priced', async () => {
    const { store } = ledgerStore([ledgerRow('archived-1')])
    const aggregator = createUsageAggregator(emptyPersistence(), { ledger: store })
    const doc = await aggregator.aggregate()

    expect(doc.unpricedModels ?? []).not.toContain('cn:deepseek-v4.1-flash')
  })

  it('keeps a still-unpriced model in the notice and leaves its cost at zero', async () => {
    const row = ledgerRow('archived-1')
    // 加一个至今仍无价的模型：不得被误判成已收录。
    const orphan = cell({ calls: 10, input: 1_000, output: 100, cacheHit: 900, cacheMiss: 100 })
    row.fold.byModel['hy4free'] = orphan
    row.fold.byDayModels[DAY]!['hy4free'] = orphan
    row.fold.byDayModelsSite[DAY]!['hy4free'] = { [SITE]: orphan }
    row.fold.unpricedModels.push('hy4free')

    const { store } = ledgerStore([row])
    const aggregator = createUsageAggregator(emptyPersistence(), { ledger: store })
    const doc = await aggregator.aggregate()

    expect(doc.unpricedModels ?? []).toContain('hy4free')
    expect(doc.byModel.hy4free?.cost).toBe(0)
    expect(doc.byModel.hy4free?.calls).toBe(10)
  })

  it('reconciles a current-version row too (log deleted after the alias landed)', async () => {
    // 报告者实测的 v24 行：foldVersion 与指纹都是当前值，但键仍是落盘时的原始 id。
    const fingerprint = configFingerprint(
      new Set(DEFAULT_SUBSCRIPTION_PROVIDERS), undefined, {}, DEFAULT_SEARCH_CALL_ESTIMATE_CNY, {}, new Set(),
    )
    const { store } = ledgerStore([ledgerRow('archived-1', { foldVersion: FOLD_VERSION, fingerprint })])
    const aggregator = createUsageAggregator(emptyPersistence(), { ledger: store })
    const doc = await aggregator.aggregate()

    expect(doc.byModel['cn:deepseek-v4.1-flash']).toBeUndefined()
    expect(doc.byModel.flash?.calls).toBe(4_895)
    expect(doc.byModel.flash?.cost).toBeGreaterThan(99.5)
    expect(doc.unpricedModels ?? []).not.toContain('cn:deepseek-v4.1-flash')
  })

  it('leaves a normal ledger row untouched (no key churn, no cost change)', async () => {
    const fingerprint = configFingerprint(
      new Set(DEFAULT_SUBSCRIPTION_PROVIDERS), undefined, {}, DEFAULT_SEARCH_CALL_ESTIMATE_CNY, {}, new Set(),
    )
    const row = ledgerRow('archived-1', { foldVersion: FOLD_VERSION, fingerprint })
    // 只有一个已归一且已计价的模型：归一与补价都不该发生。
    delete row.fold.byModel['cn:deepseek-v4.1-flash']
    delete row.fold.byDayModels[DAY]!['cn:deepseek-v4.1-flash']
    delete row.fold.byDayModelsSite[DAY]!['cn:deepseek-v4.1-flash']
    row.fold.unpricedModels = []

    const { store } = ledgerStore([row])
    const aggregator = createUsageAggregator(emptyPersistence(), { ledger: store })
    const doc = await aggregator.aggregate()

    expect(Object.keys(doc.byModel)).toEqual(['flash'])
    expect(doc.byModel.flash?.cost).toBeCloseTo(99.5, 8)
  })

  it('splits the repriced cost into official / third-party by the site bucket', async () => {
    const row = ledgerRow('archived-1')
    // 未收录那部分走官方直连（direct:deepseek）：补价后应计入官方费用。
    const official = cell({
      calls: 1_536, input: 271_289_686, output: 1_400_000,
      cacheHit: 260_700_000, cacheMiss: 10_589_686, cost: 0,
    })
    row.fold.byDayModelsSite[DAY]!['cn:deepseek-v4.1-flash'] = { 'direct:deepseek': official }
    row.fold.bySite['direct:deepseek'] = official

    const { store } = ledgerStore([row])
    const aggregator = createUsageAggregator(emptyPersistence(), { ledger: store })
    const doc = await aggregator.aggregate()

    const expected = computeCost(modelOf('flash'), {
      input: 271_289_686,
      cacheHit: 260_700_000,
      cacheMiss: 10_589_686,
      cacheWrite: 0,
      output: 1_400_000,
    })
    // 官方直连：补价全额计入官方费用（第三方为 0）。
    expect(doc.byModel.flash?.officialCost).toBeCloseTo(expected, 8)
    expect(doc.byModel.flash?.cost - (doc.byModel.flash?.officialCost ?? 0)).toBeCloseTo(99.5, 8)
    expect(doc.bySite?.['direct:deepseek']?.officialCost).toBeCloseTo(expected, 8)
  })

  it('reprices a turn row that was folded without a price', async () => {
    const row = ledgerRow('archived-1')
    // 落盘时整轮未计价：每轮行带真实时刻，按该时刻精确判档补价。
    row.fold.turns = [{
      turn: 1,
      model: 'cn:deepseek-v4.1-flash',
      input: 271_289_686,
      output: 1_400_000,
      cacheHit: 260_700_000,
      cacheMiss: 10_589_686,
      cost: 0,
      startedAt: Date.parse('2026-11-10T02:00:00Z'),
    }]

    const { store } = ledgerStore([row])
    const aggregator = createUsageAggregator(emptyPersistence(), { ledger: store })
    const doc = await aggregator.aggregate()

    const turn = doc.byTurn?.find(row => row.turn === 1)
    expect(turn?.model).toBe('flash')
    expect(turn?.cost).toBeGreaterThan(0)
  })
})
