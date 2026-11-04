<script setup lang="ts">
import { shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { NotifyNode } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import { useNodeDetail } from '@renderer/composables/useNodeDetail'
import GearIcon from '@renderer/components/icons/GearIcon.vue'

const { openNodeDetail } = useNodeDetail()

const props = defineProps<{ id: string }>()

const notifyNode = shallowRef<NotifyNode | undefined>(undefined)

const nodeTitle = useNodeTitle(() => notifyNode.value, '?')

// 终端节点，右侧无输出端口，不订阅变更也无状态要展示
// 拿到实例只是为了 useNodeTitle 能正确读 title；这里走 manifest.title 的多语言
const found = workspaceScene.getNode(props.id)
if (found instanceof NotifyNode) {
  notifyNode.value = found
}
</script>

<template>
  <div class="node">
    <NodeHeader :title="nodeTitle" justify="center">
      <template #actions>
        <button class="config-btn" type="button"
          @click.stop="openNodeDetail(props.id)">
          <GearIcon />
        </button>
      </template>
    </NodeHeader>
    <div class="notify-body">
      <!-- 铃铛 SVG 占位，调色板图标在 manifest 里定义了 -->
      <svg viewBox="0 0 24 24" class="notify-body__icon">
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9Z" fill="none" stroke="currentColor" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round" />
        <path d="M10 21a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
          stroke-linejoin="round" />
      </svg>
      <span class="notify-body__hint">收到值时通知</span>
    </div>
  </div>
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  display: flex;
  padding: 8px;
  padding-top: 0;
  flex-direction: column;
  overflow: hidden;
}

.notify-body {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-grow: 1;

  &__icon {
    width: 16px;
    height: 16px;
    color: @color-text-weak;
  }

  &__hint {
    font-size: 11px;
    color: @color-text-weak;
  }
}
.config-btn {
  all: unset;
  cursor: pointer;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f3f4f6;
  color: #6b7280;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;

  svg {
    width: 11px;
    height: 11px;
  }

  &:hover {
    background: #dbeafe;
    color: #2563eb;
  }
}
</style>
