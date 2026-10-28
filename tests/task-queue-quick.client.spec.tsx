// @vitest-environment jsdom
/** Composer quick-queue safety contract: captured routing, no Prompt submit, and revision-safe clearing. */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { InputActions, InputState } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { QuickQueueEnqueue, QuickQueueToggle, type ProjectionFaceOf, type QuickQueueEnqueueProps } from '../src/client/task-queue-quick.tsx'
import { zh } from '../src/client/locales.ts'
import {
  QUICK_QUEUE_STORAGE_KEY,
  loadQuickQueuePrefs,
  saveQuickQueuePrefs,
} from '../src/client/usage-billing-settings.ts'
import type { TaskQueueSnapshot, TaskQueueSummary } from '../src/task-queue-shared.ts'

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key
const SESSION = 'sess-1' as SessionId
const PROMPT = 'Review the repository at the next off-peak window'

const BASE_INPUT: InputState = {
  draft: PROMPT,
  attachmentIds: [],
  draftRev: 7,
  phase: 'plain',
  occurrences: [],
  queue: [],
}

const BASE: TaskQueueSnapshot = {
  supported: true,
  tier: 'peak',
  nextSwitchInMs: 30_000,
  tasks: [],
  workspaces: [{ path: '/tmp/work', title: 'Work' }],
  models: [{ provider: 'deepseek-official', providerName: 'DeepSeek', id: 'deepseek-flash', name: 'DeepSeek Chat' }],
}

const SUMMARY: TaskQueueSummary = { supported: true, tier: 'peak', nextSwitchInMs: 30_000, queuedCount: 2 }

function queuedSnapshot(prompt = PROMPT): TaskQueueSnapshot {
  return {
    ...BASE,
    tasks: [{
      id: 'task-1', prompt, cwd: '/tmp/work', provider: 'deepseek-official',
      model: 'deepseek-flash', status: 'queued', createdAt: 1,
    }],
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

interface Deferred<T> {
  readonly promise: Promise<T>
  readonly resolve: (value: T) => void
  readonly reject: (reason: Error) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

interface Harness {
  readonly actions: InputActions
  readonly setDraft: ReturnType<typeof vi.fn>
  readonly submit: ReturnType<typeof vi.fn>
  readonly updateInput: (next: InputState) => void
  readonly updateSession: (next: SessionId) => void
  readonly unmount: () => void
}

function renderQuick(options: {
  readonly input?: InputState
  readonly withInput?: boolean
  readonly withProjection?: boolean
  readonly cwd?: string
  readonly provider?: string
  readonly model?: string
  readonly nextModel?: { readonly provider: string; readonly model: string } | null
} = {}): Harness {
  let currentInput = options.input ?? BASE_INPUT
  let currentSession = SESSION
  const setDraft = vi.fn()
  const submit = vi.fn()
  const actions = { setDraft, submit } as unknown as InputActions
  const useInput: NonNullable<QuickQueueEnqueueProps['useInput']> = selector => selector(currentInput)
  // The public host contract guarantees identity-stable faces per key.
  const subscribe = (): (() => void) => () => {}
  const cwd = options.cwd ?? '/tmp/work'
  const next = options.nextModel === undefined
    ? { provider: options.provider ?? 'deepseek-official', model: options.model ?? 'deepseek-flash' }
    : options.nextModel
  const selection = { lastUsed: null, next }
  const workingDirectoryFace = { subscribe, getSnapshot: () => cwd }
  const modelSelectionFace = { subscribe, getSnapshot: () => selection }
  const projectionFaceOf: ProjectionFaceOf = key => key === 'workingDirectory' ? workingDirectoryFace : modelSelectionFace
  const element = (): React.ReactElement => (
    <QuickQueueEnqueue
      sessionId={currentSession}
      t={t}
      {...(options.withInput === false ? {} : { useInput })}
      inputActions={actions}
      {...(options.withProjection === false ? {} : { projectionFaceOf })}
    />
  )
  const view = render(element())
  return {
    actions,
    setDraft,
    submit,
    updateInput: next => {
      currentInput = next
      view.rerender(element())
    },
    updateSession: next => {
      currentSession = next
      view.rerender(element())
    },
    unmount: () => { view.unmount() },
  }
}

function stubQueue(options: {
  readonly snapshot?: TaskQueueSnapshot
  readonly mutation?: Promise<TaskQueueSnapshot>
  readonly summary?: Promise<TaskQueueSummary>
  readonly mutationError?: Error
  readonly mutationStatus?: number
} = {}): { readonly fetchMock: ReturnType<typeof vi.fn>; readonly mutations: unknown[] } {
  const mutations: unknown[] = []
  const snapshot = options.snapshot ?? BASE
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input)
    if (init?.method === 'POST') {
      mutations.push(JSON.parse(String(init.body)))
      if (options.mutationError !== undefined) throw options.mutationError
      if (options.mutationStatus !== undefined) return jsonResponse({ error: 'queue changed' }, options.mutationStatus)
      if (options.mutation !== undefined) return jsonResponse({ ok: true, snapshot: await options.mutation })
      return jsonResponse({ ok: true, snapshot: queuedSnapshot() })
    }
    if (url.endsWith('/task-queue-summary')) {
      if (options.summary !== undefined) return jsonResponse(await options.summary)
      return jsonResponse(SUMMARY)
    }
    return jsonResponse(snapshot)
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, mutations }
}

beforeEach(() => {
  localStorage.clear()
  saveQuickQueuePrefs({ enabled: true, clearAfterEnqueue: false })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('quick queue preferences and opt-in gate', () => {
  it('fails closed on missing, corrupt, or non-boolean preferences', () => {
    localStorage.clear()
    expect(loadQuickQueuePrefs()).toEqual({ enabled: false, clearAfterEnqueue: false })
    localStorage.setItem(QUICK_QUEUE_STORAGE_KEY, '{broken')
    expect(loadQuickQueuePrefs()).toEqual({ enabled: false, clearAfterEnqueue: false })
    localStorage.setItem(QUICK_QUEUE_STORAGE_KEY, '{"enabled":"yes","clearAfterEnqueue":1}')
    expect(loadQuickQueuePrefs()).toEqual({ enabled: false, clearAfterEnqueue: false })
  })

  it('does not render controls or poll by default; the persistent switch enables them live', async () => {
    localStorage.clear()
    const { fetchMock } = stubQueue()
    const view = render(<><QuickQueueToggle t={t} /><QuickQueueEnqueue sessionId={SESSION} t={t} /></>)
    expect(screen.queryByTestId('quick-queue-controls')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('switch', { name: t('quickQueueToggle') }))
    expect(await screen.findByTestId('quick-queue-controls')).toBeTruthy()
    await waitFor(() => expect(fetchMock.mock.calls.some(call => String(call[0]).endsWith('/task-queue-summary'))).toBe(true))
    expect(loadQuickQueuePrefs().enabled).toBe(true)
    view.unmount()
  })
})

describe('quick queue admission guards', () => {
  it.each([
    ['blank', { ...BASE_INPUT, draft: '  \n ' }, 'quickQueueEmpty'],
    ['busy', { ...BASE_INPUT, phase: 'sending' as const }, 'quickQueueBusy'],
    ['attachment', { ...BASE_INPUT, attachmentIds: ['file-1'] as InputState['attachmentIds'] }, 'quickQueueAttachments'],
    ['reference', { ...BASE_INPUT, occurrences: [{}] as InputState['occurrences'] }, 'quickQueueAttachments'],
  ])('rejects a %s draft without reading or mutating the queue', async (_name, input, message) => {
    const { fetchMock, mutations } = stubQueue()
    renderQuick({ input })
    fireEvent.click(await screen.findByTestId('quick-queue-enqueue'))
    expect((await screen.findByRole('alert')).textContent).toBe(t(message))
    expect(mutations).toEqual([])
    // Only the ambient summary may have run; no full snapshot or POST is needed.
    expect(fetchMock.mock.calls.every(call => String(call[0]).endsWith('/task-queue-summary'))).toBe(true)
  })

  it.each([
    ['workspace', { snapshot: { ...BASE, workspaces: [] } }],
    ['model', { snapshot: { ...BASE, models: [] } }],
    ['unsupported host queue', { snapshot: { ...BASE, supported: false } }],
  ])('rejects an ineligible %s without a mutation', async (_name, options) => {
    const { mutations } = stubQueue(options)
    renderQuick()
    fireEvent.click(await screen.findByTestId('quick-queue-enqueue'))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(mutations).toEqual([])
  })

  it('degrades understandably when the old host lacks projection hooks', async () => {
    const { mutations } = stubQueue()
    renderQuick({ withProjection: false })
    fireEvent.click(await screen.findByTestId('quick-queue-enqueue'))
    expect((await screen.findByRole('alert')).textContent).toBe(t('quickQueueContext'))
    expect(mutations).toEqual([])
  })

  it('degrades without the old host input kit instead of crashing', async () => {
    const { mutations } = stubQueue()
    renderQuick({ withInput: false })
    fireEvent.click(await screen.findByTestId('quick-queue-enqueue'))
    expect((await screen.findByRole('alert')).textContent).toBe(t('quickQueueUnsupported'))
    expect(mutations).toEqual([])
  })

  it('fails closed when neither the Session nor the host exposes an effective model', async () => {
    const { mutations } = stubQueue()
    renderQuick({ nextModel: null })
    fireEvent.click(await screen.findByTestId('quick-queue-enqueue'))
    expect((await screen.findByRole('alert')).textContent).toBe(t('quickQueueContext'))
    expect(mutations).toEqual([])
  })

  it('rejects an ineligible host default instead of inheriting official off-peak pricing', async () => {
    const { mutations } = stubQueue({
      snapshot: { ...BASE, defaultModel: { provider: 'discount-relay', model: 'deepseek-flash' } },
    })
    renderQuick({ nextModel: null })
    fireEvent.click(await screen.findByTestId('quick-queue-enqueue'))
    expect((await screen.findByRole('alert')).textContent).toBe(t('quickQueueRoute'))
    expect(mutations).toEqual([])
  })
})

describe('quick queue mutation and feedback', () => {
  it('uses a freshly read host catalog default when a new Session has no explicit next model', async () => {
    const { fetchMock, mutations } = stubQueue({
      snapshot: { ...BASE, defaultModel: { provider: 'deepseek-official', model: 'deepseek-flash' } },
    })
    renderQuick({ nextModel: null })
    fireEvent.click(await screen.findByTestId('quick-queue-enqueue'))
    expect(await screen.findByRole('status')).toBeTruthy()
    expect(fetchMock.mock.calls.some(call => String(call[0]).endsWith('/task-queue?refresh=1'))).toBe(true)
    expect(mutations).toEqual([{
      action: 'enqueue', prompt: PROMPT, cwd: '/tmp/work',
      provider: 'deepseek-official', model: 'deepseek-flash',
    }])
  })

  it('prefers the Session next route over the host default', async () => {
    const { mutations } = stubQueue({
      snapshot: { ...BASE, defaultModel: { provider: 'other', model: 'other-model' } },
    })
    renderQuick({ nextModel: { provider: 'deepseek-official', model: 'deepseek-flash' } })
    fireEvent.click(await screen.findByTestId('quick-queue-enqueue'))
    expect(await screen.findByRole('status')).toBeTruthy()
    expect(mutations[0]).toMatchObject({ provider: 'deepseek-official', model: 'deepseek-flash' })
  })
  it('posts exactly the captured public prompt/cwd/provider/model, keeps the draft by default, and updates the badge', async () => {
    const { mutations } = stubQueue()
    const harness = renderQuick()
    const button = await screen.findByTestId('quick-queue-enqueue')
    await waitFor(() => expect(screen.getByTestId('quick-queue-count').textContent).toBe('2'))
    fireEvent.click(button)

    expect((await screen.findByRole('status')).textContent).toBe(t('quickQueueEnqueued'))
    expect(mutations).toEqual([{
      action: 'enqueue', prompt: PROMPT, cwd: '/tmp/work',
      provider: 'deepseek-official', model: 'deepseek-flash',
    }])
    expect(harness.setDraft).not.toHaveBeenCalled()
    expect(harness.submit).not.toHaveBeenCalled()
    expect(screen.getByTestId('quick-queue-count').textContent).toBe('1')
  })

  it('clears exactly once after success when explicitly enabled and the revision is unchanged', async () => {
    saveQuickQueuePrefs({ enabled: true, clearAfterEnqueue: true })
    stubQueue()
    const harness = renderQuick()
    fireEvent.click(await screen.findByTestId('quick-queue-enqueue'))
    expect(await screen.findByRole('status')).toBeTruthy()
    expect(harness.setDraft).toHaveBeenCalledTimes(1)
    expect(harness.setDraft).toHaveBeenCalledWith('')
  })

  it('coalesces a double click into one mutation', async () => {
    const pending = deferred<TaskQueueSnapshot>()
    const { mutations } = stubQueue({ mutation: pending.promise })
    renderQuick()
    const button = await screen.findByTestId('quick-queue-enqueue')
    fireEvent.click(button)
    fireEvent.click(button)
    await waitFor(() => expect(mutations).toHaveLength(1))
    pending.resolve(queuedSnapshot())
    expect(await screen.findByRole('status')).toBeTruthy()
    expect(mutations).toHaveLength(1)
  })

  it('keeps the draft and shows an alert when the mutation fails', async () => {
    saveQuickQueuePrefs({ enabled: true, clearAfterEnqueue: true })
    stubQueue({ mutationError: new Error('network unavailable') })
    const harness = renderQuick()
    fireEvent.click(await screen.findByTestId('quick-queue-enqueue'))
    expect((await screen.findByRole('alert')).textContent).toContain('network unavailable')
    expect(harness.setDraft).not.toHaveBeenCalled()
  })

  it('treats an HTTP 409 as a failure and never clears the draft', async () => {
    saveQuickQueuePrefs({ enabled: true, clearAfterEnqueue: true })
    stubQueue({ mutationStatus: 409 })
    const harness = renderQuick()
    fireEvent.click(await screen.findByTestId('quick-queue-enqueue'))
    expect((await screen.findByRole('alert')).textContent).toContain('queue changed')
    expect(harness.setDraft).not.toHaveBeenCalled()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('still attempts the full enqueue API when the ambient summary failed', async () => {
    const { mutations } = stubQueue({ summary: Promise.reject(new Error('summary offline')) })
    renderQuick()
    fireEvent.click(await screen.findByTestId('quick-queue-enqueue'))
    expect(await screen.findByRole('status')).toBeTruthy()
    expect(mutations).toHaveLength(1)
  })
})

describe('quick queue late-response races', () => {
  it('never clears text entered while the mutation is in flight', async () => {
    saveQuickQueuePrefs({ enabled: true, clearAfterEnqueue: true })
    const pending = deferred<TaskQueueSnapshot>()
    const { mutations } = stubQueue({ mutation: pending.promise })
    const harness = renderQuick()
    fireEvent.click(await screen.findByTestId('quick-queue-enqueue'))
    await waitFor(() => expect(mutations).toHaveLength(1))

    harness.updateInput({ ...BASE_INPUT, draft: 'new text typed after enqueue', draftRev: 8 })
    pending.resolve(queuedSnapshot())
    expect((await screen.findByRole('status')).textContent).toBe(t('quickQueueDraftChanged'))
    expect(harness.setDraft).not.toHaveBeenCalled()
  })

  it('does not clear when the text was edited back to the same words under a newer revision', async () => {
    saveQuickQueuePrefs({ enabled: true, clearAfterEnqueue: true })
    const pending = deferred<TaskQueueSnapshot>()
    const { mutations } = stubQueue({ mutation: pending.promise })
    const harness = renderQuick()
    fireEvent.click(await screen.findByTestId('quick-queue-enqueue'))
    await waitFor(() => expect(mutations).toHaveLength(1))

    harness.updateInput({ ...BASE_INPUT, draftRev: 8 })
    pending.resolve(queuedSnapshot())
    expect((await screen.findByRole('status')).textContent).toBe(t('quickQueueDraftChanged'))
    expect(harness.setDraft).not.toHaveBeenCalled()
  })

  it('never clears a different Session after navigation during the mutation', async () => {
    saveQuickQueuePrefs({ enabled: true, clearAfterEnqueue: true })
    const pending = deferred<TaskQueueSnapshot>()
    const { mutations } = stubQueue({ mutation: pending.promise })
    const harness = renderQuick()
    fireEvent.click(await screen.findByTestId('quick-queue-enqueue'))
    await waitFor(() => expect(mutations).toHaveLength(1))

    harness.updateSession('sess-2' as SessionId)
    pending.resolve(queuedSnapshot())
    expect((await screen.findByRole('status')).textContent).toBe(t('quickQueueDraftChanged'))
    expect(harness.setDraft).not.toHaveBeenCalled()
  })

  it('does not let an older summary response overwrite the enqueue snapshot count', async () => {
    const summary = deferred<TaskQueueSummary>()
    stubQueue({ summary: summary.promise })
    renderQuick()
    fireEvent.click(await screen.findByTestId('quick-queue-enqueue'))
    expect(await screen.findByRole('status')).toBeTruthy()
    expect(screen.getByTestId('quick-queue-count').textContent).toBe('1')

    await act(async () => { summary.resolve({ ...SUMMARY, queuedCount: 99 }) })
    expect(screen.getByTestId('quick-queue-count').textContent).toBe('1')
  })
})
