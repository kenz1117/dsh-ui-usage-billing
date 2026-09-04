import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // 稳定线代码 import 的宿主运行时在 registry 上不可独立安装（其依赖的
      // dsh-typert-registry 版本区间无匹配发布）；client 渲染测试的 store 全部
      // 由 props 注入，这里以形状兼容的本地替身顶替，构建产物不受影响。
      '@deepseek-ai/dsh-client-runtime/client': fileURLToPath(new URL('./tests/stubs/client-runtime-client.ts', import.meta.url)),
    },
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
  },
})
