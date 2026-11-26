/** A source/model override. Omitted fields inherit that source's defaults. */
export interface PeakRule {
    windows?: number[];
    holidays?: string[];
    weekendOffPeak?: boolean;
    utcOffsetMinutes?: number;
}
export interface PeakSchedule {
    version: 2;
    models: Record<string, PeakRule>;
}
export interface ScheduleModel {
    source: string;
    model: string;
    label: string;
}
export interface ScheduleEdit {
    version: 3;
    changes: Record<string, PeakRule | null>;
}
export interface ScheduleRevision {
    effectiveFromMs: number;
    changes: ScheduleEdit['changes'];
}
export interface ScheduleHistory {
    version: 3;
    revisions: ScheduleRevision[];
}
export type ScheduleNoticeCode = 'legacySchedule' | 'unreadableSchedule' | 'malformedSchedule' | 'malformedRevision' | 'malformedRule' | 'ineligibleModel' | 'discoveryFailed';
export interface ScheduleNotice {
    code: ScheduleNoticeCode;
    detail?: string;
}
export interface ScheduleSnapshot {
    config: PeakSchedule;
    models: ScheduleModel[];
    notices?: ScheduleNotice[];
}
export declare const emptySchedule: () => PeakSchedule;
export declare const scheduleKey: (source: string, model: string) => string;
export declare const accountRoute: (id: string) => boolean;
export declare function validSource(source: string): boolean;
export declare function parseRule(value: unknown): PeakRule;
export declare function parseSchedule(value: unknown, eligible: (model: string) => boolean): PeakSchedule;
export declare function modelFromScheduleKey(key: string): string;
export declare function parseScheduleEdit(value: unknown): ScheduleEdit;
export declare function readScheduleHistory(value: unknown): {
    history: ScheduleHistory;
    notices: ScheduleNotice[];
};
export declare const officialHolidays = "20260925 20260926 20260927 20261001 20261002 20261003 20261004 20261005 20261006 20261007";
export declare function effectiveRule(source: string, rule: PeakRule): Required<PeakRule>;
export declare function customTier(time: number, rule: Required<PeakRule>): 'peak' | 'offPeak';
//# sourceMappingURL=peak-schedule.d.ts.map