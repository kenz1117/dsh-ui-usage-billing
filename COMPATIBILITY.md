# 兼容性管理（单一事实源）

本页是「插件 ↔ 宿主」兼容关系的唯一权威文档。AGENTS.md 的 SOP 管流程，本页管状态：哪条线服务哪代宿主、走哪个 npm 标签、当前过渡到哪一步。改任何一处声明（package.json 矩阵、npm dist-tag、README 兼容段）前先对照本页，改完同步回本页。

## 宿主发布线全景（@deepseek-ai/dsh）

| 宿主代际 | 版本范围 | 宿主 npm 标签 | 模块面特征 |
|---|---|---|---|
| 0.1.0/0.1.1 系（旧） | 0.1.0-rc.8 ~ 0.1.1-rc.2 | （无，已从 latest 退位） | client bundle 提供 `dsh-client-runtime` / `connection` |
| 0.1.2 系 | 0.1.2-alpha.1 ~ 0.1.2-rc.1 | （已从 latest 退位） | client bundle 改为 `remote` / `store`；移除 `settingsNamespace` |
| 0.1.3 系 | 0.1.3-alpha.1 ~ 0.1.3-alpha.2 | （无独立标签，alpha 波动） | SessionPersistence 改 SessionHandle 模型（`open`/`read`，`readFrom`/`locate` 消失）；session format v2 |
| 0.1.5 系 | 0.1.5-alpha.1 ~ 0.1.5-rc.3 | `latest`（rc.1 起） | SessionHandle 面与 0.1.3-alpha.2 一致；`handle.read` 返回 `SessionHandleReadResult`（`{eventState, events}` 包装，0.1.3-alpha.1 为裸数组）；rc.2 相对 rc.1 仅追加代码文件图标 artwork 与构建元数据；rc.3 相对 rc.2 对插件五依赖包零差异，对插件零影响 |
| 0.1.6 系（alpha 预览，未出 rc） | 0.1.6-alpha.1 ~ 2 | （标签已让位 0.1.7 系） | 变更集中在 desktop asar runtime / compaction banner / session-title；插件五个依赖包零代码变更，对插件零影响（alpha.1 于 2026-09-16、alpha.2 于 2026-09-19 逐 diff 复核） |
| 0.1.7 系 | 0.1.7-alpha.1 ~ 0.1.7-rc.1 | `alpha`（alpha.2 起）/ `next`（rc.1 起） | 包级 diff 均为追加式，但类型面/运行时对插件有三处破坏（v1.4.8 已适配）：primitives 把 `IconChevronDownOutline14` 拆为 Regular/Medium/Artwork 三变体（issue #72：缺失名经宿主注入表解析为 undefined，渲染抛 React #130）；dsh-settings 服务类更名 `SettingsForms` 并从运行时移除 `register`（设置开关降级只读：读回退 cordis.yml config 兜底，写返回 settings unavailable，完整迁移走 plugin config 投影留作后续）；`SessionSummary` 移除 `completed` 字段（插件 isFinished 双条件判定下 `running === false` 兜底，行为不变）。另注意：0.1.7 世代多数 dsh 包 npm 包未声明 `dependencies`（生产由宿主注入表满足，本地 vitest 需在 devDeps 补齐真实依赖才能解析） |

关键事实：宿主 `latest` 现指向 0.1.5-rc.3（0.1.2 系为上一代），`alpha` 已前移到 0.1.7-alpha.2、`next` 指向 0.1.7-rc.1；0.1.6 系未出 rc，代际序列从 0.1.6-alpha.2 直接进入 0.1.7-alpha.1——新用户默认装到的仍是新代际，alpha/next 用户提前进 0.1.7。预览线 `dsh` 区间（`>=0.1.2-alpha.1`，无上界）天然覆盖 0.1.3/0.1.5/0.1.6，插件 v1.0.29-alpha.1 起适配 SessionHandle 持久化新面（注入点结构探测，双宿主形状通吃）；v1.2.1 起适配 `handle.read` 的包装返回形状。2026-09-10 已在宿主 0.1.5-rc.1 + 插件本地构建上真机验证（插件加载、`/api/billing/usage-stats` 聚合、历史会话回读全部正常）。0.1.3→0.1.5 无新增宿主面破坏（逐包类型面比对确认）；0.1.5→0.1.6 插件依赖包逐包比对零代码变更（alpha.1 与 alpha.2 均逐 diff 确认）；0.1.5-rc.3 与 0.1.7-alpha.1/alpha.2/rc.1 逐 diff 确认包级均为追加式变更，但 0.1.7 世代存在上表所列三处类型面/运行时破坏，v1.4.8 已全部适配并在宿主 0.1.7-rc.1 真机冒烟通过（2026-09-24）。

## 插件双线对照

| 线 | 分支 | 版本号 | npm 标签 | 服务宿主 | package.json 声明 |
|---|---|---|---|---|---|
| 预览线 | `main` | `1.2.x`（v1.2.0 起） | `latest`（v1.0.26 起）+ `alpha` | 0.1.2 ~ 0.1.7 系 | `dsh: >=0.1.2-alpha.1` + `dshReleases` 逐版本 |
| 稳定线（**已冻结**） | `compat/stable-dsh` | `1.1.x`（终版 v1.1.17） | `stable`（v1.1.6 起，永久指向 v1.1.17） | 0.1.1 系 | `dsh: >=0.1.0-rc.8 <0.1.1-0 \|\| >=0.1.1-rc.1 <0.1.2-0` + `dshReleases` 三版本 |

**标签策略：插件 `latest` 永远跟随宿主 `latest` 所在代际。** 宿主 latest 换代时，旧代际线退到 `stable` 标签，其去留按下文冻结策略处理，新代际线接管 `latest`。历史包袱一：v1.0.26/v1.1.6 之前插件 `latest` 是稳定线（1.1.5），与宿主 latest（0.1.2-rc.1）错配，导致 issue #31（新用户默认组合必崩）。历史包袱二：预览线 1.0.x 曾**低于**稳定线 1.1.x（版本号倒挂），pnpm 的 `minimumReleaseAge` 冷静期把刚发布的 latest 跳过后会回退到旧稳定线（issue #40 有实测：`@latest` 实际装到 1.1.11，0.1.2 宿主直接崩）——**自 v1.2.0 起预览线采用 1.2.x 序列，恒高于稳定线**，倒挂根除；过渡期宿主 profile 里的逐版本 `minimumReleaseAgeExclude` 不再需要（可改为包级豁免）。

### 稳定线冻结与终止（EOL）

稳定线自 2026-09-11 起**冻结**，不再接收任何变更（含缺陷修复）。判断依据：0.1.1 系宿主在 npm `latest` 上只停留了 9 天（2026-08-21 的 0.1.1-rc.2 ~ 2026-08-30 的 0.1.2-alpha.2），此后安装的宿主全部是 0.1.2 及以后代际；为一条自然萎缩的旧代际长期维持第二个代码源与第二套测试环境，成本与收益不匹配。

`stable` 标签**保留且永久指向终版 v1.1.17**——存量用户照常安装、照常使用，只是不再有新版本。标签不删除是刻意的：删标签会让存量用户的安装命令直接失败（`No matching version found`），而保留一个不再更新的终版没有任何维护代价。

正式 EOL（README 移除旧代际安装指引、本页标注停用）的触发条件是**事件而非日期**：宿主 `@deepseek-ai/dsh` 发布首个不带 `-alpha` / `-rc` 后缀的正式版本时执行。选这个时点是因为上游自身的兼容策略也在同一节点切换——官方在首个正式 tag 之前明确不做兼容、允许破坏（见 harness 仓库 AGENTS.md 的 pre-release 立场），跟随同一节拍对外好解释，也避免我们比上游更早宣布停用。

### 用户安装指引

- 宿主 0.1.2 ~ 0.1.7 系（`npm view @deepseek-ai/dsh version` 显示 0.1.2-* ~ 0.1.7-*）：`dsh plugin --profile web add npm:@kenz1117/dsh-ui-usage-billing@latest`（latest 即预览线；`--profile` 必填，建议钉具体版本号避开发布冷静期）
- 宿主 0.1.1 系（0.1.0-rc.8 ~ 0.1.1-rc.2）：`dsh plugin --profile web add npm:@kenz1117/dsh-ui-usage-billing@stable`（该线**已冻结**，`stable` 指向终版 v1.1.17，不会再更新）
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

## 当前状态（2026-09-24）

- [x] v1.0.26/v1.1.6：`dsh` 区间落地，`latest`/`stable` 标签移交完成，issue #31 关闭
- [x] v1.2.0：预览线切换 1.2.x 序列，倒挂根除（latest=1.2.0 > stable=1.1.14）
- [x] v1.2.1：`dshReleases` 补 0.1.3-alpha.2 / 0.1.5-alpha.1 / 0.1.5-alpha.2 / 0.1.5-rc.1；`handle.read` 包装形状适配；宿主 0.1.5-rc.1 真机验证通过
- [x] v1.2.5：`dshReleases` 补 0.1.5-rc.2——逐包 lib 比对确认其相对 rc.1 仅图标 artwork 与构建元数据变化，对插件零影响
- [x] 稳定线冻结：终版 v1.1.17，`stable` 标签永久保留；正式 EOL 待宿主首个正式 tag
- [x] v1.4.1：`dshReleases` 补 0.1.6-alpha.1——host latest 仍在 0.1.5-rc.1、alpha 前移 0.1.6；插件五个依赖包逐包 diff 零代码变更，对插件零影响
- [x] v1.4.1（追加，watch-dsh-releases 报警后补）：`dshReleases` 补 0.1.6-alpha.2（2026-09-18 发布，五包 diff 仍为零代码变更）；宿主 `latest` 前移至 0.1.5-rc.2，文档同步
- [x] v1.4.2（核查后撤销）：此前的「宿主已发 alpha.3/.4」为误报（npm 上宿主本体仅到 alpha.2，`alpha` 标签即 alpha.2；深仓内部 tag 未发 npm）——不需要声明，2026-09-20 已验证 check-compat 无漂移
- [x] v1.4.8（2026-09-24）：适配宿主 0.1.7-rc.1 三处破坏——primitives 图标拆名（issue #72，双世代名字同引、按宿主世代取用）、dsh-settings 从运行时移除 register（typeof 探测降级，0.1.7 下设置开关只读，完整迁移留作后续 issue）、SessionSummary.completed 移除（兜底行为不变）；devDependencies 钉版整组 0.1.2-rc.1 → 0.1.7-rc.1，删 `*.tsbuildinfo` 后干净构建修掉 8 个类型错误，38 文件 495 项单测全绿。补装 26 个 devDeps：dsh-tools 0.1.7 新增 6 个 peers（agent/ptc-runtime/sandbox/sandbox-policy/system-prompt/user-approval，插件 .npmrc 关闭 auto-install-peers 须显式补装）；primitives 0.1.7 与 dsh-client-store 0.1.7 的 npm 包未声明运行时依赖（shiki/katex/micromark 全家桶/diff/simple-icons/@shikijs/langs/dsh-util-workspace-path/zustand/immer 等 20 包，版本照抄宿主仓库源码 devDeps），生产由宿主注入表满足、仅本地 vitest 需真实解析。两条教训：升级宿主依赖后必须先删 `*.tsbuildinfo` 再构建（tsc -b 增量缓存掩盖了首轮全部类型错误）；`pnpm install` 在 lockfile 不含新 devDeps 时会静默跳过，须带 `--no-frozen-lockfile` 并核对安装输出
- [ ] 宿主侧把 profile 逐版本 `minimumReleaseAgeExclude` 改为包级豁免（待与宿主作者沟通）

---

## English summary

This file is the single source of truth for plugin↔host compatibility. The host `@deepseek-ai/dsh` has shipped five generations: 0.1.1-era (rc.8 ~ 0.1.1-rc.2), 0.1.2-era (client bundle switches to `remote`/`store`), 0.1.5-era (npm `latest` at 0.1.5-rc.3; the SessionHandle persistence model from 0.1.3 stays put — `handle.read` returns the `SessionHandleReadResult` wrapper `{eventState, events}` since 0.1.3-alpha.2), the 0.1.6 era (never left alpha — desktop asar runtime, compaction banner and session-title changes; the plugin's five dependency packages have zero code changes, verified by per-package diff), and the 0.1.7 era (`alpha` at 0.1.7-alpha.2 and `next` at 0.1.7-rc.1 while `latest` sits at 0.1.5-rc.3 as of 2026-09-24 — package-level diffs are additive, but the generation carries three plugin-facing breaks, all adapted in v1.4.8: ui-primitives split `IconChevronDownOutline14` into Regular/Medium/Artwork variants (issue #72: a missing name resolves to `undefined` through the host injection table and throws React #130 at render), dsh-settings renamed its service class to `SettingsForms` and removed `register` from the runtime (the settings toggle degrades to read-only — reads fall back to cordis.yml config, writes return settings unavailable; full migration via plugin config projection deferred), and `SessionSummary` dropped `completed` (the plugin's two-condition isFinished keeps identical behavior through the `running === false` fallback). Note that most 0.1.7-era dsh npm packages declare no `dependencies` — production is satisfied by the host injection table, but local vitest needs the real packages added as devDependencies). The plugin maintains two release lines: preview (`main`, 1.2.x since v1.2.0 — kept strictly above the stable line to kill the version inversion that let pnpm`s `minimumReleaseAge` cooldown fall back to the old stable line, see issue #40; npm `latest` from v1.0.26) serving 0.1.2 ~ 0.1.7 hosts, and stable (`compat/stable-dsh`, 1.1.x, npm `stable` from v1.1.6) serving 0.1.1 hosts (frozen since 2026-09-11 at the final v1.1.17: the 0.1.1 era sat on npm `latest` for only nine days before the 0.1.2 generation took over, so the line takes no further changes; the `stable` tag stays on v1.1.17 permanently so existing installs never break; formal EOL, which removes the legacy install instructions, triggers on the host's first non-prerelease version rather than a date). Since v1.2.1 the host-shape adapter handles both `handle.read` return shapes, and the 0.1.5-rc.1 host was verified on real hardware (plugin load, `/api/billing/usage-stats` aggregation, historical session replay all pass); v1.2.5 declares 0.1.5-rc.2 after a per-package lib diff showed it changes only icon artwork and build metadata. Policy: the plugin's `latest` tag always follows the host generation that owns the host's `latest` tag. `scripts/check-compat.mjs` validates both lines' compatibility matrices against npm registry metadata (per-version declaration required for every in-range host release and every dist-tag target); the `watch-dsh-releases` GitHub Actions workflow runs it daily and files a `compat-drift` issue on drift. SemVer pitfalls: use `<X.Y.Z-0` to exclude a whole prerelease generation, and union ranges to cover prereleases across patch tuples. Release rule (issue #40): always publish the preview line with an explicit `--tag latest` and the stable line with `--tag stable` — npm never moves `latest` to a lower semver, so a bare publish of 1.0.x leaves `latest` on the 1.1.x line while the marketplace and `dsh plugin add` install `latest` by default; verify dist-tags after every publish. `0.1.2-alpha.1` was unpublished from npm by upstream; the matrix keeps it for existing installs (warning-level only).
