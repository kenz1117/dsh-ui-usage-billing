# AGENTS.md

本仓库是 DSH 插件 `@kenz1117/dsh-ui-usage-billing`（用量/费用仪表盘）。改代码前先读这一页——尤其是**双线发布策略**，它决定版本号、npm tag、兼容矩阵的写法。

## 正式版 / 预览版双线策略（最重要）

只维护**当前宿主代际的一份 `main` 代码**，正式版与预览版是两个发行通道，不是两套源码、两套兼容矩阵或两个长期开发分支：

| 通道 | 版本号 | npm tag | GitHub Release | 用途 |
|---|---|---|---|---|
| **正式版** | 非预发布 SemVer（如 `1.8.0`） | `latest` | 正式 Release | 已完成验收、面向默认安装 |
| **预览版** | 带预发布后缀（如 `1.8.1-alpha.2`） | `alpha` | Pre-release | 新功能与宿主适配的先行验证 |

当前发行状态：npm `latest` 指向 `1.8.1` 正式版，`alpha` 指向 `1.8.1-alpha.2` 预览版。后续正式版只切 `latest`，预览版只切 `alpha`，不再同时切 `latest`。兼容状态以 [COMPATIBILITY.md](COMPATIBILITY.md) 为准。

原则：

- **宿主兼容以实测为准**；宿主 API 随预览版迭代漂移，适配跟随但不假作稳定承诺。
- 正式版从已验收的预览版晋升；两条发行通道共享同一代码与兼容声明，不做跨代际 cherry-pick。
- **不假声明兼容**：兼容矩阵必须与代码实际依赖一致，验证过哪个宿主版本才能声明哪个版本。

## 宿主版本升级适配流程（SOP）

官方宿主出新版时按此顺序走，全程**先验证后声明**：

1. **查证**：`npm view @deepseek-ai/dsh dist-tags` + `gh release view dsh-v<版本> -R deepseek-ai/deepseek-harness`，逐条过 release notes 圈影响面：模块表、Session API、UI 结构、插件加载机制。
2. **甄别代码依赖面**：搜索 `src/` / `tests/` 的 `@deepseek-ai` 引用，对比变更清单，判断零适配 / 需要改代码 / breaking。
3. **升级本机宿主并验收**：安装目标版本后起隔离服务，检查侧边栏胶囊、仪表盘、余额行、账单数字与 Console。
4. **通过后才扩兼容声明**：更新 `package.json` 的 `dshReleases` 与 devDependencies pin，`pnpm install` 重锁。
5. **选择发行通道**：先行验证发预览版；验收成熟后晋升正式版。两者都使用同一份当前宿主兼容矩阵。
6. **发版即切对应 dist-tag**：正式版切 `latest`，预览版切 `alpha`；发完跑 `node scripts/check-compat.mjs` 复核。

## 宿主版本监控

- [watch-dsh-releases.yml](.github/workflows/watch-dsh-releases.yml) 每日 09:17（Asia/Shanghai）跑 [scripts/check-compat.mjs](scripts/check-compat.mjs)，对照 npm registry 校验当前矩阵，漂移自动开/更新 `compat-drift` issue。
- 本地发布前后各跑一次同一脚本；不再联查旧代码分支。

## 发布纪律

- 一个发布节点 = 一个明确通道的版本 + 对应 dist-tag + Git tag / GitHub Release，不碎片化。
- **小步快跑**：变更合并到 `main` 后尽快发预览版；崩溃、账单错误、安全修复随时加急。正式版必须来自已经验收的预览候选，不直接把未验证改动塞进 `latest`。
- **攒批边界**：只攒同一主题、互相依赖的改动；不同主题分开发。
- 预览版打 **Pre-release**；正式版不打。
- 发版前跑 `pnpm i && pnpm test`、lint、构建、目录与兼容校验，并在对应宿主做真机验收。
- 发布顺序：先提交并 `npm publish` 精确版本，确认 registry 可见后切 dist-tag，再推送 main / tag 触发目录 Pages，最后建 GitHub Release 与回复 issue。

## 分支与构建

- `main`：唯一活跃开发分支，服务正式版与预览版。
- 构建：`./sync.sh`（本仓自设体积防线：>256 KiB 提示、>500 KiB 强警告，**非上游硬约束**）。
- 不为旧宿主保留第二套构建或测试基线。

## 本机测试环境（端口 / 家目录隔离）

| 环境 | 宿主 | 端口 | 启动 |
|---|---|---|---|
| 日常（Electron / DMG） | 当前宿主 | 桌面客户端 | 用户手动操作；不要误动 `desktop` profile |
| Web 开发 / API 验收 | 当前宿主 | 3080 | `dsh --profile web --port 3080 --no-open` |
| 能力降级验收 | 隔离宿主 | 3091 | 使用独立 `DSH_HOME` 启动 |

发版前在对应环境安装目标版本做真机验收（curl `/api/billing/usage-stats` 看 `pluginVersion`）。不要共用家目录，不要用 web 验收替代桌面 profile 变更。

## 本地开发模式（3080）

3080 使用 **pnpm link** 指向本仓。开发工作流：改代码 → `./sync.sh` 构建 lib → 重启 3080；npm 发布只用于对外发布节点。

- **pnpm store 版本坑**：主仓与 profile 的 pnpm store 版本不同；profile 出现 `ERR_PNPM_UNEXPECTED_STORE` 时，用其原定 pnpm 版本重装依赖后再 `dsh plugin add`。
- **宿主升级同步依赖**：devDependencies 的 `@deepseek-ai/dsh-*` pin 跟当前宿主一致（个别子包不发同版时用其最新可用版），改完重锁。
- **平台种子守卫**：`scripts/check-clientbundle-sync.mjs` 按本仓声明的最新兼容 tag 判定；本仓多出的宿主模块是危险项，缺少项需镜像。tag 不可得时设 `DSH_FETCH_HOST_TAG=1`。
- **测试环境坑**：client 测试用 `tests/bind-snapshot-selector.ts` 替代不可安装的官方 test-runtime；宿主 UI 包 CSS 经 Vite inline；registry 漏声明的间接依赖需在本仓 devDependencies 显式补齐；锁竞争测试使用恒存活 pid。

## 多会话协作纪律

- **同一时间只允许一个 AI 会话操作本仓工作区**。
- 接手时先盘点 `git log`、`git status`、`git diff`；保留并完成他人进行中的有效工作，不误删、不误改发行通道。

## e2e（双层）

3080 dev host UI 路径走 token auth（token 每次启动轮换，Playwright 无法获取），
in-process DSH host 又不带桌面运行时（UI 组件加载不全）。双层覆盖：

**API contract**（`pnpm test:e2e`，@playwright/test 的 `request` fixture，无 browser）：
3 剧本 → 3080 9 条 HTTP 端点合同。`tests/api-contract/*.spec.ts`。

**UI 组件**（`pnpm test`，vitest + @testing-library/react + jsdom）：
3 剧本 → sidebar trigger / 8 Tab panel 切换 / 不可读会话提示。`tests/*.component.spec.tsx`。

- **跑 API e2e**：`pnpm test:e2e`（无需装浏览器——只用 request fixture；30 秒内）
- **前置**：3080 dev host 在跑（`./sync.sh` + `pnpm dsh --profile web --port 3080 --no-open`）
- **换端口**：`PLAYWRIGHT_BASE_URL=http://127.0.0.1:3090 pnpm test:e2e`
- **跑 UI 组件**：`pnpm test`（含 jsdom + @testing-library 渲染）
- **不接 CI**——本地手跑验收/准发布前跑；改 portal / Modal / Tab 切换时必跑 UI 组件
- **改 HTTP 端点路径 / 字段** 时必跑 API e2e

## 其他约定

- `CLAUDE.md` 是 `AGENTS.md` 的**普通文件拷贝**（DSH Store 契约禁止仓库内符号链接，symlink 会导致收录暂缓）；改 `AGENTS.md` 后必须同步 `cp AGENTS.md CLAUDE.md` 再提交。

- 计费口径：历史事件一律按**事件发生时刻**生效的官方规则计价，官方调价按变更节点追加规则（见 `src/client/pricing.ts` 的时间线与 README「计费规则时间线」），不得统一套现行规则重算历史。
- **「本月预计」口径（2026-10-23）**：= 本月已发生 + 近 7 个自然日节奏 × 本月剩余天数（`src/client/domain/forecast.ts`）。旧口径拿「本月有记录的天数」当分母求日均再乘整月天数，稀疏使用的月份会被放大数倍——**别再改回按有记录天平均**：判断标准是「只外推还没发生的天数，近期没花钱就不虚增」。本月费用本身是实数，与预计无关，两者不可互推。
- **内置目录扩容与调价分离（2026-10-23 纪律）**：目录扩容（补录新模型）与存量价格更正**分开发**——扩容批只加新条目、既有条目的价格一律不动，价格更正另走独立的调价节点（否则历史账单口径会被扩容顺带改写）。**价源口径**：海外厂商取 models.dev 实时目录原生 USD；国内厂商优先取官方 CN 价（models.dev 的 `-cn` 目录），该目录缺项时按 USD 价 × 汇率折算并**在条目注释里标注折算来源**。目录守卫测试（`tests/pricing.spec.ts`）锁三条不变量：目录键唯一、归一化后不互相打架（归一索引「首个命中即用」，撞车会让其中一个键永远解析不到）、别名必须指向存在的条目——**改目录先跑它**。
- 体积红线：**DSH Store 对插件 JS bundle 无审查上限**（仅对图标文件 icon.* 设 256 KiB 上限）。`lib/client.js` 的 256 KiB / 500 KiB 两道阈值是本仓 `sync.sh` 自设的成本防线——把新增功能的体积增长暴露在每次构建，避免被用户感知到加载变慢；非上游强制。纯 CSS/文案/资产的增量也要进评估视野。
- issue 回复用中文；先诊断根因再动手，涉及发布时在回复里写清正式版 / 预览版各自的版本与通道。
- **竞品调研与改进计划**：[docs/store-benchmark-2026-10.md](docs/store-benchmark-2026-10.md)——DSH 商店「用量与计费」类目 214 个插件的横向调研（2026-10-23 快照），含差距矩阵（G1~G12）与分批执行计划。**新增功能前先查该文档**：宿主能力一律 **type-only import + `ctx.inject`/`ctx.get`**，**不得**把新的 `@deepseek-ai/*` 加进 `PLATFORM_MODULES`（会让老宿主 `require()` 到应答不了的 spec → 运行时抛错）；服务缺席即降级，不得因此收窄兼容矩阵；client bundle 是单文件 closure factory、无代码分割，新代码必须体积入账（`pnpm size` 查红线）。
- **仪表盘分区（2026-10-27）**：8 个一级分区——概览 / 队列 / 账单 / 用量 / 趋势 / 智能体 / 费率 / 设置；**Tab 只留名称，不挂状态徽标**（信息都在各自分区内）。智能体网络树见 `src/client/domain/agent-tree.ts`（从 `parentId` 还原委派关系 + 链合计 + 环防护）。
- **面板压缩防线**：`.dashboardBody` / `.tabPanel` 是列向 flex 容器，直系子块必须 `flex-shrink: 0`（列向 flex 默认会把内容高的卡片**压扁而不是滚动**——`overflow-y:auto` 挡不住 flex 收缩；2026-10-23 用户反馈「切到上下文 Tab 卡片被缩小」即此坑）。jsdom 不做布局、无法单测覆盖，由 lint **守卫 7「面板压缩防线」**兜底。
- **体积现状（2026-10-27）**：`lib/client.js` = 337,952 字节（330.0 KiB），自设强线 500 KiB（余量 170.0 KiB）；每次发布仍须实测并记录增量，不为压数字牺牲可靠性或引入动态执行。
- **已接入的宿主能力（均为特性探测 + 降级）**：会话跳转（`ctx.uiWorkspace.openSession` 新代 / `ctx.sessions.open` 老代，见 `src/client/session-navigation.ts`）、`/usage` 对话内命令（`ctx.commandUi.register`，见 `src/client/usage-command.ts`）、低谷任务队列（`sessionController`，见 `src/task-queue.ts`）。取服务一律走 `ctx.get()`（免 inject）——老宿主没有这些服务，声明成注入依赖会挂起等它、卡住整个 web 启动。
- **DSH Community Market 目录（Path A）**：`catalog/catalog-source.json` + `catalog/v1/plugins.json`，由 `.github/workflows/pages.yml` 发到 GitHub Pages；本地/CI 用 `node scripts/check-catalog.mjs` 校验（strict schema：多余字段会让整个来源被市场拒收）。发布时序：**先 npm publish 精确版本，再并入 main 触发 Pages**——目录指向未发布版本时市场安装会 fail-closed（预期行为）。
