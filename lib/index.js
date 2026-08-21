import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { credentialRef } from "@deepseek-ai/dsh-credentials";
/** 当前汇率：实时覆盖优先，缺省回退内置固定值。 */
function currentRate() {
	return 6.79;
}
/** Default share of traffic assumed to fall in the peak band (0..1). */
const DEFAULT_PEAK_SHARE = .5;
/**
* 高峰时段判定（北京时间，UTC+8，无夏令时）：09:00–12:00、14:00–18:00。
* @param beijingHour - 北京时间的小时数（0–23）。
*/
function isPeakHour(beijingHour) {
	return beijingHour >= 9 && beijingHour < 12 || beijingHour >= 14 && beijingHour < 18;
}
/**
* 由时刻（epoch 毫秒）推断计费时段；时刻未知/非法时按高峰计（保守：未知
* 时刻不低估成本，与社区 dsh-usage-chart 的 tierAt 语义一致）。
* @param timeMs - Unix epoch 毫秒；null/undefined/NaN 视为未知。
*/
function tierAt(timeMs) {
	if (timeMs === null || timeMs === void 0 || !Number.isFinite(timeMs)) return "peak";
	return isPeakHour((new Date(timeMs).getUTCHours() + 8) % 24) ? "peak" : "offPeak";
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
		key: "flash-vision-exp",
		name: "DeepSeek V4 Flash Vision (Exp)",
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
		key: "mimo-v2.5",
		name: "MiMo V2.5",
		provider: "小米",
		colorVar: "dsw-static-green-400",
		price: {
			currency: "CNY",
			input: 4,
			cacheHit: .4,
			output: 12
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
/**
* 真实 provider model id → 计费目录键（`MODEL_CATALOG[].key`）的映射。未知 id
* 原样保留并落回 `other`（未知模型不估算费用）。聚合层（aggregate.ts）在折叠时
* 用同一张表把日志里的 model id 归并为目录键，客户端渲染（`modelOf`）也按它
* 解析，两侧共用一份映射，避免同一模型两侧不一致导致「未收录」。
*/
const MODEL_KEY_ALIASES = {
	"deepseek-v4-flash": "flash",
	"deepseek-v4-flash-vision-exp": "flash-vision-exp",
	"deepseek-v4-pro": "pro",
	"glm-5.2": "glm",
	"qwen3.8-max": "qwen-3.8-max",
	"qwen3.7-max": "qwen-max",
	"qwen-max": "qwen-max",
	"hunyuan-t1": "hunyuan-t1",
	"step-3.7-flash": "step",
	"seed-2.0-mini": "doubao-mini",
	"k3": "kimi-k3",
	"kimi-k3": "kimi-k3"
};
/** Lookup a model by its stats key; falls back to the generic `other` entry. */
function modelOf(key) {
	const resolved = MODEL_KEY_ALIASES[key] ?? key;
	return MODEL_CATALOG.find((entry) => entry.key === resolved) ?? (() => {
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
*
* 计费维度是「缓存命中价 × 时段价」的交叉：每个时段档内部分别按缓存命中
* 价（cacheHit）与未命中价（input/cacheMiss）计价，两个时段档再按
* peakShare 混合。时段定义以北京时间为准（如 DeepSeek V4 高峰
* 09:00-12:00 / 14:00-18:00）。因聚合只有按日 token 量、没有请求级时间戳，
* 时段只能按比例估算，而非逐请求判定。
* @param entry - the catalog entry whose prices apply.
* @param buckets - token usage counts.
* @param peakShare - share of traffic in the peak band (0..1); defaults to {@link DEFAULT_PEAK_SHARE}.
* @returns the estimated cost in CNY.
*/
function computeCost(entry, buckets, peakShare = DEFAULT_PEAK_SHARE) {
	const peak = priceBandCost(entry.price, buckets, entry.price.currency);
	const off = entry.price.offPeak === void 0 ? peak : priceBandCost(entry.price.offPeak, buckets, entry.price.currency);
	return peak * peakShare + off * (1 - peakShare);
}
/**
* 按调用时刻精确判定高峰/空闲档并计价（P0-1：替代固定比例混合）。时刻未知
* （null/NaN，理论不发生在真实事件流）时回退 {@link DEFAULT_PEAK_SHARE} 混合，
* 保持旧语义不低估。平档模型（无 offPeak）两个时段同价。
* @param entry - the catalog entry whose prices apply.
* @param buckets - token usage counts.
* @param timeMs - the call's wall-clock time (epoch ms); null falls back to the peak-share mix.
* @param peakShare - fallback mix used only when `timeMs` is missing.
* @returns the estimated cost in the entry's native currency.
*/
function computeCostAt(entry, buckets, timeMs, peakShare = DEFAULT_PEAK_SHARE) {
	if (entry.price.offPeak === void 0) return priceBandCost(entry.price, buckets, entry.price.currency);
	if (timeMs === null || timeMs === void 0 || !Number.isFinite(timeMs)) return computeCost(entry, buckets, peakShare);
	return priceBandCost(tierAt(timeMs) === "peak" ? entry.price : entry.price.offPeak, buckets, entry.price.currency);
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
* 走订阅套餐（coding / token plan / opencode 订阅）的 provider id：这些通道的
* 调用按套餐计费，不再按 token 计费，因此即使模型 id 与计费表撞名也一律豁免。
* 与 pi-ai 内置提供方对齐（含各地区变体：qwen/xiaomi 的 token-plan、opencode 与
* opencode-go、zai-coding-cn）；部署可在 plugin config 的 `subscriptionProviders`
* 中覆盖。
*/
const DEFAULT_SUBSCRIPTION_PROVIDERS = [
	"kimi-coding",
	"zai-coding-cn",
	"opencode",
	"opencode-go",
	"qwen-token-plan",
	"qwen-token-plan-cn",
	"xiaomi-token-plan-ams",
	"xiaomi-token-plan-cn",
	"xiaomi-token-plan-sgp"
];
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
* @param timeMs - the call's wall-clock time (epoch ms); drives peak/off-peak pricing.
*/
function foldUsage(acc, usage, key, subscription, timeMs) {
	const cacheHit = usage.cacheReadTokens ?? 0;
	const cacheMiss = usage.inputTokens + (usage.cacheWriteTokens ?? 0);
	acc.calls += 1;
	acc.input += usage.inputTokens + cacheHit + (usage.cacheWriteTokens ?? 0);
	acc.output += usage.outputTokens;
	acc.cacheHit += cacheHit;
	acc.cacheMiss += cacheMiss;
	if (!subscription && MODEL_CATALOG.some((entry) => entry.key === key)) acc.cost += computeCostAt(modelOf(key), {
		input: cacheHit + cacheMiss,
		cacheHit,
		cacheMiss,
		output: usage.outputTokens
	}, timeMs);
}
/** Local-time date stamp (the host runs in the user's timezone). */
function dayStamp(time) {
	const date = new Date(time);
	const pad = (n) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
/** 工作区名：取 cwd 的末级目录名；无 cwd 时返回 {@link UNKNOWN_WORKSPACE_NAME}。 */
function workspaceNameOf(cwd) {
	if (cwd === void 0 || cwd === "") return "—";
	return cwd.split(/[\\/]/).filter(Boolean).at(-1) ?? "—";
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
/** Get-or-create one turn's accumulation state. */
function turnState(turns, turn) {
	const existing = turns.get(turn);
	if (existing !== void 0) return existing;
	const fresh = {
		turn,
		model: "other",
		input: 0,
		output: 0,
		cacheHit: 0,
		cacheMiss: 0,
		cost: 0,
		startedAt: Number.MAX_SAFE_INTEGER
	};
	turns.set(turn, fresh);
	return fresh;
}
/**
* Fold one session's events into a {@link SessionFold}. 每个 LLM 调用归属到
* 其前置 request/header 记录的模型；同时提取最新会话标题、最后活跃时间，
* 并按轮次折叠每轮费用明细（turn/start → turn/end；调用按 (turn) 归组）。
* @param events - the session's persisted events in log order.
* @param subscriptionProviders - provider ids billed through subscription plans.
* @returns the per-session fold (cached by the incremental aggregator).
*/
function foldSession(events, subscriptionProviders) {
	const fold = {
		total: emptyUsage(),
		byModel: /* @__PURE__ */ new Map(),
		byDay: /* @__PURE__ */ new Map(),
		byDayModels: /* @__PURE__ */ new Map(),
		planCalls: /* @__PURE__ */ new Map(),
		turns: [],
		lastActive: 0
	};
	let key = "other";
	let subscription = false;
	const turns = /* @__PURE__ */ new Map();
	for (const event of events) {
		fold.lastActive = Math.max(fold.lastActive, event.time);
		if (event.type === "session/title") {
			const title = event.data.title;
			if (typeof title === "string" && title.length > 0) fold.title = title;
			continue;
		}
		if (event.type === "turn/start") {
			const state = turnState(turns, event.data.turn ?? -1);
			if (event.time < state.startedAt) state.startedAt = event.time;
			continue;
		}
		if (event.type === "turn/end") {
			const turn = event.data.turn ?? -1;
			const state = turns.get(turn);
			if (state !== void 0) state.endedAt = event.time;
			continue;
		}
		if (event.type === "request/header") {
			const { model, provider } = event.data.header.config;
			key = MODEL_KEY_ALIASES[model] ?? model;
			subscription = subscriptionProviders.has(provider);
			continue;
		}
		if (event.type !== "assistant/message") continue;
		const usage = event.data.usage;
		if (usage === void 0) continue;
		const modelKey = key;
		const day = dayStamp(event.time);
		foldUsage(fold.total, usage, modelKey, subscription, event.time);
		foldUsage(usageCell(fold.byModel, modelKey), usage, modelKey, subscription, event.time);
		foldUsage(usageCell(fold.byDay, day), usage, modelKey, subscription, event.time);
		foldUsage(modelDayCell(fold.byDayModels, day, modelKey), usage, modelKey, subscription, event.time);
		if (subscription) fold.planCalls.set(modelKey, (fold.planCalls.get(modelKey) ?? 0) + 1);
		const state = turnState(turns, event.data.turn ?? -1);
		state.model = modelKey;
		state.input += usage.inputTokens + (usage.cacheReadTokens ?? 0) + (usage.cacheWriteTokens ?? 0);
		state.output += usage.outputTokens;
		state.cacheHit += usage.cacheReadTokens ?? 0;
		state.cacheMiss += usage.inputTokens + (usage.cacheWriteTokens ?? 0);
		if (!subscription && MODEL_CATALOG.some((entry) => entry.key === modelKey)) state.cost += computeCostAt(modelOf(modelKey), {
			input: (usage.cacheReadTokens ?? 0) + usage.inputTokens + (usage.cacheWriteTokens ?? 0),
			cacheHit: usage.cacheReadTokens ?? 0,
			cacheMiss: usage.inputTokens + (usage.cacheWriteTokens ?? 0),
			output: usage.outputTokens
		}, event.time);
		if (state.startedAt === Number.MAX_SAFE_INTEGER) state.startedAt = event.time;
	}
	fold.turns = [...turns.values()].filter((state) => state.input > 0 || state.output > 0).sort((a, b) => a.turn - b.turn).map((state) => ({
		turn: state.turn,
		model: state.model,
		input: state.input,
		output: state.output,
		cacheHit: state.cacheHit,
		cacheMiss: state.cacheMiss,
		cost: state.cost,
		startedAt: state.startedAt === Number.MAX_SAFE_INTEGER ? fold.lastActive : state.startedAt,
		...state.endedAt === void 0 ? {} : { endedAt: state.endedAt }
	}));
	return fold;
}
/** Accumulate one ModelUsage into another (merge step of the incremental aggregator). */
function mergeUsageInto(acc, cell) {
	acc.calls += cell.calls;
	acc.input += cell.input;
	acc.output += cell.output;
	acc.cacheHit += cell.cacheHit;
	acc.cacheMiss += cell.cacheMiss;
	acc.cost += cell.cost;
}
/**
* Create the incremental usage aggregator.
* @param persistence - the session persistence service.
* @param options - aggregation tuning (e.g. subscription-plan providers).
* @returns the aggregator holding the per-session fold cache.
*/
function createUsageAggregator(persistence, options = {}) {
	const subscriptionProviders = new Set(options.subscriptionProviders ?? DEFAULT_SUBSCRIPTION_PROVIDERS);
	const cache = /* @__PURE__ */ new Map();
	let lastDoc;
	let lastAt = 0;
	/** 失效键：日志文件的 mtime+size；拿不到（后端无 locate / 文件丢失）时每次重折。 */
	const stampOf = async (meta) => {
		const location = persistence.locate?.(meta);
		if (location === void 0) return null;
		try {
			const info = await stat(location.path);
			return `${String(info.mtimeMs)}:${String(info.size)}`;
		} catch {
			return null;
		}
	};
	return { async aggregate() {
		const now = Date.now();
		if (lastDoc !== void 0 && now - lastAt < 5e3) return lastDoc;
		const metas = await persistence.list();
		const seen = /* @__PURE__ */ new Set();
		const folds = [];
		for (const meta of metas) {
			const id = String(meta.id);
			seen.add(id);
			const stamp = await stampOf(meta);
			const hit = cache.get(id);
			if (hit !== void 0 && stamp !== null && hit.stamp === stamp) {
				folds.push({
					meta,
					fold: hit.fold
				});
				continue;
			}
			const { events } = await persistence.readFrom(meta.id, 0);
			const fold = foldSession(events, subscriptionProviders);
			cache.set(id, {
				stamp,
				fold
			});
			folds.push({
				meta,
				fold
			});
		}
		for (const key of [...cache.keys()]) if (!seen.has(key)) cache.delete(key);
		const total = emptyUsage();
		const byModel = /* @__PURE__ */ new Map();
		const byDay = /* @__PURE__ */ new Map();
		const byDayModels = /* @__PURE__ */ new Map();
		const planCalls = /* @__PURE__ */ new Map();
		const sessionRows = [];
		const turnRows = [];
		const workspaceMap = /* @__PURE__ */ new Map();
		for (const { meta, fold } of folds) {
			const sessionId = String(meta.id);
			mergeUsageInto(total, fold.total);
			for (const [modelKey, cell] of fold.byModel) mergeUsageInto(usageCell(byModel, modelKey), cell);
			for (const [day, cell] of fold.byDay) mergeUsageInto(usageCell(byDay, day), cell);
			for (const [day, models] of fold.byDayModels) for (const [modelKey, cell] of models) mergeUsageInto(modelDayCell(byDayModels, day, modelKey), cell);
			for (const [modelKey, count] of fold.planCalls) planCalls.set(modelKey, (planCalls.get(modelKey) ?? 0) + count);
			for (const row of fold.turns) turnRows.push({
				sessionId,
				...row
			});
			const wsName = workspaceNameOf(meta.cwd);
			const ws = workspaceMap.get(wsName) ?? {
				name: wsName,
				calls: 0,
				cost: 0,
				input: 0,
				output: 0,
				lastActive: 0
			};
			ws.calls += fold.total.calls;
			ws.cost += fold.total.cost;
			ws.input += fold.total.input;
			ws.output += fold.total.output;
			ws.lastActive = Math.max(ws.lastActive, fold.lastActive);
			workspaceMap.set(wsName, ws);
			if (fold.total.calls > 0) sessionRows.push({
				id: sessionId,
				...fold.title !== void 0 ? { title: fold.title } : {},
				...meta.cwd !== void 0 ? { cwd: meta.cwd } : {},
				calls: fold.total.calls,
				cost: fold.total.cost,
				lastActive: fold.lastActive
			});
		}
		sessionRows.sort((a, b) => b.cost - a.cost || b.lastActive - a.lastActive);
		turnRows.sort((a, b) => b.startedAt - a.startedAt);
		const workspaces = [...workspaceMap.values()].sort((a, b) => b.cost - a.cost || b.lastActive - a.lastActive);
		const toRecord = (map) => {
			const record = {};
			for (const [key, cell] of map) if (planCalls.get(key) === cell.calls && cell.calls > 0) record[key] = {
				...cell,
				plan: true
			};
			else record[key] = cell;
			return record;
		};
		const toModelDayRecord = (map) => Object.fromEntries([...map].map(([day, models]) => [day, Object.fromEntries(models)]));
		lastDoc = {
			version: 3,
			updatedAt: now,
			source: "session-logs",
			total,
			byModel: toRecord(byModel),
			byDay: toRecord(byDay),
			byDayModels: toModelDayRecord(byDayModels),
			bySession: sessionRows.slice(0, 100),
			byTurn: turnRows.slice(0, 200),
			byWorkspace: workspaces.slice(0, 100)
		};
		lastAt = now;
		return lastDoc;
	} };
}
//#endregion
//#region lib/types/balance.js
/**
* Account-balance queries for the billing dashboard.
*
* Only providers with a public balance endpoint can report one. Today that is
* DeepSeek (`GET https://api.deepseek.com/user/balance`) and Moonshot/Kimi
* (`GET https://api.moonshot.cn/v1/users/me/balance`), both Bearer 鉴权 with a
* documented JSON shape; the other mainstream providers expose no standard
* balance API (or require a non-Bearer auth flow), so their rows in the model
* table show an unavailable state. The lookup map below is the extension point
* for future providers.
*
* API keys are read from the `llm-pi-ai` settings namespace (`providers.<id>.apiKeyEnv`),
* the same source the subscription adapter uses, so a deployment configures a
* provider's key once and every surface reuses it.
*/
/** Abort a balance fetch when the upstream hangs beyond this budget. */
const FETCH_TIMEOUT_MS$1 = 8e3;
/** DeepSeek 官方余额接口（官方文档 api-docs.deepseek.com/api/get-user-balance）。 */
const DEEPSEEK_BALANCE_URL = "https://api.deepseek.com/user/balance";
/** Moonshot/Kimi 官方余额接口（platform.kimi.com/docs/api/balance）。 */
const MOONSHOT_BALANCE_URL = "https://api.moonshot.cn/v1/users/me/balance";
/** 阶跃星辰 StepFun 官方账户信息接口（platform.stepfun.com/docs/api-reference/accounts/get）。 */
const STEPFUN_BALANCE_URL = "https://api.stepfun.com/v1/accounts";
/** 数字归一化：接口返回的余额是字符串（如 `"110.00"`），统一转 number。 */
function toNumber(value) {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : void 0;
	}
}
/**
* Fetch a Bearer-protected balance endpoint and normalize the HTTP outcome into
* a shared {@link ProviderBalance} row. Each provider supplies its own
* response parser for the success body.
* @param ctx - host context carrying the credentials seam.
* @param url - the balance endpoint.
* @param apiKeyEnv - credential reference resolving the API key.
* @param provider - the provider id (matches the model-table vendor display name).
* @param displayName - human-readable provider name.
* @param parse - maps a success JSON body to the balance row fields.
* @returns the balance row, or an error row when the key/endpoint misbehaves.
*/
async function queryBearerBalance(ctx, url, apiKeyEnv, provider, displayName, parse) {
	const hit = await ctx.credentials.resolve(credentialRef(apiKeyEnv));
	if (hit === void 0) return {
		provider,
		displayName,
		error: "unconfigured"
	};
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS$1);
	try {
		const response = await fetch(url, {
			headers: {
				accept: "application/json",
				authorization: `Bearer ${hit.value}`
			},
			signal: controller.signal
		});
		if (response.status === 401 || response.status === 403) return {
			provider,
			displayName,
			error: "unauthorized"
		};
		if (!response.ok) return {
			provider,
			displayName,
			error: "unreachable"
		};
		return parse(await response.json());
	} catch {
		return {
			provider,
			displayName,
			error: "unreachable"
		};
	} finally {
		clearTimeout(timer);
	}
}
/**
* Query the DeepSeek account balance.
* @param ctx - host context carrying the credentials seam.
* @param apiKeyEnv - credential reference resolving the DeepSeek API key.
* @returns the balance row, or an error row when the key/endpoint misbehaves.
*/
function queryDeepSeek(ctx, apiKeyEnv) {
	return queryBearerBalance(ctx, DEEPSEEK_BALANCE_URL, apiKeyEnv, "deepseek", "DeepSeek", (data) => {
		const doc = data;
		const info = (Array.isArray(doc.balance_infos) ? doc.balance_infos : [])[0];
		const currency = typeof info?.currency === "string" ? info.currency : void 0;
		const totalBalance = toNumber(info?.total_balance);
		const grantedBalance = toNumber(info?.granted_balance);
		const toppedUpBalance = toNumber(info?.topped_up_balance);
		const isAvailable = typeof doc.is_available === "boolean" ? doc.is_available : void 0;
		return {
			provider: "deepseek",
			displayName: "DeepSeek",
			...currency !== void 0 ? { currency } : {},
			...totalBalance !== void 0 ? { totalBalance } : {},
			...grantedBalance !== void 0 ? { grantedBalance } : {},
			...toppedUpBalance !== void 0 ? { toppedUpBalance } : {},
			...isAvailable !== void 0 ? { isAvailable } : {}
		};
	});
}
/**
* Query the Moonshot/Kimi account balance.
* @param ctx - host context carrying the credentials seam.
* @param apiKeyEnv - credential reference resolving the Moonshot API key.
* @returns the balance row, or an error row when the key/endpoint misbehaves.
*/
function queryMoonshot(ctx, apiKeyEnv) {
	return queryBearerBalance(ctx, MOONSHOT_BALANCE_URL, apiKeyEnv, "月之暗面", "月之暗面", (data) => {
		const doc = data;
		const totalBalance = toNumber(doc.data?.available_balance);
		const grantedBalance = toNumber(doc.data?.voucher_balance);
		const toppedUpBalance = toNumber(doc.data?.cash_balance);
		return {
			provider: "月之暗面",
			displayName: "月之暗面",
			currency: "CNY",
			...totalBalance !== void 0 ? { totalBalance } : {},
			...grantedBalance !== void 0 ? { grantedBalance } : {},
			...toppedUpBalance !== void 0 ? { toppedUpBalance } : {}
		};
	});
}
/**
* Query the StepFun (阶跃星辰) account balance.
* @param ctx - host context carrying the credentials seam.
* @param apiKeyEnv - credential reference resolving the StepFun API key.
* @returns the balance row, or an error row when the key/endpoint misbehaves.
*/
function queryStepFun(ctx, apiKeyEnv) {
	return queryBearerBalance(ctx, STEPFUN_BALANCE_URL, apiKeyEnv, "阶跃星辰", "阶跃星辰", (data) => {
		const doc = data;
		const totalBalance = toNumber(doc.balance);
		const toppedUpBalance = toNumber(doc.total_cash_balance);
		const grantedBalance = toNumber(doc.total_voucher_balance);
		return {
			provider: "阶跃星辰",
			displayName: "阶跃星辰",
			currency: "CNY",
			...totalBalance !== void 0 ? { totalBalance } : {},
			...toppedUpBalance !== void 0 ? { toppedUpBalance } : {},
			...grantedBalance !== void 0 ? { grantedBalance } : {}
		};
	});
}
const QUERIERS = [
	{
		route: "deepseek",
		displayName: "deepseek",
		querier: queryDeepSeek
	},
	{
		route: "moonshot",
		displayName: "月之暗面",
		querier: queryMoonshot
	},
	{
		route: "stepfun",
		displayName: "阶跃星辰",
		querier: queryStepFun
	}
];
/**
* Query every configured provider's account balance. A provider is queried only
* when its llm-pi-ai route has an `apiKeyEnv`; absent routes answer
* `unconfigured` so the dashboard shows a stable state instead of dropping the row.
* @param ctx - host context carrying the credentials seam.
* @param providers - the llm-pi-ai providers dict (`<route> → { apiKeyEnv? }`).
* @returns the balance rows (one per provider).
*/
async function queryBalances(ctx, providers) {
	return await Promise.all(QUERIERS.map(({ route, querier, displayName }) => {
		const env = providers[route]?.apiKeyEnv;
		if (typeof env !== "string" || env === "") return Promise.resolve({
			provider: displayName,
			displayName,
			error: "unconfigured"
		});
		return querier(ctx, env);
	}));
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
//#region lib/types/subscriptions.js
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
const EMPTY_SUBSCRIPTION_KEYS = {
	kimiApiKey: "",
	zaiApiKey: "",
	opencodeApiKey: "",
	zaiRegion: "global"
};
/** 订阅类 provider 的显示名（未命中的回退为 id 本身）。 */
const SUBSCRIPTION_DISPLAY_NAMES = {
	"kimi-coding": "Kimi For Coding",
	"zai-coding-cn": "Z.ai Coding Plan",
	"zai-coding": "Z.ai Coding Plan",
	"opencode": "OpenCode Plan",
	"opencode-go": "OpenCode Go",
	"qwen-token-plan": "通义 Token Plan",
	"qwen-token-plan-cn": "通义 Token Plan（国内）",
	"xiaomi-token-plan-ams": "小米 Token Plan（海外）",
	"xiaomi-token-plan-cn": "小米 Token Plan（国内）",
	"xiaomi-token-plan-sgp": "小米 Token Plan（新加坡）",
	"volcengine-token-plan": "火山引擎 Token Plan",
	"ark-token-plan": "火山方舟 Token Plan",
	"doubao-token-plan": "豆包 Token Plan",
	"ernie": "百度文心 Plan",
	"baidu": "百度文心 Plan",
	"wenxin": "百度文心 Plan",
	"minimax": "MiniMax Coding Plan"
};
/** 订阅类 provider id 判定：带 coding / agent-plan / token-plan 后缀，或已知订阅通道。 */
const SUBSCRIPTION_ID_RE = /(?:^|-)(?:coding|agent[-_]?plan|token[-_]?plan)(?:$|-|_)|^(?:opencode|opencode-go|kimi-coding|zai-coding|minimax)/i;
/** 是否是订阅类 provider id（如 kimi-coding、xiaomi-token-plan-cn）。 */
function isSubscriptionProviderId(providerId) {
	if (SUBSCRIPTION_ID_RE.test(providerId)) return true;
	return SUBSCRIPTION_DISPLAY_NAMES[providerId] !== void 0;
}
/** 适配器注册表：provider id → 收集器（displayName 同步映射）。 */
const SUBSCRIPTION_ADAPTERS = {
	"kimi-coding": { collect: collectKimi },
	"zai-coding-cn": { collect: collectZai },
	"opencode": { collect: collectOpenCodeGo },
	"opencode-go": { collect: collectOpenCodeGo }
};
/** 有额度适配器的 provider id 集合（识别用）。 */
const ADAPTER_PROVIDER_IDS = new Set(Object.keys(SUBSCRIPTION_ADAPTERS));
/**
* 从 llm-pi-ai 设置里识别订阅套餐：带订阅类 id 且配置了 apiKeyEnv 的 provider。
* @param providers - the `providers` map of the llm-pi-ai settings namespace.
* @returns identified plans in configuration order.
*/
function identifySubscriptionPlans(providers) {
	const out = [];
	for (const [id, config] of Object.entries(providers ?? {})) {
		if (typeof config?.apiKeyEnv !== "string" || config.apiKeyEnv === "") continue;
		if (!isSubscriptionProviderId(id)) continue;
		out.push({
			provider: id,
			displayName: SUBSCRIPTION_DISPLAY_NAMES[id] ?? id,
			adapter: ADAPTER_PROVIDER_IDS.has(id),
			...id === "zai-coding-cn" ? { region: "bigmodel-cn" } : {}
		});
	}
	return out;
}
const DEFAULT_TIMEOUT_MS = 15e3;
/** Number, or null when the value is not a finite number (nor numeric string). */
function numberOrNull(value) {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
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
	if (value === null || value === void 0 || value === "") return null;
	if (typeof value === "number" && Number.isFinite(value)) {
		const date = new Date(value < 2e12 ? value * 1e3 : value);
		return Number.isNaN(date.getTime()) ? null : date.toISOString();
	}
	const date = new Date(String(value));
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
/** Map a fetch error to a stable status. */
function statusOf(error) {
	if (error instanceof Error) {
		if (error.name === "TimeoutError" || error.name === "AbortError") return "unavailable";
		const status = error.httpStatus;
		if (status === 401 || status === 403) return "unauthorized";
		if (status === 429) return "rate-limited";
		if (status === 404) return "unavailable";
	}
	return "unavailable";
}
/** One JSON fetch with a timeout, mapping HTTP failures to typed errors. */
async function requestJson(url, init, timeoutMs) {
	const response = await fetch(url, {
		...init,
		signal: AbortSignal.timeout(timeoutMs)
	});
	if (!response.ok) {
		const error = /* @__PURE__ */ new Error(`HTTP ${String(response.status)}`);
		error.httpStatus = response.status;
		throw error;
	}
	return await response.json();
}
/** Parse one Kimi limit window entry. */
function kimiWindow(value, kind) {
	if (value === null || typeof value !== "object") return null;
	const record = value;
	const limit = numberOrNull(record.limit ?? record.total);
	const remaining = numberOrNull(record.remaining);
	if (limit === null || remaining === null || limit <= 0) return null;
	const usedPercent = round1(clampPercent((limit - remaining) / limit * 100) ?? 0);
	const resetsAt = toIso(record.resetTime ?? record.reset_time ?? record.resetsAt);
	return {
		kind,
		usedPercent,
		remainingPercent: round1(100 - usedPercent),
		remaining,
		...resetsAt === null ? {} : { resetsAt }
	};
}
/** Parse a Kimi `/coding/v1/usages` body. */
function parseKimi(body) {
	const record = body?.data ?? body ?? {};
	const session = (Array.isArray(record.limits) ? record.limits : []).map((entry) => kimiWindow(entry?.detail ?? entry, "session")).find((hit) => hit !== null) ?? null;
	const weekly = kimiWindow(record.usage, "weekly");
	const plan = typeof record.plan === "string" ? record.plan : typeof record.planName === "string" ? record.planName : void 0;
	return {
		...plan !== void 0 && plan !== "" ? { plan } : {},
		windows: [session, weekly].filter((hit) => hit !== null)
	};
}
/** Collect the Kimi For Coding quota. */
async function collectKimi(keys, config, timeoutMs) {
	const apiKey = keys.kimiApiKey.trim();
	const base = config.baseUrl ?? "https://api.kimi.com";
	if (apiKey === "") return {
		provider: config.provider,
		displayName: "Kimi For Coding",
		status: "not-configured",
		windows: []
	};
	try {
		const parsed = parseKimi(await requestJson(`${base}/coding/v1/usages`, { headers: {
			authorization: `Bearer ${apiKey}`,
			accept: "application/json"
		} }, timeoutMs));
		return {
			provider: config.provider,
			displayName: "Kimi For Coding",
			...parsed.plan !== void 0 ? { plan: parsed.plan } : {},
			status: parsed.windows.length > 0 ? "ok" : "invalid-response",
			windows: parsed.windows
		};
	} catch (error) {
		return {
			provider: config.provider,
			displayName: "Kimi For Coding",
			status: statusOf(error),
			windows: []
		};
	}
}
/** Window length in minutes for a Z.ai limit row; null when unknown. */
function zaiWindowMinutes(limit) {
	const unit = numberOrNull(limit.unit);
	const number = numberOrNull(limit.number);
	if (unit === null || number === null || number <= 0) return null;
	if (unit === 5) return number;
	if (unit === 3) return number * 60;
	if (unit === 1) return number * 24 * 60;
	if (unit === 6) return number * 7 * 24 * 60;
	return null;
}
/** Used percent for a Z.ai limit row. */
function zaiUsedPercent(limit) {
	const total = numberOrNull(limit.usage);
	const remaining = numberOrNull(limit.remaining);
	const current = numberOrNull(limit.currentValue ?? limit.current_value);
	if (total !== null && total > 0) {
		const used = remaining === null ? current : current === null ? total - remaining : Math.max(total - remaining, current);
		if (used !== null) return clampPercent(Math.max(0, Math.min(total, used)) / total * 100);
	}
	return clampPercent(numberOrNull(limit.percentage ?? limit.usedPercent ?? limit.used_percent));
}
/** One Z.ai quota window row. */
function zaiWindow(limit, kind, fallbackReset = null) {
	const usedPercent = zaiUsedPercent(limit);
	if (usedPercent === null) return null;
	const resetsAt = toIso(limit.nextResetTime ?? limit.next_reset_time) ?? fallbackReset;
	return {
		kind,
		usedPercent: round1(usedPercent),
		remainingPercent: round1(100 - usedPercent),
		...resetsAt === null ? {} : { resetsAt }
	};
}
/** Parse Z.ai quota + subscription bodies into windows. */
function parseZai(quotaBody, subscriptionBody) {
	const quota = quotaBody ?? {};
	const limits = Array.isArray(quota.data?.limits) ? quota.data.limits : [];
	const tokenLimits = limits.filter((entry) => {
		const record = entry;
		const type = String(record.type ?? record.limit_type ?? "").toUpperCase();
		return (type === "TOKENS_LIMIT" || type === "CREDIT_LIMIT") && zaiUsedPercent(record) !== null;
	}).sort((a, b) => (zaiWindowMinutes(a) ?? Number.MAX_SAFE_INTEGER) - (zaiWindowMinutes(b) ?? Number.MAX_SAFE_INTEGER));
	const timeLimit = limits.find((entry) => {
		const record = entry;
		return String(record.type ?? record.limit_type ?? "").toUpperCase() === "TIME_LIMIT" && zaiUsedPercent(record) !== null;
	});
	const first = tokenLimits[0];
	const session = tokenLimits.length >= 2 ? first : first !== void 0 && zaiWindowMinutes(first) !== null && (zaiWindowMinutes(first) ?? 0) <= 360 ? first : void 0;
	const weekly = tokenLimits.length >= 2 ? tokenLimits[tokenLimits.length - 1] : session === void 0 ? first : void 0;
	const subscriptionRow = subscriptionBody?.data;
	const renewAt = toIso(Array.isArray(subscriptionRow) ? subscriptionRow[0]?.next_renew_time ?? subscriptionRow[0]?.nextRenewTime : void 0);
	const row = Array.isArray(subscriptionRow) ? subscriptionRow[0] : void 0;
	let plan = "GLM Coding Plan";
	for (const source of [row, quota.data]) {
		if (source === null || typeof source !== "object") continue;
		const record = source;
		for (const key of [
			"product_name",
			"productName",
			"plan_name",
			"planName",
			"package_name",
			"packageName",
			"level"
		]) {
			const value = record[key];
			if (typeof value === "string" && value.trim() !== "") {
				plan = value.trim();
				break;
			}
		}
		if (plan !== "GLM Coding Plan") break;
	}
	return {
		plan,
		windows: [
			session === void 0 ? null : zaiWindow(session, "session"),
			weekly === void 0 ? null : zaiWindow(weekly, "weekly"),
			timeLimit === void 0 ? null : zaiWindow(timeLimit, "billing", renewAt)
		].filter((hit) => hit !== null)
	};
}
/** Collect the Z.ai Coding Plan quota. */
async function collectZai(keys, config, timeoutMs) {
	const apiKey = keys.zaiApiKey.trim();
	const host = (config.region ?? keys.zaiRegion ?? "global") === "bigmodel-cn" ? "https://open.bigmodel.cn" : "https://api.z.ai";
	if (apiKey === "") return {
		provider: config.provider,
		displayName: "Z.ai Coding Plan",
		status: "not-configured",
		windows: []
	};
	try {
		const init = { headers: {
			authorization: apiKey,
			accept: "application/json"
		} };
		const quota = await requestJson(`${host}/api/monitor/usage/quota/limit`, init, timeoutMs);
		let subscription = null;
		try {
			subscription = await requestJson(`${host}/api/biz/subscription/list`, init, timeoutMs);
		} catch {}
		const parsed = parseZai(quota, subscription);
		return {
			provider: config.provider,
			displayName: "Z.ai Coding Plan",
			plan: parsed.plan,
			status: parsed.windows.length > 0 ? "ok" : "invalid-response",
			windows: parsed.windows
		};
	} catch (error) {
		return {
			provider: config.provider,
			displayName: "Z.ai Coding Plan",
			status: statusOf(error),
			windows: []
		};
	}
}
/** Parse one OpenCode Go window object. */
function goWindow(value, kind) {
	if (value === null || typeof value !== "object") return null;
	const record = value;
	const percentSource = record.usagePercent ?? record.usedPercent ?? record.percentUsed ?? record.percentage ?? record.percent;
	let usedPercent = clampPercent(numberOrNull(percentSource));
	if (usedPercent === null) {
		const used = numberOrNull(record.used ?? record.consumed);
		const limit = numberOrNull(record.limit ?? record.total ?? record.quota);
		if (used !== null && limit !== null && limit > 0) usedPercent = clampPercent(used / limit * 100);
	}
	if (usedPercent === null) return null;
	if (usedPercent <= 1 && usedPercent >= 0 && record.percent === void 0 && percentSource !== void 0) usedPercent *= 100;
	const resetSeconds = numberOrNull(record.resetInSec ?? record.resetInSeconds ?? record.resetSeconds);
	const resetsAt = resetSeconds === null ? toIso(record.resetAt ?? record.resetsAt ?? record.nextReset) : new Date(Date.now() + Math.max(0, resetSeconds) * 1e3).toISOString();
	return {
		kind,
		usedPercent: round1(clampPercent(usedPercent) ?? 0),
		remainingPercent: round1(100 - (clampPercent(usedPercent) ?? 0)),
		...resetsAt === null ? {} : { resetsAt }
	};
}
/** Parse the OpenCode Go Bearer endpoint body. */
function parseOpenCodeGoApi(body) {
	const usage = body?.usage ?? body;
	if (usage === null || typeof usage !== "object") return [];
	const record = usage;
	return [
		goWindow(record.rolling, "session"),
		goWindow(record.weekly, "weekly"),
		goWindow(record.monthly, "monthly")
	].filter((hit) => hit !== null);
}
/** Collect the OpenCode Go quota. */
async function collectOpenCodeGo(keys, config, timeoutMs) {
	const apiKey = keys.opencodeApiKey.trim();
	const base = config.baseUrl ?? "https://opencode.ai";
	if (apiKey === "") return {
		provider: config.provider,
		displayName: "OpenCode Go",
		status: "not-configured",
		windows: []
	};
	try {
		const windows = parseOpenCodeGoApi(await requestJson(`${base}/zen/go/v1/usage`, { headers: {
			authorization: `Bearer ${apiKey}`,
			accept: "application/json"
		} }, timeoutMs));
		return {
			provider: config.provider,
			displayName: "OpenCode Go",
			status: windows.length > 0 ? "ok" : "invalid-response",
			windows
		};
	} catch (error) {
		return {
			provider: config.provider,
			displayName: "OpenCode Go",
			status: statusOf(error),
			windows: []
		};
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
async function collectSubscriptions(keys, plans = [], timeoutMs = DEFAULT_TIMEOUT_MS) {
	return await Promise.all(plans.map((plan) => {
		const adapter = SUBSCRIPTION_ADAPTERS[plan.provider];
		if (adapter === void 0) return Promise.resolve({
			provider: plan.provider,
			displayName: plan.provider,
			status: "unavailable",
			windows: []
		});
		return adapter.collect(keys, plan, timeoutMs);
	}));
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
/** 实时定价的后台刷新间隔（毫秒）：汇率/模型价低频变化，6 小时一次足够。 */
const PRICING_REFRESH_INTERVAL_MS = 360 * 60 * 1e3;
/** 订阅套餐额度缓存时长（毫秒）：上游配额 API 低频变化，5 分钟足够。 */
const SUBSCRIPTION_CACHE_MS = 300 * 1e3;
/** DeepSeek 余额查询的默认凭据引用（与 llm-deepseek 的默认引用一致）。 */
const DEFAULT_BALANCE_API_KEY_ENV = "DEEPSEEK_API_KEY";
/** Required services: the web server, the persisted session log store, and user settings. */
const inject = [
	"webServer",
	"sessionPersistence",
	"credentials",
	"settings"
];
/**
* 订阅 provider id（llm-pi-ai 设置键）→ billing 适配器 key 的映射。
* 复用 dsh 既有的 llm-pi-ai provider 配置（apiKeyEnv 引用），不引入新配置面。
*/
const SUBSCRIPTION_KEY_SOURCES = [
	{
		provider: "kimi-coding",
		key: "kimiApiKey"
	},
	{
		provider: "zai-coding-cn",
		key: "zaiApiKey"
	},
	{
		provider: "opencode",
		key: "opencodeApiKey"
	},
	{
		provider: "opencode-go",
		key: "opencodeApiKey"
	}
];
/**
* 读取 llm-pi-ai 设置的 `providers` 字典（`<route> → { apiKeyEnv? }`）。
* 余额查询复用同一份来源：部署为某个 provider 配一次 key，多个 surface 共享。
* @param settings - the settings service (reads the llm-pi-ai namespace).
* @returns the providers dict; empty when the namespace is unreadable.
*/
async function readPiAiProviders(settings) {
	try {
		return (settings.describe({ redactSecrets: true }).find((descriptor) => descriptor.ns === "llm-pi-ai")?.value)?.providers ?? {};
	} catch {
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
async function resolveSubscriptionKeys(settings, credentials) {
	const keys = { ...EMPTY_SUBSCRIPTION_KEYS };
	let providers;
	try {
		providers = (settings.describe({ redactSecrets: true }).find((descriptor) => descriptor.ns === "llm-pi-ai")?.value)?.providers;
	} catch {
		return {
			keys,
			identified: []
		};
	}
	for (const { provider, key } of SUBSCRIPTION_KEY_SOURCES) {
		const env = providers?.[provider]?.apiKeyEnv;
		if (typeof env !== "string" || env === "") continue;
		try {
			const resolved = await credentials.resolve(credentialRef(env));
			if (resolved?.value !== void 0 && resolved.value !== "") keys[key] = resolved.value;
		} catch {}
	}
	if (providers?.["zai-coding-cn"]?.apiKeyEnv !== void 0 && keys.zaiApiKey !== "") keys.zaiRegion = "bigmodel-cn";
	return {
		keys,
		identified: identifySubscriptionPlans(providers)
	};
}
/**
* Host plugin body: serve real aggregated usage to the browser dashboard.
* @param ctx - host context carrying webServer and sessionPersistence.
* @param config - optional statsPath override.
*/
function apply(ctx, config = {}) {
	const aggregator = createUsageAggregator(ctx.sessionPersistence, { ...config.subscriptionProviders === void 0 ? {} : { subscriptionProviders: config.subscriptionProviders } });
	const cwd = process.cwd();
	const candidates = [
		config.statsPath,
		process.env.DSH_USAGE_STATS,
		join(cwd, ".dsh-usage-stats.json"),
		join(homedir(), ".dsh/.dsh-usage-stats.json")
	].filter((path) => typeof path === "string" && path.length > 0);
	let live = { source: "builtin" };
	const refreshPricing = async () => {
		live = await fetchLivePricing();
	};
	refreshPricing();
	ctx.effect(() => {
		const timer = setInterval(() => {
			refreshPricing();
		}, PRICING_REFRESH_INTERVAL_MS);
		return () => {
			clearInterval(timer);
		};
	}, "usage-billing: pricing refresh timer");
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
		path: "/api/billing/balance",
		handler: async (_req, res) => {
			res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
			const providers = { ...await readPiAiProviders(ctx.settings) };
			if (providers["deepseek"] === void 0) providers["deepseek"] = { apiKeyEnv: config.balanceApiKeyEnv ?? DEFAULT_BALANCE_API_KEY_ENV };
			const balances = await queryBalances(ctx, providers);
			res.end(JSON.stringify({ balances }));
		}
	}), "usage-billing: balance route");
	let quotaCache = {
		at: 0,
		quotas: []
	};
	const refreshQuotas = async () => {
		const { keys, identified } = await resolveSubscriptionKeys(ctx.settings, ctx.credentials);
		const rows = [...await collectSubscriptions(keys, identified.filter((item) => item.adapter).map((item) => ({
			provider: item.provider,
			...item.region === void 0 ? {} : { region: item.region }
		})))];
		for (const item of identified) if (!item.adapter) rows.push({
			provider: item.provider,
			displayName: item.displayName,
			status: "ok",
			windows: []
		});
		quotaCache = {
			at: Date.now(),
			quotas: rows
		};
	};
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/api/billing/subscriptions",
		handler: async (_req, res) => {
			res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
			if (Date.now() - quotaCache.at >= SUBSCRIPTION_CACHE_MS) await refreshQuotas();
			res.end(JSON.stringify({ quotas: quotaCache.quotas }));
		}
	}), "usage-billing: subscriptions route");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/api/billing/usage-stats",
		handler: async (_req, res) => {
			res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
			try {
				const stats = await aggregator.aggregate();
				const injected = {
					...config.monthlyBudget === void 0 ? {} : { budget: config.monthlyBudget },
					...config.lowBalanceThreshold === void 0 ? {} : { lowBalanceThreshold: config.lowBalanceThreshold }
				};
				res.end(JSON.stringify(Object.keys(injected).length === 0 ? stats : {
					...stats,
					...injected
				}));
				return;
			} catch {}
			for (const candidate of candidates) try {
				const text = await readFile(candidate, "utf8");
				const doc = JSON.parse(text);
				if (config.monthlyBudget !== void 0) doc["budget"] = config.monthlyBudget;
				if (config.lowBalanceThreshold !== void 0) doc["lowBalanceThreshold"] = config.lowBalanceThreshold;
				res.end(JSON.stringify(doc));
				return;
			} catch {}
			res.end(JSON.stringify({ error: "usage stats unavailable" }));
		}
	}), "usage-billing: usage-stats route");
}
//#endregion
export { apply, inject, resolveSubscriptionKeys };
