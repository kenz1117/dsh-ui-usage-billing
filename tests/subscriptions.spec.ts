/**
 * Subscription quota adapter unit tests: plan identification from the
 * llm-pi-ai providers map, empty keys degrading without any network, and a
 * stubbed upstream response mapping through the Kimi parser and the HTTP
 * status classifier.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { collectSubscriptions, EMPTY_SUBSCRIPTION_KEYS, identifySubscriptionPlans } from '../src/subscriptions.ts'

/** A stubbed fetch answering one JSON body with the given status. */
function stubFetch(body: unknown, status = 200): void {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })))
}

describe('identifySubscriptionPlans', () => {
  it('recognizes subscription providers that carry an apiKeyEnv', () => {
    const identified = identifySubscriptionPlans({
      'kimi-coding': { apiKeyEnv: 'KIMI_CODING_API_KEY' },
      'xiaomi-token-plan-cn': { apiKeyEnv: 'XIAOMI_TOKEN_PLAN_CN_API_KEY' },
      // 非订阅 provider 与未配 key 的订阅 id 都不识别。
      'deepseek': { apiKeyEnv: 'DEEPSEEK_API_KEY' },
      'qwen-token-plan': {},
    })
    expect(identified.map(item => item.provider)).toEqual(['kimi-coding', 'xiaomi-token-plan-cn'])
    // kimi 有额度适配器；小米 token plan 识别但无适配器。
    expect(identified[0]).toMatchObject({ adapter: true, displayName: 'Kimi For Coding' })
    expect(identified[1]).toMatchObject({ adapter: false, displayName: '小米 Token Plan（国内）' })
  })

  it('returns an empty list for an empty providers map', () => {
    expect(identifySubscriptionPlans(undefined)).toEqual([])
    expect(identifySubscriptionPlans({})).toEqual([])
  })
})

describe('collectSubscriptions', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('returns nothing for an empty plan list (no network)', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const quotas = await collectSubscriptions(EMPTY_SUBSCRIPTION_KEYS)
    expect(quotas).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('parses the Kimi usage payload into session and weekly windows', async () => {
    stubFetch({
      data: {
        plan: 'Kimi For Coding',
        limits: [{ detail: { limit: 1000, remaining: 400, resetTime: '2026-09-01T00:00:00Z' } }],
        usage: { limit: 5000, remaining: 2000 },
      },
    })
    const quotas = await collectSubscriptions(
      { ...EMPTY_SUBSCRIPTION_KEYS, kimiApiKey: 'kimi-key' },
      [{ provider: 'kimi-coding' }],
    )
    const kimi = quotas[0]
    expect(kimi?.provider).toBe('kimi-coding')
    expect(kimi?.status).toBe('ok')
    expect(kimi?.plan).toBe('Kimi For Coding')
    expect(kimi?.windows).toHaveLength(2)
    // 会话窗口：已用 600/1000 → 剩余 40%。
    expect(kimi?.windows[0]).toMatchObject({ kind: 'session', remainingPercent: 40 })
    // 周窗口：已用 3000/5000 → 剩余 40%。
    expect(kimi?.windows[1]).toMatchObject({ kind: 'weekly', remainingPercent: 40 })
  })

  it('keeps the session window when its quota is exhausted (remaining=0)', async () => {
    // 本次额度用尽：remaining=0，接口可能把 limit 报为 0（无正额度）。
    stubFetch({
      data: {
        plan: 'Kimi For Coding',
        limits: [{ detail: { limit: 0, remaining: 0, resetTime: '2026-08-22T00:00:00Z' } }],
        usage: { limit: 5000, remaining: 3000 },
      },
    })
    const quotas = await collectSubscriptions(
      { ...EMPTY_SUBSCRIPTION_KEYS, kimiApiKey: 'kimi-key' },
      [{ provider: 'kimi-coding' }],
    )
    const kimi = quotas[0]
    expect(kimi?.status).toBe('ok')
    expect(kimi?.windows).toHaveLength(2)
    // 本次窗口必须保留，标记为已用尽（remainingPercent 0）。
    expect(kimi?.windows[0]).toMatchObject({ kind: 'session', usedPercent: 100, remainingPercent: 0, remaining: 0 })
    // 周窗口未用尽，照常返回剩余百分比。
    expect(kimi?.windows[1]).toMatchObject({ kind: 'weekly', remainingPercent: 60 })
  })

  it('maps an unauthorized upstream answer to the status', async () => {
    stubFetch({}, 401)
    const quotas = await collectSubscriptions(
      { ...EMPTY_SUBSCRIPTION_KEYS, kimiApiKey: 'bad' },
      [{ provider: 'kimi-coding' }],
    )
    expect(quotas[0]?.status).toBe('unauthorized')
  })

  it('degrades unknown plan ids to unavailable without a network call', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const quotas = await collectSubscriptions(EMPTY_SUBSCRIPTION_KEYS, [{ provider: 'not-a-real-provider' }])
    expect(quotas).toHaveLength(1)
    expect(quotas[0]).toMatchObject({ provider: 'not-a-real-provider', status: 'unavailable' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
