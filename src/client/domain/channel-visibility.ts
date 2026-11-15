/**
 * 通道可见性（issue #126 需求）：按**通道桶**隐藏部分提供商 / 通道。
 *
 * 报告者场景：通道一多（官方、直连、几个中转、未知路由）时账单列表很长，希望
 * 在设置里勾掉不常看的几个，只留常看的通道。
 *
 * 口径与边界（写死在这里，避免各视图各算一套）：
 * - **过滤粒度 = 通道桶 key**（`site:<origin>` / `direct:<provider>` / `unknown`），
 *   不是显示名——显示名随界面语言变（中英），桶 key 稳定，偏好能跨语言沿用。
 * - **只扣可归属的用量**：隐藏通道的用量从 total / byDay / byDayModels /
 *   byModel / bySite / byDayModelsSite 中扣除；**无法归属通道的用量保留**
 *   （旧格式会话的账本行没有三维维度，无从判断属于哪个通道——宁可多算，
 *   不可静默丢数）。
 * - **无通道维度的维度保持全量口径**：会话 / 工具 / 角色 / 工作区 / 性能 /
 *   峰谷等没有通道切分，隐藏通道不影响它们；界面需注明这一口径差。
 * - 三维数据缺失（旧快照）时**整体不生效**：没有可归属数据就无从过滤，
 *   此时按未过滤渲染，而不是把用量显示成 0。
 */

import type { UsageStats } from './types.ts'

/** 一个通道桶的用量汇总（全量日期）。 */
export interface ChannelUsage {
  /** 通道桶 key（`site:<origin>` / `direct:<provider>` / `unknown`）。 */
  siteKey: string
  calls: number
  input: number
  output: number
  cacheHit: number
  cacheMiss: number
  cost: number
}

/** 可从三维格扣减的度量（与 byDayModelsSite 的格字段一一对应）。 */
interface CellAgg {
  calls: number
  input: number
  output: number
  cacheHit: number
  cacheMiss: number
  cacheWrite: number
  cost: number
}

function emptyAgg(): CellAgg {
  return { calls: 0, input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cacheWrite: 0, cost: 0 }
}

function addCell(target: CellAgg, cell: { calls: number; input: number; output: number; cacheHit: number; cacheMiss: number; cacheWrite?: number; cost: number }): void {
  target.calls += cell.calls
  target.input += cell.input
  target.output += cell.output
  target.cacheHit += cell.cacheHit
  target.cacheMiss += cell.cacheMiss
  target.cacheWrite += cell.cacheWrite ?? 0
  target.cost += cell.cost
}

/** 从目标聚合里扣掉一段用量（目标字段允许缺省——旧快照无 cacheWrite）。 */
function subAgg(target: { calls: number; input: number; output: number; cacheHit: number; cacheMiss: number; cacheWrite?: number; cost: number }, agg: CellAgg): void {
  target.calls -= agg.calls
  target.input -= agg.input
  target.output -= agg.output
  target.cacheHit -= agg.cacheHit
  target.cacheMiss -= agg.cacheMiss
  target.cacheWrite = (target.cacheWrite ?? 0) - agg.cacheWrite
  target.cost -= agg.cost
}

/**
 * 汇总各通道桶的用量（全量日期，按费用降序；同费用按桶 key 稳定排序）。
 * @param stats - usage-stats 文档（读 byDayModelsSite 三维格）。
 * @returns 每个通道桶一行；无三维数据时返回空数组。
 */
export function channelUsageOf(stats: UsageStats): readonly ChannelUsage[] {
  const sites = stats.byDayModelsSite
  if (sites === undefined) return []
  const buckets = new Map<string, CellAgg>()
  for (const models of Object.values(sites)) {
    for (const bucketsOfModel of Object.values(models)) {
      for (const [siteKey, cell] of Object.entries(bucketsOfModel)) {
        const agg = buckets.get(siteKey) ?? emptyAgg()
        addCell(agg, cell)
        buckets.set(siteKey, agg)
      }
    }
  }
  return [...buckets.entries()]
    .map(([siteKey, agg]) => ({
      siteKey,
      calls: agg.calls,
      input: agg.input,
      output: agg.output,
      cacheHit: agg.cacheHit,
      cacheMiss: agg.cacheMiss,
      cost: agg.cost,
    }))
    .sort((a, b) => (b.cost !== a.cost ? b.cost - a.cost : a.siteKey.localeCompare(b.siteKey)))
}

/**
 * 按显示名归并的通道分组（同名多桶合并：直连与官方同名的两个桶归一行）。
 */
export interface ChannelGroup {
  /** 显示名（界面语言下的通道名；未知路由由渲染层兜底文案）。 */
  name: string
  /** 组内全部通道桶 key —— 隐藏任一即整组隐藏（用户看到的是「这个名字」）。 */
  siteKeys: readonly string[]
  calls: number
  /** 组内 token 合计（输入 + 输出）。 */
  tokens: number
  cost: number
}

/**
 * 把通道桶按显示名归并成组（同名多桶合并），按费用降序。
 * @param rows - 通道桶用量（channelUsageOf 的产物）。
 * @param nameOf - 桶 key → 显示名的解析函数（界面语言相关）。
 * @returns 通道分组列表。
 */
export function groupChannelsByName(
  rows: readonly ChannelUsage[],
  nameOf: (siteKey: string) => string,
): readonly ChannelGroup[] {
  const groups = new Map<string, { siteKeys: string[]; calls: number; tokens: number; cost: number }>()
  for (const row of rows) {
    const name = nameOf(row.siteKey)
    const group = groups.get(name) ?? { siteKeys: [], calls: 0, tokens: 0, cost: 0 }
    group.siteKeys.push(row.siteKey)
    group.calls += row.calls
    group.tokens += row.input + row.output
    group.cost += row.cost
    groups.set(name, group)
  }
  return [...groups.entries()]
    .map(([name, group]) => ({ name, ...group }))
    .sort((a, b) => (b.cost !== a.cost ? b.cost - a.cost : a.name.localeCompare(b.name, 'zh')))
}

/**
 * 按隐藏通道过滤统计文档。
 *
 * 扣除隐藏通道在 total / byDay / byDayModels / byModel / bySite /
 * byDayModelsSite 中的用量；无通道维度的维度（会话 / 工具 / 角色 / 工作区 /
 * 性能 / 峰谷 / reasoning / 官方口径）保持全量。三维数据缺失时整体原样返回。
 * @param stats - 原始统计文档。
 * @param hidden - 隐藏的通道桶 key 集合。
 * @returns 过滤后的统计文档（未命中任何隐藏通道时返回原对象引用）。
 */
export function filterStatsByChannels(stats: UsageStats, hidden: ReadonlySet<string>): UsageStats {
  if (hidden.size === 0) return stats
  const sites = stats.byDayModelsSite
  // 无三维数据 → 无可归属用量 → 过滤无从生效（按未过滤渲染，不静默显示 0）。
  if (sites === undefined) return stats

  const hiddenByDayModel = new Map<string, Map<string, CellAgg>>()
  const hiddenByDay = new Map<string, CellAgg>()
  const hiddenByModel = new Map<string, CellAgg>()
  const hiddenTotal = emptyAgg()
  const keptSites: NonNullable<UsageStats['byDayModelsSite']> = {}

  for (const [date, models] of Object.entries(sites)) {
    const keptModels: Record<string, Record<string, {
      calls: number
      input: number
      output: number
      cacheHit: number
      cacheMiss: number
      cacheWrite?: number
      cost: number
      plan?: boolean
    }>> = {}
    for (const [modelKey, buckets] of Object.entries(models)) {
      const keptBuckets: Record<string, {
        calls: number
        input: number
        output: number
        cacheHit: number
        cacheMiss: number
        cacheWrite?: number
        cost: number
        plan?: boolean
      }> = {}
      for (const [siteKey, cell] of Object.entries(buckets)) {
        if (hidden.has(siteKey)) {
          // 逐日 × 模型 / 逐日 / 逐模型 / 全量 四份聚合：byDayModels 是日 × 模型
          // 维度，用全量聚合扣减会把别的日期的隐藏用量扣到今天头上。
          const dayModels = hiddenByDayModel.get(date) ?? new Map<string, CellAgg>()
          const dayModelAgg = dayModels.get(modelKey) ?? emptyAgg()
          addCell(dayModelAgg, cell)
          dayModels.set(modelKey, dayModelAgg)
          hiddenByDayModel.set(date, dayModels)
          const dayAgg = hiddenByDay.get(date) ?? emptyAgg()
          addCell(dayAgg, cell)
          hiddenByDay.set(date, dayAgg)
          const modelAgg = hiddenByModel.get(modelKey) ?? emptyAgg()
          addCell(modelAgg, cell)
          hiddenByModel.set(modelKey, modelAgg)
          addCell(hiddenTotal, cell)
          continue
        }
        keptBuckets[siteKey] = cell
      }
      if (Object.keys(keptBuckets).length > 0) keptModels[modelKey] = keptBuckets
    }
    keptSites[date] = keptModels
  }

  // byDay：逐日扣掉隐藏通道的用量（该日其余用量——含无法归属的旧格式行——保留）。
  const byDay: UsageStats['byDay'] = {}
  for (const [date, row] of Object.entries(stats.byDay)) {
    const agg = hiddenByDay.get(date)
    if (agg === undefined) {
      byDay[date] = row
      continue
    }
    const next = { ...row }
    subAgg(next, agg)
    byDay[date] = next
  }

  // byDayModels：逐日 × 模型扣减。
  const byDayModels: UsageStats['byDayModels'] = {}
  for (const [date, models] of Object.entries(stats.byDayModels ?? {})) {
    const nextModels: Record<string, {
      calls: number
      input: number
      output: number
      cacheHit: number
      cacheMiss: number
      cacheWrite?: number
      cost: number
    }> = {}
    for (const [modelKey, cell] of Object.entries(models)) {
      const next = { ...cell }
      const agg = hiddenByDayModel.get(date)?.get(modelKey)
      if (agg !== undefined) subAgg(next, agg)
      nextModels[modelKey] = next
    }
    byDayModels[date] = nextModels
  }

  // byModel：逐模型扣减。
  const byModel: UsageStats['byModel'] = {}
  for (const [modelKey, cell] of Object.entries(stats.byModel)) {
    const next = { ...cell }
    const agg = hiddenByModel.get(modelKey)
    if (agg !== undefined) subAgg(next, agg)
    byModel[modelKey] = next
  }

  // bySite：直接去掉隐藏桶。
  const bySite: UsageStats['bySite'] = {}
  for (const [siteKey, cell] of Object.entries(stats.bySite ?? {})) {
    if (hidden.has(siteKey)) continue
    bySite[siteKey] = cell
  }

  // total：扣掉隐藏通道的可归属用量（reasoning / 搜索估算 / 官方口径等无通道
  // 维度的字段保持全量——界面标注该口径差）。
  const total = { ...stats.total }
  subAgg(total, hiddenTotal)

  return { ...stats, total, byDay, byDayModels, byModel, bySite, byDayModelsSite: keptSites }
}
