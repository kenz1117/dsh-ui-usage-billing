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
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Context } from '@deepseek-ai/cordis';
import type { CredentialProvider } from '@deepseek-ai/dsh-credentials';
import { type SettingsProvider } from '@deepseek-ai/dsh-settings';
import { type UsageLedgerStore } from './aggregate.ts';
import type { CustomBalanceConfig, DeclaredEndpointConfig, SubscriptionPlanConfig } from './pricing-shared.ts';
import { type IdentifiedSubscriptionPlan, type SubscriptionKeys } from './subscriptions.ts';
/**
 * 回环防护守卫：仅接受回环 GET 请求（peer socket 地址 + Host 头同时校验）。
 * 不满足时返回 403 并结束响应；调用方在 handler 顶部调用，返回 false 即已拒绝。
 * @param req - 当前请求。
 * @param res - 当前响应。
 * @returns 是否放行；false = 已拒绝并结束响应。
 */
export declare function guardLoopback(req: IncomingMessage, res: ServerResponse): boolean;
/** Plugin configuration. */
export interface UsageBillingConfig {
    /** Absolute path to a `.dsh-usage-stats.json` fallback file. */
    statsPath?: string;
    /** 统计快照的持久化路径；默认 `~/.dsh/.dsh-usage-stats.json`。
     *  测试注入临时目录以隔离真实家目录（聚合失败回退与快照落盘都走此路径）。 */
    snapshotPath?: string;
    /** 独立持久用量账本的绝对路径；默认 `~/.dsh/.dsh-usage-ledger.json`。
     *  账本与会话日志解耦，因此永久删除会话不会抹掉已经观测到的用量。 */
    ledgerPath?: string;
    /** 余额差对账基准的持久化路径；默认 `~/.dsh/.dsh-usage-reconcile.json`。 */
    reconcilePath?: string;
    /** 订阅制（coding / token / agent plan）provider id 列表；默认 kimi-coding、xiaomi-token-plan-cn。 */
    subscriptionProviders?: string[];
    /** 订阅套餐额度适配器（kimi / zai / opencode-go）；默认全部内置。 */
    subscriptionPlans?: readonly SubscriptionPlanConfig[];
    /** 余额查询用的 DeepSeek 凭据引用（环境变量名）；默认 DEEPSEEK_API_KEY。 */
    balanceApiKeyEnv?: string;
    /** 月度预算（人民币元）；设置后随 usage-stats 下发，仪表盘显示预算进度条。 */
    monthlyBudget?: number;
    /** 余额不足告警阈值（人民币元）：余额低于此值时仪表盘每天提醒一次；
        不设置则客户端按默认阈值（50 元）兜底。 */
    lowBalanceThreshold?: number;
    /** 自定义 Provider 余额查询（任意 HTTP 端点 + extract 规则，适配 NewApi/LiteLLM 等）。 */
    customBalances?: readonly CustomBalanceConfig[];
    /**
     * 声明端点（declarative endpoints）：为内置表没有的供应商自声明余额/额度接口。
     * 绑定到某条已配置 provider 的同源地址，`fields` / `windows` 写响应里的取值路径；
     * 安全边界（origin 绑定、单斜杠 path、只 GET、跨源重定向失败、凭据取自 apiKeyEnv）
     * 写死在 declarative.ts。缺省空。
     */
    declaredEndpoints?: readonly DeclaredEndpointConfig[];
    /** `usage_stats` 工具注入的组合 base（默认 false：不注入）；与设置命名空间同字段，
     *  作为用户设置（设置 Tab 开关）的组合兜底。该工具占用每次请求的上下文，coding 场景多在仪表盘查看。 */
    enableUsageStatsTool?: boolean;
}
/**
 * Create the atomic file-backed durable-ledger store. The previous complete file
 * is retained as `.bak`; a malformed/missing main file falls back to that backup.
 */
export declare function createFileUsageLedgerStore(ledgerPath: string): UsageLedgerStore;
/** Required services: the web server, the persisted session log store, and user settings. */
export declare const inject: string[];
/**
 * 读取 llm-pi-ai 设置的 `providers` 字典（`<route> → { apiKeyEnv? }`）。
 * 余额查询复用同一份来源：部署为某个 provider 配一次 key，多个 surface 共享。
 * @param settings - the settings service (reads the llm-pi-ai namespace).
 * @returns the providers dict; empty when the namespace is unreadable.
 */
/** 一个 llm-pi-ai provider 路由的读取视图：只取三块——apiKeyEnv（凭据引用）、
 *  baseURL（中转站零配置发现的来源）、displayName（站点显示名）。 */
export interface PiAiProviderRoute {
    apiKeyEnv?: string;
    baseURL?: string;
    displayName?: string;
}
/** 同步读取 provider 路由的 baseURL 视图（中转站零配置发现来源）。
 *  `settings.describe` 是同步调用，聚合器每次折叠取最新站点映射，无需缓存/过期。
 *  注意：返回**全部可读路由**（baseURL 可选），聚合层据此区分「路由存在但无
 *  baseURL=直连」与「路由已删除=未知路由」两种不同归属。
 * @param settings - the settings service (reads the llm-pi-ai namespace).
 * @returns `<route> → { baseURL? }`；命名空间不可读时返回空。
 */
export declare function readPiAiProviderRoutes(settings: SettingsProvider): Readonly<Record<string, {
    baseURL?: string;
}>>;
/**
  * 解析订阅适配器需要的 API Key：从 llm-pi-ai 设置的 `providers.<id>.apiKeyEnv`
 * 读引用（如 kimi-coding → KIMI_CODING_API_KEY），再经凭据 seam 解析成实际值。
 * 同时识别出用户配置了 key 的订阅套餐（供面板只显示已识别的）。
 * @param settings - the settings service (reads the llm-pi-ai namespace).
 * @param credentials - the credentials service (resolves the env refs).
 */
export declare function resolveSubscriptionKeys(settings: SettingsProvider, credentials: CredentialProvider): Promise<{
    keys: SubscriptionKeys;
    identified: IdentifiedSubscriptionPlan[];
}>;
/**
 * Host plugin body: serve real aggregated usage to the browser dashboard.
 * @param ctx - host context carrying webServer and sessionPersistence.
 * @param config - optional statsPath override.
 */
export declare function apply(ctx: Context, config?: UsageBillingConfig): void;
//# sourceMappingURL=index.d.ts.map