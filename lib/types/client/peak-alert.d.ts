/**
 * 峰谷切换提醒（增强版）纯逻辑：偏好持久化 + 切档前命中判定。
 *
 * 参照 dsh-cost-meter 的 peak/off-peak 提醒：在距下次「进入峰时 / 进入平价」
 * 不足提前量时，弹可视化色条浮层 + 可选的系统通知。偏好经 localStorage 持久化
 * （默认关闭，用户到面板设置开启）；「同一切换点只提醒一次」由 budget store 的
 * `lastTierSwitchAt` 承担（与原系统通知共用一份去重，避免一条切换提醒弹两次）。
 */
import { type PriceTierId } from './pricing.ts';
/** 提醒模式：只提醒进入峰时 / 只提醒进入平价 / 峰与谷都提醒。 */
export type PeakAlertMode = 'peak' | 'offPeak' | 'both';
/** 浮层位置：右下角 / 屏幕居中。 */
export type PeakAlertPosition = 'bottom-right' | 'center';
/** 峰谷提醒偏好。 */
export interface PeakAlertConfig {
    /** 总开关：关 = 既不浮层也不系统通知。 */
    enabled: boolean;
    /** 提前量（分钟）；1–30。 */
    leadMin: number;
    /** 浮层位置。 */
    position: PeakAlertPosition;
    /** 是否同步发浏览器系统通知（Notification 授权后生效）。 */
    webNotify: boolean;
    /** 提醒模式。 */
    mode: PeakAlertMode;
}
/** 配置持久化 key。 */
export declare const PEAK_ALERT_KEY = "dsh-billing-peak-alert-v1";
/** 默认配置：关、2 分钟提前、右下角、开系统通知、峰与谷都提醒。 */
export declare const DEFAULT_PEAK_ALERT_CONFIG: PeakAlertConfig;
/** 一次命中：即将进入的档位与该切换时刻。 */
export interface PeakAlertHit {
    entering: PriceTierId;
    atMs: number;
}
/** 读取本地偏好（缺失/损坏回退默认，字段宽松校验）。 */
export declare function loadPeakAlertConfig(): PeakAlertConfig;
/** 保存偏好；存储失败静默（降级为关闭，不影响其它能力）。 */
export declare function savePeakAlertConfig(config: PeakAlertConfig): void;
/**
 * 计算是否需要提醒：已启用、距切换不足提前量、按模式过滤、且该切换点未提醒过。
 * 导出供测试：纯函数。
 * @param nowMs - 当前时刻（epoch 毫秒）。
 * @param config - 峰谷提醒偏好。
 * @param lastAlertedAt - 上次提醒过的切换点时刻（budget store 的 lastTierSwitchAt）；同点跳过。
 * @returns 命中（含即将进入的档位与切换时刻），否则 null。
 */
export declare function computePeakAlert(nowMs: number, config: PeakAlertConfig, lastAlertedAt: number): PeakAlertHit | null;
//# sourceMappingURL=peak-alert.d.ts.map