<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { TTSNode } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import { messages } from './i18n'
import type { TtsLanguageType, TtsModelId } from './providers'

const nodeTitle = useNodeTitle(TTSNode.TYPE)
const t = useLocalizedMessages(messages)

const props = defineProps<{ id: string }>()

const node = shallowRef<TTSNode | undefined>(undefined)
const status = ref<'idle' | 'loading' | 'done' | 'error'>('idle')
const errorMessage = ref('')

// —— 节点级配置镜像 ——
const model = ref<TtsModelId>('qwen3-tts-flash')
const voice = ref('Cherry')
const languageType = ref<TtsLanguageType>('Chinese')
const instructions = ref('')
const localText = ref('')

const hasKey = ref(true)
const textConnected = ref(false)

let previewUrl: string | null = null
const previewAudioUrl = ref<string | null>(null)
let unsubscribe: (() => void) | undefined

function refresh(): void {
  const n = node.value
  if (!n) return
  status.value = n.displayStatus
  errorMessage.value = n.displayError
  model.value = n.displayModel
  voice.value = n.displayVoice
  languageType.value = n.displayLanguage
  instructions.value = n.displayInstructions
  localText.value = n.displayText
  hasKey.value = n.hasProviderKey
  textConnected.value = n.textInput.incomingEdgeCount > 0
  // 预览音频
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl)
    previewUrl = null
  }
  const f = n.previewFile
  if (f) {
    previewUrl = URL.createObjectURL(f)
    previewAudioUrl.value = previewUrl
  } else {
    previewAudioUrl.value = null
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

function onModelChange(v: string): void {
  node.value?.setModel(v as TtsModelId)
}
function onVoiceChange(v: string): void { node.value?.setVoice(v) }
function onLanguageChange(v: string): void { node.value?.setLanguage(v as TtsLanguageType) }
function onInstructionsInput(v: string): void { node.value?.setInstructions(v) }
function onLocalTextInput(v: string): void { node.value?.setLocalText(v) }
function onGenerate(): void { node.value?.manualTrigger() }
function onCancel(): void { node.value?.cancel() }
function supportsInstructions(): boolean { return model.value === 'qwen3-tts-instruct-flash' }
</script>

<template>
  <div class="tts-card">
    <!-- 头部标题栏 -->
    <NodeHeader :title="nodeTitle" />

    <!-- 缺少 Key 警告 -->
    <div v-if="!hasKey && status !== 'loading'" class="tts-warning">
      {{ t('apiKeyMissing') }}
    </div>

    <!-- 文本输入区 -->
    <div class="tts-textarea-wrap">
      <textarea
        :value="localText"
        class="tts-textarea"
        :placeholder="t('textPlaceholder')"
        :disabled="textConnected"
        @input="(e: Event) => onLocalTextInput((e.target as HTMLTextAreaElement).value)"
      />
      <div v-if="textConnected" class="tts-port-badge">↗</div>
    </div>

    <!-- 配置行：音色 + 语言 -->
    <div class="tts-config">
      <label class="tts-field">
        <span class="tts-field-label">{{ t('voiceLabel') }}</span>
        <select :value="voice" @change="(e: Event) => onVoiceChange((e.target as HTMLSelectElement).value)">
          <option v-for="v in node?.availableVoices ?? []" :key="v.id" :value="v.id">{{ v.label }}</option>
        </select>
      </label>
      <label class="tts-field">
        <span class="tts-field-label">{{ t('languageLabel') }}</span>
        <select :value="languageType" @change="(e: Event) => onLanguageChange((e.target as HTMLSelectElement).value)">
          <option v-for="lg in node?.availableLanguages ?? []" :key="lg" :value="lg">{{ lg }}</option>
        </select>
      </label>
    </div>

    <!-- 模型选择 -->
    <div class="tts-config">
      <label class="tts-field">
        <span class="tts-field-label">{{ t('modelLabel') }}</span>
        <select :value="model" @change="(e: Event) => onModelChange((e.target as HTMLSelectElement).value)">
          <option v-for="m in node?.availableModels ?? []" :key="m" :value="m">{{ m }}</option>
        </select>
      </label>
    </div>

    <!-- 指令控制（仅 instruct-flash 模型显示） -->
    <div v-if="supportsInstructions()" class="tts-instructions">
      <label class="tts-field-label">{{ t('instructionsLabel') }}</label>
      <input
        :value="instructions"
        class="tts-instructions-input"
        :placeholder="t('instructionsPlaceholder')"
        @input="(e: Event) => onInstructionsInput((e.target as HTMLInputElement).value)"
      />
    </div>

    <!-- 生成按钮 / 取消按钮 / Spinner -->
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
        :disabled="!hasKey"
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
      <audio :src="previewAudioUrl" controls preload="metadata" />
    </div>
  </div>
</template>

<style scoped lang="less">
.tts-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  height: 100%;
  box-sizing: border-box;
  overflow: auto;
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
  min-height: 60px;
  max-height: 120px;
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

.tts-config {
  display: flex;
  gap: 8px;
}

.tts-field {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #6b7280;

  select {
    flex: 1;
    padding: 4px 6px;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    font-size: 11px;
    background: #fff;
    outline: none;

    &:focus { border-color: #4f46e5; }
  }
}

.tts-field-label {
  white-space: nowrap;
  min-width: 32px;
}

.tts-instructions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tts-instructions-input {
  width: 100%;
  padding: 5px 7px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 11px;
  outline: none;
  box-sizing: border-box;

  &:focus { border-color: #4f46e5; }
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
