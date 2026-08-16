/**
 * Aggregation unit tests: log folding attributes each call to the model of the
 * preceding `request/header`, splits tokens into cache buckets, prices only
 * catalog models, and rolls totals up by model and by day.
 */

import { describe, expect, it } from 'vitest'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { TokenUsage } from '@deepseek-ai/dsh-llm'
import {
  aggregateUsage, dayStamp, foldUsage, emptyUsage, type UsagePersistence,
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
  return {
    list: async () => Object.keys(logs).map(id => ({ id })),
    readFrom: async (id, fromSeq) => ({
      meta: { id },
      events: logs[id].filter(event => event.seq >= fromSeq),
    }),
  } as unknown as UsagePersistence
}

describe('foldUsage', () => {
  it('accumulates calls and splits tokens into cache buckets', () => {
    const acc = emptyUsage()
    foldUsage(acc, USAGE, 'flash', false)
    expect(acc.calls).toBe(1)
    expect(acc.cacheHit).toBe(800)
    expect(acc.cacheMiss).toBe(120) // inputTokens 100 + cacheWriteTokens 20
    expect(acc.input).toBe(920) // 100 + 800 + 20 = 总输入
    expect(acc.output).toBe(50)
  })

  it('prices catalog models and leaves unknown models free', () => {
    const known = emptyUsage()
    foldUsage(known, USAGE, 'flash', false)
    expect(known.cost).toBeGreaterThan(0)

    const unknown = emptyUsage()
    foldUsage(unknown, USAGE, 'mimo-v2-pro', false) // 目录外的模型
    expect(unknown.cost).toBe(0)
  })

  it('charges nothing for subscription-plan calls even when the model id collides with the catalog', () => {
    // 订阅 provider 的模型 id 即使撞名计费表（kimi-k3 有价），也一律免费。
    const acc = emptyUsage()
    foldUsage(acc, USAGE, 'kimi-k3', true)
    expect(acc.calls).toBe(1)
    expect(acc.cost).toBe(0)
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
    const total = stats.total as { calls: number; cost: number }
    expect(total.calls).toBe(2)
    const flash = (stats.byModel as Record<string, { calls: number; cost: number }>).flash
    expect(flash.calls).toBe(2)
    expect(flash.cost).toBeGreaterThan(0)
  })

  it('groups usage by local day', async () => {
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        header(1, 'deepseek-v4-flash'),
        message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE),
        message(3, Date.UTC(2026, 7, 16, 4, 0, 0), USAGE),
      ],
    }))
    const days = Object.keys(stats.byDay as Record<string, unknown>)
    expect(days).toHaveLength(2)
  })

  it('keeps unknown (subscription) models free while counting their tokens', async () => {
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        header(1, 'mimo-v2-pro'),
        message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE),
      ],
    }))
    const byModel = stats.byModel as Record<string, { calls: number; cost: number; cacheHit: number }>
    expect(byModel['mimo-v2-pro']?.calls).toBe(1)
    expect(byModel['mimo-v2-pro']?.cost).toBe(0)
    expect(byModel['mimo-v2-pro']?.cacheHit).toBe(800)
  })

  it('waives cost for subscription providers even when their model id is in the catalog', async () => {
    // kimi-coding 是订阅 provider：用它跑 deepseek-v4-flash（计费表有价）也不计费。
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        header(1, 'deepseek-v4-flash', 'kimi-coding'),
        message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE),
      ],
    }))
    const flash = (stats.byModel as Record<string, { calls: number; cost: number }>).flash
    expect(flash.calls).toBe(1)
    expect(flash.cost).toBe(0)
  })

  it('rolls multiple sessions into one total', async () => {
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [header(1, 'deepseek-v4-flash'), message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE)],
      'session-b': [header(1, 'deepseek-v4-flash'), message(2, Date.UTC(2026, 7, 15, 5, 0, 0), USAGE)],
    }))
    const total = stats.total as { calls: number }
    expect(total.calls).toBe(2)
  })
})
