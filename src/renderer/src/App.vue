<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { Node } from '../../main/engine/node/Node'
import { workspaceScene } from '../../main/engine/graph/SceneRegistry'
import { manifestFor, getNodeManifest, resolveByExtension } from '../../main/nodePlugin'
import type { FileNode } from '../../main/nodePlugin/FileNode/node'
import { viewport, panViewport, zoomViewportAt, screenToWorld } from '@renderer/canvas/viewport'
import EdgeLayer from './components/EdgeLayer.vue'
import NodeShell from './components/NodeShell.vue'
import ConnectionPreview from './components/ConnectionPreview.vue'
import Minimap from './components/Minimap.vue'
import NodePalette from './components/NodePalette.vue'
import ContextMenu, { type MenuItem } from './components/ContextMenu.vue'
import type { NodeMenuItem } from '../../main/engine/node/Node'
import { connectNotice } from '@renderer/canvas/connectionDrag'
import { IpcStorage } from '@renderer/composables/IpcStorage'
import { isSelfDragDrop, clearSelfDragDrop } from '@renderer/composables/useFileDragOut'

// 空白画布：没有预置节点。所有节点都从左上角「＋」调色板添加。

// —— 节点列表：响应 Scene 结构变化 ——
// Scene 是普通类容器，Vue 追踪不到它的 Map 变化。通过 sceneTick 手动触发 computed 重算，
// 每次 addNode / removeNode 都会调用 scene.onChanged → tick++。
const sceneTick = ref(0)
let unsubscribeScene: (() => void) | undefined

function onSceneChanged(): void {
  sceneTick.value++
}

// 所有节点的响应式快照：每次 sceneTick +1 都会重读 workspaceScene.allNodes
const nodes = computed(() => {
  sceneTick.value // 只做依赖登记，真正取值在下一行
  return workspaceScene.allNodes
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
  const [wx, wy] = screenToWorld(dropSX, dropSY)

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
      if (!manifest) {
        console.warn(`[drop] 无对应节点承接的文件类型：${file.name} (${ext})`)
        continue
      }
      console.log('[drop] 匹配 manifest type =', manifest.type)

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

      const node = new manifest.nodeClass(generateNodeId(manifest.type))
      node.setPosition(wx, wy)

      try {
        // 让主进程把文件复制到画布目录（copyFileSync + 重名去重）
        const copied = await window.fileApi.copyPath(sourcePath)
        console.log('[drop] 复制成功：', copied)
        // 用复制后的 fileName（可能加了 _1 后缀）写节点
        ;(node as FileNode).setFile(copied.fileName, copied.size)
      } catch (err) {
        console.warn(`[drop] 文件 ${file.name} 复制失败：`, err)
        continue
      }

      workspaceScene.addNode(node)
      console.log('[drop] 节点已加入 Scene：', node.id)

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
  // ContextMenu 通过 defineExpose 暴露 menuEl
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

/** 节点外壳发来的右键事件 */
function onNodeContextMenu(nodeId: string, clientX: number, clientY: number): void {
  contextMenu.value = { visible: true, x: clientX, y: clientY, nodeId }
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
let panning = false
let lastClientX = 0
let lastClientY = 0

function onCanvasPointerDown(e: PointerEvent): void {
  lastClientX = e.clientX
  lastClientY = e.clientY

  // 放置模式：点击画布空白处 → 固定当前跟随节点
  if (trackingNode.value && e.target === canvasEl.value) {
    stopTracking()
    e.preventDefault()
    return
  }

  // 只认画布空白背景：点中节点时，交给节点自己的拖拽逻辑，别抢
  if (e.target !== canvasEl.value) return

  e.preventDefault()
  panning = true
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
  const dx = e.clientX - lastClientX
  const dy = e.clientY - lastClientY
  lastClientX = e.clientX
  lastClientY = e.clientY
  panViewport(dx, dy)
}

function onPanEnd(): void {
  panning = false
  window.removeEventListener('pointermove', onPanMove)
  window.removeEventListener('pointerup', onPanEnd)
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

// 全局 pointermove：放置模式需要持续跟随，无论鼠标是否按下
function onWindowPointerMove(e: PointerEvent): void {
  // 更新全局坐标缓存（调色板选中时需要用"当前鼠标位置"作为新节点初始落点）
  lastClientX = e.clientX
  lastClientY = e.clientY
  onTrackingMove(e)
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
bootstrapScene()

onMounted(() => {
  canvasEl.value?.addEventListener('wheel', onWheel, { passive: false })
  // 全局监听 pointermove：
  // 1. 持续缓存鼠标位置（供下次 palette 选择时用）
  // 2. 放置模式下让节点跟随（不要求鼠标按下）
  window.addEventListener('pointermove', onWindowPointerMove)
  // 全局 mousedown：点击菜单外部时关闭右键菜单
  document.addEventListener('mousedown', onDocumentMouseDown)
  // 全局拖拽兜底：文件拖到画布外区域（顶部 dragbar 等）时阻止 Electron 默认打开文件导致白屏
  // 画布上的业务逻辑仍由 stage__canvas 的 @dragover / @drop 处理
  document.addEventListener('dragover', onGlobalDragOver)
  document.addEventListener('drop', onGlobalDrop)
  unsubscribeScene = workspaceScene.onChanged(onSceneChanged)
})

onUnmounted(() => {
  canvasEl.value?.removeEventListener('wheel', onWheel)
  window.removeEventListener('pointermove', onWindowPointerMove)
  document.removeEventListener('mousedown', onDocumentMouseDown)
  document.removeEventListener('dragover', onGlobalDragOver)
  document.removeEventListener('drop', onGlobalDrop)
  unsubscribeScene?.()
  document.body.style.cursor = ''
  clearTimeout(viewportPersistTimer)
})
</script>

<template>
  <section class="stage">
    <!-- 顶部拖动条：macOS 窗口标题栏已隐藏（titleBarStyle: 'hiddenInset'），
         这条区域用 -webkit-app-region: drag 让用户能按住它拖动整个软件窗口。
         注意：drag 区域内放不了按钮（点击会被系统吞掉），所以只用纯文本。 -->
    <header class="stage__dragbar">
      <span class="stage__dragbar-label">CanvasDesk · 拖动此区域移动窗口</span>
    </header>

    <!-- 节点用 position 绝对定位在世界层内，世界层整体 transform 承载平移 + 缩放 -->
    <div
      ref="canvasEl"
      class="stage__canvas"
      :style="gridStyle"
      @pointerdown="onCanvasPointerDown"
      @dragover="onCanvasDragOver"
      @drop="onCanvasDrop"
    >
      <!-- 节点调色板：画布左上角的「＋」按钮，悬浮展开可选类型 -->
      <NodePalette @select-type="onSelectType" />

      <!-- 连线失败的一次性提示（类型不匹配 / 端口已占用 / 自环）：浮在画布顶层，
           不占布局、不挡指针，引擎只给判定，文案在 connectionDrag 里翻译。 -->
      <p class="stage__notice" :class="{ 'stage__notice--on': !!connectNotice.text }">
        {{ connectNotice.text }}
      </p>

      <div class="stage__world" :style="worldStyle">
        <!-- 连线层排在节点之前：线画在卡片下面，不会盖住节点内容 -->
        <EdgeLayer />
        <!-- 每个节点 = 外壳（定位 + 端口，通用）+ 内容（render.vue，节点自定义）
             nodes 来自 Scene，新增节点加进 Scene 后会自动出现在这里 -->
        <NodeShell
          v-for="node in nodes"
          :key="node.id"
          :node="node"
          :render="manifestFor(node)?.render"
          :floating="trackingNode?.id === node.id"
          @contextmenu="onNodeContextMenu"
        />
      </div>

      <!-- 连线拖拽的预览线画在屏幕层（世界层之外）：不吃缩放，线宽恒定，且压在节点之上 -->
      <ConnectionPreview />

      <!-- 小地图浮层：全貌预览 + 缩放控件；拖动顶部条可挪动它 -->
      <Minimap />

      <!-- 节点右键菜单：fixed 屏幕坐标，不受世界层平移缩放影响 -->
      <ContextMenu
        v-if="contextMenu.visible && targetNode"
        :ref="setMenuRoot"
        :x="contextMenu.x"
        :y="contextMenu.y"
        :items="buildMenuItems(targetNode)"
        @close="closeContextMenu"
      />
    </div>
  </section>
</template>

<style scoped lang="less">
.stage {
  display: flex;
  flex-direction: column;
  height: 100vh;

  &__dragbar {
    // 占住窗口最顶一行作为系统可拖动区域
    height: 30px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #e9edf3;
    user-select: none;
    cursor: default;
    -webkit-app-region: drag;
  }

  &__dragbar-label {
    color: @color-text-weak;
    font-size: 12px;
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
