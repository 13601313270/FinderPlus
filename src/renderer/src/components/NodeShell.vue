<script setup lang="ts">
import { computed, type Component } from 'vue'
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
 * - node-shell 本身只负责定位（position: absolute），
 *   视觉边框 / 阴影全部由 render.vue 里的 .node 提供。
 * - 端口列和 content 同高（align-items: stretch），
 *   端口竖向用 flex space-evenly 自然均分高度，
 *   圆点用负 margin 探出到 content 侧线（圆心正好对齐外壳边框）。
 *
 * 定位用的 node.position 是**相对直接父容器的局部坐标**：顶级节点直接挂在
 * stage__world 下，它就是世界坐标；被文件夹嵌套渲染时，浏览器沿 DOM 嵌套把
 * 父容器坐标与本局部坐标累加，子外壳自然落在正确的世界位置——无需调用方再传
 * 任何负向偏移（那套逐层 offset 只会越加越多，文件夹套文件夹就崩了）。
 */
const props = defineProps<{
  node: NodeLike & PortsOwnerLike
  render: Component | undefined
  floating?: boolean
}>()

const emit = defineEmits<{
  (e: 'contextmenu', nodeId: string, clientX: number, clientY: number): void
}>()

const { position, box, accepted, nodeState } = useNodePosition(() => props.node)

// 外壳根元素登记进测量注册表
const shellEl = nodeElementRef(props.node.id)

// accepted 是 useNodePosition 通过 node.onChanged 桥接出来的 reactive ref，
// Node.setNodeDropAccepted → notifyChanged → apply() 里会读到最新值写进 accepted.value，
// Vue computed 能追踪它，DOM 才会更新
const acceptedForDrop = computed(() => accepted.value)

/** node.state 对应的外壳 class（node-shell--stable 已省略，是默认） */
const stateClass = computed(() => {
  if (nodeState.value === 'dirty') return 'node-shell--dirty'
  if (nodeState.value === 'running') return 'node-shell--running'
  return ''
})

/** 鼠标悬停时显示的状态说明文案 */
const stateTooltip = computed(() => {
  switch (nodeState.value) {
    case 'dirty': return '节点输入已变化，但输出还未更新'
    case 'running': return '节点正在异步重算中…'
    default: return ''
  }
})

// 内容区硬约束：box 双轴里 >0 的那一维把 .node-content 定死宽/高（0 维不约束）。
// render.vue 在框内自适应填满，超出被 .node-content 的 overflow 裁剪。
const contentStyle = computed(() => {
  const w = box.value[0] > 0 ? `${box.value[0]}px` : undefined
  const h = box.value[1] > 0 ? `${box.value[1]}px` : undefined
  return { width: w, height: h }
})

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
    :class="[
      stateClass,
      {
        'node-shell--floating': floating,
        'node-shell--accepted': acceptedForDrop
      }
    ]"
    :data-node-id="node.id"
    :data-node-type="node.type"
    :title="stateTooltip"
    :style="{ left: `${position[0]}px`, top: `${position[1]}px` }"
    @contextmenu="onContextMenu"
  >
    <div class="ports-col ports-col--left">
      <NodePorts :node-id="node.id" :node="node" side="in" />
    </div>
    <div class="node-content" :style="contentStyle">
      <component :is="render" :id="node.id" />
      <!-- running 状态的 loading 覆层 -->
      <div v-if="nodeState === 'running'" class="node-loading" aria-hidden="true">
        <div class="node-loading__spinner" />
      </div>
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

  &--accepted {
    // 正被某个接收节点（如文件夹）悬停命中，即将被收养——视觉上变淡提示"松手后就没了"
    opacity: 0.35;
  }

  // —— 引擎层因果状态的外壳视觉提示 ——
  // 都直接写在 .node-content 自身上，用 outline / box-shadow，
  // 因为伪元素负偏移会被 .node-content 已有的 overflow:hidden 裁掉。

  // dirty：输入变了但输出没跟上 → 橙色虚线外圈（outline 不受 overflow:hidden 裁剪）
  &--dirty .node-content {
    outline: 2px dashed #f0a020;
    outline-offset: 2px;
  }
}

.ports-col {
  // 绝对定位钉在 shell 两侧，不占 flex 流——这样 shell 的自然宽度只由 content 决定，
  // 胶囊再宽也推不动 content；负 margin 探出 content 边缘的逻辑完全不变
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly; // 端口竖向均分，1 个端口正好居中
  pointer-events: none; // 容器空白区域穿透，仅圆点本身可交互
  z-index: 1;

  :deep(.port) {
    pointer-events: auto; // 只有端口圆点恢复捕获
  }

  &--left {
    // 锚在 shell 左边缘的外侧：ports-col 的右边 = shell 的左边
    right: 100%;
    left: auto;
  }

  &--right {
    // 锚在 shell 右边缘的外侧：ports-col 的左边 = shell 的右边
    left: 100%;
    right: auto;
  }
}

.node-content {
  flex: 0 0 auto; // 不让 content 被两侧挤扁
  overflow: hidden; // 硬约束：内容超出 box 被裁，render.vue 不会溢出
  box-sizing: border-box; // box 是内容区外包壳宽，border+padding 算在 box 内
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  position: relative; // loading 覆层绝对定位的参照
}

// —— running 状态的 loading 覆层 ——
.node-loading {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10; // 盖在 render.vue 之上

  &__spinner {
    width: 22px;
    height: 22px;
    border: 2.5px solid rgba(59, 124, 255, 0.2);
    border-top-color: @color-primary;
    border-radius: 50%;
    animation: node-spin 0.8s linear infinite;
  }
}

@keyframes node-spin {
  to { transform: rotate(360deg); }
}
</style>
