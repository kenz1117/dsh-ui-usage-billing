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
import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Modal } from '@deepseek-ai/dsh-client-ui-primitives';
import { DEFAULT_ENABLE_USAGE_STATS_TOOL } from "./usage-billing-settings.js";
import { TrendChart } from "./TrendChart.js";
import { PerfPanel } from "./PerfPanel.js";
import { PluginInfoCard } from "./PluginInfoCard.js";
import { TokenPanel } from "./TokenPanel.js";
import { RoundCostChart } from "./round-chart.js";
import { UsageHeatmap } from "./heatmap.js";
import { flagAnomalies } from "./anomaly.js";
import { dayRowsCsv, downloadText, exportFileName, sessionRowsCsv } from "./export.js";
import { applyLiveCatalogModels, applyLivePricing, catalogEntries, cnyToUsd, computeCost, convertUnitPrice, formatMoney, formatPercent, formatTokens, formatUnitPrice, getRateInfo, modelOf, resolveToken, tierAt, } from "./pricing.js";
import { zh, en } from "./locales.js";
import { localizeProviderName } from "./provider-display.js";
import { tierInfoOf } from "./plan-knowledge.js";
import { computePeakAlert, loadPeakAlertConfig, savePeakAlertConfig } from "./peak-alert.js";
import { PeakAlertBanner } from "./PeakAlertBanner.js";
import css from './UsageBilling.module.css';
/** 会话明细面板最多展示的行数（完整长尾在服务端另有一层封顶）。 */
const SESSION_DISPLAY_LIMIT = 20;
/**
 * Tab 定义（顺序即渲染顺序）：概览=主数字/KPI/热力图，趋势=趋势图/每轮费用，
 * 明细=厂商计费与订阅，统计=工作区/会话明细，费率=模型单价表，设置=预算与峰谷提醒。
 * 导出供测试断言 tab 与文案 key 对齐、decor 锚点落在正确分区。
 */
export const DASHBOARD_TABS = [
    { id: 'overview', labelKey: 'billing.tabOverview' },
    { id: 'token', labelKey: 'billing.tabToken' },
    { id: 'trends', labelKey: 'billing.tabTrends' },
    { id: 'providers', labelKey: 'billing.tabProviders' },
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
    'opencode': 'OpenCode',
    'opencode-go': 'OpenCode',
};
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
/** Path to the usage-stats endpoint served by this plugin's node half. */
const USAGE_STATS_PATH = '/api/billing/usage-stats';
/** Path to the live-pricing endpoint served by this plugin's node half. */
const PRICING_PATH = '/api/billing/pricing';
/** Path to the account-balance endpoint served by this plugin's node half. */
const BALANCE_PATH = '/api/billing/balance';
/** Path to the subscription-plan quota endpoint served by this plugin's node half. */
const SUBSCRIPTIONS_PATH = '/api/billing/subscriptions';
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
async function loadLivePricing(attempt = 0) {
    const MAX_ATTEMPTS = 4;
    try {
        const response = await fetch(PRICING_PATH);
        if (!response.ok)
            return;
        const text = await response.text();
        const parsed = JSON.parse(text);
        if (parsed === null || typeof parsed !== 'object' || !('source' in parsed))
            return;
        const pricing = parsed;
        if (pricing.source === 'builtin' && attempt < MAX_ATTEMPTS - 1) {
            // 节点端启动拉取可能仍在进行中：稍后重试，避免把「更新中」误判成永久内置。
            setTimeout(() => { void loadLivePricing(attempt + 1); }, 2000);
            return;
        }
        applyLivePricing(pricing);
    }
    catch {
        // 拉取失败：维持内置目录与内置汇率（默认值降级）。
    }
}
/**
 * 拉取各提供方账户余额（供模型计费明细表的余额列）；失败返回空列表。
 * @returns the balance rows, or an empty list on any failure.
 */
async function fetchBalances() {
    try {
        const response = await fetch(BALANCE_PATH);
        if (!response.ok)
            return [];
        const text = await response.text();
        const parsed = JSON.parse(text);
        if (parsed !== null && typeof parsed === 'object' && 'balances' in parsed) {
            return parsed.balances;
        }
        return [];
    }
    catch {
        return [];
    }
}
/**
 * 拉取订阅套餐剩余额度（供订阅面板）；失败返回空列表。
 * @returns the quota rows, or an empty list on any failure.
 */
async function fetchSubscriptions() {
    try {
        const response = await fetch(SUBSCRIPTIONS_PATH);
        if (!response.ok)
            return [];
        const text = await response.text();
        const parsed = JSON.parse(text);
        if (parsed !== null && typeof parsed === 'object' && 'quotas' in parsed) {
            return parsed.quotas;
        }
        return [];
    }
    catch {
        return [];
    }
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
    const { wide, t, onOpen, monthCost, todayCost, weekCost, days } = props;
    // 计费 icon：圆角矩 + 细线描边，窄栏与宽栏共用。
    const cardIcon = (_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "aria-hidden": "true", children: [_jsx("path", { d: "M4 7h16v11H4z" }), _jsx("path", { d: "M4 10h16" }), _jsx("path", { d: "M8 14h3" })] }));
    if (!wide) {
        return (_jsx("button", { type: "button", className: css.railButton, "data-testid": "billing-rail-button", onClick: onOpen, title: `${t('billing.title')} · ${formatMoney(monthCost)}`, children: cardIcon }));
    }
    // 近 7 天 sparkline 高度：按当日费用归一化到 4~16px。
    const sparkMax = Math.max(...days.map(d => d.cost), 0);
    const sparkHeights = days.map(d => sparkMax > 0 ? 4 + (d.cost / sparkMax) * 12 : 4);
    return (_jsxs("span", { className: css.triggerWrap, children: [_jsxs("button", { type: "button", className: css.trigger, "data-testid": "billing-trigger", onClick: onOpen, title: `${t('billing.title')} · ${formatMoney(monthCost)}`, children: [_jsx("span", { className: css.triggerIcon, "data-testid": "billing-trigger-icon", children: cardIcon }), _jsxs("span", { className: css.triggerBody, children: [_jsxs("span", { className: css.triggerRow, children: [_jsx("span", { className: css.triggerMeta, children: t('billing.triggerMonth') }), _jsx("span", { className: css.triggerAmount, children: formatMoney(monthCost) })] }), _jsxs("span", { className: css.triggerSub, "data-testid": "billing-trigger-today", children: [t('billing.triggerToday'), " ", formatMoney(todayCost), " \u00B7 ", weekCost > 0 ? `${t('billing.weekCost')} ${formatMoney(weekCost)}` : ''] })] }), _jsx("span", { className: css.triggerSpark, "data-testid": "billing-trigger-spark", "aria-hidden": "true", children: sparkHeights.map((h, index) => (_jsx("span", { className: index === sparkHeights.length - 1 ? css.triggerSparkHot : css.triggerSparkBar, style: { height: `${h}px` } }, days[index]?.date ?? String(index)))) })] }), _jsxs("span", { className: css.triggerPop, "data-testid": "billing-trigger-pop", "aria-hidden": "true", children: [_jsxs("span", { className: css.triggerPopRow, children: [_jsx("span", { className: css.triggerPopLabel, children: t('billing.todayCost') }), _jsx("span", { className: css.triggerPopValue, children: formatMoney(todayCost) })] }), _jsxs("span", { className: css.triggerPopRow, children: [_jsx("span", { className: css.triggerPopLabel, children: t('billing.weekCost') }), _jsx("span", { className: css.triggerPopValue, children: formatMoney(weekCost) })] }), _jsxs("span", { className: css.triggerPopRow, children: [_jsx("span", { className: css.triggerPopLabel, children: t('billing.monthCost') }), _jsx("span", { className: css.triggerPopValue, children: formatMoney(monthCost) })] }), _jsx("span", { className: css.triggerPopBars, children: sparkHeights.map((_h, index) => (_jsx("span", { className: css.triggerPopBar, style: { height: `${sparkMax > 0 ? 4 + ((days[index]?.cost ?? 0) / sparkMax) * 18 : 4}px` } }, days[index]?.date ?? String(index)))) })] })] }));
}
/**
 * The centered billing dashboard modal.
 * @param props - stats, locale function, close handler, model health, balances, renderSlot.
 */
function BillingDashboard({ stats, t, onClose, health, balances, quotas, currency, onCurrency, turns, renderSlot, budgetEnabled, budgetAmount, onToggleBudget, onBudgetAmount, peakConfig, onPeakConfig, onPreviewPeak, }) {
    const { total, byModel, byDay } = stats;
    // 分区 Tab：默认概览；各区块已进入二级 Tab，全部默认展开（无折叠交互）。
    const [tab, setTab] = useState('overview');
    // 趋势窗口：7 天 / 30 天切换（30 天窗口数据不足时按日补零）。
    const [trendDays, setTrendDays] = useState(7);
    // 热力图范围：月日历 / 近 52 周。
    const [heatmapRange, setHeatmapRange] = useState('month');
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
    // 余额列单元格：按查询状态渲染金额或占位文案；余额有效且日均消耗可估时
    // 附「约可撑 N 天」提示（A1），剩余不足 3 天时红色强调。
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
        if (dailyBurn <= 0)
            return amount;
        const days = Math.floor(balanceCny / dailyBurn);
        return (_jsxs("span", { className: css.balanceCell, children: [_jsx("span", { children: amount }), _jsx("span", { className: clsx(css.balanceDays, days <= 3 && css.balanceDaysLow), "data-testid": "billing-balance-days", children: t('billing.balanceDays').replace('{days}', String(days)) })] }));
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
    const monthCalls = dates.reduce((sum, d) => sum + (d.startsWith(monthPrefix) ? (byDay[d]?.calls ?? 0) : 0), 0);
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
            // 有预算时中心标签显示「预算」，否则显示「本月」。
            label: t('billing.budget'),
        };
    }, [budgetEnabled, budgetAmount, monthCost, yearCost, t]);
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
        return { date, cost: day?.cost ?? 0, calls: day?.calls ?? 0, byModel };
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
        for (const row of modelRows) {
            const list = modelsByVendor.get(row.provider);
            if (list === undefined)
                modelsByVendor.set(row.provider, [row]);
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
    return (_jsx(Modal, { open: true, onClose: onClose, title: t('billing.title'), headless: true, className: clsx(css.dashboardModal, 'dsh-billing-modal'), children: _jsxs("div", { className: css.dashboard, "data-testid": "billing-dashboard", children: [_jsxs("div", { className: css.dashboardHead, "data-testid": "billing-dashboard-head", children: [_jsxs("div", { children: [renderSlot('billing.dashboard.decor', { position: 'head' }), _jsxs("div", { className: css.headTitleRow, children: [_jsx("h2", { className: css.dashboardTitle, children: t('billing.title') }), renderSlot('billing.dashboard.decor', { position: 'headTitle' })] }), _jsxs("p", { className: css.dashboardSubtitle, children: [t('billing.lastUpdated'), " ", latestDate] })] }), _jsxs("div", { className: css.dashboardRight, children: [_jsx("span", { className: css.currencyToggle, role: "group", "aria-label": t('billing.currency'), children: ['cny', 'usd'].map(unit => (_jsx("button", { type: "button", className: clsx(css.currencyButton, currency === unit && css.currencyButtonActive), "aria-pressed": currency === unit, "data-testid": `billing-currency-${unit}`, title: unit === 'cny' ? t('billing.currencyCny') : t('billing.currencyUsd'), onClick: () => { onCurrency(unit); }, children: unit === 'cny' ? '¥' : '$' }, unit))) }), health.checked && (_jsxs("span", { className: clsx(css.healthBadge, health.available ? css.healthBadgeOk : css.healthBadgeBad), children: [_jsx("span", { className: clsx(css.healthDot, health.available ? css.healthOk : css.healthBad), "aria-hidden": "true" }), health.available
                                            ? `${health.models} 模型可用${health.failures > 0 ? ` · ${health.failures} 厂商失效` : ''}`
                                            : `${health.failures} 厂商不可用`] })), _jsx("button", { type: "button", className: css.closeButton, "aria-label": t('billing.close'), "data-testid": "billing-close", onClick: onClose, children: _jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "aria-hidden": "true", children: [_jsx("path", { d: "M18 6 6 18" }), _jsx("path", { d: "m6 6 12 12" })] }) })] })] }), _jsx("nav", { className: css.tabNav, "data-testid": "billing-tab-nav", role: "tablist", "aria-label": t('billing.title'), children: DASHBOARD_TABS.map(item => (_jsx("button", { type: "button", role: "tab", "aria-selected": tab === item.id, className: clsx(css.tabButton, tab === item.id && css.tabButtonActive), "data-testid": `billing-tab-${item.id}`, onClick: () => { setTab(item.id); }, children: t(item.labelKey) }, item.id))) }), _jsxs("div", { className: css.dashboardBody, children: [tab === 'overview' && (_jsxs("div", { className: css.tabPanel, "data-testid": "billing-tab-panel-overview", children: [_jsxs("section", { className: css.hero, "data-testid": "billing-hero", children: [renderSlot('billing.dashboard.decor', { position: 'hero' }), _jsxs("div", { className: css.heroTop, children: [_jsxs("div", { className: css.heroMain, children: [_jsx("span", { className: css.heroLabel, children: t('billing.monthCost') }), _jsxs("div", { className: css.heroReadout, children: [_jsx("span", { className: css.heroCurrency, "aria-hidden": "true", children: currency === 'usd' ? '$' : '¥' }), _jsx("span", { className: css.heroValue, children: money(monthCost).slice(1) })] }), _jsxs("span", { className: css.heroMeta, children: [monthCalls.toLocaleString(), " ", t('billing.calls')] })] }), _jsxs("div", { className: css.heroGauge, "data-testid": "billing-hero-gauge", children: [_jsxs("svg", { className: css.heroGaugeSvg, viewBox: "0 0 120 120", "aria-hidden": "true", children: [_jsx("circle", { className: css.heroGaugeTrack, cx: "60", cy: "60", r: "52" }), _jsx("circle", { className: clsx(css.heroGaugeArc, heroGauge.over && css.heroGaugeArcOver), cx: "60", cy: "60", r: "52", style: { strokeDasharray: `${(heroGauge.pct / 100) * 326.7} 326.7` } })] }), _jsxs("span", { className: css.heroGaugeCenter, children: [_jsxs("span", { className: clsx(css.heroGaugePct, heroGauge.over && css.heroGaugePctOver), children: [heroGauge.pct.toFixed(0), "%"] }), _jsx("span", { className: css.heroGaugeLabel, children: heroGauge.label })] })] })] }), _jsxs("div", { className: css.heroSide, children: [_jsxs("div", { className: css.heroSideItem, children: [_jsx("span", { className: css.heroSideLabel, children: t('billing.yearCost') }), _jsx("span", { className: css.heroSideValue, children: money(yearCost) })] }), _jsxs("div", { className: css.heroSideItem, children: [_jsx("span", { className: css.heroSideLabel, children: t('billing.todayCost') }), _jsxs("span", { className: css.heroSideValue, children: [money(todayCost), _jsxs("span", { className: clsx(css.delta, deltaPct >= 0 ? css.deltaUp : css.deltaDown), children: [deltaPct >= 0 ? '▲' : '▼', " ", Math.abs(deltaPct).toFixed(1), "%"] })] })] }), monthCostProjected > 0 && (_jsxs("div", { className: css.heroSideItem, children: [_jsx("span", { className: css.heroSideLabel, children: t('billing.monthProjected') }), _jsx("span", { className: css.heroSideValue, children: money(monthCostProjected) })] })), monthCostProjected <= 0 && _jsx("span", { className: css.heroSideSpacer, "aria-hidden": "true" })] })] }), _jsxs("section", { className: css.kpiGrid, "data-testid": "billing-kpi-grid", children: [_jsxs("div", { className: css.kpiTile, "data-testid": "billing-kpi-tile", children: [_jsx("span", { className: css.kpiLabel, children: t('billing.cacheHitRate') }), _jsx("span", { className: clsx(css.kpiValue, css.kpiGreen), children: formatPercent(cacheHitRate) }), _jsxs("span", { className: css.kpiDetail, children: [formatTokens(total.cacheHit), " / ", formatTokens(total.cacheHit + total.cacheMiss)] })] }), _jsxs("div", { className: css.kpiTile, children: [_jsx("span", { className: css.kpiLabel, children: t('billing.tokens') }), _jsx("span", { className: css.kpiValue, children: formatTokens(total.input + total.output) }), _jsxs("span", { className: css.kpiDetail, children: [t('billing.inputTokens'), " ", formatTokens(total.input), " \u00B7 ", t('billing.outputTokens'), " ", formatTokens(total.output)] })] }), _jsxs("div", { className: css.kpiTile, children: [_jsx("span", { className: css.kpiLabel, children: t('billing.avgCost') }), _jsx("span", { className: css.kpiValue, children: money(avgPerCall) }), _jsxs("span", { className: css.kpiDetail, children: [t('billing.calls'), " ", total.calls.toLocaleString()] })] }), _jsxs("div", { className: css.kpiTile, children: [_jsx("span", { className: css.kpiLabel, children: t('billing.calls') }), _jsx("span", { className: css.kpiValue, children: total.calls.toLocaleString() }), _jsxs("span", { className: css.kpiDetail, children: [modelRows.length, " ", t('billing.models')] })] })] }), _jsxs("section", { className: css.panel, "data-testid": "billing-panel-heatmap", children: [_jsxs("div", { className: css.panelHead, children: [_jsx("h3", { className: css.panelTitle, children: t('billing.heatmap') }), _jsx("span", { className: css.rangeToggle, role: "group", "aria-label": t('billing.heatmap'), children: ['month', 'year'].map(range => (_jsx("button", { type: "button", className: clsx(css.rangeButton, heatmapRange === range && css.rangeButtonActive), "aria-pressed": heatmapRange === range, "data-testid": `billing-heatmap-${range}`, onClick: () => { setHeatmapRange(range); }, children: range === 'month' ? t('billing.heatmapMonth') : t('billing.heatmapYear') }, range))) }), _jsxs("span", { className: css.panelHint, "data-testid": "billing-heatmap-summary", children: [t('billing.activeDays'), " ", activeDays, " \u00B7 ", t('billing.streakDays'), " ", streakDays] })] }), _jsx(UsageHeatmap, { days: heatmapDays, currency: currency, t: t, range: heatmapRange })] })] })), tab === 'settings' && (_jsxs("div", { className: css.tabPanel, "data-testid": "billing-tab-panel-settings", children: [_jsxs("div", { className: css.settingsHead, children: [_jsx("h3", { className: css.settingsTitle, children: t('billing.settingsHead') }), _jsx("p", { className: css.settingsHint, children: t('billing.settingsHint') })] }), _jsxs("section", { className: css.budget, "data-testid": "billing-budget", children: [_jsxs("div", { className: css.budgetHead, children: [_jsx("span", { className: css.budgetLabel, children: t('billing.budget') }), _jsxs("span", { className: css.budgetControls, children: [budgetEnabled && (_jsxs("span", { className: css.budgetInputWrap, "data-testid": "billing-budget-input-wrap", children: [_jsx("span", { className: css.budgetUnit, "aria-hidden": "true", children: "\u00A5" }), _jsx("input", { className: css.budgetInput, "data-testid": "billing-budget-input", type: "number", min: 0, step: 1, value: budgetAmount === 0 ? '' : budgetAmount, placeholder: stats.budget !== undefined ? String(stats.budget) : '0', "aria-label": `${t('billing.budget')}（${currency === 'usd' ? 'USD' : 'CNY'}）`, title: `${t('billing.budget')}（${currency === 'usd' ? 'USD' : 'CNY'}）`, onChange: (e) => { onBudgetAmount(e.target.valueAsNumber); } })] })), budgetEnabled && budgetAmount > 0 && (() => {
                                                            const pct = (monthCost / budgetAmount) * 100;
                                                            return (_jsxs("span", { className: css.budgetValue, "data-testid": "billing-budget-value", children: [money(monthCost), " / ", money(budgetAmount), " \u00B7 ", pct.toFixed(1), "%"] }));
                                                        })(), _jsx("button", { type: "button", role: "switch", "aria-checked": budgetEnabled, "aria-label": t('billing.budget'), "data-testid": "billing-budget-toggle", className: clsx(css.switch, budgetEnabled && css.switchOn), onClick: onToggleBudget, children: _jsx("span", { className: css.switchKnob }) })] })] }), _jsx("p", { className: css.budgetHint, children: t('billing.budgetHint') }), budgetEnabled && budgetAmount > 0 && (() => {
                                            const pct = (monthCost / budgetAmount) * 100;
                                            return (_jsx("div", { className: css.budgetTrack, "data-testid": "billing-budget-track", children: _jsx("div", { className: clsx(css.budgetFill, pct >= 100 && css.budgetFillOver, pct >= 80 && pct < 100 && css.budgetFillWarn), style: { width: `${Math.min(pct, 100)}%` } }) }));
                                        })()] }), _jsxs("section", { className: css.peakAlertPanel, "data-testid": "billing-peak-alert-settings", children: [_jsxs("div", { className: css.peakAlertPanelHead, children: [_jsx("span", { className: css.peakAlertPanelLabel, children: t('billing.peakAlert') }), _jsx("button", { type: "button", role: "switch", "aria-checked": peakConfig.enabled, "aria-label": t('billing.peakAlert'), "data-testid": "billing-peak-alert-toggle", className: clsx(css.switch, peakConfig.enabled && css.switchOn), onClick: () => { onPeakConfig({ ...peakConfig, enabled: !peakConfig.enabled }); }, children: _jsx("span", { className: css.switchKnob }) })] }), _jsx("p", { className: css.peakAlertHint, children: t('billing.peakAlertHint') }), peakConfig.enabled && (_jsxs("div", { className: css.peakAlertPanelBody, children: [_jsxs("label", { className: css.peakAlertField, children: [_jsx("span", { children: t('billing.peakAlertLeadMin') }), _jsx("input", { type: "number", min: 1, max: 30, step: 1, value: peakConfig.leadMin, className: css.peakAlertNum, "aria-label": t('billing.peakAlertLeadMin'), onChange: (e) => {
                                                                const v = Number(e.target.valueAsNumber);
                                                                onPeakConfig({
                                                                    ...peakConfig,
                                                                    leadMin: Number.isFinite(v) ? Math.min(30, Math.max(1, Math.round(v))) : peakConfig.leadMin,
                                                                });
                                                            } })] }), _jsxs("label", { className: css.peakAlertField, children: [_jsx("span", { children: t('billing.peakAlertPosCorner') }), _jsxs("select", { value: peakConfig.position, className: css.peakAlertSelect, onChange: (e) => { onPeakConfig({ ...peakConfig, position: e.target.value === 'center' ? 'center' : 'bottom-right' }); }, children: [_jsx("option", { value: "bottom-right", children: t('billing.peakAlertPosCorner') }), _jsx("option", { value: "center", children: t('billing.peakAlertPosCenter') })] })] }), _jsxs("label", { className: css.peakAlertField, children: [_jsx("span", { children: t('billing.peakAlert') }), _jsxs("select", { value: peakConfig.mode, className: css.peakAlertSelect, onChange: (e) => {
                                                                const m = e.target.value;
                                                                onPeakConfig({ ...peakConfig, mode: m === 'peak' || m === 'offPeak' ? m : 'both' });
                                                            }, children: [_jsx("option", { value: "both", children: t('billing.peakAlertModeBoth') }), _jsx("option", { value: "peak", children: t('billing.peakAlertModePeak') }), _jsx("option", { value: "offPeak", children: t('billing.peakAlertModeOff') })] })] }), _jsxs("label", { className: css.peakAlertCheck, children: [_jsx("input", { type: "checkbox", checked: peakConfig.webNotify, onChange: (e) => { onPeakConfig({ ...peakConfig, webNotify: e.target.checked }); } }), _jsx("span", { children: t('billing.peakAlertWebNotify') })] }), _jsx("button", { type: "button", className: css.peakAlertPreview, onClick: onPreviewPeak, children: t('billing.peakAlertPreview') })] }))] }), _jsxs("section", { className: css.budget, "data-testid": "billing-usage-stats-tool-setting", children: [_jsxs("div", { className: css.budgetHead, children: [_jsx("span", { className: css.budgetLabel, children: t('billing.usageStatsTool') }), _jsx("span", { className: css.budgetControls, children: _jsx("button", { type: "button", role: "switch", "aria-checked": usageStatsEnabled, "aria-label": t('billing.usageStatsTool'), "data-testid": "billing-usage-stats-tool-toggle", className: clsx(css.switch, usageStatsEnabled && css.switchOn), onClick: toggleUsageStats, children: _jsx("span", { className: css.switchKnob }) }) })] }), _jsx("p", { className: css.budgetHint, children: t('billing.usageStatsToolHint') })] }), _jsx(PluginInfoCard, { t: t, version: stats.pluginVersion })] })), tab === 'trends' && (_jsxs("div", { className: css.tabPanel, "data-testid": "billing-tab-panel-trends", children: [_jsxs("section", { className: clsx(css.panel, css.trendPanel), "data-testid": "billing-panel-trend", children: [_jsxs("div", { className: css.panelHead, children: [_jsx("h3", { className: css.panelTitle, children: t('billing.trend') }), renderSlot('billing.dashboard.decor', { position: 'trend' }), _jsx("span", { className: css.rangeToggle, role: "group", "aria-label": t('billing.trend'), children: [7, 30].map(days => (_jsx("button", { type: "button", className: clsx(css.rangeButton, trendDays === days && css.rangeButtonActive), "aria-pressed": trendDays === days, "data-testid": `billing-trend-${days}d`, onClick: () => { setTrendDays(days); }, children: days === 7 ? t('billing.trend7d') : t('billing.trend30d') }, days))) }), _jsx("span", { className: css.panelHint, children: latestDate })] }), _jsx(TrendChart, { data: trend, models: chartModels, currency: currency })] }), turns.length > 0 && (_jsxs("section", { className: css.panel, "data-testid": "billing-panel-rounds", children: [_jsxs("div", { className: css.panelHead, children: [_jsx("h3", { className: css.panelTitle, children: t('billing.rounds') }), roundFlags.length > 0 && (_jsxs("span", { className: css.roundsFlagBadge, "data-testid": "billing-rounds-flag-count", children: [roundFlags.length, " ", t('billing.anomaly')] }))] }), _jsx(RoundCostChart, { rounds: turns, flags: roundFlags, currency: currency, t: t })] })), turns.length > 0 && (() => {
                                    const shareTotal = peakShare.peak + peakShare.offPeak;
                                    if (shareTotal <= 0)
                                        return null;
                                    const peakPct = (peakShare.peak / shareTotal) * 100;
                                    return (_jsxs("section", { className: css.panel, "data-testid": "billing-panel-share", children: [_jsxs("div", { className: css.panelHead, children: [_jsx("h3", { className: css.panelTitle, children: t('billing.peakShare') }), _jsx("span", { className: css.panelHint, children: t('billing.peakShareHint').replace('{count}', String(turns.length)) })] }), _jsxs("div", { className: css.shareTrack, "data-testid": "billing-share-track", children: [_jsx("div", { className: clsx(css.shareSeg, css.shareSegPeak), style: { width: `${peakPct}%` } }), _jsx("div", { className: clsx(css.shareSeg, css.shareSegOff), style: { width: `${100 - peakPct}%` } })] }), _jsxs("div", { className: css.shareLegend, children: [_jsxs("span", { className: css.shareItem, children: [_jsx("span", { className: css.shareDot, style: { background: 'var(--dsw-static-blue-500)' } }), t('billing.peak'), _jsxs("span", { className: css.shareValue, "data-testid": "billing-share-peak", children: [money(peakShare.peak), " \u00B7 ", peakPct.toFixed(1), "%"] })] }), _jsxs("span", { className: css.shareItem, children: [_jsx("span", { className: css.shareDot, style: { background: 'color-mix(in srgb, var(--dsw-static-blue-500) 30%, var(--dsw-alias-bg-module-platform))' } }), t('billing.offPeak'), _jsxs("span", { className: css.shareValue, "data-testid": "billing-share-offpeak", children: [money(peakShare.offPeak), " \u00B7 ", (100 - peakPct).toFixed(1), "%"] })] })] })] }));
                                })()] })), tab === 'providers' && (_jsxs("div", { className: css.tabPanel, "data-testid": "billing-tab-panel-providers", children: [_jsxs("section", { className: css.panel, "data-testid": "billing-panel-providers", children: [_jsxs("div", { className: css.panelHead, children: [_jsx("h3", { className: css.panelTitle, children: t('billing.providerBilling') }), renderSlot('billing.dashboard.decor', { position: 'models' }), _jsx("span", { className: css.panelHint, children: stats.updatedAt !== undefined
                                                        ? `${t('billing.lastUpdated')} ${formatClock(stats.updatedAt)}`
                                                        : '' })] }), providerGroups.length === 0 ? (_jsx("div", { className: css.emptyRow, "data-testid": "billing-provider-empty", children: t('billing.noData') })) : (_jsx("div", { className: css.providerGroupList, "data-testid": "billing-provider-groups", children: providerGroups.map(group => (_jsxs("div", { className: css.providerGroup, "data-testid": "billing-provider-group", children: [_jsxs("div", { className: css.providerGroupHead, children: [_jsxs("span", { className: css.providerGroupTitle, children: [_jsx("span", { className: clsx(css.healthDot, group.dot), "aria-hidden": "true" }), _jsx("span", { className: css.providerGroupName, children: providerName(group.name) })] }), _jsxs("span", { className: css.providerGroupMeta, children: [group.subscriptions.length > 0 && (_jsxs("span", { className: css.providerGroupBadge, "data-testid": "billing-provider-sub-count", children: [group.subscriptions.length, " \u5957\u9910"] })), group.balance !== undefined && (_jsxs("span", { className: css.providerGroupBalance, "data-testid": "billing-provider-balance", children: [_jsx("span", { className: css.providerGroupBalanceLabel, children: t('billing.balance') }), renderBalance(group.balance)] }))] })] }), group.models.length > 0 && (_jsx("div", { className: clsx(css.tableScroll, css.modelTableScroll), "data-testid": "billing-table-scroll", children: _jsxs("table", { className: css.modelTable, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: t('billing.model') }), _jsx("th", { className: css.numCol, children: t('billing.calls') }), _jsx("th", { className: css.numCol, children: t('billing.inputTokens') }), _jsx("th", { className: css.numCol, children: t('billing.outputTokens') }), _jsx("th", { className: css.numCol, children: t('billing.cacheHitRate') }), _jsx("th", { className: css.numCol, children: t('billing.actual') })] }) }), _jsx("tbody", { children: group.models.map(row => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("span", { className: css.modelCell, children: _jsxs("span", { children: [_jsxs("span", { className: css.modelName, children: [row.name, row.uncatalogued && (_jsx("span", { className: css.uncataloguedTag, "data-testid": "billing-uncatalogued-tag", children: t('billing.uncatalogued') })), row.estimatedPricing && (_jsx("span", { className: css.estimatedTag, "data-testid": "billing-estimated-tag", children: t('billing.estimatedPricing') }))] }), _jsx("span", { className: css.modelProvider, children: providerName(row.provider) })] }) }) }), _jsx("td", { className: css.numCol, children: row.calls.toLocaleString() }), _jsx("td", { className: css.numCol, children: formatTokens(row.input) }), _jsx("td", { className: css.numCol, children: formatTokens(row.output) }), _jsx("td", { className: css.numCol, children: formatPercent(row.cacheHitRate) }), _jsx("td", { className: css.numCol, children: row.plan
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
                                                                        return (_jsxs("div", { className: css.subscriptionWindow, children: [_jsx("span", { className: css.subscriptionWindowLabel, children: subscriptionWindowLabel(window.kind, t) }), _jsx("span", { className: css.subscriptionTrack, "aria-hidden": "true", children: _jsx("span", { className: clsx(css.subscriptionFill, used >= 100 && css.subscriptionFillOver, used >= 80 && used < 100 && css.subscriptionFillWarn), style: { width: `${used}%` } }) }), _jsx("span", { className: clsx(css.subscriptionPct, exhausted && css.subscriptionExhausted), children: exhausted
                                                                                        ? t('billing.subscriptionExhausted')
                                                                                        : t('billing.subscriptionRemaining').replace('{pct}', String(window.remainingPercent)) }), window.resetsAt !== undefined && (_jsx("span", { className: css.subscriptionReset, children: t('billing.subscriptionReset').replace('{date}', `${localDayStamp(new Date(window.resetsAt).getTime())} ${formatClock(new Date(window.resetsAt).getTime())}`) }))] }, window.kind));
                                                                    })())] }, quota.provider));
                                                        }) }))] }, group.name))) }))] }), _jsxs("div", { className: css.exportBar, "data-testid": "billing-export-bar", role: "group", "aria-label": t('billing.export'), children: [_jsx("span", { className: css.exportLabel, children: t('billing.export') }), _jsx("button", { type: "button", className: css.exportButton, "data-testid": "billing-export-day", onClick: () => { downloadText(exportFileName('usage-daily', 'csv', Object.keys(byDay)), dayRowsCsv(byDay), 'text/csv'); }, children: t('billing.exportCsvDay') }), stats.bySession !== undefined && (_jsx("button", { type: "button", className: css.exportButton, "data-testid": "billing-export-sessions", onClick: () => { downloadText(exportFileName('usage-sessions', 'csv', Object.keys(byDay)), sessionRowsCsv(stats.bySession ?? []), 'text/csv'); }, children: t('billing.exportCsvSession') })), _jsx("button", { type: "button", className: css.exportButton, "data-testid": "billing-export-json", onClick: () => { downloadText(exportFileName('usage-stats', 'json', Object.keys(byDay)), JSON.stringify(stats, null, 2), 'application/json'); }, children: t('billing.exportJson') })] }), roleRows.length > 0 && (_jsxs("section", { className: css.panel, "data-testid": "billing-panel-roles", children: [_jsxs("div", { className: css.panelHead, children: [_jsx("h3", { className: css.panelTitle, children: t('billing.roleCost') }), _jsx("span", { className: css.panelHint, children: t('billing.roleHint') })] }), _jsx("div", { className: css.shareTrack, "data-testid": "billing-role-track", children: roleRows.map(row => (_jsx("div", { className: clsx(css.shareSeg, row.seg), style: { width: `${row.pct}%` } }, row.label))) }), _jsx("div", { className: css.shareLegend, children: roleRows.map(row => (_jsxs("span", { className: css.shareItem, children: [_jsx("span", { className: clsx(css.shareDot, row.seg) }), row.label, _jsxs("span", { className: css.shareValue, children: [money(row.value), " \u00B7 ", row.pct.toFixed(1), "%"] })] }, row.label))) })] })), bucketSummary !== undefined && (_jsxs("section", { className: css.panel, "data-testid": "billing-panel-buckets", children: [_jsx("div", { className: css.panelHead, children: _jsxs("h3", { className: css.panelTitle, children: [t('billing.official'), " / ", t('billing.thirdParty')] }) }), _jsxs("div", { className: css.bucketSummary, children: [_jsxs("div", { className: css.bucketStat, children: [_jsx("span", { className: css.bucketStatLabel, children: t('billing.official') }), _jsx("span", { className: css.bucketStatValue, children: money(bucketSummary.officialCost) }), _jsxs("span", { className: css.bucketStatSub, children: [bucketSummary.officialCalls, " ", t('billing.calls')] })] }), _jsxs("div", { className: css.bucketStat, children: [_jsx("span", { className: css.bucketStatLabel, children: t('billing.thirdParty') }), _jsx("span", { className: css.bucketStatValue, children: money(bucketSummary.thirdCost) }), _jsxs("span", { className: css.bucketStatSub, children: [bucketSummary.thirdCalls, " ", t('billing.calls')] })] })] })] })), stats.byWorkspace !== undefined && stats.byWorkspace.length > 0 && (_jsxs("section", { className: css.panel, "data-testid": "billing-panel-workspaces", children: [_jsx("div", { className: css.panelHead, children: _jsx("h3", { className: css.panelTitle, children: t('billing.workspaces') }) }), _jsx("div", { className: css.tableScroll, children: _jsxs("table", { className: css.modelTable, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: t('billing.project') }), _jsx("th", { className: css.numCol, children: t('billing.calls') }), _jsx("th", { className: css.numCol, children: t('billing.inputTokens') }), _jsx("th", { className: css.numCol, children: t('billing.outputTokens') }), _jsx("th", { className: css.numCol, children: t('billing.actual') }), _jsx("th", { className: css.numCol, children: t('billing.lastActive') })] }) }), _jsx("tbody", { children: stats.byWorkspace.map(row => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("span", { className: css.modelName, children: row.name }) }), _jsx("td", { className: css.numCol, children: row.calls.toLocaleString() }), _jsx("td", { className: css.numCol, children: formatTokens(row.input) }), _jsx("td", { className: css.numCol, children: formatTokens(row.output) }), _jsx("td", { className: css.numCol, children: money(row.cost) }), _jsx("td", { className: css.numCol, children: row.lastActive > 0 ? `${localDayStamp(row.lastActive)}` : '—' })] }, row.name))) })] }) })] })), stats.bySession !== undefined && (_jsxs("section", { className: css.panel, "data-testid": "billing-panel-sessions", children: [_jsxs("div", { className: css.panelHead, children: [_jsx("h3", { className: css.panelTitle, children: t('billing.sessions') }), _jsx("span", { className: css.panelHint, children: stats.bySession.length > SESSION_DISPLAY_LIMIT
                                                        ? t('billing.sessionOverflow')
                                                            .replace('{limit}', String(SESSION_DISPLAY_LIMIT))
                                                            .replace('{total}', String(stats.bySession.length))
                                                        : `${stats.bySession.length}` })] }), _jsx("div", { className: css.tableScroll, "data-testid": "billing-sessions-table", children: _jsxs("table", { className: css.modelTable, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: t('billing.sessions') }), _jsx("th", { children: t('billing.project') }), _jsx("th", { className: css.numCol, children: t('billing.calls') }), _jsx("th", { className: css.numCol, children: t('billing.actual') }), _jsx("th", { className: css.numCol, children: t('billing.lastActive') })] }) }), _jsxs("tbody", { children: [stats.bySession.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: css.emptyRow, children: t('billing.noData') }) })), stats.bySession.slice(0, SESSION_DISPLAY_LIMIT).map(row => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("span", { className: css.modelName, children: row.title ?? row.id.slice(0, 8) }) }), _jsx("td", { children: _jsx("span", { className: css.modelProvider, children: projectName(row.cwd) ?? '—' }) }), _jsx("td", { className: css.numCol, children: row.calls.toLocaleString() }), _jsx("td", { className: css.numCol, children: money(row.cost) }), _jsx("td", { className: css.numCol, children: row.lastActive > 0 ? `${localDayStamp(row.lastActive)} ${formatClock(row.lastActive)}` : '—' })] }, row.id)))] })] }) })] }))] })), tab === 'token' && (_jsxs("div", { className: css.tabPanel, "data-testid": "billing-tab-panel-token", children: [_jsx(TokenPanel, { stats: stats, currency: currency, trendDays: trendDays, onTrendDays: setTrendDays, t: t }), stats.perf !== undefined && (_jsxs("section", { className: css.panel, "data-testid": "billing-panel-perf", children: [_jsxs("div", { className: css.panelHead, children: [_jsx("h3", { className: css.panelTitle, children: t('billing.perfTitle') }), _jsx("span", { className: css.panelHint, children: t('billing.perfHint') })] }), _jsx(PerfPanel, { perf: stats.perf, models: chartModels, t: t })] }))] })), tab === 'pricing' && (_jsx("div", { className: css.tabPanel, "data-testid": "billing-tab-panel-pricing", children: _jsxs("section", { className: css.panel, "data-testid": "billing-panel-pricing", children: [_jsxs("div", { className: css.panelHead, children: [_jsx("h3", { className: css.panelTitle, children: t('billing.pricing') }), _jsxs("span", { className: css.panelHint, children: [t('billing.todayRate'), " 1 USD = ", formatMoney(rateInfo.rate), _jsx("span", { className: clsx(css.rateBadge, rateInfo.live ? css.rateBadgeLive : css.rateBadgeBuiltin), children: rateInfo.live ? t('billing.rateLive') : t('billing.rateBuiltin') })] })] }), _jsx("p", { className: css.pricingTip, children: t('billing.pricingTip') }), _jsx("div", { className: css.tableScroll, children: _jsxs("table", { className: css.pricingTable, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Model" }), _jsx("th", { className: css.numCol, children: t('billing.input') }), _jsx("th", { className: css.numCol, children: t('billing.cacheHit') }), _jsx("th", { className: css.numCol, children: t('billing.output') }), _jsx("th", { children: t('billing.band') })] }) }), _jsx("tbody", { children: catalogEntries().map((entry) => {
                                                        const hasPrice = entry.price.input > 0 || entry.price.output > 0;
                                                        return (_jsxs("tr", { children: [_jsx("td", { children: _jsxs("span", { className: css.modelCell, children: [_jsx("span", { className: css.modelDot, style: { background: resolveToken(entry.colorVar) } }), _jsxs("span", { children: [_jsxs("span", { className: css.modelName, children: [entry.name, entry.uncatalogued && (_jsx("span", { className: css.uncataloguedTag, "data-testid": "billing-price-uncatalogued", children: t('billing.uncatalogued') }))] }), _jsx("span", { className: css.modelProvider, children: providerName(entry.provider) })] })] }) }), _jsx("td", { className: css.numCol, children: hasPrice ? entry.price.offPeak !== undefined
                                                                        ? (_jsxs("span", { className: css.bandPrice, children: [_jsx("span", { children: unitMoney(entry.price.input, entry.price.currency) }), _jsx("span", { className: css.bandPriceOff, children: unitMoney(entry.price.offPeak.input, entry.price.currency) })] }))
                                                                        : unitMoney(entry.price.input, entry.price.currency)
                                                                        : _jsx("span", { className: css.na, children: "\u2014" }) }), _jsx("td", { className: css.numCol, children: hasPrice ? entry.price.offPeak !== undefined
                                                                        ? (_jsxs("span", { className: css.bandPrice, children: [_jsx("span", { children: unitMoney(entry.price.cacheHit, entry.price.currency) }), _jsx("span", { className: css.bandPriceOff, children: unitMoney(entry.price.offPeak.cacheHit, entry.price.currency) })] }))
                                                                        : unitMoney(entry.price.cacheHit, entry.price.currency)
                                                                        : _jsx("span", { className: css.na, children: "\u2014" }) }), _jsx("td", { className: css.numCol, children: hasPrice ? entry.price.offPeak !== undefined
                                                                        ? (_jsxs("span", { className: css.bandPrice, children: [_jsx("span", { children: unitMoney(entry.price.output, entry.price.currency) }), _jsx("span", { className: css.bandPriceOff, children: unitMoney(entry.price.offPeak.output, entry.price.currency) })] }))
                                                                        : unitMoney(entry.price.output, entry.price.currency)
                                                                        : _jsx("span", { className: css.na, children: "\u2014" }) }), _jsx("td", { children: entry.price.offPeak !== undefined && entry.peakHours !== undefined
                                                                        ? (_jsxs("span", { className: css.bandTag, children: [_jsxs("span", { children: [t('billing.peak'), " ", entry.peakHours] }), _jsxs("span", { className: css.bandTagOff, children: [t('billing.offPeak'), " 50%"] })] }))
                                                                        : _jsx("span", { className: css.flatTag, children: t('billing.flat') }) })] }, entry.key));
                                                    }) })] }) })] }) })), renderSlot('billing.dashboard.decor', { position: 'footer' })] })] }) }));
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
    const [quotas, setQuotas] = useState([]);
    const [currency, setCurrency] = useState('cny');
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
        void fetchBalances().then((list) => {
            if (list.length > 0)
                setBalances(list);
        });
        void fetchSubscriptions().then((list) => {
            if (list.length > 0)
                setQuotas(list);
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
        const upcoming = computePeakAlert(Date.now(), peakConfig, lastTierSwitchAt);
        if (upcoming === null)
            return;
        actions.markTierSwitchAlerted(upcoming.atMs);
        setPeakHit(upcoming);
        if (!peakConfig.webNotify)
            return;
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted')
            return;
        const minutes = Math.max(1, Math.round((upcoming.atMs - Date.now()) / 60_000));
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
    }, [lastTierSwitchAt, peakConfig, actions, t]);
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
    // 费用摘要始终写入计费指标服务：服务与槽位一样按「无消费者即空转」设计，
    // 主题插件（如 StickerPad）存在时自行读取，缺席时发布无害。
    useEffect(() => {
        publishCosts({ todayCost, monthCost });
    }, [todayCost, monthCost, publishCosts]);
    // dashboard 打开回调同样始终注册，供主题插件（如 StickerPad）触发。
    useEffect(() => registerOpen(openDashboard), [registerOpen, openDashboard]);
    // 每轮费用明细：服务端按起始时间倒序下发；旧快照缺失时为空数组（面板不出现）。
    const turns = useMemo(() => stats.byTurn ?? [], [stats.byTurn]);
    return (_jsxs(_Fragment, { children: [_jsx(UsageBillingTrigger, { ...props, t: t, onOpen: openDashboard, monthCost: monthCost, todayCost: todayCost, weekCost: weekCost, days: last7 }), open && (_jsx(BillingDashboard, { stats: stats, t: t, onClose: close, health: health, balances: balances, quotas: quotas, currency: currency, onCurrency: setCurrency, turns: turns, renderSlot: renderSlot, budgetEnabled: budgetEnabled, budgetAmount: effectiveBudget, onToggleBudget: toggleBudget, onBudgetAmount: actions.setAmount, peakConfig: peakConfig, onPeakConfig: updatePeakConfig, onPreviewPeak: previewPeak })), (peakHit !== null || peakPreview !== null) && (_jsx(PeakAlertBanner, { hit: (peakHit ?? peakPreview), config: peakConfig, t: t, onDismiss: () => { setPeakHit(null); setPeakPreview(null); } }))] }));
}
//# sourceMappingURL=UsageBilling.js.map