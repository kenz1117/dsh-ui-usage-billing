/**
 * 供应商计费计划知识库（对标 dsh-spend 的 PROVIDER_KNOWLEDGE / PROVIDER_ALIASES）。
 *
 * 每个 provider 归入两种计费口径之一：
 * - `code`  —— 订阅制（coding / token / agent plan）：费用 = 订阅月费，额度按周期
 *   计量，token 用量不计费（不按 token 扣钱）。
 * - `token` —— 按量制：费用 = token × 单价（由 models.dev / OpenRouter / 内置目录
 *   定价）。无知识库命中的 provider 默认按 token 口径。
 *
 * `aliasOf` 把部署里杂乱的 provider id（glm / kimi / dashscope…）归一化到知识库键，
 * `planOf` 据此返回计费计划；日志出现的 provider 经此自动识别，无需人工配置。
 */
/** 计费口径：code = 订阅制（计月费），token = 按量制（计 token 单价）。 */
export type BillingPlanKind = 'code' | 'token';
/** 订阅月费的币种（只支持单一币种计费，与仪表盘币种一致）。 */
export type BillingCurrency = 'CNY' | 'USD';
/** 一个 provider 的计费计划。 */
export interface BillingPlan {
    /** 计费口径。 */
    kind: BillingPlanKind;
    /** 厂商显示名（未命中知识库时用 provider id 原样）。 */
    label: string;
    /** code 计划的订阅月费（单位 {@link currency}）；token 计划无此项。 */
    subscriptionMonthly?: number;
    /** 订阅月费币种。 */
    currency?: BillingCurrency;
    /** 订阅额度周期（天）；额度按此周期计量。 */
    periodDays?: number;
}
/** 归一化 provider id 到知识库键；未命中的原样返回（避免误吞）。 */
export declare function aliasOf(provider: string): string;
/**
 * 某 provider 的计费计划：命中的 code 计划返回订阅口径，`PROVIDER_LABELS` 命中的
 * 按量厂商返回 token 口径（无月费）；完全未知返回 undefined（调用方按 token 兜底）。
 */
export declare function planOf(provider: string): BillingPlan | undefined;
/** 是否已知为订阅制（code）provider。 */
export declare function isCodePlan(provider: string): boolean;
//# sourceMappingURL=plans.d.ts.map