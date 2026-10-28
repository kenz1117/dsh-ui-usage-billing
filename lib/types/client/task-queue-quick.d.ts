/**
 * Composer shortcut for the existing off-peak task queue.
 *
 * This component only snapshots the current draft, working directory and next
 * model route into the queue API. It never submits to the current Session and
 * never starts a task. Optional draft clearing is revision-checked after the
 * mutation succeeds so late responses cannot erase subsequent user input.
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { InputActions, InputState } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store';
import type { SessionProjectionMap } from '@deepseek-ai/dsh-api-session-controller/client';
import type { UsageBillingKey } from './locales.ts';
type Translate = (key: UsageBillingKey) => string;
type ProjectionKey = Extract<keyof SessionProjectionMap, string>;
/** Optional selector shape: old hosts may omit the standard input kit. */
type ReadInput = <S>(selector: (state: InputState) => S, eq?: (a: S, b: S) => boolean) => S | undefined;
/**
 * Projection cells come from the current Session's public `projections.faceOf`.
 * The composer standard kit guarantees `useInput`; projection access remains an
 * optional capability so older hosts degrade instead of blocking web startup.
 */
export type ProjectionFaceOf = (key: ProjectionKey) => ObservableSnapshot<unknown> | undefined;
export interface QuickQueueToggleProps {
    readonly t: Translate;
}
export interface QuickQueueEnqueueProps {
    readonly sessionId: SessionId;
    readonly t: Translate;
    readonly useInput?: ReadInput | undefined;
    readonly inputActions?: InputActions | undefined;
    readonly projectionFaceOf?: ProjectionFaceOf | undefined;
}
/** Persistent, opt-in composer switch. It performs no queue or network writes. */
export declare function QuickQueueToggle({ t }: QuickQueueToggleProps): React.ReactNode;
/** Enqueue the captured draft for a later off-peak window; never prompt the current Session. */
export declare function QuickQueueEnqueue({ sessionId, t, useInput, inputActions, projectionFaceOf, }: QuickQueueEnqueueProps): React.ReactNode;
export {};
//# sourceMappingURL=task-queue-quick.d.ts.map