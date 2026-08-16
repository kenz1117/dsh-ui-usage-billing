/**
 * TrendChart: dependency-free SVG combo chart of daily cost (area line) and
 * daily call volume (bars) with a hover crosshair. No chart library — the
 * surface stays self-contained and offline.
 */
/** One day row fed to the chart. */
export interface TrendPoint {
    /** ISO date `YYYY-MM-DD`. */
    date: string;
    /** USD cost that day. */
    cost: number;
    /** API calls that day. */
    calls: number;
}
/**
 * Render the daily trend chart.
 * @param props.data - sorted daily rows (ascending date).
 */
export declare function TrendChart({ data }: {
    data: readonly TrendPoint[];
}): React.ReactNode;
//# sourceMappingURL=TrendChart.d.ts.map