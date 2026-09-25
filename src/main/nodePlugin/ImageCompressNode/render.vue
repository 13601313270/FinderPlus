<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import type { Node } from '../../engine/node/Node'
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
const targetSize = ref(ImageCompressNode.DEFAULT_TARGET_SIZE)

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

/**
 * 读源节点当前图片（输出端口第一个 ImgFileValue）。
 * 只读 drop 那一刻的值——一次性工作，不订阅源节点变化。
 */
function getSourceFile(source: Node): File | undefined {
  const port = source.outputPorts.find((p) => p.valueClass === ImgFileValue)
  const value = port?.value
  return value instanceof ImgFileValue ? value.file : undefined
}

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
 * 执行一次压缩：读源图 → canvas 按比例缩小 → toDataURL → node.setOutput。
 * 压缩完成后调 clearPending 重置触发信号。
 */
async function runCompress(n: ImageCompressNode): Promise<void> {
  const source = n.pendingSource
  const file = source ? getSourceFile(source) : undefined
  if (!source || !file) return

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
    // 源图加载失败（文件可能已被删）→ 静默跳过，等用户再拖一次
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** 检查 pendingSource 信号：非空则压缩一次（重入保护） */
function handlePending(n: ImageCompressNode | undefined): void {
  if (!n || compressing) return
  const source = n.pendingSource
  if (!source) return
  compressing = true
  runCompress(n)
    .catch(() => {})
    .finally(() => {
      compressing = false
      n.clearPending()
    })
}

// —— 订阅 node.onChanged：结果刷新 + 目标尺寸刷新 + 收到 pendingSource 信号触发压缩 ——
let unsubscribe: (() => void) | undefined
watch(
  node,
  (n) => {
    unsubscribe?.()
    unsubscribe = n?.onChanged(() => {
      refreshResult(n)
      targetSize.value = n?.targetSize ?? ImageCompressNode.DEFAULT_TARGET_SIZE
      handlePending(n)
    })
    refreshResult(n)
    targetSize.value = n?.targetSize ?? ImageCompressNode.DEFAULT_TARGET_SIZE
    handlePending(n)
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
 * 点击「新建图片文件节点」：以压缩结果为基础新建一个 ImgFileNode。
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
    :title="'拖动节点 · 把图片节点（ImgFileNode）拖进来压缩一次'">
    <!-- 压缩结果预览区 -->
    <div class="compress-card__image-area">
      <img v-if="resultUrl" class="compress-card__img" :src="resultUrl" alt="压缩结果预览" draggable="false" />
      <!-- 无结果占位：提示把图片节点拖进来 -->
      <div v-else class="compress-card__placeholder">
        <svg class="compress-card__icon-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="10" width="48" height="44" rx="6" fill="#f4f5f7" stroke="#c5cbd4" stroke-width="1.5" />
          <path d="M14 46L26 34L34 42L44 30L52 46H14Z" fill="#c5d4ff" stroke="#4a7cff" stroke-width="1.5"
            stroke-linejoin="round" />
          <circle cx="40" cy="20" r="4" fill="#4a7cff" />
        </svg>
        <span class="compress-card__placeholder-text">把图片节点拖进来压缩（最长边 ≤ {{ targetSize }}px）</span>
      </div>
    </div>

    <!-- 底部信息栏：提示 + 以压缩结果新建 ImgFileNode -->
    <div class="compress-card__footer">
      <span v-if="resultUrl" class="compress-card__hint compress-card__hint--active">最长边 ≤ {{ targetSize }}px</span>
      <span v-else class="compress-card__hint">一次性：拖入即压，不跟随源节点变化</span>
      <button v-if="resultUrl" class="compress-card__create-btn" type="button" @pointerdown.stop
        @click="handleCreateImgNode" title="以压缩结果为基础新建一个图片文件节点">
        新建图片文件节点
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
