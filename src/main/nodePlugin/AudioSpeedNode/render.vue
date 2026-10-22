<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { AudioSpeedNode } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import { messages } from './i18n'

const nodeTitle = useNodeTitle(AudioSpeedNode.TYPE)
const t = useLocalizedMessages(messages)

const props = defineProps<{ id: string }>()

const node = shallowRef<AudioSpeedNode | undefined>(undefined)
const status = ref<'idle' | 'loading' | 'done' | 'error'>('idle')
const errorMessage = ref('')
const speed = ref(1)
const minSpeed = ref(0.5)
const maxSpeed = ref(3)
const hasInputAudio = ref(false)

let previewUrl: string | null = null
let lastPreviewHash = ''
const previewAudioUrl = ref<string | null>(null)
let unsubscribe: (() => void) | undefined

function formatSpeed(v: number): string {
  if (v === Math.round(v)) return `${v.toFixed(1)}x`
  return `${v}x`
}

function refresh(): void {
  const n = node.value
  if (!n) return
  status.value = n.displayStatus
  errorMessage.value = n.displayError
  speed.value = n.displaySpeed
  minSpeed.value = n.minSpeed
  maxSpeed.value = n.maxSpeed
  hasInputAudio.value = n.inputAudioFile !== null

  const f = n.previewFile
  const h = n.previewHash
  if (h !== lastPreviewHash) {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      previewUrl = null
    }
    if (f) {
      previewUrl = URL.createObjectURL(f)
      previewAudioUrl.value = previewUrl
      lastPreviewHash = h
    } else {
      previewAudioUrl.value = null
      lastPreviewHash = ''
    }
  }
}

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof AudioSpeedNode) {
    node.value = found
    unsubscribe = found.onChanged(() => refresh())
    refresh()
  }
})

onBeforeUnmount(() => {
  unsubscribe?.()
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl)
    previewUrl = null
  }
})

function onSliderInput(e: Event): void {
  const v = parseFloat((e.target as HTMLInputElement).value)
  speed.value = v
  node.value?.setSpeed(v)
}

function onRun(): void {
  void node.value?.run()
}
</script>

<template>
  <div class="as-card">
    <NodeHeader :title="nodeTitle" />

    <div v-if="!hasInputAudio" class="as-hint">{{ t('noAudioHint') }}</div>

    <!-- 速度滑块 -->
    <div class="as-speed">
      <div class="as-speed__header">
        <span class="as-speed__label">{{ t('speedLabel') }}</span>
        <span class="as-speed__value">{{ formatSpeed(speed) }}</span>
      </div>
      <input
        class="as-slider"
        type="range"
        :min="minSpeed"
        :max="maxSpeed"
        step="0.05"
        :value="speed"
        @input="onSliderInput"
      />
      <div class="as-slider__ticks">
        <span>0.5×</span>
        <span>1×</span>
        <span>2×</span>
        <span>3×</span>
      </div>
    </div>

    <!-- 调调提示 -->
    <div class="as-pitch-note">{{ t('pitchNotice') }}</div>

    <div style="flex-grow: 1;"></div>

    <button
      class="as-btn"
      type="button"
      :disabled="status === 'loading' || !hasInputAudio"
      @click="onRun"
    >
      {{ status === 'loading' ? t('loading') : t('runButton') }}
    </button>

    <div v-if="status === 'error' && errorMessage" class="as-error">
      {{ errorMessage }}
    </div>

    <div v-if="status === 'done' && previewAudioUrl" class="as-preview">
      <audio :src="previewAudioUrl" controls preload="metadata" />
    </div>
  </div>
</template>

<style scoped lang="less">
.as-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 8px 8px;
  height: 100%;
  box-sizing: border-box;
  overflow: auto;
}

.as-hint {
  font-size: 11px;
  color: #6b7280;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 4px;
  padding: 6px 8px;
}

.as-speed {
  display: flex;
  flex-direction: column;
  gap: 4px;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__label {
    font-size: 11px;
    color: #6b7280;
  }

  &__value {
    font-size: 14px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: #4f46e5;
  }
}

.as-slider {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: #e5e7eb;
  border-radius: 2px;
  outline: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    background: #4f46e5;
    border: 2px solid #fff;
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
    cursor: pointer;
    transition: transform 0.15s;

    &:hover { transform: scale(1.1); }
  }

  &::-moz-range-thumb {
    width: 14px;
    height: 14px;
    background: #4f46e5;
    border: 2px solid #fff;
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
    cursor: pointer;
  }

  &__ticks {
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: #9ca3af;
    padding: 0 2px;
  }
}

.as-pitch-note {
  font-size: 10px;
  color: #92400e;
  background: #fef3c7;
  border-radius: 4px;
  padding: 4px 6px;
  line-height: 1.4;
}

.as-btn {
  padding: 7px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  background: #4f46e5;
  color: #fff;
  transition: background 0.15s;

  &:hover:not(:disabled) { background: #4338ca; }
  &:disabled {
    background: #d1d5db;
    cursor: not-allowed;
  }
}

.as-error {
  font-size: 11px;
  color: #dc2626;
  background: #fef2f2;
  padding: 6px 8px;
  border-radius: 4px;
  line-height: 1.4;
}

.as-preview {
  display: flex;
  align-items: center;
  padding-top: 4px;
  border-top: 1px dashed #e5e7eb;

  audio {
    width: 100%;
    height: 32px;
  }
}
</style>
