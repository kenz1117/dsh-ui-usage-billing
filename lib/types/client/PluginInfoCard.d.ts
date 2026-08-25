/**
 * PluginInfoCard: 「设置 → 插件信息」卡——图标 + 插件名/版本 tag + 描述，下接
 * 元信息网格（作者 / 仓库 / npm / 许可证）。版本号来自服务端 usage-stats 的
 * `pluginVersion`（读自包 package.json），其余元信息静态来自 `plugin-info.ts`。
 * 无版本号时显示 em dash。
 */
import type { UsageBillingKey } from './locales.ts';
/** 信息卡 props：locale 函数 + 版本号（服务端下发，可为空）。 */
export declare function PluginInfoCard({ t, version }: {
    t: (key: UsageBillingKey) => string;
    version: string | undefined;
}): React.ReactNode;
//# sourceMappingURL=PluginInfoCard.d.ts.map