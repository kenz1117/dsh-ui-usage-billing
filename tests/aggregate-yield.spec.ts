/**
 * 聚合让出事件循环（issue #104，#105 改为墙钟分片）。
 *
 * 整轮折叠的主体是同步 CPU 计算，会话之间的 await 只排微任务——微任务队列
 * 排空前事件循环不会回到 poll 阶段，宿主的定时器 / RPC / 静态资源请求被
 * 连续饿死（重度用户升级后一次性重折数百个会话 → 整个 DSH 界面卡死）。
 *
 * 让出节拍是**墙钟**（FOLD_SLICE_MS ≈ 8ms）：自上一片让出点累计超预算就让出，
 * 与单个会话/分片的体积无关（计数分片挡不住 35MB 级单日志连堵数秒）。小折叠
 * 本来就瞬时、不需要让出——所以本用例给每次读取造出真实耗时，让折叠确实
 * 跨过让出预算。
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

/** 内存 persistence 替身：N 个会话，每次读取真实等待 delayMs（造出折叠时长）。 */
function fakePersistence(count: number, delayMs: number): UsagePersistence {
  const logs: Record<string, SessionEvent[]> = {}
  for (let index = 0; index < count; index += 1) {
    logs[`s${String(index)}`] = [header(1, 'deepseek-v4-flash'), message(2, USAGE)]
  }
  return {
    list: async () => Object.keys(logs).map(id => ({ id })),
    readFrom: async (id: SessionId, fromSeq: number) => {
      if (delayMs > 0) await new Promise(resolve => { setTimeout(resolve, delayMs) })
      return {
        meta: { id },
        inheritedEventCount: 0,
        events: (logs[id] ?? []).filter(event => event.seq >= fromSeq),
      }
    },
  } as unknown as UsagePersistence
}

describe('aggregate yields to the event loop (issue #104/#105)', () => {
  it('lets host timers run while the fold is still in progress', async () => {
    // 8 个会话 × 3ms 读取 ≈ 24ms 折叠：远超 8ms 让出预算，折叠中途必有让出，
    // 宿主侧的 setImmediate 在折叠结束前就被服务。
    const aggregator = createUsageAggregator(fakePersistence(8, 3))
    let hostTimerFired = false
    // 宿主侧的定时器：折叠期间就该跑，而不是等折叠全部结束。
    setImmediate(() => { hostTimerFired = true })
    await aggregator.aggregate()
    expect(hostTimerFired).toBe(true)
  })

  it('still aggregates every session', async () => {
    const aggregator = createUsageAggregator(fakePersistence(12, 0))
    const doc = await aggregator.aggregate()
    expect(doc.bySession).toHaveLength(12)
    expect(doc.total.calls).toBe(12)
  })
})
