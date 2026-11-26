import type { IncomingMessage, ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'
import { PeakScheduleInputError, registerPeakScheduleRoute } from '../src/routes/peak-schedule.ts'
import type { ScheduleSnapshot } from '../src/peak-schedule.ts'
import { ScheduleClockConflict } from '../src/peak-schedule-store.ts'

const snapshot: ScheduleSnapshot = {
  config: { version: 2, models: { '["direct:local","flash"]': { windows: [60, 120] } } },
  models: [{ source: 'direct:local', model: 'flash', label: 'Flash' }],
  notices: [{ code: 'legacySchedule' }],
}

function setup() {
  const read = vi.fn(async () => snapshot)
  const save = vi.fn(async (_raw: unknown) => snapshot)
  type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void>
  let handler!: Handler
  registerPeakScheduleRoute({
    effect: (fn: () => void) => fn(),
    webServer: { register: (opts: { handler: Handler }) => { handler = opts.handler; return () => {} } },
  } as never, { read, save, trustedHosts: new Set(['billing.example']) })

  async function request(method: string, chunks: Buffer[] = [], headers: Record<string, string> = {}, peer = '127.0.0.1') {
    const req = Object.assign(Readable.from(chunks), {
      method, headers: { host: 'localhost', 'content-type': 'application/json', ...headers }, socket: { remoteAddress: peer },
    })
    const res = { writeHead: vi.fn(), end: vi.fn() }
    await handler(req as unknown as IncomingMessage, res as unknown as ServerResponse)
    expect(res.writeHead).toHaveBeenCalledTimes(1)
    expect(res.end).toHaveBeenCalledTimes(1)
    return { status: res.writeHead.mock.calls[0]![0], body: JSON.parse(res.end.mock.calls[0]![0]) }
  }
  return { read, save, request }
}

describe('peak schedule route', () => {
  it('returns the complete snapshot on GET through a trusted Host', async () => {
    const { request, read, save } = setup()
    expect(await request('GET', [], { host: 'BILLING.example:3080' })).toEqual({ status: 200, body: snapshot })
    expect(read).toHaveBeenCalledOnce()
    expect(save).not.toHaveBeenCalled()
  })

  it('passes the edit to save, decoding UTF-8 across chunk boundaries', async () => {
    const { request, read, save } = setup()
    const config = { version: 3, changes: { '["direct:local","模型"]': {} } }
    const bytes = Buffer.from(JSON.stringify(config))
    const split = bytes.indexOf('模') + 1
    const res = await request('POST', [bytes.subarray(0, split), bytes.subarray(split)], {
      origin: 'http://localhost:3080', 'content-type': 'Application/JSON; charset=utf-8',
    })
    expect(res).toEqual({ status: 200, body: snapshot })
    expect(save).toHaveBeenCalledExactlyOnceWith(config)
    expect(read).not.toHaveBeenCalled()
  })

  it('rejects disallowed methods, peers, hosts and cross-site writes before dispatch', async () => {
    const { request, read, save } = setup()
    expect((await request('PUT')).status).toBe(403)
    expect((await request('GET', [], { host: 'billing.example' }, '192.0.2.1')).status).toBe(403)
    expect((await request('GET', [], { host: 'untrusted.example' })).status).toBe(403)
    expect((await request('POST', [], { origin: 'https://other.example' })).status).toBe(403)
    expect(read).not.toHaveBeenCalled()
    expect(save).not.toHaveBeenCalled()
  })

  it('rejects wrong media types, malformed JSON and oversized streamed bodies before save', async () => {
    const { request, save } = setup()
    expect((await request('POST', [], { 'content-type': 'text/plain' })).status).toBe(415)
    expect((await request('POST', [Buffer.from('{')])).status).toBe(400)
    expect((await request('POST', [Buffer.alloc(1024 * 1024), Buffer.from(' ')] )).status).toBe(413)
    expect(save).not.toHaveBeenCalled()
  })

  it('distinguishes invalid configs from unavailable storage', async () => {
    const { request, read, save } = setup()
    const body = [Buffer.from('{}')]
    save.mockRejectedValueOnce(new PeakScheduleInputError('Invalid schedule version'))
    expect(await request('POST', body)).toEqual({ status: 400, body: { error: 'Invalid schedule version' } })
    save.mockRejectedValueOnce(new ScheduleClockConflict())
    expect(await request('POST', body)).toEqual({ status: 409, body: { error: 'scheduleClockConflict' } })
    save.mockRejectedValueOnce(new Error('disk error'))
    expect((await request('POST', body)).status).toBe(503)
    read.mockRejectedValueOnce(new Error('disk error'))
    expect((await request('GET')).status).toBe(503)
  })
})
