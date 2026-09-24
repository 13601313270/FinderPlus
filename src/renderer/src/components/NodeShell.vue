<script setup lang="ts">
import type { Component } from 'vue'
import { useNodePosition, type NodeLike } from '@renderer/composables/useNodePosition'
import { nodeElementRef, type PortsOwnerLike } from '@renderer/canvas/elements'
import NodePorts from './NodePorts.vue'

/**
 * 节点外壳：所有节点在画布上共用的「容器层」。
 *
 * 结构是左-中-右三列 flex，井水不犯河水：
 * ┌──────────┬──────────────┬──────────┐
 * │ ports-col │  node-content │ ports-col │
 * │  (in)     │  render.vue   │  (out)    │
 * └──────────┴──────────────┴──────────┘
 *
 * - node-shell 本身只负责世界定位（position: absolute），
 *   视觉边框 / 阴影全部由 render.vue 里的 .node 提供。
 * - 端口列和 content 同高（align-items: stretch），
 *   端口竖向用 flex space-evenly 自然均分高度，
 *   圆点用负 margin 探出到 content 侧线（圆心正好对齐外壳边框）。
 */
const props = defineProps<{
  node: NodeLike & PortsOwnerLike
  render: Component | undefined
  floating?: boolean
}>()

const emit = defineEmits<{
  (e: 'contextmenu', nodeId: string, clientX: number, clientY: number): void
}>()

const { position } = useNodePosition(() => props.node)

// 外壳根元素登记进测量注册表
const shellEl = nodeElementRef(props.node.id)

/** 右键：阻止浏览器默认菜单，通知父组件弹出节点菜单 */
function onContextMenu(e: MouseEvent): void {
  if (props.floating) return // 跟随放置中的节点不触发
  e.preventDefault()
  e.stopPropagation()
  emit('contextmenu', props.node.id, e.clientX, e.clientY)
}
</script>

<template>
  <div
    :ref="shellEl"
    class="node-shell"
    :class="{ 'node-shell--floating': floating }"
    :style="{ left: `${position[0]}px`, top: `${position[1]}px` }"
    @contextmenu="onContextMenu"
  >
    <div class="ports-col ports-col--left">
      <NodePorts :node-id="node.id" :node="node" side="in" />
    </div>
    <div class="node-content">
      <component :is="render" :id="node.id" />
    </div>
    <div class="ports-col ports-col--right">
      <NodePorts :node-id="node.id" :node="node" side="out" />
    </div>
  </div>
</template>

<style scoped lang="less">
.node-shell {
  position: absolute;
  display: flex;
  align-items: stretch; // 两侧 ports-col 高度跟随 content

  &--floating {
    pointer-events: none;
    opacity: 0.75;
  }
}

.ports-col {
  position: relative; // 给内部端口项的 absolute 留 containing block（其实现在不用 absolute）
  display: flex;
  flex-direction: column;
  justify-content: space-evenly; // 端口竖向均分，1 个端口正好居中
  flex-shrink: 0;

  &--left {
    // 圆点向右探出 6px（在 NodePorts 里 .port--in { margin-right: -6px }）
    // 所以 ports-col--left 的右边缘 = content 左边线（圆点圆心正好在这条线上）
    min-width: 20px; // 留 label 空间（左列 label 在圆点左边，有负 margin 补偿）
  }

  &--right {
    min-width: 20px;
  }
}

.node-content {
  flex: 0 0 auto; // 不让 content 被两侧挤扁
}
</style>
