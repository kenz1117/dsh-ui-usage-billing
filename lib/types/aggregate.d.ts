/**
 * Real-usage aggregation: folds every persisted session log into the
 * usage-stats document the dashboard renders.
 *
 * Each LLM call is attributed to the `message.source` carried by its own
 * `assistant/message` event (copied from the request at write time); the
 * sparse `request/header` is only a fallback. Costs are estimated with the
 * shared billing catalog (`pricing.ts`, in CNY), so only models the catalog
 * prices incur a cost — subscription-plan routes and unknown models price
 * zero while their tokens still count. Pure functions only: the persistence
 * handle is injected, so the fold is unit-testable without a host.
 */
import type { SessionPersistence } from '@deepseek-ai/dsh-session-persistence';
import type { TokenUsage } from '@deepseek-ai/dsh-llm';
import { MODEL_KEY_ALIASES, resolveCatalogKey } from './client/pricing.ts';
export { MODEL_KEY_ALIASES, resolveCatalogKey };
/**
 * 走订阅套餐（coding / token plan / opencode 订阅）的 provider id：这些通道的
 * 调用按套餐计费，不再按 token 计费，因此即使模型 id 与计费表撞名也一律豁免。
 * 与 pi-ai 内置提供方对齐（含各地区变体：qwen/xiaomi 的 token-plan、opencode 与
 * opencode-go、zai-coding-cn）；部署可在 plugin config 的 `subscriptionProviders`
 * 中覆盖。
 */
export declare const DEFAULT_SUBSCRIPTION_PROVIDERS: readonly string[];
/**
 * 官方渠道 provider id 判定：`deepseek` 前缀（DeepSeek 官方直连）视为官方，
 * 其余 provider（第三方中转/代理）视为「三方」。用于「官方 vs 三方」token、
 * 调用与费用分桶展示；部署可由配置覆盖（见 {@link AggregateOptions}）。
 */
export declare function isOfficialProvider(provider: string): boolean;
/** 一个 provider 路由的站点视图（来自 llm-pi-ai providers 的 baseURL）。 */
export interface ProviderRouteView {
    /** 该路由配置的端点地址；无值 = 直连厂商（非中转站）。 */
    baseURL?: string;
}
/** 站点归属分类：site=中转站（有 baseURL origin）；direct=直连；unknown=未知路由（配置已删）。 */
export type SiteKind = 'site' | 'direct' | 'unknown';
/** 一个 provider 路由归类后的站点引用。 */
export interface SiteRef {
    kind: SiteKind;
    /** 站点归一化 origin（仅 site）。 */
    origin?: string;
    /** 原 provider 路由名。 */
    provider: string;
}
/** 由 baseURL 归一化出站点 origin（协议 + 主机 + 端口）；解析失败回退原值。 */
export declare function siteOriginOf(baseURL: string): string;
/**
 * 把一个 provider 路由归类为站点引用。判定顺序（与路由在 provider 配置里的状态一致）：
 * - 路由存在于当前配置且配了 baseURL → 中转站 `site`（按 origin 归组，同站多 key 合并）；
 * - 路由存在于当前配置但无 baseURL → 厂商直连 `direct`；
 * - 路由不在当前配置里 → `unknown`（改过名 / 删除过，是「读不到」而非「直连」）。
 * @param provider - 会话日志里的 provider 路由名（request/header 的 `config.provider`）。
 * @param routes - 当前 provider 路由视图（来自 llm-pi-ai providers）。
 */
export declare function siteRefOf(provider: string, routes: Readonly<Record<string, ProviderRouteView>>): SiteRef;
/** 站点桶的稳定 key：`site:<origin>` 与 `direct:<provider>` 分开，`unknown` 单一桶。 */
export declare function siteBucketKey(ref: SiteRef): string;
/** Aggregation tuning options. */
export interface AggregateOptions {
    /** 订阅制 provider id 列表；默认 {@link DEFAULT_SUBSCRIPTION_PROVIDERS}。 */
    subscriptionProviders?: readonly string[];
    /** 官方渠道 provider id 列表；默认按 {@link isOfficialProvider} 判定（DeepSeek 官方直连）。 */
    officialProviderIds?: readonly string[];
    /** 每会话折叠缓存的上限（默认 {@link DEFAULT_MAX_CACHE_SESSIONS}）；
     *  超限时按最近使用先后淘汰最久未用的会话，防长期运行内存膨胀。 */
    maxCacheSessions?: number;
    /** 中转站归组来源：返回当前 provider 路由视图（llm-pi-ai providers 的 baseURL）。
     *  每次聚合时调用取最新值；缺省时全部路由按「未知路由」处理（无配置发现）。 */
    resolveRoutes?: () => Readonly<Record<string, ProviderRouteView>>;
    /** 工作区标题解析：给定会话 cwd 返回项目显示标题；undefined = 回退到 cwd 末级目录名
     *  （host 的 workspaceRegistry 为可选依赖，缺失时不注入，行为保持不变）。 */
    resolveWorkspaceTitle?: (cwd: string) => string | undefined;
    /** 独立的持久用量账本。启用后，已经成功折叠过的会话即使随后从
     *  sessionPersistence 中永久删除，也会继续计入累计用量。 */
    ledger?: UsageLedgerStore;
    /** 联网搜索请求（`web/deepseek-search-llm-request`，无用量事件）的单次费用
     *  估算（人民币元）；默认 {@link DEFAULT_SEARCH_CALL_ESTIMATE_CNY}，设 0 关闭。 */
    searchCallEstimateCny?: number;
}
/** 每会话折叠缓存默认上限：超过则按 LRU 淘汰（P1-6 峰值内存治理）。 */
export declare const DEFAULT_MAX_CACHE_SESSIONS = 400;
/** One model's aggregated usage plus estimated cost in CNY. */
export interface ModelUsage {
    calls: number;
    input: number;
    output: number;
    cacheHit: number;
    cacheMiss: number;
    /**
     * 显式缓存写入 token（部分厂商单独计价的 cache creation）——已包含在
     * `cacheMiss` 内，单列供结构展示；旧快照缺失。
     */
    cacheWrite?: number;
    cost: number;
    /** 输出中的 reasoning（思考）token；已包含在 `output` 内，单列用于结构展示。 */
    reasoning: number;
    /** 该模型本次统计的所有调用是否都走订阅通道（coding/token plan）；混合通道不置位。 */
    plan?: boolean;
    /** 走官方渠道的调用数（DeepSeek 官方直连；其余为三方）。 */
    officialCalls: number;
    /** 走官方渠道的费用（CNY）；三方费用 = cost - officialCost。 */
    officialCost: number;
    /**
     * 联网搜索辅助请求的估算调用数（`web/deepseek-search-llm-request`，日志只有
     * 请求无用量事件）；已按每次 `searchCallEstimateCny` 估算计入 `cost`，不计
     * token。旧快照缺失。
     */
    searchCalls?: number;
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
 * @param official - whether the call went through the official DeepSeek channel (vs a third-party relay).
 */
export declare function foldUsage(acc: ModelUsage, usage: TokenUsage, key: string, subscription: boolean, timeMs: number, official?: boolean): void;
/**
 * 联网搜索辅助请求的单次费用估算默认值（人民币元）。DeepSeek 官方对搜索请求
 * （web_search 服务端工具注入上下文）照常计费，实测每次约 0.01~0.03 元，取中值；
 * 部署可在插件配置 `searchCallEstimateCny` 覆盖（设 0 关闭估算）。
 */
export declare const DEFAULT_SEARCH_CALL_ESTIMATE_CNY = 0.02;
/**
 * Fold one auxiliary web-search LLM request (issue #15) into an accumulator.
 * 这类调用绕过对话通道直连官方端点，日志只记请求（无响应/用量事件），token
 * 不可知：按「每次估值」计入费用并单独累计 `searchCalls`，不产生 token 维度。
 * @param acc - the accumulator to mutate.
 * @param estimateCny - per-call cost estimate in CNY; 0 disables the estimate.
 */
export declare function foldSearchCall(acc: ModelUsage, estimateCny: number): void;
/** Local-time date stamp (the host runs in the user's timezone). */
export declare function dayStamp(time: number): string;
/** Local-time hour stamp `YYYY-MM-DDTHH` — the performance series bucket key. */
export declare function hourStamp(time: number): string;
/**
 * 宿主进程的 IANA 时区名与 UTC 偏移，供面板标注「天按哪个时区切分」。
 * `getTimezoneOffset` 是 UTC 以西的分钟数，符号与日常写法相反，故取反。
 * @returns `{ name, offset }`，如 `{ name: "Asia/Shanghai", offset: "UTC+08:00" }`。
 */
export declare function hostTimeZone(now?: Date): {
    name: string;
    offset: string;
};
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
    /** 宿主进程时区（IANA 名 + UTC 偏移）：天按此切分，面板据此标注。 */
    timezone?: {
        name: string;
        offset: string;
    };
    total: ModelUsage;
    byModel: Record<string, ModelUsage>;
    byDay: Record<string, ModelUsage>;
    /** 模型 × 日期 二维统计：趋势图按模型堆叠的输入（[date][modelKey]）。 */
    byDayModels: Record<string, Record<string, ModelUsage>>;
    /**
     * 模型 × 日期 × 站点 三维统计（[date][modelKey][siteKey]）：供「按 origin 绑定
     * 自定义价」的显示层重估（issue #16）——只有这个维度能知道「某模型从某中转站
     * 消耗了多少 token」。旧算法快照缺失。
     */
    byDayModelsSite?: Record<string, Record<string, Record<string, ModelUsage>>>;
    /**
     * 峰谷分桶（真实判档）：折叠时逐调用按 `tierAt(event.time)` 归入高峰/低谷桶，
     * 峰谷占比与「挪谷省钱」据此展示，不再按比例估算。旧快照可能缺失。
     */
    byTier?: {
        peak: ModelUsage;
        offPeak: ModelUsage;
    };
    /** 工具调用次数排行（键 = 工具名，按调用数倒序）；token 无法按工具归因，仅计次。旧快照可能缺失。 */
    byTool?: Record<string, number>;
    /** 会话明细：按费用倒序，封顶 {@link SESSION_ROW_LIMIT} 行；旧快照可能缺失。 */
    bySession: SessionUsageRow[];
    /** 每轮费用明细：按起始时间倒序，封顶 {@link TURN_ROW_LIMIT} 行；旧快照可能缺失。 */
    byTurn?: TurnUsageRow[];
    /** 工作区聚合：按 cwd 末级目录归并，按费用倒序；旧快照可能缺失。 */
    byWorkspace?: WorkspaceUsageRow[];
    /**
     * 中转站归组：按 provider 路由归类到站点（有 baseURL 按 origin 归组）、直连、未知路由；
     * key 为 {@link siteBucketKey} 的稳定值（`site:<origin>` / `direct:<provider>` / `unknown`）。
     * 旧快照可能缺失。
     */
    bySite?: Record<string, ModelUsage>;
    /**
     * 按角色费用归因（人民币元）：助手输出成本为实测计价；输入成本按会话内
     * 用户消息 / 工具结果的文本长度占比启发式摊分（日志无角色级 token 实测，
     * 属估算口径，UI 需标注）。旧快照可能缺失。
     */
    byRole?: RoleCost;
    /** 不可计价的模型 id（未收录 / 无价，费用按 0 计）；供面板提示用户自查与反馈。 */
    unpricedModels?: readonly string[];
    /** 联网搜索请求的单次费用估算（人民币元，配置回显）；0 或缺省 = 未启用估算。 */
    searchCallEstimateCny?: number;
    /**
     * 性能指标（TTFT / 生成速度 / 总延迟）按模型与按小时聚合；旧快照可能缺失。
     * 口径：TTFT = request/header → 首个内容 chunk；生成速度 = 输出 token ÷ 生成时长；
     * 总延迟 = request/header → assistant/message。工具续写步骤无独立请求头，
     * 以 step/start 为起点估算并计 estimated。
     */
    perf?: PerfStats;
    /** 只存在于账本、且缺 foldVersion 的旧会话数；无旧行时省略。 */
    staleLedgerSessions?: number;
}
/** 按角色费用归因：user / tool 为输入成本的启发式摊分，assistant 为输出成本实测。 */
export interface RoleCost {
    user: number;
    assistant: number;
    tool: number;
}
/**
 * 性能指标（TTFT / 生成速度 / 总延迟）：按模型与按小时聚合，供「性能」面板渲染。
 * 旧快照（无 perf 字段）缺失时客户端按无数据兜底。
 */
export interface PerfStats {
    /** 按模型聚合（键 = 计费目录键；未收录模型原样保留）。 */
    byModel: Record<string, ModelPerf>;
    /** 按小时×模型聚合（外键 = {@link hourStamp}，内键 = 模型目录键；北京时间）。 */
    byHourModel: Record<string, Record<string, HourModelPerf>>;
}
/** 一个模型的性能统计：首字延时均值 / P50 / P90、生成速度均值、总延迟均值。 */
export interface ModelPerf {
    /** 有效性能样本数（有可测 TTFT 的调用；不含损毁样本）。 */
    samples: number;
    /** 平均首字延时（毫秒）。 */
    ttftAvg: number;
    /** 首字延时 P50（毫秒）。 */
    ttftP50: number;
    /** 首字延时 P90（毫秒）。 */
    ttftP90: number;
    /** 首字延时最大值（毫秒）；定位偶发慢响应。 */
    ttftMax: number;
    /** 首字延时尖峰样本数（> 10s）；定位服务端抖动。 */
    ttftSpikes: number;
    /** 平均生成速度（tokens/s）；生成了有效输出且时长可测时存在。 */
    tpsAvg?: number;
    /** 平均总延迟（首次请求 → 响应完成，毫秒）。 */
    latencyAvg: number;
    /** 以 step/start 估算的样本数（工具续写步骤无独立 request/header）。 */
    estimatedSamples: number;
}
/** 一个小时单模型的性能统计（外键 = {@link hourStamp}，内键 = 模型目录键）。 */
export interface HourModelPerf {
    samples: number;
    ttftAvg: number;
    /** 平均生成速度（tokens/s）；该小时该模型无可测生成窗口时缺失。 */
    tpsAvg?: number;
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
    /** 数据来自旧算法折叠的持久账本行（日志已删/不可读，无法重算）；UI 据此标注置信度。 */
    stale?: boolean;
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
/** TTFT 尖峰阈值（毫秒）：超过计为一次尖峰样本，用于定位服务端抖动。 */
export declare const PERF_SPIKE_MS = 10000;
/** 单步性能样本（foldSession 的折叠产物；跨会话合并时按模型/小时再聚合）。 */
export interface PerfSample {
    /** 计费目录键（模型；未收录模型原样保留）。 */
    model: string;
    /** 北京时间小时戳（{@link hourStamp}）——性能曲线的时间桶键。 */
    hour: string;
    /** 首字延时（毫秒）；无效样本（超出 sane 上限）不入样本集。 */
    ttftMs: number;
    /** 生成速度（tokens/s）；无有效生成窗口或无输出时缺失。 */
    tps?: number;
    /** 总延迟（首次请求 → 响应完成，毫秒）；只测到内容但完成时刻优先于起点时缺失。 */
    latencyMs?: number;
    /** 无独立 request/header，以 step/start 起算（工具续写步骤）。 */
    estimated: boolean;
}
/** One persisted session's folded usage plus drill-down metadata. */
export interface SessionFold {
    total: ModelUsage;
    byModel: Map<string, ModelUsage>;
    byDay: Map<string, ModelUsage>;
    byDayModels: Map<string, Map<string, ModelUsage>>;
    /** 模型×日期×站点三维（issue #16）：供按 origin 绑定自定义价的显示层重估。 */
    byDayModelsSite: Map<string, Map<string, Map<string, ModelUsage>>>;
    /** 峰谷分桶：折叠时按调用时刻精确判档（tierAt），键 = 'peak' / 'offPeak'。 */
    byTier: Map<string, ModelUsage>;
    /** 工具调用次数（键 = 工具名；tool-call-delta 首见计数）。 */
    byTool: Map<string, number>;
    /** 中转站归组：按 provider 路由归类到站点/直连/未知路由（key = {@link siteBucketKey}）。 */
    bySite: Map<string, ModelUsage>;
    /** 不可计价模型 id（未收录/无价，且非订阅）集合；跨会话合并后输出给面板提示。 */
    unpricedModels: Set<string>;
    /** 每个模型 key 在本会话内走订阅通道的调用数（合并时跨会话累加判定 plan）。 */
    planCalls: Map<string, number>;
    /** 每轮费用明细（按轮次号升序，不含 sessionId）；sessionId 在合并时补齐。 */
    turns: SessionTurnRow[];
    /** 性能样本（有可测 TTFT 的调用，按事件次序折叠）。 */
    perf: PerfSample[];
    /** 角色归因中间量：消息文本长度（user/tool）与输入/输出成本实测拆分。 */
    roles: RoleFold;
    /** 日志里最新的 session/title 文本（无标题事件时 undefined）。 */
    title?: string;
    /** 最后一个事件的时间戳（毫秒）；空日志为 0。 */
    lastActive: number;
}
/** 角色归因的会话级中间量：字符占比用于把输入成本摊到 user/tool。 */
interface RoleFold {
    userChars: number;
    toolChars: number;
    /** 输入侧成本（缓存命中 + 未命中 + 缓存写入，人民币元）。 */
    inputCost: number;
    /** 输出侧成本（人民币元）。 */
    outputCost: number;
}
/** JSON-safe form of one session fold, used by the durable usage ledger. */
export interface SerializedSessionFold {
    total: ModelUsage;
    byModel: Record<string, ModelUsage>;
    byDay: Record<string, ModelUsage>;
    byDayModels: Record<string, Record<string, ModelUsage>>;
    /** 1.0.10（issue #16）新增；模型×日期×站点三维，旧账本行缺失（合并按空处理）。 */
    byDayModelsSite?: Record<string, Record<string, Record<string, ModelUsage>>>;
    /** 1.0.8 起新增；旧账本行缺失（合并时按空处理，不触发重折算）。 */
    byTier?: Record<string, ModelUsage>;
    byTool?: Record<string, number>;
    bySite: Record<string, ModelUsage>;
    unpricedModels: string[];
    planCalls: Record<string, number>;
    turns: SessionTurnRow[];
    perf: PerfSample[];
    roles: RoleFold;
    lastActive: number;
}
/** One independently retained session in the durable usage ledger. */
export interface UsageLedgerSession {
    id: string;
    cwd?: string;
    /** Stable log stamp (mtime + size) when the persistence backend exposes it. */
    stamp?: string;
    /**
     * 折叠该行时的算法版本（{@link FOLD_VERSION}）。缺失 = 1.0.6 及更早写入的
     * 旧算法行（加载边界由迁移统一回填为 1）。
     */
    foldVersion?: number;
    fold: SerializedSessionFold;
}
/** On-disk durable usage ledger. Versioned independently from the dashboard document. */
export interface UsageLedgerDocument {
    version: 1;
    updatedAt: number;
    sessions: UsageLedgerSession[];
    /** 已应用的一次性配置迁移 id 列表（随文档落盘；缺省 = 尚未跑过任何迁移）。 */
    appliedMigrations?: string[];
}
/**
 * 折叠算法版本：归账语义变化时递增。v1 = 按 request/header 归账（稀疏 header 把
 * 两次 header 之间的用量串到上一个模型，订阅模型首当其冲，issue #14）；v2 =
 * `assistant/message` 自带 source 归账（1.0.7 起）；v3 = 联网搜索请求按次估算
 * 计费（issue #15，1.0.9 起）；v4 = 模型×日期×站点三维桶（issue #16，按 origin
 * 绑定自定义价的显示层重估）——旧行缺该维度，按无 origin 价处理；v5 = 峰谷
 * 时代之前（2026-08-16T16:00Z）的 DeepSeek 事件按当时基础价计费（v4 把全部
 * 历史套现行峰/谷档价，高估约 50%）；v6 = v1 峰谷窗口（至 2026-08-22T16:00Z）
 * 的周末不豁免峰时（v5 错套现行周末全谷规则，低估该窗口周六日的峰时费用）。
 * 持久账本行据此区分新旧算法：日志已删/不可读而只能沿用旧行时，UI 标注置信度提示。
 */
export declare const FOLD_VERSION = 6;
/**
 * 一次性账本迁移：id 唯一，apply 在加载边界对原始文档执行，已应用过的跳过。
 * 未来账本/schema 字段变更（重命名、拆桶、语义调整）时，在此追加一条迁移并
 * bump {@link UsageLedgerDocument.version}；引擎保证幂等，重启不会重复执行。
 * 可选字段的向后兼容回填（如 foldVersion）不 bump version：旧版本插件仍能读新文件。
 */
export interface LedgerMigration {
    id: string;
    /** 对原始文档执行就地变更；返回是否产生了需要落盘的实际修改。 */
    apply(document: UsageLedgerDocument): boolean;
}
/**
 * 账本迁移注册表。首条迁移给 1.0.6 及更早的行回填 foldVersion = 1（它们全部出自
 * header 归因算法）；此后新写入的行总带当前 {@link FOLD_VERSION}。
 */
export declare const LEDGER_MIGRATIONS: readonly LedgerMigration[];
/**
 * 在加载边界对账本文档应用未执行的迁移，并记录已应用 id 供写回。
 * @param document - 从持久化读出的原始账本文档。
 * @param migrations - 待执行的迁移注册表；缺省用模块级 {@link LEDGER_MIGRATIONS}。
 * @returns 是否发生了需要重新落盘的修改。
 */
export declare function runLedgerMigrations(document: UsageLedgerDocument, migrations?: readonly LedgerMigration[]): boolean;
/** Storage seam for the durable ledger; the host supplies an atomic file implementation. */
export interface UsageLedgerStore {
    load(): Promise<unknown | undefined>;
    save(document: UsageLedgerDocument): Promise<void>;
}
/**
 * 消息文本长度：user/tool 角色分摊输入成本的启发式依据。字符串内容取其
 * 长度；内容块数组累计文本块长度；其余形状按 0 计（durable 边界收窄）。
 */
export declare function messageTextLength(message: unknown): number;
/**
 * Fold one session's events into a {@link SessionFold}. 每个 LLM 调用归属到
 * 其 `assistant/message` 自带 `message.source` 记录的模型（agent-loop 落盘时从
 * 当次请求复制，每个调用一条，不依赖稀疏的 request/header）；source 缺失时
 * 兜底到最近一次 request/header 的状态。同时提取最新会话标题、最后活跃时间，
 * 并按轮次折叠每轮费用明细（turn/start → turn/end；调用按 (turn) 归组）。
 * @param events - the session's persisted events in log order.
 * @param subscriptionProviders - provider ids billed through subscription plans.
 * @param officialProviderIds - provider ids treated as the official DeepSeek channel
 *   (default: any `deepseek`-prefixed id). Others count as third-party.
 * @param routes - 当前 provider 路由视图（中转站归组）。
 * @param searchCallEstimateCny - 联网搜索请求的单次费用估算（人民币元；0 关闭估算）。
 * @returns the per-session fold (cached by the incremental aggregator).
 */
export declare function foldSession(events: readonly {
    type: string;
    time: number;
    data: unknown;
    seq?: number;
}[], subscriptionProviders: ReadonlySet<string>, officialProviderIds?: ReadonlySet<string>, routes?: Readonly<Record<string, ProviderRouteView>>, searchCallEstimateCny?: number): SessionFold;
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