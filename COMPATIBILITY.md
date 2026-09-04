# 兼容性管理（单一事实源）

本页是「插件 ↔ 宿主」兼容关系的唯一权威文档。AGENTS.md 的 SOP 管流程，本页管状态：哪条线服务哪代宿主、走哪个 npm 标签、当前过渡到哪一步。改任何一处声明（package.json 矩阵、npm dist-tag、README 兼容段）前先对照本页，改完同步回本页。

## 宿主发布线全景（@deepseek-ai/dsh）

| 宿主代际 | 版本范围 | 宿主 npm 标签 | 模块面特征 |
|---|---|---|---|
| 0.1.0/0.1.1 系（旧） | 0.1.0-rc.8 ~ 0.1.1-rc.2 | （无，已从 latest 退位） | client bundle 提供 `dsh-client-runtime` / `connection` |
| 0.1.2 系（新） | 0.1.2-alpha.1 ~ 0.1.2-rc.1 起 | `latest` / `next`（rc.1 起）、`alpha` | client bundle 改为 `remote` / `store`；移除 `settingsNamespace` |

关键事实：宿主 `latest` 自 0.1.2-rc.1 起指向 0.1.2 系——新用户默认装到的就是新代际。

## 插件双线对照

| 线 | 分支 | 版本号 | npm 标签 | 服务宿主 | package.json 声明 |
|---|---|---|---|---|---|
| 预览线 | `main` | `1.0.x` | `latest`（v1.0.26 起）+ `alpha` | 0.1.2 系 | `dsh: >=0.1.2-alpha.1` + `dshReleases` 逐版本 |
| 稳定线 | `compat/stable-dsh` | `1.1.x` | `stable`（v1.1.6 起） | 0.1.1 系 | `dsh: >=0.1.0-rc.8 <0.1.1-0 \|\| >=0.1.1-rc.1 <0.1.2-0` + `dshReleases` 三版本 |

**标签策略：插件 `latest` 永远跟随宿主 `latest` 所在代际。** 宿主 latest 换代时，旧代际线退到 `stable` 标签继续维护，新代际线接管 `latest`。历史包袱：v1.0.26/v1.1.6 之前插件 `latest` 是稳定线（1.1.5），与宿主 latest（0.1.2-rc.1）错配，导致 issue #31（新用户默认组合必崩）。

### 用户安装指引

- 宿主 0.1.2 系（`npm view @deepseek-ai/dsh version` 显示 0.1.2-*）：`dsh plugin add npm:@kenz1117/dsh-ui-usage-billing`（latest 即预览线）
- 宿主 0.1.1 系（0.1.0-rc.8 ~ 0.1.1-rc.2）：`dsh plugin add npm:@kenz1117/dsh-ui-usage-billing@stable`
- 不确定宿主代际：先跑 `dsh --version` 或看 `npm ls -g @deepseek-ai/dsh`

## 监控与校验机制

- **校验脚本** [scripts/check-compat.mjs](scripts/check-compat.mjs)：对照 npm registry 元数据校验两条线的矩阵——区间内每个已发布宿主版本必须逐版本声明、dist-tag 指向的版本必须声明、声明与区间必须自洽、双线区间并集必须覆盖全部相关宿主版本。本地手跑：`node scripts/check-compat.mjs --peer <compat分支package.json路径>`。
- **每日监控** [.github/workflows/watch-dsh-releases.yml](.github/workflows/watch-dsh-releases.yml)：每天 09:17（Asia/Shanghai）在 CI 跑同一脚本，漂移即开/更新 `compat-drift` 标签的 issue。宿主发新版最迟 24 小时内会被发现。
- **适配流程**：宿主出新版后的验证→声明→发版顺序见 AGENTS.md「宿主版本升级适配流程」，本页不重复。

## 区间写法约定（踩过的坑）

- SemVer 预发布陷阱：`<0.1.2` 会放行 `0.1.2-alpha.*`（预发布小于正式版），排除整代预发布要写 `<0.1.2-0`。
- 跨 tuple 的预发布覆盖：稳定线要同时覆盖 0.1.0-rc.8 与 0.1.1-rc.* 两个 patch 位的预发布，需用 `||` 并集写法，单一区间在严格 SemVer 语义下盖不住。
- 校验统一按 `includePrerelease: true` 求值；区间写法同时保证在默认语义下方向正确（不把 0.1.2 系放进稳定线）。
- `0.1.2-alpha.1` 已被官方从 npm 下架（GitHub release 仍在），矩阵保留声明仅服务存量安装，校验脚本对此降级为警告。

## 当前过渡状态（2026-09-04）

- [ ] 发 v1.0.26（预览线）：含 rc.1 声明、`dsh` 区间、devDeps 升 0.1.2-rc.1
- [ ] 发 v1.1.6（稳定线）：含 `dsh` 区间（compat 分支 a4a4c22 起）
- [ ] `npm dist-tag add @kenz1117/dsh-ui-usage-billing@1.0.26 latest`（latest 移交预览线）
- [ ] `npm dist-tag add @kenz1117/dsh-ui-usage-billing@1.1.6 stable`（稳定线退路标签）
- [ ] 关闭 issue #31（引导用户换线已回复，待版本落地）

---

## English summary

This file is the single source of truth for plugin↔host compatibility. The host `@deepseek-ai/dsh` ships two generations: 0.1.1-era (rc.8 ~ 0.1.1-rc.2) and 0.1.2-era (npm `latest` since 0.1.2-rc.1). The plugin maintains two release lines: preview (`main`, 1.0.x, npm `latest` from v1.0.26) serving 0.1.2 hosts, and stable (`compat/stable-dsh`, 1.1.x, npm `stable` from v1.1.6) serving 0.1.1 hosts. Policy: the plugin's `latest` tag always follows the host generation that owns the host's `latest` tag. `scripts/check-compat.mjs` validates both lines' compatibility matrices against npm registry metadata (per-version declaration required for every in-range host release and every dist-tag target); the `watch-dsh-releases` GitHub Actions workflow runs it daily and files a `compat-drift` issue on drift. SemVer pitfalls: use `<X.Y.Z-0` to exclude a whole prerelease generation, and union ranges to cover prereleases across patch tuples. `0.1.2-alpha.1` was unpublished from npm by upstream; the matrix keeps it for existing installs (warning-level only).
