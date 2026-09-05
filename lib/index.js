import { createRequire } from "node:module";
import { mkdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { withFileLock, writeFileAtomic } from "@deepseek-ai/dsh-atomic-write";
import { credentialRef } from "@deepseek-ai/dsh-credentials";
import z from "@deepseek-ai/schemastery";
import { SessionLogOffset } from "@deepseek-ai/dsh-session/types";
import { createHash, createHmac } from "node:crypto";
//#region lib/types/client/plan-knowledge.js
/**
* Plan-knowledge reference (adapted from dsh-spend's `knowledge.js`, MIT):
* billing-plan shape (code = subscription, token = usage) for known providers,
* plus official token rates as a pricing fallback for providers whose models
* are not covered by the built-in catalog or models.dev.
*
* The cost model follows dsh-spend's dual-basis:
* - `code` plan (OpenCode Go, Coding/Token plans, etc.): the monthly cost is
*   the subscription fee, counted into the projected month total.
* - `token` plan (pay-as-you-go API providers): cost = tokens × unit price.
*
* We keep our own live-pricing path (models.dev + OpenRouter) for token plans;
* this table only fills the subscription amount, the plan type, and a fallback
* rate for the few models those live sources may miss.
*/
/**
* 订阅/计划 provider id → plan 知识（引用 dsh-spend 的 code/token 双口径）。
* 覆盖我们实际会识别到的订阅通道；其余按量 API 不计入此表（默认 token）。
*/
const PLAN_KNOWLEDGE = {
	"opencode-go": {
		type: "code",
		subscription: {
			amount: 10,
			currency: "USD",
			period: "month"
		},
		tier: {
			amount: 10,
			currency: "USD",
			periodDays: 7,
			label: "周额度 $30"
		}
	},
	opencode: {
		type: "code",
		subscription: {
			amount: 10,
			currency: "USD",
			period: "month"
		},
		tier: {
			amount: 10,
			currency: "USD",
			periodDays: 7,
			label: "周额度 $30"
		}
	},
	"kimi-coding": { type: "code" },
	"zai-coding-cn": { type: "code" },
	"zai-coding": { type: "code" },
	"qwen-token-plan": { type: "code" },
	"qwen-token-plan-cn": { type: "code" },
	"xiaomi-token-plan-ams": { type: "code" },
	"xiaomi-token-plan-cn": { type: "code" },
	"xiaomi-token-plan-sgp": { type: "code" },
	"volcengine-token-plan": { type: "code" },
	"ark-token-plan": { type: "code" },
	"doubao-token-plan": { type: "code" },
	"minimax": { type: "code" },
	"minimax-cn": { type: "code" },
	"minimax-token-plan": { type: "code" },
	"minimax-token-plan-cn": { type: "code" },
	"hunyuan-token-plan": { type: "code" },
	"tencent-token-plan": { type: "code" },
	"hy-token-plan": { type: "code" },
	"xinghuo-token-plan": { type: "code" },
	"xfyun-coding": { type: "code" },
	"spark-coding": { type: "code" },
	"huawei-token-plan": { type: "code" },
	"pangu-token-plan": { type: "code" },
	"huawei-maas-token-plan": { type: "code" },
	"volcengine-agent-plan": { type: "code" },
	"ark-agent-plan": { type: "code" },
	"baidu-token-plan": { type: "code" },
	"ernie-token-plan": { type: "code" },
	"wenxin-token-plan": { type: "code" }
};
/**
* 订阅/plan provider id 变体 → PLAN_KNOWLEDGE 规范键（引用 dsh-spend 的别名归一化）。
* 部署配置的订阅 provider id 写法不一（glm/zhipu/bigmodel、ark/volcengine、
* kimi/moonshot、xiaomi…），先归一化再匹配，提升"自动识别"覆盖率。
* 注意：裸 qwen/dashscope/tongyi 等是按量 API（token 计费）而非订阅，不归一到
* 订阅键——只有显式 token-plan 后缀才由 SUBSCRIPTION_ID_RE 判定为订阅。
*/
const PLAN_PROVIDER_ALIASES = {
	"glm": "zai-coding-cn",
	"bigmodel": "zai-coding-cn",
	"zhipu": "zai-coding-cn",
	"zhipuai": "zai-coding-cn",
	"zai": "zai-coding",
	"ark": "volcengine-token-plan",
	"volcengine": "volcengine-token-plan",
	"doubao": "doubao-token-plan",
	"moonshot": "kimi-coding",
	"kimi": "kimi-coding",
	"xiaomi": "xiaomi-token-plan-cn",
	"opencode": "opencode-go"
};
/** 归一化订阅 provider id：别名命中则映射到规范键，否则原样返回。 */
function normalizePlanProvider(providerId) {
	if (providerId === "") return providerId;
	return PLAN_PROVIDER_ALIASES[providerId] ?? providerId;
}
/** provider id（llm-pi-ai 设置键）→ plan 知识；未命中默认 token。 */
function planTypeOf(providerId) {
	return PLAN_KNOWLEDGE[normalizePlanProvider(providerId)]?.type ?? "token";
}
/**
* 订阅月费折算为人民币：原生币 × 实时汇率（USD→CNY）。汇率缺失时返回 0，
* 避免用假设汇率造成失真（跨币种保护：金额统一折成 CNY 再相加）。
*/
function subscriptionFeeCnyOf(providerId, rate) {
	const mount = PLAN_KNOWLEDGE[normalizePlanProvider(providerId)]?.subscription;
	if (mount === void 0) return 0;
	if (mount.currency === "CNY") return mount.amount;
	return rate !== void 0 && rate > 0 ? mount.amount * rate : 0;
}
const FALLBACK_RATES = [
	{
		key: "deepseek-v4-flash",
		input: .14,
		cacheHit: .0028,
		output: .28
	},
	{
		key: "deepseek-v4-pro",
		input: .435,
		cacheHit: .003625,
		output: .87
	},
	{
		key: "gpt-5.6-sol",
		input: 5,
		cacheHit: .5,
		output: 30
	},
	{
		key: "gpt-5.6-terra",
		input: 2,
		cacheHit: .2,
		output: 12
	},
	{
		key: "gpt-5.6-luna",
		input: .2,
		cacheHit: .02,
		output: 1.2
	},
	{
		key: "glm-5.2",
		input: 1.4,
		cacheHit: .26,
		output: 4.4
	},
	{
		key: "qwen3.8-max",
		input: 2,
		cacheHit: .21,
		output: 6
	},
	{
		key: "kimi-k3",
		input: 2.82,
		cacheHit: .28,
		output: 14.08
	},
	{
		key: "grok-4.6",
		input: 2,
		cacheHit: .5,
		output: 6
	},
	{
		key: "gemini-2.5-pro",
		input: 1.25,
		cacheHit: .125,
		output: 10
	}
];
/** 运行时实时覆盖：undefined = 用内置目录与内置汇率（默认值降级）。 */
let liveRate;
let livePrices;
let liveExtraModels;
/**
* 用户自定义模型别名（插件配置 `modelKeyAliases`，聚合启动时注入）：真实日志
* model id → 计费目录键。优先级高于内置别名表——目录外的新模型无需等发版，
* 配置一条别名即完成识别与计价（键必须是 MODEL_CATALOG 的既有 key）。
*/
let userModelAliases;
/**
* 注入用户自定义模型别名（node 半区在插件启动时调用一次）。纯内存状态：
* 聚合折叠与客户端渲染共用同一份（两侧一致性由同一注入点保证）。
* @param aliases - `model id → 目录键` 映射；undefined/空 = 清除，回退内置表。
*/
function applyUserModelAliases(aliases) {
	userModelAliases = aliases !== void 0 && Object.keys(aliases).length > 0 ? aliases : void 0;
}
/**
* Apply the node half's live pricing snapshot. Absent fields keep the
* built-in catalog and rate; callers never fabricate values.
* @param pricing - the `/api/billing/pricing` response.
*/
function applyLivePricing(pricing) {
	liveRate = typeof pricing.rate === "number" && Number.isFinite(pricing.rate) && pricing.rate > 0 ? pricing.rate : void 0;
	livePrices = pricing.prices;
	liveExtraModels = pricing.extraModels;
}
/** 当前汇率：实时覆盖优先，缺省回退内置固定值。 */
function currentRate() {
	return liveRate ?? 6.79;
}
/** Default share of traffic assumed to fall in the peak band (0..1). */
const DEFAULT_PEAK_SHARE = .5;
/**
* 峰谷计价时代分界（UTC 2026-08-16T16:00:00Z，即北京时间 2026-08-17 00:00）：
* DeepSeek V4 自此起按峰/谷两档计价。此前官方只有基础价一档——历史事件若
* 套现行峰/谷档价会把成本高估约 50%（谷价 = 基础价 × 1.5）。半开区间：该
* 时刻及之后按峰谷档计。
*/
const PEAK_ERA_START_MS = Date.parse("2026-08-16T16:00:00Z");
/**
* 周末全谷规则分界（UTC 2026-08-22T16:00:00Z，即北京时间 2026-08-23 00:00）：
* 官方自此刻起周六/周日全天不区分峰谷（高峰时段收窄为工作日）；生效前的
* 周末仍按 v1 峰谷规则（周六日 9-12 / 14-18 同样是高峰时段）。历史事件的
* 档位判定按事件所在时段适用各自的规则，不得统一套现行规则重算历史。
*/
const WEEKEND_OFFPEAK_START_MS = Date.parse("2026-08-22T16:00:00Z");
/**
* DeepSeek V4 峰谷时代之前的官方基础价（CNY / 1M tokens）：官方中文定价页
* 峰谷改版前的基础价档（缓存写沿用历史规则按命中价计）。键为内置目录键，
* flash-vision-exp 与 flash 同价。仅当事件时刻早于 {@link PEAK_ERA_START_MS}
* 且条目未被用户价覆盖（用户价是实付价，优先于一切内置口径）时启用；
* 币种固定 CNY——内置 DeepSeek 目录即人民币刊例，不随 live 覆盖漂移。
*/
const LEGACY_DEEPSEEK_BANDS = {
	flash: {
		input: 1,
		cacheHit: .02,
		output: 2
	},
	"flash-vision-exp": {
		input: 1,
		cacheHit: .02,
		output: 2
	},
	pro: {
		input: 3,
		cacheHit: .025,
		output: 6
	}
};
/**
* 工作日高峰时段判定（北京时间，UTC+8，无夏令时）：09:00–12:00、14:00–18:00。
* 周末（周六/周日）北京全天为低谷，不调用本函数判定峰/平。
* @param beijingHour - 北京时间的小时数（0–23）。
*/
function isPeakHour(beijingHour) {
	return beijingHour >= 9 && beijingHour < 12 || beijingHour >= 14 && beijingHour < 18;
}
/**
* 由时刻（epoch 毫秒）推断计费时段；时刻未知/非法时按高峰计（保守：未知
* 时刻不低估成本，与社区 dsh-usage-chart 的 tierAt 语义一致）。
* 周末（北京时间周六/周日）全天不区分峰谷，统一按低谷价。
* @param timeMs - Unix epoch 毫秒；null/undefined/NaN 视为未知。
*/
function tierAt(timeMs) {
	if (timeMs === null || timeMs === void 0 || !Number.isFinite(timeMs)) return "peak";
	if (isBeijingWeekend(timeMs)) return "offPeak";
	return isPeakHour((new Date(timeMs).getUTCHours() + 8) % 24) ? "peak" : "offPeak";
}
/** 时刻是否落在北京时间周末（周六/周日）。 */
function isBeijingWeekend(timeMs) {
	const day = new Date(timeMs + 288e5).getUTCDay();
	return day === 0 || day === 6;
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
		key: "glm-5.3-flash",
		name: "GLM-5.3-Flash",
		provider: "智谱 AI",
		colorVar: "dsw-static-blue-300",
		price: {
			currency: "CNY",
			input: .8,
			cacheHit: .23,
			output: 2.8
		},
		promo: {
			factor: .5,
			endsAtMs: Date.UTC(2026, 8, 8, 16, 0, 0),
			note: "限时 5 折"
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
		key: "glm-4.5-air",
		name: "GLM-4.5-Air",
		provider: "智谱 AI",
		colorVar: "dsw-static-blue-300",
		price: {
			currency: "CNY",
			input: .8,
			cacheHit: .16,
			output: 2
		}
	},
	{
		key: "glm-4.7",
		name: "GLM-4.7",
		provider: "智谱 AI",
		colorVar: "dsw-static-blue-400",
		price: {
			currency: "CNY",
			input: 4,
			cacheHit: 1,
			output: 16
		},
		estimated: true
	},
	{
		key: "glm-5-turbo",
		name: "GLM-5-Turbo",
		provider: "智谱 AI",
		colorVar: "dsw-static-blue-500",
		price: {
			currency: "CNY",
			input: 5,
			cacheHit: 1.2,
			output: 22
		}
	},
	{
		key: "glm-5.1",
		name: "GLM-5.1",
		provider: "智谱 AI",
		colorVar: "dsw-static-blue-600",
		price: {
			currency: "CNY",
			input: 6,
			cacheHit: 1.2,
			output: 24
		}
	},
	{
		key: "glm-5v-turbo",
		name: "GLM-5V-Turbo",
		provider: "智谱 AI",
		colorVar: "dsw-static-blue-300",
		price: {
			currency: "CNY",
			input: 5,
			cacheHit: 1.2,
			output: 22
		}
	},
	{
		key: "qwen-3.8-max",
		name: "Qwen3.8 Max",
		provider: "阿里通义",
		colorVar: "dsw-static-blue-600",
		price: {
			currency: "CNY",
			input: 12,
			cacheHit: 1.5,
			output: 36
		},
		extraRows: [
			{
				label: "显式缓存创建",
				input: 15
			},
			{
				label: "显式缓存命中",
				input: 1
			},
			{
				label: "Batch File",
				input: 6,
				output: 18,
				note: "长期半价"
			},
			{
				label: "Batch Chat",
				input: 12,
				output: 36,
				note: "与标准价一致"
			}
		]
	},
	{
		key: "qwen-3.8-flash",
		name: "Qwen3.8 Flash",
		provider: "阿里通义",
		colorVar: "dsw-static-blue-400",
		price: {
			currency: "CNY",
			input: 1,
			cacheHit: .1,
			output: 3
		},
		extraRows: [
			{
				label: "显式缓存创建",
				input: 1.25
			},
			{
				label: "显式缓存命中",
				input: .1
			},
			{
				label: "Batch File",
				input: .5,
				output: 1.5,
				note: "长期半价"
			},
			{
				label: "Batch Chat",
				input: 1,
				output: 3,
				note: "与标准价一致"
			}
		]
	},
	{
		key: "qwen-max",
		name: "Qwen3.7-Max",
		provider: "阿里通义",
		colorVar: "dsw-static-blue-300",
		price: {
			currency: "CNY",
			input: 12,
			cacheHit: 1.2,
			output: 36
		},
		promo: {
			factor: .5,
			note: "限时 5 折"
		},
		extraRows: [
			{
				label: "显式缓存创建",
				input: 15
			},
			{
				label: "显式缓存命中",
				input: 1.2
			},
			{
				label: "Batch File",
				input: 6,
				output: 18,
				note: "长期半价"
			},
			{
				label: "Batch Chat",
				input: 12,
				output: 36,
				note: "与标准价一致"
			}
		]
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
		},
		extraRows: [
			{
				label: "显式缓存创建",
				input: 1
			},
			{
				label: "显式缓存命中",
				input: .08
			},
			{
				label: "Batch File",
				input: .4,
				output: 2.4,
				note: "长期半价"
			},
			{
				label: "Batch Chat",
				input: .8,
				output: 4.8,
				note: "与标准价一致"
			}
		]
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
		},
		extraRows: [{
			label: "显式缓存创建",
			input: .25
		}, {
			label: "显式缓存命中",
			input: .02
		}]
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
		key: "doubao-seed-evolving",
		name: "Doubao-Seed-Evolving",
		provider: "字节豆包",
		colorVar: "dsw-static-red-500",
		price: {
			currency: "CNY",
			input: 6,
			cacheHit: 1.2,
			output: 30
		}
	},
	{
		key: "doubao-seed-2.1-pro",
		name: "Doubao Seed-2.1 Pro",
		provider: "字节豆包",
		colorVar: "dsw-static-red-400",
		price: {
			currency: "CNY",
			input: 6,
			cacheHit: 1.2,
			output: 30
		}
	},
	{
		key: "doubao-seed-2.1-turbo",
		name: "Doubao Seed-2.1 Turbo",
		provider: "字节豆包",
		colorVar: "dsw-static-red-300",
		price: {
			currency: "CNY",
			input: 3,
			cacheHit: .6,
			output: 15
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
			input: 1,
			cacheHit: .02,
			output: 2
		}
	},
	{
		key: "mimo-v2.5-pro",
		name: "MiMo V2.5 Pro",
		provider: "小米",
		colorVar: "dsw-static-green-400",
		price: {
			currency: "CNY",
			input: 3,
			cacheHit: .025,
			output: 6
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
		key: "minimax-m2.7",
		name: "MiniMax-M2.7",
		provider: "MiniMax",
		colorVar: "dsw-static-amber-400",
		price: {
			currency: "CNY",
			input: 2.1,
			cacheHit: .42,
			output: 8.4
		}
	},
	{
		key: "minimax-m2.7-highspeed",
		name: "MiniMax-M2.7-highspeed",
		provider: "MiniMax",
		colorVar: "dsw-static-amber-500",
		price: {
			currency: "CNY",
			input: 4.2,
			cacheHit: .42,
			output: 16.8
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
		},
		estimated: true
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
		},
		estimated: true
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
		peakHours: "Standard / Flex",
		tierSemantics: "latency"
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
		peakHours: "Standard / Flex",
		tierSemantics: "latency"
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
		key: "claude-opus-4-6",
		name: "Claude Opus 4.6",
		provider: "Anthropic",
		colorVar: "dsw-static-red-500",
		price: {
			currency: "USD",
			input: 5,
			cacheHit: .5,
			output: 25
		}
	},
	{
		key: "claude-sonnet-4-6",
		name: "Claude Sonnet 4.6",
		provider: "Anthropic",
		colorVar: "dsw-static-red-400",
		price: {
			currency: "USD",
			input: 3,
			cacheHit: .3,
			output: 15
		}
	},
	{
		key: "claude-haiku-4-5",
		name: "Claude Haiku 4.5",
		provider: "Anthropic",
		colorVar: "dsw-static-red-300",
		price: {
			currency: "USD",
			input: 1,
			cacheHit: .1,
			output: 5
		}
	},
	{
		key: "claude-opus-5",
		name: "Claude Opus 5",
		provider: "Anthropic",
		colorVar: "dsw-static-red-500",
		price: {
			currency: "USD",
			input: 5,
			cacheHit: .5,
			output: 25
		}
	},
	{
		key: "claude-sonnet-5",
		name: "Claude Sonnet 5",
		provider: "Anthropic",
		colorVar: "dsw-static-red-400",
		price: {
			currency: "USD",
			input: 2,
			cacheHit: .2,
			output: 10
		}
	},
	{
		key: "mistral-large-2512",
		name: "Mistral Large 3",
		provider: "Mistral AI",
		colorVar: "dsw-static-violet-500",
		price: {
			currency: "USD",
			input: .5,
			cacheHit: .05,
			output: 1.5
		}
	},
	{
		key: "mistral-small-2603",
		name: "Mistral Small 4",
		provider: "Mistral AI",
		colorVar: "dsw-static-violet-400",
		price: {
			currency: "USD",
			input: .15,
			cacheHit: .015,
			output: .6
		}
	},
	{
		key: "ministral-8b-latest",
		name: "Ministral 8B",
		provider: "Mistral AI",
		colorVar: "dsw-static-violet-300",
		price: {
			currency: "USD",
			input: .1,
			cacheHit: .01,
			output: .1
		}
	},
	{
		key: "command-a-03-2025",
		name: "Command A",
		provider: "Cohere",
		colorVar: "dsw-static-cyan-500",
		price: {
			currency: "USD",
			input: 2.5,
			cacheHit: .25,
			output: 10
		}
	},
	{
		key: "command-r-08-2024",
		name: "Command R",
		provider: "Cohere",
		colorVar: "dsw-static-cyan-400",
		price: {
			currency: "USD",
			input: .15,
			cacheHit: .015,
			output: .6
		}
	},
	{
		key: "longcat-2.0",
		name: "LongCat 2.0",
		provider: "美团",
		colorVar: "dsw-static-amber-500",
		price: {
			currency: "CNY",
			input: 4,
			cacheHit: .8,
			output: 16
		},
		estimated: true
	},
	{
		key: "minicpm-v-4.5",
		name: "MiniCPM-V 4.5",
		provider: "面壁智能",
		colorVar: "dsw-static-green-500",
		price: {
			currency: "CNY",
			input: 1,
			cacheHit: .2,
			output: 4
		},
		estimated: true
	},
	{
		key: "ernie-4.5",
		name: "ERNIE-4.5 300B",
		provider: "百度文心",
		colorVar: "dsw-static-blue-300",
		price: {
			currency: "CNY",
			input: 2,
			cacheHit: .4,
			output: 8
		},
		estimated: true
	},
	{
		key: "dots-3-note-preview",
		name: "Dots3-Note Preview",
		provider: "小红书",
		colorVar: "dsw-static-red-500",
		price: {
			currency: "CNY",
			input: 2,
			cacheHit: .4,
			output: 8
		},
		estimated: true
	},
	{
		key: "qwen3.6-max",
		name: "Qwen3.6 Max",
		provider: "阿里通义",
		colorVar: "dsw-static-orange-500",
		price: {
			currency: "CNY",
			input: 9,
			cacheHit: .9,
			output: 54
		},
		extraRows: [{
			label: "显式缓存创建",
			input: 11.25
		}, {
			label: "显式缓存命中",
			input: .9
		}]
	},
	{
		key: "qwen3-coder-plus",
		name: "Qwen3-Coder Plus",
		provider: "阿里通义",
		colorVar: "dsw-static-orange-400",
		price: {
			currency: "CNY",
			input: 4,
			cacheHit: .8,
			output: 16
		},
		extraRows: [{
			label: "显式缓存创建",
			input: 5
		}, {
			label: "显式缓存命中",
			input: .4
		}]
	},
	{
		key: "qwen3-coder",
		name: "Qwen3-Coder 480B",
		provider: "阿里通义",
		colorVar: "dsw-static-orange-300",
		price: {
			currency: "CNY",
			input: 4,
			cacheHit: .8,
			output: 16
		},
		estimated: true
	},
	{
		key: "glm-4.5-x",
		name: "GLM-4.5-X",
		provider: "智谱 AI",
		colorVar: "dsw-static-blue-400",
		price: {
			currency: "CNY",
			input: 4,
			cacheHit: 1,
			output: 16
		},
		estimated: true
	},
	{
		key: "glm-5.2-fast",
		name: "GLM-5.2 Fast",
		provider: "智谱 AI",
		colorVar: "dsw-static-blue-300",
		price: {
			currency: "CNY",
			input: 6,
			cacheHit: 1.2,
			output: 24
		},
		estimated: true
	},
	{
		key: "kimi-k3-fast",
		name: "Kimi K3 Fast",
		provider: "月之暗面",
		colorVar: "dsw-static-cyan-400",
		price: {
			currency: "CNY",
			input: 20,
			cacheHit: 2,
			output: 100
		},
		estimated: true
	},
	{
		key: "kimi-k2.7-code-fast",
		name: "Kimi K2.7 Code Fast",
		provider: "月之暗面",
		colorVar: "dsw-static-cyan-400",
		price: {
			currency: "CNY",
			input: 6.5,
			cacheHit: 1.3,
			output: 27
		},
		estimated: true
	},
	{
		key: "kimi-k2.6-fast",
		name: "Kimi K2.6 Fast",
		provider: "月之暗面",
		colorVar: "dsw-static-cyan-300",
		price: {
			currency: "CNY",
			input: 6.5,
			cacheHit: 1.1,
			output: 27
		},
		estimated: true
	},
	{
		key: "kimi-k2.6-turbo",
		name: "Kimi K2.6 Turbo",
		provider: "月之暗面",
		colorVar: "dsw-static-cyan-300",
		price: {
			currency: "CNY",
			input: 6.5,
			cacheHit: 1.1,
			output: 27
		},
		estimated: true
	},
	{
		key: "kimi-k2-thinking-turbo",
		name: "Kimi K2 Thinking Turbo",
		provider: "月之暗面",
		colorVar: "dsw-static-cyan-300",
		price: {
			currency: "CNY",
			input: 8,
			cacheHit: 1,
			output: 58
		}
	},
	{
		key: "doubao-seed-2.0-code",
		name: "Doubao Seed-2.0 Code",
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
		key: "doubao-seed-2.0-lite",
		name: "Doubao Seed-2.0 Lite",
		provider: "字节豆包",
		colorVar: "dsw-static-red-300",
		price: {
			currency: "CNY",
			input: .6,
			cacheHit: .12,
			output: 3.6
		}
	},
	{
		key: "other",
		name: "其他模型",
		provider: "Custom",
		colorVar: "dsw-static-neutral-bluish-500",
		price: {
			currency: "CNY",
			input: 0,
			cacheHit: 0,
			cacheMiss: 0,
			output: 0
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
	"glm-4.5-air": "glm-4.5-air",
	"glm-4.5air": "glm-4.5-air",
	"glm-4.7": "glm-4.7",
	"glm-5-turbo": "glm-5-turbo",
	"glm-5.1": "glm-5.1",
	"glm-5.3-flash": "glm-5.3-flash",
	"glm-5v-turbo": "glm-5v-turbo",
	"glm-5v.1": "glm-5v-turbo",
	"claude-opus-4-6": "claude-opus-4-6",
	"claude-opus-4.6": "claude-opus-4-6",
	"claude-sonnet-4-6": "claude-sonnet-4-6",
	"claude-sonnet-4.6": "claude-sonnet-4-6",
	"claude-haiku-4-5": "claude-haiku-4-5",
	"claude-haiku-4.5": "claude-haiku-4-5",
	"claude-opus-5": "claude-opus-5",
	"claude-sonnet-5": "claude-sonnet-5",
	"mistral-large-2512": "mistral-large-2512",
	"mistral-large-3": "mistral-large-2512",
	"mistral-small-2603": "mistral-small-2603",
	"mistral-small-4": "mistral-small-2603",
	"ministral-8b-latest": "ministral-8b-latest",
	"ministral-8b": "ministral-8b-latest",
	"command-a-03-2025": "command-a-03-2025",
	"command-a": "command-a-03-2025",
	"command-r-08-2024": "command-r-08-2024",
	"command-r": "command-r-08-2024",
	"hy3": "hunyuan",
	"longcat-2.0": "longcat-2.0",
	"longcat-2": "longcat-2.0",
	"minicpm-v-4.5": "minicpm-v-4.5",
	"minicpm-v-4.5-thinking": "minicpm-v-4.5",
	"ernie-4.5": "ernie-4.5",
	"ernie-4.5-300b": "ernie-4.5",
	"dots-3-note-preview": "dots-3-note-preview",
	"dots-3-note": "dots-3-note-preview",
	"dots3-note-preview": "dots-3-note-preview",
	"rednote-dots3": "dots-3-note-preview",
	"doubao-seed-evolving": "doubao-seed-evolving",
	"doubao-seed-evolve": "doubao-seed-evolving",
	"doubao-seed-2.1-pro": "doubao-seed-2.1-pro",
	"doubao-seed-2.1-pro-290000": "doubao-seed-2.1-pro",
	"doubao-seed-2.1-turbo": "doubao-seed-2.1-turbo",
	"doubao-seed-2-1-turbo": "doubao-seed-2.1-turbo",
	"qwen3.8-max": "qwen-3.8-max",
	"qwen3.8-flash": "qwen-3.8-flash",
	"qwen3.7-max": "qwen-max",
	"qwen3.6-max": "qwen3.6-max",
	"qwen3.6-max-preview": "qwen3.6-max",
	"qwen3-coder-plus": "qwen3-coder-plus",
	"qwen3-coder": "qwen3-coder",
	"qwen3-coder-480b": "qwen3-coder",
	"glm-4.5-x": "glm-4.5-x",
	"glm-4.5x": "glm-4.5-x",
	"glm-5.2-fast": "glm-5.2-fast",
	"glm-5.2f": "glm-5.2-fast",
	"kimi-k3-fast": "kimi-k3-fast",
	"kimi-k3f": "kimi-k3-fast",
	"kimi-k2.7-code-fast": "kimi-k2.7-code-fast",
	"kimi-k2.7-code-f": "kimi-k2.7-code-fast",
	"kimi-k2.6-fast": "kimi-k2.6-fast",
	"kimi-k2.6-turbo": "kimi-k2.6-turbo",
	"kimi-k2-thinking-turbo": "kimi-k2-thinking-turbo",
	"doubao-seed-2.0-code": "doubao-seed-2.0-code",
	"doubao-seed-2-0-code": "doubao-seed-2.0-code",
	"doubao-seed-2.0-lite": "doubao-seed-2.0-lite",
	"doubao-seed-2-0-lite": "doubao-seed-2.0-lite",
	"qwen-max": "qwen-max",
	"hunyuan-t1": "hunyuan-t1",
	"step-3.7-flash": "step",
	"seed-2.0-mini": "doubao-mini",
	"k3": "kimi-k3",
	"kimi-k3": "kimi-k3",
	"minimax-m1": "minimax",
	"minimax-m2": "minimax",
	"minimax-m3": "minimax",
	"minimax-m2.7": "minimax-m2.7",
	"minimax-m2.7-highspeed": "minimax-m2.7-highspeed",
	"minimax-m2.7-high-speed": "minimax-m2.7-highspeed",
	"minimax-m2-7": "minimax-m2.7",
	"minimax-m2-7-highspeed": "minimax-m2.7-highspeed",
	"minimax-m2-7-high-speed": "minimax-m2.7-highspeed"
};
/**
* 模型 id 归一化：小写、去括号附注（如 `gpt5.6 luna(go)` 只看主体）、再去所有
* 非字母数字分隔符（空格 / 横杠 / 点 / 下划线）。用于日志里的模型 id 与计费
* 目录键做宽松匹配，提升「大小写/分隔符差异导致未收录」的识别率。
* @param id - 原始模型 id（日志或目录键）。
* @returns 归一化键（字母数字小写串）。
*/
function canonModelId(id) {
	return String(id).toLowerCase().replace(/\([^)]*\)/g, "").replace(/[^a-z0-9]+/g, "");
}
/**
* 目录常量键的归一化索引：归一化键 → 真实计费键。只索引静态来源（内置目录、
* 别名表、dsh-spend 兜底键）；models.dev 补充条目是运行时注入，单独实时匹配。
*/
const CATALOG_CANON_INDEX = (() => {
	const map = /* @__PURE__ */ new Map();
	const add = (candidate, target) => {
		const canon = canonModelId(candidate);
		if (canon !== "" && !map.has(canon)) map.set(canon, target);
	};
	for (const entry of MODEL_CATALOG) add(entry.key, entry.key);
	for (const [alias, key] of Object.entries(MODEL_KEY_ALIASES)) add(alias, key);
	for (const rate of FALLBACK_RATES) add(rate.key, rate.key);
	return map;
})();
/**
* 解析真实日志模型 id → 计费目录键。先精确别名映射（既有行为）；未命中时做
* 归一化匹配（忽略大小写/分隔符/括号附注），命中内置目录 / 别名目标 / 兜底键 /
* models.dev 补充键即返回其真实键；完全未知时保持原样（回退 other，不计费）。
* 供聚合层折叠与客户端渲染共用，两侧一致。
* @param id - 真实模型 id（日志里出现的形式）。
* @returns 计费目录键。
*/
/**
* 由一个未知模型 id 派生候选 id（仅当直接查全部未命中时才尝试）：
* - 剥离组织前缀（`deepseek/deepseek-v4-flash` → `deepseek-v4-flash`）；
* - 剥离尾部纯数字段（`deepseek-v4-flash-202605` / `-0731` → `deepseek-v4-flash`，
*   覆盖 TokenHub / 官方按日期滚动的快照 id）；
* - 两者组合派生。目录键本身（如 `mistral-large-2512`、`command-a-03-2025`）
*   在直接查就已命中，永不进入派生分支，不受剥段影响。
*/
function derivedKeyCandidates(id) {
	const out = [];
	const push = (value) => {
		if (value !== "" && !out.includes(value)) out.push(value);
	};
	const stripTrailingDigits = (value) => {
		let base = value;
		for (;;) {
			const next = base.replace(/[-_]\d{3,}$/u, "");
			if (next === base || next === "") return;
			base = next;
			push(base);
		}
	};
	const slash = id.lastIndexOf("/");
	if (slash > 0 && slash < id.length - 1) {
		const bare = id.slice(slash + 1);
		push(bare);
		stripTrailingDigits(bare);
	}
	stripTrailingDigits(id);
	return out;
}
/** 查一个候选 id（用户别名 → 内置别名 → 目录归一化 → models.dev 补充）；未命中返回 undefined。 */
function lookupCandidate(candidate) {
	const alias = userModelAliases?.[candidate] ?? MODEL_KEY_ALIASES[candidate];
	if (alias !== void 0) return alias;
	const canon = canonModelId(candidate);
	if (canon === "") return void 0;
	const hit = CATALOG_CANON_INDEX.get(canon);
	if (hit !== void 0) return hit;
	return (liveExtraModels ?? []).find((item) => canonModelId(item.key) === canon)?.key;
}
function resolveCatalogKey(id) {
	const exact = userModelAliases?.[id] ?? MODEL_KEY_ALIASES[id] ?? id;
	if (exact === id) {
		const canon = canonModelId(id);
		if (canon !== "") {
			const hit = CATALOG_CANON_INDEX.get(canon);
			if (hit !== void 0) return hit;
			const extraHit = (liveExtraModels ?? []).find((item) => canonModelId(item.key) === canon);
			if (extraHit !== void 0) return extraHit.key;
		}
		for (const candidate of derivedKeyCandidates(id)) {
			const hit = lookupCandidate(candidate);
			if (hit !== void 0) return hit;
		}
	}
	return exact;
}
/** 取一个计费键的实时单价（实时覆盖 > dsh-spend 官方价兜底）。 */
function livePriceOf(key) {
	const resolved = resolveCatalogKey(key);
	const live = livePrices?.[resolved];
	if (live !== void 0) return live;
	const fallback = FALLBACK_RATES.find((rate) => rate.key.toLowerCase() === resolved.toLowerCase());
	if (fallback === void 0) return void 0;
	return {
		input: fallback.input,
		cacheHit: fallback.cacheHit,
		output: fallback.output
	};
}
/** Lookup a model by its stats key; falls back to the generic `other` entry. */
function modelOf(key) {
	const resolved = resolveCatalogKey(key);
	const found = MODEL_CATALOG.find((entry) => entry.key === resolved);
	const extra = liveExtraModels?.find((item) => item.key === resolved);
	const base = found ?? (extra !== void 0 ? extraEntryOf(extra) : (() => {
		const fallback = MODEL_CATALOG.at(-1);
		if (fallback !== void 0) return fallback;
		throw new Error("MODEL_CATALOG must not be empty");
	})());
	const live = livePriceOf(resolved);
	if (live === void 0) return base;
	return {
		...base,
		price: {
			currency: "USD",
			input: live.input,
			cacheHit: live.cacheHit,
			output: live.output
		}
	};
}
/** models.dev 补充条目转为目录条目：USD 直价（走汇率换算），无峰谷分档。 */
function extraEntryOf(extra) {
	return {
		key: extra.key,
		name: extra.name,
		provider: extra.provider,
		colorVar: "dsw-static-neutral-400",
		price: {
			currency: "USD",
			input: extra.price.input,
			cacheHit: extra.price.cacheHit,
			output: extra.price.output
		}
	};
}
/**
* 模型是否可计价：内置目录、models.dev 补充、或 dsh-spend 官方价兜底命中。
* 聚合层的计价闸门（目录外模型不产生费用，避免兜底档误估）。
*/
function isPriced(key) {
	const resolved = resolveCatalogKey(key);
	if (MODEL_CATALOG.some((entry) => entry.key === resolved)) return true;
	if ((liveExtraModels ?? []).some((item) => item.key === resolved)) return true;
	return FALLBACK_RATES.some((rate) => rate.key.toLowerCase() === resolved.toLowerCase());
}
/**
* 促销在 nowMs 是否生效：factor 必须落在 (0,1) 区间，截止时刻及之后视为过期；
* endsAtMs 缺省表示长期活动，在 factor 合法期间持续生效。
* 导出供测试：纯函数。
* @param promo - 待判定的促销窗口。
* @param nowMs - 判定时刻（epoch ms）。
*/
function isPromoActive(promo, nowMs) {
	const expired = promo.endsAtMs !== void 0 && nowMs >= promo.endsAtMs;
	return Number.isFinite(nowMs) && !expired && promo.factor > 0 && promo.factor < 1;
}
/**
* 把限时促销折入条目单价：生效期内返回 price 主档与 offPeak 全部乘 factor 的
* 副本，其余字段原样保留；不在促销期（过期/未开始/factor 非法）原样返回。
* 幂等由调用方保证——计价与费率表显示各自只折一次，勿对已折价副本重复应用。
* @param entry - 目录条目（price 保持刊例价口径）。
* @param nowMs - 判定时刻（epoch ms）。
*/
function applyPromo(entry, nowMs) {
	const { promo } = entry;
	if (promo === void 0 || !isPromoActive(promo, nowMs)) return entry;
	const scaled = (band) => ({
		input: band.input * promo.factor,
		cacheHit: band.cacheHit * promo.factor,
		...band.cacheMiss !== void 0 ? { cacheMiss: band.cacheMiss * promo.factor } : {},
		output: band.output * promo.factor
	});
	return {
		...entry,
		price: {
			...scaled(entry.price),
			currency: entry.price.currency,
			...entry.price.offPeak !== void 0 ? { offPeak: scaled(entry.price.offPeak) } : {}
		}
	};
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
function computeCost(entry, buckets, peakShare = DEFAULT_PEAK_SHARE, nowMs = Date.now()) {
	const priced = applyPromo(entry, nowMs);
	const peak = priceBandCost(priced.price, buckets, priced.price.currency);
	const off = priced.price.offPeak === void 0 ? peak : priceBandCost(priced.price.offPeak, buckets, priced.price.currency);
	return peak * peakShare + off * (1 - peakShare);
}
/**
* v1 峰谷档判定（峰谷开闸起、周末全谷分界止）：不豁免周末——该时段官方
* 高峰时段为每天 9-12 / 14-18（周六日同样计峰）。仅用于历史事件计费；
* 「当前时刻」的档位（提醒/时段条/费率展示）一律走 {@link tierAt} 现行规则。
*/
function tariffV1At(timeMs) {
	return isPeakHour((new Date(timeMs).getUTCHours() + 8) % 24) ? "peak" : "offPeak";
}
/**
* 按调用时刻精确判定高峰/空闲档并计价（P0-1：替代固定比例混合）。时刻未知
* （null/NaN，理论不发生在真实事件流）时回退 {@link DEFAULT_PEAK_SHARE} 混合，
* 保持旧语义不低估。平档模型（无 offPeak）两个时段同价。限时促销与峰谷档
* 同口径：按事件时刻判定该笔流量当时享受的单价。
*
* 历史正确性（按变更节点分段适用规则，不统一套现行价重算历史）：
* - 早于 {@link PEAK_ERA_START_MS} 的事件按当时官方基础价
*   （{@link LEGACY_DEEPSEEK_BANDS}）计费；
* - 峰谷开闸至 {@link WEEKEND_OFFPEAK_START_MS} 之间按 v1 规则（周末不豁免，
*   周六日 9-12 / 14-18 计峰）；
* - 周末全谷分界起按现行规则（{@link tierAt}，周六日全天低谷）。
* @param entry - the catalog entry whose prices apply.
* @param buckets - token usage counts.
* @param timeMs - the call's wall-clock time (epoch ms); null falls back to the peak-share mix.
* @param peakShare - fallback mix used only when `timeMs` is missing.
* @returns the estimated cost in CNY（USD 计价模型已按当前汇率折算）。
*/
function computeCostAt(entry, buckets, timeMs, peakShare = DEFAULT_PEAK_SHARE) {
	if (timeMs === null || timeMs === void 0 || !Number.isFinite(timeMs)) return computeCost(entry, buckets, peakShare);
	const priced = applyPromo(entry, timeMs);
	const legacy = timeMs < PEAK_ERA_START_MS && entry.userPriced !== true ? LEGACY_DEEPSEEK_BANDS[entry.key] : void 0;
	if (legacy !== void 0) return priceBandCost(legacy, buckets, "CNY");
	if (priced.price.offPeak === void 0) return priceBandCost(priced.price, buckets, priced.price.currency);
	return priceBandCost((timeMs < WEEKEND_OFFPEAK_START_MS ? tariffV1At(timeMs) : tierAt(timeMs)) === "peak" ? priced.price : priced.price.offPeak, buckets, priced.price.currency);
}
/**
* Format an amount with adaptive precision and the given currency symbol.
* @param amount - the amount (CNY by default; pass `usd` for dollar display).
* @param currency - display currency; default `cny`.
*/
function formatMoney(amount, currency = "cny") {
	const value = Number(amount);
	if (!Number.isFinite(value)) return currency === "cny" ? "¥0" : "$0";
	const symbol = currency === "cny" ? "¥" : "$";
	if (value <= 0) return `${symbol}0`;
	if (value >= 1e3) return `${symbol}${value.toFixed(0)}`;
	if (value >= 10) return `${symbol}${value.toFixed(1)}`;
	if (value >= .1) return `${symbol}${value.toFixed(2)}`;
	return `${symbol}${value.toFixed(3)}`;
}
/** Format a large token count with B/M/K suffix. */
function formatTokens(value) {
	if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
	if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
	if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
	return String(value);
}
//#endregion
//#region lib/types/aggregate.js
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
/**
* 走订阅套餐（coding / token plan / opencode 订阅）的 provider id：这些通道的
* 调用按套餐计费，不再按 token 计费，因此即使模型 id 与计费表撞名也一律豁免。
* 此列表保留为显式配置的参考基线；聚合层缺省改用与订阅卡一致的
* `isSubscriptionProviderId` 判定（覆盖本列表与全部 `*-token-plan` / `*-coding` 变体），
* 部署仍可在 plugin config 的 `subscriptionProviders` 中显式覆盖。
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
	"xiaomi-token-plan-sgp",
	"tencent-token-plan"
];
/**
* 官方渠道 provider id 判定：`deepseek` 前缀（DeepSeek 官方直连）视为官方，
* 其余 provider（第三方中转/代理）视为「三方」。用于「官方 vs 三方」token、
* 调用与费用分桶展示；部署可由配置覆盖（见 {@link AggregateOptions}）。
*/
function isOfficialProvider(provider) {
	return /^deepseek(?:-[a-z0-9-]+)?$/i.test(provider.trim());
}
/** DeepSeek 官方直连端点的归一化 origin（`siteOriginOf` 口径）：有 baseURL 的路由只有它算官方。 */
const OFFICIAL_DEEPSEEK_ORIGIN = "https://api.deepseek.com";
/**
* 官方渠道判定（通道优先）：显式 `officialProviderIds` 配置最优先；否则看站点归组——
* 有 baseURL 的路由只有 origin 为 DeepSeek 官方域才算官方（修复：名为 `deepseek-*`
* 的中转/网关路由曾被按 id 前缀误判为官方，腾讯网关的 DeepSeek 全被计成官方渠道）；
* 直连路由（配置在册、无 baseURL）退回按 provider id 前缀判定；**不在当前配置里的
* 未知路由一律不算官方**（无法核实通道，不装确定——历史路由用 `routeAliases` 归位）。
*/
function officialChannelOf(provider, ref, officialProviderIds) {
	if (officialProviderIds !== void 0) return officialProviderIds.has(provider);
	if (ref.kind === "site") return ref.origin === OFFICIAL_DEEPSEEK_ORIGIN;
	if (ref.kind === "direct") return isOfficialProvider(provider);
	return false;
}
/** 一个 provider 是否走订阅套餐计费（豁免按 token 计价）。 */
function isSubscriptionCall(subscription, provider) {
	return typeof subscription === "function" ? subscription(provider) : subscription.has(provider);
}
/** 由 baseURL 归一化出站点 origin（协议 + 主机 + 端口）；解析失败回退原值。 */
function siteOriginOf(baseURL) {
	try {
		return new URL(baseURL).origin;
	} catch {
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
function siteRefOf(provider, routes) {
	const view = routes[provider];
	if (view !== void 0) {
		if (view.baseURL !== void 0) return {
			kind: "site",
			origin: siteOriginOf(view.baseURL),
			provider
		};
		return {
			kind: "direct",
			provider
		};
	}
	return {
		kind: "unknown",
		provider
	};
}
/** 站点桶的稳定 key：`site:<origin>` 与 `direct:<provider>` 分开，`unknown` 单一桶。 */
function siteBucketKey(ref) {
	if (ref.kind === "site") return `site:${ref.origin ?? ""}`;
	if (ref.kind === "direct") return `direct:${ref.provider}`;
	return "unknown";
}
/** Zeroed usage accumulator. */
function emptyUsage() {
	return {
		calls: 0,
		input: 0,
		output: 0,
		cacheHit: 0,
		cacheMiss: 0,
		cost: 0,
		reasoning: 0,
		officialCalls: 0,
		officialCost: 0
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
* @param official - whether the call went through the official DeepSeek channel (vs a third-party relay).
*/
function foldUsage(acc, usage, key, subscription, timeMs, official = false) {
	const cacheHit = usage.cacheReadTokens ?? 0;
	const cacheMiss = usage.inputTokens + (usage.cacheWriteTokens ?? 0);
	acc.calls += 1;
	acc.input += usage.inputTokens + cacheHit + (usage.cacheWriteTokens ?? 0);
	acc.output += usage.outputTokens;
	acc.reasoning += usage.reasoningTokens ?? 0;
	acc.cacheHit += cacheHit;
	acc.cacheMiss += cacheMiss;
	if ((usage.cacheWriteTokens ?? 0) > 0) acc.cacheWrite = (acc.cacheWrite ?? 0) + (usage.cacheWriteTokens ?? 0);
	if (official) acc.officialCalls += 1;
	if (!subscription && isPriced(key)) {
		const thisCost = computeCostAt(modelOf(key), {
			input: cacheHit + cacheMiss,
			cacheHit,
			cacheMiss,
			output: usage.outputTokens
		}, timeMs);
		acc.cost += thisCost;
		if (official) acc.officialCost += thisCost;
	}
}
/**
* Fold one auxiliary web-search LLM request (issue #15) into an accumulator.
* 这类调用绕过对话通道直连官方端点，日志只记请求（无响应/用量事件），token
* 不可知：按「每次估值」计入费用并单独累计 `searchCalls`，不产生 token 维度。
* @param acc - the accumulator to mutate.
* @param estimateCny - per-call cost estimate in CNY; 0 disables the estimate.
*/
function foldSearchCall(acc, estimateCny) {
	acc.calls += 1;
	acc.searchCalls = (acc.searchCalls ?? 0) + 1;
	acc.officialCalls += 1;
	if (estimateCny > 0) {
		acc.cost += estimateCny;
		acc.officialCost += estimateCny;
	}
}
/** Local-time date stamp (the host runs in the user's timezone). */
function dayStamp(time) {
	const date = new Date(time);
	const pad = (n) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
/** Local-time hour stamp `YYYY-MM-DDTHH` — the performance series bucket key. */
function hourStamp(time) {
	const date = new Date(time);
	const pad = (n) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}`;
}
/**
* 宿主进程的 IANA 时区名与 UTC 偏移，供面板标注「天按哪个时区切分」。
* `getTimezoneOffset` 是 UTC 以西的分钟数，符号与日常写法相反，故取反。
* @returns `{ name, offset }`，如 `{ name: "Asia/Shanghai", offset: "UTC+08:00" }`。
*/
function hostTimeZone(now = /* @__PURE__ */ new Date()) {
	const minutes = -now.getTimezoneOffset();
	const sign = minutes < 0 ? "-" : "+";
	const abs = Math.abs(minutes);
	const hh = String(Math.floor(abs / 60)).padStart(2, "0");
	const mm = String(abs % 60).padStart(2, "0");
	let name;
	try {
		name = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
	} catch {
		name = "UTC";
	}
	return {
		name,
		offset: `UTC${sign}${hh}:${mm}`
	};
}
/** 工作区名：取 cwd 的末级目录名；无 cwd 时返回 {@link UNKNOWN_WORKSPACE_NAME}。 */
function workspaceNameOf(cwd) {
	if (cwd === void 0 || cwd === "") return "—";
	return cwd.split(/[\\/]/).filter(Boolean).at(-1) ?? "—";
}
/** TTFT 尖峰阈值（毫秒）：超过计为一次尖峰样本，用于定位服务端抖动。 */
const PERF_SPIKE_MS = 1e4;
/**
* 账本迁移注册表。首条迁移给 1.0.6 及更早的行回填 foldVersion = 1（它们全部出自
* header 归因算法）；此后新写入的行总带当前 {@link FOLD_VERSION}。
*/
const LEDGER_MIGRATIONS = [{
	id: "fold-version-backfill",
	apply(document) {
		let changed = false;
		for (const session of document.sessions) if (session.foldVersion === void 0) {
			session.foldVersion = 1;
			changed = true;
		}
		return changed;
	}
}];
/**
* 在加载边界对账本文档应用未执行的迁移，并记录已应用 id 供写回。
* @param document - 从持久化读出的原始账本文档。
* @param migrations - 待执行的迁移注册表；缺省用模块级 {@link LEDGER_MIGRATIONS}。
* @returns 是否发生了需要重新落盘的修改。
*/
function runLedgerMigrations(document, migrations = LEDGER_MIGRATIONS) {
	const applied = new Set(document.appliedMigrations ?? []);
	let changed = false;
	for (const migration of migrations) {
		if (applied.has(migration.id)) continue;
		if (migration.apply(document)) changed = true;
		applied.add(migration.id);
	}
	if (applied.size > 0 && (document.appliedMigrations === void 0 || document.appliedMigrations.length !== applied.size || document.appliedMigrations.some((id) => !applied.has(id)))) {
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
		byDayModelsSite: Object.fromEntries([...fold.byDayModelsSite].map(([day, models]) => [day, Object.fromEntries([...models].map(([model, sites]) => [model, Object.fromEntries(sites)]))])),
		byTier: Object.fromEntries(fold.byTier),
		byTool: Object.fromEntries(fold.byTool),
		bySite: Object.fromEntries(fold.bySite),
		unpricedModels: [...fold.unpricedModels],
		planCalls: Object.fromEntries(fold.planCalls),
		turns: fold.turns,
		perf: fold.perf,
		roles: fold.roles,
		lastActive: fold.lastActive
	};
}
/** Restore a JSON-safe ledger fold into the in-memory Map/Set representation. */
function deserializeFold(fold) {
	return {
		total: fold.total,
		byModel: new Map(Object.entries(fold.byModel)),
		byDay: new Map(Object.entries(fold.byDay)),
		byDayModels: new Map(Object.entries(fold.byDayModels).map(([day, models]) => [day, new Map(Object.entries(models))])),
		byDayModelsSite: new Map(Object.entries(fold.byDayModelsSite ?? {}).map(([day, models]) => [day, new Map(Object.entries(models).map(([model, sites]) => [model, new Map(Object.entries(sites))]))])),
		byTier: new Map(Object.entries(fold.byTier ?? {})),
		byTool: new Map(Object.entries(fold.byTool ?? {})),
		bySite: new Map(Object.entries(fold.bySite)),
		unpricedModels: new Set(fold.unpricedModels),
		planCalls: new Map(Object.entries(fold.planCalls)),
		turns: fold.turns,
		perf: fold.perf,
		roles: fold.roles,
		lastActive: fold.lastActive
	};
}
/** Runtime boundary for a user-editable/corrupt ledger file. Invalid rows are ignored. */
function ledgerSessionsOf(value) {
	if (value === null || typeof value !== "object") return [];
	const document = value;
	if (document.version !== 1 || !Array.isArray(document.sessions)) return [];
	return document.sessions.filter((entry) => {
		if (entry === null || typeof entry !== "object") return false;
		const row = entry;
		if (typeof row.id !== "string" || row.id === "" || row.fold === null || typeof row.fold !== "object") return false;
		const fold = row.fold;
		return fold.total !== void 0 && fold.byModel !== void 0 && fold.byDay !== void 0 && fold.byDayModels !== void 0 && fold.bySite !== void 0 && Array.isArray(fold.unpricedModels) && fold.planCalls !== void 0 && Array.isArray(fold.turns) && Array.isArray(fold.perf) && fold.roles !== void 0 && typeof fold.lastActive === "number";
	});
}
/**
* 消息文本长度：user/tool 角色分摊输入成本的启发式依据。字符串内容取其
* 长度；内容块数组累计文本块长度；其余形状按 0 计（durable 边界收窄）。
*/
function messageTextLength(message) {
	if (message === null || typeof message !== "object") return 0;
	const content = message.content;
	if (typeof content === "string") return content.length;
	if (!Array.isArray(content)) return 0;
	let total = 0;
	for (const block of content) {
		const text = block?.text;
		if (typeof text === "string") total += text.length;
	}
	return total;
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
/** Get-or-create one day×model×site cell inside the three-dimensional map. */
function modelDaySiteCell(map, day, modelKey, siteKey) {
	let models = map.get(day);
	if (models === void 0) {
		models = /* @__PURE__ */ new Map();
		map.set(day, models);
	}
	let sites = models.get(modelKey);
	if (sites === void 0) {
		sites = /* @__PURE__ */ new Map();
		models.set(modelKey, sites);
	}
	return usageCell(sites, siteKey);
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
/** 空白折叠状态机（与全量折叠的初值逐字一致）。 */
function freshMachine() {
	return {
		key: "other",
		subscription: false,
		official: false,
		siteBucket: "unknown",
		turns: /* @__PURE__ */ new Map(),
		steps: /* @__PURE__ */ new Map(),
		lastOpenStepKey: void 0,
		toolSeen: /* @__PURE__ */ new Set()
	};
}
/** 空白 fold 的统一构造：foldSession 与聚合器的分片/增量路径共用同一字段初值。 */
function freshFold() {
	return {
		total: emptyUsage(),
		byModel: /* @__PURE__ */ new Map(),
		byDay: /* @__PURE__ */ new Map(),
		byDayModels: /* @__PURE__ */ new Map(),
		byDayModelsSite: /* @__PURE__ */ new Map(),
		byTier: /* @__PURE__ */ new Map(),
		byTool: /* @__PURE__ */ new Map(),
		bySite: /* @__PURE__ */ new Map(),
		unpricedModels: /* @__PURE__ */ new Set(),
		planCalls: /* @__PURE__ */ new Map(),
		turns: [],
		perf: [],
		roles: {
			userChars: 0,
			toolChars: 0,
			inputCost: 0,
			outputCost: 0
		},
		lastActive: 0
	};
}
/**
* 把一批事件折进既有 fold（状态机跨批次延续）。全量折叠、超大会话的分片折叠、
* 活跃会话的 seq 增量折叠共用同一段循环体，保证三种路径的字段语义逐字一致。
* @param fold - 累计目标（原地修改）。
* @param machine - 折叠状态机：进入时为上一批次末态，返回时为本批次末态。
* @param events - 本批次事件（日志顺序）。
* @param subscriptionProviders - 订阅套餐匹配器（显式集合或判定函数）。
* @param officialProviderIds - 官方直连 provider 集合（undefined = 按 {@link officialChannelOf} 通道判定）。
* @param routes - 当前 provider 路由视图（中转站归组）。
* @param searchCallEstimateCny - 联网搜索请求的单次费用估算（人民币元）。
* @param seedLength - fork 血缘边界（seq 低于它的事件是父会话种子，跳过）；
*   来源为存储元数据的 `inheritedEventCount`。
* @param routeAliases - 历史路由别名（旧路由名 → 当前路由名），改名/删除路由的
*   历史用量按别名归位，不再落「未知路由」桶。
*/
function foldInto(fold, machine, events, subscriptionProviders, officialProviderIds, routes, searchCallEstimateCny, seedLength, routeAliases = {}) {
	let key = machine.key;
	let subscription = machine.subscription;
	let official = machine.official;
	let siteBucket = machine.siteBucket;
	const turns = machine.turns;
	const steps = machine.steps;
	let lastOpenStepKey = machine.lastOpenStepKey;
	const toolSeen = machine.toolSeen;
	for (const event of events) {
		if (seedLength > 0 && typeof event.seq === "number" && Number.isFinite(event.seq) && event.seq < seedLength) continue;
		fold.lastActive = Math.max(fold.lastActive, event.time);
		if (event.type === "session/title") {
			const title = event.data.title;
			if (typeof title === "string" && title.length > 0) fold.title = title;
			continue;
		}
		if (event.type === "user/message") {
			fold.roles.userChars += messageTextLength(event.data.message);
			continue;
		}
		if (event.type === "tool/result") {
			fold.roles.toolChars += messageTextLength(event.data.message);
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
		if (event.type === "step/start") {
			const turn = event.data.turn;
			const step = event.data.step;
			if (typeof turn === "number" && typeof step === "number") {
				const stepKey = `${turn}:${step}`;
				steps.set(stepKey, { startTime: event.time });
				lastOpenStepKey = stepKey;
			}
			continue;
		}
		if (event.type === "request/header") {
			const { model, provider: rawProvider } = event.data.header.config;
			const provider = routeAliases[rawProvider] ?? rawProvider;
			key = resolveCatalogKey(model);
			subscription = isSubscriptionCall(subscriptionProviders, provider);
			const siteRef = siteRefOf(provider, routes);
			official = officialChannelOf(provider, siteRef, officialProviderIds);
			siteBucket = siteBucketKey(siteRef);
			if (lastOpenStepKey !== void 0) {
				const stepState = steps.get(lastOpenStepKey);
				if (stepState !== void 0 && stepState.requestTime === void 0) stepState.requestTime = event.time;
			}
			continue;
		}
		if (event.type === "web/deepseek-search-llm-request") {
			const model = event.data.body?.model;
			const modelKey = typeof model === "string" && model !== "" ? resolveCatalogKey(model) : "other";
			const day = dayStamp(event.time);
			const siteKey = siteBucketKey({
				kind: "direct",
				provider: "deepseek"
			});
			foldSearchCall(fold.total, searchCallEstimateCny);
			foldSearchCall(usageCell(fold.byModel, modelKey), searchCallEstimateCny);
			foldSearchCall(usageCell(fold.byDay, day), searchCallEstimateCny);
			foldSearchCall(modelDayCell(fold.byDayModels, day, modelKey), searchCallEstimateCny);
			foldSearchCall(modelDaySiteCell(fold.byDayModelsSite, day, modelKey, siteKey), searchCallEstimateCny);
			foldSearchCall(usageCell(fold.bySite, siteKey), searchCallEstimateCny);
			foldSearchCall(usageCell(fold.byTier, tierAt(event.time)), searchCallEstimateCny);
			continue;
		}
		if (event.type === "assistant/chunk") {
			const data = event.data;
			const turn = data.turn;
			const step = data.step;
			const chunk = data.chunk;
			if (typeof turn === "number" && typeof step === "number" && chunk !== void 0 && chunk.type !== "usage" && chunk.type !== "finish") {
				const state = steps.get(`${turn}:${step}`);
				if (state !== void 0) {
					if (state.firstContentTime === void 0) state.firstContentTime = event.time;
					state.lastContentTime = event.time;
				}
			}
			if (chunk?.type === "tool-call-delta" && typeof turn === "number" && typeof step === "number") {
				const index = chunk.index;
				const name = chunk.name;
				const seenKey = `${turn}:${step}:${typeof index === "number" ? index : "-"}`;
				if (!toolSeen.has(seenKey)) {
					toolSeen.add(seenKey);
					const toolName = typeof name === "string" && name !== "" ? name : "unknown";
					fold.byTool.set(toolName, (fold.byTool.get(toolName) ?? 0) + 1);
				}
			}
			continue;
		}
		if (event.type !== "assistant/message") continue;
		const usage = event.data.usage;
		if (usage === void 0) continue;
		const source = event.data.message?.source;
		if (source?.kind === "model" && typeof source.provider === "string" && typeof source.model === "string") {
			const provider = routeAliases[source.provider] ?? source.provider;
			key = resolveCatalogKey(source.model);
			subscription = isSubscriptionCall(subscriptionProviders, provider);
			const siteRef = siteRefOf(provider, routes);
			official = officialChannelOf(provider, siteRef, officialProviderIds);
			siteBucket = siteBucketKey(siteRef);
		}
		const modelKey = key;
		const day = dayStamp(event.time);
		if (!subscription && !isPriced(modelKey)) fold.unpricedModels.add(modelKey);
		foldUsage(fold.total, usage, modelKey, subscription, event.time, official);
		foldUsage(usageCell(fold.byModel, modelKey), usage, modelKey, subscription, event.time, official);
		foldUsage(usageCell(fold.byDay, day), usage, modelKey, subscription, event.time, official);
		foldUsage(modelDayCell(fold.byDayModels, day, modelKey), usage, modelKey, subscription, event.time, official);
		foldUsage(modelDaySiteCell(fold.byDayModelsSite, day, modelKey, siteBucket), usage, modelKey, subscription, event.time, official);
		foldUsage(usageCell(fold.bySite, siteBucket), usage, modelKey, subscription, event.time, official);
		foldUsage(usageCell(fold.byTier, tierAt(event.time)), usage, modelKey, subscription, event.time, official);
		if (subscription) fold.planCalls.set(modelKey, (fold.planCalls.get(modelKey) ?? 0) + 1);
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
				output: usage.outputTokens
			};
			const fullCost = computeCostAt(modelOf(modelKey), buckets, event.time);
			state.cost += fullCost;
			const outputCost = computeCostAt(modelOf(modelKey), {
				input: 0,
				cacheHit: 0,
				cacheMiss: 0,
				output: usage.outputTokens
			}, event.time);
			fold.roles.outputCost += outputCost;
			fold.roles.inputCost += fullCost - outputCost;
		}
		if (state.startedAt === Number.MAX_SAFE_INTEGER) state.startedAt = event.time;
		const stepNum = event.data.step;
		if (typeof stepNum === "number") {
			const perfState = steps.get(`${turn}:${stepNum}`);
			if (perfState !== void 0) {
				const sample = perfSampleOf(perfState, modelKey, usage.outputTokens ?? 0, event.time);
				if (sample !== void 0) fold.perf.push(sample);
				steps.delete(`${turn}:${stepNum}`);
			}
		}
	}
	machine.key = key;
	machine.subscription = subscription;
	machine.official = official;
	machine.siteBucket = siteBucket;
	machine.lastOpenStepKey = lastOpenStepKey;
}
/** 从轮次状态派生 fold.turns（每批次结束后重派生；半开轮次跨批次保留）。 */
function refreshTurns(fold, machine) {
	fold.turns = [...machine.turns.values()].filter((state) => state.input > 0 || state.output > 0).sort((a, b) => a.turn - b.turn).map((state) => ({
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
}
/**
* 生成一个 step 的性能样本；无效 / 超出 sane 上限（15 分钟）时返回 undefined，
* 避免单条异常记录（时区错位 / 服务端抖动）拉偏均值。
*/
function perfSampleOf(state, model, outputTokens, endTime) {
	const start = state.requestTime ?? state.startTime;
	const first = state.firstContentTime;
	const last = state.lastContentTime;
	if (start === void 0 || first === void 0 || first < start) return void 0;
	const ttftMs = first - start;
	if (!Number.isFinite(ttftMs) || ttftMs < 0 || ttftMs > 9e5) return void 0;
	const genMs = last !== void 0 && last > first ? last - first : void 0;
	const latencyMs = endTime >= start ? endTime - start : void 0;
	const tps = genMs !== void 0 && genMs > 0 && outputTokens > 0 ? outputTokens / (genMs / 1e3) : void 0;
	return {
		model,
		hour: hourStamp(endTime),
		ttftMs,
		...tps === void 0 || !Number.isFinite(tps) || tps <= 0 ? {} : { tps },
		estimated: state.requestTime === void 0,
		...latencyMs === void 0 ? {} : { latencyMs }
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
	if (cell.cacheWrite !== void 0) acc.cacheWrite = (acc.cacheWrite ?? 0) + cell.cacheWrite;
	acc.cost += cell.cost;
	acc.officialCalls += cell.officialCalls;
	acc.officialCost += cell.officialCost;
	if (cell.searchCalls !== void 0) acc.searchCalls = (acc.searchCalls ?? 0) + cell.searchCalls;
}
/** 均值（数组非空时调用；空数组按 0 兜底）。 */
function mean(values) {
	if (values.length === 0) return 0;
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}
/** 分位数（0..1）：先拷贝排序，再线性插值；空数组返回 0。 */
function percentile(values, p) {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const idx = (sorted.length - 1) * p;
	const lo = Math.floor(idx);
	const hi = Math.ceil(idx);
	if (lo === hi) {
		const value = sorted[lo];
		return value === void 0 ? 0 : value;
	}
	const a = sorted[lo];
	const b = sorted[hi];
	if (a === void 0 || b === void 0) return 0;
	return a + (b - a) * (idx - lo);
}
/**
* Create the incremental usage aggregator.
* @param persistence - the session persistence service.
* @param options - aggregation tuning (e.g. subscription-plan providers).
* @returns the aggregator holding the per-session fold cache.
*/
function createUsageAggregator(persistence, options = {}) {
	const subscriptionMatcher = options.subscriptionProviders === void 0 ? new Set(DEFAULT_SUBSCRIPTION_PROVIDERS) : new Set(options.subscriptionProviders);
	const officialProviderIds = options.officialProviderIds === void 0 ? void 0 : new Set(options.officialProviderIds);
	const routeAliases = options.routeAliases ?? {};
	const maxCacheSessions = options.maxCacheSessions ?? 400;
	const cache = /* @__PURE__ */ new Map();
	const ledger = /* @__PURE__ */ new Map();
	let ledgerLoaded = false;
	let ledgerNeedsSave = false;
	let ledgerAppliedMigrations;
	let lastDoc;
	let lastAt = 0;
	/** 每次聚合取最新的 provider 路由视图（中转站零配置发现）；缺省按空处理（全部未知路由）。 */
	const routesOf = () => options.resolveRoutes?.() ?? {};
	const searchEstimate = options.searchCallEstimateCny ?? .02;
	const FOLD_CHUNK_EVENTS = 8e3;
	/** 把一份（全量或增量）折叠结果登记进 durable ledger；内容无变化时不落盘。 */
	const recordLedger = (id, cwd, stamp, fold) => {
		if (options.ledger === void 0) return;
		const entry = {
			id,
			...cwd === void 0 ? {} : { cwd },
			...stamp === null ? {} : { stamp },
			foldVersion: 7,
			fold: serializeFold(fold)
		};
		const row = ledger.get(id);
		if (row === void 0 || row.stamp !== entry.stamp || row.cwd !== entry.cwd || row.foldVersion !== entry.foldVersion || stamp === null && JSON.stringify(row.fold) !== JSON.stringify(entry.fold)) {
			ledger.set(id, entry);
			ledgerNeedsSave = true;
		}
	};
	const ensureLedgerLoaded = async () => {
		if (ledgerLoaded || options.ledger === void 0) return;
		ledgerLoaded = true;
		try {
			const stored = await options.ledger.load();
			if (stored !== null && typeof stored === "object" && stored.sessions !== void 0) {
				const document = stored;
				if (runLedgerMigrations(document)) ledgerNeedsSave = true;
				ledgerAppliedMigrations = document.appliedMigrations;
			}
			for (const entry of ledgerSessionsOf(stored)) ledger.set(entry.id, entry);
		} catch (error) {
			console.warn("[usage-billing] failed to load durable usage ledger; rebuilding from current sessions:", error);
		}
	};
	/** 失效键：日志文件的 mtime+size；拿不到（后端无 locate / 文件丢失 / locate 抛错）时返回 null，
	*  让调用方每次重折。locate 调用也纳入 try，避免单个会话的 locate 异常把整份聚合拖垮。 */
	const stampOf = async (meta) => {
		try {
			const location = persistence.locate?.(meta);
			if (location === void 0) return null;
			const info = await stat(location.path);
			return `${String(info.mtimeMs)}:${String(info.size)}`;
		} catch {
			return null;
		}
	};
	return { async aggregate() {
		const now = Date.now();
		if (lastDoc !== void 0 && now - lastAt < 5e3) return lastDoc;
		await ensureLedgerLoaded();
		let metas;
		try {
			metas = await persistence.list();
		} catch (error) {
			if (options.ledger === void 0 || ledger.size === 0) throw error;
			console.warn("[usage-billing] session list unavailable; serving durable usage ledger:", error);
			metas = [];
		}
		const seen = /* @__PURE__ */ new Set();
		const included = /* @__PURE__ */ new Set();
		const folds = [];
		const skipped = [];
		let staleLedgerSessions = 0;
		for (const meta of metas) {
			const id = String(meta.id);
			seen.add(id);
			const stamp = await stampOf(meta);
			const hit = cache.get(id);
			if (hit !== void 0 && stamp !== null && hit.stamp === stamp) {
				cache.delete(id);
				cache.set(id, hit);
				folds.push({
					id,
					...meta.cwd === void 0 ? {} : { cwd: meta.cwd },
					fold: hit.fold
				});
				included.add(id);
				continue;
			}
			try {
				const cwd = meta.cwd;
				const ledgerRow = ledger.get(id);
				if (ledgerRow !== void 0 && ledgerRow.stamp !== void 0 && stamp !== null && ledgerRow.stamp === stamp && (ledgerRow.foldVersion ?? 1) === 7) {
					const fold = deserializeFold(ledgerRow.fold);
					cache.set(id, {
						stamp,
						fold
					});
					folds.push({
						id,
						...cwd === void 0 ? {} : { cwd },
						fold
					});
					included.add(id);
					continue;
				}
				const previous = cache.get(id);
				if (previous?.machine !== void 0 && previous.lastSeq !== void 0) {
					const from = previous.lastSeq + 1;
					const { events, inheritedEventCount } = await persistence.readFrom(meta.id, SessionLogOffset(from));
					const after = await stampOf(meta);
					if (stamp !== null && after !== stamp) {
						cache.delete(id);
						continue;
					}
					const first = events[0]?.seq;
					if (events.length === 0 || first !== from) {
						cache.delete(id);
						continue;
					}
					foldInto(previous.fold, previous.machine, events, subscriptionMatcher, officialProviderIds, routesOf(), searchEstimate, inheritedEventCount, routeAliases);
					refreshTurns(previous.fold, previous.machine);
					previous.lastSeq = events[events.length - 1]?.seq ?? previous.lastSeq;
					previous.stamp = stamp;
					cache.delete(id);
					cache.set(id, previous);
					folds.push({
						id,
						...cwd === void 0 ? {} : { cwd },
						fold: previous.fold
					});
					included.add(id);
					recordLedger(id, cwd, stamp, previous.fold);
					continue;
				}
				const { events, inheritedEventCount } = await persistence.readFrom(meta.id, SessionLogOffset(0));
				const after = await stampOf(meta);
				if (stamp !== null && after !== stamp) continue;
				const fold = freshFold();
				const machine = freshMachine();
				for (let start = 0; start < events.length; start += FOLD_CHUNK_EVENTS) {
					foldInto(fold, machine, events.slice(start, start + FOLD_CHUNK_EVENTS), subscriptionMatcher, officialProviderIds, routesOf(), searchEstimate, inheritedEventCount, routeAliases);
					if (start + FOLD_CHUNK_EVENTS < events.length) await new Promise((resolve) => {
						setImmediate(resolve);
					});
				}
				refreshTurns(fold, machine);
				const last = events[events.length - 1];
				cache.set(id, {
					stamp,
					fold,
					machine,
					...last !== void 0 && typeof last.seq === "number" ? { lastSeq: last.seq } : {}
				});
				folds.push({
					id,
					...cwd === void 0 ? {} : { cwd },
					fold
				});
				included.add(id);
				recordLedger(id, cwd, stamp, fold);
			} catch (error) {
				skipped.push(id);
				console.warn("[usage-billing] skip unreadable session", id, error);
			}
		}
		for (const key of [...cache.keys()]) if (!seen.has(key)) cache.delete(key);
		while (cache.size > maxCacheSessions) {
			const oldest = cache.keys().next();
			if (oldest.done === true) break;
			cache.delete(oldest.value);
		}
		if (options.ledger !== void 0) {
			for (const entry of ledger.values()) {
				if (included.has(entry.id)) continue;
				try {
					const stale = (entry.foldVersion ?? 1) < 7;
					folds.push({
						id: entry.id,
						...entry.cwd === void 0 ? {} : { cwd: entry.cwd },
						...stale ? { staleLedger: true } : {},
						fold: deserializeFold(entry.fold)
					});
					included.add(entry.id);
					if (stale) staleLedgerSessions += 1;
				} catch (error) {
					console.warn("[usage-billing] skip invalid durable ledger session", entry.id, error);
				}
			}
			if (ledgerNeedsSave) try {
				await options.ledger.save({
					version: 1,
					updatedAt: now,
					sessions: [...ledger.values()],
					...ledgerAppliedMigrations === void 0 ? {} : { appliedMigrations: ledgerAppliedMigrations }
				});
				ledgerNeedsSave = false;
			} catch (error) {
				console.warn("[usage-billing] failed to persist durable usage ledger:", error);
			}
		}
		if (skipped.length > 0) console.warn(`[usage-billing] aggregated ${folds.length} sessions, skipped ${skipped.length} unreadable:`, skipped);
		const total = emptyUsage();
		const byModel = /* @__PURE__ */ new Map();
		const byDay = /* @__PURE__ */ new Map();
		const byDayModels = /* @__PURE__ */ new Map();
		const byDayModelsSite = /* @__PURE__ */ new Map();
		const byTier = /* @__PURE__ */ new Map();
		const byTool = /* @__PURE__ */ new Map();
		const bySite = /* @__PURE__ */ new Map();
		const unpricedModels = /* @__PURE__ */ new Set();
		const planCalls = /* @__PURE__ */ new Map();
		const sessionRows = [];
		const turnRows = [];
		const workspaceMap = /* @__PURE__ */ new Map();
		const roles = {
			userChars: 0,
			toolChars: 0,
			inputCost: 0,
			outputCost: 0
		};
		const perfModel = /* @__PURE__ */ new Map();
		const perfHourModel = /* @__PURE__ */ new Map();
		for (const { id: sessionId, cwd, fold, staleLedger } of folds) {
			mergeUsageInto(total, fold.total);
			roles.userChars += fold.roles.userChars;
			roles.toolChars += fold.roles.toolChars;
			roles.inputCost += fold.roles.inputCost;
			roles.outputCost += fold.roles.outputCost;
			for (const [modelKey, cell] of fold.byModel) mergeUsageInto(usageCell(byModel, modelKey), cell);
			for (const [day, cell] of fold.byDay) mergeUsageInto(usageCell(byDay, day), cell);
			for (const [day, models] of fold.byDayModels) for (const [modelKey, cell] of models) mergeUsageInto(modelDayCell(byDayModels, day, modelKey), cell);
			for (const [day, models] of fold.byDayModelsSite) for (const [modelKey, sites] of models) for (const [siteKey, cell] of sites) mergeUsageInto(modelDaySiteCell(byDayModelsSite, day, modelKey, siteKey), cell);
			for (const [siteKey, cell] of fold.bySite) mergeUsageInto(usageCell(bySite, siteKey), cell);
			for (const [tierKey, cell] of fold.byTier) mergeUsageInto(usageCell(byTier, tierKey), cell);
			for (const [toolName, count] of fold.byTool) byTool.set(toolName, (byTool.get(toolName) ?? 0) + count);
			for (const id of fold.unpricedModels) unpricedModels.add(id);
			for (const [modelKey, count] of fold.planCalls) planCalls.set(modelKey, (planCalls.get(modelKey) ?? 0) + count);
			for (const sample of fold.perf) {
				let modelAccum = perfModel.get(sample.model);
				if (modelAccum === void 0) {
					modelAccum = {
						ttfts: [],
						tps: [],
						latencies: [],
						estimated: 0
					};
					perfModel.set(sample.model, modelAccum);
				}
				modelAccum.ttfts.push(sample.ttftMs);
				if (sample.tps !== void 0) modelAccum.tps.push(sample.tps);
				if (sample.latencyMs !== void 0) modelAccum.latencies.push(sample.latencyMs);
				if (sample.estimated) modelAccum.estimated += 1;
				let hourModels = perfHourModel.get(sample.hour);
				if (hourModels === void 0) {
					hourModels = /* @__PURE__ */ new Map();
					perfHourModel.set(sample.hour, hourModels);
				}
				let hourAccum = hourModels.get(sample.model);
				if (hourAccum === void 0) {
					hourAccum = {
						ttfts: [],
						tps: []
					};
					hourModels.set(sample.model, hourAccum);
				}
				hourAccum.ttfts.push(sample.ttftMs);
				if (sample.tps !== void 0) hourAccum.tps.push(sample.tps);
			}
			for (const row of fold.turns) turnRows.push({
				sessionId,
				...row
			});
			const wsName = options.resolveWorkspaceTitle !== void 0 && cwd !== void 0 ? options.resolveWorkspaceTitle(cwd) ?? workspaceNameOf(cwd) : workspaceNameOf(cwd);
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
				...cwd !== void 0 ? { cwd } : {},
				...staleLedger === true ? { stale: true } : {},
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
		const toModelDaySiteRecord = (map) => Object.fromEntries([...map].map(([day, models]) => [day, Object.fromEntries([...models].map(([model, sites]) => [model, Object.fromEntries(sites)]))]));
		const perf = perfModel.size === 0 ? void 0 : {
			byModel: Object.fromEntries([...perfModel].map(([model, acc]) => [model, {
				samples: acc.ttfts.length,
				ttftAvg: mean(acc.ttfts),
				ttftP50: percentile(acc.ttfts, .5),
				ttftP90: percentile(acc.ttfts, .9),
				ttftMax: Math.max(...acc.ttfts),
				ttftSpikes: acc.ttfts.filter((ttft) => ttft > PERF_SPIKE_MS).length,
				...acc.tps.length === 0 ? {} : { tpsAvg: mean(acc.tps) },
				latencyAvg: acc.latencies.length === 0 ? 0 : mean(acc.latencies),
				estimatedSamples: acc.estimated
			}])),
			byHourModel: Object.fromEntries([...perfHourModel].map(([hour, models]) => [hour, Object.fromEntries([...models].map(([model, acc]) => [model, {
				samples: acc.ttfts.length,
				ttftAvg: mean(acc.ttfts),
				...acc.tps.length === 0 ? {} : { tpsAvg: mean(acc.tps) }
			}]))]))
		};
		lastDoc = {
			version: 4,
			updatedAt: now,
			source: "session-logs",
			timezone: hostTimeZone(),
			total,
			byModel: toRecord(byModel),
			byDay: toRecord(byDay),
			byDayModels: toModelDayRecord(byDayModels),
			...byDayModelsSite.size === 0 ? {} : { byDayModelsSite: toModelDaySiteRecord(byDayModelsSite) },
			bySession: sessionRows.slice(0, 100),
			byTurn: turnRows.slice(0, 200),
			byWorkspace: workspaces.slice(0, 100),
			...byTier.size === 0 ? {} : { byTier: {
				peak: byTier.get("peak") ?? emptyUsage(),
				offPeak: byTier.get("offPeak") ?? emptyUsage()
			} },
			...byTool.size === 0 ? {} : { byTool: Object.fromEntries([...byTool].sort((a, b) => b[1] - a[1])) },
			...bySite.size === 0 ? {} : { bySite: toRecord(bySite) },
			...unpricedModels.size === 0 ? {} : { unpricedModels: [...unpricedModels].sort() },
			...searchEstimate > 0 ? { searchCallEstimateCny: searchEstimate } : {},
			...perf === void 0 ? {} : { perf },
			...staleLedgerSessions > 0 ? { staleLedgerSessions } : {},
			byRole: (() => {
				const chars = roles.userChars + roles.toolChars;
				const userShare = chars > 0 ? roles.userChars / chars : .5;
				return {
					user: roles.inputCost * userShare,
					assistant: roles.outputCost,
					tool: roles.inputCost * (1 - userShare)
				};
			})()
		};
		lastAt = now;
		return lastDoc;
	} };
}
//#endregion
//#region lib/types/resilience.js
/**
* 上游网络请求的稳定性工具：有限重试（指数退避）与每平台熔断冷却门。
*
* 计费插件对三类上游做实时请求——pricing（汇率 / OpenRouter / models.dev）、
* balance（各厂商余额）、subscriptions（各订阅额度）。单次失败会被调用方降级，
* 但反复的瞬时失败（网络波动 / 5xx / 429）会让 30 秒轮询每次打满超时。这里提供
* 两个纯工具：`withRetry` 对可重试错误做指数退避，`createCooldownGate` 在单一
* 上游连续失败后短路一段时间，避免把请求打到已不可用的服务上。
*/
/** 是否是可重试的错误：网络性失败（TypeError / Abort / Timeout）或 5xx / 429。
*  401 / 403 鉴权失败与 404 不可重试——重试只放大错误、不会变好。 */
function isRetryableError(error) {
	if (error instanceof Error) {
		if (error.name === "AbortError" || error.name === "TimeoutError") return true;
		if (error instanceof TypeError) return true;
		const status = error.httpStatus;
		if (typeof status === "number") return status === 429 || status >= 500;
	}
	return false;
}
/** 休眠指定毫秒（Promise 化 setTimeout）。 */
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
* 对一次上游请求做有限重试：可重试错误时按指数退避（+同量级抖动）重试。
* @param fn - 发起请求的异步函数。
* @param options - 重试策略（见 {@link RetryOptions}）。
* @returns fn 的结果；重试耗尽后抛出最后一次错误。
*/
async function withRetry(fn, options = {}) {
	const { retries = 1, baseDelayMs = 250, maxDelayMs = 2e3, shouldRetry = isRetryableError } = options;
	let lastError;
	for (let attempt = 0; attempt <= retries; attempt += 1) try {
		return await fn();
	} catch (error) {
		lastError = error;
		if (attempt >= retries || !shouldRetry(error)) throw error;
		const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
		await sleep(delay / 2 + Math.random() * (delay / 2));
	}
	throw lastError;
}
/** 每平台冷熔断：连续失败达阈值后短路一段真实时间，成功后复位。 */
function createCooldownGate(options = {}) {
	const { failures = 3, cooldownMs = 3e4 } = options;
	const state = /* @__PURE__ */ new Map();
	return {
		check(key) {
			const s = state.get(key);
			if (s === void 0) return true;
			if (s.until > 0 && Date.now() < s.until) return false;
			return true;
		},
		fail(key) {
			const s = state.get(key) ?? {
				count: 0,
				until: 0
			};
			s.count += 1;
			if (s.count >= failures) {
				s.until = Date.now() + cooldownMs;
				s.count = 0;
			}
			state.set(key, s);
		},
		success(key) {
			state.delete(key);
		}
	};
}
//#endregion
//#region lib/types/balance.js
/**
* Account-balance queries for the billing dashboard.
*
* Only providers with a public balance endpoint can report one. Today that is
* DeepSeek, Moonshot/Kimi, StepFun, SiliconFlow, and xAI (Grok) — all Bearer
* 鉴权 with a documented JSON shape; the other mainstream providers expose no
* standard balance API (or require a non-Bearer auth flow), so their rows in
* the model table show an unavailable state. The lookup map below is the
* extension point for future providers.
*
* API keys are read from the `llm-pi-ai` settings namespace (`providers.<id>.apiKeyEnv`),
* the same source the subscription adapter uses, so a deployment configures a
* provider's key once and every surface reuses it.
*/
/** Abort a balance fetch when the upstream hangs beyond this budget. */
const FETCH_TIMEOUT_MS$3 = 8e3;
/**
* 每平台熔断门：单个 provider 连续可重试失败（网络波动 / 5xx / 429）达阈值后
* 短路一段真实时间，避免 30 秒轮询在已不可用的上游上反复打满超时。
* 鉴权失败（unauthorized）是配置问题而非暂时故障，不计入熔断。
*/
const balanceGate = createCooldownGate({
	failures: 3,
	cooldownMs: 6e4
});
/** 自定义 Provider 余额的熔断门：按端点 URL 独立熔断（各配置端点互不干扰）。 */
const customGate = createCooldownGate({
	failures: 3,
	cooldownMs: 6e4
});
/** DeepSeek 官方余额接口（官方文档 api-docs.deepseek.com/api/get-user-balance）。 */
const DEEPSEEK_BALANCE_URL = "https://api.deepseek.com/user/balance";
/** Moonshot/Kimi 官方余额接口（platform.kimi.com/docs/api/balance）。 */
const MOONSHOT_BALANCE_URL = "https://api.moonshot.cn/v1/users/me/balance";
/** 阶跃星辰 StepFun 官方账户信息接口（platform.stepfun.com/docs/api-reference/accounts/get）。 */
const STEPFUN_BALANCE_URL = "https://api.stepfun.com/v1/accounts";
/** 硅基流动 SiliconFlow 官方用户信息接口（docs.siliconflow.cn/cn/api-reference/user/query-user-info）。 */
const SILICONFLOW_BALANCE_URL = "https://api.siliconflow.cn/v1/user/info";
/** xAI 官方账单接口（docs.x.ai/developers/api/credits）；total.val 为美分。 */
const XAI_CREDITS_URL = "https://api.x.ai/v1/billing/credits";
/** 智谱 GLM（大模型国内域）官方余额接口（open.bigmodel.cn/api/paas/v4/balance）。 */
const ZHIPU_BALANCE_URL = "https://open.bigmodel.cn/api/paas/v4/balance";
/** 数字归一化：接口返回的余额是字符串（如 `"110.00"`），统一转 number。 */
function toNumber$1(value) {
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
	if (!balanceGate.check(provider)) return {
		provider,
		displayName,
		error: "unreachable"
	};
	const doRequest = async () => {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS$3);
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
			if (!response.ok) {
				const error = /* @__PURE__ */ new Error(`HTTP ${String(response.status)}`);
				error.httpStatus = response.status;
				throw error;
			}
			const row = parse(await response.json());
			if (row.totalBalance === void 0 && row.grantedBalance === void 0 && row.toppedUpBalance === void 0 && row.isAvailable === void 0) {
				console.warn(`[usage-billing] balance response drifted for ${displayName}: no balance field parsed from ${url}`);
				return {
					...row,
					error: "invalid"
				};
			}
			return row;
		} finally {
			clearTimeout(timer);
		}
	};
	try {
		const row = await withRetry(doRequest, {
			retries: 1,
			baseDelayMs: 250,
			maxDelayMs: 2e3
		});
		balanceGate.success(provider);
		return row;
	} catch {
		balanceGate.fail(provider);
		return {
			provider,
			displayName,
			error: "unreachable"
		};
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
		const totalBalance = toNumber$1(info?.total_balance);
		const grantedBalance = toNumber$1(info?.granted_balance);
		const toppedUpBalance = toNumber$1(info?.topped_up_balance);
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
		const totalBalance = toNumber$1(doc.data?.available_balance);
		const grantedBalance = toNumber$1(doc.data?.voucher_balance);
		const toppedUpBalance = toNumber$1(doc.data?.cash_balance);
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
		const totalBalance = toNumber$1(doc.balance);
		const toppedUpBalance = toNumber$1(doc.total_cash_balance);
		const grantedBalance = toNumber$1(doc.total_voucher_balance);
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
/**
* Query the SiliconFlow (硅基流动) account balance.
* @param ctx - host context carrying the credentials seam.
* @param apiKeyEnv - credential reference resolving the SiliconFlow API key.
* @returns the balance row, or an error row when the key/endpoint misbehaves.
*/
function querySiliconFlow(ctx, apiKeyEnv) {
	return queryBearerBalance(ctx, SILICONFLOW_BALANCE_URL, apiKeyEnv, "硅基流动", "硅基流动", (data) => {
		const doc = data;
		const inner = doc.data ?? doc;
		const totalBalance = toNumber$1(inner.balance ?? inner.balance_cny);
		return {
			provider: "硅基流动",
			displayName: "硅基流动",
			currency: "CNY",
			...totalBalance !== void 0 ? { totalBalance } : {}
		};
	});
}
/**
* Query the xAI (Grok) credit balance.
* @param ctx - host context carrying the credentials seam.
* @param apiKeyEnv - credential reference resolving the xAI API key.
* @returns the balance row, or an error row when the key/endpoint misbehaves.
*/
function queryXai(ctx, apiKeyEnv) {
	return queryBearerBalance(ctx, XAI_CREDITS_URL, apiKeyEnv, "xAI", "xAI", (data) => {
		const cents = toNumber$1(data.total?.val);
		const totalBalance = cents === void 0 ? void 0 : Math.abs(cents) / 100;
		return {
			provider: "xAI",
			displayName: "xAI",
			currency: "USD",
			...totalBalance !== void 0 ? { totalBalance } : {}
		};
	});
}
/** TokenDance 钱包端点（issue #27：GET + Bearer，与模型调用同一把 key）。 */
const TOKENDANCE_BALANCE_URL = "https://tokendance.space/portal/api/v1/user/balance";
/** 微元 → 元：TokenDance 全部金额字段以 1 元 = 1,000,000 微元计。 */
const TOKENDANCE_MICRO_PER_YUAN = 1e6;
/**
* 从 TokenDance 余额响应提取剩余余额并换算为元。导出供测试：纯函数。
* 优先用服务端现成的 `balance.balance`（= credits - credits_used）；缺失时
* 按两个明细字段相减推导，字段全部缺失返回 undefined。
* @param data - 余额端点的 JSON 响应（`{ balance: { credits, credits_used, balance } }`，微元）。
* @returns 剩余余额（元）；提取不到返回 undefined。
*/
function pickTokenDanceBalanceCny(data) {
	const doc = data;
	const direct = toNumber$1(doc?.balance?.balance);
	if (direct !== void 0) return direct / TOKENDANCE_MICRO_PER_YUAN;
	const credits = toNumber$1(doc?.balance?.credits);
	const used = toNumber$1(doc?.balance?.credits_used);
	if (credits !== void 0 && used !== void 0) return (credits - used) / TOKENDANCE_MICRO_PER_YUAN;
}
/**
* 查询 TokenDance Space 钱包余额（issue #26/#27）。`queryBearerBalance` 已覆盖
* 认证失败（401 → unauthorized）与熔断/超时/重试，这里只负责微元 → 元换算。
* @param ctx - host context carrying the credentials seam.
* @param apiKeyEnv - credential reference resolving the TokenDance API key.
*/
function queryTokenDance(ctx, apiKeyEnv) {
	return queryBearerBalance(ctx, TOKENDANCE_BALANCE_URL, apiKeyEnv, "TokenDance", "TokenDance", (data) => {
		const cny = pickTokenDanceBalanceCny(data);
		return {
			provider: "TokenDance",
			displayName: "TokenDance",
			currency: "CNY",
			...cny !== void 0 ? { totalBalance: cny } : {}
		};
	});
}
/**
* Query the Zhipu GLM / Z.ai (国内 bigmodel-cn 域) account balance.
* 与订阅（zai-coding-cn 的 Coding Plan）互补：一个平台可同时有钱包余额与订阅
* 套餐，两者各读各的（TokenLedger 同款双读姿态）。Z.ai global 域币种为 USD，
* 本函数固定走国内 CNY 域（open.bigmodel.cn），币种不猜，仅覆盖国内域。
* @param ctx - host context carrying the credentials seam.
* @param apiKeyEnv - credential reference resolving the Zhipu API key.
* @returns the balance row, or an error row when the key/endpoint misbehaves.
*/
function queryZhipu(ctx, apiKeyEnv) {
	return queryBearerBalance(ctx, ZHIPU_BALANCE_URL, apiKeyEnv, "智谱 AI", "智谱 AI", (data) => {
		const doc = data;
		const totalBalance = toNumber$1(doc.balance?.available) ?? toNumber$1(doc.balance?.total);
		return {
			provider: "智谱 AI",
			displayName: "智谱 AI",
			currency: "CNY",
			...totalBalance !== void 0 ? { totalBalance } : {}
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
	},
	{
		route: "siliconflow",
		displayName: "硅基流动",
		querier: querySiliconFlow
	},
	{
		route: "xai",
		displayName: "xAI",
		querier: queryXai
	},
	{
		route: "zhipu",
		displayName: "智谱 AI",
		querier: queryZhipu
	},
	{
		route: "zai-coding-cn",
		displayName: "智谱 AI",
		querier: queryZhipu
	},
	{
		route: "tokendance",
		displayName: "TokenDance",
		querier: queryTokenDance
	},
	{
		route: "tokendance-space",
		displayName: "TokenDance",
		querier: queryTokenDance
	},
	{
		route: "tencent-tokenhub",
		displayName: "腾讯云 TokenHub",
		querier: queryTencentTokenPlan
	},
	{
		route: "tokenhub",
		displayName: "腾讯云 TokenHub",
		querier: queryTencentTokenPlan
	},
	{
		route: "tencent",
		displayName: "腾讯云 TokenHub",
		querier: queryTencentTokenPlan
	},
	{
		route: "tencentcloud",
		displayName: "腾讯云 TokenHub",
		querier: queryTencentTokenPlan
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
	const byName = /* @__PURE__ */ new Map();
	for (const { route, querier, displayName } of QUERIERS) {
		const env = providers[route]?.apiKeyEnv;
		const configured = typeof env === "string" && env !== "";
		const existing = byName.get(displayName);
		if (existing !== void 0 && existing.env !== void 0) continue;
		byName.set(displayName, {
			displayName,
			querier,
			env: configured ? env : void 0
		});
	}
	return await Promise.all([...byName.values()].map(({ querier, displayName, env }) => {
		if (env === void 0) return Promise.resolve({
			provider: displayName,
			displayName,
			error: "unconfigured"
		});
		return querier(ctx, env);
	}));
}
/** TokenHub 管控面 API 端点（cloud.tencent.cn/document/api/1823/132270）。 */
const TOKENHUB_HOST = "tokenhub.tencentcloudapi.com";
/** 云 API 3.0 产品名与版本（签名的 service 段与请求头都必须一致）。 */
const TOKENHUB_SERVICE = "tokenhub";
const TOKENHUB_VERSION = "2026-03-22";
/** 请求地域：管控面对地域不敏感，取默认国内地域（文档地域列表含 ap-guangzhou）。 */
const TOKENHUB_REGION = "ap-guangzhou";
/** 腾讯云凭据引用值格式：`<SecretId>:<SecretKey>`（分隔符取首个冒号）。 */
function parseTencentCredential(value) {
	const sep = value.indexOf(":");
	if (sep === -1) return void 0;
	const secretId = value.slice(0, sep).trim();
	const secretKey = value.slice(sep + 1).trim();
	if (secretId === "" || secretKey === "") return void 0;
	return {
		secretId,
		secretKey
	};
}
/**
* 构造云 API 3.0 TC3-HMAC-SHA256 签名（官方签名方法 v3）。导出供测试：纯函数，
* 输入确定则签名确定。Action 不参与签名——它走 `X-TC-Action` 请求头。
* @param secretId - 云 API SecretId。
* @param secretKey - 云 API SecretKey。
* @param payload - 已序列化的请求体（含 Action/Version/Region 公共参数）。
* @param timestamp - 签名时间戳（秒）。
* @returns Authorization 头的值。
*/
function tc3Authorization(secretId, secretKey, payload, timestamp) {
	const date = (/* @__PURE__ */ new Date(timestamp * 1e3)).toISOString().slice(0, 10);
	const canonicalRequest = `POST\n/\n\n${`content-type:application/json; charset=utf-8\nhost:${TOKENHUB_HOST}\n`}\ncontent-type;host\n${createHash("sha256").update(payload).digest("hex")}`;
	const hashedCanonical = createHash("sha256").update(canonicalRequest).digest("hex");
	const stringToSign = `TC3-HMAC-SHA256\n${String(timestamp)}\n${date}/${TOKENHUB_SERVICE}/tc3_request\n${hashedCanonical}`;
	const kDate = createHmac("sha256", date).update(secretKey).digest();
	const kService = createHmac("sha256", kDate).update(TOKENHUB_SERVICE).digest();
	const kSigning = createHmac("sha256", kService).update("tc3_request").digest();
	const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");
	return `TC3-HMAC-SHA256 Credential=${secretId}/${date}/${TOKENHUB_SERVICE}/tc3_request, SignedHeaders=content-type;host, Signature=${signature}`;
}
/** 调用一次 TokenHub 管控面接口：TC3 签名 + 超时保护，返回响应 JSON 的 `Response`。 */
async function callTokenHub(secretId, secretKey, action, params) {
	const payload = JSON.stringify({
		Action: action,
		Version: TOKENHUB_VERSION,
		Region: TOKENHUB_REGION,
		...params
	});
	const timestamp = Math.floor(Date.now() / 1e3);
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS$3);
	try {
		const response = await fetch(`https://${TOKENHUB_HOST}/`, {
			method: "POST",
			headers: {
				"content-type": "application/json; charset=utf-8",
				host: TOKENHUB_HOST,
				"x-tc-action": action.toLowerCase(),
				"x-tc-version": TOKENHUB_VERSION,
				"x-tc-region": TOKENHUB_REGION,
				"x-tc-timestamp": String(timestamp),
				authorization: tc3Authorization(secretId, secretKey, payload, timestamp)
			},
			body: payload,
			signal: controller.signal
		});
		if (response.status === 401 || response.status === 403) throw Object.assign(/* @__PURE__ */ new Error("unauthorized"), { code: "unauthorized" });
		if (!response.ok) throw Object.assign(/* @__PURE__ */ new Error(`HTTP ${String(response.status)}`), {
			httpStatus: response.status,
			code: "unreachable"
		});
		const inner = (await response.json()).Response;
		if (inner === void 0) throw Object.assign(/* @__PURE__ */ new Error("no Response envelope"), { code: "invalid" });
		if (inner.Error !== void 0 && inner.Error !== null) {
			const err = inner.Error;
			const code = err.Code === "AuthFailure.SignatureFailure" || err.Code === "AuthFailure.SecretIdNotFound" ? "unauthorized" : "unreachable";
			throw Object.assign(new Error(String(err.Code ?? "api-error")), { code });
		}
		return inner;
	} finally {
		clearTimeout(timer);
	}
}
/**
* 在套餐余量对象里防御性提取「剩余额度」：官方 SubPackageBalance/PackageInfo
* 的字段名未稳定公开（issue #18 调研期），按语义键名扫描——命中 remaining /
* balance / left 语义键直接用；命中 total 与 used 则相减推导。数字一律经
* {@link toNumber} 归一化（上游可能给字符串）。
* 导出供测试：纯函数。
* @param source - 套餐详情里的余量对象（PackageInfo / SubPackageBalance 等）。
* @returns 剩余额度（上游单位，通常为 token 数或元）；提取不到返回 undefined。
*/
function pickRemainingQuota(source) {
	if (source === null || typeof source !== "object") return void 0;
	const numeric = Object.entries(source).filter(([, v]) => v !== null && toNumber$1(v) !== void 0);
	const byKey = (needles) => {
		for (const [key, value] of numeric) {
			const lower = key.toLowerCase();
			if (needles.some((n) => lower.includes(n))) {
				const num = toNumber$1(value);
				if (num !== void 0 && num >= 0) return num;
			}
		}
	};
	const remaining = byKey([
		"remain",
		"balance",
		"left",
		"available"
	]);
	if (remaining !== void 0) return remaining;
	const total = byKey(["total"]);
	const used = byKey(["used", "consume"]);
	if (total !== void 0 && used !== void 0) return Math.max(0, total - used);
}
/** 套餐列表里提取第一个启用套餐的 TeamId：集合字段名做候选兼容。 */
function firstEnabledTeamId(inner) {
	const candidates = inner.TeamSet ?? inner.TokenPlanSet ?? inner.PlanSet;
	if (!Array.isArray(candidates)) return void 0;
	for (const item of candidates) {
		if (item === null || typeof item !== "object") continue;
		const row = item;
		if (row.TeamId === void 0 && row.PlanId === void 0) continue;
		if (row.Status !== void 0 && row.Status !== "enable") continue;
		const id = row.TeamId ?? row.PlanId;
		if (typeof id === "string" && id !== "") return id;
	}
}
/**
* 查询腾讯云 TokenHub Token Plan 套餐余量。凭据值格式 `<SecretId>:<SecretKey>`
* （云 API 密钥，非 TokenHub 推理 key）。链路：套餐列表取 TeamId → 套餐详情读
* 主额度包余量。管控面字段名未完全稳定，解析按语义键防御提取。
* @param ctx - host context carrying the credentials seam.
* @param apiKeyEnv - credential reference resolving the `<SecretId>:<SecretKey>` pair.
*/
async function queryTencentTokenPlan(ctx, apiKeyEnv) {
	const provider = "腾讯云 TokenHub";
	const hit = await ctx.credentials.resolve(credentialRef(apiKeyEnv));
	if (hit === void 0) return {
		provider,
		displayName: provider,
		error: "unconfigured"
	};
	if (!balanceGate.check(provider)) return {
		provider,
		displayName: provider,
		error: "unreachable"
	};
	const credential = parseTencentCredential(hit.value);
	if (credential === void 0) return {
		provider,
		displayName: provider,
		error: "unauthorized"
	};
	const doRequest = async () => {
		const teamId = firstEnabledTeamId(await callTokenHub(credential.secretId, credential.secretKey, "DescribeTokenPlanList", {}));
		if (teamId === void 0) return {
			provider,
			displayName: provider,
			error: "invalid"
		};
		const detail = await callTokenHub(credential.secretId, credential.secretKey, "DescribeTokenPlan", { TeamId: teamId });
		const remaining = pickRemainingQuota(detail.PackageInfo) ?? pickRemainingQuota(detail);
		if (remaining === void 0) {
			console.warn(`[usage-billing] balance response drifted for ${provider}: no remaining-quota field parsed`);
			return {
				provider,
				displayName: provider,
				error: "invalid"
			};
		}
		const plan = typeof detail.Name === "string" ? detail.Name : void 0;
		const exhausted = detail.StopReason === "EXHAUSTED";
		return {
			provider,
			displayName: provider,
			currency: "CNY",
			totalBalance: remaining,
			...plan !== void 0 ? { plan } : {},
			...exhausted ? { isAvailable: false } : {}
		};
	};
	try {
		const row = await withRetry(doRequest, {
			retries: 1,
			baseDelayMs: 250,
			maxDelayMs: 2e3
		});
		balanceGate.success(provider);
		return row;
	} catch (error) {
		balanceGate.fail(provider);
		return {
			provider,
			displayName: provider,
			error: error.code === "unauthorized" ? "unauthorized" : "unreachable"
		};
	}
}
/** 点路径取值：`data.total_available` → 逐层下钻；任一缺失返回 undefined。 */
function getPath(data, path) {
	let cursor = data;
	for (const segment of path.split(".")) {
		if (cursor === null || typeof cursor !== "object") return void 0;
		cursor = cursor[segment];
	}
	return cursor;
}
/**
* 按 extract 规则从响应 JSON 求值。导出供测试：纯函数。
* @param rule - 提取规则（const / path / add / subtract / divide）。
* @param data - 响应 JSON。
* @returns 数值；取不到或结果非有限数返回 undefined。
*/
function evalExtract(rule, data) {
	if (typeof rule.const === "number" && Number.isFinite(rule.const)) return rule.const;
	if (rule.op === "add" || rule.op === "subtract") {
		const paths = rule.paths ?? [];
		if (paths.length === 0) return void 0;
		let total;
		for (const path of paths) {
			const value = toNumber$1(getPath(data, path));
			if (value === void 0) return void 0;
			total = total === void 0 ? value : rule.op === "add" ? total + value : total - value;
		}
		return total;
	}
	const base = typeof rule.path === "string" ? toNumber$1(getPath(data, rule.path)) : void 0;
	if (base === void 0) return void 0;
	if (rule.op === "divide") {
		const by = rule.by;
		if (typeof by !== "number" || !Number.isFinite(by) || by === 0) return void 0;
		return base / by;
	}
	return base;
}
/**
* 请求头占位符解析：值中任意位置的 `{{ENV_NAME}}` 经凭据 seam 替换（如
* `Bearer {{KEY}}`、`token={{KEY}}`、一处多占位符）；被引用的任一凭据缺失
* 或为空 → 返回 null（fail-closed，与完整占位符形态的历史语义一致）。
*/
async function resolveHeaders(ctx, headers) {
	const resolved = {};
	for (const [key, value] of Object.entries(headers)) {
		const matches = [...value.matchAll(/\{\{([A-Z0-9_]+)\}\}/gi)];
		if (matches.length === 0) {
			resolved[key] = value;
			continue;
		}
		const hits = /* @__PURE__ */ new Map();
		for (const m of matches) {
			const name = m[1] ?? "";
			if (hits.has(name)) continue;
			const hit = await ctx.credentials.resolve(credentialRef(name));
			if (hit === void 0 || hit.value === "") return null;
			hits.set(name, hit.value);
		}
		resolved[key] = value.replace(/\{\{([A-Z0-9_]+)\}\}/gi, (raw, name) => hits.get(name) ?? raw);
	}
	return resolved;
}
/**
* 查询自定义 Provider 余额（插件 config 的 `customBalances`）。每个条目独立
* 成败：占位符凭据缺失 → unconfigured；401/403 → unauthorized；网络或提取
* 失败 → unreachable。
* @param ctx - host context carrying the credentials seam.
* @param configs - 自定义余额配置列表。
* @returns 每个配置一行的余额结果。
*/
async function queryCustomBalances(ctx, configs) {
	return await Promise.all(configs.map(async (config) => {
		const provider = `custom:${config.label}`;
		const displayName = config.label;
		if (typeof config.url !== "string" || config.url === "") return {
			provider,
			displayName,
			error: "unconfigured"
		};
		const headers = await resolveHeaders(ctx, config.headers ?? {});
		if (headers === null) return {
			provider,
			displayName,
			error: "unconfigured"
		};
		if (!customGate.check(config.url)) return {
			provider,
			displayName,
			error: "unreachable"
		};
		const doRequest = async () => {
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS$3);
			try {
				const response = await fetch(config.url, {
					method: config.method ?? "GET",
					headers: {
						accept: "application/json",
						...headers
					},
					signal: controller.signal
				});
				if (response.status === 401 || response.status === 403) return {
					provider,
					displayName,
					error: "unauthorized"
				};
				if (!response.ok) {
					const error = /* @__PURE__ */ new Error(`HTTP ${String(response.status)}`);
					error.httpStatus = response.status;
					throw error;
				}
				const remaining = evalExtract(config.extract.remaining, await response.json());
				if (remaining === void 0) return {
					provider,
					displayName,
					error: "invalid"
				};
				return {
					provider,
					displayName,
					currency: config.unit ?? "CNY",
					totalBalance: remaining
				};
			} finally {
				clearTimeout(timer);
			}
		};
		try {
			const row = await withRetry(doRequest, {
				retries: 1,
				baseDelayMs: 250,
				maxDelayMs: 2e3
			});
			customGate.success(config.url);
			return row;
		} catch {
			customGate.fail(config.url);
			return {
				provider,
				displayName,
				error: "unreachable"
			};
		}
	}));
}
//#endregion
//#region lib/types/declarative.js
/**
* 声明端点（declarative endpoints）：让用户为内置表没有的供应商自声明余额/额度接口，
* 不用等插件发版。用户提供「数字在哪儿」的取值路径，而非「怎么取」——没有表达式、
* 没有任何东西被求值，`fields` / `windows` 里写的只是响应 JSON 的点路径，唯一操作是
* 逐层下钻。
*
* ## 为什么把安全边界写在代码里而不是建议里
*
* 这个功能让**配置文件**决定一个携带用户 API key 的请求发往哪里。风险全在此，靠
* 「提醒用户小心」一点都没用：
*
* 1. `origin` 只是查找键：请求 URL 由**匹配到的 provider 的 origin** 构造，绝不由
*    声明的 origin 自己决定。匹配不到任何已配置的 provider 就不发请求。
* 2. `path` 必须单斜杠绝对路径：`//evil.example/x` 是协议相对 URL，`new URL()` 会
*    把它解析到别的主机；构造后还会再校验一次 origin。
* 3. 只发 GET，无请求体，无自定义 method / headers。
* 4. 凭据仍从匹配 provider 自己的 `apiKeyEnv` 取，经同一凭据 seam 解析；声明不能
*    指定任何凭据。
* 5. 跨源重定向直接失败，不跟随——那是绕过第 1 条最省事的办法。
* 6. 响应体有大小上限与共享超时，坏 / 恶意端点拖不住面板。
* 7. 声明不能覆盖内置读法：只在内置表答不上来时它才轮到。
*
* 这类行会标 `declared`，因为数字来自用户自己写的路径——取错是配置问题，界面要让
* 这一点看得出来；全部字段都没取到时给 `reason`，而不是留一张和「上游没返回」无从
* 区分的空卡。
*/
/** Abort a declared fetch when the upstream hangs beyond this budget. */
const FETCH_TIMEOUT_MS$2 = 8e3;
/** 响应体上限（字节）：坏 / 恶意端点不能拖住面板或耗尽内存。 */
const MAX_BODY_BYTES = 1e6;
/** 声明端点查询的熔断门：按（匹配 provider origin + path）独立熔断，各端点互不干扰。 */
const declaredGate = createCooldownGate({
	failures: 3,
	cooldownMs: 6e4
});
/** 会触及原型链的路径段：一律拒绝（读结果不是文档自带字段）。 */
const FORBIDDEN_SEGMENTS = /* @__PURE__ */ new Set([
	"__proto__",
	"constructor",
	"prototype"
]);
/**
* 归一化 baseURL 为可比的 origin：`scheme://host[:port]`，剥掉 scheme 的默认端口，
* host 转小写，忽略路径。无法解析返回 undefined。
* @param baseURL - provider 的端点地址，或声明里的 origin。
*/
function normalizeDeclaredOrigin(baseURL) {
	if (typeof baseURL !== "string" || baseURL.trim() === "") return void 0;
	let url;
	try {
		url = new URL(baseURL.trim());
	} catch {
		return;
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") return void 0;
	const defaultPort = url.protocol === "https:" ? "443" : "80";
	const port = url.port === "" || url.port === defaultPort ? "" : `:${url.port}`;
	return `${url.protocol}//${url.hostname.toLowerCase()}${port}`;
}
/**
* 沿点路径走进已解析的响应体。
* 任何失败都是同一个答案 `undefined`——路径不匹配是这份响应没有那个字段，是卡片
* 本来就渲染得了的事实，不是错误，而且不该让已解析成功的字段被牵连。
* @param body - 已解析的响应 JSON。
* @param path - 点路径（如 `data.balance`）。
* @returns 路径处的值，或 undefined（路径缺失 / 中途不是对象 / 命中原型链）。
*/
function readDeclaredPath(body, path) {
	if (typeof path !== "string" || path === "") return void 0;
	let cursor = body;
	for (const segment of path.split(".")) {
		if (cursor === null || typeof cursor !== "object") return void 0;
		if (FORBIDDEN_SEGMENTS.has(segment)) return void 0;
		cursor = cursor[segment];
	}
	return cursor;
}
/** 数字常以字符串抵达（如 `"110.00"`），统一转 number；非有限数返回 undefined。 */
function toNumber(value) {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
}
/** 百分比收敛到 0–100。 */
function clampPercent$2(value) {
	return Math.round(Math.max(0, Math.min(100, value)) * 10) / 10;
}
/** 解出一个窗口的已用百分比：usedPercent 路径 > usedRatio 路径 > used/limit 组合。 */
function windowUsedPercent(body, input) {
	const ratio = typeof input.usedPercent === "string" ? toNumber(readDeclaredPath(body, input.usedPercent)) : void 0;
	if (ratio !== void 0) return clampPercent$2(ratio);
	const usageRatio = typeof input.usedRatio === "string" ? toNumber(readDeclaredPath(body, input.usedRatio)) : void 0;
	if (usageRatio !== void 0) return clampPercent$2(usageRatio * 100);
	const used = typeof input.used === "string" ? toNumber(readDeclaredPath(body, input.used)) : void 0;
	const total = typeof input.limit === "string" ? toNumber(readDeclaredPath(body, input.limit)) : void 0;
	if (used !== void 0 && total !== void 0 && total > 0) return clampPercent$2(used / total * 100);
	return null;
}
/**
* 解出一个窗口的重置时刻：resetsAt 路径 > resetInSeconds 路径（now + 秒）推算。
* @param body - 已解析的响应 JSON。
* @param input - 窗口配置。
* @param nowMs - 当前时刻（epoch ms）。
* @returns ISO 时刻字符串，或 undefined。
*/
function windowResetsAt(body, input, nowMs) {
	if (typeof input.resetsAt === "string") {
		const value = readDeclaredPath(body, input.resetsAt);
		if (typeof value === "string" && value !== "") return value;
	}
	if (typeof input.resetInSeconds === "string") {
		const seconds = toNumber(readDeclaredPath(body, input.resetInSeconds));
		if (seconds !== void 0 && Number.isFinite(seconds) && seconds >= 0) return new Date(nowMs + seconds * 1e3).toISOString();
	}
}
/** 把一条声明窗口配置解析成面板可渲染的滚动窗口；取不到已用百分比则不产出。 */
function resolveDeclaredWindow(body, input, nowMs) {
	const used = windowUsedPercent(body, input);
	if (used === null) return null;
	const remaining = clampPercent$2(Math.max(0, 100 - used));
	const resetsAt = windowResetsAt(body, input, nowMs);
	const remainingAmount = typeof input.used === "string" && typeof input.limit === "string" ? (() => {
		const u = toNumber(readDeclaredPath(body, input.used));
		const t = toNumber(readDeclaredPath(body, input.limit));
		return u !== void 0 && t !== void 0 ? t - u : void 0;
	})() : void 0;
	return {
		kind: input.kind ?? "weekly",
		usedPercent: used,
		remainingPercent: remaining,
		...resetsAt === void 0 ? {} : { resetsAt },
		...remainingAmount === void 0 ? {} : { remaining: remainingAmount }
	};
}
/**
* 校验并编译一条声明端点：能否安全地给出一条查询方案。
* 返回方案的 `read` 用匹配到 provider 的 origin 构造 URL；路径不合规（非单斜杠绝对）
* 返回 undefined，该账户保持「unsupported」，这是真话，也是它没声明之前的样子。
*/
function compileDeclaredEndpoint(decl) {
	const path = decl?.path;
	if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) return void 0;
	return path;
}
/**
* 查询一组声明端点的余额/额度。每个声明独立成败，互不影响。
* @param ctx - host context carrying the credentials seam.
* @param providers - llm-pi-ai providers dict（`<route> → { baseURL?, apiKeyEnv? }`）。
* @param declarations - 声明端点配置列表。
* @returns 每个匹配到 provider 的声明一行结果；无匹配的声明不上报（不产生请求）。
*/
async function queryDeclaredEndpoints(ctx, providers, declarations) {
	const byOrigin = /* @__PURE__ */ new Map();
	for (const entry of Object.values(providers)) {
		const origin = entry.baseURL === void 0 ? void 0 : normalizeDeclaredOrigin(entry.baseURL);
		if (origin !== void 0 && !byOrigin.has(origin)) byOrigin.set(origin, entry);
	}
	return await Promise.all(declarations.map(async (decl) => {
		const displayName = typeof decl.displayName === "string" && decl.displayName !== "" ? decl.displayName : "已声明";
		const provider = `declared:${displayName}`;
		const requestPath = compileDeclaredEndpoint(decl);
		if (requestPath === void 0) return {
			provider,
			displayName,
			declared: true,
			error: "invalid",
			reason: "path 必须单斜杠绝对路径"
		};
		const declOrigin = normalizeDeclaredOrigin(decl.origin);
		const matched = declOrigin === void 0 ? void 0 : byOrigin.get(declOrigin);
		if (matched === void 0) return {
			provider,
			displayName,
			declared: true,
			error: "unconfigured",
			reason: "未匹配到同源 provider（需先在 llm-pi-ai 配好 baseURL）"
		};
		const gateKey = `${declOrigin}${requestPath}`;
		if (!declaredGate.check(gateKey)) return {
			provider,
			displayName,
			declared: true,
			error: "unreachable"
		};
		const hit = await ctx.credentials.resolve(credentialRef(matched.apiKeyEnv ?? ""));
		if (hit === void 0 || hit.value === "") return {
			provider,
			displayName,
			declared: true,
			error: "unconfigured"
		};
		const url = new URL(requestPath, declOrigin);
		if (url.origin !== declOrigin) return {
			provider,
			displayName,
			declared: true,
			error: "invalid",
			reason: "跨源路径被拒绝"
		};
		try {
			const body = await fetchDeclaredBody(url, decl.raw === true, hit.value);
			const fields = decl.fields ?? {};
			const total = typeof fields.total === "string" ? toNumber(readDeclaredPath(body, fields.total)) : void 0;
			const granted = typeof fields.granted === "string" ? toNumber(readDeclaredPath(body, fields.granted)) : void 0;
			const used = typeof fields.used === "string" ? toNumber(readDeclaredPath(body, fields.used)) : void 0;
			const currency = typeof fields.currency === "string" ? readDeclaredPath(body, fields.currency) : void 0;
			const plan = typeof fields.plan === "string" ? readDeclaredPath(body, fields.plan) : void 0;
			const windows = (decl.windows ?? []).map((w) => resolveDeclaredWindow(body, w, Date.now())).filter((w) => w !== null);
			declaredGate.success(gateKey);
			const nothingResolved = total === void 0 && granted === void 0 && used === void 0 && windows.length === 0;
			return {
				provider,
				displayName,
				declared: true,
				...total !== void 0 ? { totalBalance: total } : {},
				...granted !== void 0 ? { grantedBalance: granted } : {},
				...typeof currency === "string" && currency !== "" ? { currency } : {},
				...typeof plan === "string" && plan !== "" ? { plan } : {},
				...windows.length === 0 ? {} : { windows },
				...nothingResolved ? {
					error: "invalid",
					reason: "声明路径未命中任何字段"
				} : {}
			};
		} catch {
			declaredGate.fail(gateKey);
			return {
				provider,
				displayName,
				declared: true,
				error: "unreachable"
			};
		}
	}));
}
/**
* 带边界约束的 GET 请求：只 GET、跨源重定向直接失败、响应体上限、共享超时。
* 401/403 → unauthorized（调用方判定）；其余非 2xx / 超限抛错（走 unreachable）。
*/
async function fetchDeclaredBody(url, raw, apiKey) {
	const doRequest = async () => {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS$2);
		try {
			const response = await fetch(url.toString(), {
				method: "GET",
				headers: {
					accept: "application/json",
					...raw ? {} : { authorization: `Bearer ${apiKey}` }
				},
				signal: controller.signal,
				redirect: "manual"
			});
			if (response.type === "opaqueredirect" || response.status >= 300 && response.status < 400) throw new HttpStatusError("redirect", 302);
			if (response.status === 401 || response.status === 403) throw new HttpStatusError("unauthorized", response.status);
			if (!response.ok) throw new HttpStatusError("http-error", response.status);
			const text = await response.text();
			if (text.length > MAX_BODY_BYTES) throw new HttpStatusError("body-too-large", 413);
			return JSON.parse(text);
		} finally {
			clearTimeout(timer);
		}
	};
	return await withRetry(doRequest, {
		retries: 1,
		baseDelayMs: 250,
		maxDelayMs: 2e3
	});
}
/** HTTP 状态错误：携带 statusCode，供调用方区分 unauthorized / 其它。 */
var HttpStatusError = class extends Error {
	statusCode;
	kind;
	constructor(kind, statusCode) {
		super(`${kind}:${String(statusCode)}`);
		this.kind = kind;
		this.statusCode = statusCode;
	}
};
//#endregion
//#region lib/types/reconcile.js
/**
* 余额差交叉校验（reconcile）：用官方账户余额当日变动反推消费，与本地账本
* 的当日官方费用比对。若二者偏差超阈值，提示用户核对价格表或近期账单——
* 这是让计费数据可信的兜底机制，也是对账的稳定锚点。
*
* 只对官方直连渠道（DeepSeek 官方）对账：订阅 / Coding Plan / 第三方中转的
* 消费不动官方余额，强行用余额差替代今日费用会把订阅用户全天的消费归零。
* 充值、授信、币种变化都会让旧基准失去可比性，此时重置基准而非告警。
*
* 纯函数：输入上一基准与本次余额查询结果，输出新基准与对账事件，可独立单测。
*/
/** 余额差对账阈值下限（元）：消费低于该值时不值得提示，避免小金额波动刷屏。 */
const MIN_DRIFT_ABS = .3;
/** 余额差相对容忍度：偏差超过较大一方的该比例才判漂移。 */
const DRIFT_RELATIVE = .15;
/**
* 归一化一个余额快照中的数值；非有限/缺失返回 0（对账只用其差值，0 安全）。
* @param value - 待归一化的数值。
*/
function num(value) {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
/**
* 由本次余额查询与上一基准推出一份新的基准快照（用于下一次对账）。
* @param ref - 上一基准片段（date / currency / at）。
* @param balance - 本次余额查询结果。
* @param nowMs - 当前时刻。
*/
function snapOf(ref, balance, nowMs) {
	return {
		date: ref.date,
		total: num(balance.totalBalance),
		granted: num(balance.grantedBalance),
		topped: num(balance.toppedUpBalance),
		currency: typeof balance.currency === "string" ? balance.currency : ref.currency,
		at: nowMs
	};
}
/**
* 对账：用官方余额当日变动反推消费，与本地账本当日官方费用比对。
* @param prevRef - 上一基准（可为 null，表示首次/基准缺失）。
* @param balance - 本次余额查询结果。
* @param todayOfficialCost - 本地账本当日的官方渠道费用（CNY）。
* @param dayKey - 本地日期键（YYYY-MM-DD）。
* @param nowMs - 当前时刻（epoch ms）。
* @returns 新基准与对账事件；余额不可用（无 totalBalance）时返回 `{ ref: prevRef, event: null }`。
*/
function reconcileBalanceDelta(prevRef, balance, todayOfficialCost, dayKey, nowMs) {
	const total = balance.totalBalance;
	if (typeof total !== "number" || !Number.isFinite(total)) return {
		ref: prevRef,
		event: null
	};
	const snap = snapOf({
		date: dayKey,
		currency: prevRef?.currency ?? ""
	}, balance, nowMs);
	if (prevRef === null || prevRef.date !== dayKey) return {
		ref: snap,
		event: { kind: "baseline" }
	};
	if (prevRef.currency !== snap.currency) return {
		ref: snap,
		event: { kind: "structure-reset" }
	};
	if (snap.granted > prevRef.granted + .009 || snap.topped > prevRef.topped + .009) return {
		ref: snap,
		event: { kind: "structure-reset" }
	};
	const spent = prevRef.total - snap.total;
	if (spent <= .009) return {
		ref: prevRef,
		event: { kind: "flat" }
	};
	const cost = num(todayOfficialCost);
	if (Math.abs(spent - cost) > Math.max(MIN_DRIFT_ABS, DRIFT_RELATIVE * Math.max(spent, cost))) return {
		ref: prevRef,
		event: {
			kind: "drift",
			spent,
			todayOfficialCost: cost
		}
	};
	return {
		ref: prevRef,
		event: {
			kind: "ok",
			spent,
			todayOfficialCost: cost
		}
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
const FETCH_TIMEOUT_MS$1 = 8e3;
/** 每平台熔断门：单个定价上游连续可重试失败（网络 / 5xx / 429）达阈值后短路，
*  避免 6 小时刷新循环与每次启动在已故障的上游上反复打满超时。按 URL 独立。 */
const pricingGate = createCooldownGate({
	failures: 3,
	cooldownMs: 6e4
});
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
/** models.dev 公开目录：pi-ai 预制提供方的上游数据源（USD / 1M tokens）。
* 接入它即与宿主「系统设置里预制的提供方模型」对齐——预制条目来自同一份数据。 */
const MODELS_DEV_URL = "https://models.dev/api.json";
/**
* models.dev provider id → 仪表盘厂商显示名。探测到的模型若其厂商显示名与此
* 映射命中则用之；未命中的回退为探活模型自带的厂商名（系统配置里的显示名）。
* 不作为过滤条件——只用于给 models.dev 条目补一个可读的厂商名。
*/
const MODELS_DEV_PROVIDERS = {
	deepseek: "DeepSeek",
	zhipu: "智谱 AI",
	zhipuai: "智谱 AI",
	zai: "智谱 AI",
	qwen: "阿里通义",
	alibaba: "阿里通义",
	moonshot: "月之暗面",
	moonshotai: "月之暗面",
	volcengine: "字节豆包",
	doubao: "字节豆包",
	minimax: "MiniMax",
	baidu: "百度文心",
	tencent: "腾讯混元",
	hunyuan: "腾讯混元",
	stepfun: "阶跃星辰",
	iflytek: "科大讯飞",
	sensetime: "商汤",
	baichuan: "百川智能",
	"01.ai": "零一万物",
	openai: "OpenAI",
	google: "Google",
	xai: "xAI",
	meta: "Meta",
	anthropic: "Anthropic",
	mistral: "Mistral"
};
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
/** GET a URL's text body with a hard timeout and retry; null on any failure. */
async function fetchText(url) {
	if (!pricingGate.check(url)) return null;
	const doFetch = async () => {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS$1);
		try {
			const response = await fetch(url, { signal: controller.signal });
			if (!response.ok) {
				const error = /* @__PURE__ */ new Error(`HTTP ${String(response.status)}`);
				error.httpStatus = response.status;
				throw error;
			}
			return await response.text();
		} finally {
			clearTimeout(timer);
		}
	};
	try {
		const text = await withRetry(doFetch, {
			retries: 1,
			baseDelayMs: 250,
			maxDelayMs: 2e3
		});
		pricingGate.success(url);
		return text;
	} catch {
		pricingGate.fail(url);
		return null;
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
	if (!Array.isArray(list)) {
		console.warn("[usage-billing] openrouter models response drifted: expected a `data` array");
		return;
	}
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
/** 有限正数收窄（models.dev cost 字段的 durable 边界）。 */
function asPrice(value) {
	return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : void 0;
}
/**
* models.dev 响应 → 目录外补充条目。不再按厂商白名单过滤：凡是有有效
* cost 的模型都纳入（探活模型可能来自任何预制厂商，白名单会漏掉）。厂商
* 显示名优先取映射，未命中用 provider id。导出供测试：纯函数。
* @param data - `https://models.dev/api.json` 的响应体。
* @returns 补充条目（按 provider 顺序稳定；仅含可计价的模型）。
*/
function buildExtraModels(data) {
	if (data === null || typeof data !== "object") return [];
	const catalogKeys = /* @__PURE__ */ new Set([...MODEL_CATALOG.map((entry) => entry.key.toLowerCase()), ...Object.keys(MODEL_KEY_ALIASES).map((key) => MODEL_KEY_ALIASES[key]?.toLowerCase() ?? key.toLowerCase())]);
	const extras = [];
	for (const [providerId, providerDoc] of Object.entries(data)) {
		if (providerDoc === null || typeof providerDoc !== "object") continue;
		const models = providerDoc.models;
		if (models === null || typeof models !== "object") continue;
		for (const [modelId, modelDoc] of Object.entries(models)) {
			const catalogKey = (MODEL_KEY_ALIASES[modelId] ?? modelId).toLowerCase();
			if (catalogKeys.has(catalogKey)) continue;
			const key = catalogKey;
			if (modelDoc === null || typeof modelDoc !== "object") continue;
			const cost = modelDoc.cost;
			if (cost === null || typeof cost !== "object") continue;
			const input = asPrice(cost.input);
			const output = asPrice(cost.output);
			if (input === void 0 || output === void 0) continue;
			const cacheRead = asPrice(cost.cache_read) ?? input * .1;
			const name = modelDoc.name;
			extras.push({
				key,
				name: typeof name === "string" && name !== "" ? name : modelId,
				provider: MODELS_DEV_PROVIDERS[providerId.toLowerCase()] ?? providerId,
				price: {
					input,
					cacheHit: cacheRead,
					output
				}
			});
		}
	}
	return extras;
}
/**
* Fetch the live pricing once at boot. Both upstreams run in parallel; a
* failure in either degrades independently to the built-in value.
* @returns the live pricing snapshot (builtin when everything failed).
*/
async function fetchLivePricing() {
	const [rate, models, modelsDev] = await Promise.all([
		fetchRate(),
		fetchRouterModels(),
		fetchJson(MODELS_DEV_URL)
	]);
	const prices = models === void 0 ? void 0 : buildPrices(models);
	const extraModels = modelsDev === null ? void 0 : buildExtraModels(modelsDev);
	if (rate === void 0 && prices === void 0 && (extraModels === void 0 || extraModels.length === 0)) return { source: "builtin" };
	return {
		source: "live",
		...rate !== void 0 ? { rate } : {},
		...prices !== void 0 ? { prices } : {},
		...extraModels !== void 0 && extraModels.length > 0 ? { extraModels } : {}
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
/** 每平台熔断门：某个订阅适配器连续可重试失败（网络 / 5xx / 429）达阈值后
*  短路由不可用，避免 30 秒轮询对已故障的上游反复打满超时。鉴权失败（unauthorized）
*  是配置问题，不计入熔断。 */
const subscriptionGate = createCooldownGate({
	failures: 3,
	cooldownMs: 6e4
});
/** 空凭据：全部未配置时的初始值。 */
const EMPTY_SUBSCRIPTION_KEYS = {
	kimiApiKey: "",
	zaiApiKey: "",
	opencodeApiKey: "",
	minmaxApiKey: "",
	openrouterApiKey: "",
	zaiRegion: "global"
};
/** 订阅类 provider 的显示名（未命中的回退为 id 本身）。 */
const SUBSCRIPTION_DISPLAY_NAMES = {
	"kimi-coding": "Kimi For Coding",
	"zai-coding-cn": "Z.ai Coding Plan（国内）",
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
	"minimax": "MiniMax Coding Plan",
	"minimax-token-plan": "MiniMax Token Plan",
	"minimax-token-plan-cn": "MiniMax Token Plan（国内）",
	"minimax-cn": "MiniMax Token Plan（国内）",
	"openrouter": "OpenRouter"
};
/** 订阅类 provider id 判定：带 coding / agent-plan / token-plan 后缀，或已知订阅通道。 */
const SUBSCRIPTION_ID_RE = /* @__PURE__ */ new RegExp("(?:^|-)(?:coding|agent[-_]?plan|token[-_]?plan)(?:$|-|_)|^(?:opencode|opencode-go|kimi-coding|zai-coding|minimax|minimax-cn|minimax-token-plan|minimax-token-plan-cn|openrouter)", "i");
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
	"opencode-go": { collect: collectOpenCodeGo },
	"minimax": { collect: collectMiniMax },
	"minimax-cn": { collect: collectMiniMax },
	"minimax-token-plan": { collect: collectMiniMax },
	"minimax-token-plan-cn": { collect: collectMiniMax },
	"openrouter": { collect: collectOpenRouter }
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
function numberOrNull$1(value) {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return null;
}
/** Clamp a percentage to 0–100. */
function clampPercent$1(value) {
	return value === null ? null : Math.max(0, Math.min(100, value));
}
/** Round to one decimal. */
function round1$1(value) {
	return Math.round(value * 10) / 10;
}
/** Number → ISO string. Real epoch-seconds are far below 1e11 (~year 5138), while
*  epoch-ms for any 1973+ instant is >= 1e11 — so treat < 1e11 as seconds. */
function toIso(value) {
	if (value === null || value === void 0 || value === "") return null;
	if (typeof value === "number" && Number.isFinite(value)) {
		const date = new Date(value < 1e11 ? value * 1e3 : value);
		return Number.isNaN(date.getTime()) ? null : date.toISOString();
	}
	const date = new Date(String(value));
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
/** Map a fetch error to a stable status. */
function statusOf$1(error) {
	if (error instanceof Error) {
		if (error.name === "TimeoutError" || error.name === "AbortError") return "unavailable";
		const status = error.httpStatus;
		if (status === 401 || status === 403) return "unauthorized";
		if (status === 429) return "rate-limited";
		if (status === 404) return "unavailable";
	}
	return "unavailable";
}
/** One JSON fetch with a timeout, mapping HTTP failures to typed errors.
*  可重试错误（网络 / 5xx / 429）用指数退避重试一次；401/403/404 不重试。 */
async function requestJson(url, init, timeoutMs) {
	const doFetch = async () => {
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
	};
	return await withRetry(doFetch, {
		retries: 1,
		baseDelayMs: 250,
		maxDelayMs: 2e3
	});
}
/** Parse one Kimi limit window entry. */
function kimiWindow(value, kind) {
	if (value === null || typeof value !== "object") return null;
	const record = value;
	const limit = numberOrNull$1(record.limit ?? record.total);
	const remaining = numberOrNull$1(record.remaining);
	if (remaining === null && limit === null && numberOrNull$1(record.percentage ?? record.usedPercent ?? record.used_percent) === null) return null;
	const hasLimit = limit !== null && limit > 0;
	let usedPercent;
	if (hasLimit) usedPercent = round1$1(clampPercent$1((limit - (remaining ?? 0)) / limit * 100) ?? 0);
	else {
		const percent = numberOrNull$1(record.percentage ?? record.usedPercent ?? record.used_percent);
		usedPercent = percent !== null ? round1$1(clampPercent$1(percent) ?? 0) : remaining === null || remaining <= 0 ? 100 : 0;
	}
	const resetsAt = toIso(record.resetTime ?? record.reset_time ?? record.resetsAt);
	return {
		kind,
		usedPercent,
		remainingPercent: round1$1(100 - usedPercent),
		...remaining !== null ? { remaining } : {},
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
			status: statusOf$1(error),
			windows: []
		};
	}
}
/** Window length in minutes for a Z.ai limit row; null when unknown. */
function zaiWindowMinutes(limit) {
	const unit = numberOrNull$1(limit.unit);
	const number = numberOrNull$1(limit.number);
	if (unit === null || number === null || number <= 0) return null;
	if (unit === 5) return number;
	if (unit === 3) return number * 60;
	if (unit === 1) return number * 24 * 60;
	if (unit === 6) return number * 7 * 24 * 60;
	return null;
}
/** Used percent for a Z.ai limit row. */
function zaiUsedPercent(limit) {
	const total = numberOrNull$1(limit.usage);
	const remaining = numberOrNull$1(limit.remaining);
	const current = numberOrNull$1(limit.currentValue ?? limit.current_value);
	if (total !== null && total > 0) {
		const used = remaining === null ? current : current === null ? total - remaining : Math.max(total - remaining, current);
		if (used !== null) return clampPercent$1(Math.max(0, Math.min(total, used)) / total * 100);
	}
	return clampPercent$1(numberOrNull$1(limit.percentage ?? limit.usedPercent ?? limit.used_percent));
}
/** One Z.ai quota window row. */
function zaiWindow(limit, kind, fallbackReset = null) {
	const usedPercent = zaiUsedPercent(limit);
	if (usedPercent === null) return null;
	const resetsAt = toIso(limit.nextResetTime ?? limit.next_reset_time) ?? fallbackReset;
	return {
		kind,
		usedPercent: round1$1(usedPercent),
		remainingPercent: round1$1(100 - usedPercent),
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
			status: statusOf$1(error),
			windows: []
		};
	}
}
/** Parse one OpenCode Go window object. */
function goWindow(value, kind) {
	if (value === null || typeof value !== "object") return null;
	const record = value;
	const ratioSource = record.usagePercent ?? record.usedPercent ?? record.percentUsed ?? record.percentage;
	const fromRatioField = ratioSource !== void 0 && ratioSource !== null;
	let usedPercent = clampPercent$1(numberOrNull$1(fromRatioField ? ratioSource : record.percent));
	if (usedPercent === null) {
		const used = numberOrNull$1(record.used ?? record.consumed);
		const limit = numberOrNull$1(record.limit ?? record.total ?? record.quota);
		if (used !== null && limit !== null && limit > 0) usedPercent = clampPercent$1(used / limit * 100);
	}
	if (usedPercent === null) return null;
	if (fromRatioField && usedPercent <= 1 && usedPercent >= 0) usedPercent *= 100;
	const resetSeconds = numberOrNull$1(record.resetInSec ?? record.resetInSeconds ?? record.resetSeconds);
	const resetsAt = resetSeconds === null ? toIso(record.resetAt ?? record.resetsAt ?? record.nextReset) : new Date(Date.now() + Math.max(0, resetSeconds) * 1e3).toISOString();
	return {
		kind,
		usedPercent: round1$1(clampPercent$1(usedPercent) ?? 0),
		remainingPercent: round1$1(100 - (clampPercent$1(usedPercent) ?? 0)),
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
		windows: [],
		hint: "未配置 key；可在 llm-pi-ai 里给 opencode(opencode-go) 配 apiKeyEnv，或让本机 OpenCode 凭据（~/.local/share/opencode/auth.json）可用"
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
			status: statusOf$1(error),
			windows: []
		};
	}
}
/**
* 单条 MiniMax 记录抽一个窗口。`remaining_percent` 是剩余%;已用% = 100 - 剩余。
* `status === 3` 表示不限量档,跳过该窗。导出供测试:纯函数。
* @param record - 一条 model_remains 记录。
* @param kind - 窗口类型(session=5h 滚动 / weekly=7d)。
* @param remainPctKey - 剩余百分比字段。
* @param statusKey - 限量状态字段(3=不限量)。
* @param resetKey - 重置时刻字段(epoch 秒/毫秒/ISO)。
*/
function minmaxWindow(record, kind, remainPctKey, statusKey, resetKey) {
	if (record === void 0) return null;
	if (Number(record[statusKey]) === 3) return null;
	const remain = numberOrNull$1(record[remainPctKey]);
	if (remain === null) return null;
	const usedPercent = round1$1(clampPercent$1(100 - (remain <= 1 ? remain * 100 : remain)) ?? 0);
	const resetsAt = toIso(record[resetKey]);
	return {
		kind,
		usedPercent,
		remainingPercent: round1$1(100 - usedPercent),
		...resetsAt === null ? {} : { resetsAt }
	};
}
/**
* 解析 MiniMax Token Plan `/v1/token_plan/remains` 响应。取 general(或 MiniMax-M*)
* 一行抽出 5h/7d 窗口(total_count 常为 0,以 remaining_percent 为准),不按模型拆条。
* 导出供测试:纯函数。
* @param body - 接口响应 JSON。
* @returns 窗口列表;无可用窗口时为空数组。
*/
function parseMiniMaxRemains(body) {
	const doc = body ?? {};
	const payload = doc.data ?? doc;
	const rows = Array.isArray(payload.model_remains) ? payload.model_remains : Array.isArray(doc.model_remains) ? doc.model_remains : [];
	if (rows.length === 0) return [];
	const record = rows.find((row) => {
		const name = String(row.model_name ?? "").toLowerCase();
		return name === "general" || /^minimax-m/i.test(name);
	}) ?? rows[0] ?? void 0;
	return [minmaxWindow(record, "session", "current_interval_remaining_percent", "current_interval_status", "end_time"), minmaxWindow(record, "weekly", "current_weekly_remaining_percent", "current_weekly_status", "weekly_end_time")].filter((hit) => hit !== null);
}
/**
* Resolve the MiniMax API host based on the configured provider id.
*
* 国内开发者走 MiniMax（`api.minimaxi.com`），海外走 MiniMax（`minimaxi.com`）。
* User-explicit `config.baseUrl` wins when set, so deployments in either
* region can still override the auto-pick (e.g. proxies / staging).
*/
function resolveMiniMaxBaseUrl(config) {
	if (typeof config.baseUrl === "string" && config.baseUrl.trim() !== "") return config.baseUrl;
	return config.provider === "minimax-cn" || config.provider === "minimax-token-plan-cn" ? "https://api.minimaxi.com" : "https://www.minimaxi.com";
}
/** Display name for a MiniMax quota row, aligned with the display-name map. */
function minmaxDisplayName(provider) {
	return SUBSCRIPTION_DISPLAY_NAMES[provider] ?? "MiniMax Coding Plan";
}
/** MiniMax Token Plan / Coding Plan 的 key 判别：普通按量 API key 以 `sk-` 开头，
*  Token Plan（订阅套餐）key 以 `sk-cp-` 开头。据此区分一个 key 是订阅还是按量，
*  供查询失败时给出「key 类型 / region」定向提示，避免把按量 key 误当 token-plan
*  查询后只剩一句笼统的「响应异常」。 */
function isMiniMaxTokenPlanKey(apiKey) {
	return apiKey.startsWith("sk-cp-");
}
/** 构造 MiniMax Token Plan 查询端点：避免 base 已含 `/v1` 时拼出 `/v1/v1/...`。 */
function miniMaxEndpoint(base) {
	const trimmed = base.replace(/\/+$/, "");
	return trimmed.endsWith("/v1") ? `${trimmed}/token_plan/remains` : `${trimmed}/v1/token_plan/remains`;
}
/** Collect the MiniMax Token Plan quota (CN + INTL). */
async function collectMiniMax(keys, config, timeoutMs) {
	const apiKey = keys.minmaxApiKey.trim();
	const base = resolveMiniMaxBaseUrl(config);
	const displayName = minmaxDisplayName(config.provider);
	if (apiKey === "") return {
		provider: config.provider,
		displayName,
		status: "not-configured",
		windows: []
	};
	const tokenPlanKey = isMiniMaxTokenPlanKey(apiKey);
	try {
		const windows = parseMiniMaxRemains(await requestJson(miniMaxEndpoint(base), { headers: {
			authorization: `Bearer ${apiKey}`,
			accept: "application/json"
		} }, timeoutMs));
		if (windows.length > 0) return {
			provider: config.provider,
			displayName,
			status: "ok",
			windows,
			...tokenPlanKey ? {} : { hint: "此 key 未以 sk-cp- 开头（可能为按量 API）；但 Token Plan 接口返回了额度，故按 Token Plan 展示" }
		};
		return {
			provider: config.provider,
			displayName,
			status: "invalid-response",
			windows,
			hint: tokenPlanKey ? "Token Plan key 未返回额度：可能是 region 不匹配，请在 provider 的 baseURL 指向国内 api.minimaxi.com 或国际 api.minimax.io" : "此 key 未以 sk-cp- 开头，可能为按量 API 而非 Token Plan；如需订阅额度请用 sk-cp- 开头的 Token Plan key"
		};
	} catch (error) {
		return {
			provider: config.provider,
			displayName,
			status: statusOf$1(error),
			windows: []
		};
	}
}
/**
* 解析 OpenRouter `/api/v1/credits` 响应:已用% = total_usage / total_credits。
* 导出供测试:纯函数。
* @param body - 接口响应 JSON。
* @returns 窗口列表;无有效额度时为 []。
*/
function parseOpenRouterCredits(body) {
	const doc = body ?? {};
	const data = doc.data ?? doc;
	const total = numberOrNull$1(data.total_credits ?? data.credits);
	const used = numberOrNull$1(data.total_usage ?? data.usage);
	if (total === null || total <= 0 || used === null) return [];
	const usedPercent = round1$1(clampPercent$1(used / total * 100) ?? 0);
	const resetsAt = toIso(data.resets_at ?? data.next_reset_time);
	return [{
		kind: "billing",
		usedPercent,
		remainingPercent: round1$1(100 - usedPercent),
		...resetsAt === null ? {} : { resetsAt }
	}];
}
/** Collect the OpenRouter prepaid credits usage. */
async function collectOpenRouter(keys, config, timeoutMs) {
	const apiKey = keys.openrouterApiKey.trim();
	const base = config.baseUrl ?? "https://openrouter.ai";
	if (apiKey === "") return {
		provider: config.provider,
		displayName: "OpenRouter",
		status: "not-configured",
		windows: [],
		hint: "未配置 key；OpenRouter 的额度接口只认 Management Key，用推理 key 会 401"
	};
	try {
		const windows = parseOpenRouterCredits(await requestJson(`${base}/api/v1/credits`, { headers: {
			authorization: `Bearer ${apiKey}`,
			accept: "application/json"
		} }, timeoutMs));
		return {
			provider: config.provider,
			displayName: "OpenRouter",
			status: windows.length > 0 ? "ok" : "invalid-response",
			windows
		};
	} catch (error) {
		const status = statusOf$1(error);
		return {
			provider: config.provider,
			displayName: "OpenRouter",
			status,
			windows: [],
			...status === "unauthorized" ? { hint: "OpenRouter 额度接口只认 Management Key；你配的 key 返回了 401，请换成管理密钥（在 openrouter.ai/settings/keys 创建）" } : {}
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
	return await Promise.all(plans.map(async (plan) => {
		const adapter = SUBSCRIPTION_ADAPTERS[plan.provider];
		if (adapter === void 0) return {
			provider: plan.provider,
			displayName: plan.provider,
			status: "unavailable",
			windows: []
		};
		if (!subscriptionGate.check(plan.provider)) return {
			provider: plan.provider,
			displayName: plan.provider,
			status: "unavailable",
			windows: []
		};
		const quota = await adapter.collect(keys, plan, timeoutMs);
		if (quota.status === "unavailable" || quota.status === "rate-limited") subscriptionGate.fail(plan.provider);
		else subscriptionGate.success(plan.provider);
		return quota;
	}));
}
//#endregion
//#region lib/types/relay.js
/**
* 中转站额度查询（node 半区）：识别并读取 New API 系与 Sub2API 的「余额 / 额度窗口」。
*
* 适用场景：用户把某条 llm-pi-ai provider 路由的 `baseURL` 指向第三方中转站
* （New API / One API / VoAPI / Sub2API 等）。这类站点不卖官方余额，卖的是
* 按 key 的额度（used/total）或多个滚动窗口。本模块对**配了 baseURL 且有
* apiKeyEnv** 的路由逐个探测两个已知端点，能解析出额度就返回；解析不出的
* 静默标记 unavailable，绝不臆造金额（与 balance/subscriptions 一致的姿态）。
*
* 探测顺序：先 Sub2API `/v1/usage`（标准化程度高），再 New API `/api/status`；
* 404 = 不是该套程序，继续试下一种；401/403 = 是但 key 不对（unauthorized）；
* 网络/5xx 走熔断门短路一段时间。同一站点多把 key 是独立额度，分别列出。
*/
/** 单个中转站额度请求的熔断门：按 baseURL 独立熔断（各站点互不干扰）。 */
const relayGate = createCooldownGate({
	failures: 3,
	cooldownMs: 6e4
});
/** Abort a relay fetch when the upstream hangs beyond this budget. */
const FETCH_TIMEOUT_MS = 8e3;
/** 指纹识别缓存 TTL（毫秒）：识别结果低频变化，5 分钟内同 origin 不再重复探测。 */
const FINGERPRINT_TTL_MS = 3e5;
/** 每 origin 的识别结果缓存：`kind` 是识别出的中转站程序，`at` 是探测时刻。 */
const fingerprintCache = /* @__PURE__ */ new Map();
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
/** Map a fetch error to a stable status (same taxonomy as subscriptions). */
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
/**
* GET 一个中转站端点并返回 JSON。可重试错误（网络 / 5xx / 429）退避重试一次；
* 401/403/404 不重试。返回 `{ ok, status, data }`，由调用方区分"不是这套程序
* （404）"与"是但读取失败（其他非 2xx）"。
*/
async function fetchRelayJson(url, apiKey) {
	const doFetch = async () => {
		const response = await fetch(url, {
			headers: {
				accept: "application/json",
				authorization: `Bearer ${apiKey}`
			},
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
		});
		if (!response.ok) {
			if (response.status === 404) return {
				ok: false,
				status: 404
			};
			const error = /* @__PURE__ */ new Error(`HTTP ${String(response.status)}`);
			error.httpStatus = response.status;
			throw error;
		}
		return {
			ok: true,
			status: response.status,
			data: await response.json()
		};
	};
	return await withRetry(doFetch, {
		retries: 1,
		baseDelayMs: 250,
		maxDelayMs: 2e3
	});
}
/** 新建一个额度窗口行（未解析出百分比时不产出）。 */
function windowOf(kind, usedPercent, resetsAt) {
	const used = clampPercent(usedPercent);
	if (used === null) return null;
	return {
		kind,
		usedPercent: round1(used),
		remainingPercent: round1(Math.max(0, 100 - used)),
		...resetsAt === void 0 ? {} : { resetsAt }
	};
}
/**
* 解析 Sub2API `/v1/usage` 响应：能取到 balance 或 quota/used 就识别为 sub2api。
* 三种形态（窗口 / 分组 / 钱包余额）都宽容处理：有 `quota/total` 给出窗口，
* 有 `balance` 给出余额，两者可同时存在。
* @param data - `/v1/usage` 的 JSON 响应。
* @returns 解析结果；两者都取不到返回 null（不是 Sub2API 或响应漂移）。
*/
function parseSub2ApiUsage(data) {
	if (data === null || typeof data !== "object") return null;
	const doc = data;
	const balance = numberOrNull(doc.balance);
	const total = numberOrNull(doc.quota ?? doc.total_quota ?? doc.limit);
	const used = numberOrNull(doc.used_quota ?? doc.usage);
	if (balance === null && total === null) return null;
	const windows = [];
	if (total !== null && used !== null) {
		const pct = used / total * 100;
		const window = windowOf("weekly", Number.isFinite(pct) ? pct : null);
		if (window !== null) windows.push(window);
	}
	return {
		...balance !== null ? { balance } : {},
		...windows.length === 0 ? {} : { windows }
	};
}
/**
* 解析 New API `/api/status` 响应：New API 系（One API / VoAPI 分支）的额度是
* 按记录行的 ratio（已用比例）。只给出窗口，不猜金额（币种防猜）。
* @param data - `/api/status` 的 JSON 响应。
* @returns 窗口；取不到比例返回 null（响应漂移）。
*/
function parseNewApiStatus(data) {
	if (data === null || typeof data !== "object") return null;
	const inner = data.data;
	if (inner === null || typeof inner !== "object") return null;
	const ratio = numberOrNull(inner.ratio);
	const used = numberOrNull(inner.used_quota);
	const total = numberOrNull(inner.total_quota ?? inner.quota);
	let pct = null;
	if (ratio !== null) pct = ratio * 100;
	else if (total !== null && used !== null) pct = used / total * 100;
	if (pct === null) return null;
	const window = windowOf("billing", Number.isFinite(pct) ? pct : null);
	return window === null ? null : { windows: [window] };
}
/** 归一化站点 origin（与聚合层 `siteOriginOf` 同口径）。 */
function originOf(baseURL) {
	try {
		return new URL(baseURL).origin;
	} catch {
		return baseURL;
	}
}
/**
* 已知官方（非中转站）端点 host 判定：这些域是厂商自己的官方 API，卖的是
* 官方按量余额而非中转站按 key 的额度，探测其 `/v1/usage`、`/api/status`
* 子路径只会得到 404/非中转站格式，因而面板应排除它们，避免误判为
* 「未识别」。中转站面板只列真正的第三方中转程序。
*/
const OFFICIAL_HOSTS = /* @__PURE__ */ new Set([
	"api.deepseek.com",
	"api.openai.com",
	"open.bigmodel.cn",
	"api.moonshot.cn",
	"api.siliconflow.cn",
	"api.stepfun.com",
	"api.x.ai",
	"api.anthropic.com",
	"generativelanguage.googleapis.com"
]);
/**
* 判断一个 baseURL 是否指向已知官方端点（而非第三方中转站）。
* @param baseURL - llm-pi-ai provider 路由的端点地址。
* @returns 官方端点返回 true（中转站面板应排除）。
*/
function isOfficialBaseUrl(baseURL) {
	const host = originOf(baseURL).replace(/^https?:\/\//, "");
	return host !== baseURL && OFFICIAL_HOSTS.has(host);
}
/** 构造端点 URL：`/v1/usage` 与 `/api/status` 都以 baseURL 为宿主解析。 */
function endpointOf(baseURL, path) {
	return new URL(path, baseURL).toString();
}
/**
* 用已知程序类型查询该路由的额度（用当前 key）。额度按 key 独立，因此即便
* 指纹缓存已识别出站点类型，也仍要实际发一次请求读出本 key 的余额/窗口。
* @param baseURL - 站点端点。
* @param apiKey - 已解析的本路由 key。
* @param kind - 已识别出的程序类型。
* @returns 解析出的余额/窗口；取不到时返回 null（漂移或端点不可用）。
*/
async function readRelayByKind(baseURL, apiKey, kind) {
	const res = await fetchRelayJson(endpointOf(baseURL, kind === "sub2api" ? "/v1/usage" : "/api/status"), apiKey);
	if (!res.ok) return null;
	return kind === "sub2api" ? parseSub2ApiUsage(res.data) : parseNewApiStatus(res.data);
}
/**
* 查询单个中转站路由的额度。先试 Sub2API，再试 New API；任一读出额度即返回。
* @param ctx - host context carrying the credentials seam.
* @param route - 待探测的路由（baseURL + apiKeyEnv）。
* @returns 该路由的一行额度结果（status 标记成败）。
*/
async function queryRelayQuota(ctx, route) {
	const base = {
		route: route.route,
		origin: originOf(route.baseURL),
		displayName: route.displayName ?? route.route
	};
	const gateKey = `${route.baseURL}::${route.apiKeyEnv}`;
	if (!relayGate.check(gateKey)) return {
		...base,
		kind: "unknown",
		status: "unavailable"
	};
	let hit;
	try {
		hit = await ctx.credentials.resolve(credentialRef(route.apiKeyEnv));
	} catch {
		return {
			...base,
			kind: "unknown",
			status: "not-configured"
		};
	}
	if (hit === void 0 || hit.value === "") return {
		...base,
		kind: "unknown",
		status: "not-configured"
	};
	const cached = fingerprintCache.get(base.origin);
	const knownKind = cached !== void 0 && Date.now() - cached.at < FINGERPRINT_TTL_MS ? cached.kind : void 0;
	try {
		if (knownKind === "sub2api" || knownKind === "new-api") {
			const parsed = await readRelayByKind(route.baseURL, hit.value, knownKind);
			if (parsed !== null) {
				relayGate.success(gateKey);
				return {
					...base,
					kind: knownKind,
					status: "ok",
					...parsed.balance !== void 0 ? { balance: parsed.balance } : {},
					...parsed.windows !== void 0 ? { windows: parsed.windows } : {}
				};
			}
			relayGate.fail(gateKey);
			return {
				...base,
				kind: knownKind,
				status: "invalid-response"
			};
		}
		const sub2 = await fetchRelayJson(endpointOf(route.baseURL, "/v1/usage"), hit.value);
		if (sub2.ok) {
			const parsed = parseSub2ApiUsage(sub2.data);
			if (parsed !== null) {
				relayGate.success(gateKey);
				fingerprintCache.set(base.origin, {
					kind: "sub2api",
					at: Date.now()
				});
				return {
					...base,
					kind: "sub2api",
					status: "ok",
					...parsed.balance !== void 0 ? { balance: parsed.balance } : {},
					...parsed.windows !== void 0 ? { windows: parsed.windows } : {}
				};
			}
			relayGate.fail(gateKey);
			return {
				...base,
				kind: "sub2api",
				status: "invalid-response"
			};
		}
		const na = await fetchRelayJson(endpointOf(route.baseURL, "/api/status"), hit.value);
		if (na.ok) {
			const parsed = parseNewApiStatus(na.data);
			if (parsed !== null) {
				relayGate.success(gateKey);
				fingerprintCache.set(base.origin, {
					kind: "new-api",
					at: Date.now()
				});
				return {
					...base,
					kind: "new-api",
					status: "ok",
					...parsed.windows !== void 0 ? { windows: parsed.windows } : {}
				};
			}
			relayGate.fail(gateKey);
			return {
				...base,
				kind: "new-api",
				status: "invalid-response"
			};
		}
		relayGate.fail(gateKey);
		return {
			...base,
			kind: "unknown",
			status: "unavailable"
		};
	} catch (error) {
		const status = statusOf(error);
		if (status !== "unauthorized") relayGate.fail(gateKey);
		return {
			...base,
			kind: "unknown",
			status
		};
	}
}
/**
* 批量查询多个中转站路由的额度（每个独立成败，互不影响）。
* @param ctx - host context carrying the credentials seam.
* @param routes - 配了 baseURL 且 apiKeyEnv 有值的路由列表。
* @returns 每个路由一行的额度结果。
*/
async function queryRelayQuotas(ctx, routes) {
	return await Promise.all(routes.map(async (route) => queryRelayQuota(ctx, route)));
}
//#endregion
//#region lib/types/client/usage-billing-settings.js
/**
* usage-stats 工具开关的共享设置契约（node 与 client 两端共用）。
*
* 宿主把已注册的设置命名空间服务给浏览器；node 半区在 apply 阶段读一次该值决定
* 是否向模型注入 `usage_stats` 工具（工具注入是启动期决策，改开关后重载应用生效），
* client 半区在「设置」Tab 渲染开关并写入同一命名空间。缺省的默认行为是关闭——
* 避免该工具默认占用模型每次请求的上下文（coding 场景通常在仪表盘看用量）。
*/
/** 设置命名空间 id（小写 kebab-case）。 */
const BILLING_SETTINGS_NAMESPACE = "ui-usage-billing";
/** 该命名空间下用户可编辑的字段名。 */
const ENABLE_USAGE_STATS_TOOL_FIELD = "enableUsageStatsTool";
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
/** Peer 地址是否为回环（本地）。回环防护：本插件的端点只供本机浏览器用，
*  局域网/远端请求一律拒绝，避免面板数据（含中转站 origin 与余额）外泄。 */
function isLoopbackPeer(req) {
	const address = req.socket.remoteAddress;
	if (address === void 0) return false;
	return address === "::1" || address.startsWith("127.") || address.startsWith("::ffff:127.");
}
/** 校验 Host 头是本机回环（精确 127.0.0.0/8 / ::1 / localhost 或空，供 curl 不带 Host 的极简请求）。
*  拒绝 `127.0.0.1.attacker.com` 这类以 `127.` 开头但解析到外部的 DNS rebinding 域名：
*  只用 `startsWith('127.')` 会被它穿透，必须精确匹配回环 IP 的字面量。 */
function isLoopbackHost(req) {
	const host = req.headers.host;
	if (host === void 0 || host === "") return true;
	const name = host.split(":")[0];
	return name === "localhost" || name === "::1" || name !== void 0 && /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(name);
}
/** 校验 Origin 头是否回环（写操作用，防止跨站表单/fetch 改写设置）。Origin 缺失
*  （curl 或同源 fetch 不带）视为放行，交给下方的 Content-Type 校验兜底；Origin 存在
*  但主机非回环则拒绝——跨站脚本发起的写请求必带攻击者域名的 Origin。 */
function isLoopbackOrigin(origin) {
	if (origin === void 0 || origin === "") return true;
	try {
		const host = new URL(origin).hostname;
		return host === "localhost" || host === "::1" || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
	} catch {
		return false;
	}
}
/**
* 回环防护守卫：仅接受回环 GET 请求（peer socket 地址 + Host 头同时校验）。
* 不满足时返回 403 并结束响应；调用方在 handler 顶部调用，返回 false 即已拒绝。
* @param req - 当前请求。
* @param res - 当前响应。
* @returns 是否放行；false = 已拒绝并结束响应。
*/
function guardLoopback(req, res) {
	if (!(req.method === "GET" || req.method === "POST") || !isLoopbackPeer(req) || !isLoopbackHost(req)) {
		res.writeHead(403, { "content-type": "application/json; charset=utf-8" });
		res.end(JSON.stringify({ error: "forbidden: loopback only" }));
		return false;
	}
	return true;
}
/**
* 设置命名空间校验（上游 alpha.1 `settingsNamespace` 的本地化，issue #28）：
* alpha.2 起该函数不再从 `@deepseek-ai/dsh-settings` 导出，但上游内部保留
* 同一 pattern——本地按同一规则校验，预览宿主 API 漂移不再影响插件装载。
*/
const SETTINGS_NAMESPACE_PATTERN = /^[a-z][a-z0-9-]*$/;
/** 校验并透过合法命名空间 id；非法值 fail-loud（与上游原行为一致）。 */
function validateSettingsNamespace(value) {
	if (!SETTINGS_NAMESPACE_PATTERN.test(value)) throw new TypeError(`settings namespace "${value}" must match ${String(SETTINGS_NAMESPACE_PATTERN)}`);
	return value;
}
/** usage_stats 工具开关的设置命名空间 id（下端与 node 共用同一常量）。 */
const usageBillingSettingsNs = validateSettingsNamespace(BILLING_SETTINGS_NAMESPACE);
/** 该命名空间的 wire schema：`enableUsageStatsTool` 布尔，默认关闭（issue 诉求）。 */
const UsageBillingSettingsSchema = z.object({ [ENABLE_USAGE_STATS_TOOL_FIELD]: z.boolean().default(false) });
/** 实时定价的后台刷新间隔（毫秒）：汇率/模型价低频变化，6 小时一次足够。 */
const PRICING_REFRESH_INTERVAL_MS = 216e5;
/** 订阅套餐额度缓存时长（毫秒）：上游配额 API 低频变化，5 分钟足够。 */
const SUBSCRIPTION_CACHE_MS = 3e5;
const BALANCE_CACHE_MS = 3e5;
/** DeepSeek 余额查询的默认凭据引用（与 llm-deepseek 的默认引用一致）。 */
const DEFAULT_BALANCE_API_KEY_ENV = "DEEPSEEK_API_KEY";
/**
* 本插件版本号：从包自身的 package.json 读取（单一来源），随 usage-stats
* 下发，供「设置 → 插件信息卡」展示。发布版 lib/index.js 相对包根解析。
*/
const PACKAGE_VERSION = createRequire(import.meta.url)("../package.json").version ?? "0.0.0";
/** 统计快照的落盘节流（毫秒）：前端 30 秒轮询，快照最多每 30 秒写一次。 */
const SNAPSHOT_INTERVAL_MS = 3e4;
/** 鉴权失败告警冷却（毫秒）：同一 provider 在窗口内只提示一次，避免 30 秒轮询刷屏。 */
const AUTH_WARN_COOLDOWN_MS = 18e5;
/**
* 鉴权失败分类告警（P1-5）：余额 / 订阅查询返回 unauthorized 时，按
* `source:provider` 去重并冷却告警，提示检查 llm-pi-ai 里该 provider 的 apiKeyEnv。
*/
const authWarnedAt = /* @__PURE__ */ new Map();
function warnAuthOnce(source, provider, displayName) {
	const key = `${source}:${provider}`;
	const now = Date.now();
	const last = authWarnedAt.get(key);
	if (last !== void 0 && now - last < AUTH_WARN_COOLDOWN_MS) return;
	authWarnedAt.set(key, now);
	console.warn(`[usage-billing] ${displayName}（${provider}）鉴权失败：请检查 llm-pi-ai 设置中该 provider 的凭据环境变量是否正确/有效。`);
}
/**
* Create the atomic file-backed durable-ledger store. The previous complete file
* is retained as `.bak`; a malformed/missing main file falls back to that backup.
*/
function createFileUsageLedgerStore(ledgerPath) {
	return {
		async load() {
			for (const path of [ledgerPath, `${ledgerPath}.bak`]) try {
				const parsed = JSON.parse(await readFile(path, "utf8"));
				if (parsed !== null && typeof parsed === "object") {
					const candidate = parsed;
					if (candidate.version === 1 && Array.isArray(candidate.sessions)) return parsed;
				}
			} catch {}
		},
		async save(document) {
			await mkdir(dirname(ledgerPath), {
				recursive: true,
				mode: 448
			});
			await withFileLock(ledgerPath, async () => {
				try {
					const existing = await readFile(ledgerPath, "utf8");
					JSON.parse(existing);
					await writeFileAtomic(`${ledgerPath}.bak`, existing, {
						mode: 384,
						dirMode: 448
					});
				} catch {}
				await writeFileAtomic(ledgerPath, JSON.stringify(document), {
					mode: 384,
					dirMode: 448
				});
			});
		}
	};
}
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
/** key 只取字符串凭据字段：zaiRegion 是区域枚举，由下方区域逻辑单独赋值。 */
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
	},
	{
		provider: "minimax",
		key: "minmaxApiKey"
	},
	{
		provider: "minimax-token-plan",
		key: "minmaxApiKey"
	},
	{
		provider: "minimax-token-plan-cn",
		key: "minmaxApiKey"
	},
	{
		provider: "minimax-cn",
		key: "minmaxApiKey"
	},
	{
		provider: "openrouter",
		key: "openrouterApiKey"
	}
];
/** 读 llm-pi-ai 设置的 `providers` 字典（`<route> → { apiKeyEnv?, baseURL?, displayName? }`）。
*  余额与订阅查询复用同一份来源：部署为某个 provider 配一次，多 surface 共享。
* @param settings - the settings service (reads the llm-pi-ai namespace).
* @returns the providers dict; empty when the namespace is unreadable.
*/
async function readPiAiProviders(settings) {
	try {
		const providers = (settings.describe({ redactSecrets: true }).find((descriptor) => descriptor.ns === "llm-pi-ai")?.value)?.providers;
		const out = {};
		for (const [route, entry] of Object.entries(providers ?? {})) {
			if (entry === null || typeof entry !== "object") continue;
			const { apiKeyEnv, baseURL, displayName } = entry;
			out[route] = {
				...typeof apiKeyEnv === "string" ? { apiKeyEnv } : {},
				...typeof baseURL === "string" ? { baseURL } : {},
				...typeof displayName === "string" ? { displayName } : {}
			};
		}
		return out;
	} catch {
		return {};
	}
}
/** 同步读取 provider 路由的 baseURL 视图（中转站零配置发现来源）。
*  `settings.describe` 是同步调用，聚合器每次折叠取最新站点映射，无需缓存/过期。
*  注意：返回**全部可读路由**（baseURL 可选），聚合层据此区分「路由存在但无
*  baseURL=直连」与「路由已删除=未知路由」两种不同归属。
* @param settings - the settings service (reads the llm-pi-ai namespace).
* @returns `<route> → { baseURL? }`；命名空间不可读时返回空。
*/
function readPiAiProviderRoutes(settings) {
	try {
		const providers = (settings.describe({ redactSecrets: true }).find((descriptor) => descriptor.ns === "llm-pi-ai")?.value)?.providers;
		const out = {};
		for (const [route, entry] of Object.entries(providers ?? {})) {
			if (entry === null || typeof entry !== "object") continue;
			const baseURL = entry.baseURL;
			out[route] = typeof baseURL === "string" && baseURL !== "" ? { baseURL } : {};
		}
		return out;
	} catch {
		return {};
	}
}
/**
* 构造「cwd → 工作区标题」解析器（host 的 `workspaceRegistry` 为可选依赖）。
* 匹配与 TokenLedger 同口径：会话 cwd 等于某工作区 path、或位于其子目录时，用
* 工作区标题命名该项目（子目录的会话也计入）；否则返回 undefined（回退到目录名）。
* registry 缺席/读取失败都返回 undefined，绝不抛错（可选依赖，不影响主流程）。
* @param ctx - host context carrying the optional workspace registry.
* @returns 标题解析函数；registry 不可用时 undefined。
*/
function buildWorkspaceTitleResolver(ctx) {
	let registry;
	try {
		registry = ctx.get("workspaceRegistry");
	} catch {
		return;
	}
	if (registry === void 0 || typeof registry.list !== "function") return void 0;
	const reg = registry;
	return (cwd) => {
		if (cwd === "") return void 0;
		try {
			const records = reg.list() ?? [];
			const exact = records.find((record) => record.path === cwd);
			if (exact !== void 0) return exact.title;
			for (const record of records) if (record.path !== "" && cwd.startsWith(`${record.path}/`)) return record.title;
			return;
		} catch {
			return;
		}
	};
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
	if (keys.opencodeApiKey === "") keys.opencodeApiKey = await readOpenCodeToken();
	return {
		keys,
		identified: identifySubscriptionPlans(providers)
	};
}
/** 读本机 OpenCode 客户端的凭据 token；取不到返回空串（安静退回）。 */
async function readOpenCodeToken() {
	try {
		const auth = JSON.parse(await readFile(join(homedir(), ".local", "share", "opencode", "auth.json"), "utf8"));
		if (typeof auth === "string" && auth !== "") return auth;
		if (auth !== null && typeof auth === "object") {
			const record = auth;
			const token = record.token ?? record.key ?? record.apiKey;
			if (typeof token === "string" && token !== "") return token;
		}
	} catch {}
	return "";
}
/**
* Host plugin body: serve real aggregated usage to the browser dashboard.
* @param ctx - host context carrying webServer and sessionPersistence.
* @param config - optional statsPath override.
*/
function apply(ctx, config = {}) {
	let usageSettingsScope;
	const cwd = process.cwd();
	const snapshotPath = config.snapshotPath ?? join(homedir(), ".dsh/.dsh-usage-stats.json");
	const ledgerStore = createFileUsageLedgerStore(config.ledgerPath ?? join(homedir(), ".dsh/.dsh-usage-ledger.json"));
	const reconcilePath = config.reconcilePath ?? join(homedir(), ".dsh/.dsh-usage-reconcile.json");
	let reconcileRef = null;
	(async () => {
		try {
			const ref = JSON.parse(await readFile(reconcilePath, "utf8")).ref;
			if (ref !== null && typeof ref === "object") {
				const candidate = ref;
				if (typeof candidate.date === "string" && typeof candidate.total === "number" && typeof candidate.granted === "number" && typeof candidate.topped === "number" && typeof candidate.currency === "string") reconcileRef = candidate;
			}
		} catch {}
	})();
	const persistReconcileRef = () => {
		if (reconcileRef === null) return;
		const payload = JSON.stringify({ ref: reconcileRef });
		writeFileAtomic(reconcilePath, payload, {
			mode: 384,
			dirMode: 448
		}).catch(() => {});
	};
	const workspaceTitleResolver = buildWorkspaceTitleResolver(ctx);
	applyUserModelAliases(config.modelKeyAliases);
	const aggregator = createUsageAggregator(ctx.sessionPersistence, {
		...config.subscriptionProviders === void 0 ? {} : { subscriptionProviders: config.subscriptionProviders },
		...config.routeAliases === void 0 ? {} : { routeAliases: config.routeAliases },
		resolveRoutes: () => readPiAiProviderRoutes(ctx.settings),
		...workspaceTitleResolver === void 0 ? {} : { resolveWorkspaceTitle: workspaceTitleResolver },
		...config.searchCallEstimateCny === void 0 ? {} : { searchCallEstimateCny: config.searchCallEstimateCny },
		ledger: ledgerStore
	});
	const candidates = [
		config.statsPath,
		process.env.DSH_USAGE_STATS,
		join(cwd, ".dsh-usage-stats.json"),
		snapshotPath
	].filter((path) => typeof path === "string" && path.length > 0);
	let lastSnapshotAt = 0;
	const persistSnapshot = (doc) => {
		const now = Date.now();
		if (now - lastSnapshotAt < SNAPSHOT_INTERVAL_MS) return;
		lastSnapshotAt = now;
		const payload = JSON.stringify({
			...doc,
			_writer: {
				pid: process.pid,
				at: now
			}
		});
		(async () => {
			try {
				const existing = await readFile(snapshotPath, "utf8");
				await writeFileAtomic(`${snapshotPath}.bak`, existing, {
					mode: 384,
					dirMode: 448
				});
			} catch {}
			try {
				await writeFileAtomic(snapshotPath, payload, {
					mode: 384,
					dirMode: 448
				});
			} catch {}
		})();
	};
	/** 读一个快照候选并解析成对象：主文件优先；主文件损坏时回退上一版 `.bak`（P0-3 崩溃恢复）。 */
	const readSnapshot = async (candidate) => {
		for (const path of [candidate, `${candidate}.bak`]) try {
			return JSON.parse(await readFile(path, "utf8"));
		} catch {}
		return null;
	};
	(async () => {
		try {
			const text = await readFile(snapshotPath, "utf8");
			const writer = JSON.parse(text)._writer;
			if (writer?.pid !== void 0 && writer.pid !== process.pid && writer.at !== void 0 && Date.now() - writer.at < 6e4) console.warn(`[usage-billing] 检测到另一实例（pid ${writer.pid}）正在提供用量统计，双实例可能导致提醒重复。`);
		} catch {}
	})();
	ctx.inject(["settings"], (sctx) => {
		const scope = sctx.settings.register(usageBillingSettingsNs, UsageBillingSettingsSchema, { base: { enableUsageStatsTool: config.enableUsageStatsTool ?? false } });
		usageSettingsScope = scope;
		ctx.inject(["tools"], (toolsCtx) => {
			if (scope.get().enableUsageStatsTool) toolsCtx.tools.register(defineTool({
				name: "usage_stats",
				description: "查询本机 DeepSeek Harness 的模型用量与估算费用（人民币，按官方目录价估算，非账单）。range 取值：today=今天，month=本月，session=当前会话，all=累计。",
				parameters: { range: {
					type: "string",
					enum: [
						"today",
						"month",
						"session",
						"all",
						"bySite",
						"relay"
					],
					required: true,
					description: "统计范围：today / month / session / all / bySite / relay"
				} },
				output: {
					schema: {
						type: "object",
						additionalProperties: false,
						properties: {
							range: {
								type: "string",
								required: true
							},
							cost: {
								type: "number",
								required: true,
								description: "估算费用（人民币元）"
							},
							calls: {
								type: "number",
								required: true
							},
							input: {
								type: "number",
								required: true,
								description: "输入 tokens"
							},
							output: {
								type: "number",
								required: true,
								description: "输出 tokens"
							}
						}
					},
					render: (_args, value) => [{
						type: "text",
						text: `用量（${value.range}）：估算费用 ${formatMoney(value.cost)}，调用 ${value.calls} 次，输入 ${formatTokens(value.input)} tokens，输出 ${formatTokens(value.output)} tokens`
					}]
				},
				async execute(args, exec) {
					const stats = await aggregator.aggregate();
					const zero = {
						range: args.range,
						cost: 0,
						calls: 0,
						input: 0,
						output: 0
					};
					if (args.range === "all") return {
						range: args.range,
						cost: stats.total.cost,
						calls: stats.total.calls,
						input: stats.total.input,
						output: stats.total.output
					};
					if (args.range === "bySite" || args.range === "relay") {
						const bySite = stats.bySite ?? {};
						let cost = 0;
						let calls = 0;
						let input = 0;
						let output = 0;
						for (const usage of Object.values(bySite)) {
							cost += usage.cost;
							calls += usage.calls;
							input += usage.input;
							output += usage.output;
						}
						return {
							range: args.range,
							cost,
							calls,
							input,
							output
						};
					}
					if (args.range === "today") {
						const day = stats.byDay[dayStamp(Date.now())];
						return day === void 0 ? zero : {
							range: args.range,
							cost: day.cost,
							calls: day.calls,
							input: day.input,
							output: day.output
						};
					}
					if (args.range === "month") {
						const prefix = dayStamp(Date.now()).slice(0, 7);
						let cost = 0;
						let calls = 0;
						let input = 0;
						let output = 0;
						for (const [date, day] of Object.entries(stats.byDay)) {
							if (!date.startsWith(prefix)) continue;
							cost += day.cost;
							calls += day.calls;
							input += day.input;
							output += day.output;
						}
						return {
							range: args.range,
							cost,
							calls,
							input,
							output
						};
					}
					const sessionId = exec.agent?.id;
					if (sessionId === void 0) throw new Error("usage_stats 的 session 范围需要 agent 会话上下文");
					let cost = 0;
					let calls = 0;
					let input = 0;
					let output = 0;
					for (const turn of stats.byTurn ?? []) {
						if (turn.sessionId !== String(sessionId)) continue;
						cost += turn.cost;
						calls += 1;
						input += turn.input;
						output += turn.output;
					}
					return {
						range: args.range,
						cost,
						calls,
						input,
						output
					};
				}
			}));
		});
	});
	let live = { source: "builtin" };
	const refreshPricing = async () => {
		live = await fetchLivePricing();
		applyLivePricing(live);
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
		handler: async (req, res) => {
			if (!guardLoopback(req, res)) return;
			res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
			res.end(JSON.stringify(live));
		}
	}), "usage-billing: pricing route");
	let balanceCache = {
		at: 0,
		doc: { balances: [] }
	};
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/api/billing/balance",
		handler: async (req, res) => {
			if (!guardLoopback(req, res)) return;
			res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
			const piProviders = await readPiAiProviders(ctx.settings);
			const providers = { ...piProviders };
			const deepseekKey = providers["deepseek"]?.apiKeyEnv;
			if (deepseekKey === void 0 || deepseekKey === "") providers["deepseek"] = {
				...providers["deepseek"],
				apiKeyEnv: config.balanceApiKeyEnv ?? DEFAULT_BALANCE_API_KEY_ENV
			};
			if (Date.now() - balanceCache.at < BALANCE_CACHE_MS) {
				res.end(JSON.stringify(balanceCache.doc));
				return;
			}
			try {
				const balances = await queryBalances(ctx, providers);
				const custom = await queryCustomBalances(ctx, config.customBalances ?? []);
				const declared = await queryDeclaredEndpoints(ctx, piProviders, config.declaredEndpoints ?? []);
				for (const row of [
					...balances,
					...custom,
					...declared
				]) if (row.error === "unauthorized") warnAuthOnce("balance", row.provider, row.displayName);
				const official = balances.find((row) => row.provider === "deepseek");
				let reconcile;
				if (official !== void 0 && official.totalBalance !== void 0) {
					const now = Date.now();
					const today = dayStamp(now);
					let todayOfficialCost = 0;
					try {
						todayOfficialCost = (await aggregator.aggregate()).byDay[today]?.officialCost ?? 0;
					} catch {}
					const result = reconcileBalanceDelta(reconcileRef, official, todayOfficialCost, today, now);
					reconcileRef = result.ref;
					if (result.event !== null && result.event.kind !== "flat") reconcile = {
						...result.event,
						provider: official.displayName
					};
					if (result.ref !== null) persistReconcileRef();
				}
				const doc = {
					balances: [
						...balances,
						...custom,
						...declared
					],
					...reconcile === void 0 ? {} : { reconcile }
				};
				balanceCache = {
					at: Date.now(),
					doc
				};
				res.end(JSON.stringify(doc));
			} catch (error) {
				console.warn("[usage-billing] refreshBalances failed; serving cached balances:", error);
				res.end(JSON.stringify(balanceCache.doc));
			}
		}
	}), "usage-billing: balance route");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/api/billing/usage-tool",
		handler: async (req, res) => {
			if (!guardLoopback(req, res)) return;
			res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
			const enabled = usageSettingsScope?.get().enableUsageStatsTool ?? false;
			if (req.method === "GET") {
				res.end(JSON.stringify({ enabled }));
				return;
			}
			if (req.method !== "POST") {
				res.writeHead(405, { "content-type": "application/json; charset=utf-8" });
				res.end(JSON.stringify({ error: "method not allowed" }));
				return;
			}
			if (!isLoopbackOrigin(req.headers.origin)) {
				res.writeHead(403, { "content-type": "application/json; charset=utf-8" });
				res.end(JSON.stringify({ error: "forbidden: loopback only" }));
				return;
			}
			if (!(req.headers["content-type"] ?? "").toLowerCase().includes("application/json")) {
				res.writeHead(415, { "content-type": "application/json; charset=utf-8" });
				res.end(JSON.stringify({ error: "unsupported content-type" }));
				return;
			}
			try {
				let body = "";
				for await (const chunk of req) {
					body += String(chunk);
					if (body.length > 512) {
						res.end(JSON.stringify({ error: "body too large" }));
						return;
					}
				}
				const parsed = JSON.parse(body === "" ? "{}" : body);
				if (usageSettingsScope === void 0) {
					res.end(JSON.stringify({ error: "settings unavailable" }));
					return;
				}
				const next = parsed.enabled === true;
				await usageSettingsScope.update({ enableUsageStatsTool: next });
				res.end(JSON.stringify({
					ok: true,
					enabled: next
				}));
			} catch {
				res.end(JSON.stringify({ error: "invalid" }));
			}
		}
	}), "usage-billing: usage-tool route");
	let quotaCache = {
		at: 0,
		quotas: []
	};
	const refreshQuotas = async () => {
		const { keys, identified } = await resolveSubscriptionKeys(ctx.settings, ctx.credentials);
		const piProviders = await readPiAiProviders(ctx.settings);
		const rows = [...await collectSubscriptions(keys, identified.filter((item) => item.adapter).map((item) => {
			const baseURL = piProviders[item.provider]?.baseURL;
			return {
				provider: item.provider,
				...item.region === void 0 ? {} : { region: item.region },
				...typeof baseURL === "string" && baseURL !== "" ? { baseUrl: baseURL } : {}
			};
		}))].map((row) => {
			const planType = planTypeOf(row.provider);
			const subscriptionAmount = subscriptionFeeCnyOf(row.provider, live.rate);
			return {
				...row,
				planType,
				...planType === "code" && subscriptionAmount > 0 ? { subscriptionAmount } : {}
			};
		});
		for (const item of identified) if (!item.adapter) rows.push({
			provider: item.provider,
			displayName: item.displayName,
			status: "ok",
			windows: [],
			planType: planTypeOf(item.provider)
		});
		for (const row of rows) if (row.status === "unauthorized") warnAuthOnce("subscription", row.provider, row.displayName);
		quotaCache = {
			at: Date.now(),
			quotas: rows
		};
	};
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/api/billing/subscriptions",
		handler: async (req, res) => {
			if (!guardLoopback(req, res)) return;
			res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
			if (Date.now() - quotaCache.at >= SUBSCRIPTION_CACHE_MS) try {
				await refreshQuotas();
			} catch (error) {
				console.warn("[usage-billing] refreshQuotas failed; serving cached quotas:", error);
			}
			res.end(JSON.stringify({ quotas: quotaCache.quotas }));
		}
	}), "usage-billing: subscriptions route");
	let relayCache = {
		at: 0,
		quotas: []
	};
	const refreshRelay = async () => {
		const providers = await readPiAiProviders(ctx.settings);
		const routes = [];
		for (const [route, entry] of Object.entries(providers)) {
			if (entry.baseURL === void 0 || entry.apiKeyEnv === void 0) continue;
			if (isOfficialBaseUrl(entry.baseURL)) continue;
			routes.push({
				route,
				baseURL: entry.baseURL,
				apiKeyEnv: entry.apiKeyEnv,
				...entry.displayName === void 0 ? {} : { displayName: entry.displayName }
			});
		}
		relayCache = {
			at: Date.now(),
			quotas: await queryRelayQuotas(ctx, routes)
		};
	};
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/api/billing/relay-quotas",
		handler: async (req, res) => {
			if (!guardLoopback(req, res)) return;
			res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
			if (Date.now() - relayCache.at >= SUBSCRIPTION_CACHE_MS) try {
				await refreshRelay();
			} catch (error) {
				console.warn("[usage-billing] refreshRelay failed; serving cached relay quotas:", error);
			}
			const diagnostics = relayCache.quotas.map((row) => ({
				route: row.route,
				origin: row.origin,
				kind: row.kind
			}));
			res.end(JSON.stringify({
				quotas: relayCache.quotas,
				diagnostics
			}));
		}
	}), "usage-billing: relay-quotas route");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/api/billing/usage-stats",
		handler: async (req, res) => {
			if (!guardLoopback(req, res)) return;
			res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
			try {
				const stats = await aggregator.aggregate();
				const injected = {
					...config.monthlyBudget === void 0 ? {} : { budget: config.monthlyBudget },
					...config.lowBalanceThreshold === void 0 ? {} : { lowBalanceThreshold: config.lowBalanceThreshold }
				};
				const payload = {
					...stats,
					pluginVersion: PACKAGE_VERSION,
					...injected
				};
				persistSnapshot(payload);
				res.end(JSON.stringify(payload));
				return;
			} catch (error) {
				console.error("[usage-billing] usage-stats aggregate failed, falling back to snapshot:", error);
			}
			for (const candidate of candidates) {
				const doc = await readSnapshot(candidate);
				if (doc === null) continue;
				if (config.monthlyBudget !== void 0) doc["budget"] = config.monthlyBudget;
				if (config.lowBalanceThreshold !== void 0) doc["lowBalanceThreshold"] = config.lowBalanceThreshold;
				doc["pluginVersion"] = PACKAGE_VERSION;
				res.end(JSON.stringify(doc));
				return;
			}
			res.end(JSON.stringify({ error: "usage stats unavailable" }));
		}
	}), "usage-billing: usage-stats route");
}
//#endregion
export { apply, createFileUsageLedgerStore, guardLoopback, inject, readPiAiProviderRoutes, resolveSubscriptionKeys };
