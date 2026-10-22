/**
 * GET/POST /api/billing/usage-tool：usage_stats 工具开关读写（插件自带，
 * 不依赖宿主浏览器设置白名单）。工具注入是启动期决策，重启应用后生效。
 */

import { fetchBilling } from './http.ts'

/**
 * 读取 usage_stats 工具开关当前值（插件自带接口，不依赖宿主浏览器设置白名单）。
 * @returns 当前是否注入；读取失败（服务未起/非 JSON）返回 undefined。
 */
export async function loadUsageTool(): Promise<boolean | undefined> {
  try {
    const response = await fetchBilling('/api/billing/usage-tool')
    if (!response.ok) return undefined
    const parsed = JSON.parse(await response.text()) as { enabled?: unknown }
    return typeof parsed.enabled === 'boolean' ? parsed.enabled : undefined
  } catch {
    return undefined
  }
}

/**
 * 写 usage_stats 工具开关（插件自带接口）。工具注入是启动期决策，重启应用后生效。
 * @param enabled - 是否注入。
 * @returns 是否写成功。
 */
export async function saveUsageTool(enabled: boolean): Promise<boolean> {
  try {
    const response = await fetchBilling('/api/billing/usage-tool', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    if (!response.ok) return false
    const parsed = JSON.parse(await response.text()) as { ok?: unknown }
    return parsed.ok === true
  } catch {
    return false
  }
}
