/**
 * 聚合让出事件循环（issue #104）。
 *
 * 整轮折叠的主体是同步 CPU 计算，会话之间的 await 只排微任务——微任务队列
 * 排空前事件循环不会回到 poll 阶段，宿主的定时器 / RPC / 静态资源请求被
 * 连续饿死（重度用户升级后一次性重折数百个会话 → 整个 DSH 界面卡死）。
 *
 * 这里验证折叠过程中宿主仍有机会被服务：折叠还没结束，宿主侧的定时器已经
 * 跑过（未修时它只能在折叠全部结束后才跑）。
 */

import { describe, expect, it } from 'vitest'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TokenUsage } from '@deepseek-ai/dsh-llm'
import { createUsageAggregator, type UsagePersistence } from '../src/aggregate.ts'

/** 最小 `request/header` 事件：记录当前模型与供应商。 */
function header(seq: number, model: string): SessionEvent {
  return {
    type: 'request/header', seq, time: 1_000,
    data: { header: { config: { provider: 'deepseek-official', model, reasoningEffort: 'high', maxTokens: 256_000 }, version: 1, id: 's', createdAt: 0, cwd: '/tmp', agentPreset: 'standard' }, reason: 'initial' },
  } as unknown as SessionEvent
}

/** 最小 `assistant/message` 事件：携一次用量。 */
function message(seq: number, usage: TokenUsage): SessionEvent {
  return {
    type: 'assistant/message', seq, time: 1_000,
    data: { turn: 1, step: 1, message: { role: 'assistant', content: [] }, usage },
  } as unknown as SessionEvent
}

const USAGE: TokenUsage = { inputTokens: 100, outputTokens: 50, cacheReadTokens: 800 }

/** 内存 persistence 替身：N 个会话，各一条用量事件（全部走全量重折路径）。 */
function fakePersistence(count: number): UsagePersistence {
  const logs: Record<string, SessionEvent[]> = {}
  for (let index = 0; index < count; index += 1) {
    logs[`s${String(index)}`] = [header(1, 'deepseek-v4-flash'), message(2, USAGE)]
  }
  return {
    list: async () => Object.keys(logs).map(id => ({ id })),
    readFrom: async (id: SessionId, fromSeq: number) => ({
      meta: { id },
      inheritedEventCount: 0,
      events: (logs[id] ?? []).filter(event => event.seq >= fromSeq),
    }),
  } as unknown as UsagePersistence
}

describe('aggregate yields to the event loop (issue #104)', () => {
  it('lets host timers run while the fold is still in progress', async () => {
    // 12 个会话 > 让出粒度（8）：折叠中途必须有一次让出。
    const aggregator = createUsageAggregator(fakePersistence(12))
    let hostTimerFired = false
    // 宿主侧的定时器：折叠期间就该跑，而不是等折叠全部结束。
    setImmediate(() => { hostTimerFired = true })
    await aggregator.aggregate()
    expect(hostTimerFired).toBe(true)
  })

  it('still aggregates every session', async () => {
    const aggregator = createUsageAggregator(fakePersistence(12))
    const doc = await aggregator.aggregate()
    expect(doc.bySession).toHaveLength(12)
    expect(doc.total.calls).toBe(12)
  })
})
