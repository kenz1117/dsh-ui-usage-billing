/**
 * 汇率源降级链：腾讯行情与 open.er-api.com 都失败时，落到 AllRatesToday
 * 免 key 端点（与 open.er-api.com 同结构）；全部失败时不返回汇率。
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('fetchLivePricing rate fallback', () => {
  it('uses AllRatesToday when Tencent and open.er-api both fail', async () => {
    const fetchMock = vi.fn((input: string | URL) => {
      const url = String(input)
      if (url === 'https://allratestoday.com/api/open/latest/USD') {
        return Promise.resolve(new Response(JSON.stringify({ result: 'success', base_code: 'USD', rates: { CNY: 7.1 } })))
      }
      if (url === 'https://allratestoday.com/api/open/latest/EUR') {
        return Promise.resolve(new Response(JSON.stringify({ result: 'success', base_code: 'EUR', rates: { CNY: 8.2 } })))
      }
      return Promise.resolve(new Response('unavailable', { status: 503 }))
    })
    vi.stubGlobal('fetch', fetchMock)
    const { fetchLivePricing } = await import('../src/pricing-fetch.ts')
    const pricing = await fetchLivePricing()
    expect(pricing.rate).toBe(7.1)
    expect(pricing.rateEur).toBe(8.2)
    const urls = fetchMock.mock.calls.map(([input]) => String(input))
    expect(urls.indexOf('https://open.er-api.com/v6/latest/USD')).toBeLessThan(urls.indexOf('https://allratestoday.com/api/open/latest/USD'))
  })

  it('does not consult AllRatesToday when open.er-api answers', async () => {
    const fetchMock = vi.fn((input: string | URL) => {
      const url = String(input)
      if (url.startsWith('https://open.er-api.com/')) {
        return Promise.resolve(new Response(JSON.stringify({ result: 'success', rates: { CNY: 7.3 } })))
      }
      return Promise.resolve(new Response('unavailable', { status: 503 }))
    })
    vi.stubGlobal('fetch', fetchMock)
    const { fetchLivePricing } = await import('../src/pricing-fetch.ts')
    const pricing = await fetchLivePricing()
    expect(pricing.rate).toBe(7.3)
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('allratestoday.com'))).toBe(false)
  })
})
