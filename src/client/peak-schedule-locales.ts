export const peakZh = {
  psPartial: '其他规则已保存，以下规则仍需处理', psProspective: '保存或清除规则仅影响生效时刻及以后的调用。', psEffectiveFrom: '最近修订生效于', psUnavailableModel: '此来源或模型已不可用。',
  psInvalidRequest: '设置无效或来源已不可用。', psInvalidResponse: '峰谷设置响应格式无效。', psDenied: '本次请求未获授权。', psUnavailable: '峰谷设置服务暂不可用。',
  psLegacy: '未应用缺少生效时间的旧版设置。', psUnreadable: '无法读取峰谷设置文件。', psMalformedSchedule: '峰谷设置文件格式无效。', psMalformedRevision: '已跳过损坏的峰谷规则修订。', psMalformedRule: '已跳过损坏的来源 / 模型规则。', psIneligible: '已跳过不再适用的模型规则，历史记录仍保留。', psDiscovery: '部分来源的模型列表暂不可用。',
  psClockConflict: '主机时钟早于已记录的调用或规则，请在校准时钟后重试。',
  psAddHoliday: '添加日期', psRemoveHoliday: '移除日期',
  psTitle: '峰谷时段', psModel: '选择来源 / 模型', psEmpty: '没有已配置且支持峰谷计价的模型', psConfigured: '已单独设置',
  psWindows: '高峰时段', psInherit: '沿用此来源的基础规则', psCustom: '自定义', psOff: '全天低谷', psDates: '适用日期', psDaily: '每天', psWeekdays: '工作日（周末低谷）',
  psHolidays: '节假日（全天低谷）', psNoHolidays: '不使用节假日表', psZone: '时区', psOffset: 'UTC 偏移（分钟）', psClear: '清除此模型的覆盖',
  psSave: '保存', psSaved: '已保存', psDirty: '有未保存的更改', psRetry: '重新加载', psLoading: '加载中…', psLoadError: '无法读取峰谷设置', psSaveError: '无法保存峰谷设置',
  psBadWindows: '请输入互不重叠的高峰时段，例如 09:00-12:00 / 14:00-18:00。', psBadHolidays: '请输入有效日期，用空格分隔，例如 2026-10-01 2026-10-02。', psBadOffset: '请输入 −720 至 840 之间的整数分钟。',
}
export const peakEn: Record<keyof typeof peakZh, string> = {
  psPartial: 'Other rules were saved. These rules still need attention', psProspective: 'Saving or clearing a rule affects calls from its effective time onward.', psEffectiveFrom: 'Latest revision effective from', psUnavailableModel: 'This source or model is no longer available.',
  psInvalidRequest: 'The settings are invalid or the source is no longer available.', psInvalidResponse: 'The peak schedule response is invalid.', psDenied: 'This request was denied.', psUnavailable: 'The peak schedule service is unavailable.',
  psLegacy: 'Legacy settings without effective dates were skipped.', psUnreadable: 'Could not read the peak schedule file.', psMalformedSchedule: 'The peak schedule file is invalid.', psMalformedRevision: 'Skipped an invalid schedule revision.', psMalformedRule: 'Skipped an invalid source / model rule.', psIneligible: 'Skipped an ineligible model rule. Its history is retained.', psDiscovery: 'Model discovery is unavailable for some sources.',
  psClockConflict: 'The host clock is behind recorded calls or a saved rule. Check the clock and retry.',
  psAddHoliday: 'Add date', psRemoveHoliday: 'Remove date',
  psTitle: 'Peak schedule', psModel: 'Select source / model', psEmpty: 'No configured models support peak pricing', psConfigured: 'Custom schedule',
  psWindows: 'Peak hours', psInherit: 'Use source defaults', psCustom: 'Custom', psOff: 'Off-peak all day', psDates: 'Applicable days', psDaily: 'Every day', psWeekdays: 'Weekdays (weekends off-peak)',
  psHolidays: 'Holidays (off-peak all day)', psNoHolidays: 'No holidays', psZone: 'Time zone', psOffset: 'UTC offset (minutes)', psClear: 'Clear this model’s overrides',
  psSave: 'Save', psSaved: 'Saved', psDirty: 'Unsaved changes', psRetry: 'Reload', psLoading: 'Loading…', psLoadError: 'Could not load peak schedule', psSaveError: 'Could not save peak schedule',
  psBadWindows: 'Enter non-overlapping peak hours, e.g. 09:00-12:00 / 14:00-18:00.', psBadHolidays: 'Enter valid dates separated by spaces, e.g. 2026-10-01 2026-10-02.', psBadOffset: 'Enter a whole number of minutes from −720 to 840.',
}
