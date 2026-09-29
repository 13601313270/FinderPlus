<script setup lang="ts">
import { debounce } from 'lodash-es'
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { LLMNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useLLMSettings } from '@renderer/composables/useLLMSettings'
import GearIcon from '@renderer/components/icons/GearIcon.vue'

/**
 * LLM 节点的渲染组件：
 * - 底部操作栏：左侧 prompt textarea（仅端口未连接时显示）+ 右侧发送按钮
 * - 控制栏有"自动调用"开关（仅 promptInput 接边时显示）
 */
const props = defineProps<{ id: string }>()

const { openSettings, hasKey } = useLLMSettings()

const llmNode = shallowRef<LLMNode | undefined>(undefined)
const response = ref('')
const status = ref<'idle' | 'loading' | 'done' | 'error'>('idle')
const autoCall = ref(false)
const promptConnected = ref(false)
const localPrompt = ref('')

let unsubscribe: (() => void) | undefined

const { startDrag } = useNodePosition(() => llmNode.value)

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
    unsubscribe = found.onChanged(() => {
      response.value = found.displayResponse
      status.value = found.displayStatus
      autoCall.value = found.displayAutoCall
      promptConnected.value = found.displayPromptConnected
      localPrompt.value = found.displayLocalPrompt
    })
  }
})

onUnmounted(() => {
  unsubscribe?.()
  debouncedSetPrompt.cancel()
})

function onGearClick(e: MouseEvent): void {
  e.stopPropagation()
  openSettings()
}

function onAutoCallChange(e: Event): void {
  const target = e.target as HTMLInputElement
  llmNode.value?.setAutoCall(target.checked)
}

function onPromptInput(val: string): void {
  localPrompt.value = val
  debouncedSetPrompt(val)
}

function onSendClick(): void {
  // 立即刷一次 localPrompt 到节点，避免防抖还没刷就触发
  debouncedSetPrompt.flush()
  llmNode.value?.manualTrigger()
}
</script>

<template>
  <div class="node">
    <div class="node__header" @pointerdown="startDrag">
      <span class="node__handle" title="拖动节点（整个头部可拖）">{{ llmNode?.type ?? '?' }}</span>
      <button
        v-if="llmNode"
        class="node__gear"
        type="button"
        :title="hasKey() ? 'LLM 已配置，点击修改 Key' : '点击配置 LLM API Key'"
        @pointerdown.stop
        @click.stop="onGearClick"
      >
        <GearIcon />
      </button>
    </div>

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
        <span class="llm-output__loading-text">推理中…</span>
      </template>
      <template v-else-if="response">
        {{ response }}
      </template>
      <template v-else>
        {{ llmNode ? (promptConnected ? '（等待上游输入触发…）' : '（输入 prompt 后点击发送…）') : '节点不存在' }}
      </template>
    </div>

    <!-- 底部操作栏：无连线时左 textarea + 右按钮；有连线时左自动开关 + 右按钮 -->
    <div class="node__bottom" v-if="llmNode">
      <template v-if="!promptConnected">
        <textarea
          class="node__prompt"
          v-model="localPrompt"
          placeholder="输入 prompt..."
          rows="1"
          @input="(e) => onPromptInput((e.target as HTMLTextAreaElement).value)"
        />
      </template>
      <template v-else>
        <label class="node__switch">
          <input type="checkbox" :checked="autoCall" @change="onAutoCallChange" />
          <span class="node__switch-track"><span class="node__switch-thumb" /></span>
          <span class="node__switch-label">自动调用</span>
        </label>
      </template>
      <button
        class="node__send"
        type="button"
        :disabled="status === 'loading'"
        @click="onSendClick"
      >
        {{ status === 'loading' ? '推理中…' : '发送' }}
      </button>
    </div>
  </div>
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background: @color-surface;
  border: 1px solid #d5d9e0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px dashed #d5d9e0;
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

  // 底部操作栏：左输入/开关 + 右按钮
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
    border: 1px solid #d5d9e0;
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
  }
}

.llm-output {
  padding: 10px;
  border: 1px solid #d5d9e0;
  border-radius: 6px;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-all;
  flex: 1;
  min-height: 80px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1f2937;

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
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
