<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { HumanReviewNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import HumanReviewHelpDialog from './HumanReviewHelpDialog.vue'

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

// 无待审核项时 node 侧返回空串，这里兜底成多语言占位文案（读 language，切语言会重算）
const labelText = computed(() => (hasCurrent.value ? currentLabel.value : t('awaitingInput')))

let unsubscribe: (() => void) | undefined
const { startDrag } = useNodePosition(() => reviewNode.value)

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof HumanReviewNode) {
    reviewNode.value = found
    currentLabel.value = found.currentLabel
    pendingCount.value = found.pendingCount
    hasCurrent.value = found.hasCurrent
    unsubscribe = found.onChanged(() => {
      currentLabel.value = found.currentLabel
      pendingCount.value = found.pendingCount
      hasCurrent.value = found.hasCurrent
    })
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

    <div class="review">
      <div class="review__label">{{ t('reviewLabel') }}</div>
      <div class="review__value" :title="labelText">{{ labelText }}</div>

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
  overflow: hidden;

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
