<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { ImagePreviewNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { usePreviewImageDrag } from '@renderer/composables/usePreviewImageDrag'

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

// —— 卡片整体拖拽 ——
const { startDrag: startNodeDrag } = useNodePosition(() => node.value)

// —— 预览图专属拖拽：画布内松手新建 ImgFileNode / 越界 startDrag 拖出 ——
const { startImageDrag, cleanup: cleanupImageDrag } = usePreviewImageDrag(() => previewFile.value)

// —— 图片 objectURL；卸载或 File 变时 revoke 防泄漏 ——
const imageUrl = ref<string | null>(null)
let revokeUrl: (() => void) | null = null

/** 释放当前 objectURL */
function clearImage(): void {
  if (revokeUrl) {
    revokeUrl()
    revokeUrl = null
  }
  imageUrl.value = null
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

onUnmounted(() => {
  unsubscribe?.()
  cleanupImageDrag()
  clearImage()
})
</script>

<template>
  <div
    class="preview-card"
    @pointerdown="startNodeDrag"
  >
    <!-- 预览图区域：有图显示图，无图显示占位 icon -->
    <div
      class="preview-card__image-area"
      @pointerdown="startImageDrag"
      :title="previewFile
        ? '拖拽预览图到画布空白处 → 新建图片文件节点\n拖出窗口 → 导出图片到桌面/文件夹'
        : '请先连接图片来源'"
    >
      <img
        v-if="imageUrl"
        class="preview-card__img"
        :src="imageUrl"
        alt="图片预览"
        draggable="false"
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

    <!-- 底部提示栏：有文件名显示文件名，无文件显示提示 -->
    <div class="preview-card__footer">
      <span v-if="previewFile" class="preview-card__filename" :title="previewFile.name">
        {{ previewFile.name }}
      </span>
      <span v-else class="preview-card__filename preview-card__filename--empty">
        未连接图片
      </span>
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
  cursor: grab;
  user-select: none;
  &:active { cursor: grabbing; }

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
    text-align: center;
    font-size: 11px;
    line-height: 1.3;
    min-height: 14px;
  }

  &__filename {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: @color-text;
    font-weight: 500;

    &--empty {
      color: @color-text-weak;
      font-style: italic;
      font-weight: 400;
    }
  }
}
</style>
