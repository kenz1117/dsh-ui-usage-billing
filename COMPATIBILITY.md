# 兼容性管理（单一事实源）

本页是「插件 ↔ 宿主」兼容关系的唯一权威文档。AGENTS.md 管流程，本页管当前状态：维护哪份代码、支持哪些宿主、正式版与预览版如何使用 npm 标签。修改 `package.json` 矩阵、npm dist-tag 或 README 兼容段前后，都必须对照并同步本页。

## 当前维护模型

只维护当前宿主代际的一份 `main` 代码与一套兼容矩阵。正式版和预览版是两个发行通道，不是两套源码或两个长期开发分支。

| 通道 | 版本号 | npm 标签 | GitHub Release | 用途 |
|---|---|---|---|---|
| 正式版 | 非预发布 SemVer，如 `1.8.0` | `latest` | 正式 Release | 已完成验收的默认安装版本 |
| 预览版 | 带预发布后缀，如 `1.8.1-alpha.2` | `alpha` | Pre-release | 新功能与宿主适配的先行验证 |

当前 npm `latest` 指向 `1.8.0` 正式版，`alpha` 指向 `1.8.1-alpha.2` 预览版。后续正式版只切 `latest`，预览版只切 `alpha`，不再同时切 `latest`。历史 npm 标签与分支保持原状，但不属于现行产品线、安装指引或 CI 校验范围。

## 当前宿主兼容范围

- 插件声明范围：DSH `0.1.2-alpha.1` ~ `0.2.2-alpha.2`，即 `dsh: >=0.1.2-alpha.1`。
- `package.json` 的 `dsh.compatibility.dshReleases` 逐版本声明，当前共 31 项。
- 已核对的宿主 npm 标签：`alpha = 0.2.2-alpha.2`、`latest = 0.2.1-rc.2`、`next = 0.2.1-rc.4`。
- Node.js：`^22.19.0 || >=24.0.0`。

兼容以实际依赖与验证结果为准，不因版本号相邻就自动宣称兼容。宿主能力通过特性探测接入，缺席时按功能降级，不因此收窄整个插件的兼容矩阵。

## 用户安装指引

当前正式版建议钉精确版本：

```sh
dsh plugin --profile web add npm:@kenz1117/dsh-ui-usage-billing@1.8.0
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

This repository maintains one current `main` codebase and one host compatibility matrix. Stable releases use non-prerelease SemVer, npm `latest`, and regular GitHub Releases; previews use prerelease SemVer, npm `alpha`, and GitHub Pre-releases. npm `latest` currently points to the stable `1.8.0` release, while `alpha` points to `1.8.1-alpha.2`. The declared host range is DSH `0.1.2-alpha.1` through `0.2.2-alpha.2`, with 31 per-version declarations. Run `node scripts/check-compat.mjs` before and after compatibility or release changes.
