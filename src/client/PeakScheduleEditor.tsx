import { useEffect, useId, useRef, useState } from 'react'
import { effectiveRule, parseRule, parseSchedule, scheduleKey, validSource, type PeakRule, type ScheduleEdit, type ScheduleNoticeCode, type ScheduleSnapshot } from '../peak-schedule.ts'
import { fetchBilling } from './api/http.ts'
import type { UsageBillingKey } from './locales.ts'
import css from './UsageBilling.module.css'

type Translate = (key: UsageBillingKey) => string
type Draft = { windows?: number[] | string; holidays?: string[] | string; weekendOffPeak?: boolean; utcOffsetMinutes?: number | string }
type ListField = 'windows' | 'holidays'

const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
function formatList(value: Draft[ListField]): string {
  if (typeof value === 'string') return value
  if (!value) return ''
  return value.map((v, i) => typeof v === 'string' ? v.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3') : i % 2 ? '' : `${clock(v)}-${clock(Number(value[i + 1]))}`).filter(Boolean).join(typeof value[0] === 'string' ? ' ' : ' / ')
}
function minutes(s: string): number {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/.test(s)) return NaN
  return Number(s.slice(0, 2)) * 60 + Number(s.slice(3))
}
class InvalidField extends Error {
  constructor(readonly field: keyof Draft, message: string) { super(message) }
}
function serialize(draft: Draft, t: Translate): PeakRule {
  const result: PeakRule = {}
  for (const field of ['windows', 'holidays', 'utcOffsetMinutes', 'weekendOffPeak'] as const) {
    let value = draft[field]
    if (value === undefined) continue
    if (typeof value === 'string') {
      const text = value.trim()
      if (field === 'windows') value = text.split('/').flatMap(pair => {
        const parts = pair.split('-')
        return parts.length === 2 ? parts.map(x => minutes(x.trim())) : [NaN]
      })
      if (field === 'holidays') value = text.split(/\s+/).map(day => /^\d{4}-\d{2}-\d{2}$/.test(day) ? day.replaceAll('-', '') : '')
      if (field === 'utcOffsetMinutes') value = /^-?\d+$/.test(text) ? Number(text) : NaN
    }
    try { Object.assign(result, parseRule({ [field]: value })) }
    catch { throw new InvalidField(field, t(field === 'windows' ? 'psBadWindows' : field === 'holidays' ? 'psBadHolidays' : 'psBadOffset')) }
  }
  return result
}
async function request(t: Translate, edit?: ScheduleEdit, signal?: AbortSignal): Promise<ScheduleSnapshot> {
  const response = await fetchBilling('/api/billing/peak-schedule', edit ? {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(edit),
  } : { signal: signal ?? null })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw Error(t(response.status === 400 ? 'psInvalidRequest' : response.status === 403 ? 'psDenied' : response.status === 409 ? 'psClockConflict' : 'psUnavailable'))
  if (!Array.isArray(payload?.models) || !payload.models.every((m: ScheduleSnapshot['models'][number]) => m && typeof m.model === 'string' && typeof m.source === 'string' && typeof m.label === 'string')) throw Error(t('psInvalidResponse'))
  let config
  try { config = parseSchedule(payload.config, () => true) } catch { throw Error(t('psInvalidResponse')) }
  const notices = Array.isArray(payload.notices) ? payload.notices.filter((n: NonNullable<ScheduleSnapshot['notices']>[number]) => n && Object.hasOwn(noticeLabels, n.code) && (n.detail === undefined || typeof n.detail === 'string')) : []
  return { config, models: payload.models.filter((m: ScheduleSnapshot['models'][number]) => validSource(m.source)), notices }
}
const noticeLabels: Record<ScheduleNoticeCode, UsageBillingKey> = { legacySchedule: 'psLegacy', unreadableSchedule: 'psUnreadable', malformedSchedule: 'psMalformedSchedule', malformedRevision: 'psMalformedRevision', malformedRule: 'psMalformedRule', ineligibleModel: 'psIneligible', discoveryFailed: 'psDiscovery' }
const detail = (err: unknown) => err instanceof Error ? err.message : String(err)
const inputStyle = { maxWidth: '100%', minWidth: 0 }
function HolidayDate({ text, setText, t }: { text: string; setText: (text: string | string[]) => void; t: Translate }) {
  const [day, setDay] = useState('')
  const days = text.trim().split(/\s+/).filter(Boolean)
  const exists = days.includes(day)
  return <div className={css.ctlGroup}>
    <input className={css.userPriceInput} style={inputStyle} type="date" aria-label={`${t('psHolidays')} (${t('psAddHoliday')})`} value={day} onChange={e => setDay(e.target.value)} />
    <button type="button" disabled={!day || exists} onClick={() => setText([...days, day].join(' '))}>{t('psAddHoliday')}</button>
    <button type="button" disabled={!exists} onClick={() => { const next = days.filter(d => d !== day); setText(next.length ? next.join(' ') : []) }}>{t('psRemoveHoliday')}</button>
  </div>
}
export function PeakScheduleEditor({ t, onSaved }: { t: Translate; onSaved?: (snapshot: ScheduleSnapshot) => void }) {
  const [snapshot, setSnapshot] = useState<ScheduleSnapshot>()
  const [key, setKey] = useState('')
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [invalid, setInvalid] = useState<{ key: string; field: keyof Draft }>()
  const errorId = useId()
  const invalidInput = useRef<HTMLInputElement>(null)
  useEffect(() => { if (invalid && !busy) invalidInput.current?.focus() }, [invalid, busy])
  function fieldProps(field: keyof Draft) {
    return invalid?.key === key && invalid.field === field
      ? { ref: invalidInput, 'aria-invalid': true, 'aria-describedby': errorId } : {}
  }
  useEffect(() => {
    const ctl = new AbortController()
    setBusy(true); setError('')
    void request(t, undefined, ctl.signal).then(data => { if (!ctl.signal.aborted) setSnapshot(data) })
      .catch(err => { if (!ctl.signal.aborted) setError(detail(err)) })
      .finally(() => { if (!ctl.signal.aborted) setBusy(false) })
    return () => ctl.abort()
  }, [attempt, t])
  const draftRef = useRef(drafts)
  useEffect(() => { draftRef.current = drafts }, [drafts])
  const loaded = snapshot !== undefined
  const refreshing = useRef<AbortController | undefined>(undefined)
  const [refreshError, setRefreshError] = useState('')
  useEffect(() => {
    if (!loaded || busy) return
    function refresh() {
      if (document.hidden || refreshing.current) return
      const ctl = new AbortController()
      refreshing.current = ctl
      void request(t, undefined, ctl.signal).then(data => {
        if (ctl.signal.aborted) return
        setRefreshError('')
        setSnapshot(prev => {
          // Keep a dirty source reachable even when its route disappears mid-edit.
          const ids = new Set(data.models.map(m => scheduleKey(m.source, m.model)))
          const retained = prev?.models.filter(m => { const id = scheduleKey(m.source, m.model); return !ids.has(id) && (draftRef.current[id] || data.notices?.some(n => n.code === 'discoveryFailed')) }) ?? []
          return { ...data, models: [...data.models, ...retained] }
        })
      }).catch(err => { if (!ctl.signal.aborted) setRefreshError(detail(err)) })
        .finally(() => { if (refreshing.current === ctl) refreshing.current = undefined })
    }
    const timer = window.setInterval(refresh, 15_000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh)
      refreshing.current?.abort(); refreshing.current = undefined
    }
  }, [loaded, busy, t])
  const selected = snapshot?.models.find(m => scheduleKey(m.source, m.model) === key)
  const rule: Draft = drafts[key] ?? snapshot?.config.models[key] ?? {}
  const base = effectiveRule(selected?.source ?? '', {})
  const dirty = Object.keys(drafts).length > 0
  function edit(next: Draft) {
    setDrafts({ ...drafts, [key]: next }); setError(''); setInvalid(undefined); setSaved(false)
  }
  function set(field: keyof Draft, value: Draft[keyof Draft]) {
    const next = { ...rule, [field]: value }
    if (value === undefined) delete next[field]
    edit(next)
  }
  async function save() {
    if (!snapshot) return
    refreshing.current?.abort(); refreshing.current = undefined
    setBusy(true); setError(''); setInvalid(undefined); setSaved(false)
    try {
      const changes: ScheduleEdit['changes'] = {}
      for (const [id, draft] of Object.entries(drafts)) {
        let parsed: PeakRule
        try { parsed = serialize(draft, t) } catch (err) {
          setKey(id)
          if (err instanceof InvalidField) setInvalid({ key: id, field: err.field })
          const owner = snapshot.models.find(m => scheduleKey(m.source, m.model) === id)
          throw Error(`${owner?.label ?? id}: ${detail(err)}`)
        }
        changes[id] = Object.keys(parsed).length ? parsed : null
      }
      const data = await request(t, { version: 3, changes })
      setSnapshot(data); setDrafts({}); setSaved(true); onSaved?.(data)
    } catch (err) { setError(detail(err)) } finally { setBusy(false) }
  }
  function picker(label: UsageBillingKey, value: string, options: [string, UsageBillingKey][], change: (v: string) => void) {
    return <label>{t(label)} <select className={css.userPriceInput} style={inputStyle} value={value} onChange={e => change(e.target.value)}>{options.map(([id, name]) => <option key={id} value={id}>{t(name)}</option>)}</select></label>
  }
  function list(field: ListField, label: UsageBillingKey, empty: UsageBillingKey, example: string) {
    const value = rule[field]
    const mode = value === undefined ? 'inherit' : Array.isArray(value) && !value.length ? 'empty' : 'custom'
    const inherited = formatList(base[field])
    return <div className={css.ctlCol}>
      {picker(label, mode, [['inherit', 'psInherit'], ['custom', 'psCustom'], ['empty', empty]], v => set(field, v === 'inherit' ? undefined : v === 'empty' ? [] : inherited))}
      {mode === 'inherit' && <small>{inherited || t(empty)}</small>}
      {mode === 'custom' && <input {...fieldProps(field)} className={css.userPriceInput} style={inputStyle} aria-label={`${t(label)} (${example})`} placeholder={example} value={formatList(value)} onChange={e => set(field, e.target.value)} />}
    </div>
  }
  return <section className={css.setCard} data-testid="billing-peak-schedule">
    <div className={css.setCardHead}><h3 className={css.setCardTitle}>{t('psTitle')}</h3></div>
    {refreshError && <p role="status">{t('psLoadError')}: {refreshError}</p>}
    {snapshot?.notices?.map(({ code, detail }) => <p role="status" key={JSON.stringify([code, detail])}>{t(noticeLabels[code])}{detail ? ` (${detail})` : ''}</p>)}
    {error && <p id={errorId} role="alert">{t(snapshot ? 'psSaveError' : 'psLoadError')}: {error}</p>}
    {!snapshot ? (busy ? <small role="status">{t('psLoading')}</small> : <button type="button" onClick={() => setAttempt(attempt + 1)}>{t('psRetry')}</button>) :
      <fieldset className={css.ctlCol} disabled={busy} style={{ margin: 0, padding: 0, border: 0, minWidth: 0 }}>
        <select className={css.userPriceInput} style={inputStyle} data-testid="billing-peak-schedule-model" aria-label={t('psModel')} disabled={!snapshot.models.length} value={selected ? key : ''} onChange={e => setKey(e.target.value)}>
          <option value="" disabled>{t(snapshot.models.length ? 'psModel' : 'psEmpty')}</option>
          {snapshot.models.map(m => { const id = scheduleKey(m.source, m.model); return <option key={id} value={id}>{m.label}{drafts[id] ? ` · ${t('psDirty')}` : snapshot.config.models[id] ? ` · ${t('psConfigured')}` : ''}</option> })}
        </select>
        {selected && <>
          {list('windows', 'psWindows', 'psOff', '09:00-12:00 / 14:00-18:00')}
          {picker('psDates', rule.weekendOffPeak === undefined ? 'inherit' : rule.weekendOffPeak ? 'weekdays' : 'daily', [['inherit', 'psInherit'], ['weekdays', 'psWeekdays'], ['daily', 'psDaily']], v => set('weekendOffPeak', v === 'inherit' ? undefined : v === 'weekdays'))}
          {rule.weekendOffPeak === undefined && <small>{t(base.weekendOffPeak ? 'psWeekdays' : 'psDaily')}</small>}
          {list('holidays', 'psHolidays', 'psNoHolidays', '2026-10-01 2026-10-02')}
          <HolidayDate key={key} text={formatList(rule.holidays ?? base.holidays)} setText={v => set('holidays', v)} t={t} />
          {picker('psZone', rule.utcOffsetMinutes === undefined ? 'inherit' : 'custom', [['inherit', 'psInherit'], ['custom', 'psCustom']], v => set('utcOffsetMinutes', v === 'inherit' ? undefined : base.utcOffsetMinutes))}
          {rule.utcOffsetMinutes === undefined ? <small>{t('psOffset')}: {base.utcOffsetMinutes}</small> : <input {...fieldProps('utcOffsetMinutes')} className={css.userPriceInput} type="number" min={-720} max={840} step={1} aria-label={t('psOffset')} value={rule.utcOffsetMinutes} onChange={e => set('utcOffsetMinutes', e.target.value)} />}
          <div className={css.ctlGroup}><button type="button" disabled={!dirty} onClick={() => void save()}>{t('psSave')}</button>
            {Object.keys(rule).length > 0 && <button type="button" onClick={() => edit({})}>{t('psClear')}</button>}</div>
        </>}
        {(saved || dirty) && <small role="status">{t(saved ? 'psSaved' : 'psDirty')}</small>}
      </fieldset>}
  </section>
}
