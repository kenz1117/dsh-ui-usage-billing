# AGENTS.md

本仓库是 DSH 插件 `@kenz1117/dsh-ui-usage-billing`（用量/费用仪表盘）。改代码前先读这一页——尤其是**双线发布策略**，它决定版本号、npm tag、兼容矩阵的写法。

## 正式版 / 预览版双线策略（最重要）

只维护**当前宿主代际的一份 `main` 代码**，正式版与预览版是两个发行通道，不是两套源码、两套兼容矩阵或两个长期开发分支：

| 通道 | 版本号 | npm tag | GitHub Release | 用途 |
|---|---|---|---|---|
| **正式版** | 非预发布 SemVer（如 `1.8.0`） | `latest` | 正式 Release | 已完成验收、面向默认安装 |
| **预览版** | 带预发布后缀（如 `1.8.1-alpha.2`） | `alpha` | Pre-release | 新功能与宿主适配的先行验证 |

当前发行状态：npm `latest` 指向 `1.8.9` 正式版（= 1.8.8 + issue #128 宿主 `0.2.2-rc.4` / `0.2.2-rc.5` 兼容声明 + 预览版 alpha.13 晋升：仪表盘快捷键、`/usage` 注册修正、汇率兜底源）；`alpha` 指向 `1.8.3-alpha.15`（issue #130：侧栏 footer 同槽共存按社区约定 §25 方案 A 收成 36×36 图标钮 + `order` 改 25 + 窄栏圆角 12px；并目录扩容批 2026-11-25 补录 13 条一手厂商新模型），下一轮预览从 `1.8.3-alpha.16` 起。后续正式版只切 `latest`，预览版只切 `alpha`，不再同时切 `latest`。兼容状态以 [COMPATIBILITY.md](COMPATIBILITY.md) 为准（当前矩阵 40 项，至宿主 `0.2.3-alpha.2`）。

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
- **内置目录扩容与调价分离（2026-10-23 纪律）**：目录扩容（补录新模型）与存量价格更正**分开发**——扩容批只加新条目、既有条目的价格一律不动，价格更正另走独立的调价节点（否则历史账单口径会被扩容顺带改写）。**价源口径**：海外厂商取 models.dev 实时目录原生 USD；国内厂商优先取官方 CN 价（models.dev 的 `-cn` 目录），该目录缺项时按 USD 价 × 汇率折算并**在条目注释里标注折算来源**。目录守卫测试（`tests/pricing.spec.ts`）锁三条不变量：目录键唯一、归一化后不互相打架（归一索引「首个命中即用」，撞车会让其中一个键永远解析不到）、别名必须指向存在的条目——**改目录先跑它**。**促销窗口必须有起点**（新增 `promo.startsAtMs`）：官方只写「自本说明发布之日起」而没给日期时，起点取该官方页面的**「最近更新时间」**——那是本仓能取证的最早时刻，**不向前追溯**（2026-11-16 补录混元 Hy4 flash 即按此取 2026-11-16 12:15:30 北京时间，折扣至 2026-11-30 12:00）。
- **缓存写入是独立计价维度（2026-11-14，issue #123）**：`cacheWriteTokens` 是 `cacheMiss` 的子集，厂商对「写入缓存」单独收费时（models.dev 原生 `cache_write`：OpenAI/Anthropic 恒为输入价 125%、百炼约 125%）按其单价计，**不得**并入普通输入价——目录 `PriceBand.cacheWrite` 缺省才按输入价（DeepSeek、月之暗面等本就不单列）。目录侧按厂商规则派生（`builtin-catalog.ts` 的 `CACHE_WRITE_FACTORS`），条目内已有官方「显式缓存创建」价（extraRows）时以官方值为准；models.dev 刷新路径只认上游声明的 `cache_write`，**不猜**。
- **上下文压缩调用计入统计（2026-11-14，issue #123）**：宿主 `compaction/summary` 事件自带 `provider`/`model`/`usage`——压缩摘要是真实的模型调用（厂商照常计费），聚合层此前只处理 `assistant/message`，压缩调用零计入（报告者实测 222 次 ≈ $25.33 漏计）。压缩事件**不进每轮明细与性能样本**（不带 turn/step），但计入总量/模型/日期/通道/峰谷各维度与角色归因（否则 byRole 合计对不上总费用）。
- 体积红线：**DSH Store 对插件 JS bundle 无审查上限**（仅对图标文件 icon.* 设 256 KiB 上限）。`lib/client.js` 的 256 KiB / 500 KiB 两道阈值是本仓 `sync.sh` 自设的成本防线——把新增功能的体积增长暴露在每次构建，避免被用户感知到加载变慢；非上游强制。纯 CSS/文案/资产的增量也要进评估视野。
- issue 回复用中文；先诊断根因再动手，涉及发布时在回复里写清正式版 / 预览版各自的版本与通道。
- **竞品调研与改进计划**：[docs/store-benchmark-2026-10.md](docs/store-benchmark-2026-10.md)——DSH 商店「用量与计费」类目 214 个插件的横向调研（2026-10-23 快照），含差距矩阵（G1~G12）与分批执行计划。**新增功能前先查该文档**：宿主能力一律 **type-only import + `ctx.inject`/`ctx.get`**，**不得**把新的 `@deepseek-ai/*` 加进 `PLATFORM_MODULES`（会让老宿主 `require()` 到应答不了的 spec → 运行时抛错）；服务缺席即降级，不得因此收窄兼容矩阵；client bundle 是单文件 closure factory、无代码分割，新代码必须体积入账（`pnpm size` 查红线）。
- **仪表盘分区（2026-10-27）**：8 个一级分区——概览 / 队列 / 账单 / 用量 / 趋势 / 智能体 / 费率 / 设置；**Tab 只留名称，不挂状态徽标**（信息都在各自分区内）。智能体网络树见 `src/client/domain/agent-tree.ts`（从 `parentId` 还原委派关系 + 链合计 + 环防护）。
- **面板压缩防线**：`.dashboardBody` / `.tabPanel` 是列向 flex 容器，直系子块必须 `flex-shrink: 0`（列向 flex 默认会把内容高的卡片**压扁而不是滚动**——`overflow-y:auto` 挡不住 flex 收缩；2026-10-23 用户反馈「切到上下文 Tab 卡片被缩小」即此坑）。jsdom 不做布局、无法单测覆盖，由 lint **守卫 7「面板压缩防线」**兜底。
- **失败必须可见（2026-11-07，issue #119）**：插件端点取数失败（会话列表读不到 / 请求被拒 / 超时 / 端点 404）**不得渲染成「用量是 0」**——降级一律带原因（`sessionListError` 随聚合文档与回落响应下发），界面显示错误态（侧栏速览红框 + 触发卡图标转红 + 仪表盘顶部提示条 + 触发卡 tooltip）。此前两条降级链路全程静默：新装用户看到一片 ¥0，分不清「今天没花钱」与「根本没读到」。**新增降级分支时同步回答：这条路径失败时用户看到什么？**
- **插件的全局样式不得外溢（2026-11-14，issue #124）**：动效压制（`关闭`/`克制`）只允许作用在**本插件自有 DOM 根容器** `.dsh-billing-root` 之内——此前把 `data-motion` 写在 `<html>` 上配通配符 `*` + `!important`，把宿主右键菜单、对话框与第三方插件的动画一起压平（报告者实测）。写 `<html>` 上的偏好属性**一律命名空间化**（`data-dsh-billing-motion` / `data-dsh-billing-density`，通用名会被别人的同名属性覆盖，谁后写谁赢）。新增自有挂载点时给根容器挂上 `BILLING_ROOT_CLASS`（`src/client/constants.ts`）；漏挂只会让该处动画不再被压制，不会外溢。由 lint **守卫 10「全局属性与动效作用域」**兜底。
- **设置清单里的名称必须可读（2026-11-16，issue #126 复访）**：设置 Tab 的「通道可见性」清单在 1.8.3-alpha.9 里挤在三列网格中，通道名被省略号截成「a...」「12...」，前缀雷同分不出是哪条中转线（报告者实测）。**名称是这类清单唯一的决策依据，截断即不可用**——清单卡要整行铺开（`grid-column: 1 / -1`），名称**可换行但不截断**（不得再声明 `text-overflow: ellipsis` / `white-space: nowrap`），金额与用量让位。jsdom 不做布局，由 lint **守卫 11「通道名可读」**兜底。
- **账本兜底行也要归一与补价（2026-11-16，issue #127）**：日志已删的会话只剩账本行，兜底分支**不得原样入档**——模型键按 `resolveCatalogKey` 归一并同键合并（模型桶 / 模型×日 / 模型×日×通道三维桶 / 订阅计数 / 性能摘要各桶一起归一，否则通道视图仍是两行同名），落盘时未收录而当前目录已收录的模型按目录价补算（**token 数账本里就有，不需要原始日志**）。此前原样入档的代价：同一批数据分裂成两行同名模型，未收录那部分恒记 ¥0（报告者实测 `cn:deepseek-v4.1-flash` 与 `flash` 两行同名 DeepSeek V4.1 Flash，≈¥32.2 整段漏计）。补价按**自然日**取峰/谷两个探针时刻混合（日志已删 → 无请求级时间戳，与客户端「目录价预估」同口径），**只补「落盘时未收录」那部分**——已计价的费用原样保留（历史事件按事件发生时刻的官方规则计价），订阅通道的调用恒免费、不在未收录集合里，不会被补价。
- **体积现状（2026-11-25）**：`lib/client.js` = 376,867 字节（368.0 KiB），自设强线 500 KiB（余量 132.0 KiB）；每次发布仍须实测并记录增量，不为压数字牺牲可靠性或引入动态执行。**目录数据只随 node 半发布**（`lib/index.js` 402,148 字节，不设门禁），不进 client bundle。
- **侧栏 footer 共存（2026-11-25，issue #130）**：宿主 `sidebar.footer.action` 是**无 wrap 的横向 flex 行**（`.footerActions{display:flex}`，无 gap/padding），本插件的宽卡 `width:100%` 会把同槽邻居推出面板右边界之外——用户看到的现象是「别的插件像没加载」（社区 issue #237）。宿主**不**向占位者暴露同槽邻居信息（owner props 只有 `{ wide }`，register 选项里也没有占用者字段），因此按社区约定 §20.4 从 DOM 反推（`src/client/footer-lane.ts`：找最近的 **flex** 祖先当「行」、展开 `display:contents` 的槽位外壳、数同排可见占位者）。**只认 flex 容器当行**——把「多子项的普通包裹层」当行会把自家元素数成邻居（jsdom 侧栏渲染里本插件与原生设置页并排即踩过这个坑）。判定 = **横向行有邻居 → 收成 36×36 图标钮**（社区 §25 方案 A；纵向栈=手机端侧栏同样收窄，因宽卡会把同列入口挤到下方）；卡片信息改由 hover 速览 + 点击仪表盘承载。`order` 由 -10 改 **25**（20–39「会话/数据/内容」档，20 已被 chat-import 占）。**不改宿主容器**（不注入 flex-wrap / flex-direction / order）。
- **目录扩容批 2026-11-25（13 条，一手厂商）**：Qwen4 Max（¥10 / ¥0.5 / ¥30，取百炼官方价目页）、GPT-6.2 Sol / Astra + GPT-6.x Healthcare ×4、Gemini 4 Neon / Hydrogen / Carbon、Claude Fable 5.2、GLM-5.3-FlashX-Legal（¥2 / ¥0.57 / ¥7，取 bigmodel「API 定价」页）、Muse Ember 1.0。**刻意不收录**：GLM-5.4（官方只挂 Coding Plan 订阅，无按量价，不猜价）、MiMo V2.6 Flash MOPD 与 Solar Pro 4 Contributor（只见于转售站，且各家价差 5 倍）。既有条目价格一律未动（扩容与调价分批）。
- **已接入的宿主能力（均为特性探测 + 降级）**：会话跳转（`ctx.uiWorkspace.openSession` 新代 / `ctx.sessions.open` 老代，见 `src/client/session-navigation.ts`）、`/usage` 对话内命令（`ctx.inject(['commandUi'])`，见 `src/client/usage-command.ts`）、仪表盘快捷键 `⌘⇧D`（`ctx.inject(['shortcuts'])`，见 `src/client/apply.ts`）、低谷任务队列（`sessionController`，见 `src/task-queue.ts`）。**取服务的两种写法各有边界**：`ctx.get()` 免 inject、立即返回（老宿主没有该服务时拿到 undefined），但**只在服务已就绪时拿得到** —— 宿主 `commandUi` 是 Service，要等 inputTriggers / remote.commands 就绪才构造，**晚于本插件 apply**，apply 期采样必为 undefined（2026-11-17 由 PR #110 暴露：命令此前从未真正注册）；这类「异步就绪」的服务必须走 `ctx.inject(['<name>'], cb)`，服务缺席则分支不执行。`ctx.inject` 只可用在**插件自己发起**的回调里，不能写进 apply 的 inject 列表——那会挂起整棵插件树、卡住 web 启动（remote.llm 的教训，issue #28）。
- **宿主 Web 路由默认要鉴权（2026-11-22，issue #129）**：宿主 `0.2.3-alpha.1` 起 Web 路由的 `auth` 默认值是 `'required'`——没通过宿主连接层鉴权的请求**在进入 handler 之前**就被拒（401/503），插件自带的守卫根本没机会跑，面板会静默变成一片 0。本插件的 10 条 `/api/billing/*` 端点一律显式声明 `auth: 'anonymous'`（`ANONYMOUS_ROUTE_AUTH`，见 `src/guard.ts`）：端点只服务本机浏览器，安全边界仍是自带的 loopback 守卫（peer 回环 + Host 字面量 + trustedHosts + Origin），宿主自己的可信主机栅栏（Host 回环/白名单 + 同源 Origin）照常生效。老宿主没有 `auth` 字段，多余字段被忽略，行为不变。**新增路由时别忘了带这个声明**（`tests/route-auth.spec.ts` 锁住）。
- **宿主快捷键默认绑定冲突会丢命令（2026-11-22，issue #129）**：宿主的快捷键注册表遇到默认绑定重叠会**直接抛错且不写入目录**——抢宿主已占用的键，我们这条命令会整个从目录里消失（用户连改绑都做不到），谁先注册还可能反过来把宿主那条顶掉。宿主 `0.2.3-alpha.1` 新增「会话已读/未读」（`session.toggleRead`），默认占用 `primary+shift+KeyU`（桌面 mac/win + Web mac/win），故仪表盘快捷键由 `⌘⇧U` 改为 **`⌘⇧D`**（宿主两代都没占的键）。**宿主新增带默认绑定的能力时，必须重挑键位**；改完跑 `tests/apply-shortcut.client.spec.tsx`。
- **DSH Community Market 目录（Path A）**：`catalog/catalog-source.json` + `catalog/v1/plugins.json`，由 `.github/workflows/pages.yml` 发到 GitHub Pages；本地/CI 用 `node scripts/check-catalog.mjs` 校验（strict schema：多余字段会让整个来源被市场拒收）。发布时序：**先 npm publish 精确版本，再并入 main 触发 Pages**——目录指向未发布版本时市场安装会 fail-closed（预期行为）。
