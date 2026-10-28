/**
 * Durable off-peak FIFO task queue (issue #106, new-host capability preview).
 *
 * Safety contract: tasks START only in the DeepSeek off-peak window; an admitted
 * turn is never cancelled at the next peak. Failed/unknown outcomes never auto-
 * retry. A file lock + owner lease prevents two DSH instances sharing DSH_HOME
 * from submitting the same task. Prompts are persisted with mode 0600.
 */

import { randomUUID } from 'node:crypto'
import { mkdir, readFile } from 'node:fs/promises'
import { dirname, isAbsolute } from 'node:path'
import { writeFileAtomic, withFileLock } from '@deepseek-ai/dsh-atomic-write'
import type { SessionController } from '@deepseek-ai/dsh-api-session-controller'
import type { SessionPromptRequest } from '@deepseek-ai/dsh-api-session-controller/types'
import { channelCountdown, rateChannelOf, tierAt } from './client/pricing.ts'
import type {
  TaskQueueInput,
  TaskQueueModel,
  TaskQueueModelSelection,
  TaskQueueSnapshot,
  TaskQueueStatus,
  TaskQueueSummary,
  TaskQueueTask,
  TaskQueueWorkspace,
} from './task-queue-shared.ts'

const QUEUE_VERSION = 1
const MAX_TASKS = 100
const MAX_QUEUED = 50
const MAX_PROMPT_LENGTH = 32_000
const LOCK_WAIT_MS = 5_000
const LEASE_MS = 45_000
const HEARTBEAT_MS = 15_000
const OPTIONS_CACHE_MS = 60_000

interface StoredTask extends TaskQueueTask {
  readonly owner?: string | undefined
  readonly leaseUntil?: number | undefined
}

interface QueueDocument {
  readonly version: typeof QUEUE_VERSION
  readonly tasks: readonly StoredTask[]
}

export type TaskQueueController = Pick<SessionController, 'create' | 'selectModel' | 'prompt' | 'follow' | 'modelCatalog'>
type ControllerFace = TaskQueueController

export interface TaskQueueEngineOptions {
  readonly filePath: string
  readonly getController: () => ControllerFace | undefined
  readonly getWorkspaces: () => readonly TaskQueueWorkspace[]
  readonly now?: () => number
  readonly createId?: () => string
  readonly ownerId?: string
  readonly pollMs?: number
}

export class TaskQueueError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message)
    this.name = 'TaskQueueError'
  }
}

function messageOf(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.slice(0, 300)
}

function isTerminal(status: TaskQueueStatus): boolean {
  return status === 'completed' || status === 'failed'
}

function validStoredTask(value: unknown): value is StoredTask {
  if (value === null || typeof value !== 'object') return false
  const task = value as Partial<StoredTask>
  return typeof task.id === 'string' && task.id !== ''
    && typeof task.prompt === 'string' && task.prompt.trim() !== '' && task.prompt.length <= MAX_PROMPT_LENGTH
    && typeof task.cwd === 'string' && isAbsolute(task.cwd)
    && typeof task.provider === 'string' && task.provider !== ''
    && typeof task.model === 'string' && task.model !== ''
    && typeof task.createdAt === 'number' && Number.isFinite(task.createdAt)
    && ['queued', 'starting', 'running', 'completed', 'failed'].includes(task.status ?? '')
    && (task.sessionId === undefined || typeof task.sessionId === 'string')
    && (task.owner === undefined || typeof task.owner === 'string')
    && (task.leaseUntil === undefined || typeof task.leaseUntil === 'number')
}

function publicTask(task: StoredTask): TaskQueueTask {
  const { owner: _owner, leaseUntil: _leaseUntil, ...pub } = task
  return pub
}

/** The host API is an optional capability; absence never blocks plugin startup. */
function usableController(value: ControllerFace | undefined): ControllerFace | undefined {
  if (value === undefined) return undefined
  return (['create', 'selectModel', 'prompt', 'follow', 'modelCatalog'] as const)
    .every(key => typeof value[key] === 'function') ? value : undefined
}

export class TaskQueueEngine {
  private readonly now: () => number
  private readonly createId: () => string
  private readonly ownerId: string
  private readonly pollMs: number
  private timer: ReturnType<typeof setInterval> | undefined
  private heartbeat: ReturnType<typeof setInterval> | undefined
  private taskAbort: AbortController | undefined
  private stopped = true
  private pumping = false
  private modelCache: {
    at: number
    models: readonly TaskQueueModel[]
    defaultModel?: TaskQueueModelSelection | undefined
  } | undefined

  constructor(private readonly options: TaskQueueEngineOptions) {
    this.now = options.now ?? Date.now
    this.createId = options.createId ?? randomUUID
    this.ownerId = options.ownerId ?? randomUUID()
    this.pollMs = options.pollMs ?? 15_000
  }

  start(): void {
    if (!this.stopped) return
    this.stopped = false
    this.timer = setInterval(() => { void this.pump() }, this.pollMs)
    this.timer.unref()
    void this.pump()
  }

  stop(): void {
    this.stopped = true
    if (this.timer !== undefined) clearInterval(this.timer)
    if (this.heartbeat !== undefined) clearInterval(this.heartbeat)
    this.timer = undefined
    this.heartbeat = undefined
    // Abort only our follow stream, never the Prompt RPC or the admitted turn.
    this.taskAbort?.abort()
    // Do not cancel an admitted Agent turn here. The expiring lease makes an
    // orphaned result "failed / needs review" instead of ever replaying it.
  }

  async snapshot(refreshModels = false): Promise<TaskQueueSnapshot> {
    const countdown = channelCountdown(this.now(), 'deepseek-metered')
    const controller = usableController(this.options.getController())
    const base = {
      supported: controller !== undefined,
      tier: tierAt(this.now()),
      nextSwitchInMs: countdown?.nextSwitchInMs ?? 0,
      tasks: (await this.readDocument()).tasks.map(publicTask),
      workspaces: this.options.getWorkspaces(),
    }
    if (controller === undefined) return { ...base, models: [] }
    try {
      return { ...base, ...await this.modelOptions(controller, refreshModels) }
    } catch (error) {
      return { ...base, models: [], optionsError: messageOf(error) }
    }
  }

  async summary(): Promise<TaskQueueSummary> {
    const countdown = channelCountdown(this.now(), 'deepseek-metered')
    const document = await this.readDocument()
    return {
      supported: usableController(this.options.getController()) !== undefined,
      tier: tierAt(this.now()),
      nextSwitchInMs: countdown?.nextSwitchInMs ?? 0,
      queuedCount: document.tasks.filter(task => task.status === 'queued').length,
    }
  }

  async enqueue(input: TaskQueueInput): Promise<void> {
    await this.enqueueMany([input])
  }

  /** Validate the whole batch before one locked append: no partially admitted import. */
  async enqueueMany(inputs: readonly TaskQueueInput[]): Promise<void> {
    const controller = usableController(this.options.getController())
    if (controller === undefined) throw new TaskQueueError('this host does not provide Session task control', 409)
    if (!Array.isArray(inputs) || inputs.length === 0) throw new TaskQueueError('at least one task is required')
    if (inputs.length > MAX_QUEUED) throw new TaskQueueError('too many active queue items', 409)
    const workspaces = this.options.getWorkspaces()
    const { models } = await this.modelOptions(controller, true)
    const validated = inputs.map((input, index) => {
      try {
        if (input === null || typeof input !== 'object' || Array.isArray(input)) {
          throw new TaskQueueError('task must be a JSON object')
        }
        const { prompt, cwd, provider, model } = input
        if (typeof prompt !== 'string' || prompt.trim() === '') throw new TaskQueueError('prompt is required')
        if (prompt.length > MAX_PROMPT_LENGTH) throw new TaskQueueError('prompt is too long')
        if (typeof cwd !== 'string' || !isAbsolute(cwd)) throw new TaskQueueError('a valid workspace is required')
        if (!workspaces.some(workspace => workspace.path === cwd)) {
          throw new TaskQueueError('workspace is no longer available', 409)
        }
        if (typeof provider !== 'string' || typeof model !== 'string') throw new TaskQueueError('model is required')
        if (!models.some(candidate => candidate.provider === provider && candidate.id === model)) {
          throw new TaskQueueError('select an available DeepSeek time-of-day model', 409)
        }
        return { prompt, cwd, provider, model }
      } catch (error) {
        if (inputs.length > 1 && error instanceof TaskQueueError) {
          throw new TaskQueueError(`task ${String(index + 1)}: ${error.message}`, error.status)
        }
        throw error
      }
    })
    await this.update(tasks => {
      const active = tasks.filter(task => !isTerminal(task.status)).length
      if (active + validated.length > MAX_QUEUED) throw new TaskQueueError('too many active queue items', 409)
      const createdAt = this.now()
      for (const input of validated) {
        tasks.push({ id: this.createId(), ...input, status: 'queued', createdAt })
      }
    })
    void this.pump()
  }

  async remove(id: string): Promise<void> {
    await this.update(tasks => {
      const index = tasks.findIndex(task => task.id === id)
      if (index < 0) throw new TaskQueueError('queue item not found', 404)
      const task = tasks[index]!
      if (!isTerminal(task.status) && task.status !== 'queued') {
        throw new TaskQueueError('an admitted task cannot be removed; open its Session to review it', 409)
      }
      tasks.splice(index, 1)
    })
  }

  async clearFinished(): Promise<void> {
    await this.update(tasks => {
      for (let i = tasks.length - 1; i >= 0; i -= 1) {
        if (isTerminal(tasks[i]!.status)) tasks.splice(i, 1)
      }
    })
  }

  private async modelOptions(controller: ControllerFace, refresh = false): Promise<{
    models: readonly TaskQueueModel[]
    defaultModel?: TaskQueueModelSelection | undefined
  }> {
    if (!refresh && this.modelCache !== undefined && this.now() - this.modelCache.at < OPTIONS_CACHE_MS) {
      return this.modelCache
    }
    const catalog = await controller.modelCatalog()
    const models: TaskQueueModel[] = []
    for (const group of catalog.groups) {
      // A relay can expose the same model id but has its own prices and no
      // DeepSeek official off-peak contract. Only the built-in official route
      // is eligible in this preview; custom/unknown routes fail closed.
      if (group.id !== 'deepseek-official') continue
      for (const model of group.models) {
        if (rateChannelOf(model.id, false) !== 'deepseek-metered') continue
        models.push({ provider: group.id, providerName: group.name, id: model.id, name: model.name })
      }
    }
    // modelCatalog.default is the same route Prompt uses for an unconfigured
    // Session. Return the factual route so the client can distinguish an absent
    // default from an ineligible one; enqueue still enforces official eligibility.
    const candidate = catalog.default
    const defaultModel = candidate === undefined
      ? undefined
      : { provider: candidate.provider, model: candidate.model }
    this.modelCache = { at: this.now(), models, defaultModel }
    return { models, defaultModel }
  }

  private async pump(): Promise<void> {
    if (this.stopped || this.pumping) return
    this.pumping = true
    try {
      await this.recoverExpired()
      if (this.stopped || tierAt(this.now()) !== 'offPeak') return
      if (usableController(this.options.getController()) === undefined) return
      const task = await this.claimNext()
      if (task !== undefined) await this.execute(task)
    } catch (error) {
      if (!this.stopped) console.warn('[usage-billing] task queue pump failed:', error)
    } finally {
      // The interval (and enqueue()) triggers the next pass. Never self-schedule
      // a zero-delay pump here: an idle queue must not become a busy loop.
      this.pumping = false
    }
  }

  private async claimNext(): Promise<StoredTask | undefined> {
    let claimed: StoredTask | undefined
    await this.update(tasks => {
      const task = tasks.find(candidate => candidate.status === 'queued')
      if (task === undefined) return
      const next: StoredTask = {
        ...task, status: 'starting', owner: this.ownerId,
        leaseUntil: this.now() + LEASE_MS, startedAt: this.now(), error: undefined,
      }
      claimed = next
      tasks[tasks.indexOf(task)] = next
    })
    return claimed
  }

  private async recoverExpired(): Promise<void> {
    await this.update(tasks => {
      for (let i = 0; i < tasks.length; i += 1) {
        const task = tasks[i]!
        if ((task.status !== 'starting' && task.status !== 'running') || (task.leaseUntil ?? 0) > this.now()) continue
        tasks[i] = {
          ...task, status: 'failed', finishedAt: this.now(), owner: undefined, leaseUntil: undefined,
          error: 'execution result is unconfirmed after the queue owner stopped; review the Session before retrying',
        }
      }
    })
  }

  private async execute(claimed: StoredTask): Promise<void> {
    if (this.stopped) {
      await this.requeue(claimed.id)
      return
    }
    const controller = usableController(this.options.getController())
    if (controller === undefined) {
      await this.finish(claimed.id, 'failed', 'host Session task control disappeared before start')
      return
    }
    this.taskAbort = new AbortController()
    const heartbeat = setInterval(() => { void this.renewLease(claimed.id) }, HEARTBEAT_MS)
    heartbeat.unref()
    this.heartbeat = heartbeat
    try {
      if (!this.options.getWorkspaces().some(workspace => workspace.path === claimed.cwd)) {
        throw new TaskQueueError('workspace is no longer available', 409)
      }
      if (tierAt(this.now()) !== 'offPeak') {
        await this.requeue(claimed.id)
        return
      }
      // Enqueue-time validation is not enough: a queued route/model can be
      // removed or reconfigured before the next off-peak window.
      const { models: availableModels } = await this.modelOptions(controller, true)
      if (!availableModels.some(model => model.provider === claimed.provider && model.id === claimed.model)) {
        throw new TaskQueueError('the selected official DeepSeek model is no longer available', 409)
      }
      const { sessionId } = await controller.create({ cwd: claimed.cwd })
      // create()/selectModel() can outlive our lease. A recovered task belongs
      // to recovery now; the old owner must not continue on to Prompt.
      if (!await this.patch(claimed.id, { sessionId })) return
      await controller.selectModel({ sessionId, provider: claimed.provider, model: claimed.model })
      if (tierAt(this.now()) !== 'offPeak') {
        await this.requeue(claimed.id)
        return
      }
      // Fence and renew immediately before admission. After this call begins we
      // never cancel/replay the turn, even if the lease is subsequently lost.
      if (!await this.patch(claimed.id, { leaseUntil: this.now() + LEASE_MS })) return
      const frames = controller.follow({ address: { kind: 'session', sessionId } }, this.taskAbort.signal)
      const requestId = this.createId() as SessionPromptRequest['requestId']
      await controller.prompt({
        requestId, sessionId, mode: 'queue', content: [{ type: 'text', text: claimed.prompt }],
        // The host requires a signal, but queue shutdown must not cancel an
        // admitted Prompt. This controller is deliberately never aborted.
      }, new AbortController().signal)
      await this.patch(claimed.id, { status: 'running', leaseUntil: this.now() + LEASE_MS })
      const outcome = await this.watch(frames, String(requestId))
      if (outcome !== undefined) await this.finish(claimed.id, outcome.status, outcome.error)
    } catch (error) {
      if (!this.stopped) await this.finish(claimed.id, 'failed', messageOf(error))
    } finally {
      clearInterval(heartbeat)
      if (this.heartbeat === heartbeat) this.heartbeat = undefined
      this.taskAbort?.abort()
      this.taskAbort = undefined
    }
  }

  private async watch(
    frames: AsyncIterable<unknown>,
    requestId: string,
  ): Promise<{ status: 'completed' | 'failed'; error?: string } | undefined> {
    let admitted = false
    for await (const raw of frames) {
      const frame = raw as { type?: string; event?: { type?: string; data?: unknown } }
      if (frame.type !== 'event' || frame.event === undefined) continue
      if (frame.event.type === 'user/message') {
        const data = frame.event.data as { source?: { kind?: string; rpcId?: string } }
        if (data.source?.kind === 'user' && data.source.rpcId === requestId) admitted = true
        continue
      }
      if (!admitted || frame.event.type !== 'turn/end') continue
      const data = frame.event.data as { reason?: { kind?: string; error?: { message?: string } } }
      const kind = data.reason?.kind
      if (kind === 'completed') return { status: 'completed' }
      return { status: 'failed', error: data.reason?.error?.message ?? `task turn ended: ${kind ?? 'unknown'}` }
    }
    return this.stopped ? undefined : { status: 'failed', error: 'execution result is unconfirmed; review the Session' }
  }

  private async renewLease(id: string): Promise<void> {
    try {
      await this.patch(id, { leaseUntil: this.now() + LEASE_MS })
    } catch (error) {
      console.warn('[usage-billing] task queue lease renewal failed:', error)
    }
  }

  private async requeue(id: string): Promise<void> {
    await this.patch(id, {
      status: 'queued', owner: undefined, leaseUntil: undefined, startedAt: undefined, sessionId: undefined,
    })
  }

  private async finish(id: string, status: 'completed' | 'failed', error?: string): Promise<void> {
    await this.patch(id, {
      status, error, finishedAt: this.now(), owner: undefined, leaseUntil: undefined,
    })
  }

  private async patch(id: string, patch: Partial<StoredTask>): Promise<boolean> {
    let applied = false
    await this.update(tasks => {
      const index = tasks.findIndex(task => task.id === id)
      if (index < 0) return
      const task = tasks[index]!
      // A late watcher/heartbeat from an expired owner must never overwrite the
      // recovery marker (or a newer owner's state) after its lease was lost.
      if (task.owner !== this.ownerId) return
      tasks[index] = { ...task, ...patch }
      applied = true
    })
    return applied
  }

  private async update(mutate: (tasks: StoredTask[]) => void): Promise<void> {
    await mkdir(dirname(this.options.filePath), { recursive: true, mode: 0o700 })
    await withFileLock(this.options.filePath, async () => {
      const { document, rawMain } = await this.readDocumentWithRaw()
      const tasks = [...document.tasks]
      mutate(tasks)
      while (tasks.length > MAX_TASKS) {
        const index = tasks.findIndex(task => isTerminal(task.status))
        if (index < 0) break
        tasks.splice(index, 1)
      }
      // Recovery/claim probes usually change nothing. Avoid an atomic write on
      // every idle scheduler tick (and on every late no-op owner patch).
      if (JSON.stringify(tasks) === JSON.stringify(document.tasks)) return
      if (rawMain !== undefined) {
        await writeFileAtomic(`${this.options.filePath}.bak`, rawMain, { mode: 0o600, dirMode: 0o700 })
      }
      const next: QueueDocument = { version: QUEUE_VERSION, tasks }
      await writeFileAtomic(this.options.filePath, JSON.stringify(next), { mode: 0o600, dirMode: 0o700 })
    }, { waitMs: LOCK_WAIT_MS })
  }

  private async readDocument(): Promise<QueueDocument> {
    return (await this.readDocumentWithRaw()).document
  }

  private async readDocumentWithRaw(): Promise<{ document: QueueDocument; rawMain?: string }> {
    let sawFile = false
    for (const path of [this.options.filePath, `${this.options.filePath}.bak`]) {
      try {
        const raw = await readFile(path, 'utf8')
        sawFile = true
        const parsed = JSON.parse(raw) as { version?: unknown; tasks?: unknown }
        if (parsed.version !== QUEUE_VERSION || !Array.isArray(parsed.tasks) || !parsed.tasks.every(validStoredTask)) continue
        return {
          document: { version: QUEUE_VERSION, tasks: parsed.tasks },
          ...(path === this.options.filePath ? { rawMain: raw } : {}),
        }
      } catch (error) {
        if ((error as { code?: string }).code !== 'ENOENT') sawFile = true
      }
    }
    if (sawFile) throw new Error('task queue persistence is unreadable')
    return { document: { version: QUEUE_VERSION, tasks: [] } }
  }
}
