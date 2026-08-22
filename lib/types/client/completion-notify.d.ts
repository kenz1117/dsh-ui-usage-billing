/**
 * 对话完成提醒：监听宿主 `sessions.list` 的会话状态迁移，一个会话
 * `running → completed`（或不再 running）时触发一次桌面通知。
 *
 * 可选：跨 tab 只保留一个提醒 leader（Web Locks 优先，降级 localStorage 租约），
 * 避免多窗口同时弹同一条。配置持久化在 localStorage（默认关闭，用户在面板设置开启）。
 */
import type { SessionListState } from '@deepseek-ai/dsh-client-runtime/client';
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-runtime/client';
/** 配置持久化 key：开启/关闭 + 提醒持续模式（0=常驻，其余=秒后自动关）。 */
export declare const COMPLETION_NOTIFY_KEY = "dsh-billing-completion-notify-v1";
export interface CompletionNotifyConfig {
    enabled: boolean;
    /** 通知停留秒数；0 = 常驻（requireInteraction）。 */
    timeout: number;
}
/** 读取本地配置（缺失/损坏时回退默认）。 */
export declare function loadNotifyConfig(): CompletionNotifyConfig;
/** 保存配置；存储失败静默（通知功能降级为关闭，不影响其他能力）。 */
export declare function saveNotifyConfig(config: CompletionNotifyConfig): void;
/**
 * 安装对话完成提醒：订阅 sessions.list 快照，用 `previousFinished` 记住每条
 * 会话上次是运行中还是已完成；只有「之前运行中 → 现在已完成」的迁移才提醒，
 * 首次快照只建立基线、不提醒。返回清理函数（dispose 时释放订阅）。
 * @param list - `ctx.sessions.list`（宿主注入的会话列表快照源）。
 */
export declare function installCompletionNotifier(list: ObservableSnapshot<SessionListState>, getConfig: () => CompletionNotifyConfig): () => void;
//# sourceMappingURL=completion-notify.d.ts.map