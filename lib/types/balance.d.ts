/**
 * Account-balance queries for the billing dashboard.
 *
 * Only providers with a public balance endpoint can report one. Today that is
 * DeepSeek (`GET https://api.deepseek.com/user/balance`, Bearer 鉴权); the
 * other mainstream providers (OpenAI, 智谱, 通义, Kimi…) expose no standard
 * balance API, so their rows in the model table show an unavailable state.
 * The lookup map below is the extension point for future providers.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { ProviderBalance } from './pricing-shared.ts';
/**
 * Query every configured provider's account balance.
 * @param ctx - host context carrying the credentials seam.
 * @param balanceApiKeyEnv - credential reference for the DeepSeek key.
 * @returns the balance rows (one per provider).
 */
export declare function queryBalances(ctx: Context, balanceApiKeyEnv: string): Promise<readonly ProviderBalance[]>;
//# sourceMappingURL=balance.d.ts.map