<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { StringToHtmlNode } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import NodeHeader from '@renderer/components/NodeHeader.vue'

const props = defineProps<{ id: string }>()

const node = shallowRef<StringToHtmlNode | undefined>(undefined)

const nodeTitle = useNodeTitle(() => node.value, '?')

let unsubscribe: (() => void) | undefined

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof StringToHtmlNode) {
    node.value = found
    unsubscribe = found.onChanged(() => {})
  }
})

onUnmounted(() => {
  unsubscribe?.()
})
</script>

<template>
  <div class="s2h">
    <NodeHeader :title="nodeTitle" justify="center" />
    <div class="s2h__body">
      <span class="s2h__label">String</span>
      <span class="s2h__arrow">→</span>
      <span class="s2h__label">HTML File</span>
    </div>
  </div>
</template>

<style scoped lang="less">
.s2h {
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
    font-size: 10px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: @color-primary;
    background: #eef2ff;
    border-radius: 3px;
    padding: 1px 4px;
    line-height: 1;
    white-space: nowrap;
  }

  &__arrow {
    font-size: 12px;
    color: @color-text-weak;
    flex-shrink: 0;
  }
}
</style>
