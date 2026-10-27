/** Off-peak task queue panel: explicit enqueue, visible outcomes, safe old-host fallback. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import type { BillingLanguage } from './usage-billing-settings.ts'
import type { UsageBillingKey } from './locales.ts'
import type { TaskQueueInput, TaskQueueSnapshot, TaskQueueStatus, TaskQueueTask } from '../task-queue-shared.ts'
import { loadTaskQueue, mutateTaskQueue, type TaskQueueAction } from './api/task-queue.ts'
import { formatSwitchCountdown } from './pricing.ts'
import css from './TaskQueuePanel.module.css'

interface TaskQueuePanelProps {
  readonly t: (key: UsageBillingKey, params?: Record<string, unknown>) => string
  readonly language: BillingLanguage
  readonly navigateToSession: (sessionId: string) => 'opened' | 'unavailable' | 'failed'
}

const STATUS_KEY: Record<TaskQueueStatus, UsageBillingKey> = {
  queued: 'queueStatusQueued', starting: 'queueStatusStarting', running: 'queueStatusRunning',
  completed: 'queueStatusCompleted', failed: 'queueStatusFailed',
}

function isTerminal(task: TaskQueueTask): boolean {
  return task.status === 'completed' || task.status === 'failed'
}

function modelValue(provider: string, model: string): string {
  return JSON.stringify([provider, model])
}

interface ImportDefaults {
  readonly cwd: string
  readonly provider: string
  readonly model: string
}

/** Normalize only the transport shape; authoritative validation stays atomic on the server. */
export function parseTaskQueueImport(text: string, defaults: ImportDefaults): TaskQueueInput[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    throw new Error('invalid task import')
  }
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('invalid task import')
  return parsed.map(item => {
    if (typeof item === 'string') return { prompt: item, ...defaults }
    if (item === null || typeof item !== 'object' || Array.isArray(item)) throw new Error('invalid task import')
    const input = item as TaskQueueInput
    return {
      prompt: input.prompt,
      cwd: input.cwd ?? defaults.cwd,
      provider: input.provider ?? defaults.provider,
      model: input.model ?? defaults.model,
    }
  })
}

export function TaskQueuePanel({ t, language, navigateToSession }: TaskQueuePanelProps): React.ReactNode {
  const [snapshot, setSnapshot] = useState<TaskQueueSnapshot | undefined>()
  const [prompt, setPrompt] = useState('')
  const [cwd, setCwd] = useState('')
  const [selection, setSelection] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [notice, setNotice] = useState<string | undefined>()
  const mounted = useRef(true)
  const inFlight = useRef(false)
  const mutating = useRef(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const reload = useCallback(async (): Promise<void> => {
    if (inFlight.current) return
    inFlight.current = true
    try {
      const next = await loadTaskQueue()
      if (mounted.current) {
        setSnapshot(next)
        setError(undefined)
      }
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      inFlight.current = false
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    void reload()
    const timer = setInterval(() => { void reload() }, 5_000)
    return () => {
      mounted.current = false
      clearInterval(timer)
    }
  }, [reload])

  useEffect(() => {
    if (snapshot === undefined) return
    if (!snapshot.workspaces.some(workspace => workspace.path === cwd)) setCwd(snapshot.workspaces[0]?.path ?? '')
    if (!snapshot.models.some(model => modelValue(model.provider, model.id) === selection)) {
      setSelection(snapshot.models[0] === undefined ? '' : modelValue(snapshot.models[0].provider, snapshot.models[0].id))
    }
  }, [snapshot, cwd, selection])

  const run = useCallback(async (action: TaskQueueAction, clearPrompt = false): Promise<boolean> => {
    if (busy || mutating.current) return false
    mutating.current = true
    setBusy(true)
    setError(undefined)
    setNotice(undefined)
    try {
      const next = await mutateTaskQueue(action)
      if (!mounted.current) return false
      setSnapshot(next)
      if (clearPrompt) setPrompt('')
      return true
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : String(cause))
      return false
    } finally {
      mutating.current = false
      if (mounted.current) setBusy(false)
    }
  }, [busy])

  const active = useMemo(() => snapshot?.tasks.filter(task => !isTerminal(task)) ?? [], [snapshot])
  const history = useMemo(() => snapshot?.tasks.filter(isTerminal).slice().reverse() ?? [], [snapshot])
  const canConfigure = snapshot !== undefined && snapshot.supported && snapshot.workspaces.length > 0 && snapshot.models.length > 0
  const timeOf = (value: number): string => new Date(value).toLocaleString(language === 'en' ? 'en-US' : 'zh-CN')

  const enqueue = (): void => {
    if (prompt.trim() === '' || cwd === '' || selection === '') return
    const [provider, model] = JSON.parse(selection) as [string, string]
    void run({ action: 'enqueue', prompt, cwd, provider, model }, true)
  }

  const importTasks = async (file: File | undefined): Promise<void> => {
    if (file === undefined || !canConfigure || busy || selection === '') return
    setError(undefined)
    setNotice(undefined)
    try {
      if (file.size > 10 * 1024 * 1024) {
        setError(t('queueImportTooLarge'))
        return
      }
      const [provider, model] = JSON.parse(selection) as [string, string]
      const tasks = parseTaskQueueImport(await file.text(), { cwd, provider, model })
      if (await run({ action: 'enqueueMany', tasks }) && mounted.current) {
        setNotice(t('queueImported', { count: tasks.length }))
      }
    } catch {
      if (mounted.current) setError(t('queueImportFormat'))
    }
  }

  const openSession = (sessionId: string): void => {
    const result = navigateToSession(sessionId)
    setNotice(result === 'opened' ? undefined : t(result === 'unavailable' ? 'sessionOpenUnavailable' : 'sessionOpenFailed'))
  }

  const taskRow = (task: TaskQueueTask): React.ReactNode => {
    const workspace = snapshot?.workspaces.find(item => item.path === task.cwd)
    return (
      <li className={css.queueTask} key={task.id} data-testid={`queue-task-${task.id}`}>
        <div className={css.queueTaskHead}>
          <span className={clsx(css.queueStatus, css[`queueStatus_${task.status}`])}>{t(STATUS_KEY[task.status])}</span>
          <span className={css.queueTaskMeta}>{workspace?.title ?? task.cwd} · {task.model}</span>
          <time className={css.queueTaskTime} dateTime={new Date(task.createdAt).toISOString()}>{timeOf(task.createdAt)}</time>
        </div>
        <details className={css.queuePrompt}>
          <summary>{task.prompt.trim().slice(0, 180) || task.prompt.slice(0, 180)}</summary>
          <pre>{task.prompt}</pre>
        </details>
        {task.error !== undefined && <div className={css.queueTaskError} role="note">{task.error}</div>}
        <div className={css.queueTaskActions}>
          {task.sessionId !== undefined && (
            <button type="button" className={css.queueLinkButton} onClick={() => { openSession(task.sessionId!) }}>
              {t('queueOpenSession')}
            </button>
          )}
          {(task.status === 'queued' || isTerminal(task)) && (
            <button type="button" className={css.queueLinkButton} disabled={busy} onClick={() => { void run({ action: 'remove', id: task.id }) }}>
              {t(task.status === 'queued' ? 'queueRemoveQueued' : 'queueRemoveHistory')}
            </button>
          )}
        </div>
      </li>
    )
  }

  return (
    <div className={css.queuePanel} data-testid="billing-tab-panel-queue">
      <section className={css.queueHero}>
        <div>
          <div className={css.queueTitleRow}>
            <h2 className={css.queueTitle}>{t('tabQueue')}</h2>
            <span className={css.queuePreview}>Preview</span>
          </div>
          <p className={css.queueSubtitle}>{t('queueSubtitle')}</p>
        </div>
        {snapshot?.supported && (
          <div className={clsx(css.queueBand, snapshot.tier === 'offPeak' ? css.queueBandOff : css.queueBandPeak)}>
            <strong>{t(snapshot.tier === 'offPeak' ? 'offPeak' : 'peak')}</strong>
            <span>{t(snapshot.tier === 'offPeak' ? 'queueUntilPeak' : 'queueUntilOffPeak')} {formatSwitchCountdown(snapshot.nextSwitchInMs)}</span>
          </div>
        )}
      </section>

      {error !== undefined && <div className={css.queueNoticeError} role="alert">{error}</div>}
      {notice !== undefined && <div className={css.queueNotice} role="status">{notice}</div>}

      {snapshot === undefined ? (
        <div className={css.queueEmpty}>{t('queueLoading')}</div>
      ) : !snapshot.supported ? (
        <section className={css.queueUnsupported} data-testid="queue-unsupported">
          <h3>{t('queueUnsupportedTitle')}</h3>
          <p>{t('queueUnsupportedBody')}</p>
        </section>
      ) : (
        <>
          <section className={css.queueComposer}>
            <div className={css.queueSafety}>{t('queueSafety')}</div>
            <div className={css.queueSelectors}>
              <label className={css.queueField}>
                <span>{t('queueWorkspace')}</span>
                <select value={cwd} disabled={!canConfigure || busy} onChange={event => { setCwd(event.target.value) }}>
                  {snapshot.workspaces.map(workspace => <option key={workspace.path} value={workspace.path}>{workspace.title}</option>)}
                </select>
              </label>
              <label className={css.queueField}>
                <span>{t('queueModel')}</span>
                <select value={selection} disabled={!canConfigure || busy} onChange={event => { setSelection(event.target.value) }}>
                  {snapshot.models.map(model => (
                    <option key={modelValue(model.provider, model.id)} value={modelValue(model.provider, model.id)}>
                      {model.providerName} / {model.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {!canConfigure && <div className={css.queueNotice}>{snapshot.optionsError ?? t('queueNoOptions')}</div>}
            <label className={css.queuePromptField}>
              <span>{t('queuePromptLabel')}</span>
              <textarea
                value={prompt}
                disabled={!canConfigure || busy}
                maxLength={32_000}
                rows={5}
                placeholder={t('queuePromptPlaceholder')}
                onChange={event => { setPrompt(event.target.value) }}
              />
            </label>
            <div className={css.queueComposerFooter}>
              <span>{t('queuePrivacy')}</span>
              <div className={css.queueComposerActions}>
                <input
                  ref={fileInput}
                  className={css.queueFileInput}
                  data-testid="queue-import-file"
                  type="file"
                  accept="application/json,.json"
                  disabled={!canConfigure || busy}
                  onChange={event => {
                    const file = event.target.files?.[0]
                    event.target.value = ''
                    void importTasks(file)
                  }}
                />
                <button
                  type="button"
                  className={css.queueSecondary}
                  title={t('queueImportHint')}
                  disabled={!canConfigure || busy}
                  onClick={() => { fileInput.current?.click() }}
                >
                  {t('queueImport')}
                </button>
                <button type="button" className={css.queuePrimary} disabled={!canConfigure || busy || prompt.trim() === ''} onClick={enqueue}>
                  {t('queueEnqueue')}
                </button>
              </div>
            </div>
          </section>

          <section className={css.queueListSection}>
            <div className={css.queueListHead}>
              <h3>{t('queueActive')} <span>{active.length}</span></h3>
              {history.length > 0 && (
                <button type="button" className={css.queueLinkButton} disabled={busy} onClick={() => { void run({ action: 'clearFinished' }) }}>
                  {t('queueClearFinished')}
                </button>
              )}
            </div>
            {active.length === 0 && history.length === 0
              ? <div className={css.queueEmpty}>{t('queueEmpty')}</div>
              : <ul className={css.queueList}>{active.map(taskRow)}{history.map(taskRow)}</ul>}
          </section>
        </>
      )}
    </div>
  )
}
