/**
 * 厂商显示名本地化：界面文案已随币种切换中英文，但厂商名（如「智谱 AI」/
 * 「阿里通义」/「月之暗面」）散落在 PROVIDER_ALIASES、MODEL_CATALOG、
 * SUBSCRIPTION_DISPLAY_NAMES、balance 等多个数据层，且这些中文名同时充当
 * 匹配与分组的 key。为不改动任何数据层/匹配逻辑，这里只提供一张「中文厂商名
 * → 英文显示名」的映射表（大写字面量作为 key，非中文/未收录名原样返回），
 * 供 JSX 渲染层在做语言切换时调用。
 */
type ProviderLang = 'zh' | 'en';
/**
 * 把厂商显示名按界面语言本地化：中文名映射成英文，其余（已是英文 / 未收录 /
 * 未知）原样返回。仅在渲染层调用，不影响数据层的中文 key 匹配。
 * @param name - 数据层返回的厂商显示名（多为中文）。
 * @param lang - 当前界面语言（跟随币种）。
 * @returns 本地化后的显示名。
 */
export declare function localizeProviderName(name: string, lang: ProviderLang): string;
/** 判断一个厂商显示名是否包含中文（用于测试/守卫：保证映射覆盖完整）。 */
export declare function hasCjk(name: string): boolean;
/**
 * 站点桶 key（`site:<origin>` / `direct:<provider>` / `unknown`）→ 通道显示名。
 * @param siteKey - 聚合文档 bySite 的桶 key。
 * @param lang - 显示语言；zh（缺省）用内置中文名，en 走英文章表。
 * @returns 未知路由桶返回 undefined（渲染层用 locale 文案兜底）。
 */
export declare function channelDisplayName(siteKey: string, lang?: ProviderLang): string | undefined;
export {};
//# sourceMappingURL=provider-display.d.ts.map