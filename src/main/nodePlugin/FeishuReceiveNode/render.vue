<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { FeishuReceiveNode } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useNodeDetail } from '@renderer/composables/useNodeDetail'
import { useFeishuBots } from '@renderer/composables/useFeishuBots'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import GearIcon from '@renderer/components/icons/GearIcon.vue'

const props = defineProps<{ id: string }>()

const { openNodeDetail } = useNodeDetail()

const { find: findBot } = useFeishuBots()

const node = shallowRef<FeishuReceiveNode | undefined>(undefined)

const nodeTitle = useNodeTitle(() => node.value, '飞书消息')

const botId = ref('')
const enabled = ref(false)
const connState = ref<'idle' | 'connecting' | 'connected' | 'error'>('idle')
const connError = ref('')

let unsubscribe: (() => void) | undefined

const stateText = computed((): string => {
  switch (connState.value) {
    case 'connected': return '已连接'
    case 'connecting': return '连接中…'
    case 'error': return '连接错误'
    default: return '空闲'
  }
})

/** 选中机器人的名称；已选中但机器人被删除时给出提示 */
const botName = computed((): string => {
  if (!botId.value) return ''
  return findBot(botId.value)?.name ?? '机器人已删除'
})

function syncFromNode(n: FeishuReceiveNode): void {
  botId.value = n.displayBotId
  enabled.value = n.isEnabled
  connState.value = n.displayConnectionState
  connError.value = n.displayConnectionError
}

function onToggleEnabled(): void {
  node.value?.toggleEnabled()
}

function onOpenDetail(): void {
  openNodeDetail(props.id)
}

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof FeishuReceiveNode) {
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
  <div class="node" :class="{ 'node--disabled': !enabled }">
    <NodeHeader :title="nodeTitle" :hide-help="true">
      <template #actions>
        <span
          v-if="enabled"
          class="node__dot"
          :class="{
            'node__dot--connecting': connState === 'connecting',
            'node__dot--error': connState === 'error'
          }"
          :title="connState === 'connected' ? '已连接' : connState === 'connecting' ? '连接中…' : connError || '空闲'"
        ></span>
        <button class="node__gear" type="button" @pointerdown.stop @click.stop="onOpenDetail">
          <GearIcon />
        </button>
      </template>
    </NodeHeader>

    <div class="node__body">
      <div class="row row--switch">
        <label class="switch" @pointerdown.stop>
          <input type="checkbox" :checked="enabled" @change="onToggleEnabled" />
          <span class="switch__track">
            <span class="switch__thumb"></span>
          </span>
        </label>
        <span class="state-label" :class="`state-label--${connState}`">
          {{ stateText }}
        </span>
      </div>

      <div v-if="connState === 'error' && connError" class="error-msg">{{ connError }}</div>

      <div v-if="botId" class="bot-row" :title="botName">
        <span class="bot-row__label">机器人</span>
        <span class="bot-row__name">{{ botName }}</span>
      </div>
      <div v-else class="hint">点齿轮选择飞书机器人</div>
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

  &--disabled {
    opacity: 0.55;
  }

  &__dot {
    position: absolute;
    right: 8px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #22c55e;
    animation: pulse 1.2s ease-in-out infinite;

    &--connecting {
      background: #eab308;
    }

    &--error {
      background: #ef4444;
      animation: none;
    }
  }

  &__body {
    flex-grow: 1;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
  }
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;

  &--switch {
    justify-content: space-between;
  }
}

.switch {
  position: relative;
  width: 36px;
  height: 18px;
  cursor: pointer;

  input { display: none; }

  &__track {
    position: absolute;
    inset: 0;
    background: #d1d5db;
    border-radius: 9px;
    transition: background 0.15s ease;
  }

  &__thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    background: #fff;
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    transition: transform 0.15s ease;
  }

  input:checked ~ &__track {
    background: #22c55e;
  }

  input:checked ~ &__track .switch__thumb {
    transform: translateX(18px);
  }
}

.state-label {
  font-size: 11px;
  color: @color-text-weak;

  &--connected { color: #22c55e; }
  &--connecting { color: #eab308; }
  &--error { color: #ef4444; }
}

.hint {
  font-size: 10px;
  color: @color-text-weak;
  font-style: italic;
}

.bot-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;

  &__label {
    font-size: 10px;
    color: @color-text-weak;
    flex-shrink: 0;
  }

  &__name {
    font-size: 11px;
    color: @color-text;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
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

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
