import { afterEach, describe, expect, it, vi } from 'vitest'
import { pickTokenDanceBalanceCny, queryBalances, resolveHeaders } from '../src/balance.ts'

const client = { version: '0.2.2-rc.5', locale: 'en', timezoneOffsetSeconds: 19_800 }

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

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
    expect(zhipu).toMatchObject({ displayName: '智谱 AI', totalBalance: 42.5, currency: 'CNY' })
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

  it('keeps the unconfigured state when neither wallet nor API key is available', async () => {
    const ctx = {
      get: () => undefined,
      credentials: { resolve: async () => undefined },
    } as never
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const rows = await queryBalances(ctx, { deepseek: {} })
    const row = rows.find(row => row.provider === 'deepseek')
    expect(row).toMatchObject({ error: 'unconfigured' })
    expect(rows.every(row => row.sourceRoute && row.walletKind)).toBe(true)
    expect(rows.find(row => row.walletKind === 'account')).toMatchObject({ accountState: 'no-service' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('queries the signed-in wallet without an API key using the requesting UI metadata', async () => {
    const getBalance = vi.fn(async () => ({
      status: 'ready', value: [{ currency: 'CNY', balance: '18' }], bonusWallets: [],
    }))
    const ctx = {
      get: (name: string) => name === 'deepseekAccount' ? { getBalance } : undefined,
      credentials: { resolve: async () => undefined },
    } as never
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const rows = await queryBalances(ctx, { deepseek: {} }, client)
    expect(rows.find(row => row.walletKind === 'account')).toMatchObject({ sourceRoute: 'deepseek', totalBalance: 18, currency: 'CNY' })
    expect(getBalance).toHaveBeenCalledExactlyOnceWith(client)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('returns a separate logged-in DeepSeek account wallet and combines matching bonuses', async () => {
    const ctx = {
      get: (name: string) => name === 'deepseekAccount' ? {
        getBalance: vi.fn(async () => ({
          status: 'ready',
          value: [
            { currency: 'USD', balance: 99 },
            { currency: 'CNY', balance: '12.5' },
            { currency: 'CNY', balance: 2.5 },
          ],
          bonusWallets: [{ currency: 'CNY', balance: 3 }],
        })),
      } : undefined,
      credentials: { resolve: async (ref: unknown) => ref === 'DEEPSEEK_API_KEY' ? { value: 'api-key' } : undefined },
    } as never
    const fetchSpy = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ balance_infos: [{ currency: 'CNY', total_balance: 90 }] }) }))
    vi.stubGlobal('fetch', fetchSpy)
    const rows = await queryBalances(ctx, { deepseek: { apiKeyEnv: 'DEEPSEEK_API_KEY' } }, client)
    expect(rows.find(row => row.walletKind === 'account')).toMatchObject({
      provider: 'deepseek',
      sourceRoute: 'deepseek', attributedRoutes: ['deepseek'], otherBalances: [{ currency: 'USD', totalBalance: 99 }],
      currency: 'CNY',
      totalBalance: 18,
      toppedUpBalance: 15,
      grantedBalance: 3,
      isAvailable: true,
    })
    expect(fetchSpy).toHaveBeenCalledOnce()
    expect(rows.find(row => row.sourceRoute === 'deepseek' && row.walletKind === 'api-key')).toMatchObject({ totalBalance: 90 })
  })

  it.each([
    [[], [{ currency: 'CNY', balance: '1.5' }], { currency: 'CNY', grantedBalance: 1.5, totalBalance: 1.5 }],
    [[{ currency: 'USD', balance: '8' }], [{ currency: 'CNY', balance: '1.5' }], { currency: 'CNY', grantedBalance: 1.5, totalBalance: 1.5 }],
    [[{ currency: 'USD', balance: '8' }], [], { currency: 'USD', toppedUpBalance: 8, totalBalance: 8 }],
  ])('selects currency from cash %j and bonus %j', async (value, bonusWallets, expected) => {
    const ctx = {
      get: () => ({ getBalance: async () => ({ status: 'ready', value, bonusWallets }) }),
      credentials: { resolve: async () => undefined },
    } as never
    const rows = await queryBalances(ctx, {}, client)
    expect(rows.find(row => row.walletKind === 'account')).toMatchObject({ sourceRoute: 'deepseek', ...expected })
  })

  it.each([
    ['signed out', () => ({ getBalance: async () => null }), undefined],
    ['failed result', () => ({ getBalance: async () => ({ status: 'failed' }) }), 'host returned failed'],
    ['malformed result', () => ({ getBalance: async () => ({ status: 'ready', value: [{ currency: 'CNY', balance: 'invalid' }] }) }), 'unusable balance response'],
    ['get throws', () => { throw new Error('private detail') }, 'host service lookup threw'],
    ['getBalance rejects', () => ({ getBalance: async () => { throw new Error('private detail') } }), 'balance query threw'],
  ] as const)('keeps exact API provenance when the account path is %s', async (_name, get, warning) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const ctx = {
      get,
      credentials: { resolve: async (ref: unknown) => ref === 'DEEPSEEK_API_KEY' ? { value: 'api-key' } : undefined },
    } as never
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ is_available: true, balance_infos: [{ currency: 'CNY', total_balance: 7 }] }),
    }))
    vi.stubGlobal('fetch', fetchSpy)
    const rows = await queryBalances(ctx, { deepseek: { apiKeyEnv: 'DEEPSEEK_API_KEY' } }, client)
    expect(rows.find(row => row.provider === 'deepseek')).toMatchObject({ sourceRoute: 'deepseek', totalBalance: 7, currency: 'CNY' })
    expect(fetchSpy).toHaveBeenCalledOnce()
    await queryBalances(ctx, {}, client) // repeat failures log once per cause
    if (warning === undefined) expect(warn).not.toHaveBeenCalled()
    else expect(warn).toHaveBeenCalledExactlyOnceWith(`[usage-billing] DeepSeek sign-in wallet: ${warning}`)
  })

  it.each([
    [{ status: 'failed' }, { sourceRoute: 'deepseek', walletKind: 'account', error: 'unreachable' }],
    [null, { error: 'unconfigured', accountState: 'signed-out' }],
  ])('distinguishes %j from a query failure without a resolvable API key', async (details, expected) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const ctx = {
      get: () => ({ getBalance: async () => details }),
      credentials: { resolve: async () => undefined },
    } as never
    const rows = await queryBalances(ctx, { deepseek: { apiKeyEnv: 'DEEPSEEK_API_KEY' } }, client)
    expect(rows.find(row => row.walletKind === 'account')).toMatchObject(expected)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('keeps API failures attributed to the Platform API route', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ status: 401 })))
    const rows = await queryBalances(ctxWith({ DEEPSEEK_API_KEY: 'api-key' }), {}, client)
    expect(rows.find(row => row.provider === 'deepseek')).toMatchObject({ sourceRoute: 'deepseek', error: 'unauthorized' })
  })
})
