<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { TTSNode } from './node'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'
import {
  isAudioGenModel,
  isMaasModel,
  type TtsLanguageType,
  type TtsModelId
} from './providers'

/**
 * TTSNode 的配置面板（detailPanel 中间栏）。
 * 画布 render.vue 只管"文本输入 + 生成按钮 + 预览"，
 * 所有模型/音色/语言/Workspace ID/指令/参考音频都在这里改。
 */
const props = defineProps<{ nodeId: string }>()

const t = useLocalizedMessages(messages)

const node = computed(() => {
  const n = workspaceScene.getNode(props.nodeId)
  return n instanceof TTSNode ? n : undefined
})

const model = ref<TtsModelId>('qwen-audio-3.1-tts-flash')
const voice = ref('')
const languageType = ref<TtsLanguageType>('Chinese')
const instructions = ref('')
const workspaceId = ref('')
const localRefAudioName = ref('')
const status = ref<'idle' | 'loading' | 'done' | 'error'>('idle')
const errorMessage = ref('')
const hasDashscopeKey = ref(true)
const hasWorkspaceId = ref(true)

let offChanged: (() => void) | undefined

// —— 模式判定（和 render.vue 一致）——
const isAudioGen = computed(() => isAudioGenModel(model.value))
const isMaasSimple = computed(() => model.value === 'qwen-audio-3.1-tts-flash')
const isMaas = computed(() => isMaasModel(model.value))
const isDashscope = computed(() => !isMaas.value)
const supportsInstructions = computed(() =>
  node.value?.modelSupportsInstructions ?? false
)
const hasProviderConfig = computed(() =>
  isMaas.value
    ? hasDashscopeKey.value && hasWorkspaceId.value
    : hasDashscopeKey.value
)

onMounted(() => {
  const n = node.value
  if (!n) return
  sync(n)
  offChanged = n.onChanged(() => {
    if (node.value) sync(node.value)
  })
})

onUnmounted(() => {
  offChanged?.()
})

watch(() => props.nodeId, () => {
  const n = node.value
  if (n) sync(n)
})

function sync(n: TTSNode): void {
  model.value = n.displayModel
  voice.value = n.displayVoice
  languageType.value = n.displayLanguage
  instructions.value = n.displayInstructions
  workspaceId.value = n.displayWorkspaceId
  status.value = n.displayStatus
  errorMessage.value = n.displayError
  hasDashscopeKey.value = n.hasDashscopeKey
  hasWorkspaceId.value = n.hasWorkspaceId
}

// —— UI → Node ——
function onModelChange(v: string): void { node.value?.setModel(v as TtsModelId) }
function onVoiceChange(v: string): void { node.value?.setVoice(v) }
function onLanguageChange(v: string): void { node.value?.setLanguage(v as TtsLanguageType) }
function onInstructionsInput(v: string): void { node.value?.setInstructions(v) }
function onWorkspaceIdInput(v: string): void { node.value?.setWorkspaceId(v) }
function onGenerate(): void { node.value?.manualTrigger() }
function onCancel(): void { node.value?.cancel() }

// —— 参考音频（本地选文件）——
async function onPickReferenceAudio(): Promise<void> {
  try {
    // @ts-ignore
    const picked = await window.fileApi.pickFile({
      multiple: false,
      filters: [{
        name: 'Audio',
        extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'webm', 'opus']
      }]
    })
    if (!picked?.length) return
    const path = picked[0].path
    // @ts-ignore
    const b64 = await window.fileApi.readBinary(path)
    localRefAudioName.value = path.split('/').pop() ?? path
    node.value?.setLocalReferenceAudio(b64)
  } catch (err) {
    console.warn('[TTSDetailPanel] pick reference audio failed', err)
  }
}

function onClearReferenceAudio(): void {
  localRefAudioName.value = ''
  node.value?.setLocalReferenceAudio('')
}
</script>

<template>
  <div class="detail-panel">
    <!-- 模型 -->
    <div class="detail-panel__section">
      <label class="detail-panel__label">{{ t('modelLabel') }}</label>
      <select
        class="detail-panel__select"
        :value="model"
        @change="(e: Event) => onModelChange((e.target as HTMLSelectElement).value)"
      >
        <option v-for="m in node?.availableModels ?? []" :key="m" :value="m">{{ m }}</option>
      </select>
      <div class="detail-panel__hint" v-if="isDashscope">
        {{ t('legacyModelHint') }}
      </div>
    </div>

    <!-- Workspace ID（MAAS 端点必填） -->
    <div v-if="isMaas" class="detail-panel__section">
      <label class="detail-panel__label">{{ t('workspaceIdLabel') }}</label>
      <input
        class="detail-panel__input"
        :value="workspaceId"
        :placeholder="t('workspaceIdPlaceholder')"
        @input="(e: Event) => onWorkspaceIdInput((e.target as HTMLInputElement).value)"
      />
    </div>

    <!-- 音色（dashscope 或 MAAS simple 显示；tts-next 音色来自参考音频） -->
    <div v-if="isDashscope || isMaasSimple" class="detail-panel__section">
      <label class="detail-panel__label">{{ t('voiceLabel') }}</label>
      <select
        class="detail-panel__select"
        :value="voice"
        @change="(e: Event) => onVoiceChange((e.target as HTMLSelectElement).value)"
      >
        <option v-for="v in node?.availableVoices ?? []" :key="v.id" :value="v.id">{{ v.label }}</option>
      </select>
    </div>

    <!-- 语言（仅 DashScope 模型） -->
    <div v-if="isDashscope" class="detail-panel__section">
      <label class="detail-panel__label">{{ t('languageLabel') }}</label>
      <select
        class="detail-panel__select"
        :value="languageType"
        @change="(e: Event) => onLanguageChange((e.target as HTMLSelectElement).value)"
      >
        <option v-for="lg in node?.availableLanguages ?? []" :key="lg" :value="lg">{{ lg }}</option>
      </select>
    </div>

    <!-- 指令控制 -->
    <div v-if="supportsInstructions" class="detail-panel__section">
      <label class="detail-panel__label">{{ t('instructionsLabel') }}</label>
      <input
        class="detail-panel__input"
        :value="instructions"
        :placeholder="t('instructionsPlaceholder')"
        @input="(e: Event) => onInstructionsInput((e.target as HTMLInputElement).value)"
      />
    </div>

    <!-- 参考音频（仅 tts-next 有） -->
    <template v-if="isAudioGen">
      <div class="detail-panel__section">
        <label class="detail-panel__label">{{ t('referenceAudioLabel') }}</label>
        <div v-if="node?.referenceAudioInput.incomingEdgeCount" class="detail-panel__connected">
          ↗ {{ t('referenceAudioConnectedHint') }}
        </div>
        <div v-else class="detail-panel__ref-local">
          <button type="button" class="detail-panel__ref-pick" @click.stop="onPickReferenceAudio">
            {{ localRefAudioName ? localRefAudioName : t('pickReferenceAudio') }}
          </button>
          <button
            v-if="localRefAudioName"
            type="button"
            class="detail-panel__ref-clear"
            @click.stop="onClearReferenceAudio"
            title="清除"
          >✕</button>
        </div>
        <div class="detail-panel__hint">{{ t('referenceAudioHint') }}</div>
      </div>
    </template>

    <!-- 鉴权警告 -->
    <div v-if="status !== 'loading' && !hasDashscopeKey" class="detail-panel__warn">
      {{ t('apiKeyMissing') }}
    </div>
    <div v-else-if="status !== 'loading' && isMaas && !hasWorkspaceId" class="detail-panel__warn">
      {{ t('workspaceIdMissing') }}
    </div>

    <div style="flex-grow: 1;"></div>

    <!-- 生成 / 取消 + Spinner -->
    <div class="detail-panel__action">
      <button
        v-if="status === 'loading'"
        class="detail-panel__btn detail-panel__btn--cancel"
        type="button"
        @click="onCancel"
      >{{ t('cancelButton') }}</button>
      <button
        v-else
        class="detail-panel__btn detail-panel__btn--generate"
        type="button"
        :disabled="!hasProviderConfig"
        @click="onGenerate"
      >{{ t('generateButton') }}</button>
      <span v-if="status === 'loading'" class="detail-panel__spinner" />
    </div>

    <!-- 错误提示 -->
    <div v-if="status === 'error' && errorMessage" class="detail-panel__error">
      {{ errorMessage }}
    </div>
  </div>
</template>

<style scoped lang="less">
.detail-panel {
  box-sizing: border-box;
  height: 100%;
  padding: 16px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;

  &__section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__label {
    font-size: 12px;
    font-weight: 600;
    color: #374151;
  }

  &__select,
  &__input {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
    background: #fff;
    color: #1f2937;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;

    &:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }
  }

  &__hint {
    font-size: 11px;
    color: #9ca3af;
    line-height: 1.4;
  }

  &__connected {
    font-size: 12px;
    color: #6366f1;
    padding: 6px 10px;
    background: #eef2ff;
    border-radius: 6px;
  }

  &__ref-local {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  &__ref-pick {
    all: unset;
    flex: 1;
    padding: 8px 10px;
    border: 1px dashed #a78bfa;
    background: #fff;
    color: #6d28d9;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    text-align: left;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;

    &:hover { background: #ede9fe; }
  }

  &__ref-clear {
    padding: 4px 10px;
    border: none;
    background: #f3f4f6;
    color: #6b7280;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;

    &:hover { background: #e5e7eb; color: #dc2626; }
  }

  &__warn {
    font-size: 11px;
    color: #b45309;
    background: #fef3c7;
    padding: 6px 8px;
    border-radius: 4px;
    line-height: 1.4;
  }

  &__action {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-top: 8px;
  }

  &__btn {
    flex: 1;
    padding: 9px 14px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
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

  &__spinner {
    width: 16px;
    height: 16px;
    border: 2.5px solid #e5e7eb;
    border-top-color: #4f46e5;
    border-radius: 50%;
    animation: detail-panel-spin 0.8s linear infinite;
  }

  &__error {
    font-size: 11px;
    color: #dc2626;
    background: #fef2f2;
    padding: 6px 8px;
    border-radius: 4px;
    line-height: 1.4;
  }
}

@keyframes detail-panel-spin {
  to { transform: rotate(360deg); }
}
</style>
