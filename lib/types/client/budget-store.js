/**
 * 预算偏好 store：本月预算的开关与金额。
 *
 * 用户在仪表盘里用开关控制预算条显隐、用数字输入框设置金额；状态经框架
 * store 引擎持久化到 localStorage（persist key 即存储身份），重启后保留。
 * 宿主 Config 的 monthlyBudget 仅作为金额未设置时的默认值，用户输入优先。
 */
import { defineStore } from '@deepseek-ai/dsh-client-runtime/client';
/**
 * Declare the budget-preferences store handle.
 * @returns the store handle for the register call's store seat.
 */
export function createBillingBudgetStore() {
    return defineStore({
        init: () => ({ enabled: false, amount: 0, tierAlertDays: {}, lastBalanceAlertDay: '', lastTierSwitchAt: 0 }),
        persist: 'dsh.ui-usage-billing.budget',
        actions: {
            setEnabled: (d, on) => { d.enabled = on; },
            // 负数无意义，归零视为未设置（回退宿主默认值）。
            setAmount: (d, value) => { d.amount = Number.isFinite(value) && value > 0 ? value : 0; },
            // 一次把多个档位标记为当日已提醒（旧持久化状态可能缺该字段，就地补空表）。
            markTierAlerted: (d, tiers, day) => {
                d.tierAlertDays ??= {};
                for (const tier of tiers)
                    d.tierAlertDays[String(tier)] = day;
            },
            markBalanceAlerted: (d, day) => { d.lastBalanceAlertDay = day; },
            markTierSwitchAlerted: (d, at) => { d.lastTierSwitchAt = at; },
        },
    });
}
//# sourceMappingURL=budget-store.js.map