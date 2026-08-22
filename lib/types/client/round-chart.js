import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
/**
 * RoundCostChart: dependency-free per-turn cost bars with spike markers.
 *
 * One bar per turn (most recent N, newest last), height scaled to the window
 * maximum. Turns flagged by {@link flagAnomalies} get a warning outline and a
 * corner marker; hover shows the turn's model, cost, and window time. Styling
 * lives in the billing CSS module (`.rounds*`).
 */
import { useMemo } from 'react';
import css from './UsageBilling.module.css';
import { cnyToUsd, formatMoney } from "./pricing.js";
/** 每轮图最多渲染的轮数（服务端已封顶，这里再收敛渲染宽度）。 */
const DISPLAY_LIMIT = 40;
/** Local time `HH:MM`. */
function clock(time) {
    const date = new Date(time);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
/** Local date + time for the hover line. */
function dateTime(time) {
    const date = new Date(time);
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
/**
 * Render the per-turn cost bars.
 * @param props.rounds - turns, most recent last (ascending startedAt); oldest beyond the limit are dropped.
 * @param props.flags - spike flags matched by sessionId+turn.
 * @param props.currency - display currency for the amount labels.
 * @param props.t - locale function for the model label.
 */
export function RoundCostChart({ rounds, flags, currency, t }) {
    const visible = useMemo(() => rounds.slice(-DISPLAY_LIMIT), [rounds]);
    const flagKey = useMemo(() => new Set(flags.map(flag => `${flag.sessionId}:${flag.turn}`)), [flags]);
    const maxCost = useMemo(() => Math.max(0.0001, ...visible.map(round => round.cost)), [visible]);
    if (visible.length === 0)
        return _jsxs("div", { className: css.roundsEmpty, children: [t('billing.model'), " \u2014"] });
    const money = (cny) => formatMoney(currency === 'usd' ? cnyToUsd(cny) : cny, currency);
    return (_jsxs("div", { className: css.rounds, children: [_jsx("div", { className: css.roundsBars, role: "img", "aria-label": "cost per turn", children: visible.map(round => {
                    const flagged = flagKey.has(`${round.sessionId}:${round.turn}`);
                    const height = Math.max(1, (round.cost / maxCost) * 100);
                    return (_jsxs("div", { className: css.roundsBarCol, children: [_jsx("span", { className: css.roundsBarLabel, children: money(round.cost) }), _jsx("div", { className: css.roundsBarWrap, children: _jsx("div", { className: flagged ? css.roundsBarFlagged : css.roundsBar, style: { height: `${height}%` }, "data-testid": "round-bar", title: `${t('billing.model')} ${round.model} · ${money(round.cost)} · ${dateTime(round.startedAt)}${round.endedAt !== undefined ? ` → ${clock(round.endedAt)}` : ''}`, children: flagged && _jsx("span", { className: css.roundsFlagMark, "aria-hidden": "true" }) }) })] }, `${round.sessionId}:${round.turn}`));
                }) }), _jsxs("div", { className: css.roundsAxis, children: [_jsxs("span", { children: [t('billing.costAbbr'), " ", money(maxCost)] }), _jsxs("span", { children: [visible.length, " \u8F6E"] })] })] }));
}
//# sourceMappingURL=round-chart.js.map