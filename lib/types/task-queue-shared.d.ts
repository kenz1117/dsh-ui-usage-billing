/** Browser-safe wire types for the opt-in off-peak task queue (issue #106). */
export type TaskQueueStatus = 'queued' | 'starting' | 'running' | 'completed' | 'failed';
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
    readonly sessionId?: string | undefined;
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
export interface TaskQueueSnapshot {
    /** All required host Session-control methods are available. */
    readonly supported: boolean;
    readonly tier: 'peak' | 'offPeak';
    readonly nextSwitchInMs: number;
    readonly tasks: readonly TaskQueueTask[];
    readonly workspaces: readonly TaskQueueWorkspace[];
    readonly models: readonly TaskQueueModel[];
    readonly optionsError?: string;
}
export interface TaskQueueMutation {
    readonly ok: true;
    readonly snapshot: TaskQueueSnapshot;
}
//# sourceMappingURL=task-queue-shared.d.ts.map