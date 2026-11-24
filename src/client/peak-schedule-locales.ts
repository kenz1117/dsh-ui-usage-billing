export const peakZh = {
  psAddHoliday: '添加日期', psRemoveHoliday: '移除日期',
  psTitle: '峰谷时段', psModel: '选择来源 / 模型', psEmpty: '没有已配置且支持峰谷计价的模型', psConfigured: '已单独设置',
  psWindows: '高峰时段', psInherit: '沿用此来源的基础规则', psCustom: '自定义', psOff: '全天低谷', psDates: '适用日期', psDaily: '每天', psWeekdays: '工作日（周末低谷）',
  psHolidays: '节假日（全天低谷）', psNoHolidays: '不使用节假日表', psZone: '时区', psOffset: 'UTC 偏移（分钟）', psClear: '清除此模型的覆盖',
  psSave: '保存', psSaved: '已保存', psDirty: '有未保存的更改', psRetry: '重新加载', psLoading: '加载中…', psLoadError: '无法读取峰谷设置', psSaveError: '无法保存峰谷设置',
  psBadWindows: '请输入互不重叠的高峰时段，例如 09:00-12:00 / 14:00-18:00。', psBadHolidays: '请输入有效日期，用空格分隔，例如 2026-10-01 2026-10-02。', psBadOffset: '请输入 −720 至 840 之间的整数分钟。',
}
export const peakEn: Record<keyof typeof peakZh, string> = {
  psAddHoliday: 'Add date', psRemoveHoliday: 'Remove date',
  psTitle: 'Peak schedule', psModel: 'Select source / model', psEmpty: 'No configured models support peak pricing', psConfigured: 'Custom schedule',
  psWindows: 'Peak hours', psInherit: 'Use source defaults', psCustom: 'Custom', psOff: 'Off-peak all day', psDates: 'Applicable days', psDaily: 'Every day', psWeekdays: 'Weekdays (weekends off-peak)',
  psHolidays: 'Holidays (off-peak all day)', psNoHolidays: 'No holidays', psZone: 'Time zone', psOffset: 'UTC offset (minutes)', psClear: 'Clear this model’s overrides',
  psSave: 'Save', psSaved: 'Saved', psDirty: 'Unsaved changes', psRetry: 'Reload', psLoading: 'Loading…', psLoadError: 'Could not load peak schedule', psSaveError: 'Could not save peak schedule',
  psBadWindows: 'Enter non-overlapping peak hours, e.g. 09:00-12:00 / 14:00-18:00.', psBadHolidays: 'Enter valid dates separated by spaces, e.g. 2026-10-01 2026-10-02.', psBadOffset: 'Enter a whole number of minutes from −720 to 840.',
}
