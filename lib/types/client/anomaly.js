/**
 * Cost-spike anomaly detection (pure): marks turns whose cost exceeds a
 * rolling baseline, with attribution chips. Shared by the per-turn chart and
 * any future surface; kept free of React so it unit-tests without a host.
 *
 * Adapted from the community dsh-usage-chart flagAnomalies semantics: the
 * baseline is the previous up-to-`window` turns (rows without a cost are
 * skipped, so the window counts effective rows).
 */
const DEFAULTS = {
    window: 6,
    threshold: 2,
    reasonFactor: 1.8,
    reasonHitDropPp: 15,
};
function mean(values) {
    if (values.length === 0)
        return null;
    let sum = 0;
    for (const value of values)
        sum += value;
    return sum / values.length;
}
/** 输入侧缓存命中率（百分比）；无输入时 null。 */
function cacheHitRate(round) {
    const denominator = round.cacheHit + round.cacheMiss;
    return denominator <= 0 ? null : (round.cacheHit / denominator) * 100;
}
/**
 * 标记成本异常轮次（按时间顺序传入；最近的轮次排在末尾）。
 * @param rounds - 按起始时间升序的轮次序列（最早在前）。
 * @param options - 窗口/阈值/归因灵敏度。
 * @returns 异常标记数组（保持输入顺序）。
 */
export function flagAnomalies(rounds, options) {
    const opts = { ...DEFAULTS, ...options };
    const flags = [];
    if (opts.window <= 0 || opts.threshold <= 0)
        return flags;
    const baselineCosts = [];
    const baselineOutputs = [];
    const baselineInputs = [];
    const baselineHits = [];
    for (const round of rounds) {
        // 0 成本轮（订阅/未知模型）不参与基线，也不判突增。
        if (round.cost <= 0)
            continue;
        const output = round.output;
        const input = round.input;
        const hit = cacheHitRate(round);
        const baselineCost = mean(baselineCosts);
        const reasons = [];
        if (baselineCost !== null && baselineCost > 0 && round.cost > baselineCost * opts.threshold) {
            const baselineOutput = mean(baselineOutputs);
            const baselineInput = mean(baselineInputs);
            const baselineHit = mean(baselineHits);
            if (baselineOutput !== null && baselineOutput > 0 && output > baselineOutput * opts.reasonFactor) {
                reasons.push('output-growth');
            }
            if (baselineInput !== null && baselineInput > 0 && input > baselineInput * opts.reasonFactor) {
                reasons.push('context-bloat');
            }
            if (baselineHit !== null && hit !== null && hit < baselineHit - opts.reasonHitDropPp) {
                reasons.push('cache-hit-drop');
            }
            flags.push({ sessionId: round.sessionId, turn: round.turn, cost: round.cost, reasons });
        }
        baselineCosts.push(round.cost);
        baselineOutputs.push(output);
        baselineInputs.push(input);
        if (hit !== null)
            baselineHits.push(hit);
        while (baselineCosts.length > opts.window)
            baselineCosts.shift();
        while (baselineOutputs.length > opts.window)
            baselineOutputs.shift();
        while (baselineInputs.length > opts.window)
            baselineInputs.shift();
        while (baselineHits.length > opts.window)
            baselineHits.shift();
    }
    return flags;
}
//# sourceMappingURL=anomaly.js.map