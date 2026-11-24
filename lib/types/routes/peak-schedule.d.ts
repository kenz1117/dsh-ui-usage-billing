import type { Context } from '@deepseek-ai/cordis';
import type { ScheduleSnapshot } from '../peak-schedule.ts';
export interface PeakScheduleDeps {
    trustedHosts: ReadonlySet<string>;
    read: () => Promise<ScheduleSnapshot>;
    save: (raw: unknown) => Promise<ScheduleSnapshot>;
}
/** Domain validation failures are distinct from storage failures. */
export declare class PeakScheduleInputError extends Error {
}
export declare function registerPeakScheduleRoute(ctx: Context, deps: PeakScheduleDeps): void;
//# sourceMappingURL=peak-schedule.d.ts.map