<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { base64ToBlob } from '../../engine/data/base64'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { VideoFileNode } from './node'
import { inferVideoMime } from './mime'
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
  return node instanceof VideoFileNode ? node : undefined
})

const fileName = ref('')
const fileRevision = ref(0)
const fileSizeFormatted = ref('')
const fileFormat = ref('')

const videoEl = ref<HTMLVideoElement | null>(null)
let blobUrl: string | null = null
const previewUrl = ref<string | null>(null)
const nodeTitle = useNodeTitle(VideoFileNode.TYPE)

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
    const mime = inferVideoMime(newName)
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
    const el = videoEl.value
    if (el && previewUrl.value) {
      el.currentTime = 0
      void el.play()
    }
  }
}

// —— 视频事件监听 ——
function onVideoLoaded(): void {
  if (!videoEl.value) return
  const d = videoEl.value.duration || 0
  duration.value = d
  // 把真实时长回写到 durationOutput 端口
  if (d > 0 && isFinite(d)) {
    const node = fileNode.value
    if (node) node.commitDuration(Number(d.toFixed(3)))
  }
}
function onVideoTimeUpdate(): void {
  if (isSeeking.value || !videoEl.value) return
  currentTime.value = videoEl.value.currentTime
}
function onVideoPlay(): void { isPlaying.value = true }
function onVideoPause(): void { isPlaying.value = false }
function onVideoEnded(): void {
  isPlaying.value = false
  currentTime.value = 0
}

// —— 播放控制 ——
function togglePlay(): void {
  const el = videoEl.value
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
  if (videoEl.value && isFinite(targetSec)) {
    videoEl.value.currentTime = targetSec
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
  if (videoEl.value) {
    videoEl.value.pause()
    videoEl.value = null
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
        name: 'Video',
        extensions: ['mp4', 'mov', 'm4v', 'avi', 'mkv', 'flv', 'wmv', '3gp', 'ts', 'mts', 'm2ts', 'hevc']
      }]
    })
    if (!picked?.length) return
    const path = picked[0].path
    // @ts-ignore
    await window.fileApi.copyToCanvas(path)
  } catch (err) {
    console.warn('[VideoFileNode] pick file failed', err)
  }
}
</script>

<template>
  <div class="vf-card" @pointerdown="startDrag" @dblclick="openInSystem(fileNode?.fileName)">
    <NodeHeader :title="nodeTitle" />

    <div v-if="!fileName" class="vf-empty">
      <button type="button" class="vf-select-btn" @click.stop="onSelectFile">
        {{ t('selectFile') }}
      </button>
    </div>

    <div v-else class="vf-body">
      <div class="vf-filename" :title="fileName">{{ fileName }}</div>

      <div class="vf-stage" @click.stop="togglePlay">
        <!-- 视频画面：原生 controls 隐藏，自绘 play 按钮叠在上面 -->
        <video
          v-if="previewUrl"
          ref="videoEl"
          :src="previewUrl"
          preload="metadata"
          @loadedmetadata="onVideoLoaded"
          @timeupdate="onVideoTimeUpdate"
          @play="onVideoPlay"
          @pause="onVideoPause"
          @ended="onVideoEnded"
        />
        <div v-else class="vf-stage__placeholder">
          <span class="vf-icon">🎬</span>
        </div>

        <!-- 叠层：暂停时显示播放按钮 + 时间 -->
        <template v-if="previewUrl">
          <div v-if="!isPlaying" class="vf-overlay">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <div class="vf-time-badge" :class="{ 'vf-time-badge--playing': isPlaying }">
            {{ formatTime(currentTime) }}<span class="vf-time-sep">/</span>{{ formatTime(duration) }}
          </div>
        </template>
      </div>

      <div class="vf-meta">
        <span v-if="fileFormat" class="vf-tag">{{ fileFormat }}</span>
        <span v-if="fileSizeFormatted" class="vf-size">{{ fileSizeFormatted }}</span>
      </div>
    </div>

    <!-- 底部进度条 -->
    <div v-if="previewUrl && duration" class="vf-progress" :style="{ '--progress': progressPct + '%' }"
      @pointerdown.stop="onSeekPointerDown">
      <div class="vf-progress-fill" />
    </div>

    <!-- OS native drag 拖出软件按钮（右下角） -->
    <button
      v-if="fileName"
      class="vf-drag-icon"
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
.vf-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 8px 4px;
  height: 100%;
  box-sizing: border-box;
  position: relative;
}

.vf-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vf-select-btn {
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

.vf-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-height: 0;
  padding-bottom: 6px;
}

.vf-filename {
  font-size: 11px;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vf-stage {
  flex: 1;
  min-height: 80px;
  position: relative;
  background: #000;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;

  video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  &__placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f3f4f6;
  }
}

.vf-icon {
  font-size: 28px;
}

.vf-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.25);
  transition: background 0.15s;

  &:hover {
    background: rgba(0, 0, 0, 0.4);
  }
}

.vf-time-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  padding: 2px 6px;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
  border-radius: 3px;
  pointer-events: none;

  &--playing {
    background: rgba(34, 197, 94, 0.85);
  }
}

.vf-time-sep {
  opacity: 0.6;
  margin: 0 2px;
}

.vf-meta {
  display: flex;
  gap: 6px;
  align-items: center;
}

.vf-tag {
  font-size: 10px;
  padding: 1px 6px;
  background: #ede9fe;
  color: #6d28d9;
  border-radius: 3px;
  font-weight: 500;
}

.vf-size {
  font-size: 10px;
  color: #9ca3af;
}

// —— 底部进度条 ——
.vf-progress {
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

.vf-progress-fill {
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
.vf-drag-icon {
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
