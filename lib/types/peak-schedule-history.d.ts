import { type PeakRule, type ScheduleHistory } from './peak-schedule.ts';
/** A future revision does not change the fingerprint of any earlier fold. */
export declare function indexPeakHistory(history?: ScheduleHistory): {
    rule(source: string, model: string, time: number): Required<PeakRule> | undefined;
    fingerprint: (time: number) => string | undefined;
} | undefined;
//# sourceMappingURL=peak-schedule-history.d.ts.map