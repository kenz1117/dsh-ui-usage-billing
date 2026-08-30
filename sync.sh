#!/usr/bin/env bash
# sync.sh —— 插件开发一键同步脚本
#
# 方向：独立仓（本目录，权威源码） → DSH 主仓副本（本机 3080 实例的插件加载来源）
# 动作：同步源码与配置清单到两个运行副本 → 双副本各自构建（主仓副本产本机运行
#       产物，独立仓产发布形态产物）→ 可选在 harness-a1 跑测试
#
# 用法：
#   ./sync.sh               # 同步 + 构建 + 回拷（常规流程）
#   ./sync.sh --test        # 同步 + 构建 + 回拷 + 在主仓跑插件测试
#   ./sync.sh --no-build    # 只同步源码与版本号，不构建（仅改注释/文档时用）
#
# 设计说明：
# - 两个运行副本由本脚本统一管理：
#   1) 主仓副本（deepseek-harness）：3080 实例的插件加载来源，负责构建与运行验证；
#   2) harness-a1 副本（0.1.2-alpha.1 worktree）：测试环境。主仓 master 宿主不提供
#      dsh-client-store 等 0.1.2 平台模块，client 测试只能在 0.1.2 线的 harness-a1 跑。
# - 副本保留各自的 workspace 形态 manifest（依赖 workspace:^、inject 含
#   dsh-client-runtime、无 compatibility 字段），保证宿主宽松加载；
#   本仓保留发布形态 manifest（依赖 "*"、compatibility 矩阵），仅同步 version。
# - 两仓 tsconfig 的 extends/references 形态不同（副本指向各自仓库根与包），
#   只同步随源码结构漂移的文件清单字段：host face 的 files、client face 的 include。
set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/deepseek-harness/packages/client/ui-usage-billing"
TEST_DEST="$HOME/deepseek-harness-a1/packages/client/ui-usage-billing"

# ---- 参数解析 ----
RUN_TESTS=0
NO_BUILD=0
for arg in "$@"; do
  case "$arg" in
    --test) RUN_TESTS=1 ;;
    --no-build) NO_BUILD=1 ;;
    *)
      echo "[错误] 未知参数：$arg（可用：--test、--no-build）"
      exit 1
      ;;
  esac
done

# ---- 前置检查 ----
if [ ! -f "$SRC/package.json" ]; then
  echo "[错误] 本目录缺少 package.json，请在插件独立仓根目录运行本脚本"
  exit 1
fi
if [ ! -f "$DEST/package.json" ]; then
  echo "[错误] 未找到主仓副本：${DEST}（请确认 deepseek-harness 已检出）"
  exit 1
fi

VERSION="$(node -p "require('$SRC/package.json').version")"
echo "[同步] @kenz1117/dsh-ui-usage-billing v$VERSION"
echo "  源码：$SRC"
echo "  目标：$DEST"

# ---- 1/4 同步源码（独立仓为权威，目标目录按源删增改） ----
# 主仓已升级到 0.1.2-alpha.1 源码，三份构建形态统一（同一 0.1.2 种子工厂）。
for d in "$DEST" "$TEST_DEST"; do
  if [ ! -f "$d/package.json" ]; then
    echo "[警告] 跳过不存在的副本：$d"
    continue
  fi
  rsync -a --delete "$SRC/src/" "$d/src/"
  rsync -a --delete "$SRC/tests/" "$d/tests/"
  mkdir -p "$d/scripts"
  cp "$SRC/scripts/clientBundle.ts" "$d/scripts/clientBundle.ts"
  cp "$SRC/tsdown.config.ts" "$d/tsdown.config.ts"
  cp "$SRC/cordis.patch.yml" "$d/cordis.patch.yml"
done

# ---- 2/4 同步版本号与 tsconfig 文件清单 ----
# 只动 version 字段与 files/include 清单，副本的 manifest 结构与 tsconfig
# extends/references 保持自己的 workspace 形态。
export SRC_PATH="$SRC"
export VERSION="$VERSION"

for d in "$DEST" "$TEST_DEST"; do
  if [ ! -f "$d/package.json" ]; then continue; fi
  export DEST_PATH="$d"

  node -e '
const fs = require("fs");
const p = process.env.DEST_PATH + "/package.json";
const j = JSON.parse(fs.readFileSync(p, "utf8"));
if (j.version !== process.env.VERSION) {
  j.version = process.env.VERSION;
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
  console.log("[同步] " + process.env.DEST_PATH + " 版本号 → " + process.env.VERSION);
}'

  node -e '
const fs = require("fs");
for (const face of ["host", "client"]) {
  const srcPath = process.env.SRC_PATH + "/tsconfig." + face + ".json";
  const dstPath = process.env.DEST_PATH + "/tsconfig." + face + ".json";
  const src = JSON.parse(fs.readFileSync(srcPath, "utf8"));
  const dst = JSON.parse(fs.readFileSync(dstPath, "utf8"));
  let changed = false;
  if (src.files && dst.files && JSON.stringify(src.files) !== JSON.stringify(dst.files)) {
    dst.files = src.files; changed = true;
  }
  if (src.include && dst.include && JSON.stringify(src.include) !== JSON.stringify(dst.include)) {
    dst.include = src.include; changed = true;
  }
  if (changed) {
    fs.writeFileSync(dstPath, JSON.stringify(dst, null, 2) + "\n");
    console.log("[同步] " + process.env.DEST_PATH + " tsconfig." + face + ".json 文件清单已对齐");
  }
}'
done

# ---- 3/4 构建 ----
# 三份产物形态统一（0.1.2-alpha.1 种子）：
# - 主仓副本 → Electron 宿主加载（插件 entry 经 profile patch 注册）；
# - harness-a1 副本 → 测试宿主加载（lib 由独立仓产物同步）；
# - 独立仓 → npm/GitHub 发布物。
# 主仓副本的 tsc 用 --noCheck：主仓聚合带官方 main 开发态的类型债，
# 类型把关由独立仓构建（权威环境）承担，这里只产运行产物。
if [ "$NO_BUILD" = "1" ]; then
  echo "[跳过] 构建（--no-build）"
else
  echo "[构建] 主仓副本（0.1.2 种子，Electron 宿主用）"
  cd "$DEST"
  npx tsc -b tsconfig.json --noCheck
  npx tsdown

  echo "[构建] 独立仓（0.1.2-alpha.1 种子，发布形态）"
  cd "$SRC"
  npx tsc -b tsconfig.json
  npx tsdown

  # harness-a1 副本从 0.1.2 宿主侧加载，需要 lib 产物；
  # 独立仓产物与它同形态（同一 0.1.2 种子工厂），直接同步即可。
  rsync -a --delete "$SRC/lib/" "$TEST_DEST/lib/"
  echo "[同步] harness-a1 副本 lib/ 产物已更新（宿主加载用）"
fi

# ---- 测试（可选） ----
# 测试环境用 deepseek-harness-a1（0.1.2-alpha.1 worktree）：主仓 master 宿主不提供
# dsh-client-store 等 0.1.2 平台模块，client 测试在主仓 vitest 下无法解析。
# 测试跑的是上面同步到 TEST_DEST 的物理副本（vite 对仓库外 symlink 文件会产生
# /@fs/ URL 解析问题，因此测试副本必须是真实目录，不能 symlink 回本仓）。
if [ "$RUN_TESTS" = "1" ]; then
  TEST_ROOT="$HOME/deepseek-harness-a1"
  if [ ! -x "$TEST_ROOT/node_modules/.bin/vitest" ]; then
    echo "[错误] 未找到测试环境：$TEST_ROOT/node_modules/.bin/vitest"
    exit 1
  fi
  echo "[测试] 在 harness-a1（0.1.2 测试环境）运行插件测试"
  cd "$TEST_ROOT"
  npx vitest run packages/client/ui-usage-billing/tests
fi

echo ""
echo "[成功] 同步完成：主仓副本已更新到 v$VERSION"
echo "[提示] 需重启 3080 实例加载新产物：终止旧进程后重新启动 DSH，"
echo "       然后在账单面板确认插件版本为 v${VERSION}。"
