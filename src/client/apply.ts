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

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the ui-sidebar SlotMap merge (the sidebar.footer.action entry).
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the connection service face (ctx.connection.api) for the model-health probe.
import type {} from '@deepseek-ai/dsh-client-connection/client'
import { UsageBilling, type ModelHealth, type UsageBillingInjected } from './UsageBilling.tsx'
import { en, NS, zh, type UsageBillingKey } from './locales.ts'
import { createBillingMetrics, type BillingMetricsService } from './billing-service.ts'
import { createBillingBudgetStore } from './budget-store.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /**
     * Dashboard 弹窗内的装饰孔位：主题插件（如 acid-zine）按 position 锚点
     * 注入 MacDots、撕角便签、胶带标题、条码等 ZINE 元素。kind=list，可多个
     * 注册者并列；未注入时走 billing 默认视觉。
     */
    'billing.dashboard.decor': { kind: 'list'; scope: 'root'; owner: BillingDashboardDecorOwnerProps }
  }
}

/** Dashboard 装饰的锚点位置：head/headTitle=窗口标题区；hero=主数字卡；trend/models=面板标题；footer=面板底部。 */
export type BillingDecorPosition = 'head' | 'headTitle' | 'hero' | 'trend' | 'models' | 'footer'

/** Dashboard 装饰组件收到的所有者数据：当前锚点。 */
export interface BillingDashboardDecorOwnerProps {
  position: BillingDecorPosition
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** 计费指标服务（billing 插件提供；主题插件可选消费）。 */
    billingMetrics?: BillingMetricsService
  }
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The usage billing surface's copy. */
    usageBilling: UsageBillingKey
  }
}

/** Required services for the usage billing surface. */
export const inject = ['slots', 'locale', 'connection']

/**
 * Client plugin body: the UsageBilling entry in the sidebar footer.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  // 计费指标服务：billing 写入（组件经 inject 回调），主题插件经 ctx.get 读取。
  const metrics = createBillingMetrics()
  ctx.provide('billingMetrics', metrics)

  // 预算偏好 store：apply 期构造，身份绑定本 fiber；引擎持久化到 localStorage。
  const budgetStore = createBillingBudgetStore()

  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-usage-billing: dictionaries')

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
    inject: (): UsageBillingInjected => ({
      checkModels: async (): Promise<ModelHealth> => {
        // llm.models is host-scoped: it needs no sessionId, so the probe works
        // even before any session exists. A provider that loaded its model
        // catalog has live credentials; failed providers are the unhealthy
        // ones. Display names feed the per-model dots in the dashboard table.
        try {
          const { result } = await ctx.connection.api.llm.models({})
          if (!result.ok) return { checked: true, available: false, models: 0, failures: 0, okProviders: [], badProviders: [] }
          return {
            checked: true,
            available: result.value.groups.length > 0,
            // 右上角"模型可用"按模型统计：累加每个厂商成功 advertise 的模型数，
            // 而不是厂商分组数（groups.length 是厂商数，一个厂商可含多个模型）。
            models: result.value.groups.reduce((sum, group) => sum + group.models.length, 0),
            failures: result.value.failures.length,
            okProviders: result.value.groups.map(group => group.name),
            badProviders: result.value.failures.map(failure => failure.name),
          }
        } catch {
          return { checked: true, available: false, models: 0, failures: 0, okProviders: [], badProviders: [] }
        }
      },
      publishCosts: (costs) => { metrics.publishCosts(costs) },
      registerOpen: (handler) => metrics.registerOpen(handler),
    }),
  }, UsageBilling))
}
