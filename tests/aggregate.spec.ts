import { applyBuiltinCatalog, applyLivePricing } from '../src/client/pricing.ts'
import { BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES } from '../src/builtin-catalog.ts'

// 测试套件承担宿主注入角色：目录与别名表在模块加载时全量注入（宿主 activate
// 同一入口），否则聚合/计价消费方读到空目录。
applyBuiltinCatalog(BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES)

/**
 * Aggregation unit tests: log folding attributes each call to the
 * `message.source` of its own `assistant/message` (sparse `request/header` is
 * only a fallback), splits tokens into cache buckets, prices only
 * catalog models, and rolls totals up by model, by day, and by model × day
 * (the stacked trend chart's input).
 */

import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { SessionHeader, SessionId } from '@deepseek-ai/dsh-session/types'
import type { TokenUsage } from '@deepseek-ai/dsh-llm'
import {
  aggregateUsage, createUsageAggregator, configFingerprint, dayStamp, foldSession, foldUsage, emptyUsage, workspaceNameOf, hostTimeZone,
  siteBucketKey, siteOriginOf, siteRefOf, sumSiteBuckets, runLedgerMigrations, FOLD_VERSION, foldSearchCall, DEFAULT_SEARCH_CALL_ESTIMATE_CNY,
  DEFAULT_SUBSCRIPTION_PROVIDERS, subParentOf,
  type LedgerMigration, type UsageLedgerDocument, type UsageLedgerSession,
  AGGREGATE_TTL_MS, LEDGER_SAVE_INTERVAL_MS, SESSION_ROW_LIMIT, type UsagePersistence,
} from '../src/aggregate.ts'
import { isSubscriptionProviderId } from '../src/subscriptions.ts'
import { applyUserModelAliases } from '../src/client/pricing.ts'

/** Minimal `request/header` event recording the active model and provider. */
function header(seq: number, model: string, provider = 'deepseek-official'): SessionEvent {
  return {
    type: 'request/header', seq, time: 1_000,
    data: { header: { config: { provider, model, reasoningEffort: 'high', maxTokens: 256_000 }, version: 1, id: 's', createdAt: 0, cwd: '/tmp', agentPreset: 'standard' }, reason: 'initial' },
  } as unknown as SessionEvent
}

/** `session/title` 事件：宿主重命名会话时追加（source.kind='user'）。 */
function titleEvent(seq: number, time: number, title: string): SessionEvent {
  return {
    type: 'session/title', seq, time,
    data: { title, messageSeqs: [], source: { kind: 'user' } },
  } as unknown as SessionEvent
}

/** Minimal `assistant/message` event carrying one provider usage report. */
function message(seq: number, time: number, usage: TokenUsage): SessionEvent {
  return {
    type: 'assistant/message', seq, time,
    data: { turn: 1, step: 1, message: { role: 'assistant', content: [] }, usage },
  } as unknown as SessionEvent
}

const USAGE: TokenUsage = { inputTokens: 100, outputTokens: 50, cacheReadTokens: 800, cacheWriteTokens: 20 }

/** In-memory persistence double over per-session event arrays. */
function fakePersistence(
  logs: Record<string, SessionEvent[]>,
  inherited: Record<string, number> = {},
): UsagePersistence {
  // readFrom 的返回带 inheritedEventCount（fork 血缘边界）；其余存储元数据字段断言跳过。
  return {
    list: async () => Object.keys(logs).map(id => ({ id })),
    readFrom: async (id: SessionId, fromSeq: number) => ({
      meta: { id },
      inheritedEventCount: inherited[id] ?? 0,
      events: (logs[id] ?? []).filter(event => event.seq >= fromSeq),
    }),
  } as unknown as UsagePersistence
}

/** 账本行的最小 JSON-safe fold：total.calls > 0 保证进 bySession，其余桶留空。 */
function legacyFold(): UsageLedgerSession['fold'] {
  const total = emptyUsage()
  total.calls = 2
  total.output = 100
  return {
    total,
    byModel: {}, byDay: {}, byDayModels: {}, bySite: {},
    unpricedModels: [], planCalls: {},
    turns: [], perfDigest: {}, perfHourDigest: {},
    roles: { userChars: 0, toolChars: 0, inputCost: 0, outputCost: 0 },
    lastActive: 1_000,
  }
}

/** 内存版 UsageLedgerStore：load 返回预置文档，save 记录每次落盘。 */
function fakeLedgerStore(sessions: UsageLedgerSession[]) {
  const saved: UsageLedgerDocument[] = []
  let document: UsageLedgerDocument = { version: 1, updatedAt: 1, sessions, appliedMigrations: [] }
  return {
    store: {
      load: async () => document,
      save: async (next: UsageLedgerDocument) => { saved.push(next); document = next },
    },
    saved,
    current: (): UsageLedgerDocument => document,
  }
}

describe('web search estimate (#15)', () => {
  /** 最小 `web/deepseek-search-llm-request` 事件（provider 落盘的真实形状）。 */
  function searchRequest(seq: number, time: number, model = 'deepseek-v4-flash'): SessionEvent {
    return {
      type: 'web/deepseek-search-llm-request', seq, time,
      data: {
        endpoint: 'https://api.deepseek.com/anthropic/v1/messages',
        apiVersion: '2023-06-01',
        body: { model, max_tokens: 4096, messages: [], tools: [] },
      },
    } as unknown as SessionEvent
  }

  it('foldSearchCall counts the call and adds the per-call estimate', () => {
    const acc = emptyUsage()
    foldSearchCall(acc, 0.02)
    expect(acc.calls).toBe(1)
    expect(acc.searchCalls).toBe(1)
    expect(acc.officialCalls).toBe(1)
    expect(acc.cost).toBeCloseTo(0.02, 10)
    expect(acc.officialCost).toBeCloseTo(0.02, 10)
    expect(acc.input).toBe(0)
    expect(acc.output).toBe(0)
  })

  it('foldSession folds web search requests into total/model/day/site/tier buckets', () => {
    const events: SessionEvent[] = [searchRequest(1, 1_000), searchRequest(2, 2_000)]
    const fold = foldSession(events, new Set(), undefined, {}, 0.02)
    expect(fold.total.calls).toBe(2)
    expect(fold.total.searchCalls).toBe(2)
    expect(fold.total.cost).toBeCloseTo(0.04, 10)
    expect(fold.total.officialCost).toBeCloseTo(0.04, 10)
    // 模型归一化到计费目录键 flash；token 维度不动。
    expect(fold.byModel.get('flash')?.searchCalls).toBe(2)
    expect(fold.byModel.get('flash')?.input).toBe(0)
    // 搜索绕过 llm-pi-ai 路由直连官方端点：站点桶固定 direct:deepseek。
    expect(fold.bySite.get('direct:deepseek')?.searchCalls).toBe(2)
    // 峰谷分桶合计覆盖全部搜索调用。
    const tiered = (fold.byTier.get('peak')?.searchCalls ?? 0) + (fold.byTier.get('offPeak')?.searchCalls ?? 0)
    expect(tiered).toBe(2)
  })

  it('estimate 0 still counts the call but adds no cost', () => {
    const fold = foldSession([searchRequest(1, 1_000)], new Set(), undefined, {}, 0)
    expect(fold.total.searchCalls).toBe(1)
    expect(fold.total.calls).toBe(1)
    expect(fold.total.cost).toBe(0)
    expect(fold.total.officialCost).toBe(0)
  })
})

describe('byDayModelsSite (issue #16)', () => {
  it('folds per-day × model × site cells for a normal call', () => {
    const events: SessionEvent[] = [header(1, 'deepseek-v4-flash', 'deepseek-official'), message(2, 2_000, USAGE)]
    const fold = foldSession(events, new Set())
    const day = dayStamp(2_000)
    // 无 routes 配置时内置官方直连（deepseek-* 形态）按 direct 归位；flash 为目录键。
    const siteCell = fold.byDayModelsSite.get(day)?.get('flash')?.get('direct:deepseek-official')
    expect(siteCell?.calls).toBe(1)
    expect(siteCell?.cacheMiss).toBe(120)
  })

  it('homes subscription-exempted providers outside the route table to direct (issue #37)', () => {
    // grok build 这类订阅管理插件注册的通道不经 llm-pi-ai 路由表：
    // 订阅豁免命中 → direct 桶（且不按 token 计费）；未命中 → 保持 unknown。
    const events: SessionEvent[] = [header(1, 'grok-4.6', 'grok-build'), message(2, 2_000, USAGE)]
    const day = dayStamp(2_000)

    const exempted = foldSession(events, new Set(['grok-build']))
    // 模型格按解析后的目录键归位：grok-4.6 的目录键是 `grok`（该条目 name 即 Grok 4.6）。
    const directCell = exempted.byDayModelsSite.get(day)?.get('grok')?.get('direct:grok-build')
    expect(directCell?.calls).toBe(1)
    // 订阅豁免：不计费，也不进 DeepSeek 官方统计。
    expect(directCell?.cost).toBe(0)
    expect(directCell?.officialCalls).toBe(0)

    const notExempted = foldSession(events, new Set())
    expect(notExempted.byDayModelsSite.get(day)?.get('grok')?.get('unknown')?.calls).toBe(1)
  })
})

describe('known adapter providers (workbuddy)', () => {
  it('homes workbuddy calls to direct and prices them by catalog rate', () => {
    // dsh-workbuddy-connect 经 ctx.llm.registerAdapter 注册 provider，不经
    // llm-pi-ai 路由表：旧口径落 unknown 桶且费用记 0（issue #82），归位后按
    // 模型官方目录价计 Token 成本。
    const events: SessionEvent[] = [header(1, 'deepseek-v4.1-flash', 'workbuddy'), message(2, 2_000, USAGE)]
    const fold = foldSession(events, new Set())
    const day = dayStamp(2_000)

    // 归位 direct:<provider> 桶，不再是 unknown。
    expect(fold.bySite.has('unknown')).toBe(false)
    const direct = fold.bySite.get('direct:workbuddy')
    expect(direct?.calls).toBe(1)
    // 三维格同样归位（provider 视图的模型行按此取数）。
    expect(fold.byDayModelsSite.get(day)?.get('flash')?.get('direct:workbuddy')?.calls).toBe(1)
    // 计价：目录内模型按目录价算出金额（token 口径与 foldUsage 单测同源）。
    expect(fold.total.cost).toBeGreaterThan(0)
    expect(direct?.cost).toBeGreaterThan(0)
    // 不是订阅通道，token 照常统计。
    expect(fold.total.calls).toBe(1)
    expect(fold.total.input).toBe(920)
  })

  it('homes the international workbuddy-ai variant the same way', () => {
    const events: SessionEvent[] = [header(1, 'glm-5.3-flash', 'workbuddy-ai'), message(2, 2_000, USAGE)]
    const fold = foldSession(events, new Set())
    expect(fold.bySite.has('direct:workbuddy-ai')).toBe(true)
    expect(fold.bySite.has('unknown')).toBe(false)
    expect(fold.total.cost).toBeGreaterThan(0)
  })

  it('homes case variants of the adapter route to direct (nit from PR #90 review)', () => {
    // 宿主不强制 route 小写；名单判定与 isOfficialProvider 同姿态（trim + 大小写
    // 不敏感），避免日志里出现大小写变体时静默落回 unknown 桶。
    const events: SessionEvent[] = [header(1, 'deepseek-v4.1-flash', 'WorkBuddy'), message(2, 2_000, USAGE)]
    const fold = foldSession(events, new Set())
    expect(fold.bySite.has('unknown')).toBe(false)
    expect(fold.bySite.get('direct:WorkBuddy')?.calls).toBe(1)
    expect(fold.total.cost).toBeGreaterThan(0)
    // 仍不算官方渠道。
    expect(fold.total.officialCalls).toBe(0)
  })

  it('never counts workbuddy calls as the official DeepSeek channel', () => {
    // workbuddy 是腾讯 WorkBuddy 桌面 App 的账号通道，不是 DeepSeek 官方直连：
    // 归位 direct 不得顺带把调用算进官方口径（officialCalls/officialCost 必须为 0），
    // 否则「官方 vs 三方」分桶与 DeepSeek 官方组会虚增。
    const events: SessionEvent[] = [header(1, 'deepseek-v4.1-flash', 'workbuddy'), message(2, 2_000, USAGE)]
    const fold = foldSession(events, new Set())
    expect(fold.total.officialCalls).toBe(0)
    expect(fold.total.officialCost).toBe(0)
    const direct = fold.bySite.get('direct:workbuddy')
    expect(direct?.officialCalls).toBe(0)
    expect(direct?.officialCost).toBe(0)
  })

  it('leaves unlisted providers outside the route table in the unknown bucket', () => {
    // 反证：名单外的配置外 provider 仍按 issue #82 口径落 unknown、记 0 费用。
    // 这条断言同时守住「不猜通道」的边界——加名单是显式行为，不是前缀/模式匹配。
    const events: SessionEvent[] = [header(1, 'deepseek-v4.1-flash', 'some-other-plugin'), message(2, 2_000, USAGE)]
    const fold = foldSession(events, new Set())
    expect(fold.bySite.has('unknown')).toBe(true)
    expect(fold.total.cost).toBe(0)
  })

  it('keeps unknown-channel models uncatalogued out of the priced path', () => {
    // 归位只解决通道归属，不解决目录缺口：目录外模型仍记 0 并进 unpricedModels，
    // 面板据此提示「未收录」而不是伪造金额。
    const events: SessionEvent[] = [header(1, 'not-a-real-model-id', 'workbuddy'), message(2, 2_000, USAGE)]
    const fold = foldSession(events, new Set())
    expect(fold.bySite.has('direct:workbuddy')).toBe(true)
    expect(fold.total.cost).toBe(0)

    expect([...fold.unpricedModels]).toContain('not-a-real-model-id')
  })
})

describe('no workbuddy installed (known-adapter isolation)', () => {
  /**
   * 负向隔离（g-001/g-002 的正确性边界）：KNOWN_ADAPTER_PROVIDERS 是显式名单，
   * 只在会话日志出现 workbuddy/workbuddy-ai 调用时才参与判定。未安装
   * dsh-workly-connect 的部署不产生这类事件，计费结果必须与名单引入前逐字段一致。
   * 本组用例证明这一点：同一套「不含 workbuddy 通道」的事件流，四种通道形态的
   * 归位、计价、官方口径全部走原有路径；平行对照组再证明测试本身有区分度。
   */

  /** 一套覆盖四种通道形态的事件流，provider 名经参数注入（平行对照组用）。 */
  function mixedChannelEvents(provider: string): SessionEvent[] {
    return [
      // 形态 1：deepseek 前缀官方直连（不经路由表）→ direct + 官方口径 + 目录价。
      header(1, 'deepseek-v4.1-flash', 'deepseek-official'), message(2, 1_000, USAGE),
      // 形态 2：路由表命中带 baseURL → site 桶（按 origin 归组）。
      header(3, 'glm-5.3-flash', provider === 'workbuddy' ? 'workbuddy' : provider), message(4, 2_000, USAGE),
      // 形态 3：订阅豁免通道 → direct + 记 0 + plan 标记。
      header(5, 'kimi-k3', 'kimi-coding'), message(6, 3_000, USAGE),
      // 形态 4：名单外配置外 provider → unknown 桶记 0（issue #82）。
      header(7, 'flash', 'some-other-plugin'), message(8, 4_000, USAGE),
    ]
  }

  /** 断言一套 fold 与预期语义逐字段一致（四种形态各验关键不变量）。 */
  function expectBaselineSemantics(fold: SessionFold, siteProvider: string): void {
    // 形态 1：官方直连不变——official 计数与费用来自 deepseek 前缀，与名单无关。
    expect(fold.total.officialCalls).toBe(1)
    expect(fold.total.officialCost).toBeGreaterThan(0)
    expect(fold.bySite.get('direct:deepseek-official')?.officialCalls).toBe(1)
    // 形态 2：site 桶按 origin 归组（路由表优先于名单——名单不抢配置路径）。
    expect(fold.bySite.has(`site:https://relay.example.com`)).toBe(true)
    // 形态 3：订阅豁免记 0（kimi-k3 有目录价但走 kimi-coding 订阅通道）。
    expect(fold.bySite.get('direct:kimi-coding')?.cost).toBe(0)
    expect(fold.bySite.get('direct:kimi-coding')?.calls).toBe(1)
    // 形态 4：名单外配置外 provider 仍 unknown 记 0（issue #82 语义不动）。
    expect(fold.bySite.get('unknown')?.calls).toBe(1)
    expect(fold.bySite.get('unknown')?.cost).toBe(0)
    // 名单绝不给非 workbuddy 通道发 direct 归位。
    expect(fold.bySite.has(`direct:${siteProvider}`)).toBe(siteProvider.startsWith('workbuddy'))
  }

  it('prices a mixed-channel log identically with or without the known-adapter list', () => {
    // 路由视图：一条带 baseURL 的中转路由（形态 2 的 site 桶来源）。
    const routes = { 'my-relay': { baseURL: 'https://relay.example.com/v1' } }
    // 对照组 A：provider 名为普通中转名（未安装 workbuddy 时日志里的形态）。
    const foldA = foldSession(mixedChannelEvents('my-relay'), new Set(['kimi-coding']), undefined, routes)
    expectBaselineSemantics(foldA, 'my-relay')
    const sumA = [...foldA.bySite.values()].reduce((sum, cell) => sum + cell.cost, 0)
    // total 与 bySite 之和一致（无双口径）。
    expect(foldA.total.cost).toBeCloseTo(sumA, 6)

    // 对照组 B：同样的结构、provider 名换成另一个非 workbuddy 名——结果同构
    //（桶键跟随 provider 名变化，其余语义逐字段一致）。KNOWN_ADAPTER_PROVIDERS
    // 存在与否不改变这两组中的任何字段。
    const foldB = foldSession(mixedChannelEvents('other-relay'), new Set(['kimi-coding']), undefined, { 'other-relay': { baseURL: 'https://relay.example.com/v1' } })
    expectBaselineSemantics(foldB, 'other-relay')
    expect(foldB.total.cost).toBeCloseTo(foldA.total.cost, 6)
    expect(foldB.total.calls).toBe(foldA.total.calls)
    expect(foldB.total.officialCalls).toBe(foldA.total.officialCalls)
    expect(foldB.total.officialCost).toBeCloseTo(foldA.total.officialCost, 6)
  })

  it('differs only when the provider id itself is on the known-adapter list', () => {
    // 平行对照：同名事件流，唯一变量是 provider 是否叫 workbuddy——
    // 证明上一条测试的「零改变」断言不是恒真，名单确实只在命中时生效。
    const routes = { 'workbuddy': { baseURL: 'https://relay.example.com/v1' } }
    const fold = foldSession(mixedChannelEvents('workbuddy'), new Set(['kimi-coding']), undefined, routes)
    // 路由表命中（形态 2）优先于名单：site 桶仍按 origin 归组，名单不抢配置路径。
    expect(fold.bySite.has('site:https://relay.example.com')).toBe(true)
    expect(fold.bySite.has('direct:workbuddy')).toBe(false)
  })
})

describe('foldUsage', () => {
  it('accumulates calls and splits tokens into cache buckets', () => {
    const acc = emptyUsage()
    foldUsage(acc, USAGE, 'flash', false, 1_000)
    expect(acc.calls).toBe(1)
    expect(acc.cacheHit).toBe(800)
    expect(acc.cacheMiss).toBe(120) // inputTokens 100 + cacheWriteTokens 20
    expect(acc.input).toBe(920) // 100 + 800 + 20 = 总输入
    expect(acc.output).toBe(50)
  })

  it('prices catalog models and leaves unknown models free', () => {
    const known = emptyUsage()
    foldUsage(known, USAGE, 'flash', false, 1_000)
    expect(known.cost).toBeGreaterThan(0)

    const unknown = emptyUsage()
    foldUsage(unknown, USAGE, 'mimo-v2-pro', false, 1_000) // 目录外的模型
    expect(unknown.cost).toBe(0)
  })

  it('charges nothing for subscription-plan calls even when the model id collides with the catalog', () => {
    // 订阅 provider 的模型 id 即使撞名计费表（kimi-k3 有价），也一律免费。
    const acc = emptyUsage()
    foldUsage(acc, USAGE, 'kimi-k3', true, 1_000)
    expect(acc.calls).toBe(1)
    expect(acc.cost).toBe(0)
  })

  it('charges nothing for calls from unverified channels even when the model is priced (issue #82)', () => {
    // 未知通道（配置外 provider）的已收录模型：支出主体无法核实，费用记 0，token 照常。
    const acc = emptyUsage()
    foldUsage(acc, USAGE, 'flash', false, 1_000, false, undefined, true)
    expect(acc.calls).toBe(1)
    expect(acc.input).toBeGreaterThan(0)
    expect(acc.cost).toBe(0)
  })

  it('prices peak vs off-peak by the call time (P0-1)', () => {
    // 同一桶、同一模型：北京时间 10 点（高峰）比 13 点（低谷）贵。
    const peak = emptyUsage()
    const off = emptyUsage()
    const at = (beijingHour: number): number => Date.UTC(2026, 7, 21, (beijingHour + 24 - 8) % 24)
    foldUsage(peak, USAGE, 'flash', false, at(10))
    foldUsage(off, USAGE, 'flash', false, at(13))
    expect(peak.cost).toBeGreaterThan(off.cost)
  })

  it('accumulates reasoning tokens as a subset of output', () => {
    const acc = emptyUsage()
    foldUsage(acc, { inputTokens: 100, outputTokens: 500, reasoningTokens: 200 } as TokenUsage, 'flash', false, 1_000)
    expect(acc.output).toBe(500)
    expect(acc.reasoning).toBe(200)
  })
})

describe('sumSiteBuckets (usage_stats 工具的站点口径)', () => {
  const cell = (cost: number): { cost: number; calls: number; input: number; output: number } => ({ cost, calls: 1, input: 10, output: 5 })
  const bySite = {
    'site:https://relay.example.com': cell(2),
    'direct:deepseek': cell(3),
    unknown: cell(1),
  }

  it('sums every bucket for bySite', () => {
    expect(sumSiteBuckets(bySite, 'bySite').cost).toBe(6)
  })

  it('counts only relay-site buckets for relay (direct/unknown excluded)', () => {
    // 此前 relay 与 bySite 共用无过滤循环：直连/未知桶全被计入，relay ≈ all。
    const sum = sumSiteBuckets(bySite, 'relay')
    expect(sum.cost).toBe(2)
    expect(sum.calls).toBe(1)
  })
})

describe('workspaceNameOf (P2-2)', () => {
  it('derives the workspace name from the cwd basename', () => {
    expect(workspaceNameOf('/Users/ken/my-project')).toBe('my-project')
    expect(workspaceNameOf('C:\\work\\proj')).toBe('proj')
    expect(workspaceNameOf(undefined)).toBe('—')
    expect(workspaceNameOf('')).toBe('—')
  })
})

describe('per-turn folding (P1-1)', () => {
  /** Fold-session event row helper (durable-shape cast like the aggregator). */
  const ev = (type: string, seq: number, time: number, data: Record<string, unknown>): SessionEvent =>
    ({ type, seq, time, data }) as unknown as SessionEvent

  it('folds usage into per-turn rows with model, start, and end', () => {
    const fold = foldSession([
      ev('turn/start', 1, 1_000, { turn: 1 }),
      ev('request/header', 2, 1_001, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
      ev('assistant/message', 3, 1_002, { turn: 1, step: 1, usage: USAGE }),
      ev('turn/end', 4, 2_000, { turn: 1 }),
      ev('turn/start', 5, 3_000, { turn: 2 }),
      ev('request/header', 6, 3_001, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
      ev('assistant/message', 7, 3_002, { turn: 2, step: 1, usage: USAGE }),
    ], new Set())
    expect(fold.turns).toHaveLength(2)
    expect(fold.turns[0]).toMatchObject({ turn: 1, model: 'flash', startedAt: 1_000, endedAt: 2_000 })
    expect(fold.turns[0]?.cost ?? 0).toBeGreaterThan(0)
    expect(fold.turns[1]).toMatchObject({ turn: 2, startedAt: 3_000 })
  })

  it('charges nothing for subscription-plan turns', () => {
    const fold = foldSession([
      ev('request/header', 1, 1_000, { header: { config: { provider: 'kimi-coding', model: 'k3' } } }),
      ev('assistant/message', 2, 1_001, { turn: 1, step: 1, usage: USAGE }),
    ], new Set(['kimi-coding']))
    expect(fold.turns).toHaveLength(1)
    expect(fold.turns[0]?.cost).toBe(0)
  })

  it('normalises MiniMax / DeepSeek-vision model ids to catalog keys', () => {
    const fold = foldSession([
      ev('request/header', 1, 1_000, { header: { config: { provider: 'minimax-cn', model: 'MiniMax-M3' } } }),
      ev('assistant/message', 2, 1_001, { turn: 1, step: 1, usage: USAGE }),
      ev('request/header', 3, 1_002, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash-vision-exp' } } }),
      ev('assistant/message', 4, 1_003, { turn: 1, step: 1, usage: USAGE }),
    ], new Set())
    // MiniMax-M3（大小写、带型号后缀）与 vision-exp 都归到各自目录键，而非保留原始 id/标未收录。
    expect(fold.byModel.has('minimax')).toBe(true)
    expect(fold.byModel.has('MiniMax-M3')).toBe(false)
    expect(fold.byModel.has('flash-vision-exp')).toBe(true)
  })
})

describe('message.source attribution (issue #14)', () => {
  /** Fold-session event row helper (durable-shape cast like the aggregator). */
  const ev = (type: string, seq: number, time: number, data: Record<string, unknown>): SessionEvent =>
    ({ type, seq, time, data }) as unknown as SessionEvent

  /** `assistant/message` with the authoritative `message.source` agent-loop writes per call. */
  const sourced = (seq: number, time: number, model: string, provider: string, usage: TokenUsage = USAGE): SessionEvent =>
    ev('assistant/message', seq, time, {
      turn: 1, step: 1, usage,
      message: { role: 'assistant', content: [], source: { kind: 'model', provider, model } },
    })

  it('attributes each usage to its own message.source when headers are sparse', () => {
    // 复现 issue #14：订阅 glm 与按量 flash 混用，header 稀疏（真实会话 380 请求仅 22 条）。
    // 修复前：两条 message 都记到最近一次 header 的模型头上，串账。
    const fold = foldSession([
      ev('request/header', 1, 1_000, { header: { config: { provider: 'zai-coding-cn', model: 'glm-5.3-flash' } } }),
      sourced(2, 1_001, 'glm-5.3-flash', 'zai-coding-cn'),
      sourced(3, 1_002, 'deepseek-v4-flash', 'deepseek-official'), // 中途切模型，无新 header。
      sourced(4, 1_003, 'glm-5.3-flash', 'zai-coding-cn'),
    ], new Set(['zai-coding-cn']), undefined, { 'zai-coding-cn': {}, 'deepseek-official': {} })
    const glm = fold.byModel.get('glm-5.3-flash')
    const flash = fold.byModel.get('flash')
    expect(glm?.calls).toBe(2)
    expect(flash?.calls).toBe(1)
    // glm 走订阅：免费且计入 planCalls；flash 按量：有费用且不标。
    expect(glm?.cost).toBe(0)
    expect(fold.planCalls.get('glm-5.3-flash')).toBe(2)
    expect(fold.planCalls.has('flash')).toBe(false)
    // 三维格同款计数（provider 行按通道判 plan）：glm 两个订阅调用落同一格。
    const sitePlans = [...fold.planSiteCalls]
    expect(sitePlans).toHaveLength(1)
    expect(sitePlans[0]?.[0]).toContain('"glm-5.3-flash"')
    expect(sitePlans[0]?.[0]).toContain('"direct:zai-coding-cn"')
    expect(sitePlans[0]?.[1]).toBe(2)
    expect(flash?.cost ?? 0).toBeGreaterThan(0)
    // site 桶也跟随各自的 source：订阅直连 vs 官方直连。
    expect([...fold.bySite.keys()]).toEqual(['direct:zai-coding-cn', 'direct:deepseek-official'])
  })

  it('keeps totals stable across re-folds (no regression between reads)', () => {
    // 修复前：每多出现一条同模型 header，归账窗口前移，累计值回退（3237 → 2668）。
    // 修复后：归属只取决于 message 自身，重复折叠结果一致。
    const events = [
      ev('request/header', 1, 1_000, { header: { config: { provider: 'zai-coding-cn', model: 'glm-5.3-flash' } } }),
      sourced(2, 1_001, 'glm-5.3-flash', 'zai-coding-cn'),
      sourced(3, 1_002, 'glm-5.3-flash', 'zai-coding-cn'),
      ev('request/header', 4, 1_003, { header: { config: { provider: 'zai-coding-cn', model: 'glm-5.3-flash' } } }),
      sourced(5, 1_004, 'glm-5.3-flash', 'zai-coding-cn'),
    ]
    const first = foldSession(events, new Set(['zai-coding-cn']))
    const again = foldSession(events, new Set(['zai-coding-cn']))
    expect(first.byModel.get('glm-5.3-flash')?.output).toBe(150)
    expect(again.byModel.get('glm-5.3-flash')?.output).toBe(first.byModel.get('glm-5.3-flash')?.output)
    expect(first.total.output).toBe(150)
  })

  it('falls back to the request/header state when message.source is absent (legacy logs)', () => {
    const fold = foldSession([
      ev('request/header', 1, 1_000, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
      ev('assistant/message', 2, 1_001, { turn: 1, step: 1, usage: USAGE, message: { role: 'assistant', content: [] } }),
    ], new Set())
    expect(fold.byModel.get('flash')?.calls).toBe(1)
    expect(fold.byModel.get('flash')?.cost ?? 0).toBeGreaterThan(0)
  })
})

describe('1.0.8 dimensions (byTier / byTool / cacheWrite)', () => {
  /** Fold-session event row helper (durable-shape cast like the aggregator). */
  const ev = (type: string, seq: number, time: number, data: Record<string, unknown>): SessionEvent =>
    ({ type, seq, time, data }) as unknown as SessionEvent
  // 周三 2026-08-19：北京时间 10:00（工作日高峰）与 20:00（低谷）。
  const peakTime = Date.UTC(2026, 7, 19, 2, 0, 0)
  const offTime = Date.UTC(2026, 7, 19, 12, 0, 0)

  it('folds each call into the peak/off-peak bucket by its own time', () => {
    const fold = foldSession([
      ev('request/header', 1, peakTime, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
      ev('assistant/message', 2, peakTime, { turn: 1, step: 1, usage: USAGE }),
      ev('assistant/message', 3, offTime, { turn: 1, step: 1, usage: USAGE }),
    ], new Set())
    expect(fold.byTier.get('peak')?.calls).toBe(1)
    expect(fold.byTier.get('offPeak')?.calls).toBe(1)
    // 同模型同量 token：官方刊例峰价为谷价 2 倍，两桶费用应有明显档差。
    const peakCost = fold.byTier.get('peak')?.cost ?? 0
    const offCost = fold.byTier.get('offPeak')?.cost ?? 0
    expect(peakCost).toBeGreaterThan(offCost * 1.9)
  })

  it('counts a tool call once per (turn, step, index) despite repeated delta names', () => {
    // tool-call-delta 每个增量都重复携带工具名：只按 (turn, step, index) 首见计一次。
    const fold = foldSession([
      ev('assistant/chunk', 1, 1_000, { turn: 1, step: 1, chunk: { type: 'tool-call-delta', index: 0, name: 'read_file', argumentsDelta: '' } }),
      ev('assistant/chunk', 2, 1_001, { turn: 1, step: 1, chunk: { type: 'tool-call-delta', index: 0, name: 'read_file', argumentsDelta: '{"p"' } }),
      ev('assistant/chunk', 3, 1_002, { turn: 1, step: 1, chunk: { type: 'tool-call-delta', index: 1, name: 'edit_file', argumentsDelta: '' } }),
    ], new Set())
    expect(fold.byTool.get('read_file')).toBe(1)
    expect(fold.byTool.get('edit_file')).toBe(1)
  })

  it('emits byTier / byTool in the aggregated document', async () => {
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        ev('request/header', 1, peakTime, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
        ev('assistant/chunk', 2, peakTime + 1, { turn: 1, step: 1, chunk: { type: 'tool-call-delta', index: 0, name: 'read_file' } }),
        ev('assistant/message', 3, peakTime + 2, { turn: 1, step: 1, usage: USAGE }),
      ],
    }))
    expect(stats.byTier?.peak.calls).toBe(1)
    expect(stats.byTool?.read_file).toBe(1)
  })

  it('records explicit cache-write tokens as a cacheMiss subset', () => {
    const acc = emptyUsage()
    foldUsage(acc, { inputTokens: 10, outputTokens: 5, cacheReadTokens: 100, cacheWriteTokens: 30 }, 'flash', false, offTime)
    expect(acc.cacheWrite).toBe(30)
    // cacheMiss 语义不变：未命中输入 + 显式写入。
    expect(acc.cacheMiss).toBe(40)
  })
})

describe('fork seed filtering (inheritedEventCount)', () => {
  /** Fold-session event row helper (durable-shape cast like the aggregator). */
  const ev = (type: string, seq: number, time: number, data: Record<string, unknown>): SessionEvent =>
    ({ type, seq, time, data }) as unknown as SessionEvent
  const flash = { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }

  it('skips seed events sequenced before the durable seedLength boundary', () => {
    const fold = foldSession([
      // 种子：父会话拷贝来的事件（seq < seedLength 4），不应重复计费。
      ev('request/header', 1, 1_000, flash),
      ev('assistant/message', 2, 1_001, { turn: 1, step: 1, usage: USAGE }),
      ev('session/end-seed', 4, 1_002, {}),
      // 本会话 own 事件（seq > 边界 4）：正常计费。
      ev('request/header', 5, 2_000, flash),
      ev('assistant/message', 6, 2_001, { turn: 2, step: 1, usage: USAGE }),
    ], new Set(), undefined, {}, 0, 4)
    // 只有 own 事件的 2 号调计入总调用。
    expect(fold.total.calls).toBe(1)
    expect(fold.turns).toHaveLength(1)
    expect(fold.turns[0]).toMatchObject({ turn: 2 })
  })

  it('uses the inheritedEventCount as the boundary for a multi-level fork chain', () => {
    // C fork 自 B：种子 = B 的全量日志（A 种子 + B end-seed + B own），
    // C 的 inheritedEventCount = 5（end-seed 之前的全部事件数）。
    const fold = foldSession([
      // A 种子（seq 0–1）。
      ev('request/header', 0, 1_000, flash),
      ev('assistant/message', 1, 1_001, { turn: 1, step: 1, usage: USAGE }),
      // B 的 end-seed（seq 2）。
      ev('session/end-seed', 2, 1_002, {}),
      // B 的 own 事件（seq 3–4）——对 C 而言仍是种子。
      ev('request/header', 3, 1_100, flash),
      ev('assistant/message', 4, 1_101, { turn: 2, step: 1, usage: USAGE }),
      // C 的 end-seed（seq 5，边界）。
      ev('session/end-seed', 5, 1_102, {}),
      // C 的 own 事件（seq 6）：唯一应计费的。
      ev('request/header', 6, 2_000, flash),
      ev('assistant/message', 7, 2_001, { turn: 3, step: 1, usage: USAGE }),
    ], new Set(), undefined, {}, 0, 5)
    expect(fold.total.calls).toBe(1)
    expect(fold.turns).toHaveLength(1)
    expect(fold.turns[0]).toMatchObject({ turn: 3 })
  })

  it('keeps billing the own prefix when a forked child is resumed and used again', () => {
    // fork 子会话（inheritedEventCount 4）被 resume：日志追加第二个 end-seed（seq 7）后继续聊。
    // 边界仍取持久化元数据的 4，原 own 段（seq 5–6）与续写段（seq 8–9）都计费。
    const fold = foldSession([
      ev('request/header', 1, 1_000, flash),
      ev('assistant/message', 2, 1_001, { turn: 1, step: 1, usage: USAGE }),
      ev('session/end-seed', 4, 1_002, {}),
      ev('request/header', 5, 2_000, flash),
      ev('assistant/message', 6, 2_001, { turn: 2, step: 1, usage: USAGE }),
      ev('session/end-seed', 7, 2_002, {}),
      ev('request/header', 8, 3_000, flash),
      ev('assistant/message', 9, 3_001, { turn: 3, step: 1, usage: USAGE }),
    ], new Set(), undefined, {}, 0, 4)
    expect(fold.total.calls).toBe(2)
    expect(fold.turns).toHaveLength(2)
  })

  it('bills a resumed-then-used session in full (no fork lineage, issue #29)', () => {
    // 同一会话 resume 两次后继续聊：日志里有两个 end-seed 且其后还有 live 事件，
    // 继承切割保持原值（无 fork 血缘 → inheritedEventCount 为 0），历史段照常计费。
    const fold = foldSession([
      ev('request/header', 0, 1_000, flash),
      ev('assistant/message', 1, 1_001, { turn: 1, step: 1, usage: USAGE }),
      ev('session/end-seed', 2, 1_002, {}),
      ev('request/header', 3, 2_000, flash),
      ev('assistant/message', 4, 2_001, { turn: 2, step: 1, usage: USAGE }),
      ev('session/end-seed', 5, 2_002, {}),
      ev('request/header', 6, 3_000, flash),
      ev('assistant/message', 7, 3_001, { turn: 3, step: 1, usage: USAGE }),
    ], new Set())
    expect(fold.total.calls).toBe(3)
    expect(fold.turns).toHaveLength(3)
  })

  it('keeps all events when no seed boundary exists (non-fork session)', () => {
    const fold = foldSession([
      ev('request/header', 1, 1_000, flash),
      ev('assistant/message', 2, 1_001, { turn: 1, step: 1, usage: USAGE }),
      ev('request/header', 3, 2_000, flash),
      ev('assistant/message', 4, 2_001, { turn: 2, step: 1, usage: USAGE }),
    ], new Set())
    expect(fold.total.calls).toBe(2)
    expect(fold.turns).toHaveLength(2)
  })

  it('aggregate() honours the inheritedEventCount from persistence.readFrom', async () => {
    // 聚合层端到端：同一份 fork 形态日志，readFrom 给的 inheritedEventCount 决定种子跳过。
    const log = [
      ev('request/header', 1, 1_000, flash),
      ev('assistant/message', 2, 1_001, { turn: 1, step: 1, usage: USAGE }),
      ev('session/end-seed', 4, 1_002, {}),
      ev('request/header', 5, 2_000, flash),
      ev('assistant/message', 6, 2_001, { turn: 2, step: 1, usage: USAGE }),
    ]
    const forked = await aggregateUsage(fakePersistence({ s1: log }, { s1: 4 }))
    expect(forked.bySession.find(row => row.id === 's1')?.calls).toBe(1)
    const resumed = await aggregateUsage(fakePersistence({ s1: log }))
    expect(resumed.bySession.find(row => row.id === 's1')?.calls).toBe(2)
  })
})

describe('byRole attribution (estimated)', () => {
  /** Fold-session event row helper (durable-shape cast like the aggregator). */
  const ev = (type: string, seq: number, time: number, data: Record<string, unknown>): SessionEvent =>
    ({ type, seq, time, data }) as unknown as SessionEvent

  it('splits input cost between user and tool by message text share; output goes to assistant', async () => {
    // user 消息 8 字符、tool 结果 24 字符：输入成本按 25% / 75% 摊分。
    const stats = await aggregateUsage(fakePersistence({
      s1: [
        header(1, 'deepseek-v4-flash'),
        ev('user/message', 2, 900, { message: { role: 'user', content: 'aaaaaaaa' } }) as unknown as SessionEvent,
        ev('tool/result', 3, 950, { turn: 1, step: 1, message: { role: 'tool', content: 'a'.repeat(24) } }) as unknown as SessionEvent,
        message(4, 1_000, USAGE),
      ],
    }))
    const role = stats.byRole
    expect(role).toBeDefined()
    if (role === undefined) return
    const inputCost = role.user + role.tool
    // 三段合计 = 总成本（口径自洽）。
    expect(inputCost + role.assistant).toBeCloseTo(stats.total.cost, 10)
    // 输入成本按字符占比 1:3 摊分。
    expect(role.tool).toBeCloseTo(role.user * 3, 10)
    // 助手输出成本 = 输出 tokens 的实测计价（>0 且小于总成本）。
    expect(role.assistant).toBeGreaterThan(0)
    expect(role.assistant).toBeLessThan(stats.total.cost)
  })

  it('splits input cost evenly when no message content is recorded', async () => {
    const stats = await aggregateUsage(fakePersistence({
      s1: [header(1, 'deepseek-v4-flash'), message(2, 1_000, USAGE)],
    }))
    const role = stats.byRole
    expect(role).toBeDefined()
    if (role === undefined) return
    expect(role.user).toBeCloseTo(role.tool, 10)
    expect(role.user + role.assistant + role.tool).toBeCloseTo(stats.total.cost, 10)
  })

  it('keeps subscription calls at zero across all roles', async () => {
    const stats = await aggregateUsage(
      fakePersistence({ s1: [header(1, 'k3', 'kimi-coding'), message(2, 1_000, USAGE)] }),
      { subscriptionProviders: ['kimi-coding'] },
    )
    expect(stats.byRole).toEqual({ user: 0, assistant: 0, tool: 0 })
  })
})

describe('dayStamp', () => {
  it('formats the local date of a timestamp', () => {
    // 2026-08-15 12:00 UTC 在 UTC+8 是 2026-08-15 20:00。
    expect(dayStamp(Date.UTC(2026, 7, 15, 12, 0, 0))).toMatch(/^2026-08-1[5-6]$/)
  })
})

describe('relay site attribution (P0-2)', () => {
  it('collects unpriced models into unpricedModels', () => {
    const fold = foldSession([
      header(1, 'unknown-model-x', 'unknown-route') as unknown as SessionEvent,
      message(2, 1_001, USAGE) as unknown as SessionEvent,
    ], new Set())
    expect(fold.unpricedModels.has('unknown-model-x')).toBe(true)
    // 已收录模型不进 unpriced 集合。
    const foldPriced = foldSession([
      header(1, 'deepseek-v4-flash') as unknown as SessionEvent,
      message(2, 1_001, USAGE) as unknown as SessionEvent,
    ], new Set())
    expect(foldPriced.unpricedModels.size).toBe(0)
  })
  it('normalizes a baseURL to its origin', () => {
    expect(siteOriginOf('https://relay.example.com/v1')).toBe('https://relay.example.com')
    expect(siteOriginOf('http://gateway.acme.example:8080/path')).toBe('http://gateway.acme.example:8080')
    // 非法的 URL 原样回退（不抛错）。
    expect(siteOriginOf('not-a-url')).toBe('not-a-url')
  })

  it('classifies a route as site / direct / unknown from the provider routes dict', () => {
    const routes: Record<string, { baseURL?: string }> = {
      // 配了 baseURL → 中转站（按 origin 归组）。
      'relay-a': { baseURL: 'https://relay.example.com/v1' },
      // 存在但无 baseURL → 直连厂商。
      'deepseek': {},
    }
    expect(siteRefOf('relay-a', routes)).toEqual({ kind: 'site', origin: 'https://relay.example.com', provider: 'relay-a' })
    expect(siteRefOf('deepseek', routes)).toEqual({ kind: 'direct', provider: 'deepseek' })
    // 不在配置里 → 未知路由（读不到，而不是直连）。
    expect(siteRefOf('removed-route', routes)).toEqual({ kind: 'unknown', provider: 'removed-route' })
  })

  it('keys site buckets stably for the dashboard', () => {
    expect(siteBucketKey({ kind: 'site', origin: 'https://relay.example.com', provider: 'relay-a' })).toBe('site:https://relay.example.com')
    expect(siteBucketKey({ kind: 'direct', provider: 'deepseek' })).toBe('direct:deepseek')
    expect(siteBucketKey({ kind: 'unknown', provider: 'whatever' })).toBe('unknown')
  })

  it('folds each call into its site bucket keyed by origin', () => {
    const ev = (type: string, seq: number, time: number, data: Record<string, unknown>): SessionEvent =>
      ({ type, seq, time, data }) as unknown as SessionEvent
    const fold = foldSession([
      ev('request/header', 1, 1_000, { header: { config: { provider: 'relay-a', model: 'deepseek-v4-flash' } } }),
      ev('assistant/message', 2, 1_001, { turn: 1, step: 1, usage: USAGE }),
    ], new Set(), undefined, { 'relay-a': { baseURL: 'https://relay.example.com/v1' } })
    const site = fold.bySite.get('site:https://relay.example.com')
    expect(site?.calls).toBe(1)
    expect(site?.cost ?? 0).toBeGreaterThan(0)
  })

  it('emits bySite in the document when routes resolve to stations', async () => {
    const stats = await aggregateUsage(
      fakePersistence({ s1: [header(1, 'deepseek-v4-flash', 'relay-a'), message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE)] }),
      { resolveRoutes: () => ({ 'relay-a': { baseURL: 'https://relay.example.com/v1' } }) },
    )
    expect(stats.bySite?.['site:https://relay.example.com']?.calls).toBe(1)
    expect(stats.bySite?.['unknown']).toBeUndefined()
  })

  it('routes without configuration fall into the unknown bucket', async () => {
    const stats = await aggregateUsage(
      fakePersistence({ s1: [header(1, 'deepseek-v4-flash', 'missing-route'), message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE)] }),
    )
    expect(stats.bySite?.['unknown']?.calls).toBe(1)
  })

  it('records zero cost for unknown channels while tokens still count (issue #82)', () => {
    const ev = (type: string, seq: number, time: number, data: Record<string, unknown>): SessionEvent =>
      ({ type, seq, time, data }) as unknown as SessionEvent
    const fold = foldSession([
      ev('request/header', 1, 1_000, { header: { config: { provider: 'missing-route', model: 'deepseek-v4-flash' } } }),
      ev('assistant/message', 2, 1_001, { turn: 1, step: 1, usage: USAGE }),
    ], new Set())
    // 已收录模型走未知通道：费用记 0、token 照常、不进「目录外模型」提示。
    expect(fold.total.calls).toBe(1)
    expect(fold.total.cost).toBe(0)
    expect(fold.total.input).toBeGreaterThan(0)
    expect(fold.bySite.get('unknown')?.cost ?? 0).toBe(0)
    expect(fold.bySite.get('unknown')?.calls).toBe(1)
    expect(fold.unpricedModels.size).toBe(0)
  })

  it('keeps unknown-channel cost out of totals when mixed with direct usage (issue #82)', () => {
    const ev = (type: string, seq: number, time: number, data: Record<string, unknown>): SessionEvent =>
      ({ type, seq, time, data }) as unknown as SessionEvent
    const fold = foldSession([
      ev('request/header', 1, 1_000, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
      ev('assistant/message', 2, 1_001, { turn: 1, step: 1, usage: USAGE }),
      ev('request/header', 3, 2_000, { header: { config: { provider: 'missing-route', model: 'deepseek-v4-flash' } } }),
      ev('assistant/message', 4, 2_001, { turn: 2, step: 1, usage: USAGE }),
    ], new Set())
    // total 只含 direct 调用的费用；unknown 调用只贡献 calls/token。
    expect(fold.total.calls).toBe(2)
    expect(fold.total.cost).toBeGreaterThan(0)
    expect(fold.total.cost).toBe(fold.bySite.get('direct:deepseek-official')?.cost ?? -1)
    expect(fold.bySite.get('unknown')?.cost ?? 0).toBe(0)
  })
})

describe('aggregateUsage', () => {
  it('attributes calls to the model of the preceding request header', async () => {
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        header(1, 'deepseek-v4-flash'),
        message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE),
        message(3, Date.UTC(2026, 7, 15, 5, 0, 0), USAGE),
      ],
    }))
    expect(stats.total.calls).toBe(2)
    const flash = stats.byModel.flash
    expect(flash?.calls).toBe(2)
    expect(flash?.cost ?? 0).toBeGreaterThan(0)
  })

  it('groups usage by local day', async () => {
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        header(1, 'deepseek-v4-flash'),
        message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE),
        message(3, Date.UTC(2026, 7, 16, 4, 0, 0), USAGE),
      ],
    }))
    expect(Object.keys(stats.byDay)).toHaveLength(2)
  })

  it('buckets DeepSeek-official calls as official and the rest as third-party', async () => {
    // 官方 = 直连路由（配置在册、无 baseURL）按 deepseek 前缀判定；其余（如 openrouter 中转）计为三方。
    // 未知路由（不在配置里）不猜官方：历史改名路由用 routeAliases 归位（见下方专项用例）。
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        header(1, 'deepseek-v4-flash', 'deepseek-official'),
        message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE),
        header(3, 'deepseek-v4-flash', 'openrouter'),
        message(4, Date.UTC(2026, 7, 15, 5, 0, 0), USAGE),
      ],
    }), {
      resolveRoutes: () => ({ 'deepseek-official': {}, openrouter: {} }),
    })
    const flash = stats.byModel.flash
    expect(flash?.calls).toBe(2)
    expect(flash?.officialCalls).toBe(1)
    // 官方费用 = 官方那次调用的计价，>0 且小于总费用。
    expect(flash?.officialCost ?? 0).toBeGreaterThan(0)
    expect(flash?.officialCost ?? 0).toBeLessThan(flash?.cost ?? 0)
  })

  it('keeps unknown (subscription) models free while counting their tokens', async () => {
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        header(1, 'mimo-v2-pro'),
        message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE),
      ],
    }))
    const unknown = stats.byModel['mimo-v2-pro']
    expect(unknown?.calls).toBe(1)
    expect(unknown?.cost).toBe(0)
    expect(unknown?.cacheHit).toBe(800)
  })

  it('waives cost for subscription providers even when their model id is in the catalog', async () => {
    // kimi-coding 是订阅 provider：用它跑 deepseek-v4-flash（计费表有价）也不计费。
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        header(1, 'deepseek-v4-flash', 'kimi-coding'),
        message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE),
      ],
    }))
    const flash = stats.byModel.flash
    expect(flash?.calls).toBe(1)
    expect(flash?.cost).toBe(0)
  })

  it('maps the kimi coding-plan model id k3 to the catalog and waives cost', async () => {
    // 真实日志里 kimi-coding 通道的 model id 是短名 k3：别名归一到
    // kimi-k3（Kimi K3 目录条目），不再落到「其他模型」，费用按订阅记 0。
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        header(1, 'k3', 'kimi-coding'),
        message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE),
      ],
    }))
    const k3 = stats.byModel['kimi-k3']
    expect(k3?.calls).toBe(1)
    expect(stats.byModel['k3']).toBeUndefined()
    expect(k3?.cost).toBe(0)
    expect(k3?.plan).toBe(true)
  })

  it('attributes the xiaomi token-plan model mimo-v2.5 to its catalog row and waives cost', async () => {
    // 小米 token plan 通道的 model id 是 mimo-v2.5（目录 key 同名）：
    // 不再落到「其他模型」，费用按订阅记 0。
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        header(1, 'mimo-v2.5', 'xiaomi-token-plan-cn'),
        message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE),
      ],
    }))
    const mimo = stats.byModel['mimo-v2.5']
    expect(mimo?.calls).toBe(1)
    expect(mimo?.cost).toBe(0)
    expect(mimo?.plan).toBe(true)
  })

  it('waives cost for opencode subscription channels', async () => {
    // opencode / opencode-go 是订阅通道：目录模型走它也按订阅记 0、标 plan。
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        header(1, 'kimi-k3', 'opencode-go'),
        message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE),
      ],
    }))
    const k3 = stats.byModel['kimi-k3']
    expect(k3?.cost).toBe(0)
    expect(k3?.plan).toBe(true)
  })

  it('keeps paid calls priced when a subscription call lands later in the same bucket', async () => {
    // 同一会话内先跑 DeepSeek（收费）再跑 Kimi K3 coding plan（免费）：
    // 当日与总计 cost 必须仍包含 DeepSeek 的费用，不能被免费调用覆盖成 0。
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        header(1, 'deepseek-v4-flash'),
        message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE),
        header(3, 'k3', 'kimi-coding'),
        message(4, Date.UTC(2026, 7, 15, 5, 0, 0), USAGE),
      ],
    }))
    expect(stats.total.calls).toBe(2)
    expect(stats.total.cost).toBeGreaterThan(0)
    expect(stats.byModel.flash?.cost ?? 0).toBeGreaterThan(0)
    expect(stats.byModel['kimi-k3']?.cost).toBe(0)
    // 混合通道：flash 走按量（不标订阅），k3 全走订阅（标订阅包含）。
    expect(stats.byModel.flash?.plan).toBeUndefined()
    expect(stats.byModel['kimi-k3']?.plan).toBe(true)
    // 当日桶混合收费 + 免费调用：费用保留收费部分。
    expect(stats.byDay['2026-08-15']?.cost).toBeGreaterThan(0)
  })

  it('rolls multiple sessions into one total', async () => {
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [header(1, 'deepseek-v4-flash'), message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE)],
      'session-b': [header(1, 'deepseek-v4-flash'), message(2, Date.UTC(2026, 7, 15, 5, 0, 0), USAGE)],
    }))
    expect(stats.total.calls).toBe(2)
  })

  it('skips a corrupt/unreadable session instead of failing the whole aggregation', async () => {
    // 单个损坏会话（readFrom 抛异常，如 zstd torn frame）不得拖垮整份聚合：
    // 其余正常会话仍被折叠，坏会话被跳过并告警（GitHub issue「仪表盘全部归零」）。
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const corruptReadFrom = async (id: SessionId, fromSeq: number) => {
      if (String(id) === 'session-corrupt') {
        throw new Error('corrupt Zstandard session log: complete frame contains a torn JSONL record')
      }
      return fakePersistence({
        'session-good': [header(1, 'deepseek-v4-flash'), message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE)],
      }).readFrom(id, fromSeq)
    }
    const persistence: UsagePersistence = {
      list: async () => ['session-good', 'session-corrupt'].map(id => ({ id })),
      readFrom: corruptReadFrom,
    } as unknown as UsagePersistence

    const stats = await aggregateUsage(persistence)
    expect(stats.total.calls).toBe(1)
    expect(stats.byModel.flash?.calls).toBe(1)
    // 坏会话不入明细，正常会话保留。
    expect(stats.bySession).toHaveLength(1)
    expect(stats.bySession[0]?.id).toBe('session-good')
    warn.mockRestore()
  })

  it('splits usage by model and day for the stacked trend chart', async () => {
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        header(1, 'deepseek-v4-flash'),
        message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE),
        header(3, 'glm-5.2'),
        message(4, Date.UTC(2026, 7, 15, 5, 0, 0), USAGE),
        message(5, Date.UTC(2026, 7, 16, 4, 0, 0), USAGE),
      ],
    }))
    const days = Object.keys(stats.byDayModels)
    // flash 与 glm 各至少覆盖一个本地日，且有一天两个模型并存。
    expect(days).toHaveLength(2)
    let flashCalls = 0
    let glmCalls = 0
    let coexistingDays = 0
    for (const day of days) {
      const models = stats.byDayModels[day] ?? {}
      if (models.flash !== undefined && models.glm !== undefined) coexistingDays += 1
      flashCalls += models.flash?.calls ?? 0
      glmCalls += models.glm?.calls ?? 0
      // 存在的模型都在计费表里，费用 > 0。
      if (models.flash !== undefined) expect(models.flash.cost).toBeGreaterThan(0)
      if (models.glm !== undefined) expect(models.glm.cost).toBeGreaterThan(0)
    }
    expect(coexistingDays).toBeGreaterThanOrEqual(1)
    expect(flashCalls).toBe(1)
    expect(glmCalls).toBe(2)
  })

  it('rolls per-session rows with title, cwd, cost, and last-active, sorted by cost', async () => {
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        { type: 'session/title', seq: 1, time: 900, data: { title: '修复登录 bug' } } as unknown as SessionEvent,
        header(2, 'deepseek-v4-flash'),
        message(3, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE),
      ],
      'session-b': [
        header(1, 'glm-5.2'),
        message(2, Date.UTC(2026, 7, 15, 5, 0, 0), USAGE),
        message(3, Date.UTC(2026, 7, 15, 6, 0, 0), USAGE),
      ],
      // 无调用的会话（只有标题事件）不进明细。
      'session-c': [
        { type: 'session/title', seq: 1, time: 800, data: { title: '空会话' } } as unknown as SessionEvent,
      ],
    }))
    expect(stats.bySession).toHaveLength(2)
    // glm 两次调用费用更高，排第一；无标题时 title 字段缺失。
    expect(stats.bySession[0]?.id).toBe('session-b')
    expect(stats.bySession[0]?.calls).toBe(2)
    expect(stats.bySession[0]?.title).toBeUndefined()
    expect(stats.bySession[1]).toMatchObject({ id: 'session-a', title: '修复登录 bug', calls: 1 })
    expect(stats.bySession[1]?.lastActive ?? 0).toBeGreaterThan(0)
  })

  it('caps session rows at SESSION_ROW_LIMIT', async () => {
    const logs: Record<string, SessionEvent[]> = {}
    for (let i = 0; i < SESSION_ROW_LIMIT + 5; i += 1) {
      logs[`s-${String(i)}`] = [header(1, 'deepseek-v4-flash'), message(2, Date.UTC(2026, 7, 15, 4, 0, 0) + i, USAGE)]
    }
    const stats = await aggregateUsage(fakePersistence(logs))
    expect(stats.bySession).toHaveLength(SESSION_ROW_LIMIT)
    expect(stats.total.calls).toBe(SESSION_ROW_LIMIT + 5)
  })
})

describe('createUsageAggregator (incremental cache)', () => {
  let root: string | undefined

  afterEach(async () => {
    vi.useRealTimers()
    if (root !== undefined) await rm(root, { recursive: true, force: true })
    root = undefined
  })

  /**
   * 带 locate 的持久化替身：事件在内存、失效键来自真实临时文件的
   * mtime+size；reads 记录每个会话的重折次数。
   */
  async function fileBackedPersistence(logs: Record<string, SessionEvent[]>) {
    root = await mkdtemp(join(tmpdir(), 'dsh-billing-agg-'))
    const reads: Record<string, number> = {}
    const paths: Record<string, string> = {}
    for (const id of Object.keys(logs)) {
      const path = join(root!, `${id}.jsonl`)
      await writeFile(path, JSON.stringify(logs[id]?.length ?? 0))
      paths[id] = path
      reads[id] = 0
    }
    const persistence = {
      list: async () => Object.keys(logs).map(id => ({ id })),
      locate: (meta: { id: SessionId }) => ({ kind: 'jsonl', path: paths[String(meta.id)] ?? '' }),
      readFrom: async (id: SessionId, fromSeq: number) => {
        reads[String(id)] = (reads[String(id)] ?? 0) + 1
        return { meta: { id }, events: (logs[String(id)] ?? []).filter(event => event.seq >= fromSeq) }
      },
    } as unknown as UsagePersistence
    return { persistence, reads, paths }
  }

  it('reuses the cached fold for untouched logs and re-folds only the written session', async () => {
    vi.useFakeTimers()
    const logs: Record<string, SessionEvent[]> = {
      a: [header(1, 'deepseek-v4-flash'), message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE)],
      b: [header(1, 'deepseek-v4-flash'), message(2, Date.UTC(2026, 7, 15, 5, 0, 0), USAGE)],
    }
    const { persistence, reads, paths } = await fileBackedPersistence(logs)
    const aggregator = createUsageAggregator(persistence)

    const first = await aggregator.aggregate()
    expect(first.total.calls).toBe(2)
    expect(reads).toMatchObject({ a: 1, b: 1 })

    // TTL 内：直接复用整份文档，不再读任何日志。
    const second = await aggregator.aggregate()
    expect(second).toBe(first)
    expect(reads).toMatchObject({ a: 1, b: 1 })

    // 过了 TTL 但日志没动：按会话缓存命中，仍不重折。
    vi.advanceTimersByTime(AGGREGATE_TTL_MS + 1000)
    const third = await aggregator.aggregate()
    expect(third.total.calls).toBe(2)
    expect(reads).toMatchObject({ a: 1, b: 1 })

    // b 的日志写过了（size 变化使失效键失配）：只重折 b。
    logs['b'] = [...logs['b']!, message(3, Date.UTC(2026, 7, 15, 6, 0, 0), USAGE)]
    await writeFile(paths['b']!, JSON.stringify(logs['b'].length))
    vi.advanceTimersByTime(AGGREGATE_TTL_MS + 1000)
    const fourth = await aggregator.aggregate()
    expect(fourth.total.calls).toBe(3)
    expect(reads).toMatchObject({ a: 1, b: 2 })
  })

  it('drops cache entries for sessions no longer listed', async () => {
    vi.useFakeTimers()
    const logs: Record<string, SessionEvent[]> = {
      a: [header(1, 'deepseek-v4-flash'), message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE)],
    }
    const { persistence, reads } = await fileBackedPersistence(logs)
    const aggregator = createUsageAggregator(persistence)
    await aggregator.aggregate()
    expect(reads['a']).toBe(1)

    // 会话从列表消失后结果不再包含它；重新出现时按新会话重折。
    vi.advanceTimersByTime(AGGREGATE_TTL_MS + 1000)
    const gone = { ...logs }
    delete gone['a']
    const persistence2 = {
      list: async () => [] as { id: SessionId }[],
      readFrom: persistence.readFrom,
    } as unknown as UsagePersistence
    const empty = await createUsageAggregator(persistence2).aggregate()
    expect(empty.total.calls).toBe(0)
    expect(empty.bySession).toHaveLength(0)
  })

  const T0 = Date.UTC(2026, 7, 15, 4, 0, 0)

  /** 一段含完整状态机路径的事件：header 归因、source 权威归属、轮次、step 性能、工具去重。 */
  function firstBatch(): SessionEvent[] {
    return [
      header(1, 'deepseek-v4-flash'),
      { type: 'turn/start', seq: 2, time: T0, data: { turn: 1 } } as unknown as SessionEvent,
      { type: 'step/start', seq: 3, time: T0 + 100, data: { turn: 1, step: 1 } } as unknown as SessionEvent,
      {
        type: 'assistant/chunk', seq: 4, time: T0 + 200,
        data: { turn: 1, step: 1, chunk: { type: 'tool-call-delta', index: 0, name: 'read_file' } },
      } as unknown as SessionEvent,
      {
        type: 'assistant/chunk', seq: 5, time: T0 + 300,
        data: { turn: 1, step: 1, chunk: { type: 'tool-call-delta', index: 0, name: 'read_file' } },
      } as unknown as SessionEvent,
      message(6, T0 + 400, USAGE),
    ]
  }

  /** 追加批次：新轮次、source 缺失（落 header 兜底归属）、同工具新调用。 */
  function appendedBatch(from: number): SessionEvent[] {
    return [
      { type: 'turn/start', seq: from, time: T0 + 1_000, data: { turn: 2 } } as unknown as SessionEvent,
      { type: 'step/start', seq: from + 1, time: T0 + 1_100, data: { turn: 2, step: 1 } } as unknown as SessionEvent,
      {
        type: 'assistant/chunk', seq: from + 2, time: T0 + 1_200,
        data: { turn: 2, step: 1, chunk: { type: 'tool-call-delta', index: 0, name: 'grep' } },
      } as unknown as SessionEvent,
      {
        type: 'assistant/message', seq: from + 3, time: T0 + 1_300,
        data: { turn: 2, step: 1, message: { role: 'assistant', content: [] }, usage: USAGE },
      } as unknown as SessionEvent,
    ]
  }

  it('folds an appended batch identically to a single full fold (issue #30)', async () => {
    vi.useFakeTimers()
    const logs: Record<string, SessionEvent[]> = { a: firstBatch() }
    const { persistence, reads } = await fileBackedPersistence(logs)
    const aggregator = createUsageAggregator(persistence)
    const first = await aggregator.aggregate()
    expect(reads.a).toBe(1)

    // 活跃会话追加一段事件：下一次聚合只增量折叠追加段（仍是一次 readFrom 调用）。
    logs.a = [...firstBatch(), ...appendedBatch(7)]
    await writeFile(`${join(root!, 'a.jsonl')}`, 'appended')
    vi.advanceTimersByTime(AGGREGATE_TTL_MS + 1000)
    const second = await aggregator.aggregate()
    expect(reads.a).toBe(2)
    expect(second.total.calls).toBe(2)

    // 等价性：同一份完整日志一次全量折叠的结果必须与「先折前半、增量折后半」逐字段一致。
    const allAtOnce = await createUsageAggregator(await fileBackedPersistence({ a: logs.a }).then(r => r.persistence)).aggregate()
    expect(second.total).toEqual(allAtOnce.total)
    expect(second.byModel).toEqual(allAtOnce.byModel)
    expect(second.byDay).toEqual(allAtOnce.byDay)
    expect(second.byTool).toEqual(allAtOnce.byTool)
    expect(second.bySession).toEqual(allAtOnce.bySession)
  })

  it('falls back to a full re-fold when the appended log has a sequence gap (issue #30)', async () => {
    vi.useFakeTimers()
    const logs: Record<string, SessionEvent[]> = { a: firstBatch() }
    const { persistence, reads } = await fileBackedPersistence(logs)
    // 生产配置始终带 ledger：跳号当轮该会话由 durable 行兜底，不缺席。
    const store = fakeLedgerStore([])
    const aggregator = createUsageAggregator(persistence, { ledger: store.store })
    await aggregator.aggregate()

    // 追加段 seq 跳号（日志被截断/重写）：增量前提失效——当轮丢弃该会话，
    // 由上一轮的账本行兜底；下一轮已无缓存游标，全量重建与「一次全量折叠」一致。
    logs.a = [...firstBatch(), ...appendedBatch(99)]
    await writeFile(`${join(root!, 'a.jsonl')}`, 'rewritten')
    vi.advanceTimersByTime(AGGREGATE_TTL_MS + 1000)
    const skippedRound = await aggregator.aggregate()
    expect(reads.a).toBe(2)
    expect(skippedRound.total.calls).toBe(1)

    vi.advanceTimersByTime(AGGREGATE_TTL_MS + 1000)
    const rebuilt = await aggregator.aggregate()
    expect(reads.a).toBe(3)
    expect(rebuilt.total.calls).toBe(2)

    const direct = await createUsageAggregator(await fileBackedPersistence({ a: logs.a }).then(r => r.persistence)).aggregate()
    expect(rebuilt.total).toEqual(direct.total)
  })

  it('serves a matching durable ledger row without reading the log (issue #30)', async () => {
    vi.useFakeTimers()
    const logs: Record<string, SessionEvent[]> = { a: firstBatch() }
    const { persistence, reads, paths } = await fileBackedPersistence(logs)
    const info = await stat(paths.a!)
    const store = fakeLedgerStore([{
      id: 'a',
      stamp: `${String(info.mtimeMs)}:${String(info.size)}`,
      foldVersion: FOLD_VERSION,
      fingerprint: configFingerprint(new Set(DEFAULT_SUBSCRIPTION_PROVIDERS), undefined, {}, DEFAULT_SEARCH_CALL_ESTIMATE_CNY, {}, new Set()),
      fold: (() => { const row = legacyFold(); row.total.calls = 7; return row })(),
    }])
    const aggregator = createUsageAggregator(persistence, { ledger: store.store })
    const stats = await aggregator.aggregate()
    // 日志未被触碰：账本行（同 stamp、同算法版本、同配置指纹）直接复用，零读取。
    expect(reads.a ?? 0).toBe(0)
    expect(stats.total.calls).toBe(7)

    // 日志追加后：账本行恢复不带增量游标，退回全量重折按真实日志计。
    logs.a = [...firstBatch(), ...appendedBatch(7)]
    await writeFile(paths.a!, 'appended')
    vi.advanceTimersByTime(AGGREGATE_TTL_MS + 1000)
    const refolded = await aggregator.aggregate()
    expect(reads.a).toBe(1)
    expect(refolded.total.calls).toBe(2)
  })

  it('shares one in-flight aggregation across concurrent callers', async () => {
    // in-flight 去重：usage-stats / balance / usage_stats 工具并发触发时只跑
    // 一次折叠（list 只被调一次），避免多倍全量重读压垮宿主事件循环。
    let listCalls = 0
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    const persistence = {
      list: async () => {
        listCalls += 1
        await gate
        return [{ id: 'a' }]
      },
      readFrom: async (id: SessionId) => ({
        meta: { id },
        events: [header(1, 'deepseek-v4-flash'), message(2, 1_000, USAGE)],
      }),
    } as unknown as UsagePersistence
    const aggregator = createUsageAggregator(persistence)

    const first = aggregator.aggregate()
    const second = aggregator.aggregate()
    release()
    const [docA, docB] = await Promise.all([first, second])
    expect(listCalls).toBe(1)
    expect(docA).toBe(docB)
    expect(docA.total.calls).toBe(1)
  })

  it('exposes the last completed document without triggering a new fold (issue #103)', async () => {
    // lastDocOf：路由超预算时的第一回落（内存里最近一次**已完成**的聚合文档）。
    // 契约：只读、不触发折叠、不改 TTL 游标；尚无完成的聚合时 undefined。
    let lists = 0
    const persistence = {
      list: async () => {
        lists += 1
        return [{ id: 'a' }]
      },
      readFrom: async (id: SessionId) => ({
        meta: { id },
        events: [header(1, 'deepseek-v4-flash'), message(2, 1_000, USAGE)],
      }),
    } as unknown as UsagePersistence
    const aggregator = createUsageAggregator(persistence)

    // 聚合前：没有已完成文档。
    expect(aggregator.lastDocOf()).toBeUndefined()

    const doc = await aggregator.aggregate()
    expect(aggregator.lastDocOf()).toBe(doc)
    expect(lists).toBe(1)

    // 再次读取不触发新折叠（list 不再被调）。
    expect(aggregator.lastDocOf()).toBe(doc)
    expect(lists).toBe(1)
  })

  it('follows a rename appended to the session log (issue #103)', async () => {
    // 重命名会话 = 日志尾部追加一条 session/title 事件（宿主 sessionTitle 服务
    // 的行为）。插件的会话标题取日志里最后一条标题事件：增量折叠路径必须把
    // 新标题吃进去，否则账单明细一直显示旧标题。
    vi.useFakeTimers()
    const logs: Record<string, SessionEvent[]> = {
      s1: [titleEvent(0, 1_000, '旧标题'), header(1, 'deepseek-v4-flash'), message(2, 1_100, USAGE)],
    }
    let revision = 'rev-1'
    const persistence = {
      list: async () => [{ id: 's1' as SessionId }],
      stampOf: async () => revision,
      readFrom: async (id: SessionId, fromSeq: number) => ({
        meta: { id },
        inheritedEventCount: 0,
        events: (logs[id] ?? []).filter(event => (event.seq ?? 0) >= fromSeq),
      }),
    } as unknown as UsagePersistence
    const aggregator = createUsageAggregator(persistence)

    const first = await aggregator.aggregate()
    expect(first.bySession?.[0]?.title).toBe('旧标题')

    // 宿主重命名：日志尾部追加标题事件，日志 revision 随之变化。
    logs.s1 = [...logs.s1, titleEvent(3, 2_000, '新标题')]
    revision = 'rev-2'
    vi.advanceTimersByTime(AGGREGATE_TTL_MS + 1_000)
    const second = await aggregator.aggregate()
    expect(second.bySession?.[0]?.title).toBe('新标题')
  })

  it('falls back to the host-side title when the session log cannot be read (issue #103)', async () => {
    // 日志读不动（宿主拒绝该格式/代际）时，插件只能吃账本旧行——标题会永远
    // 停在重命名前的值。宿主侧的会话标题（投影缓存）优先：重命名后的标题
    // 照样显示，账单明细与工作区一致。
    const ledgerRow = legacyFold()
    ledgerRow.title = '旧标题'
    const store = fakeLedgerStore([{
      id: 'broken',
      stamp: 'v1',
      foldVersion: FOLD_VERSION,
      fingerprint: configFingerprint(new Set(DEFAULT_SUBSCRIPTION_PROVIDERS), undefined, {}, DEFAULT_SEARCH_CALL_ESTIMATE_CNY, {}, new Set()),
      fold: ledgerRow,
    }])
    const persistence = {
      list: async () => [{ id: 'broken' as SessionId }],
      // stamp 与账本行不一致 → 账本快路径不命中，本轮真去读日志 → 读不动。
      stampOf: async () => 'v2',
      readFrom: async () => {
        throw new Error('SessionFormatUnsupportedError: unsupported format')
      },
    } as unknown as UsagePersistence
    const aggregator = createUsageAggregator(persistence, {
      ledger: store.store,
      resolveSessionTitle: () => '新标题',
    })
    const doc = await aggregator.aggregate()
    expect(doc.bySession?.[0]?.title).toBe('新标题')
    // 读不动的会话仍照旧计入（账本存档兜底），未统计提示不受影响。
    expect(doc.bySession?.[0]?.calls).toBe(2)
    expect(doc.unreadableSessions).toBe(1)

    // 负缓存生效后不再重读该会话（没有新事件可折），标题仍走宿主侧兜底。
    vi.useFakeTimers()
    vi.advanceTimersByTime(AGGREGATE_TTL_MS + 1_000)
    const again = await aggregator.aggregate()
    expect(again.bySession?.[0]?.title).toBe('新标题')
  })

  it('negative-caches unreadable sessions by stamp until the log changes', async () => {
    vi.useFakeTimers()
    // 坏会话（如新版宿主写入的未知事件格式）按 id+stamp 负缓存：stamp 不变
    // 不再重读重压；stamp 变化（日志被重写/追加）后自动重试一次。
    let reads = 0
    let stamp = 'v1'
    const persistence = {
      list: async () => [{ id: 'bad' }],
      stampOf: async () => stamp,
      readFrom: async () => {
        reads += 1
        throw new Error('unknown event type')
      },
    } as unknown as UsagePersistence
    const aggregator = createUsageAggregator(persistence)

    await aggregator.aggregate()
    expect(reads).toBe(1)

    // stamp 未变：下轮聚合直接跳过，不重读。
    vi.advanceTimersByTime(AGGREGATE_TTL_MS + 1000)
    await aggregator.aggregate()
    expect(reads).toBe(1)

    // stamp 变化：负缓存失效，重试一次（仍失败则按新 stamp 重新入缓存）。
    stamp = 'v2'
    vi.advanceTimersByTime(AGGREGATE_TTL_MS + 1000)
    await aggregator.aggregate()
    expect(reads).toBe(2)
    vi.advanceTimersByTime(AGGREGATE_TTL_MS + 1000)
    await aggregator.aggregate()
    expect(reads).toBe(2)
  })

  it('keeps ledger-reused rows out of the LRU so the active session stays incremental', async () => {
    vi.useFakeTimers()
    // 重度用户回归：账本行（h1~h3）若占用 LRU 名额，会把活跃会话的增量状态机
    // 挤出上限为 2 的缓存，使其每轮退化为全量重折。账本行应直接从 durable 行
    // 复用，活跃会话保持增量。
    const logs: Record<string, SessionEvent[]> = {
      active: firstBatch(),
      h1: firstBatch(),
      h2: firstBatch(),
      h3: firstBatch(),
    }
    const { persistence: inner, paths } = await fileBackedPersistence(logs)
    const fromSeqs: Record<string, number[]> = {}
    const persistence = {
      ...inner,
      readFrom: async (id: SessionId, fromSeq: number) => {
        ;(fromSeqs[String(id)] ??= []).push(fromSeq)
        return inner.readFrom(id, fromSeq)
      },
    } as unknown as UsagePersistence
    const fingerprint = configFingerprint(new Set(DEFAULT_SUBSCRIPTION_PROVIDERS), undefined, {}, DEFAULT_SEARCH_CALL_ESTIMATE_CNY, {}, new Set())
    const ledgerRows: UsageLedgerSession[] = []
    for (const id of ['h1', 'h2', 'h3']) {
      const info = await stat(paths[id]!)
      ledgerRows.push({ id, stamp: `${String(info.mtimeMs)}:${String(info.size)}`, foldVersion: FOLD_VERSION, fingerprint, fold: legacyFold() })
    }
    const store = fakeLedgerStore(ledgerRows)
    const aggregator = createUsageAggregator(persistence, { ledger: store.store, maxCacheSessions: 2 })

    await aggregator.aggregate()
    // 活跃会话全量首折；账本行零读取复用。
    expect(fromSeqs['active']).toEqual([0])
    expect(fromSeqs['h1'] ?? []).toEqual([])

    // 活跃会话追加一段：必须走增量（fromSeq = 7），而不是全量重读。
    logs['active'] = [...firstBatch(), ...appendedBatch(7)]
    await writeFile(paths['active']!, 'appended')
    vi.advanceTimersByTime(AGGREGATE_TTL_MS + 1000)
    await aggregator.aggregate()
    expect(fromSeqs['active']).toEqual([0, 7])
    expect(fromSeqs['h1'] ?? []).toEqual([])
  })

  it('throttles ledger saves and persists pending changes on flush', async () => {
    vi.useFakeTimers()
    const logs: Record<string, SessionEvent[]> = {
      a: [header(1, 'deepseek-v4-flash'), message(2, 1_000, USAGE)],
    }
    const { persistence, paths } = await fileBackedPersistence(logs)
    const store = fakeLedgerStore([])
    const aggregator = createUsageAggregator(persistence, { ledger: store.store })

    // 首次保存不受节流（冷启动折叠成果立即落盘）。
    await aggregator.aggregate()
    expect(store.saved).toHaveLength(1)

    // 节流窗口内的变更不落盘（写放大治理：全量序列化是 O(会话数)）。
    logs['a'] = [...logs['a']!, message(3, 2_000, USAGE)]
    await writeFile(paths['a']!, 'changed')
    vi.advanceTimersByTime(AGGREGATE_TTL_MS + 1000)
    await aggregator.aggregate()
    expect(store.saved).toHaveLength(1)

    // flush 无视节流，把窗口内的改动落盘（插件卸载路径）。
    await aggregator.flush()
    expect(store.saved).toHaveLength(2)
    expect(store.current().sessions[0]?.fold.total.calls).toBe(2)

    // 节流窗口过后，常规聚合恢复落盘。
    logs['a'] = [...logs['a']!, message(4, 3_000, USAGE)]
    await writeFile(paths['a']!, 'changed-again')
    vi.advanceTimersByTime(LEDGER_SAVE_INTERVAL_MS + AGGREGATE_TTL_MS + 1000)
    await aggregator.aggregate()
    expect(store.saved).toHaveLength(3)
  })
})

describe('sessionUsageOf (byTurn cap bypass)', () => {
  /** 单轮事件对：turn/start + assistant/message（带 usage），seq 递增。 */
  function turnPair(seq: number, turnNum: number, time: number): SessionEvent[] {
    return [
      { type: 'turn/start', seq, time, data: { turn: turnNum } } as unknown as SessionEvent,
      {
        type: 'assistant/message', seq: seq + 1, time,
        data: { turn: turnNum, step: 1, message: { role: 'assistant', content: [] }, usage: USAGE },
      } as unknown as SessionEvent,
    ]
  }

  it('returns the full session total even when its turns fell out of the capped byTurn', async () => {
    const T0 = Date.UTC(2026, 7, 15, 4, 0, 0)
    // 会话 a：5 轮（时间最早）；会话 b：205 轮（更晚）——byTurn 封顶 200 行后
    // a 的轮次被全部挤出，从 doc 反推该会话会得到 0（usage_stats 低估场景）。
    const a: SessionEvent[] = [header(1, 'deepseek-v4-flash')]
    for (let i = 0; i < 5; i++) a.push(...turnPair(2 + i * 2, i + 1, T0 + i * 10))
    const b: SessionEvent[] = [header(1, 'deepseek-v4-flash')]
    for (let i = 0; i < 205; i++) b.push(...turnPair(2 + i * 2, i + 1, T0 + 100_000 + i * 10))
    const aggregator = createUsageAggregator(fakePersistence({ a, b }))

    const doc = await aggregator.aggregate()
    // 前置：a 的轮次确实已被封顶挤出（旧路径在此低估为 0）。
    expect(doc.byTurn.every(row => row.sessionId === 'b')).toBe(true)

    // 修复后：sessionUsageOf 直读该会话的折叠，返回完整累计（input 口径含缓存桶）。
    const summary = await aggregator.sessionUsageOf('a')
    expect(summary).toEqual({
      calls: 5,
      cost: expect.any(Number),
      input: 5 * (USAGE.inputTokens + USAGE.cacheReadTokens + USAGE.cacheWriteTokens),
      output: 5 * USAGE.outputTokens,
    })
    expect(summary?.cost ?? 0).toBeGreaterThan(0)
  })

  it('answers undefined for a session absent from logs and ledger', async () => {
    const aggregator = createUsageAggregator(fakePersistence({ a: [header(1, 'deepseek-v4-flash'), message(2, 1_000, USAGE)] }))
    await aggregator.aggregate()
    await expect(aggregator.sessionUsageOf('no-such-session')).resolves.toBeUndefined()
  })
})

describe('performance aggregation (TTFT / tps / latency)', () => {
  /** Fold-session event row helper (durable-shape cast like the aggregator). */
  const ev = (type: string, seq: number, time: number, data: Record<string, unknown>): SessionEvent =>
    ({ type, seq, time, data }) as unknown as SessionEvent

  it('folds a measured step into a perf sample from request/header → content', () => {
    const fold = foldSession([
      ev('step/start', 1, 500, { turn: 1, step: 1 }),
      ev('request/header', 2, 600, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
      ev('assistant/chunk', 3, 800, { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'h' } }),
      ev('assistant/chunk', 4, 900, { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'i' } }),
      ev('assistant/message', 5, 1_000, { turn: 1, step: 1, usage: { inputTokens: 10, outputTokens: 100 } }),
    ], new Set())
    expect(fold.perf).toHaveLength(1)
    // TTFT = 800-600；gen = 900-800；
    // tokens/s = 100 ÷ (100ms/1000)；总延迟 = 1000-600。
    expect(fold.perf[0]).toMatchObject({
      model: 'flash', ttftMs: 200, tps: 1_000, latencyMs: 400, estimated: false,
    })
  })

  it('marks tool-continuation steps as estimated when no request/header exists', () => {
    const fold = foldSession([
      ev('step/start', 1, 500, { turn: 1, step: 1 }),
      ev('assistant/chunk', 2, 800, { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'h' } }),
      ev('assistant/message', 3, 1_000, { turn: 1, step: 1, usage: { inputTokens: 10, outputTokens: 0 } }),
    ], new Set())
    const sample = fold.perf[0]
    expect(sample).toBeDefined()
    // TTFT 以 step/start 为起点估算；无输出 → 无 tps。
    expect(sample).toMatchObject({ ttftMs: 300, estimated: true })
    expect(sample?.tps).toBeUndefined()
  })

  it('ignores usage-only chunks as content when measuring TTFT', () => {
    const fold = foldSession([
      ev('step/start', 1, 500, { turn: 1, step: 1 }),
      ev('request/header', 2, 600, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
      ev('assistant/chunk', 3, 650, { turn: 1, step: 1, chunk: { type: 'usage', usage: { inputTokens: 10, outputTokens: 0 } } }),
      ev('assistant/chunk', 4, 700, { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'h' } }),
      ev('assistant/message', 5, 800, { turn: 1, step: 1, usage: { inputTokens: 10, outputTokens: 0 } }),
    ], new Set())
    // usage chunk（650）不算内容；TTFT 以首个 text-delta（700）为准。
    expect(fold.perf[0]).toMatchObject({ ttftMs: 100 })
    expect(fold.perf[0]?.tps).toBeUndefined()
  })

  it('reports ttftMax and spike count in the per-model perf stats', async () => {
    // 两次调用：TTFT 100ms 与 11s（一次尖峰 > 10s 阈值）。
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        ev('step/start', 1, 500, { turn: 1, step: 1 }),
        ev('request/header', 2, 600, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
        ev('assistant/chunk', 3, 11_600, { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'h' } }),
        ev('assistant/message', 4, 11_700, { turn: 1, step: 1, usage: { inputTokens: 10, outputTokens: 1 } }),
        ev('step/start', 5, 11_800, { turn: 1, step: 2 }),
        ev('request/header', 6, 11_850, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
        ev('assistant/chunk', 7, 11_950, { turn: 1, step: 2, chunk: { type: 'text-delta', index: 0, text: 'h' } }),
        ev('assistant/message', 8, 12_000, { turn: 1, step: 2, usage: { inputTokens: 10, outputTokens: 1 } }),
      ],
    }))
    const flash = stats.perf?.byModel.flash
    expect(flash?.samples).toBe(2)
    expect(flash?.ttftMax).toBe(11_000)
    expect(flash?.ttftSpikes).toBe(1)
  })

  it('omits the perf field when no step produced a measurable sample', async () => {
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [header(1, 'deepseek-v4-flash'), message(2, Date.UTC(2026, 7, 15, 4, 0, 0), USAGE)],
    }))
    expect(stats.perf).toBeUndefined()
  })

  it('rolls perf samples by model and hour, with percentile latency stats', async () => {
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        ev('step/start', 1, 0, { turn: 1, step: 1 }),
        ev('request/header', 2, 100, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
        ev('assistant/chunk', 3, 200, { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'a' } }),
        ev('assistant/chunk', 4, 300, { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'b' } }),
        ev('assistant/message', 5, 1_000, { turn: 1, step: 1, usage: { inputTokens: 10, outputTokens: 50 } }),
      ] as unknown as SessionEvent[],
      'session-b': [
        ev('step/start', 1, 0, { turn: 1, step: 1 }),
        ev('request/header', 2, 100, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
        ev('assistant/chunk', 3, 400, { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'a' } }),
        ev('assistant/chunk', 4, 600, { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'b' } }),
        ev('assistant/message', 5, 1_000, { turn: 1, step: 1, usage: { inputTokens: 10, outputTokens: 50 } }),
      ] as unknown as SessionEvent[],
    }))
    const flash = stats.perf?.byModel.flash
    expect(flash?.samples).toBe(2)
    // TTFT：(200-100) + (400-100) = 100+300 → 均值 200。
    expect(flash?.ttftAvg).toBe(200)
    expect(flash?.ttftP50).toBe(200)
    // P90 线性插值 [100, 300] → 100 + 200×0.9。
    expect(flash?.ttftP90).toBeCloseTo(280, 6)
    // tokens/s：(50÷0.1) + (50÷0.2) → (500+250)/2。
    expect(flash?.tpsAvg).toBe(375)
    // 总延迟：两次都是 1000-100=900。
    expect(flash?.latencyAvg).toBe(900)
    expect(flash?.estimatedSamples).toBe(0)
    // 两个样本同属一个本地小时 → 小时×模型桶只有一个小时键。
    const hourKeys = Object.keys(stats.perf?.byHourModel ?? {})
    expect(hourKeys).toHaveLength(1)
    // 该小时内 flash 桶：样本 2、TTFT 均值 200、速度均值 375（与按模型口径一致）。
    expect(stats.perf?.byHourModel[hourKeys[0]!]?.flash).toMatchObject({
      samples: 2, ttftAvg: 200, tpsAvg: 375,
    })
  })

  it('splits hour perf cells by model so curves can compare models', async () => {
    // 同一小时两个模型：flash 有输出（有 tps），glm 零输出（无 tps）。
    const stats = await aggregateUsage(fakePersistence({
      'session-a': [
        ev('step/start', 1, 0, { turn: 1, step: 1 }),
        ev('request/header', 2, 100, { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } } }),
        ev('assistant/chunk', 3, 200, { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'a' } }),
        ev('assistant/chunk', 4, 300, { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'b' } }),
        ev('assistant/message', 5, 1_000, { turn: 1, step: 1, usage: { inputTokens: 10, outputTokens: 50 } }),
      ] as unknown as SessionEvent[],
      'session-b': [
        ev('step/start', 1, 0, { turn: 1, step: 1 }),
        ev('request/header', 2, 300, { header: { config: { provider: 'zai-coding-cn', model: 'glm-5.3-flash' } } }),
        ev('assistant/chunk', 3, 400, { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'a' } }),
        ev('assistant/message', 4, 1_000, { turn: 1, step: 1, usage: { inputTokens: 10, outputTokens: 0 } }),
      ] as unknown as SessionEvent[],
    }))
    const hourKeys = Object.keys(stats.perf?.byHourModel ?? {})
    expect(hourKeys).toHaveLength(1)
    const hourCell = stats.perf?.byHourModel[hourKeys[0]!] ?? {}
    // 同一小时按模型分桶互不混淆：样本各归各键，不跨模型混合。
    expect(hourCell.flash).toMatchObject({ samples: 1, ttftAvg: 100 })
    expect(hourCell.flash?.tpsAvg).toBe(500)
    expect(hourCell['glm-5.3-flash']).toMatchObject({ samples: 1, ttftAvg: 100 })
    // 零输出 → 无生成速度（曲线在该模型的速度视图断开）。
    expect(hourCell['glm-5.3-flash']?.tpsAvg).toBeUndefined()
  })
})

describe('runLedgerMigrations', () => {
  /** 已含 `appliedMigrations: []` 的最简账本文档。 */
  const doc = (): UsageLedgerDocument => ({
    version: 1, updatedAt: 1, sessions: [], appliedMigrations: [],
  })

  it('applies an un-run migration and records its id', () => {
    const migrations: LedgerMigration[] = [{
      id: 'v2-rename-field',
      apply: (document) => { document.updatedAt = 2; return true },
    }]
    const document = doc()
    const changed = runLedgerMigrations(document, migrations)
    expect(changed).toBe(true)
    expect(document.updatedAt).toBe(2)
    expect(document.appliedMigrations).toEqual(['v2-rename-field'])
  })

  it('skips an already-applied migration (幂等)', () => {
    const id = 'v2-apply-once'
    let applied = 0
    const migrations: LedgerMigration[] = [{
      id,
      apply: (document) => { applied += 1; document.updatedAt = 2; return true },
    }]
    const document = doc()
    document.appliedMigrations = [id]
    const changed = runLedgerMigrations(document, migrations)
    expect(changed).toBe(false)
    expect(applied).toBe(0)
    expect(document.updatedAt).toBe(1)
  })

  it('keeps foreign applied ids and returns false when nothing to migrate', () => {
    const document = doc()
    document.appliedMigrations = ['v1-legacy']
    const changed = runLedgerMigrations(document, [])
    expect(changed).toBe(false)
    expect(document.appliedMigrations).toEqual(['v1-legacy'])
  })
})

describe('LEDGER_MIGRATIONS (fold-version-backfill)', () => {
  /** 已含 `appliedMigrations: []` 的最简账本文档。 */
  const doc = (sessions: UsageLedgerSession[]): UsageLedgerDocument => ({
    version: 1, updatedAt: 1, sessions, appliedMigrations: [],
  })

  it('backfills foldVersion = 1 on legacy rows without touching current rows', () => {
    // foldVersion 缺失 = 1.0.6 及更早的 header 归账行；FOLD_VERSION 行是当前算法，不动。
    const document = doc([
      { id: 'legacy-row', fold: legacyFold() },
      { id: 'current-row', foldVersion: FOLD_VERSION, fold: legacyFold() },
    ])
    const changed = runLedgerMigrations(document)
    expect(changed).toBe(true)
    expect(document.sessions[0]?.foldVersion).toBe(1)
    expect(document.sessions[1]?.foldVersion).toBe(FOLD_VERSION)
    expect(document.appliedMigrations).toContain('fold-version-backfill')
  })

  it('skips backfill once the migration id is recorded (幂等)', () => {
    const row: UsageLedgerSession = { id: 'already-1', foldVersion: 1, fold: legacyFold() }
    const document = doc([row])
    // 全部注册迁移均已应用：无行级变更、无新迁移 id 需记录，整体幂等。
    document.appliedMigrations = ['fold-version-backfill', 'perf-sample-to-digest']
    const changed = runLedgerMigrations(document)
    expect(changed).toBe(false)
    expect(document.sessions[0]?.foldVersion).toBe(1)
  })
})

describe('LEDGER_MIGRATIONS (perf-sample-to-digest)', () => {
  /** 已含 `appliedMigrations: []` 的最简账本文档。 */
  const doc = (sessions: UsageLedgerSession[]): UsageLedgerDocument => ({
    version: 1, updatedAt: 1, sessions, appliedMigrations: [],
  })

  /** v15 及更早的逐样本 `perf` 数组（旧账本行形态）。 */
  const oldSamples = [
    { model: 'flash', hour: '2026-08-15T12', ttftMs: 100, tps: 500, latencyMs: 900, estimated: false },
    { model: 'flash', hour: '2026-08-15T12', ttftMs: 300, estimated: true },
  ]

  it('converts legacy perf sample arrays into model and hour digests', () => {
    const fold = { ...legacyFold(), perf: oldSamples } as unknown as UsageLedgerSession['fold']
    const document = doc([{ id: 'old-row', foldVersion: 15, fold }])
    const changed = runLedgerMigrations(document)
    expect(changed).toBe(true)
    const migrated = document.sessions[0]?.fold
    // 逐样本数组被移除，摘要字段就位；P50/P90 为样本侧精确插值。
    expect((migrated as { perf?: unknown }).perf).toBeUndefined()
    expect(migrated.perfDigest.flash).toEqual({
      samples: 2, ttftSum: 400, ttftMax: 300, ttftSpikes: 0,
      ttftP50: 200, ttftP90: 280, tpsCount: 1, tpsSum: 500,
      latencyCount: 1, latencySum: 900, estimated: 1,
    })
    expect(migrated.perfHourDigest['2026-08-15T12']?.flash).toEqual({
      samples: 2, ttftSum: 400, tpsCount: 1, tpsSum: 500,
    })
    expect(document.appliedMigrations).toContain('perf-sample-to-digest')
  })

  it('skips conversion once the migration id is recorded (幂等)', () => {
    const fold = { ...legacyFold(), perf: oldSamples } as unknown as UsageLedgerSession['fold']
    const document = doc([{ id: 'old-row', foldVersion: 15, fold }])
    document.appliedMigrations = ['fold-version-backfill', 'perf-sample-to-digest']
    const changed = runLedgerMigrations(document)
    expect(changed).toBe(false)
    expect((document.sessions[0]?.fold as { perf?: unknown }).perf).toHaveLength(2)
  })

  it('fills empty digest fields on rows carrying neither form', () => {
    // 无 perf 也无摘要的异常行：补空摘要，保持 deserialize 边界的完备性。
    const fold = legacyFold() as unknown as UsageLedgerSession['fold'] & { perfDigest?: unknown }
    delete (fold as { perfDigest?: unknown }).perfDigest
    const document = doc([{ id: 'bare-row', foldVersion: 16, fold }])
    const changed = runLedgerMigrations(document)
    expect(changed).toBe(true)
    expect(document.sessions[0]?.fold.perfDigest).toEqual({})
    expect(document.sessions[0]?.fold.perfHourDigest).toEqual({})
  })
})

describe('perf digest aggregation from restored ledger rows', () => {
  it('merges digest-only rows into doc perf stats without reading logs', async () => {
    // 账本恢复行（日志已删）：性能以摘要参与聚合，均值/计数精确。
    const fold = {
      ...legacyFold(),
      perfDigest: {
        flash: {
          samples: 2, ttftSum: 400, ttftMax: 300, ttftSpikes: 0,
          ttftP50: 200, ttftP90: 280, tpsCount: 1, tpsSum: 500,
          latencyCount: 1, latencySum: 900, estimated: 1,
        },
      },
      perfHourDigest: { '2026-08-15T12': { flash: { samples: 2, ttftSum: 400, tpsCount: 1, tpsSum: 500 } } },
    }
    const { store } = fakeLedgerStore([{ id: 'gone-session', stamp: 's1', foldVersion: FOLD_VERSION, fold }])
    const stats = await aggregateUsage(fakePersistence({}), { ledger: store })
    expect(stats.perf?.byModel.flash).toMatchObject({
      samples: 2, ttftAvg: 200, ttftMax: 300, tpsAvg: 500, latencyAvg: 900, estimatedSamples: 1,
    })
    expect(stats.perf?.byHourModel['2026-08-15T12']?.flash).toMatchObject({
      samples: 2, ttftAvg: 200, tpsAvg: 500,
    })
  })
})

describe('ledger foldVersion / stale confidence', () => {
  it('marks ledger-only legacy rows as stale and counts them for the UI notice', async () => {
    // 兜底场景：会话列表为空（日志已删），只剩账本里一条 foldVersion 缺失的旧行。
    const { store, saved, current } = fakeLedgerStore([{ id: 'old-session', fold: legacyFold() }])
    const stats = await aggregateUsage(fakePersistence({}), { ledger: store })

    expect(stats.total.calls).toBe(2)
    expect(stats.staleLedgerSessions).toBe(1)
    const row = stats.bySession.find(entry => entry.id === 'old-session')
    expect(row?.stale).toBe(true)

    // 加载边界执行了回填迁移，且修改触发了重新落盘。
    expect(saved.length).toBeGreaterThan(0)
    expect(current().appliedMigrations).toContain('fold-version-backfill')
    expect(current().sessions[0]?.foldVersion).toBe(1)
  })

  it('treats current-version rows as trusted (no stale marker, no notice count)', async () => {
    const { store, saved, current } = fakeLedgerStore([{
      id: 'fresh-session',
      foldVersion: FOLD_VERSION,
      fingerprint: configFingerprint(new Set(DEFAULT_SUBSCRIPTION_PROVIDERS), undefined, {}, DEFAULT_SEARCH_CALL_ESTIMATE_CNY, {}, new Set()),
      fold: legacyFold(),
    }])
    const stats = await aggregateUsage(fakePersistence({}), { ledger: store })

    expect(stats.total.calls).toBe(2)
    expect(stats.bySession[0]?.stale).toBeUndefined()
    // exactOptionalPropertyTypes：无旧行时不带 key，UI 判空逻辑不必区分 0 与缺省。
    expect(Object.hasOwn(stats, 'staleLedgerSessions')).toBe(false)
    // 无可回填行也会因首次记录迁移 id 落盘一次（此后幂等跳过）。
    expect(saved).toHaveLength(1)
    expect(current().appliedMigrations).toContain('fold-version-backfill')
    expect(current().sessions[0]?.foldVersion).toBe(FOLD_VERSION)
  })
})

describe('unreadable sessions visibility', () => {
  it('counts migration-refused sessions into unreadableSessions for the UI notice', async () => {
    // 拒读场景：readFrom 抛出（如上游读时迁移拒绝旧世代 descriptor，插件 issue #71）——
    // 会话被跳过，但计数进入文档供面板明示「未统计」，而不是让今日费用静默为空。
    const failing = {
      list: async () => [{ id: 'broken-session' }],
      readFrom: async () => { throw new Error('SessionFormatUnsupportedError: unsupported descriptor version 2') },
    } as unknown as UsagePersistence
    const stats = await aggregateUsage(failing)

    expect(stats.unreadableSessions).toBe(1)
    // 格式拒读子集单独计数：message 保留宿主错误类名即可识别（issue #84）。
    expect(stats.unreadableFormatSessions).toBe(1)
    expect(stats.bySession).toHaveLength(0)
  })

  it('classifies by error.name too (host class instances, issue #84)', async () => {
    // 宿主真实路径：SessionFormatUnsupportedError 实例的类名落在 error.name。
    const failing = {
      list: async () => [{ id: 'v0-session' }],
      readFrom: async () => {
        const error = new Error('…refuses this format v0 Session: permission/preset 0 data has unexpected member "origin"')
        error.name = 'SessionFormatUnsupportedError'
        throw error
      },
    } as unknown as UsagePersistence
    const stats = await aggregateUsage(failing)

    expect(stats.unreadableSessions).toBe(1)
    expect(stats.unreadableFormatSessions).toBe(1)
  })

  it('does not classify non-format failures as format refusals', async () => {
    // 损坏/其他读取失败：进未统计总数，但不进格式拒读子集（归因不混淆）。
    const failing = {
      list: async () => [{ id: 'torn-session' }],
      readFrom: async () => { throw new Error('zstd torn frame') },
    } as unknown as UsagePersistence
    const stats = await aggregateUsage(failing)

    expect(stats.unreadableSessions).toBe(1)
    expect(Object.hasOwn(stats, 'unreadableFormatSessions')).toBe(false)
  })

  it('keeps counting negative-cached sessions on later rounds (issue #84)', async () => {
    // 负缓存命中轮次不重读失败会话（skipped 为空、stderr 不再打印），但未统计
    // 计数仍保留——否则面板的「未统计」通知在首轮之后归零消失（issue 报告现象）。
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      let reads = 0
      const persistence = {
        list: async () => [{ id: 'v0-session' }],
        stampOf: async () => 'stamp-1',
        readFrom: async () => {
          reads += 1
          throw new Error('SessionFormatUnsupportedError: unsupported descriptor version 2')
        },
      } as unknown as UsagePersistence
      const aggregator = createUsageAggregator(persistence)

      const first = await aggregator.aggregate()
      expect(first.unreadableSessions).toBe(1)
      // 首轮两条告警：单会话 skip + 末尾汇总（含 skipped id 明细）。
      expect(warn).toHaveBeenCalledTimes(2)

      const second = await aggregator.aggregate()
      expect(second.unreadableSessions).toBe(1)
      expect(second.unreadableFormatSessions).toBe(1)
      // 负缓存生效的核心不变量：两轮聚合 readFrom 只被调用一次（不重读不重打日志）。
      expect(reads).toBe(1)
      expect(warn).toHaveBeenCalledTimes(2)
    } finally {
      warn.mockRestore()
    }
  })

  it('splits unreadable sessions by archived-history availability (issue #84 copy precision)', async () => {
    // 有账本行的拒读会话：历史按存档计入（total.calls 来自存档行），只缺新增
    // 部分——不算「完全未计入」；无账本行的拒读会话才是真正全部缺失，单独
    // 计数进 unreadableNoLedgerSessions，面板据此区分「部分缺失/完全缺失」。
    const { store } = fakeLedgerStore([{ id: 'archived-broken', stamp: 's1', foldVersion: FOLD_VERSION, fold: legacyFold() }])
    const failing = {
      list: async () => [{ id: 'archived-broken' }, { id: 'never-folded-broken' }],
      readFrom: async () => { throw new Error('SessionFormatUnsupportedError: refuses this format v0 Session') },
    } as unknown as UsagePersistence
    const stats = await aggregateUsage(failing, { ledger: store })

    expect(stats.unreadableSessions).toBe(2)
    expect(stats.unreadableNoLedgerSessions).toBe(1)
    // 存档行的历史仍合并进统计（legacyFold 的 total.calls = 2）。
    expect(stats.total.calls).toBe(2)
  })

  it('omits unreadableSessions when every session folds', async () => {
    const stats = await aggregateUsage(fakePersistence({ s1: [message(0, 1, USAGE)] }))

    // exactOptionalPropertyTypes：无拒读时不带 key，UI 判空逻辑不必区分 0 与缺省。
    expect(Object.hasOwn(stats, 'unreadableSessions')).toBe(false)
  })
})

describe('lazy reprice after live catalog arrives (fold-version preserved)', () => {
  /** 真实日志形态：step-6-preview 在预热折叠时刻未收录（cost=0、落 unpricedModels）。 */
  function step5Events(): SessionEvent[] {
    return [header(1, 'step-6-preview'), message(2, Date.UTC(2026, 9, 12, 4, 0, 0), USAGE)]
  }

  afterEach(() => {
    vi.useRealTimers()
    applyLivePricing({ source: 'builtin' })
  })

  it('refolds a cached fold whose unpriced model becomes priced', async () => {
    vi.useFakeTimers()
    try {
      const logs: Record<string, SessionEvent[]> = { a: step5Events() }
      const reads: number[] = []
      const persistence = {
        list: async () => [{ id: 'a' }],
        readFrom: async (id: SessionId, fromSeq: number) => {
          reads.push(fromSeq)
          return { meta: { id }, events: (logs.a ?? []).filter(e => e.seq >= fromSeq) }
        },
      } as unknown as UsagePersistence
      const aggregator = createUsageAggregator(persistence)

      // 折叠时刻价目表不含 step-6-preview：cost=0、落 unpricedModels。
      const before = await aggregator.aggregate()
      expect(before.byModel['step-6-preview']?.cost ?? 0).toBe(0)
      expect(before.unpricedModels).toContain('step-6-preview')

      // 价目表注入（models.dev extraModels）后重折：step-6-preview 折出 cost，
      // total.cost 与 byModel 之和一致（无双口径）。
      applyLivePricing({
        source: 'live',
        rate: 7,
        extraModels: [{ key: 'step-6-preview', name: 'Step 5 Preview', provider: 'Step', price: { input: 2, cacheHit: 0.2, output: 8 } }],
      })
      vi.advanceTimersByTime(AGGREGATE_TTL_MS + 1000)
      const after = await aggregator.aggregate()
      const cellAfter = after.byModel['step-6-preview']
      expect(cellAfter?.cost ?? 0).toBeGreaterThan(0)
      expect(after.unpricedModels ?? []).not.toContain('step-6-preview')
      const byModelSum = Object.values(after.byModel).reduce((sum, row) => sum + row.cost, 0)
      expect(after.total.cost).toBeCloseTo(byModelSum, 6)
      // 关键：旧折叠（cache 命中，同 stamp 零读取）没有吞掉重折——
      // 日志被重新读取（全量 from=0），cost 由此折出。
      expect(reads).toContain(0)
      expect(reads.length).toBeGreaterThanOrEqual(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('invalidates the incremental cursor when the cached fold has since-priced unpriced models', async () => {
    vi.useFakeTimers()
    try {
      const logs: Record<string, SessionEvent[]> = { a: step5Events() }
      const reads: string[] = []
      const persistence = {
        list: async () => [{ id: 'a' }],
        readFrom: async (id: SessionId, fromSeq: number) => {
          reads.push(`from=${String(fromSeq)}`)
          return { meta: { id }, events: (logs.a ?? []).filter(e => e.seq >= fromSeq) }
        },
      } as unknown as UsagePersistence
      const aggregator = createUsageAggregator(persistence)
      await aggregator.aggregate()
      expect(reads).toEqual(['from=0'])

      // 追加事件 + 价目表就绪：惰性失效须丢弃增量游标退回全量重折，
      // 旧段按新价目表计价（增量追加永远补不出旧段的 cost）。
      logs.a = [...step5Events(), { type: 'assistant/message', seq: 3, time: Date.UTC(2026, 9, 12, 5, 0, 0), data: { turn: 1, step: 2, message: { role: 'assistant', content: [] }, usage: USAGE } } as unknown as SessionEvent]
      applyLivePricing({
        source: 'live',
        rate: 7,
        extraModels: [{ key: 'step-6-preview', name: 'Step 5 Preview', provider: 'Step', price: { input: 2, cacheHit: 0.2, output: 8 } }],
      })
      vi.advanceTimersByTime(AGGREGATE_TTL_MS + 1000)
      const after = await aggregator.aggregate()
      // 第二次读取是全量（from=0），而非增量 from=2。
      expect(reads).toEqual(['from=0', 'from=0'])
      expect(after.total.cost).toBeGreaterThan(0)
      expect(after.byModel['step-6-preview']?.calls).toBe(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('refolds a cache hit whose unpriced model becomes priced on a stamped backend (PR #90 P1)', async () => {
    // 生产形态的宿主（有 locate → 稳定 stamp）下，预热折叠会同时写入 cache 行与
    // 账本行。价目表就绪后的下一轮：账本门触发落穿，但若 cache 命中路径没有同一
    // 道门，就会零读取复用旧折叠 —— 空闲会话 stamp 永不变，整个进程生命周期
    // cost=0，只有重启才自愈。本用例守住 cache 命中路径的惰性失效门。
    vi.useFakeTimers()
    let dir: string | undefined
    try {
      const logs: Record<string, SessionEvent[]> = { a: step5Events() }
      dir = await mkdtemp(join(tmpdir(), 'dsh-billing-reprice-cachehit-'))
      const path = join(dir, 'a.jsonl')
      await writeFile(path, 'seed')
      let reads = 0
      // 无账本（纯 cache 路径）+ 真实文件 locate → stamp 稳定（同 test 3 的形态）。
      const persistence = {
        list: async () => [{ id: 'a' }],
        locate: (meta: { id: SessionId }) => ({ kind: 'jsonl', path }),
        readFrom: async (id: SessionId, fromSeq: number) => {
          reads += 1
          return { meta: { id }, events: (logs.a ?? []).filter(e => e.seq >= fromSeq) }
        },
      } as unknown as UsagePersistence
      const aggregator = createUsageAggregator(persistence)

      // 第一轮：价目表未就绪 → cost=0、落 unpricedModels，写入 cache。
      const before = await aggregator.aggregate()
      expect(reads).toBe(1)
      expect(before.byModel['step-6-preview']?.cost ?? 0).toBe(0)
      expect(before.unpricedModels).toContain('step-6-preview')

      // 价目表就绪后的下一轮：cache 命中路径必须让路（stamp 未变）。
      applyLivePricing({
        source: 'live',
        rate: 7,
        extraModels: [{ key: 'step-6-preview', name: 'Step 5 Preview', provider: 'Step', price: { input: 2, cacheHit: 0.2, output: 8 } }],
      })
      vi.advanceTimersByTime(AGGREGATE_TTL_MS + 1000)
      const after = await aggregator.aggregate()
      // 关键断言：日志被重新全量读取（不是 cache 零读取吞掉），cost 折出。
      expect(reads).toBe(2)
      expect(after.byModel['step-6-preview']?.cost ?? 0).toBeGreaterThan(0)
      expect(after.unpricedModels ?? []).not.toContain('step-6-preview')
    } finally {
      vi.useRealTimers()
      if (dir !== undefined) await rm(dir, { recursive: true, force: true })
    }
  })

  it('reuses a ledger row whose unpriced models stay unpriced, refolds when priced', async () => {
    vi.useFakeTimers()
    let dir: string | undefined
    try {
      const logs: Record<string, SessionEvent[]> = { a: step5Events() }
      dir = await mkdtemp(join(tmpdir(), 'dsh-billing-reprice-'))
      const path = join(dir, 'a.jsonl')
      await writeFile(path, 'seed')
      const info = await stat(path)
      let reads = 0
      const persistence = {
        list: async () => [{ id: 'a' }],
        locate: (meta: { id: SessionId }) => ({ kind: 'jsonl', path }),
        readFrom: async (id: SessionId, fromSeq: number) => {
          reads += 1
          return { meta: { id }, events: (logs.a ?? []).filter(e => e.seq >= fromSeq) }
        },
      } as unknown as UsagePersistence
      const fold = legacyFold()
      fold.unpricedModels = ['step-6-preview']
      const store = fakeLedgerStore([{
        id: 'a',
        stamp: `${String(info.mtimeMs)}:${String(info.size)}`,
        foldVersion: FOLD_VERSION,
        fingerprint: configFingerprint(new Set(DEFAULT_SUBSCRIPTION_PROVIDERS), undefined, {}, DEFAULT_SEARCH_CALL_ESTIMATE_CNY, {}, new Set()),
        fold,
      }])
      const aggregator = createUsageAggregator(persistence, { ledger: store.store })

      // 负向对照：模型仍未收录 → 账本行零读取复用（惰性失效不误伤未受影响行）。
      const before = await aggregator.aggregate()
      expect(reads).toBe(0)
      expect(before.unpricedModels).toContain('step-6-preview')

      // 价目表注入后：账本行失效重折，cost>0、unpriced 标记清除、账本行重写。
      applyLivePricing({
        source: 'live',
        rate: 7,
        extraModels: [{ key: 'step-6-preview', name: 'Step 5 Preview', provider: 'Step', price: { input: 2, cacheHit: 0.2, output: 8 } }],
      })
      vi.advanceTimersByTime(AGGREGATE_TTL_MS + 1000)
      const after = await aggregator.aggregate()
      expect(reads).toBe(1)
      expect(after.byModel['step-6-preview']?.cost ?? 0).toBeGreaterThan(0)
      expect(after.unpricedModels ?? []).not.toContain('step-6-preview')
      expect(after.staleLedgerSessions ?? 0).toBe(0)
      // 重折后的账本行须落盘：unpricedModels 已按新价目表清空（recordLedger 的
      // changed 判定须识别惰性失效行，否则元数据全同会挡掉重写）。
      await aggregator.flush()
      expect(store.current().sessions[0]?.fold.unpricedModels).toEqual([])
    } finally {
      vi.useRealTimers()
      if (dir !== undefined) await rm(dir, { recursive: true, force: true })
    }
  })
})

describe('registered adapter providers home to direct (issue #91)', () => {
  /** 插件注册通道的最小日志：request/header 带 provider + model，message 报 usage。 */
  function adapterLog(seq: number, provider: string, model: string): SessionEvent[] {
    return [
      header(seq, model, provider),
      message(seq + 1, 1_000, USAGE),
    ]
  }

  it('homes a host-registered adapter channel to direct:commandcode and prices it', async () => {
    // llm-pi-ai 之外的插件路由（ctx.llm.registerAdapter）经 resolveRegisteredProviders
    // 归位 direct:<provider>，按模型官方目录价计费——不再落 unknown 记 0。
    const persistence = fakePersistence({
      cc: adapterLog(0, 'commandcode', 'deepseek/deepseek-v4.1-flash'),
    })
    const stats = await aggregateUsage(persistence, {
      resolveRegisteredProviders: () => new Set(['commandcode']),
    })

    const site = stats.bySite?.['direct:commandcode']
    expect(site?.calls).toBe(1)
    expect(site?.cost ?? 0).toBeGreaterThan(0)
    // 不落 unknown（issue #82 的记 0 口径只留给宿主也不认识的通道）。
    expect(stats.bySite?.unknown?.calls ?? 0).toBe(0)
    // 厂商前缀 id 归一到 flash 键（v1.4.30 别名），费用 = flash 目录价。
    expect(stats.byModel['flash']?.cost ?? 0).toBeGreaterThan(0)
    expect(stats.byModel['deepseek/deepseek-v4.1-flash']).toBeUndefined()
  })

  it('keeps channels unknown to the host in the unknown bucket at zero cost', async () => {
    // 未注册（宿主也不认识）的通道维持 issue #82 口径：token 照记、费用为 0。
    const persistence = fakePersistence({
      ghost: adapterLog(0, 'ghost-provider', 'deepseek/deepseek-v4.1-flash'),
    })
    const stats = await aggregateUsage(persistence, {
      resolveRegisteredProviders: () => new Set(['commandcode']),
    })

    expect(stats.bySite?.unknown?.calls).toBe(1)
    expect(stats.bySite?.unknown?.cost ?? 0).toBe(0)
    expect(stats.bySite?.['direct:commandcode']).toBeUndefined()
  })

  it('refolds rows when the registered set changes (per-round fingerprint)', async () => {
    // provider 插件装卸（llm/adapters-updated）后的第一轮聚合按新通道口径重折。
    // fake timers 跳过聚合 TTL：否则第二轮直接命中上轮 doc，测不到重折。
    vi.useFakeTimers()
    try {
      let registered = new Set(['commandcode'])
      const persistence = fakePersistence({
        cc: adapterLog(0, 'commandcode', 'deepseek/deepseek-v4.1-flash'),
      })
      const aggregator = createUsageAggregator(persistence, {
        resolveRegisteredProviders: () => registered,
      })

      const before = await aggregator.aggregate()
      expect(before.bySite?.['direct:commandcode']?.cost ?? 0).toBeGreaterThan(0)

      registered = new Set()
      vi.advanceTimersByTime(AGGREGATE_TTL_MS + 1000)
      const after = await aggregator.aggregate()
      expect(after.bySite?.unknown?.calls).toBe(1)
      expect(after.bySite?.unknown?.cost ?? 0).toBe(0)
      expect(after.bySite?.['direct:commandcode']).toBeUndefined()
    } finally {
      vi.useRealTimers()
    }
  })

  it('queries the registry at most once per aggregation round', async () => {
    // 性能回归：注册表查询（ctx.get('llm') 服务调用 + 集合合并）在每个分片折叠
    // 调用点执行会放大成风暴；聚合器须按轮次缓存路由视图与注册集合（issue #91）。
    let registryReads = 0
    const persistence = fakePersistence({
      cc: adapterLog(0, 'commandcode', 'deepseek/deepseek-v4.1-flash'),
    })
    const aggregator = createUsageAggregator(persistence, {
      resolveRegisteredProviders: () => {
        registryReads += 1
        return new Set(['commandcode'])
      },
    })

    await aggregator.aggregate()
    expect(registryReads).toBe(1)
  })

  it('refolds rows when user model aliases change (fingerprint includes aliases)', async () => {
    // 别名改动（issue #91 P2）：旧行按旧 key「zz-custom」未收录记 0；指纹含别名后
    // 新聚合器强制重折，用量按新目录键 flash 计价，byModel 不再新旧 key 并存。
    const { store, current } = fakeLedgerStore([])
    const persistence = fakePersistence({
      custom: [header(0, 'zz-custom', 'commandcode'), message(1, 1_000, USAGE)],
    })
    const before = await createUsageAggregator(persistence, { ledger: store }).aggregate()
    expect(before.byModel['zz-custom']?.cost ?? 0).toBe(0)

    applyUserModelAliases({ 'zz-custom': 'flash' })
    try {
      const after = await createUsageAggregator(persistence, {
        ledger: store,
        modelKeyAliases: { 'zz-custom': 'flash' },
        resolveRegisteredProviders: () => new Set(['commandcode']),
      }).aggregate()
      expect(after.byModel['flash']?.cost ?? 0).toBeGreaterThan(0)
      expect(after.byModel['zz-custom']).toBeUndefined()
      // 旧行被重写（foldVersion 22 + 新指纹），不是新旧并存。
      expect(current().sessions[0]?.foldVersion).toBe(FOLD_VERSION)
      expect(Object.keys(current().sessions[0]?.fold.byModel ?? {})).toEqual(['flash'])
    } finally {
      applyUserModelAliases(undefined)
    }
  })
})

describe('hostTimeZone', () => {
  it('reports a non-empty IANA name and a formatted UTC offset', () => {
    const tz = hostTimeZone()
    expect(typeof tz.name).toBe('string')
    expect(tz.name.length).toBeGreaterThan(0)
    expect(tz.offset).toMatch(/^UTC[+-]\d{2}:\d{2}$/)
  })

  it('derives the offset from the given instant (UTC+08:00)', () => {
    const tz = hostTimeZone(new Date('2026-08-24T04:00:00+08:00'))
    expect(tz.offset).toMatch(/^UTC[+-]\d{2}:\d{2}$/)
  })
})

describe('official channel by origin + route aliases (Tencent gateway)', () => {
  const tokenhubRoutes = { tencent: { baseURL: 'https://tokenhub.tencentmaas.com/v1' } }

  it('does not mark gateway-sourced deepseek calls official when the route origin is not DeepSeek', () => {
    // 名为 deepseek-official 且 baseURL 指向腾讯的网关路由（在册）：site 分支按
    // 通道 origin 判定，不因 id 前缀误判为官方渠道。
    const events = [header(1, 'deepseek-v4-flash', 'deepseek-official'), message(2, 2_000, USAGE)]
    const fold = foldSession(events, new Set(), undefined, { 'deepseek-official': { baseURL: 'https://tokenhub.tencentmaas.com/v1' } })
    expect(fold.total.officialCalls).toBe(0)
    expect(fold.total.officialCost).toBe(0)
  })

  it('still marks api.deepseek.com-origin routes as official', () => {
    const routes = { deepseek: { baseURL: 'https://api.deepseek.com/v1' } }
    const events = [header(1, 'deepseek-v4-flash', 'deepseek'), message(2, 2_000, USAGE)]
    const fold = foldSession(events, new Set(), undefined, routes)
    expect(fold.total.officialCalls).toBe(1)
  })

  it('falls back to id-prefix judgement only for direct (configured, no baseURL) routes', () => {
    const events = [header(1, 'deepseek-v4-flash', 'deepseek-official'), message(2, 2_000, USAGE)]
    const fold = foldSession(events, new Set(), undefined, { 'deepseek-official': {} })
    expect(fold.total.officialCalls).toBe(1)
  })

  it('counts the built-in official direct connection as official even without routes', () => {
    // 内置官方直连不经 llm-pi-ai 路由，provider 名不在路由表（unknown）：按名兜底判
    // 官方——按 unknown 一刀切会把官方直连用户的全量调用错杀进三方桶。
    const events = [header(1, 'deepseek-v4-flash', 'deepseek'), message(2, 2_000, USAGE)]
    const fold = foldSession(events, new Set(), undefined, {})
    expect(fold.total.officialCalls).toBe(1)
  })

  it('unknown deepseek-prefixed residuals fall back to names, correctable via routeAliases', () => {
    // 改名/删除配置的残留撞 deepseek 前缀：按名兜底后会计官方——用 routeAliases
    // 显式归位到真实通道后判定随之纠正（残留场景的精确出口）。
    const events = [header(1, 'deepseek-v4-flash', 'deepseek-official'), message(2, 2_000, USAGE)]
    const residual = foldSession(events, new Set(), undefined, {})
    expect(residual.total.officialCalls).toBe(1)
    const corrected = foldSession(events, new Set(), undefined, tokenhubRoutes, 0.02, 0, { 'deepseek-official': 'tencent' })
    expect(corrected.total.officialCalls).toBe(0)
  })

  it('routeAliases relocate renamed routes into their current site bucket', () => {
    const events = [header(1, 'glm-5.3-flash', 'tencent-old'), message(2, 2_000, USAGE)]
    const fold = foldSession(events, new Set(), undefined, tokenhubRoutes, 0.02, 0, { 'tencent-old': 'tencent' })
    expect(fold.bySite.get('site:https://tokenhub.tencentmaas.com')?.calls).toBe(1)
    expect(fold.bySite.get('unknown')).toBeUndefined()
  })

  it('aliases apply to message.source attribution too', () => {
    const renamed = {
      type: 'assistant/message', seq: 2, time: 2_000,
      data: { turn: 1, step: 1, usage: USAGE, message: { role: 'assistant', content: [], source: { kind: 'model', provider: 'tencent-cloud', model: 'deepseek-v4-flash-202605' } } },
    } as unknown as SessionEvent
    const fold = foldSession([renamed], new Set(), undefined, tokenhubRoutes, 0.02, 0, { 'tencent-cloud': 'tencent' })
    // 组织前缀/日期后缀归一 + 别名路由归位：计价按目录 flash 键、站点按 tokenhub。
    expect(fold.byModel.get('flash')?.calls).toBe(1)
    expect(fold.bySite.get('site:https://tokenhub.tencentmaas.com')?.calls).toBe(1)
  })
})

describe('subscription matcher (default set vs explicit RE rule)', () => {
  // 订阅路由本身也要在册（无 baseURL → direct）：unknown 桶是「配置外通道」，
  // 修复 issue #82 后不计价，不能用它承载「空集 → 按量」的断言。
  const tokenhubRoutes = { tencent: { baseURL: 'https://tokenhub.tencentmaas.com/v1' }, 'tencent-token-plan': {} }

  it('exempts tencent-token-plan calls from token pricing by the default set', () => {
    const events = [header(1, 'glm-5.3', 'tencent-token-plan'), message(2, 2_000, USAGE)]
    const fold = foldSession(events, new Set(DEFAULT_SUBSCRIPTION_PROVIDERS), undefined, tokenhubRoutes)
    expect(fold.total.cost).toBe(0)
    expect(fold.planCalls.get('glm-5.3')).toBe(1)
  })

  it('covers suffixed plan route variants when the card id rule is explicitly chosen', () => {
    const events = [header(1, 'glm-5.3', 'tencent-token-plan-vision'), message(2, 2_000, USAGE)]
    const fold = foldSession(events, isSubscriptionProviderId, undefined, tokenhubRoutes)
    expect(fold.total.cost).toBe(0)
  })

  it('keeps explicit sets as overrides (empty set prices everything)', () => {
    const events = [header(1, 'glm-5.3', 'tencent-token-plan'), message(2, 2_000, USAGE)]
    const fold = foldSession(events, new Set(), undefined, tokenhubRoutes)
    expect(fold.total.cost).toBeGreaterThan(0)
  })
})

describe('route baseURL in the config fingerprint (history re-folds on endpoint change)', () => {
  let root: string | undefined
  afterEach(async () => {
    if (root !== undefined) await rm(root, { recursive: true, force: true })
    root = undefined
  })

  it('invalidates ledger rows when a route baseURL changes, and only then', async () => {
    vi.useFakeTimers()
    const logs: Record<string, SessionEvent[]> = { a: [header(1, 'deepseek-v4-flash'), message(2, 2_000, USAGE)] }
    root = await mkdtemp(join(tmpdir(), 'dsh-billing-fp-'))
    const reads: Record<string, number> = { a: 0 }
    const path = join(root, 'a.jsonl')
    await writeFile(path, JSON.stringify(1))
    const persistence = {
      list: async () => [{ id: 'a' }],
      locate: (meta: { id: SessionId }) => ({ kind: 'jsonl', path }),
      readFrom: async (id: SessionId, fromSeq: number) => {
        reads[String(id)] += 1
        return { meta: { id }, events: (logs.a ?? []).filter(event => event.seq >= fromSeq) }
      },
    } as unknown as UsagePersistence
    let baseURL = 'https://relay-a.example'
    const store = fakeLedgerStore([])
    const aggregator = createUsageAggregator(persistence, {
      ledger: store.store,
      resolveRoutes: () => ({ relay: { baseURL } }),
    })
    await aggregator.aggregate()
    expect(reads.a).toBe(1)
    vi.advanceTimersByTime(AGGREGATE_TTL_MS + 1_000)
    await aggregator.aggregate()
    // baseURL 未变：指纹一致，账本行复用（零读取）。
    expect(reads.a).toBe(1)
    // baseURL 变化：站点归组/官方判定口径变化，历史行失效重折。
    baseURL = 'https://relay-b.example'
    vi.advanceTimersByTime(AGGREGATE_TTL_MS + 1_000)
    await aggregator.aggregate()
    expect(reads.a).toBe(2)
    vi.useRealTimers()
  })
})

describe('byTier latency-tier exclusion (FOLD_VERSION 23)', () => {
  // 北京工作日 10:00 = 峰时（2026-10-14 是周三）。
  const PEAK_TIME = Date.UTC(2026, 9, 14, 2, 0, 0)

  it('keeps latency-tier (Gemini) traffic out of the peak/valley buckets', () => {
    const events = [
      header(1, 'deepseek-v4-flash', 'deepseek-official'),
      message(2, PEAK_TIME, USAGE),
      header(3, 'gemini-3.8-flash', 'gemini'),
      message(4, PEAK_TIME, USAGE),
    ]
    const fold = foldSession(events, new Set(DEFAULT_SUBSCRIPTION_PROVIDERS), undefined, {})
    // 峰谷桶只收 DeepSeek 一条：Gemini 延迟档与时刻无关（peakShare 混合计价），
    // 套北京窗口分桶会把无时间窗语义的流量虚计入峰/谷。
    expect(fold.byTier.get('peak')?.calls ?? 0).toBe(1)
    expect(fold.byTier.get('offPeak')?.calls ?? 0).toBe(0)
    // 其余桶不受影响：两条调用都按模型正常归账（deepseek-v4-flash 归一为目录键 flash）。
    expect(fold.byModel.get('flash')?.calls).toBe(1)
    expect(fold.byModel.get('gemini-3.8-flash')?.calls).toBe(1)
  })

  it('still buckets window-billed (DeepSeek) traffic by time of day', () => {
    // 同一模型峰/谷两个时刻：byTier 分桶照常工作（回归保护）。
    // 北京周四 00:00（10-15）落在峰窗外 = 谷时。
    const OFFPEAK_TIME = Date.UTC(2026, 9, 14, 16, 0, 0)
    const events = [
      header(1, 'deepseek-v4-flash', 'deepseek-official'),
      message(2, PEAK_TIME, USAGE),
      message(3, OFFPEAK_TIME, USAGE),
    ]
    const fold = foldSession(events, new Set(DEFAULT_SUBSCRIPTION_PROVIDERS), undefined, {})
    expect(fold.byTier.get('peak')?.calls ?? 0).toBe(1)
    expect(fold.byTier.get('offPeak')?.calls ?? 0).toBe(1)
  })
})

describe('subagent session rollup (子智能体归并)', () => {
  /** 峰时时刻（费用>0 与时段无关，只为断言稳定）。 */
  const T = Date.UTC(2026, 9, 15, 4, 0, 0)

  /** persistence double：list 的 header 可携带宿主 v4 的子智能体归并字段。 */
  function subPersistence(
    logs: Record<string, SessionEvent[]>,
    headers: Record<string, { origin?: 'subagent'; parentSession?: string; delegationDepth?: number }> = {},
  ): UsagePersistence {
    return {
      list: async () => Object.keys(logs).map(id => ({ id, ...(headers[id] ?? {}) })),
      readFrom: async (id: SessionId, fromSeq: number) => ({
        meta: { id },
        inheritedEventCount: 0,
        events: (logs[id] ?? []).filter(event => event.seq >= fromSeq),
      }),
    } as unknown as UsagePersistence
  }

  it('subParentOf 只认 origin/delegationDepth 门，fork 种子血缘不归并', () => {
    const meta = (fields: Record<string, unknown>): SessionHeader =>
      ({ id: 's', createdAt: 0, isSeeded: false, ...fields }) as unknown as SessionHeader
    expect(subParentOf(meta({ origin: 'subagent', parentSession: 'root', delegationDepth: 1 })))
      .toBe('root')
    // 无 origin 但深度 > 0（异常宿主只写深度）同样归并。
    expect(subParentOf(meta({ delegationDepth: 2, parentSession: 'root' })))
      .toBe('root')
    // fork/resume：parentSession 是种子血缘，无子智能体标记 → 不归并。
    expect(subParentOf(meta({ isSeeded: true, parentSession: 'origin' })))
      .toBeUndefined()
    // 深度 0 的顶层会话、老宿主无标记 header → 不归并。
    expect(subParentOf(meta({ delegationDepth: 0 })))
      .toBeUndefined()
    expect(subParentOf(meta({})))
      .toBeUndefined()
  })

  it('子会话行带 parentId，父行汇总后代费用与调用；总额口径不变', async () => {
    const logs: Record<string, SessionEvent[]> = {
      'session-root': [header(1, 'deepseek-v4-flash'), message(2, T, USAGE)],
      'session-sub1': [header(1, 'deepseek-v4-flash'), message(2, T, USAGE)],
      'session-sub2': [header(1, 'glm-5.2'), message(2, T, USAGE)],
    }
    const stats = await aggregateUsage(subPersistence(logs, {
      'session-sub1': { origin: 'subagent', parentSession: 'session-root', delegationDepth: 1 },
      // 只带深度的变体：同归并门。
      'session-sub2': { delegationDepth: 1, parentSession: 'session-root' },
    }))
    const root = stats.bySession.find(row => row.id === 'session-root')
    const sub1 = stats.bySession.find(row => row.id === 'session-sub1')
    const sub2 = stats.bySession.find(row => row.id === 'session-sub2')
    expect(sub1?.parentId).toBe('session-root')
    expect(sub2?.parentId).toBe('session-root')
    // 子行自己无后代：不写合计字段。
    expect(sub1?.subCalls).toBeUndefined()
    expect(sub1?.subCost).toBeUndefined()
    expect(root?.parentId).toBeUndefined()
    expect(root?.subCalls).toBe(2)
    expect(root?.subCost).toBeCloseTo((sub1?.cost ?? 0) + (sub2?.cost ?? 0), 10)
    // 纯展示层归并：总额仍按 3 次调用计（子会话费用本就在 total 里）。
    expect(stats.total.calls).toBe(3)
  })

  it('多级委派整链递归到根对话', async () => {
    const logs: Record<string, SessionEvent[]> = {
      'session-root': [header(1, 'deepseek-v4-flash'), message(2, T, USAGE)],
      'session-mid': [header(1, 'deepseek-v4-flash'), message(2, T, USAGE)],
      'session-leaf': [header(1, 'deepseek-v4-flash'), message(2, T, USAGE)],
    }
    const stats = await aggregateUsage(subPersistence(logs, {
      'session-mid': { origin: 'subagent', parentSession: 'session-root', delegationDepth: 1 },
      'session-leaf': { origin: 'subagent', parentSession: 'session-mid', delegationDepth: 2 },
    }))
    const root = stats.bySession.find(row => row.id === 'session-root')
    const mid = stats.bySession.find(row => row.id === 'session-mid')
    // 中间节点只汇总自己的直接后代（叶子），根汇总整链。
    expect(mid?.subCalls).toBe(1)
    expect(root?.subCalls).toBe(2)
  })

  it('账本兜底行保留 subOf 归并标记（日志已删的子会话仍归位）', async () => {
    const store = fakeLedgerStore([
      {
        id: 'session-sub-gone',
        subOf: 'session-root',
        foldVersion: FOLD_VERSION,
        fold: legacyFold(),
      },
    ])
    const stats = await aggregateUsage(subPersistence({
      'session-root': [header(1, 'deepseek-v4-flash'), message(2, T, USAGE)],
    }), { ledger: store.store })
    const sub = stats.bySession.find(row => row.id === 'session-sub-gone')
    const root = stats.bySession.find(row => row.id === 'session-root')
    expect(sub?.parentId).toBe('session-root')
    expect(sub?.stale).toBe(true)
    // 父行把只剩账本行的子会话也汇总进去。
    expect(root?.subCalls).toBe(2)
  })

  it('recordLedger 把 subOf 持久化进账本行', async () => {
    const store = fakeLedgerStore([])
    await aggregateUsage(subPersistence({
      'session-root': [header(1, 'deepseek-v4-flash'), message(2, T, USAGE)],
      'session-sub': [header(1, 'deepseek-v4-flash'), message(2, T, USAGE)],
    }, {
      'session-sub': { origin: 'subagent', parentSession: 'session-root', delegationDepth: 1 },
    }), { ledger: store.store })
    const sub = store.current().sessions.find(row => row.id === 'session-sub')
    const root = store.current().sessions.find(row => row.id === 'session-root')
    expect(sub?.subOf).toBe('session-root')
    expect(root?.subOf).toBeUndefined()
  })
})

describe('subscriptionMatcher by reference (MiniMax key-based exemption)', () => {
  it('re-folds history when the referenced set changes, flipping MiniMax between pay-as-you-go and plan', async () => {
    // 同一官方路由 id（minimax-cn）按量/套餐两用：集合里没有 → 按量计费；运行期按 key
    // 前缀判出 Coding Plan 加入集合 → 指纹变化触发重折，同一批历史行变为订阅豁免。
    const routes = new Set<string>()
    // 路由须在 providers 表里（直连），否则落「未知路由」桶计 0（issue #91 口径）。
    const aggregator = createUsageAggregator(
      fakePersistence({ s1: [header(1, 'MiniMax-M3', 'minimax-cn'), message(2, 1_000, USAGE)] }),
      { subscriptionMatcher: routes, resolveRoutes: () => ({ 'minimax-cn': {} }) },
    )
    vi.useFakeTimers()
    try {
      const before = await aggregator.aggregate()
      expect(before.total.cost).toBeGreaterThan(0)
      expect(before.byModel['minimax']?.plan).toBeUndefined()

      // 结果有 5s TTL 缓存（生产上集合变化在下一轮 ≤5s 生效）：推进时钟越过 TTL。
      routes.add('minimax-cn')
      vi.advanceTimersByTime(AGGREGATE_TTL_MS + 1000)
      const after = await aggregator.aggregate()
      expect(after.total.cost).toBe(0)
      expect(after.byModel['minimax']?.plan).toBe(true)

      // 反向：key 换回按量（集合移除）→ 再次重折，费用恢复。
      routes.delete('minimax-cn')
      vi.advanceTimersByTime(AGGREGATE_TTL_MS + 1000)
      const reverted = await aggregator.aggregate()
      expect(reverted.total.cost).toBeCloseTo(before.total.cost, 10)
    } finally {
      vi.useRealTimers()
    }
  })

  it('fingerprints a referenced set by its current contents (not identity)', () => {
    const routes = new Set<string>(['kimi-coding'])
    const a = configFingerprint(routes, undefined, {}, 0)
    routes.add('minimax-cn')
    const b = configFingerprint(routes, undefined, {}, 0)
    expect(a).not.toBe(b)
  })
})
