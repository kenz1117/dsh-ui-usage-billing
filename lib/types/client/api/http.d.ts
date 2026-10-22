/**
 * 插件自有端点（/api/billing/*）的统一取数封装：超时底座。
 *
 * 背景（issue #104）：浏览器对同源最多 6 条并发连接，而旧实现里所有 fetch
 * 都没有超时——服务端某次响应被上游查询拖住（报告者实测 45~60s）时，这条
 * 连接会被长期占住；多标签页各挂一条即占满连接池，宿主自己的资源请求排队，
 * 用户看到的是「整个 DSH 界面卡死」。
 *
 * 超时上限必须小于轮询间隔（30s），否则「超时中的请求」会与下一轮轮询重叠，
 * 在途请求越堆越多。
 */
/**
 * 客户端取插件端点的默认超时（毫秒）：小于 30s 轮询间隔，保证不与下一轮重叠。
 *
 * 取 12s：服务端三条轮询路由的总预算都是 8s（余额 / 订阅额度 / 中转站额度），
 * usage-stats 是 1.5s——12s 给服务端留了 4s 余量，又远小于 30s 的轮询间隔，
 * 超时的请求不会与下一轮重叠（issue #104 报告者建议值同为 12s）。
 */
export declare const BILLING_FETCH_TIMEOUT_MS = 12000;
/** 取数选项：在标准 RequestInit 之上加一个超时覆盖。 */
export interface BillingFetchInit extends RequestInit {
    /** 超时（毫秒）；缺省 {@link BILLING_FETCH_TIMEOUT_MS}。 */
    timeoutMs?: number;
}
/**
 * 带超时的 fetch（插件端点专用）。
 *
 * 超时以 AbortController 实现（不用 AbortSignal.timeout）：宿主 UI 跑在
 * 浏览器里，但插件的客户端代码也会被测试与宿主内嵌环境加载，显式
 * AbortController 在任何实现上都可用。
 * @param path - 端点路径（相对当前源）。
 * @param init - 请求选项；`timeoutMs` 覆盖默认超时，`signal` 透传外部取消。
 * @returns the response; rejects when the request times out or fails.
 */
export declare function fetchBilling(path: string, init?: BillingFetchInit): Promise<Response>;
//# sourceMappingURL=http.d.ts.map