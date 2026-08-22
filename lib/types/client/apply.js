/**
 * Usage billing plugin, browser half: registers the UsageBilling component
 * in the sidebar.footer.action slot.
 *
 * Displays compact cost/token/cache metrics in the sidebar footer, above the
 * Settings button, plus a model-health dot (green when any connected model
 * route responds). Expands to a detailed dashboard panel on click.
 *
 * 与主题插件（如 acid-zine）的协作走 slot 与服务：billing 声明装饰孔位
 *（billing.dashboard.decor）并注册计费指标服务（ctx.billingMetrics），主题
 * 插件主动注入装饰视觉、消费费用数据——billing 不反向依赖任何主题包。
 */
import { UsageBilling } from "./UsageBilling.js";
import { LiveCostBar } from "./live-cost.js";
import { en, NS, zh } from "./locales.js";
import { createBillingMetrics } from "./billing-service.js";
import { createBillingBudgetStore } from "./budget-store.js";
/** Required services for the usage billing surface. */
export const inject = ['slots', 'locale', 'connection'];
/**
 * Client plugin body: the UsageBilling entry in the sidebar footer.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    // 计费指标服务：billing 写入（组件经 inject 回调），主题插件经 ctx.get 读取。
    const metrics = createBillingMetrics();
    ctx.provide('billingMetrics', metrics);
    // 预算偏好 store：apply 期构造，身份绑定本 fiber；引擎持久化到 localStorage。
    const budgetStore = createBillingBudgetStore();
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-usage-billing: dictionaries');
    ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
        name: 'sidebar.footer.action',
        id: 'usage-billing',
        order: -10,
        locale: NS,
        // 装饰孔位由主题插件注入；未注入时走 billing 默认视觉。
        children: {
            'billing.dashboard.decor': { kind: 'list', scope: 'root' },
        },
        store: budgetStore,
        inject: () => ({
            checkModels: async () => {
                // llm.models is host-scoped: it needs no sessionId, so the probe works
                // even before any session exists. A provider that loaded its model
                // catalog has live credentials; failed providers are the unhealthy
                // ones. Display names feed the per-model dots in the dashboard table.
                try {
                    const { result } = await ctx.connection.api.llm.models({});
                    if (!result.ok)
                        return { checked: true, available: false, models: 0, failures: 0, okProviders: [], badProviders: [] };
                    return {
                        checked: true,
                        available: result.value.groups.length > 0,
                        // 右上角"模型可用"按模型统计：累加每个厂商成功 advertise 的模型数，
                        // 而不是厂商分组数（groups.length 是厂商数，一个厂商可含多个模型）。
                        models: result.value.groups.reduce((sum, group) => sum + group.models.length, 0),
                        failures: result.value.failures.length,
                        okProviders: result.value.groups.map(group => group.name),
                        badProviders: result.value.failures.map(failure => failure.name),
                    };
                }
                catch {
                    return { checked: true, available: false, models: 0, failures: 0, okProviders: [], badProviders: [] };
                }
            },
            publishCosts: (costs) => { metrics.publishCosts(costs); },
            registerOpen: (handler) => metrics.registerOpen(handler),
        }),
    }, UsageBilling));
    // 即时代费用条：挂在会话 composer 的 dock（stats-line 家族座位），随输入框
    // 常驻显示当前会话累计费用与最新一轮费用，无需打开完整仪表盘。
    // 组件经框架标准 kit 注入 useSession（取当前 sessionId），与 StatsLine 同姿态。
    // 用 inject 往宿主（ui-conversation）已声明的 composer.dock 注入条目，而非 register 声明。
    ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
        name: 'conversation.composer.dock',
        id: 'usage-billing-cost',
        order: 0,
        locale: NS,
    }, LiveCostBar));
}
//# sourceMappingURL=apply.js.map