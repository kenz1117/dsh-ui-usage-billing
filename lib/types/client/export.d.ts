/**
 * 数据导出：把用量统计导出为 CSV / JSON 供对账。
 *
 * 纯函数生成文本（按日 / 按会话两个视角），DOM 下载副作用单独隔离在
 * `downloadText`；金额一律人民币元（与聚合口径一致），文件名带日期范围。
 */
/** 按日聚合行（与 UsageStatsDocument.byDay 的行同形）。 */
export interface DayExportRow {
    calls: number;
    input: number;
    output: number;
    cacheHit: number;
    cacheMiss: number;
    cost: number;
}
/** 会话导出行（与 SessionUsageRow 同形，结构化声明避免跨文件引用）。 */
export interface SessionExportRow {
    id: string;
    title?: string;
    cwd?: string;
    calls: number;
    cost: number;
    lastActive: number;
}
/** 按日 CSV：日期,调用,输入,输出,缓存命中,缓存未命中,费用(元)。 */
export declare function dayRowsCsv(byDay: Record<string, DayExportRow>): string;
/** 按会话 CSV：会话 id,标题,项目,调用,费用(元),最后活跃(ISO)。 */
export declare function sessionRowsCsv(rows: readonly SessionExportRow[]): string;
/** 导出文件名：带日期范围（usage-2026-08-01_2026-08-22.csv）；无日期时只带前缀。 */
export declare function exportFileName(prefix: string, ext: 'csv' | 'json', dates: readonly string[]): string;
/** 触发浏览器下载（唯一 DOM 副作用；调用方在 click 手势里使用）。 */
export declare function downloadText(filename: string, text: string, mime: string): void;
//# sourceMappingURL=export.d.ts.map