/**
 * 峰谷切换提醒浮层：切档前状态条（右下角或居中）。用 `position: fixed` 即可在
 * 任意宿主容器内覆盖整个视口，因此不需要 portal。布局按设计 peak-card：头部
 * （档位 tag + 关闭）→ 大号等宽倒计时 → 一句说明。渲染是受控的：父组件把命中
 * （hit）与偏好传入，显示剩余分钟并在切换后消失。
 */
import type { PeakAlertConfig, PeakAlertHit } from './peak-alert.ts';
import type { UsageBillingKey } from './locales.ts';
/** Props: 命中的切档、偏好、国际化、关闭回调。 */
export interface PeakAlertBannerProps {
    hit: PeakAlertHit;
    config: PeakAlertConfig;
    t: (key: UsageBillingKey) => string;
    onDismiss: () => void;
}
/** 渲染一个切档前提醒状态条。 */
export declare function PeakAlertBanner({ hit, config, t, onDismiss }: PeakAlertBannerProps): React.ReactNode;
//# sourceMappingURL=PeakAlertBanner.d.ts.map