<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { StringConcatNode } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { useNodeDetail } from '@renderer/composables/useNodeDetail'
import { viewport } from '@renderer/canvas/viewport'
import { messages } from './i18n'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import GearIcon from '@renderer/components/icons/GearIcon.vue'
import StringConcatHelpDialog from './StringConcatHelpDialog.vue'

/**
 * 字符串拼接节点的渲染组件（只画卡片内容）。
 *
 * 定位、两侧端口圆点由 NodeShell 统一兜底——左侧的输入端口从 $1、$2… 依次排列，
 * 用户照着端口标签在模板里写 $N 即可。这里只负责模板输入框、端口增删按钮和结果预览。
 */
const props = defineProps<{ id: string }>()

const concatNode = computed(() => {
  const node = workspaceScene.getNode(props.id)
  return node instanceof StringConcatNode ? node : undefined
})

// 卡片标题走插件 manifest 的多语言 title，未配当前语言时由 resolveNodeTitle 兜底
const nodeTitle = useNodeTitle(() => concatNode.value, '?')

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)

// 帮助浮层开关（弹窗壳由 HelpDialog 负责）
const showHelp = ref(false)

const { openNodeDetail } = useNodeDetail()

const resultValue = ref('')

let offChanged: (() => void) | undefined

onMounted(() => {
  const node = concatNode.value
  if (!node) return
  resultValue.value = node.displayResult
  offChanged = node.onChanged(() => {
    if (concatNode.value) {
      resultValue.value = concatNode.value.displayResult
    }
  })
})

onUnmounted(() => {
  offChanged?.()
})


// —— resize handle 拖拽：右下角双向自由调整宽高，不锁比例 ——
const MIN_WIDTH = 220
const MAX_WIDTH = 800
const MIN_HEIGHT = 180
const MAX_HEIGHT = 600

function onResizePointerDown(e: PointerEvent): void {
  const n = concatNode.value
  if (!n) return
  e.stopPropagation()
  e.preventDefault()

  const startClientX = e.clientX
  const startClientY = e.clientY
  const [startWidth, startHeight] = n.box

  function move(ev: PointerEvent): void {
    const cur = concatNode.value
    if (!cur) { end(); return }
    const scale = viewport.scale || 1
    const deltaW = (ev.clientX - startClientX) / scale
    const deltaH = (ev.clientY - startClientY) / scale
    const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(startWidth + deltaW)))
    const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(startHeight + deltaH)))
    cur.setBox(newWidth, newHeight)
  }
  function end(): void {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
  }

  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', end)
}
</script>

<template>
  <div class="node">
    <NodeHeader :title="nodeTitle" @help="showHelp = true">
      <template #actions>
        <button
          class="node__edit"
          type="button"
          :title="t('editTemplateHint')"
          @pointerdown.stop
          @click.stop="openNodeDetail(id)"
        >
          <GearIcon />
        </button>
      </template>
    </NodeHeader>

    <div class="node__result">
      <div class="node__result-text" :title="resultValue">{{ resultValue || t('resultPlaceholder') }}</div>
    </div>

    <div
      v-if="concatNode"
      class="node__resize-handle"
      @pointerdown.stop.prevent="onResizePointerDown"
      :title="t('resizeHint')"
    />
  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
    <StringConcatHelpDialog />
  </HelpDialog>
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  padding-top: 0;
  background: @color-surface;
  border: 1px solid @node-border-color;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  position: relative; // resize handle 绝对定位锚点
  overflow: hidden;

  &__edit {
    all: unset;
    cursor: pointer;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #f3f4f6;
    color: #6b7280;
    transition: background 0.15s, color 0.15s;
    flex-shrink: 0;

    svg {
      width: 12px;
      height: 12px;
    }

    &:hover {
      background: #dbeafe;
      color: #2563eb;
    }
  }

  &__result {
    flex-shrink: 0;
    position: relative;
    padding: 6px 8px;
    padding-right: 28px; // 给右上角展开按钮留空间
    border: 1px solid #e5e8ee;
    border-radius: 6px;
    background: #f7f8fa;
    font-size: 12px;
    color: @color-text;
    overflow: hidden;
    flex-grow: 1;
  }

  &__result-text {
    white-space: pre-wrap;
    word-break: break-all;
    overflow: hidden;
  }

  &__result-expand {
    all: unset;
    position: absolute;
    top: 2px;
    right: 2px;
    cursor: pointer;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    font-size: 20px;
    line-height: 1;
    color: #9ca3af;
    border: solid 1px;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: #dbeafe;
      color: #2563eb;
    }
  }

  &__resize-handle {
    position: absolute;
    right: 2px;
    bottom: 2px;
    width: 12px;
    height: 12px;
    cursor: nwse-resize;
    background: transparent;
    border-right: 2px solid #b0b7c3;
    border-bottom: 2px solid #b0b7c3;
    border-bottom-right-radius: 4px;
  }
}
</style>