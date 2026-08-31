/**
 * PluginInfoCard: 「设置 → 插件信息」卡——图标 + 插件名/版本 tag + 描述，下接
 * 元信息网格（作者 / 仓库 / npm / 许可证）。版本号来自服务端 usage-stats 的
 * `pluginVersion`（读自包 package.json），其余元信息静态来自 `plugin-info.ts`。
 * 无版本号时显示 em dash。
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
    <section className={css.setCard} data-testid="billing-plugin-info">
      <div className={css.plgHead}>
        <span className={css.plgIcon} aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a2 2 0 0 0 4 0V4a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1a2 2 0 0 0 4 0 1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-1a2 2 0 0 0 0 4h1a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-1a2 2 0 0 0-4 0v1a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2a2 2 0 0 0-4 0v1a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1a2 2 0 0 0-4 0 1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h1a2 2 0 0 0 0-4H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h1a2 2 0 0 0 4 0z" />
          </svg>
        </span>
        <div className={css.plgTitle}>
          <div className={css.plgNameRow}>
            <h3 className={css.plgName}>{PLUGIN_NAME}</h3>
            <span className={css.plgTag}>{version === undefined ? '—' : `v${version}`}</span>
          </div>
          <p className={css.plgDesc}>{PLUGIN_DESCRIPTION}</p>
        </div>
      </div>
      <div className={css.plgGrid}>
        <div className={css.plgItem}>
          <span className={css.plgLabel}>{t('pluginAuthor')}</span>
          <a className={css.plgLink} href={`https://github.com/${PLUGIN_AUTHOR_HANDLE}`} target="_blank" rel="noreferrer">
            {PLUGIN_AUTHOR_NAME} ({PLUGIN_AUTHOR_HANDLE})
          </a>
        </div>
        <div className={css.plgItem}>
          <span className={css.plgLabel}>{t('pluginRepository')}</span>
          <a className={css.plgLink} href={PLUGIN_REPOSITORY} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
        <div className={css.plgItem}>
          <span className={css.plgLabel}>{t('pluginNpm')}</span>
          <a className={css.plgLink} href={PLUGIN_NPM_URL} target="_blank" rel="noreferrer">
            {PLUGIN_NAME}
          </a>
        </div>
        <div className={css.plgItem}>
          <span className={css.plgLabel}>{t('pluginLicense')}</span>
          <span className={css.plgVal}>{PLUGIN_LICENSE}</span>
        </div>
      </div>
    </section>
  )
}
