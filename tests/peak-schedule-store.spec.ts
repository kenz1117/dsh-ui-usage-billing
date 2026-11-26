import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openScheduleStore } from '../src/peak-schedule-store.ts'
import { parseScheduleEdit, type PeakSchedule } from '../src/peak-schedule.ts'

const empty: PeakSchedule = { version: 2, models: {} }
const config: PeakSchedule = { version: 2, models: { '["direct:local","flash"]': { windows: [60, 90] } } }
const key = Object.keys(config.models)[0]!
const edit = { version: 3 as const, changes: config.models }
const clear = { version: 3 as const, changes: { [key]: null } }
const eligible = (model: string) => model === 'flash'
let home: string
let path: string
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'billing-peak-store-'))
  path = join(home, 'peak-schedule.json')
})
afterEach(() => rmSync(home, { recursive: true, force: true }))

describe('peak schedule store', () => {
  it('does not create files on read; a new store sees the saved schedule', async () => {
    const store = openScheduleStore(path, eligible)
    expect(store.current()).toEqual(empty)
    expect(store.notices()).toEqual([])
    expect(existsSync(path)).toBe(false)
    await store.save(edit)
    const reopened = openScheduleStore(path, eligible)
    expect(reopened.current()).toEqual(config)
    expect(reopened.notices()).toEqual([])
    expect(existsSync(`${path}.bak`)).toBe(false)
  })

  it.each(['{ "version": 1, "models": {"flash": {}} }\r\n', 'not json\n'])(
    'does not apply legacy or corrupt settings; preserves original bytes before replacing %j', async original => {
      writeFileSync(path, original)
      const store = openScheduleStore(path, eligible)
      expect(store.current()).toEqual(empty)
      expect(store.notices()).not.toEqual([])
      expect(readFileSync(path, 'utf8')).toBe(original)
      expect(existsSync(`${path}.bak`)).toBe(false)
      await store.save(edit)
      expect(readFileSync(`${path}.bak`)).toEqual(Buffer.from(original))
      expect(store.notices()).toEqual([])
      expect(openScheduleStore(path, eligible).current()).toEqual(config)
      await store.save(clear)
      const hash = createHash('sha256').update(original).digest('hex')
      expect(readFileSync(`${path}.recovery-${hash}`, 'utf8')).toBe(original)
    },
  )

  it('archives even non-UTF8 corrupt files byte-for-byte', async () => {
    const bytes = Buffer.from([0xff, 0xfe, 0x81])
    writeFileSync(path, bytes)
    const store = openScheduleStore(path, eligible)
    await store.save(edit)
    expect(readFileSync(`${path}.recovery-${createHash('sha256').update(bytes).digest('hex')}`)).toEqual(bytes)
  })

  it('preserves the original on backup failure and accepts a subsequent retry', async () => {
    writeFileSync(path, 'legacy')
    mkdirSync(`${path}.bak`)
    const store = openScheduleStore(path, eligible)
    await expect(store.save(edit)).rejects.toThrow()
    expect(readFileSync(path, 'utf8')).toBe('legacy')
    expect(store.current()).toEqual(empty)
    expect(store.notices()).not.toEqual([])
    rmSync(`${path}.bak`, { recursive: true })
    await store.save(edit)
    expect(store.current()).toEqual(config)
    expect(readFileSync(`${path}.bak`, 'utf8')).toBe('legacy')
  })

  it('does not replace a schedule it could not read', async () => {
    mkdirSync(path)
    const store = openScheduleStore(path, eligible)
    expect(store.notices()).not.toEqual([])
    await expect(store.save(edit)).rejects.toThrow()
    expect(store.current()).toEqual(empty)
    expect(existsSync(`${path}.bak`)).toBe(false)
  })

  it('rejects clock rollback and future-dated folds without changing saved history', async () => {
    let clock = 100
    const store = openScheduleStore(path, eligible, () => clock)
    await expect(store.save(edit, 100)).rejects.toThrow('scheduleClockConflict')
    expect(existsSync(path)).toBe(false)
    await store.save(edit, 99)
    const bytes = readFileSync(path)
    clock = 50
    await expect(store.save(clear)).rejects.toThrow('scheduleClockConflict')
    expect(store.current()).toEqual(config)
    expect(readFileSync(path)).toEqual(bytes)
    clock = 101
    await store.save(clear, 100)
    expect(store.current()).toEqual(empty)
    expect(openScheduleStore(path, eligible).history().revisions).toEqual([
      { effectiveFromMs: 100, changes: edit.changes },
      { effectiveFromMs: 101, changes: clear.changes },
    ])
  })

  it('merges changes made by separate store instances', async () => {
    const first = openScheduleStore(path, eligible, () => 100)
    const second = openScheduleStore(path, eligible, () => 100)
    const sibling = '["direct:other","flash"]'
    await first.save(edit)
    await second.save({ version: 3, changes: { [sibling]: { windows: [] } } })
    expect(second.current().models).toEqual({ ...edit.changes, [sibling]: { windows: [] } })
    expect(openScheduleStore(path, eligible).history().revisions.map(r => r.effectiveFromMs)).toEqual([100, 101])
  })

  it('preserves valid history, unknown models, and valid tombstones amid corrupt entries', async () => {
    const unknown = '["direct:local","unknown-model"]'
    const other = '["direct:other","flash"]'
    const original = JSON.stringify({ version: 3, revisions: [
      { effectiveFromMs: 10, changes: { ...edit.changes, [unknown]: { windows: [] }, [other]: { windows: [] } } },
      { effectiveFromMs: 'yesterday', changes: { [key]: null } },
      { effectiveFromMs: 11, changes: { [key]: { tombstone: true }, [other]: null, __badKey__: null } },
    ] })
    writeFileSync(path, original)
    const store = openScheduleStore(path, eligible, () => 20)
    expect(store.current()).toEqual(config)
    expect(store.notices()).toEqual(expect.arrayContaining([
      { code: 'ineligibleModel', detail: unknown }, { code: 'malformedRevision', detail: '2' },
      { code: 'malformedRule', detail: key }, { code: 'malformedRule', detail: '__badKey__' },
    ]))
    const previous = store.history().revisions
    await store.save(clear)
    expect(store.history().revisions).toEqual([...previous, { effectiveFromMs: 20, changes: clear.changes }])
    const reopened = openScheduleStore(path, model => eligible(model) || model === 'unknown-model')
    expect(reopened.current().models).toEqual({ [unknown]: { windows: [] } })
    expect(readFileSync(`${path}.recovery-${createHash('sha256').update(original).digest('hex')}`, 'utf8')).toBe(original)
  })

  it('rejects client timestamps and malformed changes', () => {
    expect(() => parseScheduleEdit({ ...edit, effectiveFromMs: 1 })).toThrow()
    expect(() => parseScheduleEdit({ version: 3, changes: { [key]: { effectiveFromMs: 1 } } })).toThrow()
    expect(() => parseScheduleEdit({ version: 3, changes: { [key]: null, malformed: null } })).toThrow()
  })
})
