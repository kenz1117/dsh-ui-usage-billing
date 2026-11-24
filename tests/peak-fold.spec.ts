import { expect, it } from 'vitest'
import { foldSession, createUsageAggregator, type UsagePersistence } from '../src/aggregate.ts'
import { applyBuiltinCatalog } from '../src/client/pricing.ts'
import { BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES } from '../src/builtin-catalog.ts'
import { parseSchedule, scheduleKey, emptySchedule } from '../src/peak-schedule.ts'
import { eligibleScheduleModel, scheduleModels } from '../src/peak-schedule-models.ts'

applyBuiltinCatalog(BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES)
const site = 'https://relay.example'
const routes = { key: { baseURL: site }, 'deepseek-account': { baseURL: site } }
const aliases = { 'old-account': 'deepseek-account', 'deepseek-account': 'key' }
const scoped = scheduleKey(`site:${site}`, 'flash')
const config = parseSchedule({ version: 2, models: { [scoped]: { windows: [0,1440], weekendOffPeak: false } } }, eligibleScheduleModel)
const time = Date.parse('2026-11-22T01:30:00Z')
const usage = { inputTokens: 1_000_000, outputTokens: 1_000_000 }
function message(provider: string, model = 'flash') {
  return { type: 'assistant/message', time, seq: 1, data: { turn: 1, message: { source: { kind: 'model', provider, model } }, usage } }
}
function fold(events: {type:string;time:number;data:unknown}[], custom = true) {
  return foldSession(events, new Set(), undefined, routes, 0, 0, aliases, custom ? config : undefined)
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
it('invalidates both stamp-based folds and whole-document TTL when switching or clearing schedules', async () => {
  let active = emptySchedule()
  const events = [message('key')]
  const agg = createUsageAggregator({list: async () => [{ id:'test' }], stampOf: async () => 'unchanged', readFrom: async () => ({meta:{id:'test'},events})} as unknown as UsagePersistence, {resolvePeakSchedule: () => active, resolveRoutes: () => routes})
  const base = await agg.aggregate()
  active = config
  expect((await agg.aggregate()).total.cost).toBe(base.total.cost * 2)
  active = emptySchedule()
  expect((await agg.aggregate()).total.cost).toBe(base.total.cost)
})
it('discovers configured canonical pairs, omits account aliases and non-DeepSeek models', async () => {
  const profile = {baseURL:site,models:[{id:'deepseek-v4.1-flash'}, {id:'not-found'}]}
  const rows = await scheduleModels(undefined, {key:profile,'old-account':{models:['pro']},'deepseek-account':{models:['pro']}},aliases)
  expect(rows.models.map(m => scheduleKey(m.source,m.model))).toEqual([scoped])
  expect(rows.warning).toBeTruthy()
})
it.each([{'["direct:deepseek-account","flash"]': {}},{[scoped]:{windows:[20,60,40,50]}},{[scoped]:{holidays:['20260231']}},{[scoped]:{utcOffsetMinutes:1000}},{'["site:https://a.example/path","flash"]':{}},{'["direct:key","bogus"]':{}}])('rejects malformed source or rule', models => {
  expect(() => parseSchedule({ version:2, models },eligibleScheduleModel)).toThrow()
})
