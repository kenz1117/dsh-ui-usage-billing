/**
 * One-shot live pricing refresh for the billing dashboard.
 *
 * Fetches the USD → CNY mid rate and the OpenRouter model price list, maps
 * matched models onto the built-in catalog keys, and returns the combined
 * LivePricing. Every fetch failure degrades to the built-in values: the node
 * half caches whatever succeeded and the browser dashboard falls back to the
 * catalog for the rest — a total outage answers `{ source: 'builtin' }`.
 */
/** Abort a fetch when the upstream hangs beyond this budget. */
const FETCH_TIMEOUT_MS = 8000;
/**
 * USD → CNY 汇率源，按顺序尝试：国内可达的腾讯财经行情（免 key、`~` 分隔
 * 第 4 个字段为价格）优先，国外 open.er-api.com 兜底。任一源失败自动落到
 * 下一个；全部失败由调用方降级内置汇率。
 */
const RATE_SOURCES = [
    {
        url: 'https://qt.gtimg.cn/q=whUSDCNY',
        parse: (text) => {
            const match = /"([^"]*)"/.exec(text);
            const price = match?.[1]?.split('~')[3];
            return price !== undefined && price !== '' ? Number(price) : undefined;
        },
    },
    {
        url: 'https://open.er-api.com/v6/latest/USD',
        parse: (text) => {
            try {
                const data = JSON.parse(text);
                const cny = data.rates?.CNY;
                return typeof cny === 'number' && Number.isFinite(cny) && cny > 0 ? cny : undefined;
            }
            catch {
                return undefined;
            }
        },
    },
];
/** OpenRouter's public model list: per-token USD prices, no key needed. */
const ROUTER_URL = 'https://openrouter.ai/api/v1/models';
/**
 * Built-in catalog key → OpenRouter model-id candidates. Matching prefers an
 * exact id, then a single strong substring hit (the router id contains the
 * hint); an ambiguous hit is skipped so the built-in price stays
 * authoritative. Hints are provider+generation words the router ids carry —
 * correct or extend them as the market moves.
 */
const ROUTER_ID_HINTS = {
    'flash': ['deepseek-v4-flash', 'deepseek-v4'],
    'pro': ['deepseek-v4-pro'],
    'glm': ['glm-5'],
    'qwen-3.8-max': ['qwen-3.8-max', 'qwen3.8-max'],
    'qwen-max': ['qwen-max'],
    'qwen-plus': ['qwen-plus'],
    'gemini-pro': ['gemini-3-pro', 'gemini-pro'],
    'gemini-flash': ['gemini-3-flash', 'gemini-flash'],
    'gpt-5.6-sol': ['gpt-5.6-sol'],
    'gpt-5.6-terra': ['gpt-5.6-terra'],
    'gpt-5.6-luna': ['gpt-5.6-luna'],
    'grok': ['grok-4'],
    'llama': ['llama-4'],
    'kimi': ['kimi-k2'],
};
/** GET a URL's text body with a hard timeout; null on any failure. */
async function fetchText(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok)
            return null;
        return await response.text();
    }
    catch {
        return null;
    }
    finally {
        clearTimeout(timer);
    }
}
/** GET a JSON endpoint with a hard timeout; null on any failure. */
async function fetchJson(url) {
    const text = await fetchText(url);
    if (text === null)
        return null;
    try {
        return JSON.parse(text);
    }
    catch {
        return null;
    }
}
/** Latest USD → CNY rate from the first working source, or undefined when none respond. */
async function fetchRate() {
    for (const source of RATE_SOURCES) {
        const text = await fetchText(source.url);
        if (text === null)
            continue;
        const value = source.parse(text);
        if (value !== undefined && Number.isFinite(value) && value > 0)
            return value;
    }
    return undefined;
}
/** OpenRouter model rows with usable USD unit prices, or undefined on failure. */
async function fetchRouterModels() {
    const data = await fetchJson(ROUTER_URL);
    if (data === null || typeof data !== 'object')
        return undefined;
    const list = data.data;
    if (!Array.isArray(list))
        return undefined;
    const models = [];
    for (const item of list) {
        if (item === null || typeof item !== 'object')
            continue;
        const { id, pricing } = item;
        if (typeof id !== 'string' || pricing === null || typeof pricing !== 'object')
            continue;
        const { prompt, completion } = pricing;
        if (typeof prompt !== 'number' || typeof completion !== 'number')
            continue;
        if (!Number.isFinite(prompt) || !Number.isFinite(completion))
            continue;
        models.push({ id, input: prompt * 1_000_000, output: completion * 1_000_000 });
    }
    return models;
}
/** Match one catalog key's candidates: exact id first, then a single strong substring hit. */
function matchRouterModel(hints, models) {
    const exact = models.find(model => hints.some(hint => model.id === hint));
    if (exact !== undefined)
        return exact;
    // 强子串：hint 足够具体（≥8 字符）且唯一命中，避免同前缀模型误配。
    const strong = models.filter(model => hints.some(hint => hint.length >= 8 && model.id.includes(hint)));
    if (strong.length !== 1)
        return undefined;
    return strong[0];
}
/** Map router matches onto catalog keys; undefined when nothing matched. */
function buildPrices(models) {
    const result = {};
    for (const [key, hints] of Object.entries(ROUTER_ID_HINTS)) {
        const hit = matchRouterModel(hints, models);
        if (hit === undefined)
            continue;
        result[key] = { input: hit.input, cacheHit: hit.input * 0.1, output: hit.output };
    }
    return Object.keys(result).length > 0 ? result : undefined;
}
/**
 * Fetch the live pricing once at boot. Both upstreams run in parallel; a
 * failure in either degrades independently to the built-in value.
 * @returns the live pricing snapshot (builtin when everything failed).
 */
export async function fetchLivePricing() {
    const [rate, models] = await Promise.all([fetchRate(), fetchRouterModels()]);
    const prices = models === undefined ? undefined : buildPrices(models);
    if (rate === undefined && prices === undefined)
        return { source: 'builtin' };
    return {
        source: 'live',
        ...(rate !== undefined ? { rate } : {}),
        ...(prices !== undefined ? { prices } : {}),
    };
}
//# sourceMappingURL=pricing-fetch.js.map