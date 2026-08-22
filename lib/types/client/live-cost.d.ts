/**
 * LiveCostBar: the session-scope cost ticker mounted on the composer's dock,
 * showing the current session's accumulated spend and the latest turn's cost.
 *
 * It rides `conversation.composer.dock` (the stats-line family seat under the
 * composer card, same posture as ui-conversation's own StatsLine), so it stays
 * visible while working without opening the full dashboard. Data comes from the
 * same `/api/billing/usage-stats` endpoint the dashboard polls; the bar reads
 * the current session id off the framework snapshot (`useSession` parent of
 * `sessionId`) and matches `bySession` (session total) and `byTurn` (latest
 * turn cost). Rendering is a pure function of the snapshot, never a side effect.
 */
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots';
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client';
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
/** Props: the session-scope snapshot selector the framework injects. */
export interface LiveCostBarProps {
    useSession: SnapshotSelectorHook<ConversationSnapshot>;
    /** The owning dock's locale seat (bound to the billing NS). */
    t: (key: 'billing.liveTurn' | 'billing.liveSession') => string;
}
/**
 * Render the live cost ticker for the current session.
 * @param props - framework session snapshot hook and locale.
 */
export declare function LiveCostBar({ useSession, t }: LiveCostBarProps): React.ReactNode;
//# sourceMappingURL=live-cost.d.ts.map