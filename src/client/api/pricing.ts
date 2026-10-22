/**
 * GET /api/billing/pricing + POST /api/billing/pricing/refresh：实时定价。
 * 节点端启动时拉取，pricing source = 'builtin' 时本地内置（首次启动会回退
 * 内置价）；重试链在收到完整 live 文档时立即结算。`livePricingRetryPending`
 * 与 `lastPricingSyncedAt` 是模块级 let，**必须**与 `loadLivePricing` 同文件
 * 保留（防止跨文件共享 mutable state；也是测试唯一可读的同步基线）。
 */

import { applyBuiltinCatalog, applyLivePricing, type ModelEntry } from '../pricing.ts'
import type { LivePricing } from '../../pricing-shared.ts'
import { fetchBilling } from './http.ts'

/** Path to the live-pricing endpoint served by this plugin's node half. */
export const PRICING_PATH = '/api/billing/pricing'

/** Path to the manual pricing-sync endpoint (POST) served by this plugin's node half. */
export const PRICING_REFRESH_PATH = '/api/billing/pricing/refresh'

/** 实时定价重试链是否已在进行：挂载/开弹窗/轮询多个调用点会并发触发 loadLivePricing，
 *  若都在 `builtin` 时各自起 setTimeout 重试链会叠加出多余请求，这里只保留一条。 */
let livePricingRetryPending = false

/** 上次价格目录同步完成的本机时间戳（毫秒）：loadLivePricing 每次拿到完整
 *  pricing 文档时更新；组件渲染时读取，手动同步后经 setState 触发重渲染刷新。
 * `export let` 让 ESM live binding 暴露给外部——只读绑定（`import { x }` 在 ESM
 * 中为只读），唯一写入点在本模块内 `lastPricingSyncedAt = ...`。 */
export let lastPricingSyncedAt = 0

async function loadLivePricing(attempt = 0): Promise<void> {
  const MAX_ATTEMPTS = 4
  try {
    const response = await fetchBilling(PRICING_PATH)
    if (!response.ok) {
      livePricingRetryPending = false
      return
    }
    const text = await response.text()
    const parsed = JSON.parse(text) as unknown
    if (parsed === null || typeof parsed !== 'object' || !('source' in parsed)) {
      livePricingRetryPending = false
      return
    }
    // 内置目录与别名表随 pricing 文档下发：在任何 source 重试判定前注入，保证
    // 每次成功响应都补种目录。未注入前客户端目录为空——modelOf 走零价兜底、
    // 费率表为空列表，不视为错误。
    const seeded = parsed as { catalog?: unknown; aliases?: unknown }
    if (Array.isArray(seeded.catalog) && seeded.catalog.length > 0
      && seeded.aliases !== null && typeof seeded.aliases === 'object') {
      applyBuiltinCatalog(seeded.catalog as ModelEntry[], seeded.aliases as Record<string, string>)
    }
    const pricing = parsed as LivePricing
    if (pricing.source === 'builtin' && attempt < MAX_ATTEMPTS - 1) {
      // 节点端启动拉取可能仍在进行中：稍后重试，避免把「更新中」误判成永久内置。
      if (attempt === 0) {
        // 已有重试链在跑则不叠加新链；否则标记并启动本链。
        if (livePricingRetryPending) return
        livePricingRetryPending = true
      }
      setTimeout(() => { void loadLivePricing(attempt + 1) }, 2000)
      return
    }
    livePricingRetryPending = false
    lastPricingSyncedAt = pricing.syncedAt ?? 0
    applyLivePricing(pricing)
  } catch {
    // 拉取失败：维持内置目录与内置汇率（默认值降级）。
    livePricingRetryPending = false
  }
}

/**
 * 手动同步价格目录：POST /api/billing/pricing/refresh 让服务端立刻重拉
 * models.dev / 汇率，随后重载 pricing 文档并刷新界面。失败静默保持现状。
 * @returns 同步是否成功（供按钮态展示降级）。
 */
export async function syncPricingNow(): Promise<boolean> {
  try {
    const response = await fetchBilling(PRICING_REFRESH_PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
      // 用户显式点的「立即同步」：服务端要真去拉 models.dev / 汇率（上游各有
      // 8s 超时，可能串行），给足 30s——它不在 30s 轮询链路上，超时也不会
      // 与轮询重叠（issue #104 的 12s 默认超时只用于轮询端点）。
      timeoutMs: 30_000,
    })
    if (!response.ok) return false
    await loadLivePricing()
    return true
  } catch {
    return false
  }
}

/** 公开 loadLivePricing 供 UsageBilling 触发器/弹窗挂载时调用。 */
export { loadLivePricing }
