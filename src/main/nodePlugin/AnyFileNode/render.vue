<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { AnyFileNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useFileDragOut } from '@renderer/composables/useFileDragOut'
import { useFileOpenInSystem } from '@renderer/composables/useFileOpenInSystem'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import { messages } from './i18n'
import AnyFileHelpDialog from './AnyFileHelpDialog.vue'

const props = defineProps<{ id: string }>()

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)

// 帮助浮层开关（弹窗壳由 HelpDialog 负责）
const showHelp = ref(false)

const fileNode = computed(() => {
  const node = workspaceScene.getNode(props.id)
  return node instanceof AnyFileNode ? node : undefined
})

// —— 拖拽：窗口内移动（useNodePosition）+ 拖出外部（useFileDragOut）——
const { dragOutOpts, cleanup: cleanupDragOut } = useFileDragOut(() => fileNode.value)
const { startDrag } = useNodePosition(() => fileNode.value, dragOutOpts)

// —— 双击图标：用系统默认应用打开文件 ——
const { openInSystem } = useFileOpenInSystem()

// —— 文件名 / 文件大小 的 Vue 响应式包装 ——
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

onUnmounted(() => {
  unsubscribe?.()
  cleanupDragOut()
})

// 挂载时：如果已有 fileName（拖拽进来的 / 持久化恢复的），读内容 commit FileValue
onMounted(async () => {
  const node = fileNode.value
  if (node?.fileName) {
    await node.reloadFileContent()
  }
})

/** 格式化文件大小 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

/** 从文件名提取后缀缩写（如 'report.pdf' → 'PDF'，无后缀 → 'FILE'） */
function extLabel(name: string): string {
  if (!name) return 'FILE'
  const lastDot = name.lastIndexOf('.')
  if (lastDot <= 0 || lastDot === name.length - 1) return 'FILE'
  return name.slice(lastDot + 1).toUpperCase()
}

const fileExt = computed(() => extLabel(fileName.value))
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
        <path d="M38 2L58 22H44C41.79 22 40 20.21 40 18V2Z" fill="#eef3ff" stroke="#c5cbd4" stroke-width="1.5" />
        <!-- 类型标签（动态显示文件后缀缩写） -->
        <text x="32" y="52" text-anchor="middle" font-size="10" font-weight="600" fill="#4a7cff" font-family="Helvetica, Arial, sans-serif">
          {{ fileExt }}
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
    <AnyFileHelpDialog />
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
    // 图标区外观对齐图片文件节点（ImgFileNode）：灰底 + 内边框的方框，居中放图标
    width: 100%;
    flex: 1 1 auto;
    min-height: 0;
    border-radius: 6px;
    overflow: hidden;
    background: #f4f5f7;
    border: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__icon-svg {
    width: 46px;
    height: 52px;
    display: block;
    flex-shrink: 0;
  }

  &__name-row {
    width: 100%;
    text-align: center;
    font-size: 12px;
    line-height: 1.3;
    min-height: 14px;
    padding: 0 4px 4px;
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
