<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { workspaceScene } from '../../../main/engine/graph/SceneRegistry'
import {
  viewport,
  centerViewportOn,
  zoomViewportAt,
  resetViewport
} from '@renderer/canvas/viewport'
import { canvasLayoutVersion, measureNodeBox } from '@renderer/canvas/elements'
import { edgeGeometry, isEdgeGeometry } from '@renderer/canvas/edges'

/**
 * 小地图面板（画布右下角浮层，屏幕层、不吃世界缩放），自上而下三段：
 *
 * 1. 拖动条：按住它挪动**小地图本身**（限制在画布内）；
 * 2. 地图区：节点小方块 + 连线 + 当前视口框；点击 / 按住拖动把对应世界点居中到画布；
 * 3. 控件行：− / 缩放百分比 / ＋ / 复位，所有缩放操作都收在这里，顶栏不再放。
 *
 * —— 地图区坐标映射 ——
 * 世界范围 = 所有节点包围盒与当前视口框的**并集**再外扩一圈（平移到再远，视口框也不会
 * 跑出小地图）；比例由地图区尺寸 / 世界范围尺寸驱动，节点、连线、视口框共用同一套
 * 世界 → 小地图像素映射，不写死常量。
 * 单调性自检：缩小画布（scale ↓）⇒ 视口覆盖的世界范围变大 ⇒ 框在小地图里变大；放大反之。
 *
 * —— 响应式桥 ——
 * 和 EdgeLayer 一样依赖 sceneTick（结构变化）、nodeTick（节点位置变化）、
 * canvasLayoutVersion（卡片尺寸变化），另外 viewport 本身是 reactive、画布容器尺寸自量。
 */

// 面板与画布边框的最小留白
const PANEL_MARGIN = 8

// 面板各段的固定像素尺寸
const PANEL_W = 196
const DRAGBAR_H = 22
const MAP_H = 120
const TOOLBAR_H = 32
const PANEL_H = DRAGBAR_H + MAP_H + TOOLBAR_H
const COLLAPSED_H = DRAGBAR_H

// 地图区内部绘制区
const MAP_PAD = 8
const DRAW_W = PANEL_W - MAP_PAD * 2
const DRAW_H = MAP_H - MAP_PAD * 2

// 世界范围的外扩边距与最小尺寸：节点不贴边，空场景 / 单节点时映射也不退化
const WORLD_MARGIN = 60
const MIN_WORLD_W = 320
const MIN_WORLD_H = 220

// 小方块 / 视口框在小地图里的最小像素尺寸，避免缩没了
const MIN_RECT_SIZE = 3

const rootEl = ref<HTMLElement | null>(null)
const mapEl = ref<SVGSVGElement | null>(null)

// 画布容器（自己的 parentElement）的屏幕尺寸：视口框世界尺寸折算、缩放锚点、面板定位都靠它
const canvasW = ref(0)
const canvasH = ref(0)
let resizeObserver: ResizeObserver | undefined

// 面板在画布里的位置（初始落点在挂载时量到右下角）
const panelLeft = ref(0)
const panelTop = ref(0)
const positioned = ref(false)

const collapsed = ref(false)
const currentH = computed(() => (collapsed.value ? COLLAPSED_H : PANEL_H))

function clampPanelPosition(): void {
  const h = currentH.value
  const maxLeft = Math.max(PANEL_MARGIN, canvasW.value - PANEL_W - PANEL_MARGIN)
  const maxTop = Math.max(PANEL_MARGIN, canvasH.value - h - PANEL_MARGIN)
  panelLeft.value = Math.min(Math.max(PANEL_MARGIN, panelLeft.value), maxLeft)
  panelTop.value = Math.min(Math.max(PANEL_MARGIN, panelTop.value), maxTop)
}

function toggleCollapse(): void {
  collapsed.value = !collapsed.value
  clampPanelPosition()
}

const sceneTick = ref(0)
const nodeTick = ref(0)

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

interface MapRect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

interface MapLine {
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
}

interface MinimapLayout {
  /** 世界 → 小地图像素的比例与原点偏移（逆映射导航也要用同一套参数） */
  readonly ratio: number
  readonly offsetX: number
  readonly offsetY: number
  /** 世界范围左下角（小地图里 world 原点对应的实际世界坐标） */
  readonly worldMinX: number
  readonly worldMinY: number
  readonly nodeRects: readonly MapRect[]
  readonly lines: readonly MapLine[]
  readonly frameRect: MapRect
}

const layout = computed<MinimapLayout | null>(() => {
  // 下面的读取只做依赖登记，几何本身不是响应式数据，靠这些触发重算
  sceneTick.value
  nodeTick.value
  canvasLayoutVersion.value
  viewport.x
  viewport.y
  viewport.scale
  canvasW.value
  canvasH.value

  const w = canvasW.value
  const h = canvasH.value
  if (!w || !h) return null

  const nodeBoxes = workspaceScene.allNodes.map((node) => measureNodeBox(node.id, node.position, node.box))
  const edgeGeoms = workspaceScene.allEdges
    .map((edge) => edgeGeometry(workspaceScene, edge))
    .filter(isEdgeGeometry)

  // 当前视口覆盖的世界范围：屏幕 = 世界 × scale + 平移 ⇒ 屏幕原点对应世界 (-x/scale, -y/scale)
  const frame = {
    x: -viewport.x / viewport.scale,
    y: -viewport.y / viewport.scale,
    width: w / viewport.scale,
    height: h / viewport.scale
  }

  // 世界范围 = 节点包围盒 ∪ 当前视口框，再外扩边距
  let minX = frame.x
  let minY = frame.y
  let maxX = frame.x + frame.width
  let maxY = frame.y + frame.height
  for (const box of nodeBoxes) {
    minX = Math.min(minX, box.x)
    minY = Math.min(minY, box.y)
    maxX = Math.max(maxX, box.x + box.width)
    maxY = Math.max(maxY, box.y + box.height)
  }
  minX -= WORLD_MARGIN
  minY -= WORLD_MARGIN
  maxX += WORLD_MARGIN
  maxY += WORLD_MARGIN

  const worldW = Math.max(MIN_WORLD_W, maxX - minX)
  const worldH = Math.max(MIN_WORLD_H, maxY - minY)

  // 容器驱动的自适应比例：节点、连线、视口框走同一个映射入口
  const ratio = Math.min(DRAW_W / worldW, DRAW_H / worldH)
  const offsetX = MAP_PAD + (DRAW_W - worldW * ratio) / 2
  const offsetY = MAP_PAD + (DRAW_H - worldH * ratio) / 2

  const toX = (worldX: number): number => offsetX + (worldX - minX) * ratio
  const toY = (worldY: number): number => offsetY + (worldY - minY) * ratio
  const toW = (worldSize: number): number => Math.max(MIN_RECT_SIZE, worldSize * ratio)

  return {
    ratio,
    offsetX,
    offsetY,
    worldMinX: minX,
    worldMinY: minY,
    nodeRects: nodeBoxes.map((box) => ({
      x: toX(box.x),
      y: toY(box.y),
      width: toW(box.width),
      height: toW(box.height)
    })),
    lines: edgeGeoms.map((geom) => ({
      x1: toX(geom.from.x),
      y1: toY(geom.from.y),
      x2: toX(geom.to.x),
      y2: toY(geom.to.y)
    })),
    frameRect: {
      x: toX(frame.x),
      y: toY(frame.y),
      width: toW(frame.width),
      height: toW(frame.height)
    }
  }
})

const zoomPercent = computed(() => Math.round(viewport.scale * 100))

// —— 地图区：点击 / 拖拽导航（小地图像素 → 世界坐标 → 画布居中），不改缩放 ——
let navigating = false

function navigateAt(clientX: number, clientY: number): void {
  const current = layout.value
  const rect = mapEl.value?.getBoundingClientRect()
  if (!current || !rect) return

  // 正向: toX = offsetX + (worldX - worldMinX) * ratio
  // 反推: worldX = (toX - offsetX) / ratio + worldMinX
  const px = clientX - rect.left - current.offsetX
  const py = clientY - rect.top - current.offsetY
  const wx = px / current.ratio + current.worldMinX
  const wy = py / current.ratio + current.worldMinY
  centerViewportOn(wx, wy, canvasW.value, canvasH.value)
}

function onNavigateDown(e: PointerEvent): void {
  e.preventDefault()
  e.stopPropagation()
  navigating = true
  navigateAt(e.clientX, e.clientY)
  window.addEventListener('pointermove', onNavigateMove)
  window.addEventListener('pointerup', onNavigateUp)
}

function onNavigateMove(e: PointerEvent): void {
  if (!navigating) return
  navigateAt(e.clientX, e.clientY)
}

function onNavigateUp(): void {
  navigating = false
  window.removeEventListener('pointermove', onNavigateMove)
  window.removeEventListener('pointerup', onNavigateUp)
}

// —— 拖动条：挪动小地图面板本身，夹在画布范围内 ——
let movingPanel = false
let grabOffsetX = 0
let grabOffsetY = 0

function onDragbarDown(e: PointerEvent): void {
  e.preventDefault()
  e.stopPropagation()
  movingPanel = true
  grabOffsetX = e.clientX - panelLeft.value
  grabOffsetY = e.clientY - panelTop.value
  window.addEventListener('pointermove', onPanelMove)
  window.addEventListener('pointerup', onPanelUp)
}

function onPanelMove(e: PointerEvent): void {
  if (!movingPanel) return
  const h = currentH.value
  const maxLeft = Math.max(PANEL_MARGIN, canvasW.value - PANEL_W - PANEL_MARGIN)
  const maxTop = Math.max(PANEL_MARGIN, canvasH.value - h - PANEL_MARGIN)
  panelLeft.value = Math.min(Math.max(PANEL_MARGIN, e.clientX - grabOffsetX), maxLeft)
  panelTop.value = Math.min(Math.max(PANEL_MARGIN, e.clientY - grabOffsetY), maxTop)
}

function onPanelUp(): void {
  movingPanel = false
  window.removeEventListener('pointermove', onPanelMove)
  window.removeEventListener('pointerup', onPanelUp)
}

// —— 控件行：绕画布中心缩放 / 复位 ——
function zoomBy(factor: number): void {
  zoomViewportAt(canvasW.value / 2, canvasH.value / 2, factor)
}
const zoomIn = (): void => zoomBy(1.2)
const zoomOut = (): void => zoomBy(1 / 1.2)
const reset = (): void => resetViewport()

onMounted(() => {
  const canvas = rootEl.value?.parentElement
  if (canvas) {
    canvasW.value = canvas.clientWidth
    canvasH.value = canvas.clientHeight
    panelLeft.value = canvasW.value - PANEL_W - PANEL_MARGIN
    panelTop.value = canvasH.value - PANEL_H - PANEL_MARGIN
    positioned.value = true

    resizeObserver = new ResizeObserver(() => {
      canvasW.value = canvas.clientWidth
      canvasH.value = canvas.clientHeight
      // 画布缩小时把面板收回来，别留在画布外
      clampPanelPosition()
    })
    resizeObserver.observe(canvas)
  }

  unsubscribeScene = workspaceScene.onChanged(onSceneChanged)
  resubscribeNodes()
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  unsubscribeScene?.()
  unsubscribeNodes.forEach((off) => off())
  unsubscribeNodes = []
  window.removeEventListener('pointermove', onNavigateMove)
  window.removeEventListener('pointerup', onNavigateUp)
  window.removeEventListener('pointermove', onPanelMove)
  window.removeEventListener('pointerup', onPanelUp)
})
</script>

<template>
  <div
    ref="rootEl"
    class="minimap"
    :class="{ 'minimap--ready': positioned, 'minimap--collapsed': collapsed }"
    :style="{ left: `${panelLeft}px`, top: `${panelTop}px` }"
  >
    <!-- 拖动条：唯一用来挪动面板的热区，右侧放折叠按钮 -->
    <div class="minimap__dragbar" title="拖动以移动小地图" @pointerdown="onDragbarDown">
      <span class="minimap__grip">⠿</span>
      <button
        class="minimap__toggle"
        type="button"
        :title="collapsed ? '展开小地图' : '折叠小地图'"
        @click.stop="toggleCollapse"
      >
        <svg
          class="minimap__toggle-icon"
          :class="{ 'minimap__toggle-icon--expand': collapsed }"
          viewBox="0 0 12 12"
          width="12"
          height="12"
        >
          <path d="M2 8 L6 4 L10 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>

    <svg
      v-show="!collapsed"
      ref="mapEl"
      :width="PANEL_W"
      :height="MAP_H"
      class="minimap__svg"
      @pointerdown="onNavigateDown"
    >
      <line
        v-for="(line, index) in layout?.lines ?? []"
        :key="`mini-edge-${index}`"
        class="minimap__edge"
        :x1="line.x1"
        :y1="line.y1"
        :x2="line.x2"
        :y2="line.y2"
      />
      <rect
        v-for="(rect, index) in layout?.nodeRects ?? []"
        :key="`mini-node-${index}`"
        class="minimap__node"
        :x="rect.x"
        :y="rect.y"
        :width="rect.width"
        :height="rect.height"
      />
      <rect
        v-if="layout"
        class="minimap__frame"
        :x="layout.frameRect.x"
        :y="layout.frameRect.y"
        :width="layout.frameRect.width"
        :height="layout.frameRect.height"
      />
    </svg>

    <div v-show="!collapsed" class="minimap__toolbar">
      <button class="minimap__btn" type="button" title="缩小" @click="zoomOut">−</button>
      <span class="minimap__percent">{{ zoomPercent }}%</span>
      <button class="minimap__btn" type="button" title="放大" @click="zoomIn">＋</button>
      <button class="minimap__reset" type="button" @click="reset">复位</button>
    </div>
  </div>
</template>

<style scoped lang="less">
.minimap {
  position: absolute;
  // 挂载量到初始落点前先藏起来，避免从左上角闪一下
  opacity: 0;
  width: 196px;
  border: 1px solid #d5d9e0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  user-select: none;

  &--ready {
    opacity: 1;
  }

  &--collapsed {
    .minimap__dragbar {
      border-bottom: none;
    }
  }

  &__dragbar {
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #f1f4f9;
    border-bottom: 1px solid #e2e6ed;
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  &__grip {
    color: @color-text-weak;
    font-size: 12px;
    line-height: 1;
    padding-left: 8px;
  }

  &__toggle {
    width: 22px;
    height: 22px;
    padding: 0;
    border: none;
    background: transparent;
    color: @color-text-weak;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    margin-right: 2px;

    &:hover {
      background: #e2e6ed;
      color: @color-text;
    }
  }

  &__toggle-icon {
    display: block;
    color: inherit;
    transition: transform 0.15s ease;

    &--expand {
      transform: rotate(180deg);
    }
  }

  &__svg {
    display: block;
    cursor: pointer;
  }

  &__edge {
    stroke: @color-edge;
    stroke-width: 1;
  }

  &__node {
    fill: rgba(64, 120, 220, 0.28);
    stroke: @color-primary;
    stroke-width: 1;
  }

  &__frame {
    fill: rgba(64, 120, 220, 0.08);
    stroke: @color-primary;
    stroke-width: 1.5;
  }

  &__toolbar {
    height: 32px;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 6px;
    border-top: 1px solid #e2e6ed;
  }

  &__btn {
    width: 26px;
    height: 26px;
    padding: 0;
    border: 1px solid #d5d9e0;
    border-radius: 6px;
    background: @color-surface;
    color: @color-text;
    font-size: 15px;
    line-height: 1;
    cursor: pointer;

    &:hover {
      background: #eef1f5;
    }
  }

  &__percent {
    min-width: 40px;
    text-align: center;
    font-variant-numeric: tabular-nums;
    color: @color-text-weak;
    font-size: 12px;
  }

  &__reset {
    margin-left: auto;
    height: 26px;
    padding: 0 8px;
    border: 1px solid #d5d9e0;
    border-radius: 6px;
    background: @color-surface;
    color: @color-text;
    font-size: 12px;
    cursor: pointer;

    &:hover {
      background: #eef1f5;
    }
  }
}
</style>
