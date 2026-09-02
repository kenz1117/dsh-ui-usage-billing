import { defineConfig } from 'vitest/config'

export default defineConfig({
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
  },
})
