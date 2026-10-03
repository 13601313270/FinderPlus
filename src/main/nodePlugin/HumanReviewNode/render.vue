<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { HumanReviewNode } from './node'
import { JsonValue } from '../../engine/data/JsonValue'
import { viewport } from '@renderer/canvas/viewport'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import HumanReviewHelpDialog from './HumanReviewHelpDialog.vue'
import JsonTreeNode from '@renderer/components/JsonTreeNode.vue'

const props = defineProps<{ id: string }>()

const reviewNode = shallowRef<HumanReviewNode | undefined>(undefined)

// 卡片标题走插件 manifest 的多语言 title，未配当前语言时由 resolveNodeTitle 兜底
const nodeTitle = useNodeTitle(() => reviewNode.value, '?')

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)

// 帮助浮层开关（弹窗壳由 HelpDialog 负责）
const showHelp = ref(false)

const currentLabel = ref('')
const pendingCount = ref(0)
const hasCurrent = ref(false)
const currentIsJson = ref(false)
const jsonValue = ref<unknown>(undefined)

// 无待审核项时 node 侧返回空串，这里兜底成多语言占位文案（读 language，切语言会重算）
const labelText = computed(() => (hasCurrent.value ? currentLabel.value : t('awaitingInput')))

let unsubscribe: (() => void) | undefined
const { startDrag } = useNodePosition(() => reviewNode.value)

function syncCurrent() {
  const n = reviewNode.value
  if (!n) return
  currentLabel.value = n.currentLabel
  pendingCount.value = n.pendingCount
  hasCurrent.value = n.hasCurrent
  const cv = n.currentValue
  currentIsJson.value = cv instanceof JsonValue
  jsonValue.value = currentIsJson.value ? (cv as JsonValue).value : undefined
}

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof HumanReviewNode) {
    reviewNode.value = found
    syncCurrent()
    unsubscribe = found.onChanged(syncCurrent)
  }
})

onUnmounted(() => {
  unsubscribe?.()
})

function onApprove(): void {
  reviewNode.value?.approve()
}

function onReject(): void {
  reviewNode.value?.reject()
}

/**
 * review 区域 wheel 事件：当 JSON 树可滚动时，阻止 wheel 事件冒泡到画布视口（否则滚 JSON 树会同时平移画布）。
 * 逻辑同 JsonDisplayNode 的 onNodeWheel：顶部不能再滚时才允许向上冒泡，底部不能再滚时才允许向下冒泡。
 */
function onReviewWheel(e: WheelEvent): void {
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
const MIN_WIDTH = 220
const MAX_WIDTH = 600
const MIN_HEIGHT = 180
const MAX_HEIGHT = 500

function onResizePointerDown(e: PointerEvent): void {
  const n = reviewNode.value
  if (!n) return
  e.stopPropagation()
  e.preventDefault()

  const startClientX = e.clientX
  const startClientY = e.clientY
  const [startWidth, startHeight] = n.box

  function move(ev: PointerEvent): void {
    const cur = reviewNode.value
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
    <div class="node__header" @pointerdown="startDrag">
      <span class="node__handle" :title="t('dragHint')">{{ nodeTitle }}</span>
      <button
        class="node__help"
        type="button"
        :title="t('helpTitle')"
        @click.stop="showHelp = true"
      >?</button>
    </div>

    <div class="review" @wheel="onReviewWheel">
      <div class="review__label">{{ t('reviewLabel') }}</div>
      <!-- JSON 值 → 折叠树；其他类型 → 文本标签；无值 → 占位 -->
      <JsonTreeNode
        v-if="hasCurrent && currentIsJson"
        :value="jsonValue"
        :default-expanded="true"
      />
      <div v-else class="review__value" :title="labelText">{{ labelText }}</div>

      <div class="review__queue" v-if="pendingCount > 0">
        {{ t('queueRemaining', { n: pendingCount }) }}
      </div>
      <div class="review__queue review__queue--empty" v-else>{{ t('queueEmpty') }}</div>
    </div>

    <div class="actions">
      <button
        class="actions__btn actions__btn--approve"
        type="button"
        :disabled="!hasCurrent"
        @click="onApprove"
      >
        {{ t('approve') }}
      </button>
      <button
        class="actions__btn actions__btn--reject"
        type="button"
        :disabled="!hasCurrent"
        @click="onReject"
      >
        {{ t('reject') }}
      </button>
    </div>

    <div
      class="node__resize-handle"
      @pointerdown.stop.prevent="onResizePointerDown"
      title="拖动调整节点大小"
    />
  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
    <HumanReviewHelpDialog />
  </HelpDialog>
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 8px;
  padding-top: 0;
  background: @color-surface;
  border: 1px solid #d5d9e0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  position: relative;

  &__header {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px 22px;
    border-bottom: 1px dashed #d5d9e0;
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

.review {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  margin-top: 4px;
  border: 1px solid #e5e8ee;
  border-radius: 6px;
  margin-bottom: 8px;
  overflow: auto;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;

  &__label {
    font-size: 11px;
    color: @color-text-weak;
  }

  &__value {
    font-size: 13px;
    color: @color-text;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: inherit;
  }

  &__queue {
    margin-top: 2px;
    font-size: 11px;
    color: #6b7280;

    & strong {
      color: #3b82f6;
    }

    &--empty {
      font-style: italic;
      color: #9aa2ad;
    }
  }
}

.actions {
  display: flex;
  gap: 6px;

  &__btn {
    flex: 1;
    padding: 6px 0;
    border: 1px solid;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    &:not(:disabled):active {
      transform: translateY(1px);
    }

    &--approve {
      background: #22c55e;
      border-color: #16a34a;
      color: #fff;

      &:not(:disabled):hover {
        background: #16a34a;
      }
    }

    &--reject {
      background: #fff;
      border-color: #ef4444;
      color: #ef4444;

      &:not(:disabled):hover {
        background: #fef2f2;
      }
    }
  }
}
</style>
