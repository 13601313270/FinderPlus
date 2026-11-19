import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { visualizer } from 'rollup-plugin-visualizer'
// vite-plugin-monaco-editor 是 CJS 包，ESM default import 拿到的是模块对象 { default: fn, ... }
// 所以必须取 .default 才是插件函数
import monacoEditorPluginModule from 'vite-plugin-monaco-editor'
const monacoEditorPlugin = (monacoEditorPluginModule as any).default as typeof import('vite-plugin-monaco-editor').default

const rendererSrc = resolve(__dirname, 'src/renderer/src')
const variablesFile = resolve(rendererSrc, 'assets/styles/variables.less').replace(/\\/g, '/')

/** Monaco worker 按需子集——editorWorkerService 是核心（查找/替换/IntelliSense），其余按语言选 */
const MONACO_WORKERS = ['editorWorkerService', 'json', 'html', 'css', 'typescript'] as const

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), visualizer({ filename: 'dist/stats-main.html', open: false })],
    build: {
      rollupOptions: {
        // node-llama-cpp 是原生 module，必须原样留在 node_modules 不能被 bundle
        external: (id) => id === 'node-llama-cpp' || id.startsWith('@node-llama-cpp/')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin(), visualizer({ filename: 'dist/stats-preload.html', open: false })]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': rendererSrc
      }
    },
    // renderer 是纯浏览器环境，node-llama-cpp 的依赖（ipull/chmodrp/cross-spawn 等）
    // 里有 Node-only 的 import，vite 预构建时会尝试解析它们然后报错/卡住
    // 让 renderer 跳过对这些 Node-only 生态的依赖追踪
    optimizeDeps: {
      exclude: ['node-llama-cpp', '@node-llama-cpp/*', 'ipull', 'chmodrp', 'cross-spawn', 'electron']
    },
    build: {
      rollupOptions: {
        // renderer 是纯浏览器环境，但 LLMNode/node.ts 通过动态 import 链到
        // src/main/localModels/*（有 Node-only 顶层 import）。
        // 只 external localModels 目录（main 专用的原生 LLM 引擎），
        // nodePlugin、engine 等共享代码仍正常 bundle 进 renderer。
        external: (id: string) =>
          id === 'electron' ||
          id.startsWith('electron/') ||
          id.includes('node-llama-cpp') ||
          (typeof id === 'string' && id.includes(`${resolve(__dirname, 'src/main/localModels')}`))
      }
    },
    plugins: [
      vue(),
      monacoEditorPlugin({
        languageWorkers: [...MONACO_WORKERS]
      }),
      visualizer({ filename: 'dist/stats-renderer.html', open: false })
    ],
    css: {
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
          additionalData: `@import "${variablesFile}";`
        }
      }
    }
  }
})
