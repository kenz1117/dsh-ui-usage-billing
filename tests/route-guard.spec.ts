/**
 * S-8 补：路由边界防护（405 / CSRF / body 过大）。
 *
 * 9 条 HTTP 路由的回环守卫（guardLoopback）已覆盖「peer socket + Host 头」
 * 判定（tests/trusted-hosts.spec.ts）。本 spec 补：①405 方法拒绝 ②CSRF（Origin
 * 非回环 + 非 JSON Content-Type）拒绝 ③body 过大拒绝。
 *
 * 跑法：in-process 启 DSH host（cordis-loader 装配），真实 HTTP 打三条关键
 * 路由（notify-claim / usage-tool / pricing-refresh）。
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import HttpServer from '@deepseek-ai/dsh-host-webserver'
import type { SessionPersistence } from '@deepseek-ai/dsh-session-persistence'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {} from '@deepseek-ai/dsh-session-persistence'
import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import type { SettingsProvider } from '@deepseek-ai/dsh-settings'
import * as UsageBilling from '../src/index.ts'

let root = ''
let ctx: Context | undefined

// 最小替身：空会话 + 空 settings + 空凭据（不触网）。与 loader-composition 同套。
const persistenceDouble = {
  name: 'test-billing-persistence',
  apply(ctx: Context): void {
    ctx.provide('sessionPersistence', {
      list: async () => [],
      readFrom: async () => ({ meta: { id: 's-empty' as SessionId }, events: [] }),
    } as unknown as SessionPersistence)
  },
}
const credentialsDouble = {
  name: 'test-billing-credentials',
  apply(ctx: Context): void {
    ctx.provide('credentials', { resolve: async () => undefined } as unknown as CredentialProvider)
  },
}
const settingsDouble = {
  name: 'test-billing-settings',
  apply(ctx: Context): void {
    const registered = new Map<string, { get(): unknown; update(patch: Partial<unknown>): Promise<void> }>()
    ctx.provide('settings', {
      register: (ns: string, _schema: unknown, options?: { base?: unknown }) => {
        const state = { ...(options?.base ?? {}) }
        const scope = { get: () => state, update: async (patch: Record<string, unknown>) => Object.assign(state, patch) }
        registered.set(ns, scope)
        return scope
      },
      describe: () => [...registered].map(([ns, scope]) => ({ ns, value: scope.get() })),
      update: async (ns: string, patch: Record<string, unknown>) => {
        const scope = registered.get(ns)
        if (scope !== undefined) await scope.update(patch)
      },
    } as unknown as SettingsProvider)
  },
}

beforeEach(async () => {
  // 每个用例起独立 host（互不干扰），跑完即关。host 是轻量 cordis + http server。
  await startHost()
})

afterEach(async () => {
  await stopHost()
})

// 启动一个测试 host：cordis + HttpServer + 本插件。
async function startHost(): Promise<void> {
  root = await mkdtemp(join(tmpdir(), 'dsh-guard-spec-'))
  const configPath = join(root, 'cordis.yml')
  await writeFile(configPath, [
    "- name: '@deepseek-ai/dsh-host-webserver'",
    '  config:',
    "    host: '127.0.0.1'",
    '    port: 0',
    "- name: 'virtual:test-billing-persistence'",
    "- name: 'virtual:test-billing-credentials'",
    "- name: 'virtual:test-billing-settings'",
    "- name: '@kenz1117/dsh-ui-usage-billing'",
    '  config:',
    '    monthlyBudget: 100',
    `    snapshotPath: '${join(root, 'usage-stats.json')}'`,
    `    ledgerPath: '${join(root, 'usage-ledger.json')}'`,
    `    reconcilePath: '${join(root, 'usage-reconcile.json')}'`,
    `    peakSchedulePath: '${join(root, 'peak-schedule.json')}'`,
    '',
  ].join('\n'))

  ctx = new Context()
  ctx.baseUrl = pathToFileURL(root).href + '/'
  await ctx.plugin(Loader)
  ctx.loader.builtins.include = Include
  const modules = new Map<string, unknown>([
    ['@deepseek-ai/dsh-host-webserver', HttpServer],
    ['virtual:test-billing-persistence', persistenceDouble],
    ['virtual:test-billing-credentials', credentialsDouble],
    ['virtual:test-billing-settings', settingsDouble],
    ['@kenz1117/dsh-ui-usage-billing', UsageBilling],
  ])
  ctx.loader.internal = {
    version: 'v2',
    async import(specifier: string) {
      if (!modules.has(specifier)) throw new Error(`unexpected Loader import: ${specifier}`)
      return modules.get(specifier)
    },
  } as unknown as NonNullable<typeof ctx.loader.internal>
  await ctx.loader.create({ name: 'cordis:include', config: { path: pathToFileURL(configPath).href } })
  await ctx.loader.await()
}

// 关 host：dispose fiber + 清临时目录。
async function stopHost(): Promise<void> {
  if (ctx !== undefined) {
    await ctx.fiber?.dispose()
    ctx = undefined
  }
  await rm(root, { recursive: true, force: true })
}

const PORT = (): number => (ctx as Context & { webServer: { port: number } }).webServer.port

describe('路由边界防护', () => {
  it('persists an accepted clear while reporting a rejected key over loopback HTTP', async () => {
    const key = JSON.stringify(['direct:relay', 'flash'])
    await writeFile(join(root, 'peak-schedule.json'), JSON.stringify({ version: 3, revisions: [
      { effectiveFromMs: 1, changes: { [key]: { windows: [] } } },
    ] }))
    const origin = `http://127.0.0.1:${PORT()}`, url = `${origin}/api/billing/peak-schedule`
    const saved = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ version: 3, changes: { [key]: null, malformed: {} } }) })
    expect(saved.status).toBe(200)
    const body = await saved.json()
    expect(body.results).toEqual({ [key]: 'accepted', malformed: 'invalidRule' })
    expect(body.effectiveFromMs).toBeGreaterThan(1)
    const loaded = await (await fetch(url)).json()
    expect(loaded.effectiveFromMs).toBe(body.effectiveFromMs)
    expect(loaded.config.models).toEqual({})
  })

  it('403：PUT /api/billing/usage-stats 被回环守卫拒绝（非 GET/POST）', async () => {
    const res = await fetch(`http://127.0.0.1:${String(PORT())}/api/billing/usage-stats`, { method: 'PUT' })
    // guardLoopback 对非 GET/POST 一律 403（405 是路由内部的 methodOk 校验，
    // 但守卫在路由之前，所以 403 先到）。这是预期行为：回环守卫是第一道墙。
    expect(res.status).toBe(403)
  })

  it('403：PUT /api/billing/notify-claim 被回环守卫拒绝（非 GET/POST）', async () => {
    const res = await fetch(`http://127.0.0.1:${String(PORT())}/api/billing/notify-claim`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1' },
      body: JSON.stringify({ key: 'k' }),
    })
    expect(res.status).toBe(403)
  })

  it('CSRF：POST /api/billing/usage-tool 带非回环 Origin 被拒绝', async () => {
    const res = await fetch(`http://127.0.0.1:${String(PORT())}/api/billing/usage-tool`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://evil.example.com' },
      body: JSON.stringify({ enabled: true }),
    })
    expect(res.status).toBe(403)
  })

  it('CSRF：POST /api/billing/pricing/refresh 带非 JSON Content-Type 被拒绝', async () => {
    const res = await fetch(`http://127.0.0.1:${String(PORT())}/api/billing/pricing/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain', origin: 'http://127.0.0.1' },
      body: '{}',
    })
    expect(res.status).toBe(415)
  })

  it('body 过大：POST /api/billing/notify-claim 超 2048 字节被拒绝', async () => {
    const oversized = 'x'.repeat(3000)
    const res = await fetch(`http://127.0.0.1:${String(PORT())}/api/billing/notify-claim`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1' },
      body: JSON.stringify({ key: oversized }),
    })
    // body 过大被拒（413 或 400）——实现按 2048 上限拦截
    expect([400, 413]).toContain(res.status)
  })
})
