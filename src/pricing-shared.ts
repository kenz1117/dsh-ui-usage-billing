/**
 * Live-pricing wire types shared by the node half (which fetches and caches
 * once at boot) and the browser half (which applies the overrides on top of
 * the built-in catalog). An absent field means the built-in value still
 * applies — the dashboard degrades to the catalog, never to fabricated data.
 */

/** One model's unit prices as reported by the router, in USD per 1M tokens. */
export interface LivePrice {
  /** Uncached input price per 1M tokens. */
  input: number
  /** Cache-hit input price per 1M tokens (estimated as 10% of input; the router list carries no cache band). */
  cacheHit: number
  /** Output price per 1M tokens. */
  output: number
}

/** Response of `/api/billing/pricing` consumed by the dashboard. */
export interface LivePricing {
  /** live = at least one fetch succeeded; builtin = full fallback to the catalog. */
  source: 'live' | 'builtin'
  /** USD → CNY mid rate (present when the rate fetch succeeded). */
  rate?: number
  /** Overrides keyed by built-in catalog key (present when router matches succeeded). */
  prices?: Record<string, LivePrice>
  /**
   * models.dev 补充的目录外模型价（USD / 1M tokens）：与宿主预制提供方对齐——
   * pi-ai 预制目录的上游就是 models.dev，补进来的条目让「提供方支持但我们的
   * 内置目录未收录」的模型也能计价并出现在费率表。
   */
  extraModels?: readonly ExtraModelPrice[]
}

/** models.dev 补充的目录外模型价（USD / 1M tokens）。 */
export interface ExtraModelPrice {
  /** 归一化模型 id（计费键，如 `deepseek-v4.5-flash`）。 */
  key: string
  /** 显示名。 */
  name: string
  /** 厂商显示名（与仪表盘厂商组同口径）。 */
  provider: string
  price: LivePrice
}

/** 余额查询失败的原因，前端据此显示文案。 */
export type BalanceError = 'unconfigured' | 'unauthorized' | 'unreachable'

/** 一个提供方的账户余额（`/api/billing/balance` 的一行）。 */
export interface ProviderBalance {
  /** 提供方 id（小写，如 `deepseek`），与模型表 provider 匹配用。 */
  provider: string
  /** 显示名（如 `DeepSeek`）。 */
  displayName: string
  /** 余额币种（CNY / USD）。 */
  currency?: string
  /** 总可用余额（含赠金与充值）。 */
  totalBalance?: number
  /** 未过期赠金余额。 */
  grantedBalance?: number
  /** 充值余额。 */
  toppedUpBalance?: number
  /** 余额是否足以继续调用。 */
  isAvailable?: boolean
  /** 未配置/鉴权失败/网络不可达等失败原因；缺省 = 查询成功。 */
  error?: BalanceError
}

/** Response of `/api/billing/balance` consumed by the dashboard. */
export interface BalanceResponse {
  balances: readonly ProviderBalance[]
}

// ── 订阅套餐额度（node 半区查询，浏览器半区展示）────────────────────────────

/** Quota query result status; the dashboard maps each to a row state. */
export type SubscriptionStatus = 'ok' | 'not-configured' | 'unauthorized' | 'rate-limited' | 'unavailable' | 'invalid-response'

/** One quota window (session / weekly / monthly / billing). */
export interface SubscriptionWindow {
  kind: 'session' | 'weekly' | 'monthly' | 'billing'
  /** Used share in percent (0–100, one decimal). */
  usedPercent: number
  /** Remaining share in percent (0–100, one decimal). */
  remainingPercent: number
  /** ISO reset time; absent when the provider reports none. */
  resetsAt?: string
  /** Absolute remaining amount; present when the provider reports one. */
  remaining?: number
}

/** One provider's subscription plan quota row. */
export interface SubscriptionQuota {
  /** Adapter id: `kimi` / `zai` / `opencode-go`. */
  provider: string
  /** Human display name (e.g. Kimi For Coding). */
  displayName: string
  /** Plan label; absent when the provider did not name one. */
  plan?: string
  status: SubscriptionStatus
  /** Quota windows, newest-window first; empty when the query failed. */
  windows: readonly SubscriptionWindow[]
  /**
   * 计费计划类型（引用 dsh-spend 的双口径）：
   * - `code` 订阅制：月度费用按订阅月费计入（dsh-spend 的 subscription）；
   * - `token` 按量计费：按 token × 单价估算（dsh-spend 的 token plan）。
   */
  planType?: 'code' | 'token'
  /** 订阅月费（人民币元；code 计划用，计入「本月预计」）。 */
  subscriptionAmount?: number
}

/** Response of `/api/billing/subscriptions`. */
export interface SubscriptionResponse {
  quotas: readonly SubscriptionQuota[]
}

/** Config for one subscription adapter (validated in apply). */
export interface SubscriptionPlanConfig {
  /** Adapter id: `kimi` / `zai` / `opencode-go`. */
  provider: string
  /** API base URL override; defaults to the provider's public endpoint. */
  baseUrl?: string
  /** Z.ai region override; defaults to the settings-namespace `zaiRegion`. */
  region?: 'global' | 'bigmodel-cn'
}

// ── 自定义 Provider 余额（任意 HTTP 端点 + extract 规则）──────────────────

/**
 * 余额提取规则：从响应 JSON 取数。
 * - `const`：数字常量；
 * - `path`：点路径取值（如 `data.total_available`）；
 * - `op: 'add' | 'subtract'` + `paths`：多路径加 / 减；
 * - `op: 'divide'` + `path` + `by`：按除数缩放（适配 NewApi 等 quota 端点，
 *   如 1 USD = 500000 quota）。
 */
export interface CustomBalanceExtract {
  const?: number
  path?: string
  op?: 'add' | 'subtract' | 'divide'
  paths?: readonly string[]
  by?: number
}

/** 一个自定义 Provider 余额查询配置（插件 config 的 `customBalances` 条目）。 */
export interface CustomBalanceConfig {
  /** 显示名（中文）。 */
  label: string
  /** 显示名（英文）；缺省用 label。 */
  labelEn?: string
  /** 余额币种（如 CNY / USD）；缺省 CNY。 */
  unit?: string
  /** 查询端点（完整 URL）。 */
  url: string
  /** HTTP 方法；缺省 GET。 */
  method?: string
  /** 请求头；值支持 `{{ENV_NAME}}` 占位符，经凭据 seam 解析（仅请求头支持）。 */
  headers?: Record<string, string>
  /** 余额提取规则。 */
  extract: { remaining: CustomBalanceExtract }
}
