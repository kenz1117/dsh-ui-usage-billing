import { siteBucketKey, siteRefOf, type ProviderRouteView } from './aggregate.ts'
import { modelOf, resolveCatalogKey } from './client/pricing.ts'
import { accountRoute, scheduleKey, validSource, type ScheduleModel, type ScheduleNotice } from './peak-schedule.ts'

export interface ScheduleProfile extends ProviderRouteView { displayName?: string; models?: unknown[] }
interface Llm { listProviders?(): readonly { id: string; name?: string }[]; listModels?(route: string): Promise<unknown[]> }
async function discover(llm: Llm | undefined, route: string): Promise<unknown[]> {
  if (!llm?.listModels) throw Error('Model registry unavailable')
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const models = await Promise.race([llm.listModels(route), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(Error('Model discovery timed out')), 5_000)
    })])
    if (!Array.isArray(models)) throw Error('Invalid model registry response')
    return models
  } finally { clearTimeout(timer) }
}
export function eligibleScheduleModel(key: string): boolean {
  const entry = modelOf(key)
  return key === entry.key && entry.provider === 'DeepSeek' && entry.price.offPeak !== undefined && entry.tierSemantics !== 'latency'
}

/** Cache only remote discovery. Route identity and locally declared models are refreshed every request. */
export function createScheduleModelDiscovery(now = Date.now, ttlMs = 60_000) {
  const cache = new Map<string, { expires: number; result: Promise<unknown[]> }>()
  let service: Llm | undefined
  function listModels(llm: Llm | undefined, id: string, baseURL?: string) {
    const key = JSON.stringify([id, baseURL])
    const hit = cache.get(key)
    if (hit && hit.expires > now()) return hit.result
    const entry = { expires: Infinity, result: discover(llm, id) }
    cache.set(key, entry)
    void entry.result.then(() => { entry.expires = now() + ttlMs }, () => {
      // Briefly cache failures too, so a broken route is not polled on every edit.
      entry.expires = now() + Math.min(ttlMs, 15_000)
    })
    return entry.result
  }
  return async (llm: Llm | undefined, profiles: Record<string, ScheduleProfile>, aliases: Readonly<Record<string, string>>) => {
    if (service !== llm) { cache.clear(); service = llm }
    const routes = new Map<string, string>()
    const notices: ScheduleNotice[] = []
    try {
      if (!llm?.listProviders) throw Error()
      for (const p of llm.listProviders()) if (typeof p.id === 'string') routes.set(p.id, p.name || p.id)
    } catch { notices.push({ code: 'discoveryFailed' }) }
    const views: Record<string, ProviderRouteView> = { ...profiles }
    for (const id of routes.keys()) if (!Object.hasOwn(views, id)) views[id] = {}
    for (const [id, profile] of Object.entries(profiles)) if (profile.models) routes.set(id, profile.displayName || id)
    const liveCacheKeys = new Set([...routes.keys()].map(id => JSON.stringify([id, profiles[id]?.baseURL])))
    for (const key of cache.keys()) if (!liveCacheKeys.has(key)) cache.delete(key)
    const rows = new Map<string, ScheduleModel>()
    await Promise.all([...routes].map(async ([id, label]) => {
      const mapped = aliases[id] ?? id
      if (accountRoute(id) || accountRoute(mapped)) return
      const source = siteBucketKey(siteRefOf(mapped, views))
      if (!validSource(source)) return
      let models: unknown[]
      try { models = profiles[id]?.models ?? await listModels(llm, id, profiles[id]?.baseURL) }
      catch { notices.push({ code: 'discoveryFailed', detail: id }); return }
      for (const item of models) {
        const raw = typeof item === 'string' ? item : (item as { id?: unknown } | null)?.id
        if (typeof raw !== 'string') continue
        const model = resolveCatalogKey(raw)
        if (eligibleScheduleModel(model)) rows.set(scheduleKey(source, model), { source, model, label: `${source} / ${modelOf(model).name} (${label})` })
      }
    }))
    return { models: [...rows.values()].sort((a, b) => a.label.localeCompare(b.label)), notices }
  }
}
