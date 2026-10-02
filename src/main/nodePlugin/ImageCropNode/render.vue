<script setup lang="ts">
import { computed, ref, watch, onUnmounted, onMounted } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { ImageCropNode, type CropRect } from './node'
import { ImgFileNode } from '../ImgFileNode/node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import ImageCropHelpDialog from './ImageCropHelpDialog.vue'
import { messages } from './i18n'

// 卡片头部标题走插件 manifest 的多语言 title，未配当前语言时由 resolveNodeTitle 兜底
const nodeTitle = useNodeTitle(ImageCropNode.TYPE)

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)

const props = defineProps<{ id: string }>()

const node = computed(() => {
  const n = workspaceScene.getNode(props.id)
  return n instanceof ImageCropNode ? n : undefined
})

// —— 拖拽：裁剪节点自身也参与画布移动 ——
const { startDrag } = useNodePosition(() => node.value)

// —— 帮助浮层开关（弹窗壳由 HelpDialog 负责）——
const showHelp = ref(false)

// —— 裁剪源图加载 ——
const sourceUrl = ref<string | null>(null)
let revokeSourceUrl: (() => void) | null = null

function clearSource(): void {
  if (revokeSourceUrl) {
    revokeSourceUrl()
    revokeSourceUrl = null
  }
  sourceUrl.value = null
}

/** 结果预览 */
const resultUrl = ref<string | null>(null)
let revokeResultUrl: (() => void) | null = null

function clearResult(): void {
  if (revokeResultUrl) {
    revokeResultUrl()
    revokeResultUrl = null
  }
  resultUrl.value = null
}

function refreshResult(n: ImageCropNode | undefined): void {
  clearResult()
  if (!n) return
  const value = n.imageOutput.value
  if (value instanceof ImgFileValue) {
    const url = URL.createObjectURL(value.file)
    resultUrl.value = url
    revokeResultUrl = () => URL.revokeObjectURL(url)
  }
}

/** 当前裁剪框（原图像素坐标） */
const cropRect = ref<CropRect | null>(null)

/** 自动裁剪开关：开启后拖动裁剪框结束 / 源图加载完成时自动执行裁剪 */
const autoCrop = ref(false)

function onAutoCropToggle(): void {
  if (autoCrop.value) handleCrop()
}

/** 原图尺寸（像素）。由模板 <img> 的 @load 事件回写 */
const naturalSize = ref<{ w: number; h: number }>({ w: 0, h: 0 })

/**
 * <img> 在 canvas-area 内的实际展示参数。
 * object-fit: contain 后，img 不一定贴 wrapper 左上角（会居中），
 * 所以 crop-box 定位必须加 offset。
 *
 * 只在 img load 或容器 resize 时测量一次，**不是高频 computed**。
 */
const imgDisplay = ref({
  scale: 1,        // img.clientWidth / naturalWidth
  offsetLeft: 0,   // img 左边相对于 canvas-area 左边的偏移
  offsetTop: 0,
  cssW: 0,         // img 实际 CSS 尺寸
  cssH: 0
})

/**
 * 测量 <img> 在 canvas-area 内的实际展示参数。
 * 只在 img load / 容器 resize 时调用，不是高频路径。
 */
/**
 * 计算 <img> 在 canvas-area 内的实际展示参数（纯数学，与 object-fit:contain 公式一致）。
 * 不测量 img 元素本身——img 用 width/height:100%，其元素 box = 容器 box，
 * 但内容区是 contain 缩放后的居中矩形，这里复算同一个公式即可。
 * 只在 img load / 容器 resize 时调用，不是高频路径。
 */
function measureImgDisplay(): void {
  const areaEl = canvasAreaRef.value
  const { w: nw, h: nh } = naturalSize.value
  if (!areaEl || !nw || !nh) return
  const cw = areaEl.clientWidth
  const ch = areaEl.clientHeight
  if (!cw || !ch) return
  const scale = Math.min(cw / nw, ch / nh)
  const cssW = nw * scale
  const cssH = nh * scale
  imgDisplay.value = {
    scale,
    offsetLeft: (cw - cssW) / 2,
    offsetTop: (ch - cssH) / 2,
    cssW,
    cssH
  }
}

/** 模板 ref：canvas-area 容器 */
const canvasAreaRef = ref<HTMLElement | null>(null)

/**
 * 裁剪框 CSS 样式（px 值）。
 * 原图像素坐标 → CSS 像素：rect.xxx * scale + offset
 */
const cropBoxStyle = computed(() => {
  const rect = cropRect.value
  const d = imgDisplay.value
  if (!rect || !d.cssW) return { display: 'none' as const }
  return {
    left: `${d.offsetLeft + rect.x * d.scale}px`,
    top: `${d.offsetTop + rect.y * d.scale}px`,
    width: `${rect.w * d.scale}px`,
    height: `${rect.h * d.scale}px`,
    display: 'block' as const
  }
})

/** 把 cropRect clamp 到原图范围内（w/h 最小 1px） */
function clampRect(r: CropRect, nw: number, nh: number): CropRect {
  const maxX = Math.max(0, nw - 1)
  const maxY = Math.max(0, nh - 1)
  const x = Math.round(Math.max(0, Math.min(r.x, maxX)))
  const y = Math.round(Math.max(0, Math.min(r.y, maxY)))
  const w = Math.round(Math.max(1, Math.min(r.w, nw - x)))
  const h = Math.round(Math.max(1, Math.min(r.h, nh - y)))
  return { x, y, w, h }
}

/** <img> load 事件：拿到 naturalWidth/Height + 测量展示参数 */
function onSourceImgLoad(e: Event): void {
  const imgEl = e.target as HTMLImageElement
  naturalSize.value = { w: imgEl.naturalWidth, h: imgEl.naturalHeight }

  // 优先用持久化的 cropRect，否则全图默认
  const n = node.value
  const nw = imgEl.naturalWidth
  const nh = imgEl.naturalHeight
  if (n?.cropRect) {
    cropRect.value = clampRect(n.cropRect, nw, nh)
  } else {
    cropRect.value = { x: 0, y: 0, w: nw, h: nh }
    n?.setCropRect(cropRect.value)
  }

  // img load 完成后测一次展示参数
  measureImgDisplay()

  // 自动裁剪开启时，源图就绪后自动裁剪一次。
  // 拖动进行中不触发——拖动会通过 setCropRect → notifyChanged → img 重载间接触发本回调，
  // 若此处也裁剪，会在拖动过程中反复裁剪。
  if (autoCrop.value && !dragMode) handleCrop()
}

// —— ResizeObserver：canvas-area 尺寸变化时重测 img 展示参数 ——
let resizeObserver: ResizeObserver | null = null

function setupResizeObserver(): void {
  if (resizeObserver || !canvasAreaRef.value) return
  resizeObserver = new ResizeObserver(() => {
    measureImgDisplay()
  })
  resizeObserver.observe(canvasAreaRef.value)
}

function teardownResizeObserver(): void {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
}

// —— 裁剪框交互 ——
type DragMode = null | 'move' | 'se-resize' | 'sw-resize' | 'ne-resize' | 'nw-resize' | 'e-resize' | 'w-resize' | 'n-resize' | 's-resize'
let dragMode: DragMode = null
let dragStart: { pointerX: number; pointerY: number; rect: CropRect; scale: number } | null = null

function onCropBoxPointerDown(e: PointerEvent): void {
  e.stopPropagation()
  e.preventDefault()
  const rect = cropRect.value
  if (!rect) return
  dragMode = 'move'
  dragStart = { pointerX: e.clientX, pointerY: e.clientY, rect: { ...rect }, scale: imgDisplay.value.scale }
  window.addEventListener('pointermove', onGlobalPointerMove)
  window.addEventListener('pointerup', onGlobalPointerUp)
}

function onHandlePointerDown(e: PointerEvent, handle: 'se' | 'sw' | 'ne' | 'nw' | 'e' | 'w' | 'n' | 's'): void {
  e.stopPropagation()
  e.preventDefault()
  const rect = cropRect.value
  if (!rect) return
  dragMode = `${handle}-resize` as DragMode
  dragStart = { pointerX: e.clientX, pointerY: e.clientY, rect: { ...rect }, scale: imgDisplay.value.scale }
  window.addEventListener('pointermove', onGlobalPointerMove)
  window.addEventListener('pointerup', onGlobalPointerUp)
}

function onGlobalPointerMove(e: PointerEvent): void {
  if (!dragMode || !dragStart) return
  const nw = naturalSize.value.w
  const nh = naturalSize.value.h
  if (!nw || !nh || !dragStart.scale) return

  const dx = (e.clientX - dragStart.pointerX) / dragStart.scale
  const dy = (e.clientY - dragStart.pointerY) / dragStart.scale

  let r = { ...dragStart.rect }

  switch (dragMode) {
    case 'move':
      r.x += dx; r.y += dy
      break
    case 'se-resize':
      r.w += dx; r.h += dy
      break
    case 'e-resize':
      r.w += dx
      break
    case 's-resize':
      r.h += dy
      break
    case 'sw-resize':
      r.w -= dx; r.x += dx; r.h += dy
      break
    case 'w-resize':
      r.w -= dx; r.x += dx
      break
    case 'ne-resize':
      r.w += dx; r.h -= dy; r.y += dy
      break
    case 'n-resize':
      r.h -= dy; r.y += dy
      break
    case 'nw-resize':
      r.w -= dx; r.x += dx; r.h -= dy; r.y += dy
      break
  }

  // 归一化：w/h 不能为负
  if (r.w < 1) { r.x += r.w - 1; r.w = 1 }
  if (r.h < 1) { r.y += r.h - 1; r.h = 1 }

  if (dragMode === 'move') {
    // 移动：只 clamp 位置，尺寸保持不变（clampRect 会缩宽度，不能用于 move）
    r.w = dragStart.rect.w
    r.h = dragStart.rect.h
    r.x = Math.max(0, Math.min(r.x, nw - r.w))
    r.y = Math.max(0, Math.min(r.y, nh - r.h))
    cropRect.value = { x: Math.round(r.x), y: Math.round(r.y), w: r.w, h: r.h }
    node.value?.setCropRect(cropRect.value)
    return
  }

  const clamped = clampRect(r, nw, nh)
  cropRect.value = clamped
  node.value?.setCropRect(clamped)
}

function onGlobalPointerUp(): void {
  const wasDragging = dragMode !== null
  dragMode = null
  dragStart = null
  window.removeEventListener('pointermove', onGlobalPointerMove)
  window.removeEventListener('pointerup', onGlobalPointerUp)
  // 自动裁剪开启时，拖动/缩放结束后自动执行裁剪
  if (wasDragging && autoCrop.value) handleCrop()
}

// —— 裁剪执行 ——
let cropping = false

const JPEG_QUALITY = 0.92

function extForMime(mime: string): string {
  if (mime === 'image/jpeg') return '.jpg'
  if (mime === 'image/webp') return '.webp'
  return '.png'
}

function baseName(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot > 0 ? fileName.slice(0, dot) : fileName
}

/** 执行裁剪，commit imageOutput，resolve 裁剪后的 File（失败为 null） */
function runCrop(): Promise<File | null> {
  if (cropping) return Promise.resolve(null)
  const n = node.value
  const src = n?.cropSource
  const rect = cropRect.value
  const nw = naturalSize.value.w
  const nh = naturalSize.value.h
  if (!n || !src || !rect || !nw || !nh) return Promise.resolve(null)

  const fileUrl = sourceUrl.value
  if (!fileUrl) return Promise.resolve(null)

  cropping = true
  const img = new Image()
  return new Promise<File | null>((resolve) => {
    img.onload = () => {
      try {
        const finalRect = clampRect(rect, img.naturalWidth, img.naturalHeight)
        const canvas = document.createElement('canvas')
        canvas.width = finalRect.w
        canvas.height = finalRect.h
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(null); return }
        ctx.drawImage(img, finalRect.x, finalRect.y, finalRect.w, finalRect.h, 0, 0, finalRect.w, finalRect.h)

        const mime = src.file.type || 'image/png'
        const dataUrl = mime === 'image/jpeg' ? canvas.toDataURL(mime, JPEG_QUALITY) : canvas.toDataURL(mime)
        const comma = dataUrl.indexOf(',')
        const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
        const fileName = `${baseName(src.file.name)}-cropped${extForMime(mime)}`

        n.setOutput(base64, mime, fileName)
        const rectHash = JSON.stringify(finalRect)
        n.markCropped(src.fingerprint, rectHash)
        refreshResult(n)
        const value = n.imageOutput.value
        resolve(value instanceof ImgFileValue ? value.file : null)
      } finally {
        cropping = false
      }
    }
    img.onerror = () => { cropping = false; resolve(null) }
    img.src = fileUrl
  })
}

/** 去重：源图 fingerprint + cropRect 都没变 → 跳过 */
function handleCrop(): void {
  const n = node.value
  if (!n || cropping) return
  const src = n.cropSource
  const rect = cropRect.value
  if (!src || !rect) return

  const rectHash = JSON.stringify(clampRect(rect, naturalSize.value.w, naturalSize.value.h))
  const fpChanged = src.fingerprint !== n.lastCroppedFp
  const rectChanged = rectHash !== n.lastCroppedRect
  if (!fpChanged && !rectChanged && !n.pendingSource) return

  void runCrop().then(() => {
    if (n.pendingSource) n.clearPending()
  })
}

/** File → base64 字符串 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/** 一键：先裁剪（commit imageOutput），再写出文件 + 生成图片文件节点 */
async function handleCropAndGenerate(): Promise<void> {
  const n = node.value
  if (!n) return

  // 1. 执行裁剪，保证 imageOutput 是当前裁剪框的结果
  const croppedFile = await runCrop()
  if (n.pendingSource) n.clearPending()

  // 2. 取裁剪结果文件（runCrop 失败时回退到已有输出）
  const value = n.imageOutput.value
  const file = croppedFile ?? (value instanceof ImgFileValue ? value.file : undefined)
  if (!file) return

  // 3. 写出文件 + 新建图片文件节点
  const base64 = await fileToBase64(file)
  // @ts-ignore — 运行时 preload 注入
  const written = await window.fileApi.writeBuffer(file.name, base64)

  const [cx, cy] = n.position
  const [cw, ch] = n.box
  const newNode = new ImgFileNode(
    `${ImgFileNode.TYPE}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  )
  // 生成在裁剪节点正下方（留 24px 间距），避免重叠
  newNode.setPosition(cx + cw - 150, cy + ch + 8)
  newNode.setFile(written.fileName, written.size)
  workspaceScene.addNode(newNode)
}

// —— 订阅 node.onChanged ——
let unsubscribe: (() => void) | undefined

watch(
  node,
  (n) => {
    unsubscribe?.()
    unsubscribe = n?.onChanged(() => {
      // 刷新源图 URL（让模板里的 <img> 重新 load → 触发 onSourceImgLoad）
      clearSource()
      clearResult()
      teardownResizeObserver()
      const src = n?.cropSource
      if (src) {
        const url = URL.createObjectURL(src.file)
        sourceUrl.value = url
        revokeSourceUrl = () => URL.revokeObjectURL(url)
      }
    })

    // 初始化
    clearSource()
    clearResult()
    teardownResizeObserver()
    cropRect.value = null
    naturalSize.value = { w: 0, h: 0 }
    imgDisplay.value = { scale: 1, offsetLeft: 0, offsetTop: 0, cssW: 0, cssH: 0 }

    const src = n?.cropSource
    if (src) {
      const url = URL.createObjectURL(src.file)
      sourceUrl.value = url
      revokeSourceUrl = () => URL.revokeObjectURL(url)
    }
  },
  { immediate: true, flush: 'sync' }
)

// —— mount 后 setup ResizeObserver ——
onMounted(() => {
  setupResizeObserver()
  // mount 后 canvas-area 有尺寸了，再测一次
  setTimeout(() => measureImgDisplay(), 0)
})

onUnmounted(() => {
  unsubscribe?.()
  clearSource()
  clearResult()
  teardownResizeObserver()
})
</script>

<template>
  <div class="crop-card" @pointerdown="startDrag" :title="t('dragHint')">
    <!-- 头部类型标签 -->
    <div class="crop-card__header">
      <span class="crop-card__header-title">{{ nodeTitle }}</span>
      <button
        class="crop-card__help"
        type="button"
        :title="t('helpTitle')"
        @pointerdown.stop
        @click.stop="showHelp = true"
      >?</button>
    </div>

    <!-- 源图 + 裁剪框 -->
    <div ref="canvasAreaRef" class="crop-card__canvas-area">
      <!-- 无源图占位 -->
      <div v-if="!sourceUrl" class="crop-card__placeholder">
        <svg class="crop-card__icon-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="10" width="48" height="44" rx="6" fill="#f4f5f7" stroke="#c5cbd4" stroke-width="1.5" />
          <path d="M14 46L26 34L34 42L44 30L52 46H14Z" fill="#c5d4ff" stroke="#4a7cff" stroke-width="1.5" stroke-linejoin="round" />
          <circle cx="40" cy="20" r="4" fill="#4a7cff" />
          <rect x="20" y="18" width="24" height="20" fill="none" stroke="#ff7a45" stroke-width="2" stroke-dasharray="3,3" />
        </svg>
        <span class="crop-card__placeholder-text">{{ t('placeholder') }}</span>
      </div>

      <!-- 有源图：img 用 object-fit: contain 保比例，crop-box 用 imgDisplay 偏移对齐 -->
      <template v-else>
        <!-- 源图：width/height:100% + object-fit:contain，
             长边撑满容器，短边等比缩放，浏览器自动居中 -->
        <img
          class="source-img"
          :src="sourceUrl"
          :alt="t('sourceAlt')"
          draggable="false"
          @load="onSourceImgLoad"
        />

        <!-- 裁剪框：绝对定位在 canvas-area 里，像素坐标（含 offset） -->
        <div
          v-if="cropRect && imgDisplay.cssW"
          class="crop-box"
          :style="cropBoxStyle"
          @pointerdown="onCropBoxPointerDown"
        >
          <!-- 八个 resize handle -->
          <div class="crop-box__handle crop-box__handle--nw" @pointerdown.stop="onHandlePointerDown($event, 'nw')" />
          <div class="crop-box__handle crop-box__handle--n" @pointerdown.stop="onHandlePointerDown($event, 'n')" />
          <div class="crop-box__handle crop-box__handle--ne" @pointerdown.stop="onHandlePointerDown($event, 'ne')" />
          <div class="crop-box__handle crop-box__handle--w" @pointerdown.stop="onHandlePointerDown($event, 'w')" />
          <div class="crop-box__handle crop-box__handle--e" @pointerdown.stop="onHandlePointerDown($event, 'e')" />
          <div class="crop-box__handle crop-box__handle--sw" @pointerdown.stop="onHandlePointerDown($event, 'sw')" />
          <div class="crop-box__handle crop-box__handle--s" @pointerdown.stop="onHandlePointerDown($event, 's')" />
          <div class="crop-box__handle crop-box__handle--se" @pointerdown.stop="onHandlePointerDown($event, 'se')" />

          <!-- 裁剪区域尺寸显示 -->
          <div class="crop-box__label">{{ cropRect.w }}×{{ cropRect.h }}</div>
        </div>

        <!-- 已裁剪结果标记 -->
        <div v-if="resultUrl" class="crop-result-badge">{{ t('croppedBadge') }}</div>
      </template>
    </div>

    <!-- 底部操作栏 -->
    <div class="crop-card__footer">
      <label class="crop-card__switch" :title="t('autoCropHint')">
        <input type="checkbox" v-model="autoCrop" @change="onAutoCropToggle" />
        <span class="crop-card__switch-slider" />
        <span class="crop-card__switch-text">{{ t('autoCrop') }}</span>
      </label>
      <button
        v-if="sourceUrl"
        class="crop-card__btn crop-card__btn--primary"
        type="button"
        :disabled="cropping"
        @click="handleCrop"
      >
        {{ t('confirmCrop') }}
      </button>
      <button
        v-if="sourceUrl"
        class="crop-card__btn crop-card__btn--secondary"
        type="button"
        :disabled="cropping"
        @click="handleCropAndGenerate"
      >
        {{ t('createNode') }}
      </button>
    </div>
  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
    <ImageCropHelpDialog />
  </HelpDialog>
</template>

<style scoped lang="less">
.crop-card {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  padding: 8px;
  padding-top: 0;
  background: @color-surface;
  border: 1px solid #d5d9e0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  user-select: none;

  &__header {
    flex-shrink: 1;
    min-height: 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    padding: 4px 0;
    border-bottom: 1px dashed #d5d9e0;
  }

  &__header-title {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: 11px;
    font-weight: 600;
    color: #8a9099;
    letter-spacing: 0.5px;
  }

  &__help {
    all: unset;
    cursor: pointer;
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #f3f4f6;
    color: #6b7280;
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: #dbeafe;
      color: #2563eb;
    }
  }

  &__canvas-area {
    position: relative;
    width: 100%;
    flex: 1;
    min-height: 0;
    border-radius: 6px;
    overflow: hidden;
    background: #1a1a2e;
    border: 1px solid #e5e7eb;
    // flex 居中让 object-fit:contain 的 img 自然居中
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    color: @color-text-weak;
  }

  &__icon-svg {
    width: 48px;
    height: 48px;
    display: block;
    flex-shrink: 0;
  }

  &__placeholder-text {
    font-size: 11px;
    color: #9aa1ad;
    font-style: italic;
  }

  &__footer {
    flex-shrink: 0;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: #fafbfc;
  }

  &__switch {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    user-select: none;

    input {
      display: none;
    }
  }

  &__switch-slider {
    position: relative;
    flex-shrink: 0;
    width: 26px;
    height: 14px;
    border-radius: 7px;
    background: #c5cbd4;
    transition: background 0.15s ease;

    &::before {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #fff;
      transition: transform 0.15s ease;
    }
  }

  &__switch input:checked + &__switch-slider {
    background: #ff7a45;

    &::before {
      transform: translateX(12px);
    }
  }

  &__switch-text {
    font-size: 11px;
    color: #7a828f;
    white-space: nowrap;
  }

  &__btn {
    flex-shrink: 0;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 11px;
    line-height: 1.3;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, transform 0.08s ease;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &--primary {
      border: 1px solid #ff7a45;
      background: #ff7a45;
      color: #fff;

      &:hover:not(:disabled) {
        background: #e66a3a;
        border-color: #e66a3a;
      }
    }

    &--secondary {
      border: 1px solid #4a7cff;
      background: #4a7cff;
      color: #fff;

      &:hover:not(:disabled) {
        background: #3d6ce0;
        border-color: #3d6ce0;
      }
    }

    &:active:not(:disabled) {
      transform: translateY(1px);
    }
  }
}

// —— 源图：width/height 100% + object-fit:contain ——
// 小图会被放大，大图会被缩小，长边始终撑满 canvas-area 可用空间
.source-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  pointer-events: none;
  opacity: 0.55;
}

.crop-result-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 2px 8px;
  background: #2d6a3f;
  color: #fff;
  font-size: 10px;
  border-radius: 10px;
  pointer-events: none;
  z-index: 2;
}

// —— 裁剪框 ——
.crop-box {
  position: absolute;
  // 裁剪框 CSS 像素坐标由 cropBoxStyle computed 写入（基于 imgDisplay + cropRect）
  border: 2px solid #ff7a45;
  background: rgba(255, 122, 69, 0.12);
  cursor: move;
  z-index: 1;
  // 暗化裁剪框外的区域（需要 overflow:visible 才能延伸出 container）
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.35);

  &__handle {
    position: absolute;
    width: 8px;
    height: 8px;
    background: #fff;
    border: 1.5px solid #ff7a45;
    border-radius: 2px;

    &--nw {
      top: -4px;
      left: -4px;
      cursor: nw-resize;
    }

    &--n {
      top: -4px;
      left: 50%;
      transform: translateX(-50%);
      cursor: n-resize;
    }

    &--ne {
      top: -4px;
      right: -4px;
      cursor: ne-resize;
    }

    &--w {
      top: 50%;
      left: -4px;
      transform: translateY(-50%);
      cursor: w-resize;
    }

    &--e {
      top: 50%;
      right: -4px;
      transform: translateY(-50%);
      cursor: e-resize;
    }

    &--sw {
      bottom: -4px;
      left: -4px;
      cursor: sw-resize;
    }

    &--s {
      bottom: -4px;
      left: 50%;
      transform: translateX(-50%);
      cursor: s-resize;
    }

    &--se {
      bottom: -4px;
      right: -4px;
      cursor: se-resize;
    }
  }

  &__label {
    position: absolute;
    bottom: 100%;
    left: 0;
    margin-bottom: 4px;
    padding: 1px 6px;
    background: #ff7a45;
    color: #fff;
    font-size: 10px;
    line-height: 1.3;
    border-radius: 3px;
    white-space: nowrap;
    pointer-events: none;
  }
}
</style>
