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
import { credentialRef } from '@deepseek-ai/dsh-credentials';
/** Abort a balance fetch when the upstream hangs beyond this budget. */
const FETCH_TIMEOUT_MS = 8000;
/** DeepSeek 官方余额接口（官方文档 api-docs.deepseek.com/api/get-user-balance）。 */
const DEEPSEEK_BALANCE_URL = 'https://api.deepseek.com/user/balance';
/** Moonshot/Kimi 官方余额接口（platform.kimi.com/docs/api/balance）。 */
const MOONSHOT_BALANCE_URL = 'https://api.moonshot.cn/v1/users/me/balance';
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
 * Fetch a Bearer-protected balance endpoint and normalize the HTTP outcome into
 * a shared {@link ProviderBalance} row. Each provider supplies its own
 * response parser for the success body.
 * @param ctx - host context carrying the credentials seam.
 * @param url - the balance endpoint.
 * @param apiKeyEnv - credential reference resolving the API key.
 * @param provider - the provider id (matches the model-table vendor display name).
 * @param displayName - human-readable provider name.
 * @param parse - maps a success JSON body to the balance row fields.
 * @returns the balance row, or an error row when the key/endpoint misbehaves.
 */
async function queryBearerBalance(ctx, url, apiKeyEnv, provider, displayName, parse) {
    const hit = await ctx.credentials.resolve(credentialRef(apiKeyEnv));
    if (hit === undefined) {
        return { provider, displayName, error: 'unconfigured' };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        const response = await fetch(url, {
            headers: { accept: 'application/json', authorization: `Bearer ${hit.value}` },
            signal: controller.signal,
        });
        if (response.status === 401 || response.status === 403) {
            return { provider, displayName, error: 'unauthorized' };
        }
        if (!response.ok) {
            return { provider, displayName, error: 'unreachable' };
        }
        return parse(await response.json());
    }
    catch {
        return { provider, displayName, error: 'unreachable' };
    }
    finally {
        clearTimeout(timer);
    }
}
/**
 * Query the DeepSeek account balance.
 * @param ctx - host context carrying the credentials seam.
 * @param apiKeyEnv - credential reference resolving the DeepSeek API key.
 * @returns the balance row, or an error row when the key/endpoint misbehaves.
 */
function queryDeepSeek(ctx, apiKeyEnv) {
    return queryBearerBalance(ctx, DEEPSEEK_BALANCE_URL, apiKeyEnv, 'deepseek', 'DeepSeek', (data) => {
        const doc = data;
        const infos = Array.isArray(doc.balance_infos) ? doc.balance_infos : [];
        const info = infos[0];
        const currency = typeof info?.currency === 'string' ? info.currency : undefined;
        const totalBalance = toNumber(info?.total_balance);
        const grantedBalance = toNumber(info?.granted_balance);
        const toppedUpBalance = toNumber(info?.topped_up_balance);
        const isAvailable = typeof doc.is_available === 'boolean' ? doc.is_available : undefined;
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
    });
}
/**
 * Query the Moonshot/Kimi account balance.
 * @param ctx - host context carrying the credentials seam.
 * @param apiKeyEnv - credential reference resolving the Moonshot API key.
 * @returns the balance row, or an error row when the key/endpoint misbehaves.
 */
function queryMoonshot(ctx, apiKeyEnv) {
    return queryBearerBalance(ctx, MOONSHOT_BALANCE_URL, apiKeyEnv, '月之暗面', '月之暗面', (data) => {
        const doc = data;
        const totalBalance = toNumber(doc.data?.available_balance);
        const grantedBalance = toNumber(doc.data?.voucher_balance);
        const toppedUpBalance = toNumber(doc.data?.cash_balance);
        return {
            provider: '月之暗面',
            displayName: '月之暗面',
            currency: 'CNY',
            ...(totalBalance !== undefined ? { totalBalance } : {}),
            ...(grantedBalance !== undefined ? { grantedBalance } : {}),
            ...(toppedUpBalance !== undefined ? { toppedUpBalance } : {}),
        };
    });
}
const QUERIERS = [
    { route: 'deepseek', displayName: 'deepseek', querier: queryDeepSeek },
    { route: 'moonshot', displayName: '月之暗面', querier: queryMoonshot },
];
/**
 * Query every configured provider's account balance. A provider is queried only
 * when its llm-pi-ai route has an `apiKeyEnv`; absent routes answer
 * `unconfigured` so the dashboard shows a stable state instead of dropping the row.
 * @param ctx - host context carrying the credentials seam.
 * @param providers - the llm-pi-ai providers dict (`<route> → { apiKeyEnv? }`).
 * @returns the balance rows (one per provider).
 */
export async function queryBalances(ctx, providers) {
    return await Promise.all(QUERIERS.map(({ route, querier, displayName }) => {
        const env = providers[route]?.apiKeyEnv;
        // 未配置 key 的 route 直接标未配置，不走 credentialRef（空 env 会被其拒绝）。
        if (typeof env !== 'string' || env === '') {
            return Promise.resolve({ provider: displayName, displayName, error: 'unconfigured' });
        }
        return querier(ctx, env);
    }));
}
//# sourceMappingURL=balance.js.map