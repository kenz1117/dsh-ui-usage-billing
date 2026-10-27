/**
 * Durable off-peak FIFO task queue (issue #106, new-host capability preview).
 *
 * Safety contract: tasks START only in the DeepSeek off-peak window; an admitted
 * turn is never cancelled at the next peak. Failed/unknown outcomes never auto-
 * retry. A file lock + owner lease prevents two DSH instances sharing DSH_HOME
 * from submitting the same task. Prompts are persisted with mode 0600.
 */
import type { SessionController } from '@deepseek-ai/dsh-api-session-controller';
import type { TaskQueueInput, TaskQueueSnapshot, TaskQueueSummary, TaskQueueWorkspace } from './task-queue-shared.ts';
export type TaskQueueController = Pick<SessionController, 'create' | 'selectModel' | 'prompt' | 'follow' | 'modelCatalog'>;
type ControllerFace = TaskQueueController;
export interface TaskQueueEngineOptions {
    readonly filePath: string;
    readonly getController: () => ControllerFace | undefined;
    readonly getWorkspaces: () => readonly TaskQueueWorkspace[];
    readonly now?: () => number;
    readonly createId?: () => string;
    readonly ownerId?: string;
    readonly pollMs?: number;
}
export declare class TaskQueueError extends Error {
    readonly status: number;
    constructor(message: string, status?: number);
}
export declare class TaskQueueEngine {
    private readonly options;
    private readonly now;
    private readonly createId;
    private readonly ownerId;
    private readonly pollMs;
    private timer;
    private heartbeat;
    private taskAbort;
    private stopped;
    private pumping;
    private modelCache;
    constructor(options: TaskQueueEngineOptions);
    start(): void;
    stop(): void;
    snapshot(): Promise<TaskQueueSnapshot>;
    summary(): Promise<TaskQueueSummary>;
    enqueue(input: TaskQueueInput): Promise<void>;
    /** Validate the whole batch before one locked append: no partially admitted import. */
    enqueueMany(inputs: readonly TaskQueueInput[]): Promise<void>;
    remove(id: string): Promise<void>;
    clearFinished(): Promise<void>;
    private modelOptions;
    private pump;
    private claimNext;
    private recoverExpired;
    private execute;
    private watch;
    private renewLease;
    private requeue;
    private finish;
    private patch;
    private update;
    private readDocument;
    private readDocumentWithRaw;
}
export {};
//# sourceMappingURL=task-queue.d.ts.map