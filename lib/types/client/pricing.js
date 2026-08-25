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
 */
import { FALLBACK_RATES } from "./plan-knowledge.js";
/**
 * USD → CNY rate for display. Source: China Foreign Exchange Trade System
 * mid-rate 6.7878 on 2026-08-14; rounded to 6.79. Only applies to overseas
 * USD-priced models — domestic models never pass through this rate.
 * The node half may refresh this at boot via `/api/billing/pricing`; until a
 * live rate arrives the built-in value stays in force.
 */
export const USD_TO_CNY = 6.79;
/** 运行时实时覆盖：undefined = 用内置目录与内置汇率（默认值降级）。 */
let liveRate;
let livePrices;
let liveExtraModels;
let liveCatalogModels;
/**
 * Apply the node half's live pricing snapshot. Absent fields keep the
 * built-in catalog and rate; callers never fabricate values.
 * @param pricing - the `/api/billing/pricing` response.
 */
export function applyLivePricing(pricing) {
    // 实时汇率来自 HTTP 响应（wire 边界）：只接受有限正数，异常值（0/NaN/负）保留内置值，
    // 避免所有 USD 模型计价被算成 0 或 NaN。
    liveRate = typeof pricing.rate === 'number' && Number.isFinite(pricing.rate) && pricing.rate > 0
        ? pricing.rate
        : undefined;
    livePrices = pricing.prices;
    liveExtraModels = pricing.extraModels;
}
/**
 * 注入探活得到的「系统里实际配置/预制的模型」清单（host 的 llm.models 返回
 * groups[].models[]，含模型 id/name，无价格）。费率表据此对标现实可用模型——
 * 有价的补价（内置目录 / models.dev 补充），无价的标「未收录」。纯内存状态，
 * 供 `catalogEntries()` 渲染。
 */
export function applyLiveCatalogModels(models) {
    liveCatalogModels = models;
}
/** 当前汇率：实时覆盖优先，缺省回退内置固定值。 */
function currentRate() {
    return liveRate ?? USD_TO_CNY;
}
/**
 * 当前生效的 USD → CNY 汇率及其来源：live = 启动时实时拉取成功，
 * builtin = 实时拉取失败、正在用内置默认值。
 */
export function getRateInfo() {
    return { rate: currentRate(), live: liveRate !== undefined };
}
/** Default share of traffic assumed to fall in the peak band (0..1). */
export const DEFAULT_PEAK_SHARE = 0.5;
/**
 * 工作日高峰时段判定（北京时间，UTC+8，无夏令时）：09:00–12:00、14:00–18:00。
 * 周末（周六/周日）北京全天为低谷，不调用本函数判定峰/平。
 * @param beijingHour - 北京时间的小时数（0–23）。
 */
export function isPeakHour(beijingHour) {
    return (beijingHour >= 9 && beijingHour < 12) || (beijingHour >= 14 && beijingHour < 18);
}
/**
 * 由时刻（epoch 毫秒）推断计费时段；时刻未知/非法时按高峰计（保守：未知
 * 时刻不低估成本，与社区 dsh-usage-chart 的 tierAt 语义一致）。
 * 周末（北京时间周六/周日）全天不区分峰谷，统一按低谷价。
 * @param timeMs - Unix epoch 毫秒；null/undefined/NaN 视为未知。
 */
export function tierAt(timeMs) {
    if (timeMs === null || timeMs === undefined || !Number.isFinite(timeMs))
        return 'peak';
    if (isBeijingWeekend(timeMs))
        return 'offPeak';
    const beijingHour = (new Date(timeMs).getUTCHours() + 8) % 24;
    return isPeakHour(beijingHour) ? 'peak' : 'offPeak';
}
/** 时刻是否落在北京时间周末（周六/周日）。 */
function isBeijingWeekend(timeMs) {
    const day = new Date(timeMs + 8 * 3_600_000).getUTCDay();
    return day === 0 || day === 6;
}
/** 距下一个工作日（周一）北京时间 09:00 峰时的毫秒数：周末全天低谷的下一档。 */
function nextWeekdayPeakInMs(nowMs) {
    const bj = new Date(nowMs + 8 * 3_600_000);
    const day = bj.getUTCDay();
    const elapsed = bj.getUTCHours() * 3_600_000 + bj.getUTCMinutes() * 60_000 + bj.getUTCSeconds() * 1_000 + bj.getUTCMilliseconds();
    // 到周一：周日(0)=1 天、周六(6)=2 天。
    const toMonday = day === 0 ? 1 : 2;
    return toMonday * 86_400_000 - elapsed + 9 * 3_600_000;
}
/** 峰谷切换边界（北京时间的当日分钟数）：09:00 / 12:00 / 14:00 / 18:00。 */
const TIER_BOUNDARY_MINUTES = [540, 720, 840, 1080];
/** 北京时间的当日毫秒数（0–86,400,000）。 */
function beijingMillisOfDay(timeMs) {
    return (((timeMs + 8 * 3_600_000) % 86_400_000) + 86_400_000) % 86_400_000;
}
/**
 * 当前峰谷档位与距下次切换的时长。导出供测试：纯函数。
 * @param nowMs - 当前时刻（epoch 毫秒）。
 * @returns 当前档位与到下一个切换边界的毫秒数。
 */
export function tierCountdown(nowMs) {
    // 周末全天低谷：没有日内切换，下一档是下个工作日（周一）09:00 的峰时。
    if (isBeijingWeekend(nowMs)) {
        return { tier: 'offPeak', nextSwitchInMs: nextWeekdayPeakInMs(nowMs) };
    }
    const dayMs = beijingMillisOfDay(nowMs);
    for (const boundary of TIER_BOUNDARY_MINUTES) {
        const boundaryMs = boundary * 60_000;
        if (dayMs < boundaryMs) {
            return { tier: tierAt(nowMs), nextSwitchInMs: boundaryMs - dayMs };
        }
    }
    // 18:00 之后：下一边界是明天 09:00（TIER_BOUNDARY_MINUTES[0] 首项）。
    const firstBoundary = TIER_BOUNDARY_MINUTES[0] ?? 0;
    return { tier: tierAt(nowMs), nextSwitchInMs: 86_400_000 - dayMs + firstBoundary * 60_000 };
}
/**
 * 峰/谷切换预告：距下次切换不足 leadMs 时返回即将进入的档位与切换时刻，
 * 否则 null。导出供测试：纯函数。
 * @param nowMs - 当前时刻（epoch 毫秒）。
 * @param leadMs - 提前量（毫秒）。
 */
export function upcomingTierSwitch(nowMs, leadMs) {
    const { nextSwitchInMs } = tierCountdown(nowMs);
    if (nextSwitchInMs > leadMs)
        return null;
    const atMs = nowMs + nextSwitchInMs;
    // 边界另一侧的档位即即将进入的档位（边界时刻本身按新档位计）。
    return { entering: tierAt(atMs), atMs };
}
/**
 * 切换倒计时短格式：`1h23m` / `45m` / `3m`。导出供测试：纯函数。
 * @param ms - 剩余毫秒数。
 */
export function formatSwitchCountdown(ms) {
    const minutes = Math.max(1, Math.ceil(ms / 60_000));
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return hours > 0 ? `${hours}h${String(rest).padStart(2, '0')}m` : `${rest}m`;
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
export const MODEL_CATALOG = [
    // DeepSeek — V4 peak/off-peak rates (cloud.tencent.com TokenHub 2026-08-14),
    // RMB per 1M tokens: peak / off-peak (50%).
    {
        key: 'flash',
        name: 'DeepSeek V4 Flash',
        provider: 'DeepSeek',
        colorVar: 'dsw-static-blue-500',
        price: {
            currency: 'CNY',
            input: 3,
            cacheHit: 0.1,
            output: 9,
            offPeak: { input: 1.5, cacheHit: 0.05, output: 4.5 },
        },
        peakHours: '09:00-12:00 / 14:00-18:00',
    },
    {
        key: 'flash-vision-exp',
        name: 'DeepSeek V4 Flash Vision (Exp)',
        provider: 'DeepSeek',
        colorVar: 'dsw-static-blue-500',
        price: {
            currency: 'CNY',
            input: 3,
            cacheHit: 0.1,
            output: 9,
            offPeak: { input: 1.5, cacheHit: 0.05, output: 4.5 },
        },
        peakHours: '09:00-12:00 / 14:00-18:00',
    },
    {
        key: 'pro',
        name: 'DeepSeek V4 Pro',
        provider: 'DeepSeek',
        colorVar: 'dsw-static-deepseek-500',
        price: {
            currency: 'CNY',
            input: 9,
            cacheHit: 0.3,
            output: 27,
            offPeak: { input: 4.5, cacheHit: 0.15, output: 13.5 },
        },
        peakHours: '09:00-12:00 / 14:00-18:00',
    },
    // 智谱 GLM (OpenAI-compatible, 腾讯云 TokenHub 官方价 2026-08-14).
    {
        key: 'glm',
        name: 'GLM-5.2',
        provider: '智谱 AI',
        colorVar: 'dsw-static-blue-600',
        price: { currency: 'CNY', input: 8, cacheHit: 2, output: 28 },
    },
    {
        key: 'glm-5.3',
        name: 'GLM-5.3',
        provider: '智谱 AI',
        colorVar: 'dsw-static-blue-500',
        price: { currency: 'CNY', input: 8, cacheHit: 2, output: 28 },
    },
    {
        key: 'glm-4.6',
        name: 'GLM-4.6',
        provider: '智谱 AI',
        colorVar: 'dsw-static-blue-400',
        price: { currency: 'CNY', input: 4, cacheHit: 0.8, output: 16 },
    },
    // 智谱 GLM 其余按量价（元 / 每百万 token，≤32K 档，官方 open.bigmodel.cn / 百炼）。
    {
        key: 'glm-4.5-air',
        name: 'GLM-4.5-Air',
        provider: '智谱 AI',
        colorVar: 'dsw-static-blue-300',
        price: { currency: 'CNY', input: 0.8, cacheHit: 0.16, output: 2 },
    },
    {
        key: 'glm-4.7',
        name: 'GLM-4.7',
        provider: '智谱 AI',
        colorVar: 'dsw-static-blue-400',
        price: { currency: 'CNY', input: 4, cacheHit: 1, output: 16 },
        // GLM-4.7 无公开按量价：按其在 coding-plan 的抵扣系数相对 GLM-5-Turbo 的比例估算。
        estimated: true,
    },
    {
        key: 'glm-5-turbo',
        name: 'GLM-5-Turbo',
        provider: '智谱 AI',
        colorVar: 'dsw-static-blue-500',
        price: { currency: 'CNY', input: 5, cacheHit: 1.2, output: 22 },
    },
    {
        key: 'glm-5.1',
        name: 'GLM-5.1',
        provider: '智谱 AI',
        colorVar: 'dsw-static-blue-600',
        price: { currency: 'CNY', input: 6, cacheHit: 1.2, output: 24 },
    },
    {
        key: 'glm-5v-turbo',
        name: 'GLM-5V-Turbo',
        provider: '智谱 AI',
        colorVar: 'dsw-static-blue-300',
        price: { currency: 'CNY', input: 5, cacheHit: 1.2, output: 22 },
    },
    // 阿里通义千问 (OpenAI-compatible, 百炼 2026-08).
    {
        key: 'qwen-3.8-max',
        name: 'Qwen3.8 Max',
        provider: '阿里通义',
        colorVar: 'dsw-static-blue-600',
        // 2026-08-06 发布；官方美元价 $2/$6 换算（缓存 $0.2）。
        price: { currency: 'CNY', input: 13.58, cacheHit: 1.36, output: 40.74 },
    },
    {
        key: 'qwen-max',
        name: 'Qwen3.7-Max',
        provider: '阿里通义',
        colorVar: 'dsw-static-blue-300',
        price: { currency: 'CNY', input: 6, cacheHit: 0.6, output: 18 },
    },
    {
        key: 'qwen-plus',
        name: 'Qwen3.5-Plus',
        provider: '阿里通义',
        colorVar: 'dsw-static-blue-500',
        price: { currency: 'CNY', input: 0.8, cacheHit: 0.08, output: 4.8 },
    },
    {
        key: 'qwen-flash',
        name: 'Qwen3.5-Flash',
        provider: '阿里通义',
        colorVar: 'dsw-static-blue-400',
        price: { currency: 'CNY', input: 0.2, cacheHit: 0.02, output: 2 },
    },
    // 字节豆包 (OpenAI-compatible, 火山方舟 2026).
    {
        key: 'doubao',
        name: 'Doubao Seed-2.0 Pro',
        provider: '字节豆包',
        colorVar: 'dsw-static-red-500',
        price: { currency: 'CNY', input: 3.2, cacheHit: 0.64, output: 16 },
    },
    {
        key: 'doubao-mini',
        name: 'Doubao Seed-2.0 Mini',
        provider: '字节豆包',
        colorVar: 'dsw-static-red-300',
        price: { currency: 'CNY', input: 0.2, cacheHit: 0.02, output: 2 },
    },
    {
        key: 'doubao-1.6',
        name: 'Doubao Seed-1.6',
        provider: '字节豆包',
        colorVar: 'dsw-static-red-400',
        price: { currency: 'CNY', input: 0.8, cacheHit: 0, output: 8 },
    },
    // 月之暗面 Kimi (OpenAI-compatible, 腾讯云 TokenHub 官方价 2026-08-14).
    {
        key: 'kimi',
        name: 'Kimi K2.7 Code',
        provider: '月之暗面',
        colorVar: 'dsw-static-neutral-bluish-700',
        price: { currency: 'CNY', input: 6.5, cacheHit: 1.3, output: 27 },
    },
    {
        key: 'kimi-k2.7-hs',
        name: 'Kimi K2.7 Code HighSpeed',
        provider: '月之暗面',
        colorVar: 'dsw-static-neutral-bluish-600',
        price: { currency: 'CNY', input: 13, cacheHit: 2.6, output: 54 },
    },
    {
        key: 'kimi-k2.6',
        name: 'Kimi K2.6',
        provider: '月之暗面',
        colorVar: 'dsw-static-neutral-bluish-500',
        price: { currency: 'CNY', input: 6.5, cacheHit: 1.1, output: 27 },
    },
    {
        key: 'kimi-k3',
        name: 'Kimi K3',
        provider: '月之暗面',
        colorVar: 'dsw-static-neutral-bluish-500',
        price: { currency: 'CNY', input: 20, cacheHit: 2, output: 100 },
    },
    // 小米 MiMo (OpenAI-compatible; token plan 通道 model id 为 mimo-v2.5，
    // 按订阅豁免计费；按量单价 2026-08 官方公布：命中缓存 / 未命中 / 输出).
    {
        key: 'mimo-v2.5',
        name: 'MiMo V2.5',
        provider: '小米',
        colorVar: 'dsw-static-green-400',
        price: { currency: 'CNY', input: 1, cacheHit: 0.02, output: 2 },
    },
    {
        key: 'mimo-v2.5-pro',
        name: 'MiMo V2.5 Pro',
        provider: '小米',
        colorVar: 'dsw-static-green-400',
        price: { currency: 'CNY', input: 3, cacheHit: 0.025, output: 6 },
    },
    // MiniMax (OpenAI-compatible, TokenHub 2026-08-14).
    {
        key: 'minimax',
        name: 'MiniMax-M3',
        provider: 'MiniMax',
        colorVar: 'dsw-static-amber-500',
        price: { currency: 'CNY', input: 2.1, cacheHit: 0.42, output: 8.4 },
    },
    // MiniMax-M2.7 / M2.7-highspeed：官方按量价（元 / 每百万 token，2026-08）。
    {
        key: 'minimax-m2.7',
        name: 'MiniMax-M2.7',
        provider: 'MiniMax',
        colorVar: 'dsw-static-amber-400',
        price: { currency: 'CNY', input: 2.1, cacheHit: 0.42, output: 8.4 },
    },
    {
        key: 'minimax-m2.7-highspeed',
        name: 'MiniMax-M2.7-highspeed',
        provider: 'MiniMax',
        colorVar: 'dsw-static-amber-500',
        price: { currency: 'CNY', input: 4.2, cacheHit: 0.42, output: 16.8 },
    },
    // 百度文心 (OpenAI-compatible, 千帆 2026-08).
    {
        key: 'ernie',
        name: 'ERNIE-5.1',
        provider: '百度文心',
        colorVar: 'dsw-static-blue-300',
        price: { currency: 'CNY', input: 4, cacheHit: 0.4, output: 18 },
    },
    // 腾讯混元 (OpenAI-compatible, TokenHub 2026-08-14).
    {
        key: 'hunyuan',
        name: '混元 Hy3',
        provider: '腾讯混元',
        colorVar: 'dsw-static-amber-400',
        price: { currency: 'CNY', input: 1, cacheHit: 0.25, output: 4 },
    },
    {
        key: 'hunyuan-t1',
        name: '混元 T1',
        provider: '腾讯混元',
        colorVar: 'dsw-static-amber-300',
        price: { currency: 'CNY', input: 1, cacheHit: 0.1, output: 4 },
    },
    // 零一万物 (OpenAI-compatible, 2026-08).
    {
        key: 'yi',
        name: 'Yi-Lightning',
        provider: '零一万物',
        colorVar: 'dsw-static-green-500',
        price: { currency: 'CNY', input: 0.99, cacheHit: 0.1, output: 0.99 },
    },
    // 阶跃星辰 Step (OpenAI-compatible, platform.stepfun.com 2026-08; 缓存命中 ¥0.27).
    {
        key: 'step',
        name: 'Step 3.7 Flash',
        provider: '阶跃星辰',
        colorVar: 'dsw-static-neutral-bluish-400',
        price: { currency: 'CNY', input: 1.35, cacheHit: 0.27, output: 8.1 },
    },
    // 科大讯飞星火 (OpenAI-compatible, 2026-07 汇总; 套餐制，价格约)。
    {
        key: 'spark',
        name: 'Spark 4.0 Ultra',
        provider: '科大讯飞',
        colorVar: 'dsw-static-green-400',
        price: { currency: 'CNY', input: 5, cacheHit: 0.5, output: 10 },
        estimated: true,
    },
    // 商汤日日新 (OpenAI-compatible, 2026-07 汇总; 公测中，价格约)。
    {
        key: 'sensenova',
        name: 'SenseNova 6.5',
        provider: '商汤',
        colorVar: 'dsw-static-red-400',
        price: { currency: 'CNY', input: 4.5, cacheHit: 0.45, output: 9 },
        estimated: true,
    },
    // 百川智能 (OpenAI-compatible, 2026-07 汇总)。
    {
        key: 'baichuan',
        name: 'Baichuan M3-Plus',
        provider: '百川智能',
        colorVar: 'dsw-static-neutral-bluish-500',
        price: { currency: 'CNY', input: 5, cacheHit: 0.5, output: 9 },
    },
    // OpenAI — GPT-5.6 family (developers.openai.com/api/docs/pricing 2026-08).
    {
        key: 'gpt-5.6-sol',
        name: 'GPT-5.6 Sol',
        provider: 'OpenAI',
        colorVar: 'dsw-static-green-500',
        price: { currency: 'USD', input: 5, cacheHit: 0.5, output: 30 },
    },
    {
        key: 'gpt-5.6-terra',
        name: 'GPT-5.6 Terra',
        provider: 'OpenAI',
        colorVar: 'dsw-static-green-400',
        price: { currency: 'USD', input: 2, cacheHit: 0.2, output: 12 },
    },
    {
        key: 'gpt-5.6-luna',
        name: 'GPT-5.6 Luna',
        provider: 'OpenAI',
        colorVar: 'dsw-static-green-500',
        price: { currency: 'USD', input: 0.2, cacheHit: 0.02, output: 1.2 },
    },
    // Google — Gemini 3.x (ai.google.dev/gemini-api/docs/pricing 2026-08).
    // Google does NOT bill by time of day: Standard is the real-time full
    // price, while the Flex tier prices spare-capacity traffic at exactly -50%
    // (1-15 min latency). The estimator treats Standard as the peak band and
    // Flex as the off-peak band, mixed by the configured peak share.
    {
        key: 'gemini-pro',
        name: 'Gemini 3.1 Pro',
        provider: 'Google',
        colorVar: 'dsw-static-blue-600',
        price: {
            currency: 'USD',
            input: 2,
            cacheHit: 0.2,
            output: 12,
            offPeak: { input: 1, cacheHit: 0.1, output: 6 },
        },
        peakHours: 'Standard / Flex',
    },
    {
        key: 'gemini-flash',
        name: 'Gemini 3.6 Flash',
        provider: 'Google',
        colorVar: 'dsw-static-blue-400',
        price: {
            currency: 'USD',
            input: 1.5,
            cacheHit: 0.15,
            output: 7.5,
            offPeak: { input: 0.75, cacheHit: 0.075, output: 3.75 },
        },
        peakHours: 'Standard / Flex',
    },
    // xAI — current Grok family (docs.x.ai 2026-08).
    {
        key: 'grok',
        name: 'Grok 4.6',
        provider: 'xAI',
        colorVar: 'dsw-static-neutral-bluish-700',
        price: { currency: 'USD', input: 2, cacheHit: 0.5, output: 6 },
    },
    {
        key: 'grok-4.3',
        name: 'Grok 4.3',
        provider: 'xAI',
        colorVar: 'dsw-static-neutral-bluish-500',
        price: { currency: 'USD', input: 1.25, cacheHit: 0.2, output: 2.5 },
    },
    // Meta — Llama 4 (Together/OpenRouter list rates 2026-08).
    {
        key: 'llama',
        name: 'Llama 4 Maverick',
        provider: 'Meta',
        colorVar: 'dsw-static-red-500',
        price: { currency: 'USD', input: 0.2, cacheHit: 0.05, output: 0.6 },
    },
    {
        key: 'llama-scout',
        name: 'Llama 4 Scout',
        provider: 'Meta',
        colorVar: 'dsw-static-red-400',
        price: { currency: 'USD', input: 0.1, cacheHit: 0.025, output: 0.3 },
    },
    // Fallback for any stats key absent from the catalog (CNY, domestic default).
    {
        key: 'other',
        name: '其他模型',
        provider: 'Custom',
        colorVar: 'dsw-static-neutral-bluish-500',
        price: { currency: 'CNY', input: 0.5, cacheHit: 0.25, cacheMiss: 0.5, output: 1.5 },
    },
];
/**
 * 真实 provider model id → 计费目录键（`MODEL_CATALOG[].key`）的映射。未知 id
 * 原样保留并落回 `other`（未知模型不估算费用）。聚合层（aggregate.ts）在折叠时
 * 用同一张表把日志里的 model id 归并为目录键，客户端渲染（`modelOf`）也按它
 * 解析，两侧共用一份映射，避免同一模型两侧不一致导致「未收录」。
 */
export const MODEL_KEY_ALIASES = {
    'deepseek-v4-flash': 'flash',
    'deepseek-v4-flash-vision-exp': 'flash-vision-exp',
    'deepseek-v4-pro': 'pro',
    'glm-5.2': 'glm',
    // 智谱 GLM 其余按量变体：独立目录键（点/横杠/大小写变体归一）。
    'glm-4.5-air': 'glm-4.5-air',
    'glm-4.5air': 'glm-4.5-air',
    'glm-4.7': 'glm-4.7',
    'glm-5-turbo': 'glm-5-turbo',
    'glm-5.1': 'glm-5.1',
    'glm-5v-turbo': 'glm-5v-turbo',
    'glm-5v.1': 'glm-5v-turbo',
    'qwen3.8-max': 'qwen-3.8-max',
    'qwen3.7-max': 'qwen-max',
    'qwen-max': 'qwen-max',
    'hunyuan-t1': 'hunyuan-t1',
    'step-3.7-flash': 'step',
    'seed-2.0-mini': 'doubao-mini',
    // 月之暗面 Kimi：coding plan 通道的 model id 是短名 k3。
    'k3': 'kimi-k3',
    'kimi-k3': 'kimi-k3',
    // MiniMax：官方 OpenAI 兼容 id 为 `MiniMax-M3`（目录键 `minimax`）。日志里大小写/型号后缀
    // 各异，统一归一化到目录键，避免「厂商计费与订阅」把 MiniMax-M3 标成未收录。
    'minimax-m1': 'minimax',
    'minimax-m2': 'minimax',
    'minimax-m3': 'minimax',
    // MiniMax-M2.7 / M2.7-highspeed：按量通道的独立目录键（点/横杠/大小写变体归一）。
    'minimax-m2.7': 'minimax-m2.7',
    'minimax-m2.7-highspeed': 'minimax-m2.7-highspeed',
    'minimax-m2.7-high-speed': 'minimax-m2.7-highspeed',
    'minimax-m2-7': 'minimax-m2.7',
    'minimax-m2-7-highspeed': 'minimax-m2.7-highspeed',
    'minimax-m2-7-high-speed': 'minimax-m2.7-highspeed',
};
/**
 * 模型 id 归一化：小写、去括号附注（如 `gpt5.6 luna(go)` 只看主体）、再去所有
 * 非字母数字分隔符（空格 / 横杠 / 点 / 下划线）。用于日志里的模型 id 与计费
 * 目录键做宽松匹配，提升「大小写/分隔符差异导致未收录」的识别率。
 * @param id - 原始模型 id（日志或目录键）。
 * @returns 归一化键（字母数字小写串）。
 */
export function canonModelId(id) {
    return String(id).toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]+/g, '');
}
/**
 * 目录常量键的归一化索引：归一化键 → 真实计费键。只索引静态来源（内置目录、
 * 别名表、dsh-spend 兜底键）；models.dev 补充条目是运行时注入，单独实时匹配。
 */
const CATALOG_CANON_INDEX = (() => {
    const map = new Map();
    const add = (candidate, target) => {
        const canon = canonModelId(candidate);
        if (canon !== '' && !map.has(canon))
            map.set(canon, target);
    };
    for (const entry of MODEL_CATALOG)
        add(entry.key, entry.key);
    for (const [alias, key] of Object.entries(MODEL_KEY_ALIASES))
        add(alias, key);
    for (const rate of FALLBACK_RATES)
        add(rate.key, rate.key);
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
export function resolveCatalogKey(id) {
    const exact = MODEL_KEY_ALIASES[id] ?? id;
    if (exact === id) {
        // 精确别名未命中：做归一化匹配；命中即返回目标键。
        const canon = canonModelId(id);
        if (canon !== '') {
            const hit = CATALOG_CANON_INDEX.get(canon);
            if (hit !== undefined)
                return hit;
            const extraHit = (liveExtraModels ?? []).find(item => canonModelId(item.key) === canon);
            if (extraHit !== undefined)
                return extraHit.key;
        }
    }
    return exact;
}
/** 取一个计费键的实时单价（实时覆盖 > dsh-spend 官方价兜底）。 */
function livePriceOf(key) {
    const resolved = resolveCatalogKey(key);
    const live = livePrices?.[resolved];
    if (live !== undefined)
        return live;
    const fallback = FALLBACK_RATES.find(rate => rate.key.toLowerCase() === resolved.toLowerCase());
    if (fallback === undefined)
        return undefined;
    return { input: fallback.input, cacheHit: fallback.cacheHit, output: fallback.output };
}
/** Lookup a model by its stats key; falls back to the generic `other` entry. */
export function modelOf(key) {
    // 先按别名/归一化归并为目录键（catalog key 本身不在别名表里，原样通过）。
    const resolved = resolveCatalogKey(key);
    const found = MODEL_CATALOG.find(entry => entry.key === resolved);
    // 目录未命中时查 models.dev 补充条目（与宿主预制提供方对齐的实时价）。
    const extra = liveExtraModels?.find(item => item.key === resolved);
    const base = found ?? (extra !== undefined ? extraEntryOf(extra) : (() => {
        const fallback = MODEL_CATALOG.at(-1);
        if (fallback !== undefined)
            return fallback;
        throw new Error('MODEL_CATALOG must not be empty');
    })());
    const live = livePriceOf(resolved);
    if (live === undefined)
        return base;
    // 实时价是路由器的美元单价（平档、无时段区分）：整表替换并走汇率换算。
    return { ...base, price: { currency: 'USD', input: live.input, cacheHit: live.cacheHit, output: live.output } };
}
/** models.dev 补充条目转为目录条目：USD 直价（走汇率换算），无峰谷分档。 */
function extraEntryOf(extra) {
    return {
        key: extra.key,
        name: extra.name,
        provider: extra.provider,
        colorVar: 'dsw-static-neutral-400',
        price: {
            currency: 'USD',
            input: extra.price.input,
            cacheHit: extra.price.cacheHit,
            output: extra.price.output,
        },
    };
}
/**
 * 模型是否可计价：内置目录、models.dev 补充、或 dsh-spend 官方价兜底命中。
 * 聚合层的计价闸门（目录外模型不产生费用，避免兜底档误估）。
 */
export function isPriced(key) {
    const resolved = resolveCatalogKey(key);
    if (MODEL_CATALOG.some(entry => entry.key === resolved))
        return true;
    if ((liveExtraModels ?? []).some(item => item.key === resolved))
        return true;
    return FALLBACK_RATES.some(rate => rate.key.toLowerCase() === resolved.toLowerCase());
}
/**
 * 费率表渲染的完整目录：内置 + models.dev 补充条目 + 探活模型（无价标记）。
 * 探活模型去重（按归一化 id）：内置/补充已有的不再重复；无价的保留并标记
 * `uncatalogued`，费率表据此显示「未收录」。
 */
export function catalogEntries() {
    const entries = [...MODEL_CATALOG, ...(liveExtraModels ?? []).map(extraEntryOf)];
    const known = new Set(entries.map(entry => entry.key.toLowerCase()));
    const knownCanon = new Set(entries.map(entry => canonModelId(entry.key)));
    for (const model of liveCatalogModels ?? []) {
        const rawKey = model.id.toLowerCase();
        const builtin = (() => {
            const aliasKey = resolveCatalogKey(model.id);
            return MODEL_CATALOG.find(item => item.key === aliasKey);
        })();
        // 内置目录收录：跳过，避免与内置行重复（key 用内置目录键）。
        if (builtin !== undefined)
            continue;
        const idCanon = canonModelId(model.id);
        // 已收录（内置 / models.dev 补充）：按归一化 id 去重，避免同一模型的重复行。
        if (known.has(rawKey) || (idCanon !== '' && knownCanon.has(idCanon)))
            continue;
        // 目录外但有 models.dev 价：直接复用其 USD 价（按归一化 id 匹配），否则走
        // dsh-spend 官方价兜底；两者都没有才标「未收录」。
        const extra = (liveExtraModels ?? []).find(item => canonModelId(item.key) === idCanon);
        let entry;
        if (extra !== undefined) {
            entry = extraEntryOf(extra);
            if (model.name !== undefined && model.name !== '')
                entry = { ...entry, name: model.name };
        }
        else {
            const fallbackLive = livePriceOf(rawKey);
            if (fallbackLive !== undefined) {
                entry = {
                    key: rawKey,
                    name: model.name ?? model.id,
                    provider: model.provider,
                    colorVar: 'dsw-static-neutral-400',
                    price: { currency: 'USD', input: fallbackLive.input, cacheHit: fallbackLive.cacheHit, output: fallbackLive.output },
                };
            }
            else {
                const aliasKey = resolveCatalogKey(model.id);
                entry = {
                    key: aliasKey,
                    name: model.name ?? model.id,
                    provider: model.provider,
                    colorVar: 'dsw-static-neutral-400',
                    price: { currency: 'USD', input: 0, cacheHit: 0, output: 0 },
                    // 探活命中但无内置/models.dev/dsh-spend 价：标记未收录，费率表显示「未收录」。
                    uncatalogued: true,
                };
            }
        }
        known.add(entry.key.toLowerCase());
        if (idCanon !== '')
            knownCanon.add(idCanon);
        entries.push(entry);
    }
    return entries;
}
/** Resolve a price-table row by its CSS variable name (theme token or fallback color). */
export function resolveToken(name) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
    return value !== '' ? value : '#8b95a3';
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
    const raw = ((miss * (band.cacheMiss ?? band.input))
        + (hit * band.cacheHit)
        + (buckets.output * band.output)) / 1_000_000;
    // 统一成人民币：只有美元计价的国外模型需要乘汇率，国内模型原样就是 ¥。
    return currency === 'USD' ? raw * currentRate() : raw;
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
export function computeCost(entry, buckets, peakShare = DEFAULT_PEAK_SHARE) {
    const peak = priceBandCost(entry.price, buckets, entry.price.currency);
    const off = entry.price.offPeak === undefined ? peak : priceBandCost(entry.price.offPeak, buckets, entry.price.currency);
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
 * @returns the estimated cost in CNY（USD 计价模型已按当前汇率折算）。
 */
export function computeCostAt(entry, buckets, timeMs, peakShare = DEFAULT_PEAK_SHARE) {
    if (entry.price.offPeak === undefined)
        return priceBandCost(entry.price, buckets, entry.price.currency);
    if (timeMs === null || timeMs === undefined || !Number.isFinite(timeMs))
        return computeCost(entry, buckets, peakShare);
    const band = tierAt(timeMs) === 'peak' ? entry.price : entry.price.offPeak;
    return priceBandCost(band, buckets, entry.price.currency);
}
/** 人民币 → 美元（显示换算用）：用当前生效汇率（实时优先，缺失回退内置），
 *  与计价链路的 `currentRate()` 同口径，避免实时汇率生效时 USD 显示与计价不一致。 */
export function cnyToUsd(cny) {
    const rate = currentRate();
    return rate > 0 ? cny / rate : cny;
}
/**
 * Format an amount with adaptive precision and the given currency symbol.
 * @param amount - the amount (CNY by default; pass `usd` for dollar display).
 * @param currency - display currency; default `cny`.
 */
export function formatMoney(amount, currency = 'cny') {
    // 外部统计 JSON 的数字字段可能被写成字符串/非法值：先归一化，避免
    // toFixed 抛 TypeError 把整个渲染树打崩（插件 surface 会被卸载）。
    const value = Number(amount);
    if (!Number.isFinite(value))
        return currency === 'cny' ? '¥0' : '$0';
    const symbol = currency === 'cny' ? '¥' : '$';
    if (value <= 0)
        return `${symbol}0`;
    if (value >= 1000)
        return `${symbol}${value.toFixed(0)}`;
    if (value >= 10)
        return `${symbol}${value.toFixed(1)}`;
    if (value >= 0.1)
        return `${symbol}${value.toFixed(2)}`;
    return `${symbol}${value.toFixed(3)}`;
}
/**
 * Format a per-1M-token price in its native currency (free when the rate is
 * zero): CNY for domestic models, USD for overseas ones.
 */
export function formatUnitPrice(price, currency = 'CNY') {
    if (price === 0)
        return '免费';
    if (currency === 'USD') {
        if (price >= 10)
            return `$${price.toFixed(1)}`;
        return `$${price.toFixed(2)}`;
    }
    if (price >= 10)
        return `¥${price.toFixed(1)}`;
    return `¥${price.toFixed(2)}`;
}
/**
 * 把一条「每百万 token」单价从原生币种换算到目标展示币种（按 USD→CNY 汇率）。
 * 汇率缺失/非法时回退原值，避免 0 汇率把价格算没。
 * @param price - 原生币种单价。
 * @param native - 模型原生币种。
 * @param target - 用户当前展示币种。
 * @param rate - USD→CNY 汇率（1 USD = rate CNY）。
 * @returns 换算到目标币种的单价；同币种或汇率不可用时原值。
 */
export function convertUnitPrice(price, native, target, rate) {
    if (rate <= 0 || !Number.isFinite(rate))
        return price;
    const targetCurrency = target === 'usd' ? 'USD' : 'CNY';
    if (native === targetCurrency)
        return price;
    return target === 'usd' ? price / rate : price * rate;
}
/** Format a large token count with B/M/K suffix. */
export function formatTokens(value) {
    if (value >= 1e9)
        return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6)
        return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3)
        return `${(value / 1e3).toFixed(0)}K`;
    return String(value);
}
/** Format a percentage. */
export function formatPercent(value) {
    const normalized = Number(value);
    if (!Number.isFinite(normalized))
        return '0.0%';
    return `${normalized.toFixed(1)}%`;
}
//# sourceMappingURL=pricing.js.map