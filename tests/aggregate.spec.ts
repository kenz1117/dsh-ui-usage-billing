/**
 * Aggregation unit tests: log folding attributes each call to the model of the
 * preceding `request/header`, splits tokens into cache buckets, prices only
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
  aggregateUsage, createUsageAggregator, dayStamp, foldSession, foldUsage, emptyUsage, workspaceNameOf,
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
    const at = (beijingHour: number): number => Date.UTC(2026, 7, 15, (beijingHour + 24 - 8) % 24)
    foldUsage(peak, USAGE, 'flash', false, at(10))
    foldUsage(off, USAGE, 'flash', false, at(13))
    expect(peak.cost).toBeGreaterThan(off.cost)
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
  const ev = (type: string, seq: number, time: number, data: Record<string, unknown>): { type: string; time: number; data: never } =>
    ({ type, seq, time, data }) as { type: string; time: number; data: never }

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
})

describe('dayStamp', () => {
  it('formats the local date of a timestamp', () => {
    // 2026-08-15 12:00 UTC 在 UTC+8 是 2026-08-15 20:00。
    expect(dayStamp(Date.UTC(2026, 7, 15, 12, 0, 0))).toMatch(/^2026-08-1[5-6]$/)
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
