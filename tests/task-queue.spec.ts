/**
 * Off-peak queue safety contract (issue #106).
 *
 * These tests use the real file-backed engine and lock, with a fake host Session
 * controller. No Agent turn is cancelled at peak, failures never replay, and two
 * engines sharing DSH_HOME cannot admit the same prompt twice.
 */

import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyBuiltinCatalog } from '../src/client/pricing.ts'
import { BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES } from '../src/builtin-catalog.ts'
import { TaskQueueEngine, type TaskQueueControllerFace, type TaskQueueWorkspaceContext } from '../src/task-queue.ts'

applyBuiltinCatalog(BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES)

const PEAK = Date.UTC(2026, 9, 27, 2, 0) // Tuesday 10:00 in Beijing
const OFF_PEAK = Date.UTC(2026, 9, 27, 4, 30) // Tuesday 12:30 in Beijing

interface PromptCall {
  readonly requestId: string
  readonly sessionId: string
  readonly content: readonly { type: string; text: string }[]
}

interface FakeControllerOptions {
  readonly gate?: Promise<void>
  readonly createGate?: Promise<void>
  readonly afterSelect?: () => void
  readonly reason?: { kind: string; error?: { message: string } }
  readonly emptyFollow?: boolean
  readonly relayMirror?: boolean
  /**
   * 宿主会话列表（issue #118）。给出这个字段，宿主才有会话列表读面；不给就
   * 当作「老宿主没有这个能力」——复用路径会一律降级。
   */
  readonly sessions?: readonly {
    sessionId: string
    running?: boolean
    cwd?: string
    origin?: string
  }[]
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void
  const promise = new Promise<void>(done => { resolve = done })
  return { promise, resolve }
}

function fakeController(options: FakeControllerOptions = {}) {
  const prompts: PromptCall[] = []
  const promptSignals: (AbortSignal | undefined)[] = []
  const createCalls: { cwd?: string; workspaceId?: string }[] = []
  let session = 0
  const controller = {
    create: vi.fn(async (request: { cwd?: string; workspaceId?: string }) => {
      if (options.createGate !== undefined) await options.createGate
      createCalls.push(request)
      return { sessionId: `session-${++session}` }
    }),
    selectModel: vi.fn(async () => {
      options.afterSelect?.()
      return {}
    }),
    prompt: vi.fn(async (request: PromptCall, signal?: AbortSignal) => {
      prompts.push(request)
      promptSignals.push(signal)
    }),
    follow: vi.fn(() => (async function* () {
      if (options.gate !== undefined) await options.gate
      if (options.emptyFollow === true) return
      const requestId = prompts[prompts.length - 1]?.requestId
      yield {
        type: 'event',
        event: { type: 'user/message', data: { source: { kind: 'user', rpcId: requestId } } },
      }
      yield {
        type: 'event',
        event: { type: 'turn/end', data: { reason: options.reason ?? { kind: 'completed' } } },
      }
    })()),
    modelCatalog: vi.fn(async () => ({
      default: { provider: 'deepseek-official', model: 'deepseek-flash' },
      groups: [
        {
          id: 'deepseek-official',
          name: 'DeepSeek',
          models: [
            { id: 'deepseek-flash', name: 'DeepSeek Chat' },
            { id: 'gpt-5', name: 'Not a time-of-day model' },
          ],
        },
        ...(options.relayMirror === true ? [{
          id: 'discount-relay',
          name: 'Discount Relay',
          models: [{ id: 'deepseek-flash', name: 'DeepSeek Chat via relay' }],
        }] : []),
      ],
    })),
    // 会话列表读面是可选能力（issue #118）：宿主没给 sessions 就当作没有这个方法。
    ...(options.sessions === undefined ? {} : {
      list: vi.fn(async () => ({ items: options.sessions ?? [] })),
    }),
  } as unknown as TaskQueueControllerFace
  return { controller, prompts, promptSignals, createCalls }
}

let root = ''
let workspace = ''
const engines: TaskQueueEngine[] = []

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'dsh-task-queue-'))
  workspace = join(root, 'workspace')
})

afterEach(async () => {
  for (const engine of engines) engine.stop()
  engines.length = 0
  // stop() deliberately does not await an admitted Prompt RPC. Its final atomic
  // queue write may therefore still be settling while the temporary directory
  // is removed; retry only the teardown, never the behavioral assertions.
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 10 })
})

function makeEngine(
  controller: TaskQueueControllerFace,
  now: () => number,
  ownerId?: string,
  workspaceContext?: TaskQueueWorkspaceContext,
): TaskQueueEngine {
  let id = 0
  const engine = new TaskQueueEngine({
    filePath: join(root, 'queue.json'),
    getController: () => controller,
    getWorkspaces: () => [{ path: workspace, title: 'Test workspace' }],
    ...(workspaceContext === undefined ? {} : { getWorkspaceContext: () => workspaceContext }),
    now,
    createId: () => `id-${++id}`,
    ...(ownerId === undefined ? {} : { ownerId }),
    pollMs: 5,
  })
  engines.push(engine)
  return engine
}

async function enqueue(
  engine: TaskQueueEngine,
  prompt = 'harmless task',
  source: { sourceSessionId?: string; reuseSource?: boolean } = {},
): Promise<void> {
  await engine.enqueue({
    prompt, cwd: workspace, provider: 'deepseek-official', model: 'deepseek-flash',
    ...source,
  })
}

describe('TaskQueueEngine safety and persistence', () => {
  it('waits during peak and starts the queued task after the off-peak switch', async () => {
    let now = PEAK
    const { controller, prompts } = fakeController()
    const engine = makeEngine(controller, () => now)
    engine.start()
    await enqueue(engine)
    await new Promise(resolve => setTimeout(resolve, 30))

    expect(prompts).toHaveLength(0)
    expect((await engine.snapshot()).tasks[0]?.status).toBe('queued')

    now = OFF_PEAK
    await vi.waitFor(async () => {
      expect((await engine.snapshot()).tasks[0]?.status).toBe('completed')
    })
    expect(prompts).toHaveLength(1)
  })

  it('lets an admitted turn finish across peak without cancellation or replay', async () => {
    const gate = deferred()
    let now = OFF_PEAK
    const { controller, prompts } = fakeController({ gate: gate.promise })
    const engine = makeEngine(controller, () => now)
    engine.start()
    await enqueue(engine)
    await vi.waitFor(() => expect(prompts).toHaveLength(1))

    now = PEAK
    gate.resolve()
    await vi.waitFor(async () => {
      expect((await engine.snapshot()).tasks[0]?.status).toBe('completed')
    })
    expect(prompts).toHaveLength(1)
  })

  it('marks an error turn as needs-review and never automatically retries it', async () => {
    const { controller, prompts } = fakeController({
      reason: { kind: 'error', error: { message: 'model failed safely' } },
    })
    const engine = makeEngine(controller, () => OFF_PEAK)
    engine.start()
    await enqueue(engine)
    await vi.waitFor(async () => {
      expect((await engine.snapshot()).tasks[0]?.status).toBe('failed')
    })
    await new Promise(resolve => setTimeout(resolve, 40))

    const task = (await engine.snapshot()).tasks[0]!
    expect(task.error).toContain('model failed safely')
    expect(prompts).toHaveLength(1)
  })

  it('recovers an expired running lease as an unconfirmed result, not a new attempt', async () => {
    await writeFile(join(root, 'queue.json'), JSON.stringify({
      version: 1,
      tasks: [{
        id: 'orphan', prompt: 'do not replay', cwd: workspace,
        provider: 'deepseek-official', model: 'deepseek-flash', status: 'running',
        createdAt: PEAK - 1000, startedAt: PEAK - 1000, sessionId: 'old-session',
        owner: 'dead-owner', leaseUntil: PEAK - 1,
      }],
    }), { mode: 0o600 })
    const { controller, prompts } = fakeController()
    const engine = makeEngine(controller, () => PEAK)
    engine.start()

    await vi.waitFor(async () => {
      expect((await engine.snapshot()).tasks[0]?.status).toBe('failed')
    })
    const task = (await engine.snapshot()).tasks[0]!
    expect(task.error).toContain('unconfirmed')
    expect(task.sessionId).toBe('old-session')
    expect(prompts).toHaveLength(0)
  })

  it('submits only once when two engines share the same queue file', async () => {
    const a = fakeController()
    const b = fakeController()
    const first = makeEngine(a.controller, () => OFF_PEAK, 'owner-a')
    const second = makeEngine(b.controller, () => OFF_PEAK, 'owner-b')
    first.start()
    second.start()
    await enqueue(first)

    await vi.waitFor(async () => {
      expect((await first.snapshot()).tasks[0]?.status).toBe('completed')
      expect((await second.snapshot()).tasks[0]?.status).toBe('completed')
    })
    expect(a.prompts.length + b.prompts.length).toBe(1)
  })

  it('keeps owner lease fields out of public snapshots and writes prompts as 0600', async () => {
    const gate = deferred()
    const { controller, prompts } = fakeController({ gate: gate.promise })
    const engine = makeEngine(controller, () => OFF_PEAK)
    engine.start()
    await enqueue(engine)
    await vi.waitFor(async () => {
      expect((await engine.snapshot()).tasks[0]?.status).toBe('running')
    })

    const snapshot = await engine.snapshot()
    expect(snapshot.tasks[0]).not.toHaveProperty('owner')
    expect(snapshot.tasks[0]).not.toHaveProperty('leaseUntil')
    expect((await stat(join(root, 'queue.json'))).mode & 0o777).toBe(0o600)
    expect(await readFile(join(root, 'queue.json'), 'utf8')).toContain('harmless task')
    expect(prompts).toHaveLength(1)

    gate.resolve()
    await vi.waitFor(async () => {
      expect((await engine.snapshot()).tasks[0]?.status).toBe('completed')
    })
  })

  it('runs multiple tasks in FIFO order with one independent Session per task', async () => {
    const { controller, prompts } = fakeController()
    const engine = makeEngine(controller, () => OFF_PEAK)
    engine.start()
    await enqueue(engine, 'first task')
    await enqueue(engine, 'second task')

    await vi.waitFor(async () => {
      const tasks = (await engine.snapshot()).tasks
      expect(tasks.map(task => task.status)).toEqual(['completed', 'completed'])
    })
    expect(prompts.map(prompt => prompt.content[0]?.text)).toEqual(['first task', 'second task'])
    expect(new Set(prompts.map(prompt => prompt.sessionId)).size).toBe(2)
  })

  it('excludes relay mirrors from official off-peak models and rejects direct enqueue', async () => {
    const { controller, prompts } = fakeController({ relayMirror: true })
    const engine = makeEngine(controller, () => PEAK)
    engine.start()

    const snapshot = await engine.snapshot()
    expect(snapshot.models.map(model => model.provider)).toEqual(['deepseek-official'])
    await expect(engine.enqueue({
      prompt: 'do not schedule on relay pricing', cwd: workspace,
      provider: 'discount-relay', model: 'deepseek-flash',
    })).rejects.toMatchObject({ status: 409 })
    expect((await engine.snapshot()).tasks).toEqual([])
    expect(prompts).toHaveLength(0)
  })

  it('exposes the factual host default without weakening enqueue route validation', async () => {
    const eligible = fakeController()
    const eligibleEngine = makeEngine(eligible.controller, () => PEAK)
    expect(await eligibleEngine.snapshot()).toMatchObject({
      defaultModel: { provider: 'deepseek-official', model: 'deepseek-flash' },
    })
    const eligibleCatalog = await eligible.controller.modelCatalog()
    vi.mocked(eligible.controller.modelCatalog).mockResolvedValue({
      ...eligibleCatalog,
      default: { provider: 'deepseek-account', model: 'deepseek-flash' },
    })
    expect((await eligibleEngine.snapshot()).defaultModel).toEqual({
      provider: 'deepseek-official', model: 'deepseek-flash',
    })
    expect((await eligibleEngine.snapshot(true)).defaultModel).toEqual({
      provider: 'deepseek-account', model: 'deepseek-flash',
    })

    const relay = fakeController({ relayMirror: true })
    const catalog = await relay.controller.modelCatalog()
    vi.mocked(relay.controller.modelCatalog).mockResolvedValue({
      ...catalog,
      default: { provider: 'discount-relay', model: 'deepseek-flash' },
    })
    const engine = makeEngine(relay.controller, () => PEAK)
    expect((await engine.snapshot()).defaultModel).toEqual({ provider: 'discount-relay', model: 'deepseek-flash' })
    await expect(engine.enqueue({
      prompt: 'relay default must not inherit official off-peak pricing', cwd: workspace,
      provider: 'discount-relay', model: 'deepseek-flash',
    })).rejects.toMatchObject({ status: 409 })
  })

  it('revalidates a queued model before creating a Session', async () => {
    let now = PEAK
    const { controller, prompts } = fakeController()
    const engine = makeEngine(controller, () => now)
    engine.start()
    await enqueue(engine)
    vi.mocked(controller.modelCatalog).mockResolvedValue({ groups: [] })

    now = OFF_PEAK
    await vi.waitFor(async () => {
      expect((await engine.snapshot()).tasks[0]?.status).toBe('failed')
    })
    expect(controller.create).not.toHaveBeenCalled()
    expect(prompts).toHaveLength(0)
  })

  it('fences a slow old owner before Prompt after another owner recovers its lease', async () => {
    const createGate = deferred()
    const slow = fakeController({ createGate: createGate.promise })
    const first = makeEngine(slow.controller, () => OFF_PEAK, 'slow-owner')
    first.start()
    await enqueue(first)
    await vi.waitFor(() => expect(slow.controller.create).toHaveBeenCalledTimes(1))

    const recovery = fakeController()
    const second = makeEngine(recovery.controller, () => OFF_PEAK + 46_000, 'recovery-owner')
    second.start()
    await vi.waitFor(async () => {
      expect((await second.snapshot()).tasks[0]?.status).toBe('failed')
    })
    createGate.resolve()
    await new Promise(resolve => setTimeout(resolve, 30))

    expect(slow.controller.selectModel).not.toHaveBeenCalled()
    expect(slow.prompts).toHaveLength(0)
    expect(recovery.prompts).toHaveLength(0)
  })

  it('requeues without a stale Session link when peak arrives before admission', async () => {
    let now = OFF_PEAK
    const { controller, prompts } = fakeController({ afterSelect: () => { now = PEAK } })
    const engine = makeEngine(controller, () => now)
    engine.start()
    await enqueue(engine)

    await vi.waitFor(async () => {
      expect((await engine.snapshot()).tasks[0]?.status).toBe('queued')
    })
    const task = (await engine.snapshot()).tasks[0]!
    expect(task.sessionId).toBeUndefined()
    expect(task.startedAt).toBeUndefined()
    expect(prompts).toHaveLength(0)
  })

  it('does not abort an admitted Prompt RPC when the plugin stops', async () => {
    const gate = deferred()
    const { controller, prompts, promptSignals } = fakeController({ gate: gate.promise })
    const engine = makeEngine(controller, () => OFF_PEAK)
    engine.start()
    await enqueue(engine)
    await vi.waitFor(() => expect(prompts).toHaveLength(1))

    engine.stop()
    expect(promptSignals).toHaveLength(1)
    expect(promptSignals[0]?.aborted).toBe(false)
    gate.resolve()
  })

  it('marks a dropped follow stream as unconfirmed and never replays it', async () => {
    const { controller, prompts } = fakeController({ emptyFollow: true })
    const engine = makeEngine(controller, () => OFF_PEAK)
    engine.start()
    await enqueue(engine)
    await vi.waitFor(async () => {
      expect((await engine.snapshot()).tasks[0]?.status).toBe('failed')
    })
    await new Promise(resolve => setTimeout(resolve, 40))

    expect((await engine.snapshot()).tasks[0]?.error).toContain('unconfirmed')
    expect(prompts).toHaveLength(1)
  })

  it('atomically imports a valid batch in FIFO order', async () => {
    const { controller } = fakeController()
    const engine = makeEngine(controller, () => PEAK)
    await engine.enqueueMany([
      { prompt: 'first import', cwd: workspace, provider: 'deepseek-official', model: 'deepseek-flash' },
      { prompt: 'second import', cwd: workspace, provider: 'deepseek-official', model: 'deepseek-flash' },
    ])

    const tasks = (await engine.snapshot()).tasks
    expect(tasks.map(task => task.prompt)).toEqual(['first import', 'second import'])
    expect(tasks.map(task => task.status)).toEqual(['queued', 'queued'])
  })

  it('writes no part of a batch when any item is invalid', async () => {
    const { controller, prompts } = fakeController({ relayMirror: true })
    const engine = makeEngine(controller, () => PEAK)
    await expect(engine.enqueueMany([
      { prompt: 'valid first item', cwd: workspace, provider: 'deepseek-official', model: 'deepseek-flash' },
      { prompt: 'invalid relay item', cwd: workspace, provider: 'discount-relay', model: 'deepseek-flash' },
    ])).rejects.toMatchObject({ status: 409, message: 'task 2: select an available DeepSeek time-of-day model' })

    expect((await engine.snapshot()).tasks).toEqual([])
    expect(prompts).toHaveLength(0)
  })

  it('rejects the whole import when existing active tasks plus the batch exceed fifty', async () => {
    const { controller } = fakeController()
    const engine = makeEngine(controller, () => PEAK)
    const task = { prompt: 'existing item', cwd: workspace, provider: 'deepseek-official', model: 'deepseek-flash' }
    await engine.enqueueMany(Array.from({ length: 49 }, () => task))

    await expect(engine.enqueueMany([
      task,
      { ...task, prompt: 'must not be partially appended' },
    ])).rejects.toMatchObject({ status: 409, message: 'too many active queue items' })
    const tasks = (await engine.snapshot()).tasks
    expect(tasks).toHaveLength(49)
    expect(tasks.every(item => item.prompt === 'existing item')).toBe(true)
  })

  it('summarizes only waiting tasks without probing the model catalog', async () => {
    const { controller } = fakeController()
    const engine = makeEngine(controller, () => PEAK)
    await engine.enqueueMany([
      { prompt: 'first import', cwd: workspace, provider: 'deepseek-official', model: 'deepseek-flash' },
      { prompt: 'second import', cwd: workspace, provider: 'deepseek-official', model: 'deepseek-flash' },
    ])
    vi.mocked(controller.modelCatalog).mockClear()

    expect(await engine.summary()).toMatchObject({ supported: true, tier: 'peak', queuedCount: 2 })
    expect((await engine.summary()).nextSwitchInMs).toBeGreaterThan(0)
    expect(controller.modelCatalog).not.toHaveBeenCalled()
  })

  it('rejects an empty or oversized batch before any queue write', async () => {
    const { controller } = fakeController()
    const engine = makeEngine(controller, () => PEAK)
    const task = { prompt: 'batch item', cwd: workspace, provider: 'deepseek-official', model: 'deepseek-flash' }
    await expect(engine.enqueueMany([])).rejects.toThrow('at least one task')
    await expect(engine.enqueueMany(Array.from({ length: 51 }, () => task))).rejects.toMatchObject({ status: 409 })
    expect((await engine.snapshot()).tasks).toEqual([])
  })
})

/**
 * 来源会话续跑（issue #118）。
 *
 * 契约：入队时记录来源会话 → 执行时优先在该会话内续跑（保留上下文与分组）；
 * 来源会话不可用时回退为新建会话，并把原因写在卡片上；复用路径不新建会话、
 * 也不动来源会话的模型。
 */
describe('TaskQueueEngine source Session reuse (issue #118)', () => {
  it('continues inside the source Session when it is idle and available', async () => {
    const { controller, prompts } = fakeController({
      sessions: [{ sessionId: 'session-source', cwd: workspace, running: false }],
    })
    const engine = makeEngine(controller, () => OFF_PEAK)
    engine.start()
    await enqueue(engine, 'continue here', { sourceSessionId: 'session-source', reuseSource: true })

    await vi.waitFor(async () => {
      expect((await engine.snapshot()).tasks[0]?.status).toBe('completed')
    })
    expect(prompts.map(prompt => prompt.sessionId)).toEqual(['session-source'])
    // 复用路径不新建会话；也不对来源会话调 selectModel——那会改用户的全局默认模型
    // 并在用户自己的会话日志里留下 model/selection 事件。
    expect(controller.create).not.toHaveBeenCalled()
    expect(controller.selectModel).not.toHaveBeenCalled()
    const task = (await engine.snapshot()).tasks[0]
    expect(task?.sessionId).toBe('session-source')
    expect(task?.sourceSessionId).toBe('session-source')
    expect(task?.reuseSource).toBe(true)
    expect(task?.fallbackReason).toBeUndefined()
  })

  it.each([
    ['source session no longer exists', [{ sessionId: 'session-other', running: false }]],
    ['source session is busy', [{ sessionId: 'session-source', running: true }]],
    ['source session belongs to a subagent', [{ sessionId: 'session-source', origin: 'subagent' }]],
    ['source session working directory changed', [{ sessionId: 'session-source', cwd: '/somewhere/else' }]],
  ] as const)('falls back to a new Session when %s', async (reason, sessions) => {
    const { controller, prompts, createCalls } = fakeController({ sessions })
    const engine = makeEngine(controller, () => OFF_PEAK)
    engine.start()
    await enqueue(engine, 'fallback task', { sourceSessionId: 'session-source', reuseSource: true })

    await vi.waitFor(async () => {
      expect((await engine.snapshot()).tasks[0]?.status).toBe('completed')
    })
    expect(createCalls).toHaveLength(1)
    expect(prompts[0]?.sessionId).not.toBe('session-source')
    const task = (await engine.snapshot()).tasks[0]
    expect(task?.fallbackReason).toBe(reason)
  })

  it('falls back when the source Session is archived', async () => {
    const { controller, prompts } = fakeController({
      sessions: [{ sessionId: 'session-source', running: false }],
    })
    const engine = makeEngine(controller, () => OFF_PEAK, undefined, {
      archivedSessionIds: ['session-source'],
      workspaceIdOfPath: () => undefined,
    })
    engine.start()
    await enqueue(engine, 'archived source', { sourceSessionId: 'session-source', reuseSource: true })

    await vi.waitFor(async () => {
      expect((await engine.snapshot()).tasks[0]?.status).toBe('completed')
    })
    expect(prompts[0]?.sessionId).not.toBe('session-source')
    expect((await engine.snapshot()).tasks[0]?.fallbackReason).toBe('source session is archived')
  })

  it('falls back when the host cannot list Sessions', async () => {
    const { controller, prompts } = fakeController()
    const engine = makeEngine(controller, () => OFF_PEAK)
    engine.start()
    await enqueue(engine, 'no session list', { sourceSessionId: 'session-source', reuseSource: true })

    await vi.waitFor(async () => {
      expect((await engine.snapshot()).tasks[0]?.status).toBe('completed')
    })
    expect(prompts[0]?.sessionId).not.toBe('session-source')
    expect((await engine.snapshot()).tasks[0]?.fallbackReason).toBe('this host cannot inspect Sessions')
  })

  it('keeps the isolated-Session default when reuse is not authorized', async () => {
    const { controller, prompts, createCalls } = fakeController({
      sessions: [{ sessionId: 'session-source', cwd: workspace, running: false }],
    })
    const engine = makeEngine(controller, () => OFF_PEAK)
    engine.start()
    await enqueue(engine, 'still isolated', { sourceSessionId: 'session-source', reuseSource: false })

    await vi.waitFor(async () => {
      expect((await engine.snapshot()).tasks[0]?.status).toBe('completed')
    })
    expect(createCalls).toHaveLength(1)
    expect(prompts[0]?.sessionId).not.toBe('session-source')
    const task = (await engine.snapshot()).tasks[0]
    expect(task?.reuseSource).toBe(false)
    expect(task?.fallbackReason).toBeUndefined()
  })

  it('creates the Session inside its workspace so it is not orphaned', async () => {
    const { controller, createCalls } = fakeController()
    const engine = makeEngine(controller, () => OFF_PEAK, undefined, {
      archivedSessionIds: [],
      workspaceIdOfPath: (path) => (path === workspace ? 'workspace-1' : undefined),
    })
    engine.start()
    await enqueue(engine, 'grouped task')

    await vi.waitFor(async () => {
      expect((await engine.snapshot()).tasks[0]?.status).toBe('completed')
    })
    // 归组走 create({ workspaceId })：宿主据此把会话挂进工作区，且不能再带 cwd。
    expect(createCalls).toEqual([{ workspaceId: 'workspace-1' }])
  })

  it('creates a cwd Session when no workspace matches the task directory', async () => {
    const { controller, createCalls } = fakeController()
    const engine = makeEngine(controller, () => OFF_PEAK, undefined, {
      archivedSessionIds: [],
      workspaceIdOfPath: () => undefined,
    })
    engine.start()
    await enqueue(engine, 'ungrouped task')

    await vi.waitFor(async () => {
      expect((await engine.snapshot()).tasks[0]?.status).toBe('completed')
    })
    expect(createCalls).toEqual([{ cwd: workspace }])
  })

  it('reads a queue file written before the source Session fields existed', async () => {
    await writeFile(join(root, 'queue.json'), JSON.stringify({
      version: 1,
      tasks: [{
        id: 'legacy-1', prompt: 'legacy task', cwd: workspace,
        provider: 'deepseek-official', model: 'deepseek-flash',
        status: 'queued', createdAt: OFF_PEAK,
      }],
    }), { mode: 0o600 })
    const { controller, prompts } = fakeController()
    const engine = makeEngine(controller, () => OFF_PEAK)
    engine.start()

    await vi.waitFor(async () => {
      expect((await engine.snapshot()).tasks[0]?.status).toBe('completed')
    })
    expect(prompts).toHaveLength(1)
  })
})
