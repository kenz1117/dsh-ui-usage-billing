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

## 其他约定

- 计费口径：历史事件一律按**事件发生时刻**生效的官方规则计价，官方调价按变更节点追加规则（见 `src/client/pricing.ts` 的时间线与 README「计费规则时间线」），不得统一套现行规则重算历史。
- 体积红线：`lib/client.js` 上限 256KiB（DSH Store 单文件契约），纯 CSS/文案/资产的增长也要过门禁评估。
- issue 回复用中文；先诊断根因再动手，修复双线同步时在回复里写清两条线各自的版本。
