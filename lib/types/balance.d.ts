/**
 * Account-balance queries for the billing dashboard.
 *
 * Only providers with a public balance endpoint can report one. Today that is
 * DeepSeek, Moonshot/Kimi, StepFun, SiliconFlow, and xAI (Grok) — all Bearer
 * 鉴权 with a documented JSON shape; the other mainstream providers expose no
 * standard balance API (or require a non-Bearer auth flow), so their rows in
 * the model table show an unavailable state. The lookup map below is the
 * extension point for future providers.
 *
 * API keys are read from the `llm-pi-ai` settings namespace (`providers.<id>.apiKeyEnv`),
 * the same source the subscription adapter uses, so a deployment configures a
 * provider's key once and every surface reuses it.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { CustomBalanceConfig, CustomBalanceExtract, ProviderBalance } from './pricing-shared.ts';
/**
 * 从 TokenDance 余额响应提取剩余余额并换算为元。导出供测试：纯函数。
 * 优先用服务端现成的 `balance.balance`（= credits - credits_used）；缺失时
 * 按两个明细字段相减推导，字段全部缺失返回 undefined。
 * @param data - 余额端点的 JSON 响应（`{ balance: { credits, credits_used, balance } }`，微元）。
 * @returns 剩余余额（元）；提取不到返回 undefined。
 */
export declare function pickTokenDanceBalanceCny(data: unknown): number | undefined;
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
 * 请求头占位符解析：值中任意位置的 `{{ENV_NAME}}` 经凭据 seam 替换（如
 * `Bearer {{KEY}}`、`token={{KEY}}`、一处多占位符）；被引用的任一凭据缺失
 * 或为空 → 返回 null（fail-closed，与完整占位符形态的历史语义一致）。
 */
export declare function resolveHeaders(ctx: Context, headers: Record<string, string>): Promise<Record<string, string> | null>;
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