import { ref } from 'vue'
import type { Component } from 'vue'
import { nodeManifests } from '../../../main/nodePlugin'
import type { NodePluginManifest } from '../../../main/nodePlugin/manifest'

/**
 * 全局帮助中心状态（module 级单例）。
 *
 * 设计成 composable 是为了让 App.vue 挂载的 HelpCenter 组件
 * 和任何想触发它的按钮（调色板问号、顶栏帮助、后续节点级问号）
 * 共享同一份 visible / current 状态。
 *
 * 用法：
 *   const { visible, openCenter, closeCenter, selectTopic, currentComp, loading, helpTopics } = useHelpCenter()
 */

// —— 派生数据：所有注册了 help 的 manifest ——
// 这个 computed 不需要响应式，因为 nodeManifests 在编译期就定了
export const helpTopics: ReadonlyArray<{ manifest: NodePluginManifest }> = nodeManifests
  .filter((m) => m.help != null)
  .map((m) => ({ manifest: m }))

// —— module 级单例状态 ——
const visible = ref(false)
const loading = ref(false)
const currentComp = ref<Component | null>(null)
const currentType = ref<string>('')

/** 打开帮助中心（默认选中第一个 topic） */
function openCenter(): void {
  visible.value = true
  if (!currentComp.value && helpTopics.length > 0) {
    void selectTopic(helpTopics[0].manifest)
  }
}

function closeCenter(): void {
  visible.value = false
}

/**
 * 选中某个 topic，异步加载它的 help 组件。
 * 可以显式传 manifest（节点组件被问号按钮触发时用），
 * 也可以传 type（字符串），按注册表里找。
 */
async function selectTopic(target: NodePluginManifest | string): Promise<void> {
  const manifest = typeof target === 'string'
    ? helpTopics.find((t) => t.manifest.type === target)?.manifest
    : target
  if (!manifest || !manifest.help) return

  loading.value = true
  currentType.value = manifest.type
  currentComp.value = null
  try {
    const mod = await manifest.help()
    currentComp.value = mod.default
  } finally {
    loading.value = false
  }
}

export function useHelpCenter() {
  return { visible, loading, currentComp, currentType, helpTopics, openCenter, closeCenter, selectTopic }
}
