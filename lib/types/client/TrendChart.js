import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * TrendChart: dependency-free SVG stacked bar chart of daily cost per model.
 * Each day's column stacks every model's share in its brand color, so the
 * total trend and the per-model composition are visible at once. A hover
 * crosshair shows the day's model breakdown. No chart library — the surface
 * stays self-contained and offline.
 */
import { useMemo, useState } from 'react';
import css from './UsageBilling.module.css';
import { formatMoney } from "./pricing.js";
/** Fixed viewBox; the SVG scales to its container. */
const W = 680;
const H = 220;
const PAD = { top: 18, right: 16, bottom: 26, left: 46 };
/** Split a date into `M/D` for axis labels. */
function shortDate(iso) {
    const [, month, day] = iso.split('-');
    return `${Number(month)}/${Number(day)}`;
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
/**
 * Render the daily per-model stacked cost chart.
 * @param props.data - sorted daily rows (ascending date).
 * @param props.models - the model legend, in stack order (bottom first).
 */
export function TrendChart({ data, models = [] }) {
    const [hover, setHover] = useState(null);
    const layout = useMemo(() => {
        const n = data.length;
        if (n === 0)
            return null;
        const maxCost = Math.max(...data.map(d => d.cost), 0.0001);
        const plotW = W - PAD.left - PAD.right;
        const plotH = H - PAD.top - PAD.bottom;
        const inner = (i) => {
            if (n === 1)
                return PAD.left + plotW / 2;
            return PAD.left + (plotW * i) / (n - 1);
        };
        const yCost = (value) => PAD.top + plotH - (value / maxCost) * plotH;
        const barW = Math.min(18, (plotW / n) * 0.5);
        // 堆叠段：每个日期按 models 顺序自下而上累计各模型当日费用。
        const columns = data.map((d, i) => {
            let acc = 0;
            const segments = models.map((model) => {
                const value = d.byModel?.[model.key] ?? 0;
                const y0 = acc;
                acc += value;
                return { model, y0, y1: acc, rounded: false };
            });
            const top = segments.at(-1);
            if (top !== undefined)
                top.rounded = true;
            return { date: d.date, x: inner(i), segments, total: acc };
        });
        const costTicks = [0, 0.25, 0.5, 0.75, 1].map(f => maxCost * f).reverse();
        return { n, plotW, plotH, inner, yCost, barW, columns, costTicks, maxCost };
    }, [data, models]);
    if (layout === null) {
        return _jsx("div", { className: css.chartEmpty, children: "\u6682\u65E0\u8D8B\u52BF\u6570\u636E" });
    }
    const { n, plotW, inner, yCost, barW, columns, costTicks } = layout;
    const activeColumn = hover === null ? undefined : columns[hover];
    const activePoint = hover === null ? undefined : data[hover];
    const indices = tickIndexes(n, Math.max(1, Math.ceil(n / 8)));
    return (_jsxs("div", { className: css.chartWrap, children: [_jsxs("svg", { viewBox: `0 0 ${W} ${H}`, className: css.chartSvg, role: "img", "aria-label": "Daily cost by model", onMouseLeave: () => { setHover(null); }, onMouseMove: (e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * W;
                    const ratio = (x - PAD.left) / plotW;
                    const index = Math.round(ratio * (n - 1));
                    setHover(Math.min(Math.max(index, 0), n - 1));
                }, children: [costTicks.map((value, idx) => {
                        const y = yCost(value);
                        return (_jsxs("g", { children: [_jsx("line", { x1: PAD.left, x2: W - PAD.right, y1: y, y2: y, className: css.chartGrid }), _jsx("text", { x: PAD.left - 8, y: y + 3, textAnchor: "end", className: css.chartAxisLabel, children: formatMoney(value) })] }, `cost-${idx}`));
                    }), columns.map(column => (_jsx("g", { children: column.segments.map(segment => (_jsx("rect", { x: column.x - barW / 2, y: yCost(segment.y1), width: barW, height: Math.max(segment.y1 - segment.y0 > 0 ? 1 : 0, yCost(segment.y0) - yCost(segment.y1)), rx: segment.rounded ? 3 : 0, className: css.chartStack, style: { fill: segment.model.color } }, segment.model.key))) }, column.date))), indices.map((i) => {
                        const point = data[i];
                        if (point === undefined)
                            return null;
                        return (_jsx("text", { x: inner(i), y: H - 6, textAnchor: "middle", className: css.chartAxisLabel, children: shortDate(point.date) }, point.date));
                    }), activeColumn !== undefined && hover !== null && (_jsx("line", { x1: inner(hover), x2: inner(hover), y1: PAD.top, y2: PAD.top + layout.plotH, className: css.chartCrosshair }))] }), activeColumn !== undefined && activePoint !== undefined && hover !== null && (_jsxs("div", { className: css.chartTooltip, style: { left: `${(inner(hover) / W) * 100}%`, top: `${(yCost(activeColumn.total) / H) * 100}%` }, children: [_jsx("div", { className: css.chartTooltipDate, children: activePoint.date }), activeColumn.segments.filter(segment => segment.y1 - segment.y0 > 0).map(segment => (_jsxs("div", { className: css.chartTooltipRow, children: [_jsx("span", { className: css.chartTooltipSwatch, style: { background: segment.model.color } }), segment.model.name, " ", _jsx("strong", { children: formatMoney(segment.y1 - segment.y0) })] }, segment.model.key))), _jsxs("div", { className: css.chartTooltipRow, children: [_jsx("span", { className: css.chartLegendBar }), "\u603B\u8BA1 ", _jsx("strong", { children: formatMoney(activeColumn.total) })] }), _jsxs("div", { className: css.chartTooltipRow, children: [_jsx("span", { className: css.chartLegendLine }), "\u8C03\u7528 ", _jsx("strong", { children: activePoint.calls.toLocaleString() })] })] })), models.length > 0 && (_jsx("div", { className: css.chartLegend, children: models.map(model => (_jsxs("span", { children: [_jsx("span", { className: css.chartTooltipSwatch, style: { background: model.color } }), model.name] }, model.key))) }))] }));
}
//# sourceMappingURL=TrendChart.js.map