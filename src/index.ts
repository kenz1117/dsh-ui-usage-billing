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
import { aggregateUsage } from './aggregate.ts'

/** Plugin configuration. */
export interface UsageBillingConfig {
  /** Absolute path to a `.dsh-usage-stats.json` fallback file. */
  statsPath?: string
}

/** Required services: the web server and the persisted session log store. */
export const inject = ['webServer', 'sessionPersistence']

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

  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: '/api/billing/usage-stats',
      handler: async (_req, res) => {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        try {
          res.end(JSON.stringify(await aggregateUsage(ctx.sessionPersistence)))
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
