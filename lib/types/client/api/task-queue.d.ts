/** API client for the new-host off-peak task queue preview (issue #106). */
import type { TaskQueueInput, TaskQueueSnapshot, TaskQueueSummary } from '../../task-queue-shared.ts';
export declare function loadTaskQueue(): Promise<TaskQueueSnapshot>;
export declare function loadTaskQueueSummary(): Promise<TaskQueueSummary>;
export type TaskQueueAction = {
    action: 'enqueue';
    prompt: string;
    cwd: string;
    provider: string;
    model: string;
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