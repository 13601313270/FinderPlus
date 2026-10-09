<script setup lang="ts">
import { computed, nextTick, ref, watch, onUnmounted } from 'vue'
import type { PdfFileValue } from '../../engine/data/PdfFileValue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { ImageToPdfNode } from './node'
import { generatePdfFromNode } from './generatePdf'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { useNodeDetail } from '@renderer/composables/useNodeDetail'
import { usePdfPreview } from '@renderer/composables/usePdfPreview'
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
const imageCount = ref(0)
const pageSize = ref<string>('A4')
const fitMode = ref<string>('contain')
const isGenerating = ref(false)

// —— PDF 弹窗预览 ——
const showPreview = ref(false)
const hasOutputPdf = ref(false)
const previewFile = ref<File | null>(null)
const previewCanvas = ref<HTMLCanvasElement | null>(null)

const {
  currentPage,
  totalPages,
  loading: pdfLoading,
  error: pdfError,
  loadDocument,
  renderPage,
  goPrev,
  goNext,
  destroyAll,
} = usePdfPreview()

/** 从 node 读取 output PDF 的 File 对象，刷新按钮状态和文件引用 */
function syncOutputPdf(n: ImageToPdfNode): void {
  const val = n.pdfOutput.value as PdfFileValue | undefined
  const file = val?.file ?? null
  hasOutputPdf.value = !!file
  previewFile.value = file
}

/** 渲染弹窗里的 PDF（等 DOM 就绪后调用） */
async function renderPreviewPdf(): Promise<void> {
  const canvas = previewCanvas.value
  const file = previewFile.value
  if (!canvas || !file) return

  try {
    const ab = await file.arrayBuffer()
    await loadDocument(ab)
    // 用弹窗 body 的实际宽度来算 scale
    const body = canvas.parentElement
    const width = body?.clientWidth ?? 600
    await renderPage(1, canvas, width)
  } catch (err) {
    console.error('[ImageToPdfNode] 预览加载失败：', err)
  }
}

/** 弹窗打开时：等 DOM 挂好 → loadDocument → renderPage */
watch(showPreview, async (val) => {
  if (val) {
    await nextTick()
    await renderPreviewPdf()
  } else {
    destroyAll()
  }
})

/** output PDF 在弹窗打开期间变了 → 重新加载 */
watch(previewFile, () => {
  if (showPreview.value) {
    nextTick(renderPreviewPdf)
  }
})

function onPreviewGoPrev(): void {
  const canvas = previewCanvas.value
  if (canvas) goPrev(canvas, canvas.parentElement?.clientWidth ?? 600)
}
function onPreviewGoNext(): void {
  const canvas = previewCanvas.value
  if (canvas) goNext(canvas, canvas.parentElement?.clientWidth ?? 600)
}

function onClosePreview(): void {
  showPreview.value = false
}

let unsubscribe: (() => void) | undefined
watch(
  node,
  (n) => {
    unsubscribe?.()
    unsubscribe = n?.onChanged(() => {
      imageCount.value = n.totalImageCount
      pageSize.value = n.pdfPageSize
      fitMode.value = n.pdfFitMode
      syncOutputPdf(n)
    })
    if (n) {
      imageCount.value = n.totalImageCount
      pageSize.value = n.pdfPageSize
      fitMode.value = n.pdfFitMode
      syncOutputPdf(n)
    } else {
      imageCount.value = 0
      hasOutputPdf.value = false
      previewFile.value = null
    }
  },
  { immediate: true, flush: 'sync' }
)

onUnmounted(() => {
  unsubscribe?.()
  destroyAll()
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

/** 弹窗翻页控件是否显示 */
const showPreviewPager = computed(() =>
  totalPages.value > 1 && !pdfLoading.value && !pdfError.value
)
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
        {{ t('imagesConnected', { count: imageCount }) }}
      </span>
      <span class="node-card__tags">
        <span class="node-card__pagesize">{{ pageSize }}</span>
        <span class="node-card__fit">{{ fitMode }}</span>
      </span>
    </div>

    <div style="flex-grow: 1;"></div>

    <!-- 操作行：生成 + 预览 -->
    <div class="node-card__actions">
      <button
        class="node-card__gen"
        type="button"
        :disabled="imageCount === 0 || isGenerating"
        @pointerdown.stop
        @click.stop="onGenerate"
      >
        <span v-if="isGenerating">{{ t('generating') }}</span>
        <span v-else>{{ t('generateBtn') }}</span>
      </button>
      <button
        class="node-card__preview"
        type="button"
        :title="t('previewBtn')"
        :disabled="!hasOutputPdf"
        @pointerdown.stop
        @click.stop="showPreview = true"
      >👁</button>
    </div>

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

  <!-- PDF 预览弹窗 -->
  <Teleport to="body">
    <div v-if="showPreview" class="pdf-preview-mask" @click="onClosePreview">
      <div class="pdf-preview-dialog" @click.stop>
        <div class="pdf-preview-dialog__header">
          <h3 class="pdf-preview-dialog__title">{{ t('previewTitle') }}</h3>
          <button
            class="pdf-preview-dialog__close"
            type="button"
            @click="onClosePreview"
          >×</button>
        </div>
        <div class="pdf-preview-dialog__body">
          <canvas ref="previewCanvas" class="pdf-preview-dialog__canvas" />

          <!-- 状态叠层 -->
          <div v-if="pdfLoading" class="pdf-preview-dialog__status">加载中…</div>
          <div v-else-if="pdfError" class="pdf-preview-dialog__status pdf-preview-dialog__status--error">
            {{ pdfError }}
          </div>
          <div v-else-if="!previewFile" class="pdf-preview-dialog__status">
            {{ t('generateBtn') }}
          </div>

          <!-- 翻页控件 -->
          <div v-if="showPreviewPager" class="pdf-preview-dialog__pager">
            <button
              class="pdf-preview-dialog__page-btn"
              :disabled="currentPage <= 1"
              @click="onPreviewGoPrev"
            >‹</button>
            <span class="pdf-preview-dialog__page-indicator">{{ currentPage }} / {{ totalPages }}</span>
            <button
              class="pdf-preview-dialog__page-btn"
              :disabled="currentPage >= totalPages"
              @click="onPreviewGoNext"
            >›</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
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

  &__tags { display: flex; gap: 2px; }

  &__pagesize {
    font-size: 10px;
    font-weight: 600;
    color: #e53e3e;
    background: #fef2f2;
    padding: 1px 5px;
    border-radius: 3px;
  }

  &__fit {
    font-size: 10px;
    font-weight: 600;
    color: #2563eb;
    background: #eff6ff;
    padding: 1px 5px;
    border-radius: 3px;
  }

  &__actions {
    width: 100%;
    display: flex;
    gap: 4px;
  }

  &__gen {
    all: unset;
    flex: 1;
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

  &__preview {
    all: unset;
    width: 24px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    background: #f3f4f6;
    color: #6b7280;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;

    &:hover:not(:disabled) { background: #dbeafe; color: #2563eb; }
    &:disabled { opacity: 0.35; cursor: not-allowed; }
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

/* ── PDF 预览弹窗（Teleport 到 body） ── */
.pdf-preview-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: helpFadeIn 0.15s ease;
}

.pdf-preview-dialog {
  width: 80vw;
  max-width: 960px;
  height: 85vh;
  max-height: 900px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: helpPopIn 0.18s ease;

  &__header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    border-bottom: 1px solid #e5e7eb;
  }

  &__title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: #1a1a1a;
  }

  &__close {
    all: unset;
    cursor: pointer;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    color: #9ca3af;
    font-size: 22px;
    line-height: 1;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: #f3f4f6;
      color: #374151;
    }
  }

  &__body {
    flex: 1;
    position: relative;
    background: #f9fafb;
    overflow: hidden;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 16px;
  }

  &__canvas {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    background: #fff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
    display: block;
  }

  &__status {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: #9ca3af;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;

    &--error { color: #e53e3e; }
  }

  &__pager {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(6px);
    border-radius: 8px;
    padding: 4px 10px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    z-index: 1;
  }

  &__page-btn {
    width: 26px;
    height: 26px;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.9);
    font-size: 18px;
    line-height: 1;
    border-radius: 4px;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;

    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.2);
    }

    &:disabled { opacity: 0.3; cursor: not-allowed; }
  }

  &__page-indicator {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.9);
    min-width: 52px;
    text-align: center;
  }
}
</style>
