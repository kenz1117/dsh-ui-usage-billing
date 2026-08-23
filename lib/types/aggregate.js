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
import { stat } from 'node:fs/promises';
import { isPriced, MODEL_KEY_ALIASES, resolveCatalogKey, computeCostAt, modelOf } from "./client/pricing.js";
// 模型别名（真实 provider id → 计费目录键）统一定义在 client/pricing.ts，
// 聚合层折叠与客户端渲染共用同一张表，避免两侧不一致导致「未收录」。
export { MODEL_KEY_ALIASES, resolveCatalogKey };
/**
 * 走订阅套餐（coding / token plan / opencode 订阅）的 provider id：这些通道的
 * 调用按套餐计费，不再按 token 计费，因此即使模型 id 与计费表撞名也一律豁免。
 * 与 pi-ai 内置提供方对齐（含各地区变体：qwen/xiaomi 的 token-plan、opencode 与
 * opencode-go、zai-coding-cn）；部署可在 plugin config 的 `subscriptionProviders`
 * 中覆盖。
 */
export const DEFAULT_SUBSCRIPTION_PROVIDERS = [
    'kimi-coding',
    'zai-coding-cn',
    'opencode',
    'opencode-go',
    'qwen-token-plan',
    'qwen-token-plan-cn',
    'xiaomi-token-plan-ams',
    'xiaomi-token-plan-cn',
    'xiaomi-token-plan-sgp',
];
/**
 * 官方渠道 provider id 判定：`deepseek` 前缀（DeepSeek 官方直连）视为官方，
 * 其余 provider（第三方中转/代理）视为「三方」。用于「官方 vs 三方」token、
 * 调用与费用分桶展示；部署可由配置覆盖（见 {@link AggregateOptions}）。
 */
export function isOfficialProvider(provider) {
    return /^deepseek(?:-[a-z0-9-]+)?$/i.test(provider.trim());
}
/** Zeroed usage accumulator. */
export function emptyUsage() {
    return { calls: 0, input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cost: 0, officialCalls: 0, officialCost: 0 };
}
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
export function foldUsage(acc, usage, key, subscription, timeMs, official = false) {
    const cacheHit = usage.cacheReadTokens ?? 0;
    const cacheMiss = usage.inputTokens + (usage.cacheWriteTokens ?? 0);
    acc.calls += 1;
    acc.input += usage.inputTokens + cacheHit + (usage.cacheWriteTokens ?? 0);
    acc.output += usage.outputTokens;
    acc.cacheHit += cacheHit;
    acc.cacheMiss += cacheMiss;
    // 官方/三方分桶：官方直连调用数与其费用分别累加；三方=总量-官方。
    if (official)
        acc.officialCalls += 1;
    // 订阅套餐不计费；未定价的模型（目录与 models.dev 补充条目都没有）记 0。
    // 费用按本次调用增量累加（计价是线性的）：同一桶内混入订阅/未知调用时，
    // 后面免费调用不再把整个桶的 cost 覆盖成 0。时段按本次调用的实际时刻精确判定。
    if (!subscription && isPriced(key)) {
        const thisCost = computeCostAt(modelOf(key), {
            input: cacheHit + cacheMiss,
            cacheHit,
            cacheMiss,
            output: usage.outputTokens,
        }, timeMs);
        acc.cost += thisCost;
        if (official)
            acc.officialCost += thisCost;
    }
}
/** Local-time date stamp (the host runs in the user's timezone). */
export function dayStamp(time) {
    const date = new Date(time);
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
/** Local-time hour stamp `YYYY-MM-DDTHH` — the performance series bucket key. */
export function hourStamp(time) {
    const date = new Date(time);
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}`;
}
/** cwd 未知时工作区聚合的占位名（UI 显示 em dash，保持语言无关）。 */
export const UNKNOWN_WORKSPACE_NAME = '—';
/** 工作区名：取 cwd 的末级目录名；无 cwd 时返回 {@link UNKNOWN_WORKSPACE_NAME}。 */
export function workspaceNameOf(cwd) {
    if (cwd === undefined || cwd === '')
        return UNKNOWN_WORKSPACE_NAME;
    const parts = cwd.split(/[\\/]/).filter(Boolean);
    return parts.at(-1) ?? UNKNOWN_WORKSPACE_NAME;
}
/** 会话明细行的响应封顶：控制 payload 体积，重度用户的完整长尾不逐行下发。 */
export const SESSION_ROW_LIMIT = 100;
/** 每轮费用行的响应封顶：同样控制 payload 体积。 */
export const TURN_ROW_LIMIT = 200;
/** 聚合文档的短 TTL（毫秒）：合并密集轮询，TTL 内直接复用上次的合并结果。 */
export const AGGREGATE_TTL_MS = 5000;
/**
 * 消息文本长度：user/tool 角色分摊输入成本的启发式依据。字符串内容取其
 * 长度；内容块数组累计文本块长度；其余形状按 0 计（durable 边界收窄）。
 */
export function messageTextLength(message) {
    if (message === null || typeof message !== 'object')
        return 0;
    const content = message.content;
    if (typeof content === 'string')
        return content.length;
    if (!Array.isArray(content))
        return 0;
    let total = 0;
    for (const block of content) {
        const text = block?.text;
        if (typeof text === 'string')
            total += text.length;
    }
    return total;
}
/** Get-or-create one model cell inside a usage map (avoids non-null assertions). */
function usageCell(map, key) {
    const existing = map.get(key);
    if (existing !== undefined)
        return existing;
    const fresh = emptyUsage();
    map.set(key, fresh);
    return fresh;
}
/** Get-or-create one day's model cell inside the two-dimensional map. */
function modelDayCell(map, day, modelKey) {
    let models = map.get(day);
    if (models === undefined) {
        models = new Map();
        map.set(day, models);
    }
    return usageCell(models, modelKey);
}
/** Get-or-create one turn's accumulation state. */
function turnState(turns, turn) {
    const existing = turns.get(turn);
    if (existing !== undefined)
        return existing;
    const fresh = { turn, model: 'other', input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cost: 0, startedAt: Number.MAX_SAFE_INTEGER };
    turns.set(turn, fresh);
    return fresh;
}
/**
 * Fold one session's events into a {@link SessionFold}. 每个 LLM 调用归属到
 * 其前置 request/header 记录的模型；同时提取最新会话标题、最后活跃时间，
 * 并按轮次折叠每轮费用明细（turn/start → turn/end；调用按 (turn) 归组）。
 * @param events - the session's persisted events in log order.
 * @param subscriptionProviders - provider ids billed through subscription plans.
 * @param officialProviderIds - provider ids treated as the official DeepSeek channel
 *   (default: any `deepseek`-prefixed id). Others count as third-party.
 * @returns the per-session fold (cached by the incremental aggregator).
 */
export function foldSession(events, subscriptionProviders, officialProviderIds) {
    const fold = {
        total: emptyUsage(),
        byModel: new Map(),
        byDay: new Map(),
        byDayModels: new Map(),
        planCalls: new Map(),
        turns: [],
        perf: [],
        roles: { userChars: 0, toolChars: 0, inputCost: 0, outputCost: 0 },
        lastActive: 0,
    };
    let key = 'other';
    let subscription = false;
    let official = false;
    const turns = new Map();
    // 性能时间状态机：按 (turn, step) 归属 request/header 与内容 chunk 的时刻。
    const steps = new Map();
    // 最近一次 step/start 打开的 step；request/header 不带 turn/step，需借此归属。
    let lastOpenStepKey;
    for (const event of events) {
        fold.lastActive = Math.max(fold.lastActive, event.time);
        // session/title 由 dsh-session-title 经声明合并注册，本包不引用它，
        // 故按持久化数据的字面类型判定并做运行时收窄（durable 边界）。
        if (event.type === 'session/title') {
            const title = event.data.title;
            if (typeof title === 'string' && title.length > 0)
                fold.title = title;
            continue;
        }
        // 角色归因：用户消息与工具结果的文本长度（输入成本摊分的启发式依据）。
        if (event.type === 'user/message') {
            fold.roles.userChars += messageTextLength(event.data.message);
            continue;
        }
        if (event.type === 'tool/result') {
            fold.roles.toolChars += messageTextLength(event.data.message);
            continue;
        }
        if (event.type === 'turn/start') {
            const turn = event.data.turn ?? -1;
            const state = turnState(turns, turn);
            if (event.time < state.startedAt)
                state.startedAt = event.time;
            continue;
        }
        if (event.type === 'turn/end') {
            const turn = event.data.turn ?? -1;
            const state = turns.get(turn);
            if (state !== undefined)
                state.endedAt = event.time;
            continue;
        }
        if (event.type === 'step/start') {
            const turn = event.data.turn;
            const step = event.data.step;
            if (typeof turn === 'number' && typeof step === 'number') {
                const stepKey = `${turn}:${step}`;
                steps.set(stepKey, { startTime: event.time });
                lastOpenStepKey = stepKey;
            }
            continue;
        }
        if (event.type === 'request/header') {
            const { model, provider } = event.data.header.config;
            key = resolveCatalogKey(model);
            // 订阅套餐 provider 的调用即使撞名计费表也一律免费。
            subscription = subscriptionProviders.has(provider);
            // 官方直连（DeepSeek 官方）vs 第三方中转/代理。
            official = officialProviderIds === undefined ? isOfficialProvider(provider) : officialProviderIds.has(provider);
            // request/header 是该 step 的 TTFT 起点；归属到最近打开的 step（无独立请求头的
            // 工具续写步骤保持 undefined，以 step/start 起算估算）。
            if (lastOpenStepKey !== undefined) {
                const stepState = steps.get(lastOpenStepKey);
                if (stepState !== undefined && stepState.requestTime === undefined)
                    stepState.requestTime = event.time;
            }
            continue;
        }
        if (event.type === 'assistant/chunk') {
            // 内容增量（block-start/text-delta/reasoning-delta/tool-call-delta/block-end）
            // 才记录首/末内容时刻；usage/finish 无正文，不算内容。TTFT 以首个内容 chunk 为准。
            const data = event.data;
            const turn = data.turn;
            const step = data.step;
            const chunk = data.chunk;
            if (typeof turn === 'number' && typeof step === 'number' && chunk !== undefined && chunk.type !== 'usage' && chunk.type !== 'finish') {
                const state = steps.get(`${turn}:${step}`);
                if (state !== undefined) {
                    if (state.firstContentTime === undefined)
                        state.firstContentTime = event.time;
                    state.lastContentTime = event.time;
                }
            }
            continue;
        }
        if (event.type !== 'assistant/message')
            continue;
        const usage = event.data.usage;
        if (usage === undefined)
            continue;
        // 归属到最近的 request/header 记录的模型，token 按缓存分桶累加。
        // 时段按本次调用的实际时刻（event.time）精确判定，不再按固定比例混合。
        const modelKey = key;
        const day = dayStamp(event.time);
        foldUsage(fold.total, usage, modelKey, subscription, event.time, official);
        foldUsage(usageCell(fold.byModel, modelKey), usage, modelKey, subscription, event.time, official);
        foldUsage(usageCell(fold.byDay, day), usage, modelKey, subscription, event.time, official);
        foldUsage(modelDayCell(fold.byDayModels, day, modelKey), usage, modelKey, subscription, event.time, official);
        if (subscription)
            fold.planCalls.set(modelKey, (fold.planCalls.get(modelKey) ?? 0) + 1);
        // 每轮明细：同一轮内的调用累加进该轮状态（模型取最近一次的归属）。
        const turn = event.data.turn ?? -1;
        const state = turnState(turns, turn);
        state.model = modelKey;
        state.input += usage.inputTokens + (usage.cacheReadTokens ?? 0) + (usage.cacheWriteTokens ?? 0);
        state.output += usage.outputTokens;
        state.cacheHit += usage.cacheReadTokens ?? 0;
        state.cacheMiss += usage.inputTokens + (usage.cacheWriteTokens ?? 0);
        if (!subscription && isPriced(modelKey)) {
            const buckets = {
                input: (usage.cacheReadTokens ?? 0) + usage.inputTokens + (usage.cacheWriteTokens ?? 0),
                cacheHit: usage.cacheReadTokens ?? 0,
                cacheMiss: usage.inputTokens + (usage.cacheWriteTokens ?? 0),
                output: usage.outputTokens,
            };
            const fullCost = computeCostAt(modelOf(modelKey), buckets, event.time);
            state.cost += fullCost;
            // 角色归因：输出成本实测计价；输入成本 = 整次成本 - 输出部分，合并时
            // 再按 user/tool 消息字符占比摊分。
            const outputCost = computeCostAt(modelOf(modelKey), { input: 0, cacheHit: 0, cacheMiss: 0, output: usage.outputTokens }, event.time);
            fold.roles.outputCost += outputCost;
            fold.roles.inputCost += fullCost - outputCost;
        }
        if (state.startedAt === Number.MAX_SAFE_INTEGER)
            state.startedAt = event.time;
        // 性能样本：该 step 的 TTFT / 生成速度 / 总延迟；无效样本不入集。
        // 工具续写步骤无独立 request/header（perfState.requestTime 缺失）时以 step/start 估算。
        const stepNum = event.data.step;
        if (typeof stepNum === 'number') {
            const perfState = steps.get(`${turn}:${stepNum}`);
            if (perfState !== undefined) {
                const sample = perfSampleOf(perfState, modelKey, usage.outputTokens ?? 0, event.time);
                if (sample !== undefined)
                    fold.perf.push(sample);
                steps.delete(`${turn}:${stepNum}`);
            }
        }
    }
    fold.turns = [...turns.values()]
        .filter(state => state.input > 0 || state.output > 0)
        .sort((a, b) => a.turn - b.turn)
        .map(state => ({
        turn: state.turn,
        model: state.model,
        input: state.input,
        output: state.output,
        cacheHit: state.cacheHit,
        cacheMiss: state.cacheMiss,
        cost: state.cost,
        startedAt: state.startedAt === Number.MAX_SAFE_INTEGER ? fold.lastActive : state.startedAt,
        ...(state.endedAt === undefined ? {} : { endedAt: state.endedAt }),
    }));
    return fold;
}
/**
 * 生成一个 step 的性能样本；无效 / 超出 sane 上限（15 分钟）时返回 undefined，
 * 避免单条异常记录（时区错位 / 服务端抖动）拉偏均值。
 */
function perfSampleOf(state, model, outputTokens, endTime) {
    const start = state.requestTime ?? state.startTime;
    const first = state.firstContentTime;
    const last = state.lastContentTime;
    if (start === undefined || first === undefined || first < start)
        return undefined;
    const ttftMs = first - start;
    if (!Number.isFinite(ttftMs) || ttftMs < 0 || ttftMs > 900000)
        return undefined;
    const genMs = last !== undefined && last > first ? last - first : undefined;
    const latencyMs = endTime >= start ? endTime - start : undefined;
    const tps = genMs !== undefined && genMs > 0 && outputTokens > 0 ? outputTokens / (genMs / 1000) : undefined;
    return {
        model,
        hour: hourStamp(endTime),
        ttftMs,
        ...(tps === undefined || !Number.isFinite(tps) || tps <= 0 ? {} : { tps }),
        estimated: state.requestTime === undefined,
        ...(latencyMs === undefined ? {} : { latencyMs }),
    };
}
/** Accumulate one ModelUsage into another (merge step of the incremental aggregator). */
function mergeUsageInto(acc, cell) {
    acc.calls += cell.calls;
    acc.input += cell.input;
    acc.output += cell.output;
    acc.cacheHit += cell.cacheHit;
    acc.cacheMiss += cell.cacheMiss;
    acc.cost += cell.cost;
    acc.officialCalls += cell.officialCalls;
    acc.officialCost += cell.officialCost;
}
/** 均值（数组非空时调用；空数组按 0 兜底）。 */
function mean(values) {
    if (values.length === 0)
        return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}
/** 分位数（0..1）：先拷贝排序，再线性插值；空数组返回 0。 */
function percentile(values, p) {
    if (values.length === 0)
        return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = (sorted.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) {
        const value = sorted[lo];
        return value === undefined ? 0 : value;
    }
    const a = sorted[lo];
    const b = sorted[hi];
    if (a === undefined || b === undefined)
        return 0;
    return a + (b - a) * (idx - lo);
}
/**
 * Create the incremental usage aggregator.
 * @param persistence - the session persistence service.
 * @param options - aggregation tuning (e.g. subscription-plan providers).
 * @returns the aggregator holding the per-session fold cache.
 */
export function createUsageAggregator(persistence, options = {}) {
    const subscriptionProviders = new Set(options.subscriptionProviders ?? DEFAULT_SUBSCRIPTION_PROVIDERS);
    const officialProviderIds = options.officialProviderIds === undefined
        ? undefined
        : new Set(options.officialProviderIds);
    const cache = new Map();
    let lastDoc;
    let lastAt = 0;
    /** 失效键：日志文件的 mtime+size；拿不到（后端无 locate / 文件丢失）时每次重折。 */
    const stampOf = async (meta) => {
        const location = persistence.locate?.(meta);
        if (location === undefined)
            return null;
        try {
            const info = await stat(location.path);
            return `${String(info.mtimeMs)}:${String(info.size)}`;
        }
        catch {
            return null;
        }
    };
    return {
        async aggregate() {
            const now = Date.now();
            if (lastDoc !== undefined && now - lastAt < AGGREGATE_TTL_MS)
                return lastDoc;
            const metas = await persistence.list();
            const seen = new Set();
            const folds = [];
            // skipped：记录未能读取的会话 id，聚合末尾统一告警。
            const skipped = [];
            for (const meta of metas) {
                const id = String(meta.id);
                seen.add(id);
                const stamp = await stampOf(meta);
                const hit = cache.get(id);
                if (hit !== undefined && stamp !== null && hit.stamp === stamp) {
                    folds.push({ meta, fold: hit.fold });
                    continue;
                }
                // 单个损坏/不可读的会话日志（如 zstd torn frame）不能拖垮整份聚合：
                // 跳到下一个会话，避免面板整体归零。失败会话放进 skipped 末尾告警。
                try {
                    const { events } = await persistence.readFrom(meta.id, 0);
                    // durable 边界：日志事件是外部 JSON，foldSession 内做运行时收窄。
                    const fold = foldSession(events, subscriptionProviders, officialProviderIds);
                    cache.set(id, { stamp, fold });
                    folds.push({ meta, fold });
                }
                catch (error) {
                    skipped.push(id);
                    console.warn('[usage-billing] skip unreadable session', id, error);
                }
            }
            // 已删除会话的缓存一并清除，避免内存随历史膨胀。
            for (const key of [...cache.keys()]) {
                if (!seen.has(key))
                    cache.delete(key);
            }
            // 只读路径无坏会话时无需区分：stampOf 命中或新会话，失败均已在上面跳过。
            if (skipped.length > 0) {
                console.warn(`[usage-billing] aggregated ${folds.length} sessions, skipped ${skipped.length} unreadable:`, skipped);
            }
            const total = emptyUsage();
            const byModel = new Map();
            const byDay = new Map();
            const byDayModels = new Map();
            const planCalls = new Map();
            const sessionRows = [];
            const turnRows = [];
            const workspaceMap = new Map();
            // 角色归因跨会话累加：字符占比与输入/输出成本分别求和后再摊分。
            const roles = { userChars: 0, toolChars: 0, inputCost: 0, outputCost: 0 };
            // 性能样本跨会话累加（按模型 / 小时分桶，聚合时才算均值/分位）。
            const perfModel = new Map();
            const perfHour = new Map();
            for (const { meta, fold } of folds) {
                const sessionId = String(meta.id);
                mergeUsageInto(total, fold.total);
                roles.userChars += fold.roles.userChars;
                roles.toolChars += fold.roles.toolChars;
                roles.inputCost += fold.roles.inputCost;
                roles.outputCost += fold.roles.outputCost;
                for (const [modelKey, cell] of fold.byModel)
                    mergeUsageInto(usageCell(byModel, modelKey), cell);
                for (const [day, cell] of fold.byDay)
                    mergeUsageInto(usageCell(byDay, day), cell);
                for (const [day, models] of fold.byDayModels) {
                    for (const [modelKey, cell] of models)
                        mergeUsageInto(modelDayCell(byDayModels, day, modelKey), cell);
                }
                for (const [modelKey, count] of fold.planCalls) {
                    planCalls.set(modelKey, (planCalls.get(modelKey) ?? 0) + count);
                }
                // 性能样本入桶：按模型、按小时各聚合一份，供「性能」面板分别渲染。
                for (const sample of fold.perf) {
                    let modelAccum = perfModel.get(sample.model);
                    if (modelAccum === undefined) {
                        modelAccum = { ttfts: [], tps: [], latencies: [], estimated: 0 };
                        perfModel.set(sample.model, modelAccum);
                    }
                    modelAccum.ttfts.push(sample.ttftMs);
                    if (sample.tps !== undefined)
                        modelAccum.tps.push(sample.tps);
                    if (sample.latencyMs !== undefined)
                        modelAccum.latencies.push(sample.latencyMs);
                    if (sample.estimated)
                        modelAccum.estimated += 1;
                    let hourAccum = perfHour.get(sample.hour);
                    if (hourAccum === undefined) {
                        hourAccum = { ttfts: [], tps: [] };
                        perfHour.set(sample.hour, hourAccum);
                    }
                    hourAccum.ttfts.push(sample.ttftMs);
                    if (sample.tps !== undefined)
                        hourAccum.tps.push(sample.tps);
                }
                // 每轮明细：跨会话的轮次统一按起始时间倒序（展示最近 N 轮）。
                for (const row of fold.turns)
                    turnRows.push({ sessionId, ...row });
                // 工作区聚合：按 cwd 末级目录归并（cwd 未知归入占位名）。
                const wsName = workspaceNameOf(meta.cwd);
                const ws = workspaceMap.get(wsName) ?? { name: wsName, calls: 0, cost: 0, input: 0, output: 0, lastActive: 0 };
                ws.calls += fold.total.calls;
                ws.cost += fold.total.cost;
                ws.input += fold.total.input;
                ws.output += fold.total.output;
                ws.lastActive = Math.max(ws.lastActive, fold.lastActive);
                workspaceMap.set(wsName, ws);
                if (fold.total.calls > 0) {
                    sessionRows.push({
                        id: sessionId,
                        // exactOptionalPropertyTypes：缺失的可选字段不带 key。
                        ...(fold.title !== undefined ? { title: fold.title } : {}),
                        ...(meta.cwd !== undefined ? { cwd: meta.cwd } : {}),
                        calls: fold.total.calls,
                        cost: fold.total.cost,
                        lastActive: fold.lastActive,
                    });
                }
            }
            sessionRows.sort((a, b) => b.cost - a.cost || b.lastActive - a.lastActive);
            turnRows.sort((a, b) => b.startedAt - a.startedAt);
            const workspaces = [...workspaceMap.values()].sort((a, b) => b.cost - a.cost || b.lastActive - a.lastActive);
            const toRecord = (map) => {
                // exactOptionalPropertyTypes：只有全部调用都走订阅通道时才带 plan 字段。
                const record = {};
                for (const [key, cell] of map) {
                    if (planCalls.get(key) === cell.calls && cell.calls > 0)
                        record[key] = { ...cell, plan: true };
                    else
                        record[key] = cell;
                }
                return record;
            };
            const toModelDayRecord = (map) => Object.fromEntries([...map].map(([day, models]) => [day, Object.fromEntries(models)]));
            // 性能指标：按模型（含 P90）、按小时聚合；无任何可测样本时整个 perf 字段缺失。
            const perf = perfModel.size === 0
                ? undefined
                : {
                    byModel: Object.fromEntries([...perfModel].map(([model, acc]) => [model, {
                            samples: acc.ttfts.length,
                            ttftAvg: mean(acc.ttfts),
                            ttftP50: percentile(acc.ttfts, 0.5),
                            ttftP90: percentile(acc.ttfts, 0.9),
                            ...(acc.tps.length === 0 ? {} : { tpsAvg: mean(acc.tps) }),
                            latencyAvg: acc.latencies.length === 0 ? 0 : mean(acc.latencies),
                            estimatedSamples: acc.estimated,
                        }])),
                    byHour: Object.fromEntries([...perfHour].map(([hour, acc]) => [hour, {
                            samples: acc.ttfts.length,
                            ttftAvg: mean(acc.ttfts),
                            ...(acc.tps.length === 0 ? {} : { tpsAvg: mean(acc.tps) }),
                        }])),
                };
            lastDoc = {
                version: 3,
                updatedAt: now,
                source: 'session-logs',
                total,
                byModel: toRecord(byModel),
                byDay: toRecord(byDay),
                byDayModels: toModelDayRecord(byDayModels),
                bySession: sessionRows.slice(0, SESSION_ROW_LIMIT),
                byTurn: turnRows.slice(0, TURN_ROW_LIMIT),
                byWorkspace: workspaces.slice(0, SESSION_ROW_LIMIT),
                ...(perf === undefined ? {} : { perf }),
                // 角色归因：输出成本为实测；输入成本按 user/tool 消息字符占比摊分
                //（无任何消息内容的日志按五五均分兜底，整体属估算口径）。
                byRole: (() => {
                    const chars = roles.userChars + roles.toolChars;
                    const userShare = chars > 0 ? roles.userChars / chars : 0.5;
                    return {
                        user: roles.inputCost * userShare,
                        assistant: roles.outputCost,
                        tool: roles.inputCost * (1 - userShare),
                    };
                })(),
            };
            lastAt = now;
            return lastDoc;
        },
    };
}
/**
 * Aggregate real usage from every persisted session log (one-shot, no cache).
 * @param persistence - the session persistence service.
 * @param options - aggregation tuning (e.g. subscription-plan providers).
 * @returns the usage-stats document (same shape the dashboard expects).
 */
export async function aggregateUsage(persistence, options = {}) {
    return createUsageAggregator(persistence, options).aggregate();
}
//# sourceMappingURL=aggregate.js.map