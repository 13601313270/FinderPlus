<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { AudioFileNode } from './node'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useFileDragOut, setLastDragPaths } from '@renderer/composables/useFileDragOut'
import { useFileOpenInSystem } from '@renderer/composables/useFileOpenInSystem'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import { messages } from './i18n'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'

const props = defineProps<{ id: string }>()
const t = useLocalizedMessages(messages)

const node = computed(() => {
  const n = workspaceScene.getNode(props.id)
  return n instanceof AudioFileNode ? n : undefined
})

const nodeTitle = useNodeTitle(AudioFileNode.TYPE)

// —— UI 状态（从 node 同步过来，让 Vue 能响应）——
const state = reactive({
  fileName: undefined as string | undefined,
  fileSize: undefined as number | undefined,
  displayFormat: '',
  isPlaying: false,
  currentTime: 0,
  duration: 0
})

const hasFile = computed(() => !!state.fileName)
const progressPct = computed(() => {
  if (!state.duration) return 0
  return (state.currentTime / state.duration) * 100
})

// —— 进度条拖拽 ——
const isSeeking = ref(false)

let unsubscribeNode: (() => void) | undefined
let unsubscribePlayer: (() => void) | undefined

// —— 节点拖到空白位置 + OS native drag 拖出软件 ——
const { dragOutOpts, cleanup: cleanupDragOut } = useFileDragOut(() => node.value)
const { startDrag } = useNodePosition(() => node.value, dragOutOpts)
const { openInSystem } = useFileOpenInSystem()

// —— 小图标 native drag（OS 级，立即触发）——
function onDragIconPointerDown(e: PointerEvent): void {
  const n = node.value
  if (!n?.fileName) return
  e.stopPropagation()
  e.preventDefault()
  // @ts-ignore
  window.fileApi.startDrag(n.fileName).then((paths: any) => {
    setLastDragPaths(paths)
  }).catch(() => { /* 静默忽略 */ })
}

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec <= 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

onMounted(() => {
  const n = node.value
  if (!n) return
  unsubscribeNode = n.onChanged(() => syncSnapshot())
  unsubscribePlayer = n.subscribePlayer(() => syncSnapshot())
  syncSnapshot()
})

function syncSnapshot(): void {
  const n = node.value
  if (!n) return
  const snap = n.snapshot()
  state.fileName = snap.fileName
  state.fileSize = snap.fileSize
  state.displayFormat = snap.displayFormat
  state.isPlaying = snap.isPlaying
  state.currentTime = snap.currentTime
  state.duration = snap.duration
}

onBeforeUnmount(() => {
  cleanupDragOut()
  unsubscribeNode?.()
  unsubscribePlayer?.()
})

// —— 播放控制 ——
function togglePlay(): void {
  node.value?.togglePlay()
}

// —— 进度条跳转 ——
function seekFromEvent(e: PointerEvent): void {
  const n = node.value
  if (!n || !state.duration) return
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
  const targetSec = ratio * state.duration
  if (isFinite(targetSec)) {
    n.seekTo(targetSec)
  }
}

function onSeekPointerDown(e: PointerEvent): void {
  if (!state.duration) return
  isSeeking.value = true
  seekFromEvent(e)
  const move = (ev: PointerEvent) => seekFromEvent(ev)
  const up = () => {
    isSeeking.value = false
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

async function onSelectFile(): Promise<void> {
  try {
    // @ts-ignore
    const picked = await window.fileApi.pickFile({
      multiple: false,
      filters: [{
        name: 'Audio',
        extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'webm', 'opus']
      }]
    })
    if (!picked?.length) return
    const path = picked[0].path
    // @ts-ignore
    await window.fileApi.copyToCanvas(path)
  } catch { /* 静默忽略 */ }
}
</script>

<template>
  <div class="af-card" @pointerdown="startDrag" @dblclick="openInSystem(node?.fileName)">
    <NodeHeader :title="nodeTitle" />

    <div v-if="!hasFile" class="af-empty">
      <button type="button" class="af-select-btn" @click.stop="onSelectFile">
        {{ t('selectFile') }}
      </button>
    </div>

    <div v-else class="af-body">
      <div class="af-filename" :title="state.fileName">{{ state.fileName }}</div>

      <div class="af-player">
        <button type="button" class="af-play-btn" :aria-label="state.isPlaying ? 'Pause' : 'Play'" @click.stop="togglePlay">
          <svg v-if="!state.isPlaying" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
          </svg>
        </button>
        <div>
          <span class="af-time">{{ formatTime(state.currentTime) }}</span>
          <span class="af-time-sep">/</span>
          <span class="af-time">{{ formatTime(state.duration) }}</span>
        </div>
      </div>

      <div class="af-meta">
        <span v-if="state.displayFormat" class="af-tag">{{ state.displayFormat }}</span>
        <span v-if="state.fileSize" class="af-size">{{ formatFileSize(state.fileSize) }}</span>
      </div>
    </div>

    <!-- 底部进度条 -->
    <div v-if="state.duration" class="af-progress" :style="{ '--progress': progressPct + '%' }"
      @pointerdown.stop="onSeekPointerDown">
      <div class="af-progress-fill" />
    </div>

    <!-- OS native drag 拖出软件按钮（右下角） -->
    <button
      v-if="hasFile"
      class="af-drag-icon"
      type="button"
      title="拖拽到桌面导出"
      @pointerdown.stop.prevent="onDragIconPointerDown"
      @click.stop
    >
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
        <path d="M3 3h6l4 4v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.2" />
        <path d="M9 3v4h4" stroke="currentColor" stroke-width="1.2" />
      </svg>
    </button>
  </div>
</template>

<style scoped lang="less">
.af-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 8px 4px;
  height: 100%;
  box-sizing: border-box;
  position: relative;
}

.af-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.af-select-btn {
  padding: 6px 14px;
  border: 1px dashed #c7d2fe;
  border-radius: 6px;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 12px;
  cursor: pointer;

  &:hover {
    background: #e0e7ff;
  }
}

.af-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-height: 0;
  padding-bottom: 6px;
}

.af-filename {
  font-size: 11px;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.af-player {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.af-play-btn {
  width: 36px;
  height: 36px;
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

.af-time {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: #6b7280;
}

.af-time-sep {
  font-size: 11px;
  color: #9ca3af;
}

.af-meta {
  display: flex;
  gap: 6px;
  align-items: center;
}

.af-tag {
  font-size: 10px;
  padding: 1px 6px;
  background: #ede9fe;
  color: #6d28d9;
  border-radius: 3px;
  font-weight: 500;
}

.af-size {
  font-size: 10px;
  color: #9ca3af;
}

.af-progress {
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

.af-progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: var(--progress, 0%);
  background: #22c55e;
  border-radius: 2px;
  transition: width 0.05s linear;
}

.af-drag-icon {
  position: absolute;
  right: 6px;
  bottom: 4px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(79, 70, 229, 0.08);
  color: #6d28d9;
  border: none;
  border-radius: 4px;
  cursor: grab;
  padding: 0;

  &:hover {
    background: rgba(79, 70, 229, 0.18);
  }
}
</style>
