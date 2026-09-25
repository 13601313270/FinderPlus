<script setup lang="ts">
import {
  portElementRef,
  portKey,
  type CanvasElementRef,
  type PortLike,
  type PortSide
} from '@renderer/canvas/elements'
import { connectionDrag, startConnectDrag } from '@renderer/canvas/connectionDrag'

/**
 * 某一侧的端口列：圆点 + label，按竖向均分排列。
 *
 * NodeShell 是三列 flex（左输入 / 中内容 / 右输出），两侧各放一个 NodePorts——
 * 所以它只关心「我这侧有哪些端口」，不问节点结构。
 *
 * 圆点的 offsetParent 是父层的 .ports-col（NodeShell 提供，position: relative），
 * 所以注册表量位置时会沿着 offsetParent 链累加到 node-shell，具体见 measurePortCenter。
 */
const props = defineProps<{
  nodeId: string
  node: {
    readonly inputPorts: readonly PortLike[]
    readonly outputPorts: readonly PortLike[]
  } | undefined
  side: PortSide
}>()

const ports = () => props.side === 'in' ? (props.node?.inputPorts ?? []) : (props.node?.outputPorts ?? [])

// 同一个端口缓存同一个 ref，避免 Vue patch 时空转
const refByPort = new Map<string, CanvasElementRef>()
function refFor(port: PortLike): CanvasElementRef {
  const key = `${props.side}:${port.id}`
  let ref = refByPort.get(key)
  if (!ref) {
    ref = portElementRef(props.nodeId, props.side, port)
    refByPort.set(key, ref)
  }
  return ref
}

function titleOf(port: PortLike, direction: string): string {
  const kinds = port.acceptValueNames ?? (port.outputValueName ? [port.outputValueName] : [])
  const label = port.label ?? port.id
  return kinds.length > 0 ? `${direction}端口 ${label}（${kinds.join(' / ')}）` : `${direction}端口 ${label}`
}

function displayLabel(port: PortLike): string {
  return port.label ?? port.id
}

/**
 * 端口的值类型：
 * - 输入端口：acceptValueNames（可能多个，取第一个作主展示）
 * - 输出端口：outputValueName（单个）
 */
function displayKind(port: PortLike): string {
  if (port.acceptValueNames?.length) return port.acceptValueNames[0]
  if (port.outputValueName) return port.outputValueName
  return ''
}

function onOutputPointerDown(port: PortLike, event: PointerEvent): void {
  startConnectDrag(props.nodeId, port.id, event)
}

function highlightOf(port: PortLike): string {
  if (!connectionDrag.active) return ''
  const key = portKey(props.nodeId, props.side, port.id)
  if (key === connectionDrag.sourceKey) return 'port--source'
  if (key !== connectionDrag.targetKey) return ''
  return connectionDrag.targetOk ? 'port--target' : 'port--invalid'
}

const isIn = props.side === 'in'
</script>

<template>
  <template v-for="port in ports()" :key="port.id">
    <!--
      每个端口项占一个 flex item：圆点 + label 水平排列。
      左列：圆点在右（紧贴 content 那侧），label 在左；
      右列：圆点在左（紧贴 content 那侧），label 在右。
      这样圆点探出 ports-col 边缘正好落在 content 侧线上。
    -->
    <div class="port-item" :class="{ 'port-item--left': isIn, 'port-item--right': !isIn }">
      <!-- 左列：label 在圆点左边，文本右对齐（靠近圆点） -->
      <div v-if="isIn" class="port-label port-label--right-edge">
        <span class="port-label__main">{{ displayLabel(port) }}</span>
        <span v-if="displayKind(port)" class="port-label__kind">{{ displayKind(port) }}</span>
      </div>

      <span
        :ref="refFor(port)"
        class="port"
        :class="[isIn ? 'port--in' : 'port--out', highlightOf(port)]"
        :title="titleOf(port, isIn ? '输入' : '输出')"
        @pointerdown="!isIn && onOutputPointerDown(port, $event)"
      />

      <!-- 右列：label 在圆点右边，文本左对齐（靠近圆点） -->
      <div v-if="!isIn" class="port-label port-label--left-edge">
        <span class="port-label__main">{{ displayLabel(port) }}</span>
        <span v-if="displayKind(port)" class="port-label__kind">{{ displayKind(port) }}</span>
      </div>
    </div>
  </template>
</template>

<style scoped lang="less">
.port-item {
  display: flex;
  align-items: center;
  position: relative;
  // 两行 label + 圆点：11px + 8px + 间距 ≈ 22px，留一点余量
  min-height: 28px;

  &--left {
    justify-content: flex-end;
  }

  &--right {
    justify-content: flex-start;
  }
}

.port {
  box-sizing: border-box;
  width: 12px;
  height: 12px;
  border: 2px solid @color-primary;
  border-radius: 50%;
  background: @color-surface;
  user-select: none;
  flex-shrink: 0;

  &--out {
    cursor: crosshair;
  }

  // 从 ports-col 里探出到 content 侧线：圆心正好在 ports-col 边缘
  &--in {
    margin-right: -6px;
  }

  &--out {
    margin-left: -6px;
  }

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

.port-label {
  display: flex;
  flex-direction: column;
  gap: 1px;
  white-space: nowrap;
  pointer-events: none;

  &--right-edge {
    align-items: flex-end; // 左列：文字右对齐，靠圆点那侧
    text-align: right;
    margin-right: 4px;
  }

  &--left-edge {
    align-items: flex-start; // 右列：文字左对齐，靠圆点那侧
    text-align: left;
    margin-left: 4px;
  }

  &__main {
    font-size: 11px;
    line-height: 1.1;
    color: @color-text-weak;
  }

  &__kind {
    font-size: 9px;
    line-height: 1;
    color: lighten(@color-text-weak, 25%); // 比主 label 更淡
    text-transform: lowercase;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
}
</style>
