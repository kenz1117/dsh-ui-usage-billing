import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * TokenPanel: 「Token」分区——把 token 从费用里独立出来洞察。
 * 三个板块 + 导出，全部由 `UsageStats` 的 byDay/byModel/total 派生，服务端零改动：
 *  1. 每日 Token 堆叠趋势（未命中输入 / 缓存命中 / 输出[含 reasoning]），7/30 天切换；
 *  2. 模型 Token 总量排行 + 占比；
 *  3. Token 结构 KPI（缓存命中率 / reasoning 占比 / 输入:输出比 / 峰值日）。
 */
import { useMemo } from 'react';
import clsx from 'clsx';
import css from './UsageBilling.module.css';
import { formatTokens, modelOf } from "./pricing.js";
/** 本地时区 `YYYY-MM-DD`（与服务端 dayStamp 一致）。 */
function localStamp(time = Date.now()) {
    const d = new Date(time);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
/** 短数字刻度：`1.2M` / `3.4K`。 */
function shortNumber(v) {
    if (v >= 1_000_000)
        return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)
        return `${(v / 1_000).toFixed(1)}K`;
    return String(Math.round(v));
}
const W = 680;
const H = 200;
const PAD = { top: 14, right: 18, bottom: 22, left: 46 };
const MISS_COLOR = 'var(--dsw-static-blue-500)';
// 缓存命中段：用青色系与输入（蓝）区分；`--dsw-static-cyan-500` 在宿主主题里不存在，
// 改用自定义青绿色（#14b8a6）保证可读性。
const HIT_COLOR = '#14b8a6';
const OUTPUT_COLOR = 'var(--dsw-static-amber-500)';
/** 导出按日 token CSV。 */
function tokenDayCsv(days) {
    const head = 'date,missInput,cacheHit,output,reasoning,total';
    const rows = days.map(d => `${d.date},${d.miss},${d.hit},${d.output},${d.reasoning},${d.miss + d.hit + d.output}`);
    return [head, ...rows].join('\n');
}
/**
 * Token 洞察面板。
 * @param props.stats - usage-stats 文档（byDay/byModel/total）。
 * @param props.trendDays - 每日 token 窗口（7/30 天）。
 * @param props.onTrendDays - 切换趋势窗口。
 */
export function TokenPanel(props) {
    const { stats, trendDays, onTrendDays, t } = props;
    const { byDay, byModel, total } = stats;
    // 每日 token 窗口（缺日补 0）。
    const days = useMemo(() => {
        const out = [];
        for (let offset = trendDays - 1; offset >= 0; offset -= 1) {
            const d = new Date();
            d.setDate(d.getDate() - offset);
            const date = localStamp(d.getTime());
            const day = byDay[date];
            out.push({
                date,
                miss: day?.cacheMiss ?? 0,
                hit: day?.cacheHit ?? 0,
                output: day?.output ?? 0,
                reasoning: day?.reasoning ?? 0,
            });
        }
        return out;
    }, [byDay, trendDays]);
    // 模型 token 排行。
    const models = useMemo(() => {
        let grand = 0;
        const rows = Object.entries(byModel)
            .filter(([, d]) => d.calls > 0)
            .map(([key, d]) => {
            const totalTokens = d.input + d.output;
            grand += totalTokens;
            const hitMiss = d.cacheHit + d.cacheMiss;
            return {
                key,
                name: modelOf(key).name,
                input: d.input,
                output: d.output,
                reasoning: d.reasoning ?? 0,
                calls: d.calls,
                cacheHit: d.cacheHit,
                cacheMiss: d.cacheMiss,
                cacheHitRate: hitMiss > 0 ? (d.cacheHit / hitMiss) * 100 : 0,
                total: totalTokens,
                share: 0,
            };
        })
            .sort((a, b) => b.total - a.total);
        return rows.map(r => ({ ...r, share: grand > 0 ? r.total / grand : 0 }));
    }, [byModel]);
    // 结构 KPI。（对旧快照缺失字段兜底：reasoning/cacheRead 等可能为 undefined。）
    const kpis = useMemo(() => {
        const hit = total.cacheHit ?? 0;
        const miss = total.cacheMiss ?? 0;
        const input = total.input ?? 0;
        const output = total.output ?? 0;
        const reasoning = total.reasoning ?? 0;
        const hitMiss = hit + miss;
        const cacheHitRate = hitMiss > 0 ? (hit / hitMiss) * 100 : 0;
        const reasoningPct = output > 0 ? (reasoning / output) * 100 : 0;
        const io = output > 0 ? input / output : 0;
        let peak;
        for (const d of days) {
            const t2 = d.miss + d.hit + d.output;
            if (peak === undefined || t2 > peak.miss + peak.hit + peak.output)
                peak = d;
        }
        return { cacheHitRate, reasoningPct, io, peak, hit, miss, input, output, reasoning };
    }, [total, days]);
    // 每日堆叠图布局。
    const chart = useMemo(() => {
        const n = days.length;
        if (n === 0)
            return null;
        const plotW = W - PAD.left - PAD.right;
        const plotH = H - PAD.top - PAD.bottom;
        const max = Math.max(...days.map(d => d.miss + d.hit + d.output), 1);
        const y = (v) => PAD.top + plotH - (v / max) * plotH;
        const groupW = plotW / n;
        const barW = Math.min(20, groupW * 0.6);
        const inner = (i) => (n === 1 ? PAD.left + plotW / 2 : PAD.left + (plotW * i) / (n - 1));
        const step = Math.max(1, Math.ceil(n / 8));
        const indices = [];
        for (let i = 0; i < n; i += step)
            indices.push(i);
        if (n > 0 && indices[indices.length - 1] !== n - 1)
            indices.push(n - 1);
        return { n, plotW, plotH, max, y, barW, inner, indices };
    }, [days]);
    // 导出：按日 token CSV + token 汇总 JSON。
    const exportTokenCsv = () => {
        const blob = new Blob([tokenDayCsv(days)], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `token-daily-${localStamp()}.csv`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 0);
    };
    const exportTokenJson = () => {
        const blob = new Blob([JSON.stringify({ days, models, total }, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `token-${localStamp()}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 0);
    };
    return (_jsxs("div", { className: css.tokenPanel, "data-testid": "billing-token-panel", children: [_jsxs("div", { className: css.exportBar, role: "group", "aria-label": t('billing.tokenExport'), children: [_jsx("span", { className: css.exportLabel, children: t('billing.export') }), _jsx("button", { type: "button", className: css.exportButton, "data-testid": "billing-token-export-csv", onClick: exportTokenCsv, children: t('billing.tokenExportCsv') }), _jsx("button", { type: "button", className: css.exportButton, "data-testid": "billing-token-export-json", onClick: exportTokenJson, children: t('billing.exportJson') })] }), _jsxs("div", { className: css.kpiGrid, "data-testid": "billing-token-kpis", children: [_jsxs("div", { className: css.kpiTile, children: [_jsx("span", { className: css.kpiLabel, children: t('billing.tokenCacheHitRate') }), _jsxs("span", { className: css.kpiValue, children: [kpis.cacheHitRate.toFixed(1), "%"] }), _jsxs("span", { className: css.kpiDetail, children: [formatTokens(kpis.hit), " / ", formatTokens(kpis.hit + kpis.miss)] })] }), _jsxs("div", { className: css.kpiTile, children: [_jsx("span", { className: css.kpiLabel, children: t('billing.tokenReasoningShare') }), _jsxs("span", { className: css.kpiValue, children: [kpis.reasoningPct.toFixed(1), "%"] }), _jsx("span", { className: css.kpiDetail, children: formatTokens(kpis.reasoning) })] }), _jsxs("div", { className: css.kpiTile, children: [_jsx("span", { className: css.kpiLabel, children: t('billing.tokenIo') }), _jsx("span", { className: css.kpiValue, children: kpis.io.toFixed(2) }), _jsxs("span", { className: css.kpiDetail, children: [formatTokens(kpis.input), " / ", formatTokens(kpis.output)] })] }), _jsxs("div", { className: css.kpiTile, children: [_jsx("span", { className: css.kpiLabel, children: t('billing.tokenPeak') }), _jsx("span", { className: css.kpiValue, children: kpis.peak === undefined ? '—' : shortNumber(kpis.peak.miss + kpis.peak.hit + kpis.peak.output) }), _jsx("span", { className: css.kpiDetail, children: kpis.peak?.date ?? '—' })] })] }), _jsxs("section", { className: css.panel, "data-testid": "billing-token-daily", children: [_jsxs("div", { className: css.panelHead, children: [_jsx("h3", { className: css.panelTitle, children: t('billing.tokenDaily') }), _jsx("span", { className: css.rangeToggle, role: "group", "aria-label": t('billing.tokenDaily'), children: [7, 30].map(d => (_jsx("button", { type: "button", className: clsx(css.rangeButton, trendDays === d && css.rangeButtonActive), "aria-pressed": trendDays === d, onClick: () => { onTrendDays(d); }, "data-testid": `billing-token-${d}d`, children: d === 7 ? t('billing.trend7d') : t('billing.trend30d') }, d))) })] }), chart === null ? (_jsx("div", { className: css.chartEmpty, children: t('billing.trendEmpty') })) : (_jsxs("div", { className: css.chartWrap, children: [_jsxs("svg", { viewBox: `0 0 ${W} ${H}`, className: css.chartSvg, role: "img", "aria-label": t('billing.tokenDaily'), children: [[0, 0.5, 1].map((f) => {
                                        const v = chart.max * f;
                                        const yy = chart.y(v);
                                        return (_jsxs("g", { children: [_jsx("line", { x1: PAD.left, x2: W - PAD.right, y1: yy, y2: yy, className: css.chartGrid }), _jsx("text", { x: PAD.left - 8, y: yy + 3, textAnchor: "end", className: css.chartAxisLabel, children: shortNumber(v) })] }, f));
                                    }), days.map((d, i) => {
                                        const x = chart.inner(i) - chart.barW / 2;
                                        const baseY = chart.y(0);
                                        const yMiss = chart.y(d.miss);
                                        const yHit = chart.y(d.miss + d.hit);
                                        const yOut = chart.y(d.miss + d.hit + d.output);
                                        return (_jsxs("g", { children: [_jsx("rect", { x: x, y: yMiss, width: chart.barW, height: baseY - yMiss, fill: MISS_COLOR }), _jsx("rect", { x: x, y: yHit, width: chart.barW, height: yMiss - yHit, fill: HIT_COLOR }), _jsx("rect", { x: x, y: yOut, width: chart.barW, height: yHit - yOut, fill: OUTPUT_COLOR })] }, d.date));
                                    }), chart.indices.map((i) => {
                                        const d = days[i];
                                        if (d === undefined)
                                            return null;
                                        return _jsx("text", { x: chart.inner(i), y: H - 6, textAnchor: "middle", className: css.chartAxisLabel, children: d.date.slice(5) }, d.date);
                                    })] }), _jsxs("div", { className: css.chartLegend, children: [_jsxs("span", { children: [_jsx("span", { className: css.chartTooltipSwatch, style: { background: MISS_COLOR } }), t('billing.tokenMiss')] }), _jsxs("span", { children: [_jsx("span", { className: css.chartTooltipSwatch, style: { background: HIT_COLOR } }), t('billing.tokenHit')] }), _jsxs("span", { children: [_jsx("span", { className: css.chartTooltipSwatch, style: { background: OUTPUT_COLOR } }), t('billing.tokenOutput')] })] })] }))] }), _jsxs("section", { className: css.panel, "data-testid": "billing-token-models", children: [_jsx("div", { className: css.panelHead, children: _jsx("h3", { className: css.panelTitle, children: t('billing.tokenByModel') }) }), models.length === 0 ? (_jsx("div", { className: css.emptyRow, children: t('billing.noData') })) : (_jsx("div", { className: css.tableScroll, children: _jsxs("table", { className: css.modelTable, "data-testid": "billing-token-model-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: t('billing.model') }), _jsx("th", { className: css.numCol, children: t('billing.inputTokens') }), _jsx("th", { className: css.numCol, children: t('billing.outputTokens') }), _jsx("th", { className: css.numCol, children: t('billing.tokenReasoningShort') }), _jsx("th", { className: css.numCol, children: t('billing.cacheHitRate') }), _jsx("th", { className: css.numCol, children: t('billing.tokenTotal') }), _jsx("th", { className: css.numCol, children: t('billing.tokenShare') }), _jsx("th", { className: css.numCol, children: t('billing.calls') })] }) }), _jsx("tbody", { children: models.map(m => (_jsxs("tr", { "data-testid": "billing-token-model", children: [_jsx("td", { children: _jsx("span", { className: css.modelName, children: m.name }) }), _jsx("td", { className: css.numCol, children: formatTokens(m.input) }), _jsx("td", { className: css.numCol, children: formatTokens(m.output) }), _jsx("td", { className: css.numCol, children: m.reasoning > 0 ? formatTokens(m.reasoning) : _jsx("span", { className: css.na, children: "\u2014" }) }), _jsxs("td", { className: css.numCol, children: [m.cacheHitRate.toFixed(1), "%"] }), _jsx("td", { className: css.numCol, children: formatTokens(m.total) }), _jsx("td", { className: css.numCol, children: _jsxs("span", { className: css.tokenModelShareRow, children: [_jsx("span", { className: css.tokenModelBar, children: _jsxs("span", { className: css.tokenModelParts, style: { width: `${(m.share * 100).toFixed(2)}%` }, children: [_jsx("span", { className: css.tokenModelPartIn, style: { width: `${m.total > 0 ? (m.input / m.total) * 100 : 0}%` } }), _jsx("span", { className: css.tokenModelPartOut, style: { width: `${m.total > 0 ? (m.output / m.total) * 100 : 0}%` } })] }) }), (m.share * 100).toFixed(1), "%"] }) }), _jsx("td", { className: css.numCol, children: m.calls.toLocaleString() })] }, m.key))) })] }) }))] })] }));
}
//# sourceMappingURL=TokenPanel.js.map