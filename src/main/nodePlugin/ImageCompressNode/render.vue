<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { ImageCompressNode } from './node'
import { ImgFileNode } from '../ImgFileNode/node'
import { useNodePosition } from '@renderer/composables/useNodePosition'

const props = defineProps<{ id: string }>()

const node = computed(() => {
  const n = workspaceScene.getNode(props.id)
  return n instanceof ImageCompressNode ? n : undefined
})

// —— 拖拽：压缩节点自身也参与画布移动 ——
const { startDrag } = useNodePosition(() => node.value)

// —— JPEG 输出质量（固定策略，最小实现；后续可做成节点 UI 参数） ——
const JPEG_QUALITY = 0.85

// —— 目标尺寸（最长边像素）展示：随 onChanged 刷新 ——
const targetSize = ref(800)

// —— 压缩结果预览（objectURL）；卸载或结果变时 revoke 防泄漏 ——
const resultUrl = ref<string | null>(null)
let revokeUrl: (() => void) | null = null

function clearResult(): void {
  if (revokeUrl) {
    revokeUrl()
    revokeUrl = null
  }
  resultUrl.value = null
}

/** 从 node.imageOutput 当前值刷预览图 */
function refreshResult(n: ImageCompressNode | undefined): void {
  clearResult()
  if (!n) return
  const value = n.imageOutput.value
  if (value instanceof ImgFileValue) {
    const url = URL.createObjectURL(value.file)
    resultUrl.value = url
    revokeUrl = () => URL.revokeObjectURL(url)
  }
}

/** 压缩中标记：防止 onChanged 重入导致重复压缩 */
let compressing = false

/** 从源文件 type 推导输出 MIME：png/webp 保留透明通道，其余压成 jpeg */
function outputMime(sourceType: string): string {
  if (sourceType === 'image/png' || sourceType === 'image/webp') return sourceType
  return 'image/jpeg'
}

function extForMime(mime: string): string {
  if (mime === 'image/jpeg') return '.jpg'
  if (mime === 'image/webp') return '.webp'
  return '.png'
}

/** 去掉源文件名的后缀，压缩输出文件名为 原名-compressed.新后缀 */
function baseName(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot > 0 ? fileName.slice(0, dot) : fileName
}

/** 加载图片（Promise 化） */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image load failed'))
    img.src = url
  })
}

/**
 * 执行一次压缩：File → canvas 按比例缩小 → toDataURL → node.setOutput。
 * 同时支持两种触发路径：端口输入（响应式，上游值变自动重压缩）和拖入节点（一次性）。
 *
 * @param n    压缩节点实例
 * @param file 待压缩的源文件（来自 compressSource.get 的 file 字段）
 */
async function runCompress(n: ImageCompressNode, file: File): Promise<void> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const scale = Math.min(1, n.targetSize / Math.max(img.naturalWidth, img.naturalHeight))
    const width = Math.max(1, Math.round(img.naturalWidth * scale))
    const height = Math.max(1, Math.round(img.naturalHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, 0, 0, width, height)

    const mime = outputMime(file.type)
    const dataUrl = mime === 'image/jpeg' ? canvas.toDataURL(mime, JPEG_QUALITY) : canvas.toDataURL(mime)
    const comma = dataUrl.indexOf(',')
    const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
    const fileName = `${baseName(file.name)}-compressed${extForMime(mime)}`

    n.setOutput(base64, mime, fileName)
  } catch {
    // 源图加载失败（文件可能已被删）→ 静默跳过，等下次触发
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * 检查是否需要压缩：读 compressSource 判断有无可用源，再用 fingerprint 去重。
 * - 端口路径（响应式）：fingerprint 没变就跳过，变了就压缩
 * - 拖入路径（一次性）：pendingSource 非空表示需要压一次
 * - 两种都存在时端口优先
 */
function handleCompress(n: ImageCompressNode | undefined): void {
  if (!n || compressing) return
  const src = n.compressSource
  if (!src) return

  const isPending = !!n.pendingSource // 拖入路径有触发信号
  const fpChanged = src.fingerprint !== n.lastCompressedFp

  // 去重：端口路径下 fingerprint 没变且不是拖入触发 → 跳过
  if (!fpChanged && !isPending) return

  compressing = true
  runCompress(n, src.file)
    .catch(() => {})
    .finally(() => {
      compressing = false
      n.markCompressed(src.fingerprint)
      // 拖入路径处理完清信号（端口路径不清，保持响应式）
      if (isPending) n.clearPending()
    })
}

// —— 订阅 node.onChanged：结果刷新 + 目标尺寸刷新 + 收到触发信号（拖入或端口值变）触发压缩 ——
let unsubscribe: (() => void) | undefined
watch(
  node,
  (n) => {
    unsubscribe?.()
    unsubscribe = n?.onChanged(() => {
      refreshResult(n)
      targetSize.value = n?.targetSize ?? 800
      handleCompress(n)
    })
    refreshResult(n)
    targetSize.value = n?.targetSize ?? 800
    handleCompress(n)
  },
  { immediate: true, flush: 'sync' }
)

/** File → base64 字符串（给 writeBuffer 用） */
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

/**
 * 点击「生成图片文件节点」：以压缩结果为基础新建一个 ImgFileNode。
 * - writeBuffer 把压缩结果 File 落盘到画布目录（自动去重名）
 * - 新节点位置 = 当前节点 position + [30, 30] 偏移
 * - 新节点 render.vue 挂载后 watch(fileName) 自动读回内容展示
 */
async function handleCreateImgNode(): Promise<void> {
  const currentNode = node.value
  if (!currentNode) return
  const value = currentNode.imageOutput.value
  const file = value instanceof ImgFileValue ? value.file : undefined
  if (!file) return

  const base64 = await fileToBase64(file)
  const written = await window.fileApi.writeBuffer(file.name, base64)

  const [cx, cy] = currentNode.position
  const newNode = new ImgFileNode(
    `${ImgFileNode.TYPE}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  )
  newNode.setPosition(cx + 30, cy + 30)
  newNode.setFile(written.fileName, written.size)
  workspaceScene.addNode(newNode)
}

onUnmounted(() => {
  unsubscribe?.()
  clearResult()
})
</script>

<template>
  <div class="compress-card" @pointerdown="startDrag"
    :title="'拖入图片节点压缩一次 · 或左侧端口接图片响应式压缩'">
    <!-- 头部类型标签：与图片预览节点区分 -->
    <div class="compress-card__header">图片压缩</div>

    <!-- 压缩结果预览区 -->
    <div class="compress-card__image-area">
      <img v-if="resultUrl" class="compress-card__img" :src="resultUrl" alt="压缩结果预览" draggable="false" />
      <!-- 无结果占位：提示两种输入方式 -->
      <div v-else class="compress-card__placeholder">
        <svg class="compress-card__icon-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="10" width="48" height="44" rx="6" fill="#f4f5f7" stroke="#c5cbd4" stroke-width="1.5" />
          <path d="M14 46L26 34L34 42L44 30L52 46H14Z" fill="#c5d4ff" stroke="#4a7cff" stroke-width="1.5"
            stroke-linejoin="round" />
          <circle cx="40" cy="20" r="4" fill="#4a7cff" />
        </svg>
        <span class="compress-card__placeholder-text">拖图片节点进来 · 或左侧端口接图片（≤ {{ targetSize }}px）</span>
      </div>
    </div>

    <!-- 底部信息栏：提示 + 以压缩结果新建 ImgFileNode -->
    <div class="compress-card__footer">
      <span v-if="resultUrl" class="compress-card__hint compress-card__hint--active">最长边 ≤ {{ targetSize }}px</span>
      <span v-else class="compress-card__hint">端口响应式 · 拖入一次性</span>
      <button v-if="resultUrl" class="compress-card__create-btn" type="button" @pointerdown.stop
        @click="handleCreateImgNode" title="以压缩结果为基础新建一个图片文件节点">
        生成图片文件节点
      </button>
    </div>
  </div>
</template>

<style scoped lang="less">
.compress-card {
  box-sizing: border-box; // box 是内容区外包壳宽，border+padding 算在 box 内
  width: 100%; // 填满 NodeShell 的 .node-content（由 node.box 硬约束定宽高）
  height: 100%;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  padding: 10px;
  background: @color-surface;
  border: 1px solid #d5d9e0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  user-select: none;

  &__header {
    flex-shrink: 1;
    min-height: 18px;
    font-size: 11px;
    font-weight: 600;
    color: #4a7cff;
    letter-spacing: 0.5px;
    padding-bottom: 2px;
    border-bottom: 1px dashed #d5d9e0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &__image-area {
    width: 100%;
    aspect-ratio: 16 / 10;
    border-radius: 6px;
    overflow: hidden;
    background: #f4f5f7;
    border: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  &__img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    display: block;
    pointer-events: none;
    background: #fff;
  }

  &__placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    color: @color-text-weak;
  }

  &__icon-svg {
    width: 40px;
    height: 40px;
    display: block;
    flex-shrink: 0;
  }

  &__placeholder-text {
    font-size: 11px;
    color: #9aa1ad;
    font-style: italic;
  }

  &__footer {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: #fafbfc;
  }

  &__hint {
    flex: 1;
    font-size: 11px;
    color: #7a828f;
    text-align: left;
    line-height: 1.4;

    &--active {
      color: #2d6a3f;
    }
  }

  &__create-btn {
    flex-shrink: 0;
    padding: 4px 10px;
    border: 1px solid #4a7cff;
    border-radius: 4px;
    background: #4a7cff;
    color: #fff;
    font-size: 11px;
    line-height: 1.3;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, transform 0.08s ease;

    &:hover {
      background: #3d6ce0;
      border-color: #3d6ce0;
    }

    &:active {
      transform: translateY(1px);
    }
  }
}
</style>
