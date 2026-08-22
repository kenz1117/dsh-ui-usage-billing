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
import type { Context } from '@deepseek-ai/cordis';
import type { CredentialProvider } from '@deepseek-ai/dsh-credentials';
import type { SettingsProvider } from '@deepseek-ai/dsh-settings';
import type { CustomBalanceConfig, SubscriptionPlanConfig } from './pricing-shared.ts';
import { type IdentifiedSubscriptionPlan, type SubscriptionKeys } from './subscriptions.ts';
/** Plugin configuration. */
export interface UsageBillingConfig {
    /** Absolute path to a `.dsh-usage-stats.json` fallback file. */
    statsPath?: string;
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
}
/** Required services: the web server, the persisted session log store, and user settings. */
export declare const inject: string[];
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