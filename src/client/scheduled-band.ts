import { customTier, effectiveRule, parseSchedule, scheduleKey, type PeakRule, type PeakSchedule } from '../peak-schedule.ts'
import { channelCountdown, rateChannelOf, resolveCatalogKey, type RateChannel } from './pricing.ts'

export interface ScheduledTurn { model?: string; scheduleSource?: string }
export type EffectiveRule = Required<PeakRule>

/** Old snapshots omit schedules. Validate new ones before they reach render paths. */
export function scheduleFields(value: unknown): { peakSchedule?: PeakSchedule } {
  if (value === undefined) return {}
  try { return { peakSchedule: parseSchedule(value, () => true) } }
  catch { return {} }
}

export function ruleForTurn(turn?: ScheduledTurn, schedule?: PeakSchedule): EffectiveRule | undefined {
  if (!turn?.model || !turn.scheduleSource || !schedule) return undefined
  const rule = schedule.models[scheduleKey(turn.scheduleSource, resolveCatalogKey(turn.model))]
  return rule && effectiveRule(turn.scheduleSource, rule)
}

const MINUTE = 60_000
const DAY = 1440 * MINUTE
/** Only wall-clock boundaries can change a band. Infinity means no future transition. */
export function scheduledCountdown(now: number, channel: RateChannel, rule?: EffectiveRule) {
  if (!rule || channel !== 'deepseek-metered') return channelCountdown(now, channel)
  const tier = customTier(now, rule)
  const offset = rule.utcOffsetMinutes * MINUTE
  const midnight = Math.floor((now + offset) / DAY) * DAY - offset
  const boundaries = [...new Set([0, ...rule.windows.filter(m => m < 1440)])]
  // A normal week contains every weekly boundary. Exceptions can remove or add
  // transitions only on the holiday itself or when normal weekdays resume.
  const days = new Set<number>([0, 1, 2, 3, 4, 5, 6, 7])
  for (const date of rule.holidays) {
    const day = (Date.parse(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}T00:00Z`) - offset - midnight) / DAY
    if (day < 0) continue
    for (let i = 0; i <= 7; i++) days.add(day + i)
  }
  for (const day of [...days].sort((a, b) => a - b)) {
    for (const m of boundaries) {
      const at = midnight + day * DAY + m * MINUTE
      if (at > now && customTier(at, rule) !== tier) return { tier, nextSwitchInMs: at - now }
    }
  }
  return { tier, nextSwitchInMs: Infinity }
}

/** Model-only pins/catalog rows may use a custom rule only for the current pair. */
export function modelBand(now: number, model: string, plan: boolean, current?: ScheduledTurn, schedule?: PeakSchedule) {
  const matching = current?.model && resolveCatalogKey(current.model) === model
  return scheduledCountdown(now, rateChannelOf(model, plan), matching ? ruleForTurn(current, schedule) : undefined)
}
