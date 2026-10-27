/** Loopback-only GET/POST /api/billing/task-queue (issue #106). */
import type { Context } from '@deepseek-ai/cordis';
import { type TaskQueueEngine } from '../task-queue.ts';
export interface TaskQueueRouteDeps {
    readonly trustedHosts: ReadonlySet<string>;
    readonly engine: TaskQueueEngine;
}
export declare function registerTaskQueueRoute(ctx: Context, deps: TaskQueueRouteDeps): void;
//# sourceMappingURL=task-queue.d.ts.map