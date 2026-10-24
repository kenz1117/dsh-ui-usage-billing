/**
 * 本月预计 / 日均消耗（issue #47）：按日均外推本月总花费；余额可撑天数也复用。
 * 纯函数（日期取本地时区），无 React 依赖。导出供测试。
 */
/**
 * 日均消耗（元/天）：取最近 7 天（含今天）总花费 ÷ 有记录天数；无记录返回 0
 * （此时可用天数无法估算，调用方不显示天数提示）。日期戳字典序即时间序。
 */
export declare function dailyBurnRate(byDay: Record<string, {
    cost: number;
}>, today: string): number;
/**
 * 本月预计总花费：**已发生 + 近 7 天节奏 × 本月剩余天数**。
 *
 * 口径变更（2026-10-23）：旧口径拿「本月有记录的天数」当分母求日均再乘整月天数，
 * 稀疏使用的月份会被放大数倍——实测一个只有 4 天记录、其余 19 天没用的月份被外推
 * 成实际值的 4 倍（¥3.4 → ¥15.0 的旧算法给 ¥572.9）。新口径只外推「还没发生的
 * 那些天」，且节奏基准取近 7 个自然日（含空闲天）：近期没花钱就不虚增。
 *
 * 无本月记录时回退为最近 7 天（活跃天）日均 × 剩余天数；无任何记录时返回 0。
 * 导出供测试：纯函数，不依赖组件。
 * @param byDay - 按日费用表。
 * @param monthPrefix - 本月前缀（YYYY-MM）。
 * @param today - 今日日期戳（YYYY-MM-DD）。
 * @returns 本月预计花费（人民币元）；无数据时为 0。
 */
export declare function projectMonthCost(byDay: Record<string, {
    cost: number;
}>, monthPrefix: string, today: string): number;
//# sourceMappingURL=forecast.d.ts.map