<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { ImageOverlayNode } from './node'
import { ImgFileNode } from '../ImgFileNode/node'
import { useNodePosition } from '@renderer/composables/useNodePosition'

const props = defineProps<{ id: string }>()

const node = computed(() => {
  const n = workspaceScene.getNode(props.id)
  return n instanceof ImageOverlayNode ? n : undefined
})

// —— 拖拽：节点自身也参与画布移动 ——
const { startDrag } = useNodePosition(() => node.value)

// —— 合成结果预览（objectURL）；卸载或结果变时 revoke 防泄漏 ——
const resultUrl = ref<string | null>(null)
let revokeUrl: (() => void) | null = null

// —— 当前图层数量展示 ——
const layerCount = ref(0)

function clearResult(): void {
  if (revokeUrl) {
    revokeUrl()
    revokeUrl = null
  }
  resultUrl.value = null
}

/** 从 node.imageOutput 当前值刷预览图 */
function refreshResult(n: ImageOverlayNode | undefined): void {
  clearResult()
  if (!n) return
  const value = n.imageOutput.value
  if (value instanceof ImgFileValue) {
    const url = URL.createObjectURL(value.file)
    resultUrl.value = url
    revokeUrl = () => URL.revokeObjectURL(url)
  }
}

/** 合成中标记：防止 onChanged 重入导致重复合成 */
let compositing = false

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
 * 执行一次合成：多个 File → 加载为 HTMLImageElement → canvas 叠绘 → toDataURL → node.setOutput。
 *
 * @param n     叠加节点实例
 * @param files 待合成的源文件列表（来自 node.layerValues）
 */
async function runComposite(n: ImageOverlayNode, files: File[]): Promise<boolean> {
  // 并行加载所有图片（用 allSettled：单个失败不影响整体）
  const urls: string[] = []
  try {
    // 创建所有 objectURL
    for (const f of files) {
      urls.push(URL.createObjectURL(f))
    }

    const results = await Promise.allSettled(
      urls.map((url) => loadImage(url))
    )

    // 过滤出成功加载的图片，保持顺序
    const images: HTMLImageElement[] = []
    for (const r of results) {
      if (r.status === 'fulfilled') images.push(r.value)
    }

    // 至少需要一张图片才能合成
    if (images.length === 0) return false

    // 计算画布尺寸：所有图层中最大宽 × 最大高
    let maxW = 0
    let maxH = 0
    for (const img of images) {
      if (img.naturalWidth > maxW) maxW = img.naturalWidth
      if (img.naturalHeight > maxH) maxH = img.naturalHeight
    }

    if (maxW === 0 || maxH === 0) return false

    const canvas = document.createElement('canvas')
    canvas.width = maxW
    canvas.height = maxH
    const ctx = canvas.getContext('2d')
    if (!ctx) return false

    // 按连接顺序依次叠绘：先 draw 的在底层，后 draw 的在上层
    for (const img of images) {
      ctx.drawImage(img, 0, 0)
    }

    // 输出 PNG 保留透明通道
    const dataUrl = canvas.toDataURL('image/png')
    const comma = dataUrl.indexOf(',')
    const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl

    // 输出文件名：overlay-时间戳.png
    const fileName = `overlay-${Date.now()}.png`
    n.setOutput(base64, fileName)
    return true
  } catch {
    // 其他意外错误 → 静默跳过，等下次触发
    return false
  } finally {
    // 清理所有 objectURL
    for (const url of urls) {
      URL.revokeObjectURL(url)
    }
  }
}

/**
 * 检查是否需要合成：读 node.layerValues 判断有无可用图层，再用 fingerprint 去重。
 * - 图层数量为 0 或所有图层 fingerprint 都没变 → 跳过
 */
function handleComposite(n: ImageOverlayNode | undefined): void {
  if (!n || compositing) return

  const layers = n.layerValues
  layerCount.value = layers.length

  if (layers.length === 0) {
    // 没有图层 → 清掉旧结果
    n.imageOutput.clear()
    return
  }

  const currentFp = n.currentLayersFingerprint
  const lastFp = n.lastCompositeFp

  // 去重：fingerprint 没变就跳过
  if (currentFp !== null && currentFp === lastFp) return

  const files = layers.map((v) => v.file)
  compositing = true
  runComposite(n, files)
    .then((success) => {
      // 只在成功合成后记录 fingerprint，失败则留给下次触发重试
      if (success && currentFp) n.markComposite(currentFp)
    })
    .catch(() => { })
    .finally(() => {
      compositing = false
      // 竞态修复：合成期间如果图层变了，compositing=true 会让后续 handleComposite 跳过，
      // 这里 compositing=false 后再重检一次，不会因为 fingerprint 相同而误跳过（因为合成期间
      // 没 mark，lastFp 还是旧值）
      handleComposite(n)
    })
}

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
 * 点击「生成图片文件节点」：以合成结果为基础新建一个 ImgFileNode。
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

// —— 订阅 node.onChanged：结果刷新 + 图层数刷新 + 收到信号触发合成 ——
let unsubscribe: (() => void) | undefined
watch(
  node,
  (n) => {
    unsubscribe?.()
    unsubscribe = n?.onChanged(() => {
      refreshResult(n)
      layerCount.value = n?.layerValues.length ?? 0
      handleComposite(n)
    })
    refreshResult(n)
    layerCount.value = n?.layerValues.length ?? 0
    handleComposite(n)
  },
  { immediate: true, flush: 'sync' }
)

onUnmounted(() => {
  unsubscribe?.()
  clearResult()
})
</script>

<template>
  <div class="overlay-card" @pointerdown="startDrag" :title="'多张图片按连接顺序叠加合成（先连=底层，后连=上层）'">
    <!-- 头部类型标签 -->
    <div class="overlay-card__header">图片叠加</div>

    <!-- 合成结果预览区 -->
    <div class="overlay-card__image-area">
      <img v-if="resultUrl" class="overlay-card__img" :src="resultUrl" alt="合成结果预览" draggable="false" />
      <!-- 无结果占位：提示连接方式 -->
      <div v-else class="overlay-card__placeholder">
        <svg class="overlay-card__icon-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="10" width="48" height="44" rx="6" fill="#f4f5f7" stroke="#c5cbd4" stroke-width="1.5" />
          <path d="M14 46L26 34L34 42L44 30L52 46H14Z" fill="#c5d4ff" stroke="#4a7cff" stroke-width="1.5"
            stroke-linejoin="round" />
          <circle cx="40" cy="20" r="4" fill="#4a7cff" />
          <text x="32" y="56" text-anchor="middle" font-size="8" fill="#9aa1ad" font-family="sans-serif">
            多图层叠加
          </text>
        </svg>
        <span class="overlay-card__placeholder-text">左侧端口连图片 · 先连=底层，后连=上层</span>
      </div>
    </div>

    <!-- 底部信息栏：图层数 + 生成文件节点按钮 -->
    <div class="overlay-card__footer">
      <span v-if="resultUrl" class="overlay-card__hint overlay-card__hint--active">
        {{ layerCount }} 层 · PNG透明
      </span>
      <span v-else class="overlay-card__hint">{{ layerCount }} 层 · 端口响应式合成</span>
      <button v-if="resultUrl" class="overlay-card__create-btn" type="button" @pointerdown.stop
        @click="handleCreateImgNode" title="以合成结果为基础新建一个图片文件节点">
        生成图片文件节点
      </button>
    </div>
  </div>
</template>

<style scoped lang="less">
.overlay-card {
  box-sizing: border-box;
  width: 100%;
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
    background:
      repeating-conic-gradient(#f4f5f7 0% 25%, #e8eaed 0% 50%) 50% / 12px 12px;
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
