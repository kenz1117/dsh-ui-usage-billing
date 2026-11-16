/**
 * RoundCostChart: dependency-free per-turn cost bars with spike markers.
 *
 * One bar per turn (most recent N, newest last), height scaled to the window
 * maximum. Turns flagged by {@link flagAnomalies} get a warning outline and a
 * corner marker; hover shows the turn's model, cost, and window time. Styling
 * lives in the billing CSS module (`.rounds*`).
 *
 * 入参按服务端口径是**倒序**（`byTurn` 按 startedAt 倒序下发，最新在前），
 * 组件内部排成升序再取末尾 N 轮——展示的是「最新 N 轮、最新在右」。
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
 * @param props.rounds - 逐轮行（服务端按 startedAt 倒序下发；组件内部排升序后取最新 N 轮）。
 * @param props.flags - spike flags matched by sessionId+turn.
 * @param props.currency - display currency for the amount labels.
 * @param props.t - locale function for the model label.
 */
export declare function RoundCostChart({ rounds, flags, currency, t }: {
    rounds: readonly RoundChartRow[];
    flags: readonly AnomalyFlag[];
    currency: CostCurrency;
    t: (key: 'model' | 'costAbbr' | 'roundsUnit') => string;
}): React.ReactNode;
//# sourceMappingURL=round-chart.d.ts.map