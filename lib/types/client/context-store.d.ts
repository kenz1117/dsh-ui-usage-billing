/**
 * 上下文占用快照 store：把宿主的 token-meter 投影从**会话作用域**搬到全局弹窗。
 *
 * 宿主能力（@deepseek-ai/dsh-token-meter，经会话作用域标准 props 的 useProjection 读）：
 * - `contextPressure`：{ pressureTokens?, projectedTokens?, contextWindow? }
 *   —— provider 上报的最近一次提示词占用、下一次请求的占用外推、路由容量上限。
 * - `contextBreakdown`：{ systemTokens, toolsTokens, messageTokens }
 *   —— 下一次请求上下文的构成拆解（**启发式 token 估算**，三项之和不等于
 *   provider 锚定的 projectedTokens：估算器系统性低估 CJK 与 JSON schema）。
 *
 * 为什么需要这个 store：`contextPressure` / `contextBreakdown` 只在**会话作用域**
 * 的槽位里可读（投影按会话分发），而仪表盘弹窗是全局的——侧边栏触发的弹窗不在
 * 任何会话作用域内。解法：会话作用域里已有的即时代费用条（conversation.composer.dock
 * 座位）顺手读一次投影并发布到本 store，弹窗订阅它。
 *
 * 降级：没有会话 / 宿主不提供该投影 / 老宿主没有 token-meter → store 保持空，
 * 界面整块隐藏（**不显示 0、不显示占位假数据**）。
 */
/** 上下文占用快照（两个投影的合并视图）。 */
export interface ContextOccupancy {
    /** 下一次请求的提示词占用（provider 锚定 + 增量外推）——面板主指标。 */
    projectedTokens?: number;
    /** 最近一次请求的提示词占用（provider 上报值）。 */
    pressureTokens?: number;
    /** 路由容量（上下文窗口上限）；适配器未上报时缺席。 */
    contextWindow?: number;
    /** 系统提示词占用（启发式估算）。 */
    systemTokens?: number;
    /** 工具 schema 占用（启发式估算）。 */
    toolsTokens?: number;
    /** 消息占用（启发式估算）。 */
    messageTokens?: number;
}
/** 空快照：无数据（界面据此整块隐藏）。 */
export declare const EMPTY_CONTEXT: ContextOccupancy;
/** 上下文 store：写入方 = 会话作用域的费用条；读取方 = 全局仪表盘弹窗。 */
export interface ContextStore {
    /** 发布新快照（内容未变时保持同一对象引用，避免无谓重渲染）。 */
    publish(next: ContextOccupancy): void;
    /** 订阅变更；立即收到当前值一次（若为空则收到 undefined）。 */
    subscribe(listener: (value: ContextOccupancy | undefined) => void): () => void;
    /** 读取当前快照（无数据返回 undefined）。 */
    read(): ContextOccupancy | undefined;
}
/**
 * 创建上下文 store。
 * @returns store 实例。
 */
export declare function createContextStore(): ContextStore;
/**
 * 占用率（0..1）：以外推占用除以窗口容量。
 * 缺任一要素 → undefined（界面不画进度，不以 0 冒充）。
 * @param occupancy - 占用快照。
 * @returns 占用率或 undefined。
 */
export declare function occupancyRatio(occupancy: ContextOccupancy | undefined): number | undefined;
/**
 * 构成拆解的三项（顺序固定，便于渲染与比较）。
 * @param occupancy - 占用快照。
 * @returns 构成项数组（无任何构成数据时返回空数组）。
 */
export declare function occupancyBreakdown(occupancy: ContextOccupancy | undefined): readonly {
    key: 'system' | 'tools' | 'message';
    tokens: number;
}[];
/** 页面级单例：同一页面只有一个计费插件实例，与其它模块级单例同口径。 */
export declare const contextStore: ContextStore;
//# sourceMappingURL=context-store.d.ts.map