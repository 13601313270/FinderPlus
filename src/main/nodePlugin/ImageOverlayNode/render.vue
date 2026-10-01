<script setup lang="ts">
import { computed, ref, watch, onUnmounted, reactive, nextTick } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { ImageOverlayNode, type LayerState } from './node'
import { ImgFileNode } from '../ImgFileNode/node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import type { Edge } from '../../engine/graph/Edge'
import GearIcon from '@renderer/components/icons/GearIcon.vue'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import ImageOverlayHelpDialog from './ImageOverlayHelpDialog.vue'

const props = defineProps<{ id: string }>()

const node = computed(() => {
  const n = workspaceScene.getNode(props.id)
  return n instanceof ImageOverlayNode ? n : undefined
})

const { startDrag } = useNodePosition(() => node.value)

// —— 帮助浮层开关 ——
const showHelp = ref(false)

// —— 画布尺寸设置弹窗 ——
const showSizeDialog = ref(false)
const dialogW = ref(800)
const dialogH = ref(600)
const dialogAuto = ref(true)

watch(showSizeDialog, (open) => {
  if (!open) return
  const n = node.value
  if (!n) return
  const cw = n.configuredCanvasWidth
  const ch = n.configuredCanvasHeight
  if (cw > 0 && ch > 0) {
    dialogAuto.value = false
    dialogW.value = cw
    dialogH.value = ch
  } else {
    dialogAuto.value = true
    const sz = n.compositeCanvasSize
    dialogW.value = sz.width
    dialogH.value = sz.height
  }
})

function applyCanvasSize(): void {
  const n = node.value
  if (!n) return
  if (dialogAuto.value) {
    n.resetCanvasSize()
  } else {
    n.setCanvasSize(dialogW.value, dialogH.value)
  }
  showSizeDialog.value = false
  scheduleComposite()
}

function resetCanvasSize(): void {
  dialogAuto.value = true
  const n = node.value
  if (!n) return
  const sz = n.compositeCanvasSize
  dialogW.value = sz.width
  dialogH.value = sz.height
}

// —— 节点整体大小 resize ——
const MIN_NODE_W = 400
const MIN_NODE_H = 400

let nodeResizeStartClientX = 0
let nodeResizeStartClientY = 0
let nodeResizeStartBoxW = 0
let nodeResizeStartBoxH = 0

function onNodeResizeStart(e: PointerEvent): void {
  const n = node.value
  if (!n) return
  nodeResizeStartClientX = e.clientX
  nodeResizeStartClientY = e.clientY
  nodeResizeStartBoxW = n.box[0]
  nodeResizeStartBoxH = n.box[1]

  window.addEventListener('pointermove', onNodeResizeMove)
  window.addEventListener('pointerup', onNodeResizeUp)
}

function onNodeResizeMove(e: PointerEvent): void {
  const n = node.value
  if (!n) return
  const newW = Math.max(MIN_NODE_W, nodeResizeStartBoxW + (e.clientX - nodeResizeStartClientX))
  const newH = Math.max(MIN_NODE_H, nodeResizeStartBoxH + (e.clientY - nodeResizeStartClientY))
  n.setBox(newW, newH)
}

function onNodeResizeUp(): void {
  window.removeEventListener('pointermove', onNodeResizeMove)
  window.removeEventListener('pointerup', onNodeResizeUp)
}

// —— 选中的端口 id（画布上高亮 + 手柄）——
const selectedPortId = ref<string | null>(null)

// —— 防抖合成计时器 ——
let compositeTimer: ReturnType<typeof setTimeout> | null = null
let compositing = false

// —— 各端口 id → 加载好的 HTMLImageElement ——
const loadedImages = new Map<string, HTMLImageElement>()

// —— 画布预览容器引用 ——
const previewAreaRef = ref<HTMLElement | null>(null)

// —— 预览缩放比 + 画布尺寸 ——
const previewScale = ref(1)
const canvasSize = ref({ width: 1, height: 1 })

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load fail')) }
    img.src = url
  })
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('load fail'))
    img.src = url
  })
}

// —— 图层数据（响应式：每个端口对应一个条目，无论是否连接）——
interface LayerItem {
  portId: string
  portIndex: number
  label: string           // '图层 1', '图层 2', ...
  connected: boolean
  fingerprint: string     // 连接后才有
  state: LayerState | null  // 连接后才有
  fileName: string        // 连接后才有
  thumbnailUrl: string    // 连接后才有
}
const layers = ref<LayerItem[]>([])
const thumbnailRevoke = new Map<string, () => void>()

function clearThumbnails(): void {
  thumbnailRevoke.forEach((fn) => fn())
  thumbnailRevoke.clear()
}

/** 从端口取当前连接的 Edge 和 ImgFileValue，没有则返回 null */
function getPortValue(port: { incoming: Map<Edge, unknown> }): { edge: Edge; value: ImgFileValue } | null {
  for (const [edge, v] of port.incoming) {
    if (v instanceof ImgFileValue) return { edge, value: v }
  }
  return null
}

function refreshLayers(): void {
  const n = node.value
  if (!n) {
    layers.value = []
    canvasSize.value = { width: 1, height: 1 }
    return
  }

  canvasSize.value = n.compositeCanvasSize

  const newLayers: LayerItem[] = []
  const seenPortIds = new Set<string>()

  n.inputPorts.forEach((port, idx) => {
    seenPortIds.add(port.id)
    const dynamicLabel = `图层 ${idx + 1}`

    const conn = getPortValue(port)
    if (!conn) {
      // 空端口：只显示占位
      newLayers.push({
        portId: port.id,
        portIndex: idx,
        label: dynamicLabel,
        connected: false,
        fingerprint: '',
        state: null,
        fileName: '',
        thumbnailUrl: ''
      })
      return
    }

    // 已连接
    const { value } = conn
    const state = n.getLayerState(port.id)
    if (!state) return // state 还没初始化过（syncLayerRegistry 可能还没跑），跳过这一轮

    const newFp = value.fingerprint
    const prevLayer = layers.value.find((l) => l.portId === port.id)
    const fpChanged = prevLayer && prevLayer.fingerprint !== newFp

    // 缩略图：fingerprint 变了 → revoke 旧 URL + 重建
    let thumbUrl: string
    if (fpChanged) {
      const oldRevoke = thumbnailRevoke.get(port.id)
      if (oldRevoke) { oldRevoke(); thumbnailRevoke.delete(port.id) }
      const newUrl = URL.createObjectURL(value.file)
      thumbUrl = newUrl
      thumbnailRevoke.set(port.id, () => URL.revokeObjectURL(newUrl))
    } else if (thumbnailRevoke.has(port.id)) {
      thumbUrl = prevLayer?.thumbnailUrl ?? ''
    } else {
      const newUrl = URL.createObjectURL(value.file)
      thumbUrl = newUrl
      thumbnailRevoke.set(port.id, () => URL.revokeObjectURL(newUrl))
    }

    newLayers.push({
      portId: port.id,
      portIndex: idx,
      label: dynamicLabel,
      connected: true,
      fingerprint: newFp,
      state: { ...state },
      fileName: value.file.name,
      thumbnailUrl: thumbUrl
    })

    // 预加载 natural 尺寸：fingerprint 变了 或 首次
    if (fpChanged || !loadedImages.has(port.id)) {
      loadedImages.delete(port.id)
      loadImageFromFile(value.file).then((img) => {
        loadedImages.set(port.id, img)
        const s = n.getLayerState(port.id)
        if (s) {
          if (!s.initialized || fpChanged) {
            n.updateLayerTransform(port.id, {
              width: img.naturalWidth,
              height: img.naturalHeight,
              initialized: true
            })
          }
        }
      }).catch(() => {})
    }
  })

  // 清理已移除端口的缩略图和缓存
  for (const l of layers.value) {
    if (!seenPortIds.has(l.portId)) {
      const fn = thumbnailRevoke.get(l.portId)
      if (fn) fn()
      thumbnailRevoke.delete(l.portId)
      loadedImages.delete(l.portId)
    }
  }

  layers.value = newLayers

  if (selectedPortId.value && !seenPortIds.has(selectedPortId.value)) {
    selectedPortId.value = null
  }
}

// —— 预览缩放比 ——
function recalcScale(): void {
  const area = previewAreaRef.value
  if (!area) return
  const rect = area.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return
  const s = Math.min(
    rect.width / canvasSize.value.width,
    rect.height / canvasSize.value.height,
    1
  )
  previewScale.value = s > 0 ? s : 1
}

function canvasToDom(v: number): number { return v * previewScale.value }
function domToCanvas(v: number): number { return v / previewScale.value }

// ============================================================
// 画布上图层定位拖拽
// ============================================================
const layerMove = reactive({
  dragging: false,
  portId: null as string | null,
  startClientX: 0, startClientY: 0,
  startCanvasX: 0, startCanvasY: 0
})

function onCanvasLayerPointerDown(e: PointerEvent, portId: string): void {
  e.stopPropagation(); e.preventDefault()
  selectedPortId.value = portId

  const n = node.value
  if (!n) return
  const state = n.getLayerState(portId)
  if (!state) return

  ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  layerMove.dragging = true
  layerMove.portId = portId
  layerMove.startClientX = e.clientX
  layerMove.startClientY = e.clientY
  layerMove.startCanvasX = state.x
  layerMove.startCanvasY = state.y

  window.addEventListener('pointermove', onLayerMovePointerMove)
  window.addEventListener('pointerup', onLayerMovePointerUp)
}

function onLayerMovePointerMove(e: PointerEvent): void {
  if (!layerMove.dragging || !layerMove.portId) return
  const dx = domToCanvas(e.clientX - layerMove.startClientX)
  const dy = domToCanvas(e.clientY - layerMove.startClientY)
  node.value?.updateLayerTransform(layerMove.portId, {
    x: Math.round(layerMove.startCanvasX + dx),
    y: Math.round(layerMove.startCanvasY + dy)
  })
  scheduleComposite()
}

function onLayerMovePointerUp(_e: PointerEvent): void {
  window.removeEventListener('pointermove', onLayerMovePointerMove)
  window.removeEventListener('pointerup', onLayerMovePointerUp)
  layerMove.dragging = false
  layerMove.portId = null
  scheduleComposite()
}

// ============================================================
// 四角 resize
// ============================================================
type ResizeCorner = 'tl' | 'tr' | 'bl' | 'br'

const resizeDrag = reactive({
  dragging: false,
  corner: null as ResizeCorner | null,
  portId: null as string | null,
  startClientX: 0, startClientY: 0,
  startState: null as LayerState | null
})

function onResizeHandlePointerDown(e: PointerEvent, portId: string, corner: ResizeCorner): void {
  e.stopPropagation(); e.preventDefault()
  selectedPortId.value = portId

  const n = node.value
  if (!n) return
  const state = n.getLayerState(portId)
  if (!state) return

  ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  resizeDrag.dragging = true
  resizeDrag.corner = corner
  resizeDrag.portId = portId
  resizeDrag.startClientX = e.clientX
  resizeDrag.startClientY = e.clientY
  resizeDrag.startState = { ...state }

  window.addEventListener('pointermove', onResizePointerMove)
  window.addEventListener('pointerup', onResizePointerUp)
}

function onResizePointerMove(e: PointerEvent): void {
  if (!resizeDrag.dragging || !resizeDrag.portId || !resizeDrag.corner || !resizeDrag.startState) return
  const n = node.value
  if (!n) return

  const dx = domToCanvas(e.clientX - resizeDrag.startClientX)
  const dy = domToCanvas(e.clientY - resizeDrag.startClientY)
  const s = resizeDrag.startState
  let newX = s.x, newY = s.y, newW = s.width, newH = s.height

  const c = resizeDrag.corner
  if (c.includes('l')) { newX = s.x + dx; newW = s.width - dx }
  else if (c.includes('r')) { newW = s.width + dx }
  if (c.includes('t')) { newY = s.y + dy; newH = s.height - dy }
  else if (c.includes('b')) { newH = s.height + dy }

  // Shift 等比例缩放：以起始宽高比约束新尺寸
  if (e.shiftKey) {
    const ratio = s.width / s.height
    if (c.includes('l') || c.includes('r')) {
      // 水平侧被拉动，用新宽按比例推高（t/b 侧也会被拉动的话，取移动量更大的方向）
      const wantH = newW / ratio
      // 根据哪个手柄被拉决定锚点
      if (c.includes('t')) {
        newY = s.y + (s.height - wantH)
        newH = wantH
      } else if (c.includes('b')) {
        newH = wantH
      } else {
        // 只水平拉动：以中心为锚点
        newH = wantH
        newY = s.y + (s.height - wantH) / 2
      }
      // 反向检查：如果垂直拉动更大，改用高推宽
      if ((c.includes('t') || c.includes('b'))) {
        const wantW = newH * ratio
        // 以移动量绝对值大者为准
        if (Math.abs(dy) > Math.abs(dx)) {
          newW = wantW
          if (c.includes('l')) newX = s.x + (s.width - wantW)
          else if (c.includes('r')) { /* x 不动 */ }
          else { newX = s.x + (s.width - wantW) / 2 }
        }
      }
    } else if (c.includes('t') || c.includes('b')) {
      // 只垂直侧被拉动
      const wantW = newH * ratio
      newW = wantW
      newX = s.x + (s.width - wantW) / 2
    }
  }

  if (newW < 1) { newW = 1; newX = c.includes('l') ? s.x + s.width - 1 : newX }
  if (newH < 1) { newH = 1; newY = c.includes('t') ? s.y + s.height - 1 : newY }

  n.updateLayerTransform(resizeDrag.portId, {
    x: Math.round(newX), y: Math.round(newY),
    width: Math.round(newW), height: Math.round(newH)
  })
  scheduleComposite()
}

function onResizePointerUp(_e: PointerEvent): void {
  window.removeEventListener('pointermove', onResizePointerMove)
  window.removeEventListener('pointerup', onResizePointerUp)
  resizeDrag.dragging = false
  resizeDrag.corner = null
  resizeDrag.portId = null
  resizeDrag.startState = null
  scheduleComposite()
}

// ============================================================
// 合成（防抖 150ms）
// ============================================================
function scheduleComposite(): void {
  if (compositeTimer) clearTimeout(compositeTimer)
  compositeTimer = setTimeout(() => doComposite(), 150)
}

async function doComposite(): Promise<void> {
  if (compositing) return
  const n = node.value
  if (!n) return

  const key = n.compositeKey
  if (key === null) { n.imageOutput.clear(); return }
  if (key === n.lastCompositeK) return

  compositing = true
  try {
    const orders = n.layerDrawOrders
    const canvasSize = n.compositeCanvasSize
    if (orders.length === 0) { n.imageOutput.clear(); return }

    // 优先复用 loadedImages 缓存
    const images: (HTMLImageElement | null)[] = []
    const pending: { idx: number; file: File }[] = []
    orders.forEach((o, idx) => {
      const cached = loadedImages.get(o.portId)
      if (cached) images[idx] = cached
      else { images[idx] = null; pending.push({ idx, file: o.value.file }) }
    })

    if (pending.length > 0) {
      const urls: string[] = []
      const tasks = pending.map((p) => {
        const url = URL.createObjectURL(p.file)
        urls.push(url)
        return loadImageFromUrl(url).then((img) => {
          images[p.idx] = img
          loadedImages.set(orders[p.idx].portId, img)
        }).catch(() => {})
      })
      await Promise.all(tasks)
      for (const u of urls) URL.revokeObjectURL(u)
    }

    const canvas = document.createElement('canvas')
    canvas.width = canvasSize.width
    canvas.height = canvasSize.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    for (let i = 0; i < orders.length; i++) {
      const img = images[i]
      if (!img) continue
      const o = orders[i]
      ctx.drawImage(img, o.state.x, o.state.y, o.state.width, o.state.height)
    }

    const dataUrl = canvas.toDataURL('image/png')
    const comma = dataUrl.indexOf(',')
    const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
    const fileName = `overlay-${Date.now()}.png`
    n.setOutput(base64, fileName)
    n.markComposite(key)
  } catch {
    // 静默
  } finally {
    compositing = false
  }
}

// ============================================================
// 生成文件节点
// ============================================================
async function handleCreateImgNode(): Promise<void> {
  const currentNode = node.value
  if (!currentNode) return
  const value = currentNode.imageOutput.value
  const file = value instanceof ImgFileValue ? value.file : undefined
  if (!file) return

  const reader = new FileReader()
  reader.onload = async () => {
    const dataUrl = reader.result as string
    const comma = dataUrl.indexOf(',')
    const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
    const written = await window.fileApi.writeBuffer(file.name, base64)
    const [cx, cy] = currentNode.position
    const newNode = new ImgFileNode(
      `${ImgFileNode.TYPE}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    )
    newNode.setPosition(cx + 30, cy + 30)
    newNode.setFile(written.fileName, written.size)
    workspaceScene.addNode(newNode)
  }
  reader.readAsDataURL(file)
}

// ============================================================
// 订阅
// ============================================================
let unsubscribe: (() => void) | undefined
watch(
  node,
  (n) => {
    unsubscribe?.()
    unsubscribe = n?.onChanged(() => {
      refreshLayers()
      nextTick(() => recalcScale())
      scheduleComposite()
    })
    refreshLayers()
    nextTick(() => recalcScale())
    scheduleComposite()
  },
  { immediate: true, flush: 'sync' }
)

const previewResizeObserver = new ResizeObserver(() => recalcScale())
watch(previewAreaRef, (el) => {
  if (!el) return
  previewResizeObserver.observe(el)
}, { immediate: true })

onUnmounted(() => {
  unsubscribe?.()
  clearThumbnails()
  loadedImages.clear()
  if (compositeTimer) clearTimeout(compositeTimer)
  previewResizeObserver.disconnect()
})

// —— 左面板点击选中（不触发 node startDrag）——
function onLayerItemClick(e: PointerEvent, portId: string): void {
  e.stopPropagation()
  selectedPortId.value = portId
}

// —— 添加图层 ——
function handleAddLayer(e: PointerEvent): void {
  e.stopPropagation()
  node.value?.addLayer() // addLayerPort 内部已 notifyChanged → refreshLayers 自动触发
}

// —— 删除图层 ——
function onRemoveLayer(e: PointerEvent, portId: string): void {
  e.stopPropagation()
  const n = node.value
  if (!n) return
  // 清理本地缓存
  const thumbFn = thumbnailRevoke.get(portId)
  if (thumbFn) { thumbFn(); thumbnailRevoke.delete(portId) }
  loadedImages.delete(portId)
  if (selectedPortId.value === portId) selectedPortId.value = null
  n.removeLayerPort(portId) // 基类 removeInput 内部已 notifyChanged → refreshLayers 自动触发
}
</script>

<template>
  <div class="overlay-card" @pointerdown="startDrag">
    <!-- 头部 -->
    <div class="overlay-card__header">
      <span class="overlay-card__title">图片叠加</span>
      <span class="overlay-card__sub">{{ layers.length }} 端口 · {{ layers.filter(l => l.connected).length }} 已连</span>
      <button
        class="overlay-card__gear"
        type="button"
        title="画布尺寸设置"
        @pointerdown.stop
        @click="showSizeDialog = true"
      >
        <GearIcon :size="14" />
      </button>
      <button
        class="overlay-card__help"
        type="button"
        title="使用说明"
        @pointerdown.stop
        @click="showHelp = true"
      >?</button>
    </div>

    <!-- 主体 -->
    <div class="overlay-card__body">
      <!-- 左面板：每个端口一行 -->
      <div class="overlay-card__port-list" @wheel.stop>
        <div
          v-for="layer in layers"
          :key="layer.portId"
          class="overlay-card__port-item"
          :class="{
            'is-selected': selectedPortId === layer.portId,
            'is-empty': !layer.connected
          }"
          @pointerdown.stop="onLayerItemClick($event, layer.portId)"
        >
          <div class="overlay-card__port-row">
            <div class="overlay-card__port-label">{{ layer.label }}</div>
            <button
              v-if="layer.connected && layer.portIndex === layers.length - 1 && layers.length > 1"
              class="overlay-card__port-del"
              type="button"
              title="删除此图层（仅尾部可删）"
              @pointerdown.stop
              @click="onRemoveLayer($event, layer.portId)"
            >×</button>
          </div>
          <div class="overlay-card__port-thumb">
            <img v-if="layer.connected" :src="layer.thumbnailUrl" :alt="layer.fileName" draggable="false" />
            <div v-else class="overlay-card__port-empty-svg">
              <svg viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" rx="2" fill="none" stroke="#c5cbd4" stroke-width="1"/><path d="M5 12L7 9L8 10L11 6L13 12H5Z" fill="#c5d4ff" stroke="#4a7cff" stroke-width="0.8" stroke-linejoin="round"/><circle cx="10.5" cy="5" r="1" fill="#4a7cff"/></svg>
            </div>
          </div>
          <div v-if="layer.connected" class="overlay-card__port-info">
            <div class="overlay-card__port-name" :title="layer.fileName">{{ layer.fileName }}</div>
            <div class="overlay-card__port-size">{{ layer.state?.width }}×{{ layer.state?.height }}</div>
          </div>
          <div v-else class="overlay-card__port-info">
            <div class="overlay-card__port-name overlay-card__port-name--empty">未连接</div>
          </div>
        </div>

        <!-- 添加图层按钮 -->
        <button
          class="overlay-card__port-add"
          type="button"
          title="添加图层"
          @pointerdown.stop
          @click="handleAddLayer"
        >＋ 添加图层</button>
      </div>

      <!-- 右面板：画布预览 + 层内拖拽缩放 -->
      <div ref="previewAreaRef" class="overlay-card__preview" @pointerdown.stop="selectedPortId = null">
        <div
          v-if="layers.some(l => l.connected)"
          class="overlay-card__preview-canvas"
          :style="{
            width: canvasToDom(canvasSize.width) + 'px',
            height: canvasToDom(canvasSize.height) + 'px'
          }"
        >
          <div
            v-for="layer in layers.filter(l => l.connected)"
            :key="layer.portId"
            class="overlay-card__preview-layer"
            :class="{ 'is-selected': selectedPortId === layer.portId }"
            :style="{
              left: canvasToDom(layer.state!.x) + 'px',
              top: canvasToDom(layer.state!.y) + 'px',
              width: canvasToDom(layer.state!.width) + 'px',
              height: canvasToDom(layer.state!.height) + 'px'
            }"
            @pointerdown.stop="onCanvasLayerPointerDown($event, layer.portId)"
          >
            <img :src="layer.thumbnailUrl" :alt="layer.fileName" draggable="false" />

            <template v-if="selectedPortId === layer.portId">
              <div class="resize-handle resize-handle--tl" @pointerdown.stop="onResizeHandlePointerDown($event, layer.portId, 'tl')"></div>
              <div class="resize-handle resize-handle--tr" @pointerdown.stop="onResizeHandlePointerDown($event, layer.portId, 'tr')"></div>
              <div class="resize-handle resize-handle--bl" @pointerdown.stop="onResizeHandlePointerDown($event, layer.portId, 'bl')"></div>
              <div class="resize-handle resize-handle--br" @pointerdown.stop="onResizeHandlePointerDown($event, layer.portId, 'br')"></div>
            </template>
          </div>
        </div>
        <div v-else class="overlay-card__empty-hint">连接端口或点击左侧 ＋ 添加图层</div>
      </div>
    </div>

    <!-- 底部 -->
    <div class="overlay-card__footer">
      <span class="overlay-card__hint">
        {{ layers.filter(l => l.connected).length }}/{{ layers.length }} · {{ canvasSize.width }}×{{ canvasSize.height }} · PNG透明
      </span>
      <button
        v-if="layers.filter(l => l.connected).length > 0"
        class="overlay-card__create-btn"
        type="button"
        @pointerdown.stop
        @click="handleCreateImgNode"
      >
        生成图片文件节点
      </button>
    </div>

    <!-- 画布尺寸设置弹窗（fixed 定位在节点上方居中） -->
    <div v-if="showSizeDialog" class="overlay-dialog" @pointerdown.stop>
      <div class="overlay-dialog__mask" @click="showSizeDialog = false"></div>
      <div class="overlay-dialog__panel">
        <div class="overlay-dialog__title">画布尺寸</div>

        <label class="overlay-dialog__row">
          <span class="overlay-dialog__label">模式</span>
          <div class="overlay-dialog__radios">
            <label class="overlay-dialog__radio">
              <input type="radio" v-model="dialogAuto" :value="true">
              <span>自动（按图层边界）</span>
            </label>
            <label class="overlay-dialog__radio">
              <input type="radio" v-model="dialogAuto" :value="false">
              <span>固定尺寸</span>
            </label>
          </div>
        </label>

        <div class="overlay-dialog__inputs" :class="{ 'is-disabled': dialogAuto }">
          <label class="overlay-dialog__input-group">
            <span>宽</span>
            <input type="number" min="1" v-model.number="dialogW" :disabled="dialogAuto">
          </label>
          <label class="overlay-dialog__input-group">
            <span>高</span>
            <input type="number" min="1" v-model.number="dialogH" :disabled="dialogAuto">
          </label>
        </div>

        <div class="overlay-dialog__footer">
          <button class="overlay-dialog__btn overlay-dialog__btn--ghost" type="button"
            @click="resetCanvasSize">恢复自动</button>
          <div style="flex:1"></div>
          <button class="overlay-dialog__btn overlay-dialog__btn--ghost" type="button"
            @click="showSizeDialog = false">取消</button>
          <button class="overlay-dialog__btn overlay-dialog__btn--primary" type="button"
            @click="applyCanvasSize">确定</button>
        </div>
      </div>
    </div>

    <!-- 节点整体大小 resize 手柄（右下角三角） -->
    <div
      class="overlay-card__node-resize"
      title="拖拽调整节点大小（最小 400×400）"
      @pointerdown.stop="onNodeResizeStart"
    ></div>
  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" title="图片叠加节点使用说明" @close="showHelp = false">
    <ImageOverlayHelpDialog />
  </HelpDialog>
</template>

<style scoped lang="less">
.overlay-card {
  box-sizing: border-box;
  width: 100%; height: 100%;
  overflow: visible; // 手柄、dialog 需要超出边界显示
  position: relative;
  display: flex; flex-direction: column;
  background: @color-surface;
  border: 1px solid #d5d9e0; border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  user-select: none;
  padding: 8px; gap: 6px;

  &__header {
    display: flex; align-items: baseline; gap: 6px;
    padding-bottom: 4px; border-bottom: 1px dashed #d5d9e0;
  }
  &__title { font-size: 12px; font-weight: 600; color: #4a7cff; letter-spacing: 0.5px; }
  &__sub { font-size: 11px; color: #9aa1ad; }

  &__gear {
    margin-left: auto;
    align-self: center;
    flex-shrink: 0;
    width: 22px; height: 22px;
    display: flex; align-items: center; justify-content: center;
    border: none; border-radius: 4px;
    background: transparent; color: #9aa1ad;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
    &:hover { background: #eef2ff; color: #4a7cff; }
  }

  // 帮助按钮沿用 code 节点的灰底圆问号外观
  &__help {
    all: unset;
    align-self: center;
    flex-shrink: 0;
    cursor: pointer;
    width: 18px; height: 18px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%;
    background: #f3f4f6; color: #6b7280;
    font-size: 12px; font-weight: 600; line-height: 1;
    transition: background 0.15s ease, color 0.15s ease;
    &:hover { background: #dbeafe; color: #2563eb; }
  }

  &__body { flex: 1; min-height: 0; display: flex; gap: 8px; overflow: hidden; }

  // 左端口列表
  &__port-list {
    flex-shrink: 0; width: 130px;
    display: flex; flex-direction: column; gap: 3px;
    overflow-y: auto; padding-right: 2px;
    &::-webkit-scrollbar { width: 3px; }
    &::-webkit-scrollbar-thumb { background: #d5d9e0; border-radius: 2px; }
  }

  &__port-item {
    display: flex; flex-direction: column; gap: 2px;
    padding: 4px; border: 1px solid #e5e7eb; border-radius: 4px;
    background: #f4f5f7; cursor: pointer;
    transition: border-color 0.15s ease, background 0.15s ease;

    &:hover { border-color: #c5d4ff; background: #eef2ff; }
    &.is-selected { border-color: #4a7cff; background: #e8eeff; }
    &.is-empty { opacity: 0.5; font-style: italic; }
  }

  &__port-row {
    display: flex; align-items: center; justify-content: space-between;
  }
  &__port-label { font-size: 10px; font-weight: 600; color: #4a7cff; }

  &__port-del {
    width: 16px; height: 16px;
    border: none; border-radius: 3px;
    background: transparent; color: #b5bac4;
    font-size: 14px; line-height: 1; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    padding: 0; flex-shrink: 0;
    transition: background 0.15s ease, color 0.15s ease;
    &:hover { background: #fee2e2; color: #ef4444; }
  }

  &__port-add {
    margin-top: 2px;
    flex-shrink: 0;
    height: 26px;
    border: 1px dashed #c5cbd4; border-radius: 4px;
    background: transparent; color: #4a7cff;
    font-size: 10px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    gap: 2px;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    &:hover { background: #eef2ff; border-color: #4a7cff; }
    &:active { transform: translateY(1px); }
  }

  &__port-thumb {
    width: 100%; height: 36px; border-radius: 3px;
    overflow: hidden; flex-shrink: 0;
    background: repeating-conic-gradient(#f4f5f7 0% 25%, #e8eaed 0% 50%) 50% / 8px 8px;
    display: flex; align-items: center; justify-content: center;
    img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; pointer-events: none; }
  }
  &__port-empty-svg { width: 18px; height: 18px; display: flex; }

  &__port-info { overflow: hidden; }
  &__port-name { font-size: 10px; color: #3d4551; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  &__port-name--empty { color: #b5bac4; font-style: italic; text-align: center; }
  &__port-size { font-size: 9px; color: #9aa1ad; }

  // 右画布
  &__preview {
    flex: 1; min-width: 0;
    background: repeating-conic-gradient(#f4f5f7 0% 25%, #e8eaed 0% 50%) 50% / 16px 16px;
    border: 1px solid #e5e7eb; border-radius: 6px;
    overflow: visible; display: flex; align-items: center; justify-content: center;
    position: relative;
  }
  &__preview-canvas {
    position: relative; background: #fff;
    box-shadow: 0 0 0 1px #c5cbd4;
  }
  &__preview-layer {
    position: absolute; cursor: move;
    img { width: 100%; height: 100%; object-fit: fill; display: block; pointer-events: none; }
    &.is-selected { outline: 2px solid #4a7cff; }
  }
  &__empty-hint { font-size: 12px; color: #9aa1ad; text-align: center; line-height: 1.6; font-style: italic; }

  // 四角 resize handle
  .resize-handle {
    position: absolute; width: 10px; height: 10px;
    background: #fff; border: 1.5px solid #4a7cff; border-radius: 2px; z-index: 10;
    &--tl { top: -5px; left: -5px; cursor: nwse-resize; }
    &--tr { top: -5px; right: -5px; cursor: nesw-resize; }
    &--bl { bottom: -5px; left: -5px; cursor: nesw-resize; }
    &--br { bottom: -5px; right: -5px; cursor: nwse-resize; }
  }

  // 底部
  &__footer {
    display: flex; align-items: center; gap: 8px;
    padding: 4px 8px; border: 1px solid #e5e7eb; border-radius: 6px;
    background: #fafbfc;
  }
  &__hint { flex: 1; font-size: 10px; color: #7a828f; }
  &__create-btn {
    flex-shrink: 0; padding: 3px 8px;
    border: 1px solid #4a7cff; border-radius: 4px;
    background: #4a7cff; color: #fff; font-size: 10px; cursor: pointer;
    transition: background 0.15s ease, transform 0.08s ease;
    &:hover { background: #3d6ce0; }
    &:active { transform: translateY(1px); }
  }

  // 节点整体 resize 手柄：右下角三角
  &__node-resize {
    position: absolute;
    right: -2px;
    bottom: -2px;
    width: 14px;
    height: 14px;
    cursor: nwse-resize;
    z-index: 5;
    background:
      linear-gradient(135deg, transparent 0%, transparent 45%, #c5cbd4 45%, #c5cbd4 55%, transparent 55%),
      linear-gradient(135deg, transparent 0%, transparent 60%, #c5cbd4 60%, #c5cbd4 70%, transparent 70%),
      linear-gradient(135deg, transparent 0%, transparent 75%, #c5cbd4 75%, #c5cbd4 85%, transparent 85%);
    border-bottom-right-radius: 8px;

    &:hover {
      background:
        linear-gradient(135deg, transparent 0%, transparent 40%, #4a7cff 40%, #4a7cff 50%, transparent 50%),
        linear-gradient(135deg, transparent 0%, transparent 55%, #4a7cff 55%, #4a7cff 65%, transparent 65%),
        linear-gradient(135deg, transparent 0%, transparent 70%, #4a7cff 70%, #4a7cff 80%, transparent 80%);
    }
  }
}

// —— 画布尺寸设置弹窗 ——
// 用 position: fixed + 相对节点绝对定位太复杂，这里让 dialog 直接固定在 overlay-card 内部
// 靠 &__body 的 z-index 让它盖在预览区上，mask 用半透明遮罩

:deep(.overlay-dialog) {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none; // 只有子元素接事件
}

:deep(.overlay-dialog__mask) {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(2px);
  border-radius: 8px;
  pointer-events: auto;
}

:deep(.overlay-dialog__panel) {
  position: relative;
  z-index: 1;
  background: #fff;
  border: 1px solid #d5d9e0;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  padding: 14px 16px;
  min-width: 260px;
  pointer-events: auto;
}

:deep(.overlay-dialog__title) {
  font-size: 13px;
  font-weight: 600;
  color: #3d4551;
  margin-bottom: 12px;
}

:deep(.overlay-dialog__row) {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

:deep(.overlay-dialog__label) {
  font-size: 12px;
  color: #7a828f;
  min-width: 40px;
}

:deep(.overlay-dialog__radios) {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #3d4551;
}

:deep(.overlay-dialog__radio) {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  input { accent-color: #4a7cff; cursor: pointer; }
}

:deep(.overlay-dialog__inputs) {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
  &.is-disabled { opacity: 0.5; }
}

:deep(.overlay-dialog__input-group) {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  span { font-size: 12px; color: #7a828f; }
  input {
    width: 80px;
    padding: 4px 6px;
    font-size: 12px;
    border: 1px solid #d5d9e0;
    border-radius: 4px;
    outline: none;
    transition: border-color 0.15s ease;
    &:focus:not(:disabled) { border-color: #4a7cff; }
    &:disabled { background: #f4f5f7; cursor: not-allowed; }
  }
}

:deep(.overlay-dialog__footer) {
  display: flex;
  align-items: center;
  gap: 8px;
}

:deep(.overlay-dialog__btn) {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.08s ease;

  &--ghost {
    background: transparent;
    border: 1px solid #d5d9e0;
    color: #3d4551;
    &:hover { background: #f4f5f7; border-color: #c5cbd4; }
  }

  &--primary {
    background: #4a7cff;
    border: 1px solid #4a7cff;
    color: #fff;
    &:hover { background: #3d6ce0; border-color: #3d6ce0; }
    &:active { transform: translateY(1px); }
  }
}
</style>
