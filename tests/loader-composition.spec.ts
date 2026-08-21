/**
 * REAL-composition coverage: a test-only cordis.yml booted through the
 * vendored Loader mounts the webserver plus the usage-billing host half, and
 * every assertion observes the served HTTP surface — aggregated usage-stats
 * (with the monthlyBudget config injected at the response boundary), the
 * offline-degraded pricing document, the balance row's unconfigured state,
 * and route release on fiber disposal (HMR safety).
 *
 * 替身只用于能力 seam 的 Provider 角色（sessionPersistence / credentials 的
 * 内存实现）与不可控外部输入（外网 fetch 一律拒绝，定价降级 builtin、余额
 * 走 unconfigured 路径）；webserver 与被测插件均为真实组装。
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import HttpServer from '@deepseek-ai/dsh-host-webserver'
import type { SessionPersistence } from '@deepseek-ai/dsh-session-persistence'
import type { SessionEvent, SessionId } from '@deepseek-ai/dsh-session/types'
import type {} from '@deepseek-ai/dsh-session-persistence'
import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import type { SettingsProvider } from '@deepseek-ai/dsh-settings'
import * as UsageBilling from '../src/index.ts'

let root: string | undefined
let context: Context | undefined

beforeEach(() => {
  // 外网一律拒绝（定价拉取降级 builtin）；本地回环放行给断言用 fetch。
  const realFetch = globalThis.fetch
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input)
    if (url.startsWith('http://127.0.0.1')) return realFetch(input, init)
    throw new Error(`offline in test: ${url}`)
  }))
})

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
  vi.unstubAllGlobals()
})

/** 两个 LLM 调用：deepseek 按量计费 + kimi-coding 订阅通道（费用豁免）。 */
const EVENTS = [
  { type: 'request/header', time: Date.now(), data: { header: { config: { model: 'deepseek-v4-flash', provider: 'deepseek' } } } },
  { type: 'assistant/message', time: Date.now(), data: { usage: { inputTokens: 1000, outputTokens: 500, cacheReadTokens: 2000 } } },
  { type: 'request/header', time: Date.now(), data: { header: { config: { model: 'k3', provider: 'kimi-coding' } } } },
  { type: 'assistant/message', time: Date.now(), data: { usage: { inputTokens: 500, outputTokens: 100 } } },
] as unknown as SessionEvent[]

/** sessionPersistence 能力替身：内存中的单会话日志（Provider 角色）。 */
const persistenceDouble = {
  name: 'test-billing-persistence',
  apply(ctx: Context): void {
    ctx.provide('sessionPersistence', {
      list: async () => [{ id: 's1' as SessionId }],
      readFrom: async () => ({ meta: { id: 's1' as SessionId }, events: EVENTS }),
    } as unknown as SessionPersistence)
  },
}

/** credentials 能力替身：任何引用都解析不到（余额走 unconfigured，不触网）。 */
const credentialsDouble = {
  name: 'test-billing-credentials',
  apply(ctx: Context): void {
    ctx.provide('credentials', {
      resolve: async () => undefined,
    } as unknown as CredentialProvider)
  },
}

/** settings 能力替身：无任何命名空间（订阅 key 解析得到空值 → 不触网）。 */
const settingsDouble = {
  name: 'test-billing-settings',
  apply(ctx: Context): void {
    ctx.provide('settings', {
      describe: () => [],
    } as unknown as SettingsProvider)
  },
}

/** Write the four-row cordis.yml, then boot it through the real Loader. */
async function loadComposition(): Promise<Context> {
  root = await mkdtemp(join(tmpdir(), 'dsh-usage-billing-'))
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
    '',
  ].join('\n'))

  context = new Context()
  context.baseUrl = pathToFileURL(root).href + '/'
  await context.plugin(Loader)
  context.loader.builtins.include = Include
  const modules = new Map<string, unknown>([
    ['@deepseek-ai/dsh-host-webserver', HttpServer],
    ['virtual:test-billing-persistence', persistenceDouble],
    ['virtual:test-billing-credentials', credentialsDouble],
    ['virtual:test-billing-settings', settingsDouble],
    ['@kenz1117/dsh-ui-usage-billing', UsageBilling],
  ])
  context.loader.internal = {
    version: 'v2',
    async import(specifier: string) {
      if (!modules.has(specifier)) throw new Error(`unexpected Loader import: ${specifier}`)
      return modules.get(specifier)
    },
  } as unknown as NonNullable<typeof context.loader.internal>
  await context.loader.create({
    name: 'cordis:include',
    config: { path: pathToFileURL(configPath).href },
  })
  await context.loader.await()
  return context
}

/** GET one billing API path; returns status and the parsed JSON body (undefined for non-JSON answers). */
async function getJson(port: number, path: string): Promise<{ status: number; json: unknown }> {
  const response = await fetch(`http://127.0.0.1:${String(port)}${path}`)
  try {
    return { status: response.status, json: JSON.parse(await response.text()) as unknown }
  } catch {
    // 404 等非 JSON 响应：调用方只断言状态码。
    return { status: response.status, json: undefined }
  }
}

describe('usage-billing real Loader composition', () => {
  it('serves aggregated usage, injected budget, degraded pricing, and releases routes on disposal', { timeout: 60_000 }, async () => {
    const loaded = await loadComposition()
    const unloaded = [...loaded.loader.entries()]
      .filter(entry => entry.fiber === undefined && !entry.disabled)
      .map(entry => entry.options.name)
    expect(unloaded).toEqual([])
    const port = loaded.webServer.port

    // usage-stats：真实聚合两个调用；deepseek 按量计费，kimi-coding 订阅豁免；
    // monthlyBudget 配置在响应边界注入为 budget 字段。
    const stats = await getJson(port, '/api/billing/usage-stats')
    expect(stats.status).toBe(200)
    const doc = stats.json as {
      budget: number
      total: { calls: number; cost: number }
      byModel: Record<string, { calls: number; cost: number; plan?: boolean }>
      bySession: { id: string; calls: number; cost: number }[]
    }
    expect(doc.budget).toBe(100)
    expect(doc.total.calls).toBe(2)
    expect(doc.total.cost).toBeGreaterThan(0)
    expect(doc.byModel['flash']).toMatchObject({ calls: 1 })
    expect(doc.byModel['kimi-k3']).toMatchObject({ calls: 1, cost: 0, plan: true })
    // 会话明细：唯一有调用的会话 s1 入列。
    expect(doc.bySession).toHaveLength(1)
    expect(doc.bySession[0]).toMatchObject({ id: 's1', calls: 2 })

    // pricing：外网被拒绝，降级为内置定价文档。
    const pricing = await getJson(port, '/api/billing/pricing')
    expect(pricing.status).toBe(200)
    expect((pricing.json as { source: string }).source).toBe('builtin')

    // balance：凭据替身解析不到 key；DeepSeek（balanceApiKeyEnv 特例）与 Moonshot
    //（llm-pi-ai 未配置）都行走 unconfigured，不触网。
    const balance = await getJson(port, '/api/billing/balance')
    expect(balance.status).toBe(200)
    const balances = (balance.json as { balances: { provider: string; error?: string }[] }).balances
    expect(balances).toHaveLength(2)
    expect(balances.find(row => row.provider === 'deepseek')).toMatchObject({ error: 'unconfigured' })
    expect(balances.find(row => row.provider === '月之暗面')).toMatchObject({ error: 'unconfigured' })

    // HMR 安全：卸载 billing 行后三条路由释放（webserver 仍在，答 404）。
    const billingEntry = [...loaded.loader.entries()]
      .find(entry => entry.options.name === '@kenz1117/dsh-ui-usage-billing')
    expect(billingEntry).toBeDefined()
    await billingEntry!.fiber?.dispose()
    expect((await getJson(port, '/api/billing/usage-stats')).status).toBe(404)
    expect((await getJson(port, '/api/billing/pricing')).status).toBe(404)
    expect((await getJson(port, '/api/billing/balance')).status).toBe(404)
  })
})
