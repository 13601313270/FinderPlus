<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { HumanReviewNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'

const props = defineProps<{ id: string }>()

const reviewNode = shallowRef<HumanReviewNode | undefined>(undefined)
const currentLabel = ref('（等待输入）')
const pendingCount = ref(0)
const hasCurrent = ref(false)

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
    <span class="node__handle" title="拖动节点" @pointerdown="startDrag">{{ reviewNode?.type ?? '?' }}</span>

    <div class="review">
      <div class="review__label">待审核</div>
      <div class="review__value" :title="currentLabel">{{ currentLabel }}</div>

      <div class="review__queue" v-if="pendingCount > 0">
        队列中还有 <strong>{{ pendingCount }}</strong> 项
      </div>
      <div class="review__queue review__queue--empty" v-else>队列为空</div>
    </div>

    <div class="actions">
      <button
        class="actions__btn actions__btn--approve"
        type="button"
        :disabled="!hasCurrent"
        @click="onApprove"
      >
        同意
      </button>
      <button
        class="actions__btn actions__btn--reject"
        type="button"
        :disabled="!hasCurrent"
        @click="onReject"
      >
        拒绝
      </button>
    </div>
  </div>
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 8px;
  background: @color-surface;
  border: 1px solid #d5d9e0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;

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

.review {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
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
