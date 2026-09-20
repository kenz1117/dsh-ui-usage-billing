/**
 * 费率表搜索：目录 + models.dev 补充条目约 3000 行，无过滤时只能靠滚动定位
 * 单个模型（issue #66）。判定抽成纯函数，便于无 DOM 单测；匹配目录键、显示名
 * 与厂商三个字段，大小写不敏感，空查询原样返回（默认视图与现状一致）。
 */
/** 搜索可匹配的最小条目形状（ModelEntry 的子集，便于测试构造）。 */
export interface SearchableEntry {
    key: string;
    name?: string;
    provider?: string;
}
/**
 * 按查询过滤费率表行。
 * @param entries - 待过滤的目录条目。
 * @param query - 用户输入（首尾空白忽略）。
 * @returns 命中的条目；查询为空/全空白时原样返回入参引用。
 */
export declare function filterRateRows<T extends SearchableEntry>(entries: readonly T[], query: string): readonly T[];
//# sourceMappingURL=rate-search.d.ts.map