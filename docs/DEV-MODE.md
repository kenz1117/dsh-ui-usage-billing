# 开发模式下插件的加载来源（dev 调试链路）

> 本文回答一个反复被问的问题：**开发模式下，`dsh` 到底从哪加载 `dsh-ui-usage-billing`？** 读完后新对话/新开发者可照着「开发闭环」直接操作，不用再摸索。

## 一句话结论

`dsh --profile web` 实际加载的是**深seek-harness monorepo 沙箱里的「已构建产物 `lib/`」**（`lib/index.js` + `lib/client.js`），**不是独立仓库，也不读 `src/`**。

因此：**改 `src/` 后必须「构建 + 重启」，否则界面无变化。**

## 加载链路图

```
① 你改代码的位置         /Users/ken/dsh-ui-usage-billing/src/*          ← 独立仓库 = 权威源码 + 发布源
        │  rsync（手动，只搬 src/）
        ▼
② 构建沙箱               /Users/ken/deepseek-harness/packages/client/ui-usage-billing/src/*
        │  在此目录跑  pnpm exec tsc -b && pnpm run bundle  → 生成 lib/*
        ▼
③ dsh 运行时实际 import   沙箱包的 lib/index.js（node 半） + lib/client.js（浏览器半）
        ▲
        │  由 dsh --profile web 触达
        ▼
④ 注入点（为什么 dev 就有它） packages/bundle/web-app/cordis.patch.yml 第 280-282 行
        - id: ui-usage-billing
          name: '@kenz1117/dsh-ui-usage-billing'
```

## 注入点与解析机制

- `dsh --profile web` → profile 模板 bundles = `['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app']`（见 `deepseek-harness/packages/boot/app-boot/src/profile.ts` 的 `PROFILE_TEMPLATES`）。
- `dsh-web-app` 这个 bundle 的 `cordis.patch.yml`（`deepseek-harness/packages/bundle/web-app/cordis.patch.yml`）里**插了 `ui-usage-billing` 那一行**，所以 `web` profile 天生带它，**不需要**单独 `dsh plugin add`。
- 该 bundle 通过 `workspace:^` 依赖 `@kenz1117/dsh-ui-usage-billing`，pnpm 把它 symlink 到沙箱目录；包名被 Loader 按 Node 解析 → `exports["."]` → `lib/index.js`。

**另一条备用注入点**：该包自身也声明了 `dsh.bundle.patch`（`packages/client/ui-usage-billing/cordis.patch.yml`），可被 `dsh plugin add @kenz1117/dsh-ui-usage-billing` 单独装上；dev 的 `.dsh-dev` / `.dsh-local` 未启用，仅 web-app patch 在生效。

## 为什么「构建 + 重启」才生效

- 深seek-harness 的 `tsconfig.base.json` 的 `paths` 只映射 `@deepseek-ai/dsh-*` 到 `src/`，**没有 `@kenz1117/*` 的 src 映射**。所以即使 dev 用 `node --import tsx/esm` 启动，这个包也**永远加载 `lib/`（构建产物），不读 `src/`**。
- 因此只改 `src/`、不 build + 不重启 = 界面没变化（`deepseek-harness/packages/client/AGENTS.md` 明确写着「registry 服务的是 `lib/client.js`，不是源码」）。

## 两处仓库的职责

| 位置 | 角色 | 是否进 git |
|------|------|:--:|
| 独立仓库 `kenz1117/dsh-ui-usage-billing` | 权威源码 + npm 发布源 + git 提交 | 是 |
| 沙箱 `deepseek-harness/packages/client/ui-usage-billing` | 仅本地构建沙箱，生成调试用 `lib/` | 从不提交（用完即弃） |

两者**无自动同步，是手动单向 rsync**。提交 / 发布一律以独立仓库为准。

## 开发闭环（可直接复制）

```bash
# 1. 独立仓库改完 src/ 后，把 src/ 搬进沙箱
rsync -a /Users/ken/dsh-ui-usage-billing/src/ \
  /Users/ken/deepseek-harness/packages/client/ui-usage-billing/src/

# 2. 在沙箱构建（生成 lib/）
cd /Users/ken/deepseek-harness/packages/client/ui-usage-billing
pnpm exec tsc -b && pnpm run bundle

# 3. 跑该包测试
cd /Users/ken/deepseek-harness
pnpm exec vitest run packages/client/ui-usage-billing/tests

# 4. 重启 dsh（本机固定用 3080 端口）
lsof -ti :3080 | xargs kill
cd /Users/ken/deepseek-harness
pnpm dsh --profile web --port 3080
```

## 注意点

- **沙箱的 `package.json` 版本可能落后**（只 rsync `src/`，不同步 `package.json`；沙箱里可能还停着旧版本号）。这不影响构建，也**不影响发布**（npm 用独立仓库的版本号）；仅涉及版本相关行为时才需补同步。
- **构建产生的沙箱 `lib/` 要记得 rsync 回独立仓库**，否则独立仓库的 `lib/` 落后于源码。
- 独立仓库 `src` 与沙箱 `src` 需保持一致，否则构建产物对不上你改的代码。

## 发布链（以独立仓库为准）

```bash
# 独立仓库内操作
git add ... && git commit -m "release: 1.0.x ..."
git push origin main && git tag v1.0.x && git push origin v1.0.x
gh release create v1.0.x ...

# npm 发布：官方源 + 本机代理（127.0.0.1:7897）+ .npmrc 里的官方 token
HTTPS_PROXY=http://127.0.0.1:7897 HTTP_PROXY=http://127.0.0.1:7897 \
  npm publish --registry=https://registry.npmjs.org/ --access public
```
