import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * UsageBilling: sidebar footer trigger + full billing dashboard modal.
 *
 * The trigger sits above Settings in the sidebar footer (rail shows an icon,
 * wide shows a pill with the running total). Clicking opens a centered modal
 * dashboard: hero total, KPI tiles, a dependency-free SVG daily trend chart,
 * a per-model billing table priced from the built-in catalog, and a pricing
 * table. Data comes from the host's `/api/billing/usage-stats` endpoint;
 * before real data arrives the dashboard shows an empty (zero) snapshot,
 * never fabricated samples.
 */
import { useCallback, useEffect, useMemo, useState, Fragment } from 'react';
import clsx from 'clsx';
import { Modal } from '@deepseek-ai/dsh-client-ui-primitives';
import { DEFAULT_ENABLE_USAGE_STATS_TOOL, loadFloatWindowPrefs, saveFloatWindowPrefs, } from "./usage-billing-settings.js";
import { TrendChart } from "./TrendChart.js";
import { PerfPanel } from "./PerfPanel.js";
import { PluginInfoCard } from "./PluginInfoCard.js";
import { TokenPanel } from "./TokenPanel.js";
import { RoundCostChart } from "./round-chart.js";
import { UsageHeatmap } from "./heatmap.js";
import { flagAnomalies } from "./anomaly.js";
import { dayRowsCsv, downloadText, exportFileName, sessionRowsCsv, siteRowsCsv } from "./export.js";
import { applyLiveCatalogModels, applyLivePricing, catalogEntries, cnyToUsd, computeCost, convertUnitPrice, formatMoney, formatPercent, formatTokens, formatUnitPrice, getRateInfo, modelOf, resolveToken, tierAt, } from "./pricing.js";
import { zh, en } from "./locales.js";
import { localizeProviderName } from "./provider-display.js";
import { tierInfoOf } from "./plan-knowledge.js";
import { vendorLogoOf } from "./vendor-logos.js";
import { computePeakAlert, loadPeakAlertConfig, savePeakAlertConfig } from "./peak-alert.js";
import { PeakAlertBanner } from "./PeakAlertBanner.js";
import css from './UsageBilling.module.css';
/** 会话明细面板最多展示的行数（完整长尾在服务端另有一层封顶）。 */
const SESSION_DISPLAY_LIMIT = 20;
/**
 * Tab 定义（顺序即渲染顺序）：概览=主数字/KPI/热力图，账单=厂商计费与订阅，
 * 用量=Token 用量，趋势=趋势图/每轮费用，费率=模型单价表，设置=预算与峰谷提醒。
 * 导出供测试断言 tab 与文案 key 对齐、decor 锚点落在正确分区。
 */
export const DASHBOARD_TABS = [
    { id: 'overview', labelKey: 'billing.tabOverview' },
    { id: 'providers', labelKey: 'billing.tabProviders' },
    { id: 'token', labelKey: 'billing.tabToken' },
    { id: 'trends', labelKey: 'billing.tabTrends' },
    { id: 'pricing', labelKey: 'billing.tabPricing' },
    { id: 'settings', labelKey: 'billing.tabSettings' },
];
/** 项目名取 cwd 的末级目录；无 cwd 时由调用方回退为 em dash。 */
function projectName(cwd) {
    if (cwd === undefined)
        return undefined;
    return cwd.split(/[\\/]/).filter(Boolean).pop() ?? cwd;
}
/** 预算提醒档位（百分比）：跨档时桌面通知，每档每天最多一次。 */
const BUDGET_ALERT_TIERS = [50, 80, 100];
/** Idle health state before the probe settles. */
const IDLE_HEALTH = {
    checked: false, available: false, models: 0, failures: 0,
    okProviders: [], badProviders: [],
};
/**
 * The dashboard's display names (中文厂商名) never equal the provider names a
 * user actually configures (deepseek, zhipu, qwen…), so the dot match also
 * accepts a bidirectional substring hit and a display-name alias list.
 * 导出供一致性守卫测试：catalog 每个厂商都必须在此登记（Custom 除外），
 * 防止新增厂商漏配导致健康绿灯不亮。
 */
export const PROVIDER_ALIASES = {
    'DeepSeek': ['deepseek'],
    '智谱 AI': ['zhipu', 'glm', 'z.ai'],
    '阿里通义': ['qwen', 'tongyi', 'dashscope', 'aliyun'],
    '字节豆包': ['doubao', 'volcengine', 'ark'],
    '月之暗面': ['moonshot', 'kimi'],
    '小米': ['xiaomi', 'mi', 'mimo'],
    'MiniMax': ['minimax'],
    '百度文心': ['ernie', 'wenxin', 'qianfan', 'baidu'],
    '腾讯混元': ['hunyuan', 'tencent'],
    '零一万物': ['01.ai', 'lingyi', 'yi'],
    '阶跃星辰': ['step', 'stepfun', 'step-3.7'],
    '科大讯飞': ['spark', 'xfyun', 'iflytek'],
    '商汤': ['sensenova', 'sensetime'],
    '百川智能': ['baichuan'],
    'OpenAI': ['openai'],
    'Google': ['google', 'gemini'],
    'xAI': ['xai', 'grok'],
    'Meta': ['meta', 'llama'],
    'Anthropic': ['claude', 'anthropic'],
    'Mistral AI': ['mistral', 'ministral', 'devstral'],
    'Cohere': ['cohere', 'command'],
    '美团': ['longcat', 'meituan'],
    '面壁智能': ['minicpm', 'modelbest'],
    '小红书': ['dots', 'rednote', 'xiaohongshu'],
};
/** Normalize a provider name for dot matching: lower case, no spaces. */
function normalizeProvider(name) {
    return name.trim().toLowerCase().replace(/[\s_/-]+/g, '');
}
/** Whether one normalized name is a substring of the other (length-guarded). */
function providerNameHits(display, live) {
    if (display.length === 0 || live.length === 0)
        return false;
    if (display === live)
        return true;
    const [short, long] = display.length <= live.length ? [display, live] : [live, display];
    // 太短的片段（如单字母）不做子串判断，避免误匹配。
    return short.length >= 3 && long.includes(short);
}
/** Whether a catalog display name matches one live provider name. */
function providerMatches(display, live) {
    const displayKey = normalizeProvider(display);
    const liveKey = normalizeProvider(live);
    if (providerNameHits(displayKey, liveKey))
        return true;
    const aliases = PROVIDER_ALIASES[display];
    return aliases !== undefined && aliases.some(alias => providerNameHits(normalizeProvider(alias), liveKey));
}
/**
 * 从真实 model id 反推提供方显示名：目录未收录的模型（key 落回「其他」）
 * 只靠 entry.provider（Custom）永远点不亮健康灯，这里用厂商别名对 model id
 * 做强匹配（别名作为完整 id / 前缀 / 独立段）与弱匹配（长别名子串），
 * 命中即显示厂商名并点亮健康点；无命中保持 Custom。
 * 导出供守卫测试：短别名（mi/yi）仅允许前缀形式，防止 minimax 等误吞。
 */
export function providerFromModelKey(modelKey) {
    // 强匹配保留原始连字符（normalize 会吞掉 `-`，前缀/独立段判断就失效了）。
    const key = modelKey.trim().toLowerCase();
    const compact = key.replace(/[\s_/-]+/g, '');
    if (compact.length === 0)
        return undefined;
    // 强匹配：别名作为完整 id 或前缀/独立段（deepseek-chat、qwen-max、mi-mimo-2.5）。
    for (const [display, aliases] of Object.entries(PROVIDER_ALIASES)) {
        for (const alias of aliases) {
            const a = normalizeProvider(alias);
            if (a.length === 0)
                continue;
            if (key === a)
                return display;
            if (key.startsWith(`${a}-`) || key.startsWith(`${a}/`) || key.startsWith(`${a}_`))
                return display;
            if (key.includes(`${a}-`) || key.includes(`${a}/`) || key.includes(`${a}_`))
                return display;
        }
    }
    // 弱匹配：长别名（≥4 字符）作为 id 子串（mimo2.5 → mimo → 小米）；短别名
    // 已在强匹配覆盖（前缀形式），这里不参与，避免误配。
    for (const [display, aliases] of Object.entries(PROVIDER_ALIASES)) {
        for (const alias of aliases) {
            const a = normalizeProvider(alias);
            if (a.length < 4)
                continue;
            if (compact.includes(a))
                return display;
        }
    }
    return undefined;
}
/**
 * 订阅套餐 provider id → 所属模型厂商（用于把订阅额度归并到对应厂商组）。
 * 厂商名与 PROVIDER_ALIASES 保持一致，使订阅卡片与模型用量落在同一组下。
 * opencode 是跨厂商订阅通道、无单一模型厂商，按自身显示名独立成组。
 */
const SUBSCRIPTION_VENDORS = {
    'kimi-coding': '月之暗面',
    'zai-coding-cn': '智谱 AI',
    'zai-coding': '智谱 AI',
    'qwen-token-plan': '阿里通义',
    'qwen-token-plan-cn': '阿里通义',
    'xiaomi-token-plan-ams': '小米',
    'xiaomi-token-plan-cn': '小米',
    'xiaomi-token-plan-sgp': '小米',
    'volcengine-token-plan': '字节豆包',
    'ark-token-plan': '字节豆包',
    'doubao-token-plan': '字节豆包',
    'ernie': '百度文心',
    'baidu': '百度文心',
    'wenxin': '百度文心',
    'minimax': 'MiniMax',
    'minimax-cn': 'MiniMax',
    'minimax-token-plan': 'MiniMax',
    'minimax-token-plan-cn': 'MiniMax',
    'hunyuan-token-plan': '腾讯混元',
    'tencent-token-plan': '腾讯混元',
    'hy-token-plan': '腾讯混元',
    'xinghuo-token-plan': '讯飞星火',
    'xfyun-coding': '讯飞星火',
    'spark-coding': '讯飞星火',
    'huawei-token-plan': '华为云',
    'pangu-token-plan': '华为云',
    'huawei-maas-token-plan': '华为云',
    'volcengine-agent-plan': '字节豆包',
    'ark-agent-plan': '字节豆包',
    'baidu-token-plan': '百度文心',
    'ernie-token-plan': '百度文心',
    'wenxin-token-plan': '百度文心',
    'opencode': 'OpenCode',
    'opencode-go': 'OpenCode',
};
/** 仅供测试：暴露厂商映射表（subscriptionVendorOf 仍是唯一消费入口）。 */
export const SUBSCRIPTION_VENDORS_FOR_TEST = SUBSCRIPTION_VENDORS;
/** 订阅套餐归并到的厂商显示名；未知 id 回退为从 model id 反推或 id 本身。 */
function subscriptionVendorOf(provider) {
    const mapped = SUBSCRIPTION_VENDORS[provider];
    if (mapped !== undefined)
        return mapped;
    return providerFromModelKey(provider) ?? provider;
}
/** 余额不足告警的默认阈值（人民币元）：宿主 Config 未配置时客户端兜底。 */
const DEFAULT_LOW_BALANCE_THRESHOLD = 50;
/**
 * 日均消耗（元/天）：取最近 7 天（含今天）总花费 ÷ 有记录天数；无记录返回 0
 * （此时可用天数无法估算，调用方不显示天数提示）。日期戳字典序即时间序。
 */
function dailyBurnRate(byDay, today) {
    const dates = Object.keys(byDay).filter(d => d <= today).sort().slice(-7);
    if (dates.length === 0)
        return 0;
    const total = dates.reduce((sum, d) => sum + (byDay[d]?.cost ?? 0), 0);
    return total / dates.length;
}
/**
 * 本月预计总花费：按本月已有记录的平均日消耗 × 本月天数外推；无本月记录时
 * 回退为最近 7 天日均 × 本月天数；无任何记录时返回 0（调用方不展示）。
 * 导出供测试：纯函数，不依赖组件。
 * @param byDay - 按日费用表。
 * @param monthPrefix - 本月前缀（YYYY-MM）。
 * @param today - 今日日期戳（YYYY-MM-DD）。
 * @returns 本月预计花费（人民币元）；无数据时为 0。
 */
export function projectMonthCost(byDay, monthPrefix, today) {
    const dates = Object.keys(byDay).filter(d => d.startsWith(monthPrefix));
    // 本月总天数：取当月最后一日的日号（用下月第 0 天）。
    const monthLen = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const avg = dates.length > 0
        ? dates.reduce((sum, d) => sum + (byDay[d]?.cost ?? 0), 0) / dates.length
        : dailyBurnRate(byDay, today);
    if (avg <= 0)
        return 0;
    return avg * monthLen;
}
/**
 * 峰谷时段费用分摊：按每轮的起始时刻（北京时间高峰 9-12 / 14-18）把费用
 * 归入高峰 / 空闲两档。导出供测试：纯函数。
 * @param turns - 每轮费用行（需带 startedAt 与 cost）。
 * @returns 两档费用合计（人民币元）。
 */
export function peakOffpeakCost(turns) {
    let peak = 0;
    let offPeak = 0;
    for (const turn of turns) {
        if (tierAt(turn.startedAt) === 'peak')
            peak += turn.cost;
        else
            offPeak += turn.cost;
    }
    return { peak, offPeak };
}
/** 近 7 天费用序列（含今天，缺日补 0）：触发卡 hover 速览的迷你柱数据源。
 * 导出供测试：纯函数（日期取本地时区）。 */
export function activeDaysOf(byDay) {
    return Object.keys(byDay).length;
}
/** 连续使用天数：从今天往前连续「有调用记录」的天数；今天无记录则为 0。
 * 导出供测试：纯函数（日期取本地时区）。 */
export function streakDaysOf(byDay, now = Date.now()) {
    let streak = 0;
    const cursor = new Date(now);
    for (;;) {
        const key = localDayStamp(cursor.getTime());
        if (!(key in byDay))
            break;
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
}
/**
 * 近 7 天费用序列（含今天，缺日补 0）：触发卡 hover 速览的迷你柱数据源。
 * 导出供测试：纯函数（日期取本地时区）。
 * @param byDay - 按日费用表。
 * @returns 7 个 `{ date, cost }`，最旧在前。
 */
export function lastSevenDays(byDay) {
    const out = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
        const day = new Date();
        day.setDate(day.getDate() - offset);
        const stamp = localDayStamp(day.getTime());
        out.push({ date: stamp, cost: byDay[stamp]?.cost ?? 0 });
    }
    return out;
}
/** Resolve one provider's dot state: green when live, red when failed, gray when unknown. */
function providerDot(health, provider) {
    if (!health.checked)
        return css.healthIdle;
    if (health.okProviders.some(live => providerMatches(provider, live)))
        return css.healthOk;
    if (health.badProviders.some(live => providerMatches(provider, live)))
        return css.healthBad;
    return css.healthIdle;
}
/** 订阅额度查询状态的文案（ok 时无需额外标注，返回空串）。 */
function subscriptionStatusText(status, t) {
    switch (status) {
        case 'ok': return '';
        case 'not-configured': return t('billing.subscriptionNotConfigured');
        case 'unauthorized': return t('billing.subscriptionUnauthorized');
        case 'rate-limited': return t('billing.subscriptionRateLimited');
        case 'invalid-response': return t('billing.subscriptionInvalid');
        default: return t('billing.subscriptionUnavailable');
    }
}
/** 订阅额度窗口的类型标签（本次 / 本周 / 本月 / 计费周期）。 */
function subscriptionWindowLabel(kind, t) {
    switch (kind) {
        case 'session': return t('billing.subscriptionSession');
        case 'weekly': return t('billing.subscriptionWeekly');
        case 'monthly': return t('billing.subscriptionMonthly');
        case 'billing': return t('billing.subscriptionBilling');
    }
}
/** 由 bySite 的 key 解析站点行显示名与类别。 */
function siteBucketLabel(key, t) {
    if (key.startsWith('site:'))
        return { name: key.slice(5), kind: 'site' };
    if (key.startsWith('direct:'))
        return { name: key.slice(7), kind: 'direct' };
    return { name: t('billing.relayUnknown'), kind: 'unknown' };
}
/** 站点类别的文案（中转站 / 直连 / 未知路由）。 */
function siteKindText(kind, t) {
    switch (kind) {
        case 'site': return t('billing.relaySite');
        case 'direct': return t('billing.relayDirect');
        default: return t('billing.relayUnknown');
    }
}
/** 中转站程序类型的徽标文案（New API / Sub2API / 未识别）。 */
function relayKindText(kind, t) {
    switch (kind) {
        case 'new-api': return t('billing.relayKindNewApi');
        case 'sub2api': return t('billing.relayKindSub2Api');
        default: return t('billing.relayKindUnknown');
    }
}
/** 站点类别对应的样式类（bySite 桶与中转站额度徽标共用配色）。 */
const SITE_KIND_CLASS = {
    site: css.siteKindSite,
    direct: css.siteKindDirect,
    unknown: css.siteKindUnknown,
};
/** 中转站程序类型对应的样式类（复用站点类别配色）。 */
const RELAY_KIND_CLASS = {
    'new-api': css.siteKindSite,
    sub2api: css.siteKindDirect,
    unknown: css.siteKindUnknown,
};
/** Path to the usage-stats endpoint served by this plugin's node half. */
const USAGE_STATS_PATH = '/api/billing/usage-stats';
/** Path to the live-pricing endpoint served by this plugin's node half. */
const PRICING_PATH = '/api/billing/pricing';
/** Path to the account-balance endpoint served by this plugin's node half. */
const BALANCE_PATH = '/api/billing/balance';
/** Path to the subscription-plan quota endpoint served by this plugin's node half. */
const SUBSCRIPTIONS_PATH = '/api/billing/subscriptions';
/** Path to the relay-site quota endpoint served by this plugin's node half. */
const RELAY_PATH = '/api/billing/relay-quotas';
/** 弹窗打开期间统计与定价的自动刷新间隔（毫秒）。 */
const STATS_REFRESH_INTERVAL_MS = 30_000;
/**
 * 本地时区（北京时间）日期戳：与服务端聚合的 dayStamp 一致。不要用
 * `toISOString()`——那是 UTC，北京时间的凌晨 0-8 点会取到前一天。
 */
function localDayStamp(time = Date.now()) {
    const date = new Date(time);
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
/** 本地时区时钟：`HH:MM:SS`。 */
function formatClock(time) {
    const date = new Date(time);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
/**
 * 高区分度图表色板：趋势图柱、图例与计费表圆点按模型分配。不用模型品牌色
 * （目录里多为蓝色系，视觉上几乎分不开），保证每个模型一眼可辨。
 */
const CHART_PALETTE = [
    '#3b82f6', '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981',
    '#ef4444', '#ec4899', '#6366f1', '#f97316', '#14b8a6',
];
/** Empty snapshot: shown before (or without) real host data — zeros, never fabricated samples. */
const EMPTY_STATS = {
    total: { calls: 0, input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cost: 0, reasoning: 0 },
    byModel: {},
    byDay: {},
    byDayModels: {},
};
/** Try to load stats from the server; returns null when no valid JSON stats are served. */
async function loadUsageStats() {
    try {
        const response = await fetch(USAGE_STATS_PATH);
        if (!response.ok)
            return null;
        // The web server's SPA fallback answers unknown paths with HTML, so a
        // 200 is not proof of JSON; parse the text and only accept objects.
        const text = await response.text();
        const parsed = JSON.parse(text);
        if (parsed === null || typeof parsed !== 'object' || !('total' in parsed))
            return null;
        // 缺字段快照兜底：聚合升级前的旧文件可能缺 byDay/byModel，按空统计渲染，
        // 避免渲染路径读 undefined 抛错导致整个插件 surface 被卸载。
        const candidate = parsed;
        return {
            total: candidate.total ?? EMPTY_STATS.total,
            byModel: candidate.byModel ?? {},
            byDay: candidate.byDay ?? {},
            ...(candidate.byDayModels !== undefined ? { byDayModels: candidate.byDayModels } : {}),
            ...(candidate.updatedAt !== undefined ? { updatedAt: candidate.updatedAt } : {}),
            ...(typeof candidate.budget === 'number' ? { budget: candidate.budget } : {}),
            ...(typeof candidate.lowBalanceThreshold === 'number' ? { lowBalanceThreshold: candidate.lowBalanceThreshold } : {}),
            ...(Array.isArray(candidate.bySession) ? { bySession: candidate.bySession } : {}),
            ...(Array.isArray(candidate.byTurn) ? { byTurn: candidate.byTurn } : {}),
            ...(Array.isArray(candidate.byWorkspace) ? { byWorkspace: candidate.byWorkspace } : {}),
            // 角色归因：旧快照缺失；仅接受对象形状（durable 边界，字段值由渲染处数值化兜底）。
            ...(candidate.byRole !== null && typeof candidate.byRole === 'object'
                ? { byRole: candidate.byRole }
                : {}),
            // 性能指标：旧快照缺失；仅接受含 byModel/byHour 的对象形状。
            ...(candidate.perf !== null && typeof candidate.perf === 'object'
                && candidate.perf.byModel !== null && typeof candidate.perf.byModel === 'object'
                && candidate.perf.byHour !== null && typeof candidate.perf.byHour === 'object'
                ? { perf: candidate.perf }
                : {}),
            ...(typeof candidate.pluginVersion === 'string' ? { pluginVersion: candidate.pluginVersion } : {}),
        };
    }
    catch {
        return null;
    }
}
/**
 * Apply the node half's live pricing snapshot. The node half refreshes once
 * at boot, so an early `builtin` answer may just mean the refresh is still
 * in flight — retry briefly before settling for the built-in values.
 * Any final failure keeps the built-in catalog and rate — degrade, never
 * fabricate.
 * @param attempt - current retry index (0-based).
 */
/** 实时定价重试链是否已在进行：挂载/开弹窗/轮询多个调用点会并发触发 loadLivePricing，
 *  若都在 `builtin` 时各自起 setTimeout 重试链会叠加出多余请求，这里只保留一条。 */
let livePricingRetryPending = false;
async function loadLivePricing(attempt = 0) {
    const MAX_ATTEMPTS = 4;
    try {
        const response = await fetch(PRICING_PATH);
        if (!response.ok) {
            livePricingRetryPending = false;
            return;
        }
        const text = await response.text();
        const parsed = JSON.parse(text);
        if (parsed === null || typeof parsed !== 'object' || !('source' in parsed)) {
            livePricingRetryPending = false;
            return;
        }
        const pricing = parsed;
        if (pricing.source === 'builtin' && attempt < MAX_ATTEMPTS - 1) {
            // 节点端启动拉取可能仍在进行中：稍后重试，避免把「更新中」误判成永久内置。
            if (attempt === 0) {
                // 已有重试链在跑则不叠加新链；否则标记并启动本链。
                if (livePricingRetryPending)
                    return;
                livePricingRetryPending = true;
            }
            setTimeout(() => { void loadLivePricing(attempt + 1); }, 2000);
            return;
        }
        livePricingRetryPending = false;
        applyLivePricing(pricing);
    }
    catch {
        // 拉取失败：维持内置目录与内置汇率（默认值降级）。
        livePricingRetryPending = false;
    }
}
/**
 * 一次拉取 `/api/billing/balance` 的完整响应（余额行 + 对账提示）。余额与对账
 * 提示来自同一响应体，拆成两个函数会导致每 30 秒对同一端点发两次请求，故合并
 * 为单次 fetch；失败返回空值（余额 []、对账 undefined），由调用方降级。
 * @returns the balances and reconcile notice (both degraded on any failure).
 */
async function fetchBalanceDoc() {
    try {
        const response = await fetch(BALANCE_PATH);
        if (!response.ok)
            return { balances: [] };
        const text = await response.text();
        const parsed = JSON.parse(text);
        if (parsed === null || typeof parsed !== 'object')
            return { balances: [] };
        const doc = parsed;
        return {
            balances: Array.isArray(doc.balances) ? doc.balances : [],
            ...(doc.reconcile === undefined ? {} : { reconcile: doc.reconcile }),
        };
    }
    catch {
        return { balances: [] };
    }
}
/**
 * 拉取官方余额差对账提示（drift 时非空），供余额面板展示；失败返回 undefined。
 * 复用 {@link fetchBalanceDoc} 的同一响应，导出供对账提示渲染测试单独解析。
 * @returns the reconcile notice, or undefined on any failure / no drift.
 */
export async function fetchReconcile() {
    return (await fetchBalanceDoc()).reconcile;
}
/**
 * 拉取订阅套餐剩余额度（供订阅面板）；失败返回空列表。
 * @returns the quota rows, or an empty list on any failure.
 */
async function fetchSubscriptions() {
    const response = await fetch(SUBSCRIPTIONS_PATH);
    if (!response.ok)
        throw new Error(`subscriptions HTTP ${String(response.status)}`);
    const text = await response.text();
    const parsed = JSON.parse(text);
    if (parsed !== null && typeof parsed === 'object' && 'quotas' in parsed) {
        return parsed.quotas;
    }
    throw new Error('subscriptions: invalid response');
}
/**
 * 拉取中转站额度（New API / Sub2API 的余额与滚动窗口）；失败抛出（调用方据此保留旧快照）。
 * @returns the relay-site quota rows（成功但无中转配置时为空数组）。
 */
async function fetchRelayQuotas() {
    const response = await fetch(RELAY_PATH);
    if (!response.ok)
        throw new Error(`relay-quotas HTTP ${String(response.status)}`);
    const text = await response.text();
    const parsed = JSON.parse(text);
    if (parsed !== null && typeof parsed === 'object' && 'quotas' in parsed) {
        return parsed.quotas;
    }
    throw new Error('relay-quotas: invalid response');
}
/**
 * 读取 usage_stats 工具开关当前值（插件自带接口，不依赖宿主浏览器设置白名单）。
 * @returns 当前是否注入；读取失败（服务未起/非 JSON）返回 undefined。
 */
async function loadUsageTool() {
    try {
        const response = await fetch('/api/billing/usage-tool');
        if (!response.ok)
            return undefined;
        const parsed = JSON.parse(await response.text());
        return typeof parsed.enabled === 'boolean' ? parsed.enabled : undefined;
    }
    catch {
        return undefined;
    }
}
/**
 * 写 usage_stats 工具开关（插件自带接口）。工具注入是启动期决策，重启应用后生效。
 * @param enabled - 是否注入。
 * @returns 是否写成功。
 */
async function saveUsageTool(enabled) {
    try {
        const response = await fetch('/api/billing/usage-tool', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ enabled }),
        });
        if (!response.ok)
            return false;
        const parsed = JSON.parse(await response.text());
        return parsed.ok === true;
    }
    catch {
        return false;
    }
}
/**
 * Sidebar footer trigger: compact pill in wide mode, icon in rail mode.
 * ZINE 模式下入口由主题插件的贴纸层承担，本触发器由 CSS
 * （body[data-zine-mode] 选择器）隐藏，组件本身无 zine 分支。
 * @param props - framework props plus `wide` column state.
 */
function UsageBillingTrigger(props) {
    const { wide, t, onOpen, monthCost, todayCost, weekCost, days, vendorStatus, dash, floatPrefs, subscriptions, } = props;
    // 「指定订阅卡」浮窗：可用订阅列表 + 当前展示索引（每次一张，可前后切换）。
    const targetSubs = useMemo(() => floatPrefs.targets
        .map(id => subscriptions.find(s => s.provider === id))
        .filter((s) => s !== undefined), [floatPrefs.targets, subscriptions]);
    const [subIndex, setSubIndex] = useState(0);
    const effectiveSubIndex = targetSubs.length === 0 ? 0 : Math.min(subIndex, targetSubs.length - 1);
    const currentSub = targetSubs[effectiveSubIndex];
    // 浮窗 pointer-events:none 无法点击切换；多张订阅卡时每 1.5s 自动轮播。
    useEffect(() => {
        if (floatPrefs.mode !== 'subscription' || targetSubs.length < 2)
            return;
        const timer = setInterval(() => setSubIndex((index) => (index + 1) % targetSubs.length), 1500);
        return () => clearInterval(timer);
    }, [floatPrefs.mode, targetSubs.length]);
    // 计费 icon：圆角矩 + 细线描边，窄栏与宽栏共用。
    const cardIcon = (_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "aria-hidden": "true", children: [_jsx("path", { d: "M4 7h16v11H4z" }), _jsx("path", { d: "M4 10h16" }), _jsx("path", { d: "M8 14h3" })] }));
    if (!wide) {
        return (_jsx("button", { type: "button", className: css.railButton, "data-testid": "billing-rail-button", onClick: onOpen, title: `${t('billing.title')} · ${formatMoney(monthCost)}`, children: cardIcon }));
    }
    // 近 7 天 sparkline 高度：按当日费用归一化到 4~16px。
    const sparkMax = Math.max(...days.map(d => d.cost), 0);
    const sparkHeights = days.map(d => sparkMax > 0 ? 4 + (d.cost / sparkMax) * 12 : 4);
    return (_jsxs("span", { className: css.triggerWrap, children: [_jsxs("button", { type: "button", className: css.trigger, "data-testid": "billing-trigger", onClick: onOpen, title: `${t('billing.title')} · ${formatMoney(monthCost)}`, children: [_jsx("span", { className: css.triggerIcon, "data-testid": "billing-trigger-icon", children: cardIcon }), _jsxs("span", { className: css.triggerMain, children: [_jsxs("span", { className: css.triggerPrimary, children: [_jsx("span", { className: css.triggerLabel, children: t('billing.triggerMonth') }), _jsx("span", { className: css.triggerYen, "aria-hidden": "true", children: formatMoney(monthCost).charAt(0) }), _jsx("span", { className: css.triggerMetric, children: formatMoney(monthCost).slice(1) })] }), _jsxs("span", { className: css.triggerSub, "data-testid": "billing-trigger-today", children: [t('billing.triggerToday'), " ", formatMoney(todayCost), " \u00B7 ", t('billing.weekCost'), " ", formatMoney(weekCost)] })] }), _jsx("span", { className: css.triggerSpark, "data-testid": "billing-trigger-spark", "aria-hidden": "true", children: sparkHeights.map((h, index) => (_jsx("span", { className: index === sparkHeights.length - 1 ? css.triggerSparkHot : css.triggerSparkBar, style: { height: `${h}px` } }, days[index]?.date ?? String(index)))) })] }), _jsx("span", { className: clsx(css.triggerPop, floatPrefs.mode === 'subscription' && css.triggerPopSubscription), "data-testid": "billing-trigger-pop", "aria-hidden": "true", children: floatPrefs.mode === 'subscription' ? (_jsx(_Fragment, { children: targetSubs.length === 0 ? (_jsx("span", { className: css.triggerPopEmpty, children: t('billing.floatNoTargets') })) : (_jsxs(_Fragment, { children: [currentSub !== undefined && (_jsxs("div", { className: css.floatSub, "data-testid": "billing-float-subscription", children: [_jsxs("div", { className: css.floatSubHead, children: [_jsx("span", { className: css.floatSubName, children: currentSub.displayName }), currentSub.plan !== undefined && _jsx("span", { className: css.floatSubPlan, children: currentSub.plan })] }), currentSub.windows.map(window => (() => {
                                        const used = Math.min(100, Math.max(0, window.usedPercent));
                                        const remaining = Math.min(100, Math.max(0, window.remainingPercent));
                                        const exhausted = remaining <= 0;
                                        return (_jsxs("div", { className: css.subscriptionWindow, children: [_jsx("span", { className: css.subscriptionWindowLabel, children: subscriptionWindowLabel(window.kind, t) }), _jsx("span", { className: css.subscriptionTrack, "aria-hidden": "true", children: _jsx("span", { className: clsx(css.subscriptionFill, used >= 100 && css.subscriptionFillOver, used >= 80 && used < 100 && css.subscriptionFillWarn), style: { width: `${used}%` } }) }), _jsxs("span", { className: css.subscriptionMeta, children: [_jsx("span", { className: clsx(css.subscriptionPct, exhausted && css.subscriptionExhausted), children: exhausted
                                                                ? t('billing.subscriptionExhausted')
                                                                : t('billing.subscriptionRemaining').replace('{pct}', String(window.remainingPercent)) }), window.resetsAt !== undefined && (_jsx("span", { className: css.subscriptionReset, children: t('billing.subscriptionReset').replace('{date}', `${localDayStamp(new Date(window.resetsAt).getTime())} ${formatClock(new Date(window.resetsAt).getTime())}`) }))] })] }, window.kind));
                                    })())] })), targetSubs.length > 1 && (_jsx("span", { className: css.triggerPopSwitcher, "data-testid": "billing-float-switcher", children: _jsxs("span", { className: css.triggerPopSwitchCount, children: [effectiveSubIndex + 1, "/", targetSubs.length] }) }))] })) })) : (_jsxs(_Fragment, { children: [_jsx("span", { className: css.popHead, children: _jsx("span", { className: css.popTitle, children: t('billing.popTitle') }) }), _jsxs("span", { className: css.metricGrid, children: [_jsxs("span", { className: css.metricCell, children: [_jsx("span", { className: css.metricLabel, children: t('billing.monthCost') }), _jsx("span", { className: clsx(css.metricValue, css.metricValuePrimary), children: formatMoney(monthCost) })] }), _jsxs("span", { className: css.metricCell, children: [_jsx("span", { className: css.metricLabel, children: t('billing.tokenTotal') }), _jsx("span", { className: css.metricValue, children: formatTokens(dash.totalToken) })] }), _jsxs("span", { className: css.metricCell, children: [_jsx("span", { className: css.metricLabel, children: t('billing.input') }), _jsx("span", { className: css.metricValue, children: formatTokens(dash.input) })] }), _jsxs("span", { className: css.metricCell, children: [_jsx("span", { className: css.metricLabel, children: t('billing.output') }), _jsx("span", { className: css.metricValue, children: formatTokens(dash.output) })] }), _jsxs("span", { className: css.metricCell, children: [_jsx("span", { className: css.metricLabel, children: t('billing.cacheHit') }), _jsx("span", { className: clsx(css.metricValue, css.metricValueSuccess), children: formatTokens(dash.cacheRead) })] }), _jsxs("span", { className: css.metricCell, children: [_jsx("span", { className: css.metricLabel, children: t('billing.calls') }), _jsx("span", { className: css.metricValue, children: dash.calls.toLocaleString() })] })] }), _jsxs("span", { className: css.popModel, children: [_jsx("span", { className: css.popModelLabel, children: t('billing.popTodayModel') }), (vendorStatus.direct !== undefined || vendorStatus.sub !== undefined)
                                    ? (_jsxs(_Fragment, { children: [vendorStatus.direct !== undefined && (_jsxs("span", { className: css.popModelRow, children: [_jsx("span", { className: clsx(css.popDot, css.popDotDirect), "aria-hidden": "true" }), _jsx("span", { className: css.popTagPrimary, children: t('billing.popDirectLead') }), _jsx("span", { className: css.popModelName, children: vendorStatus.direct.name }), _jsx("span", { className: clsx(css.popModelStatus, vendorStatus.direct.low && css.popModelStatusLow), children: vendorStatus.direct.text })] })), vendorStatus.sub !== undefined && (_jsxs("span", { className: css.popModelRow, children: [_jsx("span", { className: clsx(css.popDot, css.popDotSub), "aria-hidden": "true" }), _jsx("span", { className: css.popTagSub, children: t('billing.popSubLead') }), _jsx("span", { className: css.popModelName, children: vendorStatus.sub.name }), _jsx("span", { className: clsx(css.popModelStatus, vendorStatus.sub.low && css.popModelStatusLow), children: vendorStatus.sub.text })] }))] }))
                                    : (_jsxs("span", { className: css.popModelRow, children: [_jsx("span", { className: clsx(css.popDot, css.popDotNeutral), "aria-hidden": "true" }), _jsx("span", { className: css.popModelStatus, children: t('billing.popNoConsumption') })] }))] })] })) })] }));
}
/**
 * The centered billing dashboard modal.
 * @param props - stats, locale function, close handler, model health, balances, renderSlot.
 */
/** 余额详情弹窗：点击「约可撑 N 天」圆圈后展示余额构成与可用天数估算。 */
function BalanceDetailPopover({ balance, days, dailyBurn, money, t, onClose, }) {
    // 金额按余额原生币种显示（USD 直接美元；其余经 money 折成用户展示币种）。
    const fmt = (value) => value === undefined ? undefined : (balance.currency === 'USD' ? `$${value.toFixed(2)}` : money(value));
    const total = fmt(balance.totalBalance);
    const granted = fmt(balance.grantedBalance);
    const topped = fmt(balance.toppedUpBalance);
    return (_jsxs("span", { className: css.balanceDetailPop, "data-testid": "billing-balance-detail-pop", children: [_jsxs("span", { className: css.balanceDetailHead, children: [_jsx("span", { className: css.balanceDetailTitle, children: balance.displayName }), _jsx("button", { type: "button", className: css.balanceDetailClose, "aria-label": t('billing.close'), onClick: onClose, children: "\u00D7" })] }), _jsxs("span", { className: css.balanceDetailGrid, children: [total !== undefined && _jsx(BalanceDetailRow, { label: t('billing.balance'), value: total }), granted !== undefined && _jsx(BalanceDetailRow, { label: t('billing.balanceGranted'), value: granted }), topped !== undefined && _jsx(BalanceDetailRow, { label: t('billing.balanceTopped'), value: topped }), _jsx(BalanceDetailRow, { label: t('billing.balanceDaily'), value: money(dailyBurn) }), _jsx(BalanceDetailRow, { label: t('billing.balanceDaysLong'), value: `${days} ${t('billing.balanceDaysUnit')}` })] })] }));
}
/** 余额详情弹窗里的一行 label / value。 */
function BalanceDetailRow({ label, value }) {
    return (_jsxs("span", { className: css.balanceDetailRow, children: [_jsx("span", { className: css.balanceDetailLabel, children: label }), _jsx("span", { className: css.balanceDetailValue, children: value })] }));
}
function BillingDashboard({ stats, t, onClose, health, balances, reconcile, quotas, relayQuotas, currency, onCurrency, turns, renderSlot, budgetEnabled, budgetAmount, onToggleBudget, onBudgetAmount, peakConfig, onPeakConfig, onPreviewPeak, floatPrefs, onFloatPrefs, quotasStale, }) {
    // 趋势图指标：费用（堆叠/默认）或 Token（单色总量）。
    const [trendMetric, setTrendMetric] = useState('cost');
    const { total, byModel, byDay } = stats;
    // 分区 Tab：默认概览；各区块已进入二级 Tab，全部默认展开（无折叠交互）。
    const [tab, setTab] = useState('overview');
    // 趋势窗口：7 天 / 30 天切换（30 天窗口数据不足时按日补零）。
    const [trendDays, setTrendDays] = useState(7);
    // 对账偏差忽略：用户可能同时在其它 agent / 直接接入 API 里消耗官方余额，此时 drift
    // 属正常。点击「忽略今天」后当天不再显示（localStorage 持久化，仅客户端侧）。
    const [reconcileDismissedDay, setReconcileDismissedDay] = useState(() => {
        try {
            return window.localStorage.getItem('dsh-billing:reconcile-dismissed') ?? '';
        }
        catch {
            return '';
        }
    });
    const dayStampLocal = () => {
        const d = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };
    const dismissReconcile = useCallback(() => {
        const day = dayStampLocal();
        setReconcileDismissedDay(day);
        try {
            window.localStorage.setItem('dsh-billing:reconcile-dismissed', day);
        }
        catch { /* 写入失败可忽略 */ }
    }, []);
    // 概览用量热力图范围：月（日历月）/ 年（GitHub 风格年度贡献图，含月份与周几标注）。
    const [heatmapRange, setHeatmapRange] = useState('month');
    // 浮窗「指定订阅卡」的可选目标：只列已接入（查询成功且有额度数据）的订阅，
    // 避免内置 alias 造成的同名重复与未接入项。
    const subscriptionOptions = useMemo(() => quotas
        .filter(quota => quota.status === 'ok' && quota.windows.length > 0)
        .map(quota => ({ id: quota.provider, label: quota.displayName })), [quotas]);
    // 余额详情弹窗：记录打开的厂商（按 provider 标识）；点击「约可撑 N 天」圆圈切换。
    const [balanceDetailFor, setBalanceDetailFor] = useState();
    // 项目下钻：记录当前展开的项目名；点击项目行切换展开/收起。
    const [expandedProject, setExpandedProject] = useState();
    // usage_stats 工具开关：经插件自带的 HTTP 接口读写（不依赖宿主浏览器设置白名单）。
    // 挂载时读一次当前值；点按乐观切换并回写，写失败回滚。工具注入是启动期决策，重启生效。
    const [usageStatsEnabled, setUsageStatsEnabled] = useState(DEFAULT_ENABLE_USAGE_STATS_TOOL);
    useEffect(() => {
        let mounted = true;
        void loadUsageTool().then((enabled) => {
            if (mounted && enabled !== undefined)
                setUsageStatsEnabled(enabled);
        });
        return () => { mounted = false; };
    }, []);
    const toggleUsageStats = useCallback(() => {
        const next = !usageStatsEnabled;
        setUsageStatsEnabled(next);
        void saveUsageTool(next).then((ok) => {
            if (!ok)
                setUsageStatsEnabled(!next);
        });
    }, [usageStatsEnabled]);
    // 当前汇率与来源：供单价表标题展示（实时 / 内置）。
    const rateInfo = getRateInfo();
    // 显示币种换算：usd 时把 CNY 金额按当前汇率换算显示。
    const money = (cny) => formatMoney(currency === 'usd' ? cnyToUsd(cny) : cny, currency);
    // 界面语言跟随币种：USD→英文，CNY→中文；厂商显示名据此本地化。
    const lang = currency === 'usd' ? 'en' : 'zh';
    const providerName = (name) => localizeProviderName(name, lang);
    // 费率表单价：按用户所选币种换算后再格式化（原生币种 × 汇率）；0 价显示"免费"。
    // 切 USD 时把 ¥ 计价模型换算成 $，费率表不再固定显示人民币。
    const unitMoney = (price, native) => price === 0 ? t('billing.free') : formatUnitPrice(convertUnitPrice(price, native, currency, rateInfo.rate), currency === 'usd' ? 'USD' : 'CNY');
    // 每轮成本异常标记：按起始时间升序传给 flagAnomalies（最近的在末尾）。
    const roundFlags = useMemo(() => flagAnomalies([...turns].reverse()), [turns]);
    // 峰谷时段费用分摊：按每轮起始时刻精确判定（北京时间高峰 9-12 / 14-18）。
    const peakShare = useMemo(() => peakOffpeakCost(turns), [turns]);
    // 费用构成（估算）：角色归因三段（用户输入 / 助手输出 / 工具结果）。
    const roleRows = useMemo(() => {
        const role = stats.byRole;
        if (role === undefined)
            return [];
        const total = role.user + role.assistant + role.tool;
        if (total <= 0)
            return [];
        return [
            { label: t('billing.roleUser'), value: role.user, seg: css.shareSegUser },
            { label: t('billing.roleAssistant'), value: role.assistant, seg: css.shareSegAssistant },
            { label: t('billing.roleTool'), value: role.tool, seg: css.shareSegTool },
        ].map(row => ({ ...row, pct: (row.value / total) * 100 }));
    }, [stats.byRole, t]);
    // A1: 日均消耗（最近 7 天）——余额列据此估算可用天数；无消耗记录时 0（不显示天数）。
    const dailyBurn = dailyBurnRate(byDay, localDayStamp());
    // 按提供方归一化匹配余额（deepseek ↔ DeepSeek）。
    const balanceFor = (provider) => balances.find(balance => normalizeProvider(balance.provider) === normalizeProvider(provider));
    // 订阅型厂商隐藏「余额」栏：该组模型全部走订阅且未配置按量余额时，只保留订阅额度，
    // 避免「1 套餐 + 余额未配置」的困惑（按量余额与订阅是两套独立计费）。
    const hideBalanceForGroup = (group) => group.balance?.error === 'unconfigured'
        && group.models.length > 0
        && group.models.every(model => model.plan);
    // 余额列单元格：按查询状态渲染金额或占位文案；余额有效且日均消耗可估时
    // 附「约可撑 N 天」圆形徽标（A1），点击弹出余额详情；剩余不足 3 天时红色强调。
    const renderBalance = (balance) => {
        if (balance === undefined)
            return _jsx("span", { className: css.na, children: "\u2014" });
        if (balance.error === 'unconfigured')
            return t('billing.balanceUnconfigured');
        if (balance.error === 'unauthorized')
            return t('billing.balanceUnauthorized');
        if (balance.error === 'unreachable')
            return t('billing.balanceUnreachable');
        if (balance.totalBalance === undefined)
            return _jsx("span", { className: css.na, children: "\u2014" });
        const amount = balance.currency === 'USD'
            ? `$${balance.totalBalance.toFixed(2)}`
            : money(balance.totalBalance);
        // USD 余额按当前汇率折成人民币，与日均消耗（元）同口径。
        const balanceCny = balance.currency === 'USD' ? balance.totalBalance * rateInfo.rate : balance.totalBalance;
        const days = dailyBurn > 0 ? Math.floor(balanceCny / dailyBurn) : undefined;
        return (_jsxs("span", { className: css.balanceCell, children: [_jsx("span", { children: amount }), days !== undefined && days >= 0 && (_jsx("button", { type: "button", className: clsx(css.balanceDaysBadge, days <= 3 && css.balanceDaysBadgeLow), "data-testid": "billing-balance-days-badge", title: t('billing.balanceDays').replace('{days}', String(days)), "aria-label": `${balance.displayName} ${t('billing.balanceDays').replace('{days}', String(days))}`, onClick: () => { setBalanceDetailFor(balanceDetailFor === balance.provider ? undefined : balance.provider); }, children: "?" })), balanceDetailFor === balance.provider && (_jsx(BalanceDetailPopover, { balance: balance, days: days ?? 0, dailyBurn: dailyBurn, money: money, t: t, onClose: () => { setBalanceDetailFor(undefined); } }))] }));
    };
    const cacheHitRate = total.cacheHit + total.cacheMiss > 0
        ? (total.cacheHit / (total.cacheHit + total.cacheMiss)) * 100
        : 0;
    // Latest date from the day series (real data when served, demo otherwise).
    const dates = Object.keys(byDay).sort();
    const today = localDayStamp();
    const todayCost = byDay[today]?.cost ?? 0;
    // 当年 / 当月 / 当日 三维：按 byDay 的日期前缀归并（无需额外数据）。
    const monthPrefix = today.slice(0, 7);
    const yearPrefix = today.slice(0, 4);
    const monthCost = dates.reduce((sum, d) => sum + (d.startsWith(monthPrefix) ? (byDay[d]?.cost ?? 0) : 0), 0);
    const yearCost = dates.reduce((sum, d) => sum + (d.startsWith(yearPrefix) ? (byDay[d]?.cost ?? 0) : 0), 0);
    // 本月预计总花费（forecast）：按本月已有记录的平均日消耗 × 本月天数外推的
    // 按量部分 + 各订阅套餐（code 计划）的月度订阅费（dsh-spend 双口径：订阅制
    // 按订阅费计入，按量按 token 估算）。无任何按量记录且无订阅费时为 0。
    const monthCostProjected = useMemo(() => {
        const usageProjected = projectMonthCost(byDay, monthPrefix, today);
        const subscription = quotas.reduce((sum, quota) => sum + (quota.planType === 'code' ? (quota.subscriptionAmount ?? 0) : 0), 0);
        return usageProjected + subscription;
    }, [byDay, monthPrefix, today, quotas]);
    // Hero 环形仪表盘：预算启用且有金额时显示「本月已用占预算」；否则回退为
    // 「本月占本年累计」的装饰占比（始终有内容，视觉上是一个完整的仪表盘）。
    const heroGauge = useMemo(() => {
        const budgetPct = budgetEnabled && budgetAmount > 0 ? (monthCost / budgetAmount) * 100 : NaN;
        const pct = Number.isFinite(budgetPct)
            ? Math.max(0, Math.min(100, budgetPct))
            : yearCost > 0 ? Math.max(0, Math.min(100, (monthCost / yearCost) * 100)) : 0;
        return {
            pct,
            // 超支（>=100% 或用预算口径）时环形转红。
            over: Number.isFinite(budgetPct) && budgetPct >= 100,
            // 有预算时中心标签显示「预算」，否则显示「本月」（注释与实现一致）。
            label: Number.isFinite(budgetPct) ? t('billing.budget') : t('billing.monthCost'),
        };
    }, [budgetEnabled, budgetAmount, monthCost, yearCost, t]);
    // Hero 底部预算进度条：与环形仪表盘同口径（预算启用且 >0），仅在启用预算时展示。
    const heroBudgetPct = budgetEnabled && budgetAmount > 0 ? (monthCost / budgetAmount) * 100 : 0;
    // 最近 N 天窗口（含今天）：缺失的日期补零，图表固定为整段区间。
    const trendDates = useMemo(() => {
        const out = [];
        for (let offset = trendDays - 1; offset >= 0; offset -= 1) {
            const day = new Date();
            day.setDate(day.getDate() - offset);
            out.push(localDayStamp(day.getTime()));
        }
        return out;
    }, [trendDays]);
    const latestDate = trendDates.at(-1) ?? today;
    // 热力图输入：按日费用（YYYY-MM-DD → 金额）。
    const heatmapDays = useMemo(() => Object.entries(byDay).map(([date, day]) => ({ date, value: day.cost })), [byDay]);
    // 活跃天数（有调用记录的天数）与连续使用天数（从今天往前连续的活跃日）。
    const activeDays = activeDaysOf(byDay);
    const streakDays = streakDaysOf(byDay);
    // Trend series for the SVG chart: each day's total plus its per-model cost
    // breakdown (byDayModels feeds the stacked columns; absent → single-color).
    const trend = useMemo(() => trendDates.map((date) => {
        const byModel = {};
        const dayModels = stats.byDayModels?.[date];
        if (dayModels !== undefined) {
            for (const [key, data] of Object.entries(dayModels)) {
                if (data.cost > 0)
                    byModel[key] = data.cost;
            }
        }
        const day = byDay[date];
        return {
            date,
            cost: day?.cost ?? 0,
            calls: day?.calls ?? 0,
            byModel,
            tokens: day === undefined ? 0 : day.input + day.output + day.cacheHit + day.cacheMiss,
        };
    }), [trendDates, byDay, stats.byDayModels]);
    // Model rows: estimated cost from the pricing catalog, actual from stats.
    // 先按费用排序，再按序分配高区分度图表色：品牌色系太接近，无法区分模型。
    const modelRows = useMemo(() => Object.entries(byModel)
        .filter(([, data]) => data.calls > 0)
        .map(([key, data]) => {
        const entry = modelOf(key);
        // 目录未收录（key 落回「其他」）时：展示真实 model id 而非占位名，
        // 并尝试从 id 反推提供方（B5），否则健康点永远点不亮。
        const uncatalogued = entry.key === 'other';
        const inferredProvider = uncatalogued ? providerFromModelKey(key) : undefined;
        const buckets = {
            input: data.input,
            cacheHit: data.cacheHit,
            cacheMiss: data.cacheMiss,
            output: data.output,
        };
        return {
            key,
            name: uncatalogued ? key : entry.name,
            provider: inferredProvider ?? entry.provider,
            calls: data.calls,
            input: data.input,
            output: data.output,
            cacheHitRate: data.cacheHit + data.cacheMiss > 0
                ? (data.cacheHit / (data.cacheHit + data.cacheMiss)) * 100
                : 0,
            estimated: computeCost(entry, buckets),
            // 订阅标记来自服务端统计：只有该模型全部调用都走订阅通道才置位
            //（同一模型按量/订阅混合通道时显示实际金额，不误标「订阅包含」）。
            plan: data.plan === true,
            // exactOptionalPropertyTypes: absent actual when the stats carry none.
            ...(data.cost > 0 ? { actual: data.cost } : {}),
            uncatalogued,
            // 目录单价为估算价（未公布官方按量价）：行内标注，避免误当正式定价。
            estimatedPricing: entry.estimated === true,
            officialCalls: data.officialCalls ?? 0,
            officialCost: data.officialCost ?? 0,
        };
    })
        .sort((a, b) => (b.actual ?? b.estimated) - (a.actual ?? a.estimated))
        .map((row, index) => ({
        ...row,
        color: CHART_PALETTE[index % CHART_PALETTE.length] ?? '#8b95a3',
    })), [byModel]);
    // 官方 vs 三方汇总：官方 = DeepSeek 官方直连（officialCost/officialCalls），
    // 三方 = 总量 - 官方。仅当任一模型实际发生官方/三方费用时展示。
    const bucketSummary = useMemo(() => {
        let officialCost = 0;
        let officialCalls = 0;
        let thirdCalls = 0;
        for (const row of modelRows) {
            const official = row.officialCost;
            if (official > 0)
                officialCost += official;
            officialCalls += row.officialCalls;
            thirdCalls += Math.max(0, row.calls - row.officialCalls);
        }
        const thirdCost = Math.max(0, (modelRows.reduce((sum, r) => sum + (r.actual ?? 0), 0)) - officialCost);
        if (officialCost <= 0 && thirdCost <= 0 && officialCalls <= 0 && thirdCalls <= 0)
            return undefined;
        return { officialCost, officialCalls, thirdCost, thirdCalls };
    }, [modelRows]);
    // 按厂商聚合：模型用量与订阅额度都归并到同一厂商组，余额只在厂商头部显示一次。
    // 厂商组同时容纳非订阅按量模型（无订阅额度也成组）与订阅套餐（无用量也成组）。
    const providerGroups = useMemo(() => {
        const subscriptionsByVendor = new Map();
        for (const quota of quotas) {
            if (quota.status === 'not-configured')
                continue;
            const vendor = subscriptionVendorOf(quota.provider);
            const list = subscriptionsByVendor.get(vendor);
            if (list === undefined)
                subscriptionsByVendor.set(vendor, [quota]);
            else
                list.push(quota);
        }
        const modelsByVendor = new Map();
        // 订阅 vendor 的归一化索引：normalize(vendor名) → vendor名。用于让模型 provider 名
        // 与订阅 vendor 名在大小写/空格/连字符差异时也能归到同一组。
        const vendorByNorm = new Map();
        for (const vendor of subscriptionsByVendor.keys())
            vendorByNorm.set(normalizeProvider(vendor), vendor);
        for (const row of modelRows) {
            // 厂商组 key：优先取「与某订阅 vendor 归一化匹配」的名字；订阅豁免模型（plan=true）
            // 即使 catalog 未收录（provider 反推为 Custom），也用模型 id 反推的厂商名归组，
            // 让订阅卡与模型明细落在同一厂商组，避免被甩到 Custom 独立组。
            let vendorName = row.provider;
            if (row.plan === true) {
                const inferred = providerFromModelKey(row.key);
                if (inferred !== undefined)
                    vendorName = inferred;
            }
            const key = vendorByNorm.get(normalizeProvider(vendorName)) ?? vendorName;
            const list = modelsByVendor.get(key);
            if (list === undefined)
                modelsByVendor.set(key, [row]);
            else
                list.push(row);
        }
        const names = new Set([...modelsByVendor.keys(), ...subscriptionsByVendor.keys()]);
        const groups = [...names]
            .map(name => ({
            name,
            models: modelsByVendor.get(name) ?? [],
            subscriptions: subscriptionsByVendor.get(name) ?? [],
            balance: balanceFor(name),
            dot: providerDot(health, name),
        }));
        // 纯余额组：自定义 Provider（custom: 前缀）或无对应模型/订阅的余额行，
        // 以独立厂商组呈现（内置厂商的「未配置」行不补组，避免噪音）。
        const claimed = new Set(groups.map(group => normalizeProvider(group.name)));
        for (const balance of balances) {
            if (claimed.has(normalizeProvider(balance.provider)))
                continue;
            if (balance.error === undefined || balance.provider.startsWith('custom:')) {
                groups.push({
                    name: balance.displayName,
                    models: [],
                    subscriptions: [],
                    balance,
                    dot: providerDot(health, balance.displayName),
                });
            }
        }
        return groups
            .sort((a, b) => {
            const costOf = (group) => group.models.reduce((sum, m) => sum + (m.actual ?? m.estimated), 0);
            const diff = costOf(b) - costOf(a);
            if (diff !== 0)
                return diff;
            // 有模型用量的组排在纯订阅组之前；同为纯订阅组保持原顺序（排序稳定）。
            if (a.models.length === 0 && b.models.length === 0)
                return 0;
            if (b.models.length === 0)
                return -1;
            if (a.models.length === 0)
                return 1;
            return a.name.localeCompare(b.name, 'zh');
        });
    }, [modelRows, quotas, balances, health]);
    // Total: real stats value when present, otherwise the estimated sum.
    const estimatedTotal = modelRows.reduce((sum, row) => sum + row.estimated, 0);
    const displayTotal = total.cost > 0 ? total.cost : estimatedTotal;
    const avgPerCall = total.calls > 0 ? displayTotal / total.calls : 0;
    // Trend-chart legend: model rows sort by cost desc, so the stack bottoms
    // with the most expensive model (visually stable baseline).
    const chartModels = useMemo(() => modelRows.map(row => ({ key: row.key, name: row.name, color: row.color })), [modelRows]);
    // Range summary for the hero delta.
    const prevDayCost = trend.length >= 2 ? (trend.at(-2)?.cost ?? 0) : 0;
    const deltaPct = prevDayCost > 0 ? ((todayCost - prevDayCost) / prevDayCost) * 100 : 0;
    return (_jsx(Modal, { open: true, onClose: onClose, title: t('billing.title'), headless: true, className: clsx(css.dashboardModal, 'dsh-billing-modal'), children: _jsxs("div", { className: css.dashboard, "data-testid": "billing-dashboard", children: [_jsxs("div", { className: css.dashboardHead, "data-testid": "billing-dashboard-head", children: [_jsxs("div", { children: [renderSlot('billing.dashboard.decor', { position: 'head' }), _jsxs("div", { className: css.headTitleRow, children: [_jsx("h2", { className: css.dashboardTitle, children: t('billing.title') }), renderSlot('billing.dashboard.decor', { position: 'headTitle' })] }), _jsxs("p", { className: css.dashboardSubtitle, children: [t('billing.lastUpdated'), " ", latestDate, stats.timezone === undefined ? null : ` · ${stats.timezone.name} (${stats.timezone.offset})`] })] }), _jsxs("div", { className: css.dashboardRight, children: [_jsx("span", { className: css.currencyToggle, role: "group", "aria-label": t('billing.currency'), children: ['cny', 'usd'].map(unit => (_jsx("button", { type: "button", className: clsx(css.currencyButton, currency === unit && css.currencyButtonActive), "aria-pressed": currency === unit, "data-testid": `billing-currency-${unit}`, title: unit === 'cny' ? t('billing.currencyCny') : t('billing.currencyUsd'), onClick: () => { onCurrency(unit); }, children: unit === 'cny' ? '¥ CNY' : '$ USD' }, unit))) }), health.checked && (_jsxs("span", { className: clsx(css.healthBadge, health.available ? css.healthBadgeOk : css.healthBadgeBad), children: [_jsx("span", { className: clsx(css.healthDot, health.available ? css.healthOk : css.healthBad), "aria-hidden": "true" }), health.available
                                            ? `${health.models} 模型可用${health.failures > 0 ? ` · ${health.failures} 厂商失效` : ''}`
                                            : `${health.failures} 厂商不可用`] })), _jsx("button", { type: "button", className: css.closeButton, "aria-label": t('billing.close'), "data-testid": "billing-close", onClick: onClose, children: _jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "aria-hidden": "true", children: [_jsx("path", { d: "M18 6 6 18" }), _jsx("path", { d: "m6 6 12 12" })] }) })] })] }), _jsx("nav", { className: css.tabNav, "data-testid": "billing-tab-nav", role: "tablist", "aria-label": t('billing.title'), children: DASHBOARD_TABS.map(item => (_jsx("button", { type: "button", role: "tab", "aria-selected": tab === item.id, className: clsx(css.tabButton, tab === item.id && css.tabButtonActive), "data-testid": `billing-tab-${item.id}`, onClick: () => { setTab(item.id); }, children: t(item.labelKey) }, item.id))) }), _jsxs("div", { className: css.dashboardBody, children: [tab === 'overview' && (_jsxs("div", { className: css.tabPanel, "data-testid": "billing-tab-panel-overview", children: [reconcile?.kind === 'drift' && reconcile.spent !== undefined && reconcileDismissedDay !== dayStampLocal() && (_jsxs("div", { className: css.reconcileNotice, "data-testid": "billing-reconcile-notice", role: "note", children: [_jsx("span", { className: css.reconcileIcon, "aria-hidden": "true", children: _jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "9" }), _jsx("line", { x1: "12", y1: "10", x2: "12", y2: "16" }), _jsx("line", { x1: "12", y1: "7.5", x2: "12.01", y2: "7.5" })] }) }), _jsx("span", { className: css.reconcileText, children: t('billing.reconcileDrift')
                                                .replace('{provider}', reconcile.provider ?? '')
                                                .replace('{spent}', money(reconcile.spent))
                                                .replace('{today}', money(reconcile.todayOfficialCost ?? 0)) }), _jsx("button", { type: "button", className: css.reconcileDismiss, "data-testid": "billing-reconcile-dismiss", onClick: dismissReconcile, children: t('billing.reconcileDismiss') })] })), _jsxs("section", { className: css.hero, "data-testid": "billing-hero", children: [renderSlot('billing.dashboard.decor', { position: 'hero' }), _jsxs("div", { className: css.heroTop, children: [_jsxs("div", { className: css.heroMain, children: [_jsx("span", { className: css.heroLabel, children: t('billing.monthCost') }), _jsxs("div", { className: css.heroReadout, children: [_jsx("span", { className: css.heroCurrency, "aria-hidden": "true", children: currency === 'usd' ? '$' : '¥' }), _jsx("span", { className: css.heroValue, children: money(monthCost).slice(1) })] }), _jsxs("span", { className: css.heroMeta, children: [total.calls.toLocaleString(), " ", t('billing.calls')] })] }), _jsxs("div", { className: css.heroGauge, "data-testid": "billing-hero-gauge", children: [_jsxs("svg", { className: css.heroGaugeSvg, viewBox: "0 0 120 120", "aria-hidden": "true", children: [_jsx("circle", { className: css.heroGaugeTrack, cx: "60", cy: "60", r: "52" }), _jsx("circle", { className: clsx(css.heroGaugeArc, heroGauge.over && css.heroGaugeArcOver), cx: "60", cy: "60", r: "52", style: { strokeDasharray: `${(heroGauge.pct / 100) * 326.7} 326.7` } })] }), _jsxs("span", { className: css.heroGaugeCenter, children: [_jsxs("span", { className: clsx(css.heroGaugePct, heroGauge.over && css.heroGaugePctOver), children: [heroGauge.pct.toFixed(0), "%"] }), _jsx("span", { className: css.heroGaugeLabel, children: heroGauge.label })] })] })] }), budgetEnabled && budgetAmount > 0 && (_jsxs("div", { className: css.heroBudget, "data-testid": "billing-hero-budget", children: [_jsx("span", { className: css.heroBudgetLabel, children: t('billing.budget') }), _jsx("div", { className: css.heroBudgetTrack, role: "progressbar", "aria-valuenow": Math.min(heroBudgetPct, 100), "aria-valuemin": 0, "aria-valuemax": 100, "aria-label": t('billing.budget'), children: _jsx("div", { className: clsx(css.heroBudgetFill, heroBudgetPct >= 100 && css.heroBudgetFillOver), style: { width: `${Math.min(heroBudgetPct, 100)}%` } }) }), _jsxs("span", { className: css.heroBudgetValue, children: [money(monthCost), " / ", money(budgetAmount), " \u00B7 ", heroBudgetPct.toFixed(1), "%"] })] })), _jsxs("div", { className: css.heroSide, children: [_jsxs("div", { className: css.heroSideItem, children: [_jsx("span", { className: css.heroSideLabel, children: t('billing.yearCost') }), _jsx("span", { className: css.heroSideValue, children: money(yearCost) })] }), _jsxs("div", { className: css.heroSideItem, children: [_jsx("span", { className: css.heroSideLabel, children: t('billing.todayCost') }), _jsxs("span", { className: css.heroSideValue, children: [money(todayCost), _jsxs("span", { className: clsx(css.delta, deltaPct >= 0 ? css.deltaUp : css.deltaDown), children: [deltaPct >= 0 ? '▲' : '▼', " ", Math.abs(deltaPct).toFixed(1), "%"] })] })] }), monthCostProjected > 0 && (_jsxs("div", { className: css.heroSideItem, children: [_jsx("span", { className: css.heroSideLabel, children: t('billing.monthProjected') }), _jsx("span", { className: css.heroSideValue, children: money(monthCostProjected) })] })), monthCostProjected <= 0 && _jsx("span", { className: css.heroSideSpacer, "aria-hidden": "true" })] })] }), (stats.unpricedModels?.length ?? 0) > 0 && (_jsx("div", { className: css.unpricedHint, "data-testid": "billing-unpriced-hint", children: t('billing.unpricedHint').replace('{count}', String(stats.unpricedModels?.length ?? 0)) })), _jsxs("section", { className: css.kpiGrid, "data-testid": "billing-kpi-grid", children: [_jsxs("div", { className: css.kpiTile, "data-testid": "billing-kpi-tile", children: [_jsx("span", { className: css.kpiLabel, children: t('billing.cacheHitRate') }), _jsx("span", { className: clsx(css.kpiValue, css.kpiGreen), children: formatPercent(cacheHitRate) }), _jsxs("span", { className: css.kpiDetail, children: [formatTokens(total.cacheHit), " / ", formatTokens(total.cacheHit + total.cacheMiss)] })] }), _jsxs("div", { className: css.kpiTile, children: [_jsx("span", { className: css.kpiLabel, children: t('billing.tokens') }), _jsx("span", { className: css.kpiValue, children: formatTokens(total.input + total.output) }), _jsxs("span", { className: css.kpiDetail, children: [t('billing.inputTokens'), " ", formatTokens(total.input), " \u00B7 ", t('billing.outputTokens'), " ", formatTokens(total.output)] })] }), _jsxs("div", { className: css.kpiTile, children: [_jsx("span", { className: css.kpiLabel, children: t('billing.avgCost') }), _jsx("span", { className: css.kpiValue, children: money(avgPerCall) }), _jsxs("span", { className: css.kpiDetail, children: [t('billing.calls'), " ", total.calls.toLocaleString()] })] }), _jsxs("div", { className: css.kpiTile, children: [_jsx("span", { className: css.kpiLabel, children: t('billing.calls') }), _jsx("span", { className: css.kpiValue, children: total.calls.toLocaleString() }), _jsxs("span", { className: css.kpiDetail, children: [modelRows.length, " ", t('billing.models')] })] })] }), _jsxs("section", { className: css.panel, "data-testid": "billing-panel-heatmap", children: [_jsxs("div", { className: css.panelHead, children: [_jsx("h3", { className: css.panelTitle, children: t('billing.heatmap') }), _jsx("div", { className: css.heatmapRangeSwitch, "data-testid": "billing-heatmap-range", role: "group", "aria-label": t('billing.heatmap'), children: ['month', 'year'].map(r => (_jsx("button", { type: "button", className: clsx(css.heatmapRangeButton, heatmapRange === r && css.heatmapRangeButtonActive), "data-testid": `billing-heatmap-range-${r}`, "aria-pressed": heatmapRange === r, onClick: () => { setHeatmapRange(r); }, children: r === 'month' ? t('billing.heatmapMonth') : t('billing.heatmapYear') }, r))) }), _jsxs("span", { className: css.panelHint, "data-testid": "billing-heatmap-summary", children: [t('billing.activeDays'), " ", activeDays, " \u00B7 ", t('billing.streakDays'), " ", streakDays] })] }), _jsx(UsageHeatmap, { days: heatmapDays, currency: currency, t: t, range: heatmapRange })] })] })), tab === 'settings' && (_jsxs("div", { className: css.tabPanel, "data-testid": "billing-tab-panel-settings", children: [_jsxs("section", { className: css.setCard, "data-testid": "billing-budget", children: [_jsxs("div", { className: css.setCardHead, children: [_jsxs("div", { className: css.setCardMeta, children: [_jsx("h3", { className: css.setCardTitle, children: t('billing.budget') }), _jsx("p", { className: css.setCardDesc, children: t('billing.budgetHint') })] }), _jsx("button", { type: "button", role: "switch", "aria-checked": budgetEnabled, "aria-label": t('billing.budget'), "data-testid": "billing-budget-toggle", className: clsx(css.switch, budgetEnabled && css.switchOn), onClick: onToggleBudget, children: _jsx("span", { className: css.switchKnob }) })] }), budgetEnabled && (_jsxs("div", { className: css.ctlCol, children: [_jsxs("div", { className: css.ctlRow, children: [_jsx("span", { className: css.ctlLabel, children: t('billing.budgetAmount') }), _jsxs("span", { className: css.inp, "data-testid": "billing-budget-input-wrap", children: [_jsx("span", { className: css.affix, "aria-hidden": "true", children: "\u00A5" }), _jsx("input", { className: css.budgetInput, "data-testid": "billing-budget-input", type: "number", min: 0, step: 1, value: budgetAmount === 0 ? '' : budgetAmount, placeholder: stats.budget !== undefined ? String(stats.budget) : '0', "aria-label": `${t('billing.budget')}（${currency === 'usd' ? 'USD' : 'CNY'}）`, title: `${t('billing.budget')}（${currency === 'usd' ? 'USD' : 'CNY'}）`, onChange: (e) => { onBudgetAmount(e.target.valueAsNumber); } })] })] }), budgetAmount > 0 && (() => {
                                                    const pct = (monthCost / budgetAmount) * 100;
                                                    return (_jsx("div", { className: css.ctlRowStretch, children: _jsx("div", { className: css.prog, role: "progressbar", "aria-valuenow": Math.min(pct, 100), "aria-valuemin": 0, "aria-valuemax": 100, "aria-label": t('billing.budget'), "data-testid": "billing-budget-track", children: _jsx("div", { className: clsx(css.progFill, pct >= 100 && css.budgetFillOver, pct >= 80 && pct < 100 && css.budgetFillWarn), style: { width: `${Math.min(pct, 100)}%` } }) }) }));
                                                })(), budgetAmount > 0 && (_jsx("p", { className: css.setCardDesc, "data-testid": "billing-budget-value", children: t('billing.budgetSummary').replace('{used}', money(monthCost)).replace('{total}', money(budgetAmount)) }))] }))] }), _jsxs("section", { className: css.setCard, "data-testid": "billing-peak-alert-settings", children: [_jsxs("div", { className: css.setCardHead, children: [_jsxs("div", { className: css.setCardMeta, children: [_jsx("h3", { className: css.setCardTitle, children: t('billing.peakAlert') }), _jsx("p", { className: css.setCardDesc, children: t('billing.peakAlertHint') })] }), _jsx("button", { type: "button", role: "switch", "aria-checked": peakConfig.enabled, "aria-label": t('billing.peakAlert'), "data-testid": "billing-peak-alert-toggle", className: clsx(css.switch, peakConfig.enabled && css.switchOn), onClick: () => { onPeakConfig({ ...peakConfig, enabled: !peakConfig.enabled }); }, children: _jsx("span", { className: css.switchKnob }) })] }), peakConfig.enabled && (_jsxs("div", { className: css.ctlCol, children: [_jsxs("label", { className: css.ctlRow, children: [_jsx("span", { className: css.ctlLabel, children: t('billing.peakAlertLeadMin') }), _jsx("span", { className: css.inp, children: _jsx("input", { type: "number", min: 1, max: 30, step: 1, value: peakConfig.leadMin, className: css.budgetInput, "aria-label": t('billing.peakAlertLeadMin'), onChange: (e) => {
                                                                    const v = Number(e.target.valueAsNumber);
                                                                    onPeakConfig({
                                                                        ...peakConfig,
                                                                        leadMin: Number.isFinite(v) ? Math.min(30, Math.max(1, Math.round(v))) : peakConfig.leadMin,
                                                                    });
                                                                } }) })] }), _jsxs("div", { className: css.ctlRow, children: [_jsx("span", { className: css.ctlLabel, children: t('billing.peakAlertPos') }), _jsx("div", { className: css.ctlGroup, role: "radiogroup", "aria-label": t('billing.peakAlertPos'), children: ['bottom-right', 'center'].map(pos => (_jsxs("label", { className: css.rdo, children: [_jsx("input", { type: "radio", name: "peak-pos", checked: peakConfig.position === pos, onChange: () => onPeakConfig({ ...peakConfig, position: pos }) }), _jsx("span", { className: css.rdoDot, "aria-hidden": "true" }), pos === 'bottom-right' ? t('billing.peakAlertPosCorner') : t('billing.peakAlertPosCenter')] }, pos))) })] }), _jsxs("div", { className: css.ctlRow, children: [_jsx("span", { className: css.ctlLabel, children: t('billing.peakAlertMode') }), _jsx("div", { className: css.ctlGroup, role: "radiogroup", "aria-label": t('billing.peakAlertMode'), children: ['both', 'peak', 'offPeak'].map(m => (_jsxs("label", { className: css.rdo, children: [_jsx("input", { type: "radio", name: "peak-mode", checked: peakConfig.mode === m, onChange: () => onPeakConfig({ ...peakConfig, mode: m }) }), _jsx("span", { className: css.rdoDot, "aria-hidden": "true" }), m === 'both' ? t('billing.peakAlertModeBoth') : m === 'peak' ? t('billing.peakAlertModePeak') : t('billing.peakAlertModeOff')] }, m))) })] }), _jsxs("label", { className: css.ctlRow, children: [_jsx("span", { className: css.ctlLabel, children: t('billing.peakAlertWebNotify') }), _jsx("input", { type: "checkbox", checked: peakConfig.webNotify, "aria-label": t('billing.peakAlertWebNotify'), onChange: (e) => { onPeakConfig({ ...peakConfig, webNotify: e.target.checked }); } })] }), _jsx("div", { className: css.ctlRow, children: _jsx("button", { type: "button", className: css.btn, onClick: onPreviewPeak, children: t('billing.peakAlertPreview') }) })] }))] }), _jsx("section", { className: css.setCard, "data-testid": "billing-usage-stats-tool-setting", children: _jsxs("div", { className: css.setCardHead, children: [_jsxs("div", { className: css.setCardMeta, children: [_jsx("h3", { className: css.setCardTitle, children: t('billing.usageStatsTool') }), _jsx("p", { className: css.setCardDesc, children: t('billing.usageStatsToolHint') })] }), _jsx("button", { type: "button", role: "switch", "aria-checked": usageStatsEnabled, "aria-label": t('billing.usageStatsTool'), "data-testid": "billing-usage-stats-tool-toggle", className: clsx(css.switch, usageStatsEnabled && css.switchOn), onClick: toggleUsageStats, children: _jsx("span", { className: css.switchKnob }) })] }) }), _jsxs("section", { className: css.setCard, "data-testid": "billing-float-setting", children: [_jsx("div", { className: css.setCardHead, children: _jsxs("div", { className: css.setCardMeta, children: [_jsx("h3", { className: css.setCardTitle, children: t('billing.floatWindow') }), _jsx("p", { className: css.setCardDesc, children: t('billing.floatWindowHint') })] }) }), _jsxs("div", { className: css.ctlCol, children: [_jsxs("div", { className: css.ctlRow, children: [_jsx("span", { className: css.ctlLabel, children: t('billing.floatMode') }), _jsxs("div", { className: css.ctlGroup, "data-testid": "billing-float-mode", children: [_jsx("button", { type: "button", className: clsx(css.floatModeBtn, floatPrefs.mode === 'combined' && css.floatModeBtnOn), "data-testid": "billing-float-mode-combined", onClick: () => onFloatPrefs({ mode: 'combined', targets: floatPrefs.targets }), children: t('billing.floatModeCombined') }), _jsx("button", { type: "button", className: clsx(css.floatModeBtn, floatPrefs.mode === 'subscription' && css.floatModeBtnOn), "data-testid": "billing-float-mode-subscription", onClick: () => onFloatPrefs({ mode: 'subscription', targets: floatPrefs.targets }), children: t('billing.floatModeSubscription') })] })] }), floatPrefs.mode === 'subscription' && (_jsxs("div", { className: css.ctlRow, children: [_jsx("span", { className: css.ctlLabel, children: t('billing.floatTargets') }), _jsxs("span", { className: css.ctlGroup, "data-testid": "billing-float-targets", children: [subscriptionOptions.map((option) => {
                                                                    const on = floatPrefs.targets.includes(option.id);
                                                                    return (_jsxs("label", { className: css.floatTarget, children: [_jsx("input", { type: "checkbox", checked: on, "data-testid": `billing-float-target-${option.id}`, onChange: () => onFloatPrefs({
                                                                                    mode: 'subscription',
                                                                                    targets: on
                                                                                        ? floatPrefs.targets.filter(id => id !== option.id)
                                                                                        : [...floatPrefs.targets, option.id],
                                                                                }) }), _jsx("span", { className: css.floatTargetLabel, children: option.label })] }, option.id));
                                                                }), subscriptionOptions.length === 0 && (_jsx("span", { className: css.setCardDesc, children: t('billing.floatNoTargetsHint') }))] })] }))] })] }), _jsx(PluginInfoCard, { t: t, version: stats.pluginVersion })] })), tab === 'trends' && (_jsxs("div", { className: css.tabPanel, "data-testid": "billing-tab-panel-trends", children: [_jsxs("section", { className: clsx(css.ubCard, css.trendPanel), "data-testid": "billing-panel-trend", children: [_jsxs("div", { className: css.ubCardHead, children: [_jsx("h3", { className: css.ubCardTitle, children: t('billing.trend') }), renderSlot('billing.dashboard.decor', { position: 'trend' }), _jsxs("span", { className: css.ubCardControlGroup, children: [_jsx("span", { className: css.rangeToggle, role: "group", "aria-label": t('billing.trend'), children: [7, 30].map(days => (_jsx("button", { type: "button", className: clsx(css.rangeButton, trendDays === days && css.rangeButtonActive), "aria-pressed": trendDays === days, "data-testid": `billing-trend-${days}d`, onClick: () => { setTrendDays(days); }, children: days === 7 ? t('billing.trend7d') : t('billing.trend30d') }, days))) }), _jsx("span", { className: css.rangeToggle, role: "group", "aria-label": t('billing.trendMetric'), children: ['cost', 'tokens'].map(m => (_jsx("button", { type: "button", className: clsx(css.rangeButton, trendMetric === m && css.rangeButtonActive), "aria-pressed": trendMetric === m, "data-testid": `billing-trend-metric-${m}`, onClick: () => { setTrendMetric(m); }, children: m === 'cost' ? t('billing.trendMetricCost') : t('billing.trendMetricTokens') }, m))) })] }), _jsx("span", { className: css.ubCardSub, children: latestDate })] }), _jsx(TrendChart, { data: trend, models: chartModels, currency: currency, metric: trendMetric })] }), turns.length > 0 && (_jsxs("section", { className: css.ubCard, "data-testid": "billing-panel-rounds", children: [_jsxs("div", { className: css.ubCardHead, children: [_jsx("h3", { className: css.ubCardTitle, children: t('billing.rounds') }), roundFlags.length > 0 && (_jsxs("span", { className: css.ubTagError, "data-testid": "billing-rounds-flag-count", children: [roundFlags.length, " ", t('billing.anomaly')] }))] }), _jsx("p", { className: css.ubCardSub, children: t('billing.roundsHint').replace('{count}', String(turns.length)) }), _jsx(RoundCostChart, { rounds: turns, flags: roundFlags, currency: currency, t: t })] })), turns.length > 0 && (() => {
                                    const shareTotal = peakShare.peak + peakShare.offPeak;
                                    if (shareTotal <= 0)
                                        return null;
                                    const peakPct = (peakShare.peak / shareTotal) * 100;
                                    return (_jsxs("section", { className: css.ubCard, "data-testid": "billing-panel-share", children: [_jsxs("div", { className: css.ubCardHead, children: [_jsx("h3", { className: css.ubCardTitle, children: t('billing.peakShare') }), _jsx("span", { className: css.ubCardSub, children: t('billing.peakShareHint').replace('{count}', String(turns.length)) })] }), _jsxs("div", { className: css.shareTrack, "data-testid": "billing-share-track", children: [_jsx("div", { className: clsx(css.shareSeg, css.shareSegPeak), style: { width: `${peakPct}%` } }), _jsx("div", { className: clsx(css.shareSeg, css.shareSegOff), style: { width: `${100 - peakPct}%` } })] }), _jsxs("div", { className: css.shareLegend, children: [_jsxs("span", { className: css.shareItem, children: [_jsx("span", { className: css.shareDot, style: { background: 'var(--dsw-static-blue-500)' } }), t('billing.peak'), _jsxs("span", { className: css.shareValue, "data-testid": "billing-share-peak", children: [money(peakShare.peak), " \u00B7 ", peakPct.toFixed(1), "%"] })] }), _jsxs("span", { className: css.shareItem, children: [_jsx("span", { className: css.shareDot, style: { background: 'color-mix(in srgb, var(--dsw-static-blue-500) 30%, var(--dsw-alias-bg-module-platform))' } }), t('billing.offPeak'), _jsxs("span", { className: css.shareValue, "data-testid": "billing-share-offpeak", children: [money(peakShare.offPeak), " \u00B7 ", (100 - peakPct).toFixed(1), "%"] })] })] })] }));
                                })()] })), tab === 'providers' && (_jsxs("div", { className: css.tabPanel, "data-testid": "billing-tab-panel-providers", children: [stats.bySite !== undefined && Object.keys(stats.bySite).length > 0 && (_jsxs("section", { className: css.panel, "data-testid": "billing-panel-relay-sites", children: [_jsx("div", { className: css.panelHead, children: _jsx("h3", { className: css.panelTitle, children: t('billing.panelRelay') }) }), _jsx("div", { className: css.providerGroupList, "data-testid": "billing-relay-sites", children: Object.entries(stats.bySite)
                                                .sort((a, b) => (b[1].cost ?? 0) - (a[1].cost ?? 0))
                                                .map(([siteKey, usage]) => {
                                                const site = siteBucketLabel(siteKey, t);
                                                return (_jsxs("div", { className: css.siteRow, "data-testid": "billing-relay-site", children: [_jsxs("span", { className: css.siteRowName, children: [_jsx("span", { className: clsx(css.siteKindTag, SITE_KIND_CLASS[site.kind]), children: siteKindText(site.kind, t) }), _jsx("span", { className: css.siteRowTitle, children: site.name })] }), _jsxs("span", { className: css.siteRowMeta, children: [_jsx("span", { className: css.siteRowCost, children: money(usage.cost) }), _jsxs("span", { className: css.siteRowCalls, children: [usage.calls, " ", t('billing.relayCalls')] })] })] }, siteKey));
                                            }) })] })), relayQuotas.length > 0 && (_jsxs("section", { className: css.panel, "data-testid": "billing-panel-relay-quota", children: [_jsx("div", { className: css.panelHead, children: _jsx("h3", { className: css.panelTitle, children: t('billing.panelRelayQuota') }) }), _jsx("div", { className: css.providerGroupList, "data-testid": "billing-relay-quotas", children: relayQuotas.map(row => (_jsxs("div", { className: css.siteRow, "data-testid": "billing-relay-quota", children: [_jsxs("span", { className: css.siteRowName, children: [_jsx("span", { className: clsx(css.siteKindTag, RELAY_KIND_CLASS[row.kind]), children: relayKindText(row.kind, t) }), _jsx("span", { className: css.siteRowTitle, children: row.origin })] }), _jsxs("span", { className: css.siteRowMeta, children: [row.balance !== undefined && (_jsxs("span", { className: css.siteRowCost, children: [t('billing.relayBalance'), " ", row.balance.toFixed(2)] })), (row.windows?.length ?? 0) > 0
                                                                ? row.windows?.map(window => {
                                                                    const low = window.remainingPercent < 20;
                                                                    return (_jsxs("span", { className: clsx(css.siteRowCalls, low && css.siteRowCallsLow), children: [t('billing.relayWindowUsed'), " ", window.usedPercent, "%"] }, window.kind));
                                                                })
                                                                : _jsx("span", { className: css.siteRowCalls, children: t('billing.relayNoQuota') })] })] }, row.route))) })] })), _jsxs("section", { className: css.panel, "data-testid": "billing-panel-providers", children: [_jsxs("div", { className: css.panelHead, children: [_jsx("h3", { className: css.panelTitle, children: t('billing.providerBilling') }), renderSlot('billing.dashboard.decor', { position: 'models' }), _jsx("span", { className: css.panelHint, children: stats.updatedAt !== undefined
                                                        ? `${t('billing.lastUpdated')} ${formatClock(stats.updatedAt)}`
                                                        : '' })] }), quotasStale && (_jsx("div", { className: css.staleNotice, "data-testid": "billing-subscriptions-stale", children: t('billing.subscriptionsStale') })), providerGroups.length === 0 ? (_jsx("div", { className: css.emptyRow, "data-testid": "billing-provider-empty", children: t('billing.noData') })) : (_jsx("div", { className: css.providerGroupList, "data-testid": "billing-provider-groups", children: providerGroups.map(group => (_jsxs("div", { className: css.providerGroup, "data-testid": "billing-provider-group", children: [_jsxs("div", { className: css.providerGroupHead, children: [_jsxs("span", { className: css.providerGroupTitle, children: [_jsx("span", { className: clsx(css.healthDot, group.dot), "aria-hidden": "true" }), _jsx("span", { className: css.providerGroupName, children: providerName(group.name) })] }), _jsxs("span", { className: css.providerGroupMeta, children: [group.subscriptions.length > 0 && (_jsxs("span", { className: css.providerGroupBadge, "data-testid": "billing-provider-sub-count", children: [group.subscriptions.length, " \u5957\u9910"] })), !hideBalanceForGroup(group) && group.balance !== undefined && (_jsxs("span", { className: css.providerGroupBalance, "data-testid": "billing-provider-balance", children: [_jsx("span", { className: css.providerGroupBalanceLabel, children: t('billing.balance') }), renderBalance(group.balance)] }))] })] }), group.models.length > 0 && (_jsx("div", { className: clsx(css.tableScroll, css.modelTableScroll), "data-testid": "billing-table-scroll", children: _jsxs("table", { className: css.modelTable, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: t('billing.model') }), _jsx("th", { className: css.numCol, children: t('billing.calls') }), _jsx("th", { className: css.numCol, children: t('billing.inputTokens') }), _jsx("th", { className: css.numCol, children: t('billing.outputTokens') }), _jsx("th", { className: css.numCol, children: t('billing.cacheHitRate') }), _jsx("th", { className: css.numCol, children: t('billing.actual') })] }) }), _jsx("tbody", { children: group.models.map(row => (_jsxs("tr", { children: [_jsx("td", { children: _jsxs("span", { className: css.modelCell, children: [_jsx(VendorLogo, { provider: row.provider, colorVar: row.color }), _jsxs("span", { children: [_jsxs("span", { className: css.modelName, children: [row.name, row.uncatalogued && (_jsx("span", { className: css.uncataloguedTag, "data-testid": "billing-uncatalogued-tag", children: t('billing.uncatalogued') })), row.estimatedPricing && (_jsx("span", { className: css.estimatedTag, "data-testid": "billing-estimated-tag", children: t('billing.estimatedPricing') }))] }), _jsx("span", { className: css.modelProvider, children: providerName(row.provider) })] })] }) }), _jsx("td", { className: css.numCol, children: row.calls.toLocaleString() }), _jsx("td", { className: css.numCol, children: formatTokens(row.input) }), _jsx("td", { className: css.numCol, children: formatTokens(row.output) }), _jsx("td", { className: css.numCol, children: formatPercent(row.cacheHitRate) }), _jsx("td", { className: css.numCol, children: row.plan
                                                                                    ? _jsx("span", { className: css.planTag, children: t('billing.subscriptionIncluded') })
                                                                                    : row.actual !== undefined
                                                                                        ? (() => {
                                                                                            const official = row.officialCost;
                                                                                            const third = row.actual - official;
                                                                                            // 纯官方 / 纯三方 / 混合三态：混合时分解展示。
                                                                                            if (official > 0 && third > 0) {
                                                                                                return (_jsxs("span", { className: css.bucketCost, children: [_jsx("span", { className: css.bucketOfficial, children: money(official) }), _jsx("span", { className: css.bucketSep, children: "/" }), _jsx("span", { className: css.bucketThird, children: money(third) })] }));
                                                                                            }
                                                                                            return money(row.actual);
                                                                                        })()
                                                                                        : _jsx("span", { className: css.na, children: "\u2014" }) })] }, row.key))) })] }) })), group.subscriptions.length > 0 && (_jsx("div", { className: css.subscriptionGrid, "data-testid": "billing-subscriptions-grid", children: group.subscriptions.map((quota) => {
                                                            const statusText = subscriptionStatusText(quota.status, t);
                                                            return (_jsxs("div", { className: css.subscriptionCard, "data-testid": "billing-subscription-card", children: [_jsxs("div", { className: css.subscriptionHead, children: [_jsx("span", { className: css.subscriptionName, children: providerName(quota.displayName) }), quota.planType === 'code' && (() => {
                                                                                // 档位知识自动识别（原生币月费 + 周期额度口径）；无档位时回退 CNY 月费。
                                                                                const tier = tierInfoOf(quota.provider);
                                                                                const tierFee = tier !== undefined
                                                                                    ? t('billing.subscriptionFeePerMonth').replace('{amount}', tier.currency === 'USD' ? `$${tier.amount}` : `¥${tier.amount}`)
                                                                                    : undefined;
                                                                                return (_jsxs("span", { className: css.subscriptionPlan, "data-kind": "code", children: [tierFee ?? (quota.subscriptionAmount !== undefined && quota.subscriptionAmount > 0
                                                                                            ? t('billing.subscriptionFeePerMonth').replace('{amount}', money(quota.subscriptionAmount))
                                                                                            : t('billing.planTypeCode')), tier?.label !== undefined && (_jsx("span", { className: css.subscriptionTier, "data-testid": `billing-tier-${quota.provider}`, children: tier.label })), tier !== undefined && (_jsx("span", { className: css.subscriptionAuto, "data-testid": `billing-auto-${quota.provider}`, children: t('billing.subscriptionAutoDetect') }))] }));
                                                                            })(), quota.planType === 'token' && _jsx("span", { className: css.subscriptionPlan, "data-kind": "token", children: t('billing.planTypeToken') }), quota.plan !== undefined && _jsx("span", { className: css.subscriptionPlan, children: quota.plan })] }), statusText !== '' && _jsx("div", { className: css.subscriptionStatus, children: statusText }), quota.windows.length === 0 && statusText === '' && (_jsx("div", { className: css.subscriptionStatus, children: t('billing.subscriptionNoApi') })), quota.windows.map(window => (() => {
                                                                        const used = Math.min(100, Math.max(0, window.usedPercent));
                                                                        const remaining = Math.min(100, Math.max(0, window.remainingPercent));
                                                                        const exhausted = remaining <= 0;
                                                                        return (_jsxs("div", { className: css.subscriptionWindow, children: [_jsx("span", { className: css.subscriptionWindowLabel, children: subscriptionWindowLabel(window.kind, t) }), _jsx("span", { className: css.subscriptionTrack, "aria-hidden": "true", children: _jsx("span", { className: clsx(css.subscriptionFill, used >= 100 && css.subscriptionFillOver, used >= 80 && used < 100 && css.subscriptionFillWarn), style: { width: `${used}%` } }) }), _jsxs("span", { className: css.subscriptionMeta, children: [_jsx("span", { className: clsx(css.subscriptionPct, exhausted && css.subscriptionExhausted), children: exhausted
                                                                                                ? t('billing.subscriptionExhausted')
                                                                                                : t('billing.subscriptionRemaining').replace('{pct}', String(window.remainingPercent)) }), window.resetsAt !== undefined && (_jsx("span", { className: css.subscriptionReset, children: t('billing.subscriptionReset').replace('{date}', `${localDayStamp(new Date(window.resetsAt).getTime())} ${formatClock(new Date(window.resetsAt).getTime())}`) }))] })] }, window.kind));
                                                                    })())] }, quota.provider));
                                                        }) }))] }, group.name))) }))] }), _jsxs("div", { className: css.exportBar, "data-testid": "billing-export-bar", role: "group", "aria-label": t('billing.export'), children: [_jsx("span", { className: css.exportLabel, children: t('billing.export') }), _jsx("button", { type: "button", className: css.exportButton, "data-testid": "billing-export-day", onClick: () => { downloadText(exportFileName('usage-daily', 'csv', Object.keys(byDay)), dayRowsCsv(byDay), 'text/csv'); }, children: t('billing.exportCsvDay') }), stats.bySession !== undefined && (_jsx("button", { type: "button", className: css.exportButton, "data-testid": "billing-export-sessions", onClick: () => { downloadText(exportFileName('usage-sessions', 'csv', Object.keys(byDay)), sessionRowsCsv(stats.bySession ?? []), 'text/csv'); }, children: t('billing.exportCsvSession') })), stats.bySite !== undefined && (_jsx("button", { type: "button", className: css.exportButton, "data-testid": "billing-export-sites", onClick: () => { downloadText(exportFileName('usage-sites', 'csv', Object.keys(byDay)), siteRowsCsv(stats.bySite ?? {}), 'text/csv'); }, children: t('billing.exportCsvSite') })), _jsx("button", { type: "button", className: css.exportButton, "data-testid": "billing-export-json", onClick: () => { downloadText(exportFileName('usage-stats', 'json', Object.keys(byDay)), JSON.stringify(stats, null, 2), 'application/json'); }, children: t('billing.exportJson') })] }), roleRows.length > 0 && (_jsxs("section", { className: css.panel, "data-testid": "billing-panel-roles", children: [_jsxs("div", { className: css.panelHead, children: [_jsx("h3", { className: css.panelTitle, children: t('billing.roleCost') }), _jsx("span", { className: css.panelHint, children: t('billing.roleHint') })] }), _jsx("div", { className: css.shareTrack, "data-testid": "billing-role-track", children: roleRows.map(row => (_jsx("div", { className: clsx(css.shareSeg, row.seg), style: { width: `${row.pct}%` } }, row.label))) }), _jsx("div", { className: css.shareLegend, children: roleRows.map(row => (_jsxs("span", { className: css.shareItem, children: [_jsx("span", { className: clsx(css.shareDot, row.seg) }), row.label, _jsxs("span", { className: css.shareValue, children: [money(row.value), " \u00B7 ", row.pct.toFixed(1), "%"] })] }, row.label))) })] })), bucketSummary !== undefined && (() => {
                                    const totalCost = bucketSummary.officialCost + bucketSummary.thirdCost;
                                    const officialPct = totalCost > 0 ? (bucketSummary.officialCost / totalCost) * 100 : 0;
                                    return (_jsxs("div", { className: css.ubStatGrid, "data-testid": "billing-panel-buckets", children: [_jsxs("div", { className: css.ubStatCard, children: [_jsxs("span", { className: css.ubStatLabel, children: [t('billing.official'), "\uFF08=DeepSeek \u76F4\u8FDE\uFF09"] }), _jsx("span", { className: css.ubStatValue, children: money(bucketSummary.officialCost) }), _jsxs("span", { className: css.ubStatDetail, children: [bucketSummary.officialCalls, " ", t('billing.calls'), " \u00B7 ", officialPct.toFixed(1), "%"] })] }), _jsxs("div", { className: css.ubStatCard, children: [_jsxs("span", { className: css.ubStatLabel, children: [t('billing.thirdParty'), "\uFF08\u4E2D\u8F6C\uFF09"] }), _jsx("span", { className: css.ubStatValue, children: money(bucketSummary.thirdCost) }), _jsxs("span", { className: css.ubStatDetail, children: [bucketSummary.thirdCalls, " ", t('billing.calls'), " \u00B7 ", (100 - officialPct).toFixed(1), "%"] })] })] }));
                                })(), stats.byWorkspace !== undefined && stats.byWorkspace.length > 0 && (_jsxs("section", { className: css.ubCard, "data-testid": "billing-panel-workspaces", children: [_jsxs("div", { className: css.ubCardHead, children: [_jsx("h3", { className: css.ubCardTitle, children: t('billing.workspaces') }), _jsx("span", { className: css.ubCardSub, children: t('billing.workspacesHint') })] }), _jsx("ul", { className: css.rowlist, children: stats.byWorkspace.map(row => (_jsxs(Fragment, { children: [_jsx("li", { children: _jsxs("button", { type: "button", className: css.rowline, "data-testid": `billing-workspace-${row.name}`, onClick: () => { setExpandedProject(expandedProject === row.name ? undefined : row.name); }, children: [_jsx("span", { className: css.rowlineName, children: row.name }), _jsxs("span", { className: css.rowlineRight, children: [_jsx("span", { className: css.num, children: money(row.cost) }), _jsxs("span", { className: css.rowlineMuted, children: [row.calls, " ", t('billing.calls')] }), _jsx("span", { className: css.rowlineChev, "aria-hidden": "true", children: "\u203A" })] })] }) }), expandedProject === row.name && (_jsx("li", { className: css.rowlineDrillWrap, children: stats.bySession
                                                            ?.filter(s => projectName(s.cwd) === row.name)
                                                            .slice(0, 5)
                                                            .map(s => (_jsxs("div", { className: css.rowlineDrill, children: [_jsx("span", { className: css.rowlineName, children: s.title ?? s.id.slice(0, 8) }), _jsxs("span", { className: css.rowlineRight, children: [_jsx("span", { className: css.num, children: money(s.cost) }), _jsxs("span", { className: css.rowlineMuted, children: [s.calls, " ", t('billing.calls')] })] })] }, s.id))) }))] }, row.name))) })] })), stats.bySession !== undefined && (_jsxs("section", { className: css.ubCard, "data-testid": "billing-panel-sessions", children: [_jsxs("div", { className: css.ubCardHead, children: [_jsx("h3", { className: css.ubCardTitle, children: t('billing.sessions') }), _jsx("span", { className: css.ubCardSub, children: stats.bySession.length > SESSION_DISPLAY_LIMIT
                                                        ? t('billing.sessionOverflow')
                                                            .replace('{limit}', String(SESSION_DISPLAY_LIMIT))
                                                            .replace('{total}', String(stats.bySession.length))
                                                        : `${stats.bySession.length}` })] }), _jsx("div", { className: css.ubTablewrap, "data-testid": "billing-sessions-table", children: _jsxs("table", { className: css.ubTable, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: t('billing.sessionTitle') }), _jsx("th", { children: t('billing.project') }), _jsx("th", { className: css.numCol, children: t('billing.calls') }), _jsx("th", { className: css.numCol, children: t('billing.actual') }), _jsx("th", { className: css.numCol, children: t('billing.lastActive') })] }) }), _jsxs("tbody", { children: [stats.bySession.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: css.emptyRow, children: t('billing.noData') }) })), stats.bySession.slice(0, SESSION_DISPLAY_LIMIT).map(row => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("span", { className: css.modelName, children: row.title ?? row.id.slice(0, 8) }) }), _jsx("td", { children: _jsx("span", { className: css.modelProvider, children: projectName(row.cwd) ?? '—' }) }), _jsx("td", { className: css.numCol, children: row.calls.toLocaleString() }), _jsx("td", { className: css.numCol, children: money(row.cost) }), _jsx("td", { className: css.numCol, children: row.lastActive > 0 ? `${localDayStamp(row.lastActive)} ${formatClock(row.lastActive)}` : '—' })] }, row.id)))] })] }) })] }))] })), tab === 'token' && (_jsxs("div", { className: css.tabPanel, "data-testid": "billing-tab-panel-token", children: [_jsx(TokenPanel, { stats: stats, trendDays: trendDays, onTrendDays: setTrendDays, t: t }), stats.perf !== undefined && (_jsxs("section", { className: css.panel, "data-testid": "billing-panel-perf", children: [_jsxs("div", { className: css.panelHead, children: [_jsx("h3", { className: css.panelTitle, children: t('billing.perfTitle') }), _jsx("span", { className: css.panelHint, children: t('billing.perfHint') })] }), _jsx(PerfPanel, { perf: stats.perf, models: chartModels, t: t })] }))] })), tab === 'pricing' && (_jsxs("div", { className: css.tabPanel, "data-testid": "billing-tab-panel-pricing", children: [_jsxs("div", { className: css.ubAlert, role: "note", children: [_jsxs("div", { className: css.ubAlertLeft, children: [_jsxs("span", { className: css.ubRate, "data-testid": "billing-rate", children: [t('billing.todayRate'), " 1 USD = ", formatMoney(rateInfo.rate)] }), _jsx("span", { className: clsx(css.ubTag, rateInfo.live ? css.ubTagSuccess : css.ubTagNeutral), children: rateInfo.live ? t('billing.rateLive') : t('billing.rateBuiltin') })] }), _jsx("p", { className: css.ubAlertNote, children: t('billing.pricingTip') })] }), _jsxs("section", { className: css.ubCard, "data-testid": "billing-panel-pricing", children: [_jsxs("div", { className: css.ubCardHead, children: [_jsx("h3", { className: css.ubCardTitle, children: t('billing.pricing') }), _jsx("span", { className: css.ubCardSub, children: t('billing.pricingUnit') })] }), _jsx("div", { className: css.ubTablewrap, children: _jsxs("table", { className: css.ubTable, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: t('billing.thModel') }), _jsx("th", { className: css.numCol, children: t('billing.thInputMiss') }), _jsx("th", { className: css.numCol, children: t('billing.thInputHit') }), _jsx("th", { className: css.numCol, children: t('billing.output') }), _jsx("th", { className: css.numCol, children: t('billing.band') })] }) }), _jsx("tbody", { children: catalogEntries().map((entry) => {
                                                            const hasPrice = entry.price.input > 0 || entry.price.output > 0;
                                                            return (_jsxs("tr", { children: [_jsx("td", { children: _jsxs("span", { className: css.ubModel, children: [_jsx(VendorLogo, { provider: entry.provider, colorVar: resolveToken(entry.colorVar) }), _jsxs("span", { className: css.ubModelName, children: [entry.name, entry.uncatalogued && (_jsx("span", { className: css.ubTagAlert, "data-testid": "billing-price-uncatalogued", children: t('billing.uncatalogued') }))] })] }) }), _jsx("td", { className: css.numCol, children: hasPrice ? unitMoney(entry.price.input, entry.price.currency) : _jsx("span", { className: css.na, children: "\u2014" }) }), _jsx("td", { className: css.numCol, children: hasPrice ? unitMoney(entry.price.cacheHit, entry.price.currency) : _jsx("span", { className: css.na, children: "\u2014" }) }), _jsx("td", { className: css.numCol, children: hasPrice ? unitMoney(entry.price.output, entry.price.currency) : _jsx("span", { className: css.na, children: "\u2014" }) }), _jsx("td", { className: css.numCol, children: hasPrice && entry.price.offPeak !== undefined && entry.peakHours !== undefined
                                                                            ? (_jsxs("span", { className: css.ubPricepair, children: [_jsxs("span", { className: css.ubChipPeak, children: [_jsx("span", { className: css.ubChipLabel, children: t('billing.ubPeak') }), _jsxs("span", { className: css.num, children: [unitMoney(entry.price.input, entry.price.currency), " / ", unitMoney(entry.price.output, entry.price.currency)] })] }), _jsxs("span", { className: css.ubChipOff, children: [_jsx("span", { className: css.ubChipLabel, children: t('billing.ubOff') }), _jsxs("span", { className: css.num, children: [unitMoney(entry.price.offPeak.input, entry.price.currency), " / ", unitMoney(entry.price.offPeak.output, entry.price.currency)] })] })] }))
                                                                            : hasPrice
                                                                                ? _jsx("span", { className: css.flatTag, children: t('billing.flat') })
                                                                                : _jsx("span", { className: css.na, children: "\u2014" }) })] }, entry.key));
                                                        }) })] }) })] }), _jsxs("section", { className: css.ubCard, children: [_jsx("div", { className: css.ubCardHead, children: _jsx("h3", { className: css.ubCardTitle, children: t('billing.pricingNotes') }) }), _jsxs("ul", { className: css.ubNotes, children: [_jsxs("li", { className: css.ubNotesItem, children: [_jsx("span", { className: css.ubNotesTerm, children: t('billing.cacheHit') }), _jsx("span", { className: css.ubNotesDesc, children: t('billing.noteCache') })] }), _jsxs("li", { className: css.ubNotesItem, children: [_jsx("span", { className: css.ubNotesTerm, children: t('billing.peakBand') }), _jsx("span", { className: css.ubNotesDesc, children: t('billing.noteBand') })] }), _jsxs("li", { className: css.ubNotesItem, children: [_jsx("span", { className: css.ubNotesTerm, children: t('billing.pricingSource') }), _jsx("span", { className: css.ubNotesDesc, children: t('billing.noteSource') })] })] })] })] })), renderSlot('billing.dashboard.decor', { position: 'footer' })] }), _jsxs("footer", { className: css.modalFooter, "data-testid": "billing-footer", children: [_jsx("span", { children: t('billing.footer') }), _jsx("span", { children: t('billing.footerCredit').replace('{version}', stats.pluginVersion === undefined ? '—' : `v${stats.pluginVersion}`) })] })] }) }));
}
/**
 * VendorLogo: 模型名前显示厂商 logo（内嵌 SVG data URI，来自 models.dev）。
 * 未收录 logo 的厂商（字节豆包/文心/讯飞/商汤/百川/零一/面壁/小红书 等）回退为
 * 品牌色字母徽章，保证所有厂商都有可辨识标记，且不引入外部素材/版权风险。
 */
function VendorLogo({ provider, colorVar }) {
    const logo = vendorLogoOf(provider);
    if (logo !== undefined) {
        return _jsx("img", { className: css.vendorLogo, src: logo, alt: "", "aria-hidden": "true" });
    }
    return (_jsx("span", { className: css.vendorLetter, style: colorVar !== undefined ? { background: colorVar } : undefined, "aria-hidden": "true", children: provider.trim().charAt(0).toUpperCase() }));
}
/**
 * UsageBilling: sidebar trigger plus the billing dashboard modal.
 * @param props - framework-provided sidebar and locale props.
 */
export function UsageBilling(props) {
    const { t: hostT, checkModels, publishCosts, registerOpen, renderSlot, useStore, actions } = props;
    // Start empty; swap in real host data when the server serves valid JSON.
    const [stats, setStats] = useState(EMPTY_STATS);
    const [health, setHealth] = useState(IDLE_HEALTH);
    const [balances, setBalances] = useState([]);
    const [reconcile, setReconcile] = useState(undefined);
    const [quotas, setQuotas] = useState([]);
    // 订阅刷新是否失败：失败时保留上次成功快照并标记 stale（展示「缓存」）。
    const [quotasStale, setQuotasStale] = useState(false);
    const [relayQuotas, setRelayQuotas] = useState([]);
    const [currency, setCurrency] = useState('cny');
    // 模型用量悬浮窗偏好：localStorage 持久化（修改即写回，仅 client 侧）。
    const [floatPrefs, setFloatPrefs] = useState(() => loadFloatWindowPrefs());
    const updateFloatPrefs = useCallback((next) => {
        setFloatPrefs(next);
        saveFloatWindowPrefs(next);
    }, []);
    // 严格联动（仅本插件，不影响宿主全局语言）：币种=USD 时面板文案切英文，CNY 时切中文。
    // 用本包自带 zh/en 字典构建本地 t；key 未覆盖时回退宿主 t。
    const lang = currency === 'usd' ? 'en' : 'zh';
    const t = useCallback((key, params) => {
        const dict = lang === 'en' ? en : zh;
        // LocaleKeysOf 可能带额外 key，字典查找时收窄为本包声明的 UsageBillingKey。
        const text = dict[key] ?? hostT(key);
        if (params === undefined)
            return text;
        let out = text;
        for (const [k, v] of Object.entries(params))
            out = out.replaceAll(`{${k}}`, String(v));
        return out;
    }, [lang, hostT]);
    const [open, setOpen] = useState(false);
    const close = useCallback(() => { setOpen(false); }, []);
    // 重新拉取统计与余额：初次挂载、打开弹窗、弹窗期间轮询共用同一入口。
    const reloadStats = useCallback(() => {
        void loadUsageStats().then((data) => {
            if (data !== null)
                setStats(data);
        });
        void fetchBalanceDoc().then(({ balances, reconcile }) => {
            // 余额服务端恒返回内置行（空=失败），失败时保留旧快照。
            if (balances.length > 0)
                setBalances(balances);
            setReconcile(reconcile);
        });
        void fetchSubscriptions().then((list) => {
            if (list.length > 0) {
                setQuotas(list);
                setQuotasStale(false);
            }
            else {
                // 成功但无订阅数据：非 stale。
                setQuotasStale(false);
            }
        }).catch(() => {
            // 刷新失败：保留上次成功快照，标记缓存（stale）。
            setQuotasStale(true);
        });
        void fetchRelayQuotas().then((list) => {
            // 成功返回空数组是合法结果（用户删光中转配置），必须清空旧快照；
            // 只有请求失败（catch）才保留旧值，与订阅的 stale 语义区分开。
            setRelayQuotas(list);
        }).catch(() => {
            // 刷新失败：保留上次成功快照。
        });
    }, []);
    const openDashboard = useCallback(() => {
        // 打开弹窗时先刷新一次统计与定价，避免看到的是上次挂载的旧数据。
        void reloadStats();
        void loadLivePricing();
        setOpen(true);
    }, [reloadStats]);
    // Load stats on mount; also apply the live pricing snapshot in parallel.
    useEffect(() => {
        void reloadStats();
        void loadLivePricing();
    }, [reloadStats]);
    // 常驻定时刷新统计与定价：左下角触发器与弹窗都保持最新，无需退出重进。
    useEffect(() => {
        const timer = setInterval(() => {
            void reloadStats();
            void loadLivePricing();
        }, STATS_REFRESH_INTERVAL_MS);
        return () => { clearInterval(timer); };
    }, [reloadStats]);
    // Probe connected models: the sidebar dot turns green when any provider
    // answers its model catalog (live credentials), red when none do. 探活的
    // 模型清单（系统里实际配置/预制）同步注入 pricing，费率表据此对标显示。
    useEffect(() => {
        let mounted = true;
        void checkModels().then((result) => {
            if (!mounted)
                return;
            setHealth(result);
            applyLiveCatalogModels(result.catalog ?? []);
        });
        return () => { mounted = false; };
    }, [checkModels]);
    const today = localDayStamp();
    // 触发胶囊的主数字：当月累计（byDay 按 YYYY-MM 前缀归并）。
    const monthCost = Object.entries(stats.byDay)
        .filter(([date]) => date.startsWith(today.slice(0, 7)))
        .reduce((sum, [, day]) => sum + day.cost, 0);
    const todayCost = stats.byDay[today]?.cost ?? 0;
    // 触发卡 hover 速览：本周累计 + 近 7 天迷你柱。
    const weekCost = lastSevenDays(stats.byDay).reduce((sum, d) => sum + d.cost, 0);
    const last7 = useMemo(() => lastSevenDays(stats.byDay), [stats.byDay]);
    // 预算偏好：开关与金额经框架 store 读取；用户金额优先，宿主 monthlyBudget
    //（stats.budget）兜底为默认值。
    const budgetEnabled = useStore(s => s.enabled);
    const budgetAmount = useStore(s => s.amount);
    const tierAlertDays = useStore(s => s.tierAlertDays);
    const lastTierSwitchAt = useStore(s => s.lastTierSwitchAt);
    // 峰谷提醒偏好：localStorage 持久化；「同一切换点只提醒一次」由 budget store 去重。
    const [peakConfig, setPeakConfig] = useState(() => loadPeakAlertConfig());
    const [peakHit, setPeakHit] = useState(null);
    const [peakPreview, setPeakPreview] = useState(null);
    // 墙钟 tick：驱动峰谷切换提醒按时间周期重算。提醒提前量最小 1 分钟，30 秒
    // 粒度足以在切换前命中；否则开着面板等到切换点也不会触发（原实现只在挂载/
    // 配置变更时算一次）。
    const [nowMs, setNowMs] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNowMs(Date.now()), STATS_REFRESH_INTERVAL_MS);
        return () => { clearInterval(timer); };
    }, []);
    const updatePeakConfig = useCallback((config) => {
        setPeakConfig(config);
        savePeakAlertConfig(config);
    }, []);
    const previewPeak = useCallback(() => {
        // 预览：3 分钟后进入与当前相反的档位（不触真实去重，关闭即消失）。
        setPeakPreview({ entering: tierAt(Date.now()) === 'peak' ? 'offPeak' : 'peak', atMs: Date.now() + 3 * 60_000 });
    }, []);
    const effectiveBudget = budgetAmount > 0 ? budgetAmount : (stats.budget ?? 0);
    const toggleBudget = useCallback(() => {
        const next = !budgetEnabled;
        actions.setEnabled(next);
        // 开启预算的手势顺带申请通知权限：授权后跨档才会弹系统通知。
        if (next && typeof Notification !== 'undefined' && Notification.permission === 'default') {
            void Notification.requestPermission();
        }
    }, [actions, budgetEnabled]);
    // 预算分档提醒：跨过 50% / 80% / 100% 时桌面通知（每档每天最多一次，标记
    // 持久化跨重启生效）。一次检查跨多档时只发最高档，并把跨过的档全部标记为
    // 当日已提醒；Notification 不可用或未授权时跳过——进度条分档变色（琥珀/红）
    // 始终留在界面上兜底。
    useEffect(() => {
        if (!budgetEnabled || effectiveBudget <= 0)
            return;
        const pct = (monthCost / effectiveBudget) * 100;
        const day = localDayStamp();
        const crossed = BUDGET_ALERT_TIERS.filter(tier => pct >= tier && tierAlertDays?.[String(tier)] !== day);
        if (crossed.length === 0)
            return;
        const top = crossed[crossed.length - 1] ?? 100;
        actions.markTierAlerted(crossed, day);
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted')
            return;
        const body = t('billing.budgetTierBody')
            .replace('{cost}', formatMoney(monthCost))
            .replace('{budget}', formatMoney(effectiveBudget))
            .replace('{pct}', String(top));
        // 通知发送失败（部分平台限制）不影响标记：当天不再重试，避免轮询轰炸。
        try {
            new Notification(t('billing.budget'), { body });
        }
        catch {
            // 平台拒绝构造通知：静默跳过，进度条分档变色兜底。
        }
    }, [budgetEnabled, effectiveBudget, monthCost, tierAlertDays, actions, t]);
    // 峰/谷切换前提醒（增强版）：距进入下一档不足提前量且该切换点未提醒过时，
    // 弹可视化浮层 +（可选的）系统通知。`lastTierSwitchAt` 去重跨重启生效，
    // 与旧的系统通知共用同一份去重，避免一条切换提醒弹两次。
    useEffect(() => {
        const upcoming = computePeakAlert(nowMs, peakConfig, lastTierSwitchAt);
        if (upcoming === null)
            return;
        actions.markTierSwitchAlerted(upcoming.atMs);
        setPeakHit(upcoming);
        if (!peakConfig.webNotify)
            return;
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted')
            return;
        const minutes = Math.max(1, Math.round((upcoming.atMs - nowMs) / 60_000));
        const title = upcoming.entering === 'peak' ? t('billing.peakAlertTitlePeak') : t('billing.peakAlertTitleOff');
        const body = upcoming.entering === 'peak'
            ? t('billing.tierAlertEnterPeak').replace('{minutes}', String(minutes))
            : t('billing.tierAlertEnterOff').replace('{minutes}', String(minutes));
        try {
            new Notification(title, { body });
        }
        catch {
            // 平台拒绝构造通知：静默跳过，浮层始终可见。
        }
    }, [nowMs, lastTierSwitchAt, peakConfig, actions, t]);
    // 余额不足告警：任一提供方余额低于阈值（折算人民币）时每天提醒一次；
    // 与预算开关无关——余额是硬性约束，无论是否开启预算都要提醒。
    const lastBalanceAlertDay = useStore(s => s.lastBalanceAlertDay);
    const lowBalanceRow = useMemo(() => {
        if (balances.length === 0)
            return undefined;
        const threshold = stats.lowBalanceThreshold ?? DEFAULT_LOW_BALANCE_THRESHOLD;
        const burn = dailyBurnRate(stats.byDay, today);
        const rate = getRateInfo().rate;
        for (const balance of balances) {
            if (balance.totalBalance === undefined || balance.error !== undefined)
                continue;
            // USD 余额按当前汇率折成人民币，与阈值同口径。
            const cny = balance.currency === 'USD' ? balance.totalBalance * rate : balance.totalBalance;
            if (cny >= threshold)
                continue;
            // 天数仅在有消耗记录时提供；刚用或未用（无历史）时以金额告警为主。
            const days = burn > 0 ? Math.floor(cny / burn) : undefined;
            return { name: balance.displayName, cny, days };
        }
        return undefined;
    }, [balances, stats.lowBalanceThreshold, stats.byDay, today]);
    useEffect(() => {
        if (lowBalanceRow === undefined)
            return;
        const day = localDayStamp();
        if (lastBalanceAlertDay === day)
            return;
        actions.markBalanceAlerted(day);
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted')
            return;
        const body = t('billing.balanceLowBody')
            .replace('{name}', lowBalanceRow.name)
            .replace('{balance}', formatMoney(lowBalanceRow.cny))
            .replace('{days}', lowBalanceRow.days === undefined ? '—' : String(lowBalanceRow.days));
        // 通知发送失败（部分平台限制）不影响标记：当天不再重试，避免轮询轰炸。
        try {
            new Notification(t('billing.balance'), { body });
        }
        catch {
            // 平台拒绝构造通知：静默跳过。
        }
    }, [lowBalanceRow, lastBalanceAlertDay, actions, t]);
    // hover 速览「主力直联/订阅消耗」：本月按厂商聚合消耗，区分按量（直联）与订阅，
    // 并附余额/配额状态——余额仅按量厂商有意义，配额仅订阅厂商有意义。
    const vendorStatus = useMemo(() => {
        const prefix = today.slice(0, 7);
        const vendor = new Map();
        for (const [date, models] of Object.entries(stats.byDayModels ?? {})) {
            if (!date.startsWith(prefix))
                continue;
            for (const [modelKey, usage] of Object.entries(models)) {
                if (usage.cost <= 0)
                    continue;
                const provider = modelOf(modelKey).provider ?? '其他';
                const isPlan = stats.byModel?.[modelKey]?.plan === true;
                const cur = vendor.get(provider) ?? { cost: 0, plan: isPlan };
                cur.cost += usage.cost;
                // 混合计费（部分订阅）视为存在按量 → 归直联桶。
                if (!isPlan)
                    cur.plan = false;
                vendor.set(provider, cur);
            }
        }
        const directEntry = [...vendor.entries()].filter(([, v]) => !v.plan).sort((a, b) => b[1].cost - a[1].cost)[0];
        const subEntry = [...vendor.entries()].filter(([, v]) => v.plan).sort((a, b) => b[1].cost - a[1].cost)[0];
        const balanceStatus = (name) => {
            const bal = balances.find(b => normalizeProvider(b.provider) === normalizeProvider(name));
            if (bal === undefined || bal.totalBalance === undefined) {
                // 无余额/异常时给出状态文案（未配置 / 密钥无效 / 查询失败），而非空。
                const text = bal?.error === 'unauthorized'
                    ? t('billing.balanceUnauthorized')
                    : bal?.error === 'unreachable' || bal?.error === 'invalid'
                        ? t('billing.balanceUnreachable')
                        : t('billing.balanceUnconfigured');
                return { text, low: false };
            }
            const amount = bal.currency === 'USD' ? `$${bal.totalBalance.toFixed(2)}` : formatMoney(bal.totalBalance);
            const rate = getRateInfo().rate;
            const cny = bal.currency === 'USD' ? bal.totalBalance * rate : bal.totalBalance;
            return { text: amount, low: cny < (stats.lowBalanceThreshold ?? DEFAULT_LOW_BALANCE_THRESHOLD) };
        };
        const quotaStatus = (name) => {
            const q = quotas.find(qq => qq.displayName === name || subscriptionVendorOf(qq.provider) === name);
            if (q === undefined || q.windows.length === 0) {
                return { text: t('billing.subscriptionNoApi'), low: false };
            }
            const lowest = q.windows.reduce((min, window) => Math.min(min, window.remainingPercent), 100);
            return {
                text: lowest <= 0 ? t('billing.subscriptionExhausted') : t('billing.subscriptionRemaining').replace('{pct}', String(lowest)),
                low: lowest < 20,
            };
        };
        return {
            direct: directEntry === undefined ? undefined : { name: directEntry[0], ...balanceStatus(directEntry[0]) },
            sub: subEntry === undefined ? undefined : { name: subEntry[0], ...quotaStatus(subEntry[0]) },
        };
    }, [stats.byDayModels, stats.byModel, stats.lowBalanceThreshold, balances, quotas, today]);
    // hover 速览「数据卡」数值：全量累计用量（参考图风格）。
    const dash = useMemo(() => {
        const total = stats.total;
        return {
            totalToken: total.input + total.output,
            input: total.input,
            output: total.output,
            cacheRead: total.cacheHit,
            calls: total.calls,
        };
    }, [stats]);
    // 费用摘要始终写入计费指标服务：服务与槽位一样按「无消费者即空转」设计，
    // 主题插件（如 StickerPad）存在时自行读取，缺席时发布无害。
    useEffect(() => {
        publishCosts({ todayCost, monthCost });
    }, [todayCost, monthCost, publishCosts]);
    // dashboard 打开回调同样始终注册，供主题插件（如 StickerPad）触发。
    useEffect(() => registerOpen(openDashboard), [registerOpen, openDashboard]);
    // 每轮费用明细：服务端按起始时间倒序下发；旧快照缺失时为空数组（面板不出现）。
    const turns = useMemo(() => stats.byTurn ?? [], [stats.byTurn]);
    return (_jsxs(_Fragment, { children: [_jsx(UsageBillingTrigger, { ...props, t: t, onOpen: openDashboard, monthCost: monthCost, todayCost: todayCost, weekCost: weekCost, days: last7, vendorStatus: vendorStatus, dash: dash, floatPrefs: floatPrefs, subscriptions: quotas }), open && (_jsx(BillingDashboard, { stats: stats, t: t, onClose: close, health: health, balances: balances, ...(reconcile === undefined ? {} : { reconcile }), quotas: quotas, relayQuotas: relayQuotas, currency: currency, onCurrency: setCurrency, turns: turns, renderSlot: renderSlot, budgetEnabled: budgetEnabled, budgetAmount: effectiveBudget, onToggleBudget: toggleBudget, onBudgetAmount: actions.setAmount, peakConfig: peakConfig, onPeakConfig: updatePeakConfig, onPreviewPeak: previewPeak, floatPrefs: floatPrefs, onFloatPrefs: updateFloatPrefs, quotasStale: quotasStale })), (peakHit !== null || peakPreview !== null) && (_jsx(PeakAlertBanner, { hit: (peakHit ?? peakPreview), config: peakConfig, t: t, onDismiss: () => { setPeakHit(null); setPeakPreview(null); } }))] }));
}
//# sourceMappingURL=UsageBilling.js.map