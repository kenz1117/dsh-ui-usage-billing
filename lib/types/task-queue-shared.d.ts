/** Browser-safe wire types for the opt-in off-peak task queue (issue #106). */
export type TaskQueueStatus = 'queued' | 'starting' | 'running' | 'completed' | 'failed';
/** Unvalidated enqueue input shared by the HTTP client and server-side engine. */
export interface TaskQueueInput {
    readonly prompt?: unknown;
    readonly cwd?: unknown;
    readonly provider?: unknown;
    readonly model?: unknown;
    /** 来源会话（issue #118）：入队时所在的会话，执行期据此续跑。 */
    readonly sourceSessionId?: unknown;
    /** 入队时是否授权复用来源会话（把设置开关的状态冻结进任务）。 */
    readonly reuseSource?: unknown;
}
export interface TaskQueueTask {
    readonly id: string;
    readonly prompt: string;
    readonly cwd: string;
    readonly provider: string;
    readonly model: string;
    readonly status: TaskQueueStatus;
    readonly createdAt: number;
    readonly startedAt?: number | undefined;
    readonly finishedAt?: number | undefined;
    /** 实际执行任务的会话（复用来源会话时等于 sourceSessionId）。 */
    readonly sessionId?: string | undefined;
    /** 来源会话 id（issue #118）：入队时所在的会话。 */
    readonly sourceSessionId?: string | undefined;
    /** 是否授权在该来源会话内续跑（入队时冻结的开关状态）。 */
    readonly reuseSource?: boolean | undefined;
    /** 从「续跑来源会话」降级为「新建会话」的原因（卡片展示）。 */
    readonly fallbackReason?: string | undefined;
    readonly error?: string | undefined;
}
export interface TaskQueueWorkspace {
    readonly path: string;
    readonly title: string;
}
export interface TaskQueueModel {
    readonly provider: string;
    readonly providerName: string;
    readonly id: string;
    readonly name: string;
}
export interface TaskQueueModelSelection {
    readonly provider: string;
    readonly model: string;
}
export interface TaskQueueSnapshot {
    /** All required host Session-control methods are available. */
    readonly supported: boolean;
    readonly tier: 'peak' | 'offPeak';
    readonly nextSwitchInMs: number;
    readonly tasks: readonly TaskQueueTask[];
    readonly workspaces: readonly TaskQueueWorkspace[];
    readonly models: readonly TaskQueueModel[];
    /** Host default route for an unconfigured Session; eligibility is checked separately. */
    readonly defaultModel?: TaskQueueModelSelection | undefined;
    readonly optionsError?: string;
}
/** Lightweight alert polling shape: never transports Prompt or Session content. */
export interface TaskQueueSummary {
    readonly supported: boolean;
    readonly tier: 'peak' | 'offPeak';
    readonly nextSwitchInMs: number;
    readonly queuedCount: number;
}
export interface TaskQueueMutation {
    readonly ok: true;
    readonly snapshot: TaskQueueSnapshot;
}
//# sourceMappingURL=task-queue-shared.d.ts.map