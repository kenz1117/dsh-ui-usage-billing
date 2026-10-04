/**
 * usage_stats 工具开关的即时生效路径（issue #80）。
 *
 * 真实宿主 0.1.7+ 把开关存为本条目 config 的 volatile 字段：Config schema 校验后
 * apply 收到稳定引用（cosmokit Volatile 形态），设置提交后引用原位更新并沿本 fiber
 * 发射 `loader/volatile-update`——本文件验证 apply 据此即时注册/注销工具，全程不重载。
 *
 * 这里用「宿主校验完成后交来的 config 形态」直连 apply（可变假引用 + Config 置空
 * 绕过 schema 校验），其余四个注入服务给最小替身让 apply 跑起来；完整 Loader 组合
 * （Config 校验、fiber.entry 寻址、HTTP 面）在 loader-composition.spec.ts 覆盖。
 */

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
// 类型侧引入 loader 的事件声明合并（`loader/volatile-update` 事件映射）。
import type {} from '@deepseek-ai/cordis-plugin-loader'
import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import type { SettingsProvider } from '@deepseek-ai/dsh-settings'
import type { SessionPersistence } from '@deepseek-ai/dsh-session-persistence'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as UsageBilling from '../src/index.ts'

let root: string | undefined

beforeEach(() => {
  // 外网一律拒绝：定价拉取立即降级 builtin，测试不触网。
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    throw new Error(`offline in test: ${String(input)}`)
  }))
})

afterEach(async () => {
  vi.unstubAllGlobals()
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})

/** 让 apply 的 inject 列表全部就绪的最小替身（webServer/持久化/凭据/设置）。 */
function serviceDoubles() {
  return [
    {
      name: 'test-toggle-webserver',
      apply(child: Context): void {
        child.provide('webServer', {
          register: () => () => {},
        })
      },
    },
    {
      name: 'test-toggle-persistence',
      apply(child: Context): void {
        child.provide('sessionPersistence', {
          list: async () => [],
          readFrom: async () => ({ meta: { id: 's0' }, events: [] }),
        } as unknown as SessionPersistence)
      },
    },
    {
      name: 'test-toggle-credentials',
      apply(child: Context): void {
        child.provide('credentials', { resolve: async () => undefined } as unknown as CredentialProvider)
      },
    },
    {
      name: 'test-toggle-settings',
      apply(child: Context): void {
        // 新世代形态：无 register，只剩表单面（本文件不断言 HTTP 面）。
        child.provide('settings', {
          describe: () => [],
          update: async () => {},
        } as unknown as SettingsProvider)
      },
    },
  ]
}

describe('usage_stats tool live toggle (issue #80)', () => {
  it('registers and unregisters the tool on volatile updates without remounting', async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-usage-toggle-'))
    const registered: string[] = []
    let disposals = 0
    const toolsDouble = {
      name: 'test-toggle-tools',
      apply(child: Context): void {
        // ctx.tools 即这里提供的对象（服务本体带 register，与真实 dsh-tools 同形）。
        child.provide('tools', {
          register: (tool: { name?: string }) => {
            registered.push(tool.name ?? '')
            return () => { disposals += 1 }
          },
        } as never)
      },
    }
    // 可变假引用：模拟「宿主提交 volatile 写入后原位更新」的引用（真实引用由
    // schemastery 冻结、经内部协议写入，测试里用等价形态驱动同一读取路径）。
    let toggleValue = false
    const toggleRef = { get: (): boolean => toggleValue }

    const ctx = new Context()
    for (const double of [...serviceDoubles(), toolsDouble]) await ctx.plugin(double)
    // Config 置空绕过 schema 校验：apply 收到的正是宿主校验完成后的 config 形态。
    await ctx.plugin({ ...UsageBilling, Config: undefined } as never, {
      enableUsageStatsTool: toggleRef,
      snapshotPath: join(root, 'usage-stats.json'),
      ledgerPath: join(root, 'usage-ledger.json'),
      reconcilePath: join(root, 'usage-reconcile.json'),
    })

    // 初始关闭：不注册。
    expect(registered).toEqual([])

    // 开 → 即时注册；重复事件幂等，不重复注册。
    toggleValue = true
    ctx.emit('loader/volatile-update', [])
    expect(registered).toEqual(['usage_stats'])
    ctx.emit('loader/volatile-update', [])
    expect(registered).toEqual(['usage_stats'])

    // 关 → 即时注销（disposer 恰好执行一次）。
    toggleValue = false
    ctx.emit('loader/volatile-update', [])
    expect(disposals).toBe(1)
    ctx.emit('loader/volatile-update', [])
    expect(disposals).toBe(1)

    // 重开：同一同步器可再次注册（开关来回切换）。
    toggleValue = true
    ctx.emit('loader/volatile-update', [])
    expect(registered).toEqual(['usage_stats', 'usage_stats'])

    await ctx.fiber.dispose()
  })

  it('ignores malformed volatile values and falls back to the default', async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-usage-toggle-'))
    const registered: string[] = []
    const toolsDouble = {
      name: 'test-toggle-tools',
      apply(child: Context): void {
        child.provide('tools', {
          register: (tool: { name?: string }) => {
            registered.push(tool.name ?? '')
            return () => {}
          },
        } as never)
      },
    }
    const ctx = new Context()
    for (const double of [...serviceDoubles(), toolsDouble]) await ctx.plugin(double)
    // 假引用 get 返回非布尔：读取端回默认值 false，不注册也不抛。
    await ctx.plugin({ ...UsageBilling, Config: undefined } as never, {
      enableUsageStatsTool: { get: () => undefined as unknown as boolean },
      snapshotPath: join(root, 'usage-stats.json'),
      ledgerPath: join(root, 'usage-ledger.json'),
      reconcilePath: join(root, 'usage-reconcile.json'),
    })
    ctx.emit('loader/volatile-update', [])
    expect(registered).toEqual([])
    await ctx.fiber.dispose()
  })
})
