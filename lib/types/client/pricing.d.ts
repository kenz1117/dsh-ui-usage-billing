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
 * prices spare-capacity traffic at -50%; DeepSeek splits peak
 * (weekdays 09:00-12:00 / 14:00-18:00 Beijing) at 2x the off-peak rate —
 * weekends (Sat/Sun, Beijing) are charged at the off-peak rate all day.
 * The estimator mixes both bands by a configured peak share ({@link DEFAULT_PEAK_SHARE}).
 *
 * Time-limited launch promos ({@link PricePromo}) never mutate the catalog:
 * entries keep list price and a promo window; the estimator and the rate
 * table apply the discount factor until the deadline, then auto-revert.
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
 * 注入用户自定义模型别名（node 半区在插件启动时调用一次）。纯内存状态：
 * 聚合折叠与客户端渲染共用同一份（两侧一致性由同一注入点保证）。
 * @param aliases - `model id → 目录键` 映射；undefined/空 = 清除，回退内置表。
 */
export declare function applyUserModelAliases(aliases: Readonly<Record<string, string>> | undefined): void;
/**
 * 用户自定义单价（设置面板录入，localStorage 持久化）：覆盖内置/models.dev/
 * dsh-spend 的全部价格来源，用于新模型上线目录未跟、或厂商未公布按量价的场景。
 * 仅在客户端显示层生效——聚合发生在宿主进程，折叠时的成本仍按内置目录计算，
 * 客户端检测到用户价后对受影响视图做显示重估（见 UsageBilling 的 recost）。
 */
export interface UserPrice {
    /** 未命中输入单价（元或美元 / 每百万 token）。 */
    input: number;
    /** 缓存命中输入单价。 */
    cacheHit: number;
    /** 输出单价。 */
    output: number;
    /** 计价币种；缺省 CNY。 */
    currency?: 'CNY' | 'USD';
    /** 低谷档三桶（元或美元 / 每百万 token）；缺省 = 平档（峰谷同价）。 */
    offPeak?: {
        input: number;
        cacheHit: number;
        output: number;
    };
}
/** 一条用户自定义价：绑定「模型（计费目录键）+ 可选来源（中转站 origin）」。
 *  origin 缺省 = 该模型的默认价；带 origin = 仅该中转站的同名模型用此价。 */
export interface UserPriceEntry extends UserPrice {
    /** 计费目录键（如 `flash`、`minimax-m2.7`）。 */
    key: string;
    /** 绑定来源（中转站 origin，如 `https://api.my-relay.com`）；缺省 = 默认价。 */
    origin?: string;
}
/**
 * 中转站 origin 宽松匹配：双方规范化到 `protocol://host[:port]` 后比较。
 * 宿主侧站点桶的 origin 来自 `new URL(baseURL).origin`，用户手填的来源常缺
 * 协议、带路径或尾斜杠——精确全等会让自定义价静默失效（issue #18）。
 * 规范化失败（无法解析成 URL）时回退小写去尾斜杠的字面比较。
 * @param a - 用户录入的来源（可缺协议/带路径）。
 * @param b - 宿主站点桶的 origin（`new URL().origin` 形态）。
 */
/**
 * 把用户手填的中转站来源规范化为 `protocol://host[:port]` 形态：缺协议补
 * `https://`、带路径取 origin。无法解析时回退小写去尾斜杠的字面值。
 * 与 {@link originsMatch} 的比较口径一致——保存前规范化一次，匹配时双向兜底。
 * @param raw - 用户录入的来源（可缺协议/带路径）。
 */
export declare function normalizeOriginInput(raw: string): string;
export declare function originsMatch(a: string, b: string): boolean;
/**
 * 注入用户自定义单价列表。每条含模型目录键 + 可选来源（origin）。空数组 = 清除全部
 * 自定义价，回退内置目录。
 * @param entries - 用户自定义价条目（列表）。
 */
export declare function applyUserPrices(entries: Readonly<UserPriceEntry[]>): void;
/** 当前生效的用户自定义价条目（设置面板回显用）；未设置时 undefined。 */
export declare function getUserPrices(): Readonly<UserPriceEntry[]> | undefined;
/**
 * 查一个模型（可选来源）的用户自定义价：优先「模型×来源」精确命中；无来源匹配时
 * 回落该模型的无来源默认价；再无则 undefined（走内置目录）。
 * @param key - 计费目录键。
 * @param origin - 调用来源（中转站 origin）；缺省仅查默认价。
 */
export declare function userPriceOf(key: string, origin?: string): UserPrice | undefined;
/**
 * 查一个模型（可选来源）的完整用户价条目（含 origin 绑定信息）。
 * 匹配优先级：origin 宽松精确命中（模型×来源）→ 无来源默认价。
 * @param key - 计费目录键。
 * @param origin - 调用来源（中转站 origin）；缺省仅查默认价。
 */
export declare function userPriceEntryOf(key: string, origin?: string): UserPriceEntry | undefined;
/**
 * 查一个模型的「带来源」用户价条目（无视来源值，取第一条命中模型名的
 * 带 origin 条目）。供 recost 在三维站点数据缺失时兜底：用户填了来源价
 * 就按它重估，而不是静默回退宿主原价（issue #18）。
 * @param key - 计费目录键。
 */
export declare function userOriginPriceEntryOf(key: string): UserPriceEntry | undefined;
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
/**
 * 峰谷计价时代分界（UTC 2026-08-16T16:00:00Z，即北京时间 2026-08-17 00:00）：
 * DeepSeek V4 自此起按峰/谷两档计价。此前官方只有基础价一档——历史事件若
 * 套现行峰/谷档价会把成本高估约 50%（谷价 = 基础价 × 1.5）。半开区间：该
 * 时刻及之后按峰谷档计。
 */
export declare const PEAK_ERA_START_MS: number;
/**
 * 周末全谷规则分界（UTC 2026-08-22T16:00:00Z，即北京时间 2026-08-23 00:00）：
 * 官方自此刻起周六/周日全天不区分峰谷（高峰时段收窄为工作日）；生效前的
 * 周末仍按 v1 峰谷规则（周六日 9-12 / 14-18 同样是高峰时段）。历史事件的
 * 档位判定按事件所在时段适用各自的规则，不得统一套现行规则重算历史。
 */
export declare const WEEKEND_OFFPEAK_START_MS: number;
/** 计费时段档位：高峰 / 空闲（官方 DeepSeek 刊例价：高峰 = 空闲 × 2）。 */
export type PriceTierId = 'peak' | 'offPeak';
/** 成本显示币种：人民币（国内模型直价）/ 美元（国外模型直价或换算显示）。 */
export type CostCurrency = 'cny' | 'usd';
/**
 * 工作日高峰时段判定（北京时间，UTC+8，无夏令时）：09:00–12:00、14:00–18:00。
 * 周末（周六/周日）北京全天为低谷，不调用本函数判定峰/平。
 * @param beijingHour - 北京时间的小时数（0–23）。
 */
export declare function isPeakHour(beijingHour: number): boolean;
/**
 * 由时刻（epoch 毫秒）推断计费时段；时刻未知/非法时按高峰计（保守：未知
 * 时刻不低估成本，与社区 dsh-usage-chart 的 tierAt 语义一致）。
 * 周末（北京时间周六/周日）全天不区分峰谷，统一按低谷价。
 * @param timeMs - Unix epoch 毫秒；null/undefined/NaN 视为未知。
 */
export declare function tierAt(timeMs: number | null | undefined): PriceTierId;
/**
 * 当前峰谷档位与距下一切换的时长。导出供测试：纯函数。
 *
 * 下一切换点统一定义为档位真正变化的最近边界：自当前时刻起逐天扫描工作日的
 * 09:00 / 12:00 / 14:00 / 18:00，候选时刻的档位由 {@link tierAt} 判定——
 * 周末（周六/周日）北京全天低谷、没有边界，扫描自然跳过；工作日深夜跨周末
 * 时落到周一 09:00 而非周末伪边界（issue #33）。
 * 最坏情形（周五 18:00 后 → 周一 09:00）约 63h，7 天窗口必然覆盖。
 * @param nowMs - 当前时刻（epoch 毫秒）。
 * @returns 当前档位与到下一切换边界的毫秒数。
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
/**
 * 限时促销窗口（新模型上线折扣等厂商营销活动）：生效期内该条目所有档位
 * （主档与 offPeak）单价按 factor 折扣计价与显示，截止时刻起自动恢复刊例价。
 */
export interface PricePromo {
    /** 折扣系数（0.5 = 五折）；仅 (0,1) 区间有效，非法值视为无促销。 */
    factor: number;
    /**
     * 截止时刻（epoch ms）：该时刻及之后恢复刊例价。缺省表示厂商未公布截止日
     * 的长期活动（如「限时 5 折直至另行通知」），持续生效直至收到公告后补填。
     */
    endsAtMs?: number;
    /** 展示备注（如「限时 5 折至 …」），供界面提示活动性质。 */
    note?: string;
}
/**
 * 附加计价行（纯展示参考价）：承载主三桶之外的厂商计价维度，如 Batch
 * 半价档、显式缓存创建/命中等。不参与估算计费——用量统计源只有
 * input/cacheHit/cacheMiss/output 四桶，无 batch 与显式缓存维度可区分。
 */
export interface PriceRow {
    /** 行标签（沿用目录单语风格，直接中文）。 */
    label: string;
    /** 输入侧单价（元或美元 / 每百万 token）；缺省显示 —。 */
    input?: number;
    /** 输出侧单价；缺省显示 —。 */
    output?: number;
    /** 补充说明（如与标准价的关系）。 */
    note?: string;
}
/**
 * 分档计价语义：厂商把「主档 / 低价档」的划分依据不同，界面需区分标注。
 * - `timeOfDay`（缺省）：按调用时刻分档（DeepSeek 峰谷时段），档位是客观的；
 * - `latency`：按用户选择的延迟档分档（Gemini Standard/Flex，Flex 半价换 1-15
 *   分钟延迟），与时刻无关；逐调用无法从日志判定实际档位，成本按比例估算。
 */
export type TierSemantics = 'timeOfDay' | 'latency';
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
    /** 分档语义；缺省 = 按时段（timeOfDay）。 */
    tierSemantics?: TierSemantics;
    /**
     * 限时促销：生效期内 price 各档位按 factor 打折，过期自动恢复。
     * price 表本身永远保存刊例价，促销只在计价/显示出口处折算，不回写目录。
     */
    promo?: PricePromo;
    /** 附加计价行（Batch / 显式缓存等展示性参考价），费率表在该模型行下方列出。 */
    extraRows?: readonly PriceRow[];
    /**
     * 单价为估算价：厂商未公布按量官方单价（公测 / 套餐制），表内价格为估算，
     * 展示时标注以免误当正式定价；正式定价公布后移除。
     */
    estimated?: boolean;
    /** 探活命中但无内置/models.dev 价：费率表标「未收录」，不参与计价。 */
    uncatalogued?: boolean;
    /** 该条目当前按用户自定义单价计价（设置面板可维护）；费率表标注「自定义」。 */
    userPriced?: boolean;
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
/**
 * 模型 id 归一化：小写、去括号附注（如 `gpt5.6 luna(go)` 只看主体）、再去所有
 * 非字母数字分隔符（空格 / 横杠 / 点 / 下划线）。用于日志里的模型 id 与计费
 * 目录键做宽松匹配，提升「大小写/分隔符差异导致未收录」的识别率。
 * @param id - 原始模型 id（日志或目录键）。
 * @returns 归一化键（字母数字小写串）。
 */
export declare function canonModelId(id: string): string;
export declare function resolveCatalogKey(id: string): string;
/** Lookup a model by its stats key; falls back to the generic `other` entry. */
export declare function modelOf(key: string): ModelEntry;
/**
 * 模型是否可计价：内置目录、models.dev 补充、或 dsh-spend 官方价兜底命中。
 * 聚合层的计价闸门（目录外模型不产生费用，避免兜底档误估）。
 */
export declare function isPriced(key: string): boolean;
/**
 * 促销在 nowMs 是否生效：factor 必须落在 (0,1) 区间，截止时刻及之后视为过期；
 * endsAtMs 缺省表示长期活动，在 factor 合法期间持续生效。
 * 导出供测试：纯函数。
 * @param promo - 待判定的促销窗口。
 * @param nowMs - 判定时刻（epoch ms）。
 */
export declare function isPromoActive(promo: PricePromo, nowMs: number): boolean;
/**
 * 把限时促销折入条目单价：生效期内返回 price 主档与 offPeak 全部乘 factor 的
 * 副本，其余字段原样保留；不在促销期（过期/未开始/factor 非法）原样返回。
 * 幂等由调用方保证——计价与费率表显示各自只折一次，勿对已折价副本重复应用。
 * @param entry - 目录条目（price 保持刊例价口径）。
 * @param nowMs - 判定时刻（epoch ms）。
 */
export declare function applyPromo(entry: ModelEntry, nowMs: number): ModelEntry;
/**
 * 费率表渲染的完整目录：内置 + 探活命中的模型（无价标记未收录）。
 * models.dev 补充条目**不**整表渲染——那是数百网关厂商的全量模型清单（数千行），
 * 会把费率表撑爆；它们只作为目录外模型的计价回退源（见 {@link livePriceOf} /
 * {@link modelOf}）。探活模型在此逐个对价：内置已有的跳过去重；目录外但
 * models.dev 有价的按归一化 id 复用其 USD 价；两者皆无的标 `uncatalogued`。
 * 内置条目按 nowMs 折算限时促销（生效中的条目显示折后单价，过期自动恢复刊例价）。
 * @param nowMs - 促销判定时刻；缺省当前时刻。
 */
export declare function catalogEntries(nowMs?: number): readonly ModelEntry[];
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
export declare function computeCost(entry: ModelEntry, buckets: TokenUsageBuckets, peakShare?: number, nowMs?: number): number;
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
export declare function computeCostAt(entry: ModelEntry, buckets: TokenUsageBuckets, timeMs: number | null | undefined, peakShare?: number): number;
/** 人民币 → 美元（显示换算用）：用当前生效汇率（实时优先，缺失回退内置），
 *  与计价链路的 `currentRate()` 同口径，避免实时汇率生效时 USD 显示与计价不一致。 */
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
/**
 * 把一条「每百万 token」单价从原生币种换算到目标展示币种（按 USD→CNY 汇率）。
 * 汇率缺失/非法时回退原值，避免 0 汇率把价格算没。
 * @param price - 原生币种单价。
 * @param native - 模型原生币种。
 * @param target - 用户当前展示币种。
 * @param rate - USD→CNY 汇率（1 USD = rate CNY）。
 * @returns 换算到目标币种的单价；同币种或汇率不可用时原值。
 */
export declare function convertUnitPrice(price: number, native: 'CNY' | 'USD', target: CostCurrency, rate: number): number;
/** Format a large token count with B/M/K suffix. */
export declare function formatTokens(value: number): string;
/** Format a percentage. */
export declare function formatPercent(value: number): string;
//# sourceMappingURL=pricing.d.ts.map