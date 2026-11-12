<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { FeishuSendNode } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useNodeDetail } from '@renderer/composables/useNodeDetail'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import GearIcon from '@renderer/components/icons/GearIcon.vue'

const props = defineProps<{ id: string }>()

const { openNodeDetail } = useNodeDetail()

const node = shallowRef<FeishuSendNode | undefined>(undefined)

const nodeTitle = useNodeTitle(() => node.value, '飞书发送')

const sendState = ref<'idle' | 'sending' | 'success' | 'error'>('idle')
const sendError = ref('')
const sendingNow = ref(false)

let unsubscribe: (() => void) | undefined

const sendStateText = computed((): string => {
  switch (sendState.value) {
    case 'sending': return '发送中…'
    case 'success': return '发送成功'
    case 'error': return '发送失败'
    default: return '待发送'
  }
})

const canSend = computed((): boolean => {
  const n = node.value
  if (!n) return false
  if (sendingNow.value) return false
  if (!n.displayAppId || !n.displayAppSecret || !n.displayReceiveId) return false
  return n.getCurrentText().length > 0
})

function syncFromNode(n: FeishuSendNode): void {
  sendState.value = n.displaySendState
  sendError.value = n.displaySendError
  sendingNow.value = n.isSending
}

function onSend(): void {
  node.value?.triggerSend()
}

function onOpenDetail(): void {
  openNodeDetail(props.id)
}

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof FeishuSendNode) {
    node.value = found
    syncFromNode(found)
    unsubscribe = found.onChanged(() => syncFromNode(found))
  }
})

onUnmounted(() => {
  unsubscribe?.()
})
</script>

<template>
  <div class="node">
    <NodeHeader :title="nodeTitle" :hide-help="true">
      <template #actions>
        <button class="node__gear" type="button" @pointerdown.stop @click.stop="onOpenDetail">
          <GearIcon />
        </button>
      </template>
    </NodeHeader>

    <div class="node__body">
      <button
        class="send-btn"
        type="button"
        :disabled="!canSend"
        :class="{ 'send-btn--sending': sendingNow }"
        @pointerdown.stop
        @click.stop="onSend"
      >
        {{ sendingNow ? '发送中…' : '发送' }}
      </button>

      <div class="state-row">
        <span class="state-text" :class="`state-text--${sendState}`">{{ sendStateText }}</span>
      </div>

      <div v-if="sendState === 'error' && sendError" class="error-msg">{{ sendError }}</div>
      <div v-else-if="!node?.displayAppId" class="hint">点齿轮填写凭证和接收方</div>
    </div>
  </div>
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0 8px;
  position: relative;
  overflow: hidden;
  user-select: none;

  &__body {
    flex-grow: 1;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
  }
}

.send-btn {
  all: unset;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  background: #3b82f6;
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  transition: background 0.15s, opacity 0.15s;

  &:hover:not(:disabled) {
    background: #2563eb;
  }

  &:disabled {
    background: #d1d5db;
    cursor: not-allowed;
    opacity: 0.6;
  }

  &--sending {
    pointer-events: none;
    opacity: 0.7;
  }
}

.state-row {
  display: flex;
  justify-content: center;
}

.state-text {
  font-size: 11px;
  color: @color-text-weak;

  &--success { color: #22c55e; }
  &--error { color: #ef4444; }
  &--sending { color: #eab308; }
}

.hint {
  font-size: 10px;
  color: @color-text-weak;
  font-style: italic;
  text-align: center;
}

.error-msg {
  font-size: 10px;
  color: #ef4444;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  word-break: break-all;
}

.node__gear {
  all: unset;
  cursor: pointer;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f3f4f6;
  color: #6b7280;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;

  svg {
    width: 12px;
    height: 12px;
  }

  &:hover {
    background: #dbeafe;
    color: #2563eb;
  }
}
</style>
