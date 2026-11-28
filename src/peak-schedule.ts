/** A source/model override. Omitted fields inherit that source's defaults. */
export interface PeakRule {
  windows?: number[]
  holidays?: string[]
  weekendOffPeak?: boolean
  utcOffsetMinutes?: number
}
export interface PeakSchedule { version: 2; models: Record<string, PeakRule> }
export interface ScheduleModel { source: string; model: string; label: string }
export interface ScheduleEdit { version: 3; changes: Record<string, PeakRule | null> }
export type ScheduleResults = Record<string, 'accepted' | 'invalidRule' | 'unavailableModel'>
export interface RevisionAudit { source: 'local-api'; actor: 'unidentified' }
export interface ScheduleRevision { audit?: RevisionAudit; effectiveFromMs: number; changes: ScheduleEdit['changes'] }
export interface ScheduleHistory { version: 3; revisions: ScheduleRevision[] }
export type ScheduleNoticeCode = 'legacySchedule' | 'unreadableSchedule' | 'malformedSchedule' | 'malformedRevision' | 'malformedRule' | 'ineligibleModel' | 'discoveryFailed'
export interface ScheduleNotice { code: ScheduleNoticeCode; detail?: string }
export interface ScheduleSnapshot { effectiveFromMs?: number; results?: ScheduleResults; config: PeakSchedule; models: ScheduleModel[]; notices?: ScheduleNotice[] }
export const emptySchedule = (): PeakSchedule => ({ version: 2, models: {} })
export const scheduleKey = (source: string, model: string): string => JSON.stringify([source, model])
export const accountRoute = (id: string): boolean => id.trim().toLowerCase() === 'deepseek-account'
export function validSource(source: string): boolean {
  if (source.startsWith('direct:')) return /^[a-z\d_.-]+$/i.test(source.slice(7)) && !accountRoute(source.slice(7))
  if (!source.startsWith('site:')) return false
  try {
    const url = new URL(source.slice(5))
    return /^https?:$/.test(url.protocol) && url.origin === source.slice(5)
  } catch { return false }
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function int(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && min <= value && value <= max
}
export function parseRule(value: unknown): PeakRule {
  if (!record(value) || Object.keys(value).some(k => !['windows', 'holidays', 'weekendOffPeak', 'utcOffsetMinutes'].includes(k))) throw Error('Invalid rule fields')
  const rule: PeakRule = {}
  if ('windows' in value) {
    const w = value.windows
    if (!Array.isArray(w) || w.length > 48 || w.length % 2 || !w.every(x => int(x, 0, 1440))) throw Error('Invalid peak windows')
    const pairs: [number, number][] = []
    for (let i = 0; i < w.length; i += 2) pairs.push([w[i]!, w[i + 1]!])
    pairs.sort((a, b) => a[0] - b[0])
    if (pairs.some(([a,b], i) => a >= b || (i > 0 && pairs[i - 1]![1] > a))) throw Error('Overlapping or empty windows')
    rule.windows = pairs.flat()
  }
  if ('holidays' in value) {
    const days = value.holidays
    if (!Array.isArray(days) || days.length > 366 || !days.every(d => {
      if (typeof d !== 'string' || !/^\d{8}$/.test(d)) return false
      const iso = `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6)}`
      const t = Date.parse(iso + 'T00:00:00Z')
      return Number.isFinite(t) && new Date(t).toISOString().startsWith(iso)
    })) throw Error('Invalid off-peak dates')
    rule.holidays = [...new Set<string>(days)].sort()
  }
  if ('weekendOffPeak' in value) {
    if (typeof value.weekendOffPeak !== 'boolean') throw Error('Invalid weekend setting')
    rule.weekendOffPeak = value.weekendOffPeak
  }
  if ('utcOffsetMinutes' in value) {
    if (!int(value.utcOffsetMinutes, -720, 840)) throw Error('Invalid UTC offset')
    rule.utcOffsetMinutes = value.utcOffsetMinutes
  }
  return rule
}
export function parseSchedule(value: unknown, eligible: (model: string) => boolean): PeakSchedule {
  if (!record(value) || value.version !== 2 || !record(value.models) || Object.keys(value).some(k => k !== 'version' && k !== 'models')) throw Error('Expected source-scoped schedule version 2')
  const config = emptySchedule()
  for (const key of Object.keys(value.models).sort()) {
    const model = modelFromScheduleKey(key)
    if (!eligible(model)) throw Error('Invalid source/model key')
    config.models[key] = parseRule(value.models[key])
  }
  return config
}
export function modelFromScheduleKey(key: string): string {
  const pair: unknown = JSON.parse(key)
  if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== 'string' || !validSource(pair[0]) || typeof pair[1] !== 'string' || !pair[1] || key !== scheduleKey(pair[0], pair[1])) throw Error('Invalid source/model key')
  return pair[1]
}
export function partitionScheduleEdit(value: unknown, allowed: (key: string, model: string) => boolean) {
  if (!record(value) || value.version !== 3 || !record(value.changes) || Object.keys(value).some(key => key !== 'version' && key !== 'changes')) throw Error('Expected source-scoped schedule edits')
  const changes: ScheduleEdit['changes'] = {}
  const results: ScheduleResults = Object.create(null)
  for (const key of Object.keys(value.changes).sort()) {
    try {
      const model = modelFromScheduleKey(key)
      const rule = value.changes[key] === null ? null : parseRule(value.changes[key])
      if (rule !== null && !allowed(key, model)) results[key] = 'unavailableModel'
      else {
        changes[key] = rule
        results[key] = 'accepted'
      }
    } catch { results[key] = 'invalidRule' }
  }
  return { edit: { version: 3, changes } as ScheduleEdit, results }
}
export function parseScheduleEdit(value: unknown): ScheduleEdit {
  const { edit, results } = partitionScheduleEdit(value, () => true)
  if (Object.values(results).some(result => result !== 'accepted')) throw Error('Invalid schedule change')
  return edit
}
export function readScheduleHistory(value: unknown): { history: ScheduleHistory; notices: ScheduleNotice[] } {
  const history: ScheduleHistory = { version: 3, revisions: [] }
  const notices: ScheduleNotice[] = []
  if (record(value) && (value.version === 1 || value.version === 2)) return { history, notices: [{ code: 'legacySchedule' }] }
  if (!record(value) || value.version !== 3 || !Array.isArray(value.revisions)) return { history, notices: [{ code: 'malformedSchedule' }] }
  let previous = -1
  for (const [index, row] of value.revisions.entries()) {
    if (!record(row) || !int(row.effectiveFromMs, 0, 8.64e15) || row.effectiveFromMs <= previous || !record(row.changes)) {
      notices.push({ code: 'malformedRevision', detail: String(index + 1) })
      continue
    }
    const changes: ScheduleEdit['changes'] = {}
    for (const key of Object.keys(row.changes).sort()) {
      try {
        modelFromScheduleKey(key)
        changes[key] = row.changes[key] === null ? null : parseRule(row.changes[key])
      } catch {
        notices.push({ code: 'malformedRule', detail: key.slice(0, 240) })
      }
    }
    if (Object.keys(changes).length) {
      previous = row.effectiveFromMs
      const audit = record(row.audit) && row.audit.source === 'local-api' && row.audit.actor === 'unidentified'
        ? { source: 'local-api', actor: 'unidentified' } as const : undefined
      history.revisions.push({ effectiveFromMs: previous, changes, ...(audit && { audit }) })
    }
  }
  return { history, notices }
}
export const TIER_BOUNDARY_MINUTES = [540, 720, 840, 1080] as const
export const officialHolidays = '20260925 20260926 20260927 20261001 20261002 20261003 20261004 20261005 20261006 20261007'
export function effectiveRule(source: string, rule: PeakRule): Required<PeakRule> {
  const official = source === 'site:https://api.deepseek.com' || /^direct:deepseek(?:-|$)/i.test(source)
  return { windows: [...TIER_BOUNDARY_MINUTES], holidays: official ? officialHolidays.split(' ') : [], weekendOffPeak: true, utcOffsetMinutes: 480, ...rule }
}
export function customTier(time: number, rule: Required<PeakRule>): 'peak' | 'offPeak' {
  const local = new Date(time + rule.utcOffsetMinutes * 60_000)
  const weekday = local.getUTCDay()
  if (rule.weekendOffPeak && (weekday === 0 || weekday === 6)) return 'offPeak'
  if (rule.holidays.length && rule.holidays.includes(local.toISOString().slice(0,10).replaceAll('-', ''))) return 'offPeak'
  const minute = local.getUTCHours() * 60 + local.getUTCMinutes()
  return rule.windows.some((start, i, w) => i % 2 === 0 && start <= minute && minute < w[i + 1]!) ? 'peak' : 'offPeak'
}
