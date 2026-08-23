/**
 * UsageHeatmap: dependency-free month calendar heatmap of daily cost.
 *
 * Styled after an "activity map": one large rounded cell per day with the
 * date number printed inside, laid out in a 7-column grid (Sunday-first).
 * Week-first data layout: each week is one array element of 7 cells, so the
 * grid auto-rows place them correctly without per-cell gridColumnStart hacks.
 * Cell intensity is the day's cost quantized to five levels against the month
 * maximum (mint-green gradient, like the reference activity map). Leading
 * slots before the 1st and trailing slots after the last day carry the
 * cross-month dates as gray placeholders; future days of this month render as
 * gray placeholders too. Hover shows the exact date and amount.
 */
import { type CostCurrency } from './pricing.ts';
/** One heatmap day. */
export interface HeatmapDay {
    /** ISO date `YYYY-MM-DD` (local calendar). */
    date: string;
    /** Value to intensity-map (daily cost in CNY). */
    value: number;
}
/**
 * Render the month or year heatmap.
 * @param props.days - daily cost rows (keys are `YYYY-MM-DD`).
 * @param props.currency - display currency for the hover amount.
 * @param props.now - anchor date (defaults to today); injectable for tests.
 * @param props.t - locale function (used for the legend labels).
 * @param props.range - `month` (calendar month) or `year` (last 52 weeks, GitHub style).
 */
export declare function UsageHeatmap({ days, currency, now, t, range }: {
    days: readonly HeatmapDay[];
    currency: CostCurrency;
    now?: Date;
    range?: 'month' | 'year';
    t: (key: 'billing.costAbbr' | 'billing.noData' | 'billing.heatmapLess' | 'billing.heatmapMore') => string;
}): React.ReactNode;
//# sourceMappingURL=heatmap.d.ts.map