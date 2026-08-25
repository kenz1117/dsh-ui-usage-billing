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
/** 由 baseURL 归一化出站点 origin（协议 + 主机 + 端口）；解析失败回退原值。 */
export function siteOriginOf(baseURL) {
    try {
        return new URL(baseURL).origin;
    }
    catch {
        return baseURL;
    }
}
/**
 * 把一个 provider 路由归类为站点引用。判定顺序（与路由在 provider 配置里的状态一致）：
 * - 路由存在于当前配置且配了 baseURL → 中转站 `site`（按 origin 归组，同站多 key 合并）；
 * - 路由存在于当前配置但无 baseURL → 厂商直连 `direct`；
 * - 路由不在当前配置里 → `unknown`（改过名 / 删除过，是「读不到」而非「直连」）。
 * @param provider - 会话日志里的 provider 路由名（request/header 的 `config.provider`）。
 * @param routes - 当前 provider 路由视图（来自 llm-pi-ai providers）。
 */
export function siteRefOf(provider, routes) {
    const view = routes[provider];
    if (view !== undefined) {
        if (view.baseURL !== undefined)
            return { kind: 'site', origin: siteOriginOf(view.baseURL), provider };
        return { kind: 'direct', provider };
    }
    return { kind: 'unknown', provider };
}
/** 站点桶的稳定 key：`site:<origin>` 与 `direct:<provider>` 分开，`unknown` 单一桶。 */
export function siteBucketKey(ref) {
    if (ref.kind === 'site')
        return `site:${ref.origin ?? ''}`;
    if (ref.kind === 'direct')
        return `direct:${ref.provider}`;
    return 'unknown';
}
/** 每会话折叠缓存默认上限：超过则按 LRU 淘汰（P1-6 峰值内存治理）。 */
export const DEFAULT_MAX_CACHE_SESSIONS = 400;
/** Zeroed usage accumulator. */
export function emptyUsage() {
    return { calls: 0, input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cost: 0, reasoning: 0, officialCalls: 0, officialCost: 0 };
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
    acc.reasoning += usage.reasoningTokens ?? 0;
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
/**
 * 宿主进程的 IANA 时区名与 UTC 偏移，供面板标注「天按哪个时区切分」。
 * `getTimezoneOffset` 是 UTC 以西的分钟数，符号与日常写法相反，故取反。
 * @returns `{ name, offset }`，如 `{ name: "Asia/Shanghai", offset: "UTC+08:00" }`。
 */
export function hostTimeZone(now = new Date()) {
    const minutes = -now.getTimezoneOffset();
    const sign = minutes < 0 ? '-' : '+';
    const abs = Math.abs(minutes);
    const hh = String(Math.floor(abs / 60)).padStart(2, '0');
    const mm = String(abs % 60).padStart(2, '0');
    let name;
    try {
        name = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    }
    catch {
        name = 'UTC';
    }
    return { name, offset: `UTC${sign}${hh}:${mm}` };
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
 * 账本迁移注册表。当前账本 schema（version 1）尚无字段变更需求，故为空表；
 * 机制已就绪，schema 变更时在此登记幂等迁移，见 {@link LedgerMigration}。
 */
export const LEDGER_MIGRATIONS = [];
/**
 * 在加载边界对账本文档应用未执行的迁移，并记录已应用 id 供写回。
 * @param document - 从持久化读出的原始账本文档。
 * @param migrations - 待执行的迁移注册表；缺省用模块级 {@link LEDGER_MIGRATIONS}。
 * @returns 是否发生了需要重新落盘的修改。
 */
export function runLedgerMigrations(document, migrations = LEDGER_MIGRATIONS) {
    const applied = new Set(document.appliedMigrations ?? []);
    let changed = false;
    for (const migration of migrations) {
        if (applied.has(migration.id))
            continue;
        if (migration.apply(document))
            changed = true;
        applied.add(migration.id);
    }
    if (applied.size > 0 && (document.appliedMigrations === undefined
        || document.appliedMigrations.length !== applied.size
        || document.appliedMigrations.some(id => !applied.has(id)))) {
        document.appliedMigrations = [...applied];
        changed = true;
    }
    return changed;
}
/** Serialize Map/Set-heavy fold state into a JSON-safe ledger entry. */
function serializeFold(fold) {
    return {
        total: fold.total,
        byModel: Object.fromEntries(fold.byModel),
        byDay: Object.fromEntries(fold.byDay),
        byDayModels: Object.fromEntries([...fold.byDayModels].map(([day, models]) => [day, Object.fromEntries(models)])),
        bySite: Object.fromEntries(fold.bySite),
        unpricedModels: [...fold.unpricedModels],
        planCalls: Object.fromEntries(fold.planCalls),
        turns: fold.turns,
        perf: fold.perf,
        roles: fold.roles,
        lastActive: fold.lastActive,
    };
}
/** Restore a JSON-safe ledger fold into the in-memory Map/Set representation. */
function deserializeFold(fold) {
    return {
        total: fold.total,
        byModel: new Map(Object.entries(fold.byModel)),
        byDay: new Map(Object.entries(fold.byDay)),
        byDayModels: new Map(Object.entries(fold.byDayModels).map(([day, models]) => [day, new Map(Object.entries(models))])),
        bySite: new Map(Object.entries(fold.bySite)),
        unpricedModels: new Set(fold.unpricedModels),
        planCalls: new Map(Object.entries(fold.planCalls)),
        turns: fold.turns,
        perf: fold.perf,
        roles: fold.roles,
        lastActive: fold.lastActive,
    };
}
/** Runtime boundary for a user-editable/corrupt ledger file. Invalid rows are ignored. */
function ledgerSessionsOf(value) {
    if (value === null || typeof value !== 'object')
        return [];
    const document = value;
    if (document.version !== 1 || !Array.isArray(document.sessions))
        return [];
    return document.sessions.filter((entry) => {
        if (entry === null || typeof entry !== 'object')
            return false;
        const row = entry;
        if (typeof row.id !== 'string' || row.id === '' || row.fold === null || typeof row.fold !== 'object')
            return false;
        const fold = row.fold;
        return fold.total !== undefined
            && fold.byModel !== undefined
            && fold.byDay !== undefined
            && fold.byDayModels !== undefined
            && fold.bySite !== undefined
            && Array.isArray(fold.unpricedModels)
            && fold.planCalls !== undefined
            && Array.isArray(fold.turns)
            && Array.isArray(fold.perf)
            && fold.roles !== undefined
            && typeof fold.lastActive === 'number';
    });
}
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
export function foldSession(events, subscriptionProviders, officialProviderIds, routes = {}) {
    // Fork 种子过滤：从父会话 fork 出来的子会话，会把父会话的事件流整段拷贝进
    // 本会话日志作为构造种子，并在种子末尾追加一个 `session/end-seed` 边界事件，
    // 该事件的 `seq` = 种子事件数。种子事件在父会话里已经贡献过一次用量，若再
    // 折叠会重复计费，因此跳过 `seq < 边界` 的所有事件。
    // 多重 fork 链（A fork B fork C）会出现多个 end-seed：C 的种子包含 B 的
    // end-seed 与 B 的 own 事件，此时一律取**最后一个** end-seed 的 seq 作为边界，
    // 才能把 B 的 own 事件（对 C 而言也是种子）一并跳过。
    let seedBoundary = -1;
    for (const event of events) {
        if (event.type === 'session/end-seed' && typeof event.seq === 'number' && Number.isFinite(event.seq)) {
            seedBoundary = Math.max(seedBoundary, event.seq);
        }
    }
    // Fork 种子去重边界。`session/end-seed` 既出现在 fork 子会话（父拷贝种子 + 子 own），
    // 也出现在 resume/continue 会话（每续写一段就在末尾标记一段结束），单看事件无法区分。
    // 只当 end-seed **之后确实还有事件**（seq > 边界，即真正的续写 / own 部分）时才把
    // `seq < 边界` 当父会话种子跳过；末尾就是 end-seed（其后无事件）的会话不做跳过，
    // 否则会把 resume 续写会话的全部真实调用（如 697 次的大会话）误当种子整体丢弃。
    if (seedBoundary >= 0) {
        const hasAfterSeed = events.some(event => typeof event.seq === 'number' && Number.isFinite(event.seq) && event.seq > seedBoundary);
        if (!hasAfterSeed)
            seedBoundary = -1;
    }
    const fold = {
        total: emptyUsage(),
        byModel: new Map(),
        byDay: new Map(),
        byDayModels: new Map(),
        bySite: new Map(),
        unpricedModels: new Set(),
        planCalls: new Map(),
        turns: [],
        perf: [],
        roles: { userChars: 0, toolChars: 0, inputCost: 0, outputCost: 0 },
        lastActive: 0,
    };
    let key = 'other';
    let subscription = false;
    let official = false;
    // 当前调用的站点桶 key：在 request/header 时随模型/订阅/官方状态一起更新。
    let siteBucket = 'unknown';
    const turns = new Map();
    // 性能时间状态机：按 (turn, step) 归属 request/header 与内容 chunk 的时刻。
    const steps = new Map();
    // 最近一次 step/start 打开的 step；request/header 不带 turn/step，需借此归属。
    let lastOpenStepKey;
    for (const event of events) {
        // Fork 种子跳过：`seq < 边界` 的事件是父会话拷贝来的种子，已计过一次费，
        // 不再折叠（多重 fork 链取最后一个 end-seed，见上方边界扫描）。
        if (seedBoundary >= 0 && typeof event.seq === 'number' && Number.isFinite(event.seq) && event.seq < seedBoundary) {
            continue;
        }
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
            // 中转站归组：按当前路由映射到站点/直连/未知路由。
            siteBucket = siteBucketKey(siteRefOf(provider, routes));
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
            const data = event.data;
            const turn = data.turn;
            const step = data.step;
            const chunk = data.chunk;
            // 内容增量（block-start/text-delta/reasoning-delta/tool-call-delta/block-end）
            // 才记录首/末内容时刻；usage/finish 无正文，不算内容。TTFT 以首个内容 chunk 为准。
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
        // 不可计价模型（目录外/无价，且非订阅通道）收集到 unpriced 集合，供聚合层暴露给用户提示。
        if (!subscription && !isPriced(modelKey))
            fold.unpricedModels.add(modelKey);
        foldUsage(fold.total, usage, modelKey, subscription, event.time, official);
        foldUsage(usageCell(fold.byModel, modelKey), usage, modelKey, subscription, event.time, official);
        foldUsage(usageCell(fold.byDay, day), usage, modelKey, subscription, event.time, official);
        foldUsage(modelDayCell(fold.byDayModels, day, modelKey), usage, modelKey, subscription, event.time, official);
        foldUsage(usageCell(fold.bySite, siteBucket), usage, modelKey, subscription, event.time, official);
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
    acc.reasoning += cell.reasoning;
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
    const maxCacheSessions = options.maxCacheSessions ?? DEFAULT_MAX_CACHE_SESSIONS;
    const cache = new Map();
    // Durable rows stay JSON-safe in memory. The LRU above still bounds the
    // heavier Map/Set representation used for active-session incremental folds.
    const ledger = new Map();
    let ledgerLoaded = false;
    let ledgerNeedsSave = false;
    let lastDoc;
    let lastAt = 0;
    /** 每次聚合取最新的 provider 路由视图（中转站零配置发现）；缺省按空处理（全部未知路由）。 */
    const routesOf = () => options.resolveRoutes?.() ?? {};
    const ensureLedgerLoaded = async () => {
        if (ledgerLoaded || options.ledger === undefined)
            return;
        ledgerLoaded = true;
        try {
            const stored = await options.ledger.load();
            if (stored !== null && typeof stored === 'object' && stored.sessions !== undefined) {
                // 配置迁移：对原始文档执行未应用的迁移；有修改时重新落盘（下轮聚合写回）。
                const document = stored;
                if (runLedgerMigrations(document))
                    ledgerNeedsSave = true;
            }
            for (const entry of ledgerSessionsOf(stored))
                ledger.set(entry.id, entry);
        }
        catch (error) {
            // A damaged ledger must not take down the dashboard. The host store normally
            // tries its .bak first; if both fail, current logs rebuild a fresh ledger.
            console.warn('[usage-billing] failed to load durable usage ledger; rebuilding from current sessions:', error);
        }
    };
    /** 失效键：日志文件的 mtime+size；拿不到（后端无 locate / 文件丢失 / locate 抛错）时返回 null，
     *  让调用方每次重折。locate 调用也纳入 try，避免单个会话的 locate 异常把整份聚合拖垮。 */
    const stampOf = async (meta) => {
        try {
            const location = persistence.locate?.(meta);
            if (location === undefined)
                return null;
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
            await ensureLedgerLoaded();
            let metas;
            try {
                metas = await persistence.list();
            }
            catch (error) {
                if (options.ledger === undefined || ledger.size === 0)
                    throw error;
                // The independent ledger is also the last-resort source when the session
                // backend itself is temporarily unavailable; no live rows are pruned.
                console.warn('[usage-billing] session list unavailable; serving durable usage ledger:', error);
                metas = [];
            }
            const seen = new Set();
            const included = new Set();
            const folds = [];
            // skipped：记录未能读取的会话 id，聚合末尾统一告警。
            const skipped = [];
            for (const meta of metas) {
                const id = String(meta.id);
                seen.add(id);
                const stamp = await stampOf(meta);
                const hit = cache.get(id);
                if (hit !== undefined && stamp !== null && hit.stamp === stamp) {
                    // LRU touch：复用命中的会话移到缓存末尾，供上方上限清理优先淘汰最久未用。
                    cache.delete(id);
                    cache.set(id, hit);
                    folds.push({ id, ...(meta.cwd === undefined ? {} : { cwd: meta.cwd }), fold: hit.fold });
                    included.add(id);
                    continue;
                }
                // 单个损坏/不可读的会话日志（如 zstd torn frame）不能拖垮整份聚合：
                // 跳到下一个会话，避免面板整体归零。失败会话放进 skipped 末尾告警。
                try {
                    const { events } = await persistence.readFrom(meta.id, 0);
                    // P0-4 竞态加固：读取期间日志被写入（mtime+size 变化），本轮的折叠可能基于
                    // 半截内容，丢弃待下一轮重读，避免把不完整事件当作真实用量输出。
                    const after = await stampOf(meta);
                    if (stamp !== null && after !== stamp)
                        continue;
                    // durable 边界：日志事件是外部 JSON，foldSession 内做运行时收窄。
                    const fold = foldSession(events, subscriptionProviders, officialProviderIds, routesOf());
                    cache.set(id, { stamp, fold });
                    folds.push({ id, ...(meta.cwd === undefined ? {} : { cwd: meta.cwd }), fold });
                    included.add(id);
                    if (options.ledger !== undefined) {
                        const entry = {
                            id,
                            ...(meta.cwd === undefined ? {} : { cwd: meta.cwd }),
                            ...(stamp === null ? {} : { stamp }),
                            fold: serializeFold(fold),
                        };
                        const previous = ledger.get(id);
                        // A no-locate backend has no stable stamp, so compare the serialized row;
                        // located logs use the cheap stamp and metadata check.
                        const changed = previous === undefined
                            || previous.stamp !== entry.stamp
                            || previous.cwd !== entry.cwd
                            || (stamp === null && JSON.stringify(previous.fold) !== JSON.stringify(entry.fold));
                        if (changed) {
                            ledger.set(id, entry);
                            ledgerNeedsSave = true;
                        }
                    }
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
            // P1-6 峰值内存治理：缓存会话数超过上限时，从最久未用的开始淘汰。
            while (cache.size > maxCacheSessions) {
                const oldest = cache.keys().next();
                if (oldest.done === true)
                    break;
                cache.delete(oldest.value);
            }
            // The durable ledger is deliberately not pruned by `seen`: missing rows are
            // history, not cache garbage. Unreadable live sessions also fall back to their
            // last successfully folded ledger row.
            if (options.ledger !== undefined) {
                for (const entry of ledger.values()) {
                    if (included.has(entry.id))
                        continue;
                    try {
                        folds.push({
                            id: entry.id,
                            ...(entry.cwd === undefined ? {} : { cwd: entry.cwd }),
                            fold: deserializeFold(entry.fold),
                        });
                        included.add(entry.id);
                    }
                    catch (error) {
                        console.warn('[usage-billing] skip invalid durable ledger session', entry.id, error);
                    }
                }
                if (ledgerNeedsSave) {
                    try {
                        await options.ledger.save({ version: 1, updatedAt: now, sessions: [...ledger.values()] });
                        ledgerNeedsSave = false;
                    }
                    catch (error) {
                        // Keep serving the correct in-memory total; a later changed aggregation retries.
                        console.warn('[usage-billing] failed to persist durable usage ledger:', error);
                    }
                }
            }
            // 只读路径无坏会话时无需区分：stampOf 命中或新会话，失败均已在上面跳过。
            if (skipped.length > 0) {
                console.warn(`[usage-billing] aggregated ${folds.length} sessions, skipped ${skipped.length} unreadable:`, skipped);
            }
            const total = emptyUsage();
            const byModel = new Map();
            const byDay = new Map();
            const byDayModels = new Map();
            const bySite = new Map();
            const unpricedModels = new Set();
            const planCalls = new Map();
            const sessionRows = [];
            const turnRows = [];
            const workspaceMap = new Map();
            // 角色归因跨会话累加：字符占比与输入/输出成本分别求和后再摊分。
            const roles = { userChars: 0, toolChars: 0, inputCost: 0, outputCost: 0 };
            // 性能样本跨会话累加（按模型 / 小时分桶，聚合时才算均值/分位）。
            const perfModel = new Map();
            const perfHour = new Map();
            for (const { id: sessionId, cwd, fold } of folds) {
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
                for (const [siteKey, cell] of fold.bySite)
                    mergeUsageInto(usageCell(bySite, siteKey), cell);
                for (const id of fold.unpricedModels)
                    unpricedModels.add(id);
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
                // 工作区聚合：按 cwd 归并（优先用宿主工作区标题，未注入/未命中回退到末级目录名）。
                const wsName = (options.resolveWorkspaceTitle !== undefined && cwd !== undefined)
                    ? (options.resolveWorkspaceTitle(cwd) ?? workspaceNameOf(cwd))
                    : workspaceNameOf(cwd);
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
                        ...(cwd !== undefined ? { cwd } : {}),
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
                timezone: hostTimeZone(),
                total,
                byModel: toRecord(byModel),
                byDay: toRecord(byDay),
                byDayModels: toModelDayRecord(byDayModels),
                bySession: sessionRows.slice(0, SESSION_ROW_LIMIT),
                byTurn: turnRows.slice(0, TURN_ROW_LIMIT),
                byWorkspace: workspaces.slice(0, SESSION_ROW_LIMIT),
                ...(bySite.size === 0 ? {} : { bySite: toRecord(bySite) }),
                ...(unpricedModels.size === 0 ? {} : { unpricedModels: [...unpricedModels].sort() }),
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