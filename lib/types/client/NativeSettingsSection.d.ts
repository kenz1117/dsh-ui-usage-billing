/** 宿主原生设置页：复用仪表盘的完整设置分区（issue #108）。 */
import type { ReactNode } from 'react';
import { type UsageBillingProps } from './UsageBilling.tsx';
type NativeSettingsSectionProps = Omit<UsageBillingProps, 'wide' | 'embeddedSettings' | 'renderSlot' | '__renders'>;
/**
 * 原生设置与侧栏入口共用数据加载、预算 store 和全部偏好写回逻辑。
 * 本页自身就是「完全隐藏」后的恢复入口，不依赖 `/usage` 是否可用。
 */
export declare function NativeSettingsSection(props: NativeSettingsSectionProps): ReactNode;
export {};
//# sourceMappingURL=NativeSettingsSection.d.ts.map