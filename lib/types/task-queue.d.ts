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
/**
 * 会话列表读面（可选能力，issue #118）：复用来源会话前用它校验该会话是否仍可用
 * （存在 / 非子智能体 / 空闲 / 项目未变）。**缺席不降级整个队列**——只是复用
 * 路径不可用，任务一律走新建会话。
 */
export type TaskQueueSessionLister = Pick<SessionController, 'list'>;
/** 引擎看到的宿主会话控制面：基本 5 方法必备，list 可选。 */
export type TaskQueueControllerFace = TaskQueueController & Partial<TaskQueueSessionLister>;
/**
 * 工作区上下文（可选能力）：新建会话归组 + 来源会话归档判定。宿主没有这个服务
 * 时一律降级（不归组、归档不可判），队列其余行为不变。
 */
export interface TaskQueueWorkspaceContext {
    /** 已归档的会话 id：归档会话的轮次会以 blocked 结束，不会真的跑。 */
    readonly archivedSessionIds: readonly string[];
    /**
     * 路径 → 工作区 id。**必须严格相等**：宿主的成员资格规则是「account slot +
     * canonical cwd 严格等于工作区 path」，前缀匹配不算数——本仓计费口径里的子目录
     * 前缀匹配只用于账单归组，不能拿来给会话归组。
     */
    readonly workspaceIdOfPath: (path: string) => string | undefined;
}
export interface TaskQueueEngineOptions {
    readonly filePath: string;
    readonly getController: () => TaskQueueControllerFace | undefined;
    readonly getWorkspaces: () => readonly TaskQueueWorkspace[];
    /** 工作区上下文（可选）：缺席 → 不归组、复用路径不可用。 */
    readonly getWorkspaceContext?: () => TaskQueueWorkspaceContext | undefined;
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
    snapshot(refreshModels?: boolean): Promise<TaskQueueSnapshot>;
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
    /**
     * issue #118：判断来源会话能否续跑。不能就给出降级原因（写进卡片）。
     *
     * 判据来自 issue 的安全边界：来源会话已删除 / 正在跑别的轮次 / 工作区变了时，
     * 回退为新建会话，不要往用户正在使用的会话里硬塞一轮。另外子智能体会话与
     * 归档会话也不能复用——前者归属子智能体路由，后者轮次会以 blocked 结束、
     * 看起来跑了其实没跑。
     */
    private resolveSourceSession;
    /**
     * 新建会话：cwd 恰好等于某个工作区时用 create({ workspaceId })，让宿主把会话挂进
     * 该工作区——create({ cwd }) 从不归组，这正是队列会话在侧栏里没有分组的原因。
     * 两者互斥：带 workspaceId 时不能再带 cwd。
     */
    private createGroupedSession;
    private watch;
    private renewLease;
    private requeue;
    private finish;
    private patch;
    private update;
    private readDocument;
    private readDocumentWithRaw;
}
//# sourceMappingURL=task-queue.d.ts.map