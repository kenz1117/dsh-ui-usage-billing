/**
 * 本月预计 / 日均消耗（issue #47）：按日均外推本月总花费；余额可撑天数也复用。
 * 纯函数（日期取本地时区），无 React 依赖。导出供测试。
 */

/**
 * 日均消耗（元/天）：取最近 7 天（含今天）总花费 ÷ 有记录天数；无记录返回 0
 * （此时可用天数无法估算，调用方不显示天数提示）。日期戳字典序即时间序。
 */
export function dailyBurnRate(byDay: Record<string, { cost: number }>, today: string): number {
  const dates = Object.keys(byDay).filter(d => d <= today).sort().slice(-7)
  if (dates.length === 0) return 0
  const total = dates.reduce((sum, d) => sum + (byDay[d]?.cost ?? 0), 0)
  return total / dates.length
}

/**
 * 近 7 个自然日（含今天）的日均消耗（元/天）：分母固定 7 天——空闲天计入分母，
 * 反映真实使用节奏。与 {@link dailyBurnRate} 的差别：后者按「有记录天数」作分母
 * （活跃天均），用于余额可撑天数的悲观估计；本函数用于本月预计的节奏基准。
 */
function recentDailyRate(byDay: Record<string, { cost: number }>, today: string): number {
  const parts = today.split('-')
  const day = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  let total = 0
  for (let offset = 0; offset < 7; offset += 1) {
    const stamp = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
    total += byDay[stamp]?.cost ?? 0
    day.setDate(day.getDate() - 1)
  }
  return total / 7
}

/**
 * 本月预计总花费：**已发生 + 近 7 天节奏 × 本月剩余天数**。
 *
 * 口径变更（2026-10-23）：旧口径拿「本月有记录的天数」当分母求日均再乘整月天数，
 * 稀疏使用的月份会被放大数倍——实测一个只有 4 天记录、其余 19 天没用的月份被外推
 * 成实际值的 4 倍（¥3.4 → ¥15.0 的旧算法给 ¥572.9）。新口径只外推「还没发生的
 * 那些天」，且节奏基准取近 7 个自然日（含空闲天）：近期没花钱就不虚增。
 *
 * 无本月记录时回退为最近 7 天（活跃天）日均 × 剩余天数；无任何记录时返回 0。
 * 导出供测试：纯函数，不依赖组件。
 * @param byDay - 按日费用表。
 * @param monthPrefix - 本月前缀（YYYY-MM）。
 * @param today - 今日日期戳（YYYY-MM-DD）。
 * @returns 本月预计花费（人民币元）；无数据时为 0。
 */
export function projectMonthCost(byDay: Record<string, { cost: number }>, monthPrefix: string, today: string): number {
  const dates = Object.keys(byDay).filter(d => d.startsWith(monthPrefix))
  const actual = dates.reduce((sum, d) => sum + (byDay[d]?.cost ?? 0), 0)
  // 预测目标月的总天数：从 monthPrefix（YYYY-MM）解析年月，取当月最后一日的日号。
  // 不能用系统当前月——月初查看上月完整账单时两者错位（如 9 月看 8 月会用 30 天）。
  const parts = monthPrefix.split('-')
  const monthLen = new Date(Number(parts[0]), Number(parts[1]), 0).getDate()
  // 本月已过天数（含今天）：today 落在本月的第几天；不在本月 = 该月已结束。
  const elapsed = today.startsWith(monthPrefix) ? Number(today.slice(8, 10)) : monthLen
  const remaining = Math.max(0, monthLen - elapsed)
  if (actual <= 0) {
    // 本月还没有任何按量记录：按最近 7 天（活跃天）日均外推剩余天数。
    const burn = dailyBurnRate(byDay, today)
    return burn * remaining
  }
  return actual + recentDailyRate(byDay, today) * remaining
}
