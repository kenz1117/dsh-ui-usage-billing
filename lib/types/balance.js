/**
 * Account-balance queries for the billing dashboard.
 *
 * Only providers with a public balance endpoint can report one. Today that is
 * DeepSeek (`GET https://api.deepseek.com/user/balance`, Bearer 鉴权); the
 * other mainstream providers (OpenAI, 智谱, 通义, Kimi…) expose no standard
 * balance API, so their rows in the model table show an unavailable state.
 * The lookup map below is the extension point for future providers.
 */
import { credentialRef } from '@deepseek-ai/dsh-credentials';
/** Abort a balance fetch when the upstream hangs beyond this budget. */
const FETCH_TIMEOUT_MS = 8000;
/** DeepSeek 官方余额接口（官方文档 api-docs.deepseek.com/api/get-user-balance）。 */
const DEEPSEEK_BALANCE_URL = 'https://api.deepseek.com/user/balance';
/** 数字归一化：接口返回的余额是字符串（如 `"110.00"`），统一转 number。 */
function toNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
}
/**
 * Query the DeepSeek account balance through the configured credential.
 * @param ctx - host context carrying the credentials seam.
 * @param apiKeyEnv - credential reference resolving the DeepSeek API key.
 * @returns the balance row, or an error row when the key/endpoint misbehaves.
 */
async function queryDeepSeek(ctx, apiKeyEnv) {
    const hit = await ctx.credentials.resolve(credentialRef(apiKeyEnv));
    if (hit === undefined) {
        return { provider: 'deepseek', displayName: 'DeepSeek', error: 'unconfigured' };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        const response = await fetch(DEEPSEEK_BALANCE_URL, {
            headers: { accept: 'application/json', authorization: `Bearer ${hit.value}` },
            signal: controller.signal,
        });
        if (response.status === 401 || response.status === 403) {
            return { provider: 'deepseek', displayName: 'DeepSeek', error: 'unauthorized' };
        }
        if (!response.ok) {
            return { provider: 'deepseek', displayName: 'DeepSeek', error: 'unreachable' };
        }
        const data = await response.json();
        const infos = Array.isArray(data.balance_infos) ? data.balance_infos : [];
        const info = infos[0];
        const currency = typeof info?.currency === 'string' ? info.currency : undefined;
        const totalBalance = toNumber(info?.total_balance);
        const grantedBalance = toNumber(info?.granted_balance);
        const toppedUpBalance = toNumber(info?.topped_up_balance);
        const isAvailable = typeof data.is_available === 'boolean' ? data.is_available : undefined;
        return {
            provider: 'deepseek',
            displayName: 'DeepSeek',
            // exactOptionalPropertyTypes: 只携带有值的可选字段。
            ...(currency !== undefined ? { currency } : {}),
            ...(totalBalance !== undefined ? { totalBalance } : {}),
            ...(grantedBalance !== undefined ? { grantedBalance } : {}),
            ...(toppedUpBalance !== undefined ? { toppedUpBalance } : {}),
            ...(isAvailable !== undefined ? { isAvailable } : {}),
        };
    }
    catch {
        return { provider: 'deepseek', displayName: 'DeepSeek', error: 'unreachable' };
    }
    finally {
        clearTimeout(timer);
    }
}
const QUERIERS = [
    { provider: 'deepseek', querier: queryDeepSeek },
];
/**
 * Query every configured provider's account balance.
 * @param ctx - host context carrying the credentials seam.
 * @param balanceApiKeyEnv - credential reference for the DeepSeek key.
 * @returns the balance rows (one per provider).
 */
export async function queryBalances(ctx, balanceApiKeyEnv) {
    return await Promise.all(QUERIERS.map(({ querier }) => querier(ctx, balanceApiKeyEnv)));
}
//# sourceMappingURL=balance.js.map