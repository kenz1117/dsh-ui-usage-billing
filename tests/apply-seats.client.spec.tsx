// @vitest-environment jsdom
/**
 * Client `apply()` slot-seat contract: the live cost capsule is injected into
 * three host seats and the seat discriminator rides each registration's
 * inject payload (issue #101). The host's own ConversationRoot renders
 * `conversation.input.dock` above the composer card and
 * `conversation.composer.dock` inside a dedicated container below it, so the
 * 「上方」 position must be a distinct registration — a CSS `order` on a
 * composer.dock entry cannot leave that container.
 *
 * The context is a recording double: `slots.inject` runs its callback at once
 * (the "slot already declared" branch of the renderer registry) and
 * `slots.register` captures the runtime options + component. Effects are not
 * run (locale dictionaries / completion notifier are out of scope here).
 */

import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { apply } from '../src/client/apply.ts'
import { LiveCostBar, LiveCostChip } from '../src/client/live-cost.tsx'
import { QuickQueueEnqueue, QuickQueueToggle } from '../src/client/task-queue-quick.tsx'
import { NS } from '../src/client/locales.ts'

interface Registration {
  name: string
  id: string
  order?: number
  locale?: string
  inject?: (sessionId: string) => Record<string, unknown>
  component: unknown
}

function recordingContext(): { ctx: Context; injected: string[]; registered: Registration[] } {
  const injected: string[] = []
  const registered: Registration[] = []
  const ctx = {
    provide: () => {},
    effect: () => () => {},
    // cordis 的免 inject 服务读取：真实宿主必有，本桩返回 undefined 表示
    // 「宿主没有该服务」（会话跳转 / /usage 命令据此降级）。
    get: () => undefined,
    locale: { register: () => () => {} },
    remote: {},
    sessions: {},
    slots: {
      inject: (key: string, callback: () => unknown) => {
        injected.push(key)
        callback()
        return () => {}
      },
      register: (options: Omit<Registration, 'component'>, component: unknown) => {
        registered.push({ ...options, component })
        return () => {}
      },
    },
  }
  return { ctx: ctx as unknown as Context, injected, registered }
}

describe('client apply(): live cost capsule seats (issue #101)', () => {
  const { ctx, injected, registered } = recordingContext()
  apply(ctx)
  const byName = (name: string): Registration => {
    const entry = registered.find(r => r.name === name)
    if (entry === undefined) throw new Error(`no registration on ${name}`)
    return entry
  }

  it('injects into the three host seats rather than declaring them', () => {
    expect(injected).toEqual(expect.arrayContaining([
      'conversation.composer.dock',
      'conversation.input.dock',
      'conversation.input.right',
    ]))
  })

  it('mounts the bar on composer.dock (below) and input.dock (above) with the seat in the inject payload', () => {
    const below = byName('conversation.composer.dock')
    expect(below.component).toBe(LiveCostBar)
    expect(below.id).toBe('usage-billing-cost')
    expect(below.inject?.('s-1')).toEqual({ sessionId: 's-1', seat: 'below' })

    const above = byName('conversation.input.dock')
    expect(above.component).toBe(LiveCostBar)
    expect(above.id).toBe('usage-billing-cost-above')
    expect(above.inject?.('s-1')).toEqual({ sessionId: 's-1', seat: 'above' })
    // 宿主自己在 input.dock 的占位：todo 面板 order 0、消息队列 order 20。
    // 胶囊排在它们之后才紧贴输入框卡片（与「下方」紧贴卡片底部对称）。
    expect(above.order).toBeGreaterThan(20)
  })

  it('keeps the tool-row chip on input.right without a seat discriminator', () => {
    const chip = byName('conversation.input.right')
    expect(chip.component).toBe(LiveCostChip)
    expect(chip.inject?.('s-1')).toEqual({ sessionId: 's-1' })
  })

  it('registers the opt-in queue toggle on the left and enqueue action on the right', () => {
    const toggle = registered.find(entry => entry.id === 'usage-billing-quick-queue-toggle')
    const enqueue = registered.find(entry => entry.id === 'usage-billing-quick-queue-enqueue')
    expect(toggle?.name).toBe('conversation.input.left')
    expect(toggle?.component).toBe(QuickQueueToggle)
    expect(toggle?.locale).toBe(NS)
    expect(enqueue?.name).toBe('conversation.input.right')
    expect(enqueue?.component).toBe(QuickQueueEnqueue)
    expect(enqueue?.locale).toBe(NS)
    const injected = enqueue?.inject?.('s-1')
    expect(injected?.sessionId).toBe('s-1')
    const projectionFaceOf = injected?.projectionFaceOf as ((key: 'workingDirectory' | 'modelSelection') => unknown) | undefined
    expect(projectionFaceOf).toBeTypeOf('function')
    // A host without the public binding API degrades to an absent projection.
    expect(projectionFaceOf?.('workingDirectory')).toBeUndefined()
  })

  it('binds every capsule seat to the billing locale namespace', () => {
    for (const name of ['conversation.composer.dock', 'conversation.input.dock', 'conversation.input.right']) {
      expect(byName(name).locale).toBe(NS)
    }
  })
})
