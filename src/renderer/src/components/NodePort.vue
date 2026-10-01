<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  portElementRef,
  portKey,
  type CanvasElementRef,
  type PortLike,
  type PortSide
} from '@renderer/canvas/elements'
import { connectionDrag, startConnectDrag } from '@renderer/canvas/connectionDrag'

const props = defineProps<{
  nodeId: string
  port: PortLike
  side: PortSide
  /** 端口显示文案：由父组件 NodePorts 按当前语言解析后下传（label 是引擎普通对象，子组件 watch 不到） */
  label: string
}>()

const isIn = props.side === 'in'

const { t, te } = useI18n()

// 每个组件实例只管自己这一个端口的 ref，不需要 Map 缓存
const portRef: CanvasElementRef = portElementRef(props.nodeId, props.side, props.port)

// 跟踪当前有没有接边：初始从 incomingEdgeCount 取，后续靠 onEdgeBinding 事件更新
const hasConnection = ref(false)

// 「显示默认值胶囊」的条件：输入端口 + 有默认值 + 没有连线
const showDefaultCapsule = computed(() =>
  isIn && !!props.port.defaultValueLabel && !hasConnection.value
)

let unsubEdgeBinding: (() => void) | undefined

onMounted(() => {
  // 初始化连接状态——组件挂载时可能已经连着边了
  hasConnection.value = (props.port.incomingEdgeCount ?? 0) > 0

  // 输入端口才有 onEdgeBinding 方法，OutputPort 侧暂时没有对应订阅需求
  if (isIn && props.port.onEdgeBinding) {
    unsubEdgeBinding = props.port.onEdgeBinding((event) => {
      hasConnection.value = event.kind === 'bind'
        ? true
        : (props.port.incomingEdgeCount ?? 0) > 0
    })
  }
})

onUnmounted(() => {
  // 必须配对解绑，否则监听残留在引擎端口实例里（匿名函数解绑失效问题）
  if (unsubEdgeBinding) {
    unsubEdgeBinding()
    unsubEdgeBinding = undefined
  }
})

function titleOf(port: PortLike, direction: string): string {
  const kinds = port.acceptValueNames ?? (port.outputValueName ? [port.outputValueName] : [])
  return kinds.length > 0
    ? `${direction}端口 ${props.label}（${kinds.join(' / ')}）`
    : `${direction}端口 ${props.label}`
}

function displayKinds(port: PortLike): readonly string[] {
  if (port.acceptValueNames?.length) return port.acceptValueNames
  if (port.outputValueName) return [port.outputValueName]
  return []
}

/**
 * 端口类型胶囊的显示文案。
 *
 * 引擎内置的类型（number / string / file 等，见 Value.ts 的 BUILTIN_VALUE_KINDS）都有词条；
 * 插件自定义的类型没有词条，原样显示标识符——ValueKind 是开放字符串，
 * UI 不该硬编码一份「合法类型」清单去拦截第三方插件的种类。
 */
function kindLabel(kind: string): string {
  const key = `valueKind.${kind}`
  return te(key) ? t(key) : kind
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
</script>

<template>
  <!--
    每个端口项占一个 flex item：圆点 + label 水平排列。
    左列：圆点在右（紧贴 content 那侧），label 在左；
    右列：圆点在左（紧贴 content 那侧），label 在右。
    这样圆点探出 ports-col 边缘正好落在 content 侧线上。
  -->
  <div class="port-item" :class="{ 'port-item--left': isIn, 'port-item--right': !isIn }">
    <!-- 左列：label 在圆点左边，文本右对齐（靠近圆点） -->
    <div v-if="isIn" class="port-label port-label--right-edge">
      <span class="port-label__main">{{ label }}</span>
      <div v-if="displayKinds(port).length" class="port-label__kinds">
        <span
          v-for="k in displayKinds(port)"
          :key="k"
          class="port-label__kind"
        >{{ kindLabel(k) }}</span>
      </div>
    </div>

    <span
      :ref="portRef"
      class="port"
      :class="[
        isIn ? 'port--in' : 'port--out',
        highlightOf(port),
        showDefaultCapsule ? 'port--default' : ''
      ]"
      :title="titleOf(port, isIn ? '输入' : '输出')"
      @pointerdown="!isIn && onOutputPointerDown(port, $event)"
    >
      <template v-if="showDefaultCapsule">{{ port.defaultValueLabel }}</template>
    </span>

    <!-- 右列：label 在圆点右边，文本左对齐（靠近圆点） -->
    <div v-if="!isIn" class="port-label port-label--left-edge">
      <span class="port-label__main">{{ label }}</span>
      <div v-if="displayKinds(port).length" class="port-label__kinds">
        <span
          v-for="k in displayKinds(port)"
          :key="k"
          class="port-label__kind"
        >{{ kindLabel(k) }}</span>
      </div>
    </div>
  </div>
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

  // 默认值胶囊形状：小圆变扁胶囊，中间容纳文本
  &--default {
    width: auto;
    min-width: 24px;
    height: 18px;
    padding: 0 6px;
    border-radius: 9px;
    font-size: 10px;
    line-height: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: default;
  }
}

.port-label {
  display: flex;
  flex-direction: column;
  gap: 1px;
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
    white-space: nowrap;
  }

  // 多行类型标签容器：grid 每行最多两个
  &__kinds {
    display: grid;
    grid-template-columns: repeat(2, max-content);
    gap: 0 4px;
  }

  &__kind {
    font-size: 9px;
    line-height: 1;
    color: lighten(@color-text-weak, 25%); // 比主 label 更淡
    text-transform: lowercase;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    white-space: nowrap;
  }
}
</style>
