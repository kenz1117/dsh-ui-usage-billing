import { type ScheduleSnapshot } from '../peak-schedule.ts';
import type { UsageBillingKey } from './locales.ts';
type Translate = (key: UsageBillingKey) => string;
export declare function PeakScheduleEditor({ t, onSaved }: {
    t: Translate;
    onSaved?: (snapshot: ScheduleSnapshot) => void;
}): import("react").JSX.Element;
export {};
//# sourceMappingURL=PeakScheduleEditor.d.ts.map