import { describe, expect, it } from 'vitest'
import { floatingLeads, floatingStatus } from '../src/client/domain/floating-model.ts'
import { zh } from '../src/client/locales.ts'
import type { UsageBillingKey } from '../src/client/locales.ts'
import type { ProviderBalance, RelayQuota } from '../src/pricing-shared.ts'

const today = '2026-11-25'
const t = (key: UsageBillingKey) => zh[key]
const row = (cost: number, calls = 1) => ({ cost, calls, input: 1, output: 1, cacheHit: 0, cacheMiss: 1, reasoning: 0 })
const wallet: ProviderBalance = { provider: 'deepseek', displayName: 'DeepSeek', sourceRoute: 'deepseek', currency: 'CNY', totalBalance: 3 }
const relay: RelayQuota = { route: 'a', displayName: 'Relay A', origin: 'https://a.example', kind: 'sub2api', balance: 42, status: 'ok' }
function selected(sites: Record<string, ReturnType<typeof row>>, calls = 1) {
  return floatingLeads({ byModel: {}, byDayModels: { [today]: { model: row(9, calls) } }, byDayModelsSite: { [today]: { model: sites } } }, 'day', today)
}
const status = (leads: ReturnType<typeof floatingLeads>, wallets = [wallet], relays = [relay]) => floatingStatus(leads, wallets, relays, [], 10, t).direct

describe('floating card scope and wallet provenance', () => {
  it('ranks day, natural week, and month by model, excluding future and previous month', () => {
    const stats = { byModel: {}, byDayModels: { [today]: { day: row(1) }, '2026-11-23': { week: row(4) }, '2026-11-22': { month: row(5) }, '2026-11-26': { future: row(100) }, '2026-10-31': { past: row(200) } } }
    expect((['day', 'week', 'month'] as const).map(s => floatingLeads(stats, s, today).paid?.name)).toEqual(['day', 'week', 'month'])
  })
  it('uses only exact direct provenance; never borrows a unique account or unmarked balance', () => {
    expect(status(selected({ 'direct:deepseek': row(9) }))?.low).toBe(true)
    expect(status(selected({ 'direct:deepseek-account': row(9) }))?.text).toBe(t('popBalanceUnavailable'))
    const { sourceRoute: _, ...legacy } = wallet
    expect(status(selected({ 'direct:deepseek': row(9) }), [legacy])?.text).toBe(t('popBalanceUnavailable'))
    expect(status(selected({ 'direct:deepseek-account': row(9) }), [{ ...wallet, sourceRoute: 'deepseek-account' }])?.low).toBe(true)
  })
  it('refuses multiple sources even when one dominates, and rejects incomplete coverage', () => {
    expect(status(selected({ 'direct:deepseek': row(9, 99), 'site:https://a.example': row(0) }, 100))).toEqual({ name: 'model', text: t('popMultipleSources'), low: false })
    expect(status(selected({ 'direct:deepseek': row(9) }, 2))?.text).toBe(t('popMultipleSources'))
  })
  it('requires unique relay origin and never assumes an upstream balance is CNY', () => {
    const leads = selected({ 'site:https://a.example': row(9) })
    expect(status(leads)?.text).toContain('Relay A · 42.00')
    expect(status(leads)?.low).toBe(false)
    expect(status(leads, [], [relay, { ...relay, route: 'b' }])?.text).toBe(t('popBalanceUnavailable'))
  })
  it('has no leads without usage and reports unknown provenance for an uncovered paid row', () => {
    const empty = floatingLeads({ byModel: {}, byDayModels: { [today]: { model: row(0, 0) } } }, 'day', today)
    expect(floatingStatus(empty, [wallet], [relay], [], 10, t)).toEqual({ direct: undefined, sub: undefined })
    expect(status(selected({}))).toEqual({ name: 'model', text: t('popBalanceUnavailable'), low: false })
  })
  it('keeps known paid costs and allocates only uncovered calls to the legacy plan', () => {
    const direct = 'direct:deepseek', plan = 'direct:plan'
    const stats = {
      byModel: { model: { ...row(99, 10), plan: true } },
      byDayModels: { [today]: { model: row(99, 10) } },
      byDayModelsSite: { [today]: { model: { [direct]: { ...row(8, 3), plan: false }, [plan]: row(0, 2) } } },
    }
    const leads = floatingLeads(stats, 'day', today)
    expect(leads.paid).toEqual({ name: 'model', cost: 8, calls: 3, sources: new Set([direct]) })
    expect(leads.plan).toEqual({ name: 'model', cost: 0, calls: 7, sources: new Set([plan, 'unknown']) })
    expect(status(leads)?.text).toBe('DeepSeek · ¥3.00')
  })
  it('uses recorded residuals for uncovered paid calls on a mixed day', () => {
    const stats = {
      byModel: {}, byDayModels: { [today]: { model: row(99, 10) } },
      byDayModelsSite: { [today]: { model: { 'direct:deepseek': row(8, 3), 'direct:plan': { ...row(0, 2), plan: true } } } },
    }
    const leads = floatingLeads(stats, 'day', today, { [today]: { model: row(15, 10) } })
    expect(leads.paid).toEqual({ name: 'model', cost: 15, calls: 8, sources: new Set(['direct:deepseek', 'unknown']) })
    expect(leads.plan?.calls).toBe(2)
    expect(status(leads)?.text).toBe(t('popMultipleSources'))
  })
  it('breaks ties on paid calls and then model key independent of insertion order', () => {
    for (const keys of [['b', 'a', 'c'], ['c', 'a', 'b']]) {
      const models = Object.fromEntries(keys.map(key => [key, row(1, key === 'c' ? 1 : 2)]))
      const leads = floatingLeads({ byModel: { c: { ...row(1), plan: true } }, byDayModels: { [today]: { ...models, d: row(1) } } }, 'day', today)
      expect(leads.paid?.name).toBe('a')
      expect(leads.plan?.name).toBe('c')
    }
  })
  it('defaults absent currency to CNY and rejects explicitly unsupported currency', () => {
    const leads = selected({ 'direct:deepseek': row(9) })
    const { currency: _, ...legacy } = wallet
    expect(status(leads, [legacy])).toEqual({ name: 'model', text: 'DeepSeek · ¥3.00', low: true })
    expect(status(leads, [{ ...wallet, currency: 'USD' }])).toEqual({ name: 'model', text: 'DeepSeek · $3.00', low: false })
    expect(status(leads, [{ ...wallet, currency: 'EUR' }])?.text).toBe(t('popBalanceUnavailable'))
  })
  it.each([
    ['unconfigured', 'balanceUnconfigured'], ['unauthorized', 'balanceUnauthorized'],
    ['unreachable', 'balanceUnreachable'], ['invalid', 'balanceUnreachable'],
  ] as const)('shows an exact direct-route balance failure for %s', (error, reason) => {
    const leads = selected({ 'direct:deepseek': row(9) })
    expect(status(leads, [{ ...wallet, error }])).toEqual({ name: 'model', text: `DeepSeek · ${t(reason)}`, low: false })
  })
  it('requires explicit origin attribution for the official API wallet and rejects a conflicting site match', () => {
    const origin = 'https://api.deepseek.com'
    const leads = selected({ [`site:${origin}`]: row(9) })
    const api = { ...wallet, sourceOrigin: origin }
    const account = { ...wallet, sourceRoute: 'deepseek-account' }
    expect(status(leads, [wallet, account])?.text).toBe(t('popBalanceUnavailable'))
    expect(status(leads, [api, account])?.text).toBe('DeepSeek · ¥3.00')
    expect(status(leads, [api, account], [{ ...relay, origin }])?.text).toBe(t('popBalanceUnavailable'))
    expect(status(selected({ 'direct:deepseek-official': row(9) }), [api, account])?.text).toBe(t('popBalanceUnavailable'))
  })
  it('uses explicit shared-wallet aliases and rejects conflicting direct wallet matches', () => {
    const leads = selected({ 'direct:zai-coding-cn': row(9) })
    const primary = { ...wallet, provider: '智谱 AI', displayName: '智谱 AI', sourceRoute: 'zhipu' }
    expect(status(leads, [primary])?.text).toBe(t('popBalanceUnavailable'))
    const shared = { ...primary, sourceRouteAliases: ['zai-coding-cn'] }
    expect(status(leads, [shared])?.text).toBe('智谱 AI · ¥3.00')
    expect(status(leads, [shared, { ...primary, sourceRoute: 'zai-coding-cn' }])?.text).toBe(t('popBalanceUnavailable'))
  })
  it('shows relay errors and refuses missing balances or ambiguous provenance', () => {
    const leads = selected({ 'site:https://a.example': row(9) })
    const { balance: _, ...noBalance } = relay
    expect(status(leads, [], [{ ...noBalance, status: 'unauthorized' }])?.text).toBe(`Relay A · ${t('subscriptionUnauthorized')}`)
    expect(status(leads, [], [noBalance])?.text).toBe(t('popBalanceUnavailable'))
    expect(status(leads, [], [{ ...relay, sourceAmbiguous: true }])?.text).toBe(t('popBalanceUnavailable'))
  })
  it('resolves unique site-hosted plan windows and rejects other routes at the same site', () => {
    const origin = 'https://a.example', model = { ...row(0, 3), plan: true }
    const leads = floatingLeads({ byModel: {}, byDayModels: { [today]: { model } }, byDayModelsSite: { [today]: { model: { [`site:${origin}`]: model } } } }, 'day', today)
    const windows = [{ kind: 'weekly', usedPercent: 94, remainingPercent: 6 }] as const
    const quota = { provider: 'a', origin, displayName: 'Plan A', windows, status: 'ok' } as const
    const remaining = t('subscriptionRemaining').replace('{pct}', '6')
    expect(floatingStatus(leads, [], [relay], [quota], 10, t).sub).toEqual({ name: 'model', text: `Plan A · ${remaining}`, low: true })
    expect(floatingStatus(leads, [], [{ ...relay, windows }], [], 10, t).sub?.text).toBe(`Relay A · ${remaining}`)
    expect(floatingStatus(leads, [], [{ ...relay, route: 'b' }], [quota], 10, t).sub?.text).toBe(t('popQuotaUnavailable'))
    expect(floatingStatus(leads, [], [], [{ ...quota, windows: [] }], 10, t).sub?.text).toBe(`Plan A · ${t('subscriptionNoApi')}`)
  })
  it('splits mixed calls in the same site without repricing the plan portion', () => {
    const source = 'site:https://a.example'
    const stats = {
      byModel: {}, byDayModels: { [today]: { model: row(99, 10) } },
      byDayModelsSite: { [today]: { model: { [source]: { ...row(7, 10), planCalls: 6 } } } },
    }
    const leads = floatingLeads(stats, 'day', today)
    expect(leads.paid).toEqual({ name: 'model', cost: 7, calls: 4, sources: new Set([source]) })
    expect(leads.plan).toEqual({ name: 'model', cost: 0, calls: 6, sources: new Set([source]) })
  })
  it('selects subscription by scoped calls, preserves plan identity and query failure', () => {
    const a = { ...row(0, 2), plan: true }, b = { ...row(0, 9), plan: true }
    const stats = { byModel: {}, byDayModels: { [today]: { a, b } }, byDayModelsSite: { [today]: { a: { 'direct:a': a }, b: { 'direct:b': b } } } }
    const leads = floatingLeads(stats, 'day', today)
    expect(leads.plan?.name).toBe('b')
    expect(leads.paid).toBeUndefined()
    expect(floatingStatus(leads, [], [], [{ provider: 'b', displayName: 'Plan B', status: 'unauthorized', windows: [] }], 10, t).sub?.text).toBe(`Plan B · ${t('subscriptionUnauthorized')}`)
  })
})
