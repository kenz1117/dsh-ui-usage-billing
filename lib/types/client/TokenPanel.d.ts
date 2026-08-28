/**
 * TokenPanel: 「Token」分区——把 token 从费用里独立出来洞察。
 * 四个板块 + 导出，全部由 `UsageStats` 派生，服务端零改动：
 *  1. 每日 Token 堆叠趋势（未命中输入 / 缓存命中 / 输出[含 reasoning]），7/30 天切换；
 *  2. 模型 Token 总量排行 + 占比；
 *  3. Token 结构 KPI（缓存命中率 / reasoning 占比 / 输入:输出比 / 峰值日）+ 显式缓存写入；
 *  4. 工具调用排行（byTool 计次；token 无法按工具归因）。
 */
import type { UsageBillingKey } from './locales.ts';
import type { UsageStats } from './UsageBilling.tsx';
/**
 * Token 洞察面板。
 * @param props.stats - usage-stats 文档（byDay/byModel/total）。
 * @param props.trendDays - 每日 token 窗口（7/30 天）。
 * @param props.onTrendDays - 切换趋势窗口。
 */
export declare function TokenPanel(props: {
    stats: UsageStats;
    trendDays: 7 | 30;
    onTrendDays: (d: 7 | 30) => void;
    t: (key: UsageBillingKey) => string;
}): React.ReactNode;
//# sourceMappingURL=TokenPanel.d.ts.map