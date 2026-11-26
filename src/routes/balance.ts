/**
 * 路由：GET /api/billing/balance
 *
 * 多平台余额（DeepSeek / Kimi / StepFun / SiliconFlow / xAI / 智谱 / 腾讯云
 * TokenHub 等）+ 用户自定义余额 + 声明端点 + 余额差对账。5 分钟缓存（避免
 * 每 30s 后台轮询打上游），in-flight 去重（并发请求共享同一次进行中的刷新）。
 *
 * 路由文件只关心 HTTP 缓存逻辑：5 分钟过期判定 + 刷新预算（超预算回旧
 * 缓存并标 stale，不把响应挂在长查询上）+ 失败时仍发旧缓存（不挂起已
 * writeHead 的响应）。上游查询（queryBalances / queryCustomBalances /
 * queryDeclaredEndpoints / reconcileBalanceDelta）在装配器里跑，路由只通过
 * `cached()` 与 `refreshOnce()` 拿到结果。
 */

import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { BALANCE_CLIENT_HEADERS, type BalanceClientMetadata, type ProviderBalance } from '../pricing-shared.ts'
import type { ReconcileEvent } from '../reconcile.ts'
import { ANONYMOUS_ROUTE_AUTH, guardLoopback } from '../guard.ts'

/** 余额响应体形状（来自装配器 `balanceCache.doc`）。 */
export interface BalanceDoc {
  balances: readonly ProviderBalance[]
  reconcile?: ReconcileEvent
  /**
   * 本次余额来自上一次成功的查询（刷新超预算，见 {@link BalanceDeps.responseBudgetMs}）。
   * 客户端据此提示「余额数据来自上次查询」，别把旧值当最新读。
   */
  stale?: boolean
}

interface CachedBalance {
  doc: BalanceDoc
  at: number
}

/** 路由依赖。 */
export interface BalanceDeps {
  trustedHosts: ReadonlySet<string>
  /** 装配器内缓存 + 时间戳（`Date.now()`）。 */
  cached: (client?: BalanceClientMetadata) => CachedBalance
  /** in-flight 去重的刷新入口。 */
  refreshOnce: (client?: BalanceClientMetadata) => Promise<void>
  /** 5 分钟缓存间隔（毫秒）。 */
  cacheMs: number
  /**
   * 刷新的总等待预算（毫秒）：超预算立刻回上一次成功的余额。
   *
   * 存在的理由（issue #104）：浏览器对同源最多 6 条并发连接，而余额响应被
   * 上游查询（最坏 8s 超时 × 重试）拖住时，这条连接会被长期占住；多标签页
   * 各挂一条即占满连接池，宿主自己的资源请求排队——用户看到的是「整个 DSH
   * 界面卡死」。预算到期后刷新在后台继续（in-flight 去重共享同一次刷新），
   * 下一轮轮询即可拿到新值。
   */
  responseBudgetMs: number
}

/** Loopback callers can supply these advisory UI headers. */
export function readClientMetadata(headers: IncomingMessage['headers']): BalanceClientMetadata | undefined {
  const version = headers[BALANCE_CLIENT_HEADERS.version]
  const locale = headers[BALANCE_CLIENT_HEADERS.locale]
  const offset = headers[BALANCE_CLIENT_HEADERS.timezone]
  if (typeof version !== 'string' || !/^[\w.+-]{1,64}$/.test(version) ||
      typeof locale !== 'string' || !/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8}){0,8}$/.test(locale) ||
      typeof offset !== 'string' || !/^-?\d{1,5}$/.test(offset)) return undefined
  const timezoneOffsetSeconds = Number(offset)
  if (Math.abs(timezoneOffsetSeconds) > 14 * 3600) return undefined
  return { version, locale, timezoneOffsetSeconds }
}

export function registerBalanceRoute(ctx: Context, deps: BalanceDeps): void {
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: '/api/billing/balance',
      ...ANONYMOUS_ROUTE_AUTH,
      handler: async (req: IncomingMessage, res: ServerResponse) => {
        if (!guardLoopback(req, res, deps.trustedHosts)) return
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        const client = readClientMetadata(req.headers)
        const cached = deps.cached(client)
        if (Date.now() - cached.at < deps.cacheMs) {
          res.end(JSON.stringify(cached.doc))
          return
        }
        // 刷新预算：到期立刻回上一次成功的余额（stale 标记），不把响应挂在
        // 上游查询上（issue #104：响应长期不落地会占满浏览器的同源连接池）。
        let timedOut = false
        let failed = false
        const onFailure = (error: unknown): void => {
          // 查询失败：保留上次成功快照（从未成功则为空余额），避免每 30 秒把偶发故障刷成「未配置」。
          failed = true
          console.warn('[usage-billing] refreshBalances failed; serving cached balances:', error)
        }
        await Promise.race([
          deps.refreshOnce(client).then(() => undefined, onFailure),
          new Promise<void>(resolve => { setTimeout(() => { timedOut = true; resolve() }, deps.responseBudgetMs).unref() }),
        ])
        const doc = deps.cached(client).doc
        res.end(JSON.stringify(timedOut || failed ? { ...doc, stale: true } : doc))
      },
    }),
    'usage-billing: balance route',
  )
}
