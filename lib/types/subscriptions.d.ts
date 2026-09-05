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
import type { SubscriptionPlanConfig, SubscriptionQuota, SubscriptionWindow } from './pricing-shared.ts';
/** 订阅适配器需要的凭据（来自 llm-pi-ai 设置命名空间）。 */
export interface SubscriptionKeys {
    /** Kimi For Coding API key。 */
    kimiApiKey: string;
    /** Z.ai API key。 */
    zaiApiKey: string;
    /** OpenCode Go API key。 */
    opencodeApiKey: string;
    /** MiniMax Token Plan API key。 */
    minmaxApiKey: string;
    /** OpenRouter API key（credits 已用%）。 */
    openrouterApiKey: string;
    /** 腾讯云云 API 密钥对（`<SecretId>:<SecretKey>`，管控面用，非 TokenHub 推理 key）。 */
    tencentCloudApi: string;
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
 * 解析 MiniMax Token Plan `/v1/token_plan/remains` 响应。取 general(或 MiniMax-M*)
 * 一行抽出 5h/7d 窗口(total_count 常为 0,以 remaining_percent 为准),不按模型拆条。
 * 导出供测试:纯函数。
 * @param body - 接口响应 JSON。
 * @returns 窗口列表;无可用窗口时为空数组。
 */
export declare function parseMiniMaxRemains(body: unknown): SubscriptionWindow[];
/**
 * 解析 OpenRouter `/api/v1/credits` 响应:已用% = total_usage / total_credits。
 * 导出供测试:纯函数。
 * @param body - 接口响应 JSON。
 * @returns 窗口列表;无有效额度时为 []。
 */
export declare function parseOpenRouterCredits(body: unknown): SubscriptionWindow[];
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