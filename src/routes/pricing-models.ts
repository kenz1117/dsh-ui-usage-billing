import type { Context } from '@deepseek-ai/cordis'
import { ANONYMOUS_ROUTE_AUTH, guardLoopback } from '../guard.ts'
import { isOfficialBaseUrl } from '../relay.ts'
import type { PricingModel } from '../pricing-shared.ts'

interface Registry {
  listProviders(): readonly { id: string; name?: string }[]
  listModels(route: string): Promise<readonly { id: string; name?: string }[]>
}
interface Profile { models?: unknown; displayName?: string; baseURL?: string }

type PricingModelsResult = { models: PricingModel[]; partial: boolean }
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
const MODEL_CACHE_MS = 60_000
const PARTIAL_MODEL_CACHE_MS = 15_000

// Bound each provider separately: one stalled discovery must not hide static rows.
async function discover(registry: Registry, route: string) {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([registry.listModels(route), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Model discovery timed out')), 5000)
    })])
  } finally { clearTimeout(timer) }
}

/** Static settings remain authoritative even when the registry is unavailable. */
export async function configuredPricingModels(ctx: Context): Promise<PricingModelsResult> {
  const routes = new Map<string, string>()
  let partial = false
  let registry: Registry | undefined
  const profiles = new Map<string, Profile>()
  try {
    const value = ctx.settings.describe({ redactSecrets: true }).find(item => item.ns === 'llm-pi-ai')?.value as { providers?: Record<string, Profile> } | undefined
    for (const [id, profile] of Object.entries(value?.providers ?? {})) {
      if (!id.trim() || !profile || typeof profile !== 'object' || Array.isArray(profile)) { partial = true; continue }
      profiles.set(id, profile)
      routes.set(id, typeof profile.displayName === 'string' && profile.displayName ? profile.displayName : id)
    }
  } catch { partial = true }
  try {
    registry = ctx.get('llm') as Registry | undefined
    if (!registry) partial = true
    for (const p of registry?.listProviders() ?? []) {
      if (typeof p?.id !== 'string' || !p.id.trim()) { partial = true; continue }
      const displayName = profiles.get(p.id)?.displayName
      const fallback = typeof p.name === 'string' && p.name ? p.name : p.id
      routes.set(p.id, typeof displayName === 'string' && displayName ? displayName : fallback)
    }
  } catch { partial = true }
  const groups = await Promise.all([...routes].map(async ([route, channel]) => {
    if (!route || route === 'deepseek-account') return []
    const profile = profiles.get(route)
    let origin = ''
    if (profile?.baseURL) {
      try {
        const url = new URL(profile.baseURL)
        if (['https:', 'http:'].includes(url.protocol) && !isOfficialBaseUrl(url.origin)) origin = url.origin
      } catch { /* Invalid base URLs are not identifiable price sources. */ }
    }
    function parse(list: unknown): PricingModel[] {
      if (!Array.isArray(list)) { partial = true; return [] }
      const models: PricingModel[] = []
      for (const m of list) {
        if (typeof m?.id !== 'string' || !m.id.trim() || (m.name !== undefined && typeof m.name !== 'string')) {
          partial = true
          continue
        }
        models.push({ key: m.id, name: m.name ?? m.id, route, channel, origin })
      }
      return models
    }
    const declared = parse(profile?.models === undefined ? [] : profile.models)
    if (declared.length || !registry) return declared
    try {
      return parse(await discover(registry, route))
    } catch (error) {
      // NO_ADAPTER is a normal configured-but-unregistered route. Older hosts
      // may expose just the registration error message instead of its machine code.
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'NO_ADAPTER') &&
          !(error instanceof Error && error.message === `no adapter registered for provider "${route}"`)) partial = true
      return []
    }
  }))
  return { models: groups.flat(), partial }
}

export function registerPricingModelsRoute(ctx: Context, trustedHosts: ReadonlySet<string>): void {
  ctx.effect(() => {
    let cached: PricingModelsResult | undefined
    let expiresAt = 0
    let inFlight: Promise<PricingModelsResult> | undefined
    function load(): Promise<PricingModelsResult> {
      if (cached && Date.now() < expiresAt) return Promise.resolve(cached)
      return inFlight ??= configuredPricingModels(ctx).then(result => {
        cached = result
        expiresAt = Date.now() + (result.partial ? PARTIAL_MODEL_CACHE_MS : MODEL_CACHE_MS)
        return result
      }).finally(() => { inFlight = undefined })
    }
    return ctx.webServer.register({
      kind: 'exact', path: '/api/billing/pricing-models', ...ANONYMOUS_ROUTE_AUTH,
      async handler(req, res) {
        if (!guardLoopback(req, res, trustedHosts)) return
        if (req.method !== 'GET') {
          res.writeHead(405, { ...JSON_HEADERS, allow: 'GET' })
          res.end(JSON.stringify({ error: 'method not allowed' }))
          return
        }
        const body = await load()
        res.writeHead(200, JSON_HEADERS)
        res.end(JSON.stringify(body))
      },
    })
  }, 'usage-billing: pricing models route')
}
