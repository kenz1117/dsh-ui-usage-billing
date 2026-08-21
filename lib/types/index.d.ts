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
/** Plugin configuration. */
export interface UsageBillingConfig {
    /** Absolute path to a `.dsh-usage-stats.json` fallback file. */
    statsPath?: string;
    /** 订阅制（coding / token / agent plan）provider id 列表；默认 kimi-coding、xiaomi-token-plan-cn。 */
    subscriptionProviders?: string[];
    /** 余额查询用的 DeepSeek 凭据引用（环境变量名）；默认 DEEPSEEK_API_KEY。 */
    balanceApiKeyEnv?: string;
    /** 月度预算（人民币元）；设置后随 usage-stats 下发，仪表盘显示预算进度条。 */
    monthlyBudget?: number;
    /** 余额不足告警阈值（人民币元）：余额低于此值时仪表盘每天提醒一次；
        不设置则客户端按默认阈值（50 元）兜底。 */
    lowBalanceThreshold?: number;
}
/** Required services: the web server and the persisted session log store. */
export declare const inject: string[];
/**
 * Host plugin body: serve real aggregated usage to the browser dashboard.
 * @param ctx - host context carrying webServer and sessionPersistence.
 * @param config - optional statsPath override.
 */
export declare function apply(ctx: Context, config?: UsageBillingConfig): void;
//# sourceMappingURL=index.d.ts.map