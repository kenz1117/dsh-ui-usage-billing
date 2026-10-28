/**
 * Composer shortcut for the existing off-peak task queue.
 *
 * This component only snapshots the current draft, working directory and next
 * model route into the queue API. It never submits to the current Session and
 * never starts a task. Optional draft clearing is revision-checked after the
 * mutation succeeds so late responses cannot erase subsequent user input.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { InputActions, InputState } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import type { SessionProjectionMap } from '@deepseek-ai/dsh-api-session-controller/client'
// Type-only host contracts; no new runtime platform dependency.
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-working-directory'
import { loadTaskQueue, loadTaskQueueSummary, mutateTaskQueue } from './api/task-queue.ts'
import type { TaskQueueSnapshot } from '../task-queue-shared.ts'
import type { UsageBillingKey } from './locales.ts'
import {
  QUICK_QUEUE_PREF_EVENT,
  loadQuickQueuePrefs,
  saveQuickQueuePrefs,
  type QuickQueuePrefs,
} from './usage-billing-settings.ts'
import css from './TaskQueueQuick.module.css'

const REFRESH_INTERVAL_MS = 30_000
const SUCCESS_NOTICE_MS = 4_000

type Translate = (key: UsageBillingKey) => string
type ProjectionKey = Extract<keyof SessionProjectionMap, string>

/** Optional selector shape: old hosts may omit the standard input kit. */
type ReadInput = <S>(selector: (state: InputState) => S, eq?: (a: S, b: S) => boolean) => S | undefined

/**
 * Projection cells come from the current Session's public `projections.faceOf`.
 * The composer standard kit guarantees `useInput`; projection access remains an
 * optional capability so older hosts degrade instead of blocking web startup.
 */
export type ProjectionFaceOf = (key: ProjectionKey) => ObservableSnapshot<unknown> | undefined

const unavailableInput: ReadInput = () => undefined
const unavailableProjection: ProjectionFaceOf = () => undefined

export interface QuickQueueToggleProps {
  readonly t: Translate
}

export interface QuickQueueEnqueueProps {
  readonly sessionId: SessionId
  readonly t: Translate
  readonly useInput?: ReadInput | undefined
  readonly inputActions?: InputActions | undefined
  readonly projectionFaceOf?: ProjectionFaceOf | undefined
}

interface Notice {
  readonly kind: 'success' | 'error'
  readonly text: string
}

function queuedCountOf(snapshot: TaskQueueSnapshot): number {
  return snapshot.tasks.filter(task => task.status === 'queued').length
}

/** Shared localStorage preference subscription across the two composer React seats. */
function useQuickQueuePrefs(): QuickQueuePrefs {
  const [prefs, setPrefs] = useState<QuickQueuePrefs>(() => loadQuickQueuePrefs())
  useEffect(() => {
    const reread = (): void => { setPrefs(loadQuickQueuePrefs()) }
    window.addEventListener(QUICK_QUEUE_PREF_EVENT, reread)
    window.addEventListener('storage', reread)
    return () => {
      window.removeEventListener(QUICK_QUEUE_PREF_EVENT, reread)
      window.removeEventListener('storage', reread)
    }
  }, [])
  return prefs
}

/**
 * Poll only the lightweight count while the shortcut is enabled and visible.
 * A generation guard prevents an older summary response from overwriting the
 * fresher full snapshot returned by a successful enqueue.
 */
function useQueuedCount(enabled: boolean): {
  readonly count: number | null
  readonly applySnapshot: (snapshot: TaskQueueSnapshot) => void
} {
  const [count, setCount] = useState<number | null>(null)
  const [pageVisible, setPageVisible] = useState(() => typeof document === 'undefined' || !document.hidden)
  const generation = useRef(0)
  const applySnapshot = useCallback((snapshot: TaskQueueSnapshot): void => {
    generation.current += 1
    setCount(queuedCountOf(snapshot))
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const onVisibility = (): void => { setPageVisible(!document.hidden) }
    document.addEventListener('visibilitychange', onVisibility)
    return () => { document.removeEventListener('visibilitychange', onVisibility) }
  }, [])

  useEffect(() => {
    if (!enabled || !pageVisible) {
      setCount(null)
      return
    }
    let cancelled = false
    let inFlight = false
    const load = (): void => {
      if (inFlight) return
      inFlight = true
      const startedAtGeneration = generation.current
      void loadTaskQueueSummary().then(summary => {
        if (cancelled || startedAtGeneration !== generation.current) return
        setCount(summary.supported ? summary.queuedCount : null)
      }).catch(() => {
        // Ambient badge failures stay silent; clicking still tries the full API.
      }).finally(() => { inFlight = false })
    }
    load()
    const timer = window.setInterval(load, REFRESH_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [enabled, pageVisible])

  return { count, applySnapshot }
}

/** Persistent, opt-in composer switch. It performs no queue or network writes. */
export function QuickQueueToggle({ t }: QuickQueueToggleProps): React.ReactNode {
  const prefs = useQuickQueuePrefs()
  const toggle = (): void => {
    saveQuickQueuePrefs({ ...prefs, enabled: !prefs.enabled })
  }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={prefs.enabled}
      aria-label={t('quickQueueToggle')}
      className={css.quickQueueToggle}
      data-testid="quick-queue-toggle"
      onClick={toggle}
    >
      {t('quickQueueToggle')}
    </button>
  )
}

/** Bind one public projection cell with the same subscription semantics as the host kit. */
function useProjectionValue<K extends ProjectionKey>(
  faceOf: ProjectionFaceOf,
  key: K,
): SessionProjectionMap[K] | undefined {
  const face = faceOf(key)
  const subscribe = useCallback((listener: () => void) => face?.subscribe(listener) ?? (() => {}), [face])
  const getSnapshot = useCallback(() => face?.getSnapshot(), [face])
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot) as SessionProjectionMap[K] | undefined
}

/** Enqueue the captured draft for a later off-peak window; never prompt the current Session. */
export function QuickQueueEnqueue({
  sessionId,
  t,
  useInput,
  inputActions,
  projectionFaceOf,
}: QuickQueueEnqueueProps): React.ReactNode {
  const prefs = useQuickQueuePrefs()
  const readInput = useInput ?? unavailableInput
  const input = readInput(state => state)
  const cwd = useProjectionValue(projectionFaceOf ?? unavailableProjection, 'workingDirectory')
  const selection = useProjectionValue(projectionFaceOf ?? unavailableProjection, 'modelSelection')?.next
  const { count, applySnapshot } = useQueuedCount(prefs.enabled)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const inFlight = useRef(false)
  const mounted = useRef(true)
  const latest = useRef({ sessionId, input })
  latest.current = { sessionId, input }

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    if (notice?.kind !== 'success') return
    const timer = window.setTimeout(() => { setNotice(null) }, SUCCESS_NOTICE_MS)
    return () => { window.clearTimeout(timer) }
  }, [notice])

  if (!prefs.enabled) return null

  const fail = (text: string): void => { setNotice({ kind: 'error', text }) }
  const enqueue = async (): Promise<void> => {
    if (inFlight.current) return
    setNotice(null)
    if (input === undefined) {
      fail(t('quickQueueUnsupported'))
      return
    }
    const prompt = input.draft
    if (prompt.trim() === '') {
      fail(t('quickQueueEmpty'))
      return
    }
    if (input.phase !== 'plain') {
      fail(t('quickQueueBusy'))
      return
    }
    if (input.attachmentIds.length > 0 || input.occurrences.length > 0) {
      fail(t('quickQueueAttachments'))
      return
    }
    if (typeof cwd !== 'string' || cwd === '') {
      fail(t('quickQueueContext'))
      return
    }
    const clearAfterEnqueue = prefs.clearAfterEnqueue
    if (clearAfterEnqueue && inputActions === undefined) {
      fail(t('quickQueueUnsupported'))
      return
    }

    const captured = {
      sessionId,
      prompt,
      draftRev: input.draftRev,
      cwd,
      clearAfterEnqueue,
    }
    inFlight.current = true
    setBusy(true)
    try {
      // Refresh at click time: a lightweight count cannot prove eligibility,
      // and a cached default could stale after the user changes their route.
      const options = await loadTaskQueue(true)
      if (!options.supported) {
        fail(t('quickQueueUnsupported'))
        return
      }
      const effectiveSelection = selection ?? options.defaultModel
      if (effectiveSelection == null) {
        fail(t('quickQueueContext'))
        return
      }
      const workspaceOk = options.workspaces.some(workspace => workspace.path === captured.cwd)
      const modelOk = options.models.some(model =>
        model.provider === effectiveSelection.provider && model.id === effectiveSelection.model)
      if (!workspaceOk || !modelOk) {
        fail(t('quickQueueRoute'))
        return
      }
      const snapshot = await mutateTaskQueue({
        action: 'enqueue',
        prompt: captured.prompt,
        cwd: captured.cwd,
        provider: effectiveSelection.provider,
        model: effectiveSelection.model,
      })
      applySnapshot(snapshot)

      let text = t('quickQueueEnqueued')
      if (captured.clearAfterEnqueue && inputActions !== undefined) {
        const current = latest.current
        const unchanged = mounted.current
          && current.sessionId === captured.sessionId
          && current.input?.draft === captured.prompt
          && current.input.draftRev === captured.draftRev
          && current.input.phase === 'plain'
          && current.input.attachmentIds.length === 0
          && current.input.occurrences.length === 0
        if (unchanged) {
          try {
            // The public host API has no CAS replace. Keep the latest snapshot +
            // revision check and setDraft in one synchronous turn, with no await
            // between them, so a late response cannot erase subsequent edits.
            inputActions.setDraft('')
          } catch {
            // The task is already durable; an editor teardown must not turn that
            // success into a misleading enqueue failure.
            text = t('quickQueueDraftChanged')
          }
        } else {
          text = t('quickQueueDraftChanged')
        }
      }
      if (mounted.current) setNotice({ kind: 'success', text })
    } catch (error) {
      if (!mounted.current) return
      const detail = error instanceof Error ? error.message : String(error)
      fail(t('quickQueueFailed').replace('{message}', detail))
    } finally {
      inFlight.current = false
      if (mounted.current) setBusy(false)
    }
  }

  return (
    <span className={css.quickQueue} data-testid="quick-queue-controls">
      <label className={css.quickQueueClear}>
        <input
          type="checkbox"
          checked={prefs.clearAfterEnqueue}
          disabled={busy}
          onChange={event => { saveQuickQueuePrefs({ ...prefs, clearAfterEnqueue: event.target.checked }) }}
        />
        {t('quickQueueClear')}
      </label>
      <button
        type="button"
        className={css.quickQueueButton}
        aria-label={t('quickQueueEnqueue')}
        aria-busy={busy}
        disabled={busy}
        data-testid="quick-queue-enqueue"
        onClick={() => { void enqueue() }}
      >
        {busy ? t('quickQueueEnqueueing') : t('quickQueueEnqueue')}
        {count !== null && count > 0 && (
          <span
            className={css.quickQueueCount}
            data-testid="quick-queue-count"
            aria-label={t('quickQueueWaiting').replace('{count}', String(count))}
          >
            {count}
          </span>
        )}
      </button>
      {notice !== null && (
        <span
          className={css.quickQueueNotice}
          data-kind={notice.kind}
          role={notice.kind === 'error' ? 'alert' : 'status'}
        >
          {notice.text}
        </span>
      )}
    </span>
  )
}
