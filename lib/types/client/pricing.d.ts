/**
 * Billing engine: per-model price tables and token-usage cost estimation.
 *
 * Each model's price table uses its NATIVE currency: domestic providers
 * (DeepSeek, 智谱, 通义…) publish RMB prices and store them directly;
 * overseas providers (OpenAI, Google, xAI, Meta) publish USD.
 * Cost is always computed and displayed in CNY — only USD-priced models go
 * through the exchange rate, never domestic ones.
 *
 * Google-style two-band billing is modeled per model: Gemini's Flex tier
 * prices spare-capacity traffic at -50%; DeepSeek V4 splits peak
 * (09:00-12:00 / 14:00-18:00 Beijing) at 2x the off-peak rate. The estimator
 * mixes both bands by a configured peak share ({@link DEFAULT_PEAK_SHARE}).
 */
import type { LivePricing } from '../pricing-shared.ts';
/**
 * USD → CNY rate for display. Source: China Foreign Exchange Trade System
 * mid-rate 6.7878 on 2026-08-14; rounded to 6.79. Only applies to overseas
 * USD-priced models — domestic models never pass through this rate.
 * The node half may refresh this at boot via `/api/billing/pricing`; until a
 * live rate arrives the built-in value stays in force.
 */
export declare const USD_TO_CNY = 6.79;
/**
 * Apply the node half's live pricing snapshot. Absent fields keep the
 * built-in catalog and rate; callers never fabricate values.
 * @param pricing - the `/api/billing/pricing` response.
 */
export declare function applyLivePricing(pricing: LivePricing): void;
/**
 * 注入探活得到的「系统里实际配置/预制的模型」清单（host 的 llm.models 返回
 * groups[].models[]，含模型 id/name，无价格）。费率表据此对标现实可用模型——
 * 有价的补价（内置目录 / models.dev 补充），无价的标「未收录」。纯内存状态，
 * 供 `catalogEntries()` 渲染。
 */
export declare function applyLiveCatalogModels(models: readonly CatalogModel[]): void;
/** 探活模型清单条目（host 的 ModelCatalogModel 投影出需要的字段）。 */
export interface CatalogModel {
    /** 模型 id（如 `deepseek-v4-flash`）。 */
    id: string;
    /** 显示名；缺省用 id。 */
    name?: string;
    /** 厂商显示名（探活 group 名）。 */
    provider: string;
}
/**
 * 当前生效的 USD → CNY 汇率及其来源：live = 启动时实时拉取成功，
 * builtin = 实时拉取失败、正在用内置默认值。
 */
export declare function getRateInfo(): {
    rate: number;
    live: boolean;
};
/** Default share of traffic assumed to fall in the peak band (0..1). */
export declare const DEFAULT_PEAK_SHARE = 0.5;
/** 计费时段档位：高峰 / 空闲（官方 DeepSeek 刊例价：高峰 = 空闲 × 2）。 */
export type PriceTierId = 'peak' | 'offPeak';
/** 成本显示币种：人民币（国内模型直价）/ 美元（国外模型直价或换算显示）。 */
export type CostCurrency = 'cny' | 'usd';
/**
 * 高峰时段判定（北京时间，UTC+8，无夏令时）：09:00–12:00、14:00–18:00。
 * @param beijingHour - 北京时间的小时数（0–23）。
 */
export declare function isPeakHour(beijingHour: number): boolean;
/**
 * 由时刻（epoch 毫秒）推断计费时段；时刻未知/非法时按高峰计（保守：未知
 * 时刻不低估成本，与社区 dsh-usage-chart 的 tierAt 语义一致）。
 * @param timeMs - Unix epoch 毫秒；null/undefined/NaN 视为未知。
 */
export declare function tierAt(timeMs: number | null | undefined): PriceTierId;
/**
 * 当前峰谷档位与距下次切换的时长。导出供测试：纯函数。
 * @param nowMs - 当前时刻（epoch 毫秒）。
 * @returns 当前档位与到下一个切换边界的毫秒数。
 */
export declare function tierCountdown(nowMs: number): {
    tier: PriceTierId;
    nextSwitchInMs: number;
};
/**
 * 峰/谷切换预告：距下次切换不足 leadMs 时返回即将进入的档位与切换时刻，
 * 否则 null。导出供测试：纯函数。
 * @param nowMs - 当前时刻（epoch 毫秒）。
 * @param leadMs - 提前量（毫秒）。
 */
export declare function upcomingTierSwitch(nowMs: number, leadMs: number): {
    entering: PriceTierId;
    atMs: number;
} | null;
/**
 * 切换倒计时短格式：`1h23m` / `45m` / `3m`。导出供测试：纯函数。
 * @param ms - 剩余毫秒数。
 */
export declare function formatSwitchCountdown(ms: number): string;
/** Usage buckets consumed by one model (counts in raw tokens). */
export interface TokenUsageBuckets {
    /** Uncached input tokens. */
    input: number;
    /** Cache-hit input tokens. */
    cacheHit: number;
    /** Cache-miss input tokens (already included in `input` by some providers). */
    cacheMiss: number;
    /** Output tokens. */
    output: number;
}
/** Per-1M-token price in the model's native currency for one billing band. */
export interface PriceBand {
    /** Input (uncached) price per 1M tokens. */
    input: number;
    /** Cache-hit input price per 1M tokens. */
    cacheHit: number;
    /** Cache-miss input price per 1M tokens (absent when folded into `input`). */
    cacheMiss?: number;
    /** Output price per 1M tokens. */
    output: number;
}
/** A model's price table, optionally split into peak/off-peak bands. */
export interface ModelPrice extends PriceBand {
    /** 计价币种：国内模型直接人民币（CNY），国外模型美元（USD）。 */
    currency: 'CNY' | 'USD';
    /** Off-peak band (Gemini Flex / DeepSeek 低谷档); absent = flat pricing. */
    offPeak?: PriceBand;
}
/** One catalog entry: identity, brand color token, and price. */
export interface ModelEntry {
    /** Model key used by `.dsh-usage-stats.json` `byModel`. */
    key: string;
    /** Human-readable model name. */
    name: string;
    /** Provider label. */
    provider: string;
    /** CSS variable name (without the leading `--`) used as the brand accent. */
    colorVar: string;
    /** Price table (peak band when a split exists). */
    price: ModelPrice;
    /** Peak-hour window label for time-of-day priced models. */
    peakHours?: string;
    /**
     * 单价为估算价：厂商未公布按量官方单价（公测 / 套餐制），表内价格为估算，
     * 展示时标注以免误当正式定价；正式定价公布后移除。
     */
    estimated?: boolean;
    /** 探活命中但无内置/models.dev 价：费率表标「未收录」，不参与计价。 */
    uncatalogued?: boolean;
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
export declare const MODEL_CATALOG: readonly ModelEntry[];
/**
 * 真实 provider model id → 计费目录键（`MODEL_CATALOG[].key`）的映射。未知 id
 * 原样保留并落回 `other`（未知模型不估算费用）。聚合层（aggregate.ts）在折叠时
 * 用同一张表把日志里的 model id 归并为目录键，客户端渲染（`modelOf`）也按它
 * 解析，两侧共用一份映射，避免同一模型两侧不一致导致「未收录」。
 */
export declare const MODEL_KEY_ALIASES: Readonly<Record<string, string>>;
/** Lookup a model by its stats key; falls back to the generic `other` entry. */
export declare function modelOf(key: string): ModelEntry;
/**
 * 模型是否可计价：内置目录、models.dev 补充、或 dsh-spend 官方价兜底命中。
 * 聚合层的计价闸门（目录外模型不产生费用，避免兜底档误估）。
 */
export declare function isPriced(key: string): boolean;
/**
 * 费率表渲染的完整目录：内置 + models.dev 补充条目 + 探活模型（无价标记）。
 * 探活模型去重（按归一化 id）：内置/补充已有的不再重复；无价的保留并标记
 * `uncatalogued`，费率表据此显示「未收录」。
 */
export declare function catalogEntries(): readonly ModelEntry[];
/** Resolve a price-table row by its CSS variable name (theme token or fallback color). */
export declare function resolveToken(name: string): string;
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
export declare function computeCost(entry: ModelEntry, buckets: TokenUsageBuckets, peakShare?: number): number;
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
export declare function computeCostAt(entry: ModelEntry, buckets: TokenUsageBuckets, timeMs: number | null | undefined, peakShare?: number): number;
/** 人民币 → 美元（显示换算用）：1 USD = {@link USD_TO_CNY} CNY。 */
export declare function cnyToUsd(cny: number): number;
/**
 * Format an amount with adaptive precision and the given currency symbol.
 * @param amount - the amount (CNY by default; pass `usd` for dollar display).
 * @param currency - display currency; default `cny`.
 */
export declare function formatMoney(amount: number, currency?: CostCurrency): string;
/**
 * Format a per-1M-token price in its native currency (free when the rate is
 * zero): CNY for domestic models, USD for overseas ones.
 */
export declare function formatUnitPrice(price: number, currency?: 'CNY' | 'USD'): string;
/** Format a large token count with B/M/K suffix. */
export declare function formatTokens(value: number): string;
/** Format a percentage. */
export declare function formatPercent(value: number): string;
//# sourceMappingURL=pricing.d.ts.map