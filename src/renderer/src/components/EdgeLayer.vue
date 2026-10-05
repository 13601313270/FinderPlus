<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { workspaceScene } from '../../../main/engine/graph/SceneRegistry'
import type { Edge } from '../../../main/engine/graph/Edge'
import { viewport } from '@renderer/canvas/viewport'
import { canvasLayoutVersion } from '@renderer/canvas/elements'
import { edgeGeometry, isEdgeGeometry, bezierPath, type EdgeGeometry } from '@renderer/canvas/edges'

/**
 * 连线层：把 Scene 里的每条 Edge 画成一根线，并在线的正中央放一个删除按钮。
 * 线的两端是**端口圆点的中心**（输出端口 -> 输入端口），端点由 canvas/edges.ts 算好。
 *
 * 它是**世界层**的一员（世界层里排在节点之前，所以线压在卡片下面），坐标直接用世界坐标，
 * 平移缩放跟着世界层的 transform 走，和节点永远对得齐。
 *
 * —— 响应式桥 ——
 * 引擎里的边集合、节点位置都是普通字段，Vue 追踪不到，所以这里用三个自增计数当依赖：
 * - sceneTick：Scene 广播结构变化（连线增删）时 +1；
 * - nodeTick：任一节点位置变化（拖拽）时 +1；
 * - canvasLayoutVersion：卡片 / 端口圆点登记与尺寸变化时 +1（在 canvas/elements 里维护）。
 * 三者任一变化都会让下面的 computed 重量一次几何。
 */
const sceneTick = ref(0)
const nodeTick = ref(0)

const lines = computed<readonly EdgeGeometry[]>(() => {
  // 下面三行只做「依赖登记」，取到的值本身不用：几何不是响应式数据，靠它们触发重算。
  sceneTick.value
  nodeTick.value
  canvasLayoutVersion.value

  return workspaceScene.allEdges
    .map((edge) => edgeGeometry(workspaceScene, edge))
    .filter(isEdgeGeometry)
})

// Edge 在引擎里没有 id（它就只是两端端口的一条记录），但 v-for 需要稳定 key。
// 边的对象引用是稳定的，所以用 WeakMap 发一个只在本组件内有效的序号：同一条边永远是同一个 key。
let edgeKeySeed = 0
const edgeKeys = new WeakMap<Edge, number>()

function keyOf(edge: Edge): number {
  let key = edgeKeys.get(edge)
  if (key === undefined) {
    edgeKeySeed += 1
    key = edgeKeySeed
    edgeKeys.set(edge, key)
  }
  return key
}

/**
 * 小于这个缩放就不再画删除按钮。
 *
 * 按钮现在是跟着世界层缩放的（不做反向补偿），22px 的圆点缩到 30% 只剩 6px 出头，
 * 既看不清也点不准，留着只是糊在连线上的噪声；连线本身照画，只是暂时没有删除入口，
 * 放大回来按钮自然回来。
 */
const REMOVE_BUTTON_MIN_SCALE = 0.3

const showRemoveButtons = computed(() => viewport.scale >= REMOVE_BUTTON_MIN_SCALE)

// 节点位置变化只有 Node.onChanged 会广播（Scene 只报结构变化），所以这里订阅一遍所有节点。
// 订阅列表跟着场景结构走：每次结构变化都重新订一份，节点增删都不会漏。
let unsubscribeScene: (() => void) | undefined
let unsubscribeNodes: (() => void)[] = []

function resubscribeNodes(): void {
  unsubscribeNodes.forEach((off) => off())
  unsubscribeNodes = workspaceScene.allNodes.map((node) =>
    node.onChanged(() => {
      nodeTick.value++
    })
  )
}

function onSceneChanged(): void {
  sceneTick.value++
  resubscribeNodes()
}

onMounted(() => {
  unsubscribeScene = workspaceScene.onChanged(onSceneChanged)
  resubscribeNodes()
})

onUnmounted(() => {
  unsubscribeScene?.()
  unsubscribeNodes.forEach((off) => off())
  unsubscribeNodes = []
})

/**
 * 解除连接：唯一的解绑入口就是 Scene.removeEdge（它内部再委托 EdgeBinder 把两端指针一次清干净）。
 * 这里不自己改 lines——Scene 会广播结构变化，上面的 computed 自然重算，线就没了；
 * 同时 InputPort 解绑会通知下游节点刷新，展示节点当场退回「暂无输出」。
 */
function removeEdge(edge: Edge): void {
  workspaceScene.removeEdge(edge)
}
</script>

<template>
  <!--
    尺寸给 1x1 是刻意的：连线坐标是世界坐标，可以落在任意远处甚至负数。
    SVG 默认会把视口外的内容裁掉，所以必须 overflow: visible 把内容放出来（见样式），
    真正限制可见范围的是外层画布容器的 overflow: hidden。
    pointer-events: none 让线不挡平移和节点拖拽——只有删除按钮可点。
  -->
  <svg class="edges" width="1" height="1" aria-hidden="true">
    <path
      v-for="line in lines"
      :key="`line-${keyOf(line.edge)}`"
      class="edges__line"
      :d="bezierPath(line.from, line.to)"
    />
  </svg>

  <!--
    删除按钮跟线一起放在世界层，位置就是连线中点，**不做反向补偿**：它跟节点卡片一样吃
    世界层的 scale，缩小时跟着一起变小。
    小到一定程度就干脆不画了——缩到 30% 时按钮只剩六七个像素，看不清也点不准，
    留在线上只是噪声。连线本身照画，只是那会儿没有删除入口。
  -->
  <template v-if="showRemoveButtons">
    <button
      v-for="line in lines"
      :key="`remove-${keyOf(line.edge)}`"
      class="edges__remove"
      type="button"
      title="断开两个节点之间的连接"
      aria-label="断开两个节点之间的连接"
      :style="{ left: `${line.mid.x}px`, top: `${line.mid.y}px` }"
      @pointerdown.stop
      @click.stop="removeEdge(line.edge)"
    >
      ×
    </button>
  </template>
</template>

<style scoped lang="less">
.edges {
  position: absolute;
  left: 0;
  top: 0;
  // 视口只有 1x1，连线画到视口外是常态，必须放出来
  overflow: visible;
  // 线不参与交互，别挡住画布平移 / 节点拖拽
  pointer-events: none;

  &__line {
    fill: none;
    stroke: @color-edge;
    stroke-width: 2;
    stroke-linecap: round;
  }

  &__remove {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    // 尺寸是世界坐标下的尺寸：跟节点卡片一样被世界层的 scale 一起缩放
    width: 22px;
    height: 22px;
    // 让圆心落在连线中点上（世界坐标）。这里只做居中，不再乘 1/scale 补偿缩放
    transform: translate(-50%, -50%);
    padding: 0;
    border: 1px solid #d5d9e0;
    border-radius: 50%;
    background: @color-surface;
    color: @color-text-weak;
    font-size: 15px;
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
    z-index: 1;

    &:hover {
      border-color: #e6a3a3;
      background: #fff5f5;
      color: #d94b4b;
    }
  }
}
</style>
