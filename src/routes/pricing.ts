/**
 * 路由：GET /api/billing/pricing + POST /api/billing/pricing/refresh
 *
 * 实时定价（汇率 + OpenRouter 模型价 + models.dev 目录外补充）的 GET/POST 同
 * concern，合一个文件：
 * - GET 由前端 30s 轮询 + 弹窗初始拉取触发，返回完整价目表文档（live + 内置
 *   目录 + 别名表 + syncedAt）。
 * - POST 是费率条「立即同步」按钮触发，强制服务端重新拉取一次；写操作额外
 *   校验 Origin 与 Content-Type。
 *
 * 路由文件只关心 HTTP 层：响应体序列化与缓存（pricingBodyCache）由 index.ts
 * 装配器通过 `body()` 闭包注入；服务端重拉逻辑（refreshPricing + 价格目录代际
 * 变化触发 reprice）也在装配器里，路由只通过 `refresh()` 触发。
 */

import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { ANONYMOUS_ROUTE_AUTH, guardLoopback, isLoopbackOrigin } from '../guard.ts'

/** 路由依赖：装配器注入。 */
export interface PricingDeps {
  trustedHosts: ReadonlySet<string>
  /** 装配器内缓存的序列化响应体（含 live + 内置目录 + 别名 + syncedAt）。 */
  body: () => string
  /** 触发服务端重新拉取 models.dev / 汇率。 */
  refresh: () => Promise<void>
}

/** GET /api/billing/pricing。 */
function registerGetRoute(ctx: Context, deps: PricingDeps): void {
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: '/api/billing/pricing',
      ...ANONYMOUS_ROUTE_AUTH,
      handler: async (req: IncomingMessage, res: ServerResponse) => {
        if (!guardLoopback(req, res, deps.trustedHosts)) return
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        res.end(deps.body())
      },
    }),
    'usage-billing: pricing route',
  )
}

/** POST /api/billing/pricing/refresh。 */
function registerRefreshRoute(ctx: Context, deps: PricingDeps): void {
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: '/api/billing/pricing/refresh',
      ...ANONYMOUS_ROUTE_AUTH,
      handler: async (req: IncomingMessage, res: ServerResponse) => {
        if (!guardLoopback(req, res, deps.trustedHosts)) return
        if (req.method !== 'POST') {
          res.writeHead(405, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ error: 'method not allowed' }))
          return
        }
        if (!isLoopbackOrigin(req.headers.origin)) {
          res.writeHead(403, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ error: 'forbidden: loopback only' }))
          return
        }
        if (!(req.headers['content-type'] ?? '').toLowerCase().includes('application/json')) {
          res.writeHead(415, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ error: 'unsupported content-type' }))
          return
        }
        await deps.refresh()
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        res.end(deps.body())
      },
    }),
    'usage-billing: pricing refresh route',
  )
}

/** 一次性注册两条同 concern 路由。 */
export function registerPricingRoutes(ctx: Context, deps: PricingDeps): void {
  registerGetRoute(ctx, deps)
  registerRefreshRoute(ctx, deps)
}
