// @vitest-environment jsdom
/**
 * 上下文占用 store 的契约：投影转发 → 仪表盘消费。
 *
 * 关键语义：
 * - 无数据时 read() 返回 undefined（界面整块隐藏，**不显示 0**）。
 * - 同值重发布不触发订阅者（引用稳定，避免无谓重渲染）。
 * - 占用率缺任一要素（占用或窗口容量）时为 undefined——不以 0 冒充。
 * - 构成拆解是**启发式估算**，三项之和与 provider 锚定的占用不相等，界面不得把它
 *   当成总量（这与宿主投影自身的口径一致）。
 */

import { describe, expect, it } from 'vitest'
import { createContextStore, occupancyBreakdown, occupancyRatio } from '../src/client/context-store.ts'

describe('context store', () => {
  it('starts empty and reports no occupancy', () => {
    const store = createContextStore()
    expect(store.read()).toBeUndefined()
    expect(occupancyRatio(store.read())).toBeUndefined()
    expect(occupancyBreakdown(store.read())).toEqual([])
  })

  it('publishes a snapshot and notifies subscribers once', () => {
    const store = createContextStore()
    const seen: (number | undefined)[] = []
    const unsubscribe = store.subscribe(value => { seen.push(value?.projectedTokens) })

    store.publish({ projectedTokens: 1200, contextWindow: 8000 })
    expect(seen).toEqual([undefined, 1200])
    expect(store.read()?.projectedTokens).toBe(1200)

    unsubscribe()
    store.publish({ projectedTokens: 2400 })
    expect(seen).toEqual([undefined, 1200])
  })

  it('keeps the snapshot identity stable for equal values', () => {
    const store = createContextStore()
    store.publish({ projectedTokens: 100, contextWindow: 1000 })
    const first = store.read()
    store.publish({ projectedTokens: 100, contextWindow: 1000 })
    expect(store.read()).toBe(first)
  })

  it('computes the occupancy ratio only when both sides are known', () => {
    expect(occupancyRatio({ projectedTokens: 500, contextWindow: 1000 })).toBe(0.5)
    expect(occupancyRatio({ projectedTokens: 500 })).toBeUndefined()
    expect(occupancyRatio({ contextWindow: 1000 })).toBeUndefined()
    expect(occupancyRatio({ projectedTokens: 500, contextWindow: 0 })).toBeUndefined()
    // 超出窗口时封顶到 1（不画超过 100% 的进度）。
    expect(occupancyRatio({ projectedTokens: 2000, contextWindow: 1000 })).toBe(1)
  })

  it('falls back to the provider-reported pressure when no projection exists', () => {
    expect(occupancyRatio({ pressureTokens: 250, contextWindow: 1000 })).toBe(0.25)
  })

  it('lists the breakdown rows in a fixed order', () => {
    const rows = occupancyBreakdown({ systemTokens: 10, toolsTokens: 20, messageTokens: 30 })
    expect(rows.map(row => row.key)).toEqual(['system', 'tools', 'message'])
    expect(rows.map(row => row.tokens)).toEqual([10, 20, 30])
  })
})
