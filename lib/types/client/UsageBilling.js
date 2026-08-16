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
import { TrendChart } from "./TrendChart.js";
import { applyLivePricing, computeCost, formatMoney, formatPercent, formatTokens, formatUnitPrice, getRateInfo, isSubscriptionPlan, MODEL_CATALOG, modelOf, resolveToken, } from "./pricing.js";
import css from './UsageBilling.module.css';
/** Idle health state before the probe settles. */
const IDLE_HEALTH = {
    checked: false, available: false, providers: 0, failures: 0,
    okProviders: [], badProviders: [],
};
/**
 * The dashboard's display names (中文厂商名) never equal the provider names a
 * user actually configures (deepseek, zhipu, qwen…), so the dot match also
 * accepts a bidirectional substring hit and a display-name alias list.
 */
const PROVIDER_ALIASES = {
    'DeepSeek': ['deepseek'],
    '智谱 AI': ['zhipu', 'glm', 'z.ai'],
    '阿里通义': ['qwen', 'tongyi', 'dashscope', 'aliyun'],
    '字节豆包': ['doubao', 'volcengine', 'ark'],
    '月之暗面': ['moonshot', 'kimi'],
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
/** Path to the usage-stats endpoint served by this plugin's node half. */
const USAGE_STATS_PATH = '/api/billing/usage-stats';
/** Path to the live-pricing endpoint served by this plugin's node half. */
const PRICING_PATH = '/api/billing/pricing';
/** Path to the account-balance endpoint served by this plugin's node half. */
const BALANCE_PATH = '/api/billing/balance';
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
    total: { calls: 0, input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cost: 0 },
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
 * Sidebar footer trigger: compact pill in wide mode, icon in rail mode.
 * @param props - framework props plus `wide` column state.
 */
function UsageBillingTrigger(props) {
    const { wide, t, onOpen, monthCost, todayCost } = props;
    // 银行卡 icon：计费语义，窄栏与宽栏共用。
    const cardIcon = (_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "aria-hidden": "true", children: [_jsx("rect", { x: "2.5", y: "5", width: "19", height: "14", rx: "2.5" }), _jsx("path", { d: "M2.5 9.5h19" }), _jsx("rect", { x: "6", y: "12", width: "4", height: "3.5", rx: "0.75" })] }));
    if (!wide) {
        return (_jsx("button", { type: "button", className: css.railButton, onClick: onOpen, title: `${t('billing.title')} · ${formatMoney(monthCost)}`, children: cardIcon }));
    }
    return (_jsxs("button", { type: "button", className: css.trigger, onClick: onOpen, title: `${t('billing.title')} · 本月 ${formatMoney(monthCost)}`, children: [_jsx("span", { className: css.triggerIcon, children: cardIcon }), _jsxs("span", { className: css.triggerToday, children: [_jsx("span", { className: css.triggerMeta, children: "\u4ECA\u65E5" }), _jsx("span", { className: css.triggerAmount, children: formatMoney(todayCost) })] }), _jsx("span", { className: css.triggerDivider }), _jsxs("span", { className: css.triggerMonth, children: [_jsx("span", { className: css.triggerMeta, children: "\u5F53\u6708" }), _jsx("span", { className: css.triggerAmountSub, children: formatMoney(monthCost) })] })] }));
}
/**
 * The centered billing dashboard modal.
 * @param props - stats, locale function, close handler, model health, balances.
 */
function BillingDashboard({ stats, t, onClose, health, balances }) {
    const { total, byModel, byDay } = stats;
    // Pricing table starts collapsed; the billing table stays open.
    const [pricingOpen, setPricingOpen] = useState(false);
    // 当前汇率与来源：供单价表标题展示（实时 / 内置）。
    const rateInfo = getRateInfo();
    // 按提供方归一化匹配余额（deepseek ↔ DeepSeek）。
    const balanceFor = (provider) => balances.find(balance => normalizeProvider(balance.provider) === normalizeProvider(provider));
    // 余额列单元格：按查询状态渲染金额或占位文案。
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
        return balance.currency === 'USD'
            ? `$${balance.totalBalance.toFixed(2)}`
            : formatMoney(balance.totalBalance);
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
    // 最近 7 天窗口（含今天）：不足一周的日期补零，图表固定为整周。
    const trendDates = useMemo(() => {
        const out = [];
        for (let offset = 6; offset >= 0; offset -= 1) {
            const day = new Date();
            day.setDate(day.getDate() - offset);
            out.push(localDayStamp(day.getTime()));
        }
        return out;
    }, []);
    const latestDate = trendDates.at(-1) ?? today;
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
        const buckets = {
            input: data.input,
            cacheHit: data.cacheHit,
            cacheMiss: data.cacheMiss,
            output: data.output,
        };
        return {
            key,
            name: entry.name,
            provider: entry.provider,
            calls: data.calls,
            input: data.input,
            output: data.output,
            cacheHitRate: data.cacheHit + data.cacheMiss > 0
                ? (data.cacheHit / (data.cacheHit + data.cacheMiss)) * 100
                : 0,
            estimated: computeCost(entry, buckets),
            plan: isSubscriptionPlan(key),
            // exactOptionalPropertyTypes: absent actual when the stats carry none.
            ...(data.cost > 0 ? { actual: data.cost } : {}),
        };
    })
        .sort((a, b) => (b.actual ?? b.estimated) - (a.actual ?? a.estimated))
        .map((row, index) => ({
        ...row,
        color: CHART_PALETTE[index % CHART_PALETTE.length] ?? '#8b95a3',
    })), [byModel]);
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
    return (_jsx(Modal, { open: true, onClose: onClose, title: t('billing.title'), headless: true, className: css.dashboardModal ?? '', children: _jsxs("div", { className: css.dashboard, children: [_jsxs("div", { className: css.dashboardHead, children: [_jsxs("div", { children: [_jsx("h2", { className: css.dashboardTitle, children: t('billing.title') }), _jsxs("p", { className: css.dashboardSubtitle, children: [t('billing.lastUpdated'), " ", latestDate] })] }), _jsxs("div", { className: css.dashboardRight, children: [health.checked && (_jsxs("span", { className: clsx(css.healthBadge, health.available ? css.healthBadgeOk : css.healthBadgeBad), children: [_jsx("span", { className: clsx(css.healthDot, health.available ? css.healthOk : css.healthBad), "aria-hidden": "true" }), health.available
                                            ? `${health.providers} 模型可用${health.failures > 0 ? ` · ${health.failures} 失效` : ''}`
                                            : `${health.failures} 模型不可用`] })), _jsx("button", { type: "button", className: css.closeButton, "aria-label": t('billing.close'), onClick: onClose, children: _jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "aria-hidden": "true", children: [_jsx("path", { d: "M18 6 6 18" }), _jsx("path", { d: "m6 6 12 12" })] }) })] })] }), _jsxs("div", { className: css.dashboardBody, children: [_jsxs("section", { className: css.hero, children: [_jsxs("div", { className: css.heroMain, children: [_jsx("span", { className: css.heroLabel, children: t('billing.monthCost') }), _jsx("span", { className: css.heroValue, children: formatMoney(monthCost) }), _jsxs("span", { className: css.heroMeta, children: [monthCalls.toLocaleString(), " ", t('billing.calls')] })] }), _jsxs("div", { className: css.heroSide, children: [_jsxs("div", { className: css.heroSideItem, children: [_jsx("span", { className: css.heroSideLabel, children: t('billing.yearCost') }), _jsx("span", { className: css.heroSideValue, children: formatMoney(yearCost) })] }), _jsxs("div", { className: css.heroSideItem, children: [_jsx("span", { className: css.heroSideLabel, children: t('billing.todayCost') }), _jsxs("span", { className: css.heroSideValue, children: [formatMoney(todayCost), _jsxs("span", { className: clsx(css.delta, deltaPct >= 0 ? css.deltaUp : css.deltaDown), children: [deltaPct >= 0 ? '▲' : '▼', " ", Math.abs(deltaPct).toFixed(1), "%"] })] })] })] })] }), _jsxs("section", { className: css.kpiGrid, children: [_jsxs("div", { className: css.kpiTile, children: [_jsx("span", { className: css.kpiLabel, children: t('billing.cacheHitRate') }), _jsx("span", { className: clsx(css.kpiValue, css.kpiGreen), children: formatPercent(cacheHitRate) }), _jsxs("span", { className: css.kpiDetail, children: [formatTokens(total.cacheHit), " / ", formatTokens(total.cacheHit + total.cacheMiss)] })] }), _jsxs("div", { className: css.kpiTile, children: [_jsx("span", { className: css.kpiLabel, children: t('billing.tokens') }), _jsx("span", { className: css.kpiValue, children: formatTokens(total.input + total.output) }), _jsxs("span", { className: css.kpiDetail, children: [t('billing.inputTokens'), " ", formatTokens(total.input), " \u00B7 ", t('billing.outputTokens'), " ", formatTokens(total.output)] })] }), _jsxs("div", { className: css.kpiTile, children: [_jsx("span", { className: css.kpiLabel, children: t('billing.avgCost') }), _jsx("span", { className: css.kpiValue, children: formatMoney(avgPerCall) }), _jsxs("span", { className: css.kpiDetail, children: [t('billing.calls'), " ", total.calls.toLocaleString()] })] }), _jsxs("div", { className: css.kpiTile, children: [_jsx("span", { className: css.kpiLabel, children: t('billing.calls') }), _jsx("span", { className: css.kpiValue, children: total.calls.toLocaleString() }), _jsxs("span", { className: css.kpiDetail, children: [modelRows.length, " ", t('billing.models')] })] })] }), _jsxs("section", { className: css.panel, children: [_jsxs("div", { className: css.panelHead, children: [_jsx("h3", { className: css.panelTitle, children: t('billing.trend') }), _jsx("span", { className: css.panelHint, children: latestDate })] }), _jsx(TrendChart, { data: trend, models: chartModels })] }), _jsxs("section", { className: css.panel, children: [_jsxs("div", { className: css.panelHead, children: [_jsx("h3", { className: css.panelTitle, children: t('billing.models') }), _jsxs("span", { className: css.panelHint, children: [t('billing.actual'), " \u00B7 ", t('billing.balance')] })] }), _jsx("div", { className: css.tableScroll, children: _jsxs("table", { className: css.modelTable, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: t('billing.models') }), _jsx("th", { className: css.numCol, children: t('billing.calls') }), _jsx("th", { className: css.numCol, children: t('billing.inputTokens') }), _jsx("th", { className: css.numCol, children: t('billing.outputTokens') }), _jsx("th", { className: css.numCol, children: t('billing.cacheHitRate') }), _jsx("th", { className: css.numCol, children: t('billing.actual') }), _jsx("th", { className: css.numCol, children: t('billing.balance') })] }) }), _jsxs("tbody", { children: [modelRows.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 7, className: css.emptyRow, children: t('billing.noData') }) })), modelRows.map(row => (_jsxs("tr", { children: [_jsx("td", { children: _jsxs("span", { className: css.modelCell, children: [_jsx("span", { className: clsx(css.modelDot, providerDot(health, row.provider)), "aria-hidden": "true" }), _jsxs("span", { children: [_jsx("span", { className: css.modelName, children: row.name }), _jsx("span", { className: css.modelProvider, children: row.provider })] })] }) }), _jsx("td", { className: css.numCol, children: row.calls.toLocaleString() }), _jsx("td", { className: css.numCol, children: formatTokens(row.input) }), _jsx("td", { className: css.numCol, children: formatTokens(row.output) }), _jsx("td", { className: css.numCol, children: formatPercent(row.cacheHitRate) }), _jsx("td", { className: css.numCol, children: row.plan
                                                                    ? _jsx("span", { className: css.planTag, children: "\u8BA2\u9605\u5305\u542B" })
                                                                    : row.actual !== undefined ? formatMoney(row.actual) : _jsx("span", { className: css.na, children: "\u2014" }) }), _jsx("td", { className: css.numCol, children: renderBalance(balanceFor(row.provider)) })] }, row.key)))] })] }) })] }), _jsxs("section", { className: css.panel, children: [_jsxs("button", { type: "button", className: css.pricingToggle, onClick: () => { setPricingOpen(prev => !prev); }, "aria-expanded": pricingOpen, children: [_jsxs("span", { className: css.pricingToggleText, children: [_jsx("span", { className: css.panelTitle, children: t('billing.pricing') }), _jsxs("span", { className: css.panelHint, children: [t('billing.todayRate'), " 1 USD = ", formatMoney(rateInfo.rate), _jsx("span", { className: clsx(css.rateBadge, rateInfo.live ? css.rateBadgeLive : css.rateBadgeBuiltin), children: rateInfo.live ? t('billing.rateLive') : t('billing.rateBuiltin') })] })] }), _jsx("svg", { className: clsx(css.pricingChevron, pricingOpen && css.pricingChevronOpen), viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "aria-hidden": "true", children: _jsx("path", { d: "m6 9 6 6 6-6" }) })] }), pricingOpen && (_jsx("div", { className: css.tableScroll, children: _jsxs("table", { className: css.pricingTable, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Model" }), _jsx("th", { className: css.numCol, children: t('billing.input') }), _jsx("th", { className: css.numCol, children: t('billing.cacheHit') }), _jsx("th", { className: css.numCol, children: t('billing.output') }), _jsx("th", { children: t('billing.band') })] }) }), _jsx("tbody", { children: MODEL_CATALOG.map(entry => (_jsxs("tr", { children: [_jsx("td", { children: _jsxs("span", { className: css.modelCell, children: [_jsx("span", { className: css.modelDot, style: { background: resolveToken(entry.colorVar) } }), _jsxs("span", { children: [_jsx("span", { className: css.modelName, children: entry.name }), _jsx("span", { className: css.modelProvider, children: entry.provider })] })] }) }), _jsx("td", { className: css.numCol, children: entry.price.offPeak !== undefined
                                                                ? (_jsxs("span", { className: css.bandPrice, children: [_jsx("span", { children: formatUnitPrice(entry.price.input, entry.price.currency) }), _jsx("span", { className: css.bandPriceOff, children: formatUnitPrice(entry.price.offPeak.input, entry.price.currency) })] }))
                                                                : formatUnitPrice(entry.price.input, entry.price.currency) }), _jsx("td", { className: css.numCol, children: entry.price.offPeak !== undefined
                                                                ? (_jsxs("span", { className: css.bandPrice, children: [_jsx("span", { children: formatUnitPrice(entry.price.cacheHit, entry.price.currency) }), _jsx("span", { className: css.bandPriceOff, children: formatUnitPrice(entry.price.offPeak.cacheHit, entry.price.currency) })] }))
                                                                : formatUnitPrice(entry.price.cacheHit, entry.price.currency) }), _jsx("td", { className: css.numCol, children: entry.price.offPeak !== undefined
                                                                ? (_jsxs("span", { className: css.bandPrice, children: [_jsx("span", { children: formatUnitPrice(entry.price.output, entry.price.currency) }), _jsx("span", { className: css.bandPriceOff, children: formatUnitPrice(entry.price.offPeak.output, entry.price.currency) })] }))
                                                                : formatUnitPrice(entry.price.output, entry.price.currency) }), _jsx("td", { children: entry.price.offPeak !== undefined && entry.peakHours !== undefined
                                                                ? (_jsxs("span", { className: css.bandTag, children: [_jsxs("span", { children: [t('billing.peak'), " ", entry.peakHours] }), _jsxs("span", { className: css.bandTagOff, children: [t('billing.offPeak'), " 50%"] })] }))
                                                                : _jsx("span", { className: css.flatTag, children: t('billing.flat') }) })] }, entry.key))) })] }) }))] })] })] }) }));
}
/**
 * UsageBilling: sidebar trigger plus the billing dashboard modal.
 * @param props - framework-provided sidebar and locale props.
 */
export function UsageBilling(props) {
    const { t, checkModels } = props;
    // Start empty; swap in real host data when the server serves valid JSON.
    const [stats, setStats] = useState(EMPTY_STATS);
    const [health, setHealth] = useState(IDLE_HEALTH);
    const [balances, setBalances] = useState([]);
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
    // answers its model catalog (live credentials), red when none do.
    useEffect(() => {
        let mounted = true;
        void checkModels().then((result) => {
            if (mounted)
                setHealth(result);
        });
        return () => { mounted = false; };
    }, [checkModels]);
    const today = localDayStamp();
    // 触发胶囊的主数字：当月累计（byDay 按 YYYY-MM 前缀归并）。
    const monthCost = Object.entries(stats.byDay)
        .filter(([date]) => date.startsWith(today.slice(0, 7)))
        .reduce((sum, [, day]) => sum + day.cost, 0);
    return (_jsxs(_Fragment, { children: [_jsx(UsageBillingTrigger, { ...props, onOpen: openDashboard, monthCost: monthCost, todayCost: stats.byDay[today]?.cost ?? 0 }), open && (_jsx(BillingDashboard, { stats: stats, t: t, onClose: close, health: health, balances: balances }))] }));
}
//# sourceMappingURL=UsageBilling.js.map