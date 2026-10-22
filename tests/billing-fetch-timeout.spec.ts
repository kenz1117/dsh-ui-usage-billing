// @vitest-environment jsdom
/**
 * 客户端取插件端点的超时（issue #104）。
 *
 * 旧实现里所有 fetch 都没有超时：服务端某次响应被上游拖住（报告者实测
 * 45~60s）时，这条浏览器同源连接被长期占住；多标签页各挂一条即占满 6 条
 * 连接池，宿主自己的资源请求排队，用户看到的是「整个 DSH 界面卡死」。
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchBilling } from '../src/client/api/http.ts'
import { fetchBalanceDoc } from '../src/client/api/balance.ts'
import { loadUsageStats } from '../src/client/api/usage-stats.ts'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

/** 永不落地的 fetch 替身：模拟服务端响应被拖住（连接被长期占住）。
 *  收到 abort 后按真实 fetch 的语义拒绝——超时链路才能走完降级分支。 */
function hangingFetch(): ReturnType<typeof vi.fn> {
  return vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => { reject(new Error('aborted')) })
  }))
}

describe('billing fetch timeout (issue #104)', () => {
  it('aborts the request when the server does not answer in time', async () => {
    let aborted = false
    vi.stubGlobal('fetch', vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => { aborted = true; reject(new Error('aborted')) })
    })))
    await expect(fetchBilling('/api/billing/balance', { timeoutMs: 30 })).rejects.toThrow()
    // 超时确实取消了请求（连接被释放，不是挂着等）。
    expect(aborted).toBe(true)
  })

  it('keeps the request alive when it answers within the budget', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"balances":[]}', { status: 200 })))
    const response = await fetchBilling('/api/billing/balance', { timeoutMs: 1_000 })
    expect(response.ok).toBe(true)
  })

  it('degrades to empty balances when the balance request times out', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', hangingFetch())
    const pending = fetchBalanceDoc()
    await vi.advanceTimersByTimeAsync(16_000)
    await expect(pending).resolves.toEqual({ balances: [] })
  })

  it('degrades to null stats when the usage-stats request times out', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', hangingFetch())
    const pending = loadUsageStats()
    await vi.advanceTimersByTimeAsync(16_000)
    await expect(pending).resolves.toBeNull()
  })

  it('passes the stale marker through when the server serves a timed-out balance', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ balances: [{ provider: 'deepseek', displayName: 'DeepSeek', totalBalance: 1 }], stale: true }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )))
    const doc = await fetchBalanceDoc()
    expect(doc.stale).toBe(true)
    expect(doc.balances).toHaveLength(1)
  })
})
