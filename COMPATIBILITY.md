# 兼容性管理（单一事实源）

本页是「插件 ↔ 宿主」兼容关系的唯一权威文档。AGENTS.md 管流程，本页管当前状态：维护哪份代码、支持哪些宿主、正式版与预览版如何使用 npm 标签。修改 `package.json` 矩阵、npm dist-tag 或 README 兼容段前后，都必须对照并同步本页。

## 当前维护模型

只维护当前宿主代际的一份 `main` 代码与一套兼容矩阵。正式版和预览版是两个发行通道，不是两套源码或两个长期开发分支。

| 通道 | 版本号 | npm 标签 | GitHub Release | 用途 |
|---|---|---|---|---|
| 正式版 | 非预发布 SemVer，如 `1.8.0` | `latest` | 正式 Release | 已完成验收的默认安装版本 |
| 预览版 | 带预发布后缀，如 `1.8.1-alpha.2` | `alpha` | Pre-release | 新功能与宿主适配的先行验证 |

当前 npm `latest` 指向 `1.8.10` 正式版——内容 = `1.8.9` 全部条目 + 预览版 `1.8.3-alpha.15` 的晋升（issue #130 侧栏 footer 同槽共存按社区约定 §25 方案 A 收成 36×36 图标钮、`order` 改 25、窄栏圆角 12px；目录扩容批 2026-11-25 补录 13 条一手厂商新模型，目录 249 → 262 条）。`alpha` 指向 `1.8.3-alpha.16`（内容 = `1.8.10` + issue #140 形态 A 两处失效的修复：邻居计数的剪枝顺序、纵向宽座豁免 + 宿主 `0.2.3-alpha.3` 兼容声明）；下一轮预览将从 `1.8.3-alpha.17` 起。历史发行脉络：`1.8.3-alpha.16`（issue #140 + 宿主漂移：形态 A 邻居计数的剪枝顺序与纵向宽座豁免；声明宿主 `0.2.3-alpha.3` 兼容，矩阵 40 → 41 项——宿主把客户端包拆成 host/client 两半，`ui-primitives`/`ui-slots` 的根导出换成 host 半边，插件运行时 specifier 不变、只有测试环境加 alias）；`1.8.9`（issue #128：声明宿主 `0.2.2-rc.4` / `0.2.2-rc.5` 兼容，兼容矩阵 36 → 38 项）；`1.8.3-alpha.14`（issue #129 宿主漂移：声明宿主 `0.2.3-alpha.1` / `0.2.3-alpha.2` 兼容，矩阵 38 → 40 项，并修两处宿主代际 breaking——①宿主 Web 路由默认改为 `auth: 'required'`，10 条 `/api/billing/*` 端点须显式声明 `auth: 'anonymous'`（否则进 handler 前即被 401/503 拒，面板静默变成一片 0）；②宿主新增「会话已读/未读」默认占用 `primary+shift+KeyU`，快捷键注册表遇默认绑定重叠直接抛错且不写入目录，故仪表盘快捷键由 `⌘⇧U` 改为 `⌘⇧D`）。后续正式版只切 `latest`，预览版只切 `alpha`，不再同时切 `latest`。历史 npm 标签与分支保持原状，但不属于现行产品线、发布指引或 CI 校验范围。

## 当前宿主兼容范围

- 插件声明范围：DSH `0.1.2-alpha.1` ~ `0.2.3-alpha.3`，即 `dsh: >=0.1.2-alpha.1`。
- `package.json` 的 `dsh.compatibility.dshReleases` 逐版本声明，当前共 41 项。
- 已核对的宿主 npm 标签：`alpha = 0.2.3-alpha.3`、`latest = 0.2.2-rc.5`、`next = 0.2.2-rc.5`。
- Node.js：`^22.19.0 || >=24.0.0`。

兼容以实际依赖与验证结果为准，不因版本号相邻就自动宣称兼容。宿主能力通过特性探测接入，缺席时按功能降级，不因此收窄整个插件的兼容矩阵。

## 用户安装指引

当前正式版建议钉精确版本：

```sh
dsh plugin --profile web add npm:@kenz1117/dsh-ui-usage-billing@1.8.10
```

默认安装也可使用：

```sh
dsh plugin --profile web add npm:@kenz1117/dsh-ui-usage-billing@latest
```

可用 `dsh --version` 或 `npm ls -g @deepseek-ai/dsh` 确认宿主版本。

## 监控与校验机制

- **校验脚本**：[scripts/check-compat.mjs](scripts/check-compat.mjs) 对照 npm registry 校验当前 `package.json` 的区间、逐版本声明与宿主 dist-tag 覆盖关系。本地运行：`node scripts/check-compat.mjs`。
- **每日监控**：[watch-dsh-releases.yml](.github/workflows/watch-dsh-releases.yml) 每天 09:17（Asia/Shanghai）运行同一脚本，发现漂移后自动创建或更新带 `compat-drift` 标签的 issue。
- **适配顺序**：查证宿主变更 → 甄别插件依赖面 → 隔离环境验收 → 扩展兼容声明并重锁依赖 → 选择预览版或正式版发布。详见 AGENTS.md。

## English summary

This repository maintains one current `main` codebase and one host compatibility matrix. Stable releases use non-prerelease SemVer, npm `latest`, and regular GitHub Releases; previews use prerelease SemVer, npm `alpha`, and GitHub Pre-releases. npm `latest` currently points to the stable `1.8.10` release: content = everything in `1.8.9` plus the promotion of preview `1.8.3-alpha.15` — issue #130, where a sidebar footer card sharing a slot with other plugins collapses to a 36×36 icon button per community convention §25 form A (`order` moved to 25, narrow-panel corner radius 12px), and the catalog expansion batch of 2026-11-25 adding 13 first-party vendor models (catalog 249 → 262 entries). `alpha` points to `1.8.3-alpha.16` (content = `1.8.10` plus the issue #140 form-A fixes — the neighbour-count pruning order and the vertical wide-seat exemption — and the host `0.2.3-alpha.3` compatibility declaration); the next preview starts at `1.8.3-alpha.17`. Release history: `1.8.3-alpha.16` (issue #140 plus host drift: the form-A neighbour-count pruning order and the vertical wide-seat exemption; host `0.2.3-alpha.3` compatibility, the matrix grew from 40 to 41 per-version declarations — the host split its client packages into host/client halves, so the root export of `ui-primitives`/`ui-slots` is now the host half; the plugin's runtime specifier is unchanged and only the test environment gains an alias); `1.8.9` (issue #128: host `0.2.2-rc.4` / `0.2.2-rc.5` compatibility — verified version by version in isolated environments, with byte-identical aggregation across host versions; the matrix grew from 36 to 38 per-version declarations); `1.8.3-alpha.14` (issue #129, host drift): host `0.2.3-alpha.1` / `0.2.3-alpha.2` compatibility — the matrix grew from 38 to 40 per-version declarations — plus two host-generation fixes: the host now defaults web routes to `auth: 'required'`, so all ten `/api/billing/*` endpoints declare `auth: 'anonymous'` (otherwise they are rejected with 401/503 before the handler runs and the dashboard silently reads as all zeros); and the host's new read/unread session command claims `primary+shift+KeyU`, so the dashboard shortcut moved from `⌘⇧U` to `⌘⇧D` (the host's shortcut registry throws on overlapping defaults and drops the command entirely). Verified on an isolated host `0.2.3-alpha.2` (port 3092): endpoints answer 200, the dashboard renders, `⌘⇧D` opens it, the `/usage` command is listed, and the usage-stats payload is field-identical to host `0.2.2-rc.5` (no billing drift). The declared host range is DSH `0.1.2-alpha.1` through `0.2.3-alpha.3`, with 41 per-version declarations. Run `node scripts/check-compat.mjs` before and after compatibility or release changes.
