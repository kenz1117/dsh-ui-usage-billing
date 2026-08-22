/**
 * Account-balance queries for the billing dashboard.
 *
 * Only providers with a public balance endpoint can report one. Today that is
 * DeepSeek (`GET https://api.deepseek.com/user/balance`) and Moonshot/Kimi
 * (`GET https://api.moonshot.cn/v1/users/me/balance`), both Bearer 鉴权 with a
 * documented JSON shape; the other mainstream providers expose no standard
 * balance API (or require a non-Bearer auth flow), so their rows in the model
 * table show an unavailable state. The lookup map below is the extension point
 * for future providers.
 *
 * API keys are read from the `llm-pi-ai` settings namespace (`providers.<id>.apiKeyEnv`),
 * the same source the subscription adapter uses, so a deployment configures a
 * provider's key once and every surface reuses it.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { CustomBalanceConfig, CustomBalanceExtract, ProviderBalance } from './pricing-shared.ts';
/**
 * Query every configured provider's account balance. A provider is queried only
 * when its llm-pi-ai route has an `apiKeyEnv`; absent routes answer
 * `unconfigured` so the dashboard shows a stable state instead of dropping the row.
 * @param ctx - host context carrying the credentials seam.
 * @param providers - the llm-pi-ai providers dict (`<route> → { apiKeyEnv? }`).
 * @returns the balance rows (one per provider).
 */
export declare function queryBalances(ctx: Context, providers: Readonly<Record<string, {
    apiKeyEnv?: string;
}>>): Promise<readonly ProviderBalance[]>;
/**
 * 按 extract 规则从响应 JSON 求值。导出供测试：纯函数。
 * @param rule - 提取规则（const / path / add / subtract / divide）。
 * @param data - 响应 JSON。
 * @returns 数值；取不到或结果非有限数返回 undefined。
 */
export declare function evalExtract(rule: CustomBalanceExtract, data: unknown): number | undefined;
/**
 * 查询自定义 Provider 余额（插件 config 的 `customBalances`）。每个条目独立
 * 成败：占位符凭据缺失 → unconfigured；401/403 → unauthorized；网络或提取
 * 失败 → unreachable。
 * @param ctx - host context carrying the credentials seam.
 * @param configs - 自定义余额配置列表。
 * @returns 每个配置一行的余额结果。
 */
export declare function queryCustomBalances(ctx: Context, configs: readonly CustomBalanceConfig[]): Promise<readonly ProviderBalance[]>;
//# sourceMappingURL=balance.d.ts.map