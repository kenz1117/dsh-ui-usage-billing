import { describe, expect, it, vi } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { configuredPricingModels, registerPricingModelsRoute } from '../src/routes/pricing-models.ts'
import { priceOptions } from '../src/client/price-picker.ts'

describe('pricing picker discovery', () => {
  it('retains static routes, excludes accounts, and isolates discovery failures', async () => {
    const listModels = vi.fn(async (route: string) => {
      if (route === 'broken') throw new Error('offline')
      return [{ id: 'found' }]
    })
    const providers = { static: { models: [{ id: 'route：未用' }], baseURL: 'https://user:pass@relay.test/v1?token=hidden' }, empty: { models: [] }, 'deepseek-account': { models: [{ id: 'account' }] } }
    const describeSettings = vi.fn(() => [{ ns: 'llm-pi-ai', value: { providers } }])
    const doc = await configuredPricingModels({ settings: { describe: describeSettings }, get: () => ({ listProviders: () => ['broken', 'dynamic', 'deepseek-account'].map(id => ({ id })), listModels }) } as never)
    expect(describeSettings).toHaveBeenCalledWith({ redactSecrets: true })
    expect(listModels.mock.calls.flat().sort()).toEqual(['broken', 'dynamic', 'empty'])
    expect(doc.partial).toBe(true)
    expect(doc.models.map(m => [m.route, m.key, m.origin])).toEqual([
      ['static', 'route：未用', 'https://relay.test'], ['empty', 'found', ''], ['dynamic', 'found', ''],
    ])
    expect(JSON.stringify(doc)).not.toContain('pass')
  })

  it('marks malformed rows partial while retaining valid static and discovered rows', async () => {
    const providers = { static: { models: [{ id: 'valid' }, { id: 42 }, { id: ' ', name: 'Empty' }] } }
    const ctx = {
      settings: { describe: () => [{ ns: 'llm-pi-ai', value: { providers } }] },
      get: () => ({ listProviders: () => [{ id: 'dynamic' }], listModels: async () => [{ id: 'found' }, null] }),
    }
    const doc = await configuredPricingModels(ctx as never)
    expect(doc.partial).toBe(true)
    expect(doc.models.map(row => row.key)).toEqual(['valid', 'found'])
  })

  it('skips missing adapters without warnings and discovers providers with no usable declarations', async () => {
    const providers = { missing: {}, damaged: { models: [{ id: 42 }, null] }, mixed: { models: [{ id: 'static' }, {}] } }
    const listModels = vi.fn(async (route: string) => {
      if (route === 'missing') throw Object.assign(new Error('Missing adapter'), { code: 'NO_ADAPTER' })
      return [{ id: 'discovered' }]
    })
    const ctx = (configured: object) => ({ settings: { describe: () => [{ ns: 'llm-pi-ai', value: { providers: configured } }] }, get: () => ({ listProviders: () => [], listModels }) })
    expect(await configuredPricingModels(ctx({ missing: {} }) as never)).toEqual({ models: [], partial: false })
    listModels.mockClear()
    const recovered = await configuredPricingModels(ctx(providers) as never)
    expect(recovered.partial).toBe(true)
    expect(recovered.models.map(m => m.key)).toEqual(['discovered', 'static'])
    expect(listModels.mock.calls.flat()).toEqual(['missing', 'damaged'])
  })

  it('coalesces concurrent requests and caches success and partial results for their TTLs', async () => {
    vi.useFakeTimers()
    try {
      let handler!: (req: IncomingMessage, res: ServerResponse) => Promise<void>
      const listModels = vi.fn(async () => [{ id: 'found' }])
      const ctx = {
        effect: (callback: () => unknown) => callback(),
        settings: { describe: () => [] },
        get: () => ({ listProviders: () => [{ id: 'dynamic' }], listModels }),
        webServer: { register: (route: { handler: typeof handler }) => { handler = route.handler } },
      }
      registerPricingModelsRoute(ctx as never, new Set())
      const loopback = { headers: { host: 'localhost' }, socket: { remoteAddress: '127.0.0.1' } }
      const rejected = { writeHead: vi.fn(), end: vi.fn() }
      await handler({ method: 'POST', ...loopback } as IncomingMessage, rejected as unknown as ServerResponse)
      expect(rejected.writeHead).toHaveBeenCalledWith(405, { allow: 'GET', 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
      expect(JSON.parse(rejected.end.mock.calls[0]![0])).toHaveProperty('error')
      expect(listModels).not.toHaveBeenCalled()
      async function get() {
        const req = { method: 'GET', headers: { host: 'localhost' }, socket: { remoteAddress: '127.0.0.1' } }
        const res = { writeHead: vi.fn(), end: vi.fn() }
        await handler(req as IncomingMessage, res as unknown as ServerResponse)
        expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({ 'cache-control': 'no-store' }))
        return JSON.parse(res.end.mock.calls[0]![0])
      }
      const [a, b] = await Promise.all([get(), get()])
      expect(a).toEqual({ models: [{ key: 'found', name: 'found', route: 'dynamic', channel: 'dynamic', origin: '' }], partial: false })
      expect(b).toEqual(a)
      expect(listModels).toHaveBeenCalledTimes(1)
      vi.advanceTimersByTime(59_999)
      expect(await get()).toEqual(a)
      expect(listModels).toHaveBeenCalledTimes(1)
      vi.advanceTimersByTime(1)
      listModels.mockImplementationOnce(() => new Promise(() => {}))
      const stalled = get()
      await vi.advanceTimersByTimeAsync(5000)
      expect(await stalled).toEqual({ models: [], partial: true })
      vi.advanceTimersByTime(14_999)
      expect(await get()).toEqual({ models: [], partial: true })
      expect(listModels).toHaveBeenCalledTimes(2)
      vi.advanceTimersByTime(1)
      expect(await get()).toEqual(a)
      expect(listModels).toHaveBeenCalledTimes(3)
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps exact unpriced IDs and used origins; account-only usage cannot reenter from totals', () => {
    const stats = { byDayModelsSite: { day: { shared: { 'site:https://a.test': { calls: 2 }, 'site:https://b.test': { calls: 1 } }, private: { 'direct:deepseek-account': { calls: 1 } } } }, byModel: { private: { calls: 1 }, old: { calls: 1 } }, unpricedModels: ['private', '路由：new'] }
    const list = priceOptions([], stats as never)
    expect(list).toHaveLength(4)
    expect(list.map(x => [x.key, x.origin])).toEqual(expect.arrayContaining([['old', ''], ['路由：new', ''], ['shared', 'https://a.test'], ['shared', 'https://b.test']]))
  })
})
