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
import type { Context } from '@deepseek-ai/cordis';
import { type UsageBillingKey } from './locales.ts';
import { type BillingMetricsService } from './billing-service.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface SlotMap {
        /**
         * Dashboard 弹窗内的装饰孔位：主题插件（如 acid-zine）按 position 锚点
         * 注入 MacDots、撕角便签、胶带标题、条码等 ZINE 元素。kind=list，可多个
         * 注册者并列；未注入时走 billing 默认视觉。
         */
        'billing.dashboard.decor': {
            kind: 'list';
            scope: 'root';
            owner: BillingDashboardDecorOwnerProps;
        };
    }
}
/** Dashboard 装饰的锚点位置：head/headTitle=窗口标题区；hero=主数字卡；trend/models=面板标题；footer=面板底部。 */
export type BillingDecorPosition = 'head' | 'headTitle' | 'hero' | 'trend' | 'models' | 'footer';
/** Dashboard 装饰组件收到的所有者数据：当前锚点。 */
export interface BillingDashboardDecorOwnerProps {
    position: BillingDecorPosition;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** 计费指标服务（billing 插件提供；主题插件可选消费）。 */
        billingMetrics?: BillingMetricsService;
    }
}
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The usage billing surface's copy. */
        usageBilling: UsageBillingKey;
    }
}
/** Required services for the usage billing surface. */
export declare const inject: string[];
/**
 * Client plugin body: the UsageBilling entry in the sidebar footer.
 * @param ctx - client root context.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=apply.d.ts.map