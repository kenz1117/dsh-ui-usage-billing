/**
 * Usage billing surface plugin, node half.
 *
 * Serves `/api/billing/usage-stats`: real usage aggregated from every
 * persisted session log (see `aggregate.ts`) — the browser dashboard reads it
 * instead of showing an empty snapshot. When `sessionPersistence` is
 * unavailable (or aggregation fails), the configured `statsPath` /
 * `DSH_USAGE_STATS` / conventional JSON file is served as a fallback, and a
 * missing file answers `{ error }` so the dashboard shows zeros, never
 * fabricated samples.
 */

import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
// Type-only: merges the ctx.sessionPersistence service declaration.
import type {} from '@deepseek-ai/dsh-session-persistence'
import type {} from '@deepseek-ai/dsh-host-webserver'
// Type-only: merges the ctx.settings / ctx.credentials service declarations.
import type {} from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/dsh-credentials'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import type { SettingsProvider } from '@deepseek-ai/dsh-settings'
import { createUsageAggregator } from './aggregate.ts'
import { queryBalances } from './balance.ts'
import { fetchLivePricing } from './pricing-fetch.ts'
import type { LivePricing } from './pricing-shared.ts'
import { collectSubscriptions, EMPTY_SUBSCRIPTION_KEYS, identifySubscriptionPlans, type IdentifiedSubscriptionPlan, type SubscriptionKeys, type SubscriptionPlanConfig, type SubscriptionQuota } from './subscriptions.ts'

/** Plugin configuration. */
export interface UsageBillingConfig {
  /** Absolute path to a `.dsh-usage-stats.json` fallback file. */
  statsPath?: string
  /** 订阅制（coding / token / agent plan）provider id 列表；默认 kimi-coding、xiaomi-token-plan-cn。 */
  subscriptionProviders?: string[]
  /** 订阅套餐额度适配器（kimi / zai / opencode-go）；默认全部内置。 */
  subscriptionPlans?: readonly SubscriptionPlanConfig[]
  /** 余额查询用的 DeepSeek 凭据引用（环境变量名）；默认 DEEPSEEK_API_KEY。 */
  balanceApiKeyEnv?: string
  /** 月度预算（人民币元）；设置后随 usage-stats 下发，仪表盘显示预算进度条。 */
  monthlyBudget?: number
  /** 余额不足告警阈值（人民币元）：余额低于此值时仪表盘每天提醒一次；
      不设置则客户端按默认阈值（50 元）兜底。 */
  lowBalanceThreshold?: number
}

/** 实时定价的后台刷新间隔（毫秒）：汇率/模型价低频变化，6 小时一次足够。 */
const PRICING_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000

/** 订阅套餐额度缓存时长（毫秒）：上游配额 API 低频变化，5 分钟足够。 */
const SUBSCRIPTION_CACHE_MS = 5 * 60 * 1000

/** DeepSeek 余额查询的默认凭据引用（与 llm-deepseek 的默认引用一致）。 */
const DEFAULT_BALANCE_API_KEY_ENV = 'DEEPSEEK_API_KEY'

/** Required services: the web server, the persisted session log store, and user settings. */
export const inject = ['webServer', 'sessionPersistence', 'credentials', 'settings']

/**
 * 订阅 provider id（llm-pi-ai 设置键）→ billing 适配器 key 的映射。
 * 复用 dsh 既有的 llm-pi-ai provider 配置（apiKeyEnv 引用），不引入新配置面。
 */
const SUBSCRIPTION_KEY_SOURCES: ReadonlyArray<{ provider: string; key: keyof SubscriptionKeys }> = [
  { provider: 'kimi-coding', key: 'kimiApiKey' },
  { provider: 'zai-coding-cn', key: 'zaiApiKey' },
  { provider: 'opencode', key: 'opencodeApiKey' },
  { provider: 'opencode-go', key: 'opencodeApiKey' },
]

/**
 * 解析订阅适配器需要的 API Key：从 llm-pi-ai 设置的 `providers.<id>.apiKeyEnv`
 * 读引用（如 kimi-coding → KIMI_CODING_API_KEY），再经凭据 seam 解析成实际值。
 * 同时识别出用户配置了 key 的订阅套餐（供面板只显示已识别的）。
 * @param settings - the settings service (reads the llm-pi-ai namespace).
 * @param credentials - the credentials service (resolves the env refs).
 */
export async function resolveSubscriptionKeys(settings: SettingsProvider, credentials: CredentialProvider): Promise<{ keys: SubscriptionKeys; identified: IdentifiedSubscriptionPlan[] }> {
  const keys: SubscriptionKeys = { ...EMPTY_SUBSCRIPTION_KEYS }
  let providers: Record<string, { apiKeyEnv?: string }> | undefined
  try {
    const descriptors = settings.describe({ redactSecrets: true })
    const pi = descriptors.find(descriptor => descriptor.ns === 'llm-pi-ai')?.value
    providers = (pi as { providers?: Record<string, { apiKeyEnv?: string }> } | null | undefined)?.providers
  } catch {
    // 设置服务异常时按全空 key 处理（订阅面板显示未配置）。
    return { keys, identified: [] }
  }
  for (const { provider, key } of SUBSCRIPTION_KEY_SOURCES) {
    const env = providers?.[provider]?.apiKeyEnv
    if (typeof env !== 'string' || env === '') continue
    try {
      const resolved = await credentials.resolve(credentialRef(env))
      if (resolved?.value !== undefined && resolved.value !== '') keys[key] = resolved.value
    } catch {
      // 凭据解析失败跳过该 provider（保持未配置）。
    }
  }
  // zai-coding-cn 是智谱国内域：跟随它时区域固定为 bigmodel-cn。
  if (providers?.['zai-coding-cn']?.apiKeyEnv !== undefined && keys.zaiApiKey !== '') {
    keys.zaiRegion = 'bigmodel-cn'
  }
  return { keys, identified: identifySubscriptionPlans(providers) }
}

/**
 * Host plugin body: serve real aggregated usage to the browser dashboard.
 * @param ctx - host context carrying webServer and sessionPersistence.
 * @param config - optional statsPath override.
 */
export function apply(ctx: Context, config: UsageBillingConfig = {}): void {
  // 常驻增量聚合器：按会话缓存折叠结果（日志 mtime+size 失效），
  // 前端 30 秒轮询只重算写过的会话。
  const aggregator = createUsageAggregator(ctx.sessionPersistence, {
    ...(config.subscriptionProviders === undefined
      ? {}
      : { subscriptionProviders: config.subscriptionProviders }),
  })
  const cwd = process.cwd()
  const candidates = [
    config.statsPath,
    process.env.DSH_USAGE_STATS,
    join(cwd, '.dsh-usage-stats.json'),
    join(homedir(), '.dsh/.dsh-usage-stats.json'),
  ].filter((path): path is string => typeof path === 'string' && path.length > 0)

  // 后台拉取实时定价（汇率 + OpenRouter 模型价），失败自动降级内置目录；
  // 之后每 6 小时刷新一次，汇率/价格无需重启进程就能保持最新。
  let live: LivePricing = { source: 'builtin' }
  const refreshPricing = async (): Promise<void> => {
    live = await fetchLivePricing()
  }
  void refreshPricing()
  ctx.effect(
    () => {
      const timer = setInterval(() => { void refreshPricing() }, PRICING_REFRESH_INTERVAL_MS)
      return () => { clearInterval(timer) }
    },
    'usage-billing: pricing refresh timer',
  )

  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: '/api/billing/pricing',
      handler: async (_req, res) => {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify(live))
      },
    }),
    'usage-billing: pricing route',
  )

  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: '/api/billing/balance',
      handler: async (_req, res) => {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        const balances = await queryBalances(ctx, config.balanceApiKeyEnv ?? DEFAULT_BALANCE_API_KEY_ENV)
        res.end(JSON.stringify({ balances }))
      },
    }),
    'usage-billing: balance route',
  )

  // 订阅套餐额度：外部 API 低频变化，缓存 5 分钟避免每次轮询都打上游。
  // 只返回"识别到"的套餐：有额度适配器的查剩余量，无适配器的保留识别行
  //（客户端显示"额度接口未接入"）；用户没配置 key 的 provider 一律不出现。
  let quotaCache: { at: number; quotas: readonly SubscriptionQuota[] } = { at: 0, quotas: [] }
  const refreshQuotas = async (): Promise<void> => {
    const { keys, identified } = await resolveSubscriptionKeys(ctx.settings, ctx.credentials)
    const plans = identified
      .filter(item => item.adapter)
      .map(item => ({ provider: item.provider, ...(item.region === undefined ? {} : { region: item.region }) }))
    const queried = await collectSubscriptions(keys, plans)
    const rows: SubscriptionQuota[] = [...queried]
    for (const item of identified) {
      if (!item.adapter) rows.push({ provider: item.provider, displayName: item.displayName, status: 'ok', windows: [] })
    }
    quotaCache = { at: Date.now(), quotas: rows }
  }
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: '/api/billing/subscriptions',
      handler: async (_req, res) => {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        if (Date.now() - quotaCache.at >= SUBSCRIPTION_CACHE_MS) await refreshQuotas()
        res.end(JSON.stringify({ quotas: quotaCache.quotas }))
      },
    }),
    'usage-billing: subscriptions route',
  )

  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: '/api/billing/usage-stats',
      handler: async (_req, res) => {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        try {
          const stats = await aggregator.aggregate()
          // 宿主配置（月度预算 / 余额告警阈值）不是聚合产物：在响应边界
          // 注入，两条路径一致。
          const injected: Record<string, number> = {
            ...(config.monthlyBudget === undefined ? {} : { budget: config.monthlyBudget }),
            ...(config.lowBalanceThreshold === undefined ? {} : { lowBalanceThreshold: config.lowBalanceThreshold }),
          }
          res.end(JSON.stringify(Object.keys(injected).length === 0 ? stats : { ...stats, ...injected }))
          return
        } catch {
          // Persistence read failed; fall through to the JSON-file candidates.
        }
        for (const candidate of candidates) {
          try {
            const text = await readFile(candidate, 'utf8')
            // Accept only parseable JSON so a stale or partial file never
            // reaches the dashboard as if it were real.
            const doc = JSON.parse(text) as Record<string, unknown>
            if (config.monthlyBudget !== undefined) doc['budget'] = config.monthlyBudget
            if (config.lowBalanceThreshold !== undefined) doc['lowBalanceThreshold'] = config.lowBalanceThreshold
            res.end(JSON.stringify(doc))
            return
          } catch {
            // Try the next candidate location.
          }
        }
        res.end(JSON.stringify({ error: 'usage stats unavailable' }))
      },
    }),
    'usage-billing: usage-stats route',
  )
}
