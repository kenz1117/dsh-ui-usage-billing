/**
 * PluginInfoCard: 「设置 → 插件信息」卡——展示头像/作者、GitHub 仓库、版本号、
 * 许可证等插件元信息。版本号来自服务端 usage-stats 的 `pluginVersion`（读自
 * 包 package.json），其余元信息静态来自 `plugin-info.ts`。无版本号时显示 em dash。
 */
import type { UsageBillingKey } from './locales.ts';
/** 信息卡 props：locale 函数 + 版本号（服务端下发，可为空）。 */
export declare function PluginInfoCard({ t, version }: {
    t: (key: UsageBillingKey) => string;
    version: string | undefined;
}): React.ReactNode;
//# sourceMappingURL=PluginInfoCard.d.ts.map