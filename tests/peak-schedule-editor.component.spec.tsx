// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PeakScheduleEditor } from '../src/client/PeakScheduleEditor.tsx'
import { en, zh } from '../src/client/locales.ts'
import { scheduleKey, type PeakSchedule, type ScheduleEdit, type ScheduleSnapshot } from '../src/peak-schedule.ts'

const model = 'deepseek-v4.1-flash'
const relay = 'site:https://relay.test', official = 'direct:deepseek'
const rk = scheduleKey(relay, model), ok = scheduleKey(official, model), old = scheduleKey('direct:archived', model)
const models = [{ source: relay, model, label: 'Relay / Flash' }, { source: official, model, label: 'DeepSeek / Flash' }]
const config: PeakSchedule = { version: 2, models: { [old]: { windows: [] } } }
const doc: ScheduleSnapshot = { config, models }
function response(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status }) }
function serve(data = doc) {
  let active = { ...data.config.models }
  const post = vi.fn(({ changes }: ScheduleEdit) => {
    active = { ...active }
    for (const [key, rule] of Object.entries(changes)) {
      if (rule === null) delete active[key]
      else active[key] = rule
    }
    return response({ ...data, config: { version: 2, models: active } })
  })
  const fetcher = vi.fn(async (path: string, init: RequestInit) => {
    expect(path).toBe('/api/billing/peak-schedule')
    return init.method === 'POST' ? post(JSON.parse(String(init.body))) : response(data)
  })
  vi.stubGlobal('fetch', fetcher)
  return post
}
function change(label: string | RegExp, value: string) { fireEvent.change(screen.getByLabelText(label), { target: { value } }) }
async function choose(key: string) { await screen.findByRole('combobox', { name: 'Select source / model' }); change('Select source / model', key) }
function save() { fireEvent.click(screen.getByRole('button', { name: 'Save' })) }
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('source-scoped peak schedule', () => {
  it('starts without a default row, filters protected accounts and displays server warnings', async () => {
    serve({ ...doc, notices: [{ code: 'legacySchedule' }], models: [...models, { source: 'direct:DeepSeek-Account', model, label: 'Account' }] })
    render(<PeakScheduleEditor t={k => zh[k]} />)
    expect(await screen.findByText(zh.psLegacy)).toBeTruthy()
    expect(screen.getByRole('combobox', { name: '选择来源 / 模型' })).toHaveProperty('value', '')
    expect(screen.queryByRole('option', { name: 'Account' })).toBeNull()
    expect(screen.queryByRole('button', { name: '保存' })).toBeNull()
    expect(screen.getAllByRole('option')).toHaveLength(3)
  })
  it('posts changed pairs only, retaining unlisted stored rules', async () => {
    const post = serve(); const onSaved = vi.fn()
    render(<PeakScheduleEditor t={k => en[k]} onSaved={onSaved} />)
    await choose(rk); expect(screen.getByText('09:00-12:00 / 14:00-18:00')).toBeTruthy()
    change('Peak hours', 'empty'); change('Applicable days', 'daily')
    await choose(ok); expect(screen.getByText('09:00-12:00 / 14:00-18:00')).toBeTruthy(); expect(screen.getByText(/2026-10-01 2026-10-02/)).toBeTruthy()
    change('Peak hours', 'custom'); change(/^Peak hours \(/, '08:00-09:30 / 19:00-24:00')
    change('Holidays (off-peak all day)', 'custom'); change(/^Holidays .*2026/, '2028-02-29')
    change('Time zone', 'custom'); change('UTC offset (minutes)', '330'); save()
    await screen.findByText('Saved')
    expect(post).toHaveBeenCalledWith({ version: 3, changes: { [rk]: { windows: [], weekendOffPeak: false }, [ok]: { windows: [480,570,1140,1440], holidays: ['20280229'], utcOffsetMinutes: 330 } } })
    expect(onSaved).toHaveBeenCalledTimes(1)
    await choose(rk); fireEvent.click(screen.getByRole('button', { name: 'Clear this model’s overrides' })); save()
    await screen.findByText('Saved'); expect(post.mock.calls[1]![0]).toEqual({ version: 3, changes: { [rk]: null } })
    expect(onSaved.mock.calls[1]![0].config.models).toEqual({ ...config.models, [ok]: { windows: [480,570,1140,1440], holidays: ['20280229'], utcOffsetMinutes: 330 } })
  })
  it('keeps rejected drafts reachable after partial acceptance and shows the effective time', async () => {
    const post = serve()
    post.mockImplementationOnce(() => response({ ...doc, models: [models[1]], effectiveFromMs: 1000,
      results: { [rk]: 'unavailableModel', [ok]: 'accepted' }, config: { version: 2, models: { [ok]: { windows: [] } } } }))
    render(<PeakScheduleEditor t={k => en[k]} />)
    await choose(rk); change('Peak hours', 'empty'); await choose(ok); change('Peak hours', 'empty'); save()
    expect((await screen.findByRole('alert')).textContent).toContain(`Relay / Flash: ${en.psUnavailableModel}`)
    expect(screen.getByRole('alert').textContent).toContain(en.psPartial)
    expect(screen.getByLabelText('Select source / model')).toHaveProperty('value', rk)
    expect(screen.getByRole('option', { name: `Relay / Flash · ${en.psDirty}` })).toBeTruthy()
    expect(screen.getByRole('option', { name: `DeepSeek / Flash · ${en.psConfigured}` })).toBeTruthy()
    expect(screen.getByText(en.psEffectiveFrom).querySelector('time')?.dateTime).toBe(new Date(1000).toISOString())
    save(); await waitFor(() => expect(post).toHaveBeenCalledTimes(2))
    expect(post.mock.calls[1]![0].changes).toEqual({ [rk]: { windows: [] } })
  })
  it('sends locally valid siblings even when another draft has an invalid window', async () => {
    const post = serve(); render(<PeakScheduleEditor t={k => en[k]} />)
    await choose(rk); change('Peak hours', 'custom'); change(/^Peak hours \(/, 'incorrect')
    await choose(ok); change('Peak hours', 'empty'); save()
    expect((await screen.findByRole('alert')).textContent).toContain(en.psBadWindows)
    expect(post.mock.calls[0]![0].changes).toEqual({ [ok]: { windows: [] } })
  })
  it('keeps blank custom inputs editable; rejects overlap, impossible dates and out-of-range UTC offsets', async () => {
    const post = serve(); render(<PeakScheduleEditor t={k => en[k]} />); await choose(rk)
    change('Peak hours', 'custom'); change(/^Peak hours \(/, ''); save()
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining(en.psBadWindows))
    change(/^Peak hours \(/, '08:00-10:00 / 09:00-11:00'); await choose(ok); save()
    expect(screen.getByLabelText('Select source / model')).toHaveProperty('value', rk)
    change('Peak hours', 'inherit'); change('Holidays (off-peak all day)', 'custom'); change(/^Holidays .*2026/, '2026-02-29'); save()
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining(en.psBadHolidays))
    change('Holidays (off-peak all day)', 'empty'); change('Time zone', 'custom'); change('UTC offset (minutes)', '841'); save()
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining(en.psBadOffset)); expect(post).not.toHaveBeenCalled()
  })
  it('identifies and focuses the invalid draft across sources and labels it pending until saved', async () => {
    const post = serve(); render(<PeakScheduleEditor t={k => en[k]} />); await choose(rk)
    change('Peak hours', 'custom'); change(/^Peak hours \(/, '25:30-26:00'); await choose(ok)
    expect(screen.getByRole('option', { name: `Relay / Flash · ${en.psDirty}` })).toBeTruthy()
    screen.getByRole('button', { name: 'Save' }).focus(); save()
    const alert = await screen.findByRole('alert'), field = screen.getByLabelText(/^Peak hours \(/)
    expect(alert.textContent).toContain(`Relay / Flash: ${en.psBadWindows}`)
    expect(document.activeElement).toBe(field)
    expect(field.getAttribute('aria-describedby')).toBe(alert.id)
    expect(field.getAttribute('aria-invalid')).toBe('true')
    expect(post).not.toHaveBeenCalled()
    change(/^Peak hours \(/, '08:00-12:00'); save(); await screen.findByText(en.psSaved)
    expect(screen.getByRole('option', { name: `Relay / Flash · ${en.psConfigured}` })).toBeTruthy()
    expect(field.hasAttribute('aria-invalid')).toBe(false)
  })
  it('adds and removes holidays from a native calendar without overwriting other sources', async () => {
    const post = serve(); render(<PeakScheduleEditor t={k => en[k]} />); await choose(rk)
    change(/^Holidays .*Add date/, '2028-02-29')
    fireEvent.click(screen.getByRole('button', { name: 'Add date' }))
    expect(screen.getByRole('button', { name: 'Add date' })).toHaveProperty('disabled', true)
    expect(screen.getByLabelText(/^Holidays .*2026/)).toHaveProperty('value', '2028-02-29')
    save(); await screen.findByText(en.psSaved)
    expect(post.mock.calls[0]?.[0].changes[rk]?.holidays).toEqual(['20280229'])
    fireEvent.click(screen.getByRole('button', { name: 'Remove date' })); save(); await screen.findByText(en.psSaved)
    expect(post.mock.calls[1]?.[0].changes).toEqual({ [rk]: { holidays: [] } })
  })
  it('refreshes on cadence and foreground events without losing drafts or last good options', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    try {
      const added = { ...models[1]!, model: 'new', label: 'New model' }
      const fetcher = vi.fn().mockResolvedValueOnce(response(doc)).mockResolvedValueOnce(response({ ...doc, models: [added] }))
        .mockResolvedValueOnce(response({ error: 'unavailable' }, 503)).mockResolvedValueOnce(response(doc))
      vi.stubGlobal('fetch', fetcher)
      const view = render(<PeakScheduleEditor t={k => en[k]} />); await choose(rk); change('Applicable days', 'daily')
      await act(async () => { await vi.advanceTimersByTimeAsync(15_000) })
      expect(screen.getByRole('option', { name: 'New model' })).toBeTruthy()
      expect(screen.getByLabelText('Applicable days')).toHaveProperty('value', 'daily')
      fireEvent.focus(window); await screen.findByText(/unavailable/)
      expect(screen.getByRole('option', { name: 'New model' })).toBeTruthy()
      hidden.mockReturnValue(true); fireEvent(document, new Event('visibilitychange')); expect(fetcher).toHaveBeenCalledTimes(3)
      hidden.mockReturnValue(false); fireEvent(document, new Event('visibilitychange')); await screen.findByRole('option', { name: 'DeepSeek / Flash' })
      expect(screen.queryByText(/unavailable/)).toBeNull(); view.unmount()
      fireEvent.focus(window); expect(fetcher).toHaveBeenCalledTimes(4)
    } finally { hidden.mockRestore(); vi.useRealTimers() }
  })
  it('ignores a late background GET after a successful save', async () => {
    let finish!: (r: Response) => void
    const stale = new Promise<Response>(resolve => { finish = resolve })
    const fetcher = vi.fn().mockResolvedValueOnce(response(doc)).mockReturnValueOnce(stale)
      .mockResolvedValueOnce(response({ ...doc, config: { version: 2, models: { [rk]: { windows: [] } } } }))
    vi.stubGlobal('fetch', fetcher); render(<PeakScheduleEditor t={k => en[k]} />)
    await choose(rk); change('Peak hours', 'empty'); fireEvent.focus(window); save(); await screen.findByText(en.psSaved)
    await act(async () => { finish(response(doc)); await stale })
    expect(fetcher).toHaveBeenCalledTimes(3)
    expect(screen.getByRole('option', { name: `Relay / Flash · ${en.psConfigured}` })).toBeTruthy()
    expect(screen.getByLabelText('Peak hours')).toHaveProperty('value', 'empty')
  })
  it('shows read failures with retry and distinguishes a successful empty list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({ error: 'Access denied' }, 403)).mockResolvedValueOnce(response({ ...doc, models: [] })))
    render(<PeakScheduleEditor t={k => en[k]} />)
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining(en.psDenied))
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }))
    expect(await screen.findByRole('combobox')).toHaveProperty('disabled', true)
    expect(screen.getByRole('option')).toHaveProperty('textContent', en.psEmpty)
  })
  it('keeps unsaved edits and enables retry when POST fails', async () => {
    const post = serve(); post.mockReturnValueOnce(response({ error: 'Write failed' }, 500))
    render(<PeakScheduleEditor t={k => en[k]} />); await choose(ok); change('Peak hours', 'empty'); save()
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining(en.psUnavailable))
    expect(screen.getByLabelText('Peak hours')).toHaveProperty('value', 'empty'); save()
    await waitFor(() => expect(screen.getByText('Saved')).toBeTruthy()); expect(post.mock.calls[0]).toEqual(post.mock.calls[1])
  })
})
