/**
 * Account-balance queries for the billing dashboard.
 *
 * Only providers with a public balance endpoint can report one. Today that is
 * DeepSeek, Moonshot/Kimi, StepFun, SiliconFlow, and xAI (Grok) — all Bearer
 * 鉴权 with a documented JSON shape; the other mainstream providers expose no
 * standard balance API (or require a non-Bearer auth flow), so their rows in
 * the model table show an unavailable state. The lookup map below is the
 * extension point for future providers.
 *
 * API keys are read from the `llm-pi-ai` settings namespace (`providers.<id>.apiKeyEnv`),
 * the same source the subscription adapter uses, so a deployment configures a
 * provider's key once and every surface reuses it.
 */

import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import type { CustomBalanceConfig, CustomBalanceExtract, ProviderBalance } from './pricing-shared.ts'
import { createCooldownGate, withRetry } from './resilience.ts'

/** Abort a balance fetch when the upstream hangs beyond this budget. */
const FETCH_TIMEOUT_MS = 8000

/**
 * 每平台熔断门：单个 provider 连续可重试失败（网络波动 / 5xx / 429）达阈值后
 * 短路一段真实时间，避免 30 秒轮询在已不可用的上游上反复打满超时。
 * 鉴权失败（unauthorized）是配置问题而非暂时故障，不计入熔断。
 */
const balanceGate = createCooldownGate({ failures: 3, cooldownMs: 60_000 })

/** 自定义 Provider 余额的熔断门：按端点 URL 独立熔断（各配置端点互不干扰）。 */
const customGate = createCooldownGate({ failures: 3, cooldownMs: 60_000 })

/** DeepSeek 官方余额接口（官方文档 api-docs.deepseek.com/api/get-user-balance）。 */
const DEEPSEEK_BALANCE_URL = 'https://api.deepseek.com/user/balance'

/** Moonshot/Kimi 官方余额接口（platform.kimi.com/docs/api/balance）。 */
const MOONSHOT_BALANCE_URL = 'https://api.moonshot.cn/v1/users/me/balance'

/** 阶跃星辰 StepFun 官方账户信息接口（platform.stepfun.com/docs/api-reference/accounts/get）。 */
const STEPFUN_BALANCE_URL = 'https://api.stepfun.com/v1/accounts'

/** 硅基流动 SiliconFlow 官方用户信息接口（docs.siliconflow.cn/cn/api-reference/user/query-user-info）。 */
const SILICONFLOW_BALANCE_URL = 'https://api.siliconflow.cn/v1/user/info'

/** xAI 官方账单接口（docs.x.ai/developers/api/credits）；total.val 为美分。 */
const XAI_CREDITS_URL = 'https://api.x.ai/v1/billing/credits'

/** 数字归一化：接口返回的余额是字符串（如 `"110.00"`），统一转 number。 */
function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

/**
 * Fetch a Bearer-protected balance endpoint and normalize the HTTP outcome into
 * a shared {@link ProviderBalance} row. Each provider supplies its own
 * response parser for the success body.
 * @param ctx - host context carrying the credentials seam.
 * @param url - the balance endpoint.
 * @param apiKeyEnv - credential reference resolving the API key.
 * @param provider - the provider id (matches the model-table vendor display name).
 * @param displayName - human-readable provider name.
 * @param parse - maps a success JSON body to the balance row fields.
 * @returns the balance row, or an error row when the key/endpoint misbehaves.
 */
async function queryBearerBalance(
  ctx: Context,
  url: string,
  apiKeyEnv: string,
  provider: string,
  displayName: string,
  parse: (data: unknown) => ProviderBalance,
): Promise<ProviderBalance> {
  const hit = await ctx.credentials.resolve(credentialRef(apiKeyEnv))
  if (hit === undefined) {
    return { provider, displayName, error: 'unconfigured' }
  }
  // 熔断：该 platform 正处于冷却（连续失败）时，直接短路为 unconfigured 之外的
  // 稳定不可用态，不再打上游。success/fail 在下方按请求结果上报。
  if (!balanceGate.check(provider)) {
    return { provider, displayName, error: 'unreachable' }
  }
  // 单次请求：每次 attempt 用独立 AbortController，避免上一次超时 abort 污染重试。
  const doRequest = async (): Promise<ProviderBalance> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      const response = await fetch(url, {
        headers: { accept: 'application/json', authorization: `Bearer ${hit.value}` },
        signal: controller.signal,
      })
      if (response.status === 401 || response.status === 403) {
        return { provider, displayName, error: 'unauthorized' }
      }
      if (!response.ok) {
        const error = new Error(`HTTP ${String(response.status)}`)
        ;(error as { httpStatus?: number }).httpStatus = response.status
        throw error
      }
      const row = parse(await response.json())
      // P0-1 结构偏移探测：接口返回 2xx 却一个余额字段都没解析出来，视为上游改版/
      // 漂移。与"网络不可达"分离，标记 invalid 并告警，便于定位是上游变更。
      if (
        row.totalBalance === undefined &&
        row.grantedBalance === undefined &&
        row.toppedUpBalance === undefined &&
        row.isAvailable === undefined
      ) {
        console.warn(`[usage-billing] balance response drifted for ${displayName}: no balance field parsed from ${url}`)
        return { ...row, error: 'invalid' }
      }
      return row
    } finally {
      clearTimeout(timer)
    }
  }
  try {
    const row = await withRetry(doRequest, { retries: 1, baseDelayMs: 250, maxDelayMs: 2000 })
    balanceGate.success(provider)
    return row
  } catch {
    balanceGate.fail(provider)
    return { provider, displayName, error: 'unreachable' }
  }
}

/**
 * Query the DeepSeek account balance.
 * @param ctx - host context carrying the credentials seam.
 * @param apiKeyEnv - credential reference resolving the DeepSeek API key.
 * @returns the balance row, or an error row when the key/endpoint misbehaves.
 */
function queryDeepSeek(ctx: Context, apiKeyEnv: string): Promise<ProviderBalance> {
  return queryBearerBalance(ctx, DEEPSEEK_BALANCE_URL, apiKeyEnv, 'deepseek', 'DeepSeek', (data) => {
    const doc = data as { is_available?: unknown; balance_infos?: unknown }
    const infos = Array.isArray(doc.balance_infos) ? doc.balance_infos : []
    const info = infos[0] as {
      currency?: unknown
      total_balance?: unknown
      granted_balance?: unknown
      topped_up_balance?: unknown
    } | undefined
    const currency = typeof info?.currency === 'string' ? info.currency : undefined
    const totalBalance = toNumber(info?.total_balance)
    const grantedBalance = toNumber(info?.granted_balance)
    const toppedUpBalance = toNumber(info?.topped_up_balance)
    const isAvailable = typeof doc.is_available === 'boolean' ? doc.is_available : undefined
    return {
      provider: 'deepseek',
      displayName: 'DeepSeek',
      // exactOptionalPropertyTypes: 只携带有值的可选字段。
      ...(currency !== undefined ? { currency } : {}),
      ...(totalBalance !== undefined ? { totalBalance } : {}),
      ...(grantedBalance !== undefined ? { grantedBalance } : {}),
      ...(toppedUpBalance !== undefined ? { toppedUpBalance } : {}),
      ...(isAvailable !== undefined ? { isAvailable } : {}),
    }
  })
}

/**
 * Query the Moonshot/Kimi account balance.
 * @param ctx - host context carrying the credentials seam.
 * @param apiKeyEnv - credential reference resolving the Moonshot API key.
 * @returns the balance row, or an error row when the key/endpoint misbehaves.
 */
function queryMoonshot(ctx: Context, apiKeyEnv: string): Promise<ProviderBalance> {
  return queryBearerBalance(ctx, MOONSHOT_BALANCE_URL, apiKeyEnv, '月之暗面', '月之暗面', (data) => {
    const doc = data as { data?: { available_balance?: unknown; voucher_balance?: unknown; cash_balance?: unknown } }
    const totalBalance = toNumber(doc.data?.available_balance)
    const grantedBalance = toNumber(doc.data?.voucher_balance)
    const toppedUpBalance = toNumber(doc.data?.cash_balance)
    return {
      provider: '月之暗面',
      displayName: '月之暗面',
      currency: 'CNY',
      ...(totalBalance !== undefined ? { totalBalance } : {}),
      ...(grantedBalance !== undefined ? { grantedBalance } : {}),
      ...(toppedUpBalance !== undefined ? { toppedUpBalance } : {}),
    }
  })
}

/**
 * Query the StepFun (阶跃星辰) account balance.
 * @param ctx - host context carrying the credentials seam.
 * @param apiKeyEnv - credential reference resolving the StepFun API key.
 * @returns the balance row, or an error row when the key/endpoint misbehaves.
 */
function queryStepFun(ctx: Context, apiKeyEnv: string): Promise<ProviderBalance> {
  return queryBearerBalance(ctx, STEPFUN_BALANCE_URL, apiKeyEnv, '阶跃星辰', '阶跃星辰', (data) => {
    const doc = data as { balance?: unknown; total_cash_balance?: unknown; total_voucher_balance?: unknown }
    const totalBalance = toNumber(doc.balance)
    const toppedUpBalance = toNumber(doc.total_cash_balance)
    const grantedBalance = toNumber(doc.total_voucher_balance)
    return {
      provider: '阶跃星辰',
      displayName: '阶跃星辰',
      currency: 'CNY',
      ...(totalBalance !== undefined ? { totalBalance } : {}),
      ...(toppedUpBalance !== undefined ? { toppedUpBalance } : {}),
      ...(grantedBalance !== undefined ? { grantedBalance } : {}),
    }
  })
}

/**
 * Query the SiliconFlow (硅基流动) account balance.
 * @param ctx - host context carrying the credentials seam.
 * @param apiKeyEnv - credential reference resolving the SiliconFlow API key.
 * @returns the balance row, or an error row when the key/endpoint misbehaves.
 */
function querySiliconFlow(ctx: Context, apiKeyEnv: string): Promise<ProviderBalance> {
  return queryBearerBalance(ctx, SILICONFLOW_BALANCE_URL, apiKeyEnv, '硅基流动', '硅基流动', (data) => {
    const doc = data as { data?: { balance?: unknown; balance_cny?: unknown }; balance?: unknown; balance_cny?: unknown }
    const inner = doc.data ?? doc
    const totalBalance = toNumber((inner as { balance?: unknown }).balance ?? (inner as { balance_cny?: unknown }).balance_cny)
    return {
      provider: '硅基流动',
      displayName: '硅基流动',
      currency: 'CNY',
      ...(totalBalance !== undefined ? { totalBalance } : {}),
    }
  })
}

/**
 * Query the xAI (Grok) credit balance.
 * @param ctx - host context carrying the credentials seam.
 * @param apiKeyEnv - credential reference resolving the xAI API key.
 * @returns the balance row, or an error row when the key/endpoint misbehaves.
 */
function queryXai(ctx: Context, apiKeyEnv: string): Promise<ProviderBalance> {
  return queryBearerBalance(ctx, XAI_CREDITS_URL, apiKeyEnv, 'xAI', 'xAI', (data) => {
    const doc = data as { total?: { val?: unknown } }
    // `total.val` 是美分：预付余额以负数返回，转正后除以 100 得美元。
    const cents = toNumber(doc.total?.val)
    const totalBalance = cents === undefined ? undefined : Math.abs(cents) / 100
    return {
      provider: 'xAI',
      displayName: 'xAI',
      currency: 'USD',
      ...(totalBalance !== undefined ? { totalBalance } : {}),
    }
  })
}

/**
 * One balance querier plus the llm-pi-ai provider route id it reads its key
 * from. The `provider` field is the model-table vendor display name, so
 * `balanceFor` matches by normalization; `route` is the llm-pi-ai providers
 * dict key carrying the `apiKeyEnv`.
 */
interface BalanceQuerier {
  /** llm-pi-ai providers dict key whose `apiKeyEnv` resolves this provider's key. */
  route: string
  /** 厂商显示名（模型表 vendor 名），未配置时报未配置时同时用作 provider id。 */
  displayName: string
  /** 余额查询器；`apiKeyEnv` 为该 route 解析到的凭据引用（缺失时查未配置）。 */
  querier: (ctx: Context, apiKeyEnv: string) => Promise<ProviderBalance>
}

const QUERIERS: readonly BalanceQuerier[] = [
  { route: 'deepseek', displayName: 'deepseek', querier: queryDeepSeek },
  { route: 'moonshot', displayName: '月之暗面', querier: queryMoonshot },
  { route: 'stepfun', displayName: '阶跃星辰', querier: queryStepFun },
  { route: 'siliconflow', displayName: '硅基流动', querier: querySiliconFlow },
  { route: 'xai', displayName: 'xAI', querier: queryXai },
]

/**
 * Query every configured provider's account balance. A provider is queried only
 * when its llm-pi-ai route has an `apiKeyEnv`; absent routes answer
 * `unconfigured` so the dashboard shows a stable state instead of dropping the row.
 * @param ctx - host context carrying the credentials seam.
 * @param providers - the llm-pi-ai providers dict (`<route> → { apiKeyEnv? }`).
 * @returns the balance rows (one per provider).
 */
export async function queryBalances(
  ctx: Context,
  providers: Readonly<Record<string, { apiKeyEnv?: string }>>,
): Promise<readonly ProviderBalance[]> {
  return await Promise.all(QUERIERS.map(({ route, querier, displayName }) => {
    const env = providers[route]?.apiKeyEnv
    // 未配置 key 的 route 直接标未配置，不走 credentialRef（空 env 会被其拒绝）。
    if (typeof env !== 'string' || env === '') {
      return Promise.resolve({ provider: displayName, displayName, error: 'unconfigured' as const })
    }
    return querier(ctx, env)
  }))
}

// ── 自定义 Provider 余额（任意 HTTP 端点 + extract 规则）──────────────────

/** 点路径取值：`data.total_available` → 逐层下钻；任一缺失返回 undefined。 */
function getPath(data: unknown, path: string): unknown {
  let cursor = data
  for (const segment of path.split('.')) {
    if (cursor === null || typeof cursor !== 'object') return undefined
    cursor = (cursor as Record<string, unknown>)[segment]
  }
  return cursor
}

/**
 * 按 extract 规则从响应 JSON 求值。导出供测试：纯函数。
 * @param rule - 提取规则（const / path / add / subtract / divide）。
 * @param data - 响应 JSON。
 * @returns 数值；取不到或结果非有限数返回 undefined。
 */
export function evalExtract(rule: CustomBalanceExtract, data: unknown): number | undefined {
  if (typeof rule.const === 'number' && Number.isFinite(rule.const)) return rule.const
  if (rule.op === 'add' || rule.op === 'subtract') {
    const paths = rule.paths ?? []
    if (paths.length === 0) return undefined
    let total: number | undefined
    for (const path of paths) {
      const value = toNumber(getPath(data, path))
      if (value === undefined) return undefined
      total = total === undefined ? value : (rule.op === 'add' ? total + value : total - value)
    }
    return total
  }
  const base = typeof rule.path === 'string' ? toNumber(getPath(data, rule.path)) : undefined
  if (base === undefined) return undefined
  if (rule.op === 'divide') {
    const by = rule.by
    if (typeof by !== 'number' || !Number.isFinite(by) || by === 0) return undefined
    return base / by
  }
  return base
}

/** 请求头占位符解析：`{{ENV_NAME}}` 经凭据 seam 替换；解析失败返回 null。 */
async function resolveHeaders(ctx: Context, headers: Record<string, string>): Promise<Record<string, string> | null> {
  const resolved: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    const match = /^\{\{([A-Z0-9_]+)\}\}$/i.exec(value.trim())
    if (match === null) {
      resolved[key] = value
      continue
    }
    const hit = await ctx.credentials.resolve(credentialRef(match[1] ?? ''))
    if (hit === undefined || hit.value === '') return null
    resolved[key] = value.replace(match[0], hit.value)
  }
  return resolved
}

/**
 * 查询自定义 Provider 余额（插件 config 的 `customBalances`）。每个条目独立
 * 成败：占位符凭据缺失 → unconfigured；401/403 → unauthorized；网络或提取
 * 失败 → unreachable。
 * @param ctx - host context carrying the credentials seam.
 * @param configs - 自定义余额配置列表。
 * @returns 每个配置一行的余额结果。
 */
export async function queryCustomBalances(
  ctx: Context,
  configs: readonly CustomBalanceConfig[],
): Promise<readonly ProviderBalance[]> {
  return await Promise.all(configs.map(async (config): Promise<ProviderBalance> => {
    const provider = `custom:${config.label}`
    const displayName = config.label
    if (typeof config.url !== 'string' || config.url === '') {
      return { provider, displayName, error: 'unconfigured' }
    }
    const headers = await resolveHeaders(ctx, config.headers ?? {})
    if (headers === null) return { provider, displayName, error: 'unconfigured' }
    if (!customGate.check(config.url)) return { provider, displayName, error: 'unreachable' }
    const doRequest = async (): Promise<ProviderBalance> => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
      try {
        const response = await fetch(config.url, {
          method: config.method ?? 'GET',
          headers: { accept: 'application/json', ...headers },
          signal: controller.signal,
        })
        if (response.status === 401 || response.status === 403) {
          return { provider, displayName, error: 'unauthorized' }
        }
        if (!response.ok) {
          const error = new Error(`HTTP ${String(response.status)}`)
          ;(error as { httpStatus?: number }).httpStatus = response.status
          throw error
        }
        const remaining = evalExtract(config.extract.remaining, await response.json())
        // 提取规则未命中任何字段：配置的 path 写错或上游改版，标记 invalid 而非网络问题。
        if (remaining === undefined) return { provider, displayName, error: 'invalid' }
        return {
          provider,
          displayName,
          currency: config.unit ?? 'CNY',
          totalBalance: remaining,
        }
      } finally {
        clearTimeout(timer)
      }
    }
    try {
      const row = await withRetry(doRequest, { retries: 1, baseDelayMs: 250, maxDelayMs: 2000 })
      customGate.success(config.url)
      return row
    } catch {
      customGate.fail(config.url)
      return { provider, displayName, error: 'unreachable' }
    }
  }))
}
