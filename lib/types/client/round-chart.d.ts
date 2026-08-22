/**
 * RoundCostChart: dependency-free per-turn cost bars with spike markers.
 *
 * One bar per turn (most recent N, newest last), height scaled to the window
 * maximum. Turns flagged by {@link flagAnomalies} get a warning outline and a
 * corner marker; hover shows the turn's model, cost, and window time. Styling
 * lives in the billing CSS module (`.rounds*`).
 */
import type { AnomalyFlag } from './anomaly.ts';
import { type CostCurrency } from './pricing.ts';
/** 每轮费用图的一行（TurnUsageRow 的展示子集）。 */
export interface RoundChartRow {
    sessionId: string;
    turn: number;
    model: string;
    cost: number;
    input: number;
    output: number;
    cacheHit: number;
    cacheMiss: number;
    startedAt: number;
    endedAt?: number;
}
/**
 * Render the per-turn cost bars.
 * @param props.rounds - turns, most recent last (ascending startedAt); oldest beyond the limit are dropped.
 * @param props.flags - spike flags matched by sessionId+turn.
 * @param props.currency - display currency for the amount labels.
 * @param props.t - locale function for the model label.
 */
export declare function RoundCostChart({ rounds, flags, currency, t }: {
    rounds: readonly RoundChartRow[];
    flags: readonly AnomalyFlag[];
    currency: CostCurrency;
    t: (key: 'billing.model' | 'billing.costAbbr') => string;
}): React.ReactNode;
//# sourceMappingURL=round-chart.d.ts.map