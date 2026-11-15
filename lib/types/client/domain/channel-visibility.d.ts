/**
 * 通道可见性（issue #126 需求）：按**通道桶**隐藏部分提供商 / 通道。
 *
 * 报告者场景：通道一多（官方、直连、几个中转、未知路由）时账单列表很长，希望
 * 在设置里勾掉不常看的几个，只留常看的通道。
 *
 * 口径与边界（写死在这里，避免各视图各算一套）：
 * - **过滤粒度 = 通道桶 key**（`site:<origin>` / `direct:<provider>` / `unknown`），
 *   不是显示名——显示名随界面语言变（中英），桶 key 稳定，偏好能跨语言沿用。
 * - **只扣可归属的用量**：隐藏通道的用量从 total / byDay / byDayModels /
 *   byModel / bySite / byDayModelsSite 中扣除；**无法归属通道的用量保留**
 *   （旧格式会话的账本行没有三维维度，无从判断属于哪个通道——宁可多算，
 *   不可静默丢数）。
 * - **无通道维度的维度保持全量口径**：会话 / 工具 / 角色 / 工作区 / 性能 /
 *   峰谷等没有通道切分，隐藏通道不影响它们；界面需注明这一口径差。
 * - 三维数据缺失（旧快照）时**整体不生效**：没有可归属数据就无从过滤，
 *   此时按未过滤渲染，而不是把用量显示成 0。
 */
import type { UsageStats } from './types.ts';
/** 一个通道桶的用量汇总（全量日期）。 */
export interface ChannelUsage {
    /** 通道桶 key（`site:<origin>` / `direct:<provider>` / `unknown`）。 */
    siteKey: string;
    calls: number;
    input: number;
    output: number;
    cacheHit: number;
    cacheMiss: number;
    cost: number;
}
/**
 * 汇总各通道桶的用量（全量日期，按费用降序；同费用按桶 key 稳定排序）。
 * @param stats - usage-stats 文档（读 byDayModelsSite 三维格）。
 * @returns 每个通道桶一行；无三维数据时返回空数组。
 */
export declare function channelUsageOf(stats: UsageStats): readonly ChannelUsage[];
/**
 * 按显示名归并的通道分组（同名多桶合并：直连与官方同名的两个桶归一行）。
 */
export interface ChannelGroup {
    /** 显示名（界面语言下的通道名；未知路由由渲染层兜底文案）。 */
    name: string;
    /** 组内全部通道桶 key —— 隐藏任一即整组隐藏（用户看到的是「这个名字」）。 */
    siteKeys: readonly string[];
    calls: number;
    /** 组内 token 合计（输入 + 输出）。 */
    tokens: number;
    cost: number;
}
/**
 * 把通道桶按显示名归并成组（同名多桶合并），按费用降序。
 * @param rows - 通道桶用量（channelUsageOf 的产物）。
 * @param nameOf - 桶 key → 显示名的解析函数（界面语言相关）。
 * @returns 通道分组列表。
 */
export declare function groupChannelsByName(rows: readonly ChannelUsage[], nameOf: (siteKey: string) => string): readonly ChannelGroup[];
/**
 * 按隐藏通道过滤统计文档。
 *
 * 扣除隐藏通道在 total / byDay / byDayModels / byModel / bySite /
 * byDayModelsSite 中的用量；无通道维度的维度（会话 / 工具 / 角色 / 工作区 /
 * 性能 / 峰谷 / reasoning / 官方口径）保持全量。三维数据缺失时整体原样返回。
 * @param stats - 原始统计文档。
 * @param hidden - 隐藏的通道桶 key 集合。
 * @returns 过滤后的统计文档（未命中任何隐藏通道时返回原对象引用）。
 */
export declare function filterStatsByChannels(stats: UsageStats, hidden: ReadonlySet<string>): UsageStats;
//# sourceMappingURL=channel-visibility.d.ts.map