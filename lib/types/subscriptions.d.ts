/**
 * Subscription-plan quota polling (node half): how much of each coding/token
 * plan is left. The billing dashboard already exempts subscription providers
 * from per-token cost; this module surfaces the REMAINING quota so the user
 * sees plan headroom instead of a blank row.
 *
 * The panel shows only the plans the user actually configured: adapters with
 * a known quota API (Kimi, Z.ai, OpenCode Go) query the remaining amount;
 * other subscription providers the harness recognizes (volcengine / baidu /
 * qwen / xiaomi token plans, agent plans…) are identified and listed with a
 * "no quota API" marker rather than hidden. API keys come from the `llm-pi-ai`
 * settings namespace (`apiKeyEnv` refs) resolved through the credentials seam.
 */
import type { SubscriptionPlanConfig, SubscriptionQuota } from './pricing-shared.ts';
/** 订阅适配器需要的凭据（来自 llm-pi-ai 设置命名空间）。 */
export interface SubscriptionKeys {
    /** Kimi For Coding API key。 */
    kimiApiKey: string;
    /** Z.ai API key。 */
    zaiApiKey: string;
    /** OpenCode Go API key。 */
    opencodeApiKey: string;
    /** Z.ai 区域（global / bigmodel-cn）。 */
    zaiRegion: 'global' | 'bigmodel-cn';
}
/** 空凭据：全部未配置时的初始值。 */
export declare const EMPTY_SUBSCRIPTION_KEYS: SubscriptionKeys;
/** 已识别的一个订阅套餐（用户在 llm-pi-ai 里配置了 key 的订阅类 provider）。 */
export interface IdentifiedSubscriptionPlan {
    /** llm-pi-ai 的 provider id（如 kimi-coding、xiaomi-token-plan-cn）。 */
    provider: string;
    /** 显示名（映射表命中则用映射，否则用 id）。 */
    displayName: string;
    /** 是否有额度查询适配器。 */
    adapter: boolean;
    /** 适配器区域覆盖（zai-coding-cn → bigmodel-cn）。 */
    region?: 'global' | 'bigmodel-cn';
}
/** 是否是订阅类 provider id（如 kimi-coding、xiaomi-token-plan-cn）。 */
export declare function isSubscriptionProviderId(providerId: string): boolean;
/**
 * 从 llm-pi-ai 设置里识别订阅套餐：带订阅类 id 且配置了 apiKeyEnv 的 provider。
 * @param providers - the `providers` map of the llm-pi-ai settings namespace.
 * @returns identified plans in configuration order.
 */
export declare function identifySubscriptionPlans(providers: Record<string, {
    apiKeyEnv?: string;
} | undefined> | undefined): IdentifiedSubscriptionPlan[];
/**
 * Collect quota for the given plans concurrently (adapter-backed plans only;
 * identified plans without an adapter are surfaced by the caller as "no
 * quota API" rows).
 * @param keys - the API keys from the llm-pi-ai settings namespace.
 * @param plans - adapter-backed plans to poll; empty by default.
 * @param timeoutMs - per-request timeout; defaults to 15s.
 * @returns the quotas in plan order (unknown providers degrade to `unavailable`).
 */
export declare function collectSubscriptions(keys: SubscriptionKeys, plans?: readonly SubscriptionPlanConfig[], timeoutMs?: number): Promise<readonly SubscriptionQuota[]>;
//# sourceMappingURL=subscriptions.d.ts.map