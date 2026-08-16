/**
 * TrendChart: dependency-free SVG chart of daily cost + calls.
 *
 * The columns are GROUPED per model — one bar per model per day, each in its
 * brand color, so per-model cost is directly comparable. The blue line is the
 * total call volume across all models, plotted on its own right-hand axis.
 * A hover crosshair shows the day's model breakdown. No chart library — the
 * surface stays self-contained and offline.
 */
/** One model's legend identity: key, display name, and brand color. */
export interface TrendSeriesModel {
    /** Stats key (`byModel` key), also the `byModel` map key. */
    key: string;
    /** Human-readable model name. */
    name: string;
    /** Resolved brand color for the bar and legend swatch (empty = single-color fallback). */
    color: string;
}
/** One day row fed to the chart. */
export interface TrendPoint {
    /** ISO date `YYYY-MM-DD`. */
    date: string;
    /** Total cost that day. */
    cost: number;
    /** API calls that day (total across models). */
    calls: number;
    /** Per-model cost that day (stats key → CNY); absent entries plot zero. */
    byModel?: Readonly<Record<string, number>>;
}
/**
 * Render the daily grouped cost bars plus the total-calls line.
 * @param props.data - sorted daily rows (ascending date).
 * @param props.models - the model legend, in bar order.
 */
export declare function TrendChart({ data, models }: {
    data: readonly TrendPoint[];
    models?: readonly TrendSeriesModel[];
}): React.ReactNode;
//# sourceMappingURL=TrendChart.d.ts.map