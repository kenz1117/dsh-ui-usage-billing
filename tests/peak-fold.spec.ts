import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openScheduleStore } from '../src/peak-schedule-store.ts'
import { expect, it, vi } from 'vitest'
import { foldSession, createUsageAggregator, type UsageLedgerDocument, type UsagePersistence } from '../src/aggregate.ts'
import { applyBuiltinCatalog } from '../src/client/pricing.ts'
import { BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES } from '../src/builtin-catalog.ts'
import { parseSchedule, scheduleKey } from '../src/peak-schedule.ts'
import { eligibleScheduleModel, createScheduleModelDiscovery } from '../src/peak-schedule-models.ts'

applyBuiltinCatalog(BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES)
const site = 'https://relay.example'
const routes = { key: { baseURL: site }, other: {}, 'deepseek-account': { baseURL: site } }
const aliases = { 'old-account': 'deepseek-account', 'deepseek-account': 'key' }
const scoped = scheduleKey(`site:${site}`, 'flash')
const config = parseSchedule({ version: 2, models: { [scoped]: { windows: [0,1440], weekendOffPeak: false } } }, eligibleScheduleModel)
const time = Date.parse('2026-11-22T01:30:00Z')
const usage = { inputTokens: 1_000_000, outputTokens: 1_000_000 }
function message(provider: string, model = 'flash', at = time, seq = 1) {
  return { type: 'assistant/message', time: at, seq, data: { turn: seq, message: { source: { kind: 'model', provider, model } }, usage } }
}
function fold(events: {type:string;time:number;data:unknown}[], custom = true) {
  return foldSession(events, new Set(), undefined, routes, 0, 0, aliases, custom ? { version: 3, revisions: [{ effectiveFromMs: 0, changes: config.models }] } : undefined)
}
it('charges, groups tiers and attributes roles consistently without changing shared-origin account usage', () => {
  const native = fold([message('key')], false)
  const custom = fold([message('key')])
  expect(custom.total.cost).toBe(native.total.cost * 2)
  expect(custom.byTier.get('peak')?.cost).toBe(custom.total.cost)
  expect(custom.roles.outputCost + custom.roles.inputCost).toBeCloseTo(custom.total.cost)
  expect(custom.turns[0]?.scheduleSource).toBe(`site:${site}`)
  for (const provider of ['deepseek-account','old-account']) {
    expect(fold([message(provider)]).total.cost).toBe(native.total.cost)
    expect(fold([message(provider)]).turns[0]?.scheduleSource).toBeUndefined()
    const header = { type: 'request/header',time, data: { header: { config: { provider, model:'flash' } } } }
    expect(fold([header,{ type:'assistant/message',time,data:{usage} }]).total.cost).toBe(native.total.cost)
    expect(fold([{type:'compaction/summary',time,data:{provider,model:'flash',usage}}]).total.cost).toBe(native.total.cost)
  }
  expect(fold([message('key','pro')]).total.cost).toBe(fold([message('key','pro')],false).total.cost)
  expect(fold([{type:'compaction/summary',time,data:{provider:'key',model:'flash',usage}}]).total.cost).toBe(custom.total.cost)
})
it('inherits weekday peak windows and weekend relief on relays with only unrelated overrides', () => {
  const history = { version: 3 as const, revisions: [{ effectiveFromMs: 0, changes: {
    [scoped]: { utcOffsetMinutes: 480, holidays: ['20261224'] },
  } }] }
  for (const [iso, expected] of [['2026-11-21T02:00Z', 5], ['2026-11-20T02:00Z', 10], ['2026-11-20T12:00Z', 5]] as const) {
    const events = [message('key', 'flash', Date.parse(iso))]
    expect(foldSession(events, new Set(), undefined, routes, 0, 0, {}, history).total.cost).toBe(expected)
    expect(fold(events, false).total.cost).toBe(expected)
  }
})

it('keeps first save, edit, and clear forward-only through live folds, restart, replay and archive', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'billing-peak-fold-'))
  try {
    const path = join(dir, 'schedule.json')
    // Beijing noon changed Flash's official off/peak prices from ¥6/¥12 to
    // ¥5/¥10 for 1M input + 1M output. Assert the published prices directly.
    const reprice = Date.parse('2026-09-10T04:00:00Z')
    let clock = reprice - 100
    let store = openScheduleStore(path, eligibleScheduleModel, () => clock)
    let ledger: UsageLedgerDocument | undefined
    let stamp = 'one', archived = false
    const sessions = {
      target: [message('key', 'flash', clock - 1)],
      independent: [message('other', 'flash', clock - 1)],
    }
    const readFrom = vi.fn(async (id: keyof typeof sessions, from: number) => ({ meta: { id }, events: sessions[id].filter(e => e.seq >= from) }))
    const persistence = { list: async () => archived ? [] : Object.keys(sessions).map(id => ({ id })), stampOf: async () => stamp, readFrom } as unknown as UsagePersistence
    const make = (durable = true, replayDelayMs = 0) => createUsageAggregator(persistence, {
      resolvePeakSchedule: store.current, resolvePeakHistory: store.history, resolveRoutes: () => routes,
      deferFoldMs: replayDelayMs, ...(durable ? { ledger: { load: async () => ledger, save: async doc => { ledger = structuredClone(doc) } } } : {}),
    })
    const agg = make()
    const base = await agg.aggregate()
    expect(base.bySite![`site:${site}`]!.cost).toBe(12)
    expect(readFrom).toHaveBeenCalledTimes(2)
    const targetCosts = [12, 6, 10, 5]
    const peerCosts = [12, 12, 5, 5]
    for (const [i, rule] of [{ windows: [] }, { windows: [0, 1440], weekendOffPeak: false }, null].entries()) {
      const before = await agg.aggregate()
      const readCount = readFrom.mock.calls.length
      await agg.withPeakScheduleChange(latest => store.save({ version: 3, changes: { [scoped]: rule } }, latest))
      const after = await agg.aggregate()
      expect(after.total.cost).toBe(before.total.cost)
      expect(readFrom).toHaveBeenCalledTimes(readCount)
      expect(after.peakSchedule?.models[scoped]).toEqual(rule ?? undefined)
      sessions.target.push(message('key', 'flash', clock, i + 2))
      sessions.independent.push(message('other', 'flash', clock, i + 2))
      stamp += '+'
      clock += 100
      // Change the document TTL key on each new suffix without waiting in real time.
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 60_000)
      try {
        const doc = await agg.aggregate()
        expect(doc.bySite![`site:${site}`]!.cost).toBe(targetCosts.slice(0, i + 2).reduce((a, b) => a + b, 0))
        expect(doc.bySite!['direct:other']!.cost).toBe(peerCosts.slice(0, i + 2).reduce((a, b) => a + b, 0))
      } finally { vi.restoreAllMocks() }
    }
    const expected = await agg.aggregate()
    await agg.flush()
    const count = readFrom.mock.calls.length
    store = openScheduleStore(path, eligibleScheduleModel)
    const restarted = await make().aggregate()
    expect(readFrom).toHaveBeenCalledTimes(count)
    const replayed = await make(false).aggregate()
    archived = true
    const archivedDoc = await make().aggregate()
    const ledgerOnly = await make(true, 60_000).aggregate()
    expect(ledgerOnly.staleSnapshot).toBe(true)
    for (const doc of [restarted, replayed, archivedDoc, ledgerOnly]) {
      expect(doc.bySite).toEqual(expected.bySite)
      expect(doc.total).toEqual(expected.total)
      expect(doc.byTurn?.filter(row => row.sessionId === 'target').map(row => [row.turn, row.scheduleTier, row.cost]).sort())
        .toEqual([[1, undefined, 12], [2, 'offPeak', 6], [3, 'peak', 10], [4, undefined, 5]])
      expect(doc.staleLedgerSessions ?? 0).toBe(0)
    }
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

it('waits for an in-flight fold before evaluating a save against future-dated calls', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'billing-peak-clock-'))
  try {
    const store = openScheduleStore(join(dir, 'schedule.json'), eligibleScheduleModel, () => time)
    const events = Promise.withResolvers<{ meta: { id: string }; events: ReturnType<typeof message>[] }>()
    const entered = Promise.withResolvers<void>()
    const persistence = {
      list: async () => [{ id: 'session' }],
      readFrom: async () => { entered.resolve(); return events.promise },
    } as unknown as UsagePersistence
    const agg = createUsageAggregator(persistence, { resolveRoutes: () => routes, resolvePeakHistory: store.history })
    const first = agg.aggregate()
    await entered.promise
    const save = vi.fn((latest: number) => store.save({ version: 3, changes: { [scoped]: { windows: [] } } }, latest))
    const change = agg.withPeakScheduleChange(save)
    const following = agg.aggregate()
    expect(save).not.toHaveBeenCalled()
    events.resolve({ meta: { id: 'session' }, events: [message('key', 'flash', time + 10)] })
    await expect(change).rejects.toThrow('scheduleClockConflict')
    expect(save).toHaveBeenCalledExactlyOnceWith(time + 10)
    expect((await following).total).toEqual((await first).total)
    expect(store.history().revisions).toEqual([])
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

it('keeps official holidays when an effective rule omits holidays', () => {
  const day = Date.parse('2026-10-01T02:00:00Z')
  const events = [message('deepseek', 'flash', day)]
  const history = { version: 3 as const, revisions: [{ effectiveFromMs: day - 1, changes: {
    [scheduleKey('direct:deepseek', 'flash')]: { windows: [0, 1440] },
  } }] }
  const official = foldSession(events, new Set(), undefined, { deepseek: {} }, 0, 0, {}, history)
  expect(official.total.cost).toBe(foldSession(events, new Set()).total.cost)
  expect(official.turns[0]?.scheduleTier).toBe('offPeak')
})

it('discovers configured canonical pairs, omits account aliases and non-DeepSeek models', async () => {
  const profile = {baseURL:site,models:[{id:'deepseek-v4.1-flash'}, {id:'not-found'}]}
  const rows = await createScheduleModelDiscovery()(undefined, {key:profile,'old-account':{models:['pro']},'deepseek-account':{models:['pro']}},aliases)
  expect(rows.models.map(m => scheduleKey(m.source,m.model))).toEqual([scoped])
  expect(rows.notices).toContainEqual({ code: 'discoveryFailed' })
})
it('bounds a stalled provider without losing static or healthy peers, cleans timers and retries on refresh', async () => {
  vi.useFakeTimers()
  try {
    let stalled = true
    const llm = { listProviders: () => [{ id: 'slow' }, { id: 'fast' }],
      listModels: vi.fn((route: string) => route === 'slow' && stalled ? new Promise<unknown[]>(() => {}) : Promise.resolve(['flash'])) }
    const profiles = { local: { models: ['flash'] } }
    const discover = createScheduleModelDiscovery()
    const first = discover(llm, profiles, {})
    const sameFlight = discover(llm, profiles, {})
    await vi.advanceTimersByTimeAsync(5_000)
    const partial = await first
    expect(await sameFlight).toEqual(partial)
    expect(partial.notices).toContainEqual({ code: 'discoveryFailed', detail: 'slow' })
    expect(partial.models.map(row => row.source).sort()).toEqual(['direct:fast', 'direct:local'])
    expect(vi.getTimerCount()).toBe(0)
    stalled = false
    expect(await discover(llm, profiles, {})).toEqual(partial)
    expect(llm.listModels).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(15_000)
    const retry = await discover(llm, profiles, {})
    expect(retry.notices).toEqual([])
    expect(retry.models.map(row => row.source).sort()).toEqual(['direct:fast', 'direct:local', 'direct:slow'])
    expect(llm.listModels).toHaveBeenCalledTimes(3)
    expect(vi.getTimerCount()).toBe(0)
  } finally { vi.useRealTimers() }
})
it.each([{'["direct:deepseek-account","flash"]': {}},{[scoped]:{windows:[20,60,40,50]}},{[scoped]:{holidays:['20260231']}},{[scoped]:{utcOffsetMinutes:1000}},{'["site:https://a.example/path","flash"]':{}},{'["direct:key","bogus"]':{}}])('rejects malformed source or rule', models => {
  expect(() => parseSchedule({ version:2, models },eligibleScheduleModel)).toThrow()
})
