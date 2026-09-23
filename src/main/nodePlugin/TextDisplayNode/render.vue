<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { TextDisplayNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'

/**
 * 文本展示节点的渲染组件（只画卡片内容）。
 *
 * 定位、两侧端口这些所有节点共用的东西由 NodeShell 兜底，这里不碰。
 *
 * 引擎里的 displayed 只是普通类字段，Vue 追踪不到，所以不能靠 computed 自动刷新。
 * 这里在挂载时拿到活引用，订阅 node.onChanged —— 上游把新值推进来、节点刷新后，
 * 回调里把 text 写进本地 ref，Vue 才会重渲染。
 */
const props = defineProps<{ id: string }>()

// 用 shallowRef 而不是 ref：ref 会把节点实例深转换成 reactive 代理，于是从这里读到的
// 端口对象不再是引擎里那个端口（按身份比对的连线层会认不出来）。引擎对象有自己的一套
// 通知机制（onChanged），本来也不需要 Vue 去代理它，这里只关心「引用换没换」。
const displayNode = shallowRef<TextDisplayNode | undefined>(undefined)
const text = ref('')

let unsubscribe: (() => void) | undefined

// 只要拖拽（落点写回 node.position）；位置本身由外壳跟随 node.position 展示。
const { startDrag } = useNodePosition(() => displayNode.value)

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
  <div class="node">
    <span class="node__handle" title="拖动节点" @pointerdown="startDrag">{{ displayNode?.type ?? '?' }}</span>
    <div class="render-display" :class="{ 'render-display--empty': !text }">
      {{ text || (displayNode ? '（暂无输出）' : '节点不存在') }}
    </div>
  </div>
</template>

<style scoped lang="less">
.node {
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