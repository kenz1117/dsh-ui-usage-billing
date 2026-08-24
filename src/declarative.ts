/**
 * 声明端点（declarative endpoints）：让用户为内置表没有的供应商自声明余额/额度接口，
 * 不用等插件发版。用户提供「数字在哪儿」的取值路径，而非「怎么取」——没有表达式、
 * 没有任何东西被求值，`fields` / `windows` 里写的只是响应 JSON 的点路径，唯一操作是
 * 逐层下钻。
 *
 * ## 为什么把安全边界写在代码里而不是建议里
 *
 * 这个功能让**配置文件**决定一个携带用户 API key 的请求发往哪里。风险全在此，靠
 * 「提醒用户小心」一点都没用：
 *
 * 1. `origin` 只是查找键：请求 URL 由**匹配到的 provider 的 origin** 构造，绝不由
 *    声明的 origin 自己决定。匹配不到任何已配置的 provider 就不发请求。
 * 2. `path` 必须单斜杠绝对路径：`//evil.example/x` 是协议相对 URL，`new URL()` 会
 *    把它解析到别的主机；构造后还会再校验一次 origin。
 * 3. 只发 GET，无请求体，无自定义 method / headers。
 * 4. 凭据仍从匹配 provider 自己的 `apiKeyEnv` 取，经同一凭据 seam 解析；声明不能
 *    指定任何凭据。
 * 5. 跨源重定向直接失败，不跟随——那是绕过第 1 条最省事的办法。
 * 6. 响应体有大小上限与共享超时，坏 / 恶意端点拖不住面板。
 * 7. 声明不能覆盖内置读法：只在内置表答不上来时它才轮到。
 *
 * 这类行会标 `declared`，因为数字来自用户自己写的路径——取错是配置问题，界面要让
 * 这一点看得出来；全部字段都没取到时给 `reason`，而不是留一张和「上游没返回」无从
 * 区分的空卡。
 */

import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import type { DeclaredEndpointConfig, DeclaredWindowConfig, ProviderBalance, SubscriptionWindow } from './pricing-shared.ts'
import { createCooldownGate, withRetry } from './resilience.ts'

/** Abort a declared fetch when the upstream hangs beyond this budget. */
const FETCH_TIMEOUT_MS = 8000

/** 响应体上限（字节）：坏 / 恶意端点不能拖住面板或耗尽内存。 */
const MAX_BODY_BYTES = 1_000_000

/** 声明端点查询的熔断门：按（匹配 provider origin + path）独立熔断，各端点互不干扰。 */
const declaredGate = createCooldownGate({ failures: 3, cooldownMs: 60_000 })

/** 会触及原型链的路径段：一律拒绝（读结果不是文档自带字段）。 */
const FORBIDDEN_SEGMENTS: ReadonlySet<string> = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * 归一化 baseURL 为可比的 origin：`scheme://host[:port]`，剥掉 scheme 的默认端口，
 * host 转小写，忽略路径。无法解析返回 undefined。
 * @param baseURL - provider 的端点地址，或声明里的 origin。
 */
export function normalizeDeclaredOrigin(baseURL: string): string | undefined {
  if (typeof baseURL !== 'string' || baseURL.trim() === '') return undefined
  let url: URL
  try {
    url = new URL(baseURL.trim())
  } catch {
    return undefined
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
  const defaultPort = url.protocol === 'https:' ? '443' : '80'
  const port = url.port === '' || url.port === defaultPort ? '' : `:${url.port}`
  return `${url.protocol}//${url.hostname.toLowerCase()}${port}`
}

/**
 * 沿点路径走进已解析的响应体。
 * 任何失败都是同一个答案 `undefined`——路径不匹配是这份响应没有那个字段，是卡片
 * 本来就渲染得了的事实，不是错误，而且不该让已解析成功的字段被牵连。
 * @param body - 已解析的响应 JSON。
 * @param path - 点路径（如 `data.balance`）。
 * @returns 路径处的值，或 undefined（路径缺失 / 中途不是对象 / 命中原型链）。
 */
export function readDeclaredPath(body: unknown, path: string): unknown {
  if (typeof path !== 'string' || path === '') return undefined
  let cursor: unknown = body
  for (const segment of path.split('.')) {
    if (cursor === null || typeof cursor !== 'object') return undefined
    if (FORBIDDEN_SEGMENTS.has(segment)) return undefined
    cursor = (cursor as Record<string, unknown>)[segment]
  }
  return cursor
}

/** 数字常以字符串抵达（如 `"110.00"`），统一转 number；非有限数返回 undefined。 */
function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

/** 百分比收敛到 0–100。 */
function clampPercent(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)) * 10) / 10
}

/** 解出一个窗口的已用百分比：usedPercent 路径 > usedRatio 路径 > used/limit 组合。 */
function windowUsedPercent(body: unknown, input: Readonly<DeclaredWindowConfig>): number | null {
  const ratio = typeof input.usedPercent === 'string' ? toNumber(readDeclaredPath(body, input.usedPercent)) : undefined
  if (ratio !== undefined) return clampPercent(ratio)
  const usageRatio = typeof input.usedRatio === 'string' ? toNumber(readDeclaredPath(body, input.usedRatio)) : undefined
  if (usageRatio !== undefined) return clampPercent(usageRatio * 100)
  const used = typeof input.used === 'string' ? toNumber(readDeclaredPath(body, input.used)) : undefined
  const total = typeof input.limit === 'string' ? toNumber(readDeclaredPath(body, input.limit)) : undefined
  if (used !== undefined && total !== undefined && total > 0) return clampPercent((used / total) * 100)
  return null
}

/**
 * 解出一个窗口的重置时刻：resetsAt 路径 > resetInSeconds 路径（now + 秒）推算。
 * @param body - 已解析的响应 JSON。
 * @param input - 窗口配置。
 * @param nowMs - 当前时刻（epoch ms）。
 * @returns ISO 时刻字符串，或 undefined。
 */
function windowResetsAt(body: unknown, input: { resetsAt?: string; resetInSeconds?: string }, nowMs: number): string | undefined {
  if (typeof input.resetsAt === 'string') {
    const value = readDeclaredPath(body, input.resetsAt)
    if (typeof value === 'string' && value !== '') return value
  }
  if (typeof input.resetInSeconds === 'string') {
    const seconds = toNumber(readDeclaredPath(body, input.resetInSeconds))
    if (seconds !== undefined && Number.isFinite(seconds) && seconds >= 0) {
      return new Date(nowMs + seconds * 1000).toISOString()
    }
  }
  return undefined
}

/** 把一条声明窗口配置解析成面板可渲染的滚动窗口；取不到已用百分比则不产出。 */
function resolveDeclaredWindow(body: unknown, input: Readonly<DeclaredWindowConfig>, nowMs: number): SubscriptionWindow | null {
  const used = windowUsedPercent(body, input)
  if (used === null) return null
  const remaining = clampPercent(Math.max(0, 100 - used))
  const resetsAt = windowResetsAt(body, input, nowMs)
  const remainingAmount = typeof input.used === 'string' && typeof input.limit === 'string'
    ? (() => {
        const u = toNumber(readDeclaredPath(body, input.used))
        const t = toNumber(readDeclaredPath(body, input.limit))
        return u !== undefined && t !== undefined ? t - u : undefined
      })()
    : undefined
  return {
    kind: input.kind ?? 'weekly' as const,
    usedPercent: used,
    remainingPercent: remaining,
    ...(resetsAt === undefined ? {} : { resetsAt }),
    ...(remainingAmount === undefined ? {} : { remaining: remainingAmount }),
  }
}

/**
 * 校验并编译一条声明端点：能否安全地给出一条查询方案。
 * 返回方案的 `read` 用匹配到 provider 的 origin 构造 URL；路径不合规（非单斜杠绝对）
 * 返回 undefined，该账户保持「unsupported」，这是真话，也是它没声明之前的样子。
 */
function compileDeclaredEndpoint(decl: { path?: string }) {
  const path = decl?.path
  // 规则 2：不以单个斜杠开头的要么是相对路径（会解析到 origin 自己的路径下，不是
  // 写的人本意），要么是协议相对 URL（那是披着路径外衣的另一台主机，`//host/x`）。
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return undefined
  return path
}

/**
 * 查询一组声明端点的余额/额度。每个声明独立成败，互不影响。
 * @param ctx - host context carrying the credentials seam.
 * @param providers - llm-pi-ai providers dict（`<route> → { baseURL?, apiKeyEnv? }`）。
 * @param declarations - 声明端点配置列表。
 * @returns 每个匹配到 provider 的声明一行结果；无匹配的声明不上报（不产生请求）。
 */
export async function queryDeclaredEndpoints(
  ctx: Context,
  providers: Readonly<Record<string, { baseURL?: string; apiKeyEnv?: string }>>,
  declarations: readonly DeclaredEndpointConfig[],
): Promise<readonly ProviderBalance[]> {
  const byOrigin = new Map<string, { apiKeyEnv?: string }>()
  for (const entry of Object.values(providers)) {
    const origin = entry.baseURL === undefined ? undefined : normalizeDeclaredOrigin(entry.baseURL)
    if (origin !== undefined && !byOrigin.has(origin)) byOrigin.set(origin, entry)
  }
  return await Promise.all(declarations.map(async (decl): Promise<ProviderBalance> => {
    const displayName = typeof decl.displayName === 'string' && decl.displayName !== '' ? decl.displayName : '已声明'
    const provider = `declared:${displayName}` as const
    const requestPath = compileDeclaredEndpoint(decl)
    if (requestPath === undefined) {
      return { provider, displayName, declared: true, error: 'invalid', reason: 'path 必须单斜杠绝对路径' }
    }
    // 规则 1：声明 origin 只是查找键，请求必须发往某条已配置的同源 provider；找不到就不查。
    const declOrigin = normalizeDeclaredOrigin(decl.origin)
    const matched = declOrigin === undefined ? undefined : byOrigin.get(declOrigin)
    if (matched === undefined) {
      return { provider, displayName, declared: true, error: 'unconfigured', reason: '未匹配到同源 provider（需先在 llm-pi-ai 配好 baseURL）' }
    }
    const gateKey = `${declOrigin}${requestPath}`
    if (!declaredGate.check(gateKey)) {
      return { provider, displayName, declared: true, error: 'unreachable' }
    }
    const hit = await ctx.credentials.resolve(credentialRef(matched.apiKeyEnv ?? ''))
    if (hit === undefined || hit.value === '') {
      return { provider, displayName, declared: true, error: 'unconfigured' }
    }
    // URL 由匹配 provider 的 origin 构造，规则 2 再次校验：构造后 origin 必须一致。
    const url = new URL(requestPath, declOrigin!)
    if (url.origin !== declOrigin) {
      return { provider, displayName, declared: true, error: 'invalid', reason: '跨源路径被拒绝' }
    }
    try {
      const body = await fetchDeclaredBody(url, decl.raw === true, hit.value)
      const fields = decl.fields ?? {}
      const total = typeof fields.total === 'string' ? toNumber(readDeclaredPath(body, fields.total)) : undefined
      const granted = typeof fields.granted === 'string' ? toNumber(readDeclaredPath(body, fields.granted)) : undefined
      const used = typeof fields.used === 'string' ? toNumber(readDeclaredPath(body, fields.used)) : undefined
      const currency = typeof fields.currency === 'string' ? readDeclaredPath(body, fields.currency) : undefined
      const plan = typeof fields.plan === 'string' ? readDeclaredPath(body, fields.plan) : undefined
      const windows = (decl.windows ?? []).map(w => resolveDeclaredWindow(body, w, Date.now())).filter((w): w is SubscriptionWindow => w !== null)
      declaredGate.success(gateKey)
      // 全部字段（金额 + 窗口）都没解析出来：声明路径写错，得说出来而不是留一张空卡。
      const nothingResolved = total === undefined && granted === undefined && used === undefined && windows.length === 0
      return {
        provider,
        displayName,
        declared: true,
        ...(total !== undefined ? { totalBalance: total } : {}),
        ...(granted !== undefined ? { grantedBalance: granted } : {}),
        ...(typeof currency === 'string' && currency !== '' ? { currency } : {}),
        ...(typeof plan === 'string' && plan !== '' ? { plan } : {}),
        ...(windows.length === 0 ? {} : { windows }),
        ...(nothingResolved ? { error: 'invalid' as const, reason: '声明路径未命中任何字段' } : {}),
      }
    } catch {
      declaredGate.fail(gateKey)
      return { provider, displayName, declared: true, error: 'unreachable' }
    }
  }))
}

/**
 * 带边界约束的 GET 请求：只 GET、跨源重定向直接失败、响应体上限、共享超时。
 * 401/403 → unauthorized（调用方判定）；其余非 2xx / 超限抛错（走 unreachable）。
 */
async function fetchDeclaredBody(url: URL, raw: boolean, apiKey: string): Promise<unknown> {
  const doRequest = async (): Promise<unknown> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { accept: 'application/json', ...(raw ? {} : { authorization: `Bearer ${apiKey}` }) },
        signal: controller.signal,
        redirect: 'manual',
      })
      // 规则 5：跨源重定向直接失败，不跟随。
      if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
        throw new HttpStatusError('redirect', 302)
      }
      if (response.status === 401 || response.status === 403) {
        throw new HttpStatusError('unauthorized', response.status)
      }
      if (!response.ok) throw new HttpStatusError('http-error', response.status)
      const text = await response.text()
      // 规则 6：响应体上限。
      if (text.length > MAX_BODY_BYTES) throw new HttpStatusError('body-too-large', 413)
      return JSON.parse(text) as unknown
    } finally {
      clearTimeout(timer)
    }
  }
  return await withRetry(doRequest, { retries: 1, baseDelayMs: 250, maxDelayMs: 2000 })
}

/** HTTP 状态错误：携带 statusCode，供调用方区分 unauthorized / 其它。 */
class HttpStatusError extends Error {
  readonly statusCode: number
  readonly kind: 'unauthorized' | 'redirect' | 'http-error' | 'body-too-large'
  constructor(kind: HttpStatusError['kind'], statusCode: number) {
    super(`${kind}:${String(statusCode)}`)
    this.kind = kind
    this.statusCode = statusCode
  }
}
