<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { base64ToBlob } from '../../engine/data/base64'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { AudioFileNode } from './node'
import { inferAudioMime } from './mime'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useFileDragOut, setLastDragPaths } from '@renderer/composables/useFileDragOut'
import { useFileOpenInSystem } from '@renderer/composables/useFileOpenInSystem'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import { messages } from './i18n'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'

const props = defineProps<{ id: string }>()
const t = useLocalizedMessages(messages)

const fileNode = computed(() => {
  const node = workspaceScene.getNode(props.id)
  return node instanceof AudioFileNode ? node : undefined
})

const fileName = ref('')
const fileRevision = ref(0)
const fileSizeFormatted = ref('')
const fileFormat = ref('')

const audioEl = ref<HTMLAudioElement | null>(null)
let blobUrl: string | null = null
const previewUrl = ref<string | null>(null)
const nodeTitle = useNodeTitle(AudioFileNode.TYPE)

// —— 播放态 ——
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const progressPct = computed(() => {
  if (!duration.value) return 0
  return (currentTime.value / duration.value) * 100
})

// —— 进度条拖拽 ——
const isSeeking = ref(false)

let seqCounter = 0  // 防竞态：多次 watch 触发时，只保留最后一次读文件结果
let unsubscribe: (() => void) | undefined
let lastPlaySeq = 0  // MethodPort play 请求序号，用于 diff 触发从头播放

// —— 节点拖到空白位置（useNodePosition）+ OS native drag 拖出软件（useFileDragOut）——
const { dragOutOpts, cleanup: cleanupDragOut } = useFileDragOut(() => fileNode.value)
const { startDrag } = useNodePosition(() => fileNode.value, dragOutOpts)
const { openInSystem } = useFileOpenInSystem()

// —— 小图标 native drag（OS 级，立即触发）——
function onDragIconPointerDown(e: PointerEvent): void {
  const node = fileNode.value
  if (!node?.fileName) return
  e.stopPropagation()  // 阻止冒泡 → 卡片的 startDrag 不触发 → 节点不动
  e.preventDefault()   // 阻止 Chromium 默认 pointer 行为
  // @ts-ignore
  window.fileApi.startDrag(node.fileName).then((paths: any) => {
    setLastDragPaths(paths)
  }).catch(() => { /* 静默忽略 */ })
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec <= 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// —— 文件变化 → 读磁盘 → commit 端口 + 生成播放 blob URL ——
watch([fileName, fileRevision], async ([newName]) => {
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl)
    blobUrl = null
  }
  previewUrl.value = null
  if (!newName) return

  const mySeq = ++seqCounter
  const node = fileNode.value
  if (!node) return

  try {
    // @ts-ignore
    const b64 = await window.fileApi.readBinary(newName)
    if (mySeq !== seqCounter) return  // 过期结果，丢弃

    // 1. commit 端口（fileOutput + durationOutput）
    node.setContent(b64)

    // 2. 生成播放器用的 blob URL
    const mime = inferAudioMime(newName)
    blobUrl = URL.createObjectURL(base64ToBlob(b64, mime))
    previewUrl.value = blobUrl

    // 切文件重置播放态
    isPlaying.value = false
    currentTime.value = 0
    duration.value = 0
  } catch { /* 文件可能已被删，静默忽略 */ }
}, { immediate: true })

function refresh(): void {
  const n = fileNode.value
  if (!n) return
  fileName.value = n.fileName
  fileRevision.value = n.fileRevision
  fileSizeFormatted.value = n.fileSize ? formatSize(n.fileSize) : ''
  fileFormat.value = n.displayFormat

  // —— MethodPort play 触发：序号变了 → 从头播放 ——
  const curSeq = n.consumePlayRequestSeq()
  if (curSeq !== lastPlaySeq) {
    lastPlaySeq = curSeq
    const el = audioEl.value
    if (el && previewUrl.value) {
      el.currentTime = 0
      void el.play()
    }
  }
}

// —— 音频事件监听 ——
function onAudioLoaded(): void {
  if (!audioEl.value) return
  const d = audioEl.value.duration || 0
  duration.value = d
  // 把真实时长回写到 durationOutput 端口（覆盖 setContent 里的 null 占位）
  if (d > 0 && isFinite(d)) {
    const node = fileNode.value
    if (node) node.commitDuration(Number(d.toFixed(3)))
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

onMounted(() => {
  const n = fileNode.value
  if (!n) return
  unsubscribe = n.onChanged(() => refresh())
  refresh()
})

onBeforeUnmount(() => {
  cleanupDragOut()
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
  } catch (err) {
    console.warn('[AudioFileNode] pick file failed', err)
  }
}
</script>

<template>
  <div class="af-card" @pointerdown="startDrag" @dblclick="openInSystem(fileNode?.fileName)">
    <NodeHeader :title="nodeTitle" />

    <div v-if="!fileName" class="af-empty">
      <button type="button" class="af-select-btn" @click.stop="onSelectFile">
        {{ t('selectFile') }}
      </button>
    </div>

    <div v-else class="af-body">
      <div class="af-filename" :title="fileName">{{ fileName }}</div>

      <div v-if="previewUrl" class="af-player">
        <audio ref="audioEl" :src="previewUrl" preload="metadata" @loadedmetadata="onAudioLoaded"
          @timeupdate="onAudioTimeUpdate" @play="onAudioPlay" @pause="onAudioPause" @ended="onAudioEnded" />
        <button type="button" class="af-play-btn" :aria-label="isPlaying ? 'Pause' : 'Play'" @click.stop="togglePlay">
          <svg v-if="!isPlaying" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
          </svg>
        </button>
        <div>
          <span class="af-time">{{ formatTime(currentTime) }}</span>
          <span class="af-time-sep">/</span>
          <span class="af-time">{{ formatTime(duration) }}</span>
        </div>
      </div>

      <div v-else class="af-preview af-preview--placeholder">
        <span class="af-icon">🎵</span>
      </div>

      <div class="af-meta">
        <span v-if="fileFormat" class="af-tag">{{ fileFormat }}</span>
        <span v-if="fileSizeFormatted" class="af-size">{{ fileSizeFormatted }}</span>
      </div>
    </div>

    <!-- 底部进度条 -->
    <div v-if="previewUrl && duration" class="af-progress" :style="{ '--progress': progressPct + '%' }"
      @pointerdown.stop="onSeekPointerDown">
      <div class="af-progress-fill" />
    </div>

    <!-- OS native drag 拖出软件按钮（右下角） -->
    <button
      v-if="fileName"
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
// —— 扁平类名：直接匹配模板 class，不能嵌套 &-xxx 在 .af-card 下面 ——
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
  flex-grow: 1;

  // 隐藏 audio 元素，只做播放引擎
  audio {
    display: none;
  }
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

.af-preview {
  display: flex;
  align-items: center;

  &--placeholder {
    justify-content: center;
    height: 40px;
    background: #f3f4f6;
    border-radius: 6px;
  }
}

.af-icon {
  font-size: 22px;
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

// —— 底部进度条 ——
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

// —— OS native drag 按钮 ——
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
