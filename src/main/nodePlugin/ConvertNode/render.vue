<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { ConvertNode, type ConvertTarget } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import NodeHeader from '@renderer/components/NodeHeader.vue'

const props = defineProps<{ id: string }>()

const node = shallowRef<ConvertNode | undefined>(undefined)
const nodeTitle = useNodeTitle(() => node.value, '?')

const target = ref<ConvertTarget>('string')

let unsubscribe: (() => void) | undefined

const TARGET_OPTIONS: { value: ConvertTarget; label: string }[] = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'bool', label: 'Bool' },
  { value: 'json', label: 'Json' },
  { value: 'html-file', label: 'Html File' },
  { value: 'txt-file', label: 'Txt File' }
]

function sync(n: ConvertNode): void {
  target.value = n.currentTargetType
}

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof ConvertNode) {
    node.value = found
    sync(found)
    unsubscribe = found.onChanged(() => sync(found))
  }
})

onUnmounted(() => {
  unsubscribe?.()
})

function onTargetChange(e: Event): void {
  const el = e.target as HTMLSelectElement
  if (isConvertTargetValue(el.value)) {
    node.value?.setTargetType(el.value)
  }
}

function isConvertTargetValue(v: string): v is ConvertTarget {
  return v === 'string' || v === 'number' || v === 'bool' || v === 'json' || v === 'html-file' || v === 'txt-file'
}
</script>

<template>
  <div class="convert">
    <NodeHeader :title="nodeTitle" justify="center" />
    <div class="convert__body">
      <span class="convert__label">→</span>
      <select
        class="convert__select"
        :value="target"
        :disabled="!node"
        @change="onTargetChange"
        @pointerdown.stop
      >
        <option v-for="opt in TARGET_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
    </div>
  </div>
</template>

<style scoped lang="less">
.convert {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &__body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 0 8px;
  }

  &__label {
    font-size: 12px;
    color: @color-text-weak;
    flex-shrink: 0;
  }

  &__select {
    border: none;
    outline: none;
    background: #eef2ff;
    color: @color-primary;
    border-radius: 3px;
    font-size: 11px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    padding: 2px 4px;
    cursor: pointer;

    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  }
}
</style>
