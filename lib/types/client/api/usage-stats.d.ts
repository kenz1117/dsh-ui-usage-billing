/**
 * GET /api/billing/usage-stats：服务端聚合文档（含 byDay/byModel/bySession/...）。
 * 旧快照可能缺字段（聚合升级前落盘），解析时按字段白名单接受并兜底——避免
 * 渲染路径读 undefined 抛错导致整个插件 surface 被卸载。
 *
 * 取数失败不再吞成空文档（issue #119）：此前任何失败（非 2xx / 非 JSON /
 * 超时）都返回 null，面板于是把「没取到」渲染成「用量是 0」——用户看到一片
 * ¥0 却无从判断是没用还是没读到。现在失败带着原因（服务端错误文案 / HTTP
 * 状态 / 异常信息）返回，由界面显示成错误态。
 */
import type { UsageStats } from '../domain/types.ts';
/** Path to the usage-stats endpoint served by this plugin's node half. */
export declare const USAGE_STATS_PATH = "/api/billing/usage-stats";
/** 取数结果：成功带文档；失败带可展示的原因。 */
export type UsageStatsLoad = {
    ok: true;
    stats: UsageStats;
} | {
    ok: false;
    reason: string;
    status?: number;
};
/** 取统计文档；失败时带原因（不再静默返回 null）。 */
export declare function loadUsageStats(): Promise<UsageStatsLoad>;
//# sourceMappingURL=usage-stats.d.ts.map