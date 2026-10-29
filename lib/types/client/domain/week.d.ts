/**
 * 周/7天窗口聚合：KPI 范围求和、自然周累计（issue #39 口径）、近 7 天费用序列。
 * 纯函数（日期取本地时区），无 React 依赖。`KpiDayRow` 是 byDay 行的最小字段，
 * `dayTokensOf` 在 `streak.ts` 内已抽出，复用同口径。
 */
import type { AvgCostRange, KpiAgg, KpiDayRow } from './types.ts';
/**
 * 近 7 天费用序列（含今天，缺日补 0）：触发卡 hover 速览的迷你柱数据源。
 * 导出供测试：纯函数（日期取本地时区）。
 * @param byDay - 按日费用表。
 * @returns 7 个 `{ date, cost }`，最旧在前。
 */
export declare function lastSevenDays(byDay: Record<string, {
    cost: number;
}>): readonly {
    date: string;
    cost: number;
}[];
/**
 * 本自然周（周一起算）到 `today` 的累计值（issue #39）：标签「本周」的语义是
 * 自然周，近 7 天滚动窗口会在周一把上周用量卷进来（周一时它与当月几乎相等，
 * 用户误解为统计错误）。周一 = `getDay() === 1`；`pick` 决定日行取哪个维度。
 * @param byDay - 按日聚合表（key = `YYYY-MM-DD` 本地时区）。
 * @param today - 今天的本地日期戳。
 * @param pick - 日行取值（缺省取 cost；token 视角传 input+output 合计）。
 * @returns 本周一到今天的合计；`today` 本身不在表里（无调用）时为 0。
 */
export declare function sinceMondayOf<T>(byDay: Record<string, T>, today: string, pick?: (row: T) => number): number;
/**
 * 按范围聚合 byDay（issue #47）：今日 / 近 7 天（含今天）/ 本周（周一起）/
 * 本月。日期戳字典序即时间序（与 dailyBurnRate 同口径）；累计口径由调用方
 * 直接取 total（含搜索估值兜底），不走此函数。
 */
export declare function sumByDayRange(byDay: Record<string, KpiDayRow>, today: string, range: Exclude<AvgCostRange, 'all' | 'custom'>): KpiAgg;
/** 自定义本地日期范围：起止日均完整包含，字典序边界与 byDay 键一致。 */
export declare function sumByDayCustomRange(byDay: Record<string, KpiDayRow>, start: string, end: string): KpiAgg;
//# sourceMappingURL=week.d.ts.map