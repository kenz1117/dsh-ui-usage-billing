import { afterEach, describe, expect, it, vi } from 'vitest'
import { pickTokenDanceBalanceCny, queryBalances, resolveHeaders, withBalanceOrigin } from '../src/balance.ts'

/** 凭据 seam 桩：KEY/TOKEN 可解析，EMPTY 为空串，其余未配置。credentialRef 是 branded 字符串。 */
function ctxWith(entries: Record<string, string>) {
  return {
    credentials: {
      resolve: async (ref: unknown) => {
        const value = entries[ref as string]
        return value === undefined ? undefined : { value }
      },
    },
  } as never
}

describe('official wallet provenance', () => {
  it.each([
    ['deepseek', 'https://api.deepseek.com'], ['moonshot', 'https://api.moonshot.cn'],
    ['stepfun', 'https://api.stepfun.com'], ['siliconflow', 'https://api.siliconflow.cn'],
    ['xai', 'https://api.x.ai'], ['zhipu', 'https://open.bigmodel.cn'],
    ['zai-coding-cn', 'https://open.bigmodel.cn'],
  ])('binds the exact supported origin for %s', (sourceRoute, origin) => {
    const row = { provider: sourceRoute, displayName: sourceRoute, sourceRoute, error: 'unauthorized' } as const
    expect(withBalanceOrigin(row, new Map([[sourceRoute, origin]]))).toEqual({ ...row, sourceOrigin: origin })
    expect(withBalanceOrigin(row, new Map([[sourceRoute, 'https://relay.example']]))).toEqual(row)
    expect(withBalanceOrigin(row, new Map())).toEqual(row)
  })

  it('does not associate the account wallet with the Platform API origin', () => {
    const row = { provider: 'deepseek', displayName: 'DeepSeek', sourceRoute: 'deepseek-account', totalBalance: 4 }
    expect(withBalanceOrigin(row, new Map([['deepseek-account', 'https://api.deepseek.com']]))).toEqual(row)
  })
})

describe('resolveHeaders (issue #26)', () => {
  it('resolves a full-value placeholder unchanged from the historical behavior', async () => {
    const out = await resolveHeaders(ctxWith({ KEY: 'sk-abc' }), { Authorization: '{{KEY}}' })
    expect(out).toEqual({ Authorization: 'sk-abc' })
  })

  it('resolves prefixed placeholders like `Bearer {{KEY}}`', async () => {
    const out = await resolveHeaders(ctxWith({ TOKENDANCE_SPACE_API_KEY: 'sk-abc' }), {
      Authorization: 'Bearer {{TOKENDANCE_SPACE_API_KEY}}',
    })
    expect(out).toEqual({ Authorization: 'Bearer sk-abc' })
  })

  it('resolves query-style placeholders like `token={{KEY}}`', async () => {
    const out = await resolveHeaders(ctxWith({ KEY: 'sk-abc' }), { 'X-Api': 'token={{KEY}}' })
    expect(out).toEqual({ 'X-Api': 'token=sk-abc' })
  })

  it('resolves multiple distinct placeholders in one value', async () => {
    const out = await resolveHeaders(ctxWith({ A: '1', B: '2' }), { 'X-Mix': '{{A}}-{{B}}-{{A}}' })
    expect(out).toEqual({ 'X-Mix': '1-2-1' })
  })

  it('returns null when any referenced credential is missing or empty', async () => {
    expect(await resolveHeaders(ctxWith({ KEY: 'sk-abc' }), { Authorization: 'Bearer {{MISSING}}' })).toBeNull()
    expect(await resolveHeaders(ctxWith({ EMPTY: '' }), { Authorization: 'Bearer {{EMPTY}}' })).toBeNull()
  })

  it('passes through values without placeholders', async () => {
    const out = await resolveHeaders(ctxWith({}), { Accept: 'application/json' })
    expect(out).toEqual({ Accept: 'application/json' })
  })
})

describe('pickTokenDanceBalanceCny (issue #27)', () => {
  it('converts the server-side balance field from micro-yuan', () => {
    // issue #27 的真实样例：balance 81099656 微元 = ¥81.099656。
    expect(pickTokenDanceBalanceCny({ balance: { credits: 101000000, credits_used: 19900344, balance: 81099656 } }))
      .toBeCloseTo(81.099656, 6)
  })

  it('derives the remaining balance when the direct field is absent', () => {
    expect(pickTokenDanceBalanceCny({ balance: { credits: 101000000, credits_used: 19900344 } }))
      .toBeCloseTo(81.099656, 6)
  })

  it('returns undefined for missing or malformed payloads', () => {
    expect(pickTokenDanceBalanceCny(undefined)).toBeUndefined()
    expect(pickTokenDanceBalanceCny({})).toBeUndefined()
    expect(pickTokenDanceBalanceCny({ balance: {} })).toBeUndefined()
    expect(pickTokenDanceBalanceCny({ error: { code: 'unauthorized' } })).toBeUndefined()
  })
})

describe('queryBalances（新版宿主形态）', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('stamps DeepSeek Platform API success and failures with its direct route', async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(Response.json({ balance_infos: [{ currency: 'CNY', total_balance: '7.50' }] }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
    vi.stubGlobal('fetch', fetchSpy)
    const providers = { deepseek: { apiKeyEnv: 'KEY' } }
    const api = async (key: Record<string, string>) => (await queryBalances(ctxWith(key), providers)).find(row => row.provider === 'deepseek')
    expect(await api({ KEY: 'api-test-key' })).toMatchObject({ sourceRoute: 'deepseek', totalBalance: 7.5 })
    expect(await api({ KEY: 'api-test-key' })).toMatchObject({ sourceRoute: 'deepseek', error: 'unauthorized' })
    expect(await api({})).toMatchObject({ sourceRoute: 'deepseek', error: 'unconfigured' })
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('aliases only the two domestic Zhipu routes with the same resolved credential', async () => {
    const providers = { zhipu: { apiKeyEnv: 'PAYG' }, 'zai-coding-cn': { apiKeyEnv: 'PLAN' } }
    const fetchSpy = vi.fn(async () => Response.json({ balance: { available: 8 } }))
    vi.stubGlobal('fetch', fetchSpy)
    const zhipu = async (keys: Record<string, string>) => (await queryBalances(ctxWith(keys), providers)).filter(row => row.provider === '智谱 AI')
    expect(await zhipu({ PAYG: 'same', PLAN: 'same' })).toEqual([
      expect.objectContaining({ sourceRoute: 'zhipu', sourceRouteAliases: ['zai-coding-cn'], totalBalance: 8 }),
    ])
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const separate = await zhipu({ PAYG: 'wallet-a', PLAN: 'wallet-b' })
    expect(separate.map(row => row.sourceRoute)).toEqual(['zhipu', 'zai-coding-cn'])
    expect(separate.every(row => row.sourceRouteAliases === undefined)).toBe(true)
    expect(fetchSpy).toHaveBeenCalledTimes(3)
    const partial = await zhipu({ PAYG: 'wallet-a' })
    expect(partial[1]).toMatchObject({ sourceRoute: 'zai-coding-cn', error: 'unconfigured' })
    expect(partial.every(row => row.sourceRouteAliases === undefined)).toBe(true)
  })
  it('queries the wallet via the route conventional ref when apiKeyEnv is absent', async () => {
    // 新版宿主把路由 key 存成凭据 refs（<ROUTE>_API_KEY）：zai-coding-cn 路由没配
    // apiKeyEnv，余额面板应按约定 ref 找回 key 并读出智谱钱包。
    const ctx = {
      credentials: {
        resolve: async (ref: unknown) => {
          return ref === 'ZAI_CODING_CN_API_KEY' ? { value: 'zai-cn-key' } : undefined
        },
      },
    } as never
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ balance: { available: 42.5 } }),
    }))
    vi.stubGlobal('fetch', fetchSpy)
    const rows = await queryBalances(ctx, { 'zai-coding-cn': {} })
    const zhipu = rows.find(row => row.displayName === '智谱 AI')
    expect(zhipu).toMatchObject({ displayName: '智谱 AI', sourceRoute: 'zai-coding-cn', totalBalance: 42.5, currency: 'CNY' })
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://open.bigmodel.cn/api/paas/v4/balance',
      expect.objectContaining({ headers: expect.objectContaining({ authorization: 'Bearer zai-cn-key' }) }),
    )
  })

  it('answers unconfigured without network when no ref resolves', async () => {
    const ctx = { credentials: { resolve: async () => undefined } } as never
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const rows = await queryBalances(ctx, { 'zai-coding-cn': {} })
    const zhipu = rows.find(row => row.displayName === '智谱 AI')
    expect(zhipu).toMatchObject({ displayName: '智谱 AI', error: 'unconfigured' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
