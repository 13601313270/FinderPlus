<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Node } from '../../main/engine/node/Node'
import { workspaceScene } from '../../main/engine/graph/SceneRegistry'
import { manifestFor, getNodeManifest, resolveByExtension } from '../../main/nodePlugin'
import { FileNode } from '../../main/nodePlugin/FileNode/node'
import { FileInfoNode } from '../../main/nodePlugin/FileInfoNode/node'
import { FolderNode } from '../../main/nodePlugin/FolderNode/node'
import { viewport, panViewport, zoomViewportAt, screenToWorld, setCanvasContainer } from '@renderer/canvas/viewport'
import { measureNodeBox } from '@renderer/canvas/elements'
import EdgeLayer from './components/EdgeLayer.vue'
import NodeShell from './components/NodeShell.vue'
import ConnectionPreview from './components/ConnectionPreview.vue'
import Minimap from './components/Minimap.vue'
import NodePalette from './components/NodePalette.vue'
import ContextMenu, { type MenuItem } from './components/ContextMenu.vue'
import type { NodeMenuItem } from '../../main/engine/node/Node'
import { canvasNotice } from '@renderer/canvas/notice'
import LLMSettingsDialog from './components/LLMSettingsDialog.vue'
import ImageSettingsDialog from './components/ImageSettingsDialog.vue'
import HelpCenter from './components/HelpCenter.vue'
import OnboardingGuide from './components/OnboardingGuide.vue'
import SettingsDialog from './components/SettingsDialog.vue'
import HelpIcon from './components/icons/HelpIcon.vue'
import GearIcon from './components/icons/GearIcon.vue'
import { useHelpCenter } from '@renderer/composables/useHelpCenter'
import { useGlobalSettings } from '@renderer/composables/useGlobalSettings'
import { useLanguageSettings } from '@renderer/composables/useLanguageSettings'
import { useOnboarding } from '@renderer/composables/useOnboarding'
import { IpcStorage } from '@renderer/composables/IpcStorage'
import { isSelfDragDrop, clearSelfDragDrop } from '@renderer/composables/useFileDragOut'
import { getDraggingNode, getDraggingNodeStartPos, clearDraggingNode } from '@renderer/composables/useNodePosition'

const { t } = useI18n()

/**
 * 系统应用菜单（macOS 屏幕顶部菜单栏 / Windows 菜单栏）的文案要跟着界面语言走，
 * 但菜单是主进程建的、语言却存在渲染进程的 localStorage 里，主进程读不到，
 * 所以这里把翻译好的文案推过去，主进程收到后重建菜单。
 * immediate: true 保证启动时也推一次。
 */
const { language } = useLanguageSettings()
watch(
  language,
  () => {
    window.appMenuApi?.setLabels({
      settings: t('app.settings'),
      file: t('app.fileMenu')
    })
  },
  { immediate: true }
)

// 空白画布：没有预置节点。所有节点都从左上角「＋」调色板添加。

// 全局帮助中心：任何地方调用 openCenter() 都会弹出带节点帮助列表的帮助对话框
const { openCenter: openHelpCenter } = useHelpCenter()

// 全局设置：工具栏按钮和系统应用菜单（macOS 顶部菜单栏「设置…」）共享同一弹窗
const { openSettings } = useGlobalSettings()

// 新手引导：首次启动时自动弹出，完成或跳过后不再触发
const onboarding = useOnboarding()

// —— 节点列表：响应 Scene 结构变化 ——
// Scene 是普通类容器，Vue 追踪不到它的 Map 变化。通过 sceneTick 手动触发 computed 重算，
// 每次 addNode / removeNode 都会调用 scene.onChanged → tick++。
const sceneTick = ref(0)
let unsubscribeScene: (() => void) | undefined

function onSceneChanged(): void {
  sceneTick.value++
}

// —— 新手引导：连线检测订阅 ——
let unsubscribeOnboardingCheck: (() => void) | undefined

/**
 * 检查 Scene 中是否已有 FileNode → FileInfoNode 的连线。
 * 新手引导 Step 2 完成条件：任一条边的源端口属于 FileNode（或其子类），
 * 目标端口属于 FileInfoNode。
 */
function hasFileNodeToFileInfoEdge(): boolean {
  for (const edge of workspaceScene.allEdges) {
    const startOwner = edge.startPort.getOwner()
    const endOwner = edge.endPort.getOwner()
    if (startOwner instanceof FileNode && endOwner instanceof FileInfoNode) {
      return true
    }
  }
  return false
}

function onSceneChangedForOnboarding(): void {
  if (!onboarding.active.value) return
  if (onboarding.step.value !== 1) return
  if (hasFileNodeToFileInfoEdge()) {
    onboarding.complete()
  }
}

// 所有节点的响应式快照：每次 sceneTick +1 都会重读 workspaceScene.allNodes
// 顶层只渲染「未被收养」的节点——文件夹的子节点由文件夹 render.vue 嵌套渲染，
// 避免同一子节点在世界层和文件夹里各渲染一遍（Minimap/EdgeLayer 仍用 allNodes 全量）。
const nodes = computed(() => {
  sceneTick.value // 只做依赖登记，真正取值在下一行
  return workspaceScene.allNodes.filter((n) => !n.containerNode)
})

// —— 无限画布：平移 + 缩放 ——
const canvasEl = ref<HTMLElement | null>(null)

const worldStyle = computed(() => ({
  transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`
}))

const GRID_GAP = 24
const gridStyle = computed(() => ({
  backgroundSize: `${GRID_GAP * viewport.scale}px ${GRID_GAP * viewport.scale}px`,
  backgroundPosition: `${viewport.x}px ${viewport.y}px`
}))

// —— 跟随鼠标放置新节点 ——
// 调色板选类型 → 构造节点 → 加进 Scene → 节点位置跟随鼠标 → 用户点击画布空白处固定。

/** 当前正在跟随鼠标的新节点；null 表示没有放置中的节点 */
const trackingNode = ref<Node | null>(null)

/** 生成唯一节点 ID：类型 + 时间戳 + 随机后缀，避免和已有节点冲突 */
function generateNodeId(type: string): string {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

/** 从调色板选了一个节点类型，构造并进入放置模式 */
function onSelectType(type: string): void {
  const manifest = getNodeManifest(type)
  if (!manifest) {
    console.warn('[palette] 未知节点类型：', type)
    return
  }

  // 取当前鼠标在画布容器里的屏幕坐标（没有 canvas 容器就不生成）
  const canvasRect = canvasEl.value?.getBoundingClientRect()
  if (!canvasRect) return

  // 如果已有节点在跟随，先固定它（防止多个节点同时跟随）
  if (trackingNode.value) {
    trackingNode.value = null
  }

  const node = new manifest.nodeClass(generateNodeId(type))
  // 初始位置 = 鼠标当前位置的世界坐标
  const sx = lastClientX - canvasRect.left
  const sy = lastClientY - canvasRect.top
  const [wx, wy] = screenToWorld(sx, sy)
  node.setPosition(wx, wy)

  workspaceScene.addNode(node)
  trackingNode.value = node

  // 放置模式下，画布光标提示可以点击固定
  document.body.style.cursor = 'crosshair'
}

/** 跟随模式下，鼠标移动实时更新节点位置 */
function onTrackingMove(e: PointerEvent): void {
  if (!trackingNode.value) return
  const canvasRect = canvasEl.value?.getBoundingClientRect()
  if (!canvasRect) return
  const sx = e.clientX - canvasRect.left
  const sy = e.clientY - canvasRect.top
  const [wx, wy] = screenToWorld(sx, sy)
  trackingNode.value.setPosition(wx, wy)
}

/** 结束跟随：节点留在当前位置，恢复默认光标 */
function stopTracking(): void {
  if (!trackingNode.value) return
  trackingNode.value = null
  document.body.style.cursor = ''
}

// —— 拖文件进来自动创建 FileNode ——

/** 从文件名里提取后缀（含点），无后缀返回空串 */
function extractExtension(fileName: string): string {
  const idx = fileName.lastIndexOf('.')
  return idx >= 0 ? fileName.slice(idx) : ''
}

/**
 * 画布 dragover：无条件 preventDefault + dropEffect = 'copy'，
 * 浏览器/Electron 才会允许 drop 事件触发。
 *
 * 注意：Electron 的 dragover 事件里 dataTransfer.files 通常是空的，
 *       文件列表只在 drop 时才填充，所以这里**不能**用 files.length 来判断——
 *       否则 preventDefault 永远不调用，Electron 会走默认导航逻辑。
 *
 *       用 dataTransfer.types 里是否包含 'Files' 来判断"是不是文件拖拽"。
 */
function onCanvasDragOver(e: DragEvent): void {
  // 路径匹配才精确过滤——Finder 拖进来和自拖自的 dropEffect 都应该正常显示，
  // 真正的分流在 onCanvasDrop 里做（那个时候才能拿到文件列表做路径对比）
  if (!e.dataTransfer) return
  const isFileDrag = Array.from(e.dataTransfer.types).includes('Files')
  if (isFileDrag) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }
  const canvasRect = canvasEl.value?.getBoundingClientRect()
  if (!canvasRect) return
  const dropSX = e.clientX - canvasRect.left
  const dropSY = e.clientY - canvasRect.top
  const [worldX, worldY] = screenToWorld(dropSX, dropSY)
  // 命中测试：落点是否落在某个已有节点的内容区内，且该节点愿意劫持这个文件。
  // 劫持成功 → 不再新建节点，直接结束这个文件。
  let hijacked = false
  for (const node of workspaceScene.allNodes) {
    const [nodeWidth, nodeHeight] = node.box
    const [nodeX, nodeY] = node.worldPosition
    if (
      !hijacked &&
      nodeWidth > 0 &&
      nodeHeight > 0 &&
      worldX >= nodeX &&
      worldX <= nodeX + nodeWidth &&
      worldY >= nodeY &&
      worldY <= nodeY + nodeHeight
    ) {
      if (node.testIsInFileDropZone(worldX - nodeX, worldY - nodeY)) {
        hijacked = true
        break
      } else {
        node.setIsInFileDropZoneValue(false)
      }
    } else {
      node.setIsInFileDropZoneValue(false)
    }
  }
}

/**
 * 全局 dragover/drop 拦截：
 *
 * Electron 默认会在拖文件进窗口时尝试"打开文件"（导航到 file:// URL），
 * 哪怕画布的 dragover 已经 prevent 了，只要用户把文件拖到画布外的区域
 * （比如顶部 dragbar、窗口边缘白边），Electron 仍然会触发默认导航导致白屏。
 *
 * 所以在 document 级别统一 preventDefault，然后只让画布的 drop handler 处理业务。
 */
function onGlobalDragOver(e: DragEvent): void {
  if (!e.dataTransfer) return
  if (Array.from(e.dataTransfer.types).includes('Files')) {
    e.preventDefault()
  }
}

function onGlobalDrop(e: DragEvent): void {
  if (!e.dataTransfer) return
  if (Array.from(e.dataTransfer.types).includes('Files')) {
    // 只有落到画布上时画布自己的 drop handler 才会处理；
    // 这里只是兜底阻止 Electron 默认打开文件
    e.preventDefault()
    // 兜底：文件在画布外（如 dragbar）松手时画布 drop 不会触发，
    // 必须在这里统一清掉所有节点的拖拽悬停态，否则高亮会残留
    clearAllFileDropZones()
  }
}

/** 清掉所有节点的文件拖拽悬停态。drop 收尾统一调用，避免高亮残留 */
function clearAllFileDropZones(): void {
  for (const n of workspaceScene.allNodes) {
    n.setIsInFileDropZoneValue(false)
  }
}

/**
 * 画布 drop：根据拖入文件的后缀，自动构造对应的 FileNode 子类，
 * 把文件复制到画布目录，放置在 drop 位置的世界坐标，然后走跟随/固定流程。
 *
 * 内容填充交给 render.vue 的挂载兜底：它看到 node.fileName 已有值但 content 为空
 * 就会自动 readText + setContent——App.vue 不耦合 TxtFileNode 等子类细节。
 */
async function onCanvasDrop(e: DragEvent): Promise<void> {
  console.log('[drop] onCanvasDrop 触发')
  if (!e.dataTransfer) {
    console.warn('[drop] dataTransfer 为空')
    return
  }
  const files = e.dataTransfer.files
  console.log('[drop] files.length =', files?.length, 'types =', Array.from(e.dataTransfer.types))
  if (!files || files.length === 0) return

  // 已在 dragover 里放行，这里再 prevent 一次确保浏览器不做默认打开
  e.preventDefault()

  // 取画布内的落点屏幕坐标
  const canvasRect = canvasEl.value?.getBoundingClientRect()
  if (!canvasRect) return
  const dropSX = e.clientX - canvasRect.left
  const dropSY = e.clientY - canvasRect.top
  const [worldX, worldY] = screenToWorld(dropSX, dropSY)

  try {
    // 只处理第一个能被承接的文件（简化版；后续可扩展多文件批量创建）
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      // 路径匹配：这一份是不是我们自己 startDrag 引发的意外 drop？
      // getPathForFile 是 Electron preload 特权 API，纯浏览器环境没有；
      // try 包一下以防万一，没拿到路径的文件就当外部文件处理（放行）
      let filePath = ''
      try {
        filePath = window.fileApi.getPathForFile(file)
      } catch { /* ignore */ }
      if (filePath && isSelfDragDrop(filePath)) {
        console.log(`[drop] 跳过自拖自文件（已在路径匹配中命中）：${file.name}`)
        continue
      }

      const ext = extractExtension(file.name)
      console.log(`[drop] 文件 ${i}: name="${file.name}" ext="${ext}" size=${file.size}`)
      const manifest = resolveByExtension(ext)
      console.log('manifest', manifest)
      if (!manifest) {
        console.warn(`[drop] 无对应节点承接的文件类型：${file.name} (${ext})`)
        continue
      }

      // 通过 preload 特权 API 反查真实磁盘路径（contextIsolation 下 File.path 拿不到）
      let sourcePath: string
      try {
        sourcePath = filePath || window.fileApi.getPathForFile(file)
      } catch (err) {
        console.warn(`[drop] 反查路径失败：`, err)
        continue
      }
      if (!sourcePath) {
        console.warn(`[drop] 无法获取文件 ${file.name} 的系统路径`)
        continue
      }

      // 如果已有节点在跟随，先固定它
      if (trackingNode.value) {
        trackingNode.value = null
      }

      // 命中测试：落点是否落在某个已有节点的内容区内，且该节点愿意劫持这个文件。
      // 劫持成功 → 不再新建节点，清掉悬停态并结束这个文件的处理。
      for (const node of workspaceScene.allNodes) {
        const [nodeWidth, nodeHeight] = node.box
        const [nodeX, nodeY] = node.worldPosition
        const inside = nodeWidth > 0 && nodeHeight > 0 &&
          worldX >= nodeX && worldX <= nodeX + nodeWidth &&
          worldY >= nodeY && worldY <= nodeY + nodeHeight
        if (inside) {
          const accept = node.testIsInFileDropZone(worldX - nodeX, worldY - nodeY)
          if (accept) {
            node.onFileDrop(sourcePath)
            clearAllFileDropZones()
            return
          }
        }
      }

      // —— 未被任何节点劫持：走原「拖成新节点」逻辑，复用已复制的文件 ——
      // 先让主进程把文件复制到画布目录（copyFileSync + 重名去重）
      let copied: { fileName: string; size: number }
      try {
        copied = await window.fileApi.copyPath(sourcePath)
        console.log('[drop] 复制成功：', copied)
      } catch (err) {
        console.warn(`[drop] 文件 ${file.name} 复制失败：`, err)
        continue
      }
      const node = new manifest.nodeClass(generateNodeId(manifest.type))
      node.setPosition(worldX, worldY)
        // 用复制后的 fileName（可能加了 _1 后缀）写节点
        ; (node as FileNode).setFile(copied.fileName, copied.size)

      workspaceScene.addNode(node)
      console.log('[drop] 节点已加入 Scene：', node.id)

      // 新手引导：Step 1 完成（拖文件进画布），推进到 Step 2
      if (onboarding.active.value && onboarding.step.value === 0) {
        onboarding.nextStep()
      }

      // 文件 drop 已经让用户选好了落点——**不进入跟随放置模式**。
      // 跟随放置只用于「调色板 → 选中类型 → 画布空白处点击固定」那条路径：
      // 因为调色板选中时鼠标还在节点上，得等用户选落点再固定。
      // 文件拖进来不一样，drop 的位置本身就是用户想要的位置。
      break // 只处理第一个文件就够了
    }
  } finally {
    // 无论有没有命中自拖自，处理完都清掉缓存。
    clearSelfDragDrop()
  }
}

// —— 节点右键菜单 ——

/** 菜单根元素 DOM 引用，用函数 ref 在模板里绑定 */
let menuRoot: HTMLElement | null = null
const setMenuRoot = (ref: unknown) => {
  // v-if 切换时 Vue 会先以 null 调用；组件挂载时传入组件实例
  if (ref === null || ref === undefined) {
    menuRoot = null
    return
  }
  // ContextMenu 通过 defineExpose 暴露 menuEl（Vue 3 会自动解包 Ref，直接拿到 HTMLElement）
  const exposed = ref as { menuEl?: HTMLElement | null }
  menuRoot = exposed.menuEl ?? null
}

/** 右键菜单状态 */
const contextMenu = ref<{
  visible: boolean
  x: number
  y: number
  nodeId: string | null
}>({ visible: false, x: 0, y: 0, nodeId: null })

/** 菜单指向的节点——如果节点被删除了，这里返回 undefined，模板 v-if 会自动把菜单撤掉 */
const targetNode = computed<Node | undefined>(() => {
  const id = contextMenu.value.nodeId
  return id ? workspaceScene.getNode(id) : undefined
})

/**
 * 把 Node 声明的菜单项描述符转成 ContextMenu 需要的 MenuItem。
 * 现在 NodeMenuItem.run 是必填，直接透传就行——
 * 所有操作的执行函数都由节点自己提供，App 不再维护 handlers Map。
 */
function buildMenuItems(node: Node): MenuItem[] {
  return node.contextMenuItems().map((desc: NodeMenuItem) => ({
    id: desc.id,
    label: desc.label,
    danger: desc.danger,
    action: desc.run
  }))
}

/**
 * document 级 capture 阶段监听 contextmenu：
 * - capture 阶段先于 target/bubble，能绕过 NodeShell.stopPropagation()
 * - 按 [data-node-id] 就近命中：NodeShell 外壳、以及容器内自绘的节点视图
 *   （如 ImgThumbCell 这种不进 NodeShell 的缩略图格子）都带这个属性，一并覆盖
 */
function onDocumentContextMenu(e: MouseEvent): void {
  const target = e.target as HTMLElement
  const shell = target.closest('[data-node-id]') as HTMLElement | null
  if (!shell) return
  const nodeId = shell.dataset.nodeId
  if (!nodeId) return
  // 跟随放置中的节点不触发
  if (trackingNode.value?.id === nodeId) return
  e.preventDefault()
  e.stopPropagation()
  contextMenu.value = { visible: true, x: e.clientX, y: e.clientY, nodeId }
}

/** 关闭右键菜单 */
function closeContextMenu(): void {
  contextMenu.value.visible = false
  contextMenu.value.nodeId = null
}

/**
 * document 级 mousedown 监听：点击菜单外部时关闭菜单。
 * 用 mousedown 而不是 click——click 会等 mouseup，而右键的 contextmenu 事件也会在 click 之前触发，
 * 用 mousedown 可以更早响应、避免竞态。
 */
function onDocumentMouseDown(e: MouseEvent): void {
  if (!contextMenu.value.visible) return
  // 菜单内部点击不关闭（菜单项自己处理关闭）
  const target = e.target as unknown as globalThis.Node | null
  if (target && menuRoot?.contains(target)) return
  closeContextMenu()
}

// —— 拖拽空白处平移 ——
// 注意：平移的位移缓存必须独立于全局 lastClientX/Y——
// onWindowPointerMove（onMounted 注册）会先于 onPanMove 执行，
// 如果共用变量会把 lastClientX/Y 提前改掉，导致 dx/dy 永远算成 0。
let panning = false
let panLastClientX = 0
let panLastClientY = 0

function onCanvasPointerDown(e: PointerEvent): void {
  // 放置模式：点击画布空白处 → 固定当前跟随节点
  if (trackingNode.value && e.target === canvasEl.value) {
    stopTracking()
    e.preventDefault()
    return
  }

  // 只认画布空白背景：点中节点或菜单时，交给子组件自己处理，别抢
  if (e.target !== canvasEl.value) return

  // 点击画布空白 → 关闭右键菜单
  // （放在 e.preventDefault() 之前，因为 preventDefault 会抑制后续 mousedown，
  //  document 级别的 onDocumentMouseDown 收不到这里的点击）
  if (contextMenu.value.visible) {
    closeContextMenu()
  }

  e.preventDefault()
  panning = true
  panLastClientX = e.clientX
  panLastClientY = e.clientY
  window.addEventListener('pointermove', onPanMove)
  window.addEventListener('pointerup', onPanEnd)
}

function onPanMove(e: PointerEvent): void {
  // 放置模式下：不启动平移，只更新跟随节点位置
  if (trackingNode.value) {
    onTrackingMove(e)
    return
  }
  if (!panning) return
  const dx = e.clientX - panLastClientX
  const dy = e.clientY - panLastClientY
  panLastClientX = e.clientX
  panLastClientY = e.clientY
  panViewport(dx, dy)
}

function onPanEnd(): void {
  panning = false
  window.removeEventListener('pointermove', onPanMove)
  window.removeEventListener('pointerup', onPanEnd)
}

// —— 节点投放结算：把节点 A 拖到节点 B 上（一次性工作）——
// 被拖节点 A 由 useNodePosition 在 startDrag 时记录（getDraggingNode），A 自身不感知投放语义；
// 松手时 App 用鼠标坐标命中目标 B，由 B 决定是否接受并执行 onNodeDrop 的一次性工作。
//
// onNodeDrop 返回 true 表示"本节点接管了"——App 不再把这当普通移动处理（包括跳过文件夹释放）。
// 返回 false 表示"我没接管"——按普通移动走后续逻辑。
function onGlobalPointerUp(e: PointerEvent): void {
  const dragged = getDraggingNode()
  const startPos = getDraggingNodeStartPos()
  if (!dragged) return
  const canvasRect = canvasEl.value?.getBoundingClientRect()
  const draggedNode = workspaceScene.getNode(dragged.id)
  if (!canvasRect || !draggedNode || !startPos) {
    clearDraggingNode()
    return
  }
  try {
    const [wx, wy] = screenToWorld(e.clientX - canvasRect.left, e.clientY - canvasRect.top)
    let acceptedByTarget = false
    for (const node of workspaceScene.allNodes) {
      if (node === draggedNode) continue
      const [bx, by] = node.worldPosition
      const [bw, bh] = node.box
      if (bw <= 0 || bh <= 0) continue // 无边界（轴为 0）不参与命中
      if (wx >= bx && wx <= bx + bw && wy >= by && wy <= by + bh) {
        if (node.isPositionAcceptNodeDrop(draggedNode)) {
          acceptedByTarget = node.onNodeDrop(draggedNode, startPos)
          break // 一次投放只结算遍历序最靠前的第一个命中节点
        }
      }
    }

    // —— 拖出文件夹边界 → 释放回画布 ——
    // 被拖节点若归属于某文件夹，且松手世界坐标越出该文件夹框（外扩 12px 容错），
    // 就从文件夹里释放（原地放回画布，边保留）。未命中任何节点时同样释放——
    // 避免拖到空白处却被文件夹扣住。
    //
    // 但如果已经被某个目标节点"接管"（onNodeDrop 返回 true，比如 ImageCompressNode
    // 做完一次性工作后把人送回原位），就不动——目标节点自己管好了。
    const holder = draggedNode.containerNode
    if (holder && !acceptedByTarget) {
      const rect = measureNodeBox(holder.id, holder.worldPosition, holder.box)
      const outside =
        wx < rect.x - 12 || wx > rect.x + rect.width + 12 ||
        wy < rect.y - 12 || wy > rect.y + rect.height + 12
      if (outside && holder instanceof FolderNode) {
        holder.removeChild(draggedNode)
      }
    }
  } finally {
    // 清双方视觉态：被拖节点的"即将被接走"变淡 + 所有目标的悬停高亮（一次清完不留残留）
    for (const n of workspaceScene.allNodes) n.clearNodeDropActive()
    draggedNode.clearNodeDropAccepted()
    clearDraggingNode()
  }
}

// —— 滚轮：普通滚轮平移，Ctrl/Cmd + 滚轮缩放 ——
function onWheel(e: WheelEvent): void {
  e.preventDefault()
  const rect = canvasEl.value?.getBoundingClientRect()
  if (!rect) return
  const px = e.clientX - rect.left
  const py = e.clientY - rect.top

  if (e.ctrlKey || e.metaKey) {
    zoomViewportAt(px, py, Math.exp(-e.deltaY * 0.002))
  } else {
    panViewport(-e.deltaX, -e.deltaY)
  }
}

// —— 全局鼠标坐标缓存：供调色板选中时取"当前鼠标位置"作为新节点初始落点 ——
let lastClientX = 0
let lastClientY = 0

// 全局 pointermove：持续更新坐标缓存 + 放置模式下让节点跟随 + 被拖节点悬停态扫描
function onWindowPointerMove(e: PointerEvent): void {
  lastClientX = e.clientX
  lastClientY = e.clientY
  onTrackingMove(e)

  // —— dragover 扫描：被拖节点悬停在某个接收目标上时，双方同步视觉态 ——
  // 目标侧调 testAcceptNodeDrop：内部调 isPositionAcceptNodeDrop 判定 + 写 isInNodeDropZoneValue 悬停高亮
  // 被拖节点侧：任何一个目标返回 true → 写 nodeDropAcceptedValue，让自己变淡提示"即将被收走"
  const canvasRect = canvasEl.value?.getBoundingClientRect()
  const dragged = getDraggingNode()
  if (!canvasRect || !dragged) return
  const draggedNode = workspaceScene.getNode(dragged.id)
  if (!draggedNode) return
  const [wx, wy] = screenToWorld(e.clientX - canvasRect.left, e.clientY - canvasRect.top)

  let anyAccepted = false
  for (const node of workspaceScene.allNodes) {
    if (node === draggedNode) continue
    const [bx, by] = node.worldPosition
    const [bw, bh] = node.box
    if (bw <= 0 || bh <= 0) continue
    if (wx >= bx && wx <= bx + bw && wy >= by && wy <= by + bh) {
      if (node.testAcceptNodeDrop(draggedNode)) {
        anyAccepted = true
        // 不要 break——后续没命中的节点如果有上一次悬停残留，testAcceptNodeDrop 会写 false 清掉
      }
    } else {
      // 这次没命中：如果之前悬停过，testAcceptNodeDrop 内部的判定结果就是 false，帮它清掉
      node.testAcceptNodeDrop(draggedNode)
    }
  }
  draggedNode.setNodeDropAccepted(anyAccepted)
}

// —— 启动：从主进程 DB 读数据 → 重建 Scene → attachStorage 自动持久化后续变化 ——
// 这个函数在 App 初始化阶段同步执行，比 onMounted 更早——节点必须在渲染组件挂载前就绪，
// 否则 render.vue 里 workspaceScene.getNode(id) 会拿到 undefined。

let viewportPersistTimer: ReturnType<typeof setTimeout> | undefined

async function bootstrapScene(): Promise<void> {
  let data: Awaited<ReturnType<typeof window.canvasDeskDb.loadCanvas>> | undefined
  try {
    data = await window.canvasDeskDb.loadCanvas()
  } catch (err) {
    console.warn('[bootstrap] loadCanvas 失败，从空白画布开始：', err)
  }

  // —— 1. 节点先全部 addNode（端口就绪了才能连边）——
  for (const row of data?.nodes ?? []) {
    const manifest = getNodeManifest(row.type)
    if (!manifest) {
      console.warn(`[bootstrap] 未知节点类型跳过：${row.type} (id=${row.id})`)
      continue
    }
    const node = new manifest.nodeClass(row.id)
    node.setPosition(row.posX, row.posY)
    workspaceScene.addNode(node)
  }

  // —— 2. 节点内部状态（源头节点 readState 会 commit，连边下游能立刻收到）——
  for (const row of data?.nodes ?? []) {
    const node = workspaceScene.getNode(row.id)
    if (!node) continue
    let params: Record<string, unknown> = {}
    try {
      params = JSON.parse(row.paramsJson)
    } catch (err) {
      console.warn(`[bootstrap] 节点 ${row.id} params JSON 解析失败：`, err)
    }
    node.readState(params)
  }

  // —— 3. 边最后建（端口必须先存在）——
  for (const row of data?.edges ?? []) {
    const startNode = workspaceScene.getNode(row.startNodeId)
    const endNode = workspaceScene.getNode(row.endNodeId)
    if (!startNode || !endNode) continue
    const startPort = startNode.outputPorts.find((p) => p.id === row.startPortId)
    const endPort = endNode.inputPorts.find((p) => p.id === row.endPortId)
    if (!startPort || !endPort) continue
    workspaceScene.connect(startPort, endPort, row.id)
  }

  // —— 4. 恢复视口 + attachStorage ——
  // （边已重建，端口已就绪）此时按各文件夹 readState 暂存的 pendingChildIds 收养子节点
  for (const node of workspaceScene.allNodes) {
    if (node instanceof FolderNode) {
      node.adoptChildren(workspaceScene)
    }
  }
  if (data?.viewport) {
    viewport.x = data.viewport.x
    viewport.y = data.viewport.y
    viewport.scale = data.viewport.scale
  }

  // 重建完成后才 attachStorage——期间 addNode/connect 里的 storage?.xxx() 都是空转，
  // 不然会把刚从 DB 读出来的东西再写回去（重复且浪费 IO）
  workspaceScene.attachStorage(new IpcStorage())
}

// —— 视口持久化：debounce 500ms，拖拽/缩放停下来再写 DB ——
watch(
  () => [viewport.x, viewport.y, viewport.scale] as const,
  ([x, y, scale]) => {
    clearTimeout(viewportPersistTimer)
    viewportPersistTimer = setTimeout(() => {
      workspaceScene.saveViewport(x, y, scale)
    }, 500)
  }
)

// 立即启动 bootstrap（不在 onMounted 里——要早于子组件挂载）
// 完成后再启动新手引导：避免 bootstrap 恢复历史边时误触发连线完成检测
void bootstrapScene().then(() => {
  onboarding.start()
})

onMounted(() => {
  setCanvasContainer(canvasEl.value)
  canvasEl.value?.addEventListener('wheel', onWheel, { passive: false })
  // 全局监听 pointermove：
  // 1. 持续缓存鼠标位置（供下次 palette 选择时用）
  // 2. 放置模式下让节点跟随（不要求鼠标按下）
  window.addEventListener('pointermove', onWindowPointerMove)
  // 节点投放结算：常驻监听 pointerup（先于 useNodePosition 拖拽时临时注册的 handler 执行）
  window.addEventListener('pointerup', onGlobalPointerUp)
  // 全局 mousedown：点击菜单外部时关闭右键菜单
  document.addEventListener('mousedown', onDocumentMouseDown)
  // 全局 contextmenu：capture 阶段捕获所有层级的节点右键（含文件夹内嵌套节点）
  document.addEventListener('contextmenu', onDocumentContextMenu, true)
  // 全局拖拽兜底：文件拖到画布外区域（顶部 dragbar 等）时阻止 Electron 默认打开文件导致白屏
  // 画布上的业务逻辑仍由 stage__canvas 的 @dragover / @drop 处理
  document.addEventListener('dragover', onGlobalDragOver)
  document.addEventListener('drop', onGlobalDrop)
  unsubscribeScene = workspaceScene.onChanged(onSceneChanged)
  unsubscribeOnboardingCheck = workspaceScene.onChanged(onSceneChangedForOnboarding)
})

onUnmounted(() => {
  canvasEl.value?.removeEventListener('wheel', onWheel)
  window.removeEventListener('pointermove', onWindowPointerMove)
  window.removeEventListener('pointerup', onGlobalPointerUp)
  document.removeEventListener('mousedown', onDocumentMouseDown)
  document.removeEventListener('contextmenu', onDocumentContextMenu, true)
  document.removeEventListener('dragover', onGlobalDragOver)
  document.removeEventListener('drop', onGlobalDrop)
  unsubscribeScene?.()
  unsubscribeOnboardingCheck?.()
  document.body.style.cursor = ''
  clearTimeout(viewportPersistTimer)
})
</script>

<template>
  <section class="stage">
    <!-- 顶部拖动条：macOS 窗口标题栏已隐藏（titleBarStyle: 'hiddenInset'），
         左侧大部分区域可拖动窗口，右侧按钮区域故意不设 drag，保持可点击。 -->
    <header class="stage__dragbar">
      <!-- drag 只设在这一块（不覆盖按钮），按钮自然可点 -->
      <span class="stage__dragbar-drag-area">
        Finder+
      </span>
      <button
        class="stage__settings-btn"
        type="button"
        :title="t('app.settings')"
        @click="openSettings"
      >
        <GearIcon :size="14" />
        <span>{{ t('app.settings') }}</span>
      </button>
      <button
        class="stage__help-btn"
        type="button"
        :title="t('helpCenter.title')"
        @click="openHelpCenter"
      >
        <HelpIcon :size="14" />
        <span>{{ t('app.help') }}</span>
      </button>
    </header>

    <!-- 节点用 position 绝对定位在世界层内，世界层整体 transform 承载平移 + 缩放 -->
    <div ref="canvasEl" class="stage__canvas" :style="gridStyle" @pointerdown="onCanvasPointerDown"
      @dragover="onCanvasDragOver" @drop="onCanvasDrop">
      <!-- 节点调色板：画布左上角的「＋」按钮，悬浮展开可选类型 -->
      <NodePalette @select-type="onSelectType" />

      <!-- 连线失败的一次性提示（类型不匹配 / 端口已占用 / 自环）：浮在画布顶层，
           不占布局、不挡指针，引擎只给判定，文案在 connectionDrag 里翻译。 -->
      <p class="stage__notice" :class="{ 'stage__notice--on': !!canvasNotice.text }">
        {{ canvasNotice.text }}
      </p>

      <div class="stage__world" :style="worldStyle">
        <!-- 连线层排在节点之前：线画在卡片下面，不会盖住节点内容 -->
        <EdgeLayer />
        <!-- 每个节点 = 外壳（定位 + 端口，通用）+ 内容（render.vue，节点自定义）
             nodes 来自 Scene，新增节点加进 Scene 后会自动出现在这里 -->
        <NodeShell v-for="node in nodes" :key="node.id" :node="node" :render="manifestFor(node)?.render"
          :floating="trackingNode?.id === node.id" />
      </div>

      <!-- 连线拖拽的预览线画在屏幕层（世界层之外）：不吃缩放，线宽恒定，且压在节点之上 -->
      <ConnectionPreview />

      <!-- 小地图浮层：全貌预览 + 缩放控件；拖动顶部条可挪动它 -->
      <Minimap />

      <!-- 节点右键菜单：fixed 屏幕坐标，不受世界层平移缩放影响 -->
      <ContextMenu v-if="contextMenu.visible && targetNode" :ref="setMenuRoot" :x="contextMenu.x" :y="contextMenu.y"
        :items="buildMenuItems(targetNode)" @close="closeContextMenu" />
    </div>

    <!-- LLM 全局设置弹窗：Teleport 到 body，全局唯一一份，所有 LLM 节点的齿轮按钮都共享它 -->
    <LLMSettingsDialog />

    <!-- 图像生成全局设置弹窗：与 LLM 设置相互独立（独立 localStorage 键），文生图节点的齿轮按钮共享它 -->
    <ImageSettingsDialog />

    <!-- 全局帮助中心：列出所有注册了 help 的节点，点击左侧项动态加载帮助组件 -->
    <HelpCenter />

    <!-- 全局设置弹窗：顶部栏「设置」按钮和系统应用菜单「设置…」共享它 -->
    <SettingsDialog />

    <!-- 首次启动新手引导：全屏覆盖层 + 步骤卡片，pointer-events: none 不阻断画布交互 -->
    <OnboardingGuide />
  </section>
</template>

<style scoped lang="less">
.stage {
  display: flex;
  flex-direction: column;
  height: 100vh;

  &__dragbar {
    height: 30px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    padding: 0 12px;
    background: #e9edf3;
    user-select: none;
    cursor: default;
    // drag 属性只设在 drag-area 子元素上，按钮自然不继承
  }

  &__dragbar-drag-area {
    flex: 1;
    text-align: center;
    color: @color-text-weak;
    font-size: 12px;
    // —— 仅这块区域可拖动窗口 ——
    -webkit-app-region: drag;
  }

  &__help-btn,
  &__settings-btn {
    // 父级 dragbar 不再带 drag，不需要 no-drag
    all: unset;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 9px;
    border-radius: 5px;
    color: @color-text-weak;
    font-size: 12px;
    font-weight: 500;
    transition: background 0.15s ease, color 0.15s ease;

    &:hover {
      background: rgba(0, 0, 0, 0.08);
      color: @color-primary;
    }
  }

  &__notice {
    // 浮在画布顶部居中：不占布局，提示出现/消失都不会让画布跳
    position: absolute;
    top: 10px;
    left: 50%;
    z-index: 10;
    margin: 0;
    padding: 4px 12px;
    border-radius: @radius-md;
    background: rgba(255, 255, 255, 0.92);
    color: @color-danger;
    font-size: 13px;
    line-height: 1.4;
    white-space: nowrap;
    pointer-events: none;
    transform: translateX(-50%);
    opacity: 0;
    transition: opacity 0.15s ease;

    &--on {
      opacity: 1;
    }
  }

  &__canvas {
    position: relative;
    flex: 1;
    min-height: 320px;
    overflow: hidden;
    cursor: grab;
    touch-action: none; // 阻止触摸默认滚动/缩放，让 pointer 事件接管平移
    background-color: #fbfcfe;
    background-image: radial-gradient(circle, #cfd4dc 1px, transparent 1px);
    background-repeat: repeat;

    &:active {
      cursor: grabbing;
    }
  }

  &__world {
    position: absolute;
    left: 0;
    top: 0;
    width: 0;
    height: 0;
    transform-origin: 0 0;
    will-change: transform;
  }
}
</style>
