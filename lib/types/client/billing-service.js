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
            // 逐个 listener 隔离异常：任一消费方抛错不影响其余 listener 收到本次更新，
            // 也不会让异常冒泡回发布方（组件渲染路径）。
            for (const listener of listeners) {
                try {
                    listener(next);
                }
                catch {
                    // 消费方回调异常：静默，不阻断发布链。
                }
            }
        },
        registerOpen: (handler) => {
            open = handler;
            return () => { if (open === handler)
                open = undefined; };
        },
    };
}
//# sourceMappingURL=billing-service.js.map