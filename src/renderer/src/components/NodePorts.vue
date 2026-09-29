<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { PortLike, PortSide } from '@renderer/canvas/elements'
import NodePort from './NodePort.vue'

/**
 * 某一侧的端口列：圆点 + label，按竖向均分排列。
 *
 * NodeShell 是三列 flex（左输入 / 中内容 / 右输出），两侧各放一个 NodePorts——
 * 所以它只关心「我这侧有哪些端口」，不问节点结构。
 *
 * 每个端口的实际渲染和 ref 登记由 NodePort 子组件负责。
 *
 * 动态端口：Node.addOutput / removeOutput 触发 notifyChanged，
 * 这里订阅 node.onChanged 把最新端口列表同步进 reactive ref，Vue 的 v-for 才会重渲染。
 */
const props = defineProps<{
  nodeId: string
  node: {
    readonly inputPorts: readonly PortLike[]
    readonly outputPorts: readonly PortLike[]
    onChanged(fn: () => void): () => void
  } | undefined
  side: PortSide
}>()

/**
 * reactive 缓冲：node.onChanged 桥接进来，computed 追踪它。
 * 每次 sync 用 [...source] 造新数组引用——Node.outputPorts getter 返回
 * 的是同一个 this.outputs 数组（push/splice 往里塞），Vue 3 ref setter
 * 用 Object.is 比新旧值，引用相同会跳过赋值，v-for 就不会重渲染。
 */
const portList = ref<readonly PortLike[]>([])

let unsubscribe: (() => void) | undefined

function sync(): void {
  if (!props.node) {
    portList.value = []
    return
  }
  portList.value = props.side === 'in' ? [...props.node.inputPorts] : [...props.node.outputPorts]
}

onMounted(() => {
  sync()
  unsubscribe = props.node?.onChanged(sync)
})

onUnmounted(() => {
  unsubscribe?.()
})

const ports = computed<readonly PortLike[]>(() => portList.value)
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
