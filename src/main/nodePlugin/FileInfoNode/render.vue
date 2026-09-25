<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { FileInfoNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'

/**
 * 文件信息展示节点的渲染组件（只画卡片内容）。
 *
 * 定位、两侧端口这些所有节点共用的东西由 NodeShell 兜底，这里不碰。
 * 引擎里的三个字段都是普通类字段，Vue 追踪不到，所以用 ref 包一层，
 * 订阅 node.onChanged 时把最新值刷进 ref。
 */
const props = defineProps<{ id: string }>()

const infoNode = shallowRef<FileInfoNode | undefined>(undefined)
const fileName = ref('')
const fileSize = ref(0)
const fileType = ref('')

let unsubscribe: (() => void) | undefined

const { startDrag } = useNodePosition(() => infoNode.value)

/** 格式化文件大小 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof FileInfoNode) {
    infoNode.value = found
    fileName.value = found.displayFileName
    fileSize.value = found.displayFileSize
    fileType.value = found.displayFileType
    unsubscribe = found.onChanged(() => {
      fileName.value = found.displayFileName
      fileSize.value = found.displayFileSize
      fileType.value = found.displayFileType
    })
  }
})

onUnmounted(() => {
  unsubscribe?.()
})
</script>

<template>
  <div class="node">
    <span class="node__handle" title="拖动节点" @pointerdown="startDrag">{{ infoNode?.type ?? '?' }}</span>
    <div class="file-info" :class="{ 'file-info--empty': !fileName }">
      <template v-if="fileName">
        <div class="file-info__row">
          <span class="file-info__label">名称</span>
          <span class="file-info__value" :title="fileName">{{ fileName }}</span>
        </div>
        <div class="file-info__row">
          <span class="file-info__label">大小</span>
          <span class="file-info__value">{{ formatSize(fileSize) }}</span>
        </div>
        <div v-if="fileType" class="file-info__row">
          <span class="file-info__label">类型</span>
          <span class="file-info__value">{{ fileType }}</span>
        </div>
      </template>
      <span v-else class="file-info__empty">（暂无输入）</span>
    </div>
  </div>
</template>

<style scoped lang="less">
.node {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 200px;
  padding: 8px;
  background: @color-surface;
  border: 1px solid #d5d9e0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  &__handle {
    cursor: grab;
    user-select: none;
    font-size: 12px;
    color: @color-text-weak;
    text-align: center;
    padding: 2px 0;
    border-bottom: 1px dashed #d5d9e0;

    &:active {
      cursor: grabbing;
    }
  }
}

.file-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  border: 1px solid #d5d9e0;
  border-radius: 6px;
  font-size: 13px;

  &__row {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  &__label {
    flex-shrink: 0;
    color: @color-text-weak;
    font-size: 11px;
    min-width: 28px;
  }

  &__value {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: @color-text;
  }

  &__empty {
    color: #9aa2ad;
    font-style: italic;
  }

  &--empty {
    color: #9aa2ad;
  }
}
</style>
