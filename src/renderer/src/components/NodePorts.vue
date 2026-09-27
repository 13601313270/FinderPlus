<script setup lang="ts">
import { computed } from 'vue'
import type { PortLike, PortSide } from '@renderer/canvas/elements'
import NodePort from './NodePort.vue'

/**
 * 某一侧的端口列：圆点 + label，按竖向均分排列。
 *
 * NodeShell 是三列 flex（左输入 / 中内容 / 右输出），两侧各放一个 NodePorts——
 * 所以它只关心「我这侧有哪些端口」，不问节点结构。
 *
 * 每个端口的实际渲染和 ref 登记由 NodePort 子组件负责。
 */
const props = defineProps<{
  nodeId: string
  node: {
    readonly inputPorts: readonly PortLike[]
    readonly outputPorts: readonly PortLike[]
  } | undefined
  side: PortSide
}>()

const ports = computed<readonly PortLike[]>(() =>
  props.side === 'in' ? (props.node?.inputPorts ?? []) : (props.node?.outputPorts ?? [])
)
</script>

<template>
  <NodePort
    v-for="port in ports"
    :key="port.id"
    :node-id="nodeId"
    :port="port"
    :side="side"
  />
</template>
