/**
 * 路由：GET /api/billing/balance
 *
 * 多平台余额（DeepSeek / Kimi / StepFun / SiliconFlow / xAI / 智谱 / 腾讯云
 * TokenHub 等）+ 用户自定义余额 + 声明端点 + 余额差对账。5 分钟缓存（避免
 * 每 30s 后台轮询打上游），in-flight 去重（并发请求共享同一次进行中的刷新）。
 *
 * 路由文件只关心 HTTP 缓存逻辑：5 分钟过期判定 + 刷新预算（超预算回旧
 * 缓存并标 stale，不把响应挂在长查询上）+ 失败时仍发旧缓存（不挂起已
 * writeHead 的响应）。上游查询（queryBalances / queryCustomBalances /
 * queryDeclaredEndpoints / reconcileBalanceDelta）在装配器里跑，路由只通过
 * `cached()` 与 `refreshOnce()` 拿到结果。
 */
import type { Context } from '@deepseek-ai/cordis';
import type { ProviderBalance } from '../pricing-shared.ts';
import type { ReconcileEvent } from '../reconcile.ts';
/** 余额响应体形状（来自装配器 `balanceCache.doc`）。 */
export interface BalanceDoc {
    balances: readonly ProviderBalance[];
    reconcile?: ReconcileEvent;
    /**
     * 本次余额来自上一次成功的查询（刷新超预算，见 {@link BalanceDeps.responseBudgetMs}）。
     * 客户端据此提示「余额数据来自上次查询」，别把旧值当最新读。
     */
    stale?: boolean;
}
interface CachedBalance {
    doc: BalanceDoc;
    at: number;
}
/** 路由依赖。 */
export interface BalanceDeps {
    trustedHosts: ReadonlySet<string>;
    /** 装配器内缓存 + 时间戳（`Date.now()`）。 */
    cached: () => CachedBalance;
    /** in-flight 去重的刷新入口。 */
    refreshOnce: () => Promise<void>;
    /** 5 分钟缓存间隔（毫秒）。 */
    cacheMs: number;
    /**
     * 刷新的总等待预算（毫秒）：超预算立刻回上一次成功的余额。
     *
     * 存在的理由（issue #104）：浏览器对同源最多 6 条并发连接，而余额响应被
     * 上游查询（最坏 8s 超时 × 重试）拖住时，这条连接会被长期占住；多标签页
     * 各挂一条即占满连接池，宿主自己的资源请求排队——用户看到的是「整个 DSH
     * 界面卡死」。预算到期后刷新在后台继续（in-flight 去重共享同一次刷新），
     * 下一轮轮询即可拿到新值。
     */
    responseBudgetMs: number;
}
export declare function registerBalanceRoute(ctx: Context, deps: BalanceDeps): void;
export {};
//# sourceMappingURL=balance.d.ts.map