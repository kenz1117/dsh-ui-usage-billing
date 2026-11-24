// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PeakScheduleEditor } from '../src/client/PeakScheduleEditor.tsx'
import { en, zh } from '../src/client/locales.ts'
import { scheduleKey, type PeakSchedule, type ScheduleSnapshot } from '../src/peak-schedule.ts'

const model = 'deepseek-v4.1-flash'
const relay = 'site:https://relay.test', official = 'direct:deepseek'
const rk = scheduleKey(relay, model), ok = scheduleKey(official, model), old = scheduleKey('direct:archived', model)
const models = [{ source: relay, model, label: 'Relay / Flash' }, { source: official, model, label: 'DeepSeek / Flash' }]
const config: PeakSchedule = { version: 2, models: { [old]: { windows: [] } } }
const doc: ScheduleSnapshot = { config, models }
function response(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status }) }
function serve(data = doc) {
  const post = vi.fn((config: PeakSchedule) => response({ ...data, config }))
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
    serve({ ...doc, warning: 'Legacy schedule ignored', models: [...models, { source: 'direct:DeepSeek-Account', model, label: 'Account' }] })
    render(<PeakScheduleEditor t={k => zh[k]} />)
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Legacy schedule ignored')
    expect(screen.getByRole('combobox', { name: '选择来源 / 模型' })).toHaveProperty('value', '')
    expect(screen.queryByRole('option', { name: 'Account' })).toBeNull()
    expect(screen.queryByRole('button', { name: '保存' })).toBeNull()
    expect(screen.getAllByRole('option')).toHaveLength(3)
  })
  it('posts complete config, keeping independent drafts and unlisted stored rules', async () => {
    const post = serve(); const onSaved = vi.fn()
    render(<PeakScheduleEditor t={k => en[k]} onSaved={onSaved} />)
    await choose(rk); expect(screen.getByText('00:00-24:00')).toBeTruthy()
    change('Peak hours', 'empty'); change('Applicable days', 'daily')
    await choose(ok); expect(screen.getByText('09:00-12:00 / 14:00-18:00')).toBeTruthy()
    change('Peak hours', 'custom'); change(/^Peak hours \(/, '08:00-09:30 / 19:00-24:00')
    change('Holidays (off-peak all day)', 'custom'); change(/^Holidays .*2026/, '2028-02-29')
    change('Time zone', 'custom'); change('UTC offset (minutes)', '330'); save()
    await screen.findByText('Saved')
    expect(post).toHaveBeenCalledWith({ version: 2, models: { ...config.models, [rk]: { windows: [], weekendOffPeak: false }, [ok]: { windows: [480,570,1140,1440], holidays: ['20280229'], utcOffsetMinutes: 330 } } })
    expect(onSaved).toHaveBeenCalledTimes(1)
    await choose(rk); fireEvent.click(screen.getByRole('button', { name: 'Clear this model’s overrides' })); save()
    await screen.findByText('Saved'); expect(post.mock.calls[1]![0].models).not.toHaveProperty(rk)
    expect(Object.keys(post.mock.calls[1]![0].models).sort()).toEqual([old, ok].sort())
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
    expect(post.mock.calls[0]?.[0].models[rk]?.holidays).toEqual(['20280229'])
    fireEvent.click(screen.getByRole('button', { name: 'Remove date' })); save(); await screen.findByText(en.psSaved)
    expect(post.mock.calls[1]?.[0].models).toEqual({ ...config.models, [rk]: { holidays: [] } })
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
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Access denied'))
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }))
    expect(await screen.findByRole('combobox')).toHaveProperty('disabled', true)
    expect(screen.getByRole('option')).toHaveProperty('textContent', en.psEmpty)
  })
  it('keeps unsaved edits and enables retry when POST fails', async () => {
    const post = serve(); post.mockReturnValueOnce(response({ error: 'Write failed' }, 500))
    render(<PeakScheduleEditor t={k => en[k]} />); await choose(ok); change('Peak hours', 'empty'); save()
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Write failed'))
    expect(screen.getByLabelText('Peak hours')).toHaveProperty('value', 'empty'); save()
    await waitFor(() => expect(screen.getByText('Saved')).toBeTruthy()); expect(post.mock.calls[0]).toEqual(post.mock.calls[1])
  })
})
