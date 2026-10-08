<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { PdfFileNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useFileDragOut } from '@renderer/composables/useFileDragOut'
import { useFileOpenInSystem } from '@renderer/composables/useFileOpenInSystem'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import { messages } from './i18n'
import PdfFileHelpDialog from './PdfFileHelpDialog.vue'

const props = defineProps<{ id: string }>()

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)

// 帮助浮层开关（弹窗壳由 HelpDialog 负责）
const showHelp = ref(false)

const fileNode = computed(() => {
  const node = workspaceScene.getNode(props.id)
  return node instanceof PdfFileNode ? node : undefined
})

// —— 拖拽：窗口内移动（useNodePosition）+ 拖出外部（useFileDragOut）——
const { dragOutOpts, cleanup: cleanupDragOut } = useFileDragOut(() => fileNode.value)
const { startDrag } = useNodePosition(() => fileNode.value, dragOutOpts)

// —— 双击图标：用系统默认应用打开文件 ——
const { openInSystem } = useFileOpenInSystem()

// —— 文件名 / 文件大小 / 文件被替换计数 的 Vue 响应式包装 ——
const fileName = ref('')
const fileSize = ref(0)
const fileRevision = ref(0)

let unsubscribe: (() => void) | undefined
watch(
  fileNode,
  (n) => {
    unsubscribe?.()
    unsubscribe = n?.onChanged(() => {
      fileName.value = n.fileName
      fileSize.value = n.fileSize
      fileRevision.value = n.fileRevision
    })
    if (n) {
      fileName.value = n.fileName
      fileSize.value = n.fileSize
      fileRevision.value = n.fileRevision
    } else {
      fileName.value = ''
      fileSize.value = 0
      fileRevision.value = 0
    }
  },
  { immediate: true, flush: 'sync' }
)

onUnmounted(() => {
  unsubscribe?.()
  cleanupDragOut()
})

/** 格式化文件大小 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

// 挂载时：如果有 fileName，自动读一次兜底（持久化恢复场景）
// 文件被替换时 watch(fileRevision) 也会触发重读
onMounted(async () => {
  const node = fileNode.value
  if (!node || !node.fileName) return
  try {
    const b64 = await window.fileApi.readBinary(node.fileName)
    node.setContent(b64)
  } catch { /* 文件可能已被用户删了，静默忽略 */ }
})
</script>

<template>
  <div
    class="file-card"
    @pointerdown="startDrag"
    @dblclick="openInSystem(fileNode?.fileName)"
    :title="fileNode?.fileName
      ? t('dragHint')
      : t('dragHintEmpty')"
  >
    <!-- 图标区：像系统文件图标一样，上面有个折角小三角 -->
    <div class="file-card__icon">
      <svg class="file-card__icon-svg" viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- 文件主体 -->
        <path
          d="M6 6C6 3.79 7.79 2 10 2H38L58 22V66C58 68.21 56.21 70 54 70H10C7.79 70 6 68.21 6 66V6Z"
          fill="#fff"
          stroke="#c5cbd4"
          stroke-width="1.5"
        />
        <!-- 折角三角 -->
        <path d="M38 2L58 22H44C41.79 22 40 20.21 40 18V2Z" fill="#ffeef3" stroke="#c5cbd4" stroke-width="1.5" />
        <!-- 类型标签 PDF（红色系，和蓝色 TXT/IMG 区分） -->
        <text x="32" y="52" text-anchor="middle" font-size="10" font-weight="600" fill="#e53e3e" font-family="Helvetica, Arial, sans-serif">
          PDF
        </text>
      </svg>
    </div>

    <!-- 文件名 -->
    <div class="file-card__name-row">
      <span v-if="fileName" class="file-card__name" :title="fileName">
        {{ fileName }}
      </span>
      <span v-else class="file-card__name file-card__name--empty">{{ t('emptyFile') }}</span>
      <span v-if="fileSize" class="file-card__size">
        {{ formatSize(fileSize) }}
      </span>
    </div>

    <!-- 帮助入口：悬浮在卡片右上角 -->
    <button
      class="file-card__help"
      type="button"
      :title="t('helpTitle')"
      @pointerdown.stop
      @dblclick.stop
      @click.stop="showHelp = true"
    >?</button>

  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
    <PdfFileHelpDialog />
  </HelpDialog>
</template>

<style scoped lang="less">
.file-card {
  box-sizing: border-box; // box 是内容区外包壳宽，border+padding 算在 box 内
  width: 100%; // 填满 NodeShell 的 .node-content（由 node.box 硬约束定宽高）
  height: 100%;
  overflow: hidden; // 内容超不出 box（文件名已 ellipsis）
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 10px 8px;
  background: @color-surface;
  border: 1px solid @node-border-color;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  position: relative; // 供右上角悬浮帮助按钮定位
  cursor: grab;
  user-select: none;
  &:active { cursor: grabbing; }

  &__icon {
    width: 64px;
    height: 72px;
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

  &__help {
    all: unset;
    position: absolute;
    top: 6px;
    right: 6px;
    cursor: pointer;
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
}
</style>
