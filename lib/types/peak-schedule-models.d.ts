import { type ProviderRouteView } from './aggregate.ts';
import { type ScheduleModel, type ScheduleNotice } from './peak-schedule.ts';
export interface ScheduleProfile extends ProviderRouteView {
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
/** Cache only remote discovery. Route identity and locally declared models are refreshed every request. */
export declare function createScheduleModelDiscovery(now?: () => number, ttlMs?: number): (llm: Llm | undefined, profiles: Record<string, ScheduleProfile>, aliases: Readonly<Record<string, string>>) => Promise<{
    models: ScheduleModel[];
    notices: ScheduleNotice[];
}>;
export {};
//# sourceMappingURL=peak-schedule-models.d.ts.map