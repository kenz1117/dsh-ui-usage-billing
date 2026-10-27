/** Loopback-only GET/POST /api/billing/task-queue (issue #106). */

import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { guardLoopback, isLoopbackOrigin } from '../guard.ts'
import { TaskQueueError, type TaskQueueEngine } from '../task-queue.ts'

// 32k UTF-16 code units can expand to 192 KiB when JSON escapes control
// characters. Keep the transport cap above that valid maximum, still bounded.
const BODY_LIMIT = 256 * 1024
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, JSON_HEADERS)
  res.end(JSON.stringify(body))
}

export interface TaskQueueRouteDeps {
  readonly trustedHosts: ReadonlySet<string>
  readonly engine: TaskQueueEngine
}

export function registerTaskQueueRoute(ctx: Context, deps: TaskQueueRouteDeps): void {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/api/billing/task-queue',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      if (!guardLoopback(req, res, deps.trustedHosts)) return
      if (req.method !== 'GET' && req.method !== 'POST') {
        send(res, 405, { error: 'method not allowed' })
        return
      }
      if (req.method === 'POST') {
        if (!isLoopbackOrigin(req.headers.origin)) {
          send(res, 403, { error: 'forbidden: loopback only' })
          return
        }
        if (!(req.headers['content-type'] ?? '').toLowerCase().includes('application/json')) {
          send(res, 415, { error: 'unsupported content-type' })
          return
        }
      }
      try {
        if (req.method === 'GET') {
          send(res, 200, await deps.engine.snapshot())
          return
        }
        const chunks: Buffer[] = []
        let bytes = 0
        for await (const chunk of req) {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))
          bytes += buffer.byteLength
          if (bytes > BODY_LIMIT) {
            send(res, 413, { error: 'body too large' })
            return
          }
          chunks.push(buffer)
        }
        let input: Record<string, unknown>
        try {
          const body = Buffer.concat(chunks).toString('utf8')
          const parsed = JSON.parse(body === '' ? '{}' : body) as unknown
          if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new TaskQueueError('request body must be a JSON object')
          }
          input = parsed as Record<string, unknown>
        } catch (error) {
          if (error instanceof TaskQueueError) throw error
          throw new TaskQueueError('malformed JSON body')
        }
        switch (input.action) {
          case 'enqueue':
            await deps.engine.enqueue(input)
            break
          case 'remove':
            if (typeof input.id !== 'string' || input.id === '') throw new TaskQueueError('queue item id is required')
            await deps.engine.remove(input.id)
            break
          case 'clearFinished':
            await deps.engine.clearFinished()
            break
          default:
            throw new TaskQueueError('unknown queue action')
        }
        send(res, 200, { ok: true, snapshot: await deps.engine.snapshot() })
      } catch (error) {
        const status = error instanceof TaskQueueError ? error.status : 503
        send(res, status, { error: error instanceof Error ? error.message.slice(0, 300) : 'queue operation failed' })
      }
    },
  }), 'usage-billing: task queue route')
}
