<script setup lang="ts">
import type { Component } from 'vue'
import { useNodePosition, type NodeLike } from '@renderer/composables/useNodePosition'
import { nodeElementRef, type PortsOwnerLike } from '@renderer/canvas/elements'
import NodePorts from './NodePorts.vue'

/**
 * 节点外壳：所有节点在画布上共用的「容器层」。
 *
 * 一个节点 = 外壳 + 内容 + 端口，其中只有「内容」是节点自己定义的（render.vue），
 * 外壳和端口对所有节点都一样，所以收在这里、由 App.vue 统一包一层：
 * - 外壳负责**世界定位**（绝对定位到 node.position，订阅 onChanged 跟着拖拽走）；
 * - 内容组件（render.vue）只管画卡片本体，不再自己绝对定位；
 * - NodePorts 画两侧端口圆点，圆点直接落在外壳里（外壳是它们的 offsetParent）。
 *
 * 这样以后加节点类型，render.vue 只写内容，不再重复「定位、端口」这些通用件。
 */
const props = defineProps<{
  /** 节点实例。外壳 / 端口只需要它的通用成员，所以用最小结构接口，不依赖 Node 类 */
  node: NodeLike & PortsOwnerLike
  /** 该节点的内容组件，App.vue 按 node.type 从注册表取好再传进来 */
  render: Component | undefined
}>()

// 外壳的世界坐标：跟随 node.position（拖拽时 onChanged 会推着它走）
const { position } = useNodePosition(() => props.node)

// 把外壳登记进测量注册表：端口圆点以外壳为基准量位置，卡片尺寸也等于外壳尺寸
const shellEl = nodeElementRef(props.node.id)
</script>

<template>
  <div :ref="shellEl" class="node-shell" :style="{ left: `${position[0]}px`, top: `${position[1]}px` }">
    <component :is="render" :id="node.id" />
    <NodePorts :node-id="node.id" :node="node" />
  </div>
</template>

<style scoped lang="less">
.node-shell {
  // 外壳是定位元素：既是节点在世界坐标里的落点，也是端口圆点的 containing block（offsetParent）
  position: absolute;
}
</style>
