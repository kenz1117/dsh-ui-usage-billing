/**
 * 用户自定义单价显示重估：聚合发生在宿主进程（按内置目录计价），用户价只在
 * 客户端显示层生效。对 byDayModels（day×model 完整二维）中命中用户价的模型
 * 逐格平价重算 cost，并派生 byDay / byModel / total 的 cost。其余视图
 * （bySite / byTier / bySession / byTurn）保持宿主原值——逐格时刻或行级归属
 * 在客户端不可得，口径差异在设置面板注明。导出供测试：纯函数。
 */

import {
  DEFAULT_PEAK_SHARE,
  getRateInfo,
  getUserPrices,
  userOriginPriceEntriesOf,
  userPriceEntryOf,
} from '../pricing.ts'
import type { UsageStats } from './types.ts'

export function recostWithUserPrices(stats: UsageStats): UsageStats {
  const entries = getUserPrices()
  if (entries === undefined || stats.byDayModels === undefined || Object.keys(stats.byDayModels).length === 0) return stats
  // 逐 day×model 重算：用户价 = 用户填的实付单价（促销不叠加）；带低谷档时按
  // DEFAULT_PEAK_SHARE 比例混合（格内无调用时刻，无法逐笔分档）。
  const rate = getRateInfo().rate
  const byDay: UsageStats['byDay'] = {}
  const byDayModels: UsageStats['byDayModels'] = {}
  const modelCost = new Map<string, number>()
  const repriced = new Set<string>()
  const stillUnpriced = new Set<string>()
  const modelPrices = new Map<string, { defaultPrice: ReturnType<typeof userPriceEntryOf>; sourcePrices: ReturnType<typeof userOriginPriceEntriesOf> }>()
  let totalCost = 0
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
      let prices = modelPrices.get(key)
      if (prices === undefined) {
        prices = { defaultPrice: userPriceEntryOf(key), sourcePrices: userOriginPriceEntriesOf(key) }
        modelPrices.set(key, prices)
      }
      const { defaultPrice, sourcePrices } = prices
      const sites = stats.byDayModelsSite?.[date]?.[key]
      const applyPrice = (price: typeof defaultPrice, usage: typeof cell): number => {
        if (usage.calls > 0) {
          if (price === undefined) stillUnpriced.add(key)
          else repriced.add(key)
        }
        return costFromPrice(price, usage, usage.cost)
      }
      let cost = cell.cost
      if (stats.byModel[key]?.plan !== true) {
        if (stats.byDayModelsSite === undefined) {
          // 旧快照缺整个三维格：唯一来源价可用于估算，无法验证实际来源。
          const legacyPrice = sourcePrices.length === 1 ? sourcePrices[0] : undefined
          cost = applyPrice(defaultPrice ?? legacyPrice, cell)
        } else if (defaultPrice !== undefined || sourcePrices.length > 0) {
          // 仅替换已归属格的费用；剩余用量（包括老账本行）保留宿主计价。
          let remainingCalls = cell.calls
          for (const [siteKey, siteCell] of Object.entries(sites ?? {})) {
            remainingCalls -= siteCell.calls
            if (siteCell.plan || siteKey === 'direct:deepseek-account') continue
            // 混合格没有独立的订阅 token 数，不能对整格重估。
            if ((siteCell.planCalls ?? 0) > 0) {
              stillUnpriced.add(key)
              continue
            }
            const origin = siteKey.startsWith('site:') ? siteKey.slice('site:'.length) : undefined
            const price = origin === undefined ? defaultPrice : userPriceEntryOf(key, origin)
            cost += applyPrice(price, siteCell) - siteCell.cost
          }
          if (remainingCalls > 0) stillUnpriced.add(key)
        }
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
    // 仅当本期实际用量均已覆盖时才撤掉提示（issue #43）；不能只看配置里有没有价。
    unpricedModels: (stats.unpricedModels ?? []).filter(key => !repriced.has(key) || stillUnpriced.has(key)),
  }
}
