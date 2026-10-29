/** Locale dictionaries for the usage billing surface. */

export type UsageBillingKey =
  | 'title'
  | 'cost'
  | 'todayCost'
  | 'monthCost'
  | 'yearCost'
  | 'monthProjected'
  | 'monthProjectedHint'
  | 'liveTurn'
  | 'liveSession'
  | 'liveSessionSub'
  | 'calls'
  | 'cacheHitRate'
  | 'tokens'
  | 'inputTokens'
  | 'outputTokens'
  | 'avgCost'
  | 'kpiRange'
  | 'avgRangeToday'
  | 'avgRange7d'
  | 'avgRangeWeek'
  | 'avgRangeMonth'
  | 'avgRangeAll'
  | 'avgRangeCustom'
  | 'customRangeStart'
  | 'customRangeEnd'
  | 'trend'
  | 'trend7d'
  | 'trend30d'
  | 'trendMetric'
  | 'trendMetricCost'
  | 'trendMetricTokens'
  | 'pricingSearch'
  | 'bandPinHint'
  | 'trendEmpty'
  | 'trendTotal'
  | 'roundsUnit'
  | 'healthModelsLive'
  | 'healthVendorsDown'
  | 'healthVendorsUnavailable'
  | 'budget'
  | 'budgetRemain'
  | 'budgetAmount'
  | 'budgetSummary'
  | 'sessions'
  | 'sessionTitle'
  | 'lastActive'
  | 'sessionOverflow'
  | 'budgetTierBody'
  | 'models'
  | 'providerBilling'
  | 'channelUnknown'
  | 'directTag'
  | 'relayTag'
  | 'unknownTag'
  | 'unknownChannelHint'
  | 'planCountUnit'
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
  | 'pricingSyncedAt'
  | 'pricingSyncNow'
  | 'pricingSyncing'
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
  | 'recharge'
  | 'rechargeHint'
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
  | 'floatPrimaryToday'
  | 'floatPrimaryWeek'
  | 'floatPrimaryMonth'
  | 'floatNoTargets'
  | 'floatNoTargetsHint'
  | 'cardDisplay'
  | 'cardDisplayHint'
  | 'cardMetric'
  | 'cardMetricMoney'
  | 'cardMetricTokens'
  | 'cardSpan'
  | 'cardSpanDay'
  | 'cardSpanWeek'
  | 'cardSpanMonth'
  | 'cardDeltaBadge'
  | 'cardDeltaShow'
  | 'cardDeltaHide'
  | 'triggerMonthTokens'
  | 'triggerTodayTokens'
  | 'triggerWeekTokens'
  | 'subscriptionsStale'
  | 'balanceStaleNotice'
  | 'staleLedgerNotice'
  | 'staleSnapshotNotice'
  | 'unreadableNotice'
  | 'unreadableFormatNotice'
  | 'unreadableNoLedgerNotice'
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
  | 'sessionUntitled'
  | 'sessionSubCost'
  | 'sessionSubCalls'
  | 'sessionSubRow'
  | 'heatmapLess'
  | 'heatmapMore'
  | 'currency'
  | 'currencyCny'
  | 'currencyUsd'
  | 'currencyEur'
  | 'language'
  | 'heatmap'
  | 'rounds'
  | 'roundsHint'
  | 'anomaly'
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
  | 'peakAlertDescPeakZhipu'
  | 'peakAlertDescOffZhipu'
  | 'peakAlertQueuePeak'
  | 'peakAlertQueueOff'
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
  | 'tierAlertEnterPeakZhipu'
  | 'tierAlertEnterOffZhipu'
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
  | 'subscriptionTag'
  | 'cellEstimateHint'
  | 'free'
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
  | 'heatmapHalf'
  | 'heatmapMonth'
  | 'metricCost'
  | 'metricTokens'
  | 'heatmapTotal'
  | 'activeDays'
  | 'streakDays'
  | 'subscriptionAutoDetect'
  | 'pluginAuthor'
  | 'pluginRepository'
  | 'pluginNpm'
  | 'pluginLicense'
  | 'tabToken'
  | 'tokenExport'
  | 'tokenExportCsv'
  | 'tokenReasoningShare'
  | 'tokenReasoningShort'
  | 'tokenIo'
  | 'tokenPeak'
  | 'densityLabel'
  | 'densityHint'
  | 'densityCompact'
  | 'densityDefault'
  | 'densityComfortable'
  | 'motionLabel'
  | 'motionHint'
  | 'motionOff'
  | 'motionSubtle'
  | 'motionRich'
  | 'settingsNavDisplayPref'
  | 'settingsNavBudget'
  | 'settingsNavAlert'
  | 'settingsNavDisplay'
  | 'settingsNavAdvanced'
  | 'settingsNavAbout'
  | 'settingsSearchPlaceholder'
  | 'settingsSearchEmpty'
  | 'sessionsViewAll'
  | 'sessionViewerSearch'
  | 'modelBudgetTitle'
  | 'modelBudgetHint'
  | 'modelBudgetBody'
  | 'modelBudgetPlaceholder'
  | 'moreWorksTitle'
  | 'adEngramName'
  | 'adEngramDesc'
  | 'adRainbowName'
  | 'adRainbowDesc'
  | 'kpiDescCacheHit'
  | 'kpiDescTokens'
  | 'kpiDescAvgCost'
  | 'kpiDescCalls'
  | 'kpiDescReasoning'
  | 'kpiDescIo'
  | 'kpiDescPeak'
  | 'healthDotLive'
  | 'healthDotFailed'
  | 'healthDotUnknown'
  | 'settingsSectionDisplay'
  | 'emptyHint'
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
  | 'liveCostBarPosToolbar'
  | 'exportCsvSite'
  | 'panelRelayQuota'
  | 'relayBalance'
  | 'relayNoQuota'
  | 'relayWindowUsed'
  | 'relayKindNewApi'
  | 'relayKindSub2Api'
  | 'relayKindUnknown'
  | 'expandAll'
  | 'collapseAll'
  | 'todayOnly'
  | 'todayNoConsumption'
  | 'commandUsageLabel'
  | 'commandUsageDescription'
  | 'sessionOpen'
  | 'sessionOpenFailed'
  | 'sessionOpenUnavailable'
  | 'tabAgents'
  | 'tabQueue'
  | 'queueSubtitle'
  | 'queueUntilPeak'
  | 'queueUntilOffPeak'
  | 'queueUnsupportedTitle'
  | 'queueUnsupportedBody'
  | 'queueSafety'
  | 'queueWorkspace'
  | 'queueModel'
  | 'queueNoOptions'
  | 'queuePromptLabel'
  | 'queuePromptPlaceholder'
  | 'queuePrivacy'
  | 'queueEnqueue'
  | 'queueImport'
  | 'queueImportHint'
  | 'queueImported'
  | 'queueImportFormat'
  | 'queueImportTooLarge'
  | 'queueActive'
  | 'queueClearFinished'
  | 'queueEmpty'
  | 'queueLoading'
  | 'queueOpenSession'
  | 'queueRemoveQueued'
  | 'queueRemoveHistory'
  | 'queueStatusQueued'
  | 'queueStatusStarting'
  | 'queueStatusRunning'
  | 'queueStatusCompleted'
  | 'queueStatusFailed'
  | 'quickQueueToggle'
  | 'quickQueueEnqueue'
  | 'quickQueueEnqueueing'
  | 'quickQueueWaiting'
  | 'quickQueueClear'
  | 'quickQueueEnqueued'
  | 'quickQueueEmpty'
  | 'quickQueueBusy'
  | 'quickQueueAttachments'
  | 'quickQueueContext'
  | 'quickQueueRoute'
  | 'quickQueueDraftChanged'
  | 'quickQueueUnsupported'
  | 'quickQueueFailed'
  | 'agentsSummary'
  | 'agentsCount'
  | 'agentsDelegations'
  | 'agentsRoots'
  | 'agentsMostExpensive'
  | 'agentsChainTotal'
  | 'agentsNoData'
  | 'agentsSubagent'
  | 'agentsRoot'

export const NS = 'usageBilling'

export const zh: Record<UsageBillingKey, string> = {
  'title': '使用统计',
  'cost': '费用',
  'todayCost': '今日费用',
  'monthCost': '本月费用',
  'yearCost': '本年费用',
  'monthProjected': '本月预计',
  'monthProjectedHint': '本月已发生 + 近 7 天节奏 × 剩余天数',
  'liveTurn': '本轮',
  'liveSession': '会话',
  'liveSessionSub': '含子 {cost}',
  'calls': '调用',
  'cacheHitRate': '缓存命中率',
  'tokens': 'Token',
  'inputTokens': '输入',
  'outputTokens': '输出',
  'avgCost': '平均成本',
  'kpiRange': '统计范围',
  'avgRangeToday': '今日',
  'avgRange7d': '近7天',
  'avgRangeWeek': '本周',
  'avgRangeMonth': '本月',
  'avgRangeAll': '累计',
  'avgRangeCustom': '自定义',
  'customRangeStart': '开始日期',
  'customRangeEnd': '结束日期',
  'trend': '每日费用与调用趋势',
  'trend7d': '7 天',
  'trend30d': '30 天',
  'trendMetric': '趋势指标',
  'trendMetricCost': '费用',
  'trendMetricTokens': 'Token',
  'pricingSearch': '搜索模型 / 厂商',
  'bandPinHint': '点击固定到输入框',
  'trendEmpty': '暂无趋势数据',
  'trendTotal': '总计',
  'roundsUnit': '轮',
  'healthModelsLive': '{n} 模型可用',
  'healthVendorsDown': '{n} 厂商失效',
  'healthVendorsUnavailable': '{n} 厂商不可用',
  'budget': '本月预算',
  'budgetRemain': '剩余预算',
  'budgetAmount': '预算金额',
  'budgetSummary': '本月已用 {used} / {total}；达到 80% 时提醒，达到 100% 时红色脉冲警示',
  'sessions': '会话明细',
  'sessionTitle': '标题',
  'lastActive': '最后活跃',
  'sessionOverflow': '仅显示花费前 {limit} 个，共 {total} 个会话',
  'budgetTierBody': '本月花费 {cost} 已达预算 {budget} 的 {pct}%',
  'models': '模型计费明细',
  'providerBilling': '提供商计费与订阅',
  'channelUnknown': '未知路由',
  'directTag': '直连',
  'relayTag': '中转',
  'unknownTag': '未知',
  'unknownChannelHint': '通道未在插件配置中注册，支出主体无法核实，费用不计入口径，仅统计用量。',
  'planCountUnit': '套餐',
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
  'pricingSyncedAt': '上次同步',
  'pricingSyncNow': '立即同步',
  'pricingSyncing': '同步中…',
  'promoBadge': '促',
  'promoUntil': '促销价至 {date}，之后自动恢复刊例价',
  'promoOpenEnded': '厂商未公布截止时间，当前按折扣计价；公告截止后自动恢复刊例价',
  'pricingTip': 'DeepSeek 现行刊例：V4.1 Flash 谷档 未命中 ¥1 / 缓存命中 ¥0.02 / 输出 ¥4；V4 Pro 谷档 未命中 ¥4.5 / 缓存命中 ¥0.15 / 输出 ¥13.5；峰价均为谷价 × 2。工作日 9-12 / 14-18 为高峰价，其余时段（含周末全天）为低谷价；费用按调用时刻计。',
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
  'recharge': '充值',
  'rechargeHint': '打开该厂商官方平台的充值页',
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
  'floatPrimaryToday': '今日',
  'floatPrimaryWeek': '本周',
  'floatPrimaryMonth': '本月',

  'cardDisplay': '计费卡显示',
  'cardDisplayHint': '切换左下角计费卡的主指标与主数字统计范围（迷你柱跟随视角，悬浮窗不受影响）；「今日环比」徽章太醒目可在此隐藏。',
  'cardMetric': '主指标',
  'cardMetricMoney': '金额',
  'cardMetricTokens': 'Token',
  'cardSpan': '统计范围',
  'cardSpanDay': '日',
  'cardSpanWeek': '周',
  'cardSpanMonth': '月',
  'cardDeltaBadge': '今日环比徽章',
  'cardDeltaShow': '显示',
  'cardDeltaHide': '隐藏',
  'floatNoTargets': '未指定订阅通道，请在设置中勾选要展示的订阅。',
  'floatNoTargetsHint': '暂无可选的订阅通道。',
  'subscriptionsStale': '订阅额度刷新失败，以下为缓存数据',
  'balanceStaleNotice': '余额刷新较慢，以下为上一次查询结果',
  'staleLedgerNotice': '{count} 个会话出自旧版算法存档（日志已删，无法重算），模型归属可能有误差',
  'staleSnapshotNotice': '用量正在重算，以下数据来自上一次计算（可能不是最新，会话标题等以工作区为准）',
  'unreadableNotice': '{count} 个会话的用量未完整计入（原始日志未动，不会丢失）',
  'unreadableNoLedgerNotice': '其中 {count} 个无历史存档，用量完全未计入',
  'unreadableFormatNotice': '其中 {count} 个因会话格式不受当前宿主支持：过新格式升级宿主后自动恢复，过旧格式（如 v0/v3）需先迁移',
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
  'sessionUntitled': '未命名会话',
  'sessionSubCost': '含子智能体 {cost}',
  'sessionSubCalls': '含子智能体 {calls} 次调用',
  'sessionSubRow': '子智能体',
  'heatmapLess': '少',
  'heatmapMore': '多',
  'currency': '币种',
  'currencyCny': '人民币',
  'currencyUsd': '美元',
  'currencyEur': '欧元',
  'language': '界面语言',
  'heatmap': '用量热力图',
  'rounds': '每轮费用',
  'roundsHint': '最近 {count} 轮 · 柱顶为金额 · 底色为峰谷时段',
  'anomaly': '成本突增',
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
  'peakAlertDescPeakZhipu': '即将进入高峰时段（工作日 14:00–18:00），Coding Plan 额度将按基础积分全额抵扣',
  'peakAlertDescOffZhipu': '即将进入非高峰时段，Coding Plan 额度按基础积分 5 折抵扣',
  'peakAlertQueuePeak': '{count} 个排队任务将等待下一低谷；已开始任务继续执行',
  'peakAlertQueueOff': '{count} 个排队任务将按顺序启动',
  'export': '导出',
  'exportCsvDay': '按日 CSV',
  'exportCsvSession': '按会话 CSV',
  'exportJson': '全量 JSON',
  'peakShare': '峰谷时段占比',
  'peakSharePerCall': '按调用时刻精确判档',
  'offPeakSavings': '挪谷可省约 {amount}',
  'perfMax': '最大 TTFT',
  'weekCost': '本周消耗金额',
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
  'tierAlertEnterPeakZhipu': '{minutes} 分钟后进入智谱高峰时段，Coding Plan 额度将全额抵扣',
  'tierAlertEnterOffZhipu': '{minutes} 分钟后进入智谱非高峰时段，额度按基础积分 5 折抵扣',
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
  'triggerToday': '今日消耗金额',
  'triggerMonth': '当月消耗金额',
  'triggerMonthTokens': '当月消耗 Token',
  'triggerTodayTokens': '今日消耗 Token',
  'triggerWeekTokens': '本周消耗 Token',
  'subscriptionTag': '订阅',
  'cellEstimateHint': '本行无按量扣费记录（订阅通道不逐次计费），金额按目录价估算',
  'free': '免费',
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
  'heatmapHalf': '半年',
  'heatmapMonth': '月',
  'metricCost': '费用',
  'metricTokens': 'Token',
  'heatmapTotal': '合计',
  'activeDays': '活跃天数',
  'streakDays': '连续使用',
  'subscriptionAutoDetect': '自动识别',
  'pluginAuthor': '作者',
  'pluginRepository': '仓库',
  'pluginNpm': 'npm',
  'pluginLicense': '许可证',
  'tabToken': '用量',
  'tokenExport': '导出 Token',
  'tokenExportCsv': '按日 Token CSV',
  'tokenReasoningShare': '思考占比',
  'tokenReasoningShort': '思考',
  'tokenIo': '输入/输出比',
  'tokenPeak': '峰值日',
  'tokenDaily': '每日 Token',
  'tokenByModel': '模型 Token',
  'tokenMiss': '输入（缓存未命中）',
  'tokenHit': '输入（缓存命中）',
  'tokenOutput': '输出',
  'densityLabel': '显示密度',
  'densityHint': '紧凑减小行高与留白，舒适加大；切换即时生效',
  'densityCompact': '紧凑',
  'densityDefault': '默认',
  'densityComfortable': '舒适',
  'motionLabel': '动效强度',
  'motionHint': '关闭后所有入场与数据更新动画静止，保留基础交互反馈',
  'motionOff': '关闭',
  'motionSubtle': '克制',
  'motionRich': '丰富',
  'settingsNavDisplayPref': '偏好',
  'settingsNavBudget': '预算',
  'settingsNavAlert': '提醒',
  'settingsNavDisplay': '显示',
  'settingsNavAdvanced': '高级',
  'settingsNavAbout': '关于',
  'settingsSearchPlaceholder': '搜索设置…（如：预算、峰谷、单价）',
  'settingsSearchEmpty': '没有匹配「{query}」的设置项',
  'sessionsViewAll': '查看全部 {count} 个会话',
  'sessionViewerSearch': '搜索会话…（标题 / 项目 / id）',
  'modelBudgetTitle': '按模型预算',
  'modelBudgetHint': '为单个模型设本月上限（人民币元）；跨 80% / 100% 各提醒一次，留空 = 不限。',
  'modelBudgetBody': '「{model}」本月已 {cost}（预算 {budget} 的 {pct}%）',
  'modelBudgetPlaceholder': '上限',
  'moreWorksTitle': '更多作品',
  'adEngramName': 'DSH Engram · 记忆宫殿',
  'adEngramDesc': '跨会话长期记忆：记忆图谱 · 混合检索 · 知识飞轮',
  'adRainbowName': 'RainbowSpeak · 虹语',
  'adRainbowDesc': '聊天输入框的彩虹流光边框，持续流动的渐变光环',
  'kpiDescCacheHit': '缓存命中 token ÷ 总输入 token。命中率越高，输入费用越低（缓存读单价约为未命中的 1/10）。',
  'kpiDescTokens': '总处理 token = 输入 + 输出。缓存读/写已含在输入内，不重复计数（issue #85 口径）。',
  'kpiDescAvgCost': '统计范围内总费用 ÷ 总调用次数，单次调用的平均开销。',
  'kpiDescCalls': '统计范围内的 LLM 调用次数（联网搜索估算不含在内）。',
  'kpiDescReasoning': '思考（reasoning）token ÷ 输出 token。推理模型的思考部分已计费、含在输出内。',
  'kpiDescIo': '输入 token ÷ 输出 token。比值高通常意味着长上下文 / 多轮复用。',
  'kpiDescPeak': '统计范围内单日处理 token（输入+输出）最多的一天。',
  'healthDotLive': '厂商在线',
  'healthDotFailed': '厂商探活失败',
  'healthDotUnknown': '厂商状态未知',
  'settingsSectionDisplay': '显示偏好',
  'emptyHint': '运行第一次对话后，这里会自动出现按厂商的用量与费用明细',
  'tokenViewStructure': '按结构',
  'tokenViewModel': '按模型',
  'tokenHitShort': '命中',
  'tokenMissShort': '未命中',
  'tokenTotal': '总 Token',
  'tokenShare': '占比',
  'usageStatsTool': '注入用量查询',
  'usageStatsToolHint': '让模型可在对话中查询用量/费用；会占用模型每次请求的上下文，coding 场景建议关闭（切换即时生效）',
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
  'siteListDisplayHint': '隐藏「未识别」占位条目与「未知路由」分组，净化列表',
  'liveCostBar': '平价消耗胶囊',
  'liveCostBarHint': '输入框旁的即时代费条，悬浮可看详情',
  'liveCostBarPosition': '位置',
  'liveCostBarPosBelow': '输入框下方',
  'liveCostBarPosAbove': '输入框上方',
  'liveCostBarPosToolbar': '输入框内部',
  'exportCsvSite': '按站点 CSV',
  'panelRelayQuota': '中转站额度',
  'relayBalance': '余额',
  'relayNoQuota': '未读出额度',
  'relayWindowUsed': '已用',
  'relayKindNewApi': 'New API',
  'relayKindSub2Api': 'Sub2API',
  'relayKindUnknown': '未识别',
  'expandAll': '全部展开',
  'collapseAll': '全部收起',
  'todayOnly': '仅看今日',
  'todayNoConsumption': '今日暂无消耗',
  'commandUsageLabel': '打开计费仪表盘',
  'commandUsageDescription': '查看今日/本月费用、用量明细与费率',
  'sessionOpen': '打开会话',
  'sessionOpenFailed': '无法打开该会话（可能已被删除或不在当前会话列表）',
  'sessionOpenUnavailable': '当前宿主不支持会话跳转',
  'tabAgents': '智能体',
  'agentsSummary': '智能体网络',
  'agentsCount': '智能体',
  'agentsDelegations': '委派',
  'agentsRoots': '对话',
  'agentsMostExpensive': '最贵的一支',
  'agentsChainTotal': '链合计',
  'agentsNoData': '暂无子智能体委派记录',
  'agentsSubagent': '子智能体',
  'agentsRoot': '对话',
  'tabQueue': '队列',
  'queueSubtitle': '非紧急任务只在 DeepSeek 官方低谷启动，按入队顺序串行执行',
  'queueUntilPeak': '距高峰',
  'queueUntilOffPeak': '距低谷',
  'queueUnsupportedTitle': '当前宿主不支持任务队列',
  'queueUnsupportedBody': '任务队列需要新版宿主的会话创建、Prompt 提交与结果订阅能力。当前宿主会保持只读降级；用量、费用和峰谷提醒不受影响，也不会创建只排队却无法执行的任务。',
  'queueSafety': '安全边界：任务开始后即使进入高峰也会继续，不会强行暂停；失败或结果无法确认时不自动重试。每个任务在独立会话执行，并按宿主现有权限使用工具。',
  'queueWorkspace': '工作区',
  'queueModel': '官方峰谷模型',
  'queueNoOptions': '未发现可用工作区或内置 DeepSeek 官方峰谷模型，请先完成宿主配置。中转站同名模型不参与。',
  'queuePromptLabel': '任务 Prompt',
  'queuePromptPlaceholder': '描述一个非紧急、可无人值守完成的任务。入队即授权宿主在下一低谷创建会话并执行。',
  'queuePrivacy': '队列文件仅当前用户可读；执行后 Prompt 也会进入宿主会话日志。请勿填入密码或密钥。',
  'queueEnqueue': '加入低谷队列',
  'queueImport': '导入 JSON',
  'queueImportHint': 'JSON 数组项可为 Prompt 字符串或 { prompt, cwd?, provider?, model? }；缺省沿用当前工作区与模型，整批校验后一次入队。',
  'queueImported': '已导入 {count} 个任务',
  'queueImportFormat': '导入文件须为非空 JSON 数组，每项是 Prompt 字符串或任务对象',
  'queueImportTooLarge': '导入文件超过 10 MiB，未读取或写入任何任务',
  'queueActive': '任务与历史',
  'queueClearFinished': '清除已结束',
  'queueEmpty': '队列是空的。加入一个非紧急任务，下一低谷自动开始。',
  'queueLoading': '正在读取队列…',
  'queueOpenSession': '查看会话',
  'queueRemoveQueued': '移出队列',
  'queueRemoveHistory': '删除记录',
  'queueStatusQueued': '等待低谷',
  'queueStatusStarting': '正在启动',
  'queueStatusRunning': '执行中',
  'queueStatusCompleted': '已完成',
  'queueStatusFailed': '需核对',
  'quickQueueToggle': '低谷队列',
  'quickQueueEnqueue': '入队',
  'quickQueueEnqueueing': '入队中…',
  'quickQueueWaiting': '{count} 个等待任务',
  'quickQueueClear': '入队后清稿',
  'quickQueueEnqueued': '已加入低谷队列，将按队列规则调度',
  'quickQueueEmpty': '草稿为空，请先输入任务',
  'quickQueueBusy': '当前草稿正在提交，请稍后再入队',
  'quickQueueAttachments': '含附件或引用的草稿暂不支持入队，请改用纯文本',
  'quickQueueContext': '无法读取当前工作区或模型，请在新版宿主中重试',
  'quickQueueRoute': '当前工作区或模型不支持低谷队列，请选择官方峰谷模型',
  'quickQueueDraftChanged': '已入队；草稿已变化，未清空',
  'quickQueueUnsupported': '当前宿主不支持草稿入队，请升级宿主',
  'quickQueueFailed': '入队失败：{message}',
}

export const en: Record<UsageBillingKey, string> = {
  'title': 'Usage',
  'cost': 'Cost',
  'todayCost': 'Today',
  'monthCost': 'This month',
  'yearCost': 'This year',
  'monthProjected': 'Projected',
  'monthProjectedHint': 'Month-to-date + last-7-day pace × days left',
  'liveTurn': 'Turn',
  'liveSession': 'Session',
  'liveSessionSub': 'incl. sub {cost}',
  'calls': 'Calls',
  'cacheHitRate': 'Cache Hit',
  'tokens': 'Tokens',
  'inputTokens': 'Input',
  'outputTokens': 'Output',
  'avgCost': 'Avg cost',
  'kpiRange': 'Range',
  'avgRangeToday': 'Today',
  'avgRange7d': '7d',
  'avgRangeWeek': 'Week',
  'avgRangeMonth': 'Month',
  'avgRangeAll': 'All',
  'avgRangeCustom': 'Custom',
  'customRangeStart': 'Start date',
  'customRangeEnd': 'End date',
  'trend': 'Daily cost & calls',
  'trend7d': '7D',
  'trend30d': '30D',
  'trendMetric': 'Trend metric',
  'trendMetricCost': 'Cost',
  'trendMetricTokens': 'Tokens',
  'pricingSearch': 'Search model or vendor',
  'bandPinHint': 'click to pin to the composer',
  'trendEmpty': 'No trend data yet',
  'trendTotal': 'Total',
  'roundsUnit': 'turns',
  'healthModelsLive': '{n} models live',
  'healthVendorsDown': '{n} vendors down',
  'healthVendorsUnavailable': '{n} vendors unavailable',
  'budget': 'Monthly budget',
  'budgetRemain': 'Remaining',
  'budgetAmount': 'Budget amount',
  'budgetSummary': 'Used {used} / {total} this month; warn at 80%, pulse red at 100%',
  'sessions': 'Sessions',
  'sessionTitle': 'Title',
  'lastActive': 'Last active',
  'sessionOverflow': 'Top {limit} of {total} sessions by cost',
  'budgetTierBody': 'This month {cost} reached {pct}% of the budget {budget}',
  'models': 'Model billing',
  'providerBilling': 'Provider billing & subscriptions',
  'channelUnknown': 'Unknown routes',
  'directTag': 'Direct',
  'relayTag': 'Relay',
  'unknownTag': 'Unknown',
  'unknownChannelHint': 'Channel is not registered in the plugin config; the spending party cannot be verified, so cost stays out of the totals while usage is still counted.',
  'planCountUnit': 'plan(s)',
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
  'pricingSyncedAt': 'Synced',
  'pricingSyncNow': 'Sync now',
  'pricingSyncing': 'Syncing…',
  'promoBadge': 'Promo',
  'promoUntil': 'Promo price until {date}, then list price resumes automatically',
  'promoOpenEnded': 'End date not announced; billed at the discounted rate until further notice, then list price resumes',
  'pricingTip': 'DeepSeek list rates: V4.1 Flash off-peak ¥1 miss / ¥0.02 cache-hit / ¥4 output; V4 Pro off-peak ¥4.5 miss / ¥0.15 cache-hit / ¥13.5 output; peak = 2× off-peak. Weekday 9-12 / 14-18 bills at peak, all other times (weekends included) at off-peak; billed at call time.',
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
  'recharge': 'Top up',
  'rechargeHint': 'Open the vendor\'s official top-up page',
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
  'floatPrimaryToday': 'Today',
  'floatPrimaryWeek': 'Week',
  'floatPrimaryMonth': 'Month',

  'cardDisplay': 'Billing card',
  'cardDisplayHint': 'Switch the bottom-left billing card between cost and token usage, and pick the figure range (sparkline follows; the popover is unaffected). The day-over-day badge can be hidden here.',
  'cardMetric': 'Main metric',
  'cardMetricMoney': 'Cost',
  'cardMetricTokens': 'Tokens',
  'cardSpan': 'Range',
  'cardSpanDay': 'Day',
  'cardSpanWeek': 'Week',
  'cardSpanMonth': 'Month',
  'cardDeltaBadge': 'Day-over-day badge',
  'cardDeltaShow': 'Show',
  'cardDeltaHide': 'Hide',
  'floatNoTargets': 'No subscription selected — pick some in Settings.',
  'floatNoTargetsHint': 'No subscription channel available.',
  'subscriptionsStale': 'Subscription refresh failed — showing cached data',
  'balanceStaleNotice': 'Balance refresh is slow — the figures below come from the last completed query',
  'staleLedgerNotice': '{count} sessions use legacy-algorithm archives (logs deleted); attribution may be off',
  'staleSnapshotNotice': 'Usage is being recomputed; the figures below come from the last completed calculation (session titles may lag the workspace)',
  'unreadableNotice': 'Usage from {count} sessions is not fully counted (raw logs untouched; no data lost)',
  'unreadableNoLedgerNotice': '{count} of them have no archived history and are not counted at all',
  'unreadableFormatNotice': '{count} of them use a session format this host cannot read: newer formats recover after a host upgrade; legacy formats (e.g. v0/v3) need a one-time migration',
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
  'sessionUntitled': 'Untitled session',
  'sessionSubCost': 'incl. subagents {cost}',
  'sessionSubCalls': 'incl. subagents, {calls} calls',
  'sessionSubRow': 'Subagent',
  'heatmapLess': 'Less',
  'heatmapMore': 'More',
  'currency': 'Currency',
  'currencyCny': 'CNY',
  'currencyUsd': 'USD',
  'currencyEur': 'EUR',
  'language': 'Interface language',
  'heatmap': 'Usage heatmap',
  'rounds': 'Cost per turn',
  'roundsHint': 'Last {count} rounds · bar tops show amount · fill = peak/off-peak',
  'anomaly': 'Cost spike',
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
  'peakAlertDescPeakZhipu': 'Peak hours soon (weekdays 14:00–18:00) — Coding Plan credits will be deducted at full rate',
  'peakAlertDescOffZhipu': 'Off-peak soon — Coding Plan credits will be deducted at 50% of base credits',
  'peakAlertQueuePeak': '{count} queued tasks will wait for the next off-peak window; admitted tasks keep running',
  'peakAlertQueueOff': '{count} queued tasks will start in order',
  'export': 'Export',
  'exportCsvDay': 'Daily CSV',
  'exportCsvSession': 'Sessions CSV',
  'exportJson': 'Full JSON',
  'peakShare': 'Peak vs off-peak',
  'peakSharePerCall': 'per-call attribution, full history',
  'offPeakSavings': 'Shift peak to off-peak: save ~{amount}',
  'perfMax': 'Max TTFT',
  'weekCost': "This week's spend",
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
  'tierAlertEnterPeakZhipu': 'Zhipu peak hours in {minutes} min — Coding Plan credits burn at full rate',
  'tierAlertEnterOffZhipu': 'Zhipu off-peak in {minutes} min — credit burn drops to 50%',
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
  'triggerToday': "Today's spend",
  'triggerMonth': "This month's spend",
  'triggerMonthTokens': "This month's tokens",
  'triggerTodayTokens': "Today's tokens",
  'triggerWeekTokens': "This week's tokens",
  'subscriptionTag': 'Plan',
  'cellEstimateHint': 'No pay-as-you-go charge recorded for this row (subscription routes are not billed per call); amount is a catalog-price estimate',
  'free': 'Free',
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
  'heatmapHalf': 'Half',
  'heatmapMonth': 'Month',
  'metricCost': 'Cost',
  'metricTokens': 'Tokens',
  'heatmapTotal': 'Total',
  'activeDays': 'Active days',
  'streakDays': 'Streak',
  'subscriptionAutoDetect': 'Auto',
  'pluginAuthor': 'Author',
  'pluginRepository': 'Repository',
  'pluginNpm': 'npm',
  'pluginLicense': 'License',
  'tabToken': 'Usage',
  'tokenExport': 'Export tokens',
  'tokenExportCsv': 'Daily token CSV',
  'tokenReasoningShare': 'Reasoning share',
  'tokenReasoningShort': 'reasoning',
  'tokenIo': 'In/out ratio',
  'tokenPeak': 'Peak day',
  'tokenDaily': 'Daily tokens',
  'tokenByModel': 'Tokens by model',
  'tokenMiss': 'Input (cache miss)',
  'densityLabel': 'Display density',
  'densityHint': 'Compact shrinks row height and padding, comfortable adds room; applies instantly',
  'densityCompact': 'Compact',
  'densityDefault': 'Default',
  'densityComfortable': 'Comfortable',
  'motionLabel': 'Motion strength',
  'motionHint': 'Off freezes all entrance and data-update animations; basic interaction feedback remains',
  'motionOff': 'Off',
  'motionSubtle': 'Subtle',
  'motionRich': 'Rich',
  'settingsNavDisplayPref': 'Preferences',
  'settingsNavBudget': 'Budget',
  'settingsNavAlert': 'Alerts',
  'settingsNavDisplay': 'Display',
  'settingsNavAdvanced': 'Advanced',
  'settingsNavAbout': 'About',
  'settingsSearchPlaceholder': 'Search settings… (e.g. budget, peak, price)',
  'settingsSearchEmpty': 'No settings match "{query}"',
  'sessionsViewAll': 'View all {count} sessions',
  'sessionViewerSearch': 'Search sessions… (title / project / id)',
  'modelBudgetTitle': 'Per-model budget',
  'modelBudgetHint': 'Set a monthly cap per model (CNY); alerts fire once each at 80% / 100%. Empty = unlimited.',
  'modelBudgetBody': '"{model}" has spent {cost} this month ({pct}% of {budget})',
  'modelBudgetPlaceholder': 'Cap',
  'moreWorksTitle': 'More plugins',
  'adEngramName': 'DSH Engram · Memory Palace',
  'adEngramDesc': 'Cross-session long-term memory: graph · hybrid retrieval · flywheel',
  'adRainbowName': 'RainbowSpeak',
  'adRainbowDesc': 'A flowing rainbow marquee border for the chat composer',
  'kpiDescCacheHit': 'Cache-hit tokens ÷ total input tokens. Higher hit rate means lower input cost (cache reads are ~1/10 the miss price).',
  'kpiDescTokens': 'Total tokens = input + output. Cache reads/writes are already part of input and are not double-counted (issue #85).',
  'kpiDescAvgCost': 'Total cost ÷ total calls within the selected range — the average cost per call.',
  'kpiDescCalls': 'LLM calls within the selected range (web-search estimates excluded).',
  'kpiDescReasoning': 'Reasoning tokens ÷ output tokens. A reasoning model\'s thinking is billed and included in output.',
  'kpiDescIo': 'Input tokens ÷ output tokens. A high ratio usually means long context / multi-turn reuse.',
  'kpiDescPeak': 'The day with the most processed tokens (input + output) in the range.',
  'healthDotLive': 'Vendor online',
  'healthDotFailed': 'Vendor probe failed',
  'healthDotUnknown': 'Vendor status unknown',
  'settingsSectionDisplay': 'Display preferences',
  'emptyHint': 'Run your first conversation and per-provider usage and cost breakdown will appear here automatically',
  'tokenHit': 'Input (cache hit)',
  'tokenOutput': 'Output',
  'tokenViewStructure': 'Structure',
  'tokenViewModel': 'By model',
  'tokenHitShort': 'Hit',
  'tokenMissShort': 'Miss',
  'tokenTotal': 'Total tokens',
  'tokenShare': 'Share',
  'usageStatsTool': 'Inject usage-stats tool',
  'usageStatsToolHint': 'Lets the model query usage/cost inside a conversation; it consumes context per request, so keep it off for coding (takes effect immediately)',
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
  'liveCostBarHint': 'Live cost bar beside the composer; hover for details',
  'liveCostBarPosition': 'Position',
  'liveCostBarPosBelow': 'Below composer',
  'liveCostBarPosAbove': 'Above composer',
  'liveCostBarPosToolbar': 'Inside composer',
  'exportCsvSite': 'By site CSV',
  'panelRelayQuota': 'Relay quotas',
  'relayBalance': 'Balance',
  'relayNoQuota': 'No quota',
  'relayWindowUsed': 'used',
  'relayKindNewApi': 'New API',
  'relayKindSub2Api': 'Sub2API',
  'relayKindUnknown': 'Unknown',
  'expandAll': 'Expand all',
  'collapseAll': 'Collapse all',
  'todayOnly': 'Today only',
  'todayNoConsumption': 'No usage today',
  'commandUsageLabel': 'Open the billing dashboard',
  'commandUsageDescription': 'See today/month spend, usage breakdown and rates',
  'sessionOpen': 'Open session',
  'sessionOpenFailed': 'Could not open this session (it may be deleted or absent from the current list)',
  'sessionOpenUnavailable': 'This host does not support session navigation',
  'tabAgents': 'Agents',
  'agentsSummary': 'Agent network',
  'agentsCount': 'agents',
  'agentsDelegations': 'delegations',
  'agentsRoots': 'conversations',
  'agentsMostExpensive': 'costliest chain',
  'agentsChainTotal': 'chain total',
  'agentsNoData': 'No sub-agent delegation records yet',
  'agentsSubagent': 'sub-agent',
  'agentsRoot': 'conversation',
  'tabQueue': 'Queue',
  'queueSubtitle': 'Non-urgent tasks start only during DeepSeek official off-peak hours, one at a time',
  'queueUntilPeak': 'Peak in',
  'queueUntilOffPeak': 'Off-peak in',
  'queueUnsupportedTitle': 'This host does not support the task queue',
  'queueUnsupportedBody': 'The queue requires Session creation, Prompt admission and result streaming from a newer host. This host stays in read-only fallback: usage, billing and band alerts keep working, and no non-executing placeholder tasks are created.',
  'queueSafety': 'Safety: an admitted task continues if peak pricing begins; it is never forcibly paused. Failures and unknown outcomes never auto-retry. Each task runs in its own Session with the host’s existing tool permissions.',
  'queueWorkspace': 'Workspace',
  'queueModel': 'Official time-of-day model',
  'queueNoOptions': 'No workspace or built-in DeepSeek official time-of-day model is available. Relay mirrors are not eligible.',
  'queuePromptLabel': 'Task Prompt',
  'queuePromptPlaceholder': 'Describe a non-urgent task that can run unattended. Enqueuing authorizes the host to create a Session and run it at the next off-peak window.',
  'queuePrivacy': 'The queue file is owner-only; executed Prompts also enter host Session logs. Do not enter passwords or secrets.',
  'queueEnqueue': 'Enqueue for off-peak',
  'queueImport': 'Import JSON',
  'queueImportHint': 'A JSON array of Prompt strings or { prompt, cwd?, provider?, model? } objects; omitted fields use the current selection. The whole batch is validated before one atomic enqueue.',
  'queueImported': 'Imported {count} tasks',
  'queueImportFormat': 'The import must be a non-empty JSON array of Prompt strings or task objects',
  'queueImportTooLarge': 'The import exceeds 10 MiB; no tasks were read or enqueued',
  'queueActive': 'Tasks & history',
  'queueClearFinished': 'Clear finished',
  'queueEmpty': 'The queue is empty. Add a non-urgent task to start it at the next off-peak window.',
  'queueLoading': 'Loading queue…',
  'queueOpenSession': 'Open Session',
  'queueRemoveQueued': 'Remove',
  'queueRemoveHistory': 'Delete record',
  'queueStatusQueued': 'Waiting',
  'queueStatusStarting': 'Starting',
  'queueStatusRunning': 'Running',
  'queueStatusCompleted': 'Completed',
  'queueStatusFailed': 'Needs review',
  'quickQueueToggle': 'Off-peak queue',
  'quickQueueEnqueue': 'Enqueue',
  'quickQueueEnqueueing': 'Enqueuing…',
  'quickQueueWaiting': '{count} waiting tasks',
  'quickQueueClear': 'Clear after enqueue',
  'quickQueueEnqueued': 'Added to the off-peak queue; scheduling follows the queue rules',
  'quickQueueEmpty': 'The draft is empty; enter a task first',
  'quickQueueBusy': 'This draft is being submitted; try enqueueing later',
  'quickQueueAttachments': 'Drafts with attachments or references cannot be queued; use plain text',
  'quickQueueContext': 'Cannot read the current workspace or model; retry on a newer host',
  'quickQueueRoute': 'This workspace or model is not eligible; select an official time-of-day model',
  'quickQueueDraftChanged': 'Enqueued; the draft changed, so it was not cleared',
  'quickQueueUnsupported': 'This host does not support draft enqueueing; upgrade the host',
  'quickQueueFailed': 'Enqueue failed: {message}',
}
