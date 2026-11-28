import { useEffect, useState } from 'react'
import type { PricingModel } from '../pricing-shared.ts'
import { fetchBilling } from './api/http.ts'
import type { UsageStats } from './domain/types.ts'
import { normalizeOriginInput, resolveCatalogKey } from './pricing.ts'

function isPricingModel(value: unknown): value is PricingModel {
  if (value === null || typeof value !== 'object') return false
  const row = value as Partial<PricingModel>
  return typeof row.key === 'string' && row.key.trim() !== ''
    && typeof row.route === 'string' && row.route.trim() !== ''
    && typeof row.name === 'string' && typeof row.channel === 'string' && typeof row.origin === 'string'
}

/** Only the editor polls discovery. Refresh failures never reset edited rows. */
export function useConfiguredPrices(active: boolean) {
  const [state, setState] = useState({ models: [] as PricingModel[], partial: false, pending: true })
  useEffect(() => {
    if (!active) return
    const ctl = new AbortController()
    let busy = false
    async function load() {
      if (busy || document.visibilityState === 'hidden') return
      busy = true
      try {
        const res = await fetchBilling('/api/billing/pricing-models', { signal: ctl.signal })
        if (!res.ok) throw new Error('Model discovery failed')
        const doc = await res.json()
        if (!Array.isArray(doc?.models) || typeof doc.partial !== 'boolean') throw new Error('Invalid model list')
        const models = doc.models.filter(isPricingModel)
        if (!ctl.signal.aborted) setState({ models, partial: doc.partial || models.length !== doc.models.length, pending: false })
      } catch {
        if (!ctl.signal.aborted) setState(old => ({ ...old, partial: true, pending: false }))
      } finally { busy = false }
    }
    void load()
    const timer = window.setInterval(load, 60_000)
    window.addEventListener('focus', load)
    document.addEventListener('visibilitychange', load)
    return () => {
      ctl.abort(); window.clearInterval(timer)
      window.removeEventListener('focus', load)
      document.removeEventListener('visibilitychange', load)
    }
  }, [active])
  return state
}

export function priceIdentity(key: string, origin = ''): string {
  return JSON.stringify([resolveCatalogKey(key.trim()), origin.trim() ? normalizeOriginInput(origin.trim()) : ''])
}

export function priceOptions(configured: readonly PricingModel[], stats: UsageStats) {
  const options = new Map<string, { id: string; key: string; channel: string; origin: string; name: string }>()
  function add(key: string, channel = '', origin = '', name = '') {
    const id = JSON.stringify([key, origin])
    if (key && !options.has(id)) options.set(id, { id, key, channel, origin, name })
  }
  for (const m of configured) if (m.route !== 'deepseek-account') add(m.key, m.channel, m.origin, m.name)
  const located = new Set<string>()
  for (const day of Object.values(stats.byDayModelsSite ?? {})) {
    for (const [key, sites] of Object.entries(day)) {
      for (const [site, cell] of Object.entries(sites)) {
        if (cell.calls <= 0) continue
        located.add(key)
        if (site === 'direct:deepseek-account') continue
        const origin = site.startsWith('site:') ? normalizeOriginInput(site.slice(5)) : ''
        add(key, site.startsWith('direct:') ? site.slice(7) : '', origin)
      }
    }
  }
  for (const [key, cell] of Object.entries(stats.byModel)) if (cell.calls > 0 && !located.has(key)) add(key)
  for (const key of stats.unpricedModels ?? []) if (!located.has(key)) add(key)
  return [...options.values()].sort((a, b) => a.channel.localeCompare(b.channel) || a.key.localeCompare(b.key))
}
