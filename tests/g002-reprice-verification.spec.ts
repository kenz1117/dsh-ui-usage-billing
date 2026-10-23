/**
 * g-002 真实日志折叠验证（修复验收）：
 * 复现真机「预热折叠早于 live 定价注入」的双口径——foldSession 折叠含
 * step-6-preview 的日志时价目表未就绪 → cost=0、落 unpricedModels；
 * 注：step-6-preview 必须保持「不在内置目录」，它是本用例的目录外样本——
 * 若哪天把它补进 src/builtin-catalog.ts，用例会失去「未收录 → 后到价」的前提。
 * 随后 applyLivePricing 注入 models.dev 价目表，经 createUsageAggregator
 * 的惰性失效重折 → step-6-preview 折出 cost>0，total.cost 与 byModel
 * 之和一致（不再「明细比总额高」）。
 *
 * 运行：npx vitest run tests/g002-reprice-verification.spec.ts
 */
import { applyBuiltinCatalog, applyLivePricing } from '../src/client/pricing.ts'
import { BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES } from '../src/builtin-catalog.ts'

applyBuiltinCatalog(BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES)

import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { AGGREGATE_TTL_MS, createUsageAggregator, foldSession, type UsagePersistence } from '../src/aggregate.ts'

/** 真机日志形态：header + step + assistant/message（usage 带缓存桶），模型 step-6-preview。 */
function header(seq: number, model: string, provider = 'deepseek-official'): SessionEvent {
  return {
    type: 'request/header', seq, time: 1_000,
    data: { header: { config: { provider, model, reasoningEffort: 'high', maxTokens: 256_000 }, version: 1, id: 's', createdAt: 0, cwd: '/tmp', agentPreset: 'standard' }, reason: 'initial' },
  } as unknown as SessionEvent
}
function message(seq: number, time: number, model: string, usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number }): SessionEvent {
  return {
    type: 'assistant/message', seq, time,
    data: { turn: 1, step: 1, message: { role: 'assistant', content: [] }, source: { kind: 'model', provider: 'deepseek-official', model }, usage },
  } as unknown as SessionEvent
}

describe('g-002 真实日志折叠：step-6-preview 双口径修复验证', () => {
  afterEach(() => {
    vi.useRealTimers()
    applyLivePricing({ source: 'builtin' })
  })

  it('价目表未就绪时 cost=0 → 就绪后重折 cost>0 且 total=ΣbyModel', async () => {
    vi.useFakeTimers()
    // 真机当日形态：flash / glm-5.3-flash 内置价可计，step-6-preview 目录外。
    const T = Date.UTC(2026, 9, 12, 4, 0, 0)
    const logs: Record<string, SessionEvent[]> = {
      s1: [
        header(1, 'step-6-preview'),
        message(2, T, 'step-6-preview', { inputTokens: 12_000, outputTokens: 3_000, cacheReadTokens: 40_000, cacheWriteTokens: 2_000 }),
        { type: 'assistant/message', seq: 3, time: T + 1_000, data: { turn: 1, step: 2, message: { role: 'assistant', content: [] }, source: { kind: 'model', provider: 'deepseek-official', model: 'step-6-preview' }, usage: { inputTokens: 10_000, outputTokens: 2_500, cacheReadTokens: 30_000, cacheWriteTokens: 1_000 } } } as unknown as SessionEvent,
      ],
      s2: [header(1, 'deepseek-v4-flash'), message(2, T, 'deepseek-v4-flash', { inputTokens: 100, outputTokens: 50, cacheReadTokens: 800, cacheWriteTokens: 20 })],
    }
    const persistence = {
      list: async () => Object.keys(logs).map(id => ({ id })),
      readFrom: async (id: SessionId, fromSeq: number) => ({ meta: { id }, events: (logs[String(id)] ?? []).filter(e => e.seq >= fromSeq) }),
    } as unknown as UsagePersistence
    const aggregator = createUsageAggregator(persistence)

    // ① 预热折叠时刻：价目表未就绪（builtin，无 step-6-preview）——复现 bug。
    const before = await aggregator.aggregate()
    const cellBefore = before.byModel['step-6-preview']
    expect(cellBefore?.cost ?? 0).toBe(0)
    expect(before.unpricedModels).toContain('step-6-preview')
    // bug 形态：明细行 cost=0 → 显示层走 estimated 兜底 ≈¥38，与 total 双口径。
    const totalBeforeByModel = Object.values(before.byModel).reduce((s, r) => s + r.cost, 0)
    expect(before.total.cost).toBeCloseTo(totalBeforeByModel, 6)

    // ② refreshPricing 完成 → applyLivePricing 注入 models.dev 价目表（真机≈$2.00/$8.00 per 1M）。
    applyLivePricing({
      source: 'live',
      rate: 7,
      extraModels: [{ key: 'step-6-preview', name: 'Step 5 Preview', provider: 'Step', price: { input: 2, cacheHit: 0.2, output: 8 } }],
    })
    vi.advanceTimersByTime(AGGREGATE_TTL_MS + 1000)
    const after = await aggregator.aggregate()

    // ③ 修复判定：step-6-preview 重折出 cost>0，与显示层目录价口径对齐。
    const cellAfter = after.byModel['step-6-preview']
    expect(cellAfter?.cost ?? 0).toBeGreaterThan(0)
    expect(after.unpricedModels ?? []).not.toContain('step-6-preview')
    // ④ total.cost 与 byModel 之和一致（无双口径）。
    const byModelSum = Object.values(after.byModel).reduce((s, r) => s + r.cost, 0)
    expect(after.total.cost).toBeCloseTo(byModelSum, 6)
    // 与 foldSession 直接折叠同一份日志权威值一致（服务端重折 = 干净全量折叠）。
    const direct = foldSession(logs.s1 ?? [], new Set())
    expect(cellAfter?.cost).toBeCloseTo(direct.total.cost, 10)
    expect(direct.total.cost).toBeGreaterThan(0)

  })
})
