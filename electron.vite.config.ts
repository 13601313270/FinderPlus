import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { visualizer } from 'rollup-plugin-visualizer'

const rendererSrc = resolve(__dirname, 'src/renderer/src')
const variablesFile = resolve(rendererSrc, 'assets/styles/variables.less').replace(/\\/g, '/')

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
    plugins: [vue(), visualizer({ filename: 'dist/stats-renderer.html', open: false })],
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