// @vitest-environment jsdom
/**
 * `/usage` 对话内命令的注册契约。
 *
 * 宿主能力 `ctx.commandUi`（@deepseek-ai/dsh-client-ui-commands）只在部分宿主
 * 存在，而且它是宿主 Service——要等 inputTriggers / remote.commands 就绪才构造，
 * 晚于本插件 apply。所以必须用 `ctx.inject` 等它就位，apply 期 `ctx.get` 采样
 * 必然拿到 undefined（这正是 `/usage` 曾经完全不出现的根因）。
 *
 * 服务缺席时降级为不注册：不报错、不注册、面板功能完全不受影响，也不得因此
 * 收窄兼容矩阵（AGENTS.md 的红线）。本组用例锁住这两条分支。
 */

import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { registerUsageCommand, USAGE_COMMAND_NAME } from '../src/client/usage-command.ts'

interface Recorded {
  name: string
  label?: () => string
  description?: () => string
  available?: (session: unknown) => boolean
  ui: { kind: string; run: (session: unknown) => void }
}

function stubContext(withCommandUi: boolean): { ctx: Context; registered: Recorded[] } {
  const registered: Recorded[] = []
  const ctx = {
    // apply 期的免 inject 采样：宿主服务尚未构造，永远是 undefined。
    get: () => undefined,
    inject: (deps: readonly string[], callback: (scoped: unknown) => unknown) => {
      if (!deps.includes('commandUi') || !withCommandUi) return () => {}
      const scoped = {
        commandUi: {
          register: (contribution: Recorded) => {
            registered.push(contribution)
            return () => { registered.splice(registered.indexOf(contribution), 1) }
          },
        },
        // cordis 的 effect 会立即执行回调并返回卸载函数。
        effect: (callback2: () => unknown) => {
          const dispose = callback2()
          return typeof dispose === 'function' ? dispose : () => {}
        },
      }
      callback(scoped)
      return () => {}
    },
  }
  return { ctx: ctx as unknown as Context, registered }
}

describe('/usage command', () => {
  it('registers an action command once the command service is ready', () => {
    const { ctx, registered } = stubContext(true)
    let opened = 0

    const available = registerUsageCommand(ctx, {
      openDashboard: () => { opened++ },
      label: () => '打开计费仪表盘',
      description: () => '查看今日/本月费用',
    })

    expect(available()).toBe(true)
    expect(registered).toHaveLength(1)
    const contribution = registered[0]
    expect(contribution.name).toBe(USAGE_COMMAND_NAME)
    expect(contribution.ui.kind).toBe('action')
    // 文案是函数：菜单每次打开重新读取，语言切换即时生效。
    expect(contribution.label?.()).toBe('打开计费仪表盘')
    expect(contribution.description?.()).toBe('查看今日/本月费用')
    expect(contribution.available?.({})).toBe(true)

    contribution.ui.run({})
    expect(opened).toBe(1)
  })

  it('degrades silently when the host has no commandUi service', () => {
    const { ctx, registered } = stubContext(false)

    const available = registerUsageCommand(ctx, {
      openDashboard: () => {},
      label: () => 'x',
      description: () => 'y',
    })
    expect(available()).toBe(false)
    expect(registered).toHaveLength(0)
  })
})
