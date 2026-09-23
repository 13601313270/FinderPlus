<script setup lang="ts">
import { computed } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { TextDisplayNode } from './index'

/**
 * 文本展示节点的渲染组件。
 *
 * 同文本输入节点：id 定位场景里的节点，getNode 拿活引用后直接读它的 text。
 * 节点缺失时显示占位文案。
 */
const props = defineProps<{ id: string }>()

const displayNode = computed(() => {
  const node = workspaceScene.getNode(props.id)
  return node instanceof TextDisplayNode ? node : undefined
})

const text = computed(() => displayNode.value?.text ?? '')
</script>

<template>
  <div class="render-display" :class="{ 'render-display--empty': !text }">
    {{ text || (displayNode ? '（暂无输出）' : '节点不存在') }}
  </div>
</template>

<style scoped lang="less">
.render-display {
  padding: 8px 10px;
  border: 1px solid #d5d9e0;
  border-radius: 6px;
  font-size: 14px;
  white-space: pre-wrap;
  word-break: break-all;

  &--empty {
    color: #9aa2ad;
    font-style: italic;
  }
}
</style>