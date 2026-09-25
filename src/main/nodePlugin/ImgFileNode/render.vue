<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { base64ToBlob } from '../../engine/data/base64'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { ImgFileNode } from './node'
import { inferImageMime } from './mime'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useFileDragOut } from '@renderer/composables/useFileDragOut'
import { useFileOpenInSystem } from '@renderer/composables/useFileOpenInSystem'

const props = defineProps<{ id: string }>()

const fileNode = computed(() => {
  const node = workspaceScene.getNode(props.id)
  return node instanceof ImgFileNode ? node : undefined
})

// —— 拖拽：窗口内移动（useNodePosition）+ 拖出外部（useFileDragOut）——
const { dragOutOpts, cleanup: cleanupDragOut } = useFileDragOut(() => fileNode.value)
const { startDrag } = useNodePosition(() => fileNode.value, dragOutOpts)

// —— 双击图标：用系统默认应用打开文件 ——
const { openInSystem } = useFileOpenInSystem()

// —— 文件名 / 文件大小 的 Vue 响应式包装 ——
const fileName = ref('')
const fileSize = ref(0)

// —— 缩略图 URL（createObjectURL）；组件卸载或 fileName 变更时 revoke 防内存泄漏 ——
const thumbnailUrl = ref<string | null>(null)
let revokeUrl: (() => void) | null = null

/** 释放当前缩略图 URL */
function clearThumbnail(): void {
  if (revokeUrl) {
    revokeUrl()
    revokeUrl = null
  }
  thumbnailUrl.value = null
}

/** 格式化文件大小 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

// —— 订阅 node.onChanged，把 fileName / fileSize 刷进 Vue ref ——
// 带 immediate + flush:'sync'：bootstrapScene 比组件挂载早跑完，
// 所以第一次执行时 node 就已经有 readState 恢复好的 fileName 了。
let unsubscribe: (() => void) | undefined
watch(
  fileNode,
  (n) => {
    unsubscribe?.()
    unsubscribe = n?.onChanged(() => {
      fileName.value = n.fileName
      fileSize.value = n.fileSize
    })
    if (n) {
      fileName.value = n.fileName
      fileSize.value = n.fileSize
    } else {
      fileName.value = ''
      fileSize.value = 0
      clearThumbnail()
    }
  },
  { immediate: true, flush: 'sync' }
)

// —— fileName 变化（首次挂载、文件重新选择、持久化恢复）→ 重建缩略图 ——
// 带 immediate:true —— 虽然 watch(fileNode) 先同步赋值了 fileName，
// 但注册顺序上 watch(fileName) 晚于 watch(fileNode)，没有 immediate 的话它不会为初始值触发。
// 加了 immediate 后，首次用旧值（空串）触发一次 early return，然后 watch(fileNode) 的赋值触发二次执行。
let seqCounter = 0 // race guard：快速连续换文件时，旧的 await 结果不会覆盖新的
watch(fileName, async (newName) => {
  clearThumbnail()
  if (!newName) return
  const mySeq = ++seqCounter
  const node = fileNode.value
  if (!node) return
  try {
    const b64 = await window.fileApi.readBinary(newName)
    if (mySeq !== seqCounter) return // 中间又触发了，放弃过期结果
    node.setContent(b64)
    const mime = inferImageMime(newName)
    const blob = base64ToBlob(b64, mime)
    const url = URL.createObjectURL(blob)
    thumbnailUrl.value = url
    revokeUrl = () => URL.revokeObjectURL(url)
  } catch { /* 文件可能已被用户删了，静默忽略 */ }
}, { immediate: true })

onUnmounted(() => {
  unsubscribe?.()
  cleanupDragOut()
  clearThumbnail()
})
</script>

<template>
  <div class="file-card">
    <!-- 图标区：直接内嵌图片缩略图 -->
    <div
      class="file-card__icon"
      @pointerdown="startDrag"
      @dblclick="openInSystem(fileNode?.fileName)"
      :title="fileNode?.fileName
        ? '拖动节点 · 拖出窗口移动文件 · 双击用系统默认应用打开'
        : '拖动节点（未选文件）'"
    >
      <img
        v-if="thumbnailUrl"
        class="file-card__img"
        :src="thumbnailUrl"
        alt="图片预览"
        draggable="false"
      />
      <!-- 没有缩略图时（还没选文件、或加载失败）显示占位图标 -->
      <svg v-else class="file-card__icon-svg" viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- 文件主体 -->
        <path
          d="M6 6C6 3.79 7.79 2 10 2H38L58 22V66C58 68.21 56.21 70 54 70H10C7.79 70 6 68.21 6 66V6Z"
          fill="#fff"
          stroke="#c5cbd4"
          stroke-width="1.5"
        />
        <!-- 折角三角 -->
        <path d="M38 2L58 22H44C41.79 22 40 20.21 40 18V2Z" fill="#eef3ff" stroke="#c5cbd4" stroke-width="1.5" />
        <!-- 类型标签 -->
        <text x="32" y="52" text-anchor="middle" font-size="10" font-weight="600" fill="#4a7cff" font-family="Helvetica, Arial, sans-serif">
          IMG
        </text>
      </svg>
    </div>

    <!-- 文件名 -->
    <div class="file-card__name-row">
      <span v-if="fileName" class="file-card__name" :title="fileName">
        {{ fileName }}
      </span>
      <span v-else class="file-card__name file-card__name--empty">未选择文件</span>
      <span v-if="fileSize" class="file-card__size">
        {{ formatSize(fileSize) }}
      </span>
    </div>
  </div>
</template>

<style scoped lang="less">
.file-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 180px;
  padding: 10px 10px 8px;
  background: @color-surface;
  border: 1px solid #d5d9e0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  &__icon {
    width: 120px;
    height: 90px;
    border-radius: 6px;
    overflow: hidden;
    cursor: grab;
    user-select: none;
    background: #f4f5f7;
    border: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
    &:active { cursor: grabbing; }
  }

  &__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    pointer-events: none;
  }

  &__icon-svg {
    width: 64px;
    height: 72px;
    display: block;
  }

  &__name-row {
    width: 100%;
    text-align: center;
    font-size: 12px;
    line-height: 1.3;
  }

  &__name {
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

  &__size {
    display: block;
    color: @color-text-weak;
    font-size: 11px;
  }
}
</style>
