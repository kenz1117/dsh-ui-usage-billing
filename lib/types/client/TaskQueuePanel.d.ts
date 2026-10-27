/** Off-peak task queue panel: explicit enqueue, visible outcomes, safe old-host fallback. */
import type { BillingLanguage } from './usage-billing-settings.ts';
import type { UsageBillingKey } from './locales.ts';
interface TaskQueuePanelProps {
    readonly t: (key: UsageBillingKey, params?: Record<string, unknown>) => string;
    readonly language: BillingLanguage;
    readonly navigateToSession: (sessionId: string) => 'opened' | 'unavailable' | 'failed';
}
export declare function TaskQueuePanel({ t, language, navigateToSession }: TaskQueuePanelProps): React.ReactNode;
export {};
//# sourceMappingURL=TaskQueuePanel.d.ts.map