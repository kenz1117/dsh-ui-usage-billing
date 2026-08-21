/**
 * 计费指标服务（ctx.billingMetrics）：把 UsageBilling 的实时费用摘要与
 * 弹窗打开能力开放给其他插件（如 acid-zine 主题的贴纸层）消费。
 *
 * 依赖方向为「billing 提供服务、主题适配消费」：billing 插件是唯一的
 * 写入方（组件通过 inject 的 publishCosts / registerOpen 写入），消费方
 * 只读费用快照并触发弹窗打开——billing 不反向依赖任何主题包。
 */
/** 计费摘要（精简版，仅供外部展示；金额为人民币元）。 */
export interface BillingCosts {
    todayCost: number;
    monthCost: number;
}
/** 消费方（如酸-zine 贴纸层）可用的只读接口。 */
export interface BillingMetricsService {
    /** 当前费用快照；从未发布过则 undefined。 */
    readCosts(): BillingCosts | undefined;
    /**
     * 订阅费用更新；立即收到当前值一次（若无值则为 undefined）。
     * @param listener - 费用回调。
     * @returns 退订函数。
     */
    subscribeCosts(listener: (costs: BillingCosts | undefined) => void): () => void;
    /** 打开计费仪表盘（若 billing 弹窗已挂载）。 */
    openDashboard(): void;
}
/** 服务运行时：在只读接口之上追加写入入口，仅 apply 与组件使用。 */
export interface BillingMetricsRuntime extends BillingMetricsService {
    /** 发布最新费用摘要（UsageBilling 组件每次渲染数据变化时调用）。 */
    publishCosts(costs: BillingCosts): void;
    /**
     * 注册弹窗打开回调；组件卸载时应解除。
     * @param handler - 打开弹窗的处理函数。
     * @returns 解除注册的函数。
     */
    registerOpen(handler: () => void): () => void;
}
/** 创建计费指标运行时（apply 内调用，随插件纤维存活）。 */
export declare function createBillingMetrics(): BillingMetricsRuntime;
//# sourceMappingURL=billing-service.d.ts.map