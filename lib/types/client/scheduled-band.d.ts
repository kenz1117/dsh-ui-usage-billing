import { type PeakRule, type PeakSchedule } from '../peak-schedule.ts';
import { type RateChannel } from './pricing.ts';
export interface ScheduledTurn {
    model?: string;
    scheduleSource?: string;
}
export type EffectiveRule = Required<PeakRule>;
/** Old snapshots omit schedules. Validate new ones before they reach render paths. */
export declare function scheduleFields(value: unknown): {
    peakSchedule?: PeakSchedule;
};
export declare function ruleForTurn(turn?: ScheduledTurn, schedule?: PeakSchedule): EffectiveRule | undefined;
/** Only wall-clock boundaries can change a band. Infinity means no future transition. */
export declare function scheduledCountdown(now: number, channel: RateChannel, rule?: EffectiveRule): {
    tier: import("./pricing.ts").PriceTierId;
    nextSwitchInMs: number;
} | null;
/** Model-only pins/catalog rows may use a custom rule only for the current pair. */
export declare function modelBand(now: number, model: string, plan: boolean, current?: ScheduledTurn, schedule?: PeakSchedule): {
    tier: import("./pricing.ts").PriceTierId;
    nextSwitchInMs: number;
} | null;
//# sourceMappingURL=scheduled-band.d.ts.map