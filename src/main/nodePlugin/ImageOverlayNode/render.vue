<script setup lang="ts">
import { computed, ref, watch, onUnmounted, reactive, nextTick } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { StringValue } from '../../engine/data/StringValue'
import { ImageOverlayNode, type LayerState, type LayerValue } from './node'
import { ImgFileNode } from '../ImgFileNode/node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import type { Edge } from '../../engine/graph/Edge'
import GearIcon from '@renderer/components/icons/GearIcon.vue'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import ImageOverlayHelpDialog from './ImageOverlayHelpDialog.vue'
import { messages } from './i18n'

// 卡片头部标题走插件 manifest 的多语言 title，未配当前语言时由 resolveNodeTitle 兜底
const nodeTitle = useNodeTitle(ImageOverlayNode.TYPE)

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)

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
const dialogW = ref(1920)
const dialogH = ref(1080)

watch(showSizeDialog, (open) => {
  if (!open) return
  const n = node.value
  if (!n) return
  dialogW.value = n.configuredCanvasWidth
  dialogH.value = n.configuredCanvasHeight
})

function applyCanvasSize(): void {
  const n = node.value
  if (!n) return
  n.setCanvasSize(dialogW.value, dialogH.value)
  showSizeDialog.value = false
  scheduleComposite()
}

function resetCanvasSize(): void {
  // 恢复默认固定画布尺寸，不再有"自动"模式
  dialogW.value = 1920
  dialogH.value = 1080
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
let pendingComposite = false  // 合成进行中又来了新请求，记下来等当前跑完再合成一次

// —— 各端口 id → 加载好的 HTMLImageElement ——
const loadedImages = new Map<string, HTMLImageElement>()

// —— 画布预览容器引用 ——
const previewAreaRef = ref<HTMLElement | null>(null)

// —— 预览缩放比 + 画布尺寸 ——
const fitScale = ref(1)      // 容器自适应算出的基础缩放
const zoomFactor = ref(1)    // 用户在预览区里额外设置的缩放倍数
const canvasSize = ref({ width: 1, height: 1 })

/** 合成后的 dataURL，预览区直接显示这张图，所见即所得 */
const compositeDataUrl = ref<string | null>(null)

const ZOOM_STEP = 1.2
const ZOOM_MIN_FACTOR = 0.1
const ZOOM_MAX_FACTOR = 8

// 最终展示缩放 = 自适应缩放 × 用户缩放
const previewScale = computed(() => {
  const s = fitScale.value * zoomFactor.value
  return s > 0 ? s : 1
})
const zoomPercent = computed(() => Math.round(previewScale.value * 100))

function zoomBy(factor: number): void {
  const n = node.value
  if (!n) return
  // 只允许缩小或等比，不允许放大到超过容器
  const maxFactor = Math.min(ZOOM_MAX_FACTOR, 1)
  const next = Math.max(ZOOM_MIN_FACTOR, Math.min(maxFactor, n.zoomFactor * factor))
  n.setZoomFactor(next)
}

function resetZoom(): void {
  node.value?.setZoomFactor(1)
}

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
  connected: boolean
  kind: 'image' | 'text'
  fingerprint: string     // 连接后才有
  state: LayerState | null  // 连接后才有
  // 图片图层专用
  fileName: string
  thumbnailUrl: string
  // 文本图层专用
  text: string
}
const layers = ref<LayerItem[]>([])
const thumbnailRevoke = new Map<string, () => void>()

function clearThumbnails(): void {
  thumbnailRevoke.forEach((fn) => fn())
  thumbnailRevoke.clear()
}

/** 从端口取当前连接的 Edge 和值，没有则返回 null */
function getPortValue(port: { incoming: Map<Edge, unknown> }): { edge: Edge; value: LayerValue } | null {
  for (const [edge, v] of port.incoming) {
    if (v instanceof ImgFileValue || v instanceof StringValue) return { edge, value: v }
  }
  return null
}

/** 用离屏 canvas 测一段文本的尺寸（像素） */
function measureText(text: string, fontSize: number, fontFamily: string): { width: number; height: number } {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return { width: fontSize * text.length * 0.6, height: fontSize * 1.2 }
  ctx.font = `${fontSize}px ${fontFamily}`
  const metrics = ctx.measureText(text)
  const width = Math.ceil(metrics.width)
  const height = Math.ceil(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) || Math.ceil(fontSize * 1.2)
  return { width: Math.max(width, 300), height: Math.max(height, 80) }
}

/**
 * 按给定最大宽度把文本拆成多行（支持 \n 硬换行 + 自动软换行）。
 * 优先按单词边界（空格）切，切不开再按字符切（适配中文）。
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (!text) return ['']
  // 按硬换行符先拆
  const paragraphs = text.split(/\r?\n/)
  const result: string[] = []
  for (const para of paragraphs) {
    if (para === '') { result.push(''); continue }
    // 单词边界切（中文段落没有空格 → words 只有一个元素 → 自然落到底下逐字拆分支）
    const words = para.split(/(\s+)/)
    let line = ''
    for (const word of words) {
      const testLine = line + word
      const fits = ctx.measureText(testLine).width <= maxWidth
      if (fits) {
        line = testLine
      } else {
        // 当前 line 装不下 word，先提交 line（如果 line 有内容）
        if (line) result.push(line.trimEnd())
        // word 本身就超宽（比如中文长串或长 URL）→ 按字符拆
        if (ctx.measureText(word).width > maxWidth) {
          let charLine = ''
          for (const ch of word) {
            const test = charLine + ch
            if (ctx.measureText(test).width <= maxWidth || charLine === '') {
              charLine = test
            } else {
              result.push(charLine)
              charLine = ch
            }
          }
          line = charLine
        } else {
          line = word
        }
      }
    }
    if (line) result.push(line.trimEnd())
  }
  return result
}

function refreshLayers(): void {
  const n = node.value
  if (!n) {
    layers.value = []
    canvasSize.value = { width: 1, height: 1 }
    return
  }

  canvasSize.value = n.compositeCanvasSize
  zoomFactor.value = n.zoomFactor

  const newLayers: LayerItem[] = []
  const seenPortIds = new Set<string>()

  n.inputPorts.forEach((port, idx) => {
    seenPortIds.add(port.id)
    const conn = getPortValue(port)
    if (!conn) {
      // 空端口：只显示占位
      newLayers.push({
        portId: port.id,
        portIndex: idx,
        connected: false,
        kind: 'image',
        fingerprint: '',
        state: null,
        fileName: '',
        thumbnailUrl: '',
        text: ''
      })
      return
    }

    // 已连接
    const { value } = conn
    const isImage = value instanceof ImgFileValue
    const kind: 'image' | 'text' = isImage ? 'image' : 'text'
    const state = n.getLayerState(port.id)
    if (!state) return // state 还没初始化过，跳过这一轮

    const newFp = value.fingerprint
    const prevLayer = layers.value.find((l) => l.portId === port.id)
    const fpChanged = prevLayer && prevLayer.fingerprint !== newFp
    const prevKind = prevLayer?.kind
    const kindChanged = prevKind !== undefined && prevKind !== kind
    // 只有前一次连接也是有效值时，fpChanged 才算"真的换了文件"（覆盖自然尺寸）。
    // 重启场景下 ImgFileNode commit 异步，会出现 prevLayer.fingerprint='' → 有值 的过渡，
    // 那不是文件内容变化，只是值晚到了，此时必须尊重 initialized 保留用户的手动尺寸。
    const prevConnected = prevLayer?.connected === true
    const shouldResetDims = (fpChanged && prevConnected) || kindChanged

    if (isImage) {
      // —— 图片图层：走原有 thumbnail + 预加载逻辑 ——
      const imgValue = value as ImgFileValue
      const file = imgValue.file!

      // 缩略图：fingerprint 或 kind 变了 → revoke 旧 URL + 重建
      let thumbUrl: string
      if (fpChanged || kindChanged) {
        const oldRevoke = thumbnailRevoke.get(port.id)
        if (oldRevoke) { oldRevoke(); thumbnailRevoke.delete(port.id) }
        const newUrl = URL.createObjectURL(file)
        thumbUrl = newUrl
        thumbnailRevoke.set(port.id, () => URL.revokeObjectURL(newUrl))
      } else if (thumbnailRevoke.has(port.id)) {
        thumbUrl = prevLayer?.thumbnailUrl ?? ''
      } else {
        const newUrl = URL.createObjectURL(file)
        thumbUrl = newUrl
        thumbnailRevoke.set(port.id, () => URL.revokeObjectURL(newUrl))
      }

      newLayers.push({
        portId: port.id,
        portIndex: idx,
        connected: true,
        kind: 'image',
        fingerprint: newFp,
        state: { ...state },
        fileName: file.name,
        thumbnailUrl: thumbUrl,
        text: ''
      })

      // 预加载 natural 尺寸
      if (shouldResetDims || !loadedImages.has(port.id)) {
        loadedImages.delete(port.id)
        loadImageFromFile(file).then((img) => {
          loadedImages.set(port.id, img)
          const s = n.getLayerState(port.id)
          if (s) {
            if (!s.initialized || shouldResetDims) {
              n.updateLayerTransform(port.id, {
                width: img.naturalWidth,
                height: img.naturalHeight,
                initialized: true
              })
            }
          }
        }).catch(() => {})
      }
    } else {
      // —— 文本图层：清理旧 thumbnail（如果之前是图片图层）+ 测文字尺寸 ——
      const textValue = value as StringValue
      const textContent = textValue.isNull ? '' : (textValue.value ?? '')

      // 如果之前是图片图层，清理旧的 thumbnail
      if (prevLayer && prevLayer.kind === 'image') {
        const oldRevoke = thumbnailRevoke.get(port.id)
        if (oldRevoke) { oldRevoke(); thumbnailRevoke.delete(port.id) }
      }
      loadedImages.delete(port.id)

      newLayers.push({
        portId: port.id,
        portIndex: idx,
        connected: true,
        kind: 'text',
        fingerprint: newFp,
        state: { ...state },
        fileName: '',
        thumbnailUrl: '',
        text: textContent
      })

      // 首次初始化时测一次文字尺寸，之后无论内容怎么变都不自动重算
      if (!state.initialized) {
        const fontSize = state.fontSize ?? 48
        const fontFamily = state.fontFamily ?? 'sans-serif'
        const { width, height } = measureText(textContent, fontSize, fontFamily)
        n.updateLayerTransform(port.id, {
          width,
          height,
          initialized: true
        })
      }
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

// —— 预览自适应缩放 ——
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
  fitScale.value = s > 0 ? s : 1
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
  if (compositing) {
    pendingComposite = true
    return
  }
  const n = node.value
  if (!n) return

  const key = n.compositeKey
  if (key === null) { n.imageOutput.clear(); compositeDataUrl.value = null; return }
  if (key === n.lastCompositeK) return

  compositing = true
  try {
    const orders = n.layerDrawOrders
    const canvasSize = n.compositeCanvasSize
    if (orders.length === 0) { n.imageOutput.clear(); return }

    // 图片图层：优先复用 loadedImages 缓存，缺失则异步加载
    // orders 正序是 layer-0→layer-N，但图层一要在最顶层，所以倒序画（先画的在下面）
    const drawOrders = orders.slice().reverse()
    const images: (HTMLImageElement | null)[] = []
    const pending: { idx: number; file: File }[] = []
    drawOrders.forEach((o, idx) => {
      if (o.value instanceof ImgFileValue) {
        const cached = loadedImages.get(o.portId)
        if (cached) images[idx] = cached
        else { images[idx] = null; pending.push({ idx, file: o.value.file! }) }
      } else {
        images[idx] = null // 文本图层占位
      }
    })

    if (pending.length > 0) {
      const urls: string[] = []
      const tasks = pending.map((p) => {
        const url = URL.createObjectURL(p.file)
        urls.push(url)
        return loadImageFromUrl(url).then((img) => {
          images[p.idx] = img
          loadedImages.set(drawOrders[p.idx].portId, img)
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

    for (let i = 0; i < drawOrders.length; i++) {
      const o = drawOrders[i]
      // 每一轮都从 node 读最新 state，确保样式变更（字号/颜色/对齐/背景）都能生效
      const s = n.getLayerState(o.portId) ?? o.state
      if (o.value instanceof ImgFileValue) {
        const img = images[i]
        if (!img) continue
        ctx.drawImage(img, s.x, s.y, s.width, s.height)
      } else if (o.value instanceof StringValue) {
        const text = o.value.isNull ? '' : (o.value.value ?? '')
        const fontSize = s.fontSize ?? 48
        const fontFamily = s.fontFamily ?? 'sans-serif'
        const color = s.color ?? '#000000'
        const align = s.textAlign ?? 'left'
        const bg = s.backgroundColor
        const TEXT_PADDING = 8
        // 先画背景矩形（如果设了背景色）
        if (bg) {
          ctx.fillStyle = bg
          ctx.fillRect(s.x, s.y, s.width, s.height)
        }
        ctx.font = `${fontSize}px ${fontFamily}`
        ctx.fillStyle = color
        ctx.textBaseline = 'top'
        ctx.textAlign = align
        // 多行自动换行绘制——文字内部缩进 TEXT_PADDING px
        const lineHeight = Math.ceil(fontSize * 1.2)
        const availWidth = Math.max(1, s.width - TEXT_PADDING * 2)
        const availHeight = Math.max(1, s.height - TEXT_PADDING * 2)
        const lines = wrapText(ctx, text, availWidth)
        for (let li = 0; li < lines.length; li++) {
          if (li * lineHeight > availHeight) break  // 超出可用高度停止绘制
          let x = s.x + TEXT_PADDING
          if (align === 'center') x = s.x + s.width / 2
          else if (align === 'right') x = s.x + s.width - TEXT_PADDING
          ctx.fillText(lines[li], x, s.y + TEXT_PADDING + li * lineHeight)
        }
      }
    }

    const dataUrl = canvas.toDataURL('image/png')
    // 预览和输出共用这同一张 canvas——所见即所得
    compositeDataUrl.value = dataUrl
    const comma = dataUrl.indexOf(',')
    const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
    const fileName = `overlay-${Date.now()}.png`
    n.setOutput(base64, fileName)
    n.markComposite(key)
  } catch {
    // 静默
  } finally {
    compositing = false
    // 合成期间又来了新请求——再合成一次，确保最终状态一致
    if (pendingComposite) {
      pendingComposite = false
      scheduleComposite()
    }
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

// —— 当前选中的文字图层（用于显示文字工具栏）——
const selectedTextLayer = computed(() => {
  if (!selectedPortId.value) return null
  const layer = layers.value.find((l) => l.portId === selectedPortId.value)
  if (layer && layer.connected && layer.kind === 'text') return layer
  return null
})

function updateTextStyle(portId: string, partial: Partial<{ fontSize: number; color: string; textAlign: 'left' | 'center' | 'right'; backgroundColor: string | undefined }>): void {
  node.value?.updateLayerTransform(portId, partial)
  scheduleComposite()
}
</script>

<template>
  <div class="overlay-card" @pointerdown="startDrag">
    <!-- 头部 -->
    <div class="overlay-card__header">
      <span class="overlay-card__title">{{ nodeTitle }}</span>
      <span class="overlay-card__sub">{{ t('portSummary', { total: layers.length, connected: layers.filter(l => l.connected).length }) }}</span>
      <button
        class="overlay-card__gear"
        type="button"
        :title="t('canvasSizeTitle')"
        @pointerdown.stop
        @click="showSizeDialog = true"
      >
        <GearIcon :size="14" />
      </button>
      <button
        class="overlay-card__help"
        type="button"
        :title="t('helpTitle')"
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
            <div class="overlay-card__port-label">{{ t('layerLabel', { n: layer.portIndex + 1 }) }}</div>
            <button
              v-if="layer.connected && layer.portIndex === layers.length - 1 && layers.length > 1"
              class="overlay-card__port-del"
              type="button"
              :title="t('removeLayerHint')"
              @pointerdown.stop
              @click="onRemoveLayer($event, layer.portId)"
            >×</button>
          </div>
          <div class="overlay-card__port-thumb">
            <img v-if="layer.connected && layer.kind === 'image'" :src="layer.thumbnailUrl" :alt="layer.fileName" draggable="false" />
            <div v-else-if="layer.connected && layer.kind === 'text'" class="overlay-card__port-text-thumb">
              {{ layer.text.slice(0, 12) || '(空文字)' }}
            </div>
            <div v-else class="overlay-card__port-empty-svg">
              <svg viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" rx="2" fill="none" stroke="#c5cbd4" stroke-width="1"/><path d="M5 12L7 9L8 10L11 6L13 12H5Z" fill="#c5d4ff" stroke="#4a7cff" stroke-width="0.8" stroke-linejoin="round"/><circle cx="10.5" cy="5" r="1" fill="#4a7cff"/></svg>
            </div>
          </div>
          <div v-if="layer.connected" class="overlay-card__port-info">
            <div
              class="overlay-card__port-name"
              :title="layer.kind === 'image' ? layer.fileName : layer.text"
            >{{ layer.kind === 'image' ? layer.fileName : (layer.text.slice(0, 16) || '(空文字)') }}</div>
            <div class="overlay-card__port-size">{{ layer.state?.width }}×{{ layer.state?.height }}</div>
          </div>
          <div v-else class="overlay-card__port-info">
            <div class="overlay-card__port-name overlay-card__port-name--empty">{{ t('notConnected') }}</div>
          </div>
        </div>

        <!-- 添加图层按钮 -->
        <button
          class="overlay-card__port-add"
          type="button"
          :title="t('addLayerHint')"
          @pointerdown.stop
          @click="handleAddLayer"
        >{{ t('addLayer') }}</button>
      </div>

      <!-- 右面板：画布预览 + 层内拖拽缩放 -->
      <div ref="previewAreaRef" class="overlay-card__preview" @pointerdown.stop="selectedPortId = null">
        <!-- 顶部工具条：文字样式工具栏 + 缩放控件 -->
        <div
          v-if="layers.some(l => l.connected)"
          class="overlay-card__preview-topbar"
          @pointerdown.stop
          @wheel.stop
        >
          <!-- 文字样式工具栏（选中文字图层时显示，横向） -->
          <div
            v-if="selectedTextLayer"
            class="overlay-card__text-toolbar"
          >
            <!-- 字号 -->
            <label class="overlay-card__tb-row">
              <span class="overlay-card__tb-label">字号</span>
              <input
                type="number"
                min="8"
                max="200"
                :value="selectedTextLayer.state?.fontSize ?? 48"
                @input="updateTextStyle(selectedTextLayer!.portId, { fontSize: Number(($event.target as HTMLInputElement).value) })"
              >
              <span class="overlay-card__tb-unit">px</span>
            </label>

            <!-- 颜色 -->
            <label class="overlay-card__tb-row">
              <span class="overlay-card__tb-label">颜色</span>
              <input
                type="color"
                :value="selectedTextLayer.state?.color ?? '#000000'"
                @input="updateTextStyle(selectedTextLayer!.portId, { color: ($event.target as HTMLInputElement).value })"
              >
            </label>

            <!-- 背景 -->
            <label class="overlay-card__tb-row">
              <span class="overlay-card__tb-label">背景</span>
              <input
                type="color"
                :value="selectedTextLayer.state?.backgroundColor ?? '#ffffff'"
                :style="{ opacity: selectedTextLayer.state?.backgroundColor ? 1 : 0.4 }"
                @input="updateTextStyle(selectedTextLayer!.portId, { backgroundColor: ($event.target as HTMLInputElement).value })"
              >
              <button
                v-if="selectedTextLayer.state?.backgroundColor"
                class="overlay-card__tb-clear-bg"
                type="button"
                title="清除背景"
                @click="updateTextStyle(selectedTextLayer!.portId, { backgroundColor: undefined })"
              >×</button>
            </label>

            <!-- 对齐 -->
            <div class="overlay-card__tb-row">
              <span class="overlay-card__tb-label">对齐</span>
              <div class="overlay-card__tb-align">
                <button
                  class="overlay-card__tb-align-btn"
                  :class="{ 'is-active': (selectedTextLayer.state?.textAlign ?? 'left') === 'left' }"
                  type="button"
                  title="左对齐"
                  @click="updateTextStyle(selectedTextLayer!.portId, { textAlign: 'left' })"
                >
                  <svg viewBox="0 0 16 16" width="12" height="12"><path d="M2 3h12M2 6h8M2 9h12M2 12h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>
                </button>
                <button
                  class="overlay-card__tb-align-btn"
                  :class="{ 'is-active': (selectedTextLayer.state?.textAlign ?? 'left') === 'center' }"
                  type="button"
                  title="居中"
                  @click="updateTextStyle(selectedTextLayer!.portId, { textAlign: 'center' })"
                >
                  <svg viewBox="0 0 16 16" width="12" height="12"><path d="M2 3h12M4 6h8M2 9h12M4 12h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>
                </button>
                <button
                  class="overlay-card__tb-align-btn"
                  :class="{ 'is-active': (selectedTextLayer.state?.textAlign ?? 'left') === 'right' }"
                  type="button"
                  title="右对齐"
                  @click="updateTextStyle(selectedTextLayer!.portId, { textAlign: 'right' })"
                >
                  <svg viewBox="0 0 16 16" width="12" height="12"><path d="M2 3h12M6 6h8M2 9h12M6 12h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>
                </button>
              </div>
            </div>
          </div>

          <div style="flex: 1"></div>
        </div>

        <div
          v-if="layers.some(l => l.connected) || compositeDataUrl"
          class="overlay-card__preview-canvas"
          :style="{
            width: canvasToDom(canvasSize.width) + 'px',
            height: canvasToDom(canvasSize.height) + 'px'
          }"
        >
          <!-- 底层：合成后的完整图片——预览和输出共用同一张 canvas，所见即所得 -->
          <img
            v-if="compositeDataUrl"
            class="overlay-card__preview-composite"
            :src="compositeDataUrl"
            :width="canvasSize.width"
            :height="canvasSize.height"
            draggable="false"
          />
          <!-- 上层：交互壳子——只负责选中态 outline + resize handle，不渲染图层内容 -->
          <div
            v-for="layer in layers.filter(l => l.connected).slice().reverse()"
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
            <template v-if="selectedPortId === layer.portId">
              <div class="resize-handle resize-handle--tl" @pointerdown.stop="onResizeHandlePointerDown($event, layer.portId, 'tl')"></div>
              <div class="resize-handle resize-handle--tr" @pointerdown.stop="onResizeHandlePointerDown($event, layer.portId, 'tr')"></div>
              <div class="resize-handle resize-handle--bl" @pointerdown.stop="onResizeHandlePointerDown($event, layer.portId, 'bl')"></div>
              <div class="resize-handle resize-handle--br" @pointerdown.stop="onResizeHandlePointerDown($event, layer.portId, 'br')"></div>
            </template>
          </div>
        </div>
        <div v-else class="overlay-card__empty-hint">{{ t('emptyHint') }}</div>
        <!-- 缩放控件 -->
        <div class="overlay-card__preview-zoom">
          <button
            class="overlay-card__preview-zoom-btn"
            type="button"
            :title="t('zoomOutTitle')"
            @click="zoomBy(1 / ZOOM_STEP)"
          >−</button>
          <button
            class="overlay-card__preview-zoom-pct"
            type="button"
            :title="t('resetZoomTitle')"
            @click="resetZoom"
          >{{ zoomPercent }}%</button>
          <button
            class="overlay-card__preview-zoom-btn"
            type="button"
            :title="t('zoomInTitle')"
            @click="zoomBy(ZOOM_STEP)"
          >＋</button>
        </div>
      </div>
    </div>

    <!-- 底部 -->
    <div class="overlay-card__footer">
      <span class="overlay-card__hint">
        {{ layers.filter(l => l.connected).length }}/{{ layers.length }} · {{ canvasSize.width }}×{{ canvasSize.height }} · {{ t('pngTransparent') }}
      </span>
      <button
        v-if="layers.filter(l => l.connected).length > 0"
        class="overlay-card__create-btn"
        type="button"
        @pointerdown.stop
        @click="handleCreateImgNode"
      >
        {{ t('createNode') }}
      </button>
    </div>

    <!-- 画布尺寸设置弹窗（fixed 定位在节点上方居中） -->
    <div v-if="showSizeDialog" class="overlay-dialog" @pointerdown.stop>
      <div class="overlay-dialog__mask" @click="showSizeDialog = false"></div>
      <div class="overlay-dialog__panel">
        <div class="overlay-dialog__title">{{ t('canvasSizeDialogTitle') }}</div>

        <div class="overlay-dialog__inputs">
          <label class="overlay-dialog__input-group">
            <span>{{ t('widthLabel') }}</span>
            <input type="number" min="1" v-model.number="dialogW">
          </label>
          <label class="overlay-dialog__input-group">
            <span>{{ t('heightLabel') }}</span>
            <input type="number" min="1" v-model.number="dialogH">
          </label>
        </div>

        <div class="overlay-dialog__footer">
          <button class="overlay-dialog__btn overlay-dialog__btn--ghost" type="button"
            @click="resetCanvasSize">1920×1080</button>
          <div style="flex:1"></div>
          <button class="overlay-dialog__btn overlay-dialog__btn--ghost" type="button"
            @click="showSizeDialog = false">{{ t('cancel') }}</button>
          <button class="overlay-dialog__btn overlay-dialog__btn--primary" type="button"
            @click="applyCanvasSize">{{ t('confirm') }}</button>
        </div>
      </div>
    </div>

    <!-- 节点整体大小 resize 手柄（右下角三角） -->
    <div
      class="overlay-card__node-resize"
      :title="t('resizeNodeHint')"
      @pointerdown.stop="onNodeResizeStart"
    ></div>
  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
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

  // 预览顶部工具条
  &__preview-topbar {
    position: absolute;
    top: 2px;
    left: 2px;
    right: 2px;
    z-index: 20;
    display: flex; align-items: center; gap: 8px;
    padding: 2px 6px;
    border: 1px solid #d5d9e0; border-radius: 6px;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  }

  // 文字样式工具栏（横向，放在预览顶部）
  &__text-toolbar {
    flex-shrink: 0;
    display: flex; align-items: center; gap: 8px;
    padding: 0;
    border: none; border-radius: 0;
    background: transparent;
  }

  &__tb-row {
    display: flex; align-items: center; gap: 4px;
  }
  &__tb-label {
    font-size: 10px; color: #7a828f;
    flex-shrink: 0;
  }
  &__tb-row input[type="number"] {
    width: 40px; padding: 2px 3px;
    font-size: 11px; color: #3d4551;
    border: 1px solid #d5d9e0; border-radius: 3px;
    outline: none;
    transition: border-color 0.15s ease;
    &:focus { border-color: #4a7cff; }
  }
  &__tb-unit {
    font-size: 9px; color: #9aa1ad; flex-shrink: 0;
  }
  &__tb-row input[type="color"] {
    width: 26px; height: 18px; padding: 0;
    border: 1px solid #d5d9e0; border-radius: 3px;
    background: transparent; cursor: pointer;
    &::-webkit-color-swatch-wrapper { padding: 1px; }
    &::-webkit-color-swatch { border: none; border-radius: 2px; }
  }
  &__tb-clear-bg {
    width: 16px; height: 16px;
    border: none; border-radius: 3px;
    background: transparent; color: #b5bac4;
    font-size: 12px; line-height: 1; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    padding: 0; flex-shrink: 0;
    transition: background 0.15s ease, color 0.15s ease;
    &:hover { background: #fee2e2; color: #ef4444; }
  }
  &__tb-align {
    display: flex; gap: 1px;
  }
  &__tb-align-btn {
    width: 20px; height: 18px;
    display: flex; align-items: center; justify-content: center;
    border: 1px solid #e5e7eb;
    background: #f8f9fa; color: #7a828f;
    border-radius: 3px; cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
    &:hover { background: #eef2ff; color: #4a7cff; border-color: #c5d4ff; }
    &.is-active {
      background: #4a7cff; color: #fff; border-color: #4a7cff;
      &:hover { background: #3d6ce0; border-color: #3d6ce0; }
    }
  }

  &__port-thumb {
    width: 100%; height: 36px; border-radius: 3px;
    overflow: hidden; flex-shrink: 0;
    background: repeating-conic-gradient(#f4f5f7 0% 25%, #e8eaed 0% 50%) 50% / 8px 8px;
    display: flex; align-items: center; justify-content: center;
    img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; pointer-events: none; }
  }
  &__port-text-thumb {
    max-width: 100%; font-size: 10px; color: #3d4551;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    padding: 2px 4px; line-height: 1.2;
    background: #fff; border-radius: 2px;
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
    overflow: hidden; display: flex; align-items: center; justify-content: center;
    position: relative;
  }

  // 预览缩放控件：现在放在 topbar 里，不再单独 absolute
  &__preview-zoom {
    position: absolute;
    right: 8px;
    bottom: 8px;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 0;
    border: none; border-radius: 0;
    background: transparent;
    box-shadow: none;
    flex-shrink: 0;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  }
  &__preview-zoom-btn {
    width: 20px; height: 20px; padding: 0;
    display: flex; align-items: center; justify-content: center;
    border: none; border-radius: 4px;
    background: transparent; color: #3d4551;
    font-size: 13px; line-height: 1; cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
    &:hover { background: #eef2ff; color: #4a7cff; }
  }
  &__preview-zoom-pct {
    min-width: 36px; height: 20px; padding: 0 3px;
    display: flex; align-items: center; justify-content: center;
    border: none; border-radius: 4px;
    background: transparent; color: #7a828f;
    font-size: 10px; line-height: 1; cursor: pointer;
    font-variant-numeric: tabular-nums;
    transition: background 0.15s ease, color 0.15s ease;
    &:hover { background: #eef2ff; color: #4a7cff; }
  }
  &__preview-canvas {
    position: relative; background: #fff;
    box-shadow: 0 0 0 1px #c5cbd4;
  }
  &__preview-composite {
    position: absolute; top: 0; left: 0;
    width: 100%; height: 100%;
    display: block; pointer-events: none; user-select: none;
  }
  &__preview-layer {
    position: absolute; cursor: move;
    background: transparent;
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
