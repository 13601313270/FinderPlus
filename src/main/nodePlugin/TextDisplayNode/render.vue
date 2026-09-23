<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { TextDisplayNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'

/**
 * 文本展示节点的渲染组件。
 *
 * 引擎里的 displayed 只是普通类字段，Vue 追踪不到，所以不能靠 computed 自动刷新。
 * 这里在挂载时拿到活引用，订阅 node.onChanged —— 上游把新值推进来、节点刷新后，
 * 回调里把 text 写进本地 ref，Vue 才会重渲染。
 */
const props = defineProps<{ id: string }>()

const displayNode = ref<TextDisplayNode | undefined>(undefined)
const text = ref('')

let unsubscribe: (() => void) | undefined

// 卡片定位 + 拖拽；节点在 onMounted 才解析到，所以传 getter，内部取最新引用。
const { position, startDrag } = useNodePosition(() => displayNode.value)

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof TextDisplayNode) {
    displayNode.value = found
    text.value = found.text
    unsubscribe = found.onChanged(() => {
      text.value = found.text
    })
  }
})

onUnmounted(() => {
  unsubscribe?.()
})
</script>

<template>
  <div class="node" :style="{ left: position[0] + 'px', top: position[1] + 'px' }">
    <span class="node__handle" title="拖动节点" @pointerdown="startDrag">{{ displayNode?.type ?? '?' }}</span>
    <div class="render-display" :class="{ 'render-display--empty': !text }">
      {{ text || (displayNode ? '（暂无输出）' : '节点不存在') }}
    </div>
  </div>
</template>

<style scoped lang="less">
.node {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 220px;
  padding: 8px;
  background: @color-surface;
  border: 1px solid #d5d9e0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  &__handle {
    cursor: grab;
    user-select: none;
    font-size: 12px;
    color: @color-text-weak;
    text-align: center;
    padding: 2px 0;
    border-bottom: 1px dashed #d5d9e0;

    &:active {
      cursor: grabbing;
    }
  }
}

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