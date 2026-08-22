/**
 * Custom-balance extract rule tests: path traversal, add/subtract over multiple
 * paths, divide scaling (NewApi quota), and const literals.
 */

import { describe, expect, it } from 'vitest'
import { evalExtract } from '../src/balance.ts'

describe('evalExtract', () => {
  const DATA = {
    data: {
      total_available: 1_000_000,
      total_granted: 2_000_000,
      total_used: 500_000,
      cash: 100,
      voucher: 50,
    },
  }

  it('reads a dotted path', () => {
    expect(evalExtract({ path: 'data.total_used' }, DATA)).toBe(500_000)
  })

  it('adds and subtracts multiple paths', () => {
    expect(evalExtract({ op: 'add', paths: ['data.cash', 'data.voucher'] }, DATA)).toBe(150)
    expect(evalExtract({ op: 'subtract', paths: ['data.cash', 'data.voucher'] }, DATA)).toBe(50)
  })

  it('divides by a scale factor (NewApi quota conversion)', () => {
    expect(evalExtract({ op: 'divide', path: 'data.total_available', by: 500_000 }, DATA)).toBe(2)
  })

  it('returns a const literal and undefined on missing/zero-divisor', () => {
    expect(evalExtract({ const: 42 }, {})).toBe(42)
    expect(evalExtract({ path: 'data.missing' }, DATA)).toBeUndefined()
    expect(evalExtract({ op: 'divide', path: 'data.total_available', by: 0 }, DATA)).toBeUndefined()
  })
})
