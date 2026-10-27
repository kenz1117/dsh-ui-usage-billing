/** API contract: the optional queue endpoint is readable on both host generations. */

import { expect, test } from '@playwright/test'

test('GET /api/billing/task-queue returns capability and durable queue shape', async ({ request }) => {
  const response = await request.get('/api/billing/task-queue')
  expect(response.status()).toBe(200)
  const snapshot = await response.json() as Record<string, unknown>
  expect(typeof snapshot.supported).toBe('boolean')
  expect(['peak', 'offPeak']).toContain(snapshot.tier)
  expect(typeof snapshot.nextSwitchInMs).toBe('number')
  expect(Array.isArray(snapshot.tasks)).toBe(true)
  expect(Array.isArray(snapshot.workspaces)).toBe(true)
  expect(Array.isArray(snapshot.models)).toBe(true)
})

test('GET /api/billing/task-queue-summary exposes counts without Prompt content', async ({ request }) => {
  const response = await request.get('/api/billing/task-queue-summary')
  expect(response.status()).toBe(200)
  const summary = await response.json() as Record<string, unknown>
  expect(typeof summary.supported).toBe('boolean')
  expect(['peak', 'offPeak']).toContain(summary.tier)
  expect(typeof summary.nextSwitchInMs).toBe('number')
  expect(typeof summary.queuedCount).toBe('number')
  expect(summary).not.toHaveProperty('tasks')
  expect(summary).not.toHaveProperty('prompt')
})

test('POST /api/billing/task-queue rejects an unknown mutation without side effects', async ({ request }) => {
  const response = await request.post('/api/billing/task-queue', { data: { action: 'not-a-real-action' } })
  expect(response.status()).toBe(400)
  const body = await response.json() as { error?: unknown }
  expect(body.error).toBe('unknown queue action')
})
