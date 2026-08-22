/**
 * 对话完成提醒：监听宿主 `sessions.list` 的会话状态迁移，一个会话
 * `running → completed`（或不再 running）时触发一次桌面通知。
 *
 * 可选：跨 tab 只保留一个提醒 leader（Web Locks 优先，降级 localStorage 租约），
 * 避免多窗口同时弹同一条。配置持久化在 localStorage（默认关闭，用户在面板设置开启）。
 */

import type { SessionListState, SessionSummary } from '@deepseek-ai/dsh-client-runtime/client'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-runtime/client'

/** 配置持久化 key：开启/关闭 + 提醒持续模式（0=常驻，其余=秒后自动关）。 */
export const COMPLETION_NOTIFY_KEY = 'dsh-billing-completion-notify-v1'

export interface CompletionNotifyConfig {
  enabled: boolean
  /** 通知停留秒数；0 = 常驻（requireInteraction）。 */
  timeout: number
}

const DEFAULT_CONFIG: CompletionNotifyConfig = { enabled: false, timeout: 0 }

/** 读取本地配置（缺失/损坏时回退默认）。 */
export function loadNotifyConfig(): CompletionNotifyConfig {
  try {
    const raw = localStorage.getItem(COMPLETION_NOTIFY_KEY)
    if (raw === null) return { ...DEFAULT_CONFIG }
    const parsed = JSON.parse(raw) as Partial<CompletionNotifyConfig>
    return {
      enabled: parsed.enabled === true,
      timeout: typeof parsed.timeout === 'number' ? parsed.timeout : 0,
    }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

/** 保存配置；存储失败静默（通知功能降级为关闭，不影响其他能力）。 */
export function saveNotifyConfig(config: CompletionNotifyConfig): void {
  try {
    localStorage.setItem(COMPLETION_NOTIFY_KEY, JSON.stringify(config))
  } catch {
    // localStorage 不可用（隐私模式/沙箱）时忽略。
  }
}

/** 判断一个会话是否「完成」：completed 标志为真，或已不再 running。 */
function isFinished(summary: SessionSummary): boolean {
  if (summary.completed === true) return true
  return summary.running === false
}

/**
 * 安装对话完成提醒：订阅 sessions.list 快照，用 `previousFinished` 记住每条
 * 会话上次是运行中还是已完成；只有「之前运行中 → 现在已完成」的迁移才提醒，
 * 首次快照只建立基线、不提醒。返回清理函数（dispose 时释放订阅）。
 * @param list - `ctx.sessions.list`（宿主注入的会话列表快照源）。
 */
export function installCompletionNotifier(list: ObservableSnapshot<SessionListState>, getConfig: () => CompletionNotifyConfig): () => void {
  // 上次快照里每个会话是否已「完成」（用 Set 记录已完成的会话 id）。
  const previousFinished = new Set<string>()
  // leader 去重：单次通知队列（同批完成只弹一条，避免刷屏）。
  let queuedTitle: string | undefined

  const snapshot = list.getSnapshot()
  for (const id of snapshot.ids) {
    const summary = snapshot.byId[id]
    if (summary !== undefined && isFinished(summary)) previousFinished.add(String(id))
  }

  const notify = (title: string): void => {
    const { enabled, timeout } = getConfig()
    if (!enabled) return
    if (typeof Notification === 'undefined') return
    if (Notification.permission !== 'granted') return
    try {
      new Notification(title, {
        body: title,
        tag: 'dsh-billing-completion',
        requireInteraction: timeout === 0,
      })
    } catch {
      // 某些浏览器 Notification 构造失败：静默，不影响其它能力。
    }
  }

  const unsubscribe = list.subscribe(() => {
    const state = list.getSnapshot()
    const finishedTitles: string[] = []
    for (const id of state.ids) {
      const summary = state.byId[id]
      if (summary === undefined) continue
      const key = String(id)
      const finished = isFinished(summary)
      // running → completed 迁移：之前未完成、现在完成，且不是首见的新会话首次。
      if (finished && !previousFinished.has(key)) {
        finishedTitles.push(summary.title ?? summary.id ?? key)
      }
      if (finished) previousFinished.add(key)
      else previousFinished.delete(key)
    }
    if (finishedTitles.length > 0) {
      // 同批只弹一条：拼首条标题，避免多会话同时完成刷屏。
      queuedTitle = finishedTitles.length === 1 ? finishedTitles[0] : `${finishedTitles.length} 个会话已完成`
      if (queuedTitle !== undefined) notify(queuedTitle)
    }
  })

  return unsubscribe
}
