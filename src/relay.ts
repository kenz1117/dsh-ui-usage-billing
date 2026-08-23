/**
 * 中转站额度查询（node 半区）：识别并读取 New API 系与 Sub2API 的「余额 / 额度窗口」。
 *
 * 适用场景：用户把某条 llm-pi-ai provider 路由的 `baseURL` 指向第三方中转站
 * （New API / One API / VoAPI / Sub2API 等）。这类站点不卖官方余额，卖的是
 * 按 key 的额度（used/total）或多个滚动窗口。本模块对**配了 baseURL 且有
 * apiKeyEnv** 的路由逐个探测两个已知端点，能解析出额度就返回；解析不出的
 * 静默标记 unavailable，绝不臆造金额（与 balance/subscriptions 一致的姿态）。
 *
 * 探测顺序：先 Sub2API `/v1/usage`（标准化程度高），再 New API `/api/status`；
 * 404 = 不是该套程序，继续试下一种；401/403 = 是但 key 不对（unauthorized）；
 * 网络/5xx 走熔断门短路一段时间。同一站点多把 key 是独立额度，分别列出。
 */

import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import type { RelayQuota, SubscriptionStatus, SubscriptionWindow } from './pricing-shared.ts'
import { createCooldownGate, withRetry } from './resilience.ts'

/** 单个中转站额度请求的熔断门：按 baseURL 独立熔断（各站点互不干扰）。 */
const relayGate = createCooldownGate({ failures: 3, cooldownMs: 60_000 })

/** Abort a relay fetch when the upstream hangs beyond this budget. */
const FETCH_TIMEOUT_MS = 8000

/** 指纹识别缓存 TTL（毫秒）：识别结果低频变化，5 分钟内同 origin 不再重复探测。 */
const FINGERPRINT_TTL_MS = 5 * 60 * 1000

/** 每 origin 的识别结果缓存：`kind` 是识别出的中转站程序，`at` 是探测时刻。 */
const fingerprintCache = new Map<string, { kind: 'new-api' | 'sub2api' | 'unknown'; at: number }>()

/** 一个待探测的中转站路由（来自 llm-pi-ai providers 的 baseURL + apiKeyEnv）。 */
export interface RelayRoute {
  /** llm-pi-ai providers 路由名（key）。 */
  route: string
  /** 该路由配置的端点地址（origin 来源）。 */
  baseURL: string
  /** 该路由解析到的 apiKeyEnv 引用。 */
  apiKeyEnv: string
  /** 站点显示名；缺省用路由名。 */
  displayName?: string
}

/** Number, or null when the value is not a finite number (nor numeric string). */
function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

/** Clamp a percentage to 0–100. */
function clampPercent(value: number | null): number | null {
  return value === null ? null : Math.max(0, Math.min(100, value))
}

/** Round to one decimal. */
function round1(value: number): number {
  return Math.round(value * 10) / 10
}

/** Map a fetch error to a stable status (same taxonomy as subscriptions). */
function statusOf(error: unknown): SubscriptionStatus {
  if (error instanceof Error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') return 'unavailable'
    const status = (error as { httpStatus?: number }).httpStatus
    if (status === 401 || status === 403) return 'unauthorized'
    if (status === 429) return 'rate-limited'
    if (status === 404) return 'unavailable'
  }
  return 'unavailable'
}

/**
 * GET 一个中转站端点并返回 JSON。可重试错误（网络 / 5xx / 429）退避重试一次；
 * 401/403/404 不重试。返回 `{ ok, status, data }`，由调用方区分"不是这套程序
 * （404）"与"是但读取失败（其他非 2xx）"。
 */
async function fetchRelayJson(url: string, apiKey: string): Promise<{ ok: boolean; status: number; data?: unknown }> {
  const doFetch = async (): Promise<{ ok: boolean; status: number; data?: unknown }> => {
    const response = await fetch(url, {
      headers: { accept: 'application/json', authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!response.ok) {
      if (response.status === 404) return { ok: false, status: 404 }
      const error = new Error(`HTTP ${String(response.status)}`)
      ;(error as { httpStatus?: number }).httpStatus = response.status
      throw error
    }
    return { ok: true, status: response.status, data: await response.json() }
  }
  return await withRetry(doFetch, { retries: 1, baseDelayMs: 250, maxDelayMs: 2000 })
}

/** 新建一个额度窗口行（未解析出百分比时不产出）。 */
function windowOf(kind: SubscriptionWindow['kind'], usedPercent: number | null, resetsAt?: string): SubscriptionWindow | null {
  const used = clampPercent(usedPercent)
  if (used === null) return null
  return {
    kind,
    usedPercent: round1(used),
    remainingPercent: round1(Math.max(0, 100 - used)),
    ...(resetsAt === undefined ? {} : { resetsAt }),
  }
}

/**
 * 解析 Sub2API `/v1/usage` 响应：能取到 balance 或 quota/used 就识别为 sub2api。
 * 三种形态（窗口 / 分组 / 钱包余额）都宽容处理：有 `quota/total` 给出窗口，
 * 有 `balance` 给出余额，两者可同时存在。
 * @param data - `/v1/usage` 的 JSON 响应。
 * @returns 解析结果；两者都取不到返回 null（不是 Sub2API 或响应漂移）。
 */
export function parseSub2ApiUsage(data: unknown): { balance?: number; windows?: readonly SubscriptionWindow[] } | null {
  if (data === null || typeof data !== 'object') return null
  const doc = data as { balance?: unknown; quota?: unknown; total_quota?: unknown; limit?: unknown; used_quota?: unknown; usage?: unknown }
  const balance = numberOrNull(doc.balance)
  const total = numberOrNull(doc.quota ?? doc.total_quota ?? doc.limit)
  const used = numberOrNull(doc.used_quota ?? doc.usage)
  if (balance === null && total === null) return null
  const windows: SubscriptionWindow[] = []
  if (total !== null && used !== null) {
    const pct = (used / total) * 100
    const window = windowOf('weekly', Number.isFinite(pct) ? pct : null)
    if (window !== null) windows.push(window)
  }
  return {
    ...(balance !== null ? { balance } : {}),
    ...(windows.length === 0 ? {} : { windows }),
  }
}

/**
 * 解析 New API `/api/status` 响应：New API 系（One API / VoAPI 分支）的额度是
 * 按记录行的 ratio（已用比例）。只给出窗口，不猜金额（币种防猜）。
 * @param data - `/api/status` 的 JSON 响应。
 * @returns 窗口；取不到比例返回 null（响应漂移）。
 */
export function parseNewApiStatus(data: unknown): { windows?: readonly SubscriptionWindow[] } | null {
  if (data === null || typeof data !== 'object') return null
  const doc = data as { data?: { ratio?: unknown; used_quota?: unknown; quota?: unknown; total_quota?: unknown; log?: unknown } }
  const inner = doc.data
  if (inner === null || typeof inner !== 'object') return null
  // ratio 是 0–1 的已用比例（New API 记录行常用）；缺省用 used/total 兜底。
  const ratio = numberOrNull(inner.ratio)
  const used = numberOrNull(inner.used_quota)
  const total = numberOrNull(inner.total_quota ?? inner.quota)
  let pct: number | null = null
  if (ratio !== null) pct = ratio * 100
  else if (total !== null && used !== null) pct = (used / total) * 100
  if (pct === null) return null
  const window = windowOf('billing', Number.isFinite(pct) ? pct : null)
  return window === null ? null : { windows: [window] }
}

/** 归一化站点 origin（与聚合层 `siteOriginOf` 同口径）。 */
function originOf(baseURL: string): string {
  try {
    return new URL(baseURL).origin
  } catch {
    return baseURL
  }
}

/** 构造端点 URL：`/v1/usage` 与 `/api/status` 都以 baseURL 为宿主解析。 */
function endpointOf(baseURL: string, path: string): string {
  return new URL(path, baseURL).toString()
}

/**
 * 查询单个中转站路由的额度。先试 Sub2API，再试 New API；任一读出额度即返回。
 * @param ctx - host context carrying the credentials seam.
 * @param route - 待探测的路由（baseURL + apiKeyEnv）。
 * @returns 该路由的一行额度结果（status 标记成败）。
 */
export async function queryRelayQuota(ctx: Context, route: RelayRoute): Promise<RelayQuota> {
  const base = { route: route.route, origin: originOf(route.baseURL), displayName: route.displayName ?? route.route }
  // 熔断 key 按「站点 + key」维度：同一中转站多把 key 是独立额度，一把失败不应熔断整站。
  const gateKey = `${route.baseURL}::${route.apiKeyEnv}`
  if (!relayGate.check(gateKey)) return { ...base, kind: 'unknown', status: 'unavailable' }
  const hit = await ctx.credentials.resolve(credentialRef(route.apiKeyEnv))
  if (hit === undefined || hit.value === '') return { ...base, kind: 'unknown', status: 'not-configured' }

  // 指纹识别缓存：5 分钟内同 origin 已识别过则直接用结果，不再重复探测。
  const cached = fingerprintCache.get(base.origin)
  if (cached !== undefined && Date.now() - cached.at < FINGERPRINT_TTL_MS) {
    return { ...base, kind: cached.kind, status: 'ok' }
  }

  try {
    // 1) Sub2API `/v1/usage`
    const sub2 = await fetchRelayJson(endpointOf(route.baseURL, '/v1/usage'), hit.value)
    if (sub2.ok) {
      const parsed = parseSub2ApiUsage(sub2.data)
      if (parsed !== null) {
        relayGate.success(gateKey)
        fingerprintCache.set(base.origin, { kind: 'sub2api', at: Date.now() })
        return {
          ...base,
          kind: 'sub2api',
          status: 'ok',
          ...(parsed.balance !== undefined ? { balance: parsed.balance } : {}),
          ...(parsed.windows !== undefined ? { windows: parsed.windows } : {}),
        }
      }
      // 2xx 却没解析出额度：响应漂移，标记 invalid 而不继续猜。
      relayGate.fail(gateKey)
      return { ...base, kind: 'sub2api', status: 'invalid-response' }
    }
    // Sub2API 端点返回 401/403：是 Sub2API 但 key 不对，不再试 New API。
    if (sub2.status === 401 || sub2.status === 403) {
      relayGate.fail(gateKey)
      return { ...base, kind: 'unknown', status: 'unauthorized' }
    }

    // 2) New API `/api/status`
    const na = await fetchRelayJson(endpointOf(route.baseURL, '/api/status'), hit.value)
    if (na.status === 401 || na.status === 403) {
      relayGate.fail(gateKey)
      return { ...base, kind: 'unknown', status: 'unauthorized' }
    }
    if (na.ok) {
      const parsed = parseNewApiStatus(na.data)
      if (parsed !== null) {
        relayGate.success(gateKey)
        fingerprintCache.set(base.origin, { kind: 'new-api', at: Date.now() })
        return { ...base, kind: 'new-api', status: 'ok', ...(parsed.windows !== undefined ? { windows: parsed.windows } : {}) }
      }
      relayGate.fail(gateKey)
      return { ...base, kind: 'new-api', status: 'invalid-response' }
    }
    // 两个端点都不是这套程序（404）或不可达。
    relayGate.fail(gateKey)
    return { ...base, kind: 'unknown', status: 'unavailable' }
  } catch (error) {
    relayGate.fail(gateKey)
    return { ...base, kind: 'unknown', status: statusOf(error) }
  }
}

/**
 * 批量查询多个中转站路由的额度（每个独立成败，互不影响）。
 * @param ctx - host context carrying the credentials seam.
 * @param routes - 配了 baseURL 且 apiKeyEnv 有值的路由列表。
 * @returns 每个路由一行的额度结果。
 */
export async function queryRelayQuotas(ctx: Context, routes: readonly RelayRoute[]): Promise<readonly RelayQuota[]> {
  return await Promise.all(routes.map(async route => queryRelayQuota(ctx, route)))
}
