/**
 * 峰谷切换提醒（增强版）纯逻辑：偏好持久化 + 切档前命中判定。
 *
 * 参照 dsh-cost-meter 的 peak/off-peak 提醒：在距下次「进入峰时 / 进入平价」
 * 不足提前量时，弹可视化色条浮层 + 可选的系统通知。偏好经 localStorage 持久化
 * （默认关闭，用户到面板设置开启）；「同一切换点只提醒一次」由 budget store 的
 * `lastTierSwitchAt` 承担（与原系统通知共用一份去重，避免一条切换提醒弹两次）。
 */
import { upcomingTierSwitch } from "./pricing.js";
/** 配置持久化 key。 */
export const PEAK_ALERT_KEY = 'dsh-billing-peak-alert-v1';
/** 默认配置：关、2 分钟提前、右下角、开系统通知、峰与谷都提醒。 */
export const DEFAULT_PEAK_ALERT_CONFIG = {
    enabled: false,
    leadMin: 2,
    position: 'bottom-right',
    webNotify: true,
    mode: 'both',
};
/** 读取本地偏好（缺失/损坏回退默认，字段宽松校验）。 */
export function loadPeakAlertConfig() {
    try {
        const raw = localStorage.getItem(PEAK_ALERT_KEY);
        if (raw === null)
            return { ...DEFAULT_PEAK_ALERT_CONFIG };
        const parsed = JSON.parse(raw);
        const mode = parsed.mode === 'peak' || parsed.mode === 'offPeak' ? parsed.mode : DEFAULT_PEAK_ALERT_CONFIG.mode;
        const position = parsed.position === 'center' ? 'center' : 'bottom-right';
        return {
            enabled: parsed.enabled === true,
            leadMin: typeof parsed.leadMin === 'number' && Number.isFinite(parsed.leadMin)
                ? Math.min(30, Math.max(1, Math.round(parsed.leadMin)))
                : DEFAULT_PEAK_ALERT_CONFIG.leadMin,
            position,
            webNotify: parsed.webNotify !== false,
            mode,
        };
    }
    catch {
        return { ...DEFAULT_PEAK_ALERT_CONFIG };
    }
}
/** 保存偏好；存储失败静默（降级为关闭，不影响其它能力）。 */
export function savePeakAlertConfig(config) {
    try {
        localStorage.setItem(PEAK_ALERT_KEY, JSON.stringify(config));
    }
    catch {
        // localStorage 不可用（隐私模式/沙箱）时忽略。
    }
}
/**
 * 计算是否需要提醒：已启用、距切换不足提前量、按模式过滤、且该切换点未提醒过。
 * 导出供测试：纯函数。
 * @param nowMs - 当前时刻（epoch 毫秒）。
 * @param config - 峰谷提醒偏好。
 * @param lastAlertedAt - 上次提醒过的切换点时刻（budget store 的 lastTierSwitchAt）；同点跳过。
 * @returns 命中（含即将进入的档位与切换时刻），否则 null。
 */
export function computePeakAlert(nowMs, config, lastAlertedAt) {
    if (!config.enabled)
        return null;
    const upcoming = upcomingTierSwitch(nowMs, config.leadMin * 60_000);
    if (upcoming === null)
        return null;
    if (config.mode === 'peak' && upcoming.entering !== 'peak')
        return null;
    if (config.mode === 'offPeak' && upcoming.entering !== 'offPeak')
        return null;
    if (upcoming.atMs === lastAlertedAt)
        return null;
    return upcoming;
}
//# sourceMappingURL=peak-alert.js.map