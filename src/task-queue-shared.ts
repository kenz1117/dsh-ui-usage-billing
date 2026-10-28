/** Browser-safe wire types for the opt-in off-peak task queue (issue #106). */

export type TaskQueueStatus = 'queued' | 'starting' | 'running' | 'completed' | 'failed'

/** Unvalidated enqueue input shared by the HTTP client and server-side engine. */
export interface TaskQueueInput {
  readonly prompt?: unknown
  readonly cwd?: unknown
  readonly provider?: unknown
  readonly model?: unknown
}

export interface TaskQueueTask {
  readonly id: string
  readonly prompt: string
  readonly cwd: string
  readonly provider: string
  readonly model: string
  readonly status: TaskQueueStatus
  readonly createdAt: number
  readonly startedAt?: number | undefined
  readonly finishedAt?: number | undefined
  readonly sessionId?: string | undefined
  readonly error?: string | undefined
}

export interface TaskQueueWorkspace {
  readonly path: string
  readonly title: string
}

export interface TaskQueueModel {
  readonly provider: string
  readonly providerName: string
  readonly id: string
  readonly name: string
}

export interface TaskQueueModelSelection {
  readonly provider: string
  readonly model: string
}

export interface TaskQueueSnapshot {
  /** All required host Session-control methods are available. */
  readonly supported: boolean
  readonly tier: 'peak' | 'offPeak'
  readonly nextSwitchInMs: number
  readonly tasks: readonly TaskQueueTask[]
  readonly workspaces: readonly TaskQueueWorkspace[]
  readonly models: readonly TaskQueueModel[]
  /** Host default route for an unconfigured Session; eligibility is checked separately. */
  readonly defaultModel?: TaskQueueModelSelection | undefined
  readonly optionsError?: string
}

/** Lightweight alert polling shape: never transports Prompt or Session content. */
export interface TaskQueueSummary {
  readonly supported: boolean
  readonly tier: 'peak' | 'offPeak'
  readonly nextSwitchInMs: number
  readonly queuedCount: number
}

export interface TaskQueueMutation {
  readonly ok: true
  readonly snapshot: TaskQueueSnapshot
}
