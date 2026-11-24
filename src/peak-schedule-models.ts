import { siteBucketKey, siteRefOf } from './aggregate.ts'
import { modelOf, resolveCatalogKey } from './client/pricing.ts'
import { accountRoute, scheduleKey, validSource, type ScheduleModel } from './peak-schedule.ts'

interface Profile { baseURL?: string; displayName?: string; models?: unknown[] }
interface Llm { listProviders?(): readonly { id: string; name?: string }[]; listModels?(route: string): Promise<unknown[]> }
async function discover(llm: Llm | undefined, route: string): Promise<unknown[]> {
  if (!llm?.listModels) throw Error('Model registry unavailable')
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([llm.listModels(route), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(Error('Model discovery timed out')), 5_000)
    })])
  } finally { clearTimeout(timer) }
}
export function eligibleScheduleModel(key: string): boolean {
  const entry = modelOf(key)
  return key === entry.key && entry.provider === 'DeepSeek' && entry.price.offPeak !== undefined && entry.tierSemantics !== 'latency'
}
export async function scheduleModels(llm: Llm | undefined, profiles: Record<string, Profile>, aliases: Readonly<Record<string, string>>) {
  const routes = new Map<string,string>()
  const failures: string[] = []
  try {
    if (!llm?.listProviders) throw Error()
    for (const p of llm.listProviders()) if (typeof p.id === 'string') routes.set(p.id, p.name || p.id)
  } catch { failures.push('model registry') }
  for (const [id, profile] of Object.entries(profiles)) if (Array.isArray(profile?.models)) routes.set(id, profile.displayName || id)
  const views = Object.fromEntries([...routes.keys()].map(id => [id, profiles[id] ?? {}]))
  const rows = new Map<string,ScheduleModel>()
  await Promise.all([...routes].map(async ([id, label]) => {
    const mapped = aliases[id] ?? id
    if (accountRoute(id) || accountRoute(mapped)) return
    const source = siteBucketKey(siteRefOf(mapped, views))
    if (!validSource(source)) return
    let models: unknown[]
    try { models = profiles[id]?.models ?? await discover(llm, id) } catch { failures.push(id); return }
    for (const item of models ?? []) {
      const raw = typeof item === 'string' ? item : (item as { id?: unknown } | null)?.id
      if (typeof raw !== 'string') continue
      const model = resolveCatalogKey(raw)
      if (eligibleScheduleModel(model)) rows.set(scheduleKey(source,model), { source, model, label: `${label} / ${modelOf(model).name} (${source})` })
    }
  }))
  return { models: [...rows.values()].sort((a,b) => a.label.localeCompare(b.label)), ...(failures.length ? { warning: `Could not read configured models: ${failures.join(', ')}` } : {}) }
}
