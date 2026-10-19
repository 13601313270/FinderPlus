<script setup lang="ts">
import { debounce } from 'lodash-es'
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { LLMNode, type ChatMessage } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useNodeDetail } from '@renderer/composables/useNodeDetail'
import { LLM_PROVIDERS, type LLMProvider } from '@renderer/composables/useLLMSettings'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'
import GearIcon from '@renderer/components/icons/GearIcon.vue'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import LLMHelpDialog from './LLMHelpDialog.vue'

/**
 * LLM 节点的渲染组件：
 * - 节点配置行：provider 下拉 + model 输入 + jsonMode checkbox（仅 deepseek）
 * - 底部操作栏：左侧 prompt textarea（仅端口未连接时显示）+ 右侧发送按钮
 * - 控制栏有"自动调用"开关（仅 promptInput 接边时显示）
 */
const props = defineProps<{ id: string }>()

const { openNodeDetail } = useNodeDetail()

const t = useLocalizedMessages(messages)
const showHelp = ref(false)
const showFullResponse = ref(false)
const llmNode = shallowRef<LLMNode | undefined>(undefined)

const nodeTitle = useNodeTitle(() => llmNode.value, '?')
const response = ref('')
const status = ref<'idle' | 'loading' | 'done' | 'error'>('idle')
const autoCall = ref(false)
const promptConnected = ref(false)
const localPrompt = ref('')

// 节点级配置（从 LLMNode 实例读写）
const provider = ref<LLMProvider>('deepseek')
const model = ref('')
const jsonMode = ref(false)

// 连续对话模式
const chatMode = ref(false)
const chatHistory = ref<ChatMessage[]>([])

let unsubscribe: (() => void) | undefined


const providers = Object.entries(LLM_PROVIDERS) as [LLMProvider, typeof LLM_PROVIDERS[LLMProvider]][]

/** 当前 provider 的默认 model（model 为空时显示） */
const currentDefaultModel = computed(() => LLM_PROVIDERS[provider.value].defaultModel)

// 防抖 300ms：textarea 输入过程中不频繁触发 notifyChanged
const debouncedSetPrompt = debounce((val: string) => {
  llmNode.value?.setPrompt(val)
}, 300)

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof LLMNode) {
    llmNode.value = found
    response.value = found.displayResponse
    status.value = found.displayStatus
    autoCall.value = found.displayAutoCall
    promptConnected.value = found.displayPromptConnected
    localPrompt.value = found.displayLocalPrompt
    provider.value = found.displayProvider
    model.value = found.displayModel
    jsonMode.value = found.displayJsonMode
    chatMode.value = found.displayChatMode
    chatHistory.value = found.displayHistory.slice()

    unsubscribe = found.onChanged(() => {
      response.value = found.displayResponse
      status.value = found.displayStatus
      autoCall.value = found.displayAutoCall
      promptConnected.value = found.displayPromptConnected
      localPrompt.value = found.displayLocalPrompt
      chatMode.value = found.displayChatMode
      chatHistory.value = found.displayHistory.slice()
      // provider / model / jsonMode 改了也同步
      if (found.displayProvider !== provider.value) provider.value = found.displayProvider
      if (found.displayModel !== model.value) model.value = found.displayModel
      if (found.displayJsonMode !== jsonMode.value) jsonMode.value = found.displayJsonMode
    })
  }
})

onUnmounted(() => {
  unsubscribe?.()
  debouncedSetPrompt.cancel()
})

function onGearClick(e: MouseEvent): void {
  e.stopPropagation()
  openNodeDetail(props.id)
}

function onProviderChange(val: LLMProvider): void {
  provider.value = val
  llmNode.value?.setProvider(val)
}

function onModelChange(val: string): void {
  model.value = val
  llmNode.value?.setModel(val)
}

function onJsonModeChange(e: Event): void {
  const target = e.target as HTMLInputElement
  jsonMode.value = target.checked
  llmNode.value?.setJsonMode(target.checked)
}

function onAutoCallChange(e: Event): void {
  const target = e.target as HTMLInputElement
  llmNode.value?.setAutoCall(target.checked)
}

function onChatModeChange(e: Event): void {
  const target = e.target as HTMLInputElement
  llmNode.value?.setChatMode(target.checked)
}

function onClearHistory(): void {
  llmNode.value?.clearHistory()
}

function onPromptInput(val: string): void {
  localPrompt.value = val
  debouncedSetPrompt(val)
}

function onSendClick(): void {
  debouncedSetPrompt.flush()
  llmNode.value?.manualTrigger()
}

async function onStopClick(): Promise<void> {
  const confirmed = await window.showConfirm(t('stopConfirmTitle'), t('stopConfirmBody'))
  if (!confirmed) return
  llmNode.value?.cancel()
}
</script>

<template>
  <div class="node">
    <NodeHeader :title="nodeTitle" @help="showHelp = true">
      <template #actions>
        <button
          v-if="llmNode"
          class="node__gear"
          type="button"
          title="打开详情面板"
          @pointerdown.stop
          @click.stop="onGearClick"
        >
          <GearIcon />
        </button>
      </template>
    </NodeHeader>

    <!-- 节点级配置行：provider + model + jsonMode(仅 deepseek) -->
    <!-- <div v-if="llmNode" class="node__config-row">
      <select
        class="node__provider-select"
        :value="provider"
        @change="(e) => onProviderChange((e.target as HTMLSelectElement).value as LLMProvider)"
      >
        <option v-for="[key, preset] in providers" :key="key" :value="key">
          {{ preset.label }}
        </option>
      </select>
      <input
        class="node__model-input"
        :value="model"
        :placeholder="currentDefaultModel"
        type="text"
        spellcheck="false"
        @input="(e) => onModelChange((e.target as HTMLInputElement).value)"
      />
      <label v-if="provider === 'deepseek'" class="node__json-label" title="开启后响应强制为 JSON 格式">
        <input
          type="checkbox"
          :checked="jsonMode"
          @change="onJsonModeChange"
        />
        <span>JSON</span>
      </label>
      <label class="node__json-label node__chat-label" :title="t('chatModeHint')">
        <input
          type="checkbox"
          :checked="chatMode"
          @change="onChatModeChange"
        />
        <span>{{ t('chatMode') }}</span>
      </label>
    </div> -->

    <!-- 输出区 -->
    <div
      class="llm-output"
      :class="{
        'llm-output--empty': !response && status !== 'loading',
        'llm-output--error': status === 'error',
        'llm-output--loading': status === 'loading'
      }"
    >
      <template v-if="status === 'loading'">
        <span class="llm-output__spinner" />
        <span class="llm-output__loading-text">{{ t('loading') }}</span>
      </template>
      <template v-else-if="response">
        {{ response }}
      </template>
      <template v-else>
        {{ llmNode ? (promptConnected ? t('waitingUpstream') : t('promptHint')) : t('nodeMissing') }}
      </template>

      <button
        v-if="response"
        class="llm-output__expand"
        type="button"
        :title="t('expandResult')"
        @pointerdown.stop
        @click.stop="showFullResponse = true"
      >⤢</button>
    </div>

    <!-- 历史预览区（仅 chatMode 开启时显示） -->
    <div v-if="llmNode && chatMode" class="llm-history">
      <div class="llm-history__header">
        <span class="llm-history__title">{{ t('chatMode') }}（{{ chatHistory.length }}）</span>
      </div>
      <div class="llm-history__scroll">
        <template v-if="chatHistory.length === 0">
          <div class="llm-history__empty">{{ t('historyEmpty') }}</div>
        </template>
        <template v-else>
          <div
            v-for="(msg, idx) in chatHistory"
            :key="idx"
            class="llm-history__msg"
            :class="{
              'llm-history__msg--user': msg.role === 'user',
              'llm-history__msg--assistant': msg.role === 'assistant'
            }"
          >
            <span class="llm-history__role">{{ msg.role === 'user' ? t('historyUser') : t('historyAssistant') }}</span>
            <span class="llm-history__content">{{ msg.content }}</span>
          </div>
        </template>
      </div>
    </div>

    <!-- 底部操作栏：无连线时左 textarea + 右按钮；有连线时左自动开关 + 右按钮 -->
    <div class="node__bottom" v-if="llmNode">
      <template v-if="!promptConnected">
        <textarea
          class="node__prompt"
          v-model="localPrompt"
          :placeholder="t('promptPlaceholder')"
          rows="1"
          @input="(e) => onPromptInput((e.target as HTMLTextAreaElement).value)"
        />
      </template>
      <template v-else>
        <label class="node__switch">
          <input type="checkbox" :checked="autoCall" @change="onAutoCallChange" />
          <span class="node__switch-track"><span class="node__switch-thumb" /></span>
          <span class="node__switch-label">{{ t('autoCall') }}</span>
        </label>
      </template>
      <button
        v-if="chatMode && chatHistory.length > 0"
        class="node__clear-history"
        type="button"
        :title="t('clearHistory')"
        @click="onClearHistory"
      >
        🗑
      </button>
      <button
        v-if="status === 'loading'"
        class="node__send node__send--stop"
        type="button"
        @click="onStopClick"
      >
        {{ t('stop') }}
      </button>
      <button
        v-else
        class="node__send"
        type="button"
        @click="onSendClick"
      >
        {{ t('send') }}
      </button>
    </div>
  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
    <LLMHelpDialog />
  </HelpDialog>

  <!-- 完整响应覆层 -->
  <HelpDialog
    :visible="showFullResponse"
    :title="t('fullResponseDialogTitle')"
    width="80vw"
    @close="showFullResponse = false"
  >
    <pre class="full-response">{{ response }}</pre>
  </HelpDialog>
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  padding-top: 0;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px dashed @node-border-color;
    padding-bottom: 4px;
    cursor: grab;
    user-select: none;

    &:active {
      cursor: grabbing;
    }
  }

  &__handle {
    font-size: 12px;
    color: @color-text-weak;
    padding: 2px 0;
  }

  &__header-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-left: auto;
  }

  // —— 节点配置行 ——
  &__config-row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  &__provider-select {
    font-size: 11px;
    padding: 3px 6px;
    border: 1px solid @node-border-color;
    border-radius: 4px;
    background: #fff;
    color: #374151;
    outline: none;
    cursor: pointer;

    &:focus {
      border-color: #3b82f6;
    }
  }

  &__model-input {
    flex: 1;
    min-width: 0;
    font-size: 11px;
    padding: 3px 6px;
    border: 1px solid @node-border-color;
    border-radius: 4px;
    background: #fff;
    color: #374151;
    outline: none;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;

    &:focus {
      border-color: #3b82f6;
    }

    &::placeholder {
      color: #b4bcc7;
    }
  }

  &__json-label {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 10px;
    color: #0369a1;
    cursor: pointer;
    user-select: none;
    padding: 2px 6px;
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 4px;
    flex-shrink: 0;

    input {
      margin: 0;
      width: 11px;
      height: 11px;
      accent-color: #3b82f6;
    }

    span {
      font-weight: 500;
    }
  }

  // —— 底部操作栏（不变） ——

  &__gear {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 4px;
    color: #6b7280;
    transition: color 0.15s, background 0.15s;

    &:hover {
      color: #111827;
      background: #f3f4f6;
    }

    &:active {
      background: #e5e7eb;
    }
  }

  &__switch {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #6b7280;
    cursor: pointer;
    user-select: none;
    flex-grow: 1;

    input[type='checkbox'] {
      display: none;
    }

    &-track {
      position: relative;
      width: 32px;
      height: 18px;
      background: #d1d5db;
      border-radius: 10px;
      transition: background 0.2s;
    }

    input:checked + &-track {
      background: #3b82f6;
    }

    &-thumb {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 14px;
      height: 14px;
      background: #fff;
      border-radius: 50%;
      transition: transform 0.2s;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }

    input:checked + &-track &-thumb {
      transform: translateX(14px);
    }

    &-label {
      font-size: 12px;
    }
  }

  &__bottom {
    display: flex;
    align-items: stretch;
    gap: 6px;
    flex-shrink: 0;
  }

  &__prompt {
    flex: 1;
    box-sizing: border-box;
    min-height: 32px;
    max-height: 96px;
    resize: none;
    padding: 6px 8px;
    font-size: 12px;
    font-family: inherit;
    border: 1px solid @node-border-color;
    border-radius: 6px;
    outline: none;
    line-height: 1.5;
    overflow-y: auto;
    transition: border-color 0.15s;

    &:focus {
      border-color: #3b82f6;
    }

    &::placeholder {
      color: #9aa2ad;
    }
  }

  &__send {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 18px;
    font-size: 13px;
    font-weight: 500;
    color: #fff;
    background: #3b82f6;
    border-radius: 6px;
    white-space: nowrap;
    transition: background 0.15s;
    height: 32px;

    &:hover:not(:disabled) {
      background: #2563eb;
    }

    &:active:not(:disabled) {
      background: #1d4ed8;
    }

    &:disabled {
      cursor: not-allowed;
      background: #93c5fd;
    }

    // 停止按钮（loading 时显示）：红色系
    &--stop {
      background: #ef4444;

      &:hover {
        background: #dc2626;
      }

      &:active {
        background: #b91c1c;
      }
    }
  }
}

.llm-output {
  padding: 10px;
  padding-right: 32px; // 给右上角展开按钮留空间
  border: 1px solid @node-border-color;
  border-radius: 6px;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-all;
  flex: 1;
  min-height: 60px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1f2937;
  overflow: auto;
  position: relative; // 展开按钮的绝对定位锚点

  &--empty {
    color: #9aa2ad;
    font-style: italic;
  }

  &--error {
    color: #dc2626;
    border-color: #fecaca;
    background: #fef2f2;
  }

  &--loading {
    justify-content: flex-start;
    color: #3b82f6;
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

  &__loading-text {
    font-size: 12px;
  }

  &__expand {
    all: unset;
    position: absolute;
    top: 2px;
    right: 2px;
    cursor: pointer;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    font-size: 18px;
    line-height: 1;
    color: #9ca3af;
    border: solid 1px transparent;
    transition: background 0.15s, color 0.15s, border-color 0.15s;

    &:hover {
      background: #dbeafe;
      color: #2563eb;
      border-color: #bfdbfe;
    }
  }
}

/* 完整响应弹窗内的 pre */
.full-response {
  margin: 0;
  padding: 12px 16px;
  max-height: 70vh;
  overflow: auto;
  font-size: 13px;
  line-height: 1.6;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  white-space: pre-wrap;
  word-break: break-all;
  background: #f7f8fa;
  border-radius: 8px;
  color: #1f2937;
  user-select: text;
}

// —— 连续对话模式样式 ——

.node__chat-label {
  background: #fef3c7;
  border-color: #fde68a;
  color: #92400e;
}

.node__clear-history {
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: #fff;
  border: 1px solid @node-border-color;
  font-size: 14px;
  color: #6b7280;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  flex-shrink: 0;

  &:hover {
    background: #fef2f2;
    border-color: #fecaca;
    color: #dc2626;
  }
}

.llm-history {
  border: 1px solid @node-border-color;
  border-radius: 6px;
  background: #fafafa;
  overflow: hidden;
  flex-shrink: 0;

  &__header {
    display: flex;
    align-items: center;
    padding: 4px 8px;
    background: #f3f4f6;
    border-bottom: 1px solid @node-border-color;
  }

  &__title {
    font-size: 10px;
    color: #6b7280;
    font-weight: 500;
  }

  &__scroll {
    max-height: 120px;
    overflow-y: auto;
    padding: 4px;
  }

  &__empty {
    font-size: 11px;
    color: #9aa2ad;
    font-style: italic;
    text-align: center;
    padding: 8px;
  }

  &__msg {
    display: flex;
    gap: 4px;
    padding: 3px 4px;
    font-size: 11px;
    line-height: 1.4;
    border-radius: 3px;
    margin-bottom: 2px;
    word-break: break-all;

    &--user {
      background: #eff6ff;
      color: #1e40af;
    }

    &--assistant {
      background: #f0fdf4;
      color: #166534;
    }
  }

  &__role {
    flex-shrink: 0;
    font-weight: 600;
    font-size: 10px;
    opacity: 0.7;
    min-width: 28px;
  }

  &__content {
    flex: 1;
    white-space: pre-wrap;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
