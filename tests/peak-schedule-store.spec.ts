import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openScheduleStore } from '../src/peak-schedule-store.ts'
import type { PeakSchedule } from '../src/peak-schedule.ts'

const empty: PeakSchedule = { version: 2, models: {} }
const config: PeakSchedule = { version: 2, models: { '["direct:local","flash"]': { windows: [60, 90] } } }
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
    expect(store.warning()).toBeUndefined()
    expect(existsSync(path)).toBe(false)
    await store.save(config)
    const reopened = openScheduleStore(path, eligible)
    expect(reopened.current()).toEqual(config)
    expect(reopened.warning()).toBeUndefined()
    expect(existsSync(`${path}.bak`)).toBe(false)
  })

  it.each(['{ "version": 1, "models": {"flash": {}} }\r\n', 'not json\n'])(
    'does not apply legacy or corrupt settings; preserves original bytes before replacing %j', async original => {
      writeFileSync(path, original)
      const store = openScheduleStore(path, eligible)
      expect(store.current()).toEqual(empty)
      expect(store.warning()).toBeTruthy()
      expect(readFileSync(path, 'utf8')).toBe(original)
      expect(existsSync(`${path}.bak`)).toBe(false)
      await store.save(config)
      expect(readFileSync(`${path}.bak`)).toEqual(Buffer.from(original))
      expect(store.warning()).toBeUndefined()
      expect(openScheduleStore(path, eligible).current()).toEqual(config)
      await store.save(empty)
      const hash = createHash('sha256').update(original).digest('hex')
      expect(readFileSync(`${path}.recovery-${hash}`, 'utf8')).toBe(original)
    },
  )

  it('archives even non-UTF8 corrupt files byte-for-byte', async () => {
    const bytes = Buffer.from([0xff, 0xfe, 0x81])
    writeFileSync(path, bytes)
    const store = openScheduleStore(path, eligible)
    await store.save(empty)
    expect(readFileSync(`${path}.recovery-${createHash('sha256').update(bytes).digest('hex')}`)).toEqual(bytes)
  })

  it('preserves the original on backup failure and accepts a subsequent retry', async () => {
    writeFileSync(path, 'legacy')
    mkdirSync(`${path}.bak`)
    const store = openScheduleStore(path, eligible)
    await expect(store.save(config)).rejects.toThrow()
    expect(readFileSync(path, 'utf8')).toBe('legacy')
    expect(store.current()).toEqual(empty)
    expect(store.warning()).toBeTruthy()
    rmSync(`${path}.bak`, { recursive: true })
    await store.save(config)
    expect(store.current()).toEqual(config)
    expect(readFileSync(`${path}.bak`, 'utf8')).toBe('legacy')
  })

  it('does not replace a schedule it could not read', async () => {
    mkdirSync(path)
    const store = openScheduleStore(path, eligible)
    expect(store.warning()).toBeTruthy()
    await expect(store.save(config)).rejects.toThrow()
    expect(store.current()).toEqual(empty)
    expect(existsSync(`${path}.bak`)).toBe(false)
  })

  it('serializes concurrent saves in call order', async () => {
    const store = openScheduleStore(path, eligible)
    await Promise.all([store.save(config), store.save(empty)])
    expect(store.current()).toEqual(empty)
    expect(openScheduleStore(path, eligible).current()).toEqual(empty)
  })
})
