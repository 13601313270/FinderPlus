<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { STTNode } from './node'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'
import { STT_LANGUAGES, STT_PROVIDERS, type SttProviderId } from './providers'

/**
 * STTNode 的配置面板（detailPanel 中间栏）。
 * 画布 render.vue 只管「音频来源 + 识别按钮 + 结果」，
 * 服务商 / 模型 / 语言 / Workspace ID / 本地音频都在这里改。
 */
const props = defineProps<{ nodeId: string }>()

const t = useLocalizedMessages(messages)

const node = computed(() => {
  const n = workspaceScene.getNode(props.nodeId)
  return n instanceof STTNode ? n : undefined
})

const provider = ref<SttProviderId>('siliconflow')
const model = ref('')
const workspaceId = ref('')
const language = ref('auto')
const status = ref<'idle' | 'loading' | 'done' | 'error'>('idle')
const errorMessage = ref('')
const resultText = ref('')
const hasProviderKey = ref(true)
const canRun = ref(true)
const audioConnected = ref(false)
const upstreamAudioName = ref<string | undefined>(undefined)
const localAudioName = ref('')

const providerIds = Object.keys(STT_PROVIDERS) as SttProviderId[]

const showWorkspace = computed(() => provider.value === 'aliyun')
const showLanguage = computed(
  () => provider.value === 'aliyun' || provider.value === 'tokenplan' || provider.value === 'openai'
)

let offChanged: (() => void) | undefined

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

function sync(n: STTNode): void {
  provider.value = n.displayProvider
  model.value = n.displayModel
  workspaceId.value = n.displayWorkspaceId
  language.value = n.displayLanguage
  status.value = n.displayStatus
  errorMessage.value = n.displayError
  resultText.value = n.displayResult
  hasProviderKey.value = n.hasProviderKey
  canRun.value = n.canRun
  audioConnected.value = n.audioConnected
  upstreamAudioName.value = n.upstreamAudioName
  localAudioName.value = n.displayLocalAudioName
}

// —— UI → Node ——
function onProviderChange(v: string): void { node.value?.setProvider(v as SttProviderId) }
function onModelChange(v: string): void { node.value?.setModel(v) }
function onWorkspaceIdInput(v: string): void { node.value?.setWorkspaceId(v) }
function onLanguageChange(v: string): void { node.value?.setLanguage(v) }
function onGenerate(): void { node.value?.manualTrigger() }
function onCancel(): void { node.value?.cancel() }

async function onPickAudio(): Promise<void> {
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
    const path = picked[0].path as string
    // @ts-ignore
    const b64 = await window.fileApi.readBinary(path)
    const name = path.split('/').pop() ?? path
    node.value?.setLocalAudio(b64, name)
  } catch (err) {
    console.warn('[STTDetailPanel] pick audio failed', err)
  }
}

function onClearAudio(): void {
  node.value?.clearLocalAudio()
}
</script>

<template>
  <div class="detail-panel">
    <!-- 服务商 -->
    <div class="detail-panel__section">
      <label class="detail-panel__label">{{ t('providerLabel') }}</label>
      <select
        class="detail-panel__select"
        :value="provider"
        @change="(e: Event) => onProviderChange((e.target as HTMLSelectElement).value)"
      >
        <option v-for="p in providerIds" :key="p" :value="p">{{ STT_PROVIDERS[p].label }}</option>
      </select>
    </div>

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
    </div>

    <!-- Workspace ID（仅百炼） -->
    <div v-if="showWorkspace" class="detail-panel__section">
      <label class="detail-panel__label">{{ t('workspaceIdLabel') }}</label>
      <input
        class="detail-panel__input"
        :value="workspaceId"
        :placeholder="t('workspaceIdPlaceholder')"
        @input="(e: Event) => onWorkspaceIdInput((e.target as HTMLInputElement).value)"
      />
    </div>

    <!-- 语言提示 -->
    <div v-if="showLanguage" class="detail-panel__section">
      <label class="detail-panel__label">{{ t('languageLabel') }}</label>
      <select
        class="detail-panel__select"
        :value="language"
        @change="(e: Event) => onLanguageChange((e.target as HTMLSelectElement).value)"
      >
        <option v-for="lg in STT_LANGUAGES" :key="lg.id" :value="lg.id">{{ lg.label }}</option>
      </select>
    </div>

    <!-- 音频来源 -->
    <div class="detail-panel__section">
      <label class="detail-panel__label">{{ t('audioLabel') }}</label>
      <div v-if="audioConnected" class="detail-panel__connected">
        ↗ {{ t('audioConnected', { name: upstreamAudioName ?? '' }) }}
      </div>
      <div v-else class="detail-panel__ref-local">
        <button type="button" class="detail-panel__ref-pick" @click.stop="onPickAudio">
          {{ localAudioName ? localAudioName : t('pickAudio') }}
        </button>
        <button
          v-if="localAudioName"
          type="button"
          class="detail-panel__ref-clear"
          @click.stop="onClearAudio"
        >{{ t('clearAudio') }}</button>
      </div>
    </div>

    <!-- 鉴权警告 -->
    <div v-if="status !== 'loading' && !canRun" class="detail-panel__warn">
      {{ hasProviderKey ? t('workspaceMissing') : t('apiKeyMissing') }}
    </div>

    <div style="flex-grow: 1;"></div>

    <!-- 识别 / 取消 -->
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
        :disabled="!canRun"
        @click="onGenerate"
      >{{ t('generateButton') }}</button>
      <span v-if="status === 'loading'" class="detail-panel__spinner" />
    </div>

    <!-- 错误提示 -->
    <div v-if="status === 'error' && errorMessage" class="detail-panel__error">
      {{ errorMessage }}
    </div>

    <!-- 识别结果 -->
    <div class="detail-panel__section">
      <label class="detail-panel__label">{{ t('resultLabel') }}</label>
      <div v-if="resultText" class="detail-panel__result">{{ resultText }}</div>
      <div v-else class="detail-panel__hint">{{ t('emptyResult') }}</div>
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

  &__result {
    font-size: 13px;
    line-height: 1.6;
    color: #1f2937;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 10px;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 260px;
    overflow-y: auto;
  }
}

@keyframes detail-panel-spin {
  to { transform: rotate(360deg); }
}
</style>
