import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { ANONYMOUS_ROUTE_AUTH, guardLoopback, isLoopbackOrigin } from '../guard.ts'
import type { ScheduleSnapshot } from '../peak-schedule.ts'
import { ScheduleClockConflict } from '../peak-schedule-store.ts'

export interface PeakScheduleDeps {
  trustedHosts: ReadonlySet<string>
  read: () => Promise<ScheduleSnapshot>
  save: (raw: unknown) => Promise<ScheduleSnapshot>
}

/** Domain validation failures are distinct from storage failures. */
export class PeakScheduleInputError extends Error {}

const MAX_BODY_BYTES = 1024 * 1024

function reply(res: ServerResponse, status: number, value: ScheduleSnapshot | { error: string }): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(value))
}

export function registerPeakScheduleRoute(ctx: Context, deps: PeakScheduleDeps): void {
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: '/api/billing/peak-schedule',
      ...ANONYMOUS_ROUTE_AUTH,
      handler: async (req: IncomingMessage, res: ServerResponse) => {
        if (!guardLoopback(req, res, deps.trustedHosts)) return
        let raw: unknown
        if (req.method === 'POST') {
          if (!isLoopbackOrigin(req.headers.origin)) return reply(res, 403, { error: 'forbidden: loopback only' })
          const mediaType = req.headers['content-type']?.split(';', 1)[0]?.trim().toLowerCase()
          if (mediaType !== 'application/json') return reply(res, 415, { error: 'unsupported content-type' })

          const chunks: Buffer[] = []
          let bytes = 0
          try {
            // Do not destroy the connection when leaving the iterator early with a 413.
            for await (const chunk of req.iterator({ destroyOnReturn: false })) {
              const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
              bytes += buf.length
              if (bytes > MAX_BODY_BYTES) {
                req.resume()
                return reply(res, 413, { error: 'body too large' })
              }
              chunks.push(buf)
            }
            raw = JSON.parse(Buffer.concat(chunks, bytes).toString('utf8'))
          } catch {
            return reply(res, 400, { error: 'invalid json body' })
          }
        }

        let snapshot: ScheduleSnapshot
        try {
          snapshot = req.method === 'POST' ? await deps.save(raw) : await deps.read()
        } catch (error) {
          if (req.method === 'POST' && error instanceof PeakScheduleInputError) return reply(res, 400, { error: error.message })
          if (req.method === 'POST' && error instanceof ScheduleClockConflict) return reply(res, 409, { error: 'scheduleClockConflict' })
          return reply(res, 503, { error: 'peak schedule unavailable' })
        }
        reply(res, 200, snapshot)
      },
    }),
    'usage-billing: peak-schedule route',
  )
}
