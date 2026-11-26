import { balanceCoversSite, siteKeyParts, type ProviderBalance, type RelayQuota, type SubscriptionQuota } from '../../pricing-shared.ts'
import { formatMoney, getRateInfo, localDayStamp, modelOf } from '../pricing.ts'
import type { BillingCardSpan } from '../usage-billing-settings.ts'
import type { UsageBillingKey } from '../locales.ts'
import { subscriptionStatusText } from './kpi.ts'
import type { UsageStats } from './types.ts'

type ModelStats = Pick<UsageStats, 'byDayModels' | 'byDayModelsSite' | 'byModel'>
interface Lead { name: string; cost: number; calls: number; sources: Set<string>; unattributedCalls: number }

/** Rank metered models on the same day/model costs as the dashboard, including custom prices. */
export function floatingLeads(stats: ModelStats, span: BillingCardSpan, today: string) {
  const monday = new Date(`${today}T00:00:00`)
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7)
  const start = span === 'day' ? today : span === 'week' ? localDayStamp(monday.getTime()) : `${today.slice(0, 7)}-01`
  const paid = new Map<string, Lead>()
  const plans = new Map<string, Lead>()
  function add(bucket: Map<string, Lead>, name: string, calls: number, source?: string) {
    const row = bucket.get(name) ?? { name, cost: 0, calls: 0, sources: new Set<string>(), unattributedCalls: 0 }
    row.calls += calls
    if (source === undefined || siteKeyParts(source).kind === 'unknown') row.unattributedCalls += calls
    else row.sources.add(source)
    bucket.set(name, row)
    return row
  }
  for (const [day, models] of Object.entries(stats.byDayModels ?? {})) {
    if (day < start || day > today) continue
    for (const [name, usage] of Object.entries(models)) {
      if (usage.calls <= 0) continue
      const legacyPlan = stats.byModel[name]?.plan === true
      const sites = Object.entries(stats.byDayModelsSite?.[day]?.[name] ?? {}).filter(([, cell]) => cell.calls > 0)
      let coveredCalls = 0
      let metered: Lead | undefined
      for (const [source, cell] of sites) {
        coveredCalls += cell.calls
        const planCalls = cell.planCalls ?? ((cell.plan ?? legacyPlan) ? cell.calls : 0)
        if (planCalls > 0) add(plans, name, planCalls, source)
        if (cell.calls > planCalls) metered = add(paid, name, cell.calls - planCalls, source)
      }
      const residual = usage.calls - coveredCalls
      if (residual > 0) {
        if (legacyPlan) add(plans, name, residual)
        else metered = add(paid, name, residual)
      }
      // Site cells supply provenance and call counts. Add the dashboard's amount
      // once, even when the same day also has subscription calls.
      if (metered) metered.cost += usage.cost
    }
  }
  const top = (bucket: Map<string, Lead>, field: 'cost' | 'calls') => {
    let best: Lead | undefined
    for (const row of bucket.values()) {
      if (!best || row[field] > best[field] || (row[field] === best[field] && (row.calls > best.calls || (row.calls === best.calls && row.name < best.name)))) best = row
    }
    return best
  }
  return { paid: top(paid, 'cost'), plan: top(plans, 'calls') }
}

const balanceErrors = {
  unconfigured: 'balanceUnconfigured', unauthorized: 'balanceUnauthorized',
  unreachable: 'balanceUnreachable', invalid: 'balanceUnreachable',
} as const

export function floatingStatus(leads: ReturnType<typeof floatingLeads>, balances: readonly ProviderBalance[], relays: readonly RelayQuota[], quotas: readonly SubscriptionQuota[], threshold: number, t: (key: UsageBillingKey) => string) {
  const unavailable = { text: t('popBalanceUnavailable'), low: false }
  const failure = (name: string, reason: string) => ({ text: `${name} · ${reason}`, low: false })
  function wallet(source: string) {
    const parts = siteKeyParts(source)
    const rows = balances.filter(row => balanceCoversSite(row, source))
    const relayRows = parts.kind === 'site' ? relays.filter(row => row.origin === parts.origin) : []
    if (rows.length + relayRows.length !== 1 || relayRows.some(row => row.sourceAmbiguous)) return unavailable
    const relay = relayRows[0]
    if (relay) {
      if (relay.status !== 'ok') return failure(relay.displayName, subscriptionStatusText(relay.status, t))
      // Relay adapters do not declare a currency. Never convert or apply a CNY threshold.
      return relay.balance !== undefined ? { text: `${relay.displayName} · ${relay.balance.toFixed(2)} (${t('popUnknownUnit')})`, low: false } : unavailable
    }
    const bal = rows[0]!
    const walletLabel = bal.sourceRoute === 'deepseek' && (bal.walletKind === 'account' || bal.walletKind === 'api-key')
      ? `${bal.displayName} · ${t(bal.walletKind === 'account' ? 'walletLogin' : 'walletPlatform')}`
      : bal.displayName
    if (bal.error) return failure(walletLabel, t(balanceErrors[bal.error]))
    const currency = bal.currency?.toUpperCase() ?? 'CNY'
    if (bal.totalBalance === undefined || (currency !== 'CNY' && currency !== 'USD')) return unavailable
    const usd = currency === 'USD'
    const amount = formatMoney(bal.totalBalance, usd ? 'usd' : 'cny')
    if (bal.otherBalances?.length) {
      const pockets = bal.otherBalances.map(other => `${other.currency} ${other.totalBalance.toFixed(2)}`)
      return { text: `${walletLabel} · ${[amount, ...pockets].join(' + ')}`, low: false }
    }
    return { text: `${walletLabel} · ${amount}`, low: bal.totalBalance * (usd ? getRateInfo().rate : 1) < threshold }
  }
  function subscription(source: string) {
    const parts = siteKeyParts(source)
    const matches = quotas.filter(item => parts.kind === 'direct' ? item.provider === parts.route : parts.kind === 'site' && item.origin === parts.origin)
    const relayMatches = parts.kind === 'site' ? relays.filter(item => item.origin === parts.origin) : []
    const routes = new Set([...matches.map(item => item.provider), ...relayMatches.map(item => item.route)])
    const quotaUnavailable = { text: t('popQuotaUnavailable'), low: false }
    if (routes.size !== 1 || matches.length > 1 || relayMatches.length > 1 || relayMatches.some(row => row.sourceAmbiguous)) return quotaUnavailable
    // A route may report both a wallet and windows. Prefer its explicit plan quota when present.
    const q = matches[0] ?? relayMatches[0]
    if (!q) return quotaUnavailable
    if (q.status !== 'ok') return failure(q.displayName, subscriptionStatusText(q.status, t))
    if (!q.windows?.length) return failure(q.displayName, t('subscriptionNoApi'))
    const pct = Math.min(...q.windows.map(w => w.remainingPercent))
    const remaining = pct <= 0 ? t('subscriptionExhausted') : t('subscriptionRemaining').replace('{pct}', String(pct))
    return { text: `${q.displayName} · ${remaining}`, low: pct < 20 }
  }
  function status(row: Lead, kind: 'paid' | 'plan') {
    const model = modelOf(row.name)
    const name = model.key === 'other' && row.name !== 'other' ? row.name : model.name
    if (row.sources.size > 1) return { name, text: t('popMultipleSources'), low: false }
    const [source] = row.sources
    if (!source || (kind === 'paid' && row.unattributedCalls > 0)) return { name, text: t('popSourceUnknown'), low: false }
    if (kind === 'paid') return { name, ...wallet(source) }
    const quota = subscription(source)
    // This quota describes the identified channel only. Legacy calls without
    // a site count toward ranking but cannot claim its quota.
    const text = row.unattributedCalls > 0 ? `${quota.text} · ${t('popPartialSource')}` : quota.text
    return { name, ...quota, text }
  }
  return {
    direct: leads.paid && status(leads.paid, 'paid'),
    sub: leads.plan && status(leads.plan, 'plan'),
  }
}
