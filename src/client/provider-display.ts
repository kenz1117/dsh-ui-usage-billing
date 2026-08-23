/**
 * 厂商显示名本地化：界面文案已随币种切换中英文，但厂商名（如「智谱 AI」/
 * 「阿里通义」/「月之暗面」）散落在 PROVIDER_ALIASES、MODEL_CATALOG、
 * SUBSCRIPTION_DISPLAY_NAMES、balance 等多个数据层，且这些中文名同时充当
 * 匹配与分组的 key。为不改动任何数据层/匹配逻辑，这里只提供一张「中文厂商名
 * → 英文显示名」的映射表（大写字面量作为 key，非中文/未收录名原样返回），
 * 供 JSX 渲染层在做语言切换时调用。
 */

type ProviderLang = 'zh' | 'en'

/** 中文厂商显示名 → 英文显示名；未收录的中文名不在表内，原样返回。 */
const PROVIDER_NAMES_EN: Readonly<Record<string, string>> = {
  '智谱 AI': 'Zhipu AI',
  '阿里通义': 'Alibaba Qwen',
  '字节豆包': 'ByteDance Doubao',
  '月之暗面': 'Moonshot AI',
  '小米': 'Xiaomi',
  '百度文心': 'Baidu ERNIE',
  '腾讯混元': 'Tencent Hunyuan',
  '零一万物': '01.AI',
  '阶跃星辰': 'StepFun',
  '科大讯飞': 'iFlytek Spark',
  '商汤': 'SenseNova',
  '百川智能': 'Baichuan',

  // 订阅套餐显示名（SUBSCRIPTION_DISPLAY_NAMES 的合成名）。
  '小米 Token Plan（海外）': 'Xiaomi Token Plan (Global)',
  '小米 Token Plan（国内）': 'Xiaomi Token Plan (CN)',
  '小米 Token Plan（新加坡）': 'Xiaomi Token Plan (SG)',
  '火山引擎 Token Plan': 'Volcengine Token Plan',
  '火山方舟 Token Plan': 'Volcengine Ark Token Plan',
  '豆包 Token Plan': 'Doubao Token Plan',
  '百度文心 Plan': 'Baidu ERNIE Plan',
  'MiniMax Token Plan（国内）': 'MiniMax Token Plan (CN)',
}

/**
 * 把厂商显示名按界面语言本地化：中文名映射成英文，其余（已是英文 / 未收录 /
 * 未知）原样返回。仅在渲染层调用，不影响数据层的中文 key 匹配。
 * @param name - 数据层返回的厂商显示名（多为中文）。
 * @param lang - 当前界面语言（跟随币种）。
 * @returns 本地化后的显示名。
 */
export function localizeProviderName(name: string, lang: ProviderLang): string {
  if (lang === 'en') return PROVIDER_NAMES_EN[name] ?? name
  return name
}

/** 判断一个厂商显示名是否包含中文（用于测试/守卫：保证映射覆盖完整）。 */
export function hasCjk(name: string): boolean {
  return /[\u4e00-\u9fff]/.test(name)
}
