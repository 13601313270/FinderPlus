<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { RecorderNode } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import { messages } from './i18n'

const nodeTitle = useNodeTitle(RecorderNode.TYPE)
const t = useLocalizedMessages(messages)

const props = defineProps<{ id: string }>()

const node = shallowRef<RecorderNode | undefined>(undefined)
const status = ref<'idle' | 'recording' | 'done' | 'error'>('idle')
const errorMessage = ref('')
const recordingSeconds = ref(0)

// —— MediaRecorder 运行时 ——
let mediaRecorder: MediaRecorder | null = null
let stream: MediaStream | null = null
const chunks: Blob[] = []
let startTs = 0
let tickTimer: number | null = null

let previewUrl: string | null = null
const previewAudioUrl = ref<string | null>(null)
const audioEl = ref<HTMLAudioElement | null>(null)
let unsubscribe: (() => void) | undefined

const formattedTime = computed(() => formatTime(recordingSeconds.value))

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function refresh(): void {
  const n = node.value
  if (!n) return
  status.value = n.displayStatus
  errorMessage.value = n.displayError
  recordingSeconds.value = n.displayRecordingSeconds
  // 预览音频
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl)
    previewUrl = null
  }
  const f = n.previewFile
  if (f) {
    previewUrl = URL.createObjectURL(f)
    previewAudioUrl.value = previewUrl
  } else {
    previewAudioUrl.value = null
  }
}

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof RecorderNode) {
    node.value = found
    unsubscribe = found.onChanged(() => refresh())
    refresh()
  }
})

onBeforeUnmount(() => {
  cleanup()
  unsubscribe?.()
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl)
    previewUrl = null
  }
})

function cleanup(): void {
  if (tickTimer !== null) {
    clearInterval(tickTimer)
    tickTimer = null
  }
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try { mediaRecorder.stop() } catch { /* ignore */ }
  }
  mediaRecorder = null
  if (stream) {
    stream.getTracks().forEach(tr => tr.stop())
    stream = null
  }
  chunks.length = 0
}

async function onStart(): Promise<void> {
  const n = node.value
  if (!n) return

  // 浏览器 API 可用性检查
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    n.setError(t('unsupported'))
    return
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    chunks.length = 0
    startTs = Date.now()

    // 挑浏览器支持的 mime：优先 webm，不然让浏览器自己选
    const mimeType = pickSupportedMime()
    mediaRecorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream)

    mediaRecorder.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) chunks.push(e.data)
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: mediaRecorder?.mimeType || 'audio/webm' })
      const dur = (Date.now() - startTs) / 1000
      void n.commitRecording(blob, dur)
      cleanup()
    }

    mediaRecorder.onerror = () => {
      n.setError(t('recordError'))
      cleanup()
    }

    mediaRecorder.start(100) // 每 100ms 一个 slice，避免大 Blob
    n.setRecording()

    tickTimer = window.setInterval(() => {
      recordingSeconds.value = (Date.now() - startTs) / 1000
    }, 200)
  } catch (err) {
    const msg = (err as Error)?.message || String(err)
    n.setError(t('micPermissionDenied') + (msg ? ` (${msg})` : ''))
    cleanup()
  }
}

function onStop(): void {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop() // onstop 回调里会 commit
  }
}

function onClear(): void {
  node.value?.clearResult()
}

function pickSupportedMime(): string | undefined {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg'
  ]
  for (const m of candidates) {
    if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(m)) {
      return m
    }
  }
  return undefined
}

function onAudioLoaded(): void {
  if (!audioEl.value) return
  const d = audioEl.value.duration || 0
  if (d > 0 && isFinite(d)) {
    node.value?.['commitDuration']?.(Number(d.toFixed(3)))
  }
}
</script>

<template>
  <div class="rec-card">
    <NodeHeader :title="nodeTitle" />

    <!-- 错误提示 -->
    <div v-if="status === 'error' && errorMessage" class="rec-error">
      {{ errorMessage }}
    </div>

    <!-- 状态 + 计时 -->
    <div class="rec-status">
      <span v-if="status === 'recording'" class="rec-dot rec-dot--live" />
      <span v-else-if="status === 'done'" class="rec-dot rec-dot--done" />
      <span v-else class="rec-dot rec-dot--idle" />
      <span class="rec-time">{{ formattedTime }}</span>
    </div>

    <!-- 预览 -->
    <div v-if="status === 'done' && previewAudioUrl" class="rec-preview">
      <audio
        ref="audioEl"
        :src="previewAudioUrl"
        controls
        preload="metadata"
        @loadedmetadata="onAudioLoaded"
      />
    </div>
    <div style="flex-grow: 1;"></div>
    <!-- 按钮组 -->
    <div class="rec-actions">
      <button
        v-if="status !== 'recording'"
        class="rec-btn rec-btn--start"
        type="button"
        @click="onStart"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="4" />
        </svg>
        {{ t('startButton') }}
      </button>
      <button
        v-else
        class="rec-btn rec-btn--stop"
        type="button"
        @click="onStop"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="1" />
        </svg>
        {{ t('stopButton') }}
      </button>

      <button
        v-if="status === 'done'"
        class="rec-btn rec-btn--clear"
        type="button"
        @click="onClear"
      >{{ t('clearButton') }}</button>
    </div>
  </div>
</template>

<style scoped lang="less">
.rec-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 8px 8px;
  height: 100%;
  box-sizing: border-box;
  overflow: auto;
}

.rec-error {
  font-size: 11px;
  color: #dc2626;
  background: #fef2f2;
  padding: 6px 8px;
  border-radius: 4px;
  line-height: 1.4;
}

.rec-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: #f9fafb;
  border-radius: 6px;
  font-size: 18px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #374151;
}

.rec-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;

  &--idle { background: #d1d5db; }
  &--done { background: #22c55e; }
  &--live {
    background: #ef4444;
    animation: rec-pulse 1s ease-in-out infinite;
  }
}

.rec-time {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.rec-actions {
  display: flex;
  gap: 6px;
}

.rec-btn {
  flex: 1;
  padding: 7px 10px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: background 0.15s;

  &--start {
    background: #ef4444;
    color: #fff;

    &:hover { background: #dc2626; }
  }

  &--stop {
    background: #4f46e5;
    color: #fff;

    &:hover { background: #4338ca; }
  }

  &--clear {
    flex: 0 0 auto;
    padding: 7px 10px;
    background: #f3f4f6;
    color: #6b7280;

    &:hover { background: #e5e7eb; }
  }
}

.rec-preview {
  display: flex;
  align-items: center;
  padding-top: 4px;
  border-top: 1px dashed #e5e7eb;

  audio {
    width: 100%;
    height: 32px;
  }
}

@keyframes rec-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
</style>
