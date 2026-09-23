<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { workspaceScene } from '../../main/engine/graph/SceneRegistry'
import { TextInputNode } from '../../main/nodePlugin/TextInputNode/node'
import { TextDisplayNode } from '../../main/nodePlugin/TextDisplayNode/node'
import { NumberInputNode } from '../../main/nodePlugin/NumberInputNode/node'
import { manifestFor } from '../../main/nodePlugin'
import {
  viewport,
  panViewport,
  zoomViewportAt,
  resetViewport
} from '@renderer/canvas/viewport'
import EdgeLayer from './components/EdgeLayer.vue'
import NodeShell from './components/NodeShell.vue'
import ConnectionPreview from './components/ConnectionPreview.vue'
import { connectNotice } from '@renderer/canvas/connectionDrag'

// 测试画布：验证「输入框能不能影响下游展示」，顺带验证节点可拖拽、位置写回引擎。

const input = new TextInputNode('test-input')
const display = new TextDisplayNode('test-display')

// 给两张卡片一个初始落点，别叠在一起
input.setPosition(60, 60)
display.setPosition(420, 60)

workspaceScene.addNode(input)
workspaceScene.addNode(display)

// TextInputNode.textOutput -> TextDisplayNode.textInput
const connect = workspaceScene.connect(input.textOutput, display.textInput)
if (!connect.ok) {
  console.error('[test-canvas] connect failed:', connect.reason)
}

// 给个初始值做基线，之后在输入框里改动应实时反映到展示
input.setText('你好，引擎！')

// —— 新节点类型：数字输入框 ——
// 它没有输入端口，只有一个 'number' 输出端口。这里不接下游，只为验证「新增节点类型
// 不改引擎、不改通用渲染件，只加一个插件目录 + 注册表一行」这件事成立：
// 左侧应该没有圆点、右侧应该只有一个圆点，改数字时卡片里的输出读数跟着变。
// 注意它接不进 TextDisplayNode：那个输入端口只 accepts 'string'，引擎会按 kind 拒掉。
const number = new NumberInputNode('test-number-input')
number.setPosition(60, 260)
workspaceScene.addNode(number)
number.setNumber(42)

// 渲染组件一律按 node.type 从注册表取 manifest，杜绝自己把渲染组件绑错节点。
const nodes = [input, display, number]

// —— 无限画布：平移 + 缩放 ——
// 视口状态（x/y 平移偏移、scale 缩放）由 canvas/viewport 单例承载；世界层把三者
// 折成一条 CSS transform，节点的 world 坐标落进层内即被统一缩放平移，实现无限画布。

const canvasEl = ref<HTMLElement | null>(null)

const worldStyle = computed(() => ({
  transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`
}))

// 点状网格背景随视口一起动：background-size 随缩放改变点距，background-position 跟随平移，
// 给「无限」一个可感知的视觉锚点（节点之外的空白也有参照）。
const GRID_GAP = 24
const gridStyle = computed(() => ({
  backgroundSize: `${GRID_GAP * viewport.scale}px ${GRID_GAP * viewport.scale}px`,
  backgroundPosition: `${viewport.x}px ${viewport.y}px`
}))

// —— 拖拽空白处平移 ——
let panning = false
let lastClientX = 0
let lastClientY = 0

function onCanvasPointerDown(e: PointerEvent): void {
  // 只认画布空白背景：点中节点时，交给节点自己的拖拽逻辑，别抢。
  if (e.target !== canvasEl.value) return
  e.preventDefault()
  panning = true
  lastClientX = e.clientX
  lastClientY = e.clientY
  window.addEventListener('pointermove', onPanMove)
  window.addEventListener('pointerup', onPanEnd)
}

function onPanMove(e: PointerEvent): void {
  if (!panning) return
  // panViewport 收的是「增量」：取本次相对上次事件的位移逐段累加，
  // 而不是把「起点 + 累计位移」这个绝对位置再当增量加一遍（那样会越拖越快）。
  const dx = e.clientX - lastClientX
  const dy = e.clientY - lastClientY
  lastClientX = e.clientX
  lastClientY = e.clientY
  panViewport(dx, dy)
}

function onPanEnd(): void {
  panning = false
  window.removeEventListener('pointermove', onPanMove)
  window.removeEventListener('pointerup', onPanEnd)
}

// —— 滚轮：普通滚轮平移（「滚动调整位置」），Ctrl/Cmd + 滚轮缩放（含触控板双指捏合） ——
function onWheel(e: WheelEvent): void {
  e.preventDefault()
  const rect = canvasEl.value?.getBoundingClientRect()
  if (!rect) return
  const px = e.clientX - rect.left
  const py = e.clientY - rect.top

  if (e.ctrlKey || e.metaKey) {
    // 以光标为锚缩放：光标底下的内容保持不动，不会越缩越偏
    zoomViewportAt(px, py, Math.exp(-e.deltaY * 0.002))
  } else {
    panViewport(-e.deltaX, -e.deltaY)
  }
}

// —— 顶栏缩放按钮：绕画布中心缩放 ——
function zoomAroundCenter(factor: number): void {
  const rect = canvasEl.value?.getBoundingClientRect()
  if (!rect) return
  zoomViewportAt(rect.width / 2, rect.height / 2, factor)
}
const zoomIn = (): void => zoomAroundCenter(1.2)
const zoomOut = (): void => zoomAroundCenter(1 / 1.2)

// wheel 需要 preventDefault 阻止页面滚动，得用非 passive 监听器（Vue 默认不加 passive，
// 但显式 { passive: false } 最稳，也把挂载/卸载集中在一处）。
onMounted(() => {
  canvasEl.value?.addEventListener('wheel', onWheel, { passive: false })
})

onUnmounted(() => {
  canvasEl.value?.removeEventListener('wheel', onWheel)
})
</script>

<template>
  <section class="stage">
    <!-- 顶部拖动条：macOS 窗口标题栏已隐藏（titleBarStyle: 'hiddenInset'），
         这条区域用 -webkit-app-region: drag 让用户能按住它拖动整个软件窗口。
         注意：drag 区域内放不了按钮（点击会被系统吞掉），所以只用纯文本。 -->
    <header class="stage__dragbar">
      <span class="stage__dragbar-label">CanvasDesk · 拖动此区域移动窗口</span>
    </header>

    <header class="stage__header">
      <div class="stage__intro">
        <!-- 连线失败的一次性提示（类型不匹配 / 端口已占用 / 自环），引擎只给判定，文案在 connectionDrag 里翻译。
             位置一直占着（只切透明度），否则提示一出现就会把画布往下顶、节点跟着跳。 -->
        <p class="stage__notice" :class="{ 'stage__notice--on': !!connectNotice.text }">
          {{ connectNotice.text }}
        </p>
      </div>

      <div class="stage__zoom">
        <button class="stage__zoom-btn" type="button" title="缩小" @click="zoomOut">−</button>
        <span class="stage__zoom-value">{{ Math.round(viewport.scale * 100) }}%</span>
        <button class="stage__zoom-btn" type="button" title="放大" @click="zoomIn">＋</button>
        <button class="stage__zoom-reset" type="button" @click="resetViewport">复位</button>
      </div>
    </header>

    <!-- 节点用 position 绝对定位在世界层内，世界层整体 transform 承载平移 + 缩放 -->
    <div
      ref="canvasEl"
      class="stage__canvas"
      :style="gridStyle"
      @pointerdown="onCanvasPointerDown"
    >
      <div class="stage__world" :style="worldStyle">
        <!-- 连线层排在节点之前：线画在卡片下面，不会盖住节点内容 -->
        <EdgeLayer />
        <!-- 每个节点 = 外壳（定位 + 端口，通用）+ 内容（render.vue，节点自定义） -->
        <NodeShell v-for="node in nodes" :key="node.id" :node="node" :render="manifestFor(node)?.render" />
      </div>

      <!-- 连线拖拽的预览线画在屏幕层（世界层之外）：不吃缩放，线宽恒定，且压在节点之上 -->
      <ConnectionPreview />
    </div>
  </section>
</template>

<style scoped lang="less">
.stage {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 0 24px 24px;

  &__dragbar {
    // 占住窗口最顶一行作为系统可拖动区域
    height: 30px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 -24px;
    background: #e9edf3;
    border-radius: @radius-md @radius-md 0 0;
    user-select: none;
    cursor: default;
    -webkit-app-region: drag;
  }

  &__dragbar-label {
    color: @color-text-weak;
    font-size: 12px;
  }

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }

  &__intro {
    min-width: 0;
  }

  &__notice {
    // 常驻占位（高度写死），提示出现时不会把下面的画布顶下去
    min-height: 18px;
    margin: 0;
    color: @color-danger;
    font-size: 13px;
    opacity: 0;
    transition: opacity 0.15s ease;

    &--on {
      opacity: 1;
    }
  }

  &__zoom {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  &__zoom-btn {
    width: 30px;
    height: 30px;
    border: 1px solid #d5d9e0;
    border-radius: 6px;
    background: @color-surface;
    color: @color-text;
    font-size: 16px;
    line-height: 1;
    cursor: pointer;

    &:hover {
      background: #eef1f5;
    }
  }

  &__zoom-value {
    min-width: 52px;
    text-align: center;
    font-variant-numeric: tabular-nums;
    color: @color-text-weak;
    font-size: 13px;
  }

  &__zoom-reset {
    height: 30px;
    padding: 0 10px;
    border: 1px solid #d5d9e0;
    border-radius: 6px;
    background: @color-surface;
    color: @color-text;
    font-size: 13px;
    cursor: pointer;

    &:hover {
      background: #eef1f5;
    }
  }

  &__canvas {
    position: relative;
    flex: 1;
    min-height: 320px;
    border: 1px dashed #d5d9e0;
    border-radius: @radius-md;
    overflow: hidden;
    cursor: grab;
    touch-action: none; // 阻止触摸默认滚动/缩放，让 pointer 事件接管平移
    background-color: #fbfcfe;
    background-image: radial-gradient(circle, #cfd4dc 1px, transparent 1px);
    background-repeat: repeat;

    &:active {
      cursor: grabbing;
    }
  }

  &__world {
    position: absolute;
    left: 0;
    top: 0;
    width: 0;
    height: 0;
    transform-origin: 0 0;
    will-change: transform;
  }
}
</style>
