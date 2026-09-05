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

// ── 通道显示名（站点 origin → 人话）─────────────────────────────────────────
// 「按通道聚合」视图与厂商行的通道徽标用：已知网关/官方端点给品牌名，
// 未收录 origin 回退主机名，direct/unknown 由渲染层结合文案键处理。

/** 已知站点 origin → 通道显示名（内置表；中英文都读品牌名，语言差异在 en 表兜底）。 */
const CHANNEL_NAMES: Readonly<Record<string, string>> = {
  'https://tokenhub.tencentmaas.com': '腾讯云 TokenHub',
  'https://api.lkeap.cloud.tencent.com': '腾讯云 Token Plan',
  'https://api.deepseek.com': 'DeepSeek 官方',
}

/** 通道显示名的英文章表（界面切 USD/英文时使用）；未收录 origin 不在表内。 */
const CHANNEL_NAMES_EN: Readonly<Record<string, string>> = {
  '腾讯云 TokenHub': 'Tencent Cloud TokenHub',
  '腾讯云 Token Plan': 'Tencent Cloud Token Plan',
  'DeepSeek 官方': 'DeepSeek Official',
}

/** 站点 origin → 主机名（解析失败原样返回）。 */
function hostOf(origin: string): string {
  try {
    return new URL(origin).host
  } catch {
    return origin
  }
}

/**
 * 站点桶 key（`site:<origin>` / `direct:<provider>` / `unknown`）→ 通道显示名。
 * @param siteKey - 聚合文档 bySite 的桶 key。
 * @param lang - 显示语言；zh（缺省）用内置中文名，en 走英文章表。
 * @returns 未知路由桶返回 undefined（渲染层用 locale 文案兜底）。
 */
export function channelDisplayName(siteKey: string, lang: ProviderLang = 'zh'): string | undefined {
  if (siteKey.startsWith('site:')) {
    const origin = siteKey.slice('site:'.length)
    const builtin = CHANNEL_NAMES[origin]
    if (builtin !== undefined) return lang === 'en' ? CHANNEL_NAMES_EN[builtin] ?? builtin : builtin
    return hostOf(origin)
  }
  if (siteKey.startsWith('direct:')) {
    const provider = siteKey.slice('direct:'.length)
    return provider === 'deepseek' ? (lang === 'en' ? 'DeepSeek Official' : 'DeepSeek 官方') : `${lang === 'en' ? 'Direct' : '直连'} · ${provider}`
  }
  return undefined
}
