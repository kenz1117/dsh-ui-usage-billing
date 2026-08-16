import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
/** 当前汇率：实时覆盖优先，缺省回退内置固定值。 */
function currentRate() {
	return 6.79;
}
/** Default share of traffic assumed to fall in the peak band (0..1). */
const DEFAULT_PEAK_SHARE = .5;
/**
* Model keys served through a subscription plan (e.g. a coding plan or topic
* plan) instead of metered per-token API billing. Usage through these routes
* costs no tokens: the estimator treats them as ¥0 and the billing table
* labels them 订阅包含. Add any model key your deployment serves through a
* plan here; leave empty when every route is pay-as-you-go.
*/
const SUBSCRIPTION_PLAN_KEYS = [];
/** Whether one stats model key is billed through a subscription plan. */
function isSubscriptionPlan(key) {
	return SUBSCRIPTION_PLAN_KEYS.includes(key);
}
/**
* Built-in catalog of current mainstream models as of 2026-08-16, priced from
* each provider's official price page. Domestic providers are OpenAI-API
* compatible and publish RMB prices directly; overseas providers publish USD
* and convert through the exchange rate at estimate time. Retired models
* (GPT-4o family, Gemini 2.x, GLM-4.x-lite, older Qwen) are deliberately
* absent, as are Anthropic Claude models (their native API is not
* OpenAI-compatible, so the harness cannot drive them directly). DeepSeek
* keys match the harness stats file so real usage prices from the catalog;
* unknown keys fall back to `other`.
*
* Time-of-day billing (peak/off-peak) is now real: DeepSeek V4 officially
* splits peak (09:00-12:00 / 14:00-18:00 Beijing) at 2x the off-peak rate
* from 2026-08-17, and Gemini's Flex tier discounts spare-capacity traffic.
*/
const MODEL_CATALOG = [
	{
		key: "flash",
		name: "DeepSeek V4 Flash",
		provider: "DeepSeek",
		colorVar: "dsw-static-blue-500",
		price: {
			currency: "CNY",
			input: 3,
			cacheHit: .1,
			output: 9,
			offPeak: {
				input: 1.5,
				cacheHit: .05,
				output: 4.5
			}
		},
		peakHours: "09:00-12:00 / 14:00-18:00"
	},
	{
		key: "pro",
		name: "DeepSeek V4 Pro",
		provider: "DeepSeek",
		colorVar: "dsw-static-deepseek-500",
		price: {
			currency: "CNY",
			input: 9,
			cacheHit: .3,
			output: 27,
			offPeak: {
				input: 4.5,
				cacheHit: .15,
				output: 13.5
			}
		},
		peakHours: "09:00-12:00 / 14:00-18:00"
	},
	{
		key: "glm",
		name: "GLM-5.2",
		provider: "智谱 AI",
		colorVar: "dsw-static-blue-600",
		price: {
			currency: "CNY",
			input: 8,
			cacheHit: 2,
			output: 28
		}
	},
	{
		key: "glm-5.3",
		name: "GLM-5.3",
		provider: "智谱 AI",
		colorVar: "dsw-static-blue-500",
		price: {
			currency: "CNY",
			input: 8,
			cacheHit: 2,
			output: 28
		}
	},
	{
		key: "glm-4.6",
		name: "GLM-4.6",
		provider: "智谱 AI",
		colorVar: "dsw-static-blue-400",
		price: {
			currency: "CNY",
			input: 4,
			cacheHit: .8,
			output: 16
		}
	},
	{
		key: "qwen-3.8-max",
		name: "Qwen3.8 Max",
		provider: "阿里通义",
		colorVar: "dsw-static-blue-600",
		price: {
			currency: "CNY",
			input: 13.58,
			cacheHit: 1.36,
			output: 40.74
		}
	},
	{
		key: "qwen-max",
		name: "Qwen3.7-Max",
		provider: "阿里通义",
		colorVar: "dsw-static-blue-300",
		price: {
			currency: "CNY",
			input: 6,
			cacheHit: .6,
			output: 18
		}
	},
	{
		key: "qwen-plus",
		name: "Qwen3.5-Plus",
		provider: "阿里通义",
		colorVar: "dsw-static-blue-500",
		price: {
			currency: "CNY",
			input: .8,
			cacheHit: .08,
			output: 4.8
		}
	},
	{
		key: "qwen-flash",
		name: "Qwen3.5-Flash",
		provider: "阿里通义",
		colorVar: "dsw-static-blue-400",
		price: {
			currency: "CNY",
			input: .2,
			cacheHit: .02,
			output: 2
		}
	},
	{
		key: "doubao",
		name: "Doubao Seed-2.0 Pro",
		provider: "字节豆包",
		colorVar: "dsw-static-red-500",
		price: {
			currency: "CNY",
			input: 3.2,
			cacheHit: .64,
			output: 16
		}
	},
	{
		key: "doubao-mini",
		name: "Doubao Seed-2.0 Mini",
		provider: "字节豆包",
		colorVar: "dsw-static-red-300",
		price: {
			currency: "CNY",
			input: .2,
			cacheHit: .02,
			output: 2
		}
	},
	{
		key: "doubao-1.6",
		name: "Doubao Seed-1.6",
		provider: "字节豆包",
		colorVar: "dsw-static-red-400",
		price: {
			currency: "CNY",
			input: .8,
			cacheHit: 0,
			output: 8
		}
	},
	{
		key: "kimi",
		name: "Kimi K2.7 Code",
		provider: "月之暗面",
		colorVar: "dsw-static-neutral-bluish-700",
		price: {
			currency: "CNY",
			input: 6.5,
			cacheHit: 1.3,
			output: 27
		}
	},
	{
		key: "kimi-k2.7-hs",
		name: "Kimi K2.7 Code HighSpeed",
		provider: "月之暗面",
		colorVar: "dsw-static-neutral-bluish-600",
		price: {
			currency: "CNY",
			input: 13,
			cacheHit: 2.6,
			output: 54
		}
	},
	{
		key: "kimi-k2.6",
		name: "Kimi K2.6",
		provider: "月之暗面",
		colorVar: "dsw-static-neutral-bluish-500",
		price: {
			currency: "CNY",
			input: 6.5,
			cacheHit: 1.1,
			output: 27
		}
	},
	{
		key: "kimi-k3",
		name: "Kimi K3",
		provider: "月之暗面",
		colorVar: "dsw-static-neutral-bluish-500",
		price: {
			currency: "CNY",
			input: 20,
			cacheHit: 2,
			output: 100
		}
	},
	{
		key: "minimax",
		name: "MiniMax-M3",
		provider: "MiniMax",
		colorVar: "dsw-static-amber-500",
		price: {
			currency: "CNY",
			input: 2.1,
			cacheHit: .42,
			output: 8.4
		}
	},
	{
		key: "ernie",
		name: "ERNIE-5.1",
		provider: "百度文心",
		colorVar: "dsw-static-blue-300",
		price: {
			currency: "CNY",
			input: 4,
			cacheHit: .4,
			output: 18
		}
	},
	{
		key: "hunyuan",
		name: "混元 Hy3",
		provider: "腾讯混元",
		colorVar: "dsw-static-amber-400",
		price: {
			currency: "CNY",
			input: 1,
			cacheHit: .25,
			output: 4
		}
	},
	{
		key: "hunyuan-t1",
		name: "混元 T1",
		provider: "腾讯混元",
		colorVar: "dsw-static-amber-300",
		price: {
			currency: "CNY",
			input: 1,
			cacheHit: .1,
			output: 4
		}
	},
	{
		key: "yi",
		name: "Yi-Lightning",
		provider: "零一万物",
		colorVar: "dsw-static-green-500",
		price: {
			currency: "CNY",
			input: .99,
			cacheHit: .1,
			output: .99
		}
	},
	{
		key: "step",
		name: "Step 3.7 Flash",
		provider: "阶跃星辰",
		colorVar: "dsw-static-neutral-bluish-400",
		price: {
			currency: "CNY",
			input: 1.35,
			cacheHit: .27,
			output: 8.1
		}
	},
	{
		key: "spark",
		name: "Spark 4.0 Ultra",
		provider: "科大讯飞",
		colorVar: "dsw-static-green-400",
		price: {
			currency: "CNY",
			input: 5,
			cacheHit: .5,
			output: 10
		}
	},
	{
		key: "sensenova",
		name: "SenseNova 6.5",
		provider: "商汤",
		colorVar: "dsw-static-red-400",
		price: {
			currency: "CNY",
			input: 4.5,
			cacheHit: .45,
			output: 9
		}
	},
	{
		key: "baichuan",
		name: "Baichuan M3-Plus",
		provider: "百川智能",
		colorVar: "dsw-static-neutral-bluish-500",
		price: {
			currency: "CNY",
			input: 5,
			cacheHit: .5,
			output: 9
		}
	},
	{
		key: "gpt-5.6-sol",
		name: "GPT-5.6 Sol",
		provider: "OpenAI",
		colorVar: "dsw-static-green-500",
		price: {
			currency: "USD",
			input: 5,
			cacheHit: .5,
			output: 30
		}
	},
	{
		key: "gpt-5.6-terra",
		name: "GPT-5.6 Terra",
		provider: "OpenAI",
		colorVar: "dsw-static-green-400",
		price: {
			currency: "USD",
			input: 2,
			cacheHit: .2,
			output: 12
		}
	},
	{
		key: "gpt-5.6-luna",
		name: "GPT-5.6 Luna",
		provider: "OpenAI",
		colorVar: "dsw-static-green-500",
		price: {
			currency: "USD",
			input: .2,
			cacheHit: .02,
			output: 1.2
		}
	},
	{
		key: "gemini-pro",
		name: "Gemini 3.1 Pro",
		provider: "Google",
		colorVar: "dsw-static-blue-600",
		price: {
			currency: "USD",
			input: 2,
			cacheHit: .2,
			output: 12,
			offPeak: {
				input: 1,
				cacheHit: .1,
				output: 6
			}
		},
		peakHours: "Standard / Flex"
	},
	{
		key: "gemini-flash",
		name: "Gemini 3.6 Flash",
		provider: "Google",
		colorVar: "dsw-static-blue-400",
		price: {
			currency: "USD",
			input: 1.5,
			cacheHit: .15,
			output: 7.5,
			offPeak: {
				input: .75,
				cacheHit: .075,
				output: 3.75
			}
		},
		peakHours: "Standard / Flex"
	},
	{
		key: "grok",
		name: "Grok 4.6",
		provider: "xAI",
		colorVar: "dsw-static-neutral-bluish-700",
		price: {
			currency: "USD",
			input: 2,
			cacheHit: .5,
			output: 6
		}
	},
	{
		key: "grok-4.3",
		name: "Grok 4.3",
		provider: "xAI",
		colorVar: "dsw-static-neutral-bluish-500",
		price: {
			currency: "USD",
			input: 1.25,
			cacheHit: .2,
			output: 2.5
		}
	},
	{
		key: "llama",
		name: "Llama 4 Maverick",
		provider: "Meta",
		colorVar: "dsw-static-red-500",
		price: {
			currency: "USD",
			input: .2,
			cacheHit: .05,
			output: .6
		}
	},
	{
		key: "llama-scout",
		name: "Llama 4 Scout",
		provider: "Meta",
		colorVar: "dsw-static-red-400",
		price: {
			currency: "USD",
			input: .1,
			cacheHit: .025,
			output: .3
		}
	},
	{
		key: "other",
		name: "其他模型",
		provider: "Custom",
		colorVar: "dsw-static-neutral-bluish-500",
		price: {
			currency: "CNY",
			input: .5,
			cacheHit: .25,
			cacheMiss: .5,
			output: 1.5
		}
	}
];
/** Lookup a model by its stats key; falls back to the generic `other` entry. */
function modelOf(key) {
	return MODEL_CATALOG.find((entry) => entry.key === key) ?? (() => {
		const fallback = MODEL_CATALOG.at(-1);
		if (fallback !== void 0) return fallback;
		throw new Error("MODEL_CATALOG must not be empty");
	})();
}
/**
* Price one band's token usage in CNY. The stats `input` field is the TOTAL
* prompt tokens (cacheHit + cacheMiss), so billing splits it: the cache-hit
* share prices at the hit rate and the remaining share at the miss rate.
* Providers that report only disjoint buckets carry `cacheMiss` explicitly;
* otherwise the miss share is derived as `input - cacheHit`. Only USD-priced
* bands go through the exchange rate.
*/
function priceBandCost(band, buckets, currency) {
	const miss = buckets.cacheMiss > 0 ? buckets.cacheMiss : Math.max(0, buckets.input - buckets.cacheHit);
	const hit = Math.min(buckets.cacheHit, buckets.input);
	const raw = (miss * (band.cacheMiss ?? band.input) + hit * band.cacheHit + buckets.output * band.output) / 1e6;
	return currency === "USD" ? raw * currentRate() : raw;
}
/**
* Estimate the CNY cost of one model's token usage, mixing the peak and
* off-peak bands by the given peak share (flat-priced models cost the same in
* both bands).
* @param entry - the catalog entry whose prices apply.
* @param buckets - token usage counts.
* @param peakShare - share of traffic in the peak band (0..1); defaults to {@link DEFAULT_PEAK_SHARE}.
* @returns the estimated cost in CNY.
*/
function computeCost(entry, buckets, peakShare = DEFAULT_PEAK_SHARE) {
	if (isSubscriptionPlan(entry.key)) return 0;
	const peak = priceBandCost(entry.price, buckets, entry.price.currency);
	const off = entry.price.offPeak === void 0 ? peak : priceBandCost(entry.price.offPeak, buckets, entry.price.currency);
	return peak * peakShare + off * (1 - peakShare);
}
//#endregion
//#region lib/types/aggregate.js
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
/**
* Real provider model ids map to their billing-catalog keys. Unknown ids stay
* as-is and price zero (they are not in the catalog; subscription-plan routes
* like kimi-coding / token plans fall here and therefore cost nothing).
*/
const MODEL_KEY_ALIASES = {
	"deepseek-v4-flash": "flash",
	"deepseek-v4-pro": "pro",
	"glm-5.2": "glm",
	"qwen3.8-max": "qwen-3.8-max",
	"qwen3.7-max": "qwen-max",
	"qwen-max": "qwen-max",
	"hunyuan-t1": "hunyuan-t1",
	"step-3.7-flash": "step",
	"seed-2.0-mini": "doubao-mini"
};
/**
* 走订阅套餐（coding / token / agent plan）的 provider id：这些通道的调用
* 按套餐计费，不再按 token 计费，因此即使模型 id 与计费表撞名也一律豁免。
* 部署可在 plugin config 的 `subscriptionProviders` 中覆盖。
*/
const DEFAULT_SUBSCRIPTION_PROVIDERS = ["kimi-coding", "xiaomi-token-plan-cn"];
/** Zeroed usage accumulator. */
function emptyUsage() {
	return {
		calls: 0,
		input: 0,
		output: 0,
		cacheHit: 0,
		cacheMiss: 0,
		cost: 0
	};
}
/**
* Fold one token usage event into an accumulator and re-price its cost.
* The stats `input` is the TOTAL prompt tokens (cacheHit + cacheMiss), so the
* miss bucket is uncached input plus cache writes.
* @param acc - the accumulator to mutate.
* @param usage - the provider-reported usage of one call.
* @param key - the billing-catalog key this call belongs to.
* @param subscription - whether the call went through a subscription plan; such calls never cost money.
*/
function foldUsage(acc, usage, key, subscription) {
	const cacheHit = usage.cacheReadTokens ?? 0;
	const cacheMiss = usage.inputTokens + (usage.cacheWriteTokens ?? 0);
	acc.calls += 1;
	acc.input += usage.inputTokens + cacheHit + (usage.cacheWriteTokens ?? 0);
	acc.output += usage.outputTokens;
	acc.cacheHit += cacheHit;
	acc.cacheMiss += cacheMiss;
	acc.cost = !subscription && MODEL_CATALOG.some((entry) => entry.key === key) ? computeCost(modelOf(key), {
		input: acc.input,
		cacheHit: acc.cacheHit,
		cacheMiss: acc.cacheMiss,
		output: acc.output
	}) : 0;
}
/** Local-time date stamp (the host runs in the user's timezone). */
function dayStamp(time) {
	const date = new Date(time);
	const pad = (n) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
/** Get-or-create one model cell inside a usage map (avoids non-null assertions). */
function usageCell(map, key) {
	const existing = map.get(key);
	if (existing !== void 0) return existing;
	const fresh = emptyUsage();
	map.set(key, fresh);
	return fresh;
}
/** Get-or-create one day's model cell inside the two-dimensional map. */
function modelDayCell(map, day, modelKey) {
	let models = map.get(day);
	if (models === void 0) {
		models = /* @__PURE__ */ new Map();
		map.set(day, models);
	}
	return usageCell(models, modelKey);
}
/**
* Aggregate real usage from every persisted session log.
* @param persistence - the session persistence service.
* @param options - aggregation tuning (e.g. subscription-plan providers).
* @returns the usage-stats document (same shape the dashboard expects).
*/
async function aggregateUsage(persistence, options = {}) {
	const subscriptionProviders = new Set(options.subscriptionProviders ?? DEFAULT_SUBSCRIPTION_PROVIDERS);
	const total = emptyUsage();
	const byModel = /* @__PURE__ */ new Map();
	const byDay = /* @__PURE__ */ new Map();
	const byModelDay = /* @__PURE__ */ new Map();
	for (const meta of await persistence.list()) {
		const { events } = await persistence.readFrom(meta.id, 0);
		let key = "other";
		let subscription = false;
		for (const event of events) {
			if (event.type === "request/header") {
				const { model, provider } = event.data.header.config;
				key = MODEL_KEY_ALIASES[model] ?? model;
				subscription = subscriptionProviders.has(provider);
				continue;
			}
			if (event.type !== "assistant/message" || event.data.usage === void 0) continue;
			const modelKey = key;
			const day = dayStamp(event.time);
			foldUsage(total, event.data.usage, modelKey, subscription);
			foldUsage(usageCell(byModel, modelKey), event.data.usage, modelKey, subscription);
			foldUsage(usageCell(byDay, day), event.data.usage, modelKey, subscription);
			foldUsage(modelDayCell(byModelDay, day, modelKey), event.data.usage, modelKey, subscription);
		}
	}
	const toRecord = (map) => Object.fromEntries(map);
	const toModelDayRecord = (map) => Object.fromEntries([...map].map(([day, models]) => [day, Object.fromEntries(models)]));
	return {
		version: 2,
		updatedAt: Date.now(),
		source: "session-logs",
		total,
		byModel: toRecord(byModel),
		byDay: toRecord(byDay),
		byDayModels: toModelDayRecord(byModelDay)
	};
}
//#endregion
//#region lib/types/pricing-fetch.js
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
const FETCH_TIMEOUT_MS = 8e3;
/**
* USD → CNY 汇率源，按顺序尝试：国内可达的腾讯财经行情（免 key、`~` 分隔
* 第 4 个字段为价格）优先，国外 open.er-api.com 兜底。任一源失败自动落到
* 下一个；全部失败由调用方降级内置汇率。
*/
const RATE_SOURCES = [{
	url: "https://qt.gtimg.cn/q=whUSDCNY",
	parse: (text) => {
		const price = /"([^"]*)"/.exec(text)?.[1]?.split("~")[3];
		return price !== void 0 && price !== "" ? Number(price) : void 0;
	}
}, {
	url: "https://open.er-api.com/v6/latest/USD",
	parse: (text) => {
		try {
			const cny = JSON.parse(text).rates?.CNY;
			return typeof cny === "number" && Number.isFinite(cny) && cny > 0 ? cny : void 0;
		} catch {
			return;
		}
	}
}];
/** OpenRouter's public model list: per-token USD prices, no key needed. */
const ROUTER_URL = "https://openrouter.ai/api/v1/models";
/**
* Built-in catalog key → OpenRouter model-id candidates. Matching prefers an
* exact id, then a single strong substring hit (the router id contains the
* hint); an ambiguous hit is skipped so the built-in price stays
* authoritative. Hints are provider+generation words the router ids carry —
* correct or extend them as the market moves.
*/
const ROUTER_ID_HINTS = {
	"flash": ["deepseek-v4-flash", "deepseek-v4"],
	"pro": ["deepseek-v4-pro"],
	"glm": ["glm-5"],
	"qwen-3.8-max": ["qwen-3.8-max", "qwen3.8-max"],
	"qwen-max": ["qwen-max"],
	"qwen-plus": ["qwen-plus"],
	"gemini-pro": ["gemini-3-pro", "gemini-pro"],
	"gemini-flash": ["gemini-3-flash", "gemini-flash"],
	"gpt-5.6-sol": ["gpt-5.6-sol"],
	"gpt-5.6-terra": ["gpt-5.6-terra"],
	"gpt-5.6-luna": ["gpt-5.6-luna"],
	"grok": ["grok-4"],
	"llama": ["llama-4"],
	"kimi": ["kimi-k2"]
};
/** GET a URL's text body with a hard timeout; null on any failure. */
async function fetchText(url) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const response = await fetch(url, { signal: controller.signal });
		if (!response.ok) return null;
		return await response.text();
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}
/** GET a JSON endpoint with a hard timeout; null on any failure. */
async function fetchJson(url) {
	const text = await fetchText(url);
	if (text === null) return null;
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}
/** Latest USD → CNY rate from the first working source, or undefined when none respond. */
async function fetchRate() {
	for (const source of RATE_SOURCES) {
		const text = await fetchText(source.url);
		if (text === null) continue;
		const value = source.parse(text);
		if (value !== void 0 && Number.isFinite(value) && value > 0) return value;
	}
}
/** OpenRouter model rows with usable USD unit prices, or undefined on failure. */
async function fetchRouterModels() {
	const data = await fetchJson(ROUTER_URL);
	if (data === null || typeof data !== "object") return void 0;
	const list = data.data;
	if (!Array.isArray(list)) return void 0;
	const models = [];
	for (const item of list) {
		if (item === null || typeof item !== "object") continue;
		const { id, pricing } = item;
		if (typeof id !== "string" || pricing === null || typeof pricing !== "object") continue;
		const { prompt, completion } = pricing;
		if (typeof prompt !== "number" || typeof completion !== "number") continue;
		if (!Number.isFinite(prompt) || !Number.isFinite(completion)) continue;
		models.push({
			id,
			input: prompt * 1e6,
			output: completion * 1e6
		});
	}
	return models;
}
/** Match one catalog key's candidates: exact id first, then a single strong substring hit. */
function matchRouterModel(hints, models) {
	const exact = models.find((model) => hints.some((hint) => model.id === hint));
	if (exact !== void 0) return exact;
	const strong = models.filter((model) => hints.some((hint) => hint.length >= 8 && model.id.includes(hint)));
	if (strong.length !== 1) return void 0;
	return strong[0];
}
/** Map router matches onto catalog keys; undefined when nothing matched. */
function buildPrices(models) {
	const result = {};
	for (const [key, hints] of Object.entries(ROUTER_ID_HINTS)) {
		const hit = matchRouterModel(hints, models);
		if (hit === void 0) continue;
		result[key] = {
			input: hit.input,
			cacheHit: hit.input * .1,
			output: hit.output
		};
	}
	return Object.keys(result).length > 0 ? result : void 0;
}
/**
* Fetch the live pricing once at boot. Both upstreams run in parallel; a
* failure in either degrades independently to the built-in value.
* @returns the live pricing snapshot (builtin when everything failed).
*/
async function fetchLivePricing() {
	const [rate, models] = await Promise.all([fetchRate(), fetchRouterModels()]);
	const prices = models === void 0 ? void 0 : buildPrices(models);
	if (rate === void 0 && prices === void 0) return { source: "builtin" };
	return {
		source: "live",
		...rate !== void 0 ? { rate } : {},
		...prices !== void 0 ? { prices } : {}
	};
}
//#endregion
//#region lib/types/index.js
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
/** Required services: the web server and the persisted session log store. */
const inject = ["webServer", "sessionPersistence"];
/**
* Host plugin body: serve real aggregated usage to the browser dashboard.
* @param ctx - host context carrying webServer and sessionPersistence.
* @param config - optional statsPath override.
*/
function apply(ctx, config = {}) {
	const cwd = process.cwd();
	const candidates = [
		config.statsPath,
		process.env.DSH_USAGE_STATS,
		join(cwd, ".dsh-usage-stats.json"),
		join(homedir(), ".dsh/.dsh-usage-stats.json")
	].filter((path) => typeof path === "string" && path.length > 0);
	let live = { source: "builtin" };
	fetchLivePricing().then((result) => {
		live = result;
	});
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/api/billing/pricing",
		handler: async (_req, res) => {
			res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
			res.end(JSON.stringify(live));
		}
	}), "usage-billing: pricing route");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/api/billing/usage-stats",
		handler: async (_req, res) => {
			res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
			try {
				res.end(JSON.stringify(await aggregateUsage(ctx.sessionPersistence, { ...config.subscriptionProviders === void 0 ? {} : { subscriptionProviders: config.subscriptionProviders } })));
				return;
			} catch {}
			for (const candidate of candidates) try {
				const text = await readFile(candidate, "utf8");
				JSON.parse(text);
				res.end(text);
				return;
			} catch {}
			res.end(JSON.stringify({ error: "usage stats unavailable" }));
		}
	}), "usage-billing: usage-stats route");
}
//#endregion
export { apply, inject };
