/**
 * GET /api/billing/subscriptions：订阅套餐剩余额度（供订阅面板）。
 * 失败抛出（调用方据此保留旧快照）。
 */
import type { SubscriptionQuota } from '../../pricing-shared.ts';
/** Path to the subscription-plan quota endpoint served by this plugin's node half. */
export declare const SUBSCRIPTIONS_PATH = "/api/billing/subscriptions";
/** 订阅额度响应（白名单切片）。 */
export interface SubscriptionsDoc {
    quotas: readonly SubscriptionQuota[];
    /** 服务端刷新超预算：额度来自上一次成功的查询（issue #104）。 */
    stale?: boolean;
}
/**
 * 拉取订阅套餐剩余额度（供订阅面板）；失败返回空列表。
 * @returns the quota rows, or an empty list on any failure.
 */
export declare function fetchSubscriptions(): Promise<SubscriptionsDoc>;
//# sourceMappingURL=subscriptions.d.ts.map