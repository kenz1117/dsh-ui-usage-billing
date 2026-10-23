/**
 * 会话跳转（跨插件导航）：把面板里的会话行接到宿主的会话选择通道。
 *
 * 宿主有**两代**通道（实测自 deepseek-harness 源码，非推测）：
 * - 0.1.6-alpha.2+：`ctx.uiWorkspace.openSession(SessionId)`
 *   （@deepseek-ai/dsh-client-ui-workspace，packages/client/ui-workspace/src/client/navigation.ts:36）
 * - 0.1.2-alpha.1 ~ 0.1.6-alpha.1：`ctx.sessions.open(SessionId)`
 *   （@deepseek-ai/dsh-api-session-controller，packages/api/session-controller/src/client/contract/sessions.ts:44
 *    —— 注释写明「id 必须在列表中，不存在则 fail loud」）
 * master 已移除 `sessions.open`，故运行时按「新 → 旧」探测，两条都不可用时降级为不可跳转。
 *
 * 取服务一律走 `ctx.get()`（cordis 的免 inject 服务读取），**不进 inject 列表**：
 * 老宿主没有 uiWorkspace 服务，把它声明成注入依赖会挂起等它、卡住整个 web 启动
 * （本仓 apply.ts 对 remote.llm 的注释记过这个坑：issue #28 的同源教训）。
 *
 * 老宿主的 `sessions.open` 对未知 id 会 fail loud——本插件的会话行来自**持久化会话
 * 日志**，可能不在宿主当前会话列表里（删过、别的 profile、只读快照），故调用必须
 * 包 try/catch 并把失败如实回报给 UI，不得让点击抛错。
 */

import type { Context } from '@deepseek-ai/cordis'
import { SessionId } from '@deepseek-ai/dsh-session/types'
// Type-only: pulls the ui-workspace Context merge (ctx.uiWorkspace) + the UiWorkspace type.
import type { UiWorkspace } from '@deepseek-ai/dsh-client-ui-workspace/client'
import { swallowed } from '../silent.ts'

/** 跳转结果：opened=已跳转；unavailable=宿主无通道（老到没有）；failed=通道报错。 */
export type SessionNavigationResult = 'opened' | 'unavailable' | 'failed'

/** 会话跳转器：面板用它把「点会话行」接到宿主导航。 */
export interface SessionNavigator {
  /** 当前宿主是否具备跳转能力（运行时探测，服务可能后到）。 */
  available(): boolean
  /** 打开指定会话；返回结果供 UI 决定是否提示。 */
  open(sessionId: string): SessionNavigationResult
}

/** 老宿主 sessions 面的可选 open（0.2.x 类型里已移除，故按可选方法处理）。 */
interface LegacySessions {
  open?: (id: SessionId) => void
}

/** 新宿主通道：ctx.get 拿到 uiWorkspace 服务时用它。 */
function workspaceOf(ctx: Context): UiWorkspace | undefined {
  const service = ctx.get('uiWorkspace')
  if (service === undefined) return undefined
  if (typeof (service as { openSession?: unknown }).openSession !== 'function') return undefined
  return service
}

/** 老宿主通道：ctx.sessions.open（0.1.2-alpha.1 ~ 0.1.6-alpha.1）。 */
function legacyOpenOf(ctx: Context): ((id: SessionId) => void) | undefined {
  const sessions = ctx.sessions as unknown as LegacySessions | undefined
  const open = sessions?.open
  return typeof open === 'function' ? open.bind(sessions) : undefined
}

/**
 * 构造会话跳转器。
 * @param ctx - 客户端根 context（服务读取走 ctx.get，不声明注入依赖）。
 * @returns 跳转器。
 */
export function createSessionNavigator(ctx: Context): SessionNavigator {
  return {
    available: () => workspaceOf(ctx) !== undefined || legacyOpenOf(ctx) !== undefined,
    open: (sessionId: string): SessionNavigationResult => {
      const id = SessionId(sessionId)
      const workspace = workspaceOf(ctx)
      if (workspace !== undefined) {
        try {
          workspace.openSession(id)
          return 'opened'
        } catch (error: unknown) {
          // 宿主导航失败（会话已删 / 不在列表 / 导航被中止）：如实回报，不冒泡。
          swallowed('session-navigation-open-failed', error)
          return 'failed'
        }
      }
      const legacy = legacyOpenOf(ctx)
      if (legacy !== undefined) {
        try {
          legacy(id)
          return 'opened'
        } catch (error: unknown) {
          swallowed('session-navigation-legacy-open-failed', error)
          return 'failed'
        }
      }
      return 'unavailable'
    },
  }
}
