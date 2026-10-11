<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { HumanReviewNode } from './node'
import type { Value } from '../../engine/data/Value'
import { viewport } from '@renderer/canvas/viewport'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { useNodeDetail } from '@renderer/composables/useNodeDetail'
import { messages } from './i18n'
import { resolveRenderer } from '@renderer/components/valueRenderers'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import HumanReviewHelpDialog from './HumanReviewHelpDialog.vue'

const props = defineProps<{ id: string }>()

const reviewNode = shallowRef<HumanReviewNode | undefined>(undefined)

// 卡片标题走插件 manifest 的多语言 title，未配当前语言时由 resolveNodeTitle 兜底
const nodeTitle = useNodeTitle(() => reviewNode.value, '?')

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)

// 帮助浮层开关（弹窗壳由 HelpDialog 负责）
const showHelp = ref(false)

// 拒绝理由对话框（卡片内 reject 按钮触发）
const showRejectDialog = ref(false)
const rejectReasonInput = ref('')

// 详情弹窗（替代原来的全屏审核弹窗）
const { openNodeDetail } = useNodeDetail()

// —— 从节点同步到渲染层的状态 ——
const currentLabel = ref('')
const pendingCount = ref(0)
const hasCurrent = ref(false)

/** 当前审核项的 Value 实例（传给 renderer 组件当 prop，renderer 靠 instance.constructor.VALUE_NAME 分发） */
const currentValue = ref<Value | undefined>(undefined)
/** 当前审核项的 kind（即 VALUE_NAME，字符串，便于模板做 === 判断） */
const currentKind = ref<string>('')

// 无待审核项时 node 侧返回空串，这里兜底成多语言占位文案（读 language，切语言会重算）
const labelText = computed(() => (hasCurrent.value ? currentLabel.value : t('awaitingInput')))

let unsubscribe: (() => void) | undefined

/** 同步节点状态到渲染层：核心只存 currentValue（Value 实例）和 currentKind */
function syncCurrent() {
  const n = reviewNode.value
  if (!n) return
  currentLabel.value = n.currentLabel
  pendingCount.value = n.pendingCount
  hasCurrent.value = n.hasCurrent
  const cv = n.currentValue
  currentValue.value = cv
  currentKind.value = cv ? ((cv.constructor as unknown) as { VALUE_NAME: string }).VALUE_NAME : ''
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
  if (!hasCurrent.value) return
  rejectReasonInput.value = ''
  showRejectDialog.value = true
}

function onRejectConfirm(): void {
  showRejectDialog.value = false
  reviewNode.value?.reject(rejectReasonInput.value)
  rejectReasonInput.value = ''
}

function onRejectCancel(): void {
  showRejectDialog.value = false
  rejectReasonInput.value = ''
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
    <NodeHeader
      :title="nodeTitle"
      @help="showHelp = true"
    >
      <template #actions>
        <button
          class="node__fs"
          type="button"
          :title="t('fullscreenBtnTitle')"
          @click.stop="openNodeDetail(id)"
        >⛶</button>
      </template>
    </NodeHeader>

    <div class="review" @wheel="onReviewWheel">
      <div class="review__label">{{ t('reviewLabel') }}</div>

      <!-- 无值 → 占位文案 -->
      <div v-if="!hasCurrent" class="review__value">{{ labelText }}</div>
      <!-- null 值 → 直接显示 (null)，不用 NullValueRenderer（它的 prop 类型要求 { isNull: true } 收窄，模板里做不到） -->
      <div v-else-if="currentValue?.isNull" class="review__value">(null)</div>
      <!-- 有值 → 按 kind 从注册表找 renderer -->
      <component v-else :is="resolveRenderer(currentKind)" :value="currentValue!" context="tooltip" />

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

  <!-- 拒绝理由对话框 -->
  <Teleport to="body">
    <div v-if="showRejectDialog" class="fs-mask" @click="onRejectCancel">
      <div class="rd-dialog" @click.stop>
        <div class="rd-header">
          <h3 class="rd-title">{{ t('rejectReasonTitle') }}</h3>
        </div>
        <div class="rd-body">
          <textarea
            class="rd-textarea"
            v-model="rejectReasonInput"
            :placeholder="t('rejectReasonPlaceholder')"
            rows="5"
          ></textarea>
        </div>
        <div class="rd-footer">
          <button class="rd-btn rd-btn--cancel" type="button" @click="onRejectCancel">
            {{ t('rejectReasonCancel') }}
          </button>
          <button class="rd-btn rd-btn--confirm" type="button" @click="onRejectConfirm">
            {{ t('rejectReasonConfirm') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
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
  overflow: hidden;
  position: relative;

  &__header {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px 48px 6px 22px;
    border-bottom: 1px dashed @node-border-color;
    flex-shrink: 0;
  }

  &__header-btns {
    position: absolute;
    right: 2px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    gap: 2px;
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

  &__fs {
    all: unset;
    cursor: pointer;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #f3f4f6;
    color: #6b7280;
    font-size: 11px;
    line-height: 1;
    transition: background 0.15s, color 0.15s;

    &:hover:not(:disabled) {
      background: #dbeafe;
      color: #2563eb;
    }

    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
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

<!-- 拒绝理由对话框样式：非 scoped，因为 Teleport 到 body -->
<style lang="less">
.fs-mask {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fsFadeIn 0.15s ease;
}

@keyframes fsFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fsPopIn {
  from { opacity: 0; transform: translateY(-12px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* 拒绝理由对话框样式 */
.rd-dialog {
  width: 480px;
  max-width: 90vw;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  animation: fsPopIn 0.2s ease;
  overflow: hidden;
}

.rd-header {
  flex-shrink: 0;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #fafbfc;
}

.rd-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.rd-body {
  flex: 1;
  padding: 20px;
}

.rd-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
  font-family: inherit;
  resize: vertical;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;

  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  }
}

.rd-footer {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid #e5e7eb;
  background: #fafbfc;
}

.rd-btn {
  padding: 8px 22px;
  border: 1px solid;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  min-width: 80px;

  &:not(:disabled):active {
    transform: translateY(1px);
  }
}

.rd-btn--cancel {
  background: #fff;
  border-color: #d1d5db;
  color: #374151;

  &:not(:disabled):hover {
    background: #f3f4f6;
  }
}

.rd-btn--confirm {
  background: #ef4444;
  border-color: #dc2626;
  color: #fff;

  &:not(:disabled):hover {
    background: #dc2626;
  }
}
</style>
