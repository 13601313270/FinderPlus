<script setup lang="ts">
/**
 * PdfFileValue 渲染器：PDF canvas 预览（支持翻页）+ 文件名。
 *
 * 核心逻辑复用 usePdfPreview.ts composable（worker 配置 / 文档加载 / 翻页 / 清理）。
 * tooltip/inline 模式固定渲染第一页；detail 模式显示翻页控件。
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { usePdfPreview } from '@renderer/composables/usePdfPreview'

const props = defineProps<{
  value: { file?: File; displayLabel: string }
  context?: 'tooltip' | 'detail' | 'inline'
}>()

const emit = defineEmits<{
  resize: []
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const {
  currentPage,
  totalPages,
  loading,
  error,
  loadDocument,
  renderPage,
  goPrev,
  goNext,
  destroyAll,
} = usePdfPreview()

// ── 数据源变化（File 切换）→ 读 ArrayBuffer → loadDocument → 渲染第一页 ──
watch(
  () => props.value.file,
  async (file) => {
    if (!file) { destroyAll(); return }

    const buffer = await file.arrayBuffer()
    await loadDocument(buffer)

    const canvas = canvasRef.value
    if (canvas) {
      const width = canvas.clientWidth || 200
      await renderPage(1, canvas, width)
      emit('resize')
    }
  },
  { immediate: true }
)

// ── 翻页按钮（detail 模式才显示）───────────────────────────────────
function onGoPrev(): void {
  const canvas = canvasRef.value
  if (canvas) { goPrev(canvas, canvas.clientWidth || 200); emit('resize') }
}
function onGoNext(): void {
  const canvas = canvasRef.value
  if (canvas) { goNext(canvas, canvas.clientWidth || 200); emit('resize') }
}

onBeforeUnmount(destroyAll)

// ── 模板辅助 ──
const sizeClass = computed(() => ({
  'v-pdf--tooltip': props.context !== 'detail',
  'v-pdf--detail': props.context === 'detail'
}))

const showPagination = computed(() =>
  props.context === 'detail' && totalPages.value > 1 && !loading.value && !error.value
)
</script>

<template>
  <div class="v-pdf" :class="sizeClass">
    <div class="v-pdf__icon-wrap">
      <canvas ref="canvasRef" class="v-pdf__canvas" />

      <div v-if="loading" class="v-pdf__loading">加载中…</div>
      <div v-else-if="error" class="v-pdf__error">预览失败</div>
      <div v-else-if="!value.file" class="v-pdf__placeholder">📄</div>

      <!-- 翻页控件：detail 模式且多页才显示 -->
      <div v-if="showPagination" class="v-pdf__pager">
        <button
          class="v-pdf__page-btn"
          :disabled="currentPage <= 1"
          @click="onGoPrev"
          aria-label="上一页"
        >‹</button>
        <span class="v-pdf__page-indicator">{{ currentPage }} / {{ totalPages }}</span>
        <button
          class="v-pdf__page-btn"
          :disabled="currentPage >= totalPages"
          @click="onGoNext"
          aria-label="下一页"
        >›</button>
      </div>
    </div>
    <div class="v-pdf__name">{{ value.displayLabel }}</div>
  </div>
</template>

<style scoped lang="less">
.v-pdf {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;

  &__icon-wrap {
    width: 100%;
    height: 80px;
    position: relative;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;

    .v-pdf--detail & {
      height: 200px;
    }
  }

  &__canvas {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }

  &__loading,
  &__error {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.5);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  &__error { color: #f87171; }

  &__placeholder {
    font-size: 32px;
    opacity: 0.4;

    .v-pdf--detail & { font-size: 56px; }
  }

  &__pager {
    position: absolute;
    bottom: 4px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    border-radius: 6px;
    padding: 2px 6px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    z-index: 1;
  }

  &__page-btn {
    width: 18px;
    height: 18px;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.85);
    font-size: 14px;
    line-height: 1;
    border-radius: 3px;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;

    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.15);
    }

    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
  }

  &__page-indicator {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.85);
    min-width: 44px;
    text-align: center;
  }

  &__name {
    font-size: 10px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: rgba(255, 255, 255, 0.7);
    word-break: break-all;
    text-align: center;
  }
}
</style>
