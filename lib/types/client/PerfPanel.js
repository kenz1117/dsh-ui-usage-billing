import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * PerfPanel: per-model latency/perf table + per-hour TTFT/generation-speed curve.
 *
 * Reads the optional `perf` field of the usage-stats document (aggregated by
 * the host from session logs). Renders a per-model table of TTFT mean/P50/P90,
 * generation speed, total latency and estimated-step count, plus a small
 * dependency-free SVG twin-series hourly curve (TTFT in ms on the left axis,
 * tokens/s on the right). Absent `perf` (older snapshot or stream-less logs)
 * renders an empty state; the panel never fabricates samples.
 */
import { useMemo } from 'react';
import css from './UsageBilling.module.css';
/** Fixed viewBox for the hourly curve; the SVG scales to its container. */
const W = 680;
const H = 180;
const PAD = { top: 14, right: 42, bottom: 22, left: 46 };
/** 小时曲线最多展示的小时数（避免窗口内小时过多挤成一团）。 */
const MAX_HOURS = 48;
/** 最近窗口内的小时点（键升序，尾部补齐空白，最旧在前）。 */
function sortHourPoints(byHour) {
    const keys = Object.keys(byHour).sort();
    const points = [];
    for (const key of keys.slice(-MAX_HOURS)) {
        const data = byHour[key];
        if (data === undefined)
            continue;
        points.push({ key, ttftMs: data.ttftAvg, ...(data.tpsAvg === undefined ? {} : { tps: data.tpsAvg }) });
    }
    return points;
}
/** 短小时标签 `MM-DD HH`（跨天在小时键上有日期，直接截取即可辨识）。 */
function shortHour(key) {
    return key.slice(5, 13).replace('T', ' ');
}
/**
 * Render the performance panel.
 * @param props.perf - the optional perf doc; `undefined`/empty renders an empty state.
 * @param props.models - model legend (key/name/color) for the table swatches and curve legend.
 * @param props.t - locale function.
 */
export function PerfPanel({ perf, models, t, }) {
    const colorOf = (model) => models.find(m => m.key === model)?.color ?? '#8b95a3';
    // 模型行：按样本数降序（活跃模型靠前），色点取自模型图例。
    const rows = useMemo(() => {
        if (perf === undefined)
            return [];
        return Object.entries(perf.byModel)
            .map(([key, data]) => ({
            key,
            // 目录键 → 显示名：未知键原样保留，避免误当已知模型。
            name: models.find(m => m.key === key)?.name ?? key,
            color: colorOf(key),
            samples: data.samples,
            ttftAvg: data.ttftAvg,
            ttftP50: data.ttftP50,
            ttftP90: data.ttftP90,
            ...(data.tpsAvg === undefined ? {} : { tpsAvg: data.tpsAvg }),
            latencyAvg: data.latencyAvg,
            estimatedSamples: data.estimatedSamples,
        }))
            .sort((a, b) => b.samples - a.samples || b.ttftP90 - a.ttftP90);
    }, [perf, models]);
    // 小时序列：TTFT 折线（左轴 ms）+ 速度折线（右轴 tok/s）。
    const hourLayout = useMemo(() => {
        const points = perf === undefined ? [] : sortHourPoints(perf.byHour);
        if (points.length === 0)
            return null;
        const n = points.length;
        const plotW = W - PAD.left - PAD.right;
        const plotH = H - PAD.top - PAD.bottom;
        const inner = (i) => (n === 1 ? PAD.left + plotW / 2 : PAD.left + (plotW * i) / (n - 1));
        const maxTtft = Math.max(...points.map(p => p.ttftMs), 1);
        const maxTps = Math.max(...points.map(p => p.tps ?? 0), 1);
        const yTtft = (v) => PAD.top + plotH - (v / maxTtft) * plotH;
        const yTps = (v) => PAD.top + plotH - (v / maxTps) * plotH;
        const ttftPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${inner(i)} ${yTtft(p.ttftMs)}`).join(' ');
        const tpsPath = points.some(p => p.tps !== undefined)
            ? points.map((p, i) => `${i === 0 ? 'M' : 'L'}${inner(i)} ${yTps(p.tps ?? 0)}`).join(' ')
            : '';
        const step = Math.max(1, Math.ceil(n / 8));
        const indices = [];
        for (let i = 0; i < n; i += step)
            indices.push(i);
        if (n > 0 && indices[indices.length - 1] !== n - 1)
            indices.push(n - 1);
        const ttftTicks = [0, 0.5, 1].map(f => maxTtft * f).reverse();
        return { points, n, inner, yTtft, ttftPath, tpsPath, indices, ttftTicks, maxTps };
    }, [perf]);
    if (perf === undefined || rows.length === 0) {
        return _jsx("div", { className: css.chartEmpty, "data-testid": "billing-perf-empty", children: t('billing.perfEmpty') });
    }
    return (_jsxs("div", { "data-testid": "billing-perf-panel", children: [_jsx("div", { className: css.tableScroll, "data-testid": "billing-perf-table", children: _jsxs("table", { className: css.modelTable, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: t('billing.model') }), _jsx("th", { className: css.numCol, children: t('billing.perfSamples') }), _jsx("th", { className: css.numCol, children: t('billing.perfTtft') }), _jsx("th", { className: css.numCol, children: t('billing.perfP50') }), _jsx("th", { className: css.numCol, children: t('billing.perfP90') }), _jsx("th", { className: css.numCol, children: t('billing.perfTps') }), _jsx("th", { className: css.numCol, children: t('billing.perfLatency') }), _jsx("th", { className: css.numCol, children: t('billing.perfEstimated') })] }) }), _jsx("tbody", { children: rows.map(row => (_jsxs("tr", { children: [_jsx("td", { children: _jsxs("span", { className: css.modelCell, children: [_jsx("span", { className: css.modelDot, style: { background: row.color } }), _jsx("span", { className: css.modelName, children: row.name })] }) }), _jsx("td", { className: css.numCol, children: row.samples.toLocaleString() }), _jsxs("td", { className: css.numCol, children: [row.ttftAvg.toFixed(0), " ms"] }), _jsxs("td", { className: css.numCol, children: [row.ttftP50.toFixed(0), " ms"] }), _jsxs("td", { className: css.numCol, children: [row.ttftP90.toFixed(0), " ms"] }), _jsx("td", { className: css.numCol, children: row.tpsAvg === undefined ? _jsx("span", { className: css.na, children: "\u2014" }) : `${row.tpsAvg.toFixed(1)}` }), _jsxs("td", { className: css.numCol, children: [row.latencyAvg.toFixed(0), " ms"] }), _jsx("td", { className: css.numCol, children: row.estimatedSamples > 0 ? row.estimatedSamples : _jsx("span", { className: css.na, children: "\u2014" }) })] }, row.key))) })] }) }), hourLayout !== null && (_jsxs("div", { className: css.chartWrap, "data-testid": "billing-perf-hour", children: [_jsxs("svg", { viewBox: `0 0 ${W} ${H}`, className: css.chartSvg, role: "img", "aria-label": "Hourly TTFT and generation speed by model", children: [hourLayout.ttftTicks.map((value, idx) => {
                                const y = hourLayout.yTtft(value);
                                return (_jsxs("g", { children: [_jsx("line", { x1: PAD.left, x2: W - PAD.right, y1: y, y2: y, className: css.chartGrid }), _jsx("text", { x: PAD.left - 8, y: y + 3, textAnchor: "end", className: css.chartAxisLabel, children: value.toFixed(0) })] }, `ttft-${idx}`));
                            }), _jsx("path", { d: hourLayout.ttftPath, fill: "none", className: css.chartLine }), hourLayout.tpsPath !== '' && _jsx("path", { d: hourLayout.tpsPath, fill: "none", className: css.chartLine, style: { stroke: 'var(--dsw-static-amber-500)', strokeDasharray: '4 4' } }), hourLayout.indices.map((i) => {
                                const point = hourLayout.points[i];
                                if (point === undefined)
                                    return null;
                                return (_jsx("text", { x: hourLayout.inner(i), y: H - 6, textAnchor: "middle", className: css.chartAxisLabel, children: shortHour(point.key) }, point.key));
                            }), _jsxs("text", { x: W - PAD.right + 8, y: PAD.top + 4, textAnchor: "start", className: css.chartAxisLabel, children: [t('billing.perfTpsUnit'), " ", hourLayout.maxTps.toFixed(0)] })] }), _jsxs("div", { className: css.chartLegend, children: [_jsxs("span", { children: [_jsx("span", { className: css.chartLegendLine }), t('billing.perfTtft'), " (ms)"] }), _jsxs("span", { children: [_jsx("span", { className: css.chartLegendLine, style: { background: 'var(--dsw-static-amber-500)' } }), t('billing.perfTps'), " (", t('billing.perfTpsUnit'), ")"] })] })] }))] }));
}
//# sourceMappingURL=PerfPanel.js.map