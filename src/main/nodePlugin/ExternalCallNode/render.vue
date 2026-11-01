<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { ExternalCallNode } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import { useNodeDetail } from '@renderer/composables/useNodeDetail'

const props = defineProps<{ id: string }>()

const node = shallowRef<ExternalCallNode | undefined>(undefined)

const nodeTitle = useNodeTitle(() => node.value, '?')

const { openNodeDetail } = useNodeDetail()

const lastTriggerAt = ref(0)

let unsubscribe: (() => void) | undefined

function syncFromNode(n: ExternalCallNode): void {
  lastTriggerAt.value = n.displayLastTriggerAt
}

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof ExternalCallNode) {
    node.value = found
    syncFromNode(found)
    unsubscribe = found.onChanged(() => syncFromNode(found))
  }
})

onUnmounted(() => {
  unsubscribe?.()
})

const hasTriggered = computed(() => lastTriggerAt.value > 0)

/** 格式化触发时间 */
function formatTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
</script>

<template>
  <div class="node">
    <NodeHeader :title="nodeTitle" />

    <!-- 配置入口按钮：点击打开全局 NodeDetailDialog -->
    <button
      class="node__config-btn"
      type="button"
      :disabled="!node"
      title="配置输入端口"
      @click.stop="openNodeDetail(props.id)"
    >配置输入端口</button>

    <!-- 状态区 -->
    <div class="node-status">
      <template v-if="hasTriggered">
        <span class="node-status__label">最近触发</span>
        <span class="node-status__value">{{ formatTime(lastTriggerAt) }}</span>
      </template>
      <template v-else>
        <span class="node-status__empty">等待外部调用…</span>
      </template>
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
  padding-top: 0;

  &__config-btn {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 30px;
    border-radius: 5px;
    background: #f0f4ff;
    border: 1px dashed #93c5fd;
    color: #3b82f6;
    font-size: 12px;
    font-weight: 500;
    transition: background 0.15s, border-color 0.15s;
    box-sizing: border-box;

    &:hover:not(:disabled) {
      background: #dbeafe;
      border-color: #60a5fa;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }
}

.node-status {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 60px;

  &__label {
    font-size: 11px;
    color: #9aa2ad;
  }

  &__value {
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  &__empty {
    font-size: 12px;
    color: #9aa2ad;
    font-style: italic;
  }
}
</style>
