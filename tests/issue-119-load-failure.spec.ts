/**
 * issue #119：统计数据一直为 0。
 *
 * 报告者（宿主 0.2.1-rc.2、插件 1.8.3、Debian）装好插件后侧栏速览与仪表盘
 * 恒为 ¥0 / 0 token，其他统计插件正常。宿主侧逐项比对结论：0.2.1-rc.2 与
 * 0.2.2-rc.1 的依赖面（assistant/message.usage、TokenUsage、SessionPersistence
 * API、会话格式 v4、目录编码）完全一致，插件在 0.2.1-rc.2 上实测能正确统计。
 *
 * 真正的两个「静默归零」入口：
 * 1. 会话列表整体读不到（目录里有读不了/对不上的日志、宿主后端故障）→
 *    降级到持久账本；账本也空时路由回退磁盘快照。此前降级一路静默，新装用户
 *    看到的就是一片 0，分不清「没花钱」与「没读到」。
 * 2. 取数请求本身失败（回环守卫 403 / 端点 404 / 超时）→ 客户端把失败吞成
 *    空统计，同样渲染成一片 0。
 *
 * 本组回归锁住「失败必须看得见」：原因随文档/响应下发，客户端据此显示错误态。
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createUsageAggregator, emptyUsage, SessionListUnavailableError,
  type UsageLedgerDocument, type UsageLedgerSession, type UsagePersistence,
} from '../src/aggregate.ts'
import { applyBuiltinCatalog } from '../src/client/pricing.ts'
import { BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES } from '../src/builtin-catalog.ts'
import { loadUsageStats } from '../src/client/api/usage-stats.ts'

// 目录与别名表在模块加载时全量注入（宿主 activate 同一入口），否则计价读到空目录。
applyBuiltinCatalog(BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES)

/** 持久化替身：会话列表整体抛错（模拟宿主后端不可读 / 日志目录里有坏文件）。 */
function brokenListPersistence(reason: string): UsagePersistence {
  return {
    list: async () => { throw new Error(reason) },
    readFrom: async () => ({ meta: { id: 's1' as never }, inheritedEventCount: 0, events: [] }),
  } as unknown as UsagePersistence
}

/** 账本行的最小 JSON-safe fold：total.calls > 0 保证进 bySession。 */
function ledgerRow(): UsageLedgerSession {
  const total = emptyUsage()
  total.calls = 2
  total.output = 100
  return {
    id: 'session-legacy',
    stamp: 'stamp-1',
    foldVersion: 1,
    fingerprint: 'legacy',
    fold: {
      total,
      byModel: {}, byDay: {}, byDayModels: {}, bySite: {},
      unpricedModels: [], planCalls: {},
      turns: [], perfDigest: {}, perfHourDigest: {},
      roles: { userChars: 0, toolChars: 0, inputCost: 0, outputCost: 0 },
      lastActive: 1_000,
    },
  }
}

/** 内存账本替身：load 返回预置文档，save 空实现。 */
function ledgerStore(sessions: UsageLedgerSession[]) {
  const document: UsageLedgerDocument = { version: 1, updatedAt: 1, sessions }
  return { load: async () => document, save: async () => {} }
}

describe('会话列表读不到时的降级（issue #119）', () => {
  it('账本有存档：聚合照常完成，原因写进文档（数字仍来自账本）', async () => {
    const aggregator = createUsageAggregator(
      brokenListPersistence('corrupt session log: header id "s1" and cwd identify "…"'),
      { ledger: ledgerStore([ledgerRow()]) },
    )
    const doc = await aggregator.aggregate()
    // 原因随文档下发——客户端据此显示「读取失败」，不再是一无所有的 0。
    expect(doc.sessionListError).toContain('corrupt session log')
    // 数字来自持久账本（不是空的）。
    expect(doc.total.calls).toBe(2)
  })

  it('账本为空：聚合抛出带原因的错误（路由据此回退快照并附原因）', async () => {
    const aggregator = createUsageAggregator(
      brokenListPersistence('corrupt session log: header id "s1" and cwd identify "…"'),
      { ledger: ledgerStore([]) },
    )
    await expect(aggregator.aggregate()).rejects.toBeInstanceOf(SessionListUnavailableError)
    const error = await aggregator.aggregate().catch((e: unknown) => e)
    expect((error as SessionListUnavailableError).reason).toContain('corrupt session log')
  })

  it('没有账本可用时同样带原因抛错（不静默归零）', async () => {
    const aggregator = createUsageAggregator(brokenListPersistence('persistence backend unreadable'))
    await expect(aggregator.aggregate()).rejects.toBeInstanceOf(SessionListUnavailableError)
  })
})

describe('客户端取数失败不再吞成空统计（issue #119）', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('回环守卫 403：把服务端的诊断文案带出来', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ error: 'forbidden: loopback only (host "mybox.local:3080" not in trustedHosts)' }),
      { status: 403, headers: { 'content-type': 'application/json' } },
    )))
    const result = await loadUsageStats()
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(403)
    // 提示语正是用户自查需要的（怎么改配置）。
    expect(result.reason).toContain('not in trustedHosts')
  })

  it('聚合不可用 + 会话列表原因：优先展示具体原因', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ error: 'usage stats unavailable', sessionListError: 'corrupt session log: header id mismatch' }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )))
    const result = await loadUsageStats()
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('corrupt session log: header id mismatch')
  })

  it('文档自带会话列表失败：取数成功但错误态可见', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({
        total: { calls: 0, input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cost: 0, reasoning: 0 },
        byModel: {}, byDay: {}, byDayModels: {},
        sessionListError: 'corrupt session log: header id mismatch',
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )))
    const result = await loadUsageStats()
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.stats.sessionListError).toBe('corrupt session log: header id mismatch')
  })

  it('网络异常：带原因失败（不再返回 null）', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down') }))
    const result = await loadUsageStats()
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toContain('network down')
  })
})
