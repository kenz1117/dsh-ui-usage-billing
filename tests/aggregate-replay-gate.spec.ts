/**
 * 启动冷phase与拒读负缓存（issue #105）：
 *
 * - 冷phase（deferFoldMs）：聚合器创建后的闸门窗口内，aggregate() 只出账本轻
 *   文档——不 list、不读任何会话日志，doc 带 `staleSnapshot: true` 且不进 TTL
 *   缓存；窗口过后首个请求走完整折叠。UI 一加载的轮询由此不再把全量折叠拉进
 *   启动关键路径。
 * - 拒读负缓存落盘（ledger.refused）：读失败会话的失败 stamp 随账本持久化，
 *   重启后不再重读——宿主要解压解析到拒绝点才抛错，老用户上百条拒读会话是
 *   每次启动的固定大头。
 */

import { describe, expect, it, vi } from 'vitest'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TokenUsage } from '@deepseek-ai/dsh-llm'
import {
  createUsageAggregator, emptyUsage,
  type UsageLedgerDocument, type UsageLedgerSession, type UsagePersistence,
} from '../src/aggregate.ts'
import { applyBuiltinCatalog } from '../src/client/pricing.ts'
import { BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES } from '../src/builtin-catalog.ts'

// 测试套件承担宿主注入角色：目录与别名表在模块加载时全量注入（与 aggregate.spec 同口径）。
applyBuiltinCatalog(BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES)

function header(seq: number, model = 'deepseek-v4-flash'): SessionEvent {
  return {
    type: 'request/header', seq, time: 1_000,
    data: { header: { config: { provider: 'deepseek-official', model, reasoningEffort: 'high', maxTokens: 256_000 }, version: 1, id: 's', createdAt: 0, cwd: '/tmp', agentPreset: 'standard' }, reason: 'initial' },
  } as unknown as SessionEvent
}

function message(seq: number, usage: TokenUsage): SessionEvent {
  return {
    type: 'assistant/message', seq, time: 1_000,
    data: { turn: 1, step: 1, message: { role: 'assistant', content: [] }, usage },
  } as unknown as SessionEvent
}

const USAGE: TokenUsage = { inputTokens: 100, outputTokens: 50, cacheReadTokens: 800, cacheWriteTokens: 20 }

/** 带读取计数与每会话 stamp 的持久化替身；`refuse` 集合里的会话按格式拒读抛错。 */
function countingPersistence(logs: Record<string, SessionEvent[]>, stamps: Record<string, string> = {}, refuse: ReadonlySet<string> = new Set()): UsagePersistence {
  const reads: string[] = []
  const listed = vi.fn(async () => Object.keys(logs).map(id => ({ id })))
  return {
    reads,
    listed,
    list: listed,
    stampOf: async (id: SessionId) => stamps[String(id)] ?? null,
    readFrom: async (id: SessionId) => {
      const key = String(id)
      if (refuse.has(key)) {
        const error = new Error(`refused: @deepseek-ai/dsh-session-format-v0-to-v1 SessionFormatUnsupportedError`)
        error.name = 'SessionFormatUnsupportedError'
        throw error
      }
      reads.push(key)
      return { meta: { id }, inheritedEventCount: 0, events: logs[key] ?? [] }
    },
  } as unknown as UsagePersistence & { reads: string[]; listed: ReturnType<typeof vi.fn> }
}

/** 账本行的最小 JSON-safe fold：total.calls > 0 保证进 bySession。 */
function ledgerRow(id: string, calls: number): UsageLedgerSession {
  const total = emptyUsage()
  total.calls = calls
  total.output = 100
  return { id, foldVersion: 23, fingerprint: 'fp', foldedAt: 1, fold: { total, byModel: {}, byDay: {}, byDayModels: {}, bySite: {}, unpricedModels: [], planCalls: {}, turns: [], perfDigest: {}, perfHourDigest: {}, roles: { userChars: 0, toolChars: 0, inputCost: 0, outputCost: 0 }, lastActive: 1_000 } }
}

/** 内存版账本仓：load 返回当前文档，save 记录每次落盘。 */
function fakeLedgerStore(initial: UsageLedgerDocument) {
  const saved: UsageLedgerDocument[] = []
  let document = initial
  return {
    store: { load: async () => document, save: async (next: UsageLedgerDocument) => { saved.push(next); document = next } },
    saved,
    current: (): UsageLedgerDocument => document,
  }
}

describe('冷phase：deferFoldMs 闸门（issue #105）', () => {
  it('serves a ledger-only light document inside the window without listing or reading logs', async () => {
    const persistence = countingPersistence({})
    const ledger = fakeLedgerStore({ version: 1, updatedAt: 1, sessions: [ledgerRow('archived-1', 2), ledgerRow('archived-2', 5)] })
    const aggregator = createUsageAggregator(persistence, { ledger: ledger.store, deferFoldMs: 60_000 })
    const doc = await aggregator.aggregate()
    // 轻文档：账本行齐、带 staleSnapshot 标记，宿主持久层一次都没被碰。
    expect(doc.staleSnapshot).toBe(true)
    expect(doc.total.calls).toBe(7)
    expect(doc.bySession?.map(row => row.id).sort()).toEqual(['archived-1', 'archived-2'])
    expect(persistence.listed).not.toHaveBeenCalled()
    expect(persistence.reads).toEqual([])
    // 轻文档不进 TTL 缓存：lastDocOf 只回完整折叠（余额对账基线不 吃轻文档）。
    expect(aggregator.lastDocOf()).toBeUndefined()
  })

  it('folds fully once the window elapses (staleSnapshot gone, logs read)', async () => {
    const events = [header(1), message(2, USAGE)]
    const persistence = countingPersistence({ 'live-1': events })
    const ledger = fakeLedgerStore({ version: 1, updatedAt: 1, sessions: [ledgerRow('archived-1', 2)] })
    const aggregator = createUsageAggregator(persistence, { ledger: ledger.store, deferFoldMs: 40 })
    const cold = await aggregator.aggregate()
    expect(cold.staleSnapshot).toBe(true)
    await new Promise(resolve => { setTimeout(resolve, 120) })
    const warm = await aggregator.aggregate()
    expect(warm.staleSnapshot).toBeUndefined()
    expect(persistence.reads).toContain('live-1')
    // 完整折叠的文档照常进缓存（lastDocOf 供余额对账基线用）。
    expect(aggregator.lastDocOf()).toBe(warm)
  })

  it('defaults to the legacy behavior when deferFoldMs is absent (fold on first request)', async () => {
    const persistence = countingPersistence({ 'live-1': [header(1), message(2, USAGE)] })
    const aggregator = createUsageAggregator(persistence, {})
    const doc = await aggregator.aggregate()
    expect(doc.staleSnapshot).toBeUndefined()
    expect(persistence.reads).toEqual(['live-1'])
  })
})

describe('拒读负缓存落盘（ledger.refused，issue #105）', () => {
  it('persists refused sessions and skips re-reading them after a reload', async () => {
    const logs = () => ({
      'ok-1': [header(1), message(2, USAGE)],
      'bad-1': [header(1)],
    })
    const stamps = { 'ok-1': '100:10', 'bad-1': '200:20' }
    const first = countingPersistence(logs(), stamps, new Set(['bad-1']))
    const ledger = fakeLedgerStore({ version: 1, updatedAt: 1, sessions: [] })
    const firstAggregator = createUsageAggregator(first, { ledger: ledger.store })
    const doc = await firstAggregator.aggregate()
    expect(doc.unreadableSessions).toBe(1)
    expect(doc.unreadableFormatSessions).toBe(1)
    // 负缓存已随账本落盘（stamp + format 位）。
    const savedRefused = ledger.current().refused
    expect(savedRefused).toEqual([{ id: 'bad-1', stamp: '200:20', format: true }])

    // 重启形态：新聚合器装同一份账本——bad-1 不再被读取（宿主不再解码到拒绝点），
    // 未统计计数照常携带（issue #84：计数不因负缓存命中归零）。ok-1 连读都不用读：
    // 账本快路径（stamp + foldVersion + 指纹全同）零读取复用——重启后没有任何
    // 会话日志被重新解码，这正是 #105 要的启动形态。
    const second = countingPersistence(logs(), stamps, new Set(['bad-1']))
    const secondAggregator = createUsageAggregator(second, { ledger: ledger.store })
    const doc2 = await secondAggregator.aggregate()
    expect(second.reads).toEqual([])
    expect(doc2.unreadableSessions).toBe(1)
    expect(doc2.unreadableFormatSessions).toBe(1)
    // ok-1 按账本行进 bySession；bad-1 无旧行 → 只差新增部分，不进 bySession。
    expect(doc2.bySession?.map(row => row.id)).toEqual(['ok-1'])
  })

  it('retries a refused session automatically once its stamp changes', async () => {
    const stamps = { 'bad-1': '200:20' }
    const ledger = fakeLedgerStore({
      version: 1, updatedAt: 1, sessions: [],
      refused: [{ id: 'bad-1', stamp: '200:20', format: true }],
    })
    // stamp 变化（日志被改写/追加）：负缓存失效，照常重试读取。
    const persistence = countingPersistence({ 'bad-1': [header(1), message(2, USAGE)] }, { 'bad-1': '300:30' })
    const aggregator = createUsageAggregator(persistence, { ledger: ledger.store })
    const doc = await aggregator.aggregate()
    expect(persistence.reads).toEqual(['bad-1'])
    expect(doc.unreadableSessions).toBeUndefined()
    expect(doc.bySession?.map(row => row.id)).toEqual(['bad-1'])
  })
})
