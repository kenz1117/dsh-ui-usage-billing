// @vitest-environment jsdom
/**
 * Completion-notifier unit tests: a fake observable snapshot drives session
 * state migrations, and the notifier fires a desktop completion notification
 * only on `running → completed`, skipping the initial baseline and batching
 * simultaneous completions into one.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionListState, SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import {
  installCompletionNotifier, loadNotifyConfig, saveNotifyConfig, COMPLETION_NOTIFY_KEY,
  type CompletionNotifyConfig,
} from '../src/client/completion-notify.ts'

/** 手动可触发的会话列表快照替身。 */
function makeList(initial: SessionListState) {
  const listeners = new Set<() => void>()
  let state = initial
  return {
    getSnapshot: () => state,
    subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } },
    set: (next: SessionListState) => { state = next; for (const fn of [...listeners]) fn() },
  }
}

/** 测试字面量 id 打 SessionId 品牌（生产值由宿主会话控制器产生）。 */
const sid = (id: string): SessionId => id as SessionId

const running = (id: string, title: string): SessionSummary => ({
  id: sid(id), title, displayTitle: title, running: true, blank: false, updatedAt: 0,
})
const done = (id: string, title: string): SessionSummary => ({
  id: sid(id), title, displayTitle: title, running: false, completed: true, blank: false, updatedAt: 1,
})

const emptyList = (): SessionListState => ({ ids: [], byId: {}, current: undefined, phase: 'ready', subagentsByParent: {}, jobsBySession: {}, currentAddress: undefined })

describe('installCompletionNotifier', () => {
  beforeEach(() => {
    localStorage.clear()
    // 全局 Notification mock：静态 permission 为 granted。
    const Mock = Object.assign(
      vi.fn().mockImplementation(() => ({ close: () => {} })),
      { permission: 'granted' },
    )
    vi.stubGlobal('Notification', Mock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const config: CompletionNotifyConfig = { enabled: true, timeout: 0 }

  it('fires one notification on a running→completed migration, not on the initial baseline', () => {
    const list = makeList({ ...emptyList(), ids: [sid('s1')], byId: { [sid('s1')]: done('s1', '第一个会话') } })
    const dispose = installCompletionNotifier(list, () => config)
    const notifications = vi.mocked(globalThis.Notification)
    expect(notifications).not.toHaveBeenCalled()

    // 新会话进入「运行中」。
    list.set({
      ...list.getSnapshot(),
      ids: [sid('s1'), sid('s2')],
      byId: { [sid('s1')]: done('s1', '第一个会话'), [sid('s2')]: running('s2', '正在干活') },
    })
    expect(notifications).not.toHaveBeenCalled()

    // s2 运行→完成：应弹一次。
    list.set({
      ...list.getSnapshot(),
      byId: { [sid('s1')]: done('s1', '第一个会话'), [sid('s2')]: done('s2', '正在干活') },
    })
    expect(notifications).toHaveBeenCalledTimes(1)
    dispose()
  })

  it('bunches simultaneous completions into a single notification', () => {
    const list = makeList(emptyList())
    const dispose = installCompletionNotifier(list, () => config)
    list.set({
      ...emptyList(),
      ids: [sid('a'), sid('b')],
      byId: { [sid('a')]: running('a', 'A'), [sid('b')]: running('b', 'B') },
    })
    list.set({
      ...emptyList(),
      ids: [sid('a'), sid('b')],
      byId: { [sid('a')]: done('a', 'A'), [sid('b')]: done('b', 'B') },
    })
    expect(vi.mocked(globalThis.Notification)).toHaveBeenCalledTimes(1)
    dispose()
  })

  it('does nothing when the feature is disabled', () => {
    const list = makeList(emptyList())
    const dispose = installCompletionNotifier(list, () => ({ enabled: false, timeout: 0 }))
    list.set({ ...emptyList(), ids: [sid('s1')], byId: { [sid('s1')]: running('s1', 'X') } })
    list.set({ ...emptyList(), ids: [sid('s1')], byId: { [sid('s1')]: done('s1', 'X') } })
    expect(vi.mocked(globalThis.Notification)).not.toHaveBeenCalled()
    dispose()
  })
})

describe('notify config persistence', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('round-trips enabled/timeout and falls back to defaults on bad data', () => {
    expect(loadNotifyConfig()).toEqual({ enabled: false, timeout: 0 })
    const next: CompletionNotifyConfig = { enabled: true, timeout: 10 }
    saveNotifyConfig(next)
    expect(loadNotifyConfig()).toEqual(next)
    localStorage.setItem(COMPLETION_NOTIFY_KEY, '{bad json')
    expect(loadNotifyConfig()).toEqual({ enabled: false, timeout: 0 })
  })
})

