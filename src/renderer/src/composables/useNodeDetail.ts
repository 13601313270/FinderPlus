import { ref } from 'vue'
import type { Component } from 'vue'
import { getNodeManifest } from '../../../main/nodePlugin'

/**
 * 节点详情弹窗的全局状态。
 *
 * 设计目标：
 * - 任何地方（NodeShell 详情按钮、节点 render.vue 自己的按钮、右键菜单项）都能调 openNodeDetail(nodeId)
 * - 弹窗壳（NodeDetailDialog.vue）挂在 App.vue 根部，跟 HelpCenter 同级，Teleport 到 body
 * - 中间栏组件按 manifest.detailPanel 异步加载——不同节点加载不同组件，弹窗壳只负责三栏布局
 * - 左 INPUT / 右 OUTPUT 是系统通用部分，弹窗壳里统一渲染，中间栏是节点自定义
 */

// —— module 级单例状态 ——
const visible = ref(false)
const loading = ref(false)
const currentNodeId = ref<string>('')
const currentComp = ref<Component | null>(null)

/**
 * 打开某个节点的详情弹窗。
 * - 找不到节点 manifest（没注册 detailPanel）时静默忽略
 * - 先异步加载 detailPanel 组件，加载完再置 visible=true（避免弹窗先出来中间是空的闪一下）
 */
async function openNodeDetail(nodeId: string): Promise<void> {
  const manifest = await getManifestForNode(nodeId)
  if (!manifest?.detailPanel) return // 没声明详情面板，静默忽略
  currentNodeId.value = nodeId
  currentComp.value = null
  loading.value = true
  try {
    const mod = await manifest.detailPanel()
    currentComp.value = mod.default
    visible.value = true
  } finally {
    loading.value = false
  }
}

function closeNodeDetail(): void {
  visible.value = false
}

/**
 * 通过 nodeId 反查 manifest。
 * 用动态 import 延迟 SceneRegistry——避免顶层 import 时 main 侧模块循环。
 * 实际上 Vite 里 ESM 循环不会崩，但动态 import 更安全也更懒。
 */
async function getManifestForNode(nodeId: string) {
  const { workspaceScene } = await import('../../../main/engine/graph/SceneRegistry')
  const node = workspaceScene.getNode(nodeId)
  if (!node) return undefined
  return getNodeManifest(node.type)
}

export function useNodeDetail() {
  return {
    visible,
    loading,
    currentNodeId,
    currentComp,
    openNodeDetail,
    closeNodeDetail
  }
}
