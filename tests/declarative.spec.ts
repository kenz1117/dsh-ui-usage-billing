/**
 * Declarative-endpoint unit tests: dotted-path reading (with prototype-chain
 * rejection), origin normalization, and the bounded single-route query that
 * binds a declaration to an already-configured provider's origin while
 * enforcing the security boundary (single-slash path, GET only, no
 * cross-origin redirects, credential from the route's own apiKeyEnv).
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { normalizeDeclaredOrigin, queryDeclaredEndpoints, readDeclaredPath } from '../src/declarative.ts'

/** Minimal context whose credentials seam resolves each env ref to a fixed value. */
function fakeContext(value: string | undefined) {
  return {
    credentials: {
      resolve: vi.fn(async (ref: unknown) => {
        return ref === 'STUB_KEY' && value !== undefined ? { value } : undefined
      }),
    },
  } as never
}

/** A stub fetch that returns a fixed JSON body on a 200 response. */
function bodyFetch(body: string) {
  return vi.fn(async () => ({ ok: true, status: 200, type: 'basic', text: async () => body }))
}

afterEach(() => { vi.unstubAllGlobals() })

describe('readDeclaredPath', () => {
  it('walks a dotted path into a nested body', () => {
    expect(readDeclaredPath({ data: { balance: 3, plan: { name: 'p' } } }, 'data.plan.name')).toBe('p')
  })

  it('returns undefined when a segment is missing or the cursor is not an object', () => {
    expect(readDeclaredPath({ data: { balance: 3 } }, 'data.missing')).toBeUndefined()
    expect(readDeclaredPath({ data: 3 }, 'data.balance')).toBeUndefined()
    expect(readDeclaredPath({}, '')).toBeUndefined()
  })

  it('refuses prototype-chain segments', () => {
    expect(readDeclaredPath({}, '__proto__.polluted')).toBeUndefined()
    expect(readDeclaredPath({}, 'constructor.name')).toBeUndefined()
    expect(readDeclaredPath({}, 'prototype.x')).toBeUndefined()
  })
})

describe('normalizeDeclaredOrigin', () => {
  it('lowercases the host and drops the default port', () => {
    expect(normalizeDeclaredOrigin('https://API.example.com:443/v1')).toBe('https://api.example.com')
    expect(normalizeDeclaredOrigin('http://gateway.acme.example:8080/path')).toBe('http://gateway.acme.example:8080')
  })

  it('returns undefined for unparseable or non-http(s) inputs', () => {
    expect(normalizeDeclaredOrigin('not-a-url')).toBeUndefined()
    expect(normalizeDeclaredOrigin('')).toBeUndefined()
  })
})

describe('queryDeclaredEndpoints', () => {
  const providers = { 'my-relay': { baseURL: 'https://relay.example.com/v1', apiKeyEnv: 'STUB_KEY' } }

  it('reads fields and windows against the matched provider origin', async () => {
    const ctx = fakeContext('k')
    vi.stubGlobal('fetch', bodyFetch(JSON.stringify({
      data: { balance: 12.5, unit: 'CNY' },
      week: { percent: 80, reset_at: '2026-08-26T00:00:00Z' },
    })))
    const rows = await queryDeclaredEndpoints(ctx, providers, [{
      origin: 'https://Relay.example.com',
      displayName: '我的站',
      path: '/api/quota',
      fields: { total: 'data.balance', currency: 'data.unit' },
      windows: [{ kind: 'weekly', usedPercent: 'week.percent', resetsAt: 'week.reset_at' }],
    }])
    expect(rows[0]).toMatchObject({
      provider: 'declared:我的站',
      totalBalance: 12.5,
      currency: 'CNY',
      declared: true,
    })
    expect(rows[0]?.windows?.[0]).toMatchObject({ kind: 'weekly', usedPercent: 80, remainingPercent: 20, resetsAt: '2026-08-26T00:00:00Z' })
  })

  it('rejects a path that is not single-slash absolute', async () => {
    const ctx = fakeContext('k')
    vi.stubGlobal('fetch', vi.fn())
    for (const path of ['api/quota', '//evil.example/x']) {
      const rows = await queryDeclaredEndpoints(ctx, providers, [{ origin: 'https://relay.example.com', path }])
      expect(rows[0]).toMatchObject({ error: 'invalid', reason: 'path 必须单斜杠绝对路径' })
    }
    // 非法路径不应触发任何网络请求。
    expect((vi.mocked(fetch) as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0)
  })

  it('reports unconfigured when the declaration origin matches no configured provider', async () => {
    const ctx = fakeContext('k')
    vi.stubGlobal('fetch', vi.fn())
    const rows = await queryDeclaredEndpoints(ctx, providers, [{ origin: 'https://no-such.example.com', path: '/api/quota' }])
    expect(rows[0]).toMatchObject({ error: 'unconfigured', reason: '未匹配到同源 provider（需先在 llm-pi-ai 配好 baseURL）' })
  })

  it('reports unconfigured when the route has no secret', async () => {
    const ctx = fakeContext(undefined)
    vi.stubGlobal('fetch', vi.fn())
    const rows = await queryDeclaredEndpoints(ctx, providers, [{ origin: 'https://relay.example.com', path: '/api/quota' }])
    expect(rows[0]).toMatchObject({ error: 'unconfigured' })
  })

  it('flags a declaration whose paths miss every field instead of showing an empty card', async () => {
    const ctx = fakeContext('k')
    vi.stubGlobal('fetch', bodyFetch('{}'))
    const rows = await queryDeclaredEndpoints(ctx, providers, [{
      origin: 'https://relay.example.com',
      path: '/api/quota',
      fields: { total: 'data.balance' },
    }])
    expect(rows[0]).toMatchObject({ error: 'invalid', reason: '声明路径未命中任何字段' })
    expect(rows[0]?.totalBalance).toBeUndefined()
  })
})
