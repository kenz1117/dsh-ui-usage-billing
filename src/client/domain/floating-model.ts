import type { ProviderBalance, RelayQuota, SubscriptionQuota } from '../../pricing-shared.ts'
import { formatMoney, getRateInfo, localDayStamp, modelOf } from '../pricing.ts'
import type { BillingCardSpan } from '../usage-billing-settings.ts'
import type { UsageBillingKey } from '../locales.ts'
import { subscriptionStatusText } from './kpi.ts'
import type { UsageStats } from './types.ts'

type ModelStats = Pick<UsageStats, 'byDayModels' | 'byDayModelsSite' | 'byModel'>
interface Lead { name: string; cost: number; calls: number; sources: Set<string> }

/** Retain displayed costs for paid-only days. For mixed days use recorded costs to avoid pricing plan calls. */
export function floatingLeads(stats: ModelStats, span: BillingCardSpan, today: string, recordedDays = stats.byDayModels) {
  const monday = new Date(`${today}T00:00:00`)
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7)
  const start = span === 'day' ? today : span === 'week' ? localDayStamp(monday.getTime()) : `${today.slice(0, 7)}-01`
  const paid = new Map<string, Lead>()
  const plans = new Map<string, Lead>()
  function add(bucket: Map<string, Lead>, name: string, cost: number, calls: number, sources: string[]) {
    const row = bucket.get(name) ?? { name, cost: 0, calls: 0, sources: new Set<string>() }
    row.cost += cost
    row.calls += calls
    for (const source of sources) row.sources.add(source)
    bucket.set(name, row)
  }
  for (const [day, models] of Object.entries(stats.byDayModels ?? {})) {
    if (day < start || day > today) continue
    for (const [name, usage] of Object.entries(models)) {
      if (usage.calls <= 0) continue
      const legacyPlan = stats.byModel[name]?.plan === true
      const sites = Object.entries(stats.byDayModelsSite?.[day]?.[name] ?? {}).filter(([, cell]) => cell.calls > 0)
      let coveredCalls = 0
      let coveredCost = 0
      let paidCalls = 0
      let paidCost = 0
      let hasPlan = false
      const paidSources: string[] = []
      for (const [source, cell] of sites) {
        coveredCalls += cell.calls
        coveredCost += cell.cost
        const planCalls = cell.planCalls ?? ((cell.plan ?? legacyPlan) ? cell.calls : 0)
        if (planCalls > 0) {
          hasPlan = true
          add(plans, name, 0, planCalls, [source])
        }
        if (cell.calls > planCalls) {
          paidCalls += cell.calls - planCalls
          paidCost += cell.cost
          paidSources.push(source)
        }
      }
      const uncoveredCalls = Math.max(0, usage.calls - coveredCalls)
      if (uncoveredCalls > 0 && legacyPlan) {
        hasPlan = true
        add(plans, name, 0, uncoveredCalls, ['unknown'])
      } else if (uncoveredCalls > 0) {
        const recordedCost = recordedDays?.[day]?.[name]?.cost ?? usage.cost
        paidCalls += uncoveredCalls
        paidCost += Math.max(0, recordedCost - coveredCost)
        paidSources.push('unknown')
      }
      if (paidCalls > 0) add(paid, name, hasPlan ? paidCost : usage.cost, paidCalls, paidSources)
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
    const site = source.startsWith('site:') ? source.slice(5) : undefined
    const route = source.startsWith('direct:') ? source.slice(7) : undefined
    if (site === undefined && route === undefined) return unavailable
    const rows = site !== undefined
      ? balances.filter(row => row.sourceOrigin === site)
      : balances.filter(row => route !== undefined && (row.sourceRoute === route || row.sourceRouteAliases?.includes(route)))
    const relayRows = site === undefined ? [] : relays.filter(row => row.origin === site)
    if (rows.length + relayRows.length !== 1 || relayRows.some(row => row.sourceAmbiguous)) return unavailable
    const relay = relayRows[0]
    if (relay) {
      if (relay.status !== 'ok') return failure(relay.displayName, subscriptionStatusText(relay.status, t))
      // Relay adapters do not declare a currency. Never convert or apply a CNY threshold.
      return relay.balance !== undefined ? { text: `${relay.displayName} · ${relay.balance.toFixed(2)} (${t('popUnknownUnit')})`, low: false } : unavailable
    }
    const bal = rows[0]!
    if (bal.error) return failure(bal.displayName, t(balanceErrors[bal.error]))
    const currency = bal.currency?.toUpperCase() ?? 'CNY'
    if (bal.totalBalance === undefined || (currency !== 'CNY' && currency !== 'USD')) return unavailable
    const usd = currency === 'USD'
    const amount = formatMoney(bal.totalBalance, usd ? 'usd' : 'cny')
    return { text: `${bal.displayName} · ${amount}`, low: bal.totalBalance * (usd ? getRateInfo().rate : 1) < threshold }
  }
  function subscription(source: string) {
    const site = source.startsWith('site:') ? source.slice(5) : undefined
    const matches = quotas.filter(item => site === undefined ? `direct:${item.provider}` === source : item.origin === site)
    const relayMatches = site === undefined ? [] : relays.filter(item => item.origin === site)
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
  function status(row: Lead, read: (source: string) => { text: string; low: boolean }) {
    const model = modelOf(row.name)
    const name = model.key === 'other' && row.name !== 'other' ? row.name : model.name
    const [source = 'unknown'] = row.sources
    return { name, ...(row.sources.size > 1 ? { text: t('popMultipleSources'), low: false } : read(source)) }
  }
  return {
    direct: leads.paid && status(leads.paid, wallet),
    sub: leads.plan && status(leads.plan, subscription),
  }
}
