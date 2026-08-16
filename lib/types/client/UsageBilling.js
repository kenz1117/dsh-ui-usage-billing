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
import { computeCost, formatMoney, formatPercent, formatTokens, formatUnitPrice, isSubscriptionPlan, MODEL_CATALOG, modelOf, resolveToken, } from "./pricing.js";
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
/** Empty snapshot: shown before (or without) real host data — zeros, never fabricated samples. */
const EMPTY_STATS = {
    total: { calls: 0, input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cost: 0 },
    byModel: {},
    byDay: {},
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
        if (parsed !== null && typeof parsed === 'object' && 'total' in parsed) {
            return parsed;
        }
        return null;
    }
    catch {
        return null;
    }
}
/**
 * Sidebar footer trigger: compact pill in wide mode, icon in rail mode.
 * @param props - framework props plus `wide` column state.
 */
function UsageBillingTrigger(props) {
    const { wide, onOpen, totalCost, todayCost } = props;
    if (!wide) {
        return (_jsx("button", { type: "button", className: css.railButton, onClick: onOpen, title: formatMoney(totalCost), children: _jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "aria-hidden": "true", children: _jsx("path", { d: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" }) }) }));
    }
    return (_jsxs("button", { type: "button", className: css.trigger, onClick: onOpen, children: [_jsx("span", { className: css.triggerIcon, children: _jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "aria-hidden": "true", children: _jsx("path", { d: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" }) }) }), _jsxs("span", { className: css.triggerText, children: [_jsx("span", { className: css.triggerLabel, children: "\u8BA1\u8D39\u4EEA\u8868\u76D8" }), _jsxs("span", { className: css.triggerMeta, children: ["\u603B\u8BA1 ", _jsx("strong", { children: formatMoney(totalCost) }), todayCost > 0 && _jsxs("em", { children: ["\u4ECA\u65E5 ", formatMoney(todayCost)] })] })] }), _jsx("svg", { className: css.triggerChevron, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "aria-hidden": "true", children: _jsx("path", { d: "m9 6 6 6-6 6" }) })] }));
}
/**
 * The centered billing dashboard modal.
 * @param props - stats, locale function, close handler, and model health.
 */
function BillingDashboard({ stats, t, onClose, health }) {
    const { total, byModel, byDay } = stats;
    // Pricing table starts collapsed; the billing table stays open.
    const [pricingOpen, setPricingOpen] = useState(false);
    const cacheHitRate = total.cacheHit + total.cacheMiss > 0
        ? (total.cacheHit / (total.cacheHit + total.cacheMiss)) * 100
        : 0;
    // Latest date from the day series (real data when served, demo otherwise).
    const dates = Object.keys(byDay).sort();
    const latestDate = dates.at(-1) ?? '';
    const today = new Date().toISOString().slice(0, 10);
    const todayCost = byDay[today]?.cost ?? 0;
    // Trend series for the SVG chart.
    const trend = useMemo(() => dates.map(date => ({
        date,
        cost: byDay[date].cost,
        calls: byDay[date].calls,
    })), [dates, byDay]);
    // Model rows: estimated cost from the pricing catalog, actual from stats.
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
            color: resolveToken(entry.colorVar),
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
        .sort((a, b) => (b.actual ?? b.estimated) - (a.actual ?? a.estimated)), [byModel]);
    // Total: real stats value when present, otherwise the estimated sum.
    const estimatedTotal = modelRows.reduce((sum, row) => sum + row.estimated, 0);
    const displayTotal = total.cost > 0 ? total.cost : estimatedTotal;
    const avgPerCall = total.calls > 0 ? displayTotal / total.calls : 0;
    // Range summary for the hero delta.
    const prevDayCost = trend.length >= 2 ? trend[trend.length - 2].cost : 0;
    const deltaPct = prevDayCost > 0 ? ((todayCost - prevDayCost) / prevDayCost) * 100 : 0;
    return (_jsx(Modal, { open: true, onClose: onClose, title: t('billing.title'), headless: true, className: css.dashboardModal ?? '', children: _jsxs("div", { className: css.dashboard, children: [_jsxs("div", { className: css.dashboardHead, children: [_jsxs("div", { children: [_jsx("h2", { className: css.dashboardTitle, children: t('billing.title') }), _jsxs("p", { className: css.dashboardSubtitle, children: [t('billing.lastUpdated'), " ", latestDate] })] }), _jsxs("div", { className: css.dashboardRight, children: [health.checked && (_jsxs("span", { className: clsx(css.healthBadge, health.available ? css.healthBadgeOk : css.healthBadgeBad), children: [_jsx("span", { className: clsx(css.healthDot, health.available ? css.healthOk : css.healthBad), "aria-hidden": "true" }), health.available
                                            ? `${health.providers} 模型可用${health.failures > 0 ? ` · ${health.failures} 失效` : ''}`
                                            : `${health.failures} 模型不可用`] })), _jsx("button", { type: "button", className: css.closeButton, "aria-label": t('billing.close'), onClick: onClose, children: _jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "aria-hidden": "true", children: [_jsx("path", { d: "M18 6 6 18" }), _jsx("path", { d: "m6 6 12 12" })] }) })] })] }), _jsxs("div", { className: css.dashboardBody, children: [_jsxs("section", { className: css.hero, children: [_jsxs("div", { className: css.heroMain, children: [_jsx("span", { className: css.heroLabel, children: t('billing.totalCost') }), _jsx("span", { className: css.heroValue, children: formatMoney(displayTotal) }), _jsxs("span", { className: css.heroMeta, children: [total.calls.toLocaleString(), " ", t('billing.calls'), total.cost > 0 && _jsx("em", { children: "\u00B7 \u5B9E\u9645" })] })] }), _jsx("div", { className: css.heroDivider }), _jsx("div", { className: css.heroSide, children: _jsxs("div", { className: css.heroSideItem, children: [_jsx("span", { className: css.heroSideLabel, children: t('billing.todayCost') }), _jsx("span", { className: css.heroSideValue, children: formatMoney(todayCost) }), _jsxs("span", { className: clsx(css.delta, deltaPct >= 0 ? css.deltaUp : css.deltaDown), children: [deltaPct >= 0 ? '▲' : '▼', " ", Math.abs(deltaPct).toFixed(1), "%"] })] }) })] }), _jsxs("section", { className: css.kpiGrid, children: [_jsxs("div", { className: css.kpiTile, children: [_jsx("span", { className: css.kpiLabel, children: t('billing.cacheHitRate') }), _jsx("span", { className: clsx(css.kpiValue, css.kpiGreen), children: formatPercent(cacheHitRate) }), _jsxs("span", { className: css.kpiDetail, children: [formatTokens(total.cacheHit), " / ", formatTokens(total.cacheHit + total.cacheMiss)] })] }), _jsxs("div", { className: css.kpiTile, children: [_jsx("span", { className: css.kpiLabel, children: t('billing.tokens') }), _jsx("span", { className: css.kpiValue, children: formatTokens(total.input + total.output) }), _jsxs("span", { className: css.kpiDetail, children: [t('billing.inputTokens'), " ", formatTokens(total.input), " \u00B7 ", t('billing.outputTokens'), " ", formatTokens(total.output)] })] }), _jsxs("div", { className: css.kpiTile, children: [_jsx("span", { className: css.kpiLabel, children: t('billing.avgCost') }), _jsx("span", { className: css.kpiValue, children: formatMoney(avgPerCall) }), _jsxs("span", { className: css.kpiDetail, children: [t('billing.calls'), " ", total.calls.toLocaleString()] })] }), _jsxs("div", { className: css.kpiTile, children: [_jsx("span", { className: css.kpiLabel, children: t('billing.calls') }), _jsx("span", { className: css.kpiValue, children: total.calls.toLocaleString() }), _jsxs("span", { className: css.kpiDetail, children: [modelRows.length, " ", t('billing.models')] })] })] }), _jsxs("section", { className: css.panel, children: [_jsxs("div", { className: css.panelHead, children: [_jsx("h3", { className: css.panelTitle, children: t('billing.trend') }), _jsx("span", { className: css.panelHint, children: latestDate })] }), _jsx(TrendChart, { data: trend })] }), _jsxs("section", { className: css.panel, children: [_jsxs("div", { className: css.panelHead, children: [_jsx("h3", { className: css.panelTitle, children: t('billing.models') }), _jsxs("span", { className: css.panelHint, children: [t('billing.estimated'), " \u00B7 ", t('billing.pricePerM')] })] }), _jsx("div", { className: css.tableScroll, children: _jsxs("table", { className: css.modelTable, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: t('billing.models') }), _jsx("th", { className: css.numCol, children: t('billing.calls') }), _jsx("th", { className: css.numCol, children: t('billing.inputTokens') }), _jsx("th", { className: css.numCol, children: t('billing.outputTokens') }), _jsx("th", { className: css.numCol, children: t('billing.cacheHitRate') }), _jsx("th", { className: css.numCol, children: t('billing.estimated') }), _jsx("th", { className: css.numCol, children: t('billing.actual') })] }) }), _jsxs("tbody", { children: [modelRows.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 7, className: css.emptyRow, children: t('billing.noData') }) })), modelRows.map(row => (_jsxs("tr", { children: [_jsx("td", { children: _jsxs("span", { className: css.modelCell, children: [_jsx("span", { className: clsx(css.modelDot, providerDot(health, row.provider)), "aria-hidden": "true" }), _jsxs("span", { children: [_jsx("span", { className: css.modelName, children: row.name }), _jsx("span", { className: css.modelProvider, children: row.provider })] })] }) }), _jsx("td", { className: css.numCol, children: row.calls.toLocaleString() }), _jsx("td", { className: css.numCol, children: formatTokens(row.input) }), _jsx("td", { className: css.numCol, children: formatTokens(row.output) }), _jsx("td", { className: css.numCol, children: formatPercent(row.cacheHitRate) }), _jsx("td", { className: clsx(css.numCol, css.costCol), children: row.plan ? _jsx("span", { className: css.planTag, children: "\u8BA2\u9605\u5305\u542B" }) : formatMoney(row.estimated) }), _jsx("td", { className: css.numCol, children: row.plan
                                                                    ? _jsx("span", { className: css.planTag, children: "\u8BA2\u9605\u5305\u542B" })
                                                                    : row.actual !== undefined ? formatMoney(row.actual) : _jsx("span", { className: css.na, children: "\u2014" }) })] }, row.key)))] })] }) })] }), _jsxs("section", { className: css.panel, children: [_jsxs("button", { type: "button", className: css.pricingToggle, onClick: () => { setPricingOpen(prev => !prev); }, "aria-expanded": pricingOpen, children: [_jsxs("span", { className: css.pricingToggleText, children: [_jsx("span", { className: css.panelTitle, children: t('billing.pricing') }), _jsx("span", { className: css.panelHint, children: t('billing.pricePerM') })] }), _jsx("svg", { className: clsx(css.pricingChevron, pricingOpen && css.pricingChevronOpen), viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "aria-hidden": "true", children: _jsx("path", { d: "m6 9 6 6 6-6" }) })] }), pricingOpen && (_jsx("div", { className: css.tableScroll, children: _jsxs("table", { className: css.pricingTable, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Model" }), _jsx("th", { className: css.numCol, children: t('billing.input') }), _jsx("th", { className: css.numCol, children: t('billing.cacheHit') }), _jsx("th", { className: css.numCol, children: t('billing.output') }), _jsx("th", { children: t('billing.band') })] }) }), _jsx("tbody", { children: MODEL_CATALOG.map(entry => (_jsxs("tr", { children: [_jsx("td", { children: _jsxs("span", { className: css.modelCell, children: [_jsx("span", { className: css.modelDot, style: { background: resolveToken(entry.colorVar) } }), _jsxs("span", { children: [_jsx("span", { className: css.modelName, children: entry.name }), _jsx("span", { className: css.modelProvider, children: entry.provider })] })] }) }), _jsx("td", { className: css.numCol, children: entry.price.offPeak !== undefined
                                                                ? (_jsxs("span", { className: css.bandPrice, children: [_jsx("span", { children: formatUnitPrice(entry.price.input, entry.price.currency) }), _jsx("span", { className: css.bandPriceOff, children: formatUnitPrice(entry.price.offPeak.input, entry.price.currency) })] }))
                                                                : formatUnitPrice(entry.price.input, entry.price.currency) }), _jsx("td", { className: css.numCol, children: entry.price.offPeak !== undefined && entry.price.offPeak.cacheHit !== undefined
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
    const [open, setOpen] = useState(false);
    const close = useCallback(() => { setOpen(false); }, []);
    const openDashboard = useCallback(() => { setOpen(true); }, []);
    // Load stats on mount.
    useEffect(() => {
        let mounted = true;
        void loadUsageStats().then(data => {
            if (mounted && data !== null)
                setStats(data);
        });
        return () => { mounted = false; };
    }, []);
    // Probe connected models: the sidebar dot turns green when any provider
    // answers its model catalog (live credentials), red when none do.
    useEffect(() => {
        let mounted = true;
        void checkModels().then(result => {
            if (mounted)
                setHealth(result);
        });
        return () => { mounted = false; };
    }, [checkModels]);
    const today = new Date().toISOString().slice(0, 10);
    return (_jsxs(_Fragment, { children: [_jsx(UsageBillingTrigger, { ...props, onOpen: openDashboard, totalCost: stats.total.cost > 0 ? stats.total.cost : 0, todayCost: stats.byDay[today]?.cost ?? 0 }), open && (_jsx(BillingDashboard, { stats: stats, t: t, onClose: close, health: health }))] }));
}
//# sourceMappingURL=UsageBilling.js.map