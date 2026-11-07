/**
 * 路由：GET /api/billing/usage-stats
 *
 * 实时用量聚合文档（byDay / byModel / bySession / bySite / byTurn / perf 等）。
 * stale-while-revalidate：聚合是全量扫描（重度用户上万条会话的冷启动折叠以
 * 分钟计），HTTP 请求绝不全程等它——只给 RESPONSE_BUDGET_MS 的等待预算，超
 * 预算立即回最近一次快照；后台折叠完成后快照随之刷新（挂在聚合 promise 上，
 * 与响应路径解耦）。宿主是单进程，慢响应期间事件循环被折叠占住，会话/模型
 * 列表 RPC 会一起饿死（用户反馈的启动卡顿）。
 *
 * 路由文件只关心 HTTP 拼装：
 * - decorate（注入 PACKAGE_VERSION / 预算 / 阈值）
 * - 聚合预算（Promise.race + setTimeout.unref）
 * - 响应体缓存（`statsBodyCache`：装饰 + 序列化结果按 doc 引用 + config 字段
 *   缓存，30s 轮询期间复用）
 * - 失败路径（聚合失败 → 读快照候选 → 仍无则 `{ error }`）
 *
 * 聚合器（`aggregator.aggregate()` / `sessionUsageOf()`）+ 快照读写 + 配置在
 * 装配器里跑，路由只通过 Deps 拿到回调。
 */

import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { UsageAggregator } from '../aggregate.ts'
import { SessionListUnavailableError } from '../aggregate.ts'
import type { UsageBillingConfig } from '../config.ts'
import { guardLoopback } from '../guard.ts'

/** 路由依赖。 */
export interface UsageStatsDeps {
  trustedHosts: ReadonlySet<string>
  /** 聚合器（仅用 .aggregate() 与 .sessionUsageOf()）。 */
  aggregator: Pick<UsageAggregator, 'aggregate' | 'sessionUsageOf'>
  config: UsageBillingConfig
  /** 快照候选路径列表（主文件 + 约定路径 + config.snapshotPath）。 */
  candidates: readonly string[]
  /** 聚合成功后异步落盘节流（30s 内多次触发只写一次）。 */
  persistSnapshot: (doc: Record<string, unknown>) => void
  /** 读一个快照候选：主文件优先，主文件损坏时回退 `.bak`，都失败返回 null。 */
  readSnapshot: (candidate: string) => Promise<Record<string, unknown> | null>
  /** 插件版本（来自 package.json）。 */
  packageVersion: string
  /** 等待预算（毫秒）：聚合在此预算内完成就回实时数据，超预算立即回最近快照。 */
  responseBudgetMs: number
  /**
   * 最近一次**已完成**的聚合文档（只读，不触发新折叠）。
   *
   * 超预算时的第一回落：它比磁盘快照新（磁盘快照受落盘节流影响，最多落后数分钟；
   * 内存文档只落后一个聚合周期）。从未完成过一次聚合时 undefined，继续回落磁盘快照。
   */
  lastDoc?: () => Record<string, unknown> | undefined
}

/** 聚合文档核心结构的 wire 校验（S-7 可观察性金丝雀）。
 *
 *  客户端 loadUsageStats 已有逐字段 typeof 守卫（渲染层兜底），本校验是
 *  服务端边界的漂移告警：聚合器字段改名/类型漂移时，30s 轮询的第一轮就在
 *  宿主日志留下 `[usage-billing]` 告警，而不是等用户面板渲染崩了报 issue。
 *
 *  语义是「告警不拦截」：校验失败仍照常下发（客户端自行兜底），绝不因
 *  schema 漂移把仪表盘整个 500——与「degrade, never fabricate」同一姿态。
 *
 *  只校验 fresh 聚合路径（快照兜底路径不校验：旧快照本就可能缺新字段，
 *  校验它们只会产生永久的假阳性告警）。
 *
 *  实现说明：刻意手写 typeof 检查而不用 schemastery——schemastery 是 config
 *  库，object schema 对 null / 数组 / 标量输入走宽容强转（补默认值）而非抛错，
 *  无法表达「形状必须精确」的校验语义。手写检查只认精确类型，缺字段即漂移。
 *  导出供测试。 */

const NUM = (v: unknown): boolean => typeof v === 'number' && Number.isFinite(v)

/** 一个 ModelUsage 桶的核心数字字段（客户端渲染硬依赖）。
 *  `withReasoning`：byModel / byDay / total 的桶含 reasoning；byDayModels 的
 *  三维格接口只有 6 个数字字段（无 reasoning），复用同一检查会产生假阳性。 */
function modelUsageError(value: unknown, path: string, withReasoning = true): string | null {
  if (value === null || typeof value !== 'object') return `${path} 不是对象`
  const keys = withReasoning
    ? ['calls', 'input', 'output', 'cacheHit', 'cacheMiss', 'cost', 'reasoning']
    : ['calls', 'input', 'output', 'cacheHit', 'cacheMiss', 'cost']
  for (const key of keys) {
    if (!NUM((value as Record<string, unknown>)[key])) return `${path}.${key} 不是有限数字`
  }
  return null
}

/** 校验一份聚合文档；返回漂移原因（null = 形状正常）。纯只读，不改 doc。 */
export function usageStatsShapeError(doc: unknown): string | null {
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) return '文档不是对象'
  const d = doc as Record<string, unknown>
  if (!NUM(d.version)) return 'version 不是有限数字'
  if (!NUM(d.updatedAt)) return 'updatedAt 不是有限数字'
  const total = modelUsageError(d.total, 'total')
  if (total !== null) return total
  // byModel / byDay / byDayModels：逐桶抽检（全部遍历是 O(桶数)，聚合文档换代
  // 每轮一次，桶数 = 模型数 × 天数，可接受）。
  for (const [field, cellCheck] of [
    ['byModel', (cell: unknown, p: string): string | null => modelUsageError(cell, p)],
    ['byDay', (cell: unknown, p: string): string | null => modelUsageError(cell, p)],
    ['byDayModels', (cell: unknown, p: string): string | null => {
      if (cell === null || typeof cell !== 'object') return `${p} 不是对象`
      for (const [modelKey, usage] of Object.entries(cell as Record<string, unknown>)) {
        const err = modelUsageError(usage, `${p}.${modelKey}`, false)
        if (err !== null) return err
      }
      return null
    }],
  ] as const) {
    const bucket = d[field]
    if (bucket === undefined) return `${field} 缺失（聚合路径恒带；快照兜底才允许缺）`
    if (bucket === null || typeof bucket !== 'object') return `${field} 不是对象`
    for (const [key, cell] of Object.entries(bucket as Record<string, unknown>)) {
      const err = cellCheck(cell, `${field}.${key}`)
      if (err !== null) return err
    }
  }
  const bySession = d.bySession
  if (!Array.isArray(bySession)) return 'bySession 不是数组'
  for (const [index, row] of bySession.entries()) {
    if (row === null || typeof row !== 'object') return `bySession[${index}] 不是对象`
    const r = row as Record<string, unknown>
    if (typeof r.id !== 'string' || r.id === '') return `bySession[${index}].id 不是非空字符串`
    if (!NUM(r.calls)) return `bySession[${index}].calls 不是有限数字`
    if (!NUM(r.cost)) return `bySession[${index}].cost 不是有限数字`
    if (!NUM(r.lastActive)) return `bySession[${index}].lastActive 不是有限数字`
  }
  return null
}

export function registerUsageStatsRoute(ctx: Context, deps: UsageStatsDeps): void {
  // 响应体缓存：30s 轮询期间复用同一聚合文档的装饰 + 序列化结果（数百 KiB）。
  let statsBodyCache:
    | { doc: Record<string, unknown>; budget: number | undefined; threshold: number | undefined; body: string }
    | undefined
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: '/api/billing/usage-stats',
      handler: async (req: IncomingMessage, res: ServerResponse) => {
        if (!guardLoopback(req, res, deps.trustedHosts)) return
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        // 宿主配置（月度预算 / 余额告警阈值）与插件版本不是聚合产物：在响应边界
        // 注入，实时与快照两条路径一致。
        const decorate = (doc: Record<string, unknown>): Record<string, unknown> => ({
          ...doc,
          pluginVersion: deps.packageVersion,
          ...(deps.config.monthlyBudget === undefined ? {} : { budget: deps.config.monthlyBudget }),
          ...(deps.config.lowBalanceThreshold === undefined ? {} : { lowBalanceThreshold: deps.config.lowBalanceThreshold }),
        })
        const statsBodyOf = (doc: Record<string, unknown>): string => {
          const budget = deps.config.monthlyBudget
          const threshold = deps.config.lowBalanceThreshold
          if (statsBodyCache !== undefined && statsBodyCache.doc === doc
            && statsBodyCache.budget === budget && statsBodyCache.threshold === threshold) {
            return statsBodyCache.body
          }
          // 形状金丝雀：每次文档换代（缓存未命中 = 新聚合轮）校验一次，漂移告警
          // 留在宿主日志；不拦截下发——客户端 typeof 守卫兜底，绝不因 schema 把面板 500。
          const shapeError = usageStatsShapeError(doc)
          if (shapeError !== null) {
            console.warn('[usage-billing] usage-stats document shape drift (serving anyway):', shapeError)
          }
          const body = JSON.stringify(decorate(doc))
          statsBodyCache = { doc, budget, threshold, body }
          return body
        }
        // stale-while-revalidate：见文件头注释；超时立刻回最近一次快照。
        const aggregating = deps.aggregator.aggregate()
        void aggregating.then(
          stats => { deps.persistSnapshot(decorate(stats as unknown as Record<string, unknown>)) },
          () => { /* 失败路径由下方快照兜底，此处只抑制未处理拒绝 */ },
        )
        let fresh: Record<string, unknown> | undefined
        // 会话列表读不到时的原因（issue #119）：随回落文档一并下发，客户端
        // 据此显示「读取失败」——否则回落的空快照/空账本会被渲染成一片 0，
        // 用户分不清「没花钱」与「没读到」。
        let sessionListError: string | undefined
        try {
          fresh = await Promise.race([
            aggregating.then(stats => stats as unknown as Record<string, unknown>),
            new Promise<undefined>(resolve => { setTimeout(() => { resolve(undefined) }, deps.responseBudgetMs).unref() }),
          ])
        } catch (error) {
          // Persistence read failed; fall through to the JSON-file candidates.
          // 记录异常尾部（含已折叠会话数），避免「只能靠猜」——聚合失败时用户
          // 至少能从日志看到原因（单会话损坏已在 aggregate 内跳过并告警）。
          console.error('[usage-billing] usage-stats aggregate failed, falling back to snapshot:', error)
          if (error instanceof SessionListUnavailableError) sessionListError = error.reason
        }
        if (fresh !== undefined) {
          res.end(statsBodyOf(fresh))
          return
        }
        // 超预算 / 聚合失败：先回内存里最近一次完成的聚合文档（比磁盘快照新），
        // 再回磁盘快照。两者的数据都「落后于本轮」，用 staleSnapshot 标记，
        // 面板据此提示「数据来自上次计算」，避免把旧值当成最新值读。
        const degraded = sessionListError === undefined ? {} : { sessionListError }
        const recent = deps.lastDoc?.()
        if (recent !== undefined) {
          res.end(JSON.stringify({ ...decorate(recent), staleSnapshot: true, ...degraded }))
          return
        }
        for (const candidate of deps.candidates) {
          const doc = await deps.readSnapshot(candidate)
          // Accept only parseable JSON so a stale or partial file never
          // reaches the dashboard as if it were real.
          if (doc === null) continue
          res.end(JSON.stringify({ ...decorate(doc), staleSnapshot: true, ...degraded }))
          return
        }
        res.end(JSON.stringify({ error: 'usage stats unavailable', ...degraded }))
      },
    }),
    'usage-billing: usage-stats route',
  )
}
