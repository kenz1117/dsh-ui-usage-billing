import { type PeakSchedule } from './peak-schedule.ts';
/** Never infer a source for legacy model-wide data. Preserve its bytes before replacement. */
export declare function openScheduleStore(path: string, eligible: (key: string) => boolean): {
    current: () => PeakSchedule;
    warning: () => string | undefined;
    save(next: PeakSchedule): Promise<void>;
};
//# sourceMappingURL=peak-schedule-store.d.ts.map