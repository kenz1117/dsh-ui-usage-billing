/**
 * 预算偏好 store：本月预算的开关与金额。
 *
 * 用户在仪表盘里用开关控制预算条显隐、用数字输入框设置金额；状态经框架
 * store 引擎持久化到 localStorage（persist key 即存储身份），重启后保留。
 * 宿主 Config 的 monthlyBudget 仅作为金额未设置时的默认值，用户输入优先。
 */

import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-store'

/** 预算偏好状态。 */
export interface BudgetPrefsState {
  /** 预算条开关：关 = 只显示标题行与开关，不显示进度。 */
  enabled: boolean
  /** 用户设置的月度预算（人民币元）；0 = 未设置（回退到宿主默认值）。 */
  amount: number
  /** 各档提醒的最后通知日期戳（档位百分比字符串 → YYYY-MM-DD）：每档每天最多一次。 */
  tierAlertDays: Record<string, string>
  /** 最近一次余额不足通知的日期戳（YYYY-MM-DD）：余额告警同样每天最多一次。 */
  lastBalanceAlertDay: string
  /** 最近一次峰谷切换提醒的切换点时刻（毫秒）：同一切换点只提醒一次。 */
  lastTierSwitchAt: number
}

/** 预算偏好的完整写面（组件只能经这些 action 写入）；type 别名以兼容 ActionsDecl 的索引签名约束。 */
export type BudgetPrefsActions = {
  setEnabled: (d: BudgetPrefsState, on: boolean) => void
  setAmount: (d: BudgetPrefsState, value: number) => void
  markTierAlerted: (d: BudgetPrefsState, tiers: readonly number[], day: string) => void
  markBalanceAlerted: (d: BudgetPrefsState, day: string) => void
  markTierSwitchAlerted: (d: BudgetPrefsState, at: number) => void
}

/**
 * Declare the budget-preferences store handle.
 * @returns the store handle for the register call's store seat.
 */
export function createBillingBudgetStore(): EngineStoreHandle<BudgetPrefsState, BudgetPrefsActions> {
  return defineStore({
    init: (): BudgetPrefsState => ({ enabled: false, amount: 0, tierAlertDays: {}, lastBalanceAlertDay: '', lastTierSwitchAt: 0 }),
    persist: 'dsh.ui-usage-billing.budget',
    actions: {
      setEnabled: (d, on) => { d.enabled = on },
      // 负数无意义，归零视为未设置（回退宿主默认值）。
      setAmount: (d, value) => { d.amount = Number.isFinite(value) && value > 0 ? value : 0 },
      // 一次把多个档位标记为当日已提醒（旧持久化状态可能缺该字段，就地补空表）。
      markTierAlerted: (d, tiers, day) => {
        d.tierAlertDays ??= {}
        for (const tier of tiers) d.tierAlertDays[String(tier)] = day
      },
      markBalanceAlerted: (d, day) => { d.lastBalanceAlertDay = day },
      markTierSwitchAlerted: (d, at) => { d.lastTierSwitchAt = at },
    },
  })
}
