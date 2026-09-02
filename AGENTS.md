# AGENTS.md

本仓库是 DSH 插件 `@kenz1117/dsh-ui-usage-billing`（用量/费用仪表盘）。改代码前先读这一页——尤其是**双线发布策略**，它决定版本号、npm tag、兼容矩阵的写法。

## 双线发布策略（最重要）

插件同时服务两代 DSH 宿主，按宿主代际分两条发布线，**版本大号区分**：

| 线 | 宿主范围 | 版本号 | npm tag | 兼容矩阵声明 |
|---|---|---|---|---|
| **稳定线**（主战场） | 0.1.0-rc.8 ~ 0.1.1-rc.2（官方正式版） | `1.1.x` | `latest` | 旧三件套精确 compatible |
| **预览线** | 0.1.2-alpha.1 ~ alpha.3（预览版） | `1.0.x` | `alpha` | `0.1.2-alpha.*` 逐个声明 |

原则：

- **正式版宿主 100% 兼容优先**；预览宿主 API 随 alpha 迭代漂移（例：alpha.2 移除了 `settingsNamespace`），适配跟随但**不作稳定承诺**。
- 两条线的平台依赖面不同：稳定线用 `dsh-client-runtime`/`connection`，预览线用 `remote`/`store`。功能回移（backport）时先甄别是否依赖 0.1.2 专属模块面。
- **不假声明兼容**：v1.0.12~v1.0.15 曾矩阵错报导致用户宿主崩溃（issue #25），这个错误不可重犯。兼容矩阵必须与代码实际依赖一致。

## 发布纪律

- **一个发布节点 = 双线一对版本同时发**（alpha + latest 同一时间、tag 与 GitHub release 一起出），release note 用双线对照表，不碎片化。
- **攒批**：日常变更只进分支，攒到节点一起过双线；只有崩溃/账单错误/安全类紧急修复例外（也双线同步）。
- GitHub release 的 alpha 线 tag 打 **Pre-release** 标记。
- 发版前跑测试：main 线 `./sync.sh --test`（在 harness-a1 测试仓验证，注意其 vitest transform 缓存——新增导出报 `is not defined` 时先清 `node_modules/.vite`）；compat 线 `bash build.sh`（无测试环境，靠同源 cherry-pick + 真机验收）。

## 分支与构建

- `main`：预览线开发（0.1.2 面），发布走 npm `alpha` tag。
- `compat/stable-dsh`：稳定线（0.1.1 面，从 v1.0.11 分叉），发布走 npm `latest` tag。修复用 cherry-pick 同步两条线。
- main 构建：`./sync.sh`（含 256KiB Store 单文件体积门禁，>245KiB 警告）；compat 构建：`bash build.sh`（同门禁）。

## 本机测试环境（三套，端口/家目录全隔离）

| 环境 | 宿主 | 端口 | 启动 |
|---|---|---|---|
| 日常（Electron 源码启动） | 0.1.2-alpha.3 | 3080 | 用户手动开 Electron |
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

- 计费口径：历史事件一律按**事件发生时刻**生效的官方规则计价，官方调价按变更节点追加规则（见 `src/client/pricing.ts` 的时间线与 README「计费规则时间线」），不得统一套现行规则重算历史。
- 体积红线：`lib/client.js` 上限 256KiB（DSH Store 单文件契约），纯 CSS/文案/资产的增长也要过门禁评估。
- issue 回复用中文；先诊断根因再动手，修复双线同步时在回复里写清两条线各自的版本。
