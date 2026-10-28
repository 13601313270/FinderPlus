<script setup lang="ts">
import { debounce } from 'lodash-es'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { LLMNode, type ChatMessage, type LLMProviderId } from './node'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { useGlobalSettings } from '@renderer/composables/useGlobalSettings'
import {
  LLM_PROVIDERS,
  useLLMSettings,
  getProviderKey,
  type LLMProvider
} from '@renderer/composables/useLLMSettings'
import { messages } from './i18n'

/**
 * LLM 节点的详情面板中间栏：
 * - Provider 下拉 + Model 输入（可拉取模型列表）
 * - JSON / 连续对话 / 自动调用 开关
 * - 大号 prompt 编辑区（始终显示，不受端口连线影响）
 * - 发送 / 停止按钮
 * - 模型响应预览区
 * - 连续对话历史（chatMode 开启时显示，可清空）
 */
const props = defineProps<{ nodeId: string }>()

const t = useLocalizedMessages(messages)
const { openSettings: openGlobalSettings } = useGlobalSettings()
const { hasKey, fetchModels, modelLists } = useLLMSettings()

const llmNode = computed(() => {
  const n = workspaceScene.getNode(props.nodeId)
  return n instanceof LLMNode ? n : undefined
})

// —— 节点状态（镜像 LLMNode 的 getter）——
const provider = ref<LLMProviderId>('deepseek')
const model = ref('')
const jsonMode = ref(false)
const chatMode = ref(false)
const autoCall = ref(false)
const autoCallOnSystem = ref(false)
const localPrompt = ref('')
const promptConnected = ref(false)
const response = ref('')
const status = ref<'idle' | 'loading' | 'done' | 'error'>('idle')
const chatHistory = ref<ChatMessage[]>([])
const hasKeyNow = ref(false)

// —— 运行时 UI 状态 ——
const pullingModels = ref(false)
const pullError = ref('')

const providers = Object.entries(LLM_PROVIDERS) as [LLMProvider, typeof LLM_PROVIDERS[LLMProvider]][]
const running = computed(() => status.value === 'loading')
const currentDefaultModel = computed(() => LLM_PROVIDERS[provider.value as LLMProvider]?.defaultModel ?? '')
const currentPresetUrl = computed(() => LLM_PROVIDERS[provider.value as LLMProvider]?.url ?? '')
const modelListForProvider = computed(() => modelLists.value[provider.value as LLMProvider] ?? [])
const canPullModels = computed(() => !pullingModels.value && provider.value && hasKeyNow.value)
const chatCount = computed(() => chatHistory.value.length)

let offChanged: (() => void) | undefined

// 防抖 300ms：textarea 输入过程中不频繁触发 notifyChanged
const debouncedSetPrompt = debounce((val: string) => {
  llmNode.value?.setPrompt(val)
}, 300)

onMounted(() => {
  const node = llmNode.value
  if (!node) return
  sync(node)
  offChanged = node.onChanged(() => {
    if (llmNode.value) sync(llmNode.value)
  })
})

onUnmounted(() => {
  offChanged?.()
  debouncedSetPrompt.cancel()
})

watch(() => props.nodeId, () => {
  const node = llmNode.value
  if (node) sync(node)
})

function sync(node: LLMNode): void {
  provider.value = node.displayProvider
  model.value = node.displayModel
  jsonMode.value = node.displayJsonMode
  chatMode.value = node.displayChatMode
  autoCall.value = node.displayAutoCall
  autoCallOnSystem.value = node.displayAutoCallOnSystem
  localPrompt.value = node.displayLocalPrompt
  promptConnected.value = node.displayPromptConnected
  response.value = node.displayResponse
  status.value = node.displayStatus
  chatHistory.value = node.displayHistory.slice()
  hasKeyNow.value = node.hasProviderKey
}

// —— 事件处理 ——

function onProviderChange(e: Event): void {
  const val = (e.target as HTMLSelectElement).value as LLMProviderId
  llmNode.value?.setProvider(val)
}

function onModelInput(e: Event): void {
  const val = (e.target as HTMLInputElement).value
  model.value = val
  llmNode.value?.setModel(val)
}

function onJsonModeChange(e: Event): void {
  const val = (e.target as HTMLInputElement).checked
  jsonMode.value = val
  llmNode.value?.setJsonMode(val)
}

function onChatModeChange(e: Event): void {
  const val = (e.target as HTMLInputElement).checked
  chatMode.value = val
  llmNode.value?.setChatMode(val)
}

function onAutoCallChange(e: Event): void {
  const val = (e.target as HTMLInputElement).checked
  autoCall.value = val
  llmNode.value?.setAutoCall(val)
}

function onAutoCallOnSystemChange(e: Event): void {
  const val = (e.target as HTMLInputElement).checked
  autoCallOnSystem.value = val
  llmNode.value?.setAutoCallOnSystem(val)
}

function onPromptInput(e: Event): void {
  localPrompt.value = (e.target as HTMLTextAreaElement).value
  debouncedSetPrompt(localPrompt.value)
}

function onSend(): void {
  llmNode.value?.manualTrigger()
}

async function onStop(): Promise<void> {
  const confirmed = await window.showConfirm(t('stopConfirmTitle'), t('stopConfirmBody'))
  if (!confirmed) return
  llmNode.value?.cancel()
}

function onClearHistory(): void {
  llmNode.value?.clearHistory()
}

function onGearClick(e: MouseEvent): void {
  e.stopPropagation()
  openGlobalSettings('llm')
}

async function onPullModels(): Promise<void> {
  const key = getProviderKey(provider.value as LLMProvider)
  if (!key) {
    pullError.value = t('keyMissing')
    return
  }
  pullingModels.value = true
  pullError.value = ''
  try {
    const { ok, error } = await fetchModels(provider.value as LLMProvider, key)
    if (!ok && error) {
      pullError.value = error
    }
  } finally {
    pullingModels.value = false
  }
}

function onPickModel(e: Event): void {
  const val = (e.target as HTMLSelectElement).value
  if (val) {
    model.value = val
    llmNode.value?.setModel(val)
  }
}
</script>

<template>
  <div class="detail-panel">

    <!-- API Key 状态行 -->
    <div class="detail-panel__section">
      <label class="detail-panel__label">API Key</label>
      <div class="detail-panel__key-row">
        <span class="detail-panel__key-status" :class="{
          'detail-panel__key-status--ok': hasKeyNow,
          'detail-panel__key-status--miss': !hasKeyNow
        }">
          {{ hasKeyNow ? '✓ 已配置' : '✗ 未配置' }}
        </span>
        <span v-if="currentPresetUrl" class="detail-panel__url" :title="currentPresetUrl">
          {{ currentPresetUrl }}
        </span>
        <button class="detail-panel__btn detail-panel__btn--sm" type="button"
          :title="hasKey(provider as LLMProvider) ? t('keyConfigured') : t('keyMissing')"
          @click="onGearClick">⚙ 全局设置</button>
      </div>
    </div>

    <!-- Provider + Model -->
    <div class="detail-panel__row">
      <div class="detail-panel__section">
        <label class="detail-panel__label">Provider</label>
        <select class="detail-panel__select" :value="provider" @change="onProviderChange">
          <option v-for="[key, preset] in providers" :key="key" :value="key">
            {{ preset.label }}
          </option>
        </select>
      </div>
      <div class="detail-panel__section detail-panel__section--flex">
        <label class="detail-panel__label">Model</label>
        <div class="detail-panel__model-row">
          <input
            class="detail-panel__input"
            :value="model"
            :placeholder="currentDefaultModel"
            type="text"
            spellcheck="false"
            @input="onModelInput"
          />
          <select v-if="modelListForProvider.length > 0" class="detail-panel__select detail-panel__select--sm"
            :value="model" @change="onPickModel">
            <option value="">— —</option>
            <option v-for="m in modelListForProvider" :key="m" :value="m">{{ m }}</option>
          </select>
          <button class="detail-panel__btn" type="button"
            :disabled="!canPullModels || running"
            :title="pullingModels ? '拉取中…' : '从 /models 端点拉取可用模型'"
            @click="onPullModels">
            {{ pullingModels ? '…' : '↻' }}
          </button>
        </div>
        <div v-if="pullError" class="detail-panel__error">{{ pullError }}</div>
      </div>
    </div>

    <!-- 模式开关组 -->
    <div class="detail-panel__section">
      <label class="detail-panel__label">模式</label>
      <div class="detail-panel__toggles">
        <label v-if="provider === 'deepseek'" class="detail-panel__toggle">
          <input type="checkbox" :checked="jsonMode" @change="onJsonModeChange" />
          <span>JSON 模式</span>
        </label>
        <label class="detail-panel__toggle">
          <input type="checkbox" :checked="chatMode" @change="onChatModeChange" />
          <span>{{ t('chatMode') }}</span>
        </label>
        <label class="detail-panel__toggle">
          <input type="checkbox" :checked="autoCall" @change="onAutoCallChange" />
          <span>{{ t('autoCall') }}{{ promptConnected ? '' : '（仅端口接边时生效）' }}</span>
        </label>
        <label v-if="autoCall" class="detail-panel__toggle">
          <input type="checkbox" :checked="autoCallOnSystem" @change="onAutoCallOnSystemChange" />
          <span>{{ t('autoCallOnSystem') }}</span>
        </label>
      </div>
    </div>

    <!-- Prompt 编辑区（大） -->
    <div class="detail-panel__section">
      <label class="detail-panel__label">
        Prompt
        <span v-if="promptConnected" class="detail-panel__muted">
          （上游有输入，下游会覆盖；无输入时使用本地内容）
        </span>
      </label>
      <textarea
        class="detail-panel__textarea detail-panel__prompt"
        :value="localPrompt"
        :placeholder="t('promptPlaceholder')"
        rows="6"
        @input="onPromptInput"
      />
    </div>

    <!-- 操作按钮 -->
    <div class="detail-panel__actions">
      <button v-if="running" class="detail-panel__stop" type="button" @click="onStop">
        {{ t('stop') }}
      </button>
      <button v-else class="detail-panel__send" type="button"
        :disabled="!llmNode || (!localPrompt.trim() && !promptConnected)"
        @click="onSend">
        {{ t('send') }}
      </button>
      <button
        v-if="chatMode && chatCount > 0"
        class="detail-panel__btn"
        type="button"
        :title="t('clearHistory')"
        @click="onClearHistory"
      >🗑 {{ chatCount }}</button>
    </div>

    <!-- 响应预览区 -->
    <div class="detail-panel__section">
      <label class="detail-panel__label">响应</label>
      <div
        class="detail-panel__response"
        :class="{
          'detail-panel__response--empty': !response && !running,
          'detail-panel__response--error': status === 'error',
          'detail-panel__response--loading': running
        }"
      >
        <template v-if="running">
          <span class="detail-panel__spinner" />
          <span>{{ t('loading') }}</span>
        </template>
        <template v-else-if="response">
          {{ response }}
        </template>
        <template v-else>
          {{ llmNode ? (promptConnected ? t('waitingUpstream') : t('promptHint')) : t('nodeMissing') }}
        </template>
      </div>
    </div>

    <!-- 连续对话历史 -->
    <div v-if="chatMode" class="detail-panel__section">
      <label class="detail-panel__label">
        {{ t('chatMode') }} 历史
        <span class="detail-panel__muted">{{ chatCount }} 条</span>
      </label>
      <div class="detail-panel__history">
        <div v-if="chatCount === 0" class="detail-panel__history-empty">
          {{ t('historyEmpty') }}
        </div>
        <div v-else class="detail-panel__history-scroll">
          <div
            v-for="(msg, idx) in chatHistory"
            :key="idx"
            class="detail-panel__history-msg"
            :class="{
              'detail-panel__history-msg--user': msg.role === 'user',
              'detail-panel__history-msg--assistant': msg.role === 'assistant'
            }"
          >
            <span class="detail-panel__history-role">
              {{ msg.role === 'user' ? t('historyUser') : t('historyAssistant') }}
            </span>
            <pre class="detail-panel__history-content">{{ msg.content }}</pre>
          </div>
        </div>
      </div>
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

    &--flex {
      flex: 1;
      min-width: 0;
    }
  }

  &__row {
    display: flex;
    gap: 12px;
  }

  &__label {
    font-size: 12px;
    font-weight: 600;
    color: #374151;
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  &__muted {
    font-weight: 400;
    font-size: 11px;
    color: #9aa2ad;
  }

  // —— Key 状态行 ——

  &__key-row {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
  }

  &__key-status {
    font-weight: 600;
    white-space: nowrap;
    padding: 2px 8px;
    border-radius: 4px;

    &--ok {
      color: #047857;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
    }

    &--miss {
      color: #b45309;
      background: #fffbeb;
      border: 1px solid #fde68a;
    }
  }

  &__url {
    flex: 1;
    min-width: 0;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #6b7280;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  // —— 输入 / 下拉 ——

  &__input {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 13px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    outline: none;

    &:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }

    &::placeholder {
      color: #b4bcc7;
    }
  }

  &__select {
    width: 160px;
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background: #fff;
    font-size: 13px;
    outline: none;
    cursor: pointer;

    &:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }

    &--sm {
      width: auto;
      min-width: 140px;
      padding: 6px 8px;
      font-size: 12px;
    }
  }

  &__model-row {
    display: flex;
    gap: 6px;
    align-items: center;

    .detail-panel__input {
      flex: 1;
      min-width: 0;
    }
  }

  &__error {
    font-size: 11px;
    color: #dc2626;
  }

  &__textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 13px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    line-height: 1.6;
    resize: vertical;
    outline: none;

    &:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }
  }

  &__prompt {
    min-height: 120px;
  }

  // —— 开关组 ——

  &__toggles {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 18px;
  }

  &__toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #374151;
    cursor: pointer;
    user-select: none;

    input[type='checkbox'] {
      accent-color: #3b82f6;
      width: 14px;
      height: 14px;
    }
  }

  // —— 按钮 ——

  &__actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  &__send,
  &__stop {
    all: unset;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 20px;
    height: 36px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #fff;
    transition: background 0.15s;

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }

  &__send {
    background: #3b82f6;

    &:hover:not(:disabled) {
      background: #2563eb;
    }

    &:active:not(:disabled) {
      background: #1d4ed8;
    }
  }

  &__stop {
    background: #ef4444;

    &:hover {
      background: #dc2626;
    }

    &:active {
      background: #b91c1c;
    }
  }

  &__btn {
    all: unset;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 0 12px;
    height: 36px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 12px;
    color: #374151;
    background: #fff;
    white-space: nowrap;
    transition: border-color 0.15s, color 0.15s, background 0.15s;

    &:hover:not(:disabled) {
      border-color: #2563eb;
      color: #2563eb;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.4;
    }

    &--sm {
      height: 28px;
      padding: 0 10px;
      font-size: 11px;
    }
  }

  // —— 响应预览 ——

  &__response {
    box-sizing: border-box;
    padding: 12px 14px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #fafafa;
    font-size: 13px;
    line-height: 1.6;
    color: #1f2937;
    min-height: 80px;
    max-height: 260px;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    display: flex;
    align-items: center;
    gap: 8px;

    &--empty {
      color: #9aa2ad;
      font-style: italic;
      font-family: inherit;
      justify-content: center;
    }

    &--error {
      border-color: #fecaca;
      background: #fef2f2;
      color: #dc2626;
    }

    &--loading {
      color: #3b82f6;
      justify-content: flex-start;
    }
  }

  &__spinner {
    width: 12px;
    height: 12px;
    border: 2px solid #bfdbfe;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  // —— 对话历史 ——

  &__history {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #fafafa;
    overflow: hidden;

    &-empty {
      padding: 12px;
      font-size: 12px;
      color: #9aa2ad;
      font-style: italic;
      text-align: center;
    }

    &-scroll {
      max-height: 260px;
      overflow-y: auto;
      padding: 6px;
    }

    &-msg {
      display: flex;
      gap: 8px;
      padding: 6px 8px;
      font-size: 12px;
      line-height: 1.5;
      border-radius: 6px;
      margin-bottom: 4px;

      &--user {
        background: #eff6ff;
        color: #1e40af;
      }

      &--assistant {
        background: #f0fdf4;
        color: #166534;
      }
    }

    &-role {
      flex-shrink: 0;
      font-weight: 600;
      font-size: 11px;
      min-width: 36px;
      opacity: 0.8;
    }

    &-content {
      flex: 1;
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: inherit;
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
