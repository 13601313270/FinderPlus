<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { WireNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'

const props = defineProps<{ id: string }>()

const wireNode = shallowRef<WireNode | undefined>(undefined)

/** 当前输出端口的类型标签（ui 显示）；无输出时为空串 */
const typeName = ref('')

let unsubscribe: (() => void) | undefined

function sync(node: WireNode): void {
  typeName.value = node.displayTypeName
}

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof WireNode) {
    wireNode.value = found
    sync(found)
    unsubscribe = found.onChanged(() => sync(found))
  }
})

onUnmounted(() => {
  unsubscribe?.()
})

const { startDrag } = useNodePosition(() => wireNode.value)
</script>

<template>
  <div class="wire" @pointerdown="startDrag">
    <span v-if="typeName" class="wire__type">{{ typeName }}</span>
  </div>
</template>

<style scoped lang="less">
.wire {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 8px;
  background: @color-surface;
  border: 1px solid @node-border-color;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;

  &__handle {
    cursor: grab;
    user-select: none;
    font-size: 12px;
    color: @color-text-weak;
    white-space: nowrap;

    &:active {
      cursor: grabbing;
    }
  }

  &__type {
    font-size: 10px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: @color-primary;
    background: #eef2ff;
    border-radius: 3px;
    padding: 1px 4px;
    line-height: 1;
    flex-shrink: 0;
  }
}
</style>
