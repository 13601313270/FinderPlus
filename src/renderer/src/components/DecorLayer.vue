<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { viewport } from '@renderer/canvas/viewport'
import {
  decorList,
  drawingMode,
  drawingPreview,
  decorChanged,
  type Decor,
  type RectDecor
} from '@renderer/canvas/decor'
import RectDecorDialog from './RectDecorDialog.vue'

const dialogRef = ref<InstanceType<typeof RectDecorDialog> | null>(null)
const editingDecor = ref<RectDecor | null>(null)

function decorStyle(d: Decor): Record<string, string> {
  if (d.type === 'rect') {
    return {
      left: `${d.x}px`,
      top: `${d.y}px`,
      width: `${d.width}px`,
      height: `${d.height}px`,
      background: d.fill || 'transparent',
      border: d.stroke ? `${d.strokeWidth}px solid ${d.stroke}` : 'none',
      borderRadius: `${d.radius}px`
    }
  }
  return {}
}

function onGearClick(e: MouseEvent, d: Decor): void {
  e.stopPropagation()
  if (d.type === 'rect') {
    editingDecor.value = d as RectDecor
    dialogRef.value?.open()
  }
}

function onDialogClose(): void {
  editingDecor.value = null
}

const previewStyle = computed<Record<string, string> | null>(() => {
  const p = drawingPreview.value
  if (!p) return null
  const x = Math.min(p.startX, p.endX)
  const y = Math.min(p.startY, p.endY)
  const w = Math.abs(p.endX - p.startX)
  const h = Math.abs(p.endY - p.startY)
  return {
    left: `${x}px`,
    top: `${y}px`,
    width: `${w}px`,
    height: `${h}px`
  }
})

// —— 拖动 handle 实现 ——
interface MoveState {
  decor: RectDecor
  startClientX: number
  startClientY: number
  startWorldX: number
  startWorldY: number
}
let moveState: MoveState | null = null

function onMoveHandleDown(e: PointerEvent, d: Decor): void {
  if (d.type !== 'rect') return
  e.stopPropagation()
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  const r = d as RectDecor
  moveState = {
    decor: r,
    startClientX: e.clientX,
    startClientY: e.clientY,
    startWorldX: r.x,
    startWorldY: r.y
  }
  window.addEventListener('pointermove', onMoveHandleMove)
  window.addEventListener('pointerup', onMoveHandleUp)
}

function onMoveHandleMove(e: PointerEvent): void {
  if (!moveState) return
  const dx = (e.clientX - moveState.startClientX) / viewport.scale
  const dy = (e.clientY - moveState.startClientY) / viewport.scale
  moveState.decor.x = moveState.startWorldX + dx
  moveState.decor.y = moveState.startWorldY + dy
}

function onMoveHandleUp(_e: PointerEvent): void {
  const decor = moveState?.decor
  moveState = null
  window.removeEventListener('pointermove', onMoveHandleMove)
  window.removeEventListener('pointerup', onMoveHandleUp)
  if (decor) decorChanged(decor)
}

// —— resize handle（左下 / 右下）——
type ResizeAnchor = 'br' | 'bl'
interface ResizeState {
  decor: RectDecor
  anchor: ResizeAnchor
  startClientX: number
  startClientY: number
  startX: number
  startY: number
  startW: number
  startH: number
}
let resizeState: ResizeState | null = null

function onResizeHandleDown(e: PointerEvent, d: Decor, anchor: ResizeAnchor): void {
  if (d.type !== 'rect') return
  e.stopPropagation()
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  const r = d as RectDecor
  resizeState = {
    decor: r,
    anchor,
    startClientX: e.clientX,
    startClientY: e.clientY,
    startX: r.x,
    startY: r.y,
    startW: r.width,
    startH: r.height
  }
  window.addEventListener('pointermove', onResizeHandleMove)
  window.addEventListener('pointerup', onResizeHandleUp)
}

function onResizeHandleMove(e: PointerEvent): void {
  if (!resizeState) return
  const dx = (e.clientX - resizeState.startClientX) / viewport.scale
  const dy = (e.clientY - resizeState.startClientY) / viewport.scale

  if (resizeState.anchor === 'br') {
    // 右下角：锚点左上不动，宽高直接随 delta 增
    resizeState.decor.width = Math.max(16, resizeState.startW + dx)
    resizeState.decor.height = Math.max(16, resizeState.startH + dy)
  } else {
    // 左下角：锚点右上不动，左边界右移 dx 使 width 减 dx，x 增 dx；height 同右下
    const newW = Math.max(16, resizeState.startW - dx)
    // x 要跟着 w 减：原右边界 = startX + startW，新 x = 右边界 - newW
    resizeState.decor.x = resizeState.startX + resizeState.startW - newW
    resizeState.decor.width = newW
    resizeState.decor.height = Math.max(16, resizeState.startH + dy)
  }
}

function onResizeHandleUp(_e: PointerEvent): void {
  const decor = resizeState?.decor
  resizeState = null
  window.removeEventListener('pointermove', onResizeHandleMove)
  window.removeEventListener('pointerup', onResizeHandleUp)
  if (decor) decorChanged(decor)
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onMoveHandleMove)
  window.removeEventListener('pointerup', onMoveHandleUp)
  window.removeEventListener('pointermove', onResizeHandleMove)
  window.removeEventListener('pointerup', onResizeHandleUp)
})
</script>

<template>
  <div class="decor-layer">
    <div
      v-for="d in decorList"
      :key="d.id"
      class="decor-item"
      :style="decorStyle(d)"
    >
      <!-- 左上角：拖动 handle + 标题 -->
      <div v-if="d.type === 'rect'" class="decor-item__header">
        <button
          class="decor-item__handle"
          type="button"
          title="拖动矩形"
          @pointerdown.stop="onMoveHandleDown($event, d)"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <circle cx="2" cy="2" r="0.9" fill="currentColor" />
            <circle cx="5" cy="2" r="0.9" fill="currentColor" />
            <circle cx="8" cy="2" r="0.9" fill="currentColor" />
            <circle cx="2" cy="5" r="0.9" fill="currentColor" />
            <circle cx="5" cy="5" r="0.9" fill="currentColor" />
            <circle cx="8" cy="5" r="0.9" fill="currentColor" />
            <circle cx="2" cy="8" r="0.9" fill="currentColor" />
            <circle cx="5" cy="8" r="0.9" fill="currentColor" />
            <circle cx="8" cy="8" r="0.9" fill="currentColor" />
          </svg>
        </button>
        <div
          v-if="d.title"
          class="decor-item__title"
          :style="{ color: d.titleColor }"
          :class="{ 'decor-item__title--has-bg': (d as RectDecor).fill }"
        >{{ d.title }}</div>
      </div>

      <!-- 右上角齿轮 -->
      <button
        v-if="d.type === 'rect'"
        class="decor-item__gear"
        type="button"
        title="矩形设置"
        @click.stop="onGearClick($event, d)"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <circle cx="6" cy="6" r="1.6" stroke="currentColor" stroke-width="1.2" />
          <path
            d="M6 1.2V2.6M6 9.4V10.8M1.2 6H2.6M9.4 6H10.8M2.3 2.3L3.3 3.3M8.7 8.7L9.7 9.7M9.7 2.3L8.7 3.3M3.3 8.7L2.3 9.7"
            stroke="currentColor"
            stroke-width="1.2"
            stroke-linecap="round"
          />
        </svg>
      </button>

      <!-- 右下角 resize handle -->
      <button
        v-if="d.type === 'rect'"
        class="decor-item__resize"
        type="button"
        title="调整尺寸"
        @pointerdown.stop="onResizeHandleDown($event, d, 'br')"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M9 1L1 9M9 5L5 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
        </svg>
      </button>

      <!-- 左下角 resize handle -->
      <button
        v-if="d.type === 'rect'"
        class="decor-item__resize decor-item__resize--bl"
        type="button"
        title="调整尺寸"
        @pointerdown.stop="onResizeHandleDown($event, d, 'bl')"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M1 1L9 9M1 5L5 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <div
      v-if="previewStyle && drawingMode"
      class="decor-preview"
      :style="previewStyle"
    />

    <RectDecorDialog
      ref="dialogRef"
      :decor="editingDecor"
      @close="onDialogClose"
    />
  </div>
</template>

<style scoped lang="less">
.decor-layer {
  position: absolute;
  left: 0;
  top: 0;
  // 整个装饰层默认事件穿透，handle 和 gear 显式覆盖
  pointer-events: none;
  user-select: none;
}

.decor-item {
  position: absolute;
  pointer-events: none;

  &__header {
    display: flex;
    align-items: center;
    gap: 4px;
    position: absolute;
    top: 4px;
    left: 4px;
    max-width: calc(100% - 32px); // 留右侧 gear 位置
  }

  &__handle {
    pointer-events: auto;
    z-index: 10; // 跳出 DecorLayer，盖过 EdgeLayer 和 NodeShell
    width: 22px;
    height: 22px;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(4px);
    color: #8b95a5;
    cursor: grab;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.45;
    transition: opacity 0.15s ease, background 0.12s ease, color 0.12s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    flex-shrink: 0;

    &:hover {
      background: #fff;
      color: @color-primary;
      opacity: 1;
    }

    &:active {
      cursor: grabbing;
    }
  }

  &__title {
    font-size: 12px;
    font-weight: 400;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    pointer-events: none;

    &--has-bg {
      font-weight: 500;
    }
  }

  &__gear {
    pointer-events: auto;
    z-index: 10; // 跳出 DecorLayer，盖过 EdgeLayer 和 NodeShell
    position: absolute;
    top: 4px;
    right: 4px;
    width: 22px;
    height: 22px;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(4px);
    color: #8b95a5;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.45;
    transition: opacity 0.15s ease, background 0.12s ease, color 0.12s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);

    &:hover {
      background: #fff;
      color: @color-primary;
      opacity: 1;
    }
  }

  &__resize {
    pointer-events: auto;
    z-index: 10; // 跳出 DecorLayer，盖过 EdgeLayer 和 NodeShell
    position: absolute;
    right: 0;
    bottom: 0;
    width: 14px;
    height: 14px;
    padding: 0;
    border: none;
    border-bottom-right-radius: 4px;
    background: transparent;
    color: #8b95a5;
    cursor: nwse-resize;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.5;
    transition: opacity 0.15s ease, color 0.12s ease;

    &:hover {
      color: @color-primary;
      opacity: 1;
    }

    &--bl {
      right: auto;
      left: 0;
      border-bottom-right-radius: 0;
      border-bottom-left-radius: 4px;
      cursor: nesw-resize;
    }
  }
}

.decor-preview {
  position: absolute;
  border: 1px dashed var(--theme-primary, #3b7cff);
  background: rgba(59, 124, 255, 0.08);
  border-radius: 2px;
  pointer-events: none;
}
</style>
