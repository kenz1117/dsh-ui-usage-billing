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
import { RoundCostChart } from "./round-chart.js";
import { UsageHeatmap } from "./heatmap.js";
import { flagAnomalies } from "./anomaly.js";
import { applyLivePricing, cnyToUsd, computeCost, formatMoney, formatPercent, formatTokens, formatUnitPrice, getRateInfo, MODEL_CATALOG, modelOf, resolveToken, } from "./pricing.js";
import css from './UsageBilling.module.css';
/** 会话明细面板最多展示的行数（完整长尾在服务端另有一层封顶）。 */
const SESSION_DISPLAY_LIMIT = 20;
/**
 * Tab 定义（顺序即渲染顺序）：概览=主数字/预算/KPI/热力图，趋势=趋势图/每轮费用，
 * 厂商=厂商计费与订阅，明细=工作区/会话明细，单价=模型单价表。导出供测试断言
 * tab 与文案 key 对齐、decor 锚点落在正确分区。
 */
export const DASHBOARD_TABS = [
    { id: 'overview', labelKey: 'billing.tabOverview' },
    { id: 'trends', labelKey: 'billing.tabTrends' },
    { id: 'providers', labelKey: 'billing.tabProviders' },
    { id: 'details', labelKey: 'billing.tabDetails' },
    { id: 'pricing', labelKey: 'billing.tabPricing' },
];
/** 项目名取 cwd 的末级目录；无 cwd 时由调用方回退为 em dash。 */
function projectName(cwd) {
    if (cwd === undefined)
        return undefined;
    return cwd.split(/[\\/]/).filter(Boolean).pop() ?? cwd;
}
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
            ...(candidate.updatedAt !== undefined ? { updatedAt: candidate.updatedAt } : {}),
            ...(typeof candidate.budget === 'number' ? { budget: candidate.budget } : {}),
            ...(typeof candidate.lowBalanceThreshold === 'number' ? { lowBalanceThreshold: candidate.lowBalanceThreshold } : {}),
            ...(Array.isArray(candidate.bySession) ? { bySession: candidate.bySession } : {}),
            ...(Array.isArray(candidate.byTurn) ? { byTurn: candidate.byTurn } : {}),
            ...(Array.isArray(candidate.byWorkspace) ? { byWorkspace: candidate.byWorkspace } : {}),
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
 * Sidebar footer trigger: compact pill in wide mode, icon in rail mode.
 * ZINE 模式下入口由主题插件的贴纸层承担，本触发器由 CSS
 * （body[data-zine-mode] 选择器）隐藏，组件本身无 zine 分支。
 * @param props - framework props plus `wide` column state.
 */
function UsageBillingTrigger(props) {
    const { wide, t, onOpen, monthCost, todayCost } = props;
    // 银行卡 icon：计费语义，窄栏与宽栏共用。
    const cardIcon = (_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "aria-hidden": "true", children: [_jsx("rect", { x: "2.5", y: "5", width: "19", height: "14", rx: "2.5" }), _jsx("path", { d: "M2.5 9.5h19" }), _jsx("rect", { x: "6", y: "12", width: "4", height: "3.5", rx: "0.75" })] }));
    if (!wide) {
        return (_jsx("button", { type: "button", className: css.railButton, "data-testid": "billing-rail-button", onClick: onOpen, title: `${t('billing.title')} · ${formatMoney(monthCost)}`, children: cardIcon }));
    }
    return (_jsxs("button", { type: "button", className: css.trigger, "data-testid": "billing-trigger", onClick: onOpen, title: `${t('billing.title')} · 本月 ${formatMoney(monthCost)}`, children: [_jsx("span", { className: css.triggerIcon, "data-testid": "billing-trigger-icon", children: cardIcon }), _jsxs("span", { className: css.triggerToday, "data-testid": "billing-trigger-today", children: [_jsx("span", { className: css.triggerMeta, children: "\u4ECA\u65E5" }), _jsx("span", { className: css.triggerAmount, children: formatMoney(todayCost) })] }), _jsx("span", { className: css.triggerDivider }), _jsxs("span", { className: css.triggerMonth, "data-testid": "billing-trigger-month", children: [_jsx("span", { className: css.triggerMeta, children: "\u5F53\u6708" }), _jsx("span", { className: css.triggerAmountSub, children: formatMoney(monthCost) })] })] }));
}
/**
 * The centered billing dashboard modal.
 * @param props - stats, locale function, close handler, model health, balances, renderSlot.
 */
function BillingDashboard({ stats, t, onClose, health, balances, quotas, currency, onCurrency, turns, renderSlot, budgetEnabled, budgetAmount, onToggleBudget, onBudgetAmount }) {
    const { total, byModel, byDay } = stats;
    // 分区 Tab：默认概览；各区块已进入二级 Tab，全部默认展开（无折叠交互）。
    const [tab, setTab] = useState('overview');
    // 趋势窗口：7 天 / 30 天切换（30 天窗口数据不足时按日补零）。
    const [trendDays, setTrendDays] = useState(7);
    // 当前汇率与来源：供单价表标题展示（实时 / 内置）。
    const rateInfo = getRateInfo();
    // 显示币种换算：usd 时把 CNY 金额按当前汇率换算显示。
    const money = (cny) => formatMoney(currency === 'usd' ? cnyToUsd(cny) : cny, currency);
    // 每轮成本异常标记：按起始时间升序传给 flagAnomalies（最近的在末尾）。
    const roundFlags = useMemo(() => flagAnomalies([...turns].reverse()), [turns]);
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
    // 本月预计总花费（forecast）：按本月已有记录的平均日消耗 × 本月天数外推，
    // 无本月记录时回退为最近 7 天日均；无任何记录时为 0（不显示）。
    const monthCostProjected = useMemo(() => projectMonthCost(byDay, monthPrefix, today), [byDay, monthPrefix, today]);
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
        };
    })
        .sort((a, b) => (b.actual ?? b.estimated) - (a.actual ?? a.estimated))
        .map((row, index) => ({
        ...row,
        color: CHART_PALETTE[index % CHART_PALETTE.length] ?? '#8b95a3',
    })), [byModel]);
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
        return [...names]
            .map(name => ({
            name,
            models: modelsByVendor.get(name) ?? [],
            subscriptions: subscriptionsByVendor.get(name) ?? [],
            balance: balanceFor(name),
            dot: providerDot(health, name),
        }))
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
                                            : `${health.failures} 厂商不可用`] })), _jsx("button", { type: "button", className: css.closeButton, "aria-label": t('billing.close'), "data-testid": "billing-close", onClick: onClose, children: _jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "aria-hidden": "true", children: [_jsx("path", { d: "M18 6 6 18" }), _jsx("path", { d: "m6 6 12 12" })] }) })] })] }), _jsx("nav", { className: css.tabNav, "data-testid": "billing-tab-nav", role: "tablist", "aria-label": t('billing.title'), children: DASHBOARD_TABS.map(item => (_jsx("button", { type: "button", role: "tab", "aria-selected": tab === item.id, className: clsx(css.tabButton, tab === item.id && css.tabButtonActive), "data-testid": `billing-tab-${item.id}`, onClick: () => { setTab(item.id); }, children: t(item.labelKey) }, item.id))) }), _jsxs("div", { className: css.dashboardBody, children: [tab === 'overview' && (_jsxs("div", { className: css.tabPanel, "data-testid": "billing-tab-panel-overview", children: [_jsxs("section", { className: css.hero, "data-testid": "billing-hero", children: [renderSlot('billing.dashboard.decor', { position: 'hero' }), _jsxs("div", { className: css.heroMain, children: [_jsx("span", { className: css.heroLabel, children: t('billing.monthCost') }), _jsx("span", { className: css.heroValue, children: money(monthCost) }), _jsxs("span", { className: css.heroMeta, children: [monthCalls.toLocaleString(), " ", t('billing.calls')] })] }), _jsxs("div", { className: css.heroSide, children: [_jsxs("div", { className: css.heroSideItem, children: [_jsx("span", { className: css.heroSideLabel, children: t('billing.yearCost') }), _jsx("span", { className: css.heroSideValue, children: money(yearCost) })] }), _jsxs("div", { className: css.heroSideItem, children: [_jsx("span", { className: css.heroSideLabel, children: t('billing.todayCost') }), _jsxs("span", { className: css.heroSideValue, children: [money(todayCost), _jsxs("span", { className: clsx(css.delta, deltaPct >= 0 ? css.deltaUp : css.deltaDown), children: [deltaPct >= 0 ? '▲' : '▼', " ", Math.abs(deltaPct).toFixed(1), "%"] })] })] }), monthCostProjected > 0 && (_jsxs("div", { className: css.heroSideItem, children: [_jsx("span", { className: css.heroSideLabel, children: t('billing.monthProjected') }), _jsx("span", { className: css.heroSideValue, children: money(monthCostProjected) })] }))] })] }), _jsxs("section", { className: css.budget, "data-testid": "billing-budget", children: [_jsxs("div", { className: css.budgetHead, children: [_jsx("span", { className: css.budgetLabel, children: t('billing.budget') }), _jsxs("span", { className: css.budgetControls, children: [budgetEnabled && (_jsxs("span", { className: css.budgetInputWrap, "data-testid": "billing-budget-input-wrap", children: [_jsx("span", { className: css.budgetUnit, "aria-hidden": "true", children: "\u00A5" }), _jsx("input", { className: css.budgetInput, "data-testid": "billing-budget-input", type: "number", min: 0, step: 1, value: budgetAmount === 0 ? '' : budgetAmount, placeholder: stats.budget !== undefined ? String(stats.budget) : '0', "aria-label": `${t('billing.budget')}（元）`, title: `${t('billing.budget')}（元）`, onChange: (e) => { onBudgetAmount(e.target.valueAsNumber); } })] })), budgetEnabled && budgetAmount > 0 && (() => {
                                                            const pct = (monthCost / budgetAmount) * 100;
                                                            return (_jsxs("span", { className: css.budgetValue, "data-testid": "billing-budget-value", children: [money(monthCost), " / ", money(budgetAmount), " \u00B7 ", pct.toFixed(1), "%"] }));
                                                        })(), _jsx("button", { type: "button", role: "switch", "aria-checked": budgetEnabled, "aria-label": t('billing.budget'), "data-testid": "billing-budget-toggle", className: clsx(css.switch, budgetEnabled && css.switchOn), onClick: onToggleBudget, children: _jsx("span", { className: css.switchKnob }) })] })] }), budgetEnabled && budgetAmount > 0 && (() => {
                                            const pct = (monthCost / budgetAmount) * 100;
                                            return (_jsx("div", { className: css.budgetTrack, "data-testid": "billing-budget-track", children: _jsx("div", { className: clsx(css.budgetFill, pct >= 100 && css.budgetFillOver), style: { width: `${Math.min(pct, 100)}%` } }) }));
                                        })()] }), _jsxs("section", { className: css.kpiGrid, "data-testid": "billing-kpi-grid", children: [_jsxs("div", { className: css.kpiTile, "data-testid": "billing-kpi-tile", children: [_jsx("span", { className: css.kpiLabel, children: t('billing.cacheHitRate') }), _jsx("span", { className: clsx(css.kpiValue, css.kpiGreen), children: formatPercent(cacheHitRate) }), _jsxs("span", { className: css.kpiDetail, children: [formatTokens(total.cacheHit), " / ", formatTokens(total.cacheHit + total.cacheMiss)] })] }), _jsxs("div", { className: css.kpiTile, children: [_jsx("span", { className: css.kpiLabel, children: t('billing.tokens') }), _jsx("span", { className: css.kpiValue, children: formatTokens(total.input + total.output) }), _jsxs("span", { className: css.kpiDetail, children: [t('billing.inputTokens'), " ", formatTokens(total.input), " \u00B7 ", t('billing.outputTokens'), " ", formatTokens(total.output)] })] }), _jsxs("div", { className: css.kpiTile, children: [_jsx("span", { className: css.kpiLabel, children: t('billing.avgCost') }), _jsx("span", { className: css.kpiValue, children: money(avgPerCall) }), _jsxs("span", { className: css.kpiDetail, children: [t('billing.calls'), " ", total.calls.toLocaleString()] })] }), _jsxs("div", { className: css.kpiTile, children: [_jsx("span", { className: css.kpiLabel, children: t('billing.calls') }), _jsx("span", { className: css.kpiValue, children: total.calls.toLocaleString() }), _jsxs("span", { className: css.kpiDetail, children: [modelRows.length, " ", t('billing.models')] })] })] }), _jsxs("section", { className: css.panel, "data-testid": "billing-panel-heatmap", children: [_jsx("div", { className: css.panelHead, children: _jsx("h3", { className: css.panelTitle, children: t('billing.heatmap') }) }), _jsx(UsageHeatmap, { days: heatmapDays, currency: currency, t: t })] })] })), tab === 'trends' && (_jsxs("div", { className: css.tabPanel, "data-testid": "billing-tab-panel-trends", children: [_jsxs("section", { className: clsx(css.panel, css.trendPanel), "data-testid": "billing-panel-trend", children: [_jsxs("div", { className: css.panelHead, children: [_jsx("h3", { className: css.panelTitle, children: t('billing.trend') }), renderSlot('billing.dashboard.decor', { position: 'trend' }), _jsx("span", { className: css.rangeToggle, role: "group", "aria-label": t('billing.trend'), children: [7, 30].map(days => (_jsx("button", { type: "button", className: clsx(css.rangeButton, trendDays === days && css.rangeButtonActive), "aria-pressed": trendDays === days, "data-testid": `billing-trend-${days}d`, onClick: () => { setTrendDays(days); }, children: days === 7 ? t('billing.trend7d') : t('billing.trend30d') }, days))) }), _jsx("span", { className: css.panelHint, children: latestDate })] }), _jsx(TrendChart, { data: trend, models: chartModels, currency: currency })] }), turns.length > 0 && (_jsxs("section", { className: css.panel, "data-testid": "billing-panel-rounds", children: [_jsxs("div", { className: css.panelHead, children: [_jsx("h3", { className: css.panelTitle, children: t('billing.rounds') }), roundFlags.length > 0 && (_jsxs("span", { className: css.roundsFlagBadge, "data-testid": "billing-rounds-flag-count", children: [roundFlags.length, " ", t('billing.anomaly')] }))] }), _jsx(RoundCostChart, { rounds: turns, flags: roundFlags, currency: currency, t: t })] }))] })), tab === 'providers' && (_jsx("div", { className: css.tabPanel, "data-testid": "billing-tab-panel-providers", children: _jsxs("section", { className: css.panel, "data-testid": "billing-panel-providers", children: [_jsxs("div", { className: css.panelHead, children: [_jsx("h3", { className: css.panelTitle, children: t('billing.providerBilling') }), renderSlot('billing.dashboard.decor', { position: 'models' }), _jsx("span", { className: css.panelHint, children: stats.updatedAt !== undefined
                                                    ? `${t('billing.lastUpdated')} ${formatClock(stats.updatedAt)}`
                                                    : '' })] }), providerGroups.length === 0 ? (_jsx("div", { className: css.emptyRow, "data-testid": "billing-provider-empty", children: t('billing.noData') })) : (_jsx("div", { className: css.providerGroupList, "data-testid": "billing-provider-groups", children: providerGroups.map(group => (_jsxs("div", { className: css.providerGroup, "data-testid": "billing-provider-group", children: [_jsxs("div", { className: css.providerGroupHead, children: [_jsxs("span", { className: css.providerGroupTitle, children: [_jsx("span", { className: clsx(css.healthDot, group.dot), "aria-hidden": "true" }), _jsx("span", { className: css.providerGroupName, children: group.name })] }), _jsxs("span", { className: css.providerGroupMeta, children: [group.subscriptions.length > 0 && (_jsxs("span", { className: css.providerGroupBadge, "data-testid": "billing-provider-sub-count", children: [group.subscriptions.length, " \u5957\u9910"] })), group.balance !== undefined && (_jsxs("span", { className: css.providerGroupBalance, "data-testid": "billing-provider-balance", children: [_jsx("span", { className: css.providerGroupBalanceLabel, children: t('billing.balance') }), renderBalance(group.balance)] }))] })] }), group.models.length > 0 && (_jsx("div", { className: clsx(css.tableScroll, css.modelTableScroll), "data-testid": "billing-table-scroll", children: _jsxs("table", { className: css.modelTable, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: t('billing.model') }), _jsx("th", { className: css.numCol, children: t('billing.calls') }), _jsx("th", { className: css.numCol, children: t('billing.inputTokens') }), _jsx("th", { className: css.numCol, children: t('billing.outputTokens') }), _jsx("th", { className: css.numCol, children: t('billing.cacheHitRate') }), _jsx("th", { className: css.numCol, children: t('billing.actual') })] }) }), _jsx("tbody", { children: group.models.map(row => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("span", { className: css.modelCell, children: _jsxs("span", { children: [_jsxs("span", { className: css.modelName, children: [row.name, row.uncatalogued && (_jsx("span", { className: css.uncataloguedTag, "data-testid": "billing-uncatalogued-tag", children: t('billing.uncatalogued') })), row.estimatedPricing && (_jsx("span", { className: css.estimatedTag, "data-testid": "billing-estimated-tag", children: t('billing.estimatedPricing') }))] }), _jsx("span", { className: css.modelProvider, children: row.provider })] }) }) }), _jsx("td", { className: css.numCol, children: row.calls.toLocaleString() }), _jsx("td", { className: css.numCol, children: formatTokens(row.input) }), _jsx("td", { className: css.numCol, children: formatTokens(row.output) }), _jsx("td", { className: css.numCol, children: formatPercent(row.cacheHitRate) }), _jsx("td", { className: css.numCol, children: row.plan
                                                                                ? _jsx("span", { className: css.planTag, children: "\u8BA2\u9605\u5305\u542B" })
                                                                                : row.actual !== undefined ? money(row.actual) : _jsx("span", { className: css.na, children: "\u2014" }) })] }, row.key))) })] }) })), group.subscriptions.length > 0 && (_jsx("div", { className: css.subscriptionGrid, "data-testid": "billing-subscriptions-grid", children: group.subscriptions.map(quota => {
                                                        const statusText = subscriptionStatusText(quota.status, t);
                                                        return (_jsxs("div", { className: css.subscriptionCard, "data-testid": "billing-subscription-card", children: [_jsxs("div", { className: css.subscriptionHead, children: [_jsx("span", { className: css.subscriptionName, children: quota.displayName }), quota.plan !== undefined && _jsx("span", { className: css.subscriptionPlan, children: quota.plan })] }), statusText !== '' && _jsx("div", { className: css.subscriptionStatus, children: statusText }), quota.windows.length === 0 && statusText === '' && (_jsx("div", { className: css.subscriptionStatus, children: t('billing.subscriptionNoApi') })), quota.windows.map(window => (_jsxs("div", { className: css.subscriptionWindow, children: [_jsx("span", { className: css.subscriptionWindowLabel, children: subscriptionWindowLabel(window.kind, t) }), _jsx("span", { className: css.subscriptionTrack, "aria-hidden": "true", children: _jsx("span", { className: css.subscriptionFill, style: { width: `${Math.min(100, Math.max(0, window.remainingPercent))}%` } }) }), _jsx("span", { className: css.subscriptionPct, children: t('billing.subscriptionRemaining').replace('{pct}', String(window.remainingPercent)) }), window.resetsAt !== undefined && (_jsx("span", { className: css.subscriptionReset, children: t('billing.subscriptionReset').replace('{date}', window.resetsAt.slice(0, 10)) }))] }, window.kind)))] }, quota.provider));
                                                    }) }))] }, group.name))) }))] }) })), tab === 'details' && (_jsxs("div", { className: css.tabPanel, "data-testid": "billing-tab-panel-details", children: [stats.byWorkspace !== undefined && stats.byWorkspace.length > 0 && (_jsxs("section", { className: css.panel, "data-testid": "billing-panel-workspaces", children: [_jsx("div", { className: css.panelHead, children: _jsx("h3", { className: css.panelTitle, children: t('billing.workspaces') }) }), _jsx("div", { className: css.tableScroll, children: _jsxs("table", { className: css.modelTable, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: t('billing.project') }), _jsx("th", { className: css.numCol, children: t('billing.calls') }), _jsx("th", { className: css.numCol, children: t('billing.inputTokens') }), _jsx("th", { className: css.numCol, children: t('billing.outputTokens') }), _jsx("th", { className: css.numCol, children: t('billing.actual') }), _jsx("th", { className: css.numCol, children: t('billing.lastActive') })] }) }), _jsx("tbody", { children: stats.byWorkspace.map(row => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("span", { className: css.modelName, children: row.name }) }), _jsx("td", { className: css.numCol, children: row.calls.toLocaleString() }), _jsx("td", { className: css.numCol, children: formatTokens(row.input) }), _jsx("td", { className: css.numCol, children: formatTokens(row.output) }), _jsx("td", { className: css.numCol, children: money(row.cost) }), _jsx("td", { className: css.numCol, children: row.lastActive > 0 ? `${localDayStamp(row.lastActive)}` : '—' })] }, row.name))) })] }) })] })), stats.bySession !== undefined && (_jsxs("section", { className: css.panel, "data-testid": "billing-panel-sessions", children: [_jsxs("div", { className: css.panelHead, children: [_jsx("h3", { className: css.panelTitle, children: t('billing.sessions') }), _jsx("span", { className: css.panelHint, children: stats.bySession.length > SESSION_DISPLAY_LIMIT
                                                        ? t('billing.sessionOverflow')
                                                            .replace('{limit}', String(SESSION_DISPLAY_LIMIT))
                                                            .replace('{total}', String(stats.bySession.length))
                                                        : `${stats.bySession.length}` })] }), _jsx("div", { className: css.tableScroll, "data-testid": "billing-sessions-table", children: _jsxs("table", { className: css.modelTable, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: t('billing.sessions') }), _jsx("th", { children: t('billing.project') }), _jsx("th", { className: css.numCol, children: t('billing.calls') }), _jsx("th", { className: css.numCol, children: t('billing.actual') }), _jsx("th", { className: css.numCol, children: t('billing.lastActive') })] }) }), _jsxs("tbody", { children: [stats.bySession.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: css.emptyRow, children: t('billing.noData') }) })), stats.bySession.slice(0, SESSION_DISPLAY_LIMIT).map(row => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("span", { className: css.modelName, children: row.title ?? row.id.slice(0, 8) }) }), _jsx("td", { children: _jsx("span", { className: css.modelProvider, children: projectName(row.cwd) ?? '—' }) }), _jsx("td", { className: css.numCol, children: row.calls.toLocaleString() }), _jsx("td", { className: css.numCol, children: money(row.cost) }), _jsx("td", { className: css.numCol, children: row.lastActive > 0 ? `${localDayStamp(row.lastActive)} ${formatClock(row.lastActive)}` : '—' })] }, row.id)))] })] }) })] }))] })), tab === 'pricing' && (_jsx("div", { className: css.tabPanel, "data-testid": "billing-tab-panel-pricing", children: _jsxs("section", { className: css.panel, "data-testid": "billing-panel-pricing", children: [_jsxs("div", { className: css.panelHead, children: [_jsx("h3", { className: css.panelTitle, children: t('billing.pricing') }), _jsxs("span", { className: css.panelHint, children: [t('billing.todayRate'), " 1 USD = ", formatMoney(rateInfo.rate), _jsx("span", { className: clsx(css.rateBadge, rateInfo.live ? css.rateBadgeLive : css.rateBadgeBuiltin), children: rateInfo.live ? t('billing.rateLive') : t('billing.rateBuiltin') })] })] }), _jsx("div", { className: css.tableScroll, children: _jsxs("table", { className: css.pricingTable, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Model" }), _jsx("th", { className: css.numCol, children: t('billing.input') }), _jsx("th", { className: css.numCol, children: t('billing.cacheHit') }), _jsx("th", { className: css.numCol, children: t('billing.output') }), _jsx("th", { children: t('billing.band') })] }) }), _jsx("tbody", { children: MODEL_CATALOG.map(entry => (_jsxs("tr", { children: [_jsx("td", { children: _jsxs("span", { className: css.modelCell, children: [_jsx("span", { className: css.modelDot, style: { background: resolveToken(entry.colorVar) } }), _jsxs("span", { children: [_jsx("span", { className: css.modelName, children: entry.name }), _jsx("span", { className: css.modelProvider, children: entry.provider })] })] }) }), _jsx("td", { className: css.numCol, children: entry.price.offPeak !== undefined
                                                                    ? (_jsxs("span", { className: css.bandPrice, children: [_jsx("span", { children: formatUnitPrice(entry.price.input, entry.price.currency) }), _jsx("span", { className: css.bandPriceOff, children: formatUnitPrice(entry.price.offPeak.input, entry.price.currency) })] }))
                                                                    : formatUnitPrice(entry.price.input, entry.price.currency) }), _jsx("td", { className: css.numCol, children: entry.price.offPeak !== undefined
                                                                    ? (_jsxs("span", { className: css.bandPrice, children: [_jsx("span", { children: formatUnitPrice(entry.price.cacheHit, entry.price.currency) }), _jsx("span", { className: css.bandPriceOff, children: formatUnitPrice(entry.price.offPeak.cacheHit, entry.price.currency) })] }))
                                                                    : formatUnitPrice(entry.price.cacheHit, entry.price.currency) }), _jsx("td", { className: css.numCol, children: entry.price.offPeak !== undefined
                                                                    ? (_jsxs("span", { className: css.bandPrice, children: [_jsx("span", { children: formatUnitPrice(entry.price.output, entry.price.currency) }), _jsx("span", { className: css.bandPriceOff, children: formatUnitPrice(entry.price.offPeak.output, entry.price.currency) })] }))
                                                                    : formatUnitPrice(entry.price.output, entry.price.currency) }), _jsx("td", { children: entry.price.offPeak !== undefined && entry.peakHours !== undefined
                                                                    ? (_jsxs("span", { className: css.bandTag, children: [_jsxs("span", { children: [t('billing.peak'), " ", entry.peakHours] }), _jsxs("span", { className: css.bandTagOff, children: [t('billing.offPeak'), " 50%"] })] }))
                                                                    : _jsx("span", { className: css.flatTag, children: t('billing.flat') }) })] }, entry.key))) })] }) })] }) })), renderSlot('billing.dashboard.decor', { position: 'footer' })] })] }) }));
}
/**
 * UsageBilling: sidebar trigger plus the billing dashboard modal.
 * @param props - framework-provided sidebar and locale props.
 */
export function UsageBilling(props) {
    const { t, checkModels, publishCosts, registerOpen, renderSlot, useStore, actions } = props;
    // Start empty; swap in real host data when the server serves valid JSON.
    const [stats, setStats] = useState(EMPTY_STATS);
    const [health, setHealth] = useState(IDLE_HEALTH);
    const [balances, setBalances] = useState([]);
    const [quotas, setQuotas] = useState([]);
    const [currency, setCurrency] = useState('cny');
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
    const todayCost = stats.byDay[today]?.cost ?? 0;
    // 预算偏好：开关与金额经框架 store 读取；用户金额优先，宿主 monthlyBudget
    //（stats.budget）兜底为默认值。
    const budgetEnabled = useStore(s => s.enabled);
    const budgetAmount = useStore(s => s.amount);
    const budgetAlertedDay = useStore(s => s.lastAlertDay);
    const effectiveBudget = budgetAmount > 0 ? budgetAmount : (stats.budget ?? 0);
    const toggleBudget = useCallback(() => {
        const next = !budgetEnabled;
        actions.setEnabled(next);
        // 开启预算的手势顺带申请通知权限：授权后超支才会弹系统通知。
        if (next && typeof Notification !== 'undefined' && Notification.permission === 'default') {
            void Notification.requestPermission();
        }
    }, [actions, budgetEnabled]);
    // 超支通知：预算开启且已超支时，每天最多弹一次系统通知（标记持久化，
    // 跨重启不重复）；Notification 不可用或未授权时跳过——预算条已转红
    // 并带脉冲动画，信息始终留在界面上。
    useEffect(() => {
        if (!budgetEnabled || effectiveBudget <= 0)
            return;
        const pct = (monthCost / effectiveBudget) * 100;
        if (pct < 100)
            return;
        const day = localDayStamp();
        if (budgetAlertedDay === day)
            return;
        actions.markAlerted(day);
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted')
            return;
        const body = t('billing.budgetOverBody')
            .replace('{cost}', formatMoney(monthCost))
            .replace('{budget}', formatMoney(effectiveBudget))
            .replace('{pct}', pct.toFixed(0));
        // 通知发送失败（部分平台限制）不影响标记：当天不再重试，避免轮询轰炸。
        try {
            new Notification(t('billing.budget'), { body });
        }
        catch {
            // 平台拒绝构造通知：静默跳过，界面红色进度条兜底。
        }
    }, [budgetEnabled, effectiveBudget, monthCost, budgetAlertedDay, actions, t]);
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
    return (_jsxs(_Fragment, { children: [_jsx(UsageBillingTrigger, { ...props, onOpen: openDashboard, monthCost: monthCost, todayCost: todayCost }), open && (_jsx(BillingDashboard, { stats: stats, t: t, onClose: close, health: health, balances: balances, quotas: quotas, currency: currency, onCurrency: setCurrency, turns: turns, renderSlot: renderSlot, budgetEnabled: budgetEnabled, budgetAmount: effectiveBudget, onToggleBudget: toggleBudget, onBudgetAmount: actions.setAmount }))] }));
}
//# sourceMappingURL=UsageBilling.js.map