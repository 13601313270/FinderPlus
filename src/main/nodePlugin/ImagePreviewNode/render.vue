<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { ImagePreviewNode } from './node'
import { ImgFileNode } from '../ImgFileNode/node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { setLastDragPath } from '@renderer/composables/useFileDragOut'

const props = defineProps<{ id: string }>()

const node = computed(() => {
  const n = workspaceScene.getNode(props.id)
  return n instanceof ImagePreviewNode ? n : undefined
})

/**
 * 引擎里的 imageInput.value 是普通 TypeScript 数组属性，
 * Vue 的 computed 追踪不到它的变化。所以用 ref 存 previewFile，
 * 订阅 node.onChanged 时主动从端口取值刷进来——跟 FileInfoNode.render.vue /
 * ImgFileNode.render.vue 完全同模式。
 */
const previewFile = ref<File | undefined>(undefined)

/** 从 imageInput.value 里取第一个 ImgFileValue 的 file */
function refreshPreviewFile(n: ImagePreviewNode | undefined): void {
  if (!n) {
    previewFile.value = undefined
    return
  }
  const [first] = n.imageInput.value
  previewFile.value = first instanceof ImgFileValue ? first.file : undefined
}

// —— 订阅 node.onChanged：节点输入变化时主动刷新 previewFile ——
let unsubscribe: (() => void) | undefined
watch(
  node,
  (n) => {
    unsubscribe?.()
    unsubscribe = n?.onChanged(() => refreshPreviewFile(n))
    refreshPreviewFile(n)
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

/** 预览图专属拖拽：画布内移动节点，越界超时 writeBuffer + startDrag 导出 */
const { startDrag: startPreviewDrag } = useNodePosition(
  () => node.value,
  {
    enableDragOut: true,
    confirmDelayMs: 300,
    onDragOut: async (startPos) => {
      const file = previewFile.value
      const currentNode = node.value
      if (!file || !currentNode) return
      // 还原节点到按下前的位置（越界前已经跟着鼠标移动过了）
      currentNode.setPosition(startPos[0], startPos[1])
      // writeBuffer + startDrag 交给 OS
      const base64 = await fileToBase64(file)
      const written = await window.fileApi.writeBuffer(file.name, base64)
      const fullPath = await window.fileApi.startDrag(written.fileName)
      setLastDragPath(fullPath)
    }
  }
)

/**
 * 点击"新建图片文件节点"按钮：在当前节点旁边新建 ImgFileNode。
 * - writeBuffer 把 File 落盘到画布目录
 * - 新节点位置 = 当前节点 position + [30, 30] 偏移
 */
async function handleCreateImgNode(): Promise<void> {
  const file = previewFile.value
  const currentNode = node.value
  if (!file || !currentNode) return

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

// —— 图片 objectURL；卸载或 File 变时 revoke 防泄漏 ——
const imageUrl = ref<string | null>(null)
let revokeUrl: (() => void) | null = null

/** 图片天然宽高（像素）；没图或还没 load 时是 null */
const naturalSize = ref<{ w: number; h: number } | null>(null)

/** 释放当前 objectURL */
function clearImage(): void {
  if (revokeUrl) {
    revokeUrl()
    revokeUrl = null
  }
  imageUrl.value = null
  naturalSize.value = null
}

/** 更新 objectURL：File 变时重建 */
watch(previewFile, (file) => {
  clearImage()
  if (file) {
    const url = URL.createObjectURL(file)
    imageUrl.value = url
    revokeUrl = () => URL.revokeObjectURL(url)
  }
}, { immediate: true })

/** img load 后拿到天然宽高 */
function onImgLoad(e: Event): void {
  const img = e.target as HTMLImageElement
  if (img.naturalWidth && img.naturalHeight) {
    naturalSize.value = { w: img.naturalWidth, h: img.naturalHeight }
  }
}

onUnmounted(() => {
  unsubscribe?.()
  clearImage()
})
</script>

<template>
  <div class="preview-card">
    <!-- 预览图区域：画布内拖拽 = 移动节点；越界 = writeBuffer + startDrag 导出 -->
    <div
      class="preview-card__image-area"
      @pointerdown.stop.prevent="startPreviewDrag"
      :title="previewFile
        ? '在画布内拖拽移动节点 · 拖出窗口导出图片到桌面/文件夹'
        : '请先连接图片来源'"
    >
      <img
        v-if="imageUrl"
        class="preview-card__img"
        :src="imageUrl"
        alt="图片预览"
        draggable="false"
        @load="onImgLoad"
      />
      <!-- 无图占位 -->
      <div v-else class="preview-card__placeholder">
        <svg class="preview-card__icon-svg" viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M6 6C6 3.79 7.79 2 10 2H38L58 22V66C58 68.21 56.21 70 54 70H10C7.79 70 6 68.21 6 66V6Z"
            fill="#f4f5f7"
            stroke="#c5cbd4"
            stroke-width="1.5"
          />
          <path d="M38 2L58 22H44C41.79 22 40 20.21 40 18V2Z" fill="#eef3ff" stroke="#c5cbd4" stroke-width="1.5" />
          <path
            d="M16 50L26 40L34 48L44 34L52 50H16Z"
            fill="#c5d4ff"
            stroke="#4a7cff"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
          <circle cx="44" cy="28" r="4" fill="#4a7cff" />
        </svg>
        <span class="preview-card__placeholder-text">等待图片输入</span>
      </div>
    </div>

    <!-- 底部信息栏：尺寸 + "新建图片文件节点" 按钮 -->
    <div class="preview-card__footer" v-if="previewFile">
      <span v-if="naturalSize" class="preview-card__dim">
        {{ naturalSize.w }}×{{ naturalSize.h }}px
      </span>
      <span v-else class="preview-card__dim preview-card__dim--empty">图片加载中…</span>

      <button
        class="preview-card__create-btn"
        type="button"
        @click="handleCreateImgNode"
        title="点击在当前节点旁边新建图片文件节点"
      >
        新建图片文件节点
      </button>
    </div>
  </div>
</template>

<style scoped lang="less">
.preview-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  width: 240px;
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

    &:active { cursor: grabbing; }
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
    width: 48px;
    height: 54px;
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

  &__dim {
    flex: 1;
    font-size: 11px;
    color: #7a828f;
    font-variant-numeric: tabular-nums;

    &--empty {
      color: #b6bcc7;
      font-style: italic;
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
