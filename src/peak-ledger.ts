import { computeCostAt, DEFAULT_PEAK_SHARE, tierAt, type ModelEntry, type TokenUsageBuckets } from './client/pricing.ts'
import { accountRoute, customTier, validSource } from './peak-schedule.ts'
import type { indexPeakHistory } from './peak-schedule-history.ts'

export type PeakIndex = ReturnType<typeof indexPeakHistory>
export function scheduleTier(schedule: PeakIndex, source: string | undefined, entry: ModelEntry, model: string, time: number) {
  if (!schedule || !source || entry.key !== model || entry.provider !== 'DeepSeek' || !entry.price.offPeak || entry.tierSemantics === 'latency') return undefined
  const rule = schedule.rule(source, model, time)
  return rule && customTier(time, rule)
}

/** Old site buckets lack raw provider ids. Only trust the historical routing fingerprint
 * when its (unescaped) alias/origin fields can be decoded without ambiguity. */
export function legacyScheduleSource(fingerprint: string | undefined): (site: string) => boolean {
  const parts = fingerprint?.split('|')
  if (parts?.length !== 7) return () => false
  const accountIds = new Set(['deepseek-account'])
  const recordedSites = new Set<string>()
  const protectedSites = new Set<string>()
  for (const pair of parts[2]!.split(',').filter(Boolean)) {
    const match = /^([\w.-]+)=([\w.-]+)$/.exec(pair)
    if (!match) return () => false
    if (accountRoute(match[1]!)) accountIds.add(match[2]!.toLowerCase())
  }
  for (const pair of parts[6]!.split(',').filter(Boolean)) {
    const match = /^([\w.-]+)=(https?:\/\/[^,|]+)$/i.exec(pair)
    if (!match) return () => false
    try {
      const origin = new URL(match[2]!).origin
      recordedSites.add(`site:${origin}`)
      if (accountIds.has(match[1]!.toLowerCase())) protectedSites.add(`site:${origin}`)
    } catch { return () => false }
  }
  return site => validSource(site) && (site.startsWith('direct:')
    ? !accountIds.has(site.slice(7).toLowerCase())
    : recordedSites.has(site) && !protectedSites.has(site))
}

export const tokenFields = ['input', 'output', 'cacheHit', 'cacheMiss', 'cacheWrite'] as const
export const emptyTokens = (): Required<TokenUsageBuckets> => ({ input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cacheWrite: 0 })
export function addTokens(target: Required<TokenUsageBuckets>, cell: TokenUsageBuckets, sign = 1) {
  for (const field of tokenFields) target[field] += sign * (cell[field] ?? 0)
}

/** Probe a Beijing wall-clock hour within the ledger's *host-local* calendar day. */
function dayProbe(day: string, hour: number): number {
  const start = new Date(`${day}T00:00:00`).getTime()
  const period = 86_400_000
  const phase = (hour - 8) * 3_600_000
  return phase + Math.ceil((start - phase) / period) * period
}
export const emptyPrice = () => ({ cost: 0, inputCost: 0, outputCost: 0, peakCost: 0, offCost: 0 })
export type LedgerPrice = ReturnType<typeof emptyPrice>
export function addPrice(target: LedgerPrice, price: LedgerPrice) {
  target.cost += price.cost
  target.inputCost += price.inputCost
  target.outputCost += price.outputCost
  target.peakCost += price.peakCost
  target.offCost += price.offCost
}

export function priceLedgerTokens(entry: ModelEntry, cell: TokenUsageBuckets, day: string, schedule?: PeakIndex, source?: string): LedgerPrice {
  const result = emptyPrice()
  for (const [hour, share] of [[10, DEFAULT_PEAK_SHARE], [20, 1 - DEFAULT_PEAK_SHARE]] as const) {
    const time = dayProbe(day, hour)
    const override = Number.isFinite(time) ? scheduleTier(schedule, source, entry, entry.key, time) : undefined
    const cost = computeCostAt(entry, cell, time, undefined, override) * share
    const output = computeCostAt(entry, { ...emptyTokens(), output: cell.output }, time, undefined, override) * share
    result.cost += cost
    result.outputCost += output
    result.inputCost += cost - output
    if (entry.tierSemantics !== 'latency') {
      if ((override ?? tierAt(time)) === 'peak') result.peakCost += cost
      else result.offCost += cost
    }
  }
  return result
}
