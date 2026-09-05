/**
 * Host-shape adapter tests: the aggregator speaks the 0.1.2 persistence
 * dialect (list of headers + readFrom), while 0.1.3 hosts inject the
 * SessionHandle model (list of {header, revision} rows + open/'read'). The
 * adapter must serve both without touching the fold core.
 */

import { describe, expect, it } from 'vitest'
import { SessionId, SessionLogOffset } from '@deepseek-ai/dsh-session/types'
import type { SessionEvent, SessionHeader } from '@deepseek-ai/dsh-session/types'
import { adaptSessionPersistence } from '../src/index.ts'

describe('adaptSessionPersistence', () => {
  it('passes a 0.1.2-shaped persistence through untouched', () => {
    // 0.1.2 形状：readFrom 直接挂在 persistence 上——原样直通，不包一层。
    const raw = { list: async () => [], readFrom: async () => ({ events: [] }) }
    expect(adaptSessionPersistence(raw)).toBe(raw)
  })

  it('maps the 0.1.3 list rows to headers and feeds the revision table', async () => {
    const { persistence } = fakeHost013({
      s1: { header: { version: 0 } as SessionHeader, events: [], revision: 'r1' },
    })
    const adapted = adaptSessionPersistence(persistence)
    const metas = await adapted.list()
    expect(metas).toHaveLength(1)
    expect(String(metas[0]?.id)).toBe('s1')
    // listed 的会话拿到 revision 作为增量失效键。
    await expect(adapted.stampOf?.(SessionId('s1'))).resolves.toBe('r1')
    // 未 listed 的会话没有 stamp（聚合层会全量重折）。
    await expect(adapted.stampOf?.(SessionId('ghost'))).resolves.toBeNull()
  })

  it('routes readFrom through open/read and disposes the handle', async () => {
    const { persistence, opened, disposed } = fakeHost013({
      s1: {
        header: { version: 0 } as SessionHeader,
        events: [
          { type: 'request/header', seq: 5, time: 1, data: {} },
          { type: 'assistant/message', seq: 6, time: 2, data: {} },
        ] as unknown as SessionEvent[],
        revision: 'r1',
      },
    })
    const adapted = adaptSessionPersistence(persistence)
    const suffix = await adapted.readFrom(SessionId('s1'), SessionLogOffset(5))
    // 读取经 open('read') 完成，handle 用后即弃。
    expect(opened).toEqual(['s1'])
    expect(disposed).toEqual(['s1'])
    expect(suffix.events).toHaveLength(2)
    expect(suffix.inheritedEventCount).toBe(4)
    expect(suffix.fromSeq).toBe(5)
  })
})

/** 0.1.3 宿主 persistence double：记录 open/dispose 轨迹供断言。 */
function fakeHost013(logs: Record<string, { header: SessionHeader; events: SessionEvent[]; revision: string }>) {
  const opened: string[] = []
  const disposed: string[] = []
  return {
    opened,
    disposed,
    persistence: {
      list: async () => Object.entries(logs).map(([id, session]) => ({ header: { ...session.header, id: SessionId(id) }, revision: session.revision })),
      open: async (id: string) => {
        opened.push(id)
        const session = logs[id]
        if (session === undefined) throw new Error(`no session ${id}`)
        return {
          header: { ...session.header, id: SessionId(id) },
          inheritedEventCount: 4,
          read: async (offset = 0) => session.events.filter(event => event.seq >= offset),
          [Symbol.asyncDispose]: async () => { disposed.push(id) },
        }
      },
    },
  }
}
