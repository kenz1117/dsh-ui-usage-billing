/**
 * 插件元信息（「设置 → 插件信息卡」展示）：名称 / 描述 / 作者 / 仓库 / 许可证。
 * 版本号不含在此——由服务端从自身 package.json 读取（pluginVersion），
 * 这样发布版版本与源码单一来源，不会两处不同步。
 */

/** npm 包名。 */
export const PLUGIN_NAME = '@kenz1117/dsh-ui-usage-billing'

/** 一句话描述。 */
export const PLUGIN_DESCRIPTION = 'Usage billing dashboard for DeepSeek Harness'

/** 作者显示名。 */
export const PLUGIN_AUTHOR_NAME = 'KenZ'

/** 作者 GitHub 账号（仓库/作者页链接）。 */
export const PLUGIN_AUTHOR_HANDLE = 'kenz1117'

/** 源码仓库（可点击）。 */
export const PLUGIN_REPOSITORY = 'https://github.com/kenz1117/dsh-ui-usage-billing'

/** npm 包主页（可点击）。 */
export const PLUGIN_NPM_URL = 'https://www.npmjs.com/package/@kenz1117/dsh-ui-usage-billing'

/** 许可证。 */
export const PLUGIN_LICENSE = 'MIT'
