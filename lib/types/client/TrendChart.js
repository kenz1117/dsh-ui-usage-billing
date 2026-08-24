import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * TrendChart: dependency-free SVG chart of daily cost + calls.
 *
 * The columns are STACKED per day — one bar per day, with each model's cost
 * as a colored segment inside the bar, so the daily total reads at a glance
 * and the model mix stays visible. The blue line is the total call volume
 * across all models, plotted on its own right-hand axis.
 * A hover crosshair shows the day's model breakdown. No chart library — the
 * surface stays self-contained and offline.
 */
import { useMemo, useState } from 'react';
import css from './UsageBilling.module.css';
import { cnyToUsd, formatMoney } from "./pricing.js";
/** Fixed viewBox; the SVG scales to its container. */
const W = 680;
const H = 220;
const PAD = { top: 18, right: 40, bottom: 26, left: 46 };
/** Split a date into `M/D` for axis labels. */
function shortDate(iso) {
    const [, month, day] = iso.split('-');
    return `${Number(month)}/${Number(day)}`;
}
/** Compact tick label for the calls axis: `1.2K` / `3.4M`. */
function shortNumber(value) {
    if (value >= 1_000_000)
        return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000)
        return `${(value / 1_000).toFixed(1)}K`;
    return String(Math.round(value));
}
/** Ticks every `step` items for sparse axis labels. */
function tickIndexes(length, step) {
    const out = [];
    for (let i = 0; i < length; i += step)
        out.push(i);
    if (length > 0 && out[out.length - 1] !== length - 1)
        out.push(length - 1);
    return out;
}
/** Single-color fallback identity used when the stats carry no per-model detail. */
const TOTAL_MODEL = { key: '__total__', name: '总计', color: '' };
/**
 * Render the daily bars plus the total-calls line.
 * @param props.data - sorted daily rows (ascending date).
 * @param props.models - the model legend, in bar order (used by the `cost` metric).
 * @param props.currency - display currency for the cost labels.
 * @param props.metric - `cost` (stacked per-model CNY, default) or `tokens` (single-color total tokens).
 */
export function TrendChart({ data, models = [], currency = 'cny', metric = 'cost' }) {
    const [hover, setHover] = useState(null);
    const money = (cny) => formatMoney(currency === 'usd' ? cnyToUsd(cny) : cny, currency);
    const axisOf = (value) => metric === 'tokens' ? shortNumber(value) : money(value);
    // Column value source by metric: cost (stacked) vs total tokens (single color).
    const valueOf = (d) => metric === 'tokens' ? (d.tokens ?? 0) : d.cost;
    const layout = useMemo(() => {
        const n = data.length;
        if (n === 0)
            return null;
        const plotW = W - PAD.left - PAD.right;
        const plotH = H - PAD.top - PAD.bottom;
        const inner = (i) => {
            if (n === 1)
                return PAD.left + plotW / 2;
            return PAD.left + (plotW * i) / (n - 1);
        };
        // 刻度按「单日总费用」：堆叠柱顶端即当日总费用，直方更饱满。
        // 刻度按当前指标的最大值：费用用堆叠顶端，Token 用当日总量。
        const maxCost = metric === 'tokens'
            ? Math.max(...data.map(d => d.tokens ?? 0), 0.0001)
            : Math.max(...data.map(d => Math.max(d.cost, Object.values(d.byModel ?? {}).reduce((sum, v) => sum + v, 0))), 0.0001);
        const yCost = (value) => PAD.top + plotH - (value / maxCost) * plotH;
        // 调用量比例尺：独立右轴，柱（费用）与线（调用）各用各的刻度。
        const maxCalls = Math.max(...data.map(d => d.calls), 1);
        const yCalls = (value) => PAD.top + plotH - (value / maxCalls) * plotH;
        const groupW = plotW / n;
        const barW = Math.min(18, groupW * 0.6);
        // 堆叠柱：每天一根柱，各模型费用自下而上拼成色段；顶部段圆角收尾。
        const bars = data.flatMap((d, i) => {
            const x = inner(i) - barW / 2;
            if (models.length === 0 || metric === 'tokens') {
                // 无模型明细或 Token 指标：单色总费用/总量柱兜底。
                return [{ date: d.date, model: TOTAL_MODEL, x, base: 0, value: valueOf(d), topRounded: true }];
            }
            // 顶部圆角给当天最后一个有量的模型段。
            let topKey = null;
            for (const model of models) {
                if ((d.byModel?.[model.key] ?? 0) > 0)
                    topKey = model.key;
            }
            let acc = 0;
            return models.map((model) => {
                const value = d.byModel?.[model.key] ?? 0;
                const bar = { date: d.date, model, x, base: acc, value, topRounded: model.key === topKey };
                acc += value;
                return bar;
            });
        });
        const costTicks = [0, 0.25, 0.5, 0.75, 1].map(f => maxCost * f).reverse();
        const callsTicks = [0, 0.25, 0.5, 0.75, 1].map(f => maxCalls * f).reverse();
        // 调用量折线路径：柱 = 每日分模型费用，线 = 每日总调用次数。
        const linePath = data.map((d, i) => {
            const y = yCalls(d.calls);
            return `${i === 0 ? 'M' : 'L'}${inner(i)} ${y}`;
        }).join(' ');
        return { n, plotW, plotH, inner, yCost, yCalls, barW, bars, costTicks, callsTicks, linePath };
    }, [data, models, metric]);
    if (layout === null) {
        return _jsx("div", { className: css.chartEmpty, children: "\u6682\u65E0\u8D8B\u52BF\u6570\u636E" });
    }
    const { n, plotW, plotH, inner, yCost, yCalls, barW, bars, costTicks, callsTicks, linePath } = layout;
    const activePoint = hover === null ? undefined : data[hover];
    const indices = tickIndexes(n, Math.max(1, Math.ceil(n / 8)));
    return (_jsxs("div", { className: css.chartWrap, children: [_jsxs("svg", { viewBox: `0 0 ${W} ${H}`, className: css.chartSvg, role: "img", "aria-label": "Daily cost by model and total calls", onMouseLeave: () => { setHover(null); }, onMouseMove: (e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * W;
                    const ratio = (x - PAD.left) / plotW;
                    const index = Math.round(ratio * (n - 1));
                    setHover(Math.min(Math.max(index, 0), n - 1));
                }, children: [costTicks.map((value, idx) => {
                        const y = yCost(value);
                        return (_jsxs("g", { children: [_jsx("line", { x1: PAD.left, x2: W - PAD.right, y1: y, y2: y, className: css.chartGrid }), _jsx("text", { x: PAD.left - 8, y: y + 3, textAnchor: "end", className: css.chartAxisLabel, children: axisOf(value) })] }, `cost-${idx}`));
                    }), bars.map(bar => {
                        // 费用=0 但调用>0 的当天，画一个 1px 高的占位空柱，避免「没柱=没调用」的误解。
                        if (bar.value > 0) {
                            return (_jsx("rect", { x: bar.x, y: yCost(bar.base + bar.value), width: barW, height: yCost(bar.base) - yCost(bar.base + bar.value), rx: bar.topRounded ? 2 : 0, className: bar.model.color === '' ? css.chartBar : css.chartStack, style: bar.model.color === '' ? undefined : { fill: bar.model.color } }, `${bar.date}-${bar.model.key}`));
                        }
                        // 占位空柱：当天有调用但费用为 0 时，画一个 1px 高的灰柱提示「有调用但免费」。
                        // key 含 model.key 保证唯一（同一天多模型段共享同一 date，占位柱 key 不能只用 date）。
                        const day = data.find(d => d.date === bar.date);
                        if (day !== undefined && day.calls > 0 && bar.base === 0) {
                            return (_jsx("rect", { x: bar.x, y: yCost(0) - 1, width: barW, height: 1, rx: 0, className: css.chartBarPlaceholder }, `${bar.date}-${bar.model.key}-placeholder`));
                        }
                        return null;
                    }), _jsx("path", { d: linePath, fill: "none", className: css.chartLine }), callsTicks.map((value, idx) => {
                        const y = yCalls(value);
                        return (_jsx("text", { x: W - PAD.right + 8, y: y + 3, textAnchor: "start", className: css.chartAxisLabel, children: shortNumber(value) }, `calls-${idx}`));
                    }), indices.map((i) => {
                        const point = data[i];
                        if (point === undefined)
                            return null;
                        return (_jsx("text", { x: inner(i), y: H - 6, textAnchor: "middle", className: css.chartAxisLabel, children: shortDate(point.date) }, point.date));
                    }), hover !== null && (_jsx("line", { x1: inner(hover), x2: inner(hover), y1: PAD.top, y2: PAD.top + plotH, className: css.chartCrosshair }))] }), activePoint !== undefined && hover !== null && (_jsxs("div", { className: css.chartTooltip, style: { left: `${(inner(hover) / W) * 100}%`, top: `${(yCost(activePoint.cost) / H) * 100}%` }, children: [_jsx("div", { className: css.chartTooltipDate, children: activePoint.date }), metric !== 'tokens' && models.filter(model => (activePoint.byModel?.[model.key] ?? 0) > 0).map(model => (_jsxs("div", { className: css.chartTooltipRow, children: [_jsx("span", { className: css.chartTooltipSwatch, style: { background: model.color } }), model.name, " ", _jsx("strong", { children: money(activePoint.byModel?.[model.key] ?? 0) })] }, model.key))), _jsxs("div", { className: css.chartTooltipRow, children: [_jsx("span", { className: css.chartLegendBar }), "\u603B\u8BA1 ", _jsx("strong", { children: metric === 'tokens' ? shortNumber(activePoint.tokens ?? 0) : money(activePoint.cost) })] }), _jsxs("div", { className: css.chartTooltipRow, children: [_jsx("span", { className: css.chartLegendLine }), "\u8C03\u7528 ", _jsx("strong", { children: activePoint.calls.toLocaleString() })] })] })), models.length > 0 && metric !== 'tokens' && (_jsxs("div", { className: css.chartLegend, children: [models.map(model => (_jsxs("span", { children: [_jsx("span", { className: css.chartTooltipSwatch, style: { background: model.color } }), model.name] }, model.key))), _jsxs("span", { children: [_jsx("span", { className: css.chartLegendLine }), "\u8C03\u7528"] })] }))] }));
}
//# sourceMappingURL=TrendChart.js.map