<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { ManualTriggerNode } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import GearIcon from '@renderer/components/icons/GearIcon.vue'
import { useNodeDetail } from '@renderer/composables/useNodeDetail'

const props = defineProps<{ id: string }>()

const { openNodeDetail } = useNodeDetail()

const node = computed(() => {
  const n = workspaceScene.getNode(props.id)
  return n instanceof ManualTriggerNode ? n : undefined
})

const nodeTitle = useNodeTitle(() => node.value, '?')

const buttonConfigs = ref<ReadonlyArray<{ id: string; label: string; valueType: string }>>([])

let offChanged: (() => void) | undefined

onMounted(() => {
  const n = node.value
  if (!n) return
  const refresh = () => {
    buttonConfigs.value = n.buttonConfigs
  }
  refresh()
  offChanged = n.onChanged(refresh)
})

onUnmounted(() => {
  offChanged?.()
})

function onClickButton(buttonId: string): void {
  node.value?.trigger(buttonId)
}
</script>

<template>
  <div class="node">
    <NodeHeader :title="nodeTitle" disable-minimize>
      <template #actions>
        <button class="node__gear" type="button" @pointerdown.stop @click.stop="openNodeDetail(id)">
          <GearIcon />
        </button>
      </template>
    </NodeHeader>
    <div class="node__buttons">
      <button v-for="btn in buttonConfigs" :key="btn.id" class="node__btn" type="button"
        :disabled="!node" @click="onClickButton(btn.id)">
        <svg class="node__btn-play" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
        <span class="node__btn-label">{{ btn.label }}</span>
        <span class="node__btn-type">{{ btn.valueType }}</span>
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
  gap: 6px;
  padding: 8px;
  padding-top: 0;

  &__buttons {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
  }

  &__btn {
    all: unset;
    box-sizing: border-box;
    cursor: pointer;
    min-height: 40px;
    flex-grow: 1;
    display: flex;
    align-items: center;
    padding: 6px 10px;
    border-radius: 6px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    font-size: 12px;
    color: #334155;
    transition: background 0.15s, border-color 0.15s;

    &:hover {
      background: #e2e8f0;
      border-color: #cbd5e1;
    }

    &:active {
      background: #cbd5e1;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }

  &__btn-play {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    color: #64748b;
  }

  &__btn-label {
    flex: 1;
    text-align: center;
    font-weight: 500;
  }

  &__btn-type {
    font-size: 10px;
    color: #94a3b8;
    background: #f8fafc;
    padding: 2px 6px;
    border-radius: 4px;
    flex-shrink: 0;
  }
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
