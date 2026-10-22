/**
 * GET /api/billing/balance：余额 + 对账提示（同一响应体）。30s 轮询单端点
 * 比拆成两个端点更省（余额查询本身已有熔断与重试），失败回退空值。
 */
import type { ProviderBalance, ReconcileNotice } from '../../pricing-shared.ts';
/** Path to the account-balance endpoint served by this plugin's node half. */
export declare const BALANCE_PATH = "/api/billing/balance";
/** 余额文档（服务端响应体的白名单切片）。 */
export interface BalanceDocSlice {
    balances: readonly ProviderBalance[];
    reconcile?: ReconcileNotice;
    /** 服务端刷新超预算：本次余额来自上一次成功的查询（issue #104）。 */
    stale?: boolean;
}
/**
 * 一次拉取 `/api/billing/balance` 的完整响应（余额行 + 对账提示）。余额与对账
 * 提示来自同一响应体，拆成两个函数会导致每 30 秒对同一端点发两次请求，故合并
 * 为单次 fetch；失败返回空值（余额 []、对账 undefined），由调用方降级。
 * @returns the balances and reconcile notice (both degraded on any failure).
 */
export declare function fetchBalanceDoc(): Promise<BalanceDocSlice>;
/**
 * 拉取官方余额差对账提示（drift 时非空），供余额面板展示；失败返回 undefined。
 * 复用 {@link fetchBalanceDoc} 的同一响应，导出供对账提示渲染测试单独解析。
 * @returns the reconcile notice, or undefined on any failure / no drift.
 */
export declare function fetchReconcile(): Promise<ReconcileNotice | undefined>;
//# sourceMappingURL=balance.d.ts.map