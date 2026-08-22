/** Locale dictionaries for the usage billing surface. */

export type UsageBillingKey =
  | 'billing.title'
  | 'billing.subtitle'
  | 'billing.cost'
  | 'billing.todayCost'
  | 'billing.monthCost'
  | 'billing.yearCost'
  | 'billing.monthProjected'
  | 'billing.liveTurn'
  | 'billing.liveSession'
  | 'billing.totalCost'
  | 'billing.calls'
  | 'billing.cacheHitRate'
  | 'billing.tokens'
  | 'billing.inputTokens'
  | 'billing.outputTokens'
  | 'billing.avgCost'
  | 'billing.trend'
  | 'billing.trend7d'
  | 'billing.trend30d'
  | 'billing.trendEmpty'
  | 'billing.budget'
  | 'billing.sessions'
  | 'billing.project'
  | 'billing.lastActive'
  | 'billing.sessionOverflow'
  | 'billing.budgetTierBody'
  | 'billing.models'
  | 'billing.providerBilling'
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
  | 'billing.uncatalogued'
  | 'billing.estimatedPricing'
  | 'billing.balanceDays'
  | 'billing.balanceLowBody'
  | 'billing.subscriptions'
  | 'billing.subscriptionNotConfigured'
  | 'billing.subscriptionUnauthorized'
  | 'billing.subscriptionUnavailable'
  | 'billing.subscriptionInvalid'
  | 'billing.subscriptionRateLimited'
  | 'billing.subscriptionSession'
  | 'billing.subscriptionWeekly'
  | 'billing.subscriptionMonthly'
  | 'billing.subscriptionBilling'
  | 'billing.subscriptionRemaining'
  | 'billing.subscriptionExhausted'
  | 'billing.subscriptionReset'
  | 'billing.subscriptionNoApi'
  | 'billing.heatmapLess'
  | 'billing.heatmapMore'
  | 'billing.currency'
  | 'billing.currencyCny'
  | 'billing.currencyUsd'
  | 'billing.heatmap'
  | 'billing.rounds'
  | 'billing.anomaly'
  | 'billing.workspaces'
  | 'billing.plan'
  | 'billing.remaining'
  | 'billing.unknownModel'
  | 'billing.model'
  | 'billing.currentRound'
  | 'billing.costAbbr'
  | 'billing.tabOverview'
  | 'billing.tabTrends'
  | 'billing.tabProviders'
  | 'billing.tabDetails'
  | 'billing.tabPricing'
  | 'billing.export'
  | 'billing.exportCsvDay'
  | 'billing.exportCsvSession'
  | 'billing.exportJson'
  | 'billing.peakShare'
  | 'billing.peakShareHint'
  | 'billing.weekCost'
  | 'billing.roleCost'
  | 'billing.roleUser'
  | 'billing.roleAssistant'
  | 'billing.roleTool'
  | 'billing.roleHint'
  | 'billing.tierPeak'
  | 'billing.tierOff'
  | 'billing.tierToPeak'
  | 'billing.tierToOff'
  | 'billing.tierAlertEnterPeak'
  | 'billing.tierAlertEnterOff'
  | 'billing.planTypeCode'
  | 'billing.planTypeToken'
  | 'billing.subscriptionFeePerMonth'
  | 'billing.triggerToday'
  | 'billing.triggerMonth'
  | 'billing.subscriptionIncluded'
  | 'billing.free'

export const NS = 'usageBilling'

export const zh: Record<UsageBillingKey, string> = {
  'billing.title': '使用统计',
  'billing.subtitle': '计费仪表盘',
  'billing.cost': '费用',
  'billing.todayCost': '今日费用',
  'billing.monthCost': '本月费用',
  'billing.yearCost': '本年费用',
  'billing.monthProjected': '本月预计',
  'billing.liveTurn': '本轮',
  'billing.liveSession': '会话',
  'billing.totalCost': '总费用',
  'billing.calls': '调用',
  'billing.cacheHitRate': '缓存命中率',
  'billing.tokens': 'Token',
  'billing.inputTokens': '输入',
  'billing.outputTokens': '输出',
  'billing.avgCost': '平均成本',
  'billing.trend': '每日费用与调用趋势',
  'billing.trend7d': '7 天',
  'billing.trend30d': '30 天',
  'billing.trendEmpty': '暂无趋势数据',
  'billing.budget': '本月预算',
  'billing.sessions': '会话明细',
  'billing.project': '项目',
  'billing.lastActive': '最后活跃',
  'billing.sessionOverflow': '仅显示花费前 {limit} 个，共 {total} 个会话',
  'billing.budgetTierBody': '本月花费 {cost} 已达预算 {budget} 的 {pct}%',
  'billing.models': '模型计费明细',
  'billing.providerBilling': '厂商计费与订阅',
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
  'billing.uncatalogued': '未收录',
  'billing.estimatedPricing': '估算价',
  'billing.balanceDays': '约可撑 {days} 天',
  'billing.balanceLowBody': '{name} 余额 {balance}，约可撑 {days} 天，请及时充值',
  'billing.subscriptions': '订阅套餐',
  'billing.subscriptionNotConfigured': '未配置密钥',
  'billing.subscriptionUnauthorized': '密钥无效',
  'billing.subscriptionUnavailable': '查询失败',
  'billing.subscriptionInvalid': '响应异常',
  'billing.subscriptionRateLimited': '触发限流',
  'billing.subscriptionSession': '本次',
  'billing.subscriptionWeekly': '本周',
  'billing.subscriptionMonthly': '本月',
  'billing.subscriptionBilling': '计费周期',
  'billing.subscriptionRemaining': '剩余 {pct}%',
  'billing.subscriptionExhausted': '已用尽',
  'billing.subscriptionReset': '{date} 重置',
  'billing.subscriptionNoApi': '该厂商暂未提供用量查询接口',
  'billing.heatmapLess': '少',
  'billing.heatmapMore': '多',
  'billing.currency': '币种',
  'billing.currencyCny': '人民币',
  'billing.currencyUsd': '美元',
  'billing.heatmap': '用量热力图',
  'billing.rounds': '每轮费用',
  'billing.anomaly': '成本突增',
  'billing.workspaces': '工作区统计',
  'billing.plan': '套餐',
  'billing.remaining': '剩余',
  'billing.unknownModel': '未定价',
  'billing.model': '模型',
  'billing.currentRound': '当前',
  'billing.costAbbr': '费用',
  'billing.tabOverview': '概览',
  'billing.tabTrends': '趋势',
  'billing.tabProviders': '明细',
  'billing.tabDetails': '统计',
  'billing.tabPricing': '费率',
  'billing.export': '导出',
  'billing.exportCsvDay': '按日 CSV',
  'billing.exportCsvSession': '按会话 CSV',
  'billing.exportJson': '全量 JSON',
  'billing.peakShare': '峰谷时段占比',
  'billing.peakShareHint': '近 {count} 轮',
  'billing.weekCost': '本周',
  'billing.roleCost': '费用构成',
  'billing.roleUser': '用户输入',
  'billing.roleAssistant': '助手输出',
  'billing.roleTool': '工具结果',
  'billing.roleHint': '估算：输出按实测计价，输入按消息长度摊分',
  'billing.tierPeak': '峰时',
  'billing.tierOff': '平价',
  'billing.tierToPeak': '后转峰时',
  'billing.tierToOff': '后转平价',
  'billing.tierAlertEnterPeak': '{minutes} 分钟后进入峰时（DeepSeek 高峰价 ×2），不急的调用可稍等',
  'billing.tierAlertEnterOff': '{minutes} 分钟后进入平价（价格减半）',
  'billing.planTypeCode': '订阅制',
  'billing.planTypeToken': '按量',
  'billing.subscriptionFeePerMonth': '{amount}/月',
  'billing.triggerToday': '今日',
  'billing.triggerMonth': '当月',
  'billing.subscriptionIncluded': '订阅包含',
  'billing.free': '免费',
}

export const en: Record<UsageBillingKey, string> = {
  'billing.title': 'Usage',
  'billing.subtitle': 'Billing dashboard',
  'billing.cost': 'Cost',
  'billing.todayCost': 'Today',
  'billing.monthCost': 'This month',
  'billing.yearCost': 'This year',
  'billing.monthProjected': 'Projected',
  'billing.liveTurn': 'Turn',
  'billing.liveSession': 'Session',
  'billing.totalCost': 'Total',
  'billing.calls': 'Calls',
  'billing.cacheHitRate': 'Cache Hit',
  'billing.tokens': 'Tokens',
  'billing.inputTokens': 'Input',
  'billing.outputTokens': 'Output',
  'billing.avgCost': 'Avg cost',
  'billing.trend': 'Daily cost & calls',
  'billing.trend7d': '7D',
  'billing.trend30d': '30D',
  'billing.trendEmpty': 'No trend data yet',
  'billing.budget': 'Monthly budget',
  'billing.sessions': 'Sessions',
  'billing.project': 'Project',
  'billing.lastActive': 'Last active',
  'billing.sessionOverflow': 'Top {limit} of {total} sessions by cost',
  'billing.budgetTierBody': 'This month {cost} reached {pct}% of the budget {budget}',
  'billing.models': 'Model billing',
  'billing.providerBilling': 'Provider billing & subscriptions',
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
  'billing.uncatalogued': 'Not catalogued',
  'billing.estimatedPricing': 'Estimated',
  'billing.balanceDays': '~{days} days left',
  'billing.balanceLowBody': '{name} balance {balance}, ~{days} days left, please top up',
  'billing.subscriptions': 'Subscriptions',
  'billing.subscriptionNotConfigured': 'Key not set',
  'billing.subscriptionUnauthorized': 'Bad key',
  'billing.subscriptionUnavailable': 'Unavailable',
  'billing.subscriptionInvalid': 'Bad response',
  'billing.subscriptionRateLimited': 'Rate limited',
  'billing.subscriptionSession': 'Current',
  'billing.subscriptionWeekly': 'Weekly',
  'billing.subscriptionMonthly': 'Monthly',
  'billing.subscriptionBilling': 'Billing',
  'billing.subscriptionRemaining': '{pct}% left',
  'billing.subscriptionExhausted': 'Exhausted',
  'billing.subscriptionReset': 'Resets {date}',
  'billing.subscriptionNoApi': 'Provider does not offer a usage API',
  'billing.heatmapLess': 'Less',
  'billing.heatmapMore': 'More',
  'billing.currency': 'Currency',
  'billing.currencyCny': 'CNY',
  'billing.currencyUsd': 'USD',
  'billing.heatmap': 'Usage heatmap',
  'billing.rounds': 'Cost per turn',
  'billing.anomaly': 'Cost spike',
  'billing.workspaces': 'Workspaces',
  'billing.plan': 'Plan',
  'billing.remaining': 'Left',
  'billing.unknownModel': 'Unpriced',
  'billing.model': 'Model',
  'billing.currentRound': 'current',
  'billing.costAbbr': 'cost',
  'billing.tabOverview': 'Overview',
  'billing.tabTrends': 'Trends',
  'billing.tabProviders': 'Details',
  'billing.tabDetails': 'Stats',
  'billing.tabPricing': 'Rates',
  'billing.export': 'Export',
  'billing.exportCsvDay': 'Daily CSV',
  'billing.exportCsvSession': 'Sessions CSV',
  'billing.exportJson': 'Full JSON',
  'billing.peakShare': 'Peak vs off-peak',
  'billing.peakShareHint': 'last {count} turns',
  'billing.weekCost': 'This week',
  'billing.roleCost': 'Cost breakdown',
  'billing.roleUser': 'User input',
  'billing.roleAssistant': 'Assistant output',
  'billing.roleTool': 'Tool results',
  'billing.roleHint': 'Estimated: output priced exactly, input split by message size',
  'billing.tierPeak': 'Peak',
  'billing.tierOff': 'Off-peak',
  'billing.tierToPeak': 'until peak',
  'billing.tierToOff': 'until off-peak',
  'billing.tierAlertEnterPeak': 'Peak pricing (2x) starts in {minutes} min — non-urgent calls can wait',
  'billing.tierAlertEnterOff': 'Off-peak pricing (50% off) starts in {minutes} min',
  'billing.planTypeCode': 'Subscription',
  'billing.planTypeToken': 'Usage',
  'billing.subscriptionFeePerMonth': '{amount}/mo',
  'billing.triggerToday': 'Today',
  'billing.triggerMonth': 'This month',
  'billing.subscriptionIncluded': 'Included',
  'billing.free': 'Free',
}
