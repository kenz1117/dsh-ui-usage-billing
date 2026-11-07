/** API client for the new-host off-peak task queue preview (issue #106). */
import type { TaskQueueInput, TaskQueueSnapshot, TaskQueueSummary } from '../../task-queue-shared.ts';
export declare function loadTaskQueue(refreshModels?: boolean): Promise<TaskQueueSnapshot>;
export declare function loadTaskQueueSummary(): Promise<TaskQueueSummary>;
export type TaskQueueAction = {
    action: 'enqueue';
    prompt: string;
    cwd: string;
    provider: string;
    model: string;
    /** 来源会话（issue #118）：入队时所在的会话。 */
    sourceSessionId?: string;
    /** 是否授权在该来源会话内续跑（入队时冻结的开关状态）。 */
    reuseSource?: boolean;
} | {
    action: 'enqueueMany';
    tasks: readonly TaskQueueInput[];
} | {
    action: 'remove';
    id: string;
} | {
    action: 'clearFinished';
};
export declare function mutateTaskQueue(action: TaskQueueAction): Promise<TaskQueueSnapshot>;
//# sourceMappingURL=task-queue.d.ts.map