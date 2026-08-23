/**
 * PluginInfoCard: 「设置 → 插件信息」卡——展示头像/作者、GitHub 仓库、版本号、
 * 许可证等插件元信息。版本号来自服务端 usage-stats 的 `pluginVersion`（读自
 * 包 package.json），其余元信息静态来自 `plugin-info.ts`。无版本号时显示 em dash。
 */

import css from './UsageBilling.module.css'
import {
  PLUGIN_AUTHOR_HANDLE,
  PLUGIN_AUTHOR_NAME,
  PLUGIN_DESCRIPTION,
  PLUGIN_LICENSE,
  PLUGIN_NAME,
  PLUGIN_NPM_URL,
  PLUGIN_REPOSITORY,
} from './plugin-info.ts'
import type { UsageBillingKey } from './locales.ts'

/** 信息卡 props：locale 函数 + 版本号（服务端下发，可为空）。 */
export function PluginInfoCard({ t, version }: { t: (key: UsageBillingKey) => string; version: string | undefined }): React.ReactNode {
  return (
    <section className={css.panel} data-testid="billing-plugin-info">
      <div className={css.panelHead}>
        <h3 className={css.panelTitle}>{t('billing.pluginInfo')}</h3>
      </div>
      <div className={css.pluginInfo}>
        <div className={css.pluginInfoRow}>
          <span className={css.pluginInfoLabel}>{t('billing.pluginName')}</span>
          <span className={css.pluginInfoValue}>{PLUGIN_NAME}</span>
        </div>
        <div className={css.pluginInfoRow}>
          <span className={css.pluginInfoLabel}>{t('billing.pluginDescription')}</span>
          <span className={css.pluginInfoValue}>{PLUGIN_DESCRIPTION}</span>
        </div>
        <div className={css.pluginInfoRow}>
          <span className={css.pluginInfoLabel}>{t('billing.pluginVersion')}</span>
          <span className={css.pluginInfoValue}>{version === undefined ? '—' : `v${version}`}</span>
        </div>
        <div className={css.pluginInfoRow}>
          <span className={css.pluginInfoLabel}>{t('billing.pluginAuthor')}</span>
          <a className={css.pluginInfoLink} href={`https://github.com/${PLUGIN_AUTHOR_HANDLE}`} target="_blank" rel="noreferrer">
            {PLUGIN_AUTHOR_NAME} ({PLUGIN_AUTHOR_HANDLE})
          </a>
        </div>
        <div className={css.pluginInfoRow}>
          <span className={css.pluginInfoLabel}>{t('billing.pluginRepository')}</span>
          <a className={css.pluginInfoLink} href={PLUGIN_REPOSITORY} target="_blank" rel="noreferrer">
            {PLUGIN_REPOSITORY}
          </a>
        </div>
        <div className={css.pluginInfoRow}>
          <span className={css.pluginInfoLabel}>{t('billing.pluginNpm')}</span>
          <a className={css.pluginInfoLink} href={PLUGIN_NPM_URL} target="_blank" rel="noreferrer">
            {PLUGIN_NAME}
          </a>
        </div>
        <div className={css.pluginInfoRow}>
          <span className={css.pluginInfoLabel}>{t('billing.pluginLicense')}</span>
          <span className={css.pluginInfoValue}>{PLUGIN_LICENSE}</span>
        </div>
      </div>
    </section>
  )
}
