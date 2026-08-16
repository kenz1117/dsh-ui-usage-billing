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
