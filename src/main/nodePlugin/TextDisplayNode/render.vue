<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { TextDisplayNode } from './node'

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