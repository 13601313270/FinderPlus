<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { ImageToPdfNode } from './node'
import { generatePdfFromNode } from './generatePdf'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { useNodeDetail } from '@renderer/composables/useNodeDetail'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import GearIcon from '@renderer/components/icons/GearIcon.vue'
import { messages } from './i18n'
import ImageToPdfHelpDialog from './ImageToPdfHelpDialog.vue'

const props = defineProps<{ id: string }>()

const t = useLocalizedMessages(messages)
const showHelp = ref(false)
const { openNodeDetail } = useNodeDetail()

const node = computed(() => {
  const n = workspaceScene.getNode(props.id)
  return n instanceof ImageToPdfNode ? n : undefined
})

// —— 拖拽：窗口内移动 ——
const { startDrag } = useNodePosition(() => node.value)

// —— 卡片状态 ——
const connectedCount = ref(0)
const totalPorts = ref(1)
const pageSize = ref<string>('A4')
const isGenerating = ref(false)

let unsubscribe: (() => void) | undefined
watch(
  node,
  (n) => {
    unsubscribe?.()
    unsubscribe = n?.onChanged(() => {
      connectedCount.value = n.connectedImageCount
      totalPorts.value = n.inputPorts.length
      pageSize.value = n.pdfPageSize
    })
    if (n) {
      connectedCount.value = n.connectedImageCount
      totalPorts.value = n.inputPorts.length
      pageSize.value = n.pdfPageSize
    } else {
      connectedCount.value = 0
      totalPorts.value = 1
    }
  },
  { immediate: true, flush: 'sync' }
)

onUnmounted(() => {
  unsubscribe?.()
})

/** 卡片上的生成按钮 */
async function onGenerate(): Promise<void> {
  const n = node.value
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
  <div
    class="node-card"
    @pointerdown="startDrag"
  >
    <!-- 图标区：多页 PDF 示意 -->
    <div class="node-card__icon">
      <svg class="node-card__icon-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- 后面的 PDF 页面（层叠效果） -->
        <rect x="12" y="8" width="36" height="48" rx="3" fill="#e5e7eb" stroke="#c5cbd4" stroke-width="1" />
        <rect x="14" y="10" width="36" height="48" rx="3" fill="#f3f4f6" stroke="#c5cbd4" stroke-width="1" />
        <!-- 前面的 PDF 页面 -->
        <rect x="8" y="4" width="36" height="48" rx="3" fill="#fff" stroke="#e53e3e" stroke-width="1.5" />
        <!-- 页面上的图片缩略图 -->
        <rect x="14" y="10" width="24" height="18" rx="1" fill="#dbeafe" stroke="#93c5fd" stroke-width="0.8" />
        <rect x="14" y="32" width="18" height="14" rx="1" fill="#fde68a" stroke="#fbbf24" stroke-width="0.8" />
        <text x="26" y="58" text-anchor="middle" font-size="8" font-weight="600" fill="#e53e3e" font-family="Helvetica, Arial, sans-serif">
          PDF
        </text>
      </svg>
    </div>

    <!-- 状态行 -->
    <div class="node-card__status">
      <span class="node-card__count">
        {{ t('imagesConnected', { connected: connectedCount, total: totalPorts }) }}
      </span>
      <span class="node-card__pagesize">{{ pageSize }}</span>
    </div>

    <!-- 生成按钮（紧凑版） -->
    <button
      class="node-card__gen"
      type="button"
      :disabled="connectedCount === 0 || isGenerating"
      @pointerdown.stop
      @click.stop="onGenerate"
    >
      <span v-if="isGenerating">{{ t('generating') }}</span>
      <span v-else>{{ t('generateBtn') }}</span>
    </button>

    <!-- 齿轮：打开详情面板 -->
    <button
      class="node-card__gear"
      type="button"
      :title="t('settingsTitle')"
      @pointerdown.stop
      @dblclick.stop
      @click.stop="openNodeDetail(props.id)"
    >
      <GearIcon />
    </button>

    <!-- 帮助入口 -->
    <button
      class="node-card__help"
      type="button"
      :title="t('helpTitle')"
      @pointerdown.stop
      @dblclick.stop
      @click.stop="showHelp = true"
    >?</button>
  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
    <ImageToPdfHelpDialog />
  </HelpDialog>
</template>

<style scoped lang="less">
.node-card {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 8px 6px;
  background: @color-surface;
  border: 1px solid @node-border-color;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  position: relative;
  cursor: grab;
  user-select: none;
  &:active { cursor: grabbing; }

  &__icon { width: 52px; height: 52px; }
  &__icon-svg { width: 100%; height: 100%; display: block; }

  &__status {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 2px;
  }

  &__count { font-size: 10px; color: @color-text-weak; }

  &__pagesize {
    font-size: 10px;
    font-weight: 600;
    color: #e53e3e;
    background: #fef2f2;
    padding: 1px 5px;
    border-radius: 3px;
  }

  &__gen {
    all: unset;
    width: 100%;
    padding: 3px 0;
    font-size: 11px;
    font-weight: 500;
    color: #fff;
    background: #4a7cff;
    border-radius: 4px;
    text-align: center;
    cursor: pointer;
    transition: background 0.15s;

    &:hover:not(:disabled) { background: #2d5de0; }
    &:disabled { background: #c5cbd4; cursor: not-allowed; }
  }

  &__gear,
  &__help {
    all: unset;
    position: absolute;
    top: 4px;
    cursor: pointer;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #f3f4f6;
    color: #6b7280;
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
    transition: background 0.15s, color 0.15s;

    &:hover { background: #dbeafe; color: #2563eb; }
  }

  &__gear {
    right: 26px;
    :deep(.icon) { width: 12px; height: 12px; }
  }

  &__help { right: 4px; }
}
</style>
