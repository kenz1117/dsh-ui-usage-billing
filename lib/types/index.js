/**
 * Usage billing surface plugin, node half.
 *
 * Serves `/api/billing/usage-stats`: real usage aggregated from every
 * persisted session log (see `aggregate.ts`) — the browser dashboard reads it
 * instead of showing an empty snapshot. When `sessionPersistence` is
 * unavailable (or aggregation fails), the configured `statsPath` /
 * `DSH_USAGE_STATS` / conventional JSON file is served as a fallback, and a
 * missing file answers `{ error }` so the dashboard shows zeros, never
 * fabricated samples.
 */
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { writeFileAtomic } from '@deepseek-ai/dsh-atomic-write';
import { credentialRef } from '@deepseek-ai/dsh-credentials';
import { createUsageAggregator, dayStamp } from "./aggregate.js";
import { applyLivePricing, formatMoney, formatTokens } from "./client/pricing.js";
import { queryBalances, queryCustomBalances } from "./balance.js";
import { fetchLivePricing } from "./pricing-fetch.js";
import { collectSubscriptions, EMPTY_SUBSCRIPTION_KEYS, identifySubscriptionPlans } from "./subscriptions.js";
import { planTypeOf, subscriptionCnyOf } from "./client/plan-knowledge.js";
/** 实时定价的后台刷新间隔（毫秒）：汇率/模型价低频变化，6 小时一次足够。 */
const PRICING_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;
/** 订阅套餐额度缓存时长（毫秒）：上游配额 API 低频变化，5 分钟足够。 */
const SUBSCRIPTION_CACHE_MS = 5 * 60 * 1000;
/** DeepSeek 余额查询的默认凭据引用（与 llm-deepseek 的默认引用一致）。 */
const DEFAULT_BALANCE_API_KEY_ENV = 'DEEPSEEK_API_KEY';
/** 统计快照的落盘节流（毫秒）：前端 30 秒轮询，快照最多每 30 秒写一次。 */
const SNAPSHOT_INTERVAL_MS = 30_000;
/** Required services: the web server, the persisted session log store, and user settings. */
export const inject = ['webServer', 'sessionPersistence', 'credentials', 'settings'];
/**
 * 订阅 provider id（llm-pi-ai 设置键）→ billing 适配器 key 的映射。
 * 复用 dsh 既有的 llm-pi-ai provider 配置（apiKeyEnv 引用），不引入新配置面。
 */
/** key 只取字符串凭据字段：zaiRegion 是区域枚举，由下方区域逻辑单独赋值。 */
const SUBSCRIPTION_KEY_SOURCES = [
    { provider: 'kimi-coding', key: 'kimiApiKey' },
    { provider: 'zai-coding-cn', key: 'zaiApiKey' },
    { provider: 'opencode', key: 'opencodeApiKey' },
    { provider: 'opencode-go', key: 'opencodeApiKey' },
    { provider: 'minimax', key: 'minmaxApiKey' },
    { provider: 'minimax-token-plan', key: 'minmaxApiKey' },
    { provider: 'openrouter', key: 'openrouterApiKey' },
];
/**
 * 读取 llm-pi-ai 设置的 `providers` 字典（`<route> → { apiKeyEnv? }`）。
 * 余额查询复用同一份来源：部署为某个 provider 配一次 key，多个 surface 共享。
 * @param settings - the settings service (reads the llm-pi-ai namespace).
 * @returns the providers dict; empty when the namespace is unreadable.
 */
async function readPiAiProviders(settings) {
    try {
        const descriptors = settings.describe({ redactSecrets: true });
        const pi = descriptors.find(descriptor => descriptor.ns === 'llm-pi-ai')?.value;
        return pi?.providers ?? {};
    }
    catch {
        // 设置服务异常时按空 providers 处理（余额面板显示未配置）。
        return {};
    }
}
/**
 * 解析订阅适配器需要的 API Key：从 llm-pi-ai 设置的 `providers.<id>.apiKeyEnv`
 * 读引用（如 kimi-coding → KIMI_CODING_API_KEY），再经凭据 seam 解析成实际值。
 * 同时识别出用户配置了 key 的订阅套餐（供面板只显示已识别的）。
 * @param settings - the settings service (reads the llm-pi-ai namespace).
 * @param credentials - the credentials service (resolves the env refs).
 */
export async function resolveSubscriptionKeys(settings, credentials) {
    const keys = { ...EMPTY_SUBSCRIPTION_KEYS };
    let providers;
    try {
        const descriptors = settings.describe({ redactSecrets: true });
        const pi = descriptors.find(descriptor => descriptor.ns === 'llm-pi-ai')?.value;
        providers = pi?.providers;
    }
    catch {
        // 设置服务异常时按全空 key 处理（订阅面板显示未配置）。
        return { keys, identified: [] };
    }
    for (const { provider, key } of SUBSCRIPTION_KEY_SOURCES) {
        const env = providers?.[provider]?.apiKeyEnv;
        if (typeof env !== 'string' || env === '')
            continue;
        try {
            const resolved = await credentials.resolve(credentialRef(env));
            if (resolved?.value !== undefined && resolved.value !== '')
                keys[key] = resolved.value;
        }
        catch {
            // 凭据解析失败跳过该 provider（保持未配置）。
        }
    }
    // zai-coding-cn 是智谱国内域：跟随它时区域固定为 bigmodel-cn。
    if (providers?.['zai-coding-cn']?.apiKeyEnv !== undefined && keys.zaiApiKey !== '') {
        keys.zaiRegion = 'bigmodel-cn';
    }
    return { keys, identified: identifySubscriptionPlans(providers) };
}
/**
 * Host plugin body: serve real aggregated usage to the browser dashboard.
 * @param ctx - host context carrying webServer and sessionPersistence.
 * @param config - optional statsPath override.
 */
export function apply(ctx, config = {}) {
    // 常驻增量聚合器：按会话缓存折叠结果（日志 mtime+size 失效），
    // 前端 30 秒轮询只重算写过的会话。
    const aggregator = createUsageAggregator(ctx.sessionPersistence, {
        ...(config.subscriptionProviders === undefined
            ? {}
            : { subscriptionProviders: config.subscriptionProviders }),
    });
    const cwd = process.cwd();
    const snapshotPath = join(homedir(), '.dsh/.dsh-usage-stats.json');
    const candidates = [
        config.statsPath,
        process.env.DSH_USAGE_STATS,
        join(cwd, '.dsh-usage-stats.json'),
        snapshotPath,
    ].filter((path) => typeof path === 'string' && path.length > 0);
    // 统计快照持久化：聚合成功即原子写（temp+rename，读者只见完整新旧内容），
    // 快照同时就是聚合失败时的回退文件——重启首屏与聚合异常都有最近数据可看。
    let lastSnapshotAt = 0;
    const persistSnapshot = (doc) => {
        const now = Date.now();
        if (now - lastSnapshotAt < SNAPSHOT_INTERVAL_MS)
            return;
        lastSnapshotAt = now;
        // _writer 供双实例检测；客户端忽略未知字段。
        void writeFileAtomic(snapshotPath, JSON.stringify({ ...doc, _writer: { pid: process.pid, at: now } }), { mode: 0o600, dirMode: 0o700 }).catch(() => {
            // 快照写失败不影响服务：内存聚合值已下发。
        });
    };
    // 双实例检测：启动时快照新鲜（60 秒内）且写入者不是本进程 → 另一实例在跑，
    // 双实例会造成余额/预算提醒重复，提示一次。
    void (async () => {
        try {
            const text = await readFile(snapshotPath, 'utf8');
            const doc = JSON.parse(text);
            const writer = doc._writer;
            if (writer?.pid !== undefined && writer.pid !== process.pid && writer.at !== undefined && Date.now() - writer.at < 60_000) {
                console.warn(`[usage-billing] 检测到另一实例（pid ${writer.pid}）正在提供用量统计，双实例可能导致提醒重复。`);
            }
        }
        catch {
            // 无快照或快照损坏：首次运行 / 旧版本的常态，静默跳过。
        }
    })();
    // usage_stats 动态工具：模型可主动查询用量费用（今天 / 本月 / 当前会话 / 累计）。
    // tools 服务缺席时整个注册跳过（机会性组合，不阻断插件加载）。
    ctx.inject(['tools'], (toolsCtx) => {
        toolsCtx.tools.register(defineTool({
            name: 'usage_stats',
            description: '查询本机 DeepSeek Harness 的模型用量与估算费用（人民币，按官方目录价估算，非账单）。range 取值：today=今天，month=本月，session=当前会话，all=累计。',
            parameters: {
                range: {
                    type: 'string',
                    enum: ['today', 'month', 'session', 'all'],
                    required: true,
                    description: '统计范围：today / month / session / all',
                },
            },
            output: {
                schema: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        range: { type: 'string', required: true },
                        cost: { type: 'number', required: true, description: '估算费用（人民币元）' },
                        calls: { type: 'number', required: true },
                        input: { type: 'number', required: true, description: '输入 tokens' },
                        output: { type: 'number', required: true, description: '输出 tokens' },
                    },
                },
                render: (_args, value) => [{
                        type: 'text',
                        text: `用量（${value.range}）：估算费用 ${formatMoney(value.cost)}，调用 ${value.calls} 次，输入 ${formatTokens(value.input)} tokens，输出 ${formatTokens(value.output)} tokens`,
                    }],
            },
            async execute(args, exec) {
                const stats = await aggregator.aggregate();
                const zero = { range: args.range, cost: 0, calls: 0, input: 0, output: 0 };
                if (args.range === 'all') {
                    return { range: args.range, cost: stats.total.cost, calls: stats.total.calls, input: stats.total.input, output: stats.total.output };
                }
                if (args.range === 'today') {
                    const day = stats.byDay[dayStamp(Date.now())];
                    return day === undefined ? zero : { range: args.range, cost: day.cost, calls: day.calls, input: day.input, output: day.output };
                }
                if (args.range === 'month') {
                    const prefix = dayStamp(Date.now()).slice(0, 7);
                    let cost = 0;
                    let calls = 0;
                    let input = 0;
                    let output = 0;
                    for (const [date, day] of Object.entries(stats.byDay)) {
                        if (!date.startsWith(prefix))
                            continue;
                        cost += day.cost;
                        calls += day.calls;
                        input += day.input;
                        output += day.output;
                    }
                    return { range: args.range, cost, calls, input, output };
                }
                // session：按当前会话 id 从每轮明细汇总（byTurn 封顶 200 行，当前会话
                // 恒为最近轮次，覆盖完整）。
                const sessionId = exec.agent?.id;
                if (sessionId === undefined)
                    throw new Error('usage_stats 的 session 范围需要 agent 会话上下文');
                let cost = 0;
                let calls = 0;
                let input = 0;
                let output = 0;
                for (const turn of stats.byTurn ?? []) {
                    if (turn.sessionId !== String(sessionId))
                        continue;
                    cost += turn.cost;
                    calls += 1;
                    input += turn.input;
                    output += turn.output;
                }
                return { range: args.range, cost, calls, input, output };
            },
        }));
    });
    // 后台拉取实时定价（汇率 + OpenRouter 模型价 + models.dev 目录外补充），
    // 失败自动降级内置目录；之后每 6 小时刷新一次，汇率/价格无需重启进程就能
    // 保持最新。host 侧同步应用：聚合计价与客户端展示同源（含目录外补充条目）。
    let live = { source: 'builtin' };
    const refreshPricing = async () => {
        live = await fetchLivePricing();
        applyLivePricing(live);
    };
    void refreshPricing();
    ctx.effect(() => {
        const timer = setInterval(() => { void refreshPricing(); }, PRICING_REFRESH_INTERVAL_MS);
        return () => { clearInterval(timer); };
    }, 'usage-billing: pricing refresh timer');
    ctx.effect(() => ctx.webServer.register({
        kind: 'exact',
        path: '/api/billing/pricing',
        handler: async (_req, res) => {
            res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(live));
        },
    }), 'usage-billing: pricing route');
    ctx.effect(() => ctx.webServer.register({
        kind: 'exact',
        path: '/api/billing/balance',
        handler: async (_req, res) => {
            res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
            // 余额 key 复用 llm-pi-ai 的 providers（同订阅）：部署为某 provider 配一次即可。
            // DeepSeek 保留 `balanceApiKeyEnv` 特例：llm-pi-ai 未配 deepseek 时仍可用该 env 查余额。
            const piProviders = await readPiAiProviders(ctx.settings);
            const providers = { ...piProviders };
            if (providers['deepseek'] === undefined) {
                providers['deepseek'] = { apiKeyEnv: config.balanceApiKeyEnv ?? DEFAULT_BALANCE_API_KEY_ENV };
            }
            const balances = await queryBalances(ctx, providers);
            // 自定义 Provider 余额（任意 HTTP 端点）：独立于内置三家，逐个成败。
            const custom = await queryCustomBalances(ctx, config.customBalances ?? []);
            res.end(JSON.stringify({ balances: [...balances, ...custom] }));
        },
    }), 'usage-billing: balance route');
    // 订阅套餐额度：外部 API 低频变化，缓存 5 分钟避免每次轮询都打上游。
    // 只返回"识别到"的套餐：有额度适配器的查剩余量，无适配器的保留识别行
    //（客户端显示"额度接口未接入"）；用户没配置 key 的 provider 一律不出现。
    let quotaCache = { at: 0, quotas: [] };
    const refreshQuotas = async () => {
        const { keys, identified } = await resolveSubscriptionKeys(ctx.settings, ctx.credentials);
        const plans = identified
            .filter(item => item.adapter)
            .map(item => ({ provider: item.provider, ...(item.region === undefined ? {} : { region: item.region }) }));
        const queried = await collectSubscriptions(keys, plans);
        const rows = [...queried].map(row => {
            // plan 双口径（引用 dsh-spend）：订阅通道标 code 并带月费，其余 token。
            const planType = planTypeOf(row.provider);
            const subscriptionAmount = subscriptionCnyOf(row.provider);
            return {
                ...row,
                planType,
                ...(planType === 'code' && subscriptionAmount > 0 ? { subscriptionAmount } : {}),
            };
        });
        for (const item of identified) {
            if (!item.adapter)
                rows.push({ provider: item.provider, displayName: item.displayName, status: 'ok', windows: [], planType: planTypeOf(item.provider) });
        }
        quotaCache = { at: Date.now(), quotas: rows };
    };
    ctx.effect(() => ctx.webServer.register({
        kind: 'exact',
        path: '/api/billing/subscriptions',
        handler: async (_req, res) => {
            res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
            if (Date.now() - quotaCache.at >= SUBSCRIPTION_CACHE_MS)
                await refreshQuotas();
            res.end(JSON.stringify({ quotas: quotaCache.quotas }));
        },
    }), 'usage-billing: subscriptions route');
    ctx.effect(() => ctx.webServer.register({
        kind: 'exact',
        path: '/api/billing/usage-stats',
        handler: async (_req, res) => {
            res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
            try {
                const stats = await aggregator.aggregate();
                // 宿主配置（月度预算 / 余额告警阈值）不是聚合产物：在响应边界
                // 注入，两条路径一致。
                const injected = {
                    ...(config.monthlyBudget === undefined ? {} : { budget: config.monthlyBudget }),
                    ...(config.lowBalanceThreshold === undefined ? {} : { lowBalanceThreshold: config.lowBalanceThreshold }),
                };
                const payload = Object.keys(injected).length === 0 ? stats : { ...stats, ...injected };
                // 快照落盘（节流 30 秒）：聚合失败路径的回退文件因此始终保持新鲜。
                persistSnapshot(payload);
                res.end(JSON.stringify(payload));
                return;
            }
            catch (error) {
                // Persistence read failed; fall through to the JSON-file candidates.
                // 记录异常尾部（含已折叠会话数），避免「只能靠猜」——聚合失败时用户
                // 至少能从日志看到原因（单会话损坏已在 aggregate 内跳过并告警）。
                console.error('[usage-billing] usage-stats aggregate failed, falling back to snapshot:', error);
            }
            for (const candidate of candidates) {
                try {
                    const text = await readFile(candidate, 'utf8');
                    // Accept only parseable JSON so a stale or partial file never
                    // reaches the dashboard as if it were real.
                    const doc = JSON.parse(text);
                    if (config.monthlyBudget !== undefined)
                        doc['budget'] = config.monthlyBudget;
                    if (config.lowBalanceThreshold !== undefined)
                        doc['lowBalanceThreshold'] = config.lowBalanceThreshold;
                    res.end(JSON.stringify(doc));
                    return;
                }
                catch {
                    // Try the next candidate location.
                }
            }
            res.end(JSON.stringify({ error: 'usage stats unavailable' }));
        },
    }), 'usage-billing: usage-stats route');
}
//# sourceMappingURL=index.js.map