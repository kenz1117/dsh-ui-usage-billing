/**
 * 路由准入声明（宿主 0.2.3-alpha.1 起必需）。
 *
 * 宿主把 Web 路由的 `auth` 默认值从「无鉴权」改成了 `'required'`：没通过宿主
 * 连接层鉴权的请求在进入 handler **之前**就被拒（401/503），插件自带的回环
 * 守卫根本没机会执行——面板会静默变成一片 0。本插件的端点只服务本机浏览器，
 * 安全边界是自带的 loopback 守卫（peer 回环 + Host 字面量 + trustedHosts +
 * Origin），所以每条路由都必须显式声明 `auth: 'anonymous'`。
 *
 * 本 spec 逐条锁住这个声明：新增路由若忘了写，宿主一升级就整片失效。
 */

import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { registerUsageStatsRoute } from '../src/routes/usage-stats.ts'
import { registerBalanceRoute } from '../src/routes/balance.ts'
import { registerNotifyClaimRoute } from '../src/routes/notify-claim.ts'
import { registerRelayQuotasRoute } from '../src/routes/relay-quotas.ts'
import { registerPricingModelsRoute } from '../src/routes/pricing-models.ts'
import { registerPricingRoutes } from '../src/routes/pricing.ts'
import { registerSubscriptionsRoute } from '../src/routes/subscriptions.ts'
import { registerUsageToolRoute } from '../src/routes/usage-tool.ts'
import { registerTaskQueueRoute } from '../src/routes/task-queue.ts'

interface CapturedRoute {
  kind?: string
  path?: string
  auth?: string
  handler?: unknown
}

/**
 * 收集一次注册里注册的全部路由（deps 只在 handler 内部被读，注册期不碰，
 * 故用空对象占位即可）。
 */
function captureRoutes(register: (ctx: Context) => void): CapturedRoute[] {
  const routes: CapturedRoute[] = []
  const ctx = {
    effect(fn: () => unknown) {
      fn()
    },
    webServer: {
      register(opts: CapturedRoute) {
        routes.push(opts)
        return () => {}
      },
    },
  }
  register(ctx as never)
  return routes
}

const REGISTRARS: { name: string; register: (ctx: Context) => void }[] = [
  { name: 'usage-stats', register: (ctx) => registerUsageStatsRoute(ctx, {} as never) },
  { name: 'balance', register: (ctx) => registerBalanceRoute(ctx, {} as never) },
  { name: 'notify-claim', register: (ctx) => registerNotifyClaimRoute(ctx, {} as never) },
  { name: 'relay-quotas', register: (ctx) => registerRelayQuotasRoute(ctx, {} as never) },
  { name: 'pricing-models', register: ctx => registerPricingModelsRoute(ctx, new Set()) },
  { name: 'pricing', register: (ctx) => registerPricingRoutes(ctx, {} as never) },
  { name: 'subscriptions', register: (ctx) => registerSubscriptionsRoute(ctx, {} as never) },
  { name: 'usage-tool', register: (ctx) => registerUsageToolRoute(ctx, {} as never) },
  { name: 'task-queue', register: (ctx) => registerTaskQueueRoute(ctx, {} as never) },
]

describe('web route admission (host 0.2.3-alpha.1+)', () => {
  it('registers the billing routes', () => {
    const routes = REGISTRARS.flatMap(registrar => captureRoutes(registrar.register))
    expect(routes).toHaveLength(11)
    expect(routes.map(route => route.path).sort()).toEqual([
      '/api/billing/balance',
      '/api/billing/notify-claim',
      '/api/billing/pricing',
      '/api/billing/pricing-models',
      '/api/billing/pricing/refresh',
      '/api/billing/relay-quotas',
      '/api/billing/subscriptions',
      '/api/billing/task-queue',
      '/api/billing/task-queue-summary',
      '/api/billing/usage-stats',
      '/api/billing/usage-tool',
    ])
  })

  it('declares anonymous admission on every route', () => {
    for (const registrar of REGISTRARS) {
      for (const route of captureRoutes(registrar.register)) {
        // 宿主默认 'required'：漏写即被拒（401/503），插件守卫不会执行。
        expect(route.auth, `${registrar.name} ${route.path ?? ''} must declare auth`).toBe('anonymous')
      }
    }
  })
})
