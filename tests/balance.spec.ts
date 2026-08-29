/**
 * Balance query unit tests: the provider route → key mapping, the classified
 * HTTP outcomes shared by the Bearer fetcher, and the Moonshot/DeepSeek JSON
 * parsers mapping their own fields onto the shared row.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { queryBalances } from '../src/balance.ts'
import type { ProviderBalance } from '../src/pricing-shared.ts'

/** A minimal context whose credentials seam resolves each env ref to a fixed value. */
function fakeContext(envValue: string | undefined) {
  return {
    credentials: {
      // credentialRef() 返回的是字符串本身（branded），resolve(ref) 按 ref 名取值。
      resolve: vi.fn(async (ref: unknown) => {
        return ref === 'STUB_KEY' && envValue !== undefined ? { value: envValue } : undefined
      }),
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

  it('classifies a missing secret as unconfigured without fetching', async () => {
    const ctx = fakeContext(undefined)
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const rows = await queryBalances(ctx, { moonshot: { apiKeyEnv: 'STUB_KEY' } })
    expect(rows.find(row => row.provider === '月之暗面')).toMatchObject({ provider: '月之暗面', error: 'unconfigured' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('keeps one unconfigured Tencent TokenHub row across its route aliases', async () => {
    const ctx = fakeContext(undefined)
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const rows = await queryBalances(ctx, {
      'tencent-tokenhub': {},
      tokenhub: {},
      tencent: {},
    })
    const tencent = rows.filter(row => row.provider === '腾讯云 TokenHub')
    expect(tencent).toHaveLength(1)
    expect(tencent[0]).toMatchObject({ provider: '腾讯云 TokenHub', error: 'unconfigured' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('Tencent TokenHub (TC3-signed token-plan balance)', () => {
  it('rejects a credential value without the `<SecretId>:<SecretKey>` pair as unauthorized', async () => {
    const ctx = fakeContext('sk-tp-bare-inference-key')
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const rows = await queryBalances(ctx, { 'tencent-tokenhub': { apiKeyEnv: 'STUB_KEY' } })
    expect(rows.find(row => row.provider === '腾讯云 TokenHub')).toMatchObject({ error: 'unauthorized' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('resolves the plan team then reads its remaining quota via two signed calls', async () => {
    const ctx = fakeContext('AKIDexample:secretKeyExample')
    const calls: { action: string | undefined; auth: string | undefined }[] = []
    vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init: { headers: Record<string, string>; body: string }) => {
      const body = JSON.parse(String(init.body)) as { Action?: string }
      calls.push({ action: body.Action, auth: init.headers.authorization })
      if (body.Action === 'DescribeTokenPlanList') {
        return { ok: true, status: 200, json: async () => ({ Response: { TeamSet: [{ TeamId: 'tp-1', Status: 'enable' }], RequestId: 'r1' } }) }
      }
      return { ok: true, status: 200, json: async () => ({ Response: { Name: '个人套餐', PackageInfo: { TotalQuota: 1_000_000, UsedQuota: 400_000 }, StopReason: 'NORMAL' } }) }
    }))
    const rows = await queryBalances(ctx, { 'tencent-tokenhub': { apiKeyEnv: 'STUB_KEY' } })
    const row = rows.find(row => row.provider === '腾讯云 TokenHub')
    // 余量从 total-used 推导；plan 名随套餐详情透出。
    expect(row).toMatchObject({ provider: '腾讯云 TokenHub', currency: 'CNY', totalBalance: 600_000, plan: '个人套餐' })
    expect(calls.map(call => call.action)).toEqual(['DescribeTokenPlanList', 'DescribeTokenPlan'])
    // 两次调用都带 TC3 签名头与 X-TC-Action。
    expect(calls[0]?.auth).toMatch(/^TC3-HMAC-SHA256 Credential=AKIDexample\//)
    expect(calls[1]?.auth).toMatch(/Signature=[0-9a-f]{64}$/)
  })

  it('maps a cloud-API business auth failure to unauthorized', async () => {
    const ctx = fakeContext('AKIDexample:secretKeyExample')
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ Response: { Error: { Code: 'AuthFailure.SignatureFailure', Message: 'bad sig' }, RequestId: 'r' } }),
    })))
    const rows = await queryBalances(ctx, { tokenhub: { apiKeyEnv: 'STUB_KEY' } })
    expect(rows.find(row => row.provider === '腾讯云 TokenHub')).toMatchObject({ error: 'unauthorized' })
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
