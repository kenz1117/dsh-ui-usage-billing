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
import type { ProviderBalance } from './pricing-shared.ts';
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
//# sourceMappingURL=balance.d.ts.map