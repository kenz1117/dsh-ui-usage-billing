// @vitest-environment jsdom
/**
 * `/usage` 对话内命令的注册契约。
 *
 * 宿主能力 `ctx.commandUi`（@deepseek-ai/dsh-client-ui-commands）只在部分宿主
 * 存在；**服务缺席即降级**——不注册命令、面板功能完全不受影响，且不得因此收窄
 * 兼容矩阵（AGENTS.md 的红线）。本组用例锁住这两条分支。
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
    get: (name: string): unknown => {
      if (name !== 'commandUi' || !withCommandUi) return undefined
      return {
        register: (contribution: Recorded): (() => void) => {
          registered.push(contribution)
          return () => {}
        },
      }
    },
  }
  return { ctx: ctx as unknown as Context, registered }
}

describe('/usage command', () => {
  it('registers an action command that opens the dashboard', () => {
    const { ctx, registered } = stubContext(true)
    let opened = 0

    expect(registerUsageCommand(ctx, {
      openDashboard: () => { opened++ },
      label: () => '打开计费仪表盘',
      description: () => '查看今日/本月费用',
    })).toBe(true)

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

    expect(registerUsageCommand(ctx, {
      openDashboard: () => {},
      label: () => 'x',
      description: () => 'y',
    })).toBe(false)
    expect(registered).toHaveLength(0)
  })
})
