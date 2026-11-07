/** Off-peak task queue panel: explicit enqueue, visible outcomes, safe old-host fallback. */
import type { BillingLanguage } from './usage-billing-settings.ts';
import type { UsageBillingKey } from './locales.ts';
import type { TaskQueueInput } from '../task-queue-shared.ts';
interface TaskQueuePanelProps {
    readonly t: (key: UsageBillingKey, params?: Record<string, unknown>) => string;
    readonly language: BillingLanguage;
    readonly navigateToSession: (sessionId: string) => 'opened' | 'unavailable' | 'failed';
    /** 会话标题（issue #118）：卡片显示「将在会话 X 继续」；取不到就显示 id 短码。 */
    readonly sessionTitleOf?: (sessionId: string) => string | undefined;
    /** 「在来源会话继续」开关当前状态：决定安全提示文案。 */
    readonly reuseSourceSession?: boolean;
}
interface ImportDefaults {
    readonly cwd: string;
    readonly provider: string;
    readonly model: string;
}
/** Normalize only the transport shape; authoritative validation stays atomic on the server. */
export declare function parseTaskQueueImport(text: string, defaults: ImportDefaults): TaskQueueInput[];
export declare function TaskQueuePanel({ t, language, navigateToSession, sessionTitleOf, reuseSourceSession }: TaskQueuePanelProps): React.ReactNode;
export {};
//# sourceMappingURL=TaskQueuePanel.d.ts.map