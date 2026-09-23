<script setup lang="ts">
import {
  portElementRef,
  portKey,
  type CanvasElementRef,
  type PortLike,
  type PortSide,
  type PortsOwnerLike
} from '@renderer/canvas/elements'
import { connectionDrag, startConnectDrag } from '@renderer/canvas/connectionDrag'

/**
 * 端口圆点：把节点两侧的端口画成小圆圈——左边 InputPort、右边 OutputPort，
 * 有几个端口就画几个（数量、id、类型全部来自 node.ts 的端口声明，不在这里重复维护）。
 *
 * 每个节点都由 NodeShell 包一层，NodeShell 里放一个 <NodePorts>：
 * 它既是给人看的（一眼看出从哪个端口进出），也是给连线层量的（圆点位置就是连线端点）。
 *
 * 位置：绝对定位在外壳上，圆心正好压在外壳的侧边线上（外壳是定位元素，所以这里是它
 * 的绝对定位子元素；**不要**再套一层容器，否则圆点的 offsetParent 变了，测量会偏）。
 * 竖向按端口个数均分：n 个端口时第 i 个落在 (i+1)/(n+1) 的高度上——1 个端口正好居中。
 *
 * 用 fragment 作根（两个 v-for 直接产出圆点），就是为了让圆点保持外壳的直接子元素。
 */
const props = defineProps<{
  /** 节点 id：登记圆点用，也是它在 Scene 里的身份 */
  nodeId: string
  /** 节点实例。解析不到时（id 对不上 / 已被删）不画端口 */
  node: PortsOwnerLike | undefined
}>()

// 每个端口一个**稳定**的函数 ref：函数身份要是每次都变，Vue 每次 patch 都会「卸旧装新」，
// 注册表跟着空转。按「侧 + 端口 id」缓存住，同一个端口每次拿到的都是同一个 ref。
const refByPort = new Map<string, CanvasElementRef>()

function refFor(side: PortSide, port: PortLike): CanvasElementRef {
  const key = `${side}:${port.id}`
  let ref = refByPort.get(key)
  if (!ref) {
    ref = portElementRef(props.nodeId, side, port)
    refByPort.set(key, ref)
  }
  return ref
}

function topOf(index: number, count: number): string {
  return `${((index + 1) / (count + 1)) * 100}%`
}

function titleOf(port: PortLike, direction: string): string {
  const kinds = port.accepts ?? (port.kind ? [port.kind] : [])
  return kinds.length > 0 ? `${direction}端口 ${port.id}（${kinds.join(' / ')}）` : `${direction}端口 ${port.id}`
}

/**
 * 从输出端口圆点按下 -> 开始拉线。连线方向是「输出 -> 输入」，所以只有右侧圆点是拖拽源，
 * 左侧圆点只当落点。端口只报 id，真端口由拖拽模块回场景里取（不掺和 Vue 代理那套身份问题）。
 */
function onOutputPointerDown(port: PortLike, event: PointerEvent): void {
  startConnectDrag(props.nodeId, port.id, event)
}

/** 拖拽中的高亮：源端口、落点（接得上/接不上） */
function highlightOf(side: PortSide, port: PortLike): string {
  if (!connectionDrag.active) return ''

  const key = portKey(props.nodeId, side, port.id)
  if (key === connectionDrag.sourceKey) return 'port--source'
  if (key !== connectionDrag.targetKey) return ''
  return connectionDrag.targetOk ? 'port--target' : 'port--invalid'
}
</script>

<template>
  <span
    v-for="(port, index) in node?.inputPorts ?? []"
    :key="`in:${port.id}`"
    :ref="refFor('in', port)"
    class="port port--in"
    :class="highlightOf('in', port)"
    :style="{ top: topOf(index, node?.inputPorts.length ?? 1) }"
    :title="titleOf(port, '输入')"
  />
  <!-- 输出端口是连线的起点：按下它开始拉线（连线方向「输出 -> 输入」） -->
  <span
    v-for="(port, index) in node?.outputPorts ?? []"
    :key="`out:${port.id}`"
    :ref="refFor('out', port)"
    class="port port--out"
    :class="highlightOf('out', port)"
    :style="{ top: topOf(index, node?.outputPorts.length ?? 1) }"
    :title="titleOf(port, '输出')"
    @pointerdown="onOutputPointerDown(port, $event)"
  />
</template>

<style scoped lang="less">
.port {
  position: absolute;
  box-sizing: border-box;
  width: 12px;
  height: 12px;
  // 圆心压在卡片的侧边线上：向左/右各探出半个圆点，再用 margin-top 把竖向上提半个
  margin-top: -6px;
  border: 2px solid @color-primary;
  border-radius: 50%;
  background: @color-surface;
  user-select: none;

  &--in {
    left: -6px;
  }

  &--out {
    right: -6px;
    cursor: crosshair;
  }

  // 拖拽中的三种高亮：起点、可落点、落不上
  &--source,
  &--target,
  &--invalid {
    box-shadow: 0 0 0 4px rgba(59, 124, 255, 0.18);
  }

  &--target {
    border-color: @color-ok;
    box-shadow: 0 0 0 4px rgba(46, 174, 103, 0.22);
  }

  &--invalid {
    border-color: @color-danger;
    box-shadow: 0 0 0 4px rgba(217, 75, 75, 0.2);
  }
}
</style>
