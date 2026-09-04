import { afterEach, describe, expect, it, vi } from 'vitest'
import { pickTokenDanceBalanceCny, queryBalances, resolveHeaders } from '../src/balance.ts'
import type { ProviderBalance } from '../src/balance.ts'

/** queryBalances 套件的凭据桩别名：apiKeyEnv 统一为 STUB_KEY。 */
const fakeContext = (key: string) => ctxWith({ STUB_KEY: key })

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

/** A stubbed fetch answering one JSON body with the given status. */
function stubFetch(body: unknown, status = 200): void {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })))
}

afterEach(() => { vi.unstubAllGlobals() })

describe('queryBalances provider routing', () => {
  it('queries only routes carrying an apiKeyEnv; absent routes answer unconfigured', async () => {
    const ctx = fakeContext('sk-secret')
    // 只有 moonshot 配了 key，deepseek 未配 → moonshot 真查、deepseek 报未配置。
    stubFetch({ data: { available_balance: 49.59, voucher_balance: 46.59, cash_balance: 3.00 } })
    const rows = await queryBalances(ctx, {
      deepseek: {},
      moonshot: { apiKeyEnv: 'STUB_KEY' },
    })
    expect(rows).toHaveLength(7)
    const moonshot = rows.find(row => row.provider === '月之暗面')
    expect(moonshot).toMatchObject({ displayName: '月之暗面', currency: 'CNY', totalBalance: 49.59, grantedBalance: 46.59, toppedUpBalance: 3 })
    const deepseek = rows.find(row => row.provider === 'deepseek')
    // deepseek route 无 apiKeyEnv → resolve 得到 undefined → unconfigured。
    expect(deepseek).toMatchObject({ provider: 'deepseek', error: 'unconfigured' })
    // stepfun route 同样未配 → unconfigured。
    expect(rows.find(row => row.provider === '阶跃星辰')).toMatchObject({ provider: '阶跃星辰', error: 'unconfigured' })
    // siliconflow route 同样未配 → unconfigured。
    expect(rows.find(row => row.provider === '硅基流动')).toMatchObject({ provider: '硅基流动', error: 'unconfigured' })
    // 智谱钱包余额（zhipu 直连路由 + zai-coding-cn 订阅通道）共用同一钱包、按名去重，
    // 都未配 key → 只保留一条 unconfigured 行。
    const zhipu = rows.filter(row => row.provider === '智谱 AI')
    expect(zhipu).toHaveLength(1)
    expect(zhipu[0]).toMatchObject({ provider: '智谱 AI', error: 'unconfigured' })
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

describe('Bearer fetch outcome classification', () => {
  it('classifies 401/403 as unauthorized and other non-2xx as unreachable', async () => {
    const ctx = fakeContext('sk-secret')
    stubFetch({}, 401)
    let rows = await queryBalances(ctx, { moonshot: { apiKeyEnv: 'STUB_KEY' } })
    expect(rows.find(row => row.provider === '月之暗面')).toMatchObject({ error: 'unauthorized' })

    stubFetch({}, 500)
    rows = await queryBalances(ctx, { moonshot: { apiKeyEnv: 'STUB_KEY' } })
    expect(rows.find(row => row.provider === '月之暗面')).toMatchObject({ error: 'unreachable' })
  })

  it('maps a malformed success body to a row without a balance', async () => {
    const ctx = fakeContext('sk-secret')
    stubFetch({ unexpected: true }, 200)
    const rows = await queryBalances(ctx, { moonshot: { apiKeyEnv: 'STUB_KEY' } })
    const row = rows.find(row => row.provider === '月之暗面')
    expect(row).toMatchObject({ provider: '月之暗面', currency: 'CNY' })
    expect((row as ProviderBalance).totalBalance).toBeUndefined()
  })

  it('parses StepFun account fields onto the shared row', async () => {
    const ctx = fakeContext('sk-secret')
    stubFetch({ object: 'account', type: 'prepaid', balance: 150.00, total_cash_balance: 200.00, total_voucher_balance: 50.00 }, 200)
    const rows = await queryBalances(ctx, { stepfun: { apiKeyEnv: 'STUB_KEY' } })
    const row = rows.find(row => row.provider === '阶跃星辰')
    expect(row).toMatchObject({
      provider: '阶跃星辰',
      displayName: '阶跃星辰',
      currency: 'CNY',
      totalBalance: 150,
      toppedUpBalance: 200,
      grantedBalance: 50,
    })
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
