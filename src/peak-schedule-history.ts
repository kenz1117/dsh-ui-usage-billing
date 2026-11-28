import { createHash } from 'node:crypto'
import { effectiveRule, scheduleKey, type PeakRule, type ScheduleHistory } from './peak-schedule.ts'

function lastAt<T extends { effectiveFromMs: number }>(rows: readonly T[], time: number): T | undefined {
  let lo = 0
  let hi = rows.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (rows[mid]!.effectiveFromMs <= time) lo = mid + 1
    else hi = mid
  }
  return rows[lo - 1]
}

/** A future revision does not change the fingerprint of any earlier fold. */
export function indexPeakHistory(history?: ScheduleHistory) {
  if (!history?.revisions.length) return undefined
  const timelines = new Map<string, { effectiveFromMs: number; rule: Required<PeakRule> | undefined }[]>()
  const hash = createHash('sha256')
  const prefixes = history.revisions.map(revision => {
    for (const [key, rule] of Object.entries(revision.changes)) {
      const [source] = JSON.parse(key) as [string, string]
      const timeline = timelines.get(key) ?? []
      timeline.push({ effectiveFromMs: revision.effectiveFromMs, rule: rule === null ? undefined : effectiveRule(source, rule) })
      timelines.set(key, timeline)
    }
    hash.update(JSON.stringify({ effectiveFromMs: revision.effectiveFromMs, changes: revision.changes }))
    return { effectiveFromMs: revision.effectiveFromMs, digest: hash.copy().digest('hex') }
  })
  return {
    rule(source: string, model: string, time: number) {
      const timeline = timelines.get(scheduleKey(source, model))
      return timeline && lastAt(timeline, time)?.rule
    },
    fingerprint: (time: number) => lastAt(prefixes, time)?.digest,
  }
}
