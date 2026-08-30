/**
 * TokenPanel: 「Token」分区——把 token 从费用里独立出来洞察。
 * 四个板块 + 导出，全部由 `UsageStats` 派生，服务端零改动：
 *  1. 每日 Token 趋势，双视角切换（7/30 天）：
 *     - 按结构：未命中输入 / 缓存命中 / 输出[含 reasoning] 三桶堆叠；
 *     - 按模型：每天按模型堆叠，段 = 该模型当日「模型总 Token」（输入[含命中] + 输出），
 *       分色复用趋势页 `chartModels`（同模型同色跨页一致）；
 *       旧快照缺 `byDayModels` 时隐藏切换钮，仅保留结构视角。
 *     悬停显示当日精确明细；图例 / 「模型 Token」表格行可点击聚焦单个模型
 *     （目标段保持原色，其余段弱化，y 轴不变）。
 *     归因边界：reasoning 无按日 × 模型明细（`byDayModels` 无该字段），图与导出不含此列。
 *  2. 模型 Token 总量排行 + 占比（行点击 = 聚焦该模型并切到按模型视角）；
 *  3. Token 结构 KPI（缓存命中率 / reasoning 占比 / 输入:输出比 / 峰值日）+ 显式缓存写入；
 *  4. 工具调用排行（byTool 计次；token 无法按工具归因）。
 */
import type { UsageBillingKey } from './locales.ts';
import type { TrendSeriesModel } from './TrendChart.tsx';
import type { UsageStats } from './UsageBilling.tsx';
/** 每日 token 堆叠图元（按结构视角）。 */
interface DailyBucket {
    date: string;
    miss: number;
    hit: number;
    output: number;
    reasoning: number;
}
/** 按模型视角下某模型某日的 token 明细（`byDayModels` 无 reasoning 列）。 */
interface ModelDayCell {
    hit: number;
    miss: number;
    output: number;
    /** 命中 + 未命中 + 输出（= 模型总 Token 口径）。 */
    total: number;
}
/** 按模型视角的一天：各模型段 + 当日合计。 */
interface DayModelsRow {
    date: string;
    models: Record<string, ModelDayCell>;
    total: number;
}
/** 模型 token 行。 */
interface ModelTokenRow {
    key: string;
    name: string;
    input: number;
    output: number;
    reasoning: number;
    calls: number;
    cacheHit: number;
    cacheMiss: number;
    cacheHitRate: number;
    total: number;
    /** 占总 token 比例（0..1）。 */
    share: number;
}
/** 导出全量 JSON 文档：按日结构 + 模型排行 + 按日×模型明细 + 总量（无 reasoning 列）。 */
export declare function tokenDailyJson(days: readonly DailyBucket[], models: readonly ModelTokenRow[], dayModels: readonly DayModelsRow[], total: UsageStats['total']): string;
/**
 * Token 洞察面板。
 * @param props.stats - usage-stats 文档（byDay/byModel/byDayModels/total）。
 * @param props.trendDays - 每日 token 窗口（7/30 天）。
 * @param props.onTrendDays - 切换趋势窗口。
 * @param props.models - 趋势页同款模型图例（key/name/色）：按模型视角的分色来源；缺省用兜底灰。
 */
export declare function TokenPanel(props: {
    stats: UsageStats;
    trendDays: 7 | 30;
    onTrendDays: (d: 7 | 30) => void;
    models?: readonly TrendSeriesModel[];
    t: (key: UsageBillingKey) => string;
}): React.ReactNode;
export {};
//# sourceMappingURL=TokenPanel.d.ts.map