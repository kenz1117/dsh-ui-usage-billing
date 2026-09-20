/**
 * One-shot live pricing refresh for the billing dashboard.
 *
 * Fetches the USD → CNY mid rate and the OpenRouter model price list, maps
 * matched models onto the built-in catalog keys, and returns the combined
 * LivePricing. Every fetch failure degrades to the built-in values: the node
 * half caches whatever succeeded and the browser dashboard falls back to the
 * catalog for the rest — a total outage answers `{ source: 'builtin' }`.
 */

import type { ExtraModelPrice, LivePrice, LivePricing } from './pricing-shared.ts'
import { BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES } from './builtin-catalog.ts'
import { createCooldownGate, withRetry } from './resilience.ts'

/** Abort a fetch when the upstream hangs beyond this budget. */
const FETCH_TIMEOUT_MS = 8000

/** 每平台熔断门：单个定价上游连续可重试失败（网络 / 5xx / 429）达阈值后短路，
 *  避免 6 小时刷新循环与每次启动在已故障的上游上反复打满超时。按 URL 独立。 */
const pricingGate = createCooldownGate({ failures: 3, cooldownMs: 60_000 })

/**
 * USD → CNY 汇率源，按顺序尝试：国内可达的腾讯财经行情（免 key、`~` 分隔
 * 第 4 个字段为价格）优先，国外 open.er-api.com 兜底。任一源失败自动落到
 * 下一个；全部失败由调用方降级内置汇率。
 */
const RATE_SOURCES: readonly { url: string; parse: (text: string) => number | undefined }[] = [
  {
    url: 'https://qt.gtimg.cn/q=whUSDCNY',
    parse: (text) => {
      const match = /"([^"]*)"/.exec(text)
      const price = match?.[1]?.split('~')[3]
      return price !== undefined && price !== '' ? Number(price) : undefined
    },
  },
  {
    url: 'https://open.er-api.com/v6/latest/USD',
    parse: (text) => {
      try {
        const data = JSON.parse(text) as { rates?: Record<string, unknown> }
        const cny = data.rates?.CNY
        return typeof cny === 'number' && Number.isFinite(cny) && cny > 0 ? cny : undefined
      } catch {
        return undefined
      }
    },
  },
]

/** OpenRouter's public model list: per-token USD prices, no key needed. */
const ROUTER_URL = 'https://openrouter.ai/api/v1/models'

/** models.dev 公开目录：pi-ai 预制提供方的上游数据源（USD / 1M tokens）。
 * 接入它即与宿主「系统设置里预制的提供方模型」对齐——预制条目来自同一份数据。 */
const MODELS_DEV_URL = 'https://models.dev/api.json'

/**
 * models.dev provider id → 仪表盘厂商显示名。探测到的模型若其厂商显示名与此
 * 映射命中则用之；未命中的回退为探活模型自带的厂商名（系统配置里的显示名）。
 * 不作为过滤条件——只用于给 models.dev 条目补一个可读的厂商名。
 */
const MODELS_DEV_PROVIDERS: Readonly<Record<string, string>> = {
  deepseek: 'DeepSeek',
  zhipu: '智谱 AI',
  zhipuai: '智谱 AI',
  zai: '智谱 AI',
  qwen: '阿里通义',
  alibaba: '阿里通义',
  moonshot: '月之暗面',
  moonshotai: '月之暗面',
  volcengine: '字节豆包',
  doubao: '字节豆包',
  minimax: 'MiniMax',
  baidu: '百度文心',
  tencent: '腾讯混元',
  hunyuan: '腾讯混元',
  stepfun: '阶跃星辰',
  iflytek: '科大讯飞',
  sensetime: '商汤',
  baichuan: '百川智能',
  '01.ai': '零一万物',
  openai: 'OpenAI',
  google: 'Google',
  xai: 'xAI',
  meta: 'Meta',
  anthropic: 'Anthropic',
  mistral: 'Mistral',
}

/**
 * Built-in catalog key → OpenRouter model-id candidates. Matching prefers an
 * exact id, then a single strong substring hit (the router id contains the
 * hint); an ambiguous hit is skipped so the built-in price stays
 * authoritative. Hints are provider+generation words the router ids carry —
 * correct or extend them as the market moves.
 */
const ROUTER_ID_HINTS: Readonly<Record<string, readonly string[]>> = {
  'flash': ['deepseek-v4-flash', 'deepseek-v4'],
  'pro': ['deepseek-v4-pro'],
  'glm': ['glm-5'],
  'qwen-3.8-max': ['qwen-3.8-max', 'qwen3.8-max'],
  'qwen-max': ['qwen-max'],
  'qwen-plus': ['qwen-plus'],
  'gemini-pro': ['gemini-3-pro', 'gemini-pro'],
  'gemini-flash': ['gemini-3-flash', 'gemini-flash'],
  'gpt-5.6-sol': ['gpt-5.6-sol'],
  'gpt-5.6-terra': ['gpt-5.6-terra'],
  'gpt-5.6-luna': ['gpt-5.6-luna'],
  'grok': ['grok-4'],
  'llama': ['llama-4'],
  'kimi': ['kimi-k2'],
}

/** One OpenRouter model row reduced to the fields pricing needs. */
interface RouterModel {
  /** Router id like `deepseek/deepseek-v4-flash`. */
  id: string
  /** Input price per 1M tokens in USD. */
  input: number
  /** Output price per 1M tokens in USD. */
  output: number
}

/** GET a URL's text body with a hard timeout and retry; null on any failure. */
async function fetchText(url: string): Promise<string | null> {
  // 熔断：该上游正处于冷却期时直接短路（调用方落到下一来源/内置目录）。
  if (!pricingGate.check(url)) return null
  const doFetch = async (): Promise<string> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      const response = await fetch(url, { signal: controller.signal })
      if (!response.ok) {
        const error = new Error(`HTTP ${String(response.status)}`)
        ;(error as { httpStatus?: number }).httpStatus = response.status
        throw error
      }
      return await response.text()
    } finally {
      clearTimeout(timer)
    }
  }
  try {
    const text = await withRetry(doFetch, { retries: 1, baseDelayMs: 250, maxDelayMs: 2000 })
    pricingGate.success(url)
    return text
  } catch {
    pricingGate.fail(url)
    return null
  }
}

/** GET a JSON endpoint with a hard timeout; null on any failure. */
async function fetchJson(url: string): Promise<unknown> {
  const text = await fetchText(url)
  if (text === null) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

/** Latest USD → CNY rate from the first working source, or undefined when none respond. */
/**
 * EUR → CNY 汇率源。与 USD 同一套降级约定：腾讯行情优先（免 key、国内可达），
 * open.er-api.com 兑底；全部失败由调用方降级内置汇率，不阻塞其他价格拉取。
 */
const EUR_RATE_SOURCES: readonly { url: string; parse: (text: string) => number | undefined }[] = [
  {
    url: 'https://qt.gtimg.cn/q=whEURCNY',
    parse: (text) => {
      const match = /"([^"]*)"/.exec(text)
      const price = match?.[1]?.split('~')[3]
      return price !== undefined && price !== '' ? Number(price) : undefined
    },
  },
  {
    url: 'https://open.er-api.com/v6/latest/EUR',
    parse: (text) => {
      try {
        const data = JSON.parse(text) as { rates?: Record<string, unknown> }
        const cny = data.rates?.CNY
        return typeof cny === 'number' && Number.isFinite(cny) && cny > 0 ? cny : undefined
      } catch {
        return undefined
      }
    },
  },
]

/**
 * 按顺序尝试汇率源，返回第一个合法正数。
 * @param sources - 待尝试的汇率源。
 * @returns 汇率；全部失败时 undefined。
 */
async function fetchRateFrom(sources: readonly { url: string; parse: (text: string) => number | undefined }[]): Promise<number | undefined> {
  for (const source of sources) {
    const text = await fetchText(source.url)
    if (text === null) continue
    const value = source.parse(text)
    if (value !== undefined && Number.isFinite(value) && value > 0) return value
  }
  return undefined
}

async function fetchRate(): Promise<number | undefined> {
  for (const source of RATE_SOURCES) {
    const text = await fetchText(source.url)
    if (text === null) continue
    const value = source.parse(text)
    if (value !== undefined && Number.isFinite(value) && value > 0) return value
  }
  return undefined
}

/** OpenRouter model rows with usable USD unit prices, or undefined on failure. */
async function fetchRouterModels(): Promise<readonly RouterModel[] | undefined> {
  const data = await fetchJson(ROUTER_URL)
  if (data === null || typeof data !== 'object') return undefined
  const list = (data as { data?: unknown }).data
  if (!Array.isArray(list)) {
    console.warn('[usage-billing] openrouter models response drifted: expected a `data` array')
    return undefined
  }
  const models: RouterModel[] = []
  for (const item of list) {
    if (item === null || typeof item !== 'object') continue
    const { id, pricing } = item as { id?: unknown; pricing?: unknown }
    if (typeof id !== 'string' || pricing === null || typeof pricing !== 'object') continue
    const { prompt, completion } = pricing as { prompt?: unknown; completion?: unknown }
    if (typeof prompt !== 'number' || typeof completion !== 'number') continue
    if (!Number.isFinite(prompt) || !Number.isFinite(completion)) continue
    models.push({ id, input: prompt * 1_000_000, output: completion * 1_000_000 })
  }
  return models
}

/** Match one catalog key's candidates: exact id first, then a single strong substring hit. */
function matchRouterModel(hints: readonly string[], models: readonly RouterModel[]): RouterModel | undefined {
  const exact = models.find(model => hints.some(hint => model.id === hint))
  if (exact !== undefined) return exact
  // 强子串：hint 足够具体（≥8 字符）且唯一命中，避免同前缀模型误配。
  const strong = models.filter(model => hints.some(hint => hint.length >= 8 && model.id.includes(hint)))
  if (strong.length !== 1) return undefined
  return strong[0]
}

/** Map router matches onto catalog keys; undefined when nothing matched. */
function buildPrices(models: readonly RouterModel[]): Record<string, LivePrice> | undefined {
  const result: Record<string, LivePrice> = {}
  for (const [key, hints] of Object.entries(ROUTER_ID_HINTS)) {
    const hit = matchRouterModel(hints, models)
    if (hit === undefined) continue
    result[key] = { input: hit.input, cacheHit: hit.input * 0.1, output: hit.output }
  }
  return Object.keys(result).length > 0 ? result : undefined
}

/** 有限正数收窄（models.dev cost 字段的 durable 边界）。 */
function asPrice(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined
}

/** models.dev 常把同一模型收录在多个 provider 下（厂商 + 转售）。这些 id 是模型
 *  自身的厂商，其报价视为权威：转售可能加价，也可能省略 cache_read 而落到下方
 *  `input * 0.1` 的猜测值。去重时优先采用。 */
const FIRST_PARTY_PRICE_SOURCES: ReadonlySet<string> = new Set([
  'anthropic', 'openai', 'google', 'mistral', 'deepseek', 'moonshotai', 'zhipuai',
  'alibaba', 'alibaba-cn', 'xai', 'meta', 'cohere', 'ai21', 'minimax', 'stepfun',
  'upstage', 'perplexity', 'morph',
])

/** 同一目录键的一条候选报价，附带用于择优的证据。 */
interface PriceCandidate {
  entry: ExtraModelPrice
  input: number
  output: number
  /** `input/output` 组合，用于统计多数报价。 */
  pair: string
  /** provider 是该模型的厂商（白名单命中，或模型 id 的命名空间等于 provider id）。 */
  firstParty: boolean
  /** 该条目显式声明了 cache_read，而非退化到 input * 0.1。 */
  declared: boolean
  /** 模型 id 的命名空间（`vendor/model` 的 vendor 部分），无则为空串。 */
  namespace: string
  family?: string
  providerDisplay: string
}

/**
 * models.dev 响应 → 目录外补充条目。不再按厂商白名单过滤：凡是有有效
 * cost 的模型都纳入（探活模型可能来自任何预制厂商，白名单会漏掉）。厂商
 * 显示名优先取映射，未命中用 provider id。导出供测试：纯函数。
 * @param data - `https://models.dev/api.json` 的响应体。
 * @returns 补充条目（按 provider 顺序稳定；仅含可计价的模型）。
 */
export function buildExtraModels(data: unknown): ExtraModelPrice[] {
  if (data === null || typeof data !== 'object') return []
  // 已在内置目录收录（含别名表归一化后的目录键）：跳过，走内置价/别名避免重复。
  const catalogKeys = new Set<string>([
    ...BUILTIN_MODEL_CATALOG.map(entry => entry.key.toLowerCase()),
    ...Object.keys(BUILTIN_MODEL_KEY_ALIASES).map(key => BUILTIN_MODEL_KEY_ALIASES[key]?.toLowerCase() ?? key.toLowerCase()),
  ])
  // 同一目录键会被多个 provider 各收录一条。先全部收集，再按证据择优——
  // 此前按遍历顺序保留第一条，等于让 models.dev 的 JSON 字段顺序决定价格。
  const offers = new Map<string, PriceCandidate[]>()
  // models.dev 的 family → 一手收录它的厂商。从数据本身学习，使同一 family 的
  // 模型归到同一厂商，而不是被各自中标的转售站拆散。
  const familyVendorVotes = new Map<string, Map<string, number>>()
  for (const [providerId, providerDoc] of Object.entries(data as Record<string, unknown>)) {
    if (providerDoc === null || typeof providerDoc !== 'object') continue
    const models = (providerDoc as { models?: unknown }).models
    if (models === null || typeof models !== 'object') continue
    const providerKey = providerId.toLowerCase()
    const providerName = (providerDoc as { name?: unknown }).name
    const providerDisplay = MODELS_DEV_PROVIDERS[providerKey]
      ?? (typeof providerName === 'string' && providerName !== '' ? providerName : providerId)
    for (const [modelId, modelDoc] of Object.entries(models as Record<string, unknown>)) {
      // models.dev 的 key 是厂商原始 id（deepseek-v4-flash）；先按别名归一化为
      // 目录键（flash），命中内置目录则跳过。
      const catalogKey = (BUILTIN_MODEL_KEY_ALIASES[modelId] ?? modelId).toLowerCase()
      if (catalogKeys.has(catalogKey)) continue
      const key = catalogKey
      if (modelDoc === null || typeof modelDoc !== 'object') continue
      const cost = (modelDoc as { cost?: unknown }).cost
      if (cost === null || typeof cost !== 'object') continue
      const input = asPrice((cost as { input?: unknown }).input)
      const output = asPrice((cost as { output?: unknown }).output)
      if (input === undefined || output === undefined) continue
      const declaredCacheRead = asPrice((cost as { cache_read?: unknown }).cache_read)
      const cacheRead = declaredCacheRead ?? input * 0.1
      const name = (modelDoc as { name?: unknown }).name
      const familyValue = (modelDoc as { family?: unknown }).family
      const family = typeof familyValue === 'string' && familyValue !== '' ? familyValue : undefined
      // 带命名空间的 id（`vendor/model`）自带厂商信息，provider id 与之相等即为
      // 一手报价——无需维护词表，对任何厂商都成立。
      const slash = modelId.indexOf('/')
      const namespace = slash > 0 ? modelId.slice(0, slash).toLowerCase() : ''
      const firstParty = FIRST_PARTY_PRICE_SOURCES.has(providerKey) || (namespace !== '' && namespace === providerKey)
      if (firstParty && family !== undefined) {
        // 白名单里的 provider 也会转售别家模型，单条报价不足以决定整个 family，
        // 取多数票。
        let votes = familyVendorVotes.get(family)
        if (votes === undefined) {
          votes = new Map<string, number>()
          familyVendorVotes.set(family, votes)
        }
        votes.set(providerDisplay, (votes.get(providerDisplay) ?? 0) + 1)
      }
      let list = offers.get(key)
      if (list === undefined) {
        list = []
        offers.set(key, list)
      }
      list.push({
        entry: {
          key,
          name: typeof name === 'string' && name !== '' ? name : modelId,
          provider: providerDisplay,
          price: { input, cacheHit: cacheRead, output },
        },
        input,
        output,
        pair: `${input}/${output}`,
        firstParty,
        declared: declaredCacheRead !== undefined,
        namespace,
        ...(family === undefined ? {} : { family }),
        providerDisplay,
      })
    }
  }
  const familyVendor = new Map<string, string>()
  for (const [family, votes] of familyVendorVotes) {
    let winner: string | undefined
    let winnerVotes = 0
    for (const [vendor, count] of votes) {
      if (count > winnerVotes) {
        winnerVotes = count
        winner = vendor
      }
    }
    if (winner !== undefined) familyVendor.set(family, winner)
  }
  const extras: ExtraModelPrice[] = []
  for (const list of offers.values()) {
    const firstPartyRow = list.find(candidate => candidate.firstParty)
    let pool: PriceCandidate[]
    if (firstPartyRow !== undefined) {
      pool = list.filter(candidate => candidate.firstParty)
    } else {
      // 多数报价：最多 provider 公布的同一 input/output 组合。
      const tally = new Map<string, number>()
      for (const candidate of list) tally.set(candidate.pair, (tally.get(candidate.pair) ?? 0) + 1)
      let consensus: string | undefined
      let consensusCount = 0
      for (const [pair, count] of tally) {
        if (count > consensusCount) {
          consensusCount = count
          consensus = pair
        }
      }
      if (consensusCount > 1) {
        pool = list.filter(candidate => candidate.pair === consensus)
      } else {
        // 无共识时取中位数，避免被单个高价或低价离群值带偏。
        const sorted = [...list].sort((a, b) => a.input - b.input || a.output - b.output)
        const median = sorted[Math.floor((sorted.length - 1) / 2)]
        pool = median === undefined ? [] : [median]
      }
    }
    // 同分时优先真实声明的 cache_read，而非 input * 0.1 的猜测值。
    const best = pool.find(candidate => candidate.declared) ?? pool[0]
    if (best === undefined) continue
    // 展示的厂商应是模型的厂商，而非中标的价格来源。
    const familyName = list.find(candidate => candidate.family !== undefined)?.family
    const learnedVendor = familyName === undefined ? undefined : familyVendor.get(familyName)
    best.entry.provider = learnedVendor
      ?? (best.firstParty
        ? best.providerDisplay
        : best.namespace !== ''
          ? MODELS_DEV_PROVIDERS[best.namespace] ?? best.namespace
          : familyName !== undefined
            ? familyName.charAt(0).toUpperCase() + familyName.slice(1)
            : best.providerDisplay)
    extras.push(best.entry)
  }
  return extras
}

/**
 * Fetch the live pricing once at boot. Both upstreams run in parallel; a
 * failure in either degrades independently to the built-in value.
 * @returns the live pricing snapshot (builtin when everything failed).
 */
export async function fetchLivePricing(): Promise<LivePricing> {
  const [rate, rateEur, models, modelsDev] = await Promise.all([fetchRate(), fetchRateFrom(EUR_RATE_SOURCES), fetchRouterModels(), fetchJson(MODELS_DEV_URL)])
  const prices = models === undefined ? undefined : buildPrices(models)
  const extraModels = modelsDev === null ? undefined : buildExtraModels(modelsDev)
  if (rate === undefined && rateEur === undefined && prices === undefined && (extraModels === undefined || extraModels.length === 0)) return { source: 'builtin' }
  return {
    source: 'live',
    ...(rate !== undefined ? { rate } : {}),
    ...(rateEur !== undefined ? { rateEur } : {}),
    ...(prices !== undefined ? { prices } : {}),
    ...(extraModels !== undefined && extraModels.length > 0 ? { extraModels } : {}),
  }
}
