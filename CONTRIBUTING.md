# 贡献指南

欢迎 Issue 与 Pull Request。本文件说明参与方式与仓库约定。

## 环境要求

- Node.js `^22.19.0 || >=24.0.0`
- pnpm

## 常用命令

```sh
pnpm install        # 安装依赖
pnpm run bundle     # 构建 lib/index.js、lib/invariant.js、lib/client.js（tsdown）
pnpm run watch      # 监听构建
pnpm test           # vitest 全量测试（tests/ 下 31 个 spec）
```

本地真机验证可用 `./sync.sh` 把构建产物同步到本机 DSH 宿主。

## 目录结构

```
src/             服务端（宿主侧）：聚合、余额、订阅、中转站、定价、HTTP 端点
src/client/      浏览器端：仪表盘 React 组件、定价目录、i18n、样式
tests/           vitest 测试（*.spec.ts 服务端 / *.client.spec.tsx 客户端）
cordis.patch.yml DSH bundle patch 层（dsh plugin add 的安装入口）
docs/            开发模式与设计文档
```

## 提交与 PR 约定

- Commit message 使用 Conventional Commits（`feat:` / `fix:` / `docs:` / `perf:` / `test:` 等），关联 Issue 时在正文标注 `(issue #N)`。
- PR 请保持单一目的；行为变更需同步补充或更新 `tests/` 下的测试。
- 用户可见的文案与功能变更需同步更新 `README.md` 与 `README.en.md` 双语，并在 `CHANGELOG.md` 追加条目。
- 修改 `src/client/pricing.ts` 的模型目录时，`MODEL_CATALOG` 与 `MODEL_KEY_ALIASES` 需同时更新。
- 提交前请本地跑通 `pnpm run bundle && pnpm test`；CI 会在 Node 22 / 24 上重复这一验证。

## 报告问题

Issue 请尽量附带：插件版本（仪表盘 → 设置 Tab → 插件信息卡）、宿主版本、平台、复现步骤与截图。安全相关问题请私下联系作者，勿开公开 Issue。

## 发布流程（维护者）

双线发布：预览线 1.0.x（npm `alpha`，`main` 分支）面向 DSH 0.1.2-alpha；稳定线 1.1.x（npm `latest`，`compat/stable-dsh` 分支）面向 0.1.1 系宿主。修复默认先落 `main`，再 cherry-pick 回填稳定线。发布产物 `lib/*` 随固定 Commit 提交，供 DSH STORE 源码锚点审查，请勿把 `lib/` 加入忽略列表。
