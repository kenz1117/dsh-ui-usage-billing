/** API client for the new-host off-peak task queue preview (issue #106). */

import { fetchBilling } from './http.ts'
import type { TaskQueueInput, TaskQueueMutation, TaskQueueSnapshot, TaskQueueSummary } from '../../task-queue-shared.ts'

async function errorOf(response: Response): Promise<string> {
  try {
    const parsed = JSON.parse(await response.text()) as { error?: unknown }
    return typeof parsed.error === 'string' ? parsed.error : `HTTP ${response.status}`
  } catch {
    return `HTTP ${response.status}`
  }
}

export async function loadTaskQueue(refreshModels = false): Promise<TaskQueueSnapshot> {
  const suffix = refreshModels ? '?refresh=1' : ''
  const response = await fetchBilling(`/api/billing/task-queue${suffix}`)
  if (!response.ok) throw new Error(await errorOf(response))
  return await response.json() as TaskQueueSnapshot
}

export async function loadTaskQueueSummary(): Promise<TaskQueueSummary> {
  const response = await fetchBilling('/api/billing/task-queue-summary')
  if (!response.ok) throw new Error(await errorOf(response))
  return await response.json() as TaskQueueSummary
}

export type TaskQueueAction =
  | { action: 'enqueue'; prompt: string; cwd: string; provider: string; model: string }
  | { action: 'enqueueMany'; tasks: readonly TaskQueueInput[] }
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
