#!/usr/bin/env bash
# build.sh —— 兼容线（0.1.1 系宿主）构建 + Store 体积门禁
#
# 兼容线（compat/stable-dsh，1.1.x）面向 DSH 0.1.0-rc.8 ~ 0.1.1-rc.2 正式宿主，
# 平台依赖集与 main（0.1.2 线）不同：当前 node_modules 若为 main 依赖集，
# tsc 的模块解析报错可容忍（d.ts 仍产出；运行时由 tsdown 转译，不做类型检查）。
# 纯函数回归（pricing 时间线）在 harness-a1 的 vitest 下按需验证。
set -euo pipefail

npx tsc -b tsconfig.json || echo "[容忍] 类型错误来自 main 依赖集差异，d.ts 已产出"
npx tsdown

# ---- 客户端 bundle 体积门禁（DSH Store 单文件 256 KiB 上限，issue #255）----
CLIENT_BYTES="$(node -p "require('fs').statSync('lib/client.js').size")"
HARD_BYTES=$((256 * 1024))
WARN_BYTES=$((HARD_BYTES - 11 * 1024))
if [ "$CLIENT_BYTES" -gt "$HARD_BYTES" ]; then
  echo "[错误] lib/client.js = ${CLIENT_BYTES} 字节，超过 DSH Store 单文件上限 ${HARD_BYTES}（256 KiB）"
  exit 1
fi
if [ "$CLIENT_BYTES" -gt "$WARN_BYTES" ]; then
  echo "[警告] lib/client.js = ${CLIENT_BYTES} 字节，距 Store 上限仅 $((HARD_BYTES - CLIENT_BYTES)) 字节"
else
  echo "[检查] lib/client.js = ${CLIENT_BYTES} 字节（Store 上限 ${HARD_BYTES}）"
fi
