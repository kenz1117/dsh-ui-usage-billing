/**
 * LiveCostBar: the session-scope cost ticker mounted on the composer's dock,
 * showing the current session's accumulated spend and the latest turn's cost.
 *
 * It rides `conversation.composer.dock` (the stats-line family seat under the
 * composer card, same posture as ui-conversation's own StatsLine), so it stays
 * visible while working without opening the full dashboard. Data comes from the
 * same `/api/billing/usage-stats` endpoint the dashboard polls; the bar reads
 * the current session id from the session-scope standard kit and matches
 * `bySession` (session total) and `byTurn` (latest turn cost). Rendering is a
 * pure function of props and polled data, never a side effect.
 *
 * The bar also carries two ambient signals: the current peak/off-peak pricing
 * tier with a switch countdown (DeepSeek time-of-day pricing), and quota chips
 * for subscription plans running low (≤20% remaining), so cost pressure is
 * visible without opening the dashboard.
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { UsageBillingKey } from './locales.ts';
/** The usage-stats shape the composer bar needs (a thin slice, not the whole doc). */
export interface LiveStats {
    bySession?: readonly {
        id: string;
        cost: number;
    }[];
    byTurn?: readonly {
        sessionId: string;
        turn: number;
        cost: number;
    }[];
}
/** 订阅额度的薄切片（/api/billing/subscriptions 响应的行）。 */
export interface QuotaSlice {
    displayName: string;
    status: string;
    windows: readonly {
        kind: string;
        remainingPercent: number;
    }[];
}
/**
 * 当前会话累计费用：bySession 里会话 id 匹配的那行；缺省为 0。
 * 导出供测试：纯函数。
 * @param stats - 薄统计切片。
 * @param sessionId - 当前会话 id。
 * @returns 该会话累计费用（人民币元）。
 */
export declare function sessionCostOf(stats: LiveStats | null, sessionId: string | undefined): number;
/**
 * 当前轮费用：byTurn 里该会话最新一轮的 cost；缺省为 0。
 * byTurn 服务端按起始时间倒序下发，但求 max(turn) 更稳健（不依赖顺序）。
 * 导出供测试：纯函数。
 * @param stats - 薄统计切片。
 * @param sessionId - 当前会话 id。
 * @returns 最新一轮费用（人民币元）。
 */
export declare function turnCostOf(stats: LiveStats | null, sessionId: string | undefined): number;
/**
 * 低额度预警 chips：查询成功（ok）且任一窗口剩余 ≤ threshold 的套餐，
 * 按剩余升序、最多 3 枚。导出供测试：纯函数。
 * @param quotas - 订阅额度行切片。
 * @param threshold - 剩余百分比阈值（默认 20%）。
 */
export declare function lowQuotaChips(quotas: readonly QuotaSlice[], threshold?: number): readonly {
    name: string;
    kind: string;
    pct: number;
}[];
/** Props: the framework's session identity plus the owning dock's locale seat. */
export interface LiveCostBarProps {
    /** Current Session identity supplied by the session-scope standard kit. */
    sessionId: SessionId;
    /** The owning dock's locale seat (bound to the billing NS). */
    t: (key: UsageBillingKey) => string;
}
/**
 * Render the live cost ticker for the current session.
 * @param props - framework session identity and locale.
 */
export declare function LiveCostBar({ sessionId, t }: LiveCostBarProps): React.ReactNode;
/**
 * Render the compact inline chip for the composer tool row (position
 * 「模型选择前」). Occupies a fixed minimal footprint — tier glyph + session
 * spend — so it never crowds the model picker; the full breakdown (switch
 * countdown, turn cost, quota alerts) rides the host Tooltip primitive (the
 * native title never renders in the webview), and a low quota tints the chip
 * amber/red instead of growing it.
 * @param props - framework session identity and locale.
 */
export declare function LiveCostChip({ sessionId, t }: LiveCostBarProps): React.ReactNode;
//# sourceMappingURL=live-cost.d.ts.map