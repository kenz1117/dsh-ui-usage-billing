import { defineConfig } from 'vitest/config'

export default defineConfig({
  // 宿主 0.2.3-alpha.3 起，ui-primitives / ui-slots 的**根导出换成了 host 半边**
  // （lib/index.js 只导出 apply），客户端面挪到 `/client` 子路径——而那条子路径是
  // 浏览器 bundle（`window.__ModuleLoader__.load(...)`），node 里 require 不动。
  // 浏览器里插件 bundle 的 `require('@deepseek-ai/dsh-client-ui-primitives')` 由宿主
  // 的模块表应答（immediately row → 客户端面），**运行时不要改 specifier**：老宿主
  // 应答不了新路径（AGENTS.md「不得把新的 @deepseek-ai/* 加进 PLATFORM_MODULES」）。
  // 只有测试环境（node 解析根导出 → host 半边 → Modal/Tooltip 全是 undefined）需要
  // 指到随包发布的客户端源码面。
  resolve: {
    alias: [
      {
        find: /^@deepseek-ai\/dsh-client-ui-primitives$/,
        replacement: '@deepseek-ai/dsh-client-ui-primitives/src/client/index.ts',
      },
    ],
  },
  test: {
    // 宿主 npm 包（ui-primitives 等）的 lib 产物内部 import 了 .module.css；
    // 这些包默认被 node 原生加载器外置处理，遇到 CSS 文件会以
    // "Unknown file extension .css" 拒绝。inline 进 vite 转换管线后，
    // CSS 在 vitest 默认 css:false 下解析为空对象。
    server: {
      deps: {
        inline: [
          '@deepseek-ai/dsh-client-ui-primitives',
          '@deepseek-ai/dsh-client-ui-slots',
          '@deepseek-ai/dsh-client-ui-conversation',
        ],
      },
    },
    // API contract specs 走 @playwright/test（`pnpm test:e2e`），vitest 不跑。
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/api-contract/**'],
  },
})
