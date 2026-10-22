/**
 * 三条轮询路由（余额 / 订阅额度 / 中转站额度）的总响应预算（issue #104）。
 *
 * 背景：报告者环境里 /api/billing/balance 单次最慢 45.9s（5 次 > 60s）——
 * 服务端把响应挂在刷新上（刷新里又 await 一次全量聚合），浏览器对同源最多
 * 6 条并发连接，多标签页各挂一条即占满连接池，宿主自己的资源请求排队，
 * 用户看到的是「整个 DSH 界面卡死」。上游额度接口不可达时（8s 超时 × 重试）
 * 同样会把响应挂十几秒，同属一类。
 *
 * 这里验证路由侧的三件事（余额路由为代表，另两条同构）：
 * 1. 刷新超预算 → 响应在预算内落地，回上一次成功的数据并标记 stale；
 * 2. 刷新在预算内完成 → 回新值，不带 stale；
 * 3. 缓存命中 → 根本不触发刷新。
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { describe, expect, it } from 'vitest'
import { registerBalanceRoute, type BalanceDoc } from '../src/routes/balance.ts'
import { registerSubscriptionsRoute } from '../src/routes/subscriptions.ts'
import { registerRelayQuotasRoute } from '../src/routes/relay-quotas.ts'

/** 回环 GET 请求的最小替身（过 guardLoopback 的 peer + host 双校验）。 */
function loopbackGet(): IncomingMessage {
  return {
    method: 'GET',
    headers: { host: '127.0.0.1:3080' },
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as IncomingMessage
}

/** 捕获响应体的 res 替身。 */
function resDouble(): { res: ServerResponse; body: () => string } {
  let payload = ''
  const res = {
    writeHead: () => {},
    end: (chunk?: string) => { if (chunk !== undefined) payload = String(chunk) },
  } as unknown as ServerResponse
  return { res, body: () => payload }
}

/** 捕获路由的 webServer 替身（只登记路由，不真起服务）。 */
async function withRoutes(run: (ctx: Context, routes: { path: string; handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> }[]) => Promise<void>): Promise<void> {
  const routes: { path: string; handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> }[] = []
  const ctx = new Context()
  await ctx.plugin({
    name: 'test-route-budget-webserver',
    apply(child: Context): void {
      child.provide('webServer', {
        register: (route: { path: string; handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> }) => {
          routes.push(route)
          return () => {}
        },
      })
    },
  })
  await run(ctx, routes)
}

/** 取一条已注册路由。 */
function routeOf(routes: { path: string; handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> }[], path: string) {
  const route = routes.find(item => item.path === path)
  expect(route).toBeDefined()
  return route!.handler
}

describe('balance route response budget (issue #104)', () => {
  it('serves the cached balances with a stale marker when the refresh outlives the budget', async () => {
    // 刷新永远不落地（模拟上游查询被拖住 45s+ 的场景）。
    await withRoutes(async (ctx, routes) => {
      registerBalanceRoute(ctx, {
        trustedHosts: new Set(['127.0.0.1']),
        cached: () => ({ at: 0, doc: { balances: [{ provider: 'deepseek', displayName: 'DeepSeek', totalBalance: 12 }] } }),
        refreshOnce: () => new Promise<void>(() => {}),
        cacheMs: 5 * 60 * 1000,
        responseBudgetMs: 50,
      })
      const handler = routeOf(routes, '/api/billing/balance')
      const res = resDouble()
      const startedAt = Date.now()
      await handler(loopbackGet(), res.res)
      const elapsed = Date.now() - startedAt

      // 预算内落地（不再把浏览器连接挂住）。
      expect(elapsed).toBeLessThan(2_000)
      const doc = JSON.parse(res.body()) as BalanceDoc & { stale?: boolean }
      expect(doc.balances).toHaveLength(1)
      expect(doc.stale).toBe(true)
    })
  })

  it('serves the fresh balances without a stale marker when the refresh finishes in time', async () => {
    await withRoutes(async (ctx, routes) => {
      let cachedDoc: BalanceDoc = { balances: [] }
      registerBalanceRoute(ctx, {
        trustedHosts: new Set(['127.0.0.1']),
        cached: () => ({ at: 0, doc: cachedDoc }),
        refreshOnce: async () => { cachedDoc = { balances: [{ provider: 'deepseek', displayName: 'DeepSeek', totalBalance: 42 }] } },
        cacheMs: 5 * 60 * 1000,
        responseBudgetMs: 1_000,
      })
      const handler = routeOf(routes, '/api/billing/balance')
      const res = resDouble()
      await handler(loopbackGet(), res.res)
      const doc = JSON.parse(res.body()) as BalanceDoc & { stale?: boolean }
      expect(doc.balances).toHaveLength(1)
      expect(doc.stale).toBeUndefined()
    })
  })

  it('does not refresh while the cache is fresh', async () => {
    await withRoutes(async (ctx, routes) => {
      let refreshed = 0
      registerBalanceRoute(ctx, {
        trustedHosts: new Set(['127.0.0.1']),
        cached: () => ({ at: Date.now(), doc: { balances: [{ provider: 'deepseek', displayName: 'DeepSeek', totalBalance: 7 }] } }),
        refreshOnce: async () => { refreshed += 1 },
        cacheMs: 5 * 60 * 1000,
        responseBudgetMs: 1_000,
      })
      const handler = routeOf(routes, '/api/billing/balance')
      const res = resDouble()
      await handler(loopbackGet(), res.res)
      expect(refreshed).toBe(0)
      const doc = JSON.parse(res.body()) as BalanceDoc & { stale?: boolean }
      expect(doc.balances).toHaveLength(1)
      expect(doc.stale).toBeUndefined()
    })
  })
})

describe('quota routes response budget (issue #104)', () => {
  it('serves the cached subscription quotas with a stale marker when the refresh outlives the budget', async () => {
    await withRoutes(async (ctx, routes) => {
      registerSubscriptionsRoute(ctx, {
        trustedHosts: new Set(['127.0.0.1']),
        cached: () => ({ at: 0, quotas: [{ provider: 'kimi', displayName: '月之暗面', status: 'ok', windows: [] }] }),
        refreshOnce: () => new Promise<void>(() => {}),
        cacheMs: 5 * 60 * 1000,
        responseBudgetMs: 50,
      })
      const handler = routeOf(routes, '/api/billing/subscriptions')
      const res = resDouble()
      const startedAt = Date.now()
      await handler(loopbackGet(), res.res)
      expect(Date.now() - startedAt).toBeLessThan(2_000)
      const doc = JSON.parse(res.body()) as { quotas: unknown[]; stale?: boolean }
      expect(doc.quotas).toHaveLength(1)
      expect(doc.stale).toBe(true)
    })
  })

  it('serves the cached relay quotas with a stale marker when the refresh outlives the budget', async () => {
    await withRoutes(async (ctx, routes) => {
      registerRelayQuotasRoute(ctx, {
        trustedHosts: new Set(['127.0.0.1']),
        cached: () => ({ at: 0, quotas: [{ provider: 'newapi', displayName: 'New API', route: 'relay', status: 'ok', windows: [] }] }),
        refreshOnce: () => new Promise<void>(() => {}),
        cacheMs: 5 * 60 * 1000,
        responseBudgetMs: 50,
      })
      const handler = routeOf(routes, '/api/billing/relay-quotas')
      const res = resDouble()
      const startedAt = Date.now()
      await handler(loopbackGet(), res.res)
      expect(Date.now() - startedAt).toBeLessThan(2_000)
      const doc = JSON.parse(res.body()) as { quotas: unknown[]; stale?: boolean }
      expect(doc.quotas).toHaveLength(1)
      expect(doc.stale).toBe(true)
    })
  })
})
