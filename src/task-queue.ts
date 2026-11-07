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
import type { SessionCreateRequest, SessionPromptRequest } from '@deepseek-ai/dsh-api-session-controller/types'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
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
/** 会话 id 长度上限（宿主的 id 是 uuid；超长的入参一律当作没有来源会话）。 */
const MAX_SESSION_ID_LENGTH = 200
/** 会话列表读面的超时（毫秒）：拿不到就降级新建会话，不让队列卡住。 */
const SESSION_LIST_TIMEOUT_MS = 10_000

/** 目录是否落在某个项目内（相等或为其子目录）。 */
function isInsideDirectory(cwd: string, project: string): boolean {
  if (project === '') return false
  return cwd === project || cwd.startsWith(`${project}/`)
}
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
/**
 * 会话列表读面（可选能力，issue #118）：复用来源会话前用它校验该会话是否仍可用
 * （存在 / 非子智能体 / 空闲 / 项目未变）。**缺席不降级整个队列**——只是复用
 * 路径不可用，任务一律走新建会话。
 */
export type TaskQueueSessionLister = Pick<SessionController, 'list'>
/** 引擎看到的宿主会话控制面：基本 5 方法必备，list 可选。 */
export type TaskQueueControllerFace = TaskQueueController & Partial<TaskQueueSessionLister>

/**
 * 工作区上下文（可选能力）：新建会话归组 + 来源会话归档判定。宿主没有这个服务
 * 时一律降级（不归组、归档不可判），队列其余行为不变。
 */
export interface TaskQueueWorkspaceContext {
  /** 已归档的会话 id：归档会话的轮次会以 blocked 结束，不会真的跑。 */
  readonly archivedSessionIds: readonly string[]
  /**
   * 路径 → 工作区 id。**必须严格相等**：宿主的成员资格规则是「account slot +
   * canonical cwd 严格等于工作区 path」，前缀匹配不算数——本仓计费口径里的子目录
   * 前缀匹配只用于账单归组，不能拿来给会话归组。
   */
  readonly workspaceIdOfPath: (path: string) => string | undefined
}

export interface TaskQueueEngineOptions {
  readonly filePath: string
  readonly getController: () => TaskQueueControllerFace | undefined
  readonly getWorkspaces: () => readonly TaskQueueWorkspace[]
  /** 工作区上下文（可选）：缺席 → 不归组、复用路径不可用。 */
  readonly getWorkspaceContext?: () => TaskQueueWorkspaceContext | undefined
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
    // issue #118：来源会话相关字段一律可选——任一变成必填都会让旧队列文件整份
    // 作废（readDocumentWithRaw 退 .bak 再退 503）。
    && (task.sourceSessionId === undefined || typeof task.sourceSessionId === 'string')
    && (task.reuseSource === undefined || typeof task.reuseSource === 'boolean')
    && (task.fallbackReason === undefined || typeof task.fallbackReason === 'string')
    && (task.owner === undefined || typeof task.owner === 'string')
    && (task.leaseUntil === undefined || typeof task.leaseUntil === 'number')
}

function publicTask(task: StoredTask): TaskQueueTask {
  const { owner: _owner, leaseUntil: _leaseUntil, ...pub } = task
  return pub
}

/** The host API is an optional capability; absence never blocks plugin startup. */
function usableController(value: TaskQueueControllerFace | undefined): TaskQueueControllerFace | undefined {
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
        // issue #118：来源会话（可选）。只有显式 true 才授权复用（fail-closed），
        // 没有来源会话时复用无从谈起，直接落 false。
        const sourceSessionId = typeof input.sourceSessionId === 'string'
          && input.sourceSessionId.trim() !== ''
          && input.sourceSessionId.length <= MAX_SESSION_ID_LENGTH
          ? input.sourceSessionId
          : undefined
        const reuseSource = input.reuseSource === true && sourceSessionId !== undefined
        return { prompt, cwd, provider, model, sourceSessionId, reuseSource }
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

  private async modelOptions(controller: TaskQueueControllerFace, refresh = false): Promise<{
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
      // issue #118：先问来源会话能不能续跑。不能就降级为新建会话，并把原因写进
      // 任务（卡片上看得见为什么没有回到原会话）。
      const reuse = await this.resolveSourceSession(claimed, controller)
      let sessionId: SessionId
      if (reuse.ok) {
        sessionId = reuse.sessionId as SessionId
      } else {
        if (reuse.reason !== undefined) {
          if (!await this.patch(claimed.id, { fallbackReason: reuse.reason })) return
        }
        // 任务模型的执行期复检只对「我们自己建会话并选模型」的路径有意义：复用
        // 路径沿用来源会话当前模型，不由我们决定。
        // Enqueue-time validation is not enough: a queued route/model can be
        // removed or reconfigured before the next off-peak window.
        const { models: availableModels } = await this.modelOptions(controller, true)
        if (!availableModels.some(model => model.provider === claimed.provider && model.id === claimed.model)) {
          throw new TaskQueueError('the selected official DeepSeek model is no longer available', 409)
        }
        sessionId = (await this.createGroupedSession(controller, claimed.cwd)).sessionId
      }
      // create()/selectModel() can outlive our lease. A recovered task belongs
      // to recovery now; the old owner must not continue on to Prompt.
      // 复用成功时清掉上一次尝试留下的降级原因。
      const sessionPatch: { sessionId?: string | undefined; fallbackReason?: string | undefined } = { sessionId }
      if (reuse.ok) sessionPatch.fallbackReason = undefined
      if (!await this.patch(claimed.id, sessionPatch)) return
      if (!reuse.ok) {
        // 只有新建会话才切模型：复用路径不动来源会话的模型——selectModel 会改用户
        // 的全局默认模型，还在用户自己的会话日志里留下 model/selection 事件。
        await controller.selectModel({ sessionId, provider: claimed.provider, model: claimed.model })
      }
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

  /**
   * issue #118：判断来源会话能否续跑。不能就给出降级原因（写进卡片）。
   *
   * 判据来自 issue 的安全边界：来源会话已删除 / 正在跑别的轮次 / 工作区变了时，
   * 回退为新建会话，不要往用户正在使用的会话里硬塞一轮。另外子智能体会话与
   * 归档会话也不能复用——前者归属子智能体路由，后者轮次会以 blocked 结束、
   * 看起来跑了其实没跑。
   */
  private async resolveSourceSession(
    claimed: StoredTask,
    controller: TaskQueueControllerFace,
  ): Promise<{ ok: true; sessionId: string } | { ok: false; reason?: string }> {
    if (claimed.reuseSource !== true) return { ok: false }
    const sourceSessionId = claimed.sourceSessionId
    if (sourceSessionId === undefined) return { ok: false }
    const list = controller.list
    // 会话列表读面是可选能力：宿主没有它就一律新建会话，不猜。
    if (typeof list !== 'function') return { ok: false, reason: 'this host cannot inspect Sessions' }
    let items: readonly { sessionId?: unknown; running?: unknown; cwd?: unknown; origin?: unknown }[]
    try {
      const value = await list.call(controller, {}, AbortSignal.timeout(SESSION_LIST_TIMEOUT_MS))
      items = (value?.items ?? []) as readonly { sessionId?: unknown; running?: unknown; cwd?: unknown; origin?: unknown }[]
    } catch (error) {
      return { ok: false, reason: `source session lookup failed: ${messageOf(error)}` }
    }
    const summary = items.find(item => item.sessionId === sourceSessionId)
    if (summary === undefined) return { ok: false, reason: 'source session no longer exists' }
    if (summary.origin === 'subagent') return { ok: false, reason: 'source session belongs to a subagent' }
    const archived = this.options.getWorkspaceContext?.()?.archivedSessionIds
    if (archived !== undefined && archived.includes(sourceSessionId)) {
      return { ok: false, reason: 'source session is archived' }
    }
    if (summary.running === true) return { ok: false, reason: 'source session is busy' }
    // 任务授权的目录必须落在来源会话的项目内。会话的项目（header cwd）变了就说明
    // 续跑会落到别的工程里；会话 cd 过子目录不算（子目录仍在项目内）。
    const project = typeof summary.cwd === 'string' ? summary.cwd : undefined
    if (project !== undefined && !isInsideDirectory(claimed.cwd, project)) {
      return { ok: false, reason: 'source session working directory changed' }
    }
    return { ok: true, sessionId: sourceSessionId }
  }

  /**
   * 新建会话：cwd 恰好等于某个工作区时用 create({ workspaceId })，让宿主把会话挂进
   * 该工作区——create({ cwd }) 从不归组，这正是队列会话在侧栏里没有分组的原因。
   * 两者互斥：带 workspaceId 时不能再带 cwd。
   */
  private async createGroupedSession(
    controller: TaskQueueControllerFace,
    cwd: string,
  ): Promise<{ sessionId: SessionId }> {
    const workspaceId = this.options.getWorkspaceContext?.()?.workspaceIdOfPath(cwd)
    if (workspaceId !== undefined) {
      try {
        // 宿主的工作区 id 是带品牌的字符串；这里只有宿主自己认得的 id。
        return await controller.create({ workspaceId: workspaceId as NonNullable<SessionCreateRequest['workspaceId']> })
      } catch (error) {
        // 工作区在执行期消失时退回按 cwd 建会话：宁可没有分组，也不能让任务
        // 排得上却跑不了。
        console.warn('[usage-billing] task queue workspace Session creation failed:', error)
      }
    }
    return await controller.create({ cwd })
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
      // 下一次尝试会重新判定能不能续跑，旧的降级原因不再作数。
      fallbackReason: undefined,
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
