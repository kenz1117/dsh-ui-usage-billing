/**
 * 费率表搜索判定：大小写、空白、缺字段与空查询语义。
 */

import { describe, expect, it } from 'vitest'
import { filterRateRows } from '../src/client/rate-search.ts'

const ROWS = [
  { key: 'claude-opus-5', name: 'Claude Opus 5', provider: 'Anthropic' },
  { key: 'qwen-3.8-max', name: 'Qwen3.8 Max', provider: '阿里通义' },
  { key: 'glm-5.1', name: 'GLM-5.1', provider: '智谱 AI' },
  { key: 'bare-key-only' },
]

describe('filterRateRows', () => {
  it('matches the catalog key, the display name and the vendor', () => {
    expect(filterRateRows(ROWS, 'opus').map(r => r.key)).toEqual(['claude-opus-5'])
    expect(filterRateRows(ROWS, 'Qwen3.8').map(r => r.key)).toEqual(['qwen-3.8-max'])
    expect(filterRateRows(ROWS, '智谱').map(r => r.key)).toEqual(['glm-5.1'])
  })

  it('ignores case', () => {
    expect(filterRateRows(ROWS, 'ANTHROPIC').map(r => r.key)).toEqual(['claude-opus-5'])
    expect(filterRateRows(ROWS, 'gLm-5').map(r => r.key)).toEqual(['glm-5.1'])
  })

  it('returns the input unchanged for an empty or whitespace-only query', () => {
    // 同一引用：默认视图不产生新数组，避免无谓的重渲染。
    expect(filterRateRows(ROWS, '')).toBe(ROWS)
    expect(filterRateRows(ROWS, '   ')).toBe(ROWS)
  })

  it('trims the query before matching', () => {
    expect(filterRateRows(ROWS, '  opus  ').map(r => r.key)).toEqual(['claude-opus-5'])
  })

  it('tolerates rows without a name or provider', () => {
    // models.dev 补充条目不保证两个字段都在。
    expect(filterRateRows(ROWS, 'bare').map(r => r.key)).toEqual(['bare-key-only'])
    expect(() => filterRateRows(ROWS, 'anything')).not.toThrow()
  })

  it('returns an empty list when nothing matches', () => {
    expect(filterRateRows(ROWS, 'no-such-model')).toHaveLength(0)
  })
})
