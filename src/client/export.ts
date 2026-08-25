/**
 * 数据导出：把用量统计导出为 CSV / JSON 供对账。
 *
 * 纯函数生成文本（按日 / 按会话两个视角），DOM 下载副作用单独隔离在
 * `downloadText`；金额一律人民币元（与聚合口径一致），文件名带日期范围。
 */

/** 按日聚合行（与 UsageStatsDocument.byDay 的行同形）。 */
export interface DayExportRow {
  calls: number
  input: number
  output: number
  cacheHit: number
  cacheMiss: number
  cost: number
}

/** 会话导出行（与 SessionUsageRow 同形，结构化声明避免跨文件引用）。 */
export interface SessionExportRow {
  id: string
  title?: string
  cwd?: string
  calls: number
  cost: number
  lastActive: number
}

/** CSV 单元格转义：含逗号 / 引号 / 换行 / 回车的值加双引号并内层引号双写。 */
function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** 防 CSV 公式注入：以 `=` / `+` / `-` / `@` / tab / 回车开头的值前置单引号，
 *  避免在 Excel/WPS 打开时被当作公式执行。用户/模型可控的会话标题会进 CSV。 */
function csvSafe(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
}

/** 金额保留两位小数字符串（导出对账用，不做千分位）。 */
function money(value: number): string {
  return value.toFixed(2)
}

/** 按日 CSV：日期,调用,输入,输出,缓存命中,缓存未命中,费用(元)。 */
export function dayRowsCsv(byDay: Record<string, DayExportRow>): string {
  const header = 'date,calls,input,output,cache_hit,cache_miss,cost_cny'
  const lines = Object.keys(byDay).sort().map((date) => {
    const day = byDay[date]
    if (day === undefined) return ''
    return [date, day.calls, day.input, day.output, day.cacheHit, day.cacheMiss, money(day.cost)].join(',')
  })
  return [header, ...lines].join('\n')
}

/** 按站点（中转站/直连/未知路由）CSV：站点,类别,调用,费用(元)。 */
export function siteRowsCsv(bySite: Record<string, DayExportRow>): string {
  const header = 'site,kind,calls,cost_cny'
  const lines = Object.entries(bySite).map(([key, usage]) => {
    const site = key.startsWith('site:') ? key.slice(5) : key.startsWith('direct:') ? key.slice(7) : 'unknown'
    const kind = key.startsWith('site:') ? 'site' : key.startsWith('direct:') ? 'direct' : 'unknown'
    return [csvCell(csvSafe(site)), kind, usage.calls, money(usage.cost)].join(',')
  })
  return [header, ...lines].join('\n')
}

/** 项目名取 cwd 末级目录（与统计 Tab 的会话明细同口径）。 */
function projectOf(cwd: string | undefined): string {
  if (cwd === undefined) return ''
  return cwd.split(/[\\/]/).filter(Boolean).pop() ?? cwd
}

/** 按会话 CSV：会话 id,标题,项目,调用,费用(元),最后活跃(ISO)。 */
export function sessionRowsCsv(rows: readonly SessionExportRow[]): string {
  const header = 'session_id,title,project,calls,cost_cny,last_active'
  const lines = rows.map(row => [
    csvCell(csvSafe(row.id)),
    csvCell(csvSafe(row.title ?? '')),
    csvCell(csvSafe(projectOf(row.cwd))),
    row.calls,
    money(row.cost),
    row.lastActive > 0 ? new Date(row.lastActive).toISOString() : '',
  ].join(','))
  return [header, ...lines].join('\n')
}

/** 导出文件名：带日期范围（usage-2026-08-01_2026-08-22.csv）；无日期时只带前缀。 */
export function exportFileName(prefix: string, ext: 'csv' | 'json', dates: readonly string[]): string {
  const sorted = [...dates].sort()
  const first = sorted[0]
  const last = sorted.at(-1)
  const range = first !== undefined && last !== undefined ? `-${first}_${last}` : ''
  return `${prefix}${range}.${ext}`
}

/** 触发浏览器下载（唯一 DOM 副作用；调用方在 click 手势里使用）。 */
export function downloadText(filename: string, text: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  // 延后回收：部分浏览器（旧 Firefox/某些 WebView）在 click() 同拍 revoke 会
  // 在下载尚未开始时销毁 blob 导致下载失败。
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
