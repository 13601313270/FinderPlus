import { ref } from 'vue'

const STORAGE_KEY = 'canvasdesk.llm.api_key'

/**
 * LLM 全局设置 composable：
 * - apiKey 存在 localStorage，所有 LLMNode 共享一份
 * - visible 控制设置弹窗的显示/隐藏
 *
 * 设计为 module-level ref：import 即获得全局单例，
 * 不依赖组件生命周期，渲染进程任何位置都能读写。
 */

/** 全局 API Key ref；初始从 localStorage 读，空则为 '' */
const apiKey = ref<string>(localStorage.getItem(STORAGE_KEY) ?? '')

/** 设置弹窗可见性 */
const visible = ref(false)

/** 设置弹窗里临时输入的值（未保存） */
const draftKey = ref<string>('')

export function useLLMSettings() {
  /** 打开弹窗：把当前 apiKey 复制进 draft，用户改的是 draft */
  function openSettings(): void {
    draftKey.value = apiKey.value
    visible.value = true
  }

  /** 关闭弹窗（不保存） */
  function closeSettings(): void {
    visible.value = false
  }

  /** 保存：draft → apiKey → localStorage */
  function saveApiKey(): void {
    apiKey.value = draftKey.value.trim()
    if (apiKey.value) {
      localStorage.setItem(STORAGE_KEY, apiKey.value)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
    visible.value = false
  }

  /** 清除 Key（用户想换账号时用） */
  function clearApiKey(): void {
    apiKey.value = ''
    draftKey.value = ''
    localStorage.removeItem(STORAGE_KEY)
  }

  /** 当前是否已配置 Key */
  function hasKey(): boolean {
    return apiKey.value.length > 0
  }

  return { apiKey, draftKey, visible, openSettings, closeSettings, saveApiKey, clearApiKey, hasKey }
}

// —— 给引擎层（node.ts）用的静态访问器 ——
// 引擎代码里不能 import Vue 的 ref，直接 localStorage.getItem 即可；
// 但提供这个函数统一读取路径，避免 STORAGE_KEY 散落各处。
export function getStoredApiKey(): string {
  return localStorage.getItem(STORAGE_KEY) ?? ''
}
