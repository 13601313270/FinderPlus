<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, ref, watch, type Component } from 'vue'
import { useNodePosition, type NodeLike } from '@renderer/composables/useNodePosition'
import { nodeElementRef, type PortsOwnerLike } from '@renderer/canvas/elements'
import { getNodeManifest } from '../../../main/nodePlugin'
import NodePorts from './NodePorts.vue'

/** 最小化状态下的固定尺寸（世界像素） */
const MINIMIZED_SIZE = 80

/**
 * 最小化时的外壳尺寸：高度按端口数量自适应，保证圆点不溢出。
 * 12px/端口 = 12px 圆点直径（.port width/height）的紧凑排布，比正常态的 34px 宽松得多。
 */
const minimizedSizeStyle = computed(() => {
  const count = Math.max(inputPortCount.value, outputPortCount.value)
  const h = Math.max(MINIMIZED_SIZE, count * 12)
  return { width: `${MINIMIZED_SIZE}px`, height: `${h}px` }
})

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

const { position, box, accepted, nodeState, dirtyInputPortIds, minimized, displayName, startDrag } = useNodePosition(() => props.node)

// 把 startDrag + box 传给 NodeHeader（render.vue 里不用再各自调 useNodePosition）
provide('nodeStartDrag', startDrag)
provide('nodeBox', box)
// 最小化：NodeHeader 的按钮读状态 + 触发切换
provide('nodeMinimized', minimized)
provide('toggleNodeMinimize', () => props.node.toggleMinimized?.())
// 显示名称：NodeHeader 标题右侧展示
provide('nodeDisplayName', displayName)

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
  if (nodeState.value === 'error') return 'node-shell--error'
  return ''
})

/** 最小化时用的图标 paths：从 manifest 拿 iconPaths，没有就 null 渲染兜底字母 */
const minimizedIconPaths = computed<readonly string[] | null>(() => {
  return getNodeManifest(props.node.type)?.iconPaths ?? null
})

/** 鼠标悬停时显示的状态说明文案 */
const stateTooltip = computed(() => {
  switch (nodeState.value) {
    case 'dirty': return '节点输入已变化，但输出还未更新'
    case 'running': return '节点正在异步重算中…'
    case 'error': return '节点运行出错，点击查看详情'
    default: return ''
  }
})

// —— running 耗时计时 ——
const runElapsed = ref(0)   // 秒
let runTimer: ReturnType<typeof setInterval> | null = null

function formatElapsed(sec: number): string {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}m${String(s).padStart(2, '0')}s`
}

watch(nodeState, (s) => {
  if (s === 'running') {
    runElapsed.value = Math.floor((Date.now() - (props.node.displayRunStartAt ?? 0)) / 1000)
    runTimer = setInterval(() => {
      const since = props.node.displayRunStartAt
      if (since) runElapsed.value = Math.floor((Date.now() - since) / 1000)
    }, 500)
  } else {
    if (runTimer) { clearInterval(runTimer); runTimer = null }
    runElapsed.value = 0
  }
}, { immediate: true })

/**
 * 端口数量镜像：引擎的 inputPorts / outputPorts 是普通数组（push/splice 不会触发 Vue reactivity），
 * 这里通过 node.onChanged 订阅引擎层的 notifyChanged，手动把端口数同步进 reactive ref，
 * 让 contentStyle computed 能追踪到端口增删。
 */
const inputPortCount = ref(0)
const outputPortCount = ref(0)

let portCountUnsub: (() => void) | undefined

onMounted(() => {
  const sync = () => {
    inputPortCount.value = props.node.inputPorts.length
    outputPortCount.value = props.node.outputPorts.length
  }
  sync()
  portCountUnsub = props.node.onChanged(sync)
})

onUnmounted(() => {
  portCountUnsub?.()
})

/**
 * 两侧端口竖向排列时，每个 .port-item 至少占 28px（min-height），
 * 加 space-evenly 的间距余量取 34px——跟 PromiseAllNode.PER_PORT_HEIGHT 保持一致。
 */
const PER_PORT_HEIGHT = 34

// 内容区硬约束：box 双轴里 >0 的那一维把 .node-content 定死宽/高（0 维不约束）。
// 但如果 box 声明的高度不够装下所有端口，自动撑到能容纳的高度——
// 避免动态端口节点（如 ImageToPdfNode 9 个输入）的端口溢出 box 范围。
const contentStyle = computed(() => {
  const boxW = box.value[0]
  const boxH = box.value[1]

  // 两侧端口列各需的最小高度，取较大那一侧
  const portsMinH = Math.max(inputPortCount.value, outputPortCount.value) * PER_PORT_HEIGHT

  const w = boxW > 0 ? `${boxW}px` : undefined
  // box 为 0 → 完全由端口数量决定；box 不够 → 撑到端口需求；box 够 → 用 box
  const h = boxH > 0 ? `${Math.max(boxH, portsMinH)}px` : portsMinH > 0 ? `${portsMinH}px` : undefined

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
  <div :ref="shellEl" class="node-shell" :class="[
    stateClass,
    {
      'node-shell--floating': floating,
      'node-shell--accepted': acceptedForDrop,
      'node-shell--minimized': minimized
    }
  ]" :data-node-id="node.id" :data-node-type="node.type" :title="stateTooltip" :style="{
    left: `${position[0]}px`,
    top: `${position[1]}px`,
    ...(minimized ? { width: `${MINIMIZED_SIZE}px`, height: `${Math.max(MINIMIZED_SIZE, Math.max(inputPortCount, outputPortCount) * 12)}px` } : {})
  }" @contextmenu="onContextMenu">
    <!-- 两侧端口列：始终渲染（最小化/展开都要显示端口圆点），hide-label 让 label 消失 -->
    <div class="ports-col ports-col--left">
      <NodePorts :node-id="node.id" :node="node" side="in" :dirty-ids="dirtyInputPortIds" :hide-label="minimized" />
    </div>
    <div class="ports-col ports-col--right">
      <NodePorts :node-id="node.id" :node="node" side="out" :hide-label="minimized" />
    </div>

    <!-- 中间内容区：最小化 → 80×80 图标 + 还原按钮；正常态 → node-body + render.vue -->
    <template v-if="minimized">
      <div v-if="displayName" class="node-minimized-name">{{ displayName }}</div>
      <div class="node-minimized-icon" :style="minimizedSizeStyle" @pointerdown="startDrag">
        <!-- 还原按钮：最小化时 NodeHeader 被隐藏了，这里叠一个小号还原入口 -->
        <button class="node-minimized-icon__restore" type="button" title="还原" @pointerdown.stop
          @click.stop="props.node.toggleMinimized?.()">▢</button>
        <svg v-if="minimizedIconPaths" class="node-minimized-icon__svg" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path v-for="(d, i) in minimizedIconPaths" :key="i" :d="d" />
        </svg>
        <span v-else class="node-minimized-icon__fallback">{{ node.type.slice(0, 2).toUpperCase() }}</span>
      </div>
      <!-- 底部方法端口行：最小化态也要保留，hide-label 只留三角形；用 absolute 钉在 icon 底部，不参与 flex 流 -->
      <div v-if="node.methodPorts && node.methodPorts.length > 0"
        class="ports-row ports-row--bottom ports-row--minimized">
        <NodePorts :node-id="node.id" :node="node" side="method" :hide-label="true" />
      </div>
      <div v-if="nodeState === 'running'" class="node-loading" aria-hidden="true">
        <div class="node-loading__spinner" />
        <span class="node-loading__elapsed">{{ formatElapsed(runElapsed) }}</span>
      </div>
    </template>
    <template v-else>
      <div class="node-body">
        <div class="node-content" :style="contentStyle">
          <component :is="render" :id="node.id" />
          <!-- running 状态的 loading 覆层 -->
          <div v-if="nodeState === 'running'" class="node-loading" aria-hidden="true">
            <div class="node-loading__spinner" />
            <span class="node-loading__elapsed">{{ formatElapsed(runElapsed) }}</span>
          </div>
        </div>
        <!-- 底部方法端口行：只有存在方法端口时才渲染 -->
        <div v-if="node.methodPorts && node.methodPorts.length > 0" class="ports-row ports-row--bottom">
          <NodePorts :node-id="node.id" :node="node" side="method" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="less">
.node-shell {
  position: absolute;
  display: flex;
  align-items: stretch; // 两侧 ports-col 高度跟随 content
  z-index: 3;

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

  &--dirty .node-minimized-icon {
    outline: 2px dashed #f0a020;
    outline-offset: 2px;
  }

  &--error .node-content {
    outline: 4px dashed #e01c1c;
    outline-offset: 2px;
  }

  &--error .node-minimized-icon {
    outline: 4px dashed #e01c1c;
    outline-offset: 2px;
  }

  &.node-shell--minimized {
    z-index: 2;
  }
}

// node-body 包裹 node-content + 底部 ports-row，让 content 和底部方法端口垂直排列
.node-body {
  display: flex;
  flex-direction: column;
  flex: 0 0 auto; // 不让 body 被两侧挤扁
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
  z-index: 11;

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

// 底部方法端口行：横向排列，居中对齐
.ports-row {
  display: flex;
  justify-content: center;
  gap: 12px;

  &--bottom {
    // 锚在 node-content 底部：ports-row 在 node-body 的 flex 底部
    padding-top: 6px;
    pointer-events: none; // 容器空白区域穿透

    :deep(.port) {
      pointer-events: auto; // 只有端口三角形恢复捕获
    }

    // NodePorts 在 method side 时改横向排列
    :deep(.port-item) {
      flex-direction: column;
      justify-content: center;
      min-height: 0;
    }
  }

  // 最小化态：absolute 钉在 icon 下方壳外，不参与 flex 流，跟 ports-col 同级
  &--minimized {
    position: absolute;
    left: 0;
    right: 0;
    bottom: -14px; // 三角形高 12px + 2px 间隙
    padding-top: 0;
    padding-bottom: 0;
    z-index: 11;
  }
}

.node-content {
  flex: 0 0 auto; // 不让 content 被两侧挤扁
  overflow: hidden; // 硬约束：内容超出 box 被裁，render.vue 不会溢出
  box-sizing: border-box; // box 是内容区外包壳宽，border+padding 算在 box 内
  box-shadow: 0 0 17px 0px rgb(0 0 0 / 25%);
  background: @color-surface;
  position: relative; // loading 覆层绝对定位的参照
  border: 2px solid var(--theme-node-border);
  // border: 1px solid red;
  border-radius: 8px;
}

// —— running 状态的 loading 覆层 ——
.node-loading {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 8px;
  z-index: 10; // 盖在 render.vue 之上
  pointer-events: none; // 不拦截交互：节点自己会按 status 禁用/启用按钮
  display: flex;
  flex-direction: column;
  left: 2px;
  right: 2px;
  top: 2px;
  bottom: 2px;

  &__spinner {
    width: 32px;
    height: 32px;
    border: 2.5px solid rgba(59, 124, 255, 0.2);
    border-top-color: @color-primary;
    border-radius: 50%;
    animation: node-spin 0.8s linear infinite;
    flex-shrink: 0;
  }

  &__elapsed {
    font-size: 12px;
    font-weight: 500;
    color: @color-text-weak;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
}

@keyframes node-spin {
  to {
    transform: rotate(360deg);
  }
}

// —— 最小化状态 ——
// 外壳宽高由内联 style 动态指定（MINIMIZED_SIZE 宽 + 端口数自适应高）

.node-minimized-icon {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  box-shadow: 0 0 17px 0px rgb(0 0 0 / 25%);
  background: @color-surface;
  border: 2px solid var(--theme-node-border);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4b5563; // 图标默认灰色
  position: relative;

  &__restore {
    all: unset;
    position: absolute;
    top: 2px;
    right: 2px;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #f3f4f6;
    border: 1px solid var(--theme-node-border);
    color: #6b7280;
    font-size: 12px;
    line-height: 1;
    cursor: pointer;
    z-index: 20;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: #dbeafe;
      color: #2563eb;
    }
  }

  &__svg {
    width: 48px;
    height: 48px;
    pointer-events: none;
  }

  &__fallback {
    font-size: 20px;
    font-weight: 600;
    color: #9ca3af;
    letter-spacing: 1px;
  }
}

.node-minimized-name {
  font-size: 12px;
  font-weight: 600;
  color: #000000;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 4px;
  position: absolute;
  background: #ffffff52;
  top: -22px;
  transform: translateX(calc(-50% + 40px));
}
</style>
