<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { viewport } from '@renderer/canvas/viewport'
import { ScheduleNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'

const props = defineProps<{ id: string }>()

const scheduleNode = shallowRef<ScheduleNode | undefined>(undefined)

const nodeTitle = useNodeTitle(() => scheduleNode.value, '?')

const { startDrag, box } = useNodePosition(() => scheduleNode.value)

/**
 * 时间表的本地编辑副本。
 * 用户改 input 时先改这里，失焦/回车/onInput 后立即 commit 回 node。
 * 和 DelayNode / BoolInputNode 的做法保持一致——节点是状态源，UI 是薄壳。
 */
const schedule = ref<string[]>([])
const enabled = ref(true)
const nextTime = ref<string | null>(null)
const running = ref(false)

/** 显示层每秒刷新一次"下次触发时间"（纯展示用，不影响节点定时器） */
let displayTimer: ReturnType<typeof setInterval> | undefined

let unsubscribe: (() => void) | undefined

function syncFromNode(node: ScheduleNode): void {
  schedule.value = [...node.displaySchedule]
  enabled.value = node.isEnabled
  nextTime.value = node.nextTriggerTime
  running.value = node.isRunning
}

function commitSchedule(): void {
  scheduleNode.value?.setSchedule(schedule.value)
}

function addRow(): void {
  schedule.value.push('09:00')
  commitSchedule()
}

function removeRow(index: number): void {
  schedule.value.splice(index, 1)
  commitSchedule()
}

function onTimeInput(index: number, e: Event): void {
  const el = e.target as HTMLInputElement
  schedule.value[index] = el.value
  commitSchedule()
}

function onToggleEnabled(): void {
  scheduleNode.value?.toggleEnabled()
}

function onTriggerNow(): void {
  scheduleNode.value?.triggerNow()
}

// —— 右下角 resize handle（抄 FolderNode 模式）——
let resizing = false
let startClientX = 0
let startClientY = 0
let startBox: [number, number] = [0, 0]

function startResize(e: PointerEvent): void {
  e.preventDefault()
  e.stopPropagation()
  resizing = true
  startClientX = e.clientX
  startClientY = e.clientY
  // box ref 来自 useNodePosition，实时跟随 node.onChanged
  startBox = [box.value[0], box.value[1]]
  window.addEventListener('pointermove', onResizeMove)
  window.addEventListener('pointerup', onResizeEnd)
}

function onResizeMove(e: PointerEvent): void {
  if (!resizing || !scheduleNode.value) return
  const scale = viewport.scale || 1
  const w = startBox[0] + (e.clientX - startClientX) / scale
  const h = startBox[1] + (e.clientY - startClientY) / scale
  scheduleNode.value.setBox(w, h)
}

function onResizeEnd(): void {
  resizing = false
  window.removeEventListener('pointermove', onResizeMove)
  window.removeEventListener('pointerup', onResizeEnd)
}

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof ScheduleNode) {
    scheduleNode.value = found
    syncFromNode(found)
    unsubscribe = found.onChanged(() => syncFromNode(found))
    // 无论新建还是恢复，都在这里启动定时器
    found.startTimer()
  }
  // 显示层独立定时器——纯刷新"下次触发"文案，不影响节点逻辑
  displayTimer = setInterval(() => {
    if (scheduleNode.value) {
      nextTime.value = scheduleNode.value.nextTriggerTime
    }
  }, 1000)
})

onUnmounted(() => {
  unsubscribe?.()
  if (displayTimer !== undefined) clearInterval(displayTimer)
  onResizeEnd()
})
</script>

<template>
  <div class="node" :class="{ 'node--disabled': !enabled }" @pointerdown="startDrag">
    <div class="node__header">
      <span class="node__handle">{{ nodeTitle }}</span>
      <span v-if="running && enabled" class="node__dot" title="定时器运行中"></span>
    </div>

    <div class="node__body">
      <!-- 启停开关 + 测试按钮 -->
      <div class="row row--switch">
        <label class="switch" @pointerdown.stop>
          <input type="checkbox" :checked="enabled" @change="onToggleEnabled" />
          <span class="switch__track">
            <span class="switch__thumb"></span>
          </span>
        </label>
        <button class="btn btn--mini" @pointerdown.stop @click="onTriggerNow">测试触发</button>
      </div>

      <!-- 下次触发提示 -->
      <div class="row row--next">
        <span class="row__label">下次</span>
        <span class="row__value">{{ nextTime ?? '—' }}</span>
      </div>

      <!-- 时间表列表 -->
      <div class="schedule-list" @pointerdown.stop>
        <div
          v-for="(time, idx) in schedule"
          :key="idx"
          class="schedule-item"
        >
          <input
            type="time"
            class="schedule-item__input"
            :value="time"
            @input="(e) => onTimeInput(idx, e)"
          />
          <button
            class="schedule-item__del"
            title="删除"
            @click="removeRow(idx)"
          >×</button>
        </div>

        <button
          class="schedule-add"
          @click="addRow"
          :disabled="!scheduleNode"
        >+ 添加时间点</button>
      </div>
    </div>

    <!-- 右下角 resize 手柄 -->
    <div class="node__resize" @pointerdown.stop="startResize" title="拖拽调整尺寸" />
  </div>
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  background: @color-surface;
  border: 1px solid @node-border-color;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  user-select: none;

  &--disabled {
    opacity: 0.55;
  }

  &__header {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px 0;
    border-bottom: 1px dashed @node-border-color;
    flex-shrink: 0;
  }

  &__handle {
    cursor: grab;
    font-size: 12px;
    color: @color-text-weak;

    &:active { cursor: grabbing; }
  }

  &__dot {
    position: absolute;
    right: 8px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #22c55e;
    animation: pulse 1.2s ease-in-out infinite;
  }

  &__body {
    flex-grow: 1;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
  }

  &__resize {
    position: absolute;
    right: 2px;
    bottom: 2px;
    width: 14px;
    height: 14px;
    cursor: nwse-resize;
    background: linear-gradient(135deg, transparent 50%, #4a7cff 50%);
    z-index: 2;
    flex-shrink: 0;
  }
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;

  &__label {
    font-size: 11px;
    color: @color-text-weak;
    flex-shrink: 0;
  }

  &__value {
    font-size: 11px;
    color: @color-primary;
    font-variant-numeric: tabular-nums;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  &--switch {
    justify-content: space-between;
  }
}

.switch {
  position: relative;
  width: 36px;
  height: 18px;
  cursor: pointer;

  input { display: none; }

  &__track {
    position: absolute;
    inset: 0;
    background: #d1d5db;
    border-radius: 9px;
    transition: background 0.15s ease;
  }

  &__thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    background: #fff;
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    transition: transform 0.15s ease;
  }

  input:checked ~ &__track {
    background: #22c55e;
  }

  input:checked ~ &__track .switch__thumb {
    transform: translateX(18px);
  }
}

.btn {
  border: 1px solid @node-border-color;
  background: transparent;
  color: @color-text;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  padding: 3px 8px;
  transition: background 0.1s;

  &:hover:not(:disabled) { background: rgba(0, 0, 0, 0.05); }

  &--mini {
    padding: 2px 6px;
    font-size: 10px;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.schedule-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-grow: 1;
  overflow-y: auto;
}

.schedule-item {
  display: flex;
  align-items: center;
  gap: 4px;

  &__input {
    flex-grow: 1;
    border: 1px solid @node-border-color;
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 12px;
    background: transparent;
    color: @color-text;
    font-variant-numeric: tabular-nums;

    &::-webkit-calendar-picker-indicator {
      opacity: 0.5;
      cursor: pointer;
    }

    &:focus {
      outline: none;
      border-color: @color-primary;
    }
  }

  &__del {
    width: 18px;
    height: 18px;
    border: none;
    background: transparent;
    color: @color-text-weak;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    border-radius: 4px;
    flex-shrink: 0;

    &:hover {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }
  }
}

.schedule-add {
  border: 1px dashed @node-border-color;
  background: transparent;
  border-radius: 4px;
  padding: 5px;
  font-size: 11px;
  color: @color-text-weak;
  cursor: pointer;
  transition: all 0.1s;
  margin-top: 2px;

  &:hover:not(:disabled) {
    border-color: @color-primary;
    color: @color-primary;
    background: rgba(0, 0, 0, 0.02);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
