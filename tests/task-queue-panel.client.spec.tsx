// @vitest-environment jsdom
/** Queue panel: explicit opt-in on new hosts and read-only fallback on old hosts. */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TaskQueuePanel } from '../src/client/TaskQueuePanel.tsx'
import { zh } from '../src/client/locales.ts'
import type { TaskQueueSnapshot } from '../src/task-queue-shared.ts'

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key
const navigateToSession = vi.fn(() => 'opened' as const)

const BASE: TaskQueueSnapshot = {
  supported: true,
  tier: 'offPeak',
  nextSwitchInMs: 30_000,
  tasks: [],
  workspaces: [{ path: '/tmp/work', title: 'Work' }],
  models: [{ provider: 'deepseek-official', providerName: 'DeepSeek', id: 'deepseek-flash', name: 'DeepSeek Chat' }],
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

beforeEach(() => {
  localStorage.clear()
})

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
}

describe('TaskQueuePanel', () => {
  it('shows a read-only explanation when the host lacks Session control', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ ...BASE, supported: false })))
    render(<TaskQueuePanel t={t} language="zh" navigateToSession={navigateToSession} />)

    expect(await screen.findByTestId('queue-unsupported')).toBeTruthy()
    expect(screen.getByText(t('queueUnsupportedBody'))).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('button', { name: t('queueEnqueue') })).toBeNull()
  })

  it('submits only the explicitly entered Prompt and renders the returned task', async () => {
    const requests: { url: string; body?: unknown }[] = []
    const queued: TaskQueueSnapshot = {
      ...BASE,
      tier: 'peak',
      tasks: [{
        id: 'task-1', prompt: 'Summarize the repository', cwd: '/tmp/work',
        provider: 'deepseek-official', model: 'deepseek-flash', status: 'queued', createdAt: 1,
      }],
    }
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as unknown
        requests.push({ url, body })
        return jsonResponse({ ok: true, snapshot: queued })
      }
      requests.push({ url })
      return jsonResponse(BASE)
    }))
    render(<TaskQueuePanel t={t} language="zh" navigateToSession={navigateToSession} />)

    const textarea = await screen.findByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Summarize the repository' } })
    const button = screen.getByRole('button', { name: t('queueEnqueue') })
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(button)

    expect(await screen.findByTestId('queue-task-task-1')).toBeTruthy()
    const mutation = requests.find(request => request.body !== undefined)
    expect(mutation?.url).toBe('/api/billing/task-queue')
    expect(mutation?.body).toEqual({
      action: 'enqueue', prompt: 'Summarize the repository', cwd: '/tmp/work',
      provider: 'deepseek-official', model: 'deepseek-flash',
    })
    expect((textarea as HTMLTextAreaElement).value).toBe('')
  })
})
