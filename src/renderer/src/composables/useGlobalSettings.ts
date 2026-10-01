import { ref } from 'vue'

/**
 * 全局设置弹窗状态（module 级单例）。
 *
 * 与 useHelpCenter / useLLMSettings 保持同一模式：状态定义在模块顶层，
 * 任何组件调用 useGlobalSettings() 拿到的都是同一套 ref。
 * 这样「顶部工具栏按钮」和「系统应用菜单」两个入口都能触发同一个弹窗。
 *
 * 目前只搭机制，具体设置项后续往 SettingsDialog.vue 里加。
 */
const visible = ref(false)

/** 打开全局设置弹窗 */
function openSettings(): void {
  visible.value = true
}

/** 关闭全局设置弹窗 */
function closeSettings(): void {
  visible.value = false
}

export function useGlobalSettings() {
  return { visible, openSettings, closeSettings }
}