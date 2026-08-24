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
import { type CostCurrency } from './pricing.ts';
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
    /** Total tokens that day (input+output+cache); used by the `tokens` metric. */
    tokens?: number;
    /** Per-model cost that day (stats key → CNY); absent entries plot zero. */
    byModel?: Readonly<Record<string, number>>;
}
/** Metric rendered by the chart columns: daily cost (stacked by model) or total tokens. */
export type TrendMetric = 'cost' | 'tokens';
/**
 * Render the daily bars plus the total-calls line.
 * @param props.data - sorted daily rows (ascending date).
 * @param props.models - the model legend, in bar order (used by the `cost` metric).
 * @param props.currency - display currency for the cost labels.
 * @param props.metric - `cost` (stacked per-model CNY, default) or `tokens` (single-color total tokens).
 */
export declare function TrendChart({ data, models, currency, metric }: {
    data: readonly TrendPoint[];
    models?: readonly TrendSeriesModel[];
    currency?: CostCurrency;
    metric?: TrendMetric;
}): React.ReactNode;
//# sourceMappingURL=TrendChart.d.ts.map