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

import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the ui-sidebar SlotMap merge (the sidebar.footer.action entry).
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the renderer's Context merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the assembled Remote namespaces (ctx.remote.llm).
import type {} from '@deepseek-ai/dsh-api-remotes/client'
// Type-only: pulls the ui-conversation SlotMap merge (the composer.dock entry the live cost bar rides).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { UsageBilling, type ModelHealth, type UsageBillingInjected } from './UsageBilling.tsx'
import type { CatalogModel } from './pricing.ts'
import { LiveCostBar } from './live-cost.tsx'
import { en, NS, zh, type UsageBillingKey } from './locales.ts'
import { createBillingMetrics, type BillingMetricsService } from './billing-service.ts'
import { createBillingBudgetStore } from './budget-store.ts'
import { installCompletionNotifier, loadNotifyConfig } from './completion-notify.ts'

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
export const inject = ['slots', 'locale', 'remote', 'remote.llm', 'sessions']

/**
 * Client plugin body: the UsageBilling entry in the sidebar footer.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
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
        // 0.1.2 的 Remote 面不再有聚合 llm.models：先取活跃路由，再按可配置
        // 目录逐项 discoverModels。已知 provider 走适配器本地目录，不额外打网络。
        try {
          const [registered, configurable] = await Promise.all([
            ctx.remote.llm.listProviders(),
            ctx.remote.llm.listConfigurableProviders(),
          ])
          if (!registered.ok || !configurable.ok) {
            return { checked: true, available: false, models: 0, failures: 0, okProviders: [], badProviders: [] }
          }
          const declarations = new Map(configurable.value.map(entry => [entry.provider, entry]))
          const probes = await Promise.all(registered.value.map(async provider => {
            const declaration = declarations.get(provider.id)
            // 活跃但未声明配置入口的路由仍可判定在线；新 Remote 面没有其模型目录地址。
            if (declaration === undefined) return { provider, models: [] }
            const discovered = await ctx.remote.llm.discoverModels(declaration.settingsNs, { provider: provider.id })
            return discovered.ok
              ? { provider, models: discovered.value }
              : { provider, failed: true as const }
          }))
          const catalog: CatalogModel[] = []
          const okProviders: string[] = []
          const badProviders: string[] = []
          let models = 0
          for (const probe of probes) {
            if ('failed' in probe) {
              badProviders.push(probe.provider.name)
              continue
            }
            okProviders.push(probe.provider.name)
            models += probe.models.length
            for (const model of probe.models) {
              catalog.push({
                id: model.id,
                ...(typeof model.name === 'string' && model.name !== '' ? { name: model.name } : {}),
                provider: probe.provider.name,
              })
            }
          }
          return {
            checked: true,
            available: okProviders.length > 0,
            models,
            failures: badProviders.length,
            okProviders,
            badProviders,
            catalog,
          }
        } catch {
          return { checked: true, available: false, models: 0, failures: 0, okProviders: [], badProviders: [] }
        }
      },
      publishCosts: (costs) => { metrics.publishCosts(costs) },
      registerOpen: handler => metrics.registerOpen(handler),
    }),
  }, UsageBilling))

  // 即时代费用条：挂在会话 composer 的 dock（stats-line 家族座位），随输入框
  // 常驻显示当前会话累计费用与最新一轮费用，无需打开完整仪表盘。
  // 组件经框架标准 kit 注入 sessionId，与 StatsLine 同姿态。
  // 用 inject 往宿主（ui-conversation）已声明的 composer.dock 注入条目，而非 register 声明。
  ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
    name: 'conversation.composer.dock',
    id: 'usage-billing-cost',
    order: 0,
    locale: NS,
  }, LiveCostBar))

  // 对话完成提醒：会话 running→completed 迁移时弹一条桌面通知（默认关闭，
  // 用户到面板设置开启）。配置持久化在 localStorage，跨 tab 由 notifier 去重。
  ctx.effect(() => {
    // sessions 服务在 runtime 全局 provide：apply 期可直接订阅会话列表快照。
    return installCompletionNotifier(ctx.sessions.list, loadNotifyConfig)
  }, 'ui-usage-billing: completion notifier')
}
