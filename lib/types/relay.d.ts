/**
 * 中转站额度查询（node 半区）：识别并读取 New API 系与 Sub2API 的「余额 / 额度窗口」。
 *
 * 适用场景：用户把某条 llm-pi-ai provider 路由的 `baseURL` 指向第三方中转站
 * （New API / One API / VoAPI / Sub2API 等）。这类站点不卖官方余额，卖的是
 * 按 key 的额度（used/total）或多个滚动窗口。本模块对**配了 baseURL 且有
 * apiKeyEnv** 的路由逐个探测两个已知端点，能解析出额度就返回；解析不出的
 * 静默标记 unavailable，绝不臆造金额（与 balance/subscriptions 一致的姿态）。
 *
 * 探测顺序：先 Sub2API `/v1/usage`（标准化程度高），再 New API `/api/status`；
 * 404 = 不是该套程序，继续试下一种；401/403 = 是但 key 不对（unauthorized）；
 * 网络/5xx 走熔断门短路一段时间。同一站点多把 key 是独立额度，分别列出。
 */
import type { Context } from '@deepseek-ai/cordis';
import type { RelayQuota, SubscriptionWindow } from './pricing-shared.ts';
/** 一个待探测的中转站路由（来自 llm-pi-ai providers 的 baseURL + apiKeyEnv）。 */
export interface RelayRoute {
    /** llm-pi-ai providers 路由名（key）。 */
    route: string;
    /** 该路由配置的端点地址（origin 来源）。 */
    baseURL: string;
    /** 该路由解析到的 apiKeyEnv 引用。 */
    apiKeyEnv: string;
    /** 站点显示名；缺省用路由名。 */
    displayName?: string;
}
/**
 * 解析 Sub2API `/v1/usage` 响应：能取到 balance 或 quota/used 就识别为 sub2api。
 * 三种形态（窗口 / 分组 / 钱包余额）都宽容处理：有 `quota/total` 给出窗口，
 * 有 `balance` 给出余额，两者可同时存在。
 * @param data - `/v1/usage` 的 JSON 响应。
 * @returns 解析结果；两者都取不到返回 null（不是 Sub2API 或响应漂移）。
 */
export declare function parseSub2ApiUsage(data: unknown): {
    balance?: number;
    windows?: readonly SubscriptionWindow[];
} | null;
/**
 * 解析 New API `/api/status` 响应：New API 系（One API / VoAPI 分支）的额度是
 * 按记录行的 ratio（已用比例）。只给出窗口，不猜金额（币种防猜）。
 * @param data - `/api/status` 的 JSON 响应。
 * @returns 窗口；取不到比例返回 null（响应漂移）。
 */
export declare function parseNewApiStatus(data: unknown): {
    windows?: readonly SubscriptionWindow[];
} | null;
/**
 * 查询单个中转站路由的额度。先试 Sub2API，再试 New API；任一读出额度即返回。
 * @param ctx - host context carrying the credentials seam.
 * @param route - 待探测的路由（baseURL + apiKeyEnv）。
 * @returns 该路由的一行额度结果（status 标记成败）。
 */
export declare function queryRelayQuota(ctx: Context, route: RelayRoute): Promise<RelayQuota>;
/**
 * 批量查询多个中转站路由的额度（每个独立成败，互不影响）。
 * @param ctx - host context carrying the credentials seam.
 * @param routes - 配了 baseURL 且 apiKeyEnv 有值的路由列表。
 * @returns 每个路由一行的额度结果。
 */
export declare function queryRelayQuotas(ctx: Context, routes: readonly RelayRoute[]): Promise<readonly RelayQuota[]>;
//# sourceMappingURL=relay.d.ts.map