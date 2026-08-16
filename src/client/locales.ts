/** Locale dictionaries for the usage billing surface. */

export type UsageBillingKey =
  | 'billing.title'
  | 'billing.subtitle'
  | 'billing.cost'
  | 'billing.todayCost'
  | 'billing.monthCost'
  | 'billing.yearCost'
  | 'billing.totalCost'
  | 'billing.calls'
  | 'billing.cacheHitRate'
  | 'billing.tokens'
  | 'billing.inputTokens'
  | 'billing.outputTokens'
  | 'billing.avgCost'
  | 'billing.trend'
  | 'billing.trendEmpty'
  | 'billing.models'
  | 'billing.estimated'
  | 'billing.actual'
  | 'billing.pricing'
  | 'billing.showPricing'
  | 'billing.hidePricing'
  | 'billing.pricePerM'
  | 'billing.input'
  | 'billing.output'
  | 'billing.cacheHit'
  | 'billing.peak'
  | 'billing.offPeak'
  | 'billing.flat'
  | 'billing.peakHours'
  | 'billing.band'
  | 'billing.openDashboard'
  | 'billing.close'
  | 'billing.lastUpdated'
  | 'billing.noData'
  | 'billing.todayRate'
  | 'billing.rateLive'
  | 'billing.rateBuiltin'
  | 'billing.balance'
  | 'billing.balanceUnconfigured'
  | 'billing.balanceUnauthorized'
  | 'billing.balanceUnreachable'

export const NS = 'usageBilling'

export const zh: Record<UsageBillingKey, string> = {
  'billing.title': '使用统计',
  'billing.subtitle': '计费仪表盘',
  'billing.cost': '费用',
  'billing.todayCost': '今日费用',
  'billing.monthCost': '本月费用',
  'billing.yearCost': '本年费用',
  'billing.totalCost': '总费用',
  'billing.calls': '调用',
  'billing.cacheHitRate': '缓存命中率',
  'billing.tokens': 'Token',
  'billing.inputTokens': '输入',
  'billing.outputTokens': '输出',
  'billing.avgCost': '平均成本',
  'billing.trend': '每日费用与调用趋势',
  'billing.trendEmpty': '暂无趋势数据',
  'billing.models': '模型计费明细',
  'billing.estimated': '估算',
  'billing.actual': '实际',
  'billing.pricing': '模型单价表',
  'billing.showPricing': '查看模型单价',
  'billing.hidePricing': '收起单价表',
  'billing.pricePerM': '¥ / 1M tokens',
  'billing.input': '输入',
  'billing.output': '输出',
  'billing.cacheHit': '缓存命中',
  'billing.peak': '高峰',
  'billing.offPeak': '低谷',
  'billing.flat': '全天统一',
  'billing.peakHours': '高峰时段',
  'billing.band': '时段',
  'billing.openDashboard': '打开计费仪表盘',
  'billing.close': '关闭',
  'billing.lastUpdated': '数据更新于',
  'billing.noData': '暂无计费数据',
  'billing.todayRate': '今日汇率',
  'billing.rateLive': '实时',
  'billing.rateBuiltin': '内置',
  'billing.balance': '余额',
  'billing.balanceUnconfigured': '未配置',
  'billing.balanceUnauthorized': '密钥无效',
  'billing.balanceUnreachable': '查询失败',
}

export const en: Record<UsageBillingKey, string> = {
  'billing.title': 'Usage',
  'billing.subtitle': 'Billing dashboard',
  'billing.cost': 'Cost',
  'billing.todayCost': 'Today',
  'billing.monthCost': 'This month',
  'billing.yearCost': 'This year',
  'billing.totalCost': 'Total',
  'billing.calls': 'Calls',
  'billing.cacheHitRate': 'Cache Hit',
  'billing.tokens': 'Tokens',
  'billing.inputTokens': 'Input',
  'billing.outputTokens': 'Output',
  'billing.avgCost': 'Avg cost',
  'billing.trend': 'Daily cost & calls',
  'billing.trendEmpty': 'No trend data yet',
  'billing.models': 'Model billing',
  'billing.estimated': 'Est.',
  'billing.actual': 'Actual',
  'billing.pricing': 'Model pricing',
  'billing.showPricing': 'View pricing',
  'billing.hidePricing': 'Hide pricing',
  'billing.pricePerM': '¥ / 1M tokens',
  'billing.input': 'Input',
  'billing.output': 'Output',
  'billing.cacheHit': 'Cache hit',
  'billing.peak': 'Peak',
  'billing.offPeak': 'Off-peak',
  'billing.flat': 'Flat',
  'billing.peakHours': 'Peak hours',
  'billing.band': 'Band',
  'billing.openDashboard': 'Open billing dashboard',
  'billing.close': 'Close',
  'billing.lastUpdated': 'Updated',
  'billing.noData': 'No billing data yet',
  'billing.todayRate': 'Today rate',
  'billing.rateLive': 'Live',
  'billing.rateBuiltin': 'Built-in',
  'billing.balance': 'Balance',
  'billing.balanceUnconfigured': 'Not set',
  'billing.balanceUnauthorized': 'Bad key',
  'billing.balanceUnreachable': 'Unavailable',
}
