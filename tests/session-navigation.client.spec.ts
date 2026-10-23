// @vitest-environment jsdom
/**
 * 会话跳转器（跨插件导航）的双代通道契约。
 *
 * 宿主有两代会话选择通道（实测自 deepseek-harness 源码）：
 * - 新代（0.1.6-alpha.2+）：`ctx.uiWorkspace.openSession(SessionId)`
 * - 老代（0.1.2-alpha.1 ~ 0.1.6-alpha.1）：`ctx.sessions.open(SessionId)`
 *
 * 本组用例锁三件事：新代优先、老代回落、两条都没有时如实报 'unavailable'
 * （UI 据此提示「宿主不支持」，而不是假装跳过了）；以及通道抛错时如实报
 * 'failed' 且不冒泡（会话行来自持久化日志，可能不在宿主列表里）。
 */

import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { createSessionNavigator } from '../src/client/session-navigation.ts'

interface StubOptions {
  workspace?: { openSession: (id: unknown) => void }
  legacyOpen?: (id: unknown) => void
}

function stubContext(options: StubOptions): Context {
  const ctx = {
    get: (name: string): unknown => (name === 'uiWorkspace' ? options.workspace : undefined),
    sessions: options.legacyOpen === undefined ? {} : { open: options.legacyOpen },
  }
  return ctx as unknown as Context
}

describe('session navigator', () => {
  it('prefers the new-generation uiWorkspace channel', () => {
    const calls: unknown[] = []
    const navigator = createSessionNavigator(stubContext({
      workspace: { openSession: (id) => { calls.push(id) } },
      legacyOpen: () => { calls.push('legacy') },
    }))

    expect(navigator.available()).toBe(true)
    expect(navigator.open('session-1')).toBe('opened')
    expect(calls).toEqual(['session-1'])
  })

  it('falls back to the legacy sessions.open channel', () => {
    const calls: unknown[] = []
    const navigator = createSessionNavigator(stubContext({
      legacyOpen: (id) => { calls.push(id) },
    }))

    expect(navigator.available()).toBe(true)
    expect(navigator.open('session-2')).toBe('opened')
    expect(calls).toEqual(['session-2'])
  })

  it('reports unavailable when the host has neither channel', () => {
    const navigator = createSessionNavigator(stubContext({}))

    expect(navigator.available()).toBe(false)
    expect(navigator.open('session-3')).toBe('unavailable')
  })

  it('reports failed (and does not throw) when the host channel rejects', () => {
    const navigator = createSessionNavigator(stubContext({
      workspace: { openSession: () => { throw new Error('session not in list') } },
    }))

    expect(navigator.open('session-4')).toBe('failed')
  })

  it('reports failed when the legacy channel rejects', () => {
    const navigator = createSessionNavigator(stubContext({
      legacyOpen: () => { throw new Error('unknown id') },
    }))

    expect(navigator.open('session-5')).toBe('failed')
  })
})
