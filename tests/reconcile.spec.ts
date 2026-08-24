/**
 * 余额差对账单元测试：基准快照的打点/重置，以及用官方余额当日变动反推消费、
 * 与本地账本今日官方费用比对的 drifting/ok/flat 判定。
 */

import { describe, expect, it } from 'vitest'
import { reconcileBalanceDelta } from '../src/reconcile.ts'

const DAY = '2026-08-16'

describe('reconcileBalanceDelta', () => {
  it('sets a baseline on the first observation (无基准) and does not reconcile', () => {
    const result = reconcileBalanceDelta(null, { totalBalance: 100, currency: 'CNY' }, 0, DAY, 1_000)
    expect(result.event?.kind).toBe('baseline')
    expect(result.ref).toMatchObject({ date: DAY, total: 100, currency: 'CNY' })
  })

  it('resets the baseline when the day rolls over', () => {
    const prev = { date: '2026-08-15', total: 100, granted: 0, topped: 0, currency: 'CNY', at: 1_000 }
    const result = reconcileBalanceDelta(prev, { totalBalance: 90, currency: 'CNY' }, 0, DAY, 2_000)
    expect(result.event?.kind).toBe('baseline')
    expect(result.ref).toMatchObject({ date: DAY, total: 90, currency: 'CNY' })
  })

  it('resets the baseline when the currency changes (金额不可比)', () => {
    const prev = { date: DAY, total: 100, granted: 0, topped: 0, currency: 'CNY', at: 1_000 }
    const result = reconcileBalanceDelta(prev, { totalBalance: 100, currency: 'USD' }, 0, DAY, 2_000)
    expect(result.event?.kind).toBe('structure-reset')
    expect(result.ref?.currency).toBe('USD')
  })

  it('resets the baseline when a top-up / grant increases a sub-balance', () => {
    const prev = { date: DAY, total: 100, granted: 0, topped: 1, currency: 'CNY', at: 1_000 }
    const result = reconcileBalanceDelta(prev, { totalBalance: 100, grantedBalance: 0, toppedUpBalance: 11, currency: 'CNY' }, 0, DAY, 2_000)
    expect(result.event?.kind).toBe('structure-reset')
  })

  it('stays flat when the balance did not decrease (订阅/无官方消费)', () => {
    const prev = { date: DAY, total: 100, granted: 0, topped: 0, currency: 'CNY', at: 1_000 }
    const result = reconcileBalanceDelta(prev, { totalBalance: 100, currency: 'CNY' }, 0, DAY, 2_000)
    expect(result.event?.kind).toBe('flat')
  })

  it('reports ok when the balance drop matches the local ledger close enough', () => {
    const prev = { date: DAY, total: 100, granted: 0, topped: 0, currency: 'CNY', at: 1_000 }
    const result = reconcileBalanceDelta(prev, { totalBalance: 95, currency: 'CNY' }, 5, DAY, 2_000)
    expect(result.event?.kind).toBe('ok')
    expect(result.event).toMatchObject({ spent: 5, todayOfficialCost: 5 })
  })

  it('reports drift when the balance drop deviates beyond the threshold', () => {
    const prev = { date: DAY, total: 100, granted: 0, topped: 0, currency: 'CNY', at: 1_000 }
    // 余额掉了 20，但本地账本只记了 2 —— 偏差远超相对/绝对阈值。
    const result = reconcileBalanceDelta(prev, { totalBalance: 80, currency: 'CNY' }, 2, DAY, 2_000)
    expect(result.event?.kind).toBe('drift')
    expect(result.event).toMatchObject({ spent: 20, todayOfficialCost: 2 })
  })

  it('returns null event when no total balance is available', () => {
    const result = reconcileBalanceDelta(null, { totalBalance: undefined, currency: 'CNY' }, 5, DAY, 2_000)
    expect(result.event).toBeNull()
  })
})
