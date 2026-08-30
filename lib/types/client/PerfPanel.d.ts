/**
 * PerfPanel: per-model latency/perf table + per-hour per-model comparison curve.
 *
 * Reads the optional `perf` field of the usage-stats document (aggregated by
 * the host from session logs). Renders a per-model table of TTFT mean/P50/P90,
 * generation speed, total latency and estimated-step count, plus a small
 * dependency-free SVG hourly curve: one colored polyline per lit model with a
 * metric tab (TTFT ms / tok/s) and clickable model chips; hovering snaps to the
 * nearest hour and shows a crosshair + tooltip listing every lit model's value.
 * Absent `perf` renders an empty state; the panel never fabricates samples.
 */
import type { TrendSeriesModel } from './TrendChart.tsx';
import type { UsageBillingKey } from './locales.ts';
/** 每模型性能统计（与服务端 `ModelPerf` 同形）。 */
export interface PerfModelData {
    samples: number;
    ttftAvg: number;
    ttftP50: number;
    ttftP90: number;
    /** 首字延时最大值（毫秒）；1.0.8 起新增，旧快照缺失。 */
    ttftMax?: number;
    /** 首字延时尖峰样本数（> 10s）；1.0.8 起新增，旧快照缺失。 */
    ttftSpikes?: number;
    tpsAvg?: number;
    latencyAvg: number;
    estimatedSamples: number;
}
/** 小时×模型性能统计（与服务端 `HourModelPerf` 同形）。 */
export interface PerfHourModelData {
    samples: number;
    ttftAvg: number;
    tpsAvg?: number;
}
/** 性能指标文档（服务端可选 `perf` 字段；旧快照缺失）。 */
export interface ClientPerf {
    byModel: Record<string, PerfModelData>;
    /** 小时 → 模型 → 小时统计；旧 host 文档缺失时图表区按空态兜底。 */
    byHourModel: Record<string, Record<string, PerfHourModelData>>;
}
/**
 * Render the performance panel.
 * @param props.perf - the optional perf doc; `undefined`/empty renders an empty state.
 * @param props.models - model legend (key/name/color) for the table swatches and curve chips.
 * @param props.t - locale function.
 */
export declare function PerfPanel({ perf, models, t, }: {
    perf: ClientPerf | undefined;
    models: readonly TrendSeriesModel[];
    t: (key: UsageBillingKey) => string;
}): React.ReactNode;
//# sourceMappingURL=PerfPanel.d.ts.map