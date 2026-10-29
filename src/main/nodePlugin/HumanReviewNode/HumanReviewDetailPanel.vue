<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { HumanReviewNode, type ReviewMode } from './node'
import type { Value } from '../../engine/data/Value'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'
import { resolveRenderer } from '@renderer/components/valueRenderers'

const props = defineProps<{ nodeId: string }>()

const t = useLocalizedMessages(messages)

const reviewNode = shallowRef<HumanReviewNode | undefined>(undefined)

// —— 从节点同步到渲染层的状态 ——
const currentLabel = ref('')
const pendingCount = ref(0)
const hasCurrent = ref(false)

/** 当前审核项的 Value 实例（传给 renderer 组件当 prop，renderer 靠 instance.constructor.VALUE_NAME 分发） */
const currentValue = ref<Value | undefined>(undefined)
/** 当前审核项的 kind（即 VALUE_NAME，字符串，便于模板做 === 判断） */
const currentKind = ref<string>('')

// —— 审核模式 ——
const currentMode = ref<ReviewMode>('queue')

// —— 拒绝理由对话框 ——
const showRejectDialog = ref(false)
const rejectReasonInput = ref('')

/** 从 currentValue 取 File（meta 条统一展示文件名/大小/类型） */
const fsFile = computed<File | undefined>(() => {
  const cv = currentValue.value as { file?: File } | undefined
  return cv?.file
})

/** 字节数 → 可读体积 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

let unsubscribe: (() => void) | undefined

/** 同步节点状态到渲染层——内容预览全由各 renderer 组件 detail 模式负责 */
function syncCurrent() {
  const n = reviewNode.value
  if (!n) return
  currentLabel.value = n.currentLabel
  pendingCount.value = n.pendingCount
  hasCurrent.value = n.hasCurrent
  currentMode.value = n.reviewMode
  const cv = n.currentValue
  currentValue.value = cv
  currentKind.value = cv ? ((cv.constructor as unknown) as { VALUE_NAME: string }).VALUE_NAME : ''
}

onMounted(() => {
  const found = workspaceScene.getNode(props.nodeId)
  if (found instanceof HumanReviewNode) {
    reviewNode.value = found
    syncCurrent()
    unsubscribe = found.onChanged(syncCurrent)
  }
})

onUnmounted(() => {
  unsubscribe?.()
})

// —— 审核操作 ——

function onModeChange(e: Event): void {
  const v = (e.target as HTMLSelectElement).value as ReviewMode
  reviewNode.value?.setReviewMode(v)
}

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

function onRejectMaskClick(): void {
  showRejectDialog.value = false
}
</script>

<template>
  <div class="review-panel">
    <!-- 顶部：模式选择器 -->
    <div class="review-panel__mode">
      <label class="review-panel__mode-label">{{ t('modeLabel') }}</label>
      <select class="review-panel__mode-select" :value="currentMode" @change="onModeChange">
        <option value="queue">{{ t('modeQueue') }}</option>
        <option value="override">{{ t('modeOverride') }}</option>
      </select>
    </div>

    <div class="review-panel__body">
      <!-- 无待审核项 -->
      <div v-if="!hasCurrent" class="review-panel__empty">
        {{ t('fullscreenNoData') }}
      </div>

      <!-- 有值：文件类统一 meta 条 + renderer 组件 detail 模式 -->
      <template v-else>
        <div v-if="fsFile" class="review-panel__meta">
          <span>{{ fsFile.name }}</span>
          <span>{{ formatSize(fsFile.size) }}</span>
          <span>{{ fsFile.type }}</span>
        </div>
        <component
          :is="resolveRenderer(currentKind)"
          :value="currentValue!"
          context="detail"
        />
      </template>
    </div>

    <div class="review-panel__footer">
      <div class="review-panel__queue" v-if="pendingCount > 0">
        {{ t('queueRemaining', { n: pendingCount }) }}
      </div>
      <div class="review-panel__queue review-panel__queue--empty" v-else>{{ t('queueEmpty') }}</div>
      <div class="review-panel__actions">
        <button
          class="review-panel__btn review-panel__btn--reject"
          type="button"
          :disabled="!hasCurrent"
          @click="onReject"
        >{{ t('reject') }}</button>
        <button
          class="review-panel__btn review-panel__btn--approve"
          type="button"
          :disabled="!hasCurrent"
          @click="onApprove"
        >{{ t('approve') }}</button>
      </div>
    </div>
  </div>

  <!-- 拒绝理由对话框 -->
  <Teleport to="body">
    <div v-if="showRejectDialog" class="rp-mask" @click="onRejectMaskClick">
      <div class="rp-dialog" @click.stop>
        <div class="rp-header">
          <h3 class="rp-title">{{ t('rejectReasonTitle') }}</h3>
        </div>
        <div class="rp-body">
          <textarea
            class="rp-textarea"
            v-model="rejectReasonInput"
            :placeholder="t('rejectReasonPlaceholder')"
            rows="5"
          ></textarea>
        </div>
        <div class="rp-footer">
          <button class="rp-btn rp-btn--cancel" type="button" @click="onRejectCancel">
            {{ t('rejectReasonCancel') }}
          </button>
          <button class="rp-btn rp-btn--confirm" type="button" @click="onRejectConfirm">
            {{ t('rejectReasonConfirm') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="less">
.review-panel {
  box-sizing: border-box;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 12px;

  &__mode {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: #fafbfc;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
  }

  &__mode-label {
    font-size: 12px;
    font-weight: 600;
    color: #374151;
    flex-shrink: 0;
  }

  &__mode-select {
    flex: 1;
    padding: 6px 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
    color: #1f2937;
    background: #fff;
    cursor: pointer;
    outline: none;
    transition: border-color 0.15s;

    &:hover { border-color: #9ca3af; }
    &:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12); }
  }

  &__body {
    flex: 1;
    min-height: 0;
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    padding: 8px 14px;
    background: #f3f4f6;
    border-radius: 6px;
    font-size: 12px;
    color: #6b7280;
    font-family: 'Menlo', 'Monaco', 'Courier New', monospace;

    span {
      white-space: nowrap;
    }
  }

  &__empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #9aa2ad;
    font-size: 15px;
    font-style: italic;
  }

  &__footer {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    border-top: 1px solid #e5e7eb;
    background: #fafbfc;
    border-radius: 8px;
  }

  &__queue {
    font-size: 12px;
    color: #6b7280;

    & strong {
      color: #3b82f6;
    }

    &--empty {
      font-style: italic;
      color: #9aa2ad;
    }
  }

  &__actions {
    display: flex;
    gap: 12px;
  }

  &__btn {
    padding: 10px 28px;
    border: 1px solid;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    min-width: 100px;

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    &:not(:disabled):active {
      transform: translateY(1px);
    }
  }

  &__btn--approve {
    background: #22c55e;
    border-color: #16a34a;
    color: #fff;

    &:not(:disabled):hover {
      background: #16a34a;
    }
  }

  &__btn--reject {
    background: #fff;
    border-color: #ef4444;
    color: #ef4444;

    &:not(:disabled):hover {
      background: #fef2f2;
    }
  }
}
</style>

<!-- 拒绝理由对话框样式：非 scoped，因为 Teleport 到 body -->
<style lang="less">
.rp-mask {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: rpFadeIn 0.15s ease;
}

.rp-dialog {
  width: 480px;
  max-width: 90vw;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  animation: rpPopIn 0.2s ease;
  overflow: hidden;
}

.rp-header {
  flex-shrink: 0;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #fafbfc;
}

.rp-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.rp-body {
  flex: 1;
  padding: 20px;
}

.rp-textarea {
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

.rp-footer {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid #e5e7eb;
  background: #fafbfc;
}

.rp-btn {
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

.rp-btn--cancel {
  background: #fff;
  border-color: #d1d5db;
  color: #374151;

  &:not(:disabled):hover {
    background: #f3f4f6;
  }
}

.rp-btn--confirm {
  background: #ef4444;
  border-color: #dc2626;
  color: #fff;

  &:not(:disabled):hover {
    background: #dc2626;
  }
}

@keyframes rpFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes rpPopIn {
  from { opacity: 0; transform: translateY(-12px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
