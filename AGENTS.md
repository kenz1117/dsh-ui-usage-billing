# AGENTS.md

本仓库是 DSH 插件 `@kenz1117/dsh-ui-usage-billing`（用量/费用仪表盘）。改代码前先读这一页——尤其是**双线发布策略**，它决定版本号、npm tag、兼容矩阵的写法。

## 双线发布策略（最重要）

插件服务两代 DSH 宿主，按宿主代际分线，**版本大号区分**。稳定线已冻结，**当前只有预览线是活线**：

| 线 | 宿主范围 | 版本号 | npm tag | 兼容矩阵声明 |
|---|---|---|---|---|
| **稳定线**（已冻结，终版 v1.1.17） | 0.1.0-rc.8 ~ 0.1.1-rc.2 | `1.1.x` | `stable`（永久指向 v1.1.17） | rc 三件套精确 compatible + `dsh` 区间（`<0.1.2-0` 封顶） |
| **预览线**（唯一活线） | 0.1.2-alpha.1 ~ 最新预览版（当前 0.2.1-rc.2） | `1.5.x`（v1.2.0 起序列恒高于稳定线，消除版本号倒挂） | `latest` + `alpha` | `0.1.2-*` 起逐个声明 + `dsh: >=0.1.2-alpha.1` |

**标签策略：插件 `latest` 永远跟随宿主 `latest` 所在代际**（宿主 latest 现为 0.2.0 系，插件 latest 自 v1.0.26 起在预览线）。**稳定线自 2026-09-11 起冻结**：不再接收任何变更（含缺陷修复），`stable` 标签永久保留指向终版 v1.1.17——删标签会让存量用户的安装命令直接失败；正式 EOL（移除旧代际安装指引）待宿主发布首个非预发布版本时执行。冻结依据与触发条件见 [COMPATIBILITY.md](COMPATIBILITY.md)。

原则：

- **宿主兼容以实测为准**；宿主 API 随预览版迭代漂移（例：alpha.2 移除了 `settingsNamespace`），适配跟随但**不作稳定承诺**。
- 两条线的平台依赖面不同：稳定线用 `dsh-client-runtime`/`connection`，预览线用 `remote`/`store`。稳定线已冻结，**不再向其回移任何功能或修复**；差异对照仅供参考。
- **不假声明兼容**：v1.0.12~v1.0.15 曾矩阵错报导致用户宿主崩溃（issue #25），这个错误不可重犯。兼容矩阵必须与代码实际依赖一致。

## 宿主版本升级适配流程（SOP）

官方宿主出新版（正式线或预览线）时按此顺序走，全程**先验证后声明**：

1. **查证**：`npm view @deepseek-ai/dsh dist-tags`（正式/预览线当前版本）+ `gh release view dsh-v<版本> -R deepseek-ai/deepseek-harness`，逐条过 release notes 圈影响面：模块表（client-runtime 等是否还在）、Session API、UI 结构、插件加载机制。
2. **甄别代码依赖面**：`grep -rn "from '@deepseek-ai" src/ tests/` 对比 release notes 变更清单，判断零适配 / 需要改代码 / breaking。
3. **升级本机宿主**：harness 仓库 checkout 目标 tag（先 stash 未提交改动）→ `pnpm install` → headless 起服务（`pnpm dsh --profile web --port 3080 --no-open > /tmp/dsh-<版本>.log 2>&1`，日志重定向避免管道 SIGPIPE 掉服务）→ 浏览器带 token 打开，验收清单：侧边栏胶囊、仪表盘弹窗、余额行、账单数字、Console 零报错。
4. **通过后才扩兼容声明**（package.json `dshReleases` 逐版本精确 compatible）+ 同步升 devDependencies 的 `@deepseek-ai/dsh-*` pin 版本 + `pnpm install` 重锁。
5. **双线判定发版**：只有预览线变 → 只发 preview 线；只有正式线变 → 只发 stable 线；都变 → 按发布纪律配对发。验证过哪个版本才能声明哪个版本。
6. **发版即切 dist-tag**：预览线发布后 `npm dist-tag add @kenz1117/dsh-ui-usage-billing@<版本> latest alpha`；稳定线发布后切 `stable`。发完跑 `node scripts/check-compat.mjs --peer <compat package.json>` 复核双线矩阵。

## 宿主版本监控

- [watch-dsh-releases.yml](.github/workflows/watch-dsh-releases.yml) 每日 09:17（Asia/Shanghai）跑 [scripts/check-compat.mjs](scripts/check-compat.mjs)，对照 npm registry 校验双线矩阵，漂移自动开/更新 `compat-drift` issue——宿主发新版最迟 24 小时内暴露，不允许再靠用户报 issue 发现。
- 本地随时可跑同一脚本（`--peer` 指到 compat 分支的 package.json 做双线联查）；发布前后各跑一次。

## 发布纪律

- **发布只走预览线**（稳定线已冻结，不再发版）：一个发布节点 = 一次 `latest` 发布，tag 与 GitHub release 一起出，不碎片化。
- **小步快跑（2026-10 改）**：变更合并到 `main` 后**尽快发版**（目标节奏：每批功能改动 ≤ 2 周内发一个节点），不再无限期攒批——商店目录按 `pushed_at` 与版本更新做发现，长期不发版会让插件在市场页显示为「陈旧」，装机量增长被拖住（竞品 dsh-cost-meter 已迭代到 v1.9.28）。**例外**：崩溃 / 账单错误 / 安全类紧急修复走加急通道（随时发，不等节奏）。发版仍以「一批改动 = 一个节点」为单位，不碎片化。
- **攒批的边界**：只攒「同一主题、互相依赖」的改动（如一次 UI 改版的多处文件、一次兼容矩阵升级）；不同主题的功能改动**分开发**。
- GitHub release 的预发布版本按需打 **Pre-release** 标记。
- 发版前跑测试：本仓 `pnpm i && pnpm test`（main 395+）；真机验收用对应环境（见下表）。`compat/stable-dsh` 已冻结，其测试基线（337+，client 测试经 `vitest.config.ts` alias 用本地 store stub 顶替 registry 上装不到的 0.1.1 client-runtime）仅供历史查阅，不再参与发布。
- **（已停用，保留作历史教训）cherry-pick 跨线必须逐项核对三处红线**：① `package.json` 的 version（各线独立）与 `dshReleases`（绝不能被对面线的声明覆盖——稳定线=rc 三件套、预览线=alpha 系，覆盖即重演 #25）；② `lib/client.js` / `lib/index.js` 构建产物（各线独立构建，冲突取 ours 后用对应 build 重建）；③ **cherry-pick 后必跑该线测试**——此前 compat 的测试文件里残留过冲突标记与失效断言（#26/#27 移植时留下），因 compat 无测试环境长期未被发现。稳定线冻结后不再跨线移植。

## 分支与构建

- `main`：预览线开发（0.1.2 面），发布走 npm `latest` + `alpha` tag。
- `compat/stable-dsh`：稳定线（0.1.1 面，从 v1.0.11 分叉），**已冻结于终版 v1.1.17**——仅供历史查阅与存量用户安装，不再接收变更，也不再跨线 cherry-pick。
- main 构建：`./sync.sh`（含本仓自设体积防线：>256KiB 提示、>320KiB 强警告——**非上游硬约束**，DSH Store 只对图标文件设 256 KiB 上限，插件 JS bundle 无审查上限）；compat 构建：`bash build.sh`（同防线）。

## 本机测试环境（三套，端口/家目录全隔离）

| 环境 | 宿主 | 端口 | 启动 |
|---|---|---|---|
| 日常（Electron 源码启动） | 最新预览版（当前 0.2.1-rc.2，桌面 App） | 3080 | 用户手动开 Electron |
| 稳定线验收 | 0.1.1-rc.2 | 3090 | `~/dsh-legacy/start-legacy.sh`（DSH_HOME=~/.dsh-legacy） |
| 预览线验收 | 0.1.2-alpha.3 | 3091 | `DSH_HOME=~/.dsh-preview ~/dsh-preview/node_modules/.bin/dsh --profile web --port 3091 --no-open` |

发版前在对应环境的宿主上装目标版本做真机验收（curl `/api/billing/usage-stats` 看 `pluginVersion`）。**不要共用家目录**——0.1.1 与 0.1.2 宿主凭据格式互污（历史事故）。

## 本地开发模式（3080 日常环境）

3080 的插件已切换为 **pnpm link 安装**（`dsh plugin --profile web add "link:/Users/ken/dsh-ui-usage-billing"`），node_modules 里是 symlink 指向本仓，市场识别为本地开发而非线上版本。开发工作流：改代码 → `./sync.sh`（main 线）或 `bash build.sh`（compat 线）构建 lib → 重启 3080 即生效，**不需要发 npm**——npm 发布只发生在发布节点，给外部用户。

- **独立仓当前分支决定 3080 跑哪条线的代码**：main（alpha 线）匹配 alpha.5 宿主；**切到 compat 分支后开 3080 会让稳定线代码跑在预览宿主上，装载即崩**（client-runtime 不在 0.1.2 模块表）。切分支前先想清楚 3080 还开着。
- **pnpm store 版本坑**：主仓 pin pnpm 11（store v11），profile 的 node_modules 由系统 pnpm 10.15（store v10）管理。在 profile 目录用错版本跑 pnpm 后，`dsh plugin add` 会报 `ERR_PNPM_UNEXPECTED_STORE`——解法：`cd ~/.dsh/profiles/web && rm -rf node_modules && pnpm install`（回到 10.15）再 add。
- **宿主升级时同步升独立仓依赖**：devDependencies 里 pin 的 `@deepseek-ai/dsh-*` 版本要跟宿主代际一致（当前 0.2.1-rc.2；个别子包不发 rc 时用其最新版，如 dsh-invariants@0.2.0-rc.2），改完 `pnpm install` 重锁 pnpm-lock.yaml。
- **平台种子守卫（已加固）**：`scripts/check-clientbundle-sync.mjs` 对着**本仓声明的最新兼容 tag** 判定（从 `package.json` 的 `dshReleases` 取最大版本 → `dsh-v<版本>`，`git show <tag>:packages/client/web/src/platform.ts`），**不再拿宿主仓工作区 HEAD 当真相**——本机 `~/deepseek-harness` 检出过旧曾导致 `pnpm lint` 假红（宿主种子沿革：`dsh-v0.1.2-alpha.1` = 8 项 → `dsh-v0.2.0-rc.2` = 9 项 → `dsh-v0.2.1-rc.2` = 11 项；本仓 11 项，与 `origin/master` 逐项同序一致）。tag 不可得时设 `DSH_FETCH_HOST_TAG=1` 可自动补取（CI 每日任务已开），取不到则退化为参考性提示（不失败）。**判定方向**：本仓**多出**目标宿主没有的条目 = 危险（bundle 会 `require()` 到模块表应答不了的 spec → 运行时抛错）；**缺少**条目 = 需镜像（日后 import 该模块会被内联出第二份共享实例）。
- **本仓测试可独立安装运行**（`pnpm i && pnpm test`），不依赖 harness 工作区。两个已知坑：官方发布的 `@deepseek-ai/dsh-client-test-runtime` 引用了 ui-renderer 未发布的 src/ 文件（registry 安装必坏），client 测试用本仓 `tests/bind-snapshot-selector.ts` 等价替代；宿主 UI 包 lib 产物内联 `.module.css`，靠 `vitest.config.ts` 的 `server.deps.inline` 走 vite 管线，node 原生加载会报 `Unknown file extension .css`。 0.2.1 系新增两个坑（2026-10-18 升 0.2.1-rc.2 时踩）：ui-primitives 0.2.1-rc.2 引用 `@deepseek-ai/dsh-util-code-language` 但 registry 产物漏声明依赖（vite 解析失败），需手动补进本仓 devDependencies；`dsh-atomic-write` 0.2.1 起按 `kill(pid,0)` 回收死进程孤儿锁，伪造不存在的 pid 测锁竞争会被立即抢占（测试改用恒存活 pid）。

## 多会话协作纪律

- **同一时间只允许一个 AI 会话操作本仓工作区**。谁在做，其他会话等。
- 接手别人的工作区时**先盘点再动手**：`git log`（对方提交了什么）、`git status`/`git diff`（未提交改动——可能是进行中的有效工作，如 issue 修复半成品，保留并完成，不要丢弃）。已提交的工作做交叉核对（对方可能不知道双线策略，把改动落错了分支）。

## e2e（双层）

3080 dev host UI 路径走 token auth（token 每次启动轮换，Playwright 无法获取），
in-process DSH host 又不带桌面运行时（UI 组件加载不全）。双层覆盖：

**API contract**（`pnpm test:e2e`，@playwright/test 的 `request` fixture，无 browser）：
3 剧本 → 3080 9 条 HTTP 端点合同。`tests/api-contract/*.spec.ts`。

**UI 组件**（`pnpm test`，vitest + @testing-library/react + jsdom）：
3 剧本 → sidebar trigger / 6 Tab panel 切换 / 不可读会话提示。`tests/*.component.spec.tsx`。

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
- 体积红线：**DSH Store 对插件 JS bundle 无审查上限**（仅对图标文件 icon.* 设 256 KiB 上限）。`lib/client.js` 的 256 KiB / 320 KiB 两道阈值是本仓 `sync.sh` 自设的成本防线——把新增功能的体积增长暴露在每次构建，避免被用户感知到加载变慢；非上游强制。纯 CSS/文案/资产的增量也要进评估视野。
- issue 回复用中文；先诊断根因再动手，修复双线同步时在回复里写清两条线各自的版本。
- **竞品调研与改进计划**：[docs/store-benchmark-2026-10.md](docs/store-benchmark-2026-10.md)——DSH 商店「用量与计费」类目 214 个插件的横向调研（2026-10-23 快照），含差距矩阵（G1~G12）与分批执行计划。**新增功能前先查该文档**：宿主能力一律 **type-only import + `ctx.inject`/`ctx.get`**，**不得**把新的 `@deepseek-ai/*` 加进 `PLATFORM_MODULES`（会让老宿主 `require()` 到应答不了的 spec → 运行时抛错）；服务缺席即降级，不得因此收窄兼容矩阵；client bundle 是单文件 closure factory、无代码分割，新代码必须体积入账（`pnpm size` 查红线）。
- **仪表盘分区（2026-10-23）**：8 个一级分区——概览 / 账单 / 用量 / 趋势 / 上下文 / 智能体 / 费率 / 设置；**Tab 只留名称，不挂状态徽标**（信息都在各自分区内）。智能体网络树见 `src/client/domain/agent-tree.ts`（从 `parentId` 还原委派关系 + 链合计 + 环防护）。
- **面板压缩防线**：`.dashboardBody` / `.tabPanel` 是列向 flex 容器，直系子块必须 `flex-shrink: 0`（列向 flex 默认会把内容高的卡片**压扁而不是滚动**——`overflow-y:auto` 挡不住 flex 收缩；2026-10-23 用户反馈「切到上下文 Tab 卡片被缩小」即此坑）。jsdom 不做布局、无法单测覆盖，由 lint **守卫 7「面板压缩防线」**兜底。
- **体积现状**：`lib/client.js` ≈ 316 KiB，距自设强线 320 KiB 仅余 ~4 KiB——**下一批功能前必须先做结构性瘦身**（CSS 不是大头，见 docs/store-benchmark-2026-10.md §9.2b 的三个候选）。
- **已接入的宿主能力（2026-10-23，均为特性探测 + 降级）**：会话跳转（`ctx.uiWorkspace.openSession` 新代 / `ctx.sessions.open` 老代，见 `src/client/session-navigation.ts`）、`/usage` 对话内命令（`ctx.commandUi.register`，见 `src/client/usage-command.ts`）、上下文占用维度（`useProjection('contextPressure'/'contextBreakdown')`，见 `src/client/context-store.ts`）。三者取服务一律走 `ctx.get()`（免 inject）——老宿主没有这些服务，声明成注入依赖会挂起等它、卡住整个 web 启动。
- **DSH Community Market 目录（Path A）**：`catalog/catalog-source.json` + `catalog/v1/plugins.json`，由 `.github/workflows/pages.yml` 发到 GitHub Pages；本地/CI 用 `node scripts/check-catalog.mjs` 校验（strict schema：多余字段会让整个来源被市场拒收）。发布时序：**先 npm publish 精确版本，再并入 main 触发 Pages**——目录指向未发布版本时市场安装会 fail-closed（预期行为）。
