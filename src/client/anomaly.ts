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
export type AnomalyReason = 'output-growth' | 'context-bloat' | 'cache-hit-drop'

/** 一轮异常标记（按会话+轮次定位）。 */
export interface AnomalyFlag {
  /** 会话 id（与数据行一致，用于定位该轮）。 */
  sessionId: string
  /** 会话内轮次号。 */
  turn: number
  /** 该轮成本（人民币元）。 */
  cost: number
  /** 归因原因（可为空：只有突增事实、无明确归因）。 */
  reasons: readonly AnomalyReason[]
}

/** 异常判定所需的每轮数据形状（TurnUsageRow 的子集）。 */
export interface AnomalyRound {
  sessionId: string
  turn: number
  /** 该轮成本；未估算（订阅/未知）时可为 0——基线窗口跳过 0 成本轮。 */
  cost: number
  output: number
  input: number
  cacheHit: number
  cacheMiss: number
}

/** 异常判定调参。 */
export interface AnomalyOptions {
  /** 对比窗口：取该轮之前至多 window 轮做基线。默认 6。 */
  window?: number
  /** 突增阈值：成本超过基线均值 × threshold 即标记。默认 2。 */
  threshold?: number
  /** 归因阈值：输出/输入超过基线均值 × 该值归因为增长。默认 1.8。 */
  reasonFactor?: number
  /** 归因阈值：缓存命中率低于基线该百分点归因为下降。默认 15。 */
  reasonHitDropPp?: number
}

const DEFAULTS = {
  window: 6,
  threshold: 2,
  reasonFactor: 1.8,
  reasonHitDropPp: 15,
} as const

function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null
  let sum = 0
  for (const value of values) sum += value
  return sum / values.length
}

/** 输入侧缓存命中率（百分比）；无输入时 null。 */
function cacheHitRate(round: AnomalyRound): number | null {
  const denominator = round.cacheHit + round.cacheMiss
  return denominator <= 0 ? null : (round.cacheHit / denominator) * 100
}

/**
 * 标记成本异常轮次（按时间顺序传入；最近的轮次排在末尾）。
 * @param rounds - 按起始时间升序的轮次序列（最早在前）。
 * @param options - 窗口/阈值/归因灵敏度。
 * @returns 异常标记数组（保持输入顺序）。
 */
export function flagAnomalies(rounds: readonly AnomalyRound[], options?: AnomalyOptions): AnomalyFlag[] {
  const opts = { ...DEFAULTS, ...options }
  const flags: AnomalyFlag[] = []
  if (opts.window <= 0 || opts.threshold <= 0) return flags

  const baselineCosts: number[] = []
  const baselineOutputs: number[] = []
  const baselineInputs: number[] = []
  const baselineHits: number[] = []

  for (const round of rounds) {
    // 0 成本轮（订阅/未知模型）不参与基线，也不判突增。
    if (round.cost <= 0) continue
    const output = round.output
    const input = round.input
    const hit = cacheHitRate(round)

    const baselineCost = mean(baselineCosts)
    const reasons: AnomalyReason[] = []

    if (baselineCost !== null && baselineCost > 0 && round.cost > baselineCost * opts.threshold) {
      const baselineOutput = mean(baselineOutputs)
      const baselineInput = mean(baselineInputs)
      const baselineHit = mean(baselineHits)
      if (baselineOutput !== null && baselineOutput > 0 && output > baselineOutput * opts.reasonFactor) {
        reasons.push('output-growth')
      }
      if (baselineInput !== null && baselineInput > 0 && input > baselineInput * opts.reasonFactor) {
        reasons.push('context-bloat')
      }
      if (baselineHit !== null && hit !== null && hit < baselineHit - opts.reasonHitDropPp) {
        reasons.push('cache-hit-drop')
      }
      flags.push({ sessionId: round.sessionId, turn: round.turn, cost: round.cost, reasons })
    }

    baselineCosts.push(round.cost)
    baselineOutputs.push(output)
    baselineInputs.push(input)
    if (hit !== null) baselineHits.push(hit)
    while (baselineCosts.length > opts.window) baselineCosts.shift()
    while (baselineOutputs.length > opts.window) baselineOutputs.shift()
    while (baselineInputs.length > opts.window) baselineInputs.shift()
    while (baselineHits.length > opts.window) baselineHits.shift()
  }

  return flags
}
