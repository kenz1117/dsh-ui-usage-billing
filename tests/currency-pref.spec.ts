// Display-currency preference (issue #58).
/**
 * 币种选择的持久化：仪表盘、侧边栏卡片与输入框胶囊分属不同 React 树，
 * 共享同一条 localStorage 偏好 + CustomEvent 广播，因此弹窗关闭后仍然保留。
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { CURRENCY_STORAGE_KEY, DEFAULT_CURRENCY, loadCurrency, saveCurrency } from '../src/client/usage-billing-settings.ts'

/** 最小 localStorage 替身（node 环境没有 window）。 */
function stubStorage(): void {
  const store = new Map<string, string>()
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, String(v)) },
    removeItem: (k: string) => { store.delete(k) },
    clear: () => { store.clear() },
    key: () => null,
    length: 0,
  } as unknown as Storage
}

describe('display currency preference', () => {
  beforeEach(stubStorage)

  it('defaults to CNY when nothing was ever stored', () => {
    expect(loadCurrency()).toBe(DEFAULT_CURRENCY)
    expect(loadCurrency()).toBe('cny')
  })

  it('survives a remount: saved value is what the next load returns', () => {
    saveCurrency('usd')
    // 重新读取 = 新挂载的组件用 useState(() => loadCurrency()) 拿到的初值。
    expect(loadCurrency()).toBe('usd')
    saveCurrency('cny')
    expect(loadCurrency()).toBe('cny')
  })

  it('falls back to the default on a corrupted or unknown value', () => {
    // 'eur' 自 issue #69 起是合法币种，这里改用仍未支持的代码。
    localStorage.setItem(CURRENCY_STORAGE_KEY, 'gbp')
    expect(loadCurrency()).toBe('cny')
    localStorage.setItem(CURRENCY_STORAGE_KEY, '{"not":"a currency"}')
    expect(loadCurrency()).toBe('cny')
  })

  it('never throws when storage is unavailable', () => {
    globalThis.localStorage = {
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('denied') },
    } as unknown as Storage
    expect(() => saveCurrency('usd')).not.toThrow()
    expect(loadCurrency()).toBe('cny')
  })
})
