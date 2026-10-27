/** Off-peak task queue panel: explicit enqueue, visible outcomes, safe old-host fallback. */
import type { BillingLanguage } from './usage-billing-settings.ts';
import type { UsageBillingKey } from './locales.ts';
import type { TaskQueueInput } from '../task-queue-shared.ts';
interface TaskQueuePanelProps {
    readonly t: (key: UsageBillingKey, params?: Record<string, unknown>) => string;
    readonly language: BillingLanguage;
    readonly navigateToSession: (sessionId: string) => 'opened' | 'unavailable' | 'failed';
}
interface ImportDefaults {
    readonly cwd: string;
    readonly provider: string;
    readonly model: string;
}
/** Normalize only the transport shape; authoritative validation stays atomic on the server. */
export declare function parseTaskQueueImport(text: string, defaults: ImportDefaults): TaskQueueInput[];
export declare function TaskQueuePanel({ t, language, navigateToSession }: TaskQueuePanelProps): React.ReactNode;
export {};
//# sourceMappingURL=TaskQueuePanel.d.ts.map