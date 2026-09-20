/**
 * 第三种显示币种（EUR）与语言解耦：换算口径、符号、以及「首次读取从币种播种
 * 一次」的迁移语义——升级后现有用户的界面语言不得静默改变。
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { applyLivePricing, convertFromCny, formatMoney, formatUnitPrice, convertUnitPrice, getEurRateInfo, EUR_TO_CNY } from '../src/client/pricing.ts'
import {
  CURRENCY_STORAGE_KEY, LANGUAGE_STORAGE_KEY, loadCurrency, loadLanguage, saveCurrency, saveLanguage,
} from '../src/client/usage-billing-settings.ts'

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

describe('EUR display currency', () => {
  it('falls back to the built-in rate before any live pricing arrives', () => {
    expect(getEurRateInfo().live).toBe(false)
    expect(convertFromCny(EUR_TO_CNY, 'eur')).toBeCloseTo(1, 10)
  })

  it('uses the live euro rate once pricing lands', () => {
    applyLivePricing({ source: 'live', rate: 7, rateEur: 8 })
    expect(getEurRateInfo()).toMatchObject({ rate: 8, live: true })
    expect(convertFromCny(80, 'eur')).toBeCloseTo(10, 10)
    // USD 与 CNY 不受欧元汇率影响。
    expect(convertFromCny(70, 'usd')).toBeCloseTo(10, 10)
    expect(convertFromCny(42, 'cny')).toBe(42)
  })

  it('keeps the built-in rate when the wire value is invalid', () => {
    applyLivePricing({ source: 'live', rate: 7, rateEur: 0 })
    expect(getEurRateInfo().live).toBe(false)
    applyLivePricing({ source: 'live', rate: 7, rateEur: Number.NaN })
    expect(getEurRateInfo().live).toBe(false)
  })

  it('formats euro amounts with the euro symbol', () => {
    expect(formatMoney(12.3, 'eur')).toBe('€12.3')
    expect(formatMoney(0, 'eur')).toBe('€0')
    expect(formatMoney(Number.NaN, 'eur')).toBe('€0')
    expect(formatUnitPrice(3, 'EUR')).toBe('€3.00')
  })

  it('converts unit prices from either native currency into euro', () => {
    applyLivePricing({ source: 'live', rate: 7, rateEur: 8 })
    // USD 原生：先 ×7 回人民币，再 ÷8 到欧元。
    expect(convertUnitPrice(8, 'USD', 'eur', 7)).toBeCloseTo(7, 6)
    // CNY 原生：直接 ÷8。
    expect(convertUnitPrice(16, 'CNY', 'eur', 7)).toBeCloseTo(2, 6)
  })
})

describe('language decoupled from currency', () => {
  beforeEach(stubStorage)

  it('seeds English once for an existing USD user, so nothing flips on upgrade', () => {
    saveCurrency('usd')
    expect(loadLanguage()).toBe('en')
    // 播种后写回：此后与币种无关。
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en')
    saveCurrency('cny')
    expect(loadLanguage()).toBe('en')
  })

  it('seeds Chinese for an existing CNY user', () => {
    saveCurrency('cny')
    expect(loadLanguage()).toBe('zh')
  })

  it('keeps an explicit choice regardless of currency', () => {
    saveLanguage('zh')
    saveCurrency('usd')
    expect(loadLanguage()).toBe('zh')
  })

  it('accepts eur as a stored currency', () => {
    saveCurrency('eur')
    expect(loadCurrency()).toBe('eur')
    localStorage.setItem(CURRENCY_STORAGE_KEY, 'gbp')
    expect(loadCurrency()).toBe('cny')
  })
})
