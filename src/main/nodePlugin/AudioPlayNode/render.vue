<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { AudioPlayNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import NodeHeader from '@renderer/components/NodeHeader.vue'

const props = defineProps<{ id: string }>()

const nodeTitle = useNodeTitle(AudioPlayNode.TYPE)

const node = computed(() => {
  const n = workspaceScene.getNode(props.id)
  return n instanceof AudioPlayNode ? n : undefined
})

// —— UI 状态（从 node.subscribePlayer 同步过来，让 Vue 能响应）——
const state = reactive({
  fileName: undefined as string | undefined,
  isPlaying: false,
  currentTime: 0,
  duration: 0
})
const hasSource = computed(() => !!state.fileName)
const progressPct = computed(() => (state.duration ? (state.currentTime / state.duration) * 100 : 0))

// —— 进度条拖拽 ——
const isSeeking = ref(false)

let unsubscribeNode: (() => void) | undefined
let unsubscribePlayer: (() => void) | undefined
const { startDrag } = useNodePosition(() => node.value)

onMounted(() => {
  const n = node.value
  if (!n) return

  unsubscribeNode = n.onChanged(() => syncSnapshot())
  unsubscribePlayer = n.subscribePlayer(() => syncSnapshot())
  syncSnapshot()
})

/** 从 node 读最新快照进 reactive state，Vue 会自动刷新模板 */
function syncSnapshot(): void {
  const n = node.value
  if (!n) return
  const snap = n.snapshot()
  state.fileName = snap.fileName
  state.isPlaying = snap.isPlaying
  state.currentTime = snap.currentTime
  state.duration = snap.duration
}

onBeforeUnmount(() => {
  unsubscribeNode?.()
  unsubscribePlayer?.()
})

// —— 播放控制：转发给 node ——
function togglePlay(): void {
  node.value?.togglePlay()
}

// —— 进度条跳转 ——
function seekFromEvent(e: PointerEvent): void {
  if (!node.value || !state.duration) return
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
  const targetSec = ratio * state.duration
  if (isFinite(targetSec)) {
    node.value.seekTo(targetSec)
  }
}

function onSeekPointerDown(e: PointerEvent): void {
  if (!state.duration) return
  isSeeking.value = true
  seekFromEvent(e)
  const move = (ev: PointerEvent) => seekFromEvent(ev)
  const up = (ev: PointerEvent) => {
    seekFromEvent(ev)
    isSeeking.value = false
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec <= 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="ap-card" @pointerdown="startDrag">
    <NodeHeader :title="nodeTitle" />

    <div v-if="!hasSource" class="ap-empty">
      <span class="ap-empty-icon">🔊</span>
      <span class="ap-empty-hint">等待音频输入...</span>
    </div>

    <div v-else class="ap-body">
      <div class="ap-filename" :title="state.fileName">{{ state.fileName }}</div>

      <div class="ap-player">
        <button type="button" class="ap-play-btn" :aria-label="state.isPlaying ? 'Pause' : 'Play'" @click.stop="togglePlay">
          <svg v-if="!state.isPlaying" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
          </svg>
        </button>
        <div class="ap-times">
          <span class="ap-time">{{ formatTime(state.currentTime) }}</span>
          <span class="ap-time-sep">/</span>
          <span class="ap-time">{{ formatTime(state.duration) }}</span>
        </div>
      </div>
    </div>

    <!-- 底部进度条 -->
    <div
      v-if="hasSource && state.duration"
      class="ap-progress"
      :style="{ '--progress': progressPct + '%' }"
      @pointerdown.stop="onSeekPointerDown"
    >
      <div class="ap-progress-fill" />
    </div>
  </div>
</template>

<style scoped lang="less">
.ap-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 8px 4px;
  height: 100%;
  box-sizing: border-box;
  position: relative;
}

.ap-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.ap-empty-icon {
  font-size: 28px;
  opacity: 0.5;
}

.ap-empty-hint {
  font-size: 11px;
  color: #9ca3af;
  font-style: italic;
}

.ap-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-height: 0;
  padding-bottom: 2px;
}

.ap-filename {
  font-size: 10px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

.ap-player {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
  gap: 8px;
}

.ap-play-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: #4f46e5;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s;

  &:hover {
    background: #4338ca;
  }

  svg {
    display: block;
  }
}

.ap-times {
  display: flex;
  align-items: center;
  gap: 2px;
}

.ap-time {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: #6b7280;
}

.ap-time-sep {
  font-size: 11px;
  color: #9ca3af;
}

.ap-progress {
  flex-shrink: 0;
  height: 3px;
  background: #e5e7eb;
  border-radius: 2px;
  cursor: pointer;
  position: relative;
  overflow: hidden;

  &:active {
    height: 5px;
  }
}

.ap-progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: var(--progress, 0%);
  background: #22c55e;
  border-radius: 2px;
  transition: width 0.05s linear;
}
</style>
