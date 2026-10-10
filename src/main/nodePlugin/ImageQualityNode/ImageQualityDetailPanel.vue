<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { ImageQualityNode, type ImageQualityFormat } from './node'

/**
 * 图片质量节点的详情面板中间栏：
 * - 顶部：质量滑杆 + 导出格式下拉（编辑参数，与卡片上的控件共用同一套 setQuality / setFormat）
 * - 中间：放大展示压缩后的输出图片
 * - 底部：文件名 + 体积信息
 */
const props = defineProps<{ nodeId: string }>()

const node = computed(() => {
  const n = workspaceScene.getNode(props.nodeId)
  return n instanceof ImageQualityNode ? n : undefined
})

// —— 参数本地镜像：拖动滑杆时只改本地，松手才写回节点触发重压 ——
const sliderQuality = ref(80)
const exportFormat = ref<ImageQualityFormat>('jpeg')

// —— 预览图 ——
const previewUrl = ref<string | null>(null)
const fileName = ref('')
const fileSize = ref(0)

let revokeUrl: (() => void) | null = null
let offChanged: (() => void) | undefined

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function clearPreview(): void {
  if (revokeUrl) {
    revokeUrl()
    revokeUrl = null
  }
  previewUrl.value = null
  fileName.value = ''
  fileSize.value = 0
}

/** 从节点同步参数 + 刷预览图 */
function sync(n: ImageQualityNode | undefined): void {
  if (!n) return
  sliderQuality.value = n.qualityValue
  exportFormat.value = n.exportFormat
  refreshPreview(n)
}

function refreshPreview(n: ImageQualityNode): void {
  clearPreview()
  const value = n.imageOutput.value
  if (value instanceof ImgFileValue && value.file) {
    const url = URL.createObjectURL(value.file)
    previewUrl.value = url
    revokeUrl = () => URL.revokeObjectURL(url)
    fileName.value = value.file.name
    fileSize.value = value.file.size
  }
}

// —— 事件处理 ——
function onSliderInput(e: Event): void {
  sliderQuality.value = Number((e.target as HTMLInputElement).value)
}
function onSliderChange(e: Event): void {
  node.value?.setQuality(Number((e.target as HTMLInputElement).value))
}
function onFormatChange(e: Event): void {
  const v = (e.target as HTMLSelectElement).value
  if (v === 'jpeg' || v === 'png') node.value?.setFormat(v)
}

onMounted(() => {
  const n = node.value
  if (!n) return
  sync(n)
  offChanged = n.onChanged(() => {
    if (node.value) sync(node.value)
  })
})

onUnmounted(() => {
  offChanged?.()
  clearPreview()
})

watch(
  () => props.nodeId,
  () => {
    const n = node.value
    if (n) sync(n)
  }
)
</script>

<template>
  <div class="detail-panel">
    <!-- 参数控制区：质量滑杆 + 格式下拉 -->
    <div class="detail-panel__controls">
      <div class="detail-panel__control-row">
        <label class="detail-panel__label">质量</label>
        <div class="detail-panel__quality-wrap">
          <input
            class="detail-panel__slider"
            type="range"
            min="1"
            max="100"
            step="1"
            :value="sliderQuality"
            @input="onSliderInput"
            @change="onSliderChange"
          />
          <span class="detail-panel__quality-val">{{ sliderQuality }}</span>
        </div>
      </div>

      <div class="detail-panel__control-row">
        <label class="detail-panel__label">格式</label>
        <select class="detail-panel__select" :value="exportFormat" @change="onFormatChange">
          <option value="jpeg">JPEG</option>
          <option value="png">PNG</option>
        </select>
      </div>
    </div>

    <!-- 图片预览区：占满中间栏剩余空间 -->
    <div class="detail-panel__image-wrap">
      <img
        v-if="previewUrl"
        class="detail-panel__img"
        :src="previewUrl"
        :alt="fileName"
        draggable="false"
      />
      <div v-else class="detail-panel__placeholder">
        <span class="detail-panel__placeholder-text">暂无输出图片</span>
      </div>
    </div>

    <!-- 底部文件名 + 体积信息 -->
    <div v-if="previewUrl" class="detail-panel__meta">
      <span class="detail-panel__file-name" :title="fileName">{{ fileName }}</span>
      <span class="detail-panel__file-size">{{ formatSize(fileSize) }}</span>
    </div>
  </div>
</template>

<style scoped lang="less">
.detail-panel {
  box-sizing: border-box;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 12px;

  &__controls {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px 12px;
    background: #fafbfc;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
  }

  &__control-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__label {
    flex-shrink: 0;
    width: 48px;
    font-size: 12px;
    font-weight: 600;
    color: #374151;
  }

  &__quality-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__slider {
    flex: 1;
    height: 14px;
    cursor: pointer;
    accent-color: #4a7cff;
  }

  &__quality-val {
    flex-shrink: 0;
    min-width: 28px;
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    color: #4a7cff;
  }

  &__select {
    padding: 6px 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
    color: #1f2937;
    background: #fff;
    cursor: pointer;
    outline: none;
    transition: border-color 0.15s;

    &:hover { border-color: #9ca3af; }
    &:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12); }
  }

  &__image-wrap {
    flex: 1;
    min-height: 0;
    background: #f4f5f7;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  &__img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    background: #fff;
    display: block;
    pointer-events: none;
  }

  &__placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  &__placeholder-text {
    font-size: 13px;
    color: #9aa1ad;
    font-style: italic;
  }

  &__meta {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    background: #fafbfc;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    font-size: 12px;
  }

  &__file-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: #374151;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  &__file-size {
    flex-shrink: 0;
    color: #6b7280;
    margin-left: 12px;
  }
}
</style>
