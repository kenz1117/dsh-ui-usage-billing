/** API client for the new-host off-peak task queue preview (issue #106). */

import { fetchBilling } from './http.ts'
import type { TaskQueueMutation, TaskQueueSnapshot } from '../../task-queue-shared.ts'

async function errorOf(response: Response): Promise<string> {
  try {
    const parsed = JSON.parse(await response.text()) as { error?: unknown }
    return typeof parsed.error === 'string' ? parsed.error : `HTTP ${response.status}`
  } catch {
    return `HTTP ${response.status}`
  }
}

export async function loadTaskQueue(): Promise<TaskQueueSnapshot> {
  const response = await fetchBilling('/api/billing/task-queue')
  if (!response.ok) throw new Error(await errorOf(response))
  return await response.json() as TaskQueueSnapshot
}

export type TaskQueueAction =
  | { action: 'enqueue'; prompt: string; cwd: string; provider: string; model: string }
  | { action: 'remove'; id: string }
  | { action: 'clearFinished' }

export async function mutateTaskQueue(action: TaskQueueAction): Promise<TaskQueueSnapshot> {
  const response = await fetchBilling('/api/billing/task-queue', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(action),
  })
  if (!response.ok) throw new Error(await errorOf(response))
  const parsed = await response.json() as TaskQueueMutation
  return parsed.snapshot
}
