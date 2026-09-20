/**
 * 费率表附加行文案本地化：目录条目里的 `extraRows` `label`/`note`（`显式缓存创建`、
 * `长期半价` 等）是数据层的中文字面量，同时充当渲染 key。与 provider-display.ts
 * 同样的做法：不改动数据层形态，只在渲染层提供一张「中文文案 → 英文文案」映射，
 * 未收录的字符串原样返回。集中一处便于统一管理与将来扩展第三语言。
 */

type LabelLang = 'zh' | 'en'

/** 中文附加行文案 → 英文文案；未收录的原样返回。 */
const ROW_LABELS_EN: Readonly<Record<string, string>> = {
  '显式缓存创建': 'Explicit cache write',
  '显式缓存命中': 'Explicit cache hit',
  '长期半价': 'Half price',
  '与标准价一致': 'Same as standard',
  '限时 5 折': 'Limited-time 50% off',
}

/**
 * 把费率表附加行的 label/note 按界面语言本地化：中文映射成英文，其余原样返回。
 * 仅在渲染层调用，不影响数据层的中文字面量与 key 匹配。
 * @param text - 数据层原始文案（可能为 undefined，例如没有 note 的行）。
 * @param lang - 当前界面语言。
 * @returns 本地化后的文案；`undefined` 原样传回。
 */
export function localizeRowLabel(text: string, lang: LabelLang): string
export function localizeRowLabel(text: undefined, lang: LabelLang): undefined
export function localizeRowLabel(text: string | undefined, lang: LabelLang): string | undefined
export function localizeRowLabel(text: string | undefined, lang: LabelLang): string | undefined {
  if (text === undefined || lang !== 'en') return text
  return ROW_LABELS_EN[text] ?? text
}
