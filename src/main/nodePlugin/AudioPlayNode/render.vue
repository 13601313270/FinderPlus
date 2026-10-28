<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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

// —— 播放器状态 ——
const audioEl = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const progressPct = computed(() => (duration.value ? (currentTime.value / duration.value) * 100 : 0))

// —— 进度条拖拽 ——
const isSeeking = ref(false)

// —— 文件与 blob URL ——
const sourceFile = ref<File | undefined>(undefined)
let blobUrl: string | null = null
const previewUrl = ref<string | null>(null)
/** 源文件刚变 → 等 loadedmetadata 后自动播一次（flag 方式避免 canplay 多次触发反复播） */
let shouldAutoPlay = false

let unsubscribe: (() => void) | undefined
const { startDrag } = useNodePosition(() => node.value)

/** 从 inputPort 取值刷进 sourceFile */
function refresh(): void {
  const n = node.value
  if (!n) {
    sourceFile.value = undefined
    return
  }
  const [first] = n.audioInput.value
  sourceFile.value = first && 'file' in first ? (first as { file?: File }).file : undefined
}

/** File 变时 → 重建 blob URL → 重置播放态 */
watch(sourceFile, (file) => {
  // 释放旧 blob URL
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl)
    blobUrl = null
  }
  previewUrl.value = null

  // 暂停当前播放（元素 src 会跟着变）
  if (audioEl.value) {
    audioEl.value.pause()
  }
  isPlaying.value = false
  currentTime.value = 0
  duration.value = 0
  shouldAutoPlay = !!file  // 有新源文件 → 等 loadedmetadata 自动播

  if (!file) return

  // 新 blob URL
  blobUrl = URL.createObjectURL(file)
  previewUrl.value = blobUrl
})

// —— 音频元素事件 ——
function onAudioLoaded(): void {
  if (!audioEl.value) return
  duration.value = audioEl.value.duration || 0
  // 源文件刚换过 → 自动播放一次（loadedmetadata 只在 src 切换时首次触发）
  if (shouldAutoPlay) {
    shouldAutoPlay = false
    void audioEl.value.play().catch(() => { /* autoplay 策略兜底：静默失败 */ })
  }
}
function onAudioTimeUpdate(): void {
  if (isSeeking.value || !audioEl.value) return
  currentTime.value = audioEl.value.currentTime
}
function onAudioPlay(): void { isPlaying.value = true }
function onAudioPause(): void { isPlaying.value = false }
function onAudioEnded(): void {
  isPlaying.value = false
  currentTime.value = 0
}

// —— 播放控制 ——
function togglePlay(): void {
  const el = audioEl.value
  if (!el || !previewUrl.value) return
  if (el.paused) {
    void el.play()
  } else {
    el.pause()
  }
}

// —— 进度条跳转 ——
function seekFromEvent(e: PointerEvent): void {
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
  const targetSec = ratio * duration.value
  if (audioEl.value && isFinite(targetSec)) {
    audioEl.value.currentTime = targetSec
    currentTime.value = targetSec
  }
}

function onSeekPointerDown(e: PointerEvent): void {
  if (!duration.value) return
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

onMounted(() => {
  const n = node.value
  if (!n) return
  unsubscribe = n.onChanged(() => refresh())
  refresh()
})

onBeforeUnmount(() => {
  unsubscribe?.()
  if (audioEl.value) {
    audioEl.value.pause()
    audioEl.value = null
  }
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl)
    blobUrl = null
  }
})
</script>

<template>
  <div class="ap-card" @pointerdown="startDrag">
    <NodeHeader :title="nodeTitle" />

    <div v-if="!sourceFile" class="ap-empty">
      <span class="ap-empty-icon">🔊</span>
      <span class="ap-empty-hint">等待音频输入...</span>
    </div>

    <div v-else class="ap-body">
      <div class="ap-filename" :title="sourceFile.name">{{ sourceFile.name }}</div>

      <div v-if="previewUrl" class="ap-player">
        <!-- 隐藏 audio 元素，只做播放引擎 -->
        <audio
          ref="audioEl"
          :src="previewUrl"
          preload="metadata"
          @loadedmetadata="onAudioLoaded"
          @timeupdate="onAudioTimeUpdate"
          @play="onAudioPlay"
          @pause="onAudioPause"
          @ended="onAudioEnded"
        />
        <button type="button" class="ap-play-btn" :aria-label="isPlaying ? 'Pause' : 'Play'" @click.stop="togglePlay">
          <svg v-if="!isPlaying" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
          </svg>
        </button>
        <div class="ap-times">
          <span class="ap-time">{{ formatTime(currentTime) }}</span>
          <span class="ap-time-sep">/</span>
          <span class="ap-time">{{ formatTime(duration) }}</span>
        </div>
      </div>
    </div>

    <!-- 底部进度条 -->
    <div
      v-if="previewUrl && duration"
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

  audio {
    display: none;
  }
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
