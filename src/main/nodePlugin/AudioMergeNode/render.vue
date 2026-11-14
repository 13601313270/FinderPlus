<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { AudioMergeNode } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import { messages } from './i18n'

const nodeTitle = useNodeTitle(AudioMergeNode.TYPE)
const t = useLocalizedMessages(messages)

const props = defineProps<{ id: string }>()

const node = shallowRef<AudioMergeNode | undefined>(undefined)
const status = ref<'idle' | 'loading' | 'done' | 'error'>('idle')
const errorMessage = ref('')
const hasInput = ref(false)
const inputCount = ref(0)

let previewUrl: string | null = null
let lastPreviewHash = ''
const previewAudioUrl = ref<string | null>(null)
let unsubscribe: (() => void) | undefined

function refresh(): void {
  const n = node.value
  if (!n) return
  status.value = n.displayStatus
  errorMessage.value = n.displayError

  hasInput.value = n.hasValidInput
  inputCount.value = n.displayInputCount

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
  if (found instanceof AudioMergeNode) {
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

function onRun(): void {
  void node.value?.run()
}
</script>

<template>
  <div class="am-card">
    <NodeHeader :title="nodeTitle" />

    <div v-if="!hasInput" class="am-hint">{{ t('noAudioHint') }}</div>
    <div v-else class="am-count">{{ t('inputCount') }}：{{ inputCount }}</div>

    <div style="flex-grow: 1;"></div>

    <button
      class="am-btn"
      type="button"
      :disabled="status === 'loading' || !hasInput"
      @click="onRun"
    >
      {{ status === 'loading' ? t('merging') : t('mergeButton') }}
    </button>

    <div v-if="status === 'error' && errorMessage" class="am-error">
      {{ errorMessage }}
    </div>

    <div v-if="status === 'done' && previewAudioUrl" class="am-preview">
      <audio :src="previewAudioUrl" controls preload="metadata" />
    </div>
  </div>
</template>

<style scoped lang="less">
.am-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 8px 8px;
  height: 100%;
  box-sizing: border-box;
  overflow: auto;
}

.am-hint {
  font-size: 11px;
  color: #6b7280;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 4px;
  padding: 6px 8px;
}

.am-count {
  font-size: 11px;
  color: #4f46e5;
  background: #eef2ff;
  border-radius: 4px;
  padding: 6px 8px;
}

.am-btn {
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

.am-error {
  font-size: 11px;
  color: #dc2626;
  background: #fef2f2;
  padding: 6px 8px;
  border-radius: 4px;
  line-height: 1.4;
}

.am-preview {
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
