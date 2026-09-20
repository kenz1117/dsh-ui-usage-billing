/**
 * 费率表附加行文案本地化：中文数据层文案 → 英文展示名，未收录原样返回。
 */

import { describe, expect, it } from 'vitest'

import { localizeRowLabel } from '../src/client/label-display.ts'

describe('localizeRowLabel', () => {
  it('maps the catalog row labels to English', () => {
    expect(localizeRowLabel('显式缓存创建', 'en')).toBe('Explicit cache write')
    expect(localizeRowLabel('长期半价', 'en')).toBe('Half price')
  })

  it('leaves the data layer untouched in Chinese', () => {
    expect(localizeRowLabel('显式缓存创建', 'zh')).toBe('显式缓存创建')
  })

  it('returns unmapped text as-is so the table never blanks out', () => {
    expect(localizeRowLabel('Batch File', 'en')).toBe('Batch File')
    expect(localizeRowLabel('未收录文案', 'en')).toBe('未收录文案')
  })

  it('passes undefined through for rows without a note', () => {
    expect(localizeRowLabel(undefined, 'en')).toBeUndefined()
  })
})
