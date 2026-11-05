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
    plugins: [externalizeDepsPlugin(), visualizer({ filename: 'dist/stats-main.html', open: false })]
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