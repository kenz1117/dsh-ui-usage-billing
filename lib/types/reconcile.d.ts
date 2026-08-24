/**
 * 余额差交叉校验（reconcile）：用官方账户余额当日变动反推消费，与本地账本
 * 的当日官方费用比对。若二者偏差超阈值，提示用户核对价格表或近期账单——
 * 这是让计费数据可信的兜底机制，也是对账的稳定锚点。
 *
 * 只对官方直连渠道（DeepSeek 官方）对账：订阅 / Coding Plan / 第三方中转的
 * 消费不动官方余额，强行用余额差替代今日费用会把订阅用户全天的消费归零。
 * 充值、授信、币种变化都会让旧基准失去可比性，此时重置基准而非告警。
 *
 * 纯函数：输入上一基准与本次余额查询结果，输出新基准与对账事件，可独立单测。
 */
/** 对账基准快照：上次余额查询时的官方账户状态，用于反推当日消费。 */
export interface BalanceRef {
    /** 本地日期键（YYYY-MM-DD）。 */
    date: string;
    /** 当日总余额。 */
    total: number;
    /** 未过期赠金。 */
    granted: number;
    /** 充值余额。 */
    topped: number;
    /** 余额币种（CNY / USD）。 */
    currency: string;
    /** 打基准时刻（epoch ms）。 */
    at: number;
}
/** 一次对账的结果类别。 */
export type ReconcileKind = 'baseline' | 'structure-reset' | 'flat' | 'ok' | 'drift';
/** 对账事件：`ok`/`drift`/`flat` 携带有意义的结果，`baseline`/`structure-reset` 仅为无消费的基准刷新。 */
export interface ReconcileEvent {
    kind: ReconcileKind;
    /** 余额提供商显示名（如 DeepSeek）；仅 `ok`/`drift`。 */
    provider?: string;
    /** 按余额差反推的当日消费（CNY/USD 按余额币种）；仅 `ok`/`drift`。 */
    spent?: number;
    /** 本地账本当日的官方渠道费用；仅 `ok`/`drift`。 */
    todayOfficialCost?: number;
}
/** 余额查询结果的最小视图（对账只关心这三个分项与币种）。 */
interface BalanceSnapshot {
    totalBalance?: number;
    grantedBalance?: number;
    toppedUpBalance?: number;
    currency?: string;
}
/**
 * 对账：用官方余额当日变动反推消费，与本地账本当日官方费用比对。
 * @param prevRef - 上一基准（可为 null，表示首次/基准缺失）。
 * @param balance - 本次余额查询结果。
 * @param todayOfficialCost - 本地账本当日的官方渠道费用（CNY）。
 * @param dayKey - 本地日期键（YYYY-MM-DD）。
 * @param nowMs - 当前时刻（epoch ms）。
 * @returns 新基准与对账事件；余额不可用（无 totalBalance）时返回 `{ ref: prevRef, event: null }`。
 */
export declare function reconcileBalanceDelta(prevRef: BalanceRef | null, balance: BalanceSnapshot, todayOfficialCost: number, dayKey: string, nowMs: number): {
    ref: BalanceRef | null;
    event: ReconcileEvent | null;
};
export {};
//# sourceMappingURL=reconcile.d.ts.map