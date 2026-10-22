/**
 * GET /api/billing/usage-stats：服务端聚合文档（含 byDay/byModel/bySession/...）。
 * 旧快照可能缺字段（聚合升级前落盘），解析时按字段白名单接受并兜底——避免
 * 渲染路径读 undefined 抛错导致整个插件 surface 被卸载。
 */

import { EMPTY_STATS } from '../constants.ts'
import type { ClientPerf } from '../PerfPanel.tsx'
import type { UsageStats } from '../domain/types.ts'
import { fetchBilling } from './http.ts'

/** Path to the usage-stats endpoint served by this plugin's node half. */
export const USAGE_STATS_PATH = '/api/billing/usage-stats'

/** Try to load stats from the server; returns null when no valid JSON stats are served. */
export async function loadUsageStats(): Promise<UsageStats | null> {
  try {
    const response = await fetchBilling(USAGE_STATS_PATH)
    if (!response.ok) return null
    // The web server's SPA fallback answers unknown paths with HTML, so a
    // 200 is not proof of JSON; parse the text and only accept objects.
    const text = await response.text()
    const parsed = JSON.parse(text) as unknown
    if (parsed === null || typeof parsed !== 'object' || !('total' in parsed)) return null
    // 缺字段快照兜底：聚合升级前的旧文件可能缺 byDay/byModel，按空统计渲染，
    // 避免渲染路径读 undefined 抛错导致整个插件 surface 被卸载。
    const candidate = parsed as Partial<UsageStats>
    const isObj = (v: unknown): boolean => v !== null && typeof v === 'object'
    return {
      total: candidate.total ?? EMPTY_STATS.total,
      byModel: candidate.byModel ?? {},
      byDay: candidate.byDay ?? {},
      ...(candidate.byDayModels !== undefined ? { byDayModels: candidate.byDayModels } : {}),
      // 模型×日期×站点三维（issue #16）：旧快照缺失；透传供按 origin 重估。
      ...(isObj(candidate.byDayModelsSite) ? { byDayModelsSite: candidate.byDayModelsSite } : {}),
      ...(candidate.updatedAt !== undefined ? { updatedAt: candidate.updatedAt } : {}),
      // 回落下发（聚合超预算/失败）：面板据此提示「数据来自上次计算」。
      ...(candidate.staleSnapshot === true ? { staleSnapshot: true } : {}),
      ...(typeof candidate.budget === 'number' ? { budget: candidate.budget } : {}),
      ...(typeof candidate.lowBalanceThreshold === 'number' ? { lowBalanceThreshold: candidate.lowBalanceThreshold } : {}),
      ...(Array.isArray(candidate.bySession) ? { bySession: candidate.bySession } : {}),
      ...(Array.isArray(candidate.byTurn) ? { byTurn: candidate.byTurn } : {}),
      ...(Array.isArray(candidate.byWorkspace) ? { byWorkspace: candidate.byWorkspace } : {}),
      // 可选聚合维度：旧快照缺失。此前白名单漏掉 bySite / unpricedModels /
      // staleLedgerSessions，导致中转站面板与旧账本提示从未收到数据，一并补上。
      ...(isObj(candidate.bySite) ? { bySite: candidate.bySite } : {}),
      ...(isObj(candidate.byTier) ? { byTier: candidate.byTier } : {}),
      ...(isObj(candidate.byTool) ? { byTool: candidate.byTool } : {}),
      ...(Array.isArray(candidate.unpricedModels) ? { unpricedModels: candidate.unpricedModels } : {}),
      ...(typeof candidate.staleLedgerSessions === 'number' ? { staleLedgerSessions: candidate.staleLedgerSessions } : {}),
      ...(typeof candidate.unreadableSessions === 'number' ? { unreadableSessions: candidate.unreadableSessions } : {}),
      ...(typeof candidate.unreadableFormatSessions === 'number' ? { unreadableFormatSessions: candidate.unreadableFormatSessions } : {}),
      ...(typeof candidate.unreadableNoLedgerSessions === 'number' ? { unreadableNoLedgerSessions: candidate.unreadableNoLedgerSessions } : {}),
      // 联网搜索估算：旧快照缺失；数值存在才透传（渲染处据 searchCalls 判定显示）。
      ...(typeof candidate.searchCallEstimateCny === 'number' ? { searchCallEstimateCny: candidate.searchCallEstimateCny } : {}),
      // 角色归因：旧快照缺失；仅接受对象形状（durable 边界，字段值由渲染处数值化兜底）。
      ...(candidate.byRole !== null && typeof candidate.byRole === 'object'
        ? { byRole: candidate.byRole as { user: number; assistant: number; tool: number } }
        : {}),
      // 性能指标：旧快照缺失；仅接受含 byModel/byHourModel 的对象形状。
      ...(candidate.perf !== null && typeof candidate.perf === 'object'
        && candidate.perf.byModel !== null && typeof candidate.perf.byModel === 'object'
        && candidate.perf.byHourModel !== null && typeof candidate.perf.byHourModel === 'object'
        ? { perf: candidate.perf as ClientPerf }
        : {}),
      ...(typeof candidate.pluginVersion === 'string' ? { pluginVersion: candidate.pluginVersion } : {}),
    }
  } catch {
    return null
  }
}
