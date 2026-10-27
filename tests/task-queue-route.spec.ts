/** Loopback queue route: mutation contract, old-host fallback and request guards. */

import { describe, expect, it, vi } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { registerTaskQueueRoute } from '../src/routes/task-queue.ts'
import { TaskQueueError, type TaskQueueEngine } from '../src/task-queue.ts'
import type { TaskQueueSnapshot } from '../src/task-queue-shared.ts'

const SNAPSHOT: TaskQueueSnapshot = {
  supported: true,
  tier: 'peak',
  nextSwitchInMs: 1000,
  tasks: [],
  workspaces: [],
  models: [],
}

function makeDeps(overrides: Partial<Record<'enqueue' | 'enqueueMany' | 'remove' | 'clearFinished' | 'summary', unknown>> = {}) {
  return {
    trustedHosts: new Set<string>(),
    engine: {
      snapshot: vi.fn(async () => SNAPSHOT),
      summary: vi.fn(async () => ({ supported: true, tier: 'peak', nextSwitchInMs: 1000, queuedCount: 2 })),
      enqueue: vi.fn(async () => {}),
      enqueueMany: vi.fn(async () => {}),
      remove: vi.fn(async () => {}),
      clearFinished: vi.fn(async () => {}),
      ...overrides,
    } as unknown as TaskQueueEngine,
  }
}

function captureRoute(deps: ReturnType<typeof makeDeps>, path = '/api/billing/task-queue') {
  let captured: { handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> } | undefined
  const ctx = {
    effect(fn: () => unknown) { fn() },
    webServer: {
      register(options: { path: string; handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> }) {
        if (options.path === path) captured = options
        return () => {}
      },
    },
  }
  registerTaskQueueRoute(ctx as never, deps)
  if (captured === undefined) throw new Error(`route was not registered: ${path}`)
  return captured
}

function fakeReq(method: string, headers: Record<string, string>, body = ''): IncomingMessage {
  return {
    method,
    headers,
    url: '/api/billing/task-queue',
    socket: { remoteAddress: '127.0.0.1' },
    [Symbol.asyncIterator]: async function* () {
      if (body !== '') yield Buffer.from(body)
    },
  } as unknown as IncomingMessage
}

function fakeRes() {
  const calls: { status?: number; body: string }[] = []
  return {
    calls,
    writeHead(status: number) {
      calls.push({ status, body: '' })
      return this as never
    },
    end(chunk: string) {
      if (calls.length === 0) calls.push({ status: 200, body: '' })
      calls[calls.length - 1]!.body += chunk
    },
  } as unknown as ServerResponse & { calls: { status?: number; body: string }[] }
}

const POST_HEADERS = { origin: 'http://127.0.0.1:3080', 'content-type': 'application/json' }

async function request(
  deps: ReturnType<typeof makeDeps>,
  method: string,
  headers: Record<string, string>,
  body = '',
  path = '/api/billing/task-queue',
) {
  const { handler } = captureRoute(deps, path)
  const res = fakeRes()
  await handler(fakeReq(method, headers, body), res)
  return res
}

describe('task queue route', () => {
  it('returns the queue snapshot on GET', async () => {
    const deps = makeDeps()
    const res = await request(deps, 'GET', {})
    expect(res.calls).toHaveLength(1)
    expect(res.calls[0]?.status).toBe(200)
    expect(JSON.parse(res.calls[0]!.body)).toEqual(SNAPSHOT)
  })

  it('returns the lightweight queue summary on its own GET route', async () => {
    const deps = makeDeps()
    const res = await request(deps, 'GET', {}, '', '/api/billing/task-queue-summary')
    expect(res.calls[0]?.status).toBe(200)
    expect(JSON.parse(res.calls[0]!.body)).toEqual({
      supported: true, tier: 'peak', nextSwitchInMs: 1000, queuedCount: 2,
    })
    expect(deps.engine.snapshot).not.toHaveBeenCalled()
  })

  it('dispatches enqueue, batch import, remove and clearFinished mutations', async () => {
    const deps = makeDeps()
    const tasks = [{ prompt: 'batch task', cwd: '/tmp/work', provider: 'deepseek-official', model: 'deepseek-flash' }]
    for (const body of [
      { action: 'enqueue', prompt: 'task', cwd: '/tmp/work', provider: 'deepseek-official', model: 'deepseek-flash' },
      { action: 'enqueueMany', tasks },
      { action: 'remove', id: 'task-1' },
      { action: 'clearFinished' },
    ]) {
      const res = await request(deps, 'POST', POST_HEADERS, JSON.stringify(body))
      expect(res.calls[0]?.status).toBe(200)
      expect(JSON.parse(res.calls[0]!.body)).toEqual({ ok: true, snapshot: SNAPSHOT })
    }
    expect(deps.engine.enqueue).toHaveBeenCalledTimes(1)
    expect(deps.engine.enqueueMany).toHaveBeenCalledWith(tasks)
    expect(deps.engine.remove).toHaveBeenCalledWith('task-1')
    expect(deps.engine.clearFinished).toHaveBeenCalledTimes(1)
  })

  it('returns 400 for malformed or non-object JSON', async () => {
    const deps = makeDeps()
    for (const body of ['{not-json', 'null', '[]']) {
      const res = await request(deps, 'POST', POST_HEADERS, body)
      expect(res.calls).toHaveLength(1)
      expect(res.calls[0]?.status).toBe(400)
    }
    expect(deps.engine.enqueue).not.toHaveBeenCalled()
  })

  it('rejects cross-site writes, non-JSON writes and bodies over 10 MiB', async () => {
    const deps = makeDeps()
    expect((await request(deps, 'POST', { ...POST_HEADERS, origin: 'https://evil.example' }, '{}')).calls[0]?.status).toBe(403)
    expect((await request(deps, 'POST', { origin: POST_HEADERS.origin, 'content-type': 'text/plain' }, '{}')).calls[0]?.status).toBe(415)
    expect((await request(deps, 'POST', POST_HEADERS, '你'.repeat(3_500_000))).calls[0]?.status).toBe(413)
    expect((await request(deps, 'PUT', POST_HEADERS, '{}')).calls[0]?.status).toBe(403)
    expect(deps.engine.enqueue).not.toHaveBeenCalled()
  })

  it('accepts the maximum Prompt even when JSON escaping expands its bytes', async () => {
    const deps = makeDeps()
    const body = JSON.stringify({
      action: 'enqueue', prompt: '\0'.repeat(32_000), cwd: '/tmp/work',
      provider: 'deepseek-official', model: 'deepseek-flash',
    })
    expect(Buffer.byteLength(body)).toBeGreaterThan(192_000)
    expect(Buffer.byteLength(body)).toBeLessThan(256 * 1024)
    const res = await request(deps, 'POST', POST_HEADERS, body)
    expect(res.calls[0]?.status).toBe(200)
    expect(deps.engine.enqueue).toHaveBeenCalledTimes(1)
  })

  it('accepts a maximum-size batch after JSON escaping expands its bytes', async () => {
    const deps = makeDeps()
    const tasks = Array.from({ length: 50 }, () => ({
      prompt: '\0'.repeat(32_000), cwd: '/tmp/work',
      provider: 'deepseek-official', model: 'deepseek-flash',
    }))
    const body = JSON.stringify({ action: 'enqueueMany', tasks })
    expect(Buffer.byteLength(body)).toBeGreaterThan(9 * 1024 * 1024)
    expect(Buffer.byteLength(body)).toBeLessThan(10 * 1024 * 1024)
    const res = await request(deps, 'POST', POST_HEADERS, body)
    expect(res.calls[0]?.status).toBe(200)
    expect(deps.engine.enqueueMany).toHaveBeenCalledWith(tasks)
  })

  it('surfaces old-host degradation as 409 instead of a fake success', async () => {
    const deps = makeDeps({
      enqueue: vi.fn(async () => { throw new TaskQueueError('this host does not provide Session task control', 409) }),
    })
    const res = await request(deps, 'POST', POST_HEADERS, JSON.stringify({
      action: 'enqueue', prompt: 'task', cwd: '/tmp/work', provider: 'deepseek-official', model: 'deepseek-flash',
    }))
    expect(res.calls[0]?.status).toBe(409)
    expect(JSON.parse(res.calls[0]!.body).error).toContain('does not provide')
  })
})
