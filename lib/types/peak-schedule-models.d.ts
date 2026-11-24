import { type ScheduleModel } from './peak-schedule.ts';
interface Profile {
    baseURL?: string;
    displayName?: string;
    models?: unknown[];
}
interface Llm {
    listProviders?(): readonly {
        id: string;
        name?: string;
    }[];
    listModels?(route: string): Promise<unknown[]>;
}
export declare function eligibleScheduleModel(key: string): boolean;
export declare function scheduleModels(llm: Llm | undefined, profiles: Record<string, Profile>, aliases: Readonly<Record<string, string>>): Promise<{
    warning?: string;
    models: ScheduleModel[];
}>;
export {};
//# sourceMappingURL=peak-schedule-models.d.ts.map