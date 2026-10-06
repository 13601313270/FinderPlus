<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { FileInfoNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import FileInfoHelpDialog from './FileInfoHelpDialog.vue'

/**
 * 文件信息展示节点的渲染组件（只画卡片内容）。
 *
 * 定位、两侧端口这些所有节点共用的东西由 NodeShell 兜底，这里不碰。
 * 引擎里的三个字段都是普通类字段，Vue 追踪不到，所以用 ref 包一层，
 * 订阅 node.onChanged 时把最新值刷进 ref。
 */
const props = defineProps<{ id: string }>()

const infoNode = shallowRef<FileInfoNode | undefined>(undefined)

// 卡片标题走插件 manifest 的多语言 title，未配当前语言时由 resolveNodeTitle 兜底
const nodeTitle = useNodeTitle(() => infoNode.value, '?')

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)

// 帮助浮层开关（弹窗壳由 HelpDialog 负责）
const showHelp = ref(false)

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
    <div class="node__header" @pointerdown="startDrag">
      <span class="node__handle" :title="t('dragHint')">{{ nodeTitle }}</span>
      <button
        class="node__help"
        type="button"
        :title="t('helpTitle')"
        @click.stop="showHelp = true"
      >?</button>
    </div>
    <div class="file-info" :class="{ 'file-info--empty': !fileName }">
      <template v-if="fileName">
        <div class="file-info__row">
          <span class="file-info__label">{{ t('labelName') }}</span>
          <span class="file-info__value" :title="fileName">{{ fileName }}</span>
        </div>
        <div class="file-info__row">
          <span class="file-info__label">{{ t('labelSize') }}</span>
          <span class="file-info__value">{{ formatSize(fileSize) }}</span>
        </div>
        <div v-if="fileType" class="file-info__row">
          <span class="file-info__label">{{ t('labelType') }}</span>
          <span class="file-info__value">{{ fileType }}</span>
        </div>
      </template>
      <span v-else class="file-info__empty">{{ t('empty') }}</span>
    </div>
  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
    <FileInfoHelpDialog />
  </HelpDialog>
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box; // box 是内容区外包壳宽，border+padding 算在 box 内
  width: 100%; // 填满 NodeShell 的 .node-content（由 node.box 硬约束定宽高）
  height: 100%;
  overflow: auto; // 信息多时在框内滚动
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  background: @color-surface;
  border: 1px solid @node-border-color;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  &__header {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px 22px;
    border-bottom: 1px dashed @node-border-color;
    flex-shrink: 0;
  }

  &__handle {
    cursor: grab;
    user-select: none;
    font-size: 12px;
    color: @color-text-weak;
    text-align: center;

    &:active {
      cursor: grabbing;
    }
  }

  &__help {
    all: unset;
    position: absolute;
    right: 2px;
    top: 50%;
    transform: translateY(-50%);
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

.file-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  border: 1px solid @node-border-color;
  border-radius: 6px;
  font-size: 13px;
  flex-grow: 1;

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
