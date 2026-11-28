import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { withFileLock, writeFileAtomic } from '@deepseek-ai/dsh-atomic-write'
import { emptySchedule, modelFromScheduleKey, parseScheduleEdit, readScheduleHistory, type ScheduleEdit, type ScheduleHistory, type ScheduleNotice } from './peak-schedule.ts'

const emptyHistory = (): ScheduleHistory => ({ version: 3, revisions: [] })

export class ScheduleClockConflict extends Error {}

function readSaved(path: string): { history: ScheduleHistory; notices: ScheduleNotice[]; bytes?: Buffer } {
  let bytes: Buffer
  try { bytes = readFileSync(path) }
  catch (error) {
    return { history: emptyHistory(), notices: (error as NodeJS.ErrnoException).code === 'ENOENT' ? [] : [{ code: 'unreadableSchedule' }] }
  }
  try { return { ...readScheduleHistory(JSON.parse(bytes.toString('utf8'))), bytes } }
  catch { return { history: emptyHistory(), notices: [{ code: 'malformedSchedule' }], bytes } }
}

/** Drop only writes that repeat the immediately preceding state of that key.
 * A→B→A and deletions after a real override remain distinct historical intervals. */
function compact(history: ScheduleHistory): ScheduleHistory {
  const state = new Map<string, string>()
  return { version: 3, revisions: history.revisions.flatMap(row => {
    const changes = Object.fromEntries(Object.entries(row.changes).filter(([key, rule]) => {
      const value = JSON.stringify(rule)
      if ((state.get(key) ?? 'null') === value) return false
      state.set(key, value)
      return true
    }))
    return Object.keys(changes).length ? [{ ...row, changes }] : []
  }) }
}

export function openScheduleStore(path: string, eligible: (key: string) => boolean, now = Date.now) {
  let saved = readSaved(path)

  function project() {
    const config = emptySchedule()
    const skipped = new Set<string>()
    for (const { changes } of saved.history.revisions) {
      for (const [key, rule] of Object.entries(changes)) {
        if (rule === null) {
          delete config.models[key]
          skipped.delete(key)
        } else if (eligible(modelFromScheduleKey(key))) {
          config.models[key] = rule
        } else {
          skipped.add(key)
        }
      }
    }
    return { config, notices: [...saved.notices, ...Array.from(skipped, detail => ({ code: 'ineligibleModel' as const, detail }))] }
  }
  let active = project()
  let queue = Promise.resolve()
  return {
    current: () => active.config,
    history: () => saved.history,
    notices: () => active.notices,
    save(edit: ScheduleEdit, latestEventTime = -1) {
      const commit = queue.then(async () => {
        const { changes } = parseScheduleEdit(edit)
        mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
        await withFileLock(path, async () => {
          const previous = readSaved(path)
          if (previous.notices.some(n => n.code === 'unreadableSchedule')) throw Error('Schedule unavailable')
          const revisions = previous.history.revisions
          const delta = Object.fromEntries(Object.entries(changes).filter(([key, rule]) => {
            const latest = revisions.findLast(row => Object.hasOwn(row.changes, key))?.changes[key] ?? null
            return JSON.stringify(latest) !== JSON.stringify(rule)
          }))
          if (!Object.keys(delta).length) {
            if (previous.bytes?.equals(saved.bytes ?? Buffer.alloc(0)) === false) {
              saved = previous
              active = project()
            }
            return
          }
          if (previous.bytes !== undefined) {
            await writeFileAtomic(`${path}.bak`, previous.bytes, { mode: 0o600, dirMode: 0o700 })
            if (previous.notices.length) {
              const hash = createHash('sha256').update(previous.bytes).digest('hex')
              await writeFileAtomic(`${path}.recovery-${hash}`, previous.bytes, { mode: 0o600, dirMode: 0o700 })
            }
          }
          // Reject a backward clock or a future-dated event rather than backdating the revision.
          const savedAt = now()
          const lastRevision = revisions.at(-1)?.effectiveFromMs ?? -1
          if (savedAt < lastRevision || savedAt <= latestEventTime) throw new ScheduleClockConflict('scheduleClockConflict')
          const effectiveFromMs = Math.max(savedAt, lastRevision + 1)
          if (!Number.isSafeInteger(effectiveFromMs) || effectiveFromMs < 0 || effectiveFromMs > 8.64e15) throw Error('Invalid schedule clock')
          const history = compact({ version: 3, revisions: [...revisions, {
            effectiveFromMs, changes: delta, audit: { source: 'local-api', actor: 'unidentified' },
          }] })
          const json = JSON.stringify(history)
          await writeFileAtomic(path, json, { mode: 0o600, dirMode: 0o700 })
          saved = { history, notices: [], bytes: Buffer.from(json) }
          active = project()
        }, { waitMs: 2_000 })
      })
      queue = commit.catch(() => {})
      return commit
    },
  }
}
