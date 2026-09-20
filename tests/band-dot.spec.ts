/**
 * 峰谷指示点状态映射：无档位不渲染、临近切换优先、边界包含。
 */

import { describe, expect, it } from 'vitest'
import { bandStateOf } from '../src/client/band-dot.ts'

const LEAD = 10 * 60_000

describe('bandStateOf', () => {
  it('renders nothing for a model with no band', () => {
    // 未收录 / 无峰谷的模型不得被臆造出一个档位。
    expect(bandStateOf(null, LEAD)).toBeNull()
    expect(bandStateOf(undefined, LEAD)).toBeNull()
  })

  it('reports the current tier when a switch is far away', () => {
    expect(bandStateOf({ tier: 'offPeak', nextSwitchInMs: 3 * 3600_000 }, LEAD)).toBe('offPeak')
    expect(bandStateOf({ tier: 'peak', nextSwitchInMs: 2 * 3600_000 }, LEAD)).toBe('peak')
  })

  it('prefers "soon" over the current tier near a switch, in both directions', () => {
    expect(bandStateOf({ tier: 'offPeak', nextSwitchInMs: 4 * 60_000 }, LEAD)).toBe('soon')
    expect(bandStateOf({ tier: 'peak', nextSwitchInMs: 9 * 60_000 }, LEAD)).toBe('soon')
  })

  it('treats the lead boundary as inclusive', () => {
    expect(bandStateOf({ tier: 'peak', nextSwitchInMs: LEAD }, LEAD)).toBe('soon')
    expect(bandStateOf({ tier: 'peak', nextSwitchInMs: LEAD + 1 }, LEAD)).toBe('peak')
  })

  it('falls back to the tier when the countdown is not a finite number', () => {
    expect(bandStateOf({ tier: 'peak', nextSwitchInMs: Number.NaN }, LEAD)).toBe('peak')
    expect(bandStateOf({ tier: 'offPeak', nextSwitchInMs: Number.POSITIVE_INFINITY }, LEAD)).toBe('offPeak')
  })
})
