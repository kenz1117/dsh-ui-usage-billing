import { type ScheduleEdit, type ScheduleHistory, type ScheduleNotice } from './peak-schedule.ts';
export declare class ScheduleClockConflict extends Error {
}
export declare function openScheduleStore(path: string, eligible: (key: string) => boolean, now?: () => number): {
    current: () => import("./peak-schedule.ts").PeakSchedule;
    history: () => ScheduleHistory;
    notices: () => ScheduleNotice[];
    save(edit: ScheduleEdit, latestEventTime?: number): Promise<void>;
};
//# sourceMappingURL=peak-schedule-store.d.ts.map