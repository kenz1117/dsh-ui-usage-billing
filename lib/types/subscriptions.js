/**
 * Subscription-plan quota polling (node half): how much of each coding/token
 * plan is left. The billing dashboard already exempts subscription providers
 * from per-token cost; this module surfaces the REMAINING quota so the user
 * sees plan headroom instead of a blank row.
 *
 * The panel shows only the plans the user actually configured: adapters with
 * a known quota API (Kimi, Z.ai, OpenCode Go) query the remaining amount;
 * other subscription providers the harness recognizes (volcengine / baidu /
 * qwen / xiaomi token plans, agent plans…) are identified and listed with a
 * "no quota API" marker rather than hidden. API keys come from the `llm-pi-ai`
 * settings namespace (`apiKeyEnv` refs) resolved through the credentials seam.
 */
/** 空凭据：全部未配置时的初始值。 */
export const EMPTY_SUBSCRIPTION_KEYS = {
    kimiApiKey: '',
    zaiApiKey: '',
    opencodeApiKey: '',
    zaiRegion: 'global',
};
/** 订阅类 provider 的显示名（未命中的回退为 id 本身）。 */
const SUBSCRIPTION_DISPLAY_NAMES = {
    'kimi-coding': 'Kimi For Coding',
    'zai-coding-cn': 'Z.ai Coding Plan',
    'zai-coding': 'Z.ai Coding Plan',
    'opencode': 'OpenCode Plan',
    'opencode-go': 'OpenCode Go',
    'qwen-token-plan': '通义 Token Plan',
    'qwen-token-plan-cn': '通义 Token Plan（国内）',
    'xiaomi-token-plan-ams': '小米 Token Plan（海外）',
    'xiaomi-token-plan-cn': '小米 Token Plan（国内）',
    'xiaomi-token-plan-sgp': '小米 Token Plan（新加坡）',
    'volcengine-token-plan': '火山引擎 Token Plan',
    'ark-token-plan': '火山方舟 Token Plan',
    'doubao-token-plan': '豆包 Token Plan',
    'ernie': '百度文心 Plan',
    'baidu': '百度文心 Plan',
    'wenxin': '百度文心 Plan',
    'minimax': 'MiniMax Coding Plan',
};
/** 订阅类 provider id 判定：带 coding / agent-plan / token-plan 后缀，或已知订阅通道。 */
const SUBSCRIPTION_ID_RE = /(?:^|-)(?:coding|agent[-_]?plan|token[-_]?plan)(?:$|-|_)|^(?:opencode|opencode-go|kimi-coding|zai-coding|minimax)/i;
/** 是否是订阅类 provider id（如 kimi-coding、xiaomi-token-plan-cn）。 */
export function isSubscriptionProviderId(providerId) {
    if (SUBSCRIPTION_ID_RE.test(providerId))
        return true;
    return SUBSCRIPTION_DISPLAY_NAMES[providerId] !== undefined;
}
/** 适配器注册表：provider id → 收集器（displayName 同步映射）。 */
const SUBSCRIPTION_ADAPTERS = {
    'kimi-coding': { collect: collectKimi },
    'zai-coding-cn': { collect: collectZai },
    'opencode': { collect: collectOpenCodeGo },
    'opencode-go': { collect: collectOpenCodeGo },
};
/** 有额度适配器的 provider id 集合（识别用）。 */
const ADAPTER_PROVIDER_IDS = new Set(Object.keys(SUBSCRIPTION_ADAPTERS));
/**
 * 从 llm-pi-ai 设置里识别订阅套餐：带订阅类 id 且配置了 apiKeyEnv 的 provider。
 * @param providers - the `providers` map of the llm-pi-ai settings namespace.
 * @returns identified plans in configuration order.
 */
export function identifySubscriptionPlans(providers) {
    const out = [];
    for (const [id, config] of Object.entries(providers ?? {})) {
        if (typeof config?.apiKeyEnv !== 'string' || config.apiKeyEnv === '')
            continue;
        if (!isSubscriptionProviderId(id))
            continue;
        out.push({
            provider: id,
            displayName: SUBSCRIPTION_DISPLAY_NAMES[id] ?? id,
            adapter: ADAPTER_PROVIDER_IDS.has(id),
            ...(id === 'zai-coding-cn' ? { region: 'bigmodel-cn' } : {}),
        });
    }
    return out;
}
const DEFAULT_TIMEOUT_MS = 15_000;
/** Number, or null when the value is not a finite number (nor numeric string). */
function numberOrNull(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        if (Number.isFinite(parsed))
            return parsed;
    }
    return null;
}
/** Clamp a percentage to 0–100. */
function clampPercent(value) {
    return value === null ? null : Math.max(0, Math.min(100, value));
}
/** Round to one decimal. */
function round1(value) {
    return Math.round(value * 10) / 10;
}
/** Number → ISO string (seconds treated as epoch seconds, ms as epoch ms). */
function toIso(value) {
    if (value === null || value === undefined || value === '')
        return null;
    if (typeof value === 'number' && Number.isFinite(value)) {
        const date = new Date(value < 2_000_000_000_000 ? value * 1000 : value);
        return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
/** Map a fetch error to a stable status. */
function statusOf(error) {
    if (error instanceof Error) {
        if (error.name === 'TimeoutError' || error.name === 'AbortError')
            return 'unavailable';
        const status = error.httpStatus;
        if (status === 401 || status === 403)
            return 'unauthorized';
        if (status === 429)
            return 'rate-limited';
        if (status === 404)
            return 'unavailable';
    }
    return 'unavailable';
}
/** One JSON fetch with a timeout, mapping HTTP failures to typed errors. */
async function requestJson(url, init, timeoutMs) {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) {
        const error = new Error(`HTTP ${String(response.status)}`);
        error.httpStatus = response.status;
        throw error;
    }
    return await response.json();
}
// ── Kimi For Coding ──────────────────────────────────────────────────────────
/** Parse one Kimi limit window entry. */
function kimiWindow(value, kind) {
    if (value === null || typeof value !== 'object')
        return null;
    const record = value;
    const limit = numberOrNull(record.limit ?? record.total);
    const remaining = numberOrNull(record.remaining);
    if (limit === null || remaining === null || limit <= 0)
        return null;
    const usedPercent = round1(clampPercent(((limit - remaining) / limit) * 100) ?? 0);
    const resetsAt = toIso(record.resetTime ?? record.reset_time ?? record.resetsAt);
    return {
        kind,
        usedPercent,
        remainingPercent: round1(100 - usedPercent),
        remaining,
        ...(resetsAt === null ? {} : { resetsAt }),
    };
}
/** Parse a Kimi `/coding/v1/usages` body. */
function parseKimi(body) {
    const data = body?.data ?? body;
    const record = (data ?? {});
    const limits = Array.isArray(record.limits) ? record.limits : [];
    const session = limits.map(entry => kimiWindow(entry?.detail ?? entry, 'session')).find(hit => hit !== null) ?? null;
    const weekly = kimiWindow(record.usage, 'weekly');
    const plan = typeof record.plan === 'string' ? record.plan : typeof record.planName === 'string' ? record.planName : undefined;
    return {
        ...(plan !== undefined && plan !== '' ? { plan } : {}),
        windows: [session, weekly].filter((hit) => hit !== null),
    };
}
/** Collect the Kimi For Coding quota. */
async function collectKimi(keys, config, timeoutMs) {
    const apiKey = keys.kimiApiKey.trim();
    const base = config.baseUrl ?? 'https://api.kimi.com';
    if (apiKey === '') {
        return { provider: config.provider, displayName: 'Kimi For Coding', status: 'not-configured', windows: [] };
    }
    try {
        const body = await requestJson(`${base}/coding/v1/usages`, { headers: { authorization: `Bearer ${apiKey}`, accept: 'application/json' } }, timeoutMs);
        const parsed = parseKimi(body);
        return {
            provider: config.provider,
            displayName: 'Kimi For Coding',
            ...(parsed.plan !== undefined ? { plan: parsed.plan } : {}),
            status: parsed.windows.length > 0 ? 'ok' : 'invalid-response',
            windows: parsed.windows,
        };
    }
    catch (error) {
        return { provider: config.provider, displayName: 'Kimi For Coding', status: statusOf(error), windows: [] };
    }
}
// ── Z.ai Coding Plan ─────────────────────────────────────────────────────────
/** Window length in minutes for a Z.ai limit row; null when unknown. */
function zaiWindowMinutes(limit) {
    const unit = numberOrNull(limit.unit);
    const number = numberOrNull(limit.number);
    if (unit === null || number === null || number <= 0)
        return null;
    if (unit === 5)
        return number;
    if (unit === 3)
        return number * 60;
    if (unit === 1)
        return number * 24 * 60;
    if (unit === 6)
        return number * 7 * 24 * 60;
    return null;
}
/** Used percent for a Z.ai limit row. */
function zaiUsedPercent(limit) {
    const total = numberOrNull(limit.usage);
    const remaining = numberOrNull(limit.remaining);
    const current = numberOrNull(limit.currentValue ?? limit.current_value);
    if (total !== null && total > 0) {
        const used = remaining === null ? current : current === null ? total - remaining : Math.max(total - remaining, current);
        if (used !== null)
            return clampPercent((Math.max(0, Math.min(total, used)) / total) * 100);
    }
    return clampPercent(numberOrNull(limit.percentage ?? limit.usedPercent ?? limit.used_percent));
}
/** One Z.ai quota window row. */
function zaiWindow(limit, kind, fallbackReset = null) {
    const usedPercent = zaiUsedPercent(limit);
    if (usedPercent === null)
        return null;
    const resetsAt = toIso(limit.nextResetTime ?? limit.next_reset_time) ?? fallbackReset;
    return {
        kind,
        usedPercent: round1(usedPercent),
        remainingPercent: round1(100 - usedPercent),
        ...(resetsAt === null ? {} : { resetsAt }),
    };
}
/** Parse Z.ai quota + subscription bodies into windows. */
function parseZai(quotaBody, subscriptionBody) {
    const quota = (quotaBody ?? {});
    const limits = Array.isArray(quota.data?.limits)
        ? quota.data.limits
        : [];
    const tokenLimits = limits
        .filter(entry => {
        const record = entry;
        const type = String(record.type ?? record.limit_type ?? '').toUpperCase();
        return (type === 'TOKENS_LIMIT' || type === 'CREDIT_LIMIT') && zaiUsedPercent(record) !== null;
    })
        .sort((a, b) => (zaiWindowMinutes(a) ?? Number.MAX_SAFE_INTEGER) - (zaiWindowMinutes(b) ?? Number.MAX_SAFE_INTEGER));
    const timeLimit = limits.find(entry => {
        const record = entry;
        return String(record.type ?? record.limit_type ?? '').toUpperCase() === 'TIME_LIMIT' && zaiUsedPercent(record) !== null;
    });
    const first = tokenLimits[0];
    const session = tokenLimits.length >= 2 ? first
        : first !== undefined && zaiWindowMinutes(first) !== null && (zaiWindowMinutes(first) ?? 0) <= 360 ? first
            : undefined;
    const weekly = tokenLimits.length >= 2 ? tokenLimits[tokenLimits.length - 1] : session === undefined ? first : undefined;
    const subscriptionRow = subscriptionBody?.data;
    const renewAt = toIso(Array.isArray(subscriptionRow) ? subscriptionRow[0]?.next_renew_time ?? subscriptionRow[0]?.nextRenewTime : undefined);
    const row = Array.isArray(subscriptionRow) ? subscriptionRow[0] : undefined;
    let plan = 'GLM Coding Plan';
    for (const source of [row, quota.data]) {
        if (source === null || typeof source !== 'object')
            continue;
        const record = source;
        for (const key of ['product_name', 'productName', 'plan_name', 'planName', 'package_name', 'packageName', 'level']) {
            const value = record[key];
            if (typeof value === 'string' && value.trim() !== '') {
                plan = value.trim();
                break;
            }
        }
        if (plan !== 'GLM Coding Plan')
            break;
    }
    return {
        plan,
        windows: [
            session === undefined ? null : zaiWindow(session, 'session'),
            weekly === undefined ? null : zaiWindow(weekly, 'weekly'),
            timeLimit === undefined ? null : zaiWindow(timeLimit, 'billing', renewAt),
        ].filter((hit) => hit !== null),
    };
}
/** Collect the Z.ai Coding Plan quota. */
async function collectZai(keys, config, timeoutMs) {
    const apiKey = keys.zaiApiKey.trim();
    const region = config.region ?? keys.zaiRegion ?? 'global';
    const host = region === 'bigmodel-cn' ? 'https://open.bigmodel.cn' : 'https://api.z.ai';
    if (apiKey === '') {
        return { provider: config.provider, displayName: 'Z.ai Coding Plan', status: 'not-configured', windows: [] };
    }
    try {
        // The Coding Plan endpoints expect the RAW API key as the authorization header.
        const init = { headers: { authorization: apiKey, accept: 'application/json' } };
        const quota = await requestJson(`${host}/api/monitor/usage/quota/limit`, init, timeoutMs);
        let subscription = null;
        try {
            subscription = await requestJson(`${host}/api/biz/subscription/list`, init, timeoutMs);
        }
        catch {
            // Plan label/reset metadata is optional when quota succeeded.
        }
        const parsed = parseZai(quota, subscription);
        return {
            provider: config.provider,
            displayName: 'Z.ai Coding Plan',
            plan: parsed.plan,
            status: parsed.windows.length > 0 ? 'ok' : 'invalid-response',
            windows: parsed.windows,
        };
    }
    catch (error) {
        return { provider: config.provider, displayName: 'Z.ai Coding Plan', status: statusOf(error), windows: [] };
    }
}
// ── OpenCode Go ──────────────────────────────────────────────────────────────
/** Parse one OpenCode Go window object. */
function goWindow(value, kind) {
    if (value === null || typeof value !== 'object')
        return null;
    const record = value;
    const percentSource = record.usagePercent ?? record.usedPercent ?? record.percentUsed ?? record.percentage ?? record.percent;
    let usedPercent = clampPercent(numberOrNull(percentSource));
    if (usedPercent === null) {
        const used = numberOrNull(record.used ?? record.consumed);
        const limit = numberOrNull(record.limit ?? record.total ?? record.quota);
        if (used !== null && limit !== null && limit > 0)
            usedPercent = clampPercent((used / limit) * 100);
    }
    if (usedPercent === null)
        return null;
    // Bearer endpoint's `percent` is already 0..100; dashboard fields are 0..1.
    if (usedPercent <= 1 && usedPercent >= 0 && record.percent === undefined && percentSource !== undefined)
        usedPercent *= 100;
    const resetSeconds = numberOrNull(record.resetInSec ?? record.resetInSeconds ?? record.resetSeconds);
    const resetsAt = resetSeconds === null ? toIso(record.resetAt ?? record.resetsAt ?? record.nextReset) : new Date(Date.now() + Math.max(0, resetSeconds) * 1000).toISOString();
    return {
        kind,
        usedPercent: round1(clampPercent(usedPercent) ?? 0),
        remainingPercent: round1(100 - (clampPercent(usedPercent) ?? 0)),
        ...(resetsAt === null ? {} : { resetsAt }),
    };
}
/** Parse the OpenCode Go Bearer endpoint body. */
function parseOpenCodeGoApi(body) {
    const usage = body?.usage ?? body;
    if (usage === null || typeof usage !== 'object')
        return [];
    const record = usage;
    return [
        goWindow(record.rolling, 'session'),
        goWindow(record.weekly, 'weekly'),
        goWindow(record.monthly, 'monthly'),
    ].filter((hit) => hit !== null);
}
/** Collect the OpenCode Go quota. */
async function collectOpenCodeGo(keys, config, timeoutMs) {
    const apiKey = keys.opencodeApiKey.trim();
    const base = config.baseUrl ?? 'https://opencode.ai';
    if (apiKey === '') {
        return { provider: config.provider, displayName: 'OpenCode Go', status: 'not-configured', windows: [] };
    }
    try {
        const body = await requestJson(`${base}/zen/go/v1/usage`, { headers: { authorization: `Bearer ${apiKey}`, accept: 'application/json' } }, timeoutMs);
        const windows = parseOpenCodeGoApi(body);
        return { provider: config.provider, displayName: 'OpenCode Go', status: windows.length > 0 ? 'ok' : 'invalid-response', windows };
    }
    catch (error) {
        return { provider: config.provider, displayName: 'OpenCode Go', status: statusOf(error), windows: [] };
    }
}
/**
 * Collect quota for the given plans concurrently (adapter-backed plans only;
 * identified plans without an adapter are surfaced by the caller as "no
 * quota API" rows).
 * @param keys - the API keys from the llm-pi-ai settings namespace.
 * @param plans - adapter-backed plans to poll; empty by default.
 * @param timeoutMs - per-request timeout; defaults to 15s.
 * @returns the quotas in plan order (unknown providers degrade to `unavailable`).
 */
export async function collectSubscriptions(keys, plans = [], timeoutMs = DEFAULT_TIMEOUT_MS) {
    return await Promise.all(plans.map(plan => {
        const adapter = SUBSCRIPTION_ADAPTERS[plan.provider];
        if (adapter === undefined) {
            return Promise.resolve({ provider: plan.provider, displayName: plan.provider, status: 'unavailable', windows: [] });
        }
        return adapter.collect(keys, plan, timeoutMs);
    }));
}
//# sourceMappingURL=subscriptions.js.map