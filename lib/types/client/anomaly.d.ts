/**
 * Cost-spike anomaly detection (pure): marks turns whose cost exceeds a
 * rolling baseline, with attribution chips. Shared by the per-turn chart and
 * any future surface; kept free of React so it unit-tests without a host.
 *
 * Adapted from the community dsh-usage-chart flagAnomalies semantics: the
 * baseline is the previous up-to-`window` turns (rows without a cost are
 * skipped, so the window counts effective rows).
 */
/** 异常归因 chip：输出增长 / 上下文膨胀 / 缓存命中率下降。 */
export type AnomalyReason = 'output-growth' | 'context-bloat' | 'cache-hit-drop';
/** 一轮异常标记（按会话+轮次定位）。 */
export interface AnomalyFlag {
    /** 会话 id（与数据行一致，用于定位该轮）。 */
    sessionId: string;
    /** 会话内轮次号。 */
    turn: number;
    /** 该轮成本（人民币元）。 */
    cost: number;
    /** 归因原因（可为空：只有突增事实、无明确归因）。 */
    reasons: readonly AnomalyReason[];
}
/** 异常判定所需的每轮数据形状（TurnUsageRow 的子集）。 */
export interface AnomalyRound {
    sessionId: string;
    turn: number;
    /** 该轮成本；未估算（订阅/未知）时可为 0——基线窗口跳过 0 成本轮。 */
    cost: number;
    output: number;
    input: number;
    cacheHit: number;
    cacheMiss: number;
}
/** 异常判定调参。 */
export interface AnomalyOptions {
    /** 对比窗口：取该轮之前至多 window 轮做基线。默认 6。 */
    window?: number;
    /** 突增阈值：成本超过基线均值 × threshold 即标记。默认 2。 */
    threshold?: number;
    /** 归因阈值：输出/输入超过基线均值 × 该值归因为增长。默认 1.8。 */
    reasonFactor?: number;
    /** 归因阈值：缓存命中率低于基线该百分点归因为下降。默认 15。 */
    reasonHitDropPp?: number;
}
/**
 * 标记成本异常轮次（按时间顺序传入；最近的轮次排在末尾）。
 * @param rounds - 按起始时间升序的轮次序列（最早在前）。
 * @param options - 窗口/阈值/归因灵敏度。
 * @returns 异常标记数组（保持输入顺序）。
 */
export declare function flagAnomalies(rounds: readonly AnomalyRound[], options?: AnomalyOptions): AnomalyFlag[];
//# sourceMappingURL=anomaly.d.ts.map