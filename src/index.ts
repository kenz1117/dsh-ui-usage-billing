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
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
// Type-only: merges the ctx.sessionPersistence service declaration.
import type {} from '@deepseek-ai/dsh-session-persistence'
import type {} from '@deepseek-ai/dsh-host-webserver'
// Type-only: merges the ctx.settings / ctx.credentials service declarations.
import type {} from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/dsh-credentials'
// Type-only: merges the ctx.tools service declaration（usage_stats 动态工具）。
import type {} from '@deepseek-ai/dsh-tools'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { writeFileAtomic } from '@deepseek-ai/dsh-atomic-write'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { settingsNamespace, type SettingsProvider, type SettingsScope } from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'
import { createUsageAggregator, dayStamp, type UsageLedgerStore } from './aggregate.ts'
import { applyLivePricing, formatMoney, formatTokens } from './client/pricing.ts'
import { queryBalances, queryCustomBalances } from './balance.ts'
import { fetchLivePricing } from './pricing-fetch.ts'
import type { CustomBalanceConfig, LivePricing, RelayQuota, SubscriptionPlanConfig, SubscriptionQuota } from './pricing-shared.ts'
import { collectSubscriptions, EMPTY_SUBSCRIPTION_KEYS, identifySubscriptionPlans, type IdentifiedSubscriptionPlan, type SubscriptionKeys } from './subscriptions.ts'
import { queryRelayQuotas, type RelayRoute } from './relay.ts'
import { planTypeOf, subscriptionFeeCnyOf } from './client/plan-knowledge.ts'
import {
  BILLING_SETTINGS_NAMESPACE,
  DEFAULT_ENABLE_USAGE_STATS_TOOL,
  ENABLE_USAGE_STATS_TOOL_FIELD,
  type UsageBillingSettings,
} from './client/usage-billing-settings.ts'

/** Peer 地址是否为回环（本地）。回环防护：本插件的端点只供本机浏览器用，
 *  局域网/远端请求一律拒绝，避免面板数据（含中转站 origin 与余额）外泄。 */
function isLoopbackPeer(req: IncomingMessage): boolean {
  const address = req.socket.remoteAddress
  if (address === undefined) return false
  // IPv4 127.0.0.0/8、IPv6 ::1、以及 IPv4-mapped IPv6（::ffff:127.x.x.x）。
  return address === '::1' || address.startsWith('127.') || address.startsWith('::ffff:127.')
}

/** 校验 Host 头是本机回环（127.x / ::1 / localhost 或空，供 curl 不带 Host 的极简请求）。 */
function isLoopbackHost(req: IncomingMessage): boolean {
  const host = req.headers.host
  if (host === undefined || host === '') return true
  const name = host.split(':')[0]
  return name === 'localhost' || name === '::1' || (name !== undefined && name.startsWith('127.'))
}

/**
 * 回环防护守卫：仅接受回环 GET 请求（peer socket 地址 + Host 头同时校验）。
 * 不满足时返回 403 并结束响应；调用方在 handler 顶部调用，返回 false 即已拒绝。
 * @param req - 当前请求。
 * @param res - 当前响应。
 * @returns 是否放行；false = 已拒绝并结束响应。
 */
export function guardLoopback(req: IncomingMessage, res: ServerResponse): boolean {
  // GET 读取 + POST（usage-tool 的开关写入）都在回环内允许；其他方法一律拒绝。
  const methodOk = req.method === 'GET' || req.method === 'POST'
  if (!methodOk || !isLoopbackPeer(req) || !isLoopbackHost(req)) {
    res.writeHead(403, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ error: 'forbidden: loopback only' }))
    return false
  }
  return true
}

/** usage_stats 工具开关的设置命名空间 id（下端与 node 共用同一常量）。 */
const usageBillingSettingsNs = settingsNamespace(BILLING_SETTINGS_NAMESPACE)

/** 该命名空间的 wire schema：`enableUsageStatsTool` 布尔，默认关闭（issue 诉求）。 */
const UsageBillingSettingsSchema: z<UsageBillingSettings> = z.object({
  [ENABLE_USAGE_STATS_TOOL_FIELD]: z.boolean().default(DEFAULT_ENABLE_USAGE_STATS_TOOL),
})

/** Plugin configuration. */
export interface UsageBillingConfig {
  /** Absolute path to a `.dsh-usage-stats.json` fallback file. */
  statsPath?: string
  /** 独立持久用量账本的绝对路径；默认 `~/.dsh/.dsh-usage-ledger.json`。
   *  账本与会话日志解耦，因此永久删除会话不会抹掉已经观测到的用量。 */
  ledgerPath?: string
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
  /** 自定义 Provider 余额查询（任意 HTTP 端点 + extract 规则，适配 NewApi/LiteLLM 等）。 */
  customBalances?: readonly CustomBalanceConfig[]
  /** `usage_stats` 工具注入的组合 base（默认 false：不注入）；与设置命名空间同字段，
   *  作为用户设置（设置 Tab 开关）的组合兜底。该工具占用每次请求的上下文，coding 场景多在仪表盘查看。 */
  enableUsageStatsTool?: boolean
}

/** 实时定价的后台刷新间隔（毫秒）：汇率/模型价低频变化，6 小时一次足够。 */
const PRICING_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000

/** 订阅套餐额度缓存时长（毫秒）：上游配额 API 低频变化，5 分钟足够。 */
const SUBSCRIPTION_CACHE_MS = 5 * 60 * 1000

/** DeepSeek 余额查询的默认凭据引用（与 llm-deepseek 的默认引用一致）。 */
const DEFAULT_BALANCE_API_KEY_ENV = 'DEEPSEEK_API_KEY'

/**
 * 本插件版本号：从包自身的 package.json 读取（单一来源），随 usage-stats
 * 下发，供「设置 → 插件信息卡」展示。发布版 lib/index.js 相对包根解析。
 */
const PACKAGE_VERSION = (createRequire(import.meta.url)('../package.json') as { version?: string }).version ?? '0.0.0'

/** 统计快照的落盘节流（毫秒）：前端 30 秒轮询，快照最多每 30 秒写一次。 */
const SNAPSHOT_INTERVAL_MS = 30_000

/** 鉴权失败告警冷却（毫秒）：同一 provider 在窗口内只提示一次，避免 30 秒轮询刷屏。 */
const AUTH_WARN_COOLDOWN_MS = 30 * 60 * 1000

/**
 * 鉴权失败分类告警（P1-5）：余额 / 订阅查询返回 unauthorized 时，按
 * `source:provider` 去重并冷却告警，提示检查 llm-pi-ai 里该 provider 的 apiKeyEnv。
 */
const authWarnedAt = new Map<string, number>()
function warnAuthOnce(source: string, provider: string, displayName: string): void {
  const key = `${source}:${provider}`
  const now = Date.now()
  const last = authWarnedAt.get(key)
  if (last !== undefined && now - last < AUTH_WARN_COOLDOWN_MS) return
  authWarnedAt.set(key, now)
  console.warn(`[usage-billing] ${displayName}（${provider}）鉴权失败：请检查 llm-pi-ai 设置中该 provider 的 apiKeyEnv 凭据是否正确/有效。`)
}

/**
 * Create the atomic file-backed durable-ledger store. The previous complete file
 * is retained as `.bak`; a malformed/missing main file falls back to that backup.
 */
export function createFileUsageLedgerStore(ledgerPath: string): UsageLedgerStore {
  return {
    async load() {
      for (const path of [ledgerPath, `${ledgerPath}.bak`]) {
        try {
          const parsed = JSON.parse(await readFile(path, 'utf8')) as unknown
          if (parsed !== null && typeof parsed === 'object') {
            const candidate = parsed as { version?: unknown; sessions?: unknown }
            if (candidate.version === 1 && Array.isArray(candidate.sessions)) return parsed
          }
        } catch {
          // Main file missing/corrupt: try the backup; both absent means a new ledger.
        }
      }
      return undefined
    },
    async save(document) {
      try {
        const existing = await readFile(ledgerPath, 'utf8')
        // Never replace a known-good backup with malformed main-file bytes.
        JSON.parse(existing)
        await writeFileAtomic(`${ledgerPath}.bak`, existing, { mode: 0o600, dirMode: 0o700 })
      } catch {
        // First write or unreadable old ledger: atomically write the new document.
      }
      await writeFileAtomic(ledgerPath, JSON.stringify(document), { mode: 0o600, dirMode: 0o700 })
    },
  }
}

/** Required services: the web server, the persisted session log store, and user settings. */
export const inject = ['webServer', 'sessionPersistence', 'credentials', 'settings']

/**
 * 订阅 provider id（llm-pi-ai 设置键）→ billing 适配器 key 的映射。
 * 复用 dsh 既有的 llm-pi-ai provider 配置（apiKeyEnv 引用），不引入新配置面。
 */
/** key 只取字符串凭据字段：zaiRegion 是区域枚举，由下方区域逻辑单独赋值。 */
const SUBSCRIPTION_KEY_SOURCES: ReadonlyArray<{ provider: string; key: Exclude<keyof SubscriptionKeys, 'zaiRegion'> }> = [
  { provider: 'kimi-coding', key: 'kimiApiKey' },
  { provider: 'zai-coding-cn', key: 'zaiApiKey' },
  { provider: 'opencode', key: 'opencodeApiKey' },
  { provider: 'opencode-go', key: 'opencodeApiKey' },
  { provider: 'minimax', key: 'minmaxApiKey' },
  { provider: 'minimax-token-plan', key: 'minmaxApiKey' },
  { provider: 'openrouter', key: 'openrouterApiKey' },
]

/**
 * 读取 llm-pi-ai 设置的 `providers` 字典（`<route> → { apiKeyEnv? }`）。
 * 余额查询复用同一份来源：部署为某个 provider 配一次 key，多个 surface 共享。
 * @param settings - the settings service (reads the llm-pi-ai namespace).
 * @returns the providers dict; empty when the namespace is unreadable.
 */
/** 一个 llm-pi-ai provider 路由的读取视图：只取三块——apiKeyEnv（凭据引用）、
 *  baseURL（中转站零配置发现的来源）、displayName（站点显示名）。 */
export interface PiAiProviderRoute {
  apiKeyEnv?: string
  baseURL?: string
  displayName?: string
}

/** 读 llm-pi-ai 设置的 `providers` 字典（`<route> → { apiKeyEnv?, baseURL?, displayName? }`）。
 *  余额与订阅查询复用同一份来源：部署为某个 provider 配一次，多 surface 共享。
 * @param settings - the settings service (reads the llm-pi-ai namespace).
 * @returns the providers dict; empty when the namespace is unreadable.
 */
async function readPiAiProviders(settings: SettingsProvider): Promise<Readonly<Record<string, PiAiProviderRoute>>> {
  try {
    const descriptors = settings.describe({ redactSecrets: true })
    const pi = descriptors.find(descriptor => descriptor.ns === 'llm-pi-ai')?.value
    const providers = (pi as { providers?: Record<string, PiAiProviderRoute> } | null | undefined)?.providers
    const out: Record<string, PiAiProviderRoute> = {}
    for (const [route, entry] of Object.entries(providers ?? {})) {
      if (entry === null || typeof entry !== 'object') continue
      const { apiKeyEnv, baseURL, displayName } = entry
      out[route] = {
        ...(typeof apiKeyEnv === 'string' ? { apiKeyEnv } : {}),
        ...(typeof baseURL === 'string' ? { baseURL } : {}),
        ...(typeof displayName === 'string' ? { displayName } : {}),
      }
    }
    return out
  } catch {
    // 设置服务异常时按空 providers 处理（余额面板显示未配置）。
    return {}
  }
}

/** 同步读取 provider 路由的 baseURL 视图（中转站零配置发现来源）。
 *  `settings.describe` 是同步调用，聚合器每次折叠取最新站点映射，无需缓存/过期。
 *  注意：返回**全部可读路由**（baseURL 可选），聚合层据此区分「路由存在但无
 *  baseURL=直连」与「路由已删除=未知路由」两种不同归属。
 * @param settings - the settings service (reads the llm-pi-ai namespace).
 * @returns `<route> → { baseURL? }`；命名空间不可读时返回空。
 */
export function readPiAiProviderRoutes(settings: SettingsProvider): Readonly<Record<string, { baseURL?: string }>> {
  try {
    const descriptors = settings.describe({ redactSecrets: true })
    const pi = descriptors.find(descriptor => descriptor.ns === 'llm-pi-ai')?.value
    const providers = (pi as { providers?: Record<string, { baseURL?: unknown }> } | null | undefined)?.providers
    const out: Record<string, { baseURL?: string }> = {}
    for (const [route, entry] of Object.entries(providers ?? {})) {
      if (entry === null || typeof entry !== 'object') continue
      const baseURL = entry.baseURL
      out[route] = typeof baseURL === 'string' && baseURL !== '' ? { baseURL } : {}
    }
    return out
  } catch {
    return {}
  }
}

/**
 * 构造「cwd → 工作区标题」解析器（host 的 `workspaceRegistry` 为可选依赖）。
 * 匹配与 TokenLedger 同口径：会话 cwd 等于某工作区 path、或位于其子目录时，用
 * 工作区标题命名该项目（子目录的会话也计入）；否则返回 undefined（回退到目录名）。
 * registry 缺席/读取失败都返回 undefined，绝不抛错（可选依赖，不影响主流程）。
 * @param ctx - host context carrying the optional workspace registry.
 * @returns 标题解析函数；registry 不可用时 undefined。
 */
function buildWorkspaceTitleResolver(ctx: Context): ((cwd: string) => string | undefined) | undefined {
  let registry: { list?: () => readonly { path: string; title: string }[] } | undefined
  try {
    registry = ctx.get('workspaceRegistry') as { list?: () => readonly { path: string; title: string }[] } | undefined
  } catch {
    return undefined
  }
  if (registry === undefined || typeof registry.list !== 'function') return undefined
  const reg = registry as { list: () => readonly { path: string; title: string }[] }
  return (cwd) => {
    if (cwd === '') return undefined
    try {
      const records = reg.list() ?? []
      // 精确 path 匹配优先（会话 cwd 即工作区登记目录）。
      const exact = records.find(record => record.path === cwd)
      if (exact !== undefined) return exact.title
      // 子目录前缀匹配：子目录里的会话也计入该项目。
      for (const record of records) {
        if (record.path !== '' && cwd.startsWith(`${record.path}/`)) return record.title
      }
      return undefined
    } catch {
      return undefined
    }
  }
}

/**
  * 解析订阅适配器需要的 API Key：从 llm-pi-ai 设置的 `providers.<id>.apiKeyEnv`
 * 读引用（如 kimi-coding → KIMI_CODING_API_KEY），再经凭据 seam 解析成实际值。
 * 同时识别出用户配置了 key 的订阅套餐（供面板只显示已识别的）。
 * @param settings - the settings service (reads the llm-pi-ai namespace).
 * @param credentials - the credentials service (resolves the env refs).
 */
export async function resolveSubscriptionKeys(
  settings: SettingsProvider,
  credentials: CredentialProvider,
): Promise<{ keys: SubscriptionKeys; identified: IdentifiedSubscriptionPlan[] }> {
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
  // usage_stats 工具开关的设置命名空间 scope：settings 服务就绪后注册；HTTP 路由据此读写。
  let usageSettingsScope: SettingsScope<UsageBillingSettings> | undefined
  const cwd = process.cwd()
  const snapshotPath = join(homedir(), '.dsh/.dsh-usage-stats.json')
  const ledgerPath = config.ledgerPath ?? join(homedir(), '.dsh/.dsh-usage-ledger.json')

  // 独立持久账本：主文件损坏时读 `.bak`，写入使用宿主的原子写工具并限制为
  // 当前用户可读。账本保存每个已成功折叠的会话；删除会话日志不删除账本行。
  const ledgerStore = createFileUsageLedgerStore(ledgerPath)

  // 常驻增量聚合器：按会话缓存折叠结果（日志 mtime+size 失效），
  // 前端 30 秒轮询只重算写过的会话。
  // 项目归属用工作区标题（host workspaceRegistry 可选；缺失时 resolver 为 undefined，回退目录名）。
  const workspaceTitleResolver = buildWorkspaceTitleResolver(ctx)
  const aggregator = createUsageAggregator(ctx.sessionPersistence, {
    ...(config.subscriptionProviders === undefined
      ? {}
      : { subscriptionProviders: config.subscriptionProviders }),
    // 中转站零配置发现：每次聚合读 llm-pi-ai providers 的 baseURL（路由→站点映射）。
    resolveRoutes: () => readPiAiProviderRoutes(ctx.settings),
    // 项目归属用工作区标题命名（host workspaceRegistry 为可选依赖，缺失时回退目录名）。
    ...(workspaceTitleResolver === undefined ? {} : { resolveWorkspaceTitle: workspaceTitleResolver }),
    ledger: ledgerStore,
  })
  const candidates = [
    config.statsPath,
    process.env.DSH_USAGE_STATS,
    join(cwd, '.dsh-usage-stats.json'),
    snapshotPath,
  ].filter((path): path is string => typeof path === 'string' && path.length > 0)

  // 统计快照持久化：聚合成功即原子写（temp+rename，读者只见完整新旧内容），
  // 快照同时就是聚合失败时的回退文件——重启首屏与聚合异常都有最近数据可看。
  let lastSnapshotAt = 0
  const persistSnapshot = (doc: Record<string, unknown>): void => {
    const now = Date.now()
    if (now - lastSnapshotAt < SNAPSHOT_INTERVAL_MS) return
    lastSnapshotAt = now
    const payload = JSON.stringify({ ...doc, _writer: { pid: process.pid, at: now } })
    // P0-3 崩溃恢复：写入前先把当前的上一版快照备份为 `.bak`。主文件一旦损坏
    //（旧版本非原子写入 / 磁盘写坏），聚合失败路径的 fallback 会用 `.bak` 重建。
    void (async () => {
      try {
        const existing = await readFile(snapshotPath, 'utf8')
        await writeFileAtomic(`${snapshotPath}.bak`, existing, { mode: 0o600, dirMode: 0o700 })
      } catch {
        // 旧快照不存在（首次运行）或不可读：无需备份，直接写新快照。
      }
      try {
        await writeFileAtomic(snapshotPath, payload, { mode: 0o600, dirMode: 0o700 })
      } catch {
        // 快照写失败不影响服务：内存聚合值已下发。
      }
    })()
  }

  /** 读一个快照候选并解析成对象：主文件优先；主文件损坏时回退上一版 `.bak`（P0-3 崩溃恢复）。 */
  const readSnapshot: (candidate: string) => Promise<Record<string, unknown> | null> = async (candidate) => {
    for (const path of [candidate, `${candidate}.bak`]) {
      try {
        return JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>
      } catch {
        // 文件不存在或 JSON 损坏：尝试下一个（主文件失败 → `.bak`；都失败返回 null）。
      }
    }
    return null
  }

  // 多实例心跳锁（P1-5）：快照每次写入都会刷新 `_writer`（pid + at）作为心跳。
  // 启动时若读到的快照新鲜（60 秒内）且写入者不是本进程 → 另一实例在跑，
  // 双实例会造成余额/预算提醒重复，提示一次即可。
  void (async () => {
    try {
      const text = await readFile(snapshotPath, 'utf8')
      const doc = JSON.parse(text) as { _writer?: { pid?: number; at?: number } }
      const writer = doc._writer
      if (writer?.pid !== undefined && writer.pid !== process.pid && writer.at !== undefined && Date.now() - writer.at < 60_000) {
        console.warn(`[usage-billing] 检测到另一实例（pid ${writer.pid}）正在提供用量统计，双实例可能导致提醒重复。`)
      }
    } catch {
      // 无快照或快照损坏：首次运行 / 旧版本的常态，静默跳过。
    }
  })()

  // usage_stats 动态工具（默认关闭）：模型可主动查询用量费用（今天 / 本月 / 当前会话 / 累计）。
  // 该工具占用每次请求的上下文，而 coding 场景多在仪表盘看用量，属可关的打扰项。
  // 开关持久化在设置命名空间 `ui-usage-billing.enableUsageStatsTool`（默认 false），
  // 用户可在「设置」Tab 切换；工具注入是启动期决策，改开关后重载应用生效。
  // cordis.yml 的 `enableUsageStatsTool` config 作为组合 base 兜底。
  ctx.inject(['settings'], (sctx) => {
    const scope = sctx.settings.register(usageBillingSettingsNs, UsageBillingSettingsSchema, {
      base: { enableUsageStatsTool: config.enableUsageStatsTool ?? DEFAULT_ENABLE_USAGE_STATS_TOOL },
    })
    usageSettingsScope = scope
    // 命名空间注册与工具注册解耦：tools 服务缺席/延迟就绪时命名空间仍尽早注册，
    // 前端可从本插件的 HTTP 路由读到开关状态。工具仅在可用且开启时注入。
    ctx.inject(['tools'], (toolsCtx) => {
      if (scope.get().enableUsageStatsTool) {
        toolsCtx.tools.register(defineTool({
          name: 'usage_stats',
      description: '查询本机 DeepSeek Harness 的模型用量与估算费用（人民币，按官方目录价估算，非账单）。range 取值：today=今天，month=本月，session=当前会话，all=累计。',
      parameters: {
        range: {
          type: 'string',
          enum: ['today', 'month', 'session', 'all', 'bySite', 'relay'],
          required: true,
          description: '统计范围：today / month / session / all / bySite / relay',
        },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            range: { type: 'string', required: true },
            cost: { type: 'number', required: true, description: '估算费用（人民币元）' },
            calls: { type: 'number', required: true },
            input: { type: 'number', required: true, description: '输入 tokens' },
            output: { type: 'number', required: true, description: '输出 tokens' },
          },
        },
        render: (_args, value) => [{
          type: 'text',
          text: `用量（${value.range}）：估算费用 ${formatMoney(value.cost)}，调用 ${value.calls} 次，输入 ${formatTokens(value.input)} tokens，输出 ${formatTokens(value.output)} tokens`,
        }],
      },
      async execute(args, exec) {
        const stats = await aggregator.aggregate()
        const zero = { range: args.range, cost: 0, calls: 0, input: 0, output: 0 }
        if (args.range === 'all') {
          return {
            range: args.range,
            cost: stats.total.cost,
            calls: stats.total.calls,
            input: stats.total.input,
            output: stats.total.output,
          }
        }
        if (args.range === 'bySite' || args.range === 'relay') {
          // 按站点归组：bySite 维度（中转站/直连/未知路由）累计；relay 只看中转站部分。
          const bySite = stats.bySite ?? {}
          let cost = 0
          let calls = 0
          let input = 0
          let output = 0
          for (const usage of Object.values(bySite)) {
            cost += usage.cost
            calls += usage.calls
            input += usage.input
            output += usage.output
          }
          return { range: args.range, cost, calls, input, output }
        }
        if (args.range === 'today') {
          const day = stats.byDay[dayStamp(Date.now())]
          return day === undefined ? zero : { range: args.range, cost: day.cost, calls: day.calls, input: day.input, output: day.output }
        }
        if (args.range === 'month') {
          const prefix = dayStamp(Date.now()).slice(0, 7)
          let cost = 0
          let calls = 0
          let input = 0
          let output = 0
          for (const [date, day] of Object.entries(stats.byDay)) {
            if (!date.startsWith(prefix)) continue
            cost += day.cost
            calls += day.calls
            input += day.input
            output += day.output
          }
          return { range: args.range, cost, calls, input, output }
        }
        // session：按当前会话 id 从每轮明细汇总（byTurn 封顶 200 行，当前会话
        // 恒为最近轮次，覆盖完整）。
        const sessionId = exec.agent?.id
        if (sessionId === undefined) throw new Error('usage_stats 的 session 范围需要 agent 会话上下文')
        let cost = 0
        let calls = 0
        let input = 0
        let output = 0
        for (const turn of stats.byTurn ?? []) {
          if (turn.sessionId !== String(sessionId)) continue
          cost += turn.cost
          calls += 1
          input += turn.input
          output += turn.output
        }
        return { range: args.range, cost, calls, input, output }
      }
    }))
    }
    })
  })

  // 后台拉取实时定价（汇率 + OpenRouter 模型价 + models.dev 目录外补充），
  // 失败自动降级内置目录；之后每 6 小时刷新一次，汇率/价格无需重启进程就能
  // 保持最新。host 侧同步应用：聚合计价与客户端展示同源（含目录外补充条目）。
  let live: LivePricing = { source: 'builtin' }
  const refreshPricing = async (): Promise<void> => {
    live = await fetchLivePricing()
    applyLivePricing(live)
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
      handler: async (req, res) => {
        if (!guardLoopback(req, res)) return
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
      handler: async (req, res) => {
        if (!guardLoopback(req, res)) return
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        // 余额 key 复用 llm-pi-ai 的 providers（同订阅）：部署为某 provider 配一次即可。
        // DeepSeek 保留 `balanceApiKeyEnv` 特例：llm-pi-ai 未配 deepseek 时仍可用该 env 查余额。
        const piProviders = await readPiAiProviders(ctx.settings)
        const providers = { ...piProviders }
        if (providers['deepseek'] === undefined) {
          providers['deepseek'] = { apiKeyEnv: config.balanceApiKeyEnv ?? DEFAULT_BALANCE_API_KEY_ENV }
        }
        const balances = await queryBalances(ctx, providers)
        // 自定义 Provider 余额（任意 HTTP 端点）：独立于内置三家，逐个成败。
        const custom = await queryCustomBalances(ctx, config.customBalances ?? [])
        // P1-5 鉴权分类告警：区分「配置错了 key」与「上游不可达」，协助定位。
        for (const row of [...balances, ...custom]) {
          if (row.error === 'unauthorized') warnAuthOnce('balance', row.provider, row.displayName)
        }
        res.end(JSON.stringify({ balances: [...balances, ...custom] }))
      },
    }),
    'usage-billing: balance route',
  )

  // usage_stats 工具开关：插件自带的读/写接口（不依赖宿主浏览器设置白名单）。
  // GET 返回当前是否注入；POST 写设置命名空间（重启应用后工具注入随新值生效）。
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: '/api/billing/usage-tool',
      handler: async (req, res) => {
        if (!guardLoopback(req, res)) return
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        const enabled = usageSettingsScope?.get().enableUsageStatsTool ?? DEFAULT_ENABLE_USAGE_STATS_TOOL
        if (req.method === 'GET') {
          res.end(JSON.stringify({ enabled }))
          return
        }
        if (req.method !== 'POST') {
          res.writeHead(405, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ error: 'method not allowed' }))
          return
        }
        // 读取并解析 JSON body 后写设置命名空间；settings 服务未就绪时拒绝写。
        try {
          let body = ''
          for await (const chunk of req) body += String(chunk)
          const parsed = JSON.parse(body === '' ? '{}' : body) as { enabled?: unknown }
          if (usageSettingsScope === undefined) {
            res.end(JSON.stringify({ error: 'settings unavailable' }))
            return
          }
          const next = parsed.enabled === true
          await usageSettingsScope.update({ enableUsageStatsTool: next })
          res.end(JSON.stringify({ ok: true, enabled: next }))
        } catch {
          res.end(JSON.stringify({ error: 'invalid' }))
        }
      },
    }),
    'usage-billing: usage-tool route',
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
    const rows: SubscriptionQuota[] = [...queried].map((row) => {
      // plan 双口径（引用 dsh-spend）：订阅通道标 code 并带月费，其余 token。
      // 月费按原生币 × 实时汇率折算为人民币（汇率缺失时按 0 处理，跨币种保护）。
      const planType = planTypeOf(row.provider)
      const subscriptionAmount = subscriptionFeeCnyOf(row.provider, live.rate)
      return {
        ...row,
        planType,
        ...(planType === 'code' && subscriptionAmount > 0 ? { subscriptionAmount } : {}),
      }
    })
    for (const item of identified) {
      if (!item.adapter) rows.push({ provider: item.provider, displayName: item.displayName, status: 'ok', windows: [], planType: planTypeOf(item.provider) })
    }
    // P1-5 鉴权分类告警：订阅额度查询鉴权失败时提示检查 apiKeyEnv。
    for (const row of rows) {
      if (row.status === 'unauthorized') warnAuthOnce('subscription', row.provider, row.displayName)
    }
    quotaCache = { at: Date.now(), quotas: rows }
  }
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: '/api/billing/subscriptions',
      handler: async (req, res) => {
        if (!guardLoopback(req, res)) return
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        if (Date.now() - quotaCache.at >= SUBSCRIPTION_CACHE_MS) await refreshQuotas()
        res.end(JSON.stringify({ quotas: quotaCache.quotas }))
      },
    }),
    'usage-billing: subscriptions route',
  )

  // 中转站额度：识别配了 baseURL + apiKeyEnv 的路由所指向的中转站程序（New API /
  // Sub2API），读出「余额 / 额度窗口」。外部 API 低频变化，缓存 5 分钟避免每次
  // 轮询都打上游；只返回配了 baseURL 的路由，官方直连/未配置路由不出现。
  let relayCache: { at: number; quotas: readonly RelayQuota[] } = { at: 0, quotas: [] }
  const refreshRelay = async (): Promise<void> => {
    const providers = await readPiAiProviders(ctx.settings)
    const routes: RelayRoute[] = []
    for (const [route, entry] of Object.entries(providers)) {
      if (entry.baseURL === undefined || entry.apiKeyEnv === undefined) continue
      routes.push({
        route,
        baseURL: entry.baseURL,
        apiKeyEnv: entry.apiKeyEnv,
        ...(entry.displayName === undefined ? {} : { displayName: entry.displayName }),
      })
    }
    relayCache = { at: Date.now(), quotas: await queryRelayQuotas(ctx, routes) }
  }
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: '/api/billing/relay-quotas',
      handler: async (req, res) => {
        if (!guardLoopback(req, res)) return
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        if (Date.now() - relayCache.at >= SUBSCRIPTION_CACHE_MS) await refreshRelay()
        // 诊断：每条路由的归类（origin / kind），供「我的中转站为什么不显示」自查。
        const diagnostics = relayCache.quotas.map(row => ({ route: row.route, origin: row.origin, kind: row.kind }))
        res.end(JSON.stringify({ quotas: relayCache.quotas, diagnostics }))
      },
    }),
    'usage-billing: relay-quotas route',
  )

  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: '/api/billing/usage-stats',
      handler: async (req, res) => {
        if (!guardLoopback(req, res)) return
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        try {
          const stats = await aggregator.aggregate()
          // 宿主配置（月度预算 / 余额告警阈值）不是聚合产物：在响应边界
          // 注入，两条路径一致。
          const injected: Record<string, number> = {
            ...(config.monthlyBudget === undefined ? {} : { budget: config.monthlyBudget }),
            ...(config.lowBalanceThreshold === undefined ? {} : { lowBalanceThreshold: config.lowBalanceThreshold }),
          }
          const payload = { ...stats, pluginVersion: PACKAGE_VERSION, ...injected }
          // 快照落盘（节流 30 秒）：聚合失败路径的回退文件因此始终保持新鲜。
          persistSnapshot(payload as unknown as Record<string, unknown>)
          res.end(JSON.stringify(payload))
          return
        } catch (error) {
          // Persistence read failed; fall through to the JSON-file candidates.
          // 记录异常尾部（含已折叠会话数），避免「只能靠猜」——聚合失败时用户
          // 至少能从日志看到原因（单会话损坏已在 aggregate 内跳过并告警）。
          console.error('[usage-billing] usage-stats aggregate failed, falling back to snapshot:', error)
        }
        for (const candidate of candidates) {
          const doc = await readSnapshot(candidate)
          // Accept only parseable JSON so a stale or partial file never
          // reaches the dashboard as if it were real.
          if (doc === null) continue
          if (config.monthlyBudget !== undefined) doc['budget'] = config.monthlyBudget
          if (config.lowBalanceThreshold !== undefined) doc['lowBalanceThreshold'] = config.lowBalanceThreshold
          doc['pluginVersion'] = PACKAGE_VERSION
          res.end(JSON.stringify(doc))
          return
        }
        res.end(JSON.stringify({ error: 'usage stats unavailable' }))
      },
    }),
    'usage-billing: usage-stats route',
  )
}
