<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { ImageToPdfNode, PAGE_SIZE_PRESETS, type PageSizePreset, type FitMode } from './node'
import { generatePdfFromNode } from './generatePdf'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'

/**
 * 图片转 PDF 节点的详情面板中间栏：
 * - 页面尺寸预设下拉
 * - 边距数值输入
 * - 已连接图片数量展示
 * - 生成 PDF 按钮（与卡片上的按钮共用 generatePdfFromNode 逻辑）
 */
const props = defineProps<{ nodeId: string }>()

const t = useLocalizedMessages(messages)

const pdfNode = computed(() => {
  const node = workspaceScene.getNode(props.nodeId)
  return node instanceof ImageToPdfNode ? node : undefined
})

const pageSize = ref<PageSizePreset>('A4')
const margin = ref(0)
const fitMode = ref<FitMode>('contain')
const connectedCount = ref(0)
const totalPorts = ref(1)
const isGenerating = ref(false)
const autoRun = ref(false)

const pageSizeOptions = Object.keys(PAGE_SIZE_PRESETS) as PageSizePreset[]
const fitOptions: { value: FitMode; label: string }[] = [
  { value: 'contain', label: 'Contain' },
  { value: 'fill',    label: 'Fill' },
  { value: 'cover',   label: 'Cover' }
]

let offChanged: (() => void) | undefined

onMounted(() => {
  const n = pdfNode.value
  if (!n) return
  sync(n)
  offChanged = n.onChanged(() => {
    if (pdfNode.value) sync(pdfNode.value)
  })
})

onUnmounted(() => {
  offChanged?.()
})

function sync(n: ImageToPdfNode): void {
  pageSize.value = n.pdfPageSize
  margin.value = n.pdfMargin
  fitMode.value = n.pdfFitMode
  connectedCount.value = n.totalImageCount
  totalPorts.value = n.inputPorts.length
  autoRun.value = n.displayAutoRun
}

watch(() => props.nodeId, () => {
  const n = pdfNode.value
  if (n) sync(n)
})

function onPageSizeChange(val: PageSizePreset): void {
  pdfNode.value?.setPdfPageSize(val)
}

function onMarginChange(val: number | string): void {
  const num = typeof val === 'string' ? parseInt(val, 10) : val
  if (!Number.isFinite(num)) return
  pdfNode.value?.setPdfMargin(num)
}

function onFitChange(val: FitMode): void {
  pdfNode.value?.setPdfFitMode(val)
}

function onAddPort(): void {
  pdfNode.value?.addImage()
}

function onRemovePort(): void {
  const n = pdfNode.value
  if (!n || n.inputPorts.length <= 1) return
  const last = n.inputPorts[n.inputPorts.length - 1]
  if (last) n.removeImagePort(last.id)
}

function onAutoRunToggle(e: Event): void {
  pdfNode.value?.setAutoRun((e.target as HTMLInputElement).checked)
}

/** 详情面板里的生成按钮——和卡片上的按钮调同一个共享函数 */
async function onGenerate(): Promise<void> {
  const n = pdfNode.value
  if (!n || isGenerating.value) return
  isGenerating.value = true
  try {
    await generatePdfFromNode(n)
  } catch (err) {
    console.error('[ImageToPdfNode] PDF 生成失败：', err)
  } finally {
    isGenerating.value = false
  }
}
</script>

<template>
  <div class="detail-panel">
    <!-- 端口管理 -->
    <div class="detail-panel__section">
      <label class="detail-panel__label">{{ t('portsLabel') }}</label>
      <div class="detail-panel__port-controls">
        <span class="detail-panel__port-count">{{ t('imagesConnected', { connected: connectedCount, total: totalPorts }) }}</span>
        <div class="detail-panel__port-btns">
          <button
            class="detail-panel__btn detail-panel__btn--icon"
            type="button"
            :disabled="totalPorts <= 1"
            :title="t('removePort')"
            @click="onRemovePort"
          >−</button>
          <button
            class="detail-panel__btn detail-panel__btn--icon"
            type="button"
            :title="t('addPort')"
            @click="onAddPort"
          >＋</button>
        </div>
      </div>
      <div class="detail-panel__hint">{{ t('portsHint') }}</div>
    </div>

    <!-- 页面尺寸 -->
    <div class="detail-panel__section">
      <label class="detail-panel__label">{{ t('pageSizeLabel') }}</label>
      <select
        class="detail-panel__select"
        :value="pageSize"
        @change="onPageSizeChange(($event.target as HTMLSelectElement).value as PageSizePreset)"
      >
        <option v-for="s in pageSizeOptions" :key="s" :value="s">{{ s }}</option>
      </select>
      <div class="detail-panel__hint">{{ Math.round(pdfNode?.pdfPageWidth ?? 0) }} × {{ Math.round(pdfNode?.pdfPageHeight ?? 0) }} pt</div>
    </div>

    <!-- 页边距 -->
    <div class="detail-panel__section">
      <label class="detail-panel__label">{{ t('marginLabel') }}</label>
      <input
        class="detail-panel__input"
        type="number"
        min="0"
        max="100"
        step="1"
        :value="margin"
        @change="onMarginChange(($event.target as HTMLInputElement).value)"
      />
      <div class="detail-panel__hint">{{ t('marginHint') }}</div>
    </div>

    <!-- 适配模式 -->
    <div class="detail-panel__section">
      <label class="detail-panel__label">{{ t('fitModeLabel') }}</label>
      <select
        class="detail-panel__select"
        :value="fitMode"
        @change="onFitChange(($event.target as HTMLSelectElement).value as FitMode)"
      >
        <option v-for="opt in fitOptions" :key="opt.value" :value="opt.value">{{ t(`fitMode_${opt.value}`) }}</option>
      </select>
      <div class="detail-panel__hint">{{ t(`fitModeHint_${fitMode}`) }}</div>
    </div>

    <!-- 自动生成开关 -->
    <div class="detail-panel__section">
      <label class="detail-panel__switch">
        <input
          class="detail-panel__switch-input"
          type="checkbox"
          :checked="autoRun"
          @change="onAutoRunToggle"
        />
        <span class="detail-panel__switch-slider" aria-hidden="true" />
        <span class="detail-panel__switch-label">{{ t('autoLabel') }}</span>
      </label>
      <div class="detail-panel__hint">{{ t('autoHint') }}</div>
    </div>

    <!-- 生成按钮（autoRun 时隐藏） -->
    <div v-if="!autoRun" class="detail-panel__section">
      <button
        class="detail-panel__btn detail-panel__btn--primary"
        type="button"
        :disabled="connectedCount === 0 || isGenerating"
        @click="onGenerate"
      >
        <span v-if="isGenerating">{{ t('generating') }}</span>
        <span v-else>{{ t('generateBtn') }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped lang="less">
.detail-panel {
  box-sizing: border-box;
  height: 100%;
  padding: 16px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;

  &__section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__label {
    font-size: 12px;
    font-weight: 600;
    color: #374151;
  }

  &__hint {
    font-size: 11px;
    color: #9ca3af;
  }

  &__select {
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
    color: #1f2937;
    background: #fff;
    cursor: pointer;
    transition: border-color 0.15s;

    &:hover { border-color: #9ca3af; }
    &:focus { border-color: #2563eb; outline: none; }
  }

  &__input {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
    color: #1f2937;
    background: #fff;
    transition: border-color 0.15s;

    &:focus { border-color: #2563eb; outline: none; }
  }

  &__btn {
    all: unset;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    transition: background 0.15s, border-color 0.15s, color 0.15s;

    &:hover:not(:disabled) { opacity: 0.9; }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    &--primary {
      background: #2563eb;
      color: #fff;

      &:hover:not(:disabled) { background: #1d4ed8; }
    }

    &--icon {
      padding: 2px 10px;
      font-size: 16px;
      font-weight: 600;
      line-height: 1;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      background: #fff;
      color: #374151;

      &:hover:not(:disabled) {
        border-color: #2563eb;
        color: #2563eb;
      }
    }
  }

  &__port-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  &__port-count {
    font-size: 13px;
    color: #374151;
  }

  &__port-btns {
    display: flex;
    gap: 4px;
  }

  // —— autoRun switch ——
  &__switch {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    user-select: none;
  }

  &__switch-input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  &__switch-slider {
    position: relative;
    width: 36px;
    height: 20px;
    background: #d1d5db;
    border-radius: 10px;
    transition: background 0.2s;
    flex-shrink: 0;

    &::before {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      background: #fff;
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
      transition: transform 0.2s;
    }
  }

  &__switch-input:checked + &__switch-slider {
    background: #2563eb;

    &::before {
      transform: translateX(16px);
    }
  }

  &__switch-label {
    font-size: 13px;
    font-weight: 500;
    color: #374151;
  }
}
</style>
