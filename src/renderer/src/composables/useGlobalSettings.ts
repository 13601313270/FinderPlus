import { ref } from 'vue'

/**
 * 全局设置弹窗状态（module 级单例）。
 *
 * 与 useHelpCenter / useLLMSettings 保持同一模式：状态定义在模块顶层，
 * 任何组件调用 useGlobalSettings() 拿到的都是同一套 ref。
 * 这样「顶部工具栏按钮」「系统应用菜单」「调色板齿轮按钮」三个入口
 * 都能触发同一个弹窗，并且可以指定打开时聚焦到哪个 section。
 *
 * section 类型是字符串而不是联合类型：由 SettingsDialog.vue 的 SectionKey
 * 自行校验，这里不引入 UI 层依赖，保持 composable 纯净。
 */
const visible = ref(false)
/** 调用方指定的打开后自动切换到的侧边栏 section；null 表示默认（通用） */
const targetSection = ref<string | null>(null)

/** 打开全局设置弹窗；可指定初始聚焦的侧边栏 section key */
function openSettings(section?: string): void {
  targetSection.value = section ?? null
  visible.value = true
}

/** 关闭全局设置弹窗 */
function closeSettings(): void {
  visible.value = false
}

export function useGlobalSettings() {
  return { visible, targetSection, openSettings, closeSettings }
}
