/**
 * TrendChart: dependency-free SVG stacked bar chart of daily cost per model.
 * Each day's column stacks every model's share in its brand color, so the
 * total trend and the per-model composition are visible at once. A hover
 * crosshair shows the day's model breakdown. No chart library — the surface
 * stays self-contained and offline.
 */
/** One model's legend identity: key, display name, and brand color. */
export interface TrendSeriesModel {
    /** Stats key (`byModel` key), also the `byModel` map key. */
    key: string;
    /** Human-readable model name. */
    name: string;
    /** Resolved brand color for the stack segment and legend swatch. */
    color: string;
}
/** One day row fed to the chart. */
export interface TrendPoint {
    /** ISO date `YYYY-MM-DD`. */
    date: string;
    /** Total cost that day. */
    cost: number;
    /** API calls that day. */
    calls: number;
    /** Per-model cost that day (stats key → CNY); absent entries stack zero. */
    byModel?: Readonly<Record<string, number>>;
}
/**
 * Render the daily per-model stacked cost chart.
 * @param props.data - sorted daily rows (ascending date).
 * @param props.models - the model legend, in stack order (bottom first).
 */
export declare function TrendChart({ data, models }: {
    data: readonly TrendPoint[];
    models?: readonly TrendSeriesModel[];
}): React.ReactNode;
//# sourceMappingURL=TrendChart.d.ts.map