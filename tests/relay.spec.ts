/**
 * Relay-site quota unit tests: the Sub2API / New API response parsers and the
 * single-route probe that recognizes which program a station runs (or answers
 * an honest unavailable when neither endpoint yields a quota).
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseNewApiStatus, parseSub2ApiUsage, queryRelayQuota } from '../src/relay.ts'

/** A minimal context whose credentials seam resolves each env ref to a fixed value. */
function fakeContext(envValue: string | undefined) {
  return {
    credentials: {
      resolve: vi.fn(async (ref: unknown) => {
        return ref === 'STUB_KEY' && envValue !== undefined ? { value: envValue } : undefined
      }),
    },
  } as never
}

afterEach(() => { vi.unstubAllGlobals() })

describe('parseSub2ApiUsage', () => {
  it('reads a wallet balance when the body carries a balance field', () => {
    expect(parseSub2ApiUsage({ balance: 10.5, used_quota: 3 })).toEqual({ balance: 10.5 })
  })

  it('reads a quota window from total/used when no balance is present', () => {
    const result = parseSub2ApiUsage({ quota: 100, used_quota: 30 })
    expect(result?.windows).toHaveLength(1)
    expect(result?.windows?.[0]).toMatchObject({ kind: 'weekly', usedPercent: 30, remainingPercent: 70 })
  })

  it('returns null when neither balance nor quota is present (not this program / drift)', () => {
    expect(parseSub2ApiUsage({ foo: 1 })).toBeNull()
  })
})

describe('parseNewApiStatus', () => {
  it('reads a billing window from the recorded ratio', () => {
    const result = parseNewApiStatus({ data: { ratio: 0.9 } })
    expect(result?.windows?.[0]).toMatchObject({ kind: 'billing', usedPercent: 90, remainingPercent: 10 })
  })

  it('falls back to used/total when ratio is absent', () => {
    const result = parseNewApiStatus({ data: { used_quota: 30, total_quota: 100 } })
    expect(result?.windows?.[0]).toMatchObject({ usedPercent: 30 })
  })

  it('returns null when no usable percentage is present', () => {
    expect(parseNewApiStatus({ data: {} })).toBeNull()
  })
})

describe('queryRelayQuota', () => {
  it('recognizes a Sub2API station and returns its balance and windows', async () => {
    const ctx = fakeContext('k')
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200, json: async () => ({ balance: 10.5, quota: 100, used_quota: 30 }),
    })))
    const row = await queryRelayQuota(ctx, { route: 'r', baseURL: 'https://relay.example.com', apiKeyEnv: 'STUB_KEY' })
    expect(row).toMatchObject({ route: 'r', origin: 'https://relay.example.com', kind: 'sub2api', status: 'ok', balance: 10.5 })
    expect(row.windows?.[0]).toMatchObject({ usedPercent: 30 })
  })

  it('recognizes a New API station via /api/status after /v1/usage 404', async () => {
    const ctx = fakeContext('k')
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      return url.includes('/v1/usage')
        ? { ok: false, status: 404 }
        : { ok: true, status: 200, json: async () => ({ data: { ratio: 0.5 } }) }
    }))
    const row = await queryRelayQuota(ctx, { route: 'r', baseURL: 'https://relay.example.com', apiKeyEnv: 'STUB_KEY' })
    expect(row).toMatchObject({ kind: 'new-api', status: 'ok', origin: 'https://relay.example.com' })
    expect(row.windows?.[0]).toMatchObject({ usedPercent: 50 })
  })

  it('reports not-configured when the secret is missing (no network call)', async () => {
    const ctx = fakeContext(undefined)
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const row = await queryRelayQuota(ctx, { route: 'r', baseURL: 'https://relay.example.com', apiKeyEnv: 'STUB_KEY' })
    expect(row).toMatchObject({ status: 'not-configured' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('reports unauthorized when the endpoint rejects the key', async () => {
    const ctx = fakeContext('k')
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401 })))
    const row = await queryRelayQuota(ctx, { route: 'r', baseURL: 'https://relay.example.com', apiKeyEnv: 'STUB_KEY' })
    expect(row).toMatchObject({ status: 'unauthorized' })
  })

  it('answers unavailable when neither program is recognized', async () => {
    const ctx = fakeContext('k')
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })))
    const row = await queryRelayQuota(ctx, { route: 'r', baseURL: 'https://relay.example.com', apiKeyEnv: 'STUB_KEY' })
    expect(row).toMatchObject({ kind: 'unknown', status: 'unavailable' })
  })
})
