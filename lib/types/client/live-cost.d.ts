/**
 * LiveCostBar: the session-scope cost ticker mounted beside the composer,
 * showing the current session's accumulated spend and the latest turn's cost.
 *
 * It is registered on two host seats and renders in exactly one of them per the
 * position preference: `conversation.composer.dock` (the stats-line family seat
 * under the composer card, same posture as ui-conversation's own StatsLine) for
 * 「下方」, and `conversation.input.dock` (the full-width seat above the composer
 * card, where the host's todo panel and queue dock live) for 「上方」. Either way
 * it stays visible while working without opening the full dashboard. Data comes
 * from the same `/api/billing/usage-stats` endpoint the dashboard polls; the bar
 * reads the current session id from the session-scope standard kit and matches
 * `bySession` (session total) and `byTurn` (latest turn cost). Rendering is a
 * pure function of props and polled data, never a side effect.
 *
 * The bar also carries two ambient signals: the current peak/off-peak pricing
 * tier with a switch countdown (DeepSeek time-of-day pricing), and quota chips
 * for subscription plans running low (≤20% remaining), so cost pressure is
 * visible without opening the dashboard.
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { LiveCostBarPrefs } from './usage-billing-settings.ts';
import type { UsageBillingKey } from './locales.ts';
/** The usage-stats shape the composer bar needs (a thin slice, not the whole doc). */
export interface LiveStats {
    bySession?: readonly {
        id: string;
        cost: number;
        subCost?: number;
    }[];
    byTurn?: readonly {
        sessionId: string;
        turn: number;
        model?: string;
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
 * 当前会话累计费用：bySession 里会话 id 匹配的那行（含后代子智能体费用
 * subCost——子智能体是宿主的独立会话，其消耗按父链并入本对话的口径）；
 * 缺省为 0。导出供测试：纯函数。
 * @param stats - 薄统计切片。
 * @param sessionId - 当前会话 id。
 * @returns 该会话累计费用（人民币元，含子智能体）。
 */
export declare function sessionCostOf(stats: LiveStats | null, sessionId: string | undefined): number;
/**
 * 当前会话的后代子智能体费用（bySession 行的 subCost）：供「含子」拆分展示，
 * 让胶囊上的总额与本体会话费用对得上账。导出供测试：纯函数。
 * @param stats - 薄统计切片。
 * @param sessionId - 当前会话 id。
 * @returns 后代子会话费用合计（人民币元）；无则 0。
 */
export declare function sessionSubCostOf(stats: LiveStats | null, sessionId: string | undefined): number;
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
/**
 * 当前会话最近一轮的模型（峰谷窗口跟随它）：byTurn 里该会话轮次号最大的 model。
 * 导出供测试：纯函数。
 * @param stats - 薄统计切片。
 * @param sessionId - 当前会话 id。
 * @returns 该会话最近一轮的归因模型键；无轮次或轮行未带模型时 undefined。
 */
export declare function sessionModelOf(stats: LiveStats | null, sessionId: string | undefined): string | undefined;
/** 胶囊位置偏好（设置 Tab 三选）。 */
type CapsulePosition = LiveCostBarPrefs['position'];
/** 胶囊条的宿主座位：above=input.dock（卡片上方）；below=composer.dock（卡片下方）。 */
export type CapsuleSeat = Exclude<CapsulePosition, 'toolbar'>;
/**
 * 宿主 SessionSnapshot 里决定 hero（空白新会话）态的字段薄切片。input.dock 座位
 * 的 owner 快照（InputZone.session）按此结构读取。
 */
export interface SessionPhaseSlice {
    readonly blank: boolean;
    readonly running: boolean;
    readonly promptAttempted: boolean;
    readonly awaitingFirstTurn: boolean;
}
/**
 * 会话是否处于宿主的 hero（空白）阶段：复刻 ui-conversation `conversationPhase`
 * 的 blank 分支——无正在运行的轮次、用户尚未尝试提交、且会话仍空白或等待首轮。
 * 宿主在 hero 态不渲染 composer.dock（输入框下方座位），但 input.dock 会渲染；
 * 「上方」座位借此与「下方」保持同样的显隐语义，空白会话页不浮一只空壳药丸。
 * 导出供测试：纯函数。
 * @param session - 会话快照薄切片。
 */
export declare function isBlankPhase(session: SessionPhaseSlice): boolean;
/** Props: the framework's session identity plus the owning seat's locale and identity. */
export interface LiveCostBarProps {
    /** Current Session identity supplied by the session-scope standard kit. */
    sessionId: SessionId;
    /** The owning seat's locale seat (bound to the billing NS). */
    t: (key: UsageBillingKey) => string;
    /** Which host seat this instance occupies; it renders only when the position pref matches. */
    seat: CapsuleSeat;
    /** Owner snapshot the input.dock seat receives (InputZone.session); absent on composer.dock. */
    session?: SessionPhaseSlice;
}
/**
 * Render the live cost ticker for the current session in one host seat.
 * @param props - framework session identity, locale, the seat occupied, and
 * (input.dock only) the owner session snapshot.
 */
export declare function LiveCostBar({ sessionId, t, seat, session }: LiveCostBarProps): React.ReactNode;
/** Props of the tool-row chip: session identity and locale only (its seat is fixed to input.right). */
export type LiveCostChipProps = Pick<LiveCostBarProps, 'sessionId' | 't'>;
/**
 * Render the compact inline chip for the composer tool row (position
 * 「模型选择前」). Occupies a fixed minimal footprint — tier glyph + session
 * spend — so it never crowds the model picker; the full breakdown (switch
 * countdown, turn cost, quota alerts) rides the host Tooltip primitive (the
 * native title never renders in the webview), and a low quota tints the chip
 * amber/red instead of growing it.
 * @param props - framework session identity and locale.
 */
export declare function LiveCostChip({ sessionId, t }: LiveCostChipProps): React.ReactNode;
export {};
//# sourceMappingURL=live-cost.d.ts.map