<script setup lang="ts">
import { computed, ref, onUnmounted, type CSSProperties } from 'vue'
import { useNodePosition, type NodeLike } from '@renderer/composables/useNodePosition'
import { viewport, screenToWorld, getCanvasContainer } from '@renderer/canvas/viewport'

/**
 * 图片缩略图单元格：方形图（object-fit: cover）+ 文件名，可选中高亮。
 *
 * 展示是主体——图片地址由调用方给（src），不关心图片从哪来，便于在任意缩略图网格里复用。
 * 交互是**可选增强**，传了 node 才启用：
 * - 右键：根元素带 data-node-id，App 的 document 级 capture 监听据此就近命中并弹出该节点的菜单；
 * - 拖拽：复用 useNodePosition，pointermove 实时写回节点局部坐标；松手由 App 统一结算——
 *   若松手点越出所在容器（node.containerNode）边界，就把它释放回画布。
 *
 * containerWorld 是「本格子里节点局部坐标的原点对应的世界坐标」（即所在容器的 node.worldPosition）。
 * 按下时用它把节点局部坐标对齐到指针：App 的释放逻辑是「世界坐标 = 容器世界坐标 + 局部坐标」，
 * 对齐后拖出容器才会正好落在指针处。格子本身在网格里的位置与这个局部坐标无关，故需显式对齐。
 */
const props = defineProps<{
  /** 图片地址（objectURL / dataURL / 普通 URL 均可）；缺省时显示占位图 */
  src?: string
  /** 展示用文件名，同时作为 title 提示 */
  name: string
  /** 是否选中高亮 */
  selected?: boolean
  /** 关联节点 id：填上后右键即弹出该节点的菜单 */
  nodeId?: string
  /** 关联节点：填上后支持拖拽（含拖出容器回画布） */
  node?: NodeLike
  /** 局部坐标原点的世界坐标（所在容器的 worldPosition），拖拽对齐用 */
  containerWorld?: readonly [number, number]
}>()

const emit = defineEmits<{
  (e: 'select'): void
}>()

const { startDrag } = useNodePosition(() => props.node)

// —— 拖拽视觉：格子跟随指针平移。屏幕位移 ÷ 视口缩放 = 世界位移，与节点实际位移一致；
//    越出容器会被容器的 overflow 裁掉，表现和文件夹里拖动子节点一致。 ——
const dragDelta = ref<{ x: number; y: number } | null>(null)
let pressClientX = 0
let pressClientY = 0

function onDragMove(e: PointerEvent): void {
  dragDelta.value = { x: e.clientX - pressClientX, y: e.clientY - pressClientY }
}

function onDragEnd(): void {
  dragDelta.value = null
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
}

const dragStyle = computed<CSSProperties | undefined>(() => {
  const d = dragDelta.value
  if (!d) return undefined
  const scale = viewport.scale || 1
  return { transform: `translate(${d.x / scale}px, ${d.y / scale}px)`, zIndex: 20 }
})

function onPointerDown(e: PointerEvent): void {
  emit('select')

  const node = props.node
  const origin = props.containerWorld
  const canvas = getCanvasContainer()
  if (!node || !origin || !canvas) return

  const rect = canvas.getBoundingClientRect()
  const [wx, wy] = screenToWorld(e.clientX - rect.left, e.clientY - rect.top)
  node.setPosition(wx - origin[0], wy - origin[1])

  pressClientX = e.clientX
  pressClientY = e.clientY
  dragDelta.value = { x: 0, y: 0 }
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', onDragEnd)
  startDrag(e)
}

onUnmounted(onDragEnd)
</script>

<template>
  <div
    class="img-thumb-cell"
    :class="{
      'img-thumb-cell--selected': selected,
      'img-thumb-cell--dragging': !!dragDelta
    }"
    :data-node-id="nodeId"
    :style="dragStyle"
    :title="name"
    @pointerdown="onPointerDown"
  >
    <div class="img-thumb-cell__thumb">
      <img v-if="src" :src="src" alt="" draggable="false" />
      <svg v-else class="img-thumb-cell__placeholder" viewBox="0 0 24 24" fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="4" width="18" height="16" rx="2" stroke="#c5cbd4" stroke-width="1.5" />
        <circle cx="9" cy="10" r="1.6" fill="#c5cbd4" />
        <path d="M5 18l5-5 3 3 3-3 3 3" stroke="#c5cbd4" stroke-width="1.5" stroke-linecap="round"
          stroke-linejoin="round" />
      </svg>
    </div>
    <span class="img-thumb-cell__name">{{ name }}</span>
  </div>
</template>

<style scoped lang="less">
.img-thumb-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  padding: 3px;
  border: 1.5px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  user-select: none;

  &:hover {
    background: #f2f3f5;
  }

  &--selected {
    border-color: @color-primary;
    background: rgba(59, 124, 255, 0.08);
  }

  // 拖拽中：抬起感（阴影 + 微透明），并盖住同网格的其它格子
  &--dragging {
    cursor: grabbing;
    opacity: 0.85;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
  }

  &__thumb {
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: 6px;
    overflow: hidden;
    background: #f4f5f7;
    border: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      pointer-events: none;
      background: #fff;
    }
  }

  &__placeholder {
    width: 60%;
    height: 60%;
  }

  &__name {
    width: 100%;
    text-align: center;
    font-size: 10px;
    line-height: 1.2;
    color: @color-text;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>