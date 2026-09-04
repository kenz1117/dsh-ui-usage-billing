/** Locale dictionaries for the usage billing surface. */

export type UsageBillingKey =
  | 'title'
  | 'cost'
  | 'todayCost'
  | 'monthCost'
  | 'yearCost'
  | 'monthProjected'
  | 'liveTurn'
  | 'liveSession'
  | 'calls'
  | 'cacheHitRate'
  | 'tokens'
  | 'inputTokens'
  | 'outputTokens'
  | 'avgCost'
  | 'trend'
  | 'trend7d'
  | 'trend30d'
  | 'trendMetric'
  | 'trendMetricCost'
  | 'trendMetricTokens'
  | 'trendEmpty'
  | 'budget'
  | 'budgetAmount'
  | 'budgetSummary'
  | 'sessions'
  | 'sessionTitle'
  | 'project'
  | 'lastActive'
  | 'sessionOverflow'
  | 'budgetTierBody'
  | 'models'
  | 'providerBilling'
  | 'actual'
  | 'pricing'
  | 'input'
  | 'output'
  | 'cacheHit'
  | 'peak'
  | 'offPeak'
  | 'flat'
  | 'band'
  | 'close'
  | 'footer'
  | 'footerCredit'
  | 'lastUpdated'
  | 'noData'
  | 'todayRate'
  | 'rateLive'
  | 'rateBuiltin'
  | 'promoBadge'
  | 'promoUntil'
  | 'promoOpenEnded'
  | 'pricingTip'
  | 'pricingUnit'
  | 'pricingNotes'
  | 'ubPeak'
  | 'ubOff'
  | 'ubStd'
  | 'peakBand'
  | 'pricingSource'
  | 'noteCache'
  | 'noteBand'
  | 'noteSource'
  | 'balance'
  | 'balanceUnconfigured'
  | 'balanceUnauthorized'
  | 'balanceUnreachable'
  | 'uncatalogued'
  | 'estimatedPricing'
  | 'balanceDays'
  | 'balanceLowBody'
  | 'reconcileDrift'
  | 'reconcileDismiss'
  | 'subscriptionNotConfigured'
  | 'subscriptionUnauthorized'
  | 'subscriptionUnavailable'
  | 'subscriptionInvalid'
  | 'subscriptionRateLimited'
  | 'subscriptionSession'
  | 'subscriptionWeekly'
  | 'subscriptionMonthly'
  | 'subscriptionBilling'
  | 'subscriptionRemaining'
  | 'subscriptionExhausted'
  | 'subscriptionReset'
  | 'subscriptionNoApi'
  | 'floatWindow'
  | 'floatModeCombined'
  | 'floatModeSubscription'
  | 'floatMode'
  | 'floatTargets'
  | 'floatWindowHint'
  | 'floatNoTargets'
  | 'floatNoTargetsHint'
  | 'cardDisplay'
  | 'cardDisplayHint'
  | 'cardMetric'
  | 'cardMetricMoney'
  | 'cardMetricTokens'
  | 'triggerMonthTokens'
  | 'subscriptionsStale'
  | 'staleLedgerNotice'
  | 'tokenCacheWrite'
  | 'toolRank'
  | 'toolName'
  | 'userPrices'
  | 'userPricesHint'
  | 'userPriceSave'
  | 'userPriceModel'
  | 'userPriceSource'
  | 'userPriceSourceHint'
  | 'userPriceOffPeak'
  | 'userPriceNormal'
  | 'userPriceCurrency'
  | 'userPriceAdd'
  | 'userPriceRemoveSelected'
  | 'userPriceSelect'
  | 'sessionStaleBadge'
  | 'heatmapLess'
  | 'heatmapMore'
  | 'currency'
  | 'currencyCny'
  | 'currencyUsd'
  | 'heatmap'
  | 'rounds'
  | 'roundsHint'
  | 'anomaly'
  | 'workspaces'
  | 'workspacesHint'
  | 'model'
  | 'thModel'
  | 'thInputMiss'
  | 'thInputHit'
  | 'costAbbr'
  | 'tabOverview'
  | 'tabTrends'
  | 'tabProviders'
  | 'tabPricing'
  | 'tabSettings'
  | 'budgetHint'
  | 'peakAlertHint'
  | 'peakAlertDescPeak'
  | 'peakAlertDescOff'
  | 'export'
  | 'exportCsvDay'
  | 'exportCsvSession'
  | 'exportJson'
  | 'peakShare'
  | 'peakSharePerCall'
  | 'offPeakSavings'
  | 'perfMax'
  | 'weekCost'
  | 'roleCost'
  | 'roleUser'
  | 'roleAssistant'
  | 'roleTool'
  | 'roleHint'
  | 'tierPeak'
  | 'tierOff'
  | 'tierToPeak'
  | 'tierToOff'
  | 'tierAlertEnterPeak'
  | 'tierAlertEnterOff'
  | 'peakAlertTitlePeak'
  | 'peakAlertTitleOff'
  | 'peakAlert'
  | 'peakAlertLeadMin'
  | 'peakAlertPos'
  | 'peakAlertMode'
  | 'peakAlertPosCorner'
  | 'peakAlertPosCenter'
  | 'peakAlertModePeak'
  | 'peakAlertModeOff'
  | 'peakAlertModeBoth'
  | 'peakAlertWebNotify'
  | 'peakAlertPreview'
  | 'planTypeCode'
  | 'planTypeToken'
  | 'subscriptionFeePerMonth'
  | 'triggerToday'
  | 'triggerMonth'
  | 'subscriptionIncluded'
  | 'free'
  | 'official'
  | 'thirdParty'
  | 'perfSamples'
  | 'perfTtft'
  | 'perfP50'
  | 'perfP90'
  | 'perfTps'
  | 'perfLatency'
  | 'perfEstimated'
  | 'perfEmpty'
  | 'perfTpsUnit'
  | 'perfTitle'
  | 'perfHint'
  | 'perfAll'
  | 'perfChartEmpty'
  | 'heatmapYear'
  | 'heatmapMonth'
  | 'activeDays'
  | 'streakDays'
  | 'subscriptionAutoDetect'
  | 'pluginVersion'
  | 'pluginAuthor'
  | 'pluginRepository'
  | 'pluginNpm'
  | 'pluginLicense'
  | 'tabToken'
  | 'tokenExport'
  | 'tokenExportCsv'
  | 'tokenCacheHitRate'
  | 'tokenReasoningShare'
  | 'tokenReasoningShort'
  | 'tokenIo'
  | 'tokenPeak'
  | 'tokenDaily'
  | 'tokenByModel'
  | 'tokenMiss'
  | 'tokenHit'
  | 'tokenOutput'
  | 'tokenViewStructure'
  | 'tokenViewModel'
  | 'tokenHitShort'
  | 'tokenMissShort'
  | 'tokenTotal'
  | 'tokenShare'
  | 'usageStatsTool'
  | 'usageStatsToolHint'
  | 'balanceGranted'
  | 'balanceTopped'
  | 'balanceDaily'
  | 'balanceDaysLong'
  | 'balanceDaysUnit'
  | 'popTodayModel'
  | 'popNoConsumption'
  | 'popTitle'
  | 'popDirectLead'
  | 'popSubLead'
  | 'unpricedHint'
  | 'searchEstimateHint'
  | 'siteListDisplay'
  | 'siteListDisplayHint'
  | 'liveCostBar'
  | 'liveCostBarHint'
  | 'liveCostBarPosition'
  | 'liveCostBarPosBelow'
  | 'liveCostBarPosAbove'
  | 'exportCsvSite'
  | 'panelRelayQuota'
  | 'relayBalance'
  | 'relayNoQuota'
  | 'relayWindowUsed'
  | 'relayKindNewApi'
  | 'relayKindSub2Api'
  | 'relayKindUnknown'

export const NS = 'usageBilling'

export const zh: Record<UsageBillingKey, string> = {
  'title': '使用统计',
  'cost': '费用',
  'todayCost': '今日费用',
  'monthCost': '本月费用',
  'yearCost': '本年费用',
  'monthProjected': '本月预计',
  'liveTurn': '本轮',
  'liveSession': '会话',
  'calls': '调用',
  'cacheHitRate': '缓存命中率',
  'tokens': 'Token',
  'inputTokens': '输入',
  'outputTokens': '输出',
  'avgCost': '平均成本',
  'trend': '每日费用与调用趋势',
  'trend7d': '7 天',
  'trend30d': '30 天',
  'trendMetric': '趋势指标',
  'trendMetricCost': '费用',
  'trendMetricTokens': 'Token',
  'trendEmpty': '暂无趋势数据',
  'budget': '本月预算',
  'budgetAmount': '预算金额',
  'budgetSummary': '本月已用 {used} / {total}；达到 80% 时提醒，达到 100% 时红色脉冲警示',
  'sessions': '会话明细',
  'sessionTitle': '标题',
  'project': '项目',
  'lastActive': '最后活跃',
  'sessionOverflow': '仅显示花费前 {limit} 个，共 {total} 个会话',
  'budgetTierBody': '本月花费 {cost} 已达预算 {budget} 的 {pct}%',
  'models': '模型计费明细',
  'providerBilling': '厂商计费与订阅',
  'actual': '实际',
  'pricing': '模型单价表',
  'input': '输入',
  'output': '输出',
  'cacheHit': '缓存命中',
  'peak': '高峰',
  'offPeak': '低谷',
  'flat': '全天统一',
  'band': '时段',
  'close': '关闭',
  'footer': '每 30s 自动轮询 · 仅统计本机 dsh 会话',
  'footerCredit': 'dsh-ui-usage-billing {version} · MIT',
  'lastUpdated': '数据更新于',
  'noData': '暂无计费数据',
  'todayRate': '今日汇率',
  'rateLive': '实时',
  'rateBuiltin': '内置',
  'promoBadge': '限时折扣',
  'promoUntil': '促销价至 {date}，之后自动恢复刊例价',
  'promoOpenEnded': '厂商未公布截止时间，当前按折扣计价；公告截止后自动恢复刊例价',
  'pricingTip': 'DeepSeek 模型自北京时间 2026-08-23（周日）00:00 起：工作日高峰 9-12 / 14-18（×2），周末（周六 / 周日）全天低谷价；双价单元格按峰 / 谷展示，费用按调用时刻计。',
  'pricingUnit': '单位：人民币 / 每百万 Token',
  'pricingNotes': '计价说明',
  'ubPeak': '峰',
  'ubOff': '谷',
  'ubStd': '标准',
  'peakBand': '峰谷分带',
  'pricingSource': '数据来源',
  'noteCache': '命中部分按缓存价计费，显著降低成本。',
  'noteBand': '高峰与空闲时段单价不同，空闲约半价。',
  'noteSource': '价格来自实时汇率 + 模型定价目录，未收录模型按 0 计并提示。',
  'balance': '余额',
  'balanceUnconfigured': '未配置',
  'balanceUnauthorized': '密钥无效',
  'balanceUnreachable': '查询失败',
  'uncatalogued': '未收录',
  'estimatedPricing': '估算价',
  'balanceDays': '约可撑 {days} 天',
  'balanceLowBody': '{name} 余额 {balance}，约可撑 {days} 天，请及时充值',
  'reconcileDrift': '系统监控到{provider}官方余额变动 {spent}，本面板记录 {today}，差额通常由其它工具或 API 的消耗所致',
  'reconcileDismiss': '知道了',
  'subscriptionNotConfigured': '未配置密钥',
  'subscriptionUnauthorized': '密钥无效',
  'subscriptionUnavailable': '查询失败',
  'subscriptionInvalid': '响应异常',
  'subscriptionRateLimited': '触发限流',
  'subscriptionSession': '本次',
  'subscriptionWeekly': '本周',
  'subscriptionMonthly': '本月',
  'subscriptionBilling': '计费周期',
  'subscriptionRemaining': '剩余 {pct}%',
  'subscriptionExhausted': '已用尽',
  'subscriptionReset': '{date} 重置',
  'subscriptionNoApi': '该厂商暂未提供用量查询接口',
  'floatWindow': '模型用量悬浮窗',
  'floatModeCombined': '综合',
  'floatModeSubscription': '订阅卡',
  'floatMode': '展示模式',
  'floatTargets': '订阅目标',
  'floatWindowHint': '悬浮在左下角计费卡上的用量速览；综合=当前样式，订阅卡=每次展示一张订阅额度卡（可切换）。',
  'cardDisplay': '计费卡显示',
  'cardDisplayHint': '切换左下角计费卡的主指标：花费金额或 Token 消耗（副行与迷你柱同步切换，悬浮窗不受影响）。',
  'cardMetric': '主指标',
  'cardMetricMoney': '花费金额',
  'cardMetricTokens': 'Token 消耗',
  'floatNoTargets': '未指定订阅通道，请在设置中勾选要展示的订阅。',
  'floatNoTargetsHint': '暂无可选的订阅通道。',
  'subscriptionsStale': '订阅额度刷新失败，以下为缓存数据',
  'staleLedgerNotice': '{count} 个会话出自旧版算法存档（日志已删，无法重算），模型归属可能有误差',
  'tokenCacheWrite': '写入',
  'toolRank': '工具排行',
  'toolName': '工具',
  'userPrices': '自定义单价',
  'userPricesHint': '为未收录或变价模型填入实付单价，总览与日趋势按此重估；模型可用下拉候选（目录键或模型 id）；来源留空=该模型默认价，填入中转站域名=仅该来源的同名模型用此价（协议可省）；低谷价三栏填后按峰/谷混合估算，留空=平档',
  'userPriceSave': '保存',
  'userPriceModel': '模型',
  'userPriceSource': '来源（中转站域名）',
  'userPriceSourceHint': '留空=默认价，或 https://api.中转站.com',
  'userPriceOffPeak': '低谷价',
  'userPriceNormal': '标准价',
  'userPriceCurrency': '币种',
  'userPriceAdd': '新增',
  'userPriceRemoveSelected': '删除所选',
  'userPriceSelect': '选择此行',
  'sessionStaleBadge': '旧版统计',
  'heatmapLess': '少',
  'heatmapMore': '多',
  'currency': '币种',
  'currencyCny': '人民币',
  'currencyUsd': '美元',
  'heatmap': '用量热力图',
  'rounds': '每轮费用',
  'roundsHint': '最近 {count} 轮 · 柱顶为金额 · 底色为峰谷时段',
  'anomaly': '成本突增',
  'workspaces': '工作区统计',
  'workspacesHint': '点击行下钻项目成本前 5 会话',
  'model': '模型',
  'thModel': '模型名称',
  'thInputMiss': '输入缓存未命中',
  'thInputHit': '输入缓存命中',
  'costAbbr': '费用',
  'tabOverview': '概览',
  'tabTrends': '趋势',
  'tabProviders': '账单',
  'tabPricing': '费率',
  'tabSettings': '设置',
  'budgetHint': '设置月度上限，用于本月预计与超支分段提醒',
  'peakAlertHint': '在切档前弹窗提醒，可选同步系统通知',
  'peakAlertDescPeak': '即将进入高峰时段，价格将上调，请提前安排长任务',
  'peakAlertDescOff': '即将进入平价时段，价格减半，适合运行大批量任务',
  'export': '导出',
  'exportCsvDay': '按日 CSV',
  'exportCsvSession': '按会话 CSV',
  'exportJson': '全量 JSON',
  'peakShare': '峰谷时段占比',
  'peakSharePerCall': '按调用时刻精确判档',
  'offPeakSavings': '挪谷可省约 {amount}',
  'perfMax': '最大 TTFT',
  'weekCost': '本周',
  'roleCost': '费用构成',
  'roleUser': '用户输入',
  'roleAssistant': '助手输出',
  'roleTool': '工具结果',
  'roleHint': '估算：输出按实测计价，输入按消息长度摊分',
  'tierPeak': '峰时',
  'tierOff': '平价',
  'tierToPeak': '后转峰时',
  'tierToOff': '后转平价',
  'tierAlertEnterPeak': '{minutes} 分钟后进入峰时（DeepSeek 高峰价 ×2），不急的调用可稍等',
  'tierAlertEnterOff': '{minutes} 分钟后进入平价（价格减半）',
  'peakAlertTitlePeak': '即将进入高峰价',
  'peakAlertTitleOff': '即将进入平价',
  'peakAlert': '峰谷切换提醒',
  'peakAlertLeadMin': '提前量（分钟）',
  'peakAlertPos': '位置',
  'peakAlertMode': '提醒模式',
  'peakAlertPosCorner': '右下角',
  'peakAlertPosCenter': '屏幕居中',
  'peakAlertModePeak': '仅进入峰时',
  'peakAlertModeOff': '仅进入平价',
  'peakAlertModeBoth': '峰与谷都提醒',
  'peakAlertWebNotify': '同时发系统通知',
  'peakAlertPreview': '预览提醒',
  'planTypeCode': '订阅制',
  'planTypeToken': '按量',
  'subscriptionFeePerMonth': '{amount}/月',
  'triggerToday': '今日',
  'triggerMonth': '当月',
  'triggerMonthTokens': '当月 Token',
  'subscriptionIncluded': '订阅包含',
  'free': '免费',
  'official': '官方',
  'thirdParty': '三方',
  'perfSamples': '样本',
  'perfTtft': '首字延时',
  'perfP50': 'P50',
  'perfP90': 'P90',
  'perfTps': '生成速度',
  'perfLatency': '总延迟',
  'perfEstimated': '估算样本',
  'perfEmpty': '暂无性能数据',
  'perfTpsUnit': 'tok/s',
  'perfTitle': '性能',
  'perfHint': '按模型与按小时聚合；估算样本为工具续写步骤',
  'perfAll': '全选',
  'perfChartEmpty': '未选择模型或该指标暂无数据',
  'heatmapYear': '年',
  'heatmapMonth': '月',
  'activeDays': '活跃天数',
  'streakDays': '连续使用',
  'subscriptionAutoDetect': '自动识别',
  'pluginVersion': '版本',
  'pluginAuthor': '作者',
  'pluginRepository': '仓库',
  'pluginNpm': 'npm',
  'pluginLicense': '许可证',
  'tabToken': '用量',
  'tokenExport': '导出 Token',
  'tokenExportCsv': '按日 Token CSV',
  'tokenCacheHitRate': '缓存命中率',
  'tokenReasoningShare': '思考占比',
  'tokenReasoningShort': '思考',
  'tokenIo': '输入/输出比',
  'tokenPeak': '峰值日',
  'tokenDaily': '每日 Token',
  'tokenByModel': '模型 Token',
  'tokenMiss': '输入（缓存未命中）',
  'tokenHit': '输入（缓存命中）',
  'tokenOutput': '输出',
  'tokenViewStructure': '按结构',
  'tokenViewModel': '按模型',
  'tokenHitShort': '命中',
  'tokenMissShort': '未命中',
  'tokenTotal': '总 Token',
  'tokenShare': '占比',
  'usageStatsTool': '注入用量查询工具',
  'usageStatsToolHint': '让模型可在对话中查询用量/费用；会占用模型每次请求的上下文，coding 场景建议关闭（改后需重载应用生效）',
  'balanceGranted': '赠金余额',
  'balanceTopped': '充值余额',
  'balanceDaily': '日均消耗',
  'balanceDaysLong': '约可撑',
  'balanceDaysUnit': '天',
  'popTodayModel': '主力消耗模型余额',
  'popTitle': '用量速览',
  'popNoConsumption': '暂无消耗',
  'popDirectLead': '直联',
  'popSubLead': '订阅',
  'unpricedHint': '{count} 个模型未收录计价，费用已按 0 计',
  'searchEstimateHint': '含 {count} 次联网搜索请求的估算费用（每次约 {each}；日志无用量事件，按次估算，可在配置 searchCallEstimateCny 调整或关闭）',
  'siteListDisplay': '中转站列表',
  'siteListDisplayHint': '隐藏「未识别」占位条目，净化中转站额度列表',
  'liveCostBar': '平价消耗胶囊',
  'liveCostBarHint': '输入框下方的即时代费条（峰谷档位、本轮/会话费用与额度预警）；关闭后整条隐藏，统计与提醒不受影响',
  'exportCsvSite': '按站点 CSV',
  'panelRelayQuota': '中转站额度',
  'relayBalance': '余额',
  'relayNoQuota': '未读出额度',
  'relayWindowUsed': '已用',
  'relayKindNewApi': 'New API',
  'relayKindSub2Api': 'Sub2API',
  'relayKindUnknown': '未识别',
}

export const en: Record<UsageBillingKey, string> = {
  'title': 'Usage',
  'cost': 'Cost',
  'todayCost': 'Today',
  'monthCost': 'This month',
  'yearCost': 'This year',
  'monthProjected': 'Projected',
  'liveTurn': 'Turn',
  'liveSession': 'Session',
  'calls': 'Calls',
  'cacheHitRate': 'Cache Hit',
  'tokens': 'Tokens',
  'inputTokens': 'Input',
  'outputTokens': 'Output',
  'avgCost': 'Avg cost',
  'trend': 'Daily cost & calls',
  'trend7d': '7D',
  'trend30d': '30D',
  'trendMetric': 'Trend metric',
  'trendMetricCost': 'Cost',
  'trendMetricTokens': 'Tokens',
  'trendEmpty': 'No trend data yet',
  'budget': 'Monthly budget',
  'budgetAmount': 'Budget amount',
  'budgetSummary': 'Used {used} / {total} this month; warn at 80%, pulse red at 100%',
  'sessions': 'Sessions',
  'sessionTitle': 'Title',
  'project': 'Project',
  'lastActive': 'Last active',
  'sessionOverflow': 'Top {limit} of {total} sessions by cost',
  'budgetTierBody': 'This month {cost} reached {pct}% of the budget {budget}',
  'models': 'Model billing',
  'providerBilling': 'Provider billing & subscriptions',
  'actual': 'Actual',
  'pricing': 'Model pricing',
  'input': 'Input',
  'output': 'Output',
  'cacheHit': 'Cache hit',
  'peak': 'Peak',
  'offPeak': 'Off-peak',
  'flat': 'Flat',
  'band': 'Band',
  'close': 'Close',
  'footer': 'Polls every 30s · local dsh sessions only',
  'footerCredit': 'dsh-ui-usage-billing {version} · MIT',
  'lastUpdated': 'Updated',
  'noData': 'No billing data yet',
  'todayRate': 'Today rate',
  'rateLive': 'Live',
  'rateBuiltin': 'Built-in',
  'promoBadge': 'Promo',
  'promoUntil': 'Promo price until {date}, then list price resumes automatically',
  'promoOpenEnded': 'End date not announced; billed at the discounted rate until further notice, then list price resumes',
  'pricingTip': 'DeepSeek models: from 2026-08-23 (Sun) 00:00 Beijing, weekdays peak 9-12 / 14-18 (×2), weekends (Sat/Sun) all-day off-peak; cells show peak/off-peak price, billed at call time.',
  'pricingUnit': 'Unit: CNY / per 1M tokens',
  'pricingNotes': 'Pricing notes',
  'ubPeak': 'Peak',
  'ubOff': 'Off',
  'ubStd': 'Std',
  'peakBand': 'Peak/off-peak band',
  'pricingSource': 'Data source',
  'noteCache': 'Cache hits are billed at the cache rate, cutting cost.',
  'noteBand': 'Peak and off-peak prices differ; off-peak is roughly half price.',
  'noteSource': 'Prices come from the live rate + model catalog; unlisted models count as 0 and are flagged.',
  'balance': 'Balance',
  'balanceUnconfigured': 'Not set',
  'balanceUnauthorized': 'Bad key',
  'balanceUnreachable': 'Unavailable',
  'uncatalogued': 'Not catalogued',
  'estimatedPricing': 'Estimated',
  'balanceDays': '~{days} days left',
  'balanceLowBody': '{name} balance {balance}, ~{days} days left, please top up',
  'reconcileDrift': 'Detected {provider} official balance moved {spent}, this panel recorded {today}; the gap usually comes from other tools or APIs consuming too',
  'reconcileDismiss': 'Got it',
  'subscriptionNotConfigured': 'Key not set',
  'subscriptionUnauthorized': 'Bad key',
  'subscriptionUnavailable': 'Unavailable',
  'subscriptionInvalid': 'Bad response',
  'subscriptionRateLimited': 'Rate limited',
  'subscriptionSession': 'Current',
  'subscriptionWeekly': 'Weekly',
  'subscriptionMonthly': 'Monthly',
  'subscriptionBilling': 'Billing',
  'subscriptionRemaining': '{pct}% left',
  'subscriptionExhausted': 'Exhausted',
  'subscriptionReset': 'Resets {date}',
  'subscriptionNoApi': 'Provider does not offer a usage API',
  'floatWindow': 'Model usage popover',
  'floatModeCombined': 'Combined',
  'floatModeSubscription': 'Subscription card',
  'floatMode': 'Display mode',
  'floatTargets': 'Targets',
  'floatWindowHint': 'Usage summary floating on the footer card; Combined=current style, Subscription cards=one quota card at a time (switchable).',
  'cardDisplay': 'Billing card display',
  'cardDisplayHint': 'Switch the main metric on the bottom-left billing card between cost and token usage (sub row and sparkline follow; the popover is unaffected).',
  'cardMetric': 'Main metric',
  'cardMetricMoney': 'Cost',
  'cardMetricTokens': 'Token usage',
  'floatNoTargets': 'No subscription selected — pick some in Settings.',
  'floatNoTargetsHint': 'No subscription channel available.',
  'subscriptionsStale': 'Subscription refresh failed — showing cached data',
  'staleLedgerNotice': '{count} sessions use legacy-algorithm archives (logs deleted); attribution may be off',
  'tokenCacheWrite': 'written',
  'toolRank': 'Tool calls',
  'toolName': 'Tool',
  'userPrices': 'Custom prices',
  'userPricesHint': 'Enter actual per-1M-token prices; main views are re-costed. Pick a model key from the dropdown candidates. Leave source empty for the model default, or enter a relay origin (protocol optional) to price only that source. Fill all three off-peak fields for peak/off-peak estimation; leave them empty for flat pricing.',
  'userPriceSave': 'Save',
  'userPriceModel': 'Model',
  'userPriceSource': 'Source (relay origin)',
  'userPriceSourceHint': 'Empty = default; e.g. https://api.relay.com',
  'userPriceOffPeak': 'Off-peak price',
  'userPriceNormal': 'Standard price',
  'userPriceCurrency': 'Currency',
  'userPriceAdd': 'Add',
  'userPriceRemoveSelected': 'Remove selected',
  'userPriceSelect': 'Select this row',
  'sessionStaleBadge': 'legacy',
  'heatmapLess': 'Less',
  'heatmapMore': 'More',
  'currency': 'Currency',
  'currencyCny': 'CNY',
  'currencyUsd': 'USD',
  'heatmap': 'Usage heatmap',
  'rounds': 'Cost per turn',
  'roundsHint': 'Last {count} rounds · bar tops show amount · fill = peak/off-peak',
  'anomaly': 'Cost spike',
  'workspaces': 'Workspaces',
  'workspacesHint': 'Click a row to drill into its top-5 sessions',
  'model': 'Model',
  'thModel': 'Model name',
  'thInputMiss': 'Input (cache miss)',
  'thInputHit': 'Input (cache hit)',
  'costAbbr': 'cost',
  'tabOverview': 'Overview',
  'tabTrends': 'Trends',
  'tabProviders': 'Bills',
  'tabPricing': 'Rates',
  'tabSettings': 'Settings',
  'budgetHint': 'Set a monthly cap for projections and tier alerts',
  'peakAlertHint': 'Alert before a tier switch, optionally via system notification',
  'peakAlertDescPeak': 'About to enter peak hours — prices rise, plan long tasks ahead',
  'peakAlertDescOff': 'About to enter off-peak hours — price halves, ideal for large batches',
  'export': 'Export',
  'exportCsvDay': 'Daily CSV',
  'exportCsvSession': 'Sessions CSV',
  'exportJson': 'Full JSON',
  'peakShare': 'Peak vs off-peak',
  'peakSharePerCall': 'per-call attribution, full history',
  'offPeakSavings': 'Shift peak to off-peak: save ~{amount}',
  'perfMax': 'Max TTFT',
  'weekCost': 'This week',
  'roleCost': 'Cost breakdown',
  'roleUser': 'User input',
  'roleAssistant': 'Assistant output',
  'roleTool': 'Tool results',
  'roleHint': 'Estimated: output priced exactly, input split by message size',
  'tierPeak': 'Peak',
  'tierOff': 'Off-peak',
  'tierToPeak': 'until peak',
  'tierToOff': 'until off-peak',
  'tierAlertEnterPeak': 'Peak pricing (2x) starts in {minutes} min — non-urgent calls can wait',
  'tierAlertEnterOff': 'Off-peak pricing (50% off) starts in {minutes} min',
  'peakAlertTitlePeak': 'Peak pricing incoming',
  'peakAlertTitleOff': 'Off-peak incoming',
  'peakAlert': 'Peak/off-peak alert',
  'peakAlertLeadMin': 'Lead time (min)',
  'peakAlertPos': 'Position',
  'peakAlertMode': 'Remind mode',
  'peakAlertPosCorner': 'Bottom-right',
  'peakAlertPosCenter': 'Center',
  'peakAlertModePeak': 'Entering peak only',
  'peakAlertModeOff': 'Entering off-peak only',
  'peakAlertModeBoth': 'Both',
  'peakAlertWebNotify': 'Also send system notification',
  'peakAlertPreview': 'Preview alert',
  'planTypeCode': 'Subscription',
  'planTypeToken': 'Usage',
  'subscriptionFeePerMonth': '{amount}/mo',
  'triggerToday': 'Today',
  'triggerMonth': 'This month',
  'triggerMonthTokens': 'Monthly tokens',
  'subscriptionIncluded': 'Included',
  'free': 'Free',
  'official': 'Official',
  'thirdParty': 'Third-party',
  'perfSamples': 'Samples',
  'perfTtft': 'TTFT',
  'perfP50': 'P50',
  'perfP90': 'P90',
  'perfTps': 'Speed',
  'perfLatency': 'Total latency',
  'perfEstimated': 'Estimated',
  'perfEmpty': 'No performance data yet',
  'perfTpsUnit': 'tok/s',
  'perfTitle': 'Performance',
  'perfHint': 'Per model & per hour; estimated samples are tool-continuation steps',
  'perfAll': 'All',
  'perfChartEmpty': 'No model selected or no data for this metric',
  'heatmapYear': 'Year',
  'heatmapMonth': 'Month',
  'activeDays': 'Active days',
  'streakDays': 'Streak',
  'subscriptionAutoDetect': 'Auto',
  'pluginVersion': 'Version',
  'pluginAuthor': 'Author',
  'pluginRepository': 'Repository',
  'pluginNpm': 'npm',
  'pluginLicense': 'License',
  'tabToken': 'Usage',
  'tokenExport': 'Export tokens',
  'tokenExportCsv': 'Daily token CSV',
  'tokenCacheHitRate': 'Cache hit rate',
  'tokenReasoningShare': 'Reasoning share',
  'tokenReasoningShort': 'reasoning',
  'tokenIo': 'In/out ratio',
  'tokenPeak': 'Peak day',
  'tokenDaily': 'Daily tokens',
  'tokenByModel': 'Tokens by model',
  'tokenMiss': 'Input (cache miss)',
  'tokenHit': 'Input (cache hit)',
  'tokenOutput': 'Output',
  'tokenViewStructure': 'Structure',
  'tokenViewModel': 'By model',
  'tokenHitShort': 'Hit',
  'tokenMissShort': 'Miss',
  'tokenTotal': 'Total tokens',
  'tokenShare': 'Share',
  'usageStatsTool': 'Inject usage-stats tool',
  'usageStatsToolHint': 'Lets the model query usage/cost inside a conversation; it consumes context per request, so keep it off for coding (takes effect after a reload)',
  'balanceGranted': 'Granted',
  'balanceTopped': 'Topped up',
  'balanceDaily': 'Daily burn',
  'balanceDaysLong': '~days left',
  'balanceDaysUnit': 'days',
  'popTodayModel': 'Main model balance',
  'popTitle': 'Usage overview',
  'popNoConsumption': 'No usage yet',
  'popDirectLead': 'Direct',
  'popSubLead': 'Subscription',
  'unpricedHint': '{count} models not priced; their cost counts as 0',
  'searchEstimateHint': 'Includes estimated cost of {count} web-search requests (~{each} each; no usage events logged, per-call estimate; tune via searchCallEstimateCny)',
  'siteListDisplay': 'Relay lists',
  'siteListDisplayHint': 'Hide "unidentified" placeholder rows in the relay quota list',
  'liveCostBar': 'Live cost capsule',
  'liveCostBarHint': 'The live cost bar beside the composer (pricing tier, per-turn/session spend, quota alerts); hiding it never affects stats or alerts',
  'liveCostBarPosition': 'Position',
  'liveCostBarPosBelow': 'Below composer',
  'liveCostBarPosAbove': 'Above composer',
  'exportCsvSite': 'By site CSV',
  'panelRelayQuota': 'Relay quotas',
  'relayBalance': 'Balance',
  'relayNoQuota': 'No quota',
  'relayWindowUsed': 'used',
  'relayKindNewApi': 'New API',
  'relayKindSub2Api': 'Sub2API',
  'relayKindUnknown': 'Unknown',
}
