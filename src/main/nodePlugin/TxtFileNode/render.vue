<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { TxtFileNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'

const props = defineProps<{ id: string }>()

const fileNode = computed(() => {
  const node = workspaceScene.getNode(props.id)
  return node instanceof TxtFileNode ? node : undefined
})

// 拖拽：和其他节点一致
const { startDrag } = useNodePosition(() => fileNode.value)

// —— 文件名 / 文件大小 的 Vue 响应式包装 ——
// Node 基类用 onChanged/notifyChanged 广播变化，但 Vue 追踪不了普通 class 字段。
// 所以这里用 ref 包一层，订阅 node.onChanged 时把 fileName / fileSize 刷进 ref，
// 模板改读这两个 ref 就能跟着变。
const fileName = ref('')
const fileSize = ref(0)

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
    }
  },
  { immediate: true, flush: 'sync' }
)

onUnmounted(() => unsubscribe?.())

/** 格式化文件大小 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

/** 调原生对话框选文件，选好后写回节点；选新文件时自动删旧副本 */
async function chooseFile(): Promise<void> {
  const node = fileNode.value
  if (!node) return
  const prevName = node.fileName || ''

  const result = await window.fileApi.selectAndCopy({
    title: '选择 TXT 文件',
    extensions: node.getAcceptedExtensions()
  })
  if (!result) return // 用户取消

  if (prevName && prevName !== result.fileName) {
    await window.fileApi.delete(prevName)
  }
  node.setFile(result.fileName, result.size)
  try {
    const text = await window.fileApi.readText(result.fileName)
    node.setContent(text)
  } catch (err) {
    console.warn('[TxtFileNode] 读文件内容失败：', err)
  }
}

/** 清空节点：同时删除画布目录里的文件副本 */
async function clearFile(): Promise<void> {
  const node = fileNode.value
  if (!node) return
  if (node.fileName) {
    await window.fileApi.delete(node.fileName)
  }
  node.clearFile()
}

// 挂载时：如果有 fileName 但没内容，自动读一次兜底
onMounted(async () => {
  const node = fileNode.value
  if (!node) return
  if (node.fileName && !node.content) {
    try {
      const text = await window.fileApi.readText(node.fileName)
      node.setContent(text)
    } catch { /* 文件可能已被用户删了，静默忽略 */ }
  }
})
</script>

<template>
  <div class="file-card">
    <!-- 图标区：像系统文件图标一样，上面有个折角小三角 -->
    <div class="file-card__icon" @pointerdown="startDrag" title="拖动节点">
      <svg class="file-card__icon-svg" viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg">
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
        <text x="32" y="52" text-anchor="middle" font-size="11" font-weight="600" fill="#4a7cff" font-family="Helvetica, Arial, sans-serif">
          TXT
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

    <!-- 操作按钮 -->
    <div class="file-card__actions">
      <button class="btn btn--primary" @click="chooseFile" :disabled="!fileNode">
        {{ fileName ? '重新选择' : '选择文件' }}
      </button>
      <button
        v-if="fileName"
        class="btn"
        @click="clearFile"
        :disabled="!fileNode"
        title="删除文件"
      >
        清空
      </button>
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
    width: 64px;
    height: 72px;
    cursor: grab;
    user-select: none;
    &:active { cursor: grabbing; }
  }

  &__icon-svg {
    width: 100%;
    height: 100%;
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

  &__actions {
    display: flex;
    gap: 4px;
    width: 100%;
    justify-content: center;
    margin-top: 2px;
  }
}

.btn {
  padding: 3px 8px;
  border: 1px solid #d5d9e0;
  border-radius: 5px;
  background: #fff;
  font-size: 12px;
  cursor: pointer;

  &:hover:not(:disabled) { background: #f3f4f7; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }

  &--primary {
    border-color: #4a7cff;
    color: #4a7cff;
    &:hover:not(:disabled) { background: #eef3ff; }
  }
}
</style>
