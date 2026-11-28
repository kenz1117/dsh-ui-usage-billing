/**
 * 用户自定义单价显示重估：聚合发生在宿主进程（按内置目录计价），用户价只在
 * 客户端显示层生效。对 byDayModels（day×model 完整二维）中命中用户价的模型
 * 逐格平价重算 cost，并派生 byDay / byModel / total 的 cost。其余视图
 * （bySite / byTier / bySession / byTurn）保持宿主原值——逐格时刻或行级归属
 * 在客户端不可得，口径差异在设置面板注明。导出供测试：纯函数。
 */

import {
  canonModelId,
  DEFAULT_PEAK_SHARE,
  getRateInfo,
  getUserPrices,
  userOriginPriceEntryOf,
  userPriceOf,
} from '../pricing.ts'
import { siteKeyParts } from '../../pricing-shared.ts'
import type { UsageStats } from './types.ts'

export function recostWithUserPrices(stats: UsageStats): UsageStats {
  const entries = getUserPrices()
  if (entries === undefined || stats.byDayModels === undefined) return stats
  // 逐 day×model 重算：用户价 = 用户填的实付单价（促销不叠加）；带低谷档时按
  // DEFAULT_PEAK_SHARE 比例混合（格内无调用时刻，无法逐笔分档）。
  const rate = getRateInfo().rate
  // 是否启用「按来源（origin）」精确重估：需存在带 origin 的用户价 + 服务端三维数据。
  const hasOriginData = stats.byDayModelsSite !== undefined
  const byDay: UsageStats['byDay'] = {}
  const byDayModels: UsageStats['byDayModels'] = {}
  const modelCost = new Map<string, number>()
  let totalCost = 0
  // 判断某模型是否命中「带来源」的用户价条目（用于决定是否走 origin 拆分重算）。
  const hasOriginEntry = (key: string): boolean =>
    entries.some(e => e.origin !== undefined && e.origin !== ''
      && (e.key === key || canonModelId(e.key) === canonModelId(key)))
  const costFromPrice = (price: { currency?: 'CNY' | 'USD'; input: number; cacheHit: number; output: number; offPeak?: { input: number; cacheHit: number; output: number } } | undefined,
    cell: { cacheHit: number; cacheMiss: number; output: number }, fallback: number): number => {
    if (price === undefined) return fallback
    const hit = Math.min(cell.cacheHit, cell.cacheMiss + cell.cacheHit)
    const flat = (band: { input: number; cacheHit: number; output: number }): number => {
      const raw = (cell.cacheMiss * band.input + hit * band.cacheHit + cell.output * band.output) / 1_000_000
      return price.currency === 'USD' ? raw * rate : raw
    }
    // 用户价带低谷档：峰/谷两档按固定比例混合（格内无时刻，与宿主逐笔分档口径近似）。
    if (price.offPeak === undefined) return flat(price)
    return flat(price) * DEFAULT_PEAK_SHARE + flat(price.offPeak) * (1 - DEFAULT_PEAK_SHARE)
  }
  for (const [date, models] of Object.entries(stats.byDayModels)) {
    let dayCost = 0
    const dayModels: Record<string, { calls: number; input: number; output: number; cacheHit: number; cacheMiss: number; cost: number }> = {}
    for (const [key, cell] of Object.entries(models)) {
      const priceDefault = userPriceOf(key)
      // 带来源价的兜底：三维站点数据缺失或无匹配站点桶时，用该条来源价重估整格，
      // 而不是静默回退宿主原价（issue #18：用户填了来源价却「没有效果」）。
      const originFallback = priceDefault ?? userOriginPriceEntryOf(key)
      const originEntry = hasOriginData && hasOriginEntry(key)
      let cost: number
      if (originEntry && stats.byDayModelsSite?.[date]?.[key] !== undefined) {
        // 按「模型×站点」分布逐来源重算：带 origin 价宽松命中，其余回落默认价或内置。
        let siteCost = 0
        for (const [siteKey, siteCell] of Object.entries(stats.byDayModelsSite[date][key])) {
          const parts = siteKeyParts(siteKey)
          const sitePrice = parts.kind === 'site' ? userPriceOf(key, parts.origin) : undefined
          siteCost += costFromPrice(sitePrice ?? originFallback, siteCell, siteCell.cost)
        }
        cost = siteCost
      } else {
        cost = costFromPrice(originFallback, cell, cell.cost)
      }
      dayCost += cost
      dayModels[key] = { ...cell, cost }
      modelCost.set(key, (modelCost.get(key) ?? 0) + cost)
    }
    // byDayModels 与 byDay 同源同键：缺日时按无前置数据跳过（渲染已有缺日兜底）。
    const prevDay = stats.byDay[date]
    if (prevDay !== undefined) byDay[date] = { ...prevDay, cost: dayCost }
    byDayModels[date] = dayModels
    totalCost += dayCost
  }
  return {
    ...stats,
    total: { ...stats.total, cost: totalCost },
    byDay,
    byDayModels,
    byModel: Object.fromEntries(Object.entries(stats.byModel).map(([key, cell]) => {
      const cost = modelCost.get(key)
      return [key, cost === undefined ? cell : { ...cell, cost }]
    })),
    // 已配用户价（默认价或来源价）的模型已被显示重估（issue #43），不再计入「未计价」提示。
    unpricedModels: (stats.unpricedModels ?? []).filter(key =>
      !userPriceOf(key) && !userOriginPriceEntryOf(key)),
  }
}
