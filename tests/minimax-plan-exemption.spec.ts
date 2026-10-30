/**
 * MiniMax 订阅豁免按 key 前缀的端到端胶水（apply → 启动分类 → 聚合 → HTTP 面）。
 *
 * 同一官方路由 id（minimax-cn）按量用户与 Coding Plan 用户两用，豁免不能按路由
 * id 一刀切：此前聚合层默认集合干脆不含 minimax，套餐用户（`sk-cp-` key）的用量
 * 被无条件按量计费。本文件用最小替身直连 apply，验证 index.ts 的接线——读 llm-pi-ai
 * providers → 按路由解析 key → 原地改写聚合器持有的判定集合 → 用量统计里 MiniMax
 * 行变为订阅豁免（plan + cost 0）；普通 `sk-` key 则维持按量。
 */

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { Context } from '@deepseek-ai/cordis'
import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import type { SettingsProvider } from '@deepseek-ai/dsh-settings'
import type { SessionPersistence } from '@deepseek-ai/dsh-session-persistence'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as UsageBilling from '../src/index.ts'

let root: string | undefined

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    throw new Error(`offline in test: ${String(input)}`)
  }))
})

afterEach(async () => {
  vi.unstubAllGlobals()
  // dispose 后插件的快照/账本原子写可能仍在收尾，与删目录竞态会 ENOTEMPTY——按 Node 内置重试清理。
  if (root !== undefined) await rm(root, { recursive: true, force: true, maxRetries: 8, retryDelay: 50 })
  root = undefined
})

type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void> | void

/** 一个 minimax-cn 路由上的 MiniMax-M3 调用（header + 带 usage 的 assistant 消息）。 */
function minimaxSession() {
  return [
    {
      type: 'request/header', seq: 1, time: 1_000,
      data: { header: { config: { provider: 'minimax-cn', model: 'MiniMax-M3', reasoningEffort: 'high', maxTokens: 256_000 }, version: 1, id: 's', createdAt: 0, cwd: '/tmp', agentPreset: 'standard' }, reason: 'initial' },
    },
    {
      type: 'assistant/message', seq: 2, time: 1_000,
      data: { turn: 1, step: 1, message: { role: 'assistant', content: [] }, usage: { inputTokens: 100, outputTokens: 50, cacheReadTokens: 800, cacheWriteTokens: 20 } },
    },
  ]
}

/** 最小替身：webServer 收集路由；持久化给一个 MiniMax 会话；凭据按表解析；设置给 llm-pi-ai providers。 */
function doubles(credentialTable: Record<string, string>, routes: Map<string, Handler>) {
  return [
    {
      name: 'test-mm-webserver',
      apply(child: Context): void {
        child.provide('webServer', {
          register: (opts: { path: string; handler: Handler }) => {
            routes.set(opts.path, opts.handler)
            return () => {}
          },
        })
      },
    },
    {
      name: 'test-mm-persistence',
      apply(child: Context): void {
        child.provide('sessionPersistence', {
          list: async () => [{ id: 's-mm' }],
          readFrom: async () => ({ meta: { id: 's-mm' }, inheritedEventCount: 0, events: minimaxSession() }),
        } as unknown as SessionPersistence)
      },
    },
    {
      name: 'test-mm-credentials',
      apply(child: Context): void {
        child.provide('credentials', {
          resolve: async (ref: unknown) => {
            const value = credentialTable[String(ref)]
            return value === undefined ? undefined : { value }
          },
        } as unknown as CredentialProvider)
      },
    },
    {
      name: 'test-mm-settings',
      apply(child: Context): void {
        child.provide('settings', {
          // 新版宿主形态：minimax-cn 只有 models，key 在凭据 refs（约定名 MINIMAX_CN_API_KEY）。
          describe: () => [{ ns: 'llm-pi-ai', value: { providers: { 'minimax-cn': { models: [{ id: 'MiniMax-M3' }] } } } }],
          update: async () => {},
        } as unknown as SettingsProvider)
      },
    },
  ]
}

function fakeReq(): IncomingMessage {
  return {
    method: 'GET',
    headers: {},
    url: '/api/billing/usage-stats',
    socket: { remoteAddress: '127.0.0.1', localAddress: '127.0.0.1', remotePort: 51000, localPort: 3080 },
    [Symbol.asyncIterator]: async function* () {},
  } as unknown as IncomingMessage
}

function fakeRes() {
  let body = ''
  let status: number | undefined
  const res = {
    writeHead(code: number) { status = code; return res },
    end(chunk?: string) { if (chunk !== undefined) body += chunk },
    setHeader() {},
  } as unknown as ServerResponse
  return { res, body: () => body, status: () => status }
}

async function usageStatsWith(credentialTable: Record<string, string>) {
  root = await mkdtemp(join(tmpdir(), 'dsh-mm-plan-'))
  const routes = new Map<string, Handler>()
  const ctx = new Context()
  for (const double of doubles(credentialTable, routes)) await ctx.plugin(double)
  await ctx.plugin({ ...UsageBilling, Config: undefined } as never, {
    snapshotPath: join(root, 'usage-stats.json'),
    ledgerPath: join(root, 'usage-ledger.json'),
    reconcilePath: join(root, 'usage-reconcile.json'),
    // 本用例要打完整折叠路径（断言 byModel 计费口径）：关掉默认 20s 冷phase
    // （issue #105），否则路由回账本轻文档、byModel 为空。
    replayDelayMs: 0,
  })
  // 启动分类是 fire-and-forget 的微任务链（凭据内存解析）：让出一个宏任务即落定。
  await new Promise(resolve => setImmediate(resolve))
  const handler = routes.get('/api/billing/usage-stats')
  if (handler === undefined) throw new Error('usage-stats route not registered')
  const { res, body, status } = fakeRes()
  await handler(fakeReq(), res)
  await ctx.fiber.dispose()
  return { status: status(), doc: JSON.parse(body()) as { byModel: Record<string, { calls: number; cost: number; plan?: boolean }> } }
}

describe('MiniMax Coding Plan exemption wired through apply (key prefix, not route id)', () => {
  it('exempts minimax-cn usage when the resolved key is an sk-cp- Coding Plan key', async () => {
    const { status, doc } = await usageStatsWith({ MINIMAX_CN_API_KEY: ['sk', 'cp', 'test'].join('-') })
    expect(status).toBe(200)
    expect(doc.byModel['minimax']?.calls).toBe(1)
    expect(doc.byModel['minimax']?.plan).toBe(true)
    expect(doc.byModel['minimax']?.cost).toBe(0)
  }, 30_000)

  it('keeps minimax-cn pay-as-you-go when the resolved key is a plain sk- API key', async () => {
    const { doc } = await usageStatsWith({ MINIMAX_CN_API_KEY: ['sk', 'plain', 'test'].join('-') })
    expect(doc.byModel['minimax']?.calls).toBe(1)
    expect(doc.byModel['minimax']?.plan).toBeUndefined()
    expect(doc.byModel['minimax']?.cost).toBeGreaterThan(0)
  }, 30_000)
})
