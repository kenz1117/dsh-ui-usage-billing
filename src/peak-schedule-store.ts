import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { writeFileAtomic } from '@deepseek-ai/dsh-atomic-write'
import { emptySchedule, parseSchedule, type PeakSchedule } from './peak-schedule.ts'

/** Never infer a source for legacy model-wide data. Preserve its bytes before replacement. */
export function openScheduleStore(path: string, eligible: (key: string) => boolean) {
  let config = emptySchedule()
  let warning: string | undefined
  let previous: Buffer | undefined
  let unreadable = false
  try {
    previous = readFileSync(path)
    config = parseSchedule(JSON.parse(previous.toString('utf8')), eligible)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      unreadable = previous === undefined
      warning = unreadable ? 'Cannot read schedule; writes disabled.' : 'Legacy or invalid schedule ignored. Saving will back up the original.'
    }
  }
  let queue = Promise.resolve()
  return {
    current: () => config,
    warning: () => warning,
    save(next: PeakSchedule) {
      const commit = queue.then(async () => {
        if (unreadable) throw Error('Schedule unavailable')
        if (previous !== undefined) await writeFileAtomic(`${path}.bak`, previous, { mode: 0o600, dirMode: 0o700 })
        if (warning && previous !== undefined) {
          const hash = createHash('sha256').update(previous).digest('hex')
          await writeFileAtomic(`${path}.recovery-${hash}`, previous, { mode: 0o600, dirMode: 0o700 })
        }
        const json = JSON.stringify(next)
        await writeFileAtomic(path, json, { mode: 0o600, dirMode: 0o700 })
        previous = Buffer.from(json)
        config = next
        warning = undefined
      })
      queue = commit.catch(() => {})
      return commit
    },
  }
}
