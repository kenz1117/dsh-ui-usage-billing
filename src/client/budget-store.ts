/**
 * 预算偏好 store：本月预算的开关与金额。
 *
 * 用户在仪表盘里用开关控制预算条显隐、用数字输入框设置金额；状态经框架
 * store 引擎持久化到 localStorage（persist key 即存储身份），重启后保留。
 * 宿主 Config 的 monthlyBudget 仅作为金额未设置时的默认值，用户输入优先。
 */

import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client'

/** 预算偏好状态。 */
export interface BudgetPrefsState {
  /** 预算条开关：关 = 只显示标题行与开关，不显示进度。 */
  enabled: boolean
  /** 用户设置的月度预算（人民币元）；0 = 未设置（回退到宿主默认值）。 */
  amount: number
  /** 最近一次超支通知的日期戳（YYYY-MM-DD）：超支通知每天最多一次，跨重启生效。 */
  lastAlertDay: string
  /** 最近一次余额不足通知的日期戳（YYYY-MM-DD）：余额告警同样每天最多一次。 */
  lastBalanceAlertDay: string
}

/** 预算偏好的完整写面（组件只能经这些 action 写入）；type 别名以兼容 ActionsDecl 的索引签名约束。 */
export type BudgetPrefsActions = {
  setEnabled: (d: BudgetPrefsState, on: boolean) => void
  setAmount: (d: BudgetPrefsState, value: number) => void
  markAlerted: (d: BudgetPrefsState, day: string) => void
  markBalanceAlerted: (d: BudgetPrefsState, day: string) => void
}

/**
 * Declare the budget-preferences store handle.
 * @returns the store handle for the register call's store seat.
 */
export function createBillingBudgetStore(): EngineStoreHandle<BudgetPrefsState, BudgetPrefsActions> {
  return defineStore({
    init: (): BudgetPrefsState => ({ enabled: false, amount: 0, lastAlertDay: '', lastBalanceAlertDay: '' }),
    persist: 'dsh.ui-usage-billing.budget',
    actions: {
      setEnabled: (d, on) => { d.enabled = on },
      // 负数无意义，归零视为未设置（回退宿主默认值）。
      setAmount: (d, value) => { d.amount = Number.isFinite(value) && value > 0 ? value : 0 },
      markAlerted: (d, day) => { d.lastAlertDay = day },
      markBalanceAlerted: (d, day) => { d.lastBalanceAlertDay = day },
    },
  })
}
