import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * LiveCostBar: the session-scope cost ticker mounted on the composer's dock,
 * showing the current session's accumulated spend and the latest turn's cost.
 *
 * It rides `conversation.composer.dock` (the stats-line family seat under the
 * composer card, same posture as ui-conversation's own StatsLine), so it stays
 * visible while working without opening the full dashboard. Data comes from the
 * same `/api/billing/usage-stats` endpoint the dashboard polls; the bar reads
 * the current session id off the framework snapshot (`useSession` parent of
 * `sessionId`) and matches `bySession` (session total) and `byTurn` (latest
 * turn cost). Rendering is a pure function of the snapshot, never a side effect.
 *
 * The bar also carries two ambient signals: the current peak/off-peak pricing
 * tier with a switch countdown (DeepSeek time-of-day pricing), and quota chips
 * for subscription plans running low (≤20% remaining), so cost pressure is
 * visible without opening the dashboard.
 */
import { useEffect, useMemo, useState } from 'react';
import { formatMoney, formatSwitchCountdown, tierCountdown } from "./pricing.js";
import css from './UsageBilling.module.css';
/**
 * 当前会话累计费用：bySession 里会话 id 匹配的那行；缺省为 0。
 * 导出供测试：纯函数。
 * @param stats - 薄统计切片。
 * @param sessionId - 当前会话 id。
 * @returns 该会话累计费用（人民币元）。
 */
export function sessionCostOf(stats, sessionId) {
    if (sessionId === undefined || stats?.bySession === undefined)
        return 0;
    const row = stats.bySession.find(item => item.id === sessionId);
    return row?.cost ?? 0;
}
/**
 * 当前轮费用：byTurn 里该会话最新一轮的 cost；缺省为 0。
 * byTurn 服务端按起始时间倒序下发，但求 max(turn) 更稳健（不依赖顺序）。
 * 导出供测试：纯函数。
 * @param stats - 薄统计切片。
 * @param sessionId - 当前会话 id。
 * @returns 最新一轮费用（人民币元）。
 */
export function turnCostOf(stats, sessionId) {
    if (sessionId === undefined || stats?.byTurn === undefined)
        return 0;
    let latest = 0;
    let latestTurn = -1;
    for (const item of stats.byTurn) {
        if (item.sessionId !== sessionId)
            continue;
        if (latestTurn === -1 || item.turn > latestTurn) {
            latestTurn = item.turn;
            latest = item.cost;
        }
    }
    return latest;
}
/**
 * 低额度预警 chips：查询成功（ok）且任一窗口剩余 ≤ threshold 的套餐，
 * 按剩余升序、最多 3 枚。导出供测试：纯函数。
 * @param quotas - 订阅额度行切片。
 * @param threshold - 剩余百分比阈值（默认 20%）。
 */
export function lowQuotaChips(quotas, threshold = 20) {
    const chips = [];
    for (const quota of quotas) {
        if (quota.status !== 'ok')
            continue;
        for (const win of quota.windows) {
            if (win.remainingPercent > threshold)
                continue;
            chips.push({ name: quota.displayName, kind: win.kind, pct: win.remainingPercent });
        }
    }
    return chips.sort((a, b) => a.pct - b.pct).slice(0, 3);
}
/** Endpoint the node half serves (same constant the dashboard uses). */
const USAGE_STATS_PATH = '/api/billing/usage-stats';
/** 订阅额度端点（额度预警 chips 的数据源）。 */
const SUBSCRIPTIONS_PATH = '/api/billing/subscriptions';
/** Refresh cadence (ms): matching the dashboard so the bar stays current. */
const REFRESH_INTERVAL_MS = 30_000;
/** Load the thin stats slice; null when the endpoint does not answer valid JSON. */
async function loadLiveStats() {
    try {
        const response = await fetch(USAGE_STATS_PATH);
        if (!response.ok)
            return null;
        const text = await response.text();
        const parsed = JSON.parse(text);
        if (parsed === null || typeof parsed !== 'object')
            return null;
        const doc = parsed;
        return {
            ...(Array.isArray(doc.bySession) ? { bySession: doc.bySession } : {}),
            ...(Array.isArray(doc.byTurn) ? { byTurn: doc.byTurn } : {}),
        };
    }
    catch {
        return null;
    }
}
/** Load subscription quota slices; empty list on any failure. */
async function loadQuotas() {
    try {
        const response = await fetch(SUBSCRIPTIONS_PATH);
        if (!response.ok)
            return [];
        const parsed = JSON.parse(await response.text());
        if (parsed === null || typeof parsed !== 'object' || !('quotas' in parsed))
            return [];
        const quotas = parsed.quotas;
        return Array.isArray(quotas) ? quotas : [];
    }
    catch {
        return [];
    }
}
/** 额度窗口类型 → 文案 key（本次 / 本周 / 本月 / 计费周期）。 */
function windowLabelKey(kind) {
    switch (kind) {
        case 'session': return 'billing.subscriptionSession';
        case 'weekly': return 'billing.subscriptionWeekly';
        case 'monthly': return 'billing.subscriptionMonthly';
        default: return 'billing.subscriptionBilling';
    }
}
/**
 * Render the live cost ticker for the current session.
 * @param props - framework session snapshot hook and locale.
 */
export function LiveCostBar({ useSession, t }) {
    const sessionId = useSession(s => s.sessionId);
    // 拉取即时代费数据：挂载时一次 + 周期刷新（与仪表盘同频）。
    const [stats, setStats] = useState(null);
    const [quotas, setQuotas] = useState([]);
    // 峰谷倒计时独立跳动（30 秒粒度足够，与数据轮询同频但无数据时也刷新）。
    const [nowMs, setNowMs] = useState(() => Date.now());
    useEffect(() => {
        let cancelled = false;
        const load = () => {
            void loadLiveStats().then((data) => {
                if (!cancelled && data !== null)
                    setStats(data);
            });
            void loadQuotas().then((list) => {
                if (!cancelled)
                    setQuotas(list);
            });
            if (!cancelled)
                setNowMs(Date.now());
        };
        load();
        const timer = setInterval(load, REFRESH_INTERVAL_MS);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
        // sessionId 变化时重新订阅，以对齐当前会话。
    }, [sessionId]);
    // 当前会话累计费用与当前轮费用：由纯函数派生，便于测试。
    const sessionCost = useMemo(() => sessionCostOf(stats, sessionId), [stats, sessionId]);
    const turnCost = useMemo(() => turnCostOf(stats, sessionId), [stats, sessionId]);
    const tier = tierCountdown(nowMs);
    const chips = useMemo(() => lowQuotaChips(quotas), [quotas]);
    const money = (cny) => formatMoney(cny, 'cny');
    if (sessionId === undefined)
        return null;
    const hasCost = sessionCost > 0 || turnCost > 0;
    const isPeak = tier.tier === 'peak';
    // 设计 fee-bar：档位 chip → 倒计时 → 档位说明 → 本轮/会话 → 额度预警 chips。
    return (_jsxs("span", { className: css.feeBar, "data-testid": "billing-live-cost-bar", children: [_jsx("span", { className: isPeak ? css.feeChipPrimary : css.feeChipOff, "data-testid": "billing-live-tier", children: isPeak ? t('billing.tierPeak') : t('billing.tierOff') }), _jsx("span", { className: css.feeCount, children: formatSwitchCountdown(tier.nextSwitchInMs) }), _jsx("span", { className: css.feeSuffix, children: isPeak ? t('billing.tierToOff') : t('billing.tierToPeak') }), hasCost && (_jsxs(_Fragment, { children: [_jsx("span", { className: css.feeSep, "aria-hidden": "true", children: "\u00B7" }), _jsxs("span", { className: css.feeItem, "data-testid": "billing-live-turn", children: [t('billing.liveTurn'), " ", _jsx("span", { className: css.feeNum, children: money(turnCost) })] }), _jsx("span", { className: css.feeSep, "aria-hidden": "true", children: "\u00B7" }), _jsxs("span", { className: css.feeItem, "data-testid": "billing-live-session", children: [t('billing.liveSession'), " ", _jsx("span", { className: css.feeNum, children: money(sessionCost) })] })] })), chips.map(chip => (_jsxs("span", { children: [_jsx("span", { className: css.feeSep, "aria-hidden": "true", children: "\u00B7" }), _jsxs("span", { className: chip.pct <= 10 ? css.feeChipError : css.feeChipAlert, "data-testid": "billing-live-quota", children: [chip.name, " ", t(windowLabelKey(chip.kind)), " ", chip.pct, "%"] })] }, `${chip.name}:${chip.kind}`)))] }));
}
//# sourceMappingURL=live-cost.js.map