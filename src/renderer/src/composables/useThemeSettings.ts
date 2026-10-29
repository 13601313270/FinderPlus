import { ref, watch } from 'vue'

/**
 * 主题颜色设置（module 级单例）。
 *
 * 存储：localStorage（键 canvasdesk.theme）。
 * 启动时把颜色值写入 :root 的 CSS 自定义属性，
 * 各组件通过 var(--xxx) 引用，实现动态切换。
 *
 * 目前可控的 4 个色值：
 *   canvasBg       —— 画布背景色   （原 .stage__canvas 的 background-color）
 *   canvasDot      —— 画布点点色   （原 .stage__canvas radial-gradient 的圆心色）
 *   edgeLine       —— 连线颜色     （原 @color-edge）
 *   nodeBorder     —— 节点边框颜色  （原 @node-border-color）
 */

export interface ThemeSettings {
  canvasBg: string
  canvasDot: string
  edgeLine: string
  nodeBorder: string
}

const STORAGE_KEY = 'canvasdesk.theme'

/** 默认值 = 当前代码里硬编码/less 变量的原值，保证升级用户无感知 */
const DEFAULT_THEME: ThemeSettings = {
  canvasBg: '#f6faff',
  canvasDot: '#cfd4dc',
  edgeLine: '#b6bdc8',
  nodeBorder: '#a4aab3'
}

const CSS_VARS: Record<keyof ThemeSettings, string> = {
  canvasBg: '--theme-canvas-bg',
  canvasDot: '--theme-canvas-dot',
  edgeLine: '--theme-edge-line',
  nodeBorder: '--theme-node-border'
}

/** 把主题设置写入 :root CSS 变量 */
function applyTheme(theme: ThemeSettings): void {
  const root = document.documentElement
  root.style.setProperty(CSS_VARS.canvasBg, theme.canvasBg)
  root.style.setProperty(CSS_VARS.canvasDot, theme.canvasDot)
  root.style.setProperty(CSS_VARS.edgeLine, theme.edgeLine)
  root.style.setProperty(CSS_VARS.nodeBorder, theme.nodeBorder)
}

/** 从 localStorage 读取；没有或解析失败则返回默认值 */
function loadTheme(): ThemeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_THEME }
    const parsed = JSON.parse(raw) as Partial<ThemeSettings>
    return {
      canvasBg: parsed.canvasBg || DEFAULT_THEME.canvasBg,
      canvasDot: parsed.canvasDot || DEFAULT_THEME.canvasDot,
      edgeLine: parsed.edgeLine || DEFAULT_THEME.edgeLine,
      nodeBorder: parsed.nodeBorder || DEFAULT_THEME.nodeBorder
    }
  } catch {
    return { ...DEFAULT_THEME }
  }
}

const theme = ref<ThemeSettings>(loadTheme())

// 首次启动就应用一遍
applyTheme(theme.value)

// 变化时实时写 CSS 变量 + 持久化
watch(
  theme,
  (val) => {
    applyTheme(val)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
  },
  { deep: true }
)

/** 重置为默认主题 */
function resetTheme(): void {
  theme.value = { ...DEFAULT_THEME }
}

export function useThemeSettings() {
  return { theme, resetTheme, DEFAULT_THEME }
}
