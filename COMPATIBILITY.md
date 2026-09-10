# 兼容性管理（单一事实源）

本页是「插件 ↔ 宿主」兼容关系的唯一权威文档。AGENTS.md 的 SOP 管流程，本页管状态：哪条线服务哪代宿主、走哪个 npm 标签、当前过渡到哪一步。改任何一处声明（package.json 矩阵、npm dist-tag、README 兼容段）前先对照本页，改完同步回本页。

## 宿主发布线全景（@deepseek-ai/dsh）

| 宿主代际 | 版本范围 | 宿主 npm 标签 | 模块面特征 |
|---|---|---|---|
| 0.1.0/0.1.1 系（旧） | 0.1.0-rc.8 ~ 0.1.1-rc.2 | （无，已从 latest 退位） | client bundle 提供 `dsh-client-runtime` / `connection` |
| 0.1.2 系 | 0.1.2-alpha.1 ~ 0.1.2-rc.1 | （已从 latest 退位） | client bundle 改为 `remote` / `store`；移除 `settingsNamespace` |
| 0.1.3 系 | 0.1.3-alpha.1 ~ 0.1.3-alpha.2 | （无独立标签，alpha 波动） | SessionPersistence 改 SessionHandle 模型（`open`/`read`，`readFrom`/`locate` 消失）；session format v2 |
| 0.1.5 系（现行 latest） | 0.1.5-alpha.1 ~ 0.1.5-rc.1 | `latest` / `next`（rc.1 起）、`alpha` | SessionHandle 面与 0.1.3-alpha.2 一致；`handle.read` 返回 `SessionHandleReadResult`（`{eventState, events}` 包装，0.1.3-alpha.1 为裸数组） |

关键事实：宿主 `latest` 现指向 0.1.5-rc.1（0.1.2 系为上一代）——新用户默认装到的就是新代际。预览线 `dsh` 区间（`>=0.1.2-alpha.1`，无上界）天然覆盖 0.1.3/0.1.5，插件 v1.0.29-alpha.1 起适配 SessionHandle 持久化新面（注入点结构探测，双宿主形状通吃）；v1.2.1 起适配 `handle.read` 的包装返回形状。2026-09-10 已在宿主 0.1.5-rc.1 + 插件本地构建上真机验证（插件加载、`/api/billing/usage-stats` 聚合、历史会话回读全部正常）。0.1.3→0.1.5 无新增宿主面破坏（逐包类型面比对确认）。

## 插件双线对照

| 线 | 分支 | 版本号 | npm 标签 | 服务宿主 | package.json 声明 |
|---|---|---|---|---|---|
| 预览线 | `main` | `1.2.x`（v1.2.0 起） | `latest`（v1.0.26 起）+ `alpha` | 0.1.2 ~ 0.1.5 系 | `dsh: >=0.1.2-alpha.1` + `dshReleases` 逐版本 |
| 稳定线 | `compat/stable-dsh` | `1.1.x` | `stable`（v1.1.6 起） | 0.1.1 系 | `dsh: >=0.1.0-rc.8 <0.1.1-0 \|\| >=0.1.1-rc.1 <0.1.2-0` + `dshReleases` 三版本 |

**标签策略：插件 `latest` 永远跟随宿主 `latest` 所在代际。** 宿主 latest 换代时，旧代际线退到 `stable` 标签继续维护，新代际线接管 `latest`。历史包袱一：v1.0.26/v1.1.6 之前插件 `latest` 是稳定线（1.1.5），与宿主 latest（0.1.2-rc.1）错配，导致 issue #31（新用户默认组合必崩）。历史包袱二：预览线 1.0.x 曾**低于**稳定线 1.1.x（版本号倒挂），pnpm 的 `minimumReleaseAge` 冷静期把刚发布的 latest 跳过后会回退到旧稳定线（issue #40 有实测：`@latest` 实际装到 1.1.11，0.1.2 宿主直接崩）——**自 v1.2.0 起预览线采用 1.2.x 序列，恒高于稳定线**，倒挂根除；过渡期宿主 profile 里的逐版本 `minimumReleaseAgeExclude` 不再需要（可改为包级豁免）。

### 用户安装指引

- 宿主 0.1.2 ~ 0.1.5 系（`npm view @deepseek-ai/dsh version` 显示 0.1.2-* ~ 0.1.5-*）：`dsh plugin --profile web add npm:@kenz1117/dsh-ui-usage-billing@latest`（latest 即预览线；`--profile` 必填，建议钉具体版本号避开发布冷静期）
- 宿主 0.1.1 系（0.1.0-rc.8 ~ 0.1.1-rc.2）：`dsh plugin --profile web add npm:@kenz1117/dsh-ui-usage-billing@stable`
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

## 当前状态（2026-09-10）

- [x] v1.0.26/v1.1.6：`dsh` 区间落地，`latest`/`stable` 标签移交完成，issue #31 关闭
- [x] v1.2.0：预览线切换 1.2.x 序列，倒挂根除（latest=1.2.0 > stable=1.1.14）
- [x] v1.2.1：`dshReleases` 补 0.1.3-alpha.2 / 0.1.5-alpha.1 / 0.1.5-alpha.2 / 0.1.5-rc.1；`handle.read` 包装形状适配；宿主 0.1.5-rc.1 真机验证通过
- [ ] 宿主侧把 profile 逐版本 `minimumReleaseAgeExclude` 改为包级豁免（待与宿主作者沟通）

---

## English summary

This file is the single source of truth for plugin↔host compatibility. The host `@deepseek-ai/dsh` has shipped three generations: 0.1.1-era (rc.8 ~ 0.1.1-rc.2), 0.1.2-era (client bundle switches to `remote`/`store`), and 0.1.5-era (npm `latest` at 0.1.5-rc.1; the SessionHandle persistence model from 0.1.3 stays put — `handle.read` returns the `SessionHandleReadResult` wrapper `{eventState, events}` since 0.1.3-alpha.2). The plugin maintains two release lines: preview (`main`, 1.2.x since v1.2.0 — kept strictly above the stable line to kill the version inversion that let pnpm`s `minimumReleaseAge` cooldown fall back to the old stable line, see issue #40; npm `latest` from v1.0.26) serving 0.1.2 ~ 0.1.5 hosts, and stable (`compat/stable-dsh`, 1.1.x, npm `stable` from v1.1.6) serving 0.1.1 hosts. Since v1.2.1 the host-shape adapter handles both `handle.read` return shapes, and the 0.1.5-rc.1 host was verified on real hardware (plugin load, `/api/billing/usage-stats` aggregation, historical session replay all pass). Policy: the plugin's `latest` tag always follows the host generation that owns the host's `latest` tag. `scripts/check-compat.mjs` validates both lines' compatibility matrices against npm registry metadata (per-version declaration required for every in-range host release and every dist-tag target); the `watch-dsh-releases` GitHub Actions workflow runs it daily and files a `compat-drift` issue on drift. SemVer pitfalls: use `<X.Y.Z-0` to exclude a whole prerelease generation, and union ranges to cover prereleases across patch tuples. Release rule (issue #40): always publish the preview line with an explicit `--tag latest` and the stable line with `--tag stable` — npm never moves `latest` to a lower semver, so a bare publish of 1.0.x leaves `latest` on the 1.1.x line while the marketplace and `dsh plugin add` install `latest` by default; verify dist-tags after every publish. `0.1.2-alpha.1` was unpublished from npm by upstream; the matrix keeps it for existing installs (warning-level only).
