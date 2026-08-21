/**
 * Real-usage aggregation: folds every persisted session log into the
 * usage-stats document the dashboard renders.
 *
 * Each LLM call is attributed to the model of the `request/header` event that
 * precedes its `assistant/message` usage event. Costs are estimated with the
 * shared billing catalog (`pricing.ts`, in CNY), so only models the catalog
 * prices incur a cost — subscription-plan routes and unknown models price
 * zero while their tokens still count. Pure functions only: the persistence
 * handle is injected, so the fold is unit-testable without a host.
 */
import type { SessionPersistence } from '@deepseek-ai/dsh-session-persistence';
import type { TokenUsage } from '@deepseek-ai/dsh-llm';
import { MODEL_KEY_ALIASES } from './client/pricing.ts';
export { MODEL_KEY_ALIASES };
/**
 * 走订阅套餐（coding / token plan / opencode 订阅）的 provider id：这些通道的
 * 调用按套餐计费，不再按 token 计费，因此即使模型 id 与计费表撞名也一律豁免。
 * 与 pi-ai 内置提供方对齐（含各地区变体：qwen/xiaomi 的 token-plan、opencode 与
 * opencode-go、zai-coding-cn）；部署可在 plugin config 的 `subscriptionProviders`
 * 中覆盖。
 */
export declare const DEFAULT_SUBSCRIPTION_PROVIDERS: readonly string[];
/** Aggregation tuning options. */
export interface AggregateOptions {
    /** 订阅制 provider id 列表；默认 {@link DEFAULT_SUBSCRIPTION_PROVIDERS}。 */
    subscriptionProviders?: readonly string[];
}
/** One model's aggregated usage plus estimated cost in CNY. */
export interface ModelUsage {
    calls: number;
    input: number;
    output: number;
    cacheHit: number;
    cacheMiss: number;
    cost: number;
    /** 该模型本次统计的所有调用是否都走订阅通道（coding/token plan）；混合通道不置位。 */
    plan?: boolean;
}
/** Zeroed usage accumulator. */
export declare function emptyUsage(): ModelUsage;
/**
 * Fold one token usage event into an accumulator and re-price its cost.
 * The stats `input` is the TOTAL prompt tokens (cacheHit + cacheMiss), so the
 * miss bucket is uncached input plus cache writes.
 * @param acc - the accumulator to mutate.
 * @param usage - the provider-reported usage of one call.
 * @param key - the billing-catalog key this call belongs to.
 * @param subscription - whether the call went through a subscription plan; such calls never cost money.
 * @param timeMs - the call's wall-clock time (epoch ms); drives peak/off-peak pricing.
 */
export declare function foldUsage(acc: ModelUsage, usage: TokenUsage, key: string, subscription: boolean, timeMs: number): void;
/** Local-time date stamp (the host runs in the user's timezone). */
export declare function dayStamp(time: number): string;
/** cwd 未知时工作区聚合的占位名（UI 显示 em dash，保持语言无关）。 */
export declare const UNKNOWN_WORKSPACE_NAME = "\u2014";
/** 工作区名：取 cwd 的末级目录名；无 cwd 时返回 {@link UNKNOWN_WORKSPACE_NAME}。 */
export declare function workspaceNameOf(cwd: string | undefined): string;
/**
 * The persistence surface the aggregate reads: enough of
 * `SessionPersistence` to list sessions and read each log once; `locate`
 * is optional — backends exposing it give the incremental cache a cheap
 * invalidation stamp (artifact mtime + size), others always re-fold.
 */
export type UsagePersistence = Pick<SessionPersistence, 'list' | 'readFrom'> & Partial<Pick<SessionPersistence, 'locate'>>;
/** The usage-stats document served to the billing dashboard. */
export interface UsageStatsDocument {
    version: number;
    updatedAt: number;
    source: 'session-logs';
    total: ModelUsage;
    byModel: Record<string, ModelUsage>;
    byDay: Record<string, ModelUsage>;
    /** 模型 × 日期 二维统计：趋势图按模型堆叠的输入（[date][modelKey]）。 */
    byDayModels: Record<string, Record<string, ModelUsage>>;
    /** 会话明细：按费用倒序，封顶 {@link SESSION_ROW_LIMIT} 行；旧快照可能缺失。 */
    bySession: SessionUsageRow[];
    /** 每轮费用明细：按起始时间倒序，封顶 {@link TURN_ROW_LIMIT} 行；旧快照可能缺失。 */
    byTurn?: TurnUsageRow[];
    /** 工作区聚合：按 cwd 末级目录归并，按费用倒序；旧快照可能缺失。 */
    byWorkspace?: WorkspaceUsageRow[];
}
/** 会话明细行：仪表盘「会话明细」面板的数据源。 */
export interface SessionUsageRow {
    /** 会话 id（字符串形式）。 */
    id: string;
    /** 日志里最新的 session/title 文本；无标题事件时缺失。 */
    title?: string;
    /** 会话创建时的工作目录（项目路径）；未知时缺失。 */
    cwd?: string;
    calls: number;
    cost: number;
    /** 最后一个事件的时间戳（毫秒）。 */
    lastActive: number;
}
/** 每轮费用明细行：仪表盘「每轮费用」图的数据源。 */
export interface TurnUsageRow {
    /** 会话 id（字符串形式）：不同会话的轮次号相互独立，展示时需区分。 */
    sessionId: string;
    /** 会话内轮次号。 */
    turn: number;
    /** 归因模型 key（计费目录键；未收录原样保留）。 */
    model: string;
    input: number;
    output: number;
    cacheHit: number;
    cacheMiss: number;
    /** 该轮成本（人民币元，按调用时刻精确判高峰/空闲档）。 */
    cost: number;
    /** 轮起始时刻（毫秒）。 */
    startedAt: number;
    /** 轮结束时刻（毫秒）；未结束轮缺失。 */
    endedAt?: number;
}
/** 会话内折叠的每轮行（不含 sessionId，合并时补齐）。 */
type SessionTurnRow = Omit<TurnUsageRow, 'sessionId'>;
/** 工作区聚合行：按会话 cwd 的末级目录归并。 */
export interface WorkspaceUsageRow {
    /** 目录末级名；cwd 未知的会话归入「未命名」。 */
    name: string;
    calls: number;
    cost: number;
    input: number;
    output: number;
    /** 该工作区最近一次活跃时刻（毫秒）。 */
    lastActive: number;
}
/** 会话明细行的响应封顶：控制 payload 体积，重度用户的完整长尾不逐行下发。 */
export declare const SESSION_ROW_LIMIT = 100;
/** 每轮费用行的响应封顶：同样控制 payload 体积。 */
export declare const TURN_ROW_LIMIT = 200;
/** 聚合文档的短 TTL（毫秒）：合并密集轮询，TTL 内直接复用上次的合并结果。 */
export declare const AGGREGATE_TTL_MS = 5000;
/** One persisted session's folded usage plus drill-down metadata. */
interface SessionFold {
    total: ModelUsage;
    byModel: Map<string, ModelUsage>;
    byDay: Map<string, ModelUsage>;
    byDayModels: Map<string, Map<string, ModelUsage>>;
    /** 每个模型 key 在本会话内走订阅通道的调用数（合并时跨会话累加判定 plan）。 */
    planCalls: Map<string, number>;
    /** 每轮费用明细（按轮次号升序，不含 sessionId）；sessionId 在合并时补齐。 */
    turns: SessionTurnRow[];
    /** 日志里最新的 session/title 文本（无标题事件时 undefined）。 */
    title?: string;
    /** 最后一个事件的时间戳（毫秒）；空日志为 0。 */
    lastActive: number;
}
/**
 * Fold one session's events into a {@link SessionFold}. 每个 LLM 调用归属到
 * 其前置 request/header 记录的模型；同时提取最新会话标题、最后活跃时间，
 * 并按轮次折叠每轮费用明细（turn/start → turn/end；调用按 (turn) 归组）。
 * @param events - the session's persisted events in log order.
 * @param subscriptionProviders - provider ids billed through subscription plans.
 * @returns the per-session fold (cached by the incremental aggregator).
 */
export declare function foldSession(events: readonly {
    type: string;
    time: number;
    data: never;
}[], subscriptionProviders: ReadonlySet<string>): SessionFold;
/**
 * 增量聚合器：按会话缓存折叠结果，用日志文件的 mtime+size 作失效键——
 * 日志没动的会话直接复用，只有写过的会话重新折叠；整份文档另有短 TTL
 * 合并密集轮询。缓存活在内存里（进程重启后首次全量折叠一次）。
 */
export interface UsageAggregator {
    /** Aggregate current usage, reusing cached per-session folds when their logs are untouched. */
    aggregate(): Promise<UsageStatsDocument>;
}
/**
 * Create the incremental usage aggregator.
 * @param persistence - the session persistence service.
 * @param options - aggregation tuning (e.g. subscription-plan providers).
 * @returns the aggregator holding the per-session fold cache.
 */
export declare function createUsageAggregator(persistence: UsagePersistence, options?: AggregateOptions): UsageAggregator;
/**
 * Aggregate real usage from every persisted session log (one-shot, no cache).
 * @param persistence - the session persistence service.
 * @param options - aggregation tuning (e.g. subscription-plan providers).
 * @returns the usage-stats document (same shape the dashboard expects).
 */
export declare function aggregateUsage(persistence: UsagePersistence, options?: AggregateOptions): Promise<UsageStatsDocument>;
//# sourceMappingURL=aggregate.d.ts.map