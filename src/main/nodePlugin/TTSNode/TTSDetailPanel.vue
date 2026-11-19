<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { TTSNode } from './node'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'
import {
  isMaasModel,
  TTS_SAMPLE_RATES,
  type TtsLanguageType,
  type TtsModelId,
  type TtsSampleRate,
  type TtsProviderId
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

const provider = ref<TtsProviderId>('aliyun')
const model = ref<TtsModelId>('qwen3-tts-flash')
const voice = ref('')
const languageType = ref<TtsLanguageType>('Chinese')
const instructions = ref('')
const workspaceId = ref('')
const sampleRate = ref<TtsSampleRate>(24000)
const localRefAudioName = ref('')
const status = ref<'idle' | 'loading' | 'done' | 'error'>('idle')
const errorMessage = ref('')
const hasProviderConfig = ref(true)

// —— 复刻音色 UI 状态 ——

/** 当前音色来源：系统 / 复刻 */
const voiceSource = ref<'system' | 'custom'>('system')
/** 创建复刻音色的 dialog 是否打开 */
const showCloneDialog = ref(false)
/** 创建复刻音色 dialog 里：prefix */
const clonePrefix = ref('')
/** 创建复刻音色 dialog 里：参考音频 Data URI */
const cloneAudioDataUri = ref('')
const cloneAudioName = ref('')

let offChanged: (() => void) | undefined

// —— 模式判定（和 render.vue 一致）——
const isMaas = computed(() => isMaasModel(model.value))
const isTokenPlan = computed(() => provider.value === 'tokenplan')
const supportsRefAudio = computed(() => node.value?.supportsRefAudio ?? false)
const supportsInstructions = computed(() =>
  node.value?.modelSupportsInstructions ?? false
)
/** 当前模型是否支持复刻音色 */
const supportsCustomVoice = computed(() => node.value?.supportsCustomVoiceMode ?? false)
/** 复刻音色加载状态 */
const customVoiceLoadState = computed(() => node.value?.displayCustomVoiceLoadState ?? 'idle')
const customVoiceLoadError = computed(() => node.value?.displayCustomVoiceLoadError ?? '')
/** 复刻音色创建状态 */
const customVoiceCreateState = computed(() => node.value?.displayCustomVoiceCreateState ?? 'idle')
const customVoiceCreateError = computed(() => node.value?.displayCustomVoiceCreateError ?? '')
const customVoiceCreateSuccess = computed(() => customVoiceCreateState.value === 'done')
/** 复刻音色列表（含审核中的） */
const customVoicesAll = computed(() => node.value?.displayCustomVoices ?? [])

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
  provider.value = n.displayProvider
  model.value = n.displayModel
  voice.value = n.displayVoice
  languageType.value = n.displayLanguage
  instructions.value = n.displayInstructions
  workspaceId.value = n.displayWorkspaceId
  sampleRate.value = n.displaySampleRate
  status.value = n.displayStatus
  errorMessage.value = n.displayError
  hasProviderConfig.value = n.hasProviderKey
}

// —— UI → Node ——
function onProviderChange(v: string): void { node.value?.setProvider(v as TtsProviderId) }
function onModelChange(v: string): void { node.value?.setModel(v as TtsModelId) }
function onVoiceChange(v: string): void { node.value?.setVoice(v) }
function onLanguageChange(v: string): void { node.value?.setLanguage(v as TtsLanguageType) }
function onInstructionsInput(v: string): void { node.value?.setInstructions(v) }
function onWorkspaceIdInput(v: string): void { node.value?.setWorkspaceId(v) }
function onSampleRateChange(v: string): void { node.value?.setSampleRate(Number(v)) }
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

// —— 复刻音色 UI 方法 ——

async function onVoiceSourceChange(v: 'system' | 'custom'): Promise<void> {
  voiceSource.value = v
  // 切到复刻 tab 时自动拉一次列表（只在还没拉过时）
  if (v === 'custom' && node.value) {
    const state = node.value.displayCustomVoiceLoadState
    if (state === 'idle' || state === 'error') {
      await node.value.listCustomVoices()
    }
  }
}

function onRefreshCustomVoices(): void {
  node.value?.listCustomVoices()
}

function onCloneDialogOpen(): void {
  clonePrefix.value = ''
  cloneAudioDataUri.value = ''
  cloneAudioName.value = ''
  showCloneDialog.value = true
  node.value?.resetCustomVoiceCreateState()
}

function onCloneDialogClose(): void {
  showCloneDialog.value = false
  node.value?.resetCustomVoiceCreateState()
}

async function onClonePickAudio(): Promise<void> {
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
    const ext = path.split('.').pop()?.toLowerCase() ?? 'wav'
    const mime = ext === 'mp3' ? 'audio/mpeg' : `audio/${ext === 'wav' ? 'wav' : ext}`
    cloneAudioDataUri.value = `data:${mime};base64,${b64}`
    cloneAudioName.value = path.split('/').pop() ?? path
  } catch (err) {
    console.warn('[TTSDetailPanel] clone pick audio failed', err)
  }
}

function onCloneClearAudio(): void {
  cloneAudioDataUri.value = ''
  cloneAudioName.value = ''
}

async function onCloneSubmit(): Promise<void> {
  if (!node.value || !cloneAudioDataUri.value) return
  await node.value.createCustomVoice(cloneAudioDataUri.value, clonePrefix.value)
  // 创建成功后关闭 dialog
  if (customVoiceCreateSuccess.value) {
    await nextTick()
    showCloneDialog.value = false
  }
}

function onCustomVoiceSelect(voiceId: string): void {
  node.value?.setVoice(voiceId)
}

function onCustomVoiceLabel(v: { voice_id: string; status?: string }): string {
  const short = v.voice_id.split('-').slice(-1)[0] ?? v.voice_id
  const statusTag = v.status === 'DEPLOYING' ? `[${t('voiceDeploying')}]` : ''
  return `${short} ${statusTag}`
}
</script>

<template>
  <div class="detail-panel">
    <!-- Provider -->
    <div class="detail-panel__section">
      <label class="detail-panel__label">{{ t('providerLabel', { default: '服务商' }) }}</label>
      <select
        class="detail-panel__select"
        :value="provider"
        @change="(e: Event) => onProviderChange((e.target as HTMLSelectElement).value)"
      >
        <option value="aliyun">阿里云百炼</option>
        <option value="tokenplan">千问 Token Plan</option>
      </select>
      <div class="detail-panel__hint" v-if="isTokenPlan">
        Token Plan 端点能力有限：不支持参考音频音色克隆，仅提供系统音色合成。
      </div>
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

    <!-- Workspace ID（仅 DashScope MAAS 端点需要） -->
    <div v-if="isMaas && !isTokenPlan" class="detail-panel__section">
      <label class="detail-panel__label">{{ t('workspaceIdLabel') }}</label>
      <input
        class="detail-panel__input"
        :value="workspaceId"
        :placeholder="t('workspaceIdPlaceholder')"
        @input="(e: Event) => onWorkspaceIdInput((e.target as HTMLInputElement).value)"
      />
    </div>

    <!-- 音色 -->
    <div v-if="!supportsRefAudio" class="detail-panel__section">
      <!-- 支持复刻音色的模型：tab 切换 -->
      <template v-if="supportsCustomVoice">
        <label class="detail-panel__label">{{ t('voiceLabel') }}</label>
        <div class="detail-panel__voice-tabs">
          <button
            type="button"
            class="detail-panel__voice-tab"
            :class="{ 'is-active': voiceSource === 'system' }"
            @click.stop="onVoiceSourceChange('system')"
          >{{ t('voiceSourceSystem') }}</button>
          <button
            type="button"
            class="detail-panel__voice-tab"
            :class="{ 'is-active': voiceSource === 'custom' }"
            @click.stop="onVoiceSourceChange('custom')"
          >{{ t('voiceSourceCustom') }}</button>
        </div>

        <!-- 系统音色 tab -->
        <select
          v-if="voiceSource === 'system'"
          class="detail-panel__select"
          :value="voice"
          @change="(e: Event) => onVoiceChange((e.target as HTMLSelectElement).value)"
        >
          <option v-for="v in node?.availableVoices ?? []" :key="v.id" :value="v.id">{{ v.label }}</option>
        </select>

        <!-- 复刻音色 tab -->
        <div v-else class="detail-panel__custom-voices">
          <!-- 操作栏 -->
          <div class="detail-panel__custom-toolbar">
            <button
              type="button"
              class="detail-panel__btn detail-panel__btn--refresh"
              :disabled="customVoiceLoadState === 'loading'"
              @click.stop="onRefreshCustomVoices"
            >
              {{ customVoiceLoadState === 'loading' ? '…' : t('refreshVoices') }}
            </button>
            <button
              type="button"
              class="detail-panel__btn detail-panel__btn--clone"
              @click.stop="onCloneDialogOpen"
            >{{ t('cloneVoiceButton') }}</button>
          </div>

          <!-- 加载错误 -->
          <div v-if="customVoiceLoadState === 'error' && customVoiceLoadError" class="detail-panel__error">
            {{ customVoiceLoadError }}
          </div>

          <!-- 空状态 -->
          <div v-else-if="customVoiceLoadState === 'done' && customVoicesAll.length === 0" class="detail-panel__hint">
            {{ t('noCustomVoices') }}
          </div>

          <!-- 列表 -->
          <div v-else-if="customVoiceLoadState === 'done'" class="detail-panel__custom-list">
            <div
              v-for="v in customVoicesAll"
              :key="v.voice_id"
              class="detail-panel__custom-item"
              :class="{ 'is-selected': voice === v.voice_id, 'is-deploying': v.status === 'DEPLOYING', 'is-bad': v.status === 'UNDEPLOYED' }"
              @click.stop="onCustomVoiceSelect(v.voice_id)"
              :title="v.voice_id"
            >
              <span class="detail-panel__custom-label">{{ onCustomVoiceLabel(v) }}</span>
              <span
                v-if="v.status === 'OK'"
                class="detail-panel__custom-status detail-panel__custom-status--ok"
              >{{ t('voiceOk') }}</span>
              <span
                v-else-if="v.status === 'DEPLOYING'"
                class="detail-panel__custom-status detail-panel__custom-status--deploying"
              >{{ t('voiceDeploying') }}</span>
              <span
                v-else-if="v.status === 'UNDEPLOYED'"
                class="detail-panel__custom-status detail-panel__custom-status--bad"
              >{{ t('voiceDeploying') }}</span>
            </div>
          </div>
        </div>
      </template>

      <!-- 不支持复刻音色的模型：原来的下拉框 -->
      <template v-else>
        <label class="detail-panel__label">{{ t('voiceLabel') }}</label>
        <select
          class="detail-panel__select"
          :value="voice"
          @change="(e: Event) => onVoiceChange((e.target as HTMLSelectElement).value)"
        >
          <option v-for="v in node?.availableVoices ?? []" :key="v.id" :value="v.id">{{ v.label }}</option>
        </select>
      </template>
    </div>

    <!-- 语言（仅 DashScope 旧端点 qwen3-tts-flash） -->
    <div v-if="!isTokenPlan && !isMaas" class="detail-panel__section">
      <label class="detail-panel__label">{{ t('languageLabel') }}</label>
      <select
        class="detail-panel__select"
        :value="languageType"
        @change="(e: Event) => onLanguageChange((e.target as HTMLSelectElement).value)"
      >
        <option v-for="lg in node?.availableLanguages ?? []" :key="lg" :value="lg">{{ lg }}</option>
      </select>
    </div>

    <!-- 采样率（MAAS 端点可配） -->
    <div v-if="isMaas || isTokenPlan" class="detail-panel__section">
      <label class="detail-panel__label">{{ t('sampleRateLabel') }}</label>
      <select
        class="detail-panel__select"
        :value="sampleRate"
        @change="(e: Event) => onSampleRateChange((e.target as HTMLSelectElement).value)"
      >
        <option v-for="sr in TTS_SAMPLE_RATES" :key="sr" :value="sr">{{ sr }} Hz</option>
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

    <!-- 参考音频（仅 DashScope qwen-audio-3.1-tts-next 支持） -->
    <template v-if="supportsRefAudio">
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
    <div v-if="status !== 'loading' && !hasProviderConfig" class="detail-panel__warn">
      {{ t('apiKeyMissing') }}
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

  <!-- 创建复刻音色 Dialog -->
  <Teleport to="body">
    <div v-if="showCloneDialog" class="clone-dialog-mask" @click.self="onCloneDialogClose">
      <div class="clone-dialog">
        <div class="clone-dialog__header">
          <span class="clone-dialog__title">{{ t('cloneDialogTitle') }}</span>
          <button type="button" class="clone-dialog__close" @click.stop="onCloneDialogClose">✕</button>
        </div>

        <div class="clone-dialog__body">
          <!-- 音色名称 -->
          <div class="clone-dialog__field">
            <label class="detail-panel__label">{{ t('clonePrefixLabel') }}</label>
            <input
              class="detail-panel__input"
              :value="clonePrefix"
              :placeholder="t('clonePrefixPlaceholder')"
              @input="(e: Event) => { clonePrefix = (e.target as HTMLInputElement).value }"
            />
          </div>

          <!-- 参考音频 -->
          <div class="clone-dialog__field">
            <label class="detail-panel__label">{{ t('cloneAudioLabel') }}</label>
            <div class="detail-panel__ref-local">
              <button type="button" class="detail-panel__ref-pick" @click.stop="onClonePickAudio">
                {{ cloneAudioName || t('pickReferenceAudio') }}
              </button>
              <button
                v-if="cloneAudioName"
                type="button"
                class="detail-panel__ref-clear"
                @click.stop="onCloneClearAudio"
                title="清除"
              >✕</button>
            </div>
            <div class="detail-panel__hint">{{ t('cloneAudioHint') }}</div>
          </div>

          <!-- 创建状态 -->
          <div v-if="customVoiceCreateState === 'error' && customVoiceCreateError" class="detail-panel__error">
            {{ customVoiceCreateError }}
          </div>
          <div v-if="customVoiceCreateSuccess" class="clone-dialog__success">
            {{ t('cloneSuccess') }}
          </div>
        </div>

        <div class="clone-dialog__footer">
          <button type="button" class="detail-panel__btn detail-panel__btn--cancel" @click.stop="onCloneDialogClose">
            {{ t('cancelButton') }}
          </button>
          <button
            type="button"
            class="detail-panel__btn detail-panel__btn--generate"
            :disabled="!cloneAudioDataUri || customVoiceCreateState === 'loading'"
            @click.stop="onCloneSubmit"
          >
            {{ customVoiceCreateState === 'loading' ? '…' : t('cloneVoiceButton') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
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

// —— 音色来源 tab ——

.detail-panel__voice-tabs {
  display: flex;
  gap: 4px;
  background: #f3f4f6;
  border-radius: 6px;
  padding: 3px;
}

.detail-panel__voice-tab {
  all: unset;
  flex: 1;
  padding: 5px 8px;
  text-align: center;
  font-size: 11px;
  color: #6b7280;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  &.is-active {
    background: #fff;
    color: #4f46e5;
    font-weight: 500;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  }

  &:hover:not(.is-active) { color: #374151; }
}

// —— 复刻音色列表 ——

.detail-panel__custom-voices {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-panel__custom-toolbar {
  display: flex;
  gap: 6px;
}

.detail-panel__btn {
  &--refresh,
  &--clone {
    flex: 0 0 auto;
    padding: 5px 10px;
    font-size: 11px;
    border-radius: 4px;
  }

  &--refresh {
    background: #f3f4f6;
    color: #374151;

    &:hover:not(:disabled) { background: #e5e7eb; }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
  }

  &--clone {
    background: #4f46e5;
    color: #fff;

    &:hover { background: #4338ca; }
  }
}

.detail-panel__custom-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.detail-panel__custom-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 5px;
  background: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;

  &:hover { border-color: #c7d2fe; background: #f8faff; }

  &.is-selected {
    border-color: #4f46e5;
    background: #eef2ff;
    color: #4338ca;
  }

  &.is-deploying { opacity: 0.7; }
  &.is-bad { opacity: 0.5; }
}

.detail-panel__custom-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-panel__custom-status {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  flex-shrink: 0;
  margin-left: 6px;

  &--ok { background: #d1fae5; color: #065f46; }
  &--deploying { background: #fef3c7; color: #92400e; }
  &--bad { background: #fee2e2; color: #991b1b; }
}

// —— Dialog（Teleport 到 body）——

.clone-dialog-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.clone-dialog {
  background: #fff;
  border-radius: 10px;
  width: 360px;
  max-width: 90vw;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.clone-dialog__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
}

.clone-dialog__title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.clone-dialog__close {
  all: unset;
  cursor: pointer;
  font-size: 16px;
  color: #9ca3af;
  line-height: 1;

  &:hover { color: #374151; }
}

.clone-dialog__body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.clone-dialog__field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.clone-dialog__success {
  font-size: 11px;
  color: #065f46;
  background: #d1fae5;
  padding: 6px 8px;
  border-radius: 4px;
  line-height: 1.4;
}

.clone-dialog__footer {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #f3f4f6;
}
</style>
