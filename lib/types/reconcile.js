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
/** 余额差对账阈值下限（元）：消费低于该值时不值得提示，避免小金额波动刷屏。 */
const MIN_DRIFT_ABS = 0.3;
/** 余额差相对容忍度：偏差超过较大一方的该比例才判漂移。 */
const DRIFT_RELATIVE = 0.15;
/**
 * 归一化一个余额快照中的数值；非有限/缺失返回 0（对账只用其差值，0 安全）。
 * @param value - 待归一化的数值。
 */
function num(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
/**
 * 由本次余额查询与上一基准推出一份新的基准快照（用于下一次对账）。
 * @param ref - 上一基准片段（date / currency / at）。
 * @param balance - 本次余额查询结果。
 * @param nowMs - 当前时刻。
 */
function snapOf(ref, balance, nowMs) {
    return {
        date: ref.date,
        total: num(balance.totalBalance),
        granted: num(balance.grantedBalance),
        topped: num(balance.toppedUpBalance),
        currency: typeof balance.currency === 'string' ? balance.currency : ref.currency,
        at: nowMs,
    };
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
export function reconcileBalanceDelta(prevRef, balance, todayOfficialCost, dayKey, nowMs) {
    const total = balance.totalBalance;
    if (typeof total !== 'number' || !Number.isFinite(total)) {
        return { ref: prevRef, event: null };
    }
    const snap = snapOf({ date: dayKey, currency: prevRef?.currency ?? '' }, balance, nowMs);
    // 新的一天（或首次/基准形状异常）：只打基准，不对账。
    if (prevRef === null || prevRef.date !== dayKey) {
        return { ref: snap, event: { kind: 'baseline' } };
    }
    // 币种变化：金额不可比，重置基准（防止不同币种误读产生虚高漂移）。
    if (prevRef.currency !== snap.currency) {
        return { ref: snap, event: { kind: 'structure-reset' } };
    }
    // 充值/授信只会让分项余额增加（消费只会减少）：分项变大则旧基准失效，重置不告警。
    if (snap.granted > prevRef.granted + 0.009 || snap.topped > prevRef.topped + 0.009) {
        return { ref: snap, event: { kind: 'structure-reset' } };
    }
    const spent = prevRef.total - snap.total;
    // 余额未减少：无法对账（可能整天走订阅扣费），静默。
    if (spent <= 0.009) {
        return { ref: prevRef, event: { kind: 'flat' } };
    }
    const cost = num(todayOfficialCost);
    const dev = Math.abs(spent - cost);
    const threshold = Math.max(MIN_DRIFT_ABS, DRIFT_RELATIVE * Math.max(spent, cost));
    if (dev > threshold) {
        return { ref: prevRef, event: { kind: 'drift', spent, todayOfficialCost: cost } };
    }
    // ok/drift 都保留当日首次基准，后续拉取继续与早间基线比对。
    return { ref: prevRef, event: { kind: 'ok', spent, todayOfficialCost: cost } };
}
//# sourceMappingURL=reconcile.js.map