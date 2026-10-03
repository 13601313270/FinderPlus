<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { JsonDisplayNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'
import { viewport } from '@renderer/canvas/viewport'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import JsonDisplayHelpDialog from './JsonDisplayHelpDialog.vue'
import JsonTreeNode from '@renderer/components/JsonTreeNode.vue'

const props = defineProps<{ id: string }>()

const displayNode = shallowRef<JsonDisplayNode | undefined>(undefined)

// 卡片标题走插件 manifest 的多语言 title，未配当前语言时由 resolveNodeTitle 兜底
const nodeTitle = useNodeTitle(() => displayNode.value, '?')

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)

// 帮助浮层开关（弹窗壳由 HelpDialog 负责）
const showHelp = ref(false)

const parsed = ref<unknown>(undefined)
const parseError = ref<string | null>(null)
const hasInput = ref(false)

let unsubscribe: (() => void) | undefined

const { startDrag } = useNodePosition(() => displayNode.value)

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof JsonDisplayNode) {
    displayNode.value = found
    parsed.value = found.value
    parseError.value = found.parseError
    hasInput.value = found.hasInput
    unsubscribe = found.onChanged(() => {
      parsed.value = found.value
      parseError.value = found.parseError
      hasInput.value = found.hasInput
    })
  }
})

onUnmounted(() => {
  unsubscribe?.()
})

function onNodeWheel(e: WheelEvent): void {
  const el = e.currentTarget as HTMLElement
  const { scrollTop, scrollHeight, clientHeight } = el
  const atTop = scrollTop <= 0
  const atBottom = scrollTop + clientHeight >= scrollHeight

  const scrollingUp = e.deltaY < 0
  const scrollingDown = e.deltaY > 0

  if ((scrollingUp && atTop) || (scrollingDown && atBottom)) return

  e.stopPropagation()
}

// —— resize handle 拖拽 ——
const MIN_WIDTH = 200
const MAX_WIDTH = 800
const MIN_HEIGHT = 120
const MAX_HEIGHT = 600

function onResizePointerDown(e: PointerEvent): void {
  const n = displayNode.value
  if (!n) return
  e.stopPropagation()
  e.preventDefault()

  const startClientX = e.clientX
  const startClientY = e.clientY
  const [startWidth, startHeight] = n.box

  function move(ev: PointerEvent): void {
    const cur = displayNode.value
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

// collapse / expand hover 提示（来自 i18n）
const collapseTitle = computed(() => t('collapse'))
const expandTitle = computed(() => t('expand'))
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

    <div class="render-body" @wheel="onNodeWheel">
      <!-- 还没接过输入 -->
      <div v-if="!hasInput" class="render-empty">{{ t('noInput') }}</div>

      <!-- 解析失败 -->
      <div v-else-if="parseError" class="render-error">
        <div class="render-error__title">{{ t('parseErrorTitle') }}</div>
        <div class="render-error__msg">{{ parseError }}</div>
      </div>

      <!-- 空值（上游传来的是空字符串） -->
      <div v-else-if="parsed === undefined" class="render-empty">{{ t('emptyInput') }}</div>

      <!-- 解析成功 → 折叠树 -->
      <JsonTreeNode
        v-else
        :value="parsed"
        :default-expanded="true"
        :collapse-title="collapseTitle"
        :expand-title="expandTitle"
      />
    </div>

    <div
      v-if="displayNode"
      class="node__resize-handle"
      @pointerdown.stop.prevent="onResizePointerDown"
      :title="t('resizeHint')"
    />
  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
    <JsonDisplayHelpDialog />
  </HelpDialog>
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  overflow: auto;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  background: @color-surface;
  border: 1px solid #d5d9e0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  &__header {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px 22px;
    border-bottom: 1px dashed #d5d9e0;
    flex-shrink: 0;
  }

  &__handle {
    cursor: grab;
    user-select: none;
    font-size: 12px;
    color: @color-text-weak;
    text-align: center;

    &:active { cursor: grabbing; }
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

.render-body {
  flex: 1;
  overflow: auto;
  padding: 6px 8px;
  border: 1px solid #d5d9e0;
  border-radius: 6px;
  font-size: 13px;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  line-height: 1.6;
}

.render-empty {
  color: #9aa2ad;
  font-style: italic;
}

.render-error {
  &__title {
    color: #e54d42;
    font-weight: 600;
    margin-bottom: 4px;
  }
  &__msg {
    color: #c45656;
    font-size: 12px;
    word-break: break-all;
  }
}
</style>
