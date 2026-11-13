<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { STTNode } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import GearIcon from '@renderer/components/icons/GearIcon.vue'
import { useNodeDetail } from '@renderer/composables/useNodeDetail'
import { messages } from './i18n'

const nodeTitle = useNodeTitle(STTNode.TYPE)
const t = useLocalizedMessages(messages)
const { openNodeDetail } = useNodeDetail()

const props = defineProps<{ id: string }>()

const node = shallowRef<STTNode | undefined>(undefined)
const status = ref<'idle' | 'loading' | 'done' | 'error'>('idle')
const errorMessage = ref('')
const resultText = ref('')
const hasProviderKey = ref(true)
const canRun = ref(true)
const audioConnected = ref(false)
const upstreamAudioName = ref<string | undefined>(undefined)
const localAudioName = ref('')
const autoGenerate = ref(false)

const audioSourceLabel = computed(() => {
  if (audioConnected.value) {
    return t('audioConnected', { name: upstreamAudioName.value ?? '' })
  }
  if (localAudioName.value) return localAudioName.value
  return t('audioNotSelected')
})

function refresh(): void {
  const n = node.value
  if (!n) return
  status.value = n.displayStatus
  errorMessage.value = n.displayError
  resultText.value = n.displayResult
  hasProviderKey.value = n.hasProviderKey
  canRun.value = n.canRun
  audioConnected.value = n.audioConnected
  upstreamAudioName.value = n.upstreamAudioName
  localAudioName.value = n.displayLocalAudioName
  autoGenerate.value = n.displayAutoGenerate
}

let unsubscribe: (() => void) | undefined

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof STTNode) {
    node.value = found
    unsubscribe = found.onChanged(() => refresh())
    refresh()
  }
})

onBeforeUnmount(() => {
  unsubscribe?.()
})

// —— UI → Node ——
function onAutoGenerateChange(v: boolean): void { node.value?.setAutoGenerate(v) }
function onGenerate(): void { node.value?.manualTrigger() }
function onCancel(): void { node.value?.cancel() }
</script>

<template>
  <div class="stt-card">
    <NodeHeader :title="nodeTitle" hide-help>
      <template #actions>
        <button
          class="stt-config-btn"
          type="button"
          :title="t('openDetailTitle')"
          @click.stop="openNodeDetail(props.id)"
        >
          <GearIcon />
        </button>
      </template>
    </NodeHeader>

    <!-- 鉴权警告 -->
    <div v-if="status !== 'loading' && !canRun" class="stt-warning">
      {{ hasProviderKey ? t('workspaceMissing') : t('apiKeyMissing') }}
    </div>

    <!-- 音频来源 -->
    <div class="stt-source" :class="{ 'stt-source--connected': audioConnected }">
      <svg class="stt-source__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="2.6" />
      </svg>
      <span class="stt-source__text">{{ audioSourceLabel }}</span>
    </div>

    <!-- 自动识别开关 -->
    <label class="stt-auto-switch">
      <input
        type="checkbox"
        :checked="autoGenerate"
        @change="(e: Event) => onAutoGenerateChange((e.target as HTMLInputElement).checked)"
      />
      <span>{{ t('autoGenerate') }}</span>
    </label>

    <!-- 结果 -->
    <div class="stt-result">
      <div class="stt-result__label">{{ t('resultLabel') }}</div>
      <div v-if="resultText" class="stt-result__body">{{ resultText }}</div>
      <div v-else class="stt-result__empty">{{ t('emptyResult') }}</div>
    </div>

    <div style="flex-grow: 1;"></div>

    <!-- 识别 / 取消 + Spinner -->
    <div class="stt-action">
      <button
        v-if="status === 'loading'"
        class="stt-btn stt-btn--cancel"
        type="button"
        @click="onCancel"
      >{{ t('cancelButton') }}</button>
      <button
        v-else
        class="stt-btn stt-btn--generate"
        type="button"
        :disabled="!canRun"
        @click="onGenerate"
      >{{ t('generateButton') }}</button>
      <span v-if="status === 'loading'" class="stt-spinner" />
    </div>

    <!-- 错误提示 -->
    <div v-if="status === 'error' && errorMessage" class="stt-error">
      {{ errorMessage }}
    </div>
  </div>
</template>

<style scoped lang="less">
.stt-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 8px 8px;
  height: 100%;
  box-sizing: border-box;
  overflow: auto;
}

.stt-config-btn {
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
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;

  svg {
    width: 11px;
    height: 11px;
  }

  &:hover {
    background: #dbeafe;
    color: #2563eb;
  }
}

.stt-warning {
  font-size: 11px;
  color: #b45309;
  background: #fef3c7;
  padding: 6px 8px;
  border-radius: 4px;
  line-height: 1.4;
}

.stt-source {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #6b7280;
  background: #f9fafb;
  border: 1px dashed #e5e7eb;
  border-radius: 6px;
  padding: 6px 8px;
  line-height: 1.4;

  &--connected {
    color: #4338ca;
    border-color: #c7d2fe;
    background: #eef2ff;
  }

  &__icon {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }

  &__text {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}

.stt-auto-switch {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #6b7280;
  cursor: pointer;
  user-select: none;
  padding: 2px 0;

  input[type="checkbox"] {
    width: 12px;
    height: 12px;
    cursor: pointer;
    accent-color: #4f46e5;
  }
}

.stt-result {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 48px;

  &__label {
    font-size: 11px;
    font-weight: 600;
    color: #374151;
  }

  &__body {
    flex: 1;
    max-height: 90px;
    overflow: auto;
    font-size: 12px;
    line-height: 1.5;
    color: #1f2937;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 6px 8px;
    white-space: pre-wrap;
    word-break: break-word;
  }

  &__empty {
    font-size: 11px;
    color: #9ca3af;
    padding: 6px 0;
  }
}

.stt-action {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stt-btn {
  flex: 1;
  padding: 7px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;

  &--generate {
    background: #4f46e5;
    color: #fff;

    &:hover:not(:disabled) { background: #4338ca; }
    &:disabled {
      background: #d1d5db;
      cursor: not-allowed;
    }
  }

  &--cancel {
    background: #f3f4f6;
    color: #374151;

    &:hover { background: #e5e7eb; }
  }
}

.stt-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #e5e7eb;
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: stt-spin 0.8s linear infinite;
}

.stt-error {
  font-size: 11px;
  color: #dc2626;
  background: #fef2f2;
  padding: 6px 8px;
  border-radius: 4px;
  line-height: 1.4;
}

@keyframes stt-spin {
  to { transform: rotate(360deg); }
}
</style>
