<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { AudioTrimNode } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import { messages } from './i18n'

const nodeTitle = useNodeTitle(AudioTrimNode.TYPE)
const t = useLocalizedMessages(messages)

const props = defineProps<{ id: string }>()

const node = shallowRef<AudioTrimNode | undefined>(undefined)
const status = ref<'idle' | 'loading' | 'done' | 'error'>('idle')
const errorMessage = ref('')
const startTime = ref('0')
const endTime = ref('0')
const hasInputAudio = ref(false)

let previewUrl: string | null = null
let lastPreviewHash = ''
const previewAudioUrl = ref<string | null>(null)
let unsubscribe: (() => void) | undefined

function refresh(): void {
  const n = node.value
  if (!n) return
  status.value = n.displayStatus
  errorMessage.value = n.displayError
  startTime.value = String(n.displayStartTime)
  endTime.value = String(n.displayEndTime)
  hasInputAudio.value = n.inputAudioFile !== null

  const f = n.previewFile
  const h = n.previewHash
  if (h !== lastPreviewHash) {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      previewUrl = null
    }
    if (f) {
      previewUrl = URL.createObjectURL(f)
      previewAudioUrl.value = previewUrl
      lastPreviewHash = h
    } else {
      previewAudioUrl.value = null
      lastPreviewHash = ''
    }
  }
}

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof AudioTrimNode) {
    node.value = found
    unsubscribe = found.onChanged(() => refresh())
    refresh()
  }
})

onBeforeUnmount(() => {
  unsubscribe?.()
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl)
    previewUrl = null
  }
})

function onStartInput(e: Event): void {
  const v = (e.target as HTMLInputElement).value
  startTime.value = v
  node.value?.setStartTime(parseFloat(v) || 0)
}

function onEndInput(e: Event): void {
  const v = (e.target as HTMLInputElement).value
  endTime.value = v
  node.value?.setEndTime(parseFloat(v) || 0)
}

function onRun(): void {
  void node.value?.run()
}
</script>

<template>
  <div class="atr-card">
    <NodeHeader :title="nodeTitle" />

    <div v-if="!hasInputAudio" class="atr-hint">{{ t('noAudioHint') }}</div>

    <div class="atr-fields">
      <label class="atr-field">
        <span class="atr-label">{{ t('startTimeLabel') }}</span>
        <input
          class="atr-num"
          type="number"
          :value="startTime"
          step="0.1"
          min="0"
          @input="onStartInput"
        />
      </label>
      <label class="atr-field">
        <span class="atr-label">{{ t('endTimeLabel') }}</span>
        <input
          class="atr-num"
          type="number"
          :value="endTime"
          step="0.1"
          min="0"
          @input="onEndInput"
        />
      </label>
    </div>

    <div style="flex-grow: 1;"></div>

    <button
      class="atr-btn"
      type="button"
      :disabled="status === 'loading' || !hasInputAudio"
      @click="onRun"
    >
      {{ status === 'loading' ? t('trimming') : t('trimButton') }}
    </button>

    <div v-if="status === 'error' && errorMessage" class="atr-error">
      {{ errorMessage }}
    </div>

    <div v-if="status === 'done' && previewAudioUrl" class="atr-preview">
      <audio :src="previewAudioUrl" controls preload="metadata" />
    </div>
  </div>
</template>

<style scoped lang="less">
.atr-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 8px 8px;
  height: 100%;
  box-sizing: border-box;
  overflow: auto;
}

.atr-hint {
  font-size: 11px;
  color: #6b7280;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 4px;
  padding: 6px 8px;
}

.atr-fields {
  display: flex;
  gap: 8px;
}

.atr-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.atr-label {
  font-size: 11px;
  color: #6b7280;
}

.atr-num {
  width: 100%;
  height: 28px;
  padding: 0 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 12px;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s;

  &:focus { border-color: #4f46e5; }
}

.atr-btn {
  padding: 7px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  background: #4f46e5;
  color: #fff;
  transition: background 0.15s;

  &:hover:not(:disabled) { background: #4338ca; }
  &:disabled {
    background: #d1d5db;
    cursor: not-allowed;
  }
}

.atr-error {
  font-size: 11px;
  color: #dc2626;
  background: #fef2f2;
  padding: 6px 8px;
  border-radius: 4px;
  line-height: 1.4;
}

.atr-preview {
  display: flex;
  align-items: center;
  padding-top: 4px;
  border-top: 1px dashed #e5e7eb;

  audio {
    width: 100%;
    height: 32px;
  }
}
</style>