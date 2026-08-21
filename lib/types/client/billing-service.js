/**
 * 计费指标服务（ctx.billingMetrics）：把 UsageBilling 的实时费用摘要与
 * 弹窗打开能力开放给其他插件（如 acid-zine 主题的贴纸层）消费。
 *
 * 依赖方向为「billing 提供服务、主题适配消费」：billing 插件是唯一的
 * 写入方（组件通过 inject 的 publishCosts / registerOpen 写入），消费方
 * 只读费用快照并触发弹窗打开——billing 不反向依赖任何主题包。
 */
/** 创建计费指标运行时（apply 内调用，随插件纤维存活）。 */
export function createBillingMetrics() {
    let costs;
    let open;
    const listeners = new Set();
    return {
        readCosts: () => costs,
        subscribeCosts: (listener) => {
            listener(costs);
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
        openDashboard: () => { open?.(); },
        publishCosts: (next) => {
            costs = next;
            for (const listener of listeners)
                listener(next);
        },
        registerOpen: (handler) => {
            open = handler;
            return () => { if (open === handler)
                open = undefined; };
        },
    };
}
//# sourceMappingURL=billing-service.js.map