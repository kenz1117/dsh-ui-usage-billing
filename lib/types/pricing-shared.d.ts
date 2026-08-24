/**
 * Live-pricing wire types shared by the node half (which fetches and caches
 * once at boot) and the browser half (which applies the overrides on top of
 * the built-in catalog). An absent field means the built-in value still
 * applies — the dashboard degrades to the catalog, never to fabricated data.
 */
/** One model's unit prices as reported by the router, in USD per 1M tokens. */
export interface LivePrice {
    /** Uncached input price per 1M tokens. */
    input: number;
    /** Cache-hit input price per 1M tokens (estimated as 10% of input; the router list carries no cache band). */
    cacheHit: number;
    /** Output price per 1M tokens. */
    output: number;
}
/** Response of `/api/billing/pricing` consumed by the dashboard. */
export interface LivePricing {
    /** live = at least one fetch succeeded; builtin = full fallback to the catalog. */
    source: 'live' | 'builtin';
    /** USD → CNY mid rate (present when the rate fetch succeeded). */
    rate?: number;
    /** Overrides keyed by built-in catalog key (present when router matches succeeded). */
    prices?: Record<string, LivePrice>;
    /**
     * models.dev 补充的目录外模型价（USD / 1M tokens）：与宿主预制提供方对齐——
     * pi-ai 预制目录的上游就是 models.dev，补进来的条目让「提供方支持但我们的
     * 内置目录未收录」的模型也能计价并出现在费率表。
     */
    extraModels?: readonly ExtraModelPrice[];
}
/** models.dev 补充的目录外模型价（USD / 1M tokens）。 */
export interface ExtraModelPrice {
    /** 归一化模型 id（计费键，如 `deepseek-v4.5-flash`）。 */
    key: string;
    /** 显示名。 */
    name: string;
    /** 厂商显示名（与仪表盘厂商组同口径）。 */
    provider: string;
    price: LivePrice;
}
/** 余额查询失败的原因，前端据此显示文案。
 *  `invalid` 表示上游返回 2xx 但响应结构偏离预期（接口改版/漂移），
 *  与"网络不可达"（unreachable）区分，便于定位是上游变更还是网络问题。 */
export type BalanceError = 'unconfigured' | 'unauthorized' | 'unreachable' | 'invalid';
/** 一个提供方的账户余额（`/api/billing/balance` 的一行）。 */
export interface ProviderBalance {
    /** 提供方 id（小写，如 `deepseek`），与模型表 provider 匹配用。 */
    provider: string;
    /** 显示名（如 `DeepSeek`）。 */
    displayName: string;
    /** 余额币种（CNY / USD）。 */
    currency?: string;
    /** 总可用余额（含赠金与充值）。 */
    totalBalance?: number;
    /** 未过期赠金余额。 */
    grantedBalance?: number;
    /** 充值余额。 */
    toppedUpBalance?: number;
    /** 余额是否足以继续调用。 */
    isAvailable?: boolean;
    /** 未配置/鉴权失败/网络不可达等失败原因；缺省 = 查询成功。 */
    error?: BalanceError;
    /** 声明端点（declaredEndpoint）出数：数字来自用户配置的取值路径，界面据此标注。 */
    declared?: boolean;
    /** 声明端点未解析出字段 / 安全边界拒绝时的原因文本（配置问题，而非上游故障）。 */
    reason?: string;
    /** 声明端点给出的滚动额度窗口（与订阅面板同款）。 */
    windows?: readonly SubscriptionWindow[];
    /** 订阅套餐名（声明端点读出的 plan 字段）。 */
    plan?: string;
}
/** Response of `/api/billing/balance` consumed by the dashboard. */
export interface BalanceResponse {
    balances: readonly ProviderBalance[];
    /** 官方余额差对账提示（对账开启且当日有余额消费时下发）。 */
    reconcile?: ReconcileNotice;
}
/** 官方余额差对账提示（drift 时携带供 UI 展示的已用/本地费用）。 */
export interface ReconcileNotice {
    kind: 'baseline' | 'structure-reset' | 'flat' | 'ok' | 'drift';
    /** 余额提供商显示名（如 DeepSeek）；仅 `ok`/`drift`。 */
    provider?: string;
    /** 余额币种（CNY / USD）。 */
    currency?: string;
    /** 按余额差反推的当日消费；仅 `ok`/`drift`。 */
    spent?: number;
    /** 本地账本当日的官方渠道费用（CNY）；仅 `ok`/`drift`。 */
    todayOfficialCost?: number;
}
/** Quota query result status; the dashboard maps each to a row state. */
export type SubscriptionStatus = 'ok' | 'not-configured' | 'unauthorized' | 'rate-limited' | 'unavailable' | 'invalid-response';
/** One quota window (session / weekly / monthly / billing). */
export interface SubscriptionWindow {
    kind: 'session' | 'weekly' | 'monthly' | 'billing';
    /** Used share in percent (0–100, one decimal). */
    usedPercent: number;
    /** Remaining share in percent (0–100, one decimal). */
    remainingPercent: number;
    /** ISO reset time; absent when the provider reports none. */
    resetsAt?: string;
    /** Absolute remaining amount; present when the provider reports one. */
    remaining?: number;
}
/** One provider's subscription plan quota row. */
export interface SubscriptionQuota {
    /** Adapter id: `kimi` / `zai` / `opencode-go`. */
    provider: string;
    /** Human display name (e.g. Kimi For Coding). */
    displayName: string;
    /** Plan label; absent when the provider did not name one. */
    plan?: string;
    status: SubscriptionStatus;
    /** Quota windows, newest-window first; empty when the query failed. */
    windows: readonly SubscriptionWindow[];
    /**
     * 计费计划类型（引用 dsh-spend 的双口径）：
     * - `code` 订阅制：月度费用按订阅月费计入（dsh-spend 的 subscription）；
     * - `token` 按量计费：按 token × 单价估算（dsh-spend 的 token plan）。
     */
    planType?: 'code' | 'token';
    /** 订阅月费（人民币元；code 计划用，计入「本月预计」）。 */
    subscriptionAmount?: number;
    /** 面向用户的配置提示（如 OpenRouter 额度接口只认 Management Key）。 */
    hint?: string;
}
/** Response of `/api/billing/subscriptions`. */
export interface SubscriptionResponse {
    quotas: readonly SubscriptionQuota[];
}
/** 中转站程序类型；`unknown` = 两个端点都没读出额度。 */
export type RelayKind = 'new-api' | 'sub2api' | 'unknown';
/** 中转站额度的一行（`/api/billing/relay-quotas` 的一行）。 */
export interface RelayQuota {
    /** llm-pi-ai providers 路由名。 */
    route: string;
    /** 站点 origin（baseURL 归一化）。 */
    origin: string;
    /** 站点显示名。 */
    displayName: string;
    kind: RelayKind;
    status: SubscriptionStatus;
    /** 上游明确携带的钱包余额（不猜币种，币种由上游决定）。 */
    balance?: number;
    /** 解析出的滚动额度窗口（used/total 比值）。 */
    windows?: readonly SubscriptionWindow[];
}
/** Response of `/api/billing/relay-quotas`. */
export interface RelayResponse {
    quotas: readonly RelayQuota[];
    /** 诊断：每条路由的归类（route / origin / kind / unknown），供「我的中转站为什么不显示」自查。 */
    diagnostics?: readonly RelayDiagnostic[];
}
/** 一条路由的归类诊断（供面板/日志定位中转站识别结果）。 */
export interface RelayDiagnostic {
    /** llm-pi-ai providers 路由名。 */
    route: string;
    /** 站点 origin（baseURL 归一化）。 */
    origin: string;
    /** 识别结果：new-api / sub2api（有额度读出）或 unknown（读不出）。 */
    kind: 'new-api' | 'sub2api' | 'unknown';
}
/** Config for one subscription adapter (validated in apply). */
export interface SubscriptionPlanConfig {
    /** Adapter id: `kimi` / `zai` / `opencode-go`. */
    provider: string;
    /** API base URL override; defaults to the provider's public endpoint. */
    baseUrl?: string;
    /** Z.ai region override; defaults to the settings-namespace `zaiRegion`. */
    region?: 'global' | 'bigmodel-cn';
}
/**
 * 余额提取规则：从响应 JSON 取数。
 * - `const`：数字常量；
 * - `path`：点路径取值（如 `data.total_available`）；
 * - `op: 'add' | 'subtract'` + `paths`：多路径加 / 减；
 * - `op: 'divide'` + `path` + `by`：按除数缩放（适配 NewApi 等 quota 端点，
 *   如 1 USD = 500000 quota）。
 */
export interface CustomBalanceExtract {
    const?: number;
    path?: string;
    op?: 'add' | 'subtract' | 'divide';
    paths?: readonly string[];
    by?: number;
}
/** 一个自定义 Provider 余额查询配置（插件 config 的 `customBalances` 条目）。 */
export interface CustomBalanceConfig {
    /** 显示名（中文）。 */
    label: string;
    /** 显示名（英文）；缺省用 label。 */
    labelEn?: string;
    /** 余额币种（如 CNY / USD）；缺省 CNY。 */
    unit?: string;
    /** 查询端点（完整 URL）。 */
    url: string;
    /** HTTP 方法；缺省 GET。 */
    method?: string;
    /** 请求头；值支持 `{{ENV_NAME}}` 占位符，经凭据 seam 解析（仅请求头支持）。 */
    headers?: Record<string, string>;
    /** 余额提取规则。 */
    extract: {
        remaining: CustomBalanceExtract;
    };
}
/** 声明端点的一个滚动窗口输入：`kind`/`minutes` 是字面值，其余是响应里的取值路径。 */
export interface DeclaredWindowConfig {
    /** 窗口周期：session / weekly / monthly / billing。 */
    kind?: SubscriptionWindow['kind'];
    /** 窗口分钟周期（用于按 resetInSeconds 推算周期；缺省不推）。 */
    minutes?: number;
    /** 已用百分比（0–100，取值路径）。 */
    usedPercent?: string;
    /** 已用比例（0–1，取值路径）。 */
    usedRatio?: string;
    /** 剩余百分比（取值路径）。 */
    remainingPercent?: string;
    /** 已用量（取值路径）。 */
    used?: string;
    /** 总量（取值路径）。 */
    limit?: string;
    /** 重置时刻（ISO 字符串，取值路径）。 */
    resetsAt?: string;
    /** 距重置剩余秒数（取值路径）。 */
    resetInSeconds?: string;
}
/** 声明端点的字段取值路径：值里写的是响应 JSON 里的点路径，不是表达式。 */
export interface DeclaredEndpointFields {
    /** 余额总量（取值路径）。 */
    total?: string;
    /** 赠金余额（取值路径）。 */
    granted?: string;
    /** 已用（取值路径）。 */
    used?: string;
    /** 币种（取值路径）。 */
    currency?: string;
    /** 套餐名（取值路径）。 */
    plan?: string;
}
/**
 * 一个声明端点配置（插件 config 的 `declaredEndpoints` 条目）。用户为内置表
 * 没有的供应商自声明余额/额度接口。
 *
 * 安全边界写死在代码里，不靠自觉（详见 declarative.ts）：
 * - `origin` 只是查找键，请求必须发往某条**已配置** provider 的同源地址；
 * - `path` 必须单斜杠绝对路径（`//host/x` 是协议相对 URL，会解析到别的主机）；
 * - 只发 GET、无请求体、无自定义 method/headers；
 * - 凭据仍从匹配 provider 自己的 `apiKeyEnv` 取，声明不能指定凭据；
 * - 跨源重定向直接失败；响应体有大小上限与超时；
 * - 不能覆盖内置读法，只在内置表答不上来时轮到它。
 */
export interface DeclaredEndpointConfig {
    /** 查找键：必须匹配某条已配置 provider 的 baseURL 同源地址。 */
    origin: string;
    /** 显示名；缺省用 `已声明`。 */
    displayName?: string;
    /** 余额端点（单斜杠绝对路径，基于匹配 provider 的 origin 构造）。 */
    path: string;
    /** 裸密钥模式：true 时不加 `Bearer ` 前缀（某些控制台接口要裸 key）。 */
    raw?: boolean;
    /** 字段取值路径。 */
    fields?: DeclaredEndpointFields;
    /** 滚动额度窗口列表。 */
    windows?: readonly DeclaredWindowConfig[];
}
//# sourceMappingURL=pricing-shared.d.ts.map