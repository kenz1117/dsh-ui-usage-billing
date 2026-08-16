/**
 * Usage billing surface plugin, node half.
 *
 * Serves `/api/billing/usage-stats`: real usage aggregated from every
 * persisted session log (see `aggregate.ts`) — the browser dashboard reads it
 * instead of showing an empty snapshot. When `sessionPersistence` is
 * unavailable (or aggregation fails), the configured `statsPath` /
 * `DSH_USAGE_STATS` / conventional JSON file is served as a fallback, and a
 * missing file answers `{ error }` so the dashboard shows zeros, never
 * fabricated samples.
 */

import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
// Type-only: merges the ctx.sessionPersistence service declaration.
import type {} from '@deepseek-ai/dsh-session-persistence'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-credentials'
import { aggregateUsage } from './aggregate.ts'
import { queryBalances } from './balance.ts'
import { fetchLivePricing } from './pricing-fetch.ts'
import type { LivePricing } from './pricing-shared.ts'

/** Plugin configuration. */
export interface UsageBillingConfig {
  /** Absolute path to a `.dsh-usage-stats.json` fallback file. */
  statsPath?: string
  /** 订阅制（coding / token / agent plan）provider id 列表；默认 kimi-coding、xiaomi-token-plan-cn。 */
  subscriptionProviders?: string[]
  /** 余额查询用的 DeepSeek 凭据引用（环境变量名）；默认 DEEPSEEK_API_KEY。 */
  balanceApiKeyEnv?: string
}

/** 实时定价的后台刷新间隔（毫秒）：汇率/模型价低频变化，6 小时一次足够。 */
const PRICING_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000

/** DeepSeek 余额查询的默认凭据引用（与 llm-deepseek 的默认引用一致）。 */
const DEFAULT_BALANCE_API_KEY_ENV = 'DEEPSEEK_API_KEY'

/** Required services: the web server and the persisted session log store. */
export const inject = ['webServer', 'sessionPersistence', 'credentials']

/**
 * Host plugin body: serve real aggregated usage to the browser dashboard.
 * @param ctx - host context carrying webServer and sessionPersistence.
 * @param config - optional statsPath override.
 */
export function apply(ctx: Context, config: UsageBillingConfig = {}): void {
  const cwd = process.cwd()
  const candidates = [
    config.statsPath,
    process.env.DSH_USAGE_STATS,
    join(cwd, '.dsh-usage-stats.json'),
    join(homedir(), '.dsh/.dsh-usage-stats.json'),
  ].filter((path): path is string => typeof path === 'string' && path.length > 0)

  // 后台拉取实时定价（汇率 + OpenRouter 模型价），失败自动降级内置目录；
  // 之后每 6 小时刷新一次，汇率/价格无需重启进程就能保持最新。
  let live: LivePricing = { source: 'builtin' }
  const refreshPricing = async (): Promise<void> => {
    live = await fetchLivePricing()
  }
  void refreshPricing()
  ctx.effect(
    () => {
      const timer = setInterval(() => { void refreshPricing() }, PRICING_REFRESH_INTERVAL_MS)
      return () => { clearInterval(timer) }
    },
    'usage-billing: pricing refresh timer',
  )

  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: '/api/billing/pricing',
      handler: async (_req, res) => {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify(live))
      },
    }),
    'usage-billing: pricing route',
  )

  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: '/api/billing/balance',
      handler: async (_req, res) => {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        const balances = await queryBalances(ctx, config.balanceApiKeyEnv ?? DEFAULT_BALANCE_API_KEY_ENV)
        res.end(JSON.stringify({ balances }))
      },
    }),
    'usage-billing: balance route',
  )

  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: '/api/billing/usage-stats',
      handler: async (_req, res) => {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        try {
          res.end(JSON.stringify(await aggregateUsage(ctx.sessionPersistence, {
            ...(config.subscriptionProviders === undefined
              ? {}
              : { subscriptionProviders: config.subscriptionProviders }),
          })))
          return
        } catch {
          // Persistence read failed; fall through to the JSON-file candidates.
        }
        for (const candidate of candidates) {
          try {
            const text = await readFile(candidate, 'utf8')
            // Accept only parseable JSON so a stale or partial file never
            // reaches the dashboard as if it were real.
            JSON.parse(text)
            res.end(text)
            return
          } catch {
            // Try the next candidate location.
          }
        }
        res.end(JSON.stringify({ error: 'usage stats unavailable' }))
      },
    }),
    'usage-billing: usage-stats route',
  )
}
