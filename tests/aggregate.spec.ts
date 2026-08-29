/**
 * Aggregation unit tests: log folding attributes each call to the
 * `message.source` of its own `assistant/message` (sparse `request/header` is
 * only a fallback), splits tokens into cache buckets, prices only
 * catalog models, and rolls totals up by model, by day, and by model × day
 * (the stacked trend chart's input).
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TokenUsage } from '@deepseek-ai/dsh-llm'
import {
  aggregateUsage, createUsageAggregator, dayStamp, foldSession, foldUsage, emptyUsage, workspaceNameOf, hostTimeZone,
  siteBucketKey, siteOriginOf, siteRefOf, runLedgerMigrations, FOLD_VERSION, foldSearchCall,
  type LedgerMigration, type UsageLedgerDocument, type UsageLedgerSession,
  AGGREGATE_TTL_MS, SESSION_ROW_LIMIT, type UsagePersistence,
} from '../src/aggregate.ts'

/** Minimal `request/header` event recording the active model and provider. */
function header(seq: number, model: string, provider = 'deepseek-official'): SessionEvent {
  return {
    type: 'request/header', seq, time: 1_000,
    data: { header: { config: { provider, model, reasoningEffort: 'high', maxTokens: 256_000 }, version: 1, id: 's', createdAt: 0, cwd: '/tmp', agentPreset: 'standard' }, reason: 'initial' },
  } as unknown as SessionEvent
}

/** Minimal `assistant/message` event carrying one provider usage report. */
function message(seq: number, time: number, usage: TokenUsage): SessionEvent {
  return {
    type: 'assistant/message', seq, time,
    data: { turn: 1, step: 1, message: { role: 'assistant', content: [] }, usage },
  } as unknown as SessionEvent
}

const USAGE: TokenUsage = { inputTokens: 100, outputTokens: 50, cacheReadTokens: 800, cacheWriteTokens: 20 }

/** In-memory persistence double over per-session event arrays. */
function fakePersistence(logs: Record<string, SessionEvent[]>): UsagePersistence {
  // SessionHeader 只用到 id：整体断言跳过真实 header 的其余必填字段。
  return {
    list: async () => Object.keys(logs).map(id => ({ id })),
    readFrom: async (id: SessionId, fromSeq: number) => ({
      meta: { id },
      events: (logs[id] ?? []).filter(event => event.seq >= fromSeq),
    }),
  } as unknown as UsagePersistence
}

/** 账本行的最小 JSON-safe fold：total.calls > 0 保证进 bySession，其余桶留空。 */
function legacyFold(): UsageLedgerSession['fold'] {
  const total = emptyUsage()
  total.calls = 2
  total.output = 100
  return {
    total,
    byModel: {}, byDay: {}, byDayModels: {}, bySite: {},
    unpricedModels: [], planCalls: {},
    turns: [], perf: [],
    roles: { userChars: 0, toolChars: 0, inputCost: 0, outputCost: 0 },
    lastActive: 1_000,
  }
}

/** 内存版 UsageLedgerStore：load 返回预置文档，save 记录每次落盘。 */
function fakeLedgerStore(sessions: UsageLedgerSession[]) {
  const saved: UsageLedgerDocument[] = []
  let document: UsageLedgerDocument = { version: 1, updatedAt: 1, sessions, appliedMigrations: [] }
  return {
    store: {
      load: async () => document,
      save: async (next: UsageLedgerDocument) => { saved.push(next); document = next },
    },
    saved,
    current: (): UsageLedgerDocument => document,
  }
}

describe('web search estimate (#15)', () => {
  /** 最小 `web/deepseek-search-llm-request` 事件（provider 落盘的真实形状）。 */
  function searchRequest(seq: number, time: number, model = 'deepseek-v4-flash'): SessionEvent {
    return {
      type: 'web/deepseek-search-llm-request', seq, time,
      data: {
        endpoint: 'https://api.deepseek.com/anthropic/v1/messages',
        apiVersion: '2023-06-01',
        body: { model, max_tokens: 4096, messages: [], tools: [] },
      },
    } as unknown as SessionEvent
  }

  it('foldSearchCall counts the call and adds the per-call estimate', () => {
    const acc = emptyUsage()
    foldSearchCall(acc, 0.02)
    expect(acc.calls).toBe(1)
    expect(acc.searchCalls).toBe(1)
    expect(acc.officialCalls).toBe(1)
    expect(acc.cost).toBeCloseTo(0.02, 10)
    expect(acc.officialCost).toBeCloseTo(0.02, 10)
    expect(acc.input).toBe(0)
    expect(acc.output).toBe(0)
  })

  it('foldSession folds web search requests into total/model/day/site/tier buckets', () => {
    const events: SessionEvent[] = [searchRequest(1, 1_000), searchRequest(2, 2_000)]
    const fold = foldSession(events, new Set(), undefined, {}, 0.02)
    expect(fold.total.calls).toBe(2)
    expect(fold.total.searchCalls).toBe(2)
    expect(fold.total.cost).toBeCloseTo(0.04, 10)
    expect(fold.total.officialCost).toBeCloseTo(0.04, 10)
    // 模型归一化到计费目录键 flash；token 维度不动。
    expect(fold.byModel.get('flash')?.searchCalls).toBe(2)
    expect(fold.byModel.get('flash')?.input).toBe(0)
    // 搜索绕过 llm-pi-ai 路由直连官方端点：站点桶固定 direct:deepseek。
    expect(fold.bySite.get('direct:deepseek')?.searchCalls).toBe(2)
    // 峰谷分桶合计覆盖全部搜索调用。
    const tiered = (fold.byTier.get('peak')?.searchCalls ?? 0) + (fold.byTier.get('offPeak')?.searchCalls ?? 0)
    expect(tiered).toBe(2)
  })

  it('estimate 0 still counts the call but adds no cost', () => {
    const fold = foldSession([searchRequest(1, 1_000)], new Set(), undefined, {}, 0)
    expect(fold.total.searchCalls).toBe(1)
    expect(fold.total.calls).toBe(1)
    expect(fold.total.cost).toBe(0)
    expect(fold.total.officialCost).toBe(0)
  })
})

describe('byDayModelsSite (issue #16)', () => {
  it('folds per-day × model × site cells for a normal call', () => {
    const events: SessionEvent[] = [header(1, 'deepseek-v4-flash', 'deepseek-official'), message(2, 2_000, USAGE)]
    const fold = foldSession(events, new Set())
    const day = dayStamp(2_000)
    // 无 routes 配置时 provider 归为 unknown；flash 为目录键。
    const siteCell = fold.byDayModelsSite.get(day)?.get('flash')?.get('unknown')
    expect(siteCell?.calls).toBe(1)
    expect(siteCell?.cacheMiss).toBe(120)
  })
})

describe('foldUsage', () => {
  it('accumulates calls and splits tokens into cache buckets', () => {
    const acc = emptyUsage()
    foldUsage(acc, USAGE, 'flash', false, 1_000)
    expect(acc.calls).toBe(1)
    expect(acc.cacheHit).toBe(800)
    expect(acc.cacheMiss).toBe(120) // inputTokens 100 + cacheWriteTokens 20
    expect(acc.input).toBe(920) // 100 + 800 + 20 = 总输入
    expect(acc.output).toBe(50)
  })

  it('prices catalog models and leaves unknown models free', () => {
    const known = emptyUsage()
    foldUsage(known, USAGE, 'flash', false, 1_000)
    expect(known.cost).toBeGreaterThan(0)

    const unknown = emptyUsage()
    foldUsage(unknown, USAGE, 'mimo-v2-pro', false, 1_000) // 目录外的模型
    expect(unknown.cost).toBe(0)
  })

  it('charges nothing for subscription-plan calls even when the model id collides with the catalog', () => {
    // 订阅 provider 的模型 id 即使撞名计费表（kimi-k3 有价），也一律免费。
    const acc = emptyUsage()
    foldUsage(acc, USAGE, 'kimi-k3', true, 1_000)
    expect(acc.calls).toBe(1)
    expect(acc.cost).toBe(0)
  })

  it('prices peak vs off-peak by the call time (P0-1)', () => {
    // 同一桶、同一模型：北京时间 10 点（高峰）比 13 点（低谷）贵。
    const peak = emptyUsage()
    const off = emptyUsage()
    const at = (beijingHour: number): number => Date.UTC(2026, 7, 21, (beijingHour + 24 - 8) % 24)
    foldUsage(peak, USAGE, 'flash', false, at(10))
    foldUsage(off, USAGE, 'flash', false, at(13))
    expect(peak.cost).toBeGreaterThan(off.cost)
  })

  it('accumulates reasoning tokens as a subset of output', () => {
    const acc = emptyUsage()
    foldUsage(acc, { inputTokens: 100, outputTokens: 500, reasoningTokens: 200 } as TokenUsage, 'flash', false, 1_000)
    expect(acc.output).toBe(500)
    expect(acc.reasoning).toBe(200)
  })
})

describe('workspaceNameOf (P2-2)', () => {
  it('derives the workspace name from the cwd basename', () => {
    expect(workspaceNameOf('/Users/ken/my-project')).toBe('my-project')
    expect(workspaceNameOf('C:\\work\\proj')).toBe('proj')
    expect(workspaceNameOf(undefined)).toBe('—')
    expect(workspaceNameOf('')).toBe('—')
  })
})

describe('per-turn folding (P1-1)', () => {
  /** Fold-session event row helper (durable-shape cast like the aggregator). */
  const ev = (type: string, seq: number, time: number, data: Record<string, unknown>): SessionEvent =>
    ({ type, seq, time, data }) as unknown as SessionEvent

  it('folds usage into per-turn rows with model, start, and end', () => {
    const fold = foldSession([
      ev('turn/start', 1, 1_000, { turn: 1 }),
      ev('request/header', 2, 1_001, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
      ev('assistant/message', 3, 1_002, { turn: 1, step: 1, usage: USAGE }),
      ev('turn/end', 4, 2_000, { turn: 1 }),
      ev('turn/start', 5, 3_000, { turn: 2 }),
      ev('request/header', 6, 3_001, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
      ev('assistant/message', 7, 3_002, { turn: 2, step: 1, usage: USAGE }),
    ], new Set())
    expect(fold.turns).toHaveLength(2)
    expect(fold.turns[0]).toMatchObject({ turn: 1, model: 'flash', startedAt: 1_000, endedAt: 2_000 })
    expect(fold.turns[0]?.cost ?? 0).toBeGreaterThan(0)
    expect(fold.turns[1]).toMatchObject({ turn: 2, startedAt: 3_000 })
  })

  it('charges nothing for subscription-plan turns', () => {
    const fold = foldSession([
      ev('request/header', 1, 1_000, { header: { config: { provider: 'kimi-coding', model: 'k3' } } }),
      ev('assistant/message', 2, 1_001, { turn: 1, step: 1, usage: USAGE }),
    ], new Set(['kimi-coding']))
    expect(fold.turns).toHaveLength(1)
    expect(fold.turns[0]?.cost).toBe(0)
  })

  it('normalises MiniMax / DeepSeek-vision model ids to catalog keys', () => {
    const fold = foldSession([
      ev('request/header', 1, 1_000, { header: { config: { provider: 'minimax-cn', model: 'MiniMax-M3' } } }),
      ev('assistant/message', 2, 1_001, { turn: 1, step: 1, usage: USAGE }),
      ev('request/header', 3, 1_002, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash-vision-exp' } } }),
      ev('assistant/message', 4, 1_003, { turn: 1, step: 1, usage: USAGE }),
    ], new Set())
    // MiniMax-M3（大小写、带型号后缀）与 vision-exp 都归到各自目录键，而非保留原始 id/标未收录。
    expect(fold.byModel.has('minimax')).toBe(true)
    expect(fold.byModel.has('MiniMax-M3')).toBe(false)
    expect(fold.byModel.has('flash-vision-exp')).toBe(true)
  })
})

describe('message.source attribution (issue #14)', () => {
  /** Fold-session event row helper (durable-shape cast like the aggregator). */
  const ev = (type: string, seq: number, time: number, data: Record<string, unknown>): SessionEvent =>
    ({ type, seq, time, data }) as unknown as SessionEvent

  /** `assistant/message` with the authoritative `message.source` agent-loop writes per call. */
  const sourced = (seq: number, time: number, model: string, provider: string, usage: TokenUsage = USAGE): SessionEvent =>
    ev('assistant/message', seq, time, {
      turn: 1, step: 1, usage,
      message: { role: 'assistant', content: [], source: { kind: 'model', provider, model } },
    })

  it('attributes each usage to its own message.source when headers are sparse', () => {
    // 复现 issue #14：订阅 glm 与按量 flash 混用，header 稀疏（真实会话 380 请求仅 22 条）。
    // 修复前：两条 message 都记到最近一次 header 的模型头上，串账。
    const fold = foldSession([
      ev('request/header', 1, 1_000, { header: { config: { provider: 'zai-coding-cn', model: 'glm-5.3-flash' } } }),
      sourced(2, 1_001, 'glm-5.3-flash', 'zai-coding-cn'),
      sourced(3, 1_002, 'deepseek-v4-flash', 'deepseek-official'), // 中途切模型，无新 header。
      sourced(4, 1_003, 'glm-5.3-flash', 'zai-coding-cn'),
    ], new Set(['zai-coding-cn']), undefined, { 'zai-coding-cn': {}, 'deepseek-official': {} })
    const glm = fold.byModel.get('glm-5.3-flash')
    const flash = fold.byModel.get('flash')
    expect(glm?.calls).toBe(2)
    expect(flash?.calls).toBe(1)
    // glm 走订阅：免费且计入 planCalls；flash 按量：有费用且不标。
    expect(glm?.cost).toBe(0)
    expect(fold.planCalls.get('glm-5.3-flash')).toBe(2)
    expect(fold.planCalls.has('flash')).toBe(false)
    expect(flash?.cost ?? 0).toBeGreaterThan(0)
    // site 桶也跟随各自的 source：订阅直连 vs 官方直连。
    expect([...fold.bySite.keys()]).toEqual(['direct:zai-coding-cn', 'direct:deepseek-official'])
  })

  it('keeps totals stable across re-folds (no regression between reads)', () => {
    // 修复前：每多出现一条同模型 header，归账窗口前移，累计值回退（3237 → 2668）。
    // 修复后：归属只取决于 message 自身，重复折叠结果一致。
    const events = [
      ev('request/header', 1, 1_000, { header: { config: { provider: 'zai-coding-cn', model: 'glm-5.3-flash' } } }),
      sourced(2, 1_001, 'glm-5.3-flash', 'zai-coding-cn'),
      sourced(3, 1_002, 'glm-5.3-flash', 'zai-coding-cn'),
      ev('request/header', 4, 1_003, { header: { config: { provider: 'zai-coding-cn', model: 'glm-5.3-flash' } } }),
      sourced(5, 1_004, 'glm-5.3-flash', 'zai-coding-cn'),
    ]
    const first = foldSession(events, new Set(['zai-coding-cn']))
    const again = foldSession(events, new Set(['zai-coding-cn']))
    expect(first.byModel.get('glm-5.3-flash')?.output).toBe(150)
    expect(again.byModel.get('glm-5.3-flash')?.output).toBe(first.byModel.get('glm-5.3-flash')?.output)
    expect(first.total.output).toBe(150)
  })

  it('falls back to the request/header state when message.source is absent (legacy logs)', () => {
    const fold = foldSession([
      ev('request/header', 1, 1_000, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
      ev('assistant/message', 2, 1_001, { turn: 1, step: 1, usage: USAGE, message: { role: 'assistant', content: [] } }),
    ], new Set())
    expect(fold.byModel.get('flash')?.calls).toBe(1)
    expect(fold.byModel.get('flash')?.cost ?? 0).toBeGreaterThan(0)
  })
})

describe('1.0.8 dimensions (byTier / byTool / cacheWrite)', () => {
  /** Fold-session event row helper (durable-shape cast like the aggregator). */
  const ev = (type: string, seq: number, time: number, data: Record<string, unknown>): SessionEvent =>
    ({ type, seq, time, data }) as unknown as SessionEvent
  // 周三 2026-08-19：北京时间 10:00（工作日高峰）与 20:00（低谷）。
  const peakTime = Date.UTC(2026, 7, 19, 2, 0, 0)
  const offTime = Date.UTC(2026, 7, 19, 12, 0, 0)

  it('folds each call into the peak/off-peak bucket by its own time', () => {
    const fold = foldSession([
      ev('request/header', 1, peakTime, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
      ev('assistant/message', 2, peakTime, { turn: 1, step: 1, usage: USAGE }),
      ev('assistant/message', 3, offTime, { turn: 1, step: 1, usage: USAGE }),
    ], new Set())
    expect(fold.byTier.get('peak')?.calls).toBe(1)
    expect(fold.byTier.get('offPeak')?.calls).toBe(1)
    // 同模型同量 token：官方刊例峰价为谷价 2 倍，两桶费用应有明显档差。
    const peakCost = fold.byTier.get('peak')?.cost ?? 0
    const offCost = fold.byTier.get('offPeak')?.cost ?? 0
    expect(peakCost).toBeGreaterThan(offCost * 1.9)
  })

  it('counts a tool call once per (turn, step, index) despite repeated delta names', () => {
    // tool-call-delta 每个增量都重复携带工具名：只按 (turn, step, index) 首见计一次。
    const fold = foldSession([
      ev('assistant/chunk', 1, 1_000, { turn: 1, step: 1, chunk: { type: 'tool-call-delta', index: 0, name: 'read_file', argumentsDelta: '' } }),
      ev('assistant/chunk', 2, 1_001, { turn: 1, step: 1, chunk: { type: 'tool-call-delta', index: 0, name: 'read_file', argumentsDelta: '{"p"' } }),
      ev('assistant/chunk', 3, 1_002, { turn: 1, step: 1, chunk: { type: 'tool-call-delta', index: 1, name: 'edit_file', argumentsDelta: '' } }),
    ], new Set())
    expect(fold.byTool.get('read_file')).toBe(1)
    expect(fold.byTool.get('edit_file')).toBe(1)
  })

  it('emits byTier / byTool in the aggregated document', async () => {
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        ev('request/header', 1, peakTime, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
        ev('assistant/chunk', 2, peakTime + 1, { turn: 1, step: 1, chunk: { type: 'tool-call-delta', index: 0, name: 'read_file' } }),
        ev('assistant/message', 3, peakTime + 2, { turn: 1, step: 1, usage: USAGE }),
      ],
    }))
    expect(stats.byTier?.peak.calls).toBe(1)
    expect(stats.byTool?.read_file).toBe(1)
  })

  it('records explicit cache-write tokens as a cacheMiss subset', () => {
    const acc = emptyUsage()
    foldUsage(acc, { inputTokens: 10, outputTokens: 5, cacheReadTokens: 100, cacheWriteTokens: 30 }, 'flash', false, offTime)
    expect(acc.cacheWrite).toBe(30)
    // cacheMiss 语义不变：未命中输入 + 显式写入。
    expect(acc.cacheMiss).toBe(40)
  })
})

describe('fork seed filtering (session/end-seed)', () => {
  /** Fold-session event row helper (durable-shape cast like the aggregator). */
  const ev = (type: string, seq: number, time: number, data: Record<string, unknown>): SessionEvent =>
    ({ type, seq, time, data }) as unknown as SessionEvent

  it('skips seed events sequenced before the end-seed boundary', () => {
    const fold = foldSession([
      // 种子：父会话拷贝来的事件（seq < 边界 4），不应重复计费。
      ev('request/header', 1, 1_000, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
      ev('assistant/message', 2, 1_001, { turn: 1, step: 1, usage: USAGE }),
      ev('session/end-seed', 4, 1_002, {}),
      // 本会话 own 事件（seq >= 边界 4）：正常计费。
      ev('request/header', 5, 2_000, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
      ev('assistant/message', 6, 2_001, { turn: 2, step: 1, usage: USAGE }),
    ], new Set())
    // 只有 own 事件的 2 号调计入总调用。
    expect(fold.total.calls).toBe(1)
    expect(fold.turns).toHaveLength(1)
    expect(fold.turns[0]).toMatchObject({ turn: 2 })
  })

  it('takes the LAST end-seed as the boundary for a multi-level fork chain', () => {
    const fold = foldSession([
      // A 种子（seq 0–1）。
      ev('request/header', 0, 1_000, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
      ev('assistant/message', 1, 1_001, { turn: 1, step: 1, usage: USAGE }),
      // B 的 end-seed（seq 2）。
      ev('session/end-seed', 2, 1_002, {}),
      // B 的 own 事件（seq 3–4）——对 C 而言仍是种子。
      ev('request/header', 3, 1_100, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
      ev('assistant/message', 4, 1_101, { turn: 2, step: 1, usage: USAGE }),
      // C 的 end-seed（seq 5，最后一个边界）。
      ev('session/end-seed', 5, 1_102, {}),
      // C 的 own 事件（seq 6）：唯一应计费的。
      ev('request/header', 6, 2_000, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
      ev('assistant/message', 7, 2_001, { turn: 3, step: 1, usage: USAGE }),
    ], new Set())
    expect(fold.total.calls).toBe(1)
    expect(fold.turns).toHaveLength(1)
    expect(fold.turns[0]).toMatchObject({ turn: 3 })
  })

  it('keeps all events when no end-seed boundary exists (non-fork session)', () => {
    const fold = foldSession([
      ev('request/header', 1, 1_000, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
      ev('assistant/message', 2, 1_001, { turn: 1, step: 1, usage: USAGE }),
      ev('request/header', 3, 2_000, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
      ev('assistant/message', 4, 2_001, { turn: 2, step: 1, usage: USAGE }),
    ], new Set())
    expect(fold.total.calls).toBe(2)
    expect(fold.turns).toHaveLength(2)
  })
})

describe('byRole attribution (estimated)', () => {
  /** Fold-session event row helper (durable-shape cast like the aggregator). */
  const ev = (type: string, seq: number, time: number, data: Record<string, unknown>): SessionEvent =>
    ({ type, seq, time, data }) as unknown as SessionEvent

  it('splits input cost between user and tool by message text share; output goes to assistant', async () => {
    // user 消息 8 字符、tool 结果 24 字符：输入成本按 25% / 75% 摊分。
    const stats = await aggregateUsage(fakePersistence({
      s1: [
        header(1, 'deepseek-v4-flash'),
        ev('user/message', 2, 900, { message: { role: 'user', content: 'aaaaaaaa' } }) as unknown as SessionEvent,
        ev('tool/result', 3, 950, { turn: 1, step: 1, message: { role: 'tool', content: 'a'.repeat(24) } }) as unknown as SessionEvent,
        message(4, 1_000, USAGE),
      ],
    }))
    const role = stats.byRole
    expect(role).toBeDefined()
    if (role === undefined) return
    const inputCost = role.user + role.tool
    // 三段合计 = 总成本（口径自洽）。
    expect(inputCost + role.assistant).toBeCloseTo(stats.total.cost, 10)
    // 输入成本按字符占比 1:3 摊分。
    expect(role.tool).toBeCloseTo(role.user * 3, 10)
    // 助手输出成本 = 输出 tokens 的实测计价（>0 且小于总成本）。
    expect(role.assistant).toBeGreaterThan(0)
    expect(role.assistant).toBeLessThan(stats.total.cost)
  })

  it('splits input cost evenly when no message content is recorded', async () => {
    const stats = await aggregateUsage(fakePersistence({
      s1: [header(1, 'deepseek-v4-flash'), message(2, 1_000, USAGE)],
    }))
    const role = stats.byRole
    expect(role).toBeDefined()
    if (role === undefined) return
    expect(role.user).toBeCloseTo(role.tool, 10)
    expect(role.user + role.assistant + role.tool).toBeCloseTo(stats.total.cost, 10)
  })

  it('keeps subscription calls at zero across all roles', async () => {
    const stats = await aggregateUsage(
      fakePersistence({ s1: [header(1, 'k3', 'kimi-coding'), message(2, 1_000, USAGE)] }),
      { subscriptionProviders: ['kimi-coding'] },
    )
    expect(stats.byRole).toEqual({ user: 0, assistant: 0, tool: 0 })
  })
})

describe('dayStamp', () => {
  it('formats the local date of a timestamp', () => {
    // 2026-08-15 12:00 UTC 在 UTC+8 是 2026-08-15 20:00。
    expect(dayStamp(Date.UTC(2026, 7, 15, 12, 0, 0))).toMatch(/^2026-08-1[5-6]$/)
  })
})

describe('relay site attribution (P0-2)', () => {
  it('collects unpriced models into unpricedModels', () => {
    const fold = foldSession([
      header(1, 'unknown-model-x', 'unknown-route') as unknown as SessionEvent,
      message(2, 1_001, USAGE) as unknown as SessionEvent,
    ], new Set())
    expect(fold.unpricedModels.has('unknown-model-x')).toBe(true)
    // 已收录模型不进 unpriced 集合。
    const foldPriced = foldSession([
      header(1, 'deepseek-v4-flash') as unknown as SessionEvent,
      message(2, 1_001, USAGE) as unknown as SessionEvent,
    ], new Set())
    expect(foldPriced.unpricedModels.size).toBe(0)
  })
  it('normalizes a baseURL to its origin', () => {
    expect(siteOriginOf('https://relay.example.com/v1')).toBe('https://relay.example.com')
    expect(siteOriginOf('http://gateway.acme.example:8080/path')).toBe('http://gateway.acme.example:8080')
    // 非法的 URL 原样回退（不抛错）。
    expect(siteOriginOf('not-a-url')).toBe('not-a-url')
  })

  it('classifies a route as site / direct / unknown from the provider routes dict', () => {
    const routes: Record<string, { baseURL?: string }> = {
      // 配了 baseURL → 中转站（按 origin 归组）。
      'relay-a': { baseURL: 'https://relay.example.com/v1' },
      // 存在但无 baseURL → 直连厂商。
      'deepseek': {},
    }
    expect(siteRefOf('relay-a', routes)).toEqual({ kind: 'site', origin: 'https://relay.example.com', provider: 'relay-a' })
    expect(siteRefOf('deepseek', routes)).toEqual({ kind: 'direct', provider: 'deepseek' })
    // 不在配置里 → 未知路由（读不到，而不是直连）。
    expect(siteRefOf('removed-route', routes)).toEqual({ kind: 'unknown', provider: 'removed-route' })
  })

  it('keys site buckets stably for the dashboard', () => {
    expect(siteBucketKey({ kind: 'site', origin: 'https://relay.example.com', provider: 'relay-a' })).toBe('site:https://relay.example.com')
    expect(siteBucketKey({ kind: 'direct', provider: 'deepseek' })).toBe('direct:deepseek')
    expect(siteBucketKey({ kind: 'unknown', provider: 'whatever' })).toBe('unknown')
  })

  it('folds each call into its site bucket keyed by origin', () => {
    const ev = (type: string, seq: number, time: number, data: Record<string, unknown>): SessionEvent =>
      ({ type, seq, time, data }) as unknown as SessionEvent
    const fold = foldSession([
      ev('request/header', 1, 1_000, { header: { config: { provider: 'relay-a', model: 'deepseek-v4-flash' } } }),
      ev('assistant/message', 2, 1_001, { turn: 1, step: 1, usage: USAGE }),
    ], new Set(), undefined, { 'relay-a': { baseURL: 'https://relay.example.com/v1' } })
    const site = fold.bySite.get('site:https://relay.example.com')
    expect(site?.calls).toBe(1)
    expect(site?.cost ?? 0).toBeGreaterThan(0)
  })

  it('emits bySite in the document when routes resolve to stations', async () => {
    const stats = await aggregateUsage(
      fakePersistence({ s1: [header(1, 'deepseek-v4-flash', 'relay-a'), message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE)] }),
      { resolveRoutes: () => ({ 'relay-a': { baseURL: 'https://relay.example.com/v1' } }) },
    )
    expect(stats.bySite?.['site:https://relay.example.com']?.calls).toBe(1)
    expect(stats.bySite?.['unknown']).toBeUndefined()
  })

  it('routes without configuration fall into the unknown bucket', async () => {
    const stats = await aggregateUsage(
      fakePersistence({ s1: [header(1, 'deepseek-v4-flash', 'missing-route'), message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE)] }),
    )
    expect(stats.bySite?.['unknown']?.calls).toBe(1)
  })
})

describe('aggregateUsage', () => {
  it('attributes calls to the model of the preceding request header', async () => {
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        header(1, 'deepseek-v4-flash'),
        message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE),
        message(3, Date.UTC(2026, 7, 15, 5, 0, 0), USAGE),
      ],
    }))
    expect(stats.total.calls).toBe(2)
    const flash = stats.byModel.flash
    expect(flash?.calls).toBe(2)
    expect(flash?.cost ?? 0).toBeGreaterThan(0)
  })

  it('groups usage by local day', async () => {
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        header(1, 'deepseek-v4-flash'),
        message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE),
        message(3, Date.UTC(2026, 7, 16, 4, 0, 0), USAGE),
      ],
    }))
    expect(Object.keys(stats.byDay)).toHaveLength(2)
  })

  it('buckets DeepSeek-official calls as official and the rest as third-party', async () => {
    // 官方 = provider 以 deepseek 为前缀；其余（如 openrouter 中转）计为三方。
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        header(1, 'deepseek-v4-flash', 'deepseek-official'),
        message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE),
        header(3, 'deepseek-v4-flash', 'openrouter'),
        message(4, Date.UTC(2026, 7, 15, 5, 0, 0), USAGE),
      ],
    }))
    const flash = stats.byModel.flash
    expect(flash?.calls).toBe(2)
    expect(flash?.officialCalls).toBe(1)
    // 官方费用 = 官方那次调用的计价，>0 且小于总费用。
    expect(flash?.officialCost ?? 0).toBeGreaterThan(0)
    expect(flash?.officialCost ?? 0).toBeLessThan(flash?.cost ?? 0)
  })

  it('keeps unknown (subscription) models free while counting their tokens', async () => {
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        header(1, 'mimo-v2-pro'),
        message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE),
      ],
    }))
    const unknown = stats.byModel['mimo-v2-pro']
    expect(unknown?.calls).toBe(1)
    expect(unknown?.cost).toBe(0)
    expect(unknown?.cacheHit).toBe(800)
  })

  it('waives cost for subscription providers even when their model id is in the catalog', async () => {
    // kimi-coding 是订阅 provider：用它跑 deepseek-v4-flash（计费表有价）也不计费。
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        header(1, 'deepseek-v4-flash', 'kimi-coding'),
        message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE),
      ],
    }))
    const flash = stats.byModel.flash
    expect(flash?.calls).toBe(1)
    expect(flash?.cost).toBe(0)
  })

  it('maps the kimi coding-plan model id k3 to the catalog and waives cost', async () => {
    // 真实日志里 kimi-coding 通道的 model id 是短名 k3：别名归一到
    // kimi-k3（Kimi K3 目录条目），不再落到「其他模型」，费用按订阅记 0。
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        header(1, 'k3', 'kimi-coding'),
        message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE),
      ],
    }))
    const k3 = stats.byModel['kimi-k3']
    expect(k3?.calls).toBe(1)
    expect(stats.byModel['k3']).toBeUndefined()
    expect(k3?.cost).toBe(0)
    expect(k3?.plan).toBe(true)
  })

  it('attributes the xiaomi token-plan model mimo-v2.5 to its catalog row and waives cost', async () => {
    // 小米 token plan 通道的 model id 是 mimo-v2.5（目录 key 同名）：
    // 不再落到「其他模型」，费用按订阅记 0。
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        header(1, 'mimo-v2.5', 'xiaomi-token-plan-cn'),
        message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE),
      ],
    }))
    const mimo = stats.byModel['mimo-v2.5']
    expect(mimo?.calls).toBe(1)
    expect(mimo?.cost).toBe(0)
    expect(mimo?.plan).toBe(true)
  })

  it('waives cost for opencode subscription channels', async () => {
    // opencode / opencode-go 是订阅通道：目录模型走它也按订阅记 0、标 plan。
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        header(1, 'kimi-k3', 'opencode-go'),
        message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE),
      ],
    }))
    const k3 = stats.byModel['kimi-k3']
    expect(k3?.cost).toBe(0)
    expect(k3?.plan).toBe(true)
  })

  it('keeps paid calls priced when a subscription call lands later in the same bucket', async () => {
    // 同一会话内先跑 DeepSeek（收费）再跑 Kimi K3 coding plan（免费）：
    // 当日与总计 cost 必须仍包含 DeepSeek 的费用，不能被免费调用覆盖成 0。
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        header(1, 'deepseek-v4-flash'),
        message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE),
        header(3, 'k3', 'kimi-coding'),
        message(4, Date.UTC(2026, 7, 15, 5, 0, 0), USAGE),
      ],
    }))
    expect(stats.total.calls).toBe(2)
    expect(stats.total.cost).toBeGreaterThan(0)
    expect(stats.byModel.flash?.cost ?? 0).toBeGreaterThan(0)
    expect(stats.byModel['kimi-k3']?.cost).toBe(0)
    // 混合通道：flash 走按量（不标订阅），k3 全走订阅（标订阅包含）。
    expect(stats.byModel.flash?.plan).toBeUndefined()
    expect(stats.byModel['kimi-k3']?.plan).toBe(true)
    // 当日桶混合收费 + 免费调用：费用保留收费部分。
    expect(stats.byDay['2026-08-15']?.cost).toBeGreaterThan(0)
  })

  it('rolls multiple sessions into one total', async () => {
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [header(1, 'deepseek-v4-flash'), message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE)],
      'session-b': [header(1, 'deepseek-v4-flash'), message(2, Date.UTC(2026, 7, 15, 5, 0, 0), USAGE)],
    }))
    expect(stats.total.calls).toBe(2)
  })

  it('skips a corrupt/unreadable session instead of failing the whole aggregation', async () => {
    // 单个损坏会话（readFrom 抛异常，如 zstd torn frame）不得拖垮整份聚合：
    // 其余正常会话仍被折叠，坏会话被跳过并告警（GitHub issue「仪表盘全部归零」）。
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const corruptReadFrom = async (id: SessionId, fromSeq: number) => {
      if (String(id) === 'session-corrupt') {
        throw new Error('corrupt Zstandard session log: complete frame contains a torn JSONL record')
      }
      return fakePersistence({
        'session-good': [header(1, 'deepseek-v4-flash'), message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE)],
      }).readFrom(id, fromSeq)
    }
    const persistence: UsagePersistence = {
      list: async () => ['session-good', 'session-corrupt'].map(id => ({ id })),
      readFrom: corruptReadFrom,
    } as unknown as UsagePersistence

    const stats = await aggregateUsage(persistence)
    expect(stats.total.calls).toBe(1)
    expect(stats.byModel.flash?.calls).toBe(1)
    // 坏会话不入明细，正常会话保留。
    expect(stats.bySession).toHaveLength(1)
    expect(stats.bySession[0]?.id).toBe('session-good')
    warn.mockRestore()
  })

  it('splits usage by model and day for the stacked trend chart', async () => {
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        header(1, 'deepseek-v4-flash'),
        message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE),
        header(3, 'glm-5.2'),
        message(4, Date.UTC(2026, 7, 15, 5, 0, 0), USAGE),
        message(5, Date.UTC(2026, 7, 16, 4, 0, 0), USAGE),
      ],
    }))
    const days = Object.keys(stats.byDayModels)
    // flash 与 glm 各至少覆盖一个本地日，且有一天两个模型并存。
    expect(days).toHaveLength(2)
    let flashCalls = 0
    let glmCalls = 0
    let coexistingDays = 0
    for (const day of days) {
      const models = stats.byDayModels[day] ?? {}
      if (models.flash !== undefined && models.glm !== undefined) coexistingDays += 1
      flashCalls += models.flash?.calls ?? 0
      glmCalls += models.glm?.calls ?? 0
      // 存在的模型都在计费表里，费用 > 0。
      if (models.flash !== undefined) expect(models.flash.cost).toBeGreaterThan(0)
      if (models.glm !== undefined) expect(models.glm.cost).toBeGreaterThan(0)
    }
    expect(coexistingDays).toBeGreaterThanOrEqual(1)
    expect(flashCalls).toBe(1)
    expect(glmCalls).toBe(2)
  })

  it('rolls per-session rows with title, cwd, cost, and last-active, sorted by cost', async () => {
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        { type: 'session/title', seq: 1, time: 900, data: { title: '修复登录 bug' } } as unknown as SessionEvent,
        header(2, 'deepseek-v4-flash'),
        message(3, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE),
      ],
      'session-b': [
        header(1, 'glm-5.2'),
        message(2, Date.UTC(2026, 7, 15, 5, 0, 0), USAGE),
        message(3, Date.UTC(2026, 7, 15, 6, 0, 0), USAGE),
      ],
      // 无调用的会话（只有标题事件）不进明细。
      'session-c': [
        { type: 'session/title', seq: 1, time: 800, data: { title: '空会话' } } as unknown as SessionEvent,
      ],
    }))
    expect(stats.bySession).toHaveLength(2)
    // glm 两次调用费用更高，排第一；无标题时 title 字段缺失。
    expect(stats.bySession[0]?.id).toBe('session-b')
    expect(stats.bySession[0]?.calls).toBe(2)
    expect(stats.bySession[0]?.title).toBeUndefined()
    expect(stats.bySession[1]).toMatchObject({ id: 'session-a', title: '修复登录 bug', calls: 1 })
    expect(stats.bySession[1]?.lastActive ?? 0).toBeGreaterThan(0)
  })

  it('caps session rows at SESSION_ROW_LIMIT', async () => {
    const logs: Record<string, SessionEvent[]> = {}
    for (let i = 0; i < SESSION_ROW_LIMIT + 5; i += 1) {
      logs[`s-${String(i)}`] = [header(1, 'deepseek-v4-flash'), message(2, Date.UTC(2026, 7, 15, 4, 0, 0) + i, USAGE)]
    }
    const stats = await aggregateUsage(fakePersistence(logs))
    expect(stats.bySession).toHaveLength(SESSION_ROW_LIMIT)
    expect(stats.total.calls).toBe(SESSION_ROW_LIMIT + 5)
  })
})

describe('createUsageAggregator (incremental cache)', () => {
  let root: string | undefined

  afterEach(async () => {
    vi.useRealTimers()
    if (root !== undefined) await rm(root, { recursive: true, force: true })
    root = undefined
  })

  /**
   * 带 locate 的持久化替身：事件在内存、失效键来自真实临时文件的
   * mtime+size；reads 记录每个会话的重折次数。
   */
  async function fileBackedPersistence(logs: Record<string, SessionEvent[]>) {
    root = await mkdtemp(join(tmpdir(), 'dsh-billing-agg-'))
    const reads: Record<string, number> = {}
    const paths: Record<string, string> = {}
    for (const id of Object.keys(logs)) {
      const path = join(root!, `${id}.jsonl`)
      await writeFile(path, JSON.stringify(logs[id]?.length ?? 0))
      paths[id] = path
      reads[id] = 0
    }
    const persistence = {
      list: async () => Object.keys(logs).map(id => ({ id })),
      locate: (meta: { id: SessionId }) => ({ kind: 'jsonl', path: paths[String(meta.id)] ?? '' }),
      readFrom: async (id: SessionId, fromSeq: number) => {
        reads[String(id)] = (reads[String(id)] ?? 0) + 1
        return { meta: { id }, events: (logs[String(id)] ?? []).filter(event => event.seq >= fromSeq) }
      },
    } as unknown as UsagePersistence
    return { persistence, reads, paths }
  }

  it('reuses the cached fold for untouched logs and re-folds only the written session', async () => {
    vi.useFakeTimers()
    const logs: Record<string, SessionEvent[]> = {
      a: [header(1, 'deepseek-v4-flash'), message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE)],
      b: [header(1, 'deepseek-v4-flash'), message(2, Date.UTC(2026, 7, 15, 5, 0, 0), USAGE)],
    }
    const { persistence, reads, paths } = await fileBackedPersistence(logs)
    const aggregator = createUsageAggregator(persistence)

    const first = await aggregator.aggregate()
    expect(first.total.calls).toBe(2)
    expect(reads).toMatchObject({ a: 1, b: 1 })

    // TTL 内：直接复用整份文档，不再读任何日志。
    const second = await aggregator.aggregate()
    expect(second).toBe(first)
    expect(reads).toMatchObject({ a: 1, b: 1 })

    // 过了 TTL 但日志没动：按会话缓存命中，仍不重折。
    vi.advanceTimersByTime(AGGREGATE_TTL_MS + 1000)
    const third = await aggregator.aggregate()
    expect(third.total.calls).toBe(2)
    expect(reads).toMatchObject({ a: 1, b: 1 })

    // b 的日志写过了（size 变化使失效键失配）：只重折 b。
    logs['b'] = [...logs['b']!, message(3, Date.UTC(2026, 7, 15, 6, 0, 0), USAGE)]
    await writeFile(paths['b']!, JSON.stringify(logs['b'].length))
    vi.advanceTimersByTime(AGGREGATE_TTL_MS + 1000)
    const fourth = await aggregator.aggregate()
    expect(fourth.total.calls).toBe(3)
    expect(reads).toMatchObject({ a: 1, b: 2 })
  })

  it('drops cache entries for sessions no longer listed', async () => {
    vi.useFakeTimers()
    const logs: Record<string, SessionEvent[]> = {
      a: [header(1, 'deepseek-v4-flash'), message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE)],
    }
    const { persistence, reads } = await fileBackedPersistence(logs)
    const aggregator = createUsageAggregator(persistence)
    await aggregator.aggregate()
    expect(reads['a']).toBe(1)

    // 会话从列表消失后结果不再包含它；重新出现时按新会话重折。
    vi.advanceTimersByTime(AGGREGATE_TTL_MS + 1000)
    const gone = { ...logs }
    delete gone['a']
    const persistence2 = {
      list: async () => [] as { id: SessionId }[],
      readFrom: persistence.readFrom,
    } as unknown as UsagePersistence
    const empty = await createUsageAggregator(persistence2).aggregate()
    expect(empty.total.calls).toBe(0)
    expect(empty.bySession).toHaveLength(0)
  })
})

describe('performance aggregation (TTFT / tps / latency)', () => {
  /** Fold-session event row helper (durable-shape cast like the aggregator). */
  const ev = (type: string, seq: number, time: number, data: Record<string, unknown>): SessionEvent =>
    ({ type, seq, time, data }) as unknown as SessionEvent

  it('folds a measured step into a perf sample from request/header → content', () => {
    const fold = foldSession([
      ev('step/start', 1, 500, { turn: 1, step: 1 }),
      ev('request/header', 2, 600, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
      ev('assistant/chunk', 3, 800, { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'h' } }),
      ev('assistant/chunk', 4, 900, { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'i' } }),
      ev('assistant/message', 5, 1_000, { turn: 1, step: 1, usage: { inputTokens: 10, outputTokens: 100 } }),
    ], new Set())
    expect(fold.perf).toHaveLength(1)
    // TTFT = 800-600；gen = 900-800；
    // tokens/s = 100 ÷ (100ms/1000)；总延迟 = 1000-600。
    expect(fold.perf[0]).toMatchObject({
      model: 'flash', ttftMs: 200, tps: 1_000, latencyMs: 400, estimated: false,
    })
  })

  it('marks tool-continuation steps as estimated when no request/header exists', () => {
    const fold = foldSession([
      ev('step/start', 1, 500, { turn: 1, step: 1 }),
      ev('assistant/chunk', 2, 800, { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'h' } }),
      ev('assistant/message', 3, 1_000, { turn: 1, step: 1, usage: { inputTokens: 10, outputTokens: 0 } }),
    ], new Set())
    const sample = fold.perf[0]
    expect(sample).toBeDefined()
    // TTFT 以 step/start 为起点估算；无输出 → 无 tps。
    expect(sample).toMatchObject({ ttftMs: 300, estimated: true })
    expect(sample?.tps).toBeUndefined()
  })

  it('ignores usage-only chunks as content when measuring TTFT', () => {
    const fold = foldSession([
      ev('step/start', 1, 500, { turn: 1, step: 1 }),
      ev('request/header', 2, 600, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
      ev('assistant/chunk', 3, 650, { turn: 1, step: 1, chunk: { type: 'usage', usage: { inputTokens: 10, outputTokens: 0 } } }),
      ev('assistant/chunk', 4, 700, { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'h' } }),
      ev('assistant/message', 5, 800, { turn: 1, step: 1, usage: { inputTokens: 10, outputTokens: 0 } }),
    ], new Set())
    // usage chunk（650）不算内容；TTFT 以首个 text-delta（700）为准。
    expect(fold.perf[0]).toMatchObject({ ttftMs: 100 })
    expect(fold.perf[0]?.tps).toBeUndefined()
  })

  it('reports ttftMax and spike count in the per-model perf stats', async () => {
    // 两次调用：TTFT 100ms 与 11s（一次尖峰 > 10s 阈值）。
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        ev('step/start', 1, 500, { turn: 1, step: 1 }),
        ev('request/header', 2, 600, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
        ev('assistant/chunk', 3, 11_600, { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'h' } }),
        ev('assistant/message', 4, 11_700, { turn: 1, step: 1, usage: { inputTokens: 10, outputTokens: 1 } }),
        ev('step/start', 5, 11_800, { turn: 1, step: 2 }),
        ev('request/header', 6, 11_850, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
        ev('assistant/chunk', 7, 11_950, { turn: 1, step: 2, chunk: { type: 'text-delta', index: 0, text: 'h' } }),
        ev('assistant/message', 8, 12_000, { turn: 1, step: 2, usage: { inputTokens: 10, outputTokens: 1 } }),
      ],
    }))
    const flash = stats.perf?.byModel.flash
    expect(flash?.samples).toBe(2)
    expect(flash?.ttftMax).toBe(11_000)
    expect(flash?.ttftSpikes).toBe(1)
  })

  it('omits the perf field when no step produced a measurable sample', async () => {
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [header(1, 'deepseek-v4-flash'), message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE)],
    }))
    expect(stats.perf).toBeUndefined()
  })

  it('rolls perf samples by model and hour, with percentile latency stats', async () => {
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        ev('step/start', 1, 0, { turn: 1, step: 1 }),
        ev('request/header', 2, 100, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
        ev('assistant/chunk', 3, 200, { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'a' } }),
        ev('assistant/chunk', 4, 300, { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'b' } }),
        ev('assistant/message', 5, 1_000, { turn: 1, step: 1, usage: { inputTokens: 10, outputTokens: 50 } }),
      ] as unknown as SessionEvent[],
      'session-b': [
        ev('step/start', 1, 0, { turn: 1, step: 1 }),
        ev('request/header', 2, 100, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
        ev('assistant/chunk', 3, 400, { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'a' } }),
        ev('assistant/chunk', 4, 600, { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'b' } }),
        ev('assistant/message', 5, 1_000, { turn: 1, step: 1, usage: { inputTokens: 10, outputTokens: 50 } }),
      ] as unknown as SessionEvent[],
    }))
    const flash = stats.perf?.byModel.flash
    expect(flash?.samples).toBe(2)
    // TTFT：(200-100) + (400-100) = 100+300 → 均值 200。
    expect(flash?.ttftAvg).toBe(200)
    expect(flash?.ttftP50).toBe(200)
    // P90 线性插值 [100, 300] → 100 + 200×0.9。
    expect(flash?.ttftP90).toBeCloseTo(280, 6)
    // tokens/s：(50÷0.1) + (50÷0.2) → (500+250)/2。
    expect(flash?.tpsAvg).toBe(375)
    // 总延迟：两次都是 1000-100=900。
    expect(flash?.latencyAvg).toBe(900)
    expect(flash?.estimatedSamples).toBe(0)
    // 两个样本同属一个本地小时 → 小时桶 samples = 2。
    expect(Object.keys(stats.perf?.byHour ?? {}).length).toBe(1)
  })
})

describe('runLedgerMigrations', () => {
  /** 已含 `appliedMigrations: []` 的最简账本文档。 */
  const doc = (): UsageLedgerDocument => ({
    version: 1, updatedAt: 1, sessions: [], appliedMigrations: [],
  })

  it('applies an un-run migration and records its id', () => {
    const migrations: LedgerMigration[] = [{
      id: 'v2-rename-field',
      apply: (document) => { document.updatedAt = 2; return true },
    }]
    const document = doc()
    const changed = runLedgerMigrations(document, migrations)
    expect(changed).toBe(true)
    expect(document.updatedAt).toBe(2)
    expect(document.appliedMigrations).toEqual(['v2-rename-field'])
  })

  it('skips an already-applied migration (幂等)', () => {
    const id = 'v2-apply-once'
    let applied = 0
    const migrations: LedgerMigration[] = [{
      id,
      apply: (document) => { applied += 1; document.updatedAt = 2; return true },
    }]
    const document = doc()
    document.appliedMigrations = [id]
    const changed = runLedgerMigrations(document, migrations)
    expect(changed).toBe(false)
    expect(applied).toBe(0)
    expect(document.updatedAt).toBe(1)
  })

  it('keeps foreign applied ids and returns false when nothing to migrate', () => {
    const document = doc()
    document.appliedMigrations = ['v1-legacy']
    const changed = runLedgerMigrations(document, [])
    expect(changed).toBe(false)
    expect(document.appliedMigrations).toEqual(['v1-legacy'])
  })
})

describe('LEDGER_MIGRATIONS (fold-version-backfill)', () => {
  /** 已含 `appliedMigrations: []` 的最简账本文档。 */
  const doc = (sessions: UsageLedgerSession[]): UsageLedgerDocument => ({
    version: 1, updatedAt: 1, sessions, appliedMigrations: [],
  })

  it('backfills foldVersion = 1 on legacy rows without touching current rows', () => {
    // foldVersion 缺失 = 1.0.6 及更早的 header 归账行；FOLD_VERSION 行是当前算法，不动。
    const document = doc([
      { id: 'legacy-row', fold: legacyFold() },
      { id: 'current-row', foldVersion: FOLD_VERSION, fold: legacyFold() },
    ])
    const changed = runLedgerMigrations(document)
    expect(changed).toBe(true)
    expect(document.sessions[0]?.foldVersion).toBe(1)
    expect(document.sessions[1]?.foldVersion).toBe(FOLD_VERSION)
    expect(document.appliedMigrations).toContain('fold-version-backfill')
  })

  it('skips backfill once the migration id is recorded (幂等)', () => {
    const row: UsageLedgerSession = { id: 'already-1', foldVersion: 1, fold: legacyFold() }
    const document = doc([row])
    document.appliedMigrations = ['fold-version-backfill']
    const changed = runLedgerMigrations(document)
    expect(changed).toBe(false)
    expect(document.sessions[0]?.foldVersion).toBe(1)
  })
})

describe('ledger foldVersion / stale confidence', () => {
  it('marks ledger-only legacy rows as stale and counts them for the UI notice', async () => {
    // 兜底场景：会话列表为空（日志已删），只剩账本里一条 foldVersion 缺失的旧行。
    const { store, saved, current } = fakeLedgerStore([{ id: 'old-session', fold: legacyFold() }])
    const stats = await aggregateUsage(fakePersistence({}), { ledger: store })

    expect(stats.total.calls).toBe(2)
    expect(stats.staleLedgerSessions).toBe(1)
    const row = stats.bySession.find(entry => entry.id === 'old-session')
    expect(row?.stale).toBe(true)

    // 加载边界执行了回填迁移，且修改触发了重新落盘。
    expect(saved.length).toBeGreaterThan(0)
    expect(current().appliedMigrations).toContain('fold-version-backfill')
    expect(current().sessions[0]?.foldVersion).toBe(1)
  })

  it('treats current-version rows as trusted (no stale marker, no notice count)', async () => {
    const { store, saved, current } = fakeLedgerStore([{ id: 'fresh-session', foldVersion: FOLD_VERSION, fold: legacyFold() }])
    const stats = await aggregateUsage(fakePersistence({}), { ledger: store })

    expect(stats.total.calls).toBe(2)
    expect(stats.bySession[0]?.stale).toBeUndefined()
    // exactOptionalPropertyTypes：无旧行时不带 key，UI 判空逻辑不必区分 0 与缺省。
    expect(Object.hasOwn(stats, 'staleLedgerSessions')).toBe(false)
    // 无可回填行也会因首次记录迁移 id 落盘一次（此后幂等跳过）。
    expect(saved).toHaveLength(1)
    expect(current().appliedMigrations).toContain('fold-version-backfill')
    expect(current().sessions[0]?.foldVersion).toBe(FOLD_VERSION)
  })
})

describe('hostTimeZone', () => {
  it('reports a non-empty IANA name and a formatted UTC offset', () => {
    const tz = hostTimeZone()
    expect(typeof tz.name).toBe('string')
    expect(tz.name.length).toBeGreaterThan(0)
    expect(tz.offset).toMatch(/^UTC[+-]\d{2}:\d{2}$/)
  })

  it('derives the offset from the given instant (UTC+08:00)', () => {
    const tz = hostTimeZone(new Date('2026-08-24T04:00:00+08:00'))
    expect(tz.offset).toMatch(/^UTC[+-]\d{2}:\d{2}$/)
  })
})
