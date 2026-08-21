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
import { credentialRef } from '@deepseek-ai/dsh-credentials';
import { createUsageAggregator } from "./aggregate.js";
import { queryBalances } from "./balance.js";
import { fetchLivePricing } from "./pricing-fetch.js";
import { collectSubscriptions, EMPTY_SUBSCRIPTION_KEYS, identifySubscriptionPlans } from "./subscriptions.js";
/** 实时定价的后台刷新间隔（毫秒）：汇率/模型价低频变化，6 小时一次足够。 */
const PRICING_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;
/** 订阅套餐额度缓存时长（毫秒）：上游配额 API 低频变化，5 分钟足够。 */
const SUBSCRIPTION_CACHE_MS = 5 * 60 * 1000;
/** DeepSeek 余额查询的默认凭据引用（与 llm-deepseek 的默认引用一致）。 */
const DEFAULT_BALANCE_API_KEY_ENV = 'DEEPSEEK_API_KEY';
/** Required services: the web server, the persisted session log store, and user settings. */
export const inject = ['webServer', 'sessionPersistence', 'credentials', 'settings'];
/**
 * 订阅 provider id（llm-pi-ai 设置键）→ billing 适配器 key 的映射。
 * 复用 dsh 既有的 llm-pi-ai provider 配置（apiKeyEnv 引用），不引入新配置面。
 */
const SUBSCRIPTION_KEY_SOURCES = [
    { provider: 'kimi-coding', key: 'kimiApiKey' },
    { provider: 'zai-coding-cn', key: 'zaiApiKey' },
    { provider: 'opencode', key: 'opencodeApiKey' },
    { provider: 'opencode-go', key: 'opencodeApiKey' },
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
    const candidates = [
        config.statsPath,
        process.env.DSH_USAGE_STATS,
        join(cwd, '.dsh-usage-stats.json'),
        join(homedir(), '.dsh/.dsh-usage-stats.json'),
    ].filter((path) => typeof path === 'string' && path.length > 0);
    // 后台拉取实时定价（汇率 + OpenRouter 模型价），失败自动降级内置目录；
    // 之后每 6 小时刷新一次，汇率/价格无需重启进程就能保持最新。
    let live = { source: 'builtin' };
    const refreshPricing = async () => {
        live = await fetchLivePricing();
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
            res.end(JSON.stringify({ balances }));
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
        const rows = [...queried];
        for (const item of identified) {
            if (!item.adapter)
                rows.push({ provider: item.provider, displayName: item.displayName, status: 'ok', windows: [] });
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
                res.end(JSON.stringify(Object.keys(injected).length === 0 ? stats : { ...stats, ...injected }));
                return;
            }
            catch {
                // Persistence read failed; fall through to the JSON-file candidates.
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