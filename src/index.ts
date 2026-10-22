/**
 * Usage billing surface plugin, node half.
 *
 * Serves `/api/billing/usage-stats`: real usage aggregated from every
 * persisted session log (see `aggregate.ts`) — the browser dashboard reads it
 * instead of showing an empty snapshot. Aggregation is stale-while-revalidate:
 * requests get a short wait budget and fall back to the freshest persisted
 * snapshot while a slow full fold keeps running in the background (a heavy
 * user's first fold takes minutes and must not starve the single-process
 * host's RPC). When `sessionPersistence` is unavailable (or aggregation
 * fails), the configured `statsPath` / `DSH_USAGE_STATS` / conventional JSON
 * file is served as a fallback, and a missing file answers `{ error }` so the
 * dashboard shows zeros, never fabricated samples.
 */

import { lstat, mkdir, readFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
// 引入 loader 的声明合并：loader/volatile-update 事件与 Fiber.entry 属性。
import type {} from '@deepseek-ai/cordis-plugin-loader'
// Type-only: merges the ctx.sessionPersistence service declaration.
import type {} from '@deepseek-ai/dsh-session-persistence'
import type { SessionEvent, SessionHeader, SessionId } from '@deepseek-ai/dsh-session/types'
import type {} from '@deepseek-ai/dsh-host-webserver'
// Type-only: merges the ctx.settings / ctx.credentials service declarations.
import type {} from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/dsh-credentials'
// Type-only: merges the ctx.tools service declaration（usage_stats 动态工具）。
import type {} from '@deepseek-ai/dsh-tools'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { writeFileAtomic, withFileLock } from '@deepseek-ai/dsh-atomic-write'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import z from '@deepseek-ai/schemastery'
import { createUsageAggregator, dayStamp, DEFAULT_SUBSCRIPTION_PROVIDERS, mergeUsageLedgerDocuments, sessionLogOffsetOf, sumSiteBuckets, type UsageLedgerDocument, type UsageLedgerStore, type UsagePersistence } from './aggregate.ts'
import { applyBuiltinCatalog, applyLivePricing, applyUserModelAliases, formatMoney, formatTokens } from './client/pricing.ts'
import { BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES } from './builtin-catalog.ts'
import { queryBalances, queryCustomBalances } from './balance.ts'
import { queryDeclaredEndpoints } from './declarative.ts'
import { reconcileBalanceDelta, type BalanceRef, type ReconcileEvent } from './reconcile.ts'
import { fetchLivePricing } from './pricing-fetch.ts'
import type { LivePricing, RelayQuota, SubscriptionQuota } from './pricing-shared.ts'
import type { UsageBillingConfig } from './config.ts'
import { classifyMiniMaxPlanRoutes, collectSubscriptions, identifySubscriptionPlans, parseOpenCodeAuthDocument, resolveSubscriptionAccess, type IdentifiedSubscriptionPlan, type SubscriptionKeys } from './subscriptions.ts'
import { isOfficialBaseUrl, queryRelayQuotas, type RelayRoute } from './relay.ts'
import { firstResolvedRef, routeKeyRefCandidates } from './route-keys.ts'
import { planTypeOf, subscriptionFeeCnyOf } from './client/plan-knowledge.ts'
import { swallowed } from './silent.ts'
// v1.5.2 抽出：共享 loopback 守卫 + 9 条 HTTP 路由的注册块各自独立成文件，apply() 收缩为装配器。
import { normalizeTrustedHosts } from './guard.ts'
import { registerNotifyClaimRoute } from './routes/notify-claim.ts'
import { registerPricingRoutes } from './routes/pricing.ts'
import { registerBalanceRoute } from './routes/balance.ts'
import { registerUsageToolRoute } from './routes/usage-tool.ts'
import { registerSubscriptionsRoute } from './routes/subscriptions.ts'
import { registerRelayQuotasRoute } from './routes/relay-quotas.ts'
import { registerUsageStatsRoute } from './routes/usage-stats.ts'

// Re-export guard helpers for backward compat with tests/clients that import
// from src/index.ts (e.g. tests/trusted-hosts.spec.ts).
export { guardLoopback, isLoopbackOrigin, isLoopbackHost, isLoopbackPeer, hostNameOf, normalizeTrustedHosts } from './guard.ts'

// 宿主 0.1.7 重构 dsh-settings：SettingsProvider/SettingsScope 类型不再导出（服务类
// 更名 SettingsForms，describe 表单面保留；register 从运行时移除，命名空间持久化
// 改走 plugin config 投影）。插件运行时横跨 0.1.2（register 可用）与 0.1.7+（仅
// describe）两代宿主，按结构本地声明，不 import 任何世代的宿主类型名。
/** 设置服务的读取面：两代宿主运行时都提供 describe（条目键为 profile entry id）。 */
interface SettingsReader {
  describe(options?: { redactSecrets?: boolean }): readonly { ns: string; value: unknown }[]
}

/** 旧世代（≤0.1.6 宿主）`settings.register` 返回的命名空间 scope。 */
interface SettingsNamespaceScope<T> {
  get(): T
  update(patch: Partial<T>): Promise<void>
}
import {
  BILLING_SETTINGS_NAMESPACE,
  DEFAULT_ENABLE_USAGE_STATS_TOOL,
  ENABLE_USAGE_STATS_TOOL_FIELD,
  type UsageBillingSettings,
} from './client/usage-billing-settings.ts'

/** 设置命名空间 id：register 已从 0.1.7 运行时移除，按 string 探测调用，宿主 branded 名不再引用。 */
type NamespaceArg = string

const SETTINGS_NAMESPACE_PATTERN = /^[a-z][a-z0-9-]*$/

/** 校验并透过合法命名空间 id；非法值 fail-loud（与上游原行为一致）。 */
function validateSettingsNamespace(value: string): NamespaceArg {
  if (!SETTINGS_NAMESPACE_PATTERN.test(value)) {
    throw new TypeError(`settings namespace "${value}" must match ${String(SETTINGS_NAMESPACE_PATTERN)}`)
  }
  return value as NamespaceArg
}

/** usage_stats 工具开关的设置命名空间 id（下端与 node 共用同一常量）。 */
const usageBillingSettingsNs = validateSettingsNamespace(BILLING_SETTINGS_NAMESPACE)

/** 该命名空间的 wire schema：`enableUsageStatsTool` 布尔，默认关闭（issue 诉求）。 */
const UsageBillingSettingsSchema: z<UsageBillingSettings> = z.object({
  [ENABLE_USAGE_STATS_TOOL_FIELD]: z.boolean().default(DEFAULT_ENABLE_USAGE_STATS_TOOL),
})

export type { UsageBillingConfig } from './config.ts'
// ⚠️ 运行时 Config 必须从本入口 re-export（issue #98）：宿主 dsh-settings 的写回
// 与 volatile 投影都从插件运行时模块的 `Config` 导出发现 schema；v1.6.0 拆分时
// 退化成纯类型导致「注入用量查询」开关在 0.2.1-rc.2 上失效（No configurable
// plugin entry）。schema 定义与详细说明见 src/config.ts。
export { Config } from './config.ts'
/** 实时定价的后台刷新间隔（毫秒）：汇率/模型价低频变化，6 小时一次足够。 */
/** 实时定价的后台刷新间隔（毫秒）：汇率/模型价低频变化，6 小时一次足够。 */
const PRICING_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000

/** 历史回放预热的延迟：等宿主启动高峰（插件加载 / 路由挂载）过去再全量折叠，
 *  避免抢启动期的 CPU；纯延迟不阻塞任何请求，面板提前打开也只会提前聚合。 */
const WARMUP_DELAY_MS = 3_000

/** 订阅套餐额度缓存时长（毫秒）：上游配额 API 低频变化，5 分钟足够。 */
const SUBSCRIPTION_CACHE_MS = 5 * 60 * 1000
// 余额接口缓存：与订阅 / 中转站配额一致，5 分钟，避免每 30 秒后台轮询打官方余额 API。
const BALANCE_CACHE_MS = 5 * 60 * 1000

/**
 * 余额路由的总等待预算（毫秒）：超预算立刻回上一次成功的余额（stale 标记），
 * 刷新在后台继续。取 8s——与上游单次查询超时（FETCH_TIMEOUT_MS）对齐：上游
 * 真的不可达时多等没有意义，先把响应还给浏览器，别占着同源连接（issue #104）。
 */
const BALANCE_RESPONSE_BUDGET_MS = 8_000

/**
 * 订阅 / 中转站额度路由的总等待预算（毫秒）：与余额路由同口径（issue #104）。
 * 上游额度接口不可达时（8s 超时 × 重试 ≈ 10~16s），响应被长期挂住会占满浏览器
 * 的同源连接池——多标签页各挂一条即让宿主自己的资源请求排队，界面整体卡死。
 */
const QUOTA_RESPONSE_BUDGET_MS = 8_000

/**
 * 对账基线的最大可用年龄（毫秒）：超过则「今日官方费用」偏小，用它对账会
 * 报假漂移——此时跳过本轮对账，等后台补算完成后再恢复（issue #104）。
 * 取 5 分钟：与 usage-stats 的 30s 轮询 + 5 分钟快照节流同一量级。
 */
const RECONCILE_BASIS_MAX_AGE_MS = 5 * 60 * 1000

/** DeepSeek 余额查询的默认凭据引用（与 llm-deepseek 的默认引用一致）。 */
const DEFAULT_BALANCE_API_KEY_ENV = 'DEEPSEEK_API_KEY'

/**
 * 本插件版本号：从包自身的 package.json 读取（单一来源），随 usage-stats
 * 下发，供「设置 → 插件信息卡」展示。发布版 lib/index.js 相对包根解析。
 */
const PACKAGE_VERSION = (createRequire(import.meta.url)('../package.json') as { version?: string }).version ?? '0.0.0'

/** 统计快照的落盘节流（毫秒）：快照只服务聚合失败回退与重启首屏（展示级
 *  新鲜度即可），降到 5 分钟一次——原子写含上一版备份是两次全量 JSON 落盘，
 *  重度用户快照上百 KB，跟随前端轮询 30 秒写一次纯属写放大。 */
const SNAPSHOT_INTERVAL_MS = 300_000

/** usage-stats 响应的等待预算（毫秒）：聚合在此预算内完成就回实时数据，
 *  超预算立即回最近快照（stale-while-revalidate），后台折叠继续跑。
 *  轻量用户暖缓存下的聚合是毫秒级，预算几乎不会触发。 */
const RESPONSE_BUDGET_MS = 1500

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
  console.warn(`[usage-billing] ${displayName}（${provider}）鉴权失败：请检查 llm-pi-ai 设置中该 provider 的凭据环境变量是否正确/有效。`)
}

/** 锁等待上限：账本提交是毫秒级 read-render-commit，2s 已数倍于正常持锁时长。 */
const LEDGER_LOCK_WAIT_MS = 2_000

/**
 * 锁年龄超过该值判为崩溃残留的孤儿锁。正常持锁是毫秒级文件提交，没有活跃
 * writer 会合法持有 60s；库层刻意不做年龄判定（它无法假设调用方的操作时长），
 * 本调用方知道自己操作的上界，可以给出有依据的清理阈值。
 */
const STALE_LEDGER_LOCK_MS = 60_000

/**
 * 锁等待超时后的孤儿锁自愈（issue #48）：仅当锁文件年龄超过
 * STALE_LEDGER_LOCK_MS 才清理，避免误删慢 writer 的活跃锁。
 * @param ledgerPath - 账本文件路径（锁为其 `.lock` 兄弟文件）。
 * @returns 是否清理了孤儿锁；false = 锁已消失或太新鲜，调用方上抛原错误。
 */
async function reclaimStaleLedgerLock(ledgerPath: string): Promise<boolean> {
  let ageMs: number
  try {
    ageMs = Date.now() - (await lstat(`${ledgerPath}.lock`)).mtimeMs
  } catch {
    // 锁在超时前后已消失（慢 writer 完成）：无可清理对象。
    return false
  }
  if (ageMs < STALE_LEDGER_LOCK_MS) return false
  console.warn(`[usage-billing] 账本锁已存在 ${Math.round(ageMs / 1000)}s（崩溃残留），清理后重试：${ledgerPath}.lock`)
  await rm(`${ledgerPath}.lock`, { force: true })
  return true
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
          swallowed('ledger-main-unreadable')
        }
      }
      return undefined
    },
    async save(document) {
      // P0: cross-writer serialization. Concurrent MoveFileExW calls against the
      // same target on Windows return EPERM (errno -4048). withFileLock holds a
      // wx-created `<file>.lock` sibling with exponential backoff so only one
      // writer at a time commits the .bak + tmp → ledger rename chain.
      // withFileLock 要求父目录已存在（它只开锁文件、不建目录），而 writeFileAtomic
      // 的 mkdir 在其之后才执行，故此处先建父目录，否则 ledgerPath 在未创建的子目录
      // 下时开锁会抛 ENOENT。
      await mkdir(dirname(ledgerPath), { recursive: true, mode: 0o700 })
      const commit = async (): Promise<void> => {
        let existing: string | undefined
        let existingDoc: UsageLedgerDocument | undefined
        try {
          existing = await readFile(ledgerPath, 'utf8')
          const parsed = JSON.parse(existing) as { version?: unknown; sessions?: unknown }
          // 版本/形状校验：不是本插件账本形状的旧文件只做备份基线，不做合并基线。
          if (parsed.version === 1 && Array.isArray(parsed.sessions)) existingDoc = parsed as UsageLedgerDocument
        } catch {
          existing = undefined // First write or unreadable old ledger: no merge base.
        }
        if (existing !== undefined) {
          // Never replace a known-good backup with malformed main-file bytes.
          await writeFileAtomic(`${ledgerPath}.bak`, existing, { mode: 0o600, dirMode: 0o700 })
        }
        // 多实例合并（自审计延期项：save 路径 last-writer-wins 丢写）：锁内重读
        // 磁盘现存文档，与本进程要落的文档按会话 id 行级合并（foldedAt 新者胜）。
        // 同一 DSH_HOME 下两个宿主实例交替保存时，后写者不再抹掉先写者刚写入的行；
        // 跨实例即时可见性仍靠重启重载，此处保证的是磁盘数据不丢（最终一致）。
        const merged = existingDoc === undefined ? document : mergeUsageLedgerDocuments(document, existingDoc)
        await writeFileAtomic(ledgerPath, JSON.stringify(merged), { mode: 0o600, dirMode: 0o700 })
      }
      try {
        await withFileLock(ledgerPath, commit, { waitMs: LEDGER_LOCK_WAIT_MS })
      } catch (error) {
        // 仅锁等待超时进入孤儿锁自愈（issue #48）：锁持有者崩溃后残留的锁无人
        // 释放，库层竞争者永不删除已存在的锁，账本写入会永久超时。其余错误原样上抛。
        if (!(error instanceof Error) || !error.message.includes('timed out waiting for the writer lock')) throw error
        if (!(await reclaimStaleLedgerLock(ledgerPath))) throw error
        await withFileLock(ledgerPath, commit, { waitMs: LEDGER_LOCK_WAIT_MS })
      }
    },
  }
}

/** Required services: the web server, the persisted session log store, and user settings. */
export const inject = ['webServer', 'sessionPersistence', 'credentials', 'settings']

/**
 * 读取 llm-pi-ai 设置的 `providers` 字典（`<route> → { apiKeyEnv? }`）。
 * 余额查询复用同一份来源：部署为某个 provider 配一次 key，多个 surface 共享。
 * @param settings - the settings service (reads the llm-pi-ai namespace).
 * @returns the providers dict; empty when the namespace is unreadable.
 */
/** 一个 llm-pi-ai provider 路由的读取视图：apiKeyEnv（凭据引用）、baseURL（中转站
 *  零配置发现）、displayName（站点显示名）、hasModels（新版宿主设置页保存的
 *  models 列表——订阅识别的第二配置信号）。 */
export interface PiAiProviderRoute {
  apiKeyEnv?: string
  baseURL?: string
  displayName?: string
  hasModels?: boolean
}

/** 读 llm-pi-ai 设置的 `providers` 字典（`<route> → { apiKeyEnv?, baseURL?, displayName? }`）。
 *  余额与订阅查询复用同一份来源：部署为某个 provider 配一次，多 surface 共享。
 * @param settings - the settings service (reads the llm-pi-ai namespace).
 * @returns the providers dict; empty when the namespace is unreadable.
 */
async function readPiAiProviders(settings: SettingsReader): Promise<Readonly<Record<string, PiAiProviderRoute>>> {
  try {
    const descriptors = settings.describe({ redactSecrets: true })
    const pi = descriptors.find(descriptor => descriptor.ns === 'llm-pi-ai')?.value
    const providers = (pi as { providers?: Record<string, PiAiProviderRoute> } | null | undefined)?.providers
    const out: Record<string, PiAiProviderRoute> = {}
    for (const [route, entry] of Object.entries(providers ?? {})) {
      if (entry === null || typeof entry !== 'object') continue
      const { apiKeyEnv, baseURL, displayName } = entry
      // models 是新版宿主设置页保存路由配置的主要落点（key 走凭据 refs）；
      // 非空数组才算「已配置」，空数组等价于未声明。
      const models = (entry as { models?: unknown }).models
      out[route] = {
        ...(typeof apiKeyEnv === 'string' ? { apiKeyEnv } : {}),
        ...(typeof baseURL === 'string' ? { baseURL } : {}),
        ...(typeof displayName === 'string' ? { displayName } : {}),
        ...(Array.isArray(models) && models.length > 0 ? { hasModels: true } : {}),
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
export function readPiAiProviderRoutes(settings: SettingsReader): Readonly<Record<string, { baseURL?: string }>> {
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
 * 读取宿主 llm 注册表里「已注册 adapter」的 provider id（issue #91）。
 *
 * 必须经 `ctx.get('llm')`，**不能**用属性访问 `ctx.llm`：cordis 的服务代理要求
 * 服务名出现在插件 `inject` 里，否则抛 `cannot get property "llm" without inject`
 * ——1.4.31 把这个异常吞掉后退化成空集合，结果是「修复发版了但完全不生效」且无任何
 * 可观察信号（issue #91 follow-up）。本函数把「读不到」与「读到了空集合」都显式
 * 回报给调用方，让上层能告警而不是静默降级。
 * @param get - 宿主上下文的 `get(name)` 访问器（cordis 的免 inject 读取口）。
 * @returns `ids` = 已注册 provider id 集合（读不到时为空集）；
 *  `reason` = 读取失败或结果不可用的原因；成功时缺省。
 */
export function readRegisteredProviderIds(
  get: ((name: string) => unknown) | undefined,
): { ids: ReadonlySet<string>; reason?: string } {
  if (typeof get !== 'function') return { ids: new Set(), reason: 'the host context exposes no get() accessor' }
  try {
    const llm = get('llm') as { listProviders?: () => readonly { id?: unknown }[] } | undefined
    if (llm === undefined) return { ids: new Set(), reason: 'the host llm service is not registered' }
    if (typeof llm.listProviders !== 'function') {
      return { ids: new Set(), reason: 'the host llm service exposes no listProviders()' }
    }
    const providers = llm.listProviders()
    if (providers.length === 0) return { ids: new Set(), reason: 'the host llm registry reports no registered providers' }
    const ids = new Set<string>()
    for (const provider of providers) {
      if (typeof provider?.id === 'string' && provider.id !== '') ids.add(provider.id)
    }
    if (ids.size === 0) return { ids, reason: 'the host llm registry returned no usable provider ids' }
    return { ids }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return { ids: new Set(), reason: `the host llm registry could not be read (${detail})` }
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
 * 构造「会话头 → 宿主侧会话标题」解析器（issue #103，可选依赖）。
 *
 * 插件的会话标题取自日志里的 `session/title` 事件——**日志读不动**时（宿主拒绝
 * 该格式/代际，插件折叠失败），只能吃账本旧行，标题会永远停在重命名前的值。
 * 宿主自己的会话投影缓存仍可能记得这个标题（`cachedSnapshot` / 既有能力
 * `cachedPredecessorTitle`：格式代际边缘的标题仍能跨边缘存活），用它兜底可让
 * 账单明细的标题跟随工作区。
 *
 * 宿主没有该服务（0.1.x 代际）或读取失败都返回 undefined：绝不抛错，行为与
 * 现状一致（可选依赖，不影响主流程）。
 * @param ctx - host context carrying the optional session projection cache.
 * @returns 标题解析函数；服务不可用时 undefined。
 */
function buildSessionTitleResolver(ctx: Context): ((header: SessionHeader) => string | undefined) | undefined {
  interface ProjectionCacheFace {
    cachedSnapshot?: (header: SessionHeader, keys?: readonly string[]) => { values?: Record<string, unknown> } | undefined
    cachedPredecessorTitle?: (header: SessionHeader) => { values?: Record<string, unknown> } | undefined
  }
  let cache: ProjectionCacheFace | undefined
  try {
    cache = ctx.get('sessionProjectionCache') as ProjectionCacheFace | undefined
  } catch {
    return undefined
  }
  if (cache === undefined) return undefined
  const titleOf = (values: Record<string, unknown> | undefined): string | undefined => {
    const title = values?.title
    return typeof title === 'string' && title !== '' ? title : undefined
  }
  const cachedSnapshot = cache.cachedSnapshot
  const cachedPredecessorTitle = cache.cachedPredecessorTitle
  if (typeof cachedSnapshot !== 'function' && typeof cachedPredecessorTitle !== 'function') return undefined
  return (header) => {
    try {
      // 当前代际的存档行优先；旧代际（宿主读不动的那些）走既有能力的前代标题。
      if (typeof cachedSnapshot === 'function') {
        const title = titleOf(cachedSnapshot(header, ['title'])?.values)
        if (title !== undefined) return title
      }
      if (typeof cachedPredecessorTitle === 'function') {
        return titleOf(cachedPredecessorTitle(header)?.values)
      }
      return undefined
    } catch {
      return undefined
    }
  }
}

/**
 * 凭据 seam 的宽容解析：ref 名 → 非空值；失败/缺失返回 undefined（多 surface 共用，
 * 失败按结构化静默记录）。
 */
function refResolver(credentials: CredentialProvider): (name: string) => Promise<string | undefined> {
  return async (name) => {
    try {
      const resolved = await credentials.resolve(credentialRef(name))
      return resolved?.value !== undefined && resolved.value !== '' ? resolved.value : undefined
    } catch (error) {
      // 单个 ref 解析失败视为未配置（查询走「未读出」兜底，不抛错）。
      swallowed('credential-resolve-failed', error)
      return undefined
    }
  }
}

/**
 * 解析订阅适配器需要的 API Key：经典形态从 llm-pi-ai 设置的 `providers.<id>.apiKeyEnv`
 * 读引用（如 kimi-coding → KIMI_CODING_API_KEY）；新版宿主设置页把 key 直接存成
 * 凭据 refs（路由约定名 `<ROUTE>_API_KEY`，pi-ai 目录 ambient 名补充），显式引用
 * 解析不到时按约定名找回。同时识别出已配置的订阅套餐（供面板只显示已识别的）。
 * @param settings - the settings service (reads the llm-pi-ai namespace).
 * @param credentials - the credentials service (resolves the env refs).
 */
export async function resolveSubscriptionKeys(
  settings: SettingsReader,
  credentials: CredentialProvider,
): Promise<{ keys: SubscriptionKeys; identified: IdentifiedSubscriptionPlan[] }> {
  const providers = await readPiAiProviders(settings)
  const resolve = refResolver(credentials)
  const { keys, keyConfigured } = await resolveSubscriptionAccess(providers, resolve)
  // zai-coding-cn 是智谱国内域：CN key 在手即跟随 bigmodel-cn。只影响未显式
  // 声明 region 的声明式 plan 配置——identify 出的两条 Z.ai 路由各带固定区域。
  if (keys.zaiCnApiKey !== '') keys.zaiRegion = 'bigmodel-cn'
  // OpenCode 便捷回退：opencode(opencode-go) 路由没解析出 key 时，读本机 OpenCode
  // 客户端自存的凭据文件（~/.local/share/opencode/auth.json）。文件不存在/读不动/格式变
  // 一律视为「没有凭据」安静退回，绝不报错——这只是一次便利，不是必须具备。
  if (keys.opencodeApiKey === '') {
    keys.opencodeApiKey = await readOpenCodeToken()
  }
  // Claude Code 登录态自动发现：读 ~/.claude/.credentials.json 的 OAuth token，
  // 发现到凭据时把 Claude 订阅行补进识别结果（anthropic 不在 SUBSCRIPTION_ID_RE，
  // 不补行的话自动发现永远没机会展示）。文件不存在/未登录安静退回，绝不报错。
  keys.anthropicApiKey = await readClaudeOAuthToken()
  // 识别视图：显式 apiKeyEnv / models 已配置 / 约定 ref 解析出 key，三信号任一即识别。
  const identified = identifySubscriptionPlans(Object.fromEntries(Object.entries(providers).map(([route, entry]) => [
    route,
    {
      ...(entry.apiKeyEnv !== undefined ? { apiKeyEnv: entry.apiKeyEnv } : {}),
      ...(entry.hasModels === true ? { hasModels: true } : {}),
      ...(keyConfigured.has(route) ? { refResolved: true } : {}),
    },
  ])))
  if (keys.anthropicApiKey !== '' && !identified.some(plan => plan.provider === 'anthropic')) {
    identified.push({ provider: 'anthropic', displayName: 'Claude (Anthropic)', adapter: true })
  }
  return { keys, identified }
}

/** 读本机 OpenCode 客户端的凭据 token；取不到返回空串（安静退回）。 */
async function readOpenCodeToken(): Promise<string> {
  try {
    const auth = JSON.parse(await readFile(join(homedir(), '.local', 'share', 'opencode', 'auth.json'), 'utf8')) as unknown
    return parseOpenCodeAuthDocument(auth)
  } catch {
    // 文件不存在 / 读不动 / JSON 解析失败 → 视为没有凭据，不报错。
    swallowed('opencode-auth-missing')
  }
  return ''
}

/**
 * 从本机 Claude Code 登录态自动发现 Anthropic OAuth access token；取不到返回
 * 空串（安静退回）。与 OpenCode auth.json 兜底同款姿态：只是一次便利，绝不报错。
 */
async function readClaudeOAuthToken(): Promise<string> {
  try {
    const cred = JSON.parse(await readFile(join(homedir(), '.claude', '.credentials.json'), 'utf8')) as unknown
    const token = (cred as { claudeAiOauth?: { accessToken?: unknown } } | null)?.claudeAiOauth?.accessToken
    if (typeof token === 'string' && token !== '') return token
  } catch {
    // 未登录 Claude Code / 文件不可读 → 视为没有凭据。
  }
  return ''
}

/** 宿主 0.1.3-alpha.2+ 的 handle.read 切片包装（0.1.3-alpha.1 返回裸事件数组）。 */
interface HostReadSlice013 {
  readonly events: readonly SessionEvent[]
}

/** 宿主 0.1.3+ 的 SessionHandle 最小读取面（结构化声明，类型不依赖 0.1.3 包）。 */
interface HostPersistenceHandle013 {
  readonly header: SessionHeader
  readonly inheritedEventCount: number
  read(offset?: number, length?: number): Promise<readonly SessionEvent[] | HostReadSlice013>
  [Symbol.asyncDispose]?: () => Promise<void>
}

/** 宿主 0.1.3+ 的 SessionPersistence 最小面：list 返回 {header, revision} 快照行。 */
interface HostPersistence013 {
  list(): Promise<readonly { header: SessionHeader; revision: string | number }[]>
  open(id: string, access: 'read' | 'write'): Promise<HostPersistenceHandle013>
}

/**
 * 宿主 persistence 形状适配。宿主 0.1.3 起 SessionPersistence 改为
 * SessionHandle 模型（open(id,'read') 后经 handle.read(offset) 读，fork 边界
 * 挂在 handle.inheritedEventCount，list 返回 {header, revision} 快照行，
 * 0.1.2 的 readFrom/locate 消失；handle.read 自 0.1.3-alpha.2 起返回
 * {eventState, events} 包装）。这里按结构探测把两种宿主形状都收敛为
 * 聚合层期望的 0.1.2 面貌：0.1.2 直接带 readFrom 的原样直通；0.1.3 的
 * 读取转为 open → handle.read，revision 令牌经 stampOf 暴露给增量缓存。
 * 候选时刻的运行时对象是宿主注入的外部形状，结构断言即 durable 收窄点。
 * 导出供测试：纯函数（不触 ctx）。
 */
export function adaptSessionPersistence(raw: unknown): UsagePersistence {
  if (typeof (raw as { readFrom?: unknown } | null)?.readFrom === 'function') {
    return raw as UsagePersistence
  }
  const host = raw as HostPersistence013
  // 最近一次 list 的 revision 表：增量缓存的失效键（readFrom 前后 revision
  // 不变 ⇒ 日志未动）。每次 list 刷新，未 listed 的会话视为无 stamp（重折）。
  const revisions = new Map<string, string>()
  return {
    list: async () => {
      const snapshots = await host.list()
      revisions.clear()
      for (const snapshot of snapshots) revisions.set(String(snapshot.header.id), String(snapshot.revision))
      return snapshots.map(snapshot => snapshot.header)
    },
    readFrom: async (id, fromSeq) => {
      const handle = await host.open(id, 'read')
      try {
        const slice = await handle.read(fromSeq)
        // 0.1.3-alpha.1 返回裸事件数组；0.1.3-alpha.2 起包一层
        // SessionHandleReadResult（{eventState, events}）——按形状收窄。
        // Array.isArray 不收窄 readonly 数组联合，分支内显式断言。
        const events = Array.isArray(slice)
          ? (slice as readonly SessionEvent[])
          : (slice as HostReadSlice013).events
        return {
          meta: handle.header,
          fromSeq: sessionLogOffsetOf(fromSeq),
          inheritedEventCount: sessionLogOffsetOf(handle.inheritedEventCount),
          events,
        }
      } finally {
        await handle[Symbol.asyncDispose]?.()
      }
    },
    stampOf: async (id: SessionId) => revisions.get(String(id)) ?? null,
  }
}

/**
 * 读取 usage_stats 工具开关的当前生效值：宿主 0.1.7+ 经 Config 解析后是 volatile
 * 引用（.get() 即时反映设置写入，无需重载），直连 apply（测试）与未导出 Config 的
 * 旧宿主组合是普通布尔；缺省/非法值一律回 DEFAULT。
 * @param config - apply 收到的插件 config。
 * @returns 开关当前生效值。
 */
function readUsageStatsToggle(config: UsageBillingConfig): boolean {
  const field = config[ENABLE_USAGE_STATS_TOOL_FIELD]
  if (typeof field === 'boolean') return field
  if (typeof field === 'object' && field !== null && typeof field.get === 'function') {
    const current = field.get()
    return typeof current === 'boolean' ? current : DEFAULT_ENABLE_USAGE_STATS_TOOL
  }
  return DEFAULT_ENABLE_USAGE_STATS_TOOL
}

/**
 * Host plugin body: serve real aggregated usage to the browser dashboard.
 * @param ctx - host context carrying webServer and sessionPersistence.
 * @param config - optional statsPath override.
 */
export function apply(ctx: Context, config: UsageBillingConfig = {}): void {
  // 反向代理主机名白名单：归一化一次，所有端点共用同一守卫路径（含 POST 写入）。
  const trustedHosts = normalizeTrustedHosts(config.trustedHosts)
  // usage_stats 工具开关的双世代通道：旧宿主 ≤0.1.6 走 settings.register 命名空间
  // scope（usageSettingsScope）；宿主 0.1.7+ 注册面已移除，走 volatile config 投影
  // （liveSettings：经 settings.update 写回本条目 config）。HTTP 路由据此读写。
  let usageSettingsScope: SettingsNamespaceScope<UsageBillingSettings> | undefined
  let liveSettings: { update(ns: string, patch: object): Promise<void>; ns: string } | undefined
  const cwd = process.cwd()
  // 持久化文件的默认根跟随宿主 harness home：DSH_HOME 环境变量优先，回退
  // `~/.dsh`（resolveDshHome 的解析语义与宿主一致）。自定义 DSH_HOME 的多套
  // 隔离环境互不污染账本 / 快照 / 对账基准（issue #52）；config 显式路径仍最高。
  const dshHome = resolveDshHome()
  const snapshotPath = config.snapshotPath ?? join(dshHome, '.dsh-usage-stats.json')
  const ledgerPath = config.ledgerPath ?? join(dshHome, '.dsh-usage-ledger.json')

  // 独立持久账本：主文件损坏时读 `.bak`，写入使用宿主的原子写工具并限制为
  // 当前用户可读。账本保存每个已成功折叠的会话；删除会话日志不删除账本行。
  const ledgerStore = createFileUsageLedgerStore(ledgerPath)

  // 余额差对账基准：持久化到独立文件（跨重启保留当日基准），随每次 balance
  // 轮询刷新。仅官方 DeepSeek 方向对账，见 reconcile.ts。
  const reconcilePath = config.reconcilePath ?? join(dshHome, '.dsh-usage-reconcile.json')
  let reconcileRef: BalanceRef | null = null
  void (async () => {
    try {
      const doc = JSON.parse(await readFile(reconcilePath, 'utf8')) as { ref?: unknown }
      const ref = doc.ref
      if (ref !== null && typeof ref === 'object') {
        const candidate = ref as BalanceRef
        if (typeof candidate.date === 'string' && typeof candidate.total === 'number'
          && typeof candidate.granted === 'number' && typeof candidate.topped === 'number'
          && typeof candidate.currency === 'string') {
          reconcileRef = candidate
        }
      }
    } catch {
      // 基准文件缺失/损坏：视为首次，重新打基准。
      swallowed('reconcile-ref-missing')
    }
  })()
  const persistReconcileRef = (): void => {
    if (reconcileRef === null) return
    const payload = JSON.stringify({ ref: reconcileRef })
    void writeFileAtomic(reconcilePath, payload, { mode: 0o600, dirMode: 0o700 })
      .catch(() => { /* 基准写失败不影响余额查询主流程 */ })
  }

  // 常驻增量聚合器：按会话缓存折叠结果（日志 mtime+size 失效），
  // 前端 30 秒轮询只重算写过的会话。
  // 项目归属用工作区标题（host workspaceRegistry 可选；缺失时 resolver 为 undefined，回退目录名）。
  const workspaceTitleResolver = buildWorkspaceTitleResolver(ctx)
  // 读不动的会话的标题兜底（host sessionProjectionCache 可选；缺失时 undefined，行为不变）。
  const sessionTitleResolver = buildSessionTitleResolver(ctx)
  // 用户自定义模型别名：聚合启动前注入（与客户端渲染共用一张表，见 pricing.ts）。
  applyBuiltinCatalog(BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES)
  applyUserModelAliases(config.modelKeyAliases)
  // 已注册 adapter 的 provider 集合（宿主 llm 注册表）：llm-pi-ai 之外的插件路由
  // （ctx.llm.registerAdapter，issue #91 的 commandcode）经此归位 direct 桶按官方价
  // 计费。读取经 readRegisteredProviderIds（免 inject 声明，绝不属性访问 ctx.llm）
  // ——软依赖：llm 服务缺失/异常时 warn 一次并退化为空集，unknown 口径不变；不能
  // 静默，否则「修复上线但不生效」无法自查（1.4.31 的实际故障形态）。
  let llmRegistryWarned = false
  const registeredProvidersOf = (): ReadonlySet<string> => {
    const { ids, reason } = readRegisteredProviderIds(
      (ctx as { get?: (name: string) => unknown }).get?.bind(ctx),
    )
    if (reason === undefined) {
      llmRegistryWarned = false
      return ids
    }
    if (!llmRegistryWarned) {
      llmRegistryWarned = true
      console.warn(
        `[usage-billing] ${reason}; plugin-registered adapter channels (e.g. commandcode) stay in the`
        + ' unknown bucket and are billed at 0 (issue #91). Channel grouping falls back to llm-pi-ai routes only.',
      )
    }
    return ids
  }
  // 订阅豁免集合（引用语义传入聚合器）：基础 = 显式配置或默认基线；MiniMax 系路由
  // 按 key 前缀动态增删（`sk-cp-` = Coding Plan 豁免，普通 `sk-` = 按量计费）——同一
  // 官方路由 id 两类用户两用，此前默认集合干脆不含 minimax，套餐用户被无条件按量
  // 计费。集合内容变化经聚合器指纹自动触发历史行全量重折。
  const subscriptionRoutes = new Set<string>(config.subscriptionProviders ?? DEFAULT_SUBSCRIPTION_PROVIDERS)
  // 显式配置是下限：用户明写进 subscriptionProviders 的路由不被 key 分类移除
  //（只自动补入 sk-cp- 的路由，不自动踢出用户的显式声明）。
  const explicitSubscriptionRoutes = new Set<string>(config.subscriptionProviders ?? [])
  const refreshMiniMaxPlanRoutes = async (): Promise<void> => {
    try {
      const providers = await readPiAiProviders(ctx.settings)
      const classified = await classifyMiniMaxPlanRoutes(providers, refResolver(ctx.credentials))
      for (const [route, isPlan] of classified) {
        if (isPlan) subscriptionRoutes.add(route)
        else if (!explicitSubscriptionRoutes.has(route)) subscriptionRoutes.delete(route)
      }
    } catch (error) {
      // 分类失败保持现状（不豁免），下一轮配额刷新再试。
      swallowed('minimax-plan-classify-failed', error)
    }
  }
  const aggregator = createUsageAggregator(adaptSessionPersistence(ctx.sessionPersistence), {
    subscriptionMatcher: subscriptionRoutes,
    // 历史路由别名：改名/删除路由的历史用量按别名归位（站点/订阅/官方判定同步生效）。
    ...(config.routeAliases === undefined ? {} : { routeAliases: config.routeAliases }),
    // 中转站零配置发现：每次聚合读 llm-pi-ai providers 的 baseURL（路由→站点映射）。
    resolveRoutes: () => readPiAiProviderRoutes(ctx.settings),
    // 插件注册的 adapter 通道（llm-pi-ai 之外）按直连归位计价（issue #91）。
    resolveRegisteredProviders: registeredProvidersOf,
    // 用户模型别名进折叠指纹：别名改动让历史行按新目录键重折（issue #91 P2）。
    ...(config.modelKeyAliases === undefined ? {} : { modelKeyAliases: config.modelKeyAliases }),
    // 项目归属用工作区标题命名（host workspaceRegistry 为可选依赖，缺失时回退目录名）。
    ...(workspaceTitleResolver === undefined ? {} : { resolveWorkspaceTitle: workspaceTitleResolver }),
    // 读不动的会话：标题取宿主侧（投影缓存）的值，避免停在重命名前的旧值（issue #103）。
    ...(sessionTitleResolver === undefined ? {} : { resolveSessionTitle: sessionTitleResolver }),
    // 联网搜索请求的单次费用估算（issue #15）；缺省 0.02 元/次，配置可覆盖/关闭。
    ...(config.searchCallEstimateCny === undefined ? {} : { searchCallEstimateCny: config.searchCallEstimateCny }),
    ledger: ledgerStore,
  })
  // 启动即按 key 分类一次 MiniMax 路由（凭据 seam 内存解析，毫秒级），首轮聚合通常
  // 已能拿到正确豁免；万一首轮抢先，集合变化会在下一轮触发重折自愈。
  void refreshMiniMaxPlanRoutes()
  // 插件卸载时把落盘节流窗口内的账本改动 flush 掉（fire-and-forget：
  // disposer 不能阻塞关闭流程，等不起进行中的长折叠）。
  ctx.effect(() => () => { void aggregator.flush() }, 'usage-billing: ledger flush on dispose')
  // 安装/升级后的历史回放预热：宿主就绪即后台全量折叠一次（聚合器有 in-flight
  // 去重与账本幂等，与首次面板请求并发也无副作用）。不预热的话聚合只在前端轮询
  // 到达时触发，新用户首次打开面板要等一遍全量折叠，观感是「装完没数据」。
  // 预热重放必须等首次价格拉取 settle：refreshPricing() 是 fire-and-forget，
  // 而 WARMUP_DELAY_MS 只有 3s，冷启动时 models.dev（数 MB）几乎必然更慢。
  // 一旦重放先跑，整份历史会以内置目录价折叠，而折叠复用键（stamp +
  // configFingerprint）不含价格，价格随后到达也不会让它失效。
  // 拉取失败同样继续（等价于现状的内置价回退），不会把预热卡住。
  let pricingReady: Promise<void> | undefined
  const warmupTimer = setTimeout(() => {
    void Promise.resolve(pricingReady)
      .catch(() => {})
      .then(() => aggregator.aggregate())
      .then(() => { console.info('[usage-billing] historical replay warmed up; ledger ready') })
      .catch((error: unknown) => {
        console.warn('[usage-billing] historical replay warmup failed; will fold on first dashboard request:', error)
      })
  }, WARMUP_DELAY_MS)
  ctx.effect(() => () => { clearTimeout(warmupTimer) }, 'usage-billing: historical replay warmup timer')
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
    const payload = JSON.stringify(doc)
    // P0-3 崩溃恢复：写入前先把当前的上一版快照备份为 `.bak`。主文件一旦损坏
    //（旧版本非原子写入 / 磁盘写坏），聚合失败路径的 fallback 会用 `.bak` 重建。
    void (async () => {
      try {
        const existing = await readFile(snapshotPath, 'utf8')
        await writeFileAtomic(`${snapshotPath}.bak`, existing, { mode: 0o600, dirMode: 0o700 })
      } catch {
        // 旧快照不存在（首次运行）或不可读：无需备份，直接写新快照。
        swallowed('snapshot-bak-missing')
      }
      try {
        await writeFileAtomic(snapshotPath, payload, { mode: 0o600, dirMode: 0o700 })
      } catch {
        // 快照写失败不影响服务：内存聚合值已下发。
        swallowed('snapshot-write-failed')
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
        swallowed('snapshot-candidate-unreadable')
      }
    }
    return null
  }

  // 跨实例提醒认领（issue #44）：多实例（CLI + 桌面等）合法共存，各自轮询会重复
  // 发桌面通知——此前用快照 pid 心跳警告「另一实例」，误报频繁且不解决重复本身，
  // 现改为提醒先到先得：客户端发通知前 POST 认领，键已存在（另一实例刚发过）→
  // claimed:false 跳过。认领表持久在统计目录旁（原子写），跨实例、跨重启生效；
  // 键自带日期戳/切换点粒度，无需过期，超上限裁掉最旧的键。两实例同毫秒认领同一
  // 键的窗口极窄，最坏退化为一重复弹，与文件锁的残留误判相比是更好的取舍。
  const notifyClaimsPath = `${snapshotPath}.notify-claims.json`
  // 进程内认领表（`notifyClaims`）由 src/routes/notify-claim.ts 内的模块级单例持有。
  registerNotifyClaimRoute(ctx, { trustedHosts, claimsPath: notifyClaimsPath })


  // usage_stats 动态工具（默认关闭）：模型可主动查询用量费用（今天 / 本月 / 当前会话 / 累计）。
  // 该工具占用每次请求的上下文，而 coding 场景多在仪表盘看用量，属可关的打扰项。
  // 开关双世代持久化：旧宿主 ≤0.1.6 存设置命名空间 `ui-usage-billing.enableUsageStatsTool`；
  // 宿主 0.1.7+ 存本条目 config 的 volatile 字段（Config schema 投影）。工具注册由
  // syncUsageTool 驱动：初始一次 + 每次 volatile 提交（loader/volatile-update，不重载
  // 插件）+ 旧世代写回后显式调用，切换即时生效；cordis.yml 的 `enableUsageStatsTool`
  // config 作为组合 base 兜底。
  let usageToolDisposer: (() => void) | undefined
  // 工具注册动作由 tools 服务就绪时填充；注册前 sync 是无操作（组合期 tools 缺席安全）。
  let usageToolRegister: (() => () => void) | undefined
  const syncUsageTool = (): void => {
    if (usageToolRegister === undefined) return
    if (readUsageStatsToggle(config)) {
      if (usageToolDisposer === undefined) usageToolDisposer = usageToolRegister()
      return
    }
    if (usageToolDisposer !== undefined) {
      usageToolDisposer()
      usageToolDisposer = undefined
    }
  }
  ctx.inject(['tools'], (toolsCtx) => {
    usageToolRegister = () => toolsCtx.tools.register(defineTool({
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
          // 按站点归组：bySite 全量；relay 只计中转站桶（site:<origin> 键），
          // direct/unknown 不计入（口径实现见 sumSiteBuckets）。
          return { range: args.range, ...sumSiteBuckets(stats.bySite ?? {}, args.range) }
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
        // session：直接从聚合器读该会话的完整折叠——doc 的 byTurn 封顶 200 行，
        // 用户回到旧会话续聊时其轮次已被最近轮次挤出，遍历 byTurn 会低估。
        const sessionId = exec.agent?.id
        if (sessionId === undefined) throw new Error('usage_stats 的 session 范围需要 agent 会话上下文')
        const summary = await aggregator.sessionUsageOf(String(sessionId))
        if (summary !== undefined) return { range: args.range, ...summary }
        // 兜底：日志与账本均无该会话（理论仅发生在日志与账本同时缺失时），回退 doc 遍历。
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
    syncUsageTool()
    // 事件只在本插件 fiber 上发射（兄弟插件的 volatile 提交沿 ctx 树向上冒泡，互不可见）。
    ctx.on('loader/volatile-update', syncUsageTool)
  })

  // 设置开关的双世代读写面：settings 服务就绪后按宿主世代接线。
  ctx.inject(['settings'], (sctx) => {
    const legacy = sctx.settings as unknown as SettingsReader & {
      register?: (ns: string, schema: unknown, options?: { base?: unknown }) => SettingsNamespaceScope<UsageBillingSettings>
      update?: (ns: string, patch: object) => Promise<void>
    }
    if (typeof legacy.register === 'function') {
      // 宿主 ≤0.1.6：注册命名空间并持有读写 scope（GET/POST 都经 scope）。
      usageSettingsScope = legacy.register(usageBillingSettingsNs, UsageBillingSettingsSchema, {
        base: { enableUsageStatsTool: readUsageStatsToggle(config) },
      })
      return
    }
    // 宿主 0.1.7+：register 已从 SettingsForms 移除，写回走 SettingsForms.update——
    // 目标 ns 是本插件条目 id（loader 把 fiber.entry 注入本 fiber；仅直接挂载的
    // 测试组合会缺失，回退约定 ns）。读取不在此处：volatile 引用覆盖 GET 与工具同步。
    // update 是服务类方法（内部依赖 this.write 持久化），必须以方法调用形式包一层，
    // 不能裸摘函数引用（this 脱绑后真机 TypeError: this.write is not a function）。
    const forms = legacy
    if (typeof forms.update !== 'function') return
    const entryId: string | undefined = ctx.fiber.entry?.options.id
    liveSettings = {
      update: (ns, patch) => forms.update!(ns, patch),
      ns: entryId ?? usageBillingSettingsNs,
    }
  })

  // 后台拉取实时定价（汇率 + OpenRouter 模型价 + models.dev 目录外补充），
  // 失败自动降级内置目录；之后每 6 小时刷新一次，汇率/价格无需重启进程就能
  // 保持最新。host 侧同步应用：聚合计价与客户端展示同源（含目录外补充条目）。
  let live: LivePricing = { source: 'builtin' }
  // 上次同步完成的本机时间戳：每次刷新尝试完成即更新（live 或降级 builtin 都是
  // 一次完成的同步动作），随 pricing 响应下发供费率条展示「上次同步」。
  let pricingSyncedAt = 0
  /** 价目表代际：extraModels 的 key 集合稳定序列化。fetchLivePricing 每次都重建
   *  数组（引用必不同），引用比较恒真会退化成「每次刷新都跑一轮 reprice」；
   *  key 集合变化才代表真的出现了「此前未收录、现在可计价」的模型。 */
  const priceGenerationOf = (snapshot: LivePricing): string =>
    (snapshot.extraModels ?? []).map(model => model.key).sort().join(',')
  let priceGeneration = priceGenerationOf(live)
  const refreshPricing = async (): Promise<void> => {
    live = await fetchLivePricing()
    pricingSyncedAt = Date.now()
    applyLivePricing(live)
    // 响应体缓存失效：live 变了，pricing 响应须重新序列化（含内置目录与别名表）。
    pricingBodyCache = undefined
    // 价目表代际变化（builtin→live，或刷新后新增可计价模型）：此前因「折叠时
    // 价目表不全」而 cost=0 的已收录模型行，须按新价目表重折出 cost，与显示层
    // 目录价口径对齐（修复「明细 ≈¥38 vs 总额 ¥7」的双口径）。复用判定是惰性的
    //（aggregate.ts foldNeedsReprice：行内 unpricedModels ∩ 现价目表），只有含
    // 受影响模型的行重折，其余行依旧零读取复用——不是全量重折。key 集合未变时
    // 跳过整轮聚合，价格刷新本身不带来额外开销。
    const nextGeneration = priceGenerationOf(live)
    if (nextGeneration !== priceGeneration) {
      priceGeneration = nextGeneration
      void aggregator.aggregate()
        .then(() => { console.info('[usage-billing] repriced folds after pricing refresh; ledger aligned with live catalog') })
        .catch((error: unknown) => {
          console.warn('[usage-billing] reprice fold after pricing refresh failed; next aggregate retries:', error)
        })
    }
  }
  // /api/billing/pricing 响应体缓存：内置目录与别名表在 activate 注入后不变，
  // 只有 live/syncedAt 随 refresh 变化；缓存整个响应体避免每请求重复序列化
  // 约 40 KiB 的目录数据。
  let pricingBodyCache: string | undefined
  const pricingBody = (): string => {
    if (pricingBodyCache === undefined) {
      pricingBodyCache = JSON.stringify({
        ...live,
        syncedAt: pricingSyncedAt,
        catalog: BUILTIN_MODEL_CATALOG,
        aliases: BUILTIN_MODEL_KEY_ALIASES,
      })
    }
    return pricingBodyCache
  }
  pricingReady = refreshPricing()
  ctx.effect(
    () => {
      const timer = setInterval(() => { void refreshPricing() }, PRICING_REFRESH_INTERVAL_MS)
      return () => { clearInterval(timer) }
    },
    'usage-billing: pricing refresh timer',
  )

  registerPricingRoutes(ctx, { trustedHosts, body: pricingBody, refresh: refreshPricing })

  // 手动同步价格目录与 GET 价目表同 concern，由 src/routes/pricing.ts 内的
  // registerPricingRoutes 统一注册两条路由（GET /pricing + POST /pricing/refresh）。

 let balanceCache: { at: number; doc: { balances: Awaited<ReturnType<typeof queryBalances>>; reconcile?: ReconcileEvent } } = { at: 0, doc: { balances: [] } }
  // in-flight 去重（自审计延期项）：仪表盘、悬浮费用条、usage-stats 工具会并发
  // 打本路由；缓存过期的瞬间多个请求各自全套上游查询（余额 + 自定义 + 声明端点
  // + 对账），共享同一次进行中的刷新，上游只被打一遍。
  let balanceInflight: Promise<void> | undefined
  const refreshBalance = async (): Promise<void> => {
    // 余额 key 复用 llm-pi-ai 的 providers（同订阅）：部署为某 provider 配一次即可。
    // DeepSeek 保留 `balanceApiKeyEnv` 特例：llm-pi-ai 未配 deepseek key 时仍可用该 env 查余额。
    // 注意不能只看路由是否存在——路由存在但 apiKeyEnv 缺失（只配了 baseURL 之类）时，
    // 兜底同样要生效，否则余额会错标「未配置」。
    const piProviders = await readPiAiProviders(ctx.settings)
    const providers = { ...piProviders }
    const deepseekKey = providers['deepseek']?.apiKeyEnv
    if (deepseekKey === undefined || deepseekKey === '') {
      providers['deepseek'] = { ...providers['deepseek'], apiKeyEnv: config.balanceApiKeyEnv ?? DEFAULT_BALANCE_API_KEY_ENV }
    }
    const balances = await queryBalances(ctx, providers)
    // 自定义 Provider 余额（任意 HTTP 端点）：独立于内置三家，逐个成败。
    const custom = await queryCustomBalances(ctx, config.customBalances ?? [])
    // 声明端点（declarative）：为内置表没有的供应商自声明余额/额度接口。
    // 绑定到某条已配置 provider 的同源地址，安全边界由 declarative.ts 强制执行。
    const declared = await queryDeclaredEndpoints(ctx, piProviders, config.declaredEndpoints ?? [])
    // P1-5 鉴权分类告警：区分「配置错了 key」与「上游不可达」，协助定位。
    for (const row of [...balances, ...custom, ...declared]) {
      if (row.error === 'unauthorized') warnAuthOnce('balance', row.provider, row.displayName)
    }
    // 余额差对账：用官方余额当日变动反推消费，与本地账本今日官方费用比对。
    // 只对 DeepSeek 官方余额行做（订阅/第三方不动官方余额）；取不到余额时不打扰。
    // 币种口径：余额差是原生币种，账本费用是人民币——USD 账户直接比对会永久
    // 虚报漂移（约 6.8 倍差），只在人民币（或未标注币种的历史形状）下对账。
    const official = balances.find(row => row.provider === 'deepseek')
    let reconcile: ReconcileEvent | undefined
    const reconcilable = official !== undefined && official.totalBalance !== undefined
      && (official.currency === undefined || official.currency.toUpperCase() === 'CNY')
    if (official !== undefined && reconcilable) {
      const now = Date.now()
      const today = dayStamp(now)
      // 对账基线取「最近一次**已完成**的聚合文档」，既不触发也不等待新的
      // 全量折叠（issue #104）：重度用户（数百会话、GB 级日志）的一次折叠要
      // 几十秒，挂在余额路由上会把响应拖到分钟级——浏览器同源连接只有 6 条，
      // 多标签页各挂一条即占满连接池，宿主界面随之卡死。聚合由 usage-stats
      // 驱动（自带 1.5s 预算的 stale-while-revalidate），内存里始终留有一份
      // 最近文档可读。
      const recent = aggregator.lastDocOf()
      // 文档够新（≤5 分钟）才可信：过期文档的「今日费用」偏小，用它对账会
      // 报假漂移。基线不可信时本轮不对账、不动基准（基准过期后重新打点会
      // 产生假漂移），并在后台补一次聚合，下一轮刷新即可用上新基线。
      const basisFresh = recent !== undefined && now - recent.updatedAt <= RECONCILE_BASIS_MAX_AGE_MS
      if (basisFresh) {
        const todayOfficialCost = recent?.byDay[today]?.officialCost ?? 0
        const result = reconcileBalanceDelta(reconcileRef, official, todayOfficialCost, today, now)
        const refChanged = result.ref !== null && result.ref !== reconcileRef
        reconcileRef = result.ref
        if (result.event !== null && result.event.kind !== 'flat') {
          reconcile = { ...result.event, provider: official.displayName, ...(official.currency === undefined ? {} : { currency: official.currency }) }
        }
        // 基准未变（ok/flat 保早间基线）不重复落盘；只在基准真正前移时写。
        if (refChanged) persistReconcileRef()
      } else {
        // 后台补一次聚合（不等待）：下轮刷新才有可信基线。聚合自身有 TTL 与
        // in-flight 去重，不会叠出多份折叠。
        void aggregator.aggregate().catch(() => { /* 下一轮刷新再试 */ })
        swallowed('reconcile-basis-stale')
      }
    }
    const doc = { balances: [...balances, ...custom, ...declared], ...(reconcile === undefined ? {} : { reconcile }) }
    balanceCache = { at: Date.now(), doc }
  }
  const refreshBalanceOnce = (): Promise<void> => {
    balanceInflight ??= refreshBalance().finally(() => { balanceInflight = undefined })
    return balanceInflight
  }
  registerBalanceRoute(ctx, {
    trustedHosts,
    cached: () => balanceCache,
    refreshOnce: refreshBalanceOnce,
    cacheMs: BALANCE_CACHE_MS,
    responseBudgetMs: BALANCE_RESPONSE_BUDGET_MS,
  })


  // usage_stats 工具开关：插件自带的读/写接口（不依赖宿主浏览器设置白名单）。
  // GET 返回当前是否注入；POST 写设置命名空间（重启应用后工具注入随新值生效）。
  registerUsageToolRoute(ctx, {
    trustedHosts,
    read: () => usageSettingsScope !== undefined ? usageSettingsScope.get().enableUsageStatsTool : readUsageStatsToggle(config),
    write: async (next) => {
      if (usageSettingsScope !== undefined) await usageSettingsScope.update({ enableUsageStatsTool: next })
      else if (liveSettings !== undefined) await liveSettings.update(liveSettings.ns, { [ENABLE_USAGE_STATS_TOOL_FIELD]: next })
      else throw new Error('settings unavailable')
    },
    syncTool: syncUsageTool,
  })


  // 订阅套餐额度：外部 API 低频变化，缓存 5 分钟避免每次轮询都打上游。
  // 只返回"识别到"的套餐：有额度适配器的查剩余量，无适配器的保留识别行
  //（客户端显示"额度接口未接入"）；用户没配置 key 的 provider 一律不出现。
  let quotaCache: { at: number; quotas: readonly SubscriptionQuota[] } = { at: 0, quotas: [] }
  const refreshQuotas = async (): Promise<void> => {
    // 每轮配额刷新同步重分类 MiniMax 路由（key 换了 / 新配了路由即时跟上豁免口径）。
    await refreshMiniMaxPlanRoutes()
    const { keys, identified } = await resolveSubscriptionKeys(ctx.settings, ctx.credentials)
    // 让 llm-pi-ai 的 baseURL 可覆盖订阅查询的 region 默认值（如 MiniMax 国际版需
    // `api.minimax.io`、或自配中转/staging）：带 baseURL 的 plan 会在各 adapter 里
    // 优先于内置 region 默认。readPiAiProviders 只取 baseURL/apiKeyEnv/displayName。
    const piProviders = await readPiAiProviders(ctx.settings)
    const plans = identified
      .filter(item => item.adapter)
      .map((item) => {
        const baseURL = piProviders[item.provider]?.baseURL
        return {
          provider: item.provider,
          ...(item.region === undefined ? {} : { region: item.region }),
          ...(typeof baseURL === 'string' && baseURL !== '' ? { baseUrl: baseURL } : {}),
        }
      })
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
  // in-flight 去重：与 balance 路由同因——并发请求共享同一次进行中的订阅刷新。
  let quotasInflight: Promise<void> | undefined
  const refreshQuotasOnce = (): Promise<void> => {
    quotasInflight ??= refreshQuotas().finally(() => { quotasInflight = undefined })
    return quotasInflight
  }
  registerSubscriptionsRoute(ctx, {
    trustedHosts,
    cached: () => quotaCache,
    refreshOnce: refreshQuotasOnce,
    cacheMs: SUBSCRIPTION_CACHE_MS,
    responseBudgetMs: QUOTA_RESPONSE_BUDGET_MS,
  })



  // 中转站额度：识别配了 baseURL 的路由所指向的中转站程序（New API / Sub2API），
  // 读出「余额 / 额度窗口」。key 候选 = 显式 apiKeyEnv（经典形态）+ 路由约定 ref
  // （新版宿主把路由 key 存进凭据 refs）；显式引用存在或任一候选解析出值才探测，
  // 两者皆无不列行。外部 API 低频变化，缓存 5 分钟避免每次轮询都打上游；官方
  // 直连/未配置路由不出现。
  let relayCache: { at: number; quotas: readonly RelayQuota[] } = { at: 0, quotas: [] }
  const refreshRelay = async (): Promise<void> => {
    const providers = await readPiAiProviders(ctx.settings)
    const resolve = refResolver(ctx.credentials)
    const routes: RelayRoute[] = []
    for (const [route, entry] of Object.entries(providers)) {
      if (entry.baseURL === undefined) continue
      // 官方厂商端点（DeepSeek/OpenAI 等）卖的是官方按量余额而非中转站额度，
      // 探测其 /v1/usage、/api/status 只会得到 404 或非中转站格式，面板应排除
      // 这类域，避免误判为「未识别」。中转站面板只列真正的第三方中转程序。
      if (isOfficialBaseUrl(entry.baseURL)) continue
      const apiKeyRefs = [...new Set([
        ...(entry.apiKeyEnv !== undefined ? [entry.apiKeyEnv] : []),
        ...routeKeyRefCandidates(route),
      ])]
      const hit = await firstResolvedRef(apiKeyRefs, resolve)
      if (entry.apiKeyEnv === undefined && hit === undefined) continue
      routes.push({
        route,
        baseURL: entry.baseURL,
        apiKeyRefs,
        ...(entry.displayName === undefined ? {} : { displayName: entry.displayName }),
      })
    }
    relayCache = { at: Date.now(), quotas: await queryRelayQuotas(ctx, routes) }
  }
  // in-flight 去重：与 balance 路由同因——并发请求共享同一次进行中的中转站探测。
  let relayInflight: Promise<void> | undefined
  const refreshRelayOnce = (): Promise<void> => {
    relayInflight ??= refreshRelay().finally(() => { relayInflight = undefined })
    return relayInflight
  }
  registerRelayQuotasRoute(ctx, {
    trustedHosts,
    cached: () => relayCache,
    refreshOnce: refreshRelayOnce,
    cacheMs: SUBSCRIPTION_CACHE_MS,
    responseBudgetMs: QUOTA_RESPONSE_BUDGET_MS,
  })



  // usage-stats 响应体缓存由 src/routes/usage-stats.ts 内的模块级单例持有
  // （按 doc 引用 + config 字段缓存，30s 轮询期间复用）。
  registerUsageStatsRoute(ctx, {
    trustedHosts,
    aggregator,
    config,
    candidates,
    persistSnapshot,
    readSnapshot,
    packageVersion: PACKAGE_VERSION,
    responseBudgetMs: RESPONSE_BUDGET_MS,
    // 超预算时的第一回落：内存里最近一次**已完成**的聚合文档（比落盘快照新——
    // 落盘受 5 分钟节流约束，内存文档只落后一个聚合周期）。
    lastDoc: () => aggregator.lastDocOf() as unknown as Record<string, unknown> | undefined,
  })

}
