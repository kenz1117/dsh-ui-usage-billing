# DSH 商店竞品调研与改进执行计划（2026-10）

> 本文件是 2026-10-23 对 DSH 插件商店「用量与计费」类目的调研结论 + 可执行改进计划。
> 适用范围：**仅 `main` 预览线**。`compat/stable-dsh` 稳定线已于 2026-09-11 冻结，不接收本计划内任何变更（含缺陷修复），不得跨线 cherry-pick。
> 引用纪律：本文所有结论均带可复核锚点（文件:行号 / 宿主路径 / 上游仓库）。**不假声明兼容**——未实测的宿主版本不得写进 `dsh.compatibility.dshReleases`。

---

## 0. 元信息

| 项 | 值 |
| --- | --- |
| 调研日期 | 2026-10-23 |
| 本仓基线 | `main` @ `bc3046b`，`package.json` version `1.6.8` |
| 类目口径 | `~/awesome-dsh-plugin` 的 `### Usage & Billing` 段，共 **214** 个插件 |
| 实时指标 | GitHub REST API（`gh api repos/{owner}/{repo}`），npm `downloads/point/last-month` |
| 宿主源码 | 本机 `~/deepseek-harness`（master `ab8d693603`）+ `git show dsh-v0.1.2-alpha.1` 等历史 tag |
| 数据快照性质 | Star / 下载量随时变动；本文数字为 2026-10-23 快照，复核时以现查为准 |

---

## 1. 调研结论摘要

### 1.1 类目实时排名（2026-10-23）

| 仓库 | Star | Fork | 未关 issue+PR | npm 近月下载 | 创建 |
| --- | ---: | ---: | ---: | ---: | --- |
| bowenliang123/dsh-context | 3,449 | 136 | 5 | 164,775 | 2026-08-14 |
| Han-1413141/dsh-cost-meter | 503 | 43 | 1 | 111,585 | 2026-08-13 |
| zh667/TokenLedger | 199 | 18 | 5 | 1,952 | 2026-08-14 |
| Ychris12138/dsh-usage-stats | 183 | 24 | 9 | 7,398 | 2026-08-14 |
| feibi-mochi/deepseek-harness-control-center | 75 | 7 | 12 | — | 2026-08-14 |
| **kenz1117/dsh-ui-usage-billing（本仓）** | **88** | 15 | **1** | **16,630** | 2026-08-16 |

结论：**本仓 Star 排第 5，下载量排第 3，未关 issue 数最少（1）**。装机量真实存在，缺口在「被看见」与「被点进去」，不在功能数量。

### 1.2 四种头部打法

1. **多入口中心化（dsh-context，3.4k★，有 DSH 官方员工 X 背书）**——同一份数据铺 5 个面：侧边栏一级页面「Context Insights」、会话内 Context Tab、Agent Network 的 Fleet Tab、右侧栏面板、`/context` 命令。核心差异点是**上下文维度**（占用率 / 构成 / 趋势 / 事件 / 文件活动），直接读宿主官方 `contextPressure` 投影，与输入框 context ring 数字天然一致。
2. **计费深度 + 迭代节奏（dsh-cost-meter，503★）**——170+ 模型目录、预算、峰谷（含中国法定节假日/调休）、十余家 Coding Plan 额度、官方价格同步、quota strip；已迭代至 v1.9.28。配 WhaleHarness 审计徽章 + dshfind + awesome 三重徽章。
3. **中转站归因 + CLI（TokenLedger，199★）**——按 relay 站点归组、只读回环端点、`/tokenledger site|export|diagnostics|reindex` 命令族、CSV/JSON 导出、索引健康度自查。
4. **工程化 + 市场接入（dsh-usage-stats，183★）**——可插拔适配器契约、后台自适应刷新调度、CSV 公式注入防护，并按 DSH Community Market **Path A 标准来源**接入 `catalog/catalog-source.json` → Desktop 市场一键安装。

### 1.3 本仓已领先、需守住的能力

分段计价的历史不重算 · 峰谷按通道识别（DeepSeek 分时价 / 智谱积分 5 折）· **余额差对账** · 官方 vs 中转分桶 · **子智能体费用沿父链归并到父会话** · TTFT/P50/P90 性能面板 · 110 模型 + models.dev 活价 · 按模型预算 · 半/年/年三档热力图 · CSV/JSON 导出 · 纯本地无 CDN · 双语 + 三币种独立切换。

### 1.4 一句话结论

竞品普遍停在「token × 单价」，本仓在**计费深度与可对账性**上领先；但**完全缺少「上下文 / 会话导航 / 对话内入口」三类入口型能力**，这恰是头部 star 的主要来源。补入口 → 放大装机量；先瘦身 → 才有预算做入口。

---

## 2. 本仓基线快照（2026-10-23）

| 项 | 值 | 锚点 |
| --- | --- | --- |
| 版本 / 分支 | `1.6.8` / `main` | `package.json:4` |
| 浏览器 bundle | `lib/client.js` = 308,772 B = **301.5 KiB**（过自设软线 256 KiB，距强线 320 KiB 余 18.5 KiB） | `du -h lib/client.js` |
| 服务端 bundle | `lib/index.js` = 316,056 B = 308.6 KiB | 同上 |
| 客户端主文件 | `src/client/UsageBilling.tsx` = **4,485 行 / 240.3 KiB 源码**（单体） | `wc -l` |
| 客户端样式 | `src/client/UsageBilling.module.css` ≈ 4,735 行单文件 | `docs/audit-2026-10-18.md:288` |
| 客户端目录 | `src/client/pricing.ts` 1,223 行（110 模型目录，**与服务端 `src/builtin-catalog.ts` 1,260 行双份维护**） | `wc -l` |
| 双语词典 | `src/client/locales.ts` = 39.3 KiB | `wc -l` |
| CI | Node 22/24 → `pnpm install` → `build` → `lint` → `test`；**未含体积守卫** | `.github/workflows/ci.yml` |
| 客户端 inject | `['slots', 'locale', 'remote', 'sessions']` | `src/client/apply.ts:77` |
| 已注册槽位 | `sidebar.footer.action` / `conversation.composer.dock` / `conversation.input.dock` / `conversation.input.right` | `src/client/apply.ts:93-192` |
| 本机宿主检出 | `~/deepseek-harness` master = **2026-09-24 旧快照**（落后 origin/master 2875 提交）→ 平台种子守卫本机误报，见 §3.2 | `git log -1` |
| 宿主最新发布 | `origin/master` latest tag = `dsh-v0.2.1-rc.2`（与本仓声明目标一致） | `git describe` |

---

## 3. 差距矩阵

| # | 维度 | 头部做法 | 本仓现状 | 证据锚点 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| G1 | 上下文维度 | dsh-context 直读 `contextPressure` / `contextBreakdown` 做占用率、构成、趋势 | **完全空缺**——只算钱不算「占了多少窗口」 | `packages/client/ui-conversation/src/client/skeleton/ContextMeter.tsx:1-3` | **P0** |
| G2 | 会话跳转 | dsh-context 会话卡片点击直接开 | README 自认「不可跳转」，理由是「需要宿主会话选择通道」——**但通道存在** | `README.md:279`；`packages/client/ui-workspace/src/client/navigation.ts:36` | **P0** |
| G3 | 对话内入口 | `/context`、`/tokenledger` 命令族 | 无 slash command | `packages/client/ui-commands/src/client/index.ts:37` | **P0** |
| G4 | 声明准确性 | — | README **三处**写「不注册工具」，实际 `src/index.ts:877` 注册了 `usage_stats` 动态工具（默认关） | `README.md:57` / `:113` / `:272` vs `src/index.ts:877` | **P0** |
| G5 | 体积余量 | — | 301.5 KiB / 强线 320 KiB；**单文件 closure factory 无代码分割**（`entryFileNames: 'client.js'` + CJS） | `scripts/clientBundle.ts` | **P0** |
| G6 | 体积门禁 | — | `sync.sh` 有 256/320 KiB 自设防线，**CI 未接入** | `sync.sh:134-150`；`.github/workflows/ci.yml` | **P1** |
| G7 | 市场目录接入 | dsh-usage-stats 按 Path A 提交 `catalog/catalog-source.json` + `catalog/v1/plugins.json` | 无 `catalog/` 目录 | 竞品 README | **P1** |
| G8 | Agent 网络视图 | dsh-context 专设 Fleet Tab | 父子链归并数据**已有**，只差视图 | `README.md:53` | **P1** |
| G9 | profile 覆盖 | dsh-usage-stats 支持 desktop profile | `dsh.client.platform` 仅 `web` | `package.json` `dsh.client` | **P2** |
| G10 | 生态背书 | dsh-context 有 dshfind + 员工 X 背书；dsh-cost-meter 有 WhaleHarness 审计徽章 | 有自审文档 `docs/audit-2026-10-18.md`，未挂徽章 | `docs/audit-2026-10-18.md` | **P2** |
| G11 | 发版节奏 | dsh-cost-meter 已 v1.9.28，迭代频繁 | 攒批发布，商店页长期显「陈旧」 | `AGENTS.md` 发布纪律 | **P2** |
| G12 | 诊断命令 | TokenLedger `/tokenledger diagnostics` | `relay-quotas` 端点已带 `diagnostics` 字段，未暴露为命令 | `src/routes/relay-quotas.ts` | **P2** |

### 3.1 体积口径订正（本次调研附带发现）

**事实**：DSH Store 对插件 JS bundle **无审查上限**，仅对图标文件 `icon.*` 设 256 KiB 上限。

**证据链**：
- `sync.sh:135-139` 明写「DSH Store 对插件 JS bundle 没有硬上限（plugins 通过 npm 加载，宿主只对图标文件 icon.* 设 256 KiB 上限）……不是上游强制」。
- `AGENTS.md`「体积红线」条同口径。
- `CHANGELOG.md:127`（v1.5.0，提交 `a656a0b`）已订正该认知：「DSH Store 对插件 JS bundle 无审查上限（该认知已于本版修正，256 KiB 仅限图标文件）」。
- 错误源头：`scripts/clientBundle.ts` 的注释随提交 `153c75c`（2026-08-27）引入，彼时认知有误；**v1.5.0 订正时未同步清理代码注释**。

**待清理的过期表述（4 处）**：
| 文件 | 现状表述 | 处置 |
| --- | --- | --- |
| `scripts/clientBundle.ts` | 「DSH Store 的固定 Commit 审查对运行时文件有 256 KiB 单文件硬上限」 | 改为真实口径 + 保留 minify 的真实理由（加载性能 + 本仓自设成本线） |
| `src/client/pricing.ts:372` | 「client / index 两个 face 都要过 256 KiB 单文件上限」 | 改为「本仓自设体积成本线」 |
| `src/client/UsageBilling.tsx:1703` | 「控制 bundle 体积（Store 256KiB 单文件门禁）」 | 同上 |
| `src/client/UsageBilling.module.css:2543` | 「bundle 贴着 Store 256KiB 上限」 | 同上 |

**处置原则**：`minify: true` **保留**——压缩的理由改为「浏览器加载性能 + 本仓自设成本线」，不是上游门禁。`CHANGELOG.md` 中的历史条目**不回改**（历史记录按当时认知记述）。

### 3.2 附带发现：`pnpm lint` 在本机误报「平台种子漂移」（非仓库缺陷）

调研期间执行 `pnpm lint` 发现 `check-clientbundle-sync.mjs` 退出码 1，报告本仓 11 项平台种子与宿主 9 项不一致。**逐层核实结论：本仓是对的，是本机宿主检出过时。**

| 宿主版本 | 平台种子 | 与本仓（11 项） |
| --- | --- | --- |
| `dsh-v0.1.2-alpha.1` | 8 项 | 少 3 项 |
| `dsh-v0.2.0-rc.2` | 9 项 | 少 2 项 |
| **`dsh-v0.2.1-rc.2`（本仓声明目标）** | **11 项** | ✅ **逐项同序一致** |
| `origin/master`（2026-10-17，latest tag = `dsh-v0.2.1-rc.2`） | 11 项 | ✅ **逐项同序一致** |
| 本机 `~/deepseek-harness` 工作区 master（**2026-09-24** 的旧快照，落后 origin/master 2875 个提交） | 9 项 | ❌ 误报来源 |

- 守卫脚本（`scripts/check-clientbundle-sync.mjs:35-60`）读的是宿主仓**工作区**的 `packages/client/web/src/platform.ts`——检出停在哪个 ref，就跟哪个 ref 比。本机检出过旧 → 假红。
- CI 每日任务（`watch-dsh-releases.yml:30-34`）shallow clone 的是**默认分支**，即 `origin/master` → 与本仓一致 → 步骤绿、不开漂移 issue（已核：近 5 次运行全 success，仓库无 `clientbundle-drift` issue）。
- 修复：**更新本机宿主检出**（`git -C ~/deepseek-harness pull`，或 checkout `dsh-v0.2.1-rc.2`）。**不要**因为本机误报去改本仓种子——改成 9 项会让 bundle 在 0.2.1-rc.2 宿主上 `require('zod')` 落到 loader 模块表应答不了的 spec（运行时抛错）。
- 隐患：本仓 `build` 提示「Detected dependencies in bundle: `@deepseek-ai/dsh-brand`、`@deepseek-ai/dsh-session`、`clsx`」——这两个 `@deepseek-ai/*` 走的是 `INLINE_SAFE` 白名单（wire/type 层，无共享运行时身份），合规；但**白名单命中即豁免 purity gate**，故宿主若给 `dsh-brand` / `dsh-session` 加共享运行时身份，本仓会在无告警的情况下内联出第二份实例。

> **✅ 已在本批次修复**：守卫不再拿工作区 HEAD 当真相，改为对着**本仓声明的最新兼容 tag**（`dsh-v0.2.1-rc.2`）判定——见 T-A4。假红已消除，本机 `pnpm lint` 由红转绿。

---

## 4. 执行计划

> 通用约定：所有任务在 `main` 开发 → `./sync.sh` 构建 → 3080 日常环境真机验收 → `pnpm test` + `pnpm test:e2e` → 发 npm `latest`+`alpha`。稳定线不回移。

### 批次 A —— 零风险的订正与门禁　✅ 已于 2026-10-23 完成

#### T-A1　订正体积口径的 4 处过期注释　✅ 已完成（2026-10-23）
- **目标**：消除「DSH Store 有 256 KiB 硬上限」的错误认知残留，防止后续决策被误导。
- **实际改动**：`scripts/clientBundle.ts`、`src/client/pricing.ts:372`、`src/client/UsageBilling.tsx:1703`、`src/client/UsageBilling.module.css:2543`——**只改注释，不动逻辑**。`minify: true` 保留，理由改写为「浏览器加载性能 + 本仓自设成本线」。`CHANGELOG.md` 历史条目不回改。
- **验收（已执行）**：全仓 grep「单文件上限 / 256 KiB 门禁 / Store 硬上限」仅剩本文件与 `CHANGELOG.md`（历史记录）；`pnpm run build` 通过，`lib/client.js` 体积不变（301.5 KiB）。
- **工作量**：0.2h。**依赖**：无。

#### T-A2　README 与实际行为对齐（G4）　✅ 已完成（2026-10-23）
- **目标**：DSH STORE 审查以 README 为准，「Model Experience: 无 / 不注册工具」与代码不符属**不实声明**，与 #25（兼容矩阵错报）同类。
- **实际改动**（中英双份同步，英文版同样是 DSH STORE 的审查面）：
  - `README.md` 「还有这些同类少见的细节」条 + 「隐私底线」条 → 改为「**默认零工具注入**；仅用户显式开启「注入用量查询」后注册 `usage_stats` 这一个只读工具；任何情况下不注入系统提示、不写模型可见事件」。
  - `README.md` `## 🤖 Model Experience` → 由「无」改为如实声明：默认无；开启后注册**一个**只读工具，附参数表（`today`/`month`/`session`/`all`/`bySite`/`relay`）与边界（只读本插件聚合结果、不读会话正文、不写回日志、占用每次请求上下文故默认关闭）。
  - `README.en.md` 对应三处（`:56`、`:112`、`:265-267`）同改。
- **验收（已执行）**：中英 README 表述一致且与 `src/index.ts:854-880` 的实际注册行为吻合（默认 `false`、`ctx.inject(['tools'])`、6 个 range 取值）；`pnpm lint` 通过。
- **工作量**：0.5h。**依赖**：无。
- **未做**：`docs/audit-2026-10-18.md`（2026-10-18 的审计留档）中的同口径表述**保留原样**——它是带日期的历史记录，不回改。

#### T-A3　体积守卫接进 CI（G6）　✅ 已完成（2026-10-23）
- **目标**：让体积增长在 PR 阶段暴露，而不是发布后被用户感知。
- **实际改动**：新增 `scripts/check-bundle-size.mjs`（读 `lib/client.js` 字节数，阈值与 `sync.sh` 一致：256 KiB 软 / 320 KiB 强；`lib/index.js` 只报告不设门禁）；`.github/workflows/ci.yml` 在 `pnpm run build` 之后插入「客户端 bundle 体积守卫」一步；`package.json` 新增 `pnpm size` 供本地手跑。**超软线 → 提示退出 0，超强线 → 退出 1**（失败）。脚本头部与 CI 注释都写明该线是**本仓自设成本线、非 DSH Store 审查上限**。
- **验收（已执行）**：本机 `pnpm size` → `308772 字节（301.5 KiB）`，超软线提示、退出 0（当前 301.5 KiB 距强线 320 KiB 尚有 18.5 KiB，未撞强线）；CI 新增步在 build 之后执行，产物必然存在。
- **注意**：阈值来源是**本仓自设成本线**，脚本与注释必须写明这一点，避免又写成「上游硬约束」。
- **验收**：CI 绿；人为把 `client.js` 撑大后 CI 失败（变异验证）。
- **工作量**：1h。**依赖**：T-A1。

#### T-A4　加固平台种子守卫的参照物　✅ 已完成（2026-10-23）
- **目标**：消除 §3.2 的误报模式——守卫拿「本机检出停在哪个 ref」当真相，导致假红（本次）或假绿（检出恰好匹配但宿主已变）都能发生。
- **实际改动**（`scripts/check-clientbundle-sync.mjs` 重写）：
  1. **主参照 = 本仓声明的最新兼容 tag**：从 `package.json` 的 `dsh.compatibility.dshReleases` 取最大版本 → `dsh-v<version>`，用 `git show <tag>:packages/client/web/src/platform.ts` 读出该 tag 的种子。种子必须对着**我们声称兼容的那一代宿主**校准。
  2. **tag 不可得时**：`DSH_FETCH_HOST_TAG=1` 允许脚本补取（`git fetch --depth 1 origin tag <tag>`，CI 每日任务已开启）；否则退回工作区参照并**降级为参考性提示（退出 0）**——工作区 ref 不是我们的兼容面，据此判失败只会制造假警报。
  3. **两侧来源都打印**（参照来源 / 参照种子 / 本仓种子 / 宿主 HEAD），让人一眼分清「检出过旧」与「真漂移」。

- **判定方向（复核后修正，与初稿相反）**：
  | 关系 | 含义 | 判定 |
  | --- | --- | --- |
  | 本仓 ⊋ 参照 | 我们多出目标宿主没有的条目 | **失败（危险方向）**——多出的条目一旦被 import，就是 `require()` 到目标宿主答不了的 spec → 运行时抛错 |
  | 本仓 ⊊ 参照 | 宿主种子扩张未镜像 | **失败**——日后 import 该模块会被内联，可能产生第二份共享运行时实例 |
  | 集合相同、顺序不同 | 破坏 verbatim 语义 | **失败** |
  | 完全一致 | — | 绿 |

  > 初稿曾把「超集」写为低危、「子集」写为高危，**方向是反的**：CLIENT_EXTERNALS 里的模块在浏览器端保持 `require()`（不内联），宿主模块表必须答得上——多出来的才是会炸的那一侧。已按此更正。

- **验收（已执行）**：
  - 本机权威模式：`参照 tag dsh-v0.2.1-rc.2（本仓声明的最新兼容版本 0.2.1-rc.2）` → 种子一致（11 模块）→ **退出 0**，§3.2 假红消除，`pnpm lint` 由红转绿。
  - 变异验证四用例：一致 → 0；多出条目 → 1；缺少条目 → 1；取不到 tag → 0（参考性提示）。
  - 取 tag 路径用本地假远端（clone 无 tag）验证：不设开关走工作区参照、设 `DSH_FETCH_HOST_TAG=1` 自动补取 tag 并切到权威判定，两次均退出 0。
- **依赖**：无。**注意**：改的是 `scripts/`，不涉及 `src/` → 不影响双线发布纪律。

---

### 批次 B —— 入口能力（本次调研的核心产出）　✅ B0/B1/B2/B3 已完成（2026-10-23）

> **共同红线**：三个宿主能力（`uiWorkspace` / `commandUi` / token-meter 投影）**必须运行时特性探测**，缺失即降级，**不得因此收窄兼容矩阵**（旧宿主用户已在用，不能因加功能而失效）。
> **共同打包约束**：本仓 client bundle 是**单文件 closure factory**（`scripts/clientBundle.ts` 的 `entryFileNames: 'client.js'` + CJS），宿主 loader 只认识单文件，**代码分割不可用**——`import()` 会被转成 loader 模块表无法应答的 `require()` 而运行时抛错。因此新增代码必须**体积入账**（见 T-B0）。
>
> **🚨 批次 B 最关键的一条实现约束（务必先读）**：
> 宿主服务（`uiWorkspace` / `commandUi` / token-meter 投影）**一律 `import type {}` + `ctx.inject([...])`，不得把新的 `@deepseek-ai/*` 包加进 `PLATFORM_MODULES`**。
> - type-only import 在编译期被擦除 → bundle 里**不会**出现 `require('@deepseek-ai/dsh-client-ui-workspace')` → 老宿主（模块表里没有这个 spec）完全不受影响；服务缺席时 `ctx.inject` 只是不触发，天然降级。
> - 一旦把这些包加进 `PLATFORM_MODULES`（externals），bundle 就会 `require()` 它们——而**我们声明支持的宿主代际里（0.1.2-alpha.1 ~ 0.2.1-rc.2）模块表并不都含它们** → 老宿主上运行时抛错，即 #25 同类的兼容事故。
> - 宿主自己的插件就是这么做的：`packages/client/ui-message-feedback/src/client/index.ts:12-24` 全部 `import type {}`，第 135 行 `ctx.inject(['commandUi'], …)` 取服务，**零 value import**。
> - 本仓现有做法一致（`src/client/apply.ts:16-24` 全部 type-only），保持即可。

#### T-B0　批次 B 前置：体积预算分配与瘦身　⚠ 已按实测重定范围（2026-10-23）
> **初稿的前提错了，已订正**：初稿写「客户端携带 110 模型目录、与服务端 `src/builtin-catalog.ts` 双份维护，可去重省 ~18 KiB」。**实测不成立**——目录数据本体在 `src/builtin-catalog.ts`，**只随 node 半构建**；客户端经 `/api/billing/pricing` 由宿主下发注入（`src/client/pricing.ts:632-645` 注释 + `README.md:211`）。sourcemap 逐文件统计确认 `builtin-catalog.ts` **不在 client bundle 的 sources 里**（53 个 source 全部落在 `src/client/` 与 `node_modules/`）。故「去重」项不存在。
>
> **实测构成**（源文件体积 → 产物占比）：`UsageBilling.tsx` 219 KB（41%）· `pricing.ts` 43.8 KB（纯计价逻辑，非数据）· `locales.ts` 35.2 KB · `TokenPanel` 27.8 KB · `PerfPanel` 21.4 KB · `live-cost` 20.2 KB · **压缩后 CSS 单条字面量 75.3 KiB = 产物 25%**（705 条规则、9 组 keyframes、4 个 @media、582 处令牌引用）。
>
> **结论（改动纪律）**：CSS 是最大单项，但它是**用户可见的视觉打磨**，盲删等于降品质；「拆分 `UsageBilling.tsx`」只改善可维护性、**不减体积**（单文件无代码分割）。故 T-B0 由「先做瘦身腾预算」改为**触发式**：先做功能，按实际增量再决定裁剪点。

- **目标**：为批次 B 腾出 ≥ 25 KiB 浏览器体积余量（当前余量 18.5 KiB，不够）。
- **改动候选（按性价比排序）**：
  1. **客户端 110 模型目录去重**：`src/client/pricing.ts`（1,223 行）与服务端 `src/builtin-catalog.ts`（1,260 行）双份维护。服务端已有 `/api/billing/pricing` 下发实时价目——改为**服务端下发为主、客户端仅保留极小兜底表**（或兜底表随包 JSON 懒取）。
  2. **拆分 `UsageBilling.tsx` 单体**（4,485 行）：settings / heatmap / perf / token 面板按既有 `TokenPanel.tsx` / `PerfPanel.tsx` / `heatmap.tsx` 模式拆出。**注意**：拆分只改善可维护性，不减体积（单文件无分割），但为批次 B 腾出**代码位置**并降低后续误改风险。
  3. **双语词典分层**：`src/client/locales.ts` 39.3 KiB——拆「主界面词典」（常驻）与「设置/诊断词典」（按需拉取）。
  4. **CSS 复核**：`UsageBilling.module.css` 4,735 行，清理未用规则与重复令牌。
- **验收**：`lib/client.js` ≤ 285 KiB（余量 ≥ 35 KiB）；`pnpm test` 全绿；**功能零回退**（逐项真机对照 T-A/B 前的六区仪表盘）。
- **工作量**：3~5d。**依赖**：无。**这是批次 B 的硬前置**。

#### T-B1　上下文维度接入（G1）
- **目标**：把「上下文占用了多少窗口、每次请求的成本效率」纳入仪表盘——这是 3.4k★ 竞品的核心卖点，也是本仓唯一完全空缺的战场。
- **宿主接口（已核实）**：
  - 投影键：`contextPressure`（`{ pressureTokens, projectedTokens?, contextWindow }`）、`contextBreakdown`（构成拆解）——定义在 `packages/llm/token-meter/src/usage-projection.ts:91-108`。
  - 读取方式（二选一，实现前按 T-B1.0 定夺）：
    - **路线 A（推荐）**：注册到**会话作用域槽位**，从 slot 标准 props 取 `useProjection`（`packages/client/ui-session/src/client/index.ts:169` 声明 `SessionStandardProps.useProjection`）。
    - **路线 B**：`ctx.sessions.retain/using` → `reference.projections`（`packages/api/session-controller/src/client/contract/session.ts:51-60`）。
- **实施约束**：
  - `import type {} from '@deepseek-ai/dsh-token-meter/client'` —— **必须 type-only**。client bundle purity gate（`scripts/clientBundle.ts` 的 `dsh-client-bundle-purity` 插件）会对非平台种子的 `@deepseek-ai/*` **value import 直接抛构建错误**。
  - 相应包需加入 `devDependencies`（构建期类型）+ `peerDependencies`（宿主提供运行时服务）。
  - **降级**：投影缺失时（无会话 / 旧宿主 / provider 未上报）整块隐藏，不显示 0 或占位假数据。
- **验收**：真机（3080）打开一个有上下文的会话，仪表盘「上下文」页显示占用率环 + 构成拆解 + 每请求趋势；与宿主输入框 context ring 的百分比**一致**；无上下文会话时该页整块隐藏；Console 零报错；`pnpm test` + `pnpm test:e2e` 全绿。
- **工作量**：3~4d（含 T-B1.0 路线调研 0.5d）。**依赖**：T-B0。

#### T-B1.0　（子任务）读取路径定夺 spike
- 在 3080 上分别试路线 A / B，产出 0.5 页结论：**投影值是否随会话切换自动刷新、是否需要额外 `refreshProjections`（`packages/api/session-controller/src/client/contract/sessions.ts:103`）、无会话时的行为**。结论写回本文件 §5。

#### T-B2　会话行可跳转（G2）
- **目标**：消灭 `README.md:279` 的 Known Limitations 第一条。
- **宿主接口（已核实，存在双代差异——这是本任务最大的坑）**：
  | 宿主代际 | 接口 | 证据 |
  | --- | --- | --- |
  | 0.1.2-alpha.1 ~ 0.1.6-alpha.1 | `ctx.sessions.open(sessionId)` | `git show dsh-v0.1.2-alpha.1:packages/api/session-controller/src/client/contract/sessions.ts:44` |
  | 0.1.6-alpha.2 及以后 | `ctx.uiWorkspace.openSession(target)` | `packages/client/ui-workspace/src/client/navigation.ts:36`（master 已无 `sessions.open`） |
  - **实现要求**：运行时探测双路径（`ctx.get('uiWorkspace')` 优先，回落 `ctx.sessions.open`），**两条都不可用时**降级为「仅高亮 + 复制会话 id」。
  - **失败语义**：旧宿主 `sessions.open` 注释写明「id 必须在列表中，不存在则 fail loud」——本地日志里的会话可能不在宿主列表（删过 / 别的 profile），**必须 try/catch 并给出可读提示**，不得让点击抛错。
- **验收**：真机点会话行跳到对应对话；老会话（不在宿主列表）点击有友好提示而非报错；新旧宿主各验一次。
- **工作量**：2d。**依赖**：T-B0。

#### T-B3　`/usage` 对话内入口（G3）
- **目标**：用户不离开对话就能问钱。
- **宿主接口（已核实）**：`ctx.commandUi.decorate({ name, available, ui: { kind: 'action', run } })`——官方 `/feedback` 即此模式（`packages/client/ui-message-feedback/src/client/index.ts:136`）；服务键 `commandUi`，包 `@deepseek-ai/dsh-client-ui-commands`（`packages/client/ui-commands/src/client/index.ts:37`）。
- **实施约束**：同样是 type-only import + `ctx.inject(['commandUi'])`；`available` 需判断当前是否有会话。
- **命令设计**：`/usage`（概览弹窗）、`/usage today`、`/usage sessions`、`/usage diagnostics`（对接已有 `relay-quotas` 的 `diagnostics` 字段，顺带覆盖 G12）。
- **验收**：输入 `/usage` 弹出仪表盘；无会话时提示而非报错；命令在中文/英文界面都正确。
- **工作量**：2d。**依赖**：T-B0、T-B2（诊断子项可独立）。

---

### 批次 C —— 放大装机量与生态位　✅ C1/C3/C4 已完成（2026-10-23）

#### T-C1　市场目录适配器（G7）
- **目标**：接 DSH Community Market / Desktop 市场的一键安装——把 16,630 月下载放大。
- **改动**：新增 `catalog/catalog-source.json` + `catalog/v1/plugins.json`，按 DSH Community Market **Path A 标准来源** schema（参考竞品 dsh-usage-stats 的 `catalog/` 目录）。
- **验收**：目录条目在市场可见且可从标准来源安装；npm 发布与 catalog 版本号一致（竞品的教训：市场托管安装只接受 npm registry 精确稳定版本，catalog 必须先于或同步于 npm 发布）。
- **工作量**：2~3d（含 schema 调研）。**依赖**：需先确认宿主/市场是否要求注册或审核。

#### T-C2　Agent 网络视图（G8）
- **目标**：把已有的父子链归并数据做成视图（竞品 dsh-context 有独立 Fleet Tab）。
- **改动**：`src/aggregate.ts` 的子智能体归并结果新增「网络」视图：当前智能体 → 父 → 各级子智能体，每张卡一条链合计。
- **验收**：多级委派会话在仪表盘可见完整链，链合计与胶囊总额一致（README:53 的既有口径不得回归）。
- **工作量**：2~3d。**依赖**：T-B0。

#### T-C3　生态背书与徽章（G10）
- **改动**：README 首屏加 dshfind / awesome-dsh-plugin 徽章；`docs/audit-2026-10-18.md` 结论转为可引用的审计徽章（参考 dsh-cost-meter 的 WhaleHarness audit badge）。
- **工作量**：1d。**依赖**：无。

#### T-C4　发版节奏调整（G11）
- **改动**：把「攒批」改为「小步快跑」——商店按 `pushed_at` 与版本更新做发现，长期不更新会被判为陈旧。保留崩溃 / 账单错误 / 安全类的紧急修复例外规则。
- **工作量**：流程调整，0.5d。**依赖**：无。

#### T-C5　desktop profile 评估（G9）
- **改动**：`dsh.client.platform` 增加 `desktop`；需确认桌面端槽位与宿主版本要求。
- **工作量**：1d 调研 + 实现。**依赖**：T-C1。

---

## 5. 待补结论（调研中未闭环，需在对应任务内补齐）

| 编号 | 待确认 | 闭环方式 | 归属任务 |
| --- | --- | --- | --- |
| O1 | 读取 `contextPressure` 的推荐路径（A 槽位 props / B sessions retain），以及是否需 `refreshProjections` | 3080 spike | T-B1.0 |
| O2 | `contextPressure` / `contextBreakdown` 在 0.1.2-alpha.1 宿主上的实际可用性（包已存在，但投影是否随会话上报未知） | 旧宿主真机验证 | T-B1 |
| O3 | DSH Community Market Path A schema 的准确字段与提交流程 | 读市场 adapter 指南 | T-C1 |
| O4 | 桌面端对 client 平台声明的要求 | 查 `dsh.client.platform` 语义 | T-C5 |

---

## 6. 通用工程红线（所有任务适用）

1. **双线纪律**：只在 `main` 开发与发布（npm `latest` + `alpha`）。`compat/stable-dsh` 冻结，不回移、不 cherry-pick。
2. **兼容声明**：新增宿主能力一律**特性探测 + 降级**，**不得**因此收窄或扩写 `dsh.compatibility.dshReleases`；要改矩阵必须先真机实测（AGENTS.md「宿主版本升级适配流程」SOP）。
3. **打包**：client bundle 是单文件 closure factory，**无代码分割**；任何新依赖必须内联计入体积账，且禁止 value import 非平台种子的 `@deepseek-ai/*`（purity gate 构建期报错）。
4. **体积**：真实口径为「DSH Store 无 bundle 上限」；256/500 KiB 是本仓自设成本线（2026-10-27 起），每次构建暴露增量（`sync.sh`），批次 C 起每版必须复核 `lib/client.js` 字节数并写进 CHANGELOG。
5. **计费口径**：历史事件一律按**事件发生时刻**生效的规则计价；官方调价按变更节点追加规则，**不得**用现行规则重算历史。
6. **纯 UI 边界**：不注入系统提示、不写模型可见事件；`usage_stats` 工具为**用户显式开启才注入**的可选项（见 T-A2 订正后的表述）。
7. **安全**：新增 HTTP 端点强制回环（peer socket + Host 头双校验），写操作校验 Origin / Content-Type / body 上限；CSV 导出防公式注入。
8. **验收**：改 UI 必须在**真实浏览器**逐页走查并确认 Console 零报错（不得只靠代码审查）；改 HTTP 端点路径/字段必须跑 `pnpm test:e2e`；发版前 `pnpm test`（当前 655+ 全绿基线）。
9. **文档**：改 `AGENTS.md` 后必须 `cp AGENTS.md CLAUDE.md` 再提交（DSH Store 契约禁止仓库内符号链接）。

---

## 7. 排期建议

| 批次 | 任务 | 预估 | 建议起点 | 产出 |
| --- | --- | --- | --- | --- |
| A | T-A1 / T-A2 / T-A3 / T-A4 | **已完成**（2026-10-23） | — | 口径订正 + 声明对齐 + CI 体积门禁 + 种子守卫加固；本机 lint 由红转绿 |
| B-0 | T-B0 体积瘦身 | **改为触发式** | 按需 | 实测前提有误（客户端无目录重复）；CSS 占 25% 但属视觉打磨，不盲删 |
| B-1 | T-B1 上下文维度 | **已完成**（2026-10-23） | — | 上下文占用卡（占用率 + 窗口上限 + 构成三行）；无投影整块隐藏 |
| B-2 | T-B2 会话跳转 | **已完成**（2026-10-23） | — | 双代 API 探测 + 失败可读提示；消灭 Known Limitations |
| B-3 | T-B3 `/usage` 命令 | **已完成**（2026-10-23） | — | 对话内入口，老宿主无 commandUi 时静默降级 |
| C-1 | T-C1 市场目录适配器 | **已完成**（2026-10-23） | — | Path A 双文件 + Pages workflow + 离线校验器 |
| C-3/C-4 | 生态徽章 / 发版节奏 | **已完成**（2026-10-23） | — | dshfind 徽章 + 双语市场接入段；发布改小步快跑 |
| C-2 | T-C2 Agent 网络视图 | 未做 | 下一节点 | 父子链数据已有，缺视图 |
| C-5 | T-C5 desktop profile | 未做 | 需真机 | 需 desktop profile 真机验证 |

**不建议**：与 dsh-context 正面拼「上下文全栈 + 侧边栏一级页面 + Fleet Tab 全套」（3.4k★ 且有官方背书，先发优势明显）。本仓应守「计费深度 + 可对账性 + 多厂商额度 + 性能指标」象限，把上下文作为**计费的一个新维度**接入，而非重建一个上下文产品。

---

## 8. 证据索引

**竞品**
- `bowenliang123/dsh-context` README（5 个面 / Context Insights 页 / Fleet Tab / `/context` / staff 背书 / models.dev 价与 peak×2 口径）
- `Han-1413141/dsh-cost-meter` README v1.9.28（170+ 目录 / 峰谷节假日 / 多 Coding Plan / quota strip / 徽章组合）
- `zh667/TokenLedger` README（站点归组 / `/tokenledger` 命令族 / diagnostics / 只读回环 / 导出）
- `Ychris12138/dsh-usage-stats` README 0.3.6（适配器契约 / 后台调度 / catalog Path A / 导出安全）

**宿主**
- `packages/client/ui-workspace/src/client/navigation.ts:36` —— `openSession(target: SessionTarget)`
- `packages/client/ui-commands/src/client/index.ts:37,61` —— `ctx.commandUi` 与 `ctx.inject(['slots','commandUi','sessions'])`
- `packages/client/ui-message-feedback/src/client/index.ts:135-140` —— `commandUi.decorate` 的官方用法范例
- `packages/client/ui-session/src/client/index.ts:169-178` —— `useProjection` 作为会话作用域标准 props
- `packages/api/session-controller/src/client/contract/session.ts:51-60` —— `ProjectionsFace`
- `packages/api/session-controller/src/client/contract/sessions.ts:44`（tag `dsh-v0.1.2-alpha.1`）—— 旧代 `sessions.open(id)`
- `packages/api/session-controller/src/client/contract/sessions.ts:103` —— `refreshProjections`
- `packages/llm/token-meter/src/usage-projection.ts:91-108` —— `contextPressure` 状态与 `contextBreakdown`
- `packages/client/ui-conversation/src/client/skeleton/ContextMeter.tsx:1-58` —— 宿主 context ring 读法（`useProjection('contextPressure')` + `useProjection('contextBreakdown')`）

**本仓**
- `scripts/clientBundle.ts` —— 单文件 closure factory、`minify: true`、purity gate、11 项平台种子
- `scripts/check-clientbundle-sync.mjs:35-60` —— 种子守卫读宿主仓**工作区** `platform.ts`（§3.2 误报根因）
- `sync.sh:134-150` —— 体积自设防线（口径正确）
- `src/client/apply.ts:77,93-192` —— inject 列表与已注册槽位
- `src/index.ts:854-880` —— `usage_stats` 动态工具注册（默认关）
- `src/routes/relay-quotas.ts` —— `diagnostics` 字段来源
- `README.md:36,53,57,113,270-272,279` —— 优势项、Known Limitations 与待订正表述

**宿主种子沿革**（`git show <tag>:packages/client/web/src/platform.ts`）
- `dsh-v0.1.2-alpha.1` = 8 项 · `dsh-v0.2.0-rc.2` = 9 项 · `dsh-v0.2.1-rc.2` = **11 项** · `origin/master` = **11 项**（逐项同序与本仓一致）


---

## 9. 2026-10-23 交付记录（批次 B / C）

### 9.1 已落地

| 任务 | 交付 | 关键实现点 |
| --- | --- | --- |
| T-B2 | `src/client/session-navigation.ts` + 面板会话标题改按钮 | 双代通道（新代 `ctx.uiWorkspace.openSession`、老代 `ctx.sessions.open`），运行时按新→旧探测；通道抛错如实回报不冒泡；面板给可读提示 |
| T-B3 | `src/client/usage-command.ts` | `ctx.commandUi.register({ name: 'usage', ui: { kind: 'action' } })`；取服务走 `ctx.get()`（免 inject，不卡老宿主启动）；文案取本包词典，不依赖宿主 `locale.bind`（老宿主未必有） |
| T-B1 | `src/client/context-store.ts` + 概览页「上下文占用」卡 | 投影只在**会话作用域**可读 → 由已挂在 `conversation.composer.dock` 的即时代费用条读 `useProjection('contextPressure'/'contextBreakdown')` 并转发到全局 store，弹窗订阅；无投影整块隐藏（不显示 0） |
| T-C1 | `catalog/catalog-source.json` + `catalog/v1/plugins.json` + `.github/workflows/pages.yml` + `scripts/check-catalog.mjs` | 严格 schema（多余字段会被市场整源拒收）；离线校验器含变异验证（多余字段 / endpoint 形状错 → 退出 1） |
| T-C3/C-4 | README 双语 dshfind 徽章 + 市场接入段；AGENTS.md 发布节奏改小步快跑 | 徽章端点实测可取（★88 与 GitHub 一致） |

### 9.2 验证

- `pnpm lint` 全绿（含新增的 CSS parity 490 类、令牌 parity、种子守卫）。
- `pnpm test`：**74 文件 / 754 用例全绿**（较 729 基线 +25：会话导航 5 + `/usage` 命令 2 + 会话标题 3 + 上下文 store 6 + 上下文卡 2 + 智能体树 5 + 智能体 Tab 2）。
- `pnpm size`：`lib/client.js` = **316.2 KiB**（B/C 前 301.5 KiB，累计 +14.7 KiB；距自设强线 320 KiB 余 **3.8 KiB**——见 §9.2b 的结构性瘦身候选）。
- 真机（3080 web）：插件加载正常，**Console 零 error / 零 warning**，市场目录校验器与体积守卫均按预期退出码。

### 9.2b 追加批次（2026-10-23 晚）：B1 升为一级 Tab + C2 智能体网络 + Tab 徽标移除

| 任务 | 交付 | 关键实现点 |
| --- | --- | --- |
| B1 升一级 Tab | 「上下文」成为第 2 个一级分区 | 占用率进度条 + 下一次/最近一次请求占用 + 窗口上限 + 构成拆解（系统/工具/消息，带比例条）；**无投影时显示空态说明**（不拿 0 冒充、不占位） |
| C2 智能体网络 | 「智能体」成为第 3 个一级分区 + `src/client/domain/agent-tree.ts` | 从会话行 `parentId` 还原委派树；**链合计 = 自身 + 全部后代**（回答「哪次委派最贵」）；父不在本批 → 按根处理（费用不丢）；互指父子判环按根处理（不制造渲染死循环）；根与子均按链合计倒序 |
| Tab 徽标移除 | 概览「实时」/ 账单「N 厂商」/ 用量「N」/ 费率「已同步」等状态徽标全部去掉 | 连带删除 `tabBadgeFor` / `formatTokenBadge` / `DashboardBadgeState` / `TabBadge` 类型与对应 CSS；各分区内部仍保留等价信息（费率 Tab 内有「上次同步」时间与手动同步按钮） |

**Tab 顺序（现 8 个）**：概览 / 账单 / 用量 / 趋势 / 上下文 / 智能体 / 费率 / 设置。

**体积现状（必须盯住）**：`lib/client.js` = **316.2 KiB**（本轮 +7.8 KiB），距自设强线 320 KiB 仅余 **3.8 KiB**。已验证「相邻同声明 CSS 合并」只省 ~0.35 KiB 且易破坏选择器语义（试过一次导致 CSS 解析失败，已回滚）——**CSS 不是可压缩的大头**（75.3 KiB 已占产物 24%，但它对应 490 个真实使用类）。**下一批功能前必须做结构性瘦身**，候选：
1. 把 110 模型目录/别名表彻底移到服务端（客户端只留估算器与兜底）——需先确认哪些客户端路径真的依赖内置目录；
2. 双语词典分层（主界面常驻 + 设置/诊断按需拉取）——需处理首屏语言闪烁；
3. 评估「仪表盘重度 UI 拆到第二个 npm 包」——单文件 closure factory 无代码分割，这是唯一能真正做懒加载的路子，但会改变安装形态，需先与用户确认。

### 9.2c 缺陷修复：切到「上下文」Tab 时卡片被压扁（用户反馈）

**现象**：切到上下文分区后，卡片被纵向压小。

**根因（两处，第一版只修到第二处）**：

1. **弹窗高度由内容决定**：`.dashboardModal` 与 `.dashboard` 都只写了 `max-height: min(760px, 88vh)` 而**没有 `height`** → 弹窗高度随内容收缩。切到上下文分区（只有一行空态文案）时，整个弹窗跟着变矮——用户看到的「卡片被缩小」其实是**弹窗整体变小**。
2. **列向 flex 的纵向压缩**：`.dashboardBody`（列向 flex + `overflow-y: auto`）与 `.tabPanel`（列向 flex）的直系子块默认 `flex-shrink: 1`——容器高度受限时子块被**压扁而不是让容器滚动**（`overflow-y: auto` 挡不住 flex 子项收缩）。固定高度后这条会立刻显形，故两处必须一起修。

**修复**：
```css
.dashboardModal { height: min(760px, 88vh); }  /* 固定高度：切 Tab 不改变弹窗大小 */
.dashboard       { height: 100%; min-height: 0; }
.dashboardBody   { flex: 1 1 auto; min-height: 0; }  /* 内部滚动，不外溢 */

.dashboardBody > *,
.tabPanel > * { flex-shrink: 0; }   /* 高度由内容决定，超出由 dashboardBody 滚动 */
.contextCard > *,
.agentSummary,
.agentRow { flex-shrink: 0; }         /* 卡片内部各行同样不压缩 */
```
**防线**：jsdom 不做布局、无法用单测覆盖，故新增 lint **守卫 7「面板压缩防线」**（`scripts/lint.mjs`）——删掉 `flex-shrink: 0` 即红（已变异验证）。

### 9.2d 「上下文」分区空态的成因与文案订正

**现象**：从侧边栏打开仪表盘、切到「上下文」Tab，显示「当前会话没有上下文占用数据（宿主未上报该投影）」。

**成因（不是 bug）**：宿主的 `contextPressure` / `contextBreakdown` 是**按会话分发**的投影——`useProjection` 只在**会话作用域**可读。我们的探针挂在 `conversation.composer.dock` 座位（会话作用域），因此**只有打开了某个对话时探针才在**；没打开对话 → 没有当前会话 → 没有投影 → 空态。同时宿主本身只在 provider 上报了用量之后才产出该投影。

**处置**：
1. 空态文案改为**可操作说明**（不是笼统的「宿主未上报」）：「上下文占用跟随**当前打开的对话**——请先在一个会话里打开本面板；宿主未上报该投影时同样为空。」
2. 保留「无数据整块不显示 / 不拿 0 冒充」的原则（与 README 声明一致）。
3. `docs/context-preview.html`：**有数据态的静态预览**（CSS 直接摘自构建产物，所见即真机），供设计与验收对照。

### 9.3 验证限制（如实记录）

- **内置浏览器无法驱动 DSH Web 的点击**：实测宿主自己的「设置」按钮同样点不动（对照实验），说明是 Browser 的合成点击进不了宿主的 React 事件系统，**不是本插件的缺陷**。故交互断言改在**组件层**（jsdom + testing-library）完成——这正是本仓既有的 e2e 双层设计（UI 组件层 + API 契约层）。
- 上下文维度在真机上**未能在有会话的页面实测**（会话需点击打开，落在上述限制内）；组件层已覆盖「有投影 → 出卡片」「无投影 → 整块隐藏」两条分支。
- 未做：**T-C2**（Agent 网络视图）与 **T-C5**（desktop profile）——前者是独立的 UI 大件，后者需 desktop profile 真机验证，均留到下一节点。

### 9.4 真机环境注意

- 本机 `~/deepseek-harness` 检出**过旧**（2026-09-24，落后 origin/master 2875 提交）。种子守卫已改为对着「本仓声明的 tag」判定，故不再假红；但做宿主侧改动前应先更新检出。
- 3080 web profile 的插件是 `link:` 安装（`~/.dsh/profiles/web/node_modules/@kenz1117/dsh-ui-usage-billing` → 本仓 symlink），改代码 → 重建 → 重启宿主即生效，无需发 npm。
