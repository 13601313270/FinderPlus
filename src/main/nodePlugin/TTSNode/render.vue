<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { TTSNode } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import GearIcon from '@renderer/components/icons/GearIcon.vue'
import { useNodeDetail } from '@renderer/composables/useNodeDetail'
import { messages } from './i18n'
import { supportsReferenceAudio } from './providers'

const nodeTitle = useNodeTitle(TTSNode.TYPE)
const t = useLocalizedMessages(messages)
const { openNodeDetail } = useNodeDetail()

const props = defineProps<{ id: string }>()

const node = shallowRef<TTSNode | undefined>(undefined)
const status = ref<'idle' | 'loading' | 'done' | 'error'>('idle')
const errorMessage = ref('')
const localText = ref('')

// —— 只留画布上真正需要的状态 ——
const hasProviderConfig = ref(true)
const textConnected = ref(false)

const supportsRefAudio = computed(() => supportsReferenceAudio(node.value?.displayModel ?? 'qwen-audio-3.1-tts-next'))

let previewUrl: string | null = null
let lastPreviewHash = ''
const previewAudioUrl = ref<string | null>(null)
const audioEl = ref<HTMLAudioElement | null>(null)
let unsubscribe: (() => void) | undefined

function onAudioDurationChange(): void {
  console.log('[TTS-render] durationchange:', audioEl.value?.duration, 'readyState=', audioEl.value?.readyState)
}
function onAudioError(): void {
  const e = audioEl.value?.error
  console.log('[TTS-render] audio error:', e?.code, e?.message, 'src=', audioEl.value?.currentSrc?.slice(0, 60))
}
function onAudioCanPlay(): void {
  console.log('[TTS-render] canplay duration=', audioEl.value?.duration, 'readyState=', audioEl.value?.readyState)
}

function refresh(): void {
  const n = node.value
  if (!n) return
  status.value = n.displayStatus
  errorMessage.value = n.displayError
  localText.value = n.displayText
  hasProviderConfig.value = n.hasProviderKey
  textConnected.value = n.textInput.incomingEdgeCount > 0

  const f = n.previewFile
  const h = n.previewHash
  // 只有真的换了文件才重建 blob URL —— 否则 commitDuration 的 notifyChanged 会导致
  // loadedmetadata → commitDuration → notifyChanged → refresh 死循环，audio 被反复重建
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
  if (found instanceof TTSNode) {
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

// —— UI → Node ——
function onLocalTextInput(v: string): void { node.value?.setLocalText(v) }
function onGenerate(): void { node.value?.manualTrigger() }
function onCancel(): void { node.value?.cancel() }
</script>

<template>
  <div class="tts-card">
    <NodeHeader :title="nodeTitle">
      <template #actions>
        <button
          class="tts-config-btn"
          type="button"
          :title="t('openDetailTitle')"
          @click.stop="openNodeDetail(props.id)"
        >
          <GearIcon />
        </button>
      </template>
    </NodeHeader>

    <!-- 鉴权警告 -->
    <template v-if="status !== 'loading'">
      <div v-if="!hasProviderConfig" class="tts-warning">
        {{ t('apiKeyMissing') }}
      </div>
    </template>

    <!-- 文本输入区 -->
    <div class="tts-textarea-wrap">
      <textarea
        :value="localText"
        class="tts-textarea"
        :placeholder="supportsRefAudio ? t('textPlaceholder') + '（prompt 里用 @voice1 引用参考音频）' : t('textPlaceholder')"
        :disabled="textConnected"
        @input="(e: Event) => onLocalTextInput((e.target as HTMLTextAreaElement).value)"
      />
      <div v-if="textConnected" class="tts-port-badge">↗</div>
    </div>

    <div style="flex-grow: 1;"></div>

    <!-- 生成 / 取消 + Spinner -->
    <div class="tts-action">
      <button
        v-if="status === 'loading'"
        class="tts-btn tts-btn--cancel"
        type="button"
        @click="onCancel"
      >{{ t('cancelButton') }}</button>
      <button
        v-else
        class="tts-btn tts-btn--generate"
        type="button"
        :disabled="!hasProviderConfig"
        @click="onGenerate"
      >{{ t('generateButton') }}</button>
      <span v-if="status === 'loading'" class="tts-spinner" />
    </div>

    <!-- 错误提示 -->
    <div v-if="status === 'error' && errorMessage" class="tts-error">
      {{ errorMessage }}
    </div>

    <!-- 音频预览 -->
    <div v-if="status === 'done' && previewAudioUrl" class="tts-preview">
      <audio
        ref="audioEl"
        :src="previewAudioUrl"
        controls
        preload="auto"
        @durationchange="onAudioDurationChange"
        @error="onAudioError"
        @canplay="onAudioCanPlay"
      />
    </div>
  </div>
</template>

<style scoped lang="less">
.tts-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 8px 8px;
  height: 100%;
  box-sizing: border-box;
  overflow: auto;
}

.tts-config-btn {
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

.tts-warning {
  font-size: 11px;
  color: #b45309;
  background: #fef3c7;
  padding: 6px 8px;
  border-radius: 4px;
  line-height: 1.4;
}

.tts-textarea-wrap { position: relative; }

.tts-textarea {
  width: 100%;
  min-height: 80px;
  max-height: 140px;
  resize: vertical;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px;
  font-size: 12px;
  font-family: inherit;
  line-height: 1.5;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s;

  &:focus { border-color: #4f46e5; }
  &:disabled {
    background: #f9fafb;
    color: #9ca3af;
  }
}

.tts-port-badge {
  position: absolute;
  top: 4px;
  right: 6px;
  font-size: 14px;
  color: #6366f1;
  pointer-events: none;
}

.tts-action {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tts-btn {
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

.tts-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #e5e7eb;
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: tts-spin 0.8s linear infinite;
}

.tts-error {
  font-size: 11px;
  color: #dc2626;
  background: #fef2f2;
  padding: 6px 8px;
  border-radius: 4px;
  line-height: 1.4;
}

.tts-preview {
  display: flex;
  align-items: center;
  padding-top: 4px;
  border-top: 1px dashed #e5e7eb;

  audio {
    width: 100%;
    height: 32px;
  }
}

@keyframes tts-spin {
  to { transform: rotate(360deg); }
}
</style>
