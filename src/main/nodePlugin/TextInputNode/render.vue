<script setup lang="ts">
import { computed } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { TextInputNode } from './index'

/**
 * 文本输入节点的渲染组件。
 *
 * id 指明它控制场景里的哪个节点；引擎是纯逻辑，渲染进程能直接握住同一份
 * Scene 单例，所以这里用 workspaceScene.getNode(id) 取活引用，不用走 IPC。
 * 节点不在场景里（id 对不上或已被删）时退化为禁用输入框。
 */
const props = defineProps<{ id: string }>()

const inputNode = computed(() => {
  const node = workspaceScene.getNode(props.id)
  return node instanceof TextInputNode ? node : undefined
})

const text = computed({
  get: () => inputNode.value?.text ?? '',
  set: (value: string) => inputNode.value?.setText(value)
})
</script>

<template>
  <input
    class="render-input"
    type="text"
    :value="text"
    :disabled="!inputNode"
    :placeholder="inputNode ? '输入文本…' : '节点不存在'"
    @input="text = ($event.target as HTMLInputElement).value"
  />
</template>

<style scoped lang="less">
.render-input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid #d5d9e0;
  border-radius: 6px;
  font-size: 14px;

  &:disabled {
    opacity: 0.5;
  }
}
</style>