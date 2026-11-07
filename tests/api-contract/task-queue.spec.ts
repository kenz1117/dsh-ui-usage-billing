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

test('POST /api/billing/task-queue keeps the source Session of a queued task (issue #118)', async ({ request }) => {
  const snapshot = await (await request.get('/api/billing/task-queue')).json() as {
    supported: boolean
    workspaces: { path: string }[]
    models: { provider: string; id: string }[]
  }
  const workspace = snapshot.workspaces[0]
  const model = snapshot.models[0]
  if (!snapshot.supported || workspace === undefined || model === undefined) {
    // 宿主没有工作区或模型时入队必然被拒（409）：契约只到「端点认这个形状」为止。
    const rejected = await request.post('/api/billing/task-queue', {
      data: {
        action: 'enqueue', prompt: 'contract probe', cwd: workspace?.path ?? '/nonexistent',
        provider: model?.provider ?? 'deepseek-official', model: model?.id ?? 'unknown',
        sourceSessionId: 'session-contract-probe', reuseSource: true,
      },
    })
    expect(rejected.status()).toBe(409)
    return
  }
  const created = await request.post('/api/billing/task-queue', {
    data: {
      action: 'enqueue', prompt: 'contract probe', cwd: workspace.path,
      provider: model.provider, model: model.id,
      sourceSessionId: 'session-contract-probe', reuseSource: true,
    },
  })
  expect(created.status()).toBe(200)
  const body = await created.json() as { snapshot: { tasks: { id: string; sourceSessionId?: string; reuseSource?: boolean }[] } }
  const task = body.snapshot.tasks.find(item => item.prompt === 'contract probe')
  expect(task?.sourceSessionId).toBe('session-contract-probe')
  expect(task?.reuseSource).toBe(true)
  // 契约探针不留垃圾：排队的任务立刻移除，免得它在下一个低谷真的跑起来。
  if (task !== undefined) {
    const removed = await request.post('/api/billing/task-queue', { data: { action: 'remove', id: task.id } })
    expect(removed.status()).toBe(200)
  }
})
