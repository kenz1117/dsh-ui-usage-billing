# AGENTS.md

本仓库是 DSH 插件 `@kenz1117/dsh-ui-usage-billing`（用量/费用仪表盘）。改代码前先读这一页——尤其是**双线发布策略**，它决定版本号、npm tag、兼容矩阵的写法。

## 双线发布策略（最重要）

插件同时服务两代 DSH 宿主，按宿主代际分两条发布线，**版本大号区分**：

| 线 | 宿主范围 | 版本号 | npm tag | 兼容矩阵声明 |
|---|---|---|---|---|
| **稳定线**（主战场） | 0.1.0-rc.8 ~ 0.1.1-rc.2（官方正式版） | `1.1.x` | `latest` | 旧三件套精确 compatible |
| **预览线** | 0.1.2-alpha.1 ~ 最新预览版（当前 alpha.5） | `1.0.x` | `alpha` | `0.1.2-alpha.*` 逐个声明 |

原则：

- **正式版宿主 100% 兼容优先**；预览宿主 API 随 alpha 迭代漂移（例：alpha.2 移除了 `settingsNamespace`），适配跟随但**不作稳定承诺**。
- 两条线的平台依赖面不同：稳定线用 `dsh-client-runtime`/`connection`，预览线用 `remote`/`store`。功能回移（backport）时先甄别是否依赖 0.1.2 专属模块面。
- **不假声明兼容**：v1.0.12~v1.0.15 曾矩阵错报导致用户宿主崩溃（issue #25），这个错误不可重犯。兼容矩阵必须与代码实际依赖一致。

## 宿主版本升级适配流程（SOP）

官方宿主出新版（正式线或预览线）时按此顺序走，全程**先验证后声明**：

1. **查证**：`npm view @deepseek-ai/dsh dist-tags`（正式/预览线当前版本）+ `gh release view dsh-v<版本> -R deepseek-ai/deepseek-harness`，逐条过 release notes 圈影响面：模块表（client-runtime 等是否还在）、Session API、UI 结构、插件加载机制。
2. **甄别代码依赖面**：`grep -rn "from '@deepseek-ai" src/ tests/` 对比 release notes 变更清单，判断零适配 / 需要改代码 / breaking。
3. **升级本机宿主**：harness 仓库 checkout 目标 tag（先 stash 未提交改动）→ `pnpm install` → headless 起服务（`pnpm dsh --profile web --port 3080 --no-open > /tmp/dsh-<版本>.log 2>&1`，日志重定向避免管道 SIGPIPE 掉服务）→ 浏览器带 token 打开，验收清单：侧边栏胶囊、仪表盘弹窗、余额行、账单数字、Console 零报错。
4. **通过后才扩兼容声明**（package.json `dshReleases` 逐版本精确 compatible）+ 同步升 devDependencies 的 `@deepseek-ai/dsh-*` pin 版本 + `pnpm install` 重锁。
5. **双线判定发版**：只有预览线变 → 只发 preview 线；只有正式线变 → 只发 stable 线；都变 → 按发布纪律配对发。验证过哪个版本才能声明哪个版本。

## 发布纪律

- **一个发布节点 = 双线一对版本同时发**（alpha + latest 同一时间、tag 与 GitHub release 一起出），release note 用双线对照表，不碎片化。
- **攒批**：日常变更只进分支，攒到节点一起过双线；只有崩溃/账单错误/安全类紧急修复例外（也双线同步）。
- GitHub release 的 alpha 线 tag 打 **Pre-release** 标记。
- 发版前跑测试：本仓 `pnpm i && pnpm test`（两条分支都可独立跑：main 331+，compat 310+；compat 的 client 测试经 `vitest.config.ts` alias 用本地 store stub 顶替 registry 上装不到的 0.1.1 client-runtime）；真机验收用对应环境（见下表）。compat 线 cherry-pick 后跑 `pnpm test` + `bash build.sh` + 3090 验收。
- **cherry-pick 跨线必须逐项核对三处红线**：① `package.json` 的 version（各线独立）与 `dshReleases`（绝不能被对面线的声明覆盖——稳定线=rc 三件套、预览线=alpha 系，覆盖即重演 #25）；② `lib/client.js` / `lib/index.js` 构建产物（各线独立构建，冲突取 ours 后用对应 build 重建）；③ **cherry-pick 后必跑该线测试**——此前 compat 的测试文件里残留过冲突标记与失效断言（#26/#27 移植时留下），因 compat 无测试环境长期未被发现。

## 分支与构建

- `main`：预览线开发（0.1.2 面），发布走 npm `alpha` tag。
- `compat/stable-dsh`：稳定线（0.1.1 面，从 v1.0.11 分叉），发布走 npm `latest` tag。修复用 cherry-pick 同步两条线。
- main 构建：`./sync.sh`（含 256KiB Store 单文件体积门禁，>245KiB 警告）；compat 构建：`bash build.sh`（同门禁）。

## 本机测试环境（三套，端口/家目录全隔离）

| 环境 | 宿主 | 端口 | 启动 |
|---|---|---|---|
| 日常（Electron 源码启动） | 最新预览版（当前 0.1.2-alpha.5） | 3080 | 用户手动开 Electron |
| 稳定线验收 | 0.1.1-rc.2 | 3090 | `~/dsh-legacy/start-legacy.sh`（DSH_HOME=~/.dsh-legacy） |
| 预览线验收 | 0.1.2-alpha.3 | 3091 | `DSH_HOME=~/.dsh-preview ~/dsh-preview/node_modules/.bin/dsh --profile web --port 3091 --no-open` |

发版前在对应环境的宿主上装目标版本做真机验收（curl `/api/billing/usage-stats` 看 `pluginVersion`）。**不要共用家目录**——0.1.1 与 0.1.2 宿主凭据格式互污（历史事故）。

## 本地开发模式（3080 日常环境）

3080 的插件已切换为 **pnpm link 安装**（`dsh plugin --profile web add "link:/Users/ken/dsh-ui-usage-billing"`），node_modules 里是 symlink 指向本仓，市场识别为本地开发而非线上版本。开发工作流：改代码 → `./sync.sh`（main 线）或 `bash build.sh`（compat 线）构建 lib → 重启 3080 即生效，**不需要发 npm**——npm 发布只发生在发布节点，给外部用户。

- **独立仓当前分支决定 3080 跑哪条线的代码**：main（alpha 线）匹配 alpha.5 宿主；**切到 compat 分支后开 3080 会让稳定线代码跑在预览宿主上，装载即崩**（client-runtime 不在 0.1.2 模块表）。切分支前先想清楚 3080 还开着。
- **pnpm store 版本坑**：主仓 pin pnpm 11（store v11），profile 的 node_modules 由系统 pnpm 10.15（store v10）管理。在 profile 目录用错版本跑 pnpm 后，`dsh plugin add` 会报 `ERR_PNPM_UNEXPECTED_STORE`——解法：`cd ~/.dsh/profiles/web && rm -rf node_modules && pnpm install`（回到 10.15）再 add。
- **宿主升级时同步升独立仓依赖**：devDependencies 里 pin 的 `@deepseek-ai/dsh-*` 版本要跟宿主代际一致（当前 0.1.2-alpha.5），改完 `pnpm install` 重锁 pnpm-lock.yaml。
- **本仓测试可独立安装运行**（`pnpm i && pnpm test`），不依赖 harness 工作区。两个已知坑：官方发布的 `@deepseek-ai/dsh-client-test-runtime` 引用了 ui-renderer 未发布的 src/ 文件（registry 安装必坏），client 测试用本仓 `tests/bind-snapshot-selector.ts` 等价替代；宿主 UI 包 lib 产物内联 `.module.css`，靠 `vitest.config.ts` 的 `server.deps.inline` 走 vite 管线，node 原生加载会报 `Unknown file extension .css`。

## 多会话协作纪律

- **同一时间只允许一个 AI 会话操作本仓工作区**。谁在做，其他会话等。
- 接手别人的工作区时**先盘点再动手**：`git log`（对方提交了什么）、`git status`/`git diff`（未提交改动——可能是进行中的有效工作，如 issue 修复半成品，保留并完成，不要丢弃）。已提交的工作做交叉核对（对方可能不知道双线策略，把改动落错了分支）。

## 其他约定

- `CLAUDE.md` 是 `AGENTS.md` 的**普通文件拷贝**（DSH Store 契约禁止仓库内符号链接，symlink 会导致收录暂缓）；改 `AGENTS.md` 后必须同步 `cp AGENTS.md CLAUDE.md` 再提交。

- 计费口径：历史事件一律按**事件发生时刻**生效的官方规则计价，官方调价按变更节点追加规则（见 `src/client/pricing.ts` 的时间线与 README「计费规则时间线」），不得统一套现行规则重算历史。
- 体积红线：`lib/client.js` 上限 256KiB（DSH Store 单文件契约），纯 CSS/文案/资产的增长也要过门禁评估。
- issue 回复用中文；先诊断根因再动手，修复双线同步时在回复里写清两条线各自的版本。
