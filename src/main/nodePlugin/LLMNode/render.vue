<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { LLMNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useLLMSettings } from '@renderer/composables/useLLMSettings'

/**
 * LLM 节点的渲染组件（只画卡片内容）。
 *
 * 定位、两侧端口这些所有节点共用的东西由 NodeShell 兜底，这里不碰。
 * 引擎里的 response / status 只是普通类字段，Vue 追踪不到，所以用 ref 包一层，
 * 订阅 node.onChanged 时把最新值刷进 ref。
 */
const props = defineProps<{ id: string }>()

const { openSettings, hasKey } = useLLMSettings()

const llmNode = shallowRef<LLMNode | undefined>(undefined)
const response = ref('')
const status = ref<'idle' | 'loading' | 'done' | 'error'>('idle')

let unsubscribe: (() => void) | undefined

const { startDrag } = useNodePosition(() => llmNode.value)

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof LLMNode) {
    llmNode.value = found
    response.value = found.displayResponse
    status.value = found.displayStatus
    unsubscribe = found.onChanged(() => {
      response.value = found.displayResponse
      status.value = found.displayStatus
    })
  }
})

onUnmounted(() => {
  unsubscribe?.()
})

function onGearClick(e: MouseEvent): void {
  e.stopPropagation()
  openSettings()
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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6 1.65 1.65 0 0 0 10 3.09V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9 1.65 1.65 0 0 0 20.91 10H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    </div>

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
        {{ llmNode ? '（等待输入后触发推理…）' : '节点不存在' }}
      </template>
    </div>
  </div>
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box; // box 是内容区外包壳宽，border+padding 算在 box 内
  width: 100%; // 填满 NodeShell 的 .node-content（由 node.box 硬约束定宽高）
  height: 100%;
  overflow: auto; // 输出可长，超出 box 时在框内滚动
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  background: @color-surface;
  border: 1px solid #d5d9e0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px dashed #d5d9e0;
    padding-bottom: 2px;
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
}

.llm-output {
  padding: 8px 10px;
  border: 1px solid #d5d9e0;
  border-radius: 6px;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-all;
  flex: 1;
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
