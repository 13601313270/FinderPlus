<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { base64ToBytes } from '../../engine/data/base64'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { PdfFileNode } from './node'
import { MIN_PREVIEW_WIDTH, MAX_PREVIEW_WIDTH } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useFileDragOut } from '@renderer/composables/useFileDragOut'
import { useFileOpenInSystem } from '@renderer/composables/useFileOpenInSystem'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { usePdfPreview } from '@renderer/composables/usePdfPreview'
import { viewport } from '@renderer/canvas/viewport'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import { messages } from './i18n'
import PdfFileHelpDialog from './PdfFileHelpDialog.vue'

const props = defineProps<{ id: string }>()

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)

// 帮助浮层开关（弹窗壳由 HelpDialog 负责）
const showHelp = ref(false)

const fileNode = computed(() => {
  const node = workspaceScene.getNode(props.id)
  return node instanceof PdfFileNode ? node : undefined
})

// —— 拖拽：窗口内移动（useNodePosition）+ 拖出外部（useFileDragOut）——
const { dragOutOpts, cleanup: cleanupDragOut } = useFileDragOut(() => fileNode.value)
const { startDrag } = useNodePosition(() => fileNode.value, dragOutOpts)

// —— 双击图标：用系统默认应用打开文件 ——
const { openInSystem } = useFileOpenInSystem()

// —— 文件名 / 文件大小 / 文件被替换计数 的 Vue 响应式包装 ——
const fileName = ref('')
const fileSize = ref(0)
const fileRevision = ref(0)

// —— PDF 预览 composable ——
const canvasRef = ref<HTMLCanvasElement | null>(null)
const {
  currentPage,
  totalPages,
  loading,
  error,
  loadDocument,
  renderPage,
  getPageNaturalSize,
  goPrev,
  goNext,
  destroyAll,
} = usePdfPreview()

let unsubscribe: (() => void) | undefined
watch(
  fileNode,
  (n) => {
    unsubscribe?.()
    unsubscribe = n?.onChanged(() => {
      fileName.value = n.fileName
      fileSize.value = n.fileSize
      fileRevision.value = n.fileRevision
    })
    if (n) {
      fileName.value = n.fileName
      fileSize.value = n.fileSize
      fileRevision.value = n.fileRevision
    } else {
      fileName.value = ''
      fileSize.value = 0
      fileRevision.value = 0
      destroyAll()
    }
  },
  { immediate: true, flush: 'sync' }
)

onUnmounted(() => {
  unsubscribe?.()
  cleanupDragOut()
  destroyAll()
})

/** 格式化文件大小 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

// —— 渲染 PDF 第一页 + 回写 pageSize（watch 和 onMounted 共用） ——
async function renderFirstPage(): Promise<void> {
  const canvas = canvasRef.value
  const node = fileNode.value
  if (!canvas || !node || !totalPages.value) return

  const containerWidth = node.box[0] - 22
  await renderPage(1, canvas, containerWidth)

  const size = await getPageNaturalSize(1)
  if (size) {
    node.setPageSize(size.width, size.height)
  }
}

// —— fileName / 替换计数 变化 → 读 base64 → 加载 PDF → 渲染第一页 ——
let seqCounter = 0
watch([fileName, fileRevision], async ([newName]) => {
  destroyAll()
  if (!newName) return
  const mySeq = ++seqCounter
  const node = fileNode.value
  if (!node) return

  try {
    const b64 = await window.fileApi.readBinary(newName)
    if (mySeq !== seqCounter) return

    node.setContent(b64)

    // base64 → ArrayBuffer → 加载 PDF
    const bytes = base64ToBytes(b64)
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    await loadDocument(ab)

    // 文件切换后重新渲染（canvas 可能已经 ready，也可能 onMounted 再来一次）
    void renderFirstPage()
  } catch { /* 文件可能已被用户删了，静默忽略 */ }
}, { immediate: true })

// —— 首帧渲染：canvas DOM 就绪后触发（watch immediate 时 canvas 还没挂） ——
onMounted(renderFirstPage)

// —— resize handle 拖拽：保持 PDF 页面比例，只改宽度 ——
function onResizePointerDown(e: PointerEvent): void {
  if (!fileNode.value) return
  e.stopPropagation()   // 不冒泡到 NodeShell 的位置拖拽
  e.preventDefault()

  const startClientX = e.clientX
  const startWidth = fileNode.value?.box[0]
  let rafId: number | null = null

  function move(ev: PointerEvent): void {
    const node = fileNode.value
    if (!node) { end(); return }
    const scale = viewport.scale || 1
    const deltaWorld = (ev.clientX - startClientX) / scale
    const newWidth = Math.min(MAX_PREVIEW_WIDTH, Math.max(MIN_PREVIEW_WIDTH, startWidth + deltaWorld))
    node.setBox(newWidth, node.box[1])
    node.recalcHeight()

    // renderPage 是重操作：getPage + canvas resize + 完整渲染。
    // 用 rAF 合并同帧的多次 move，避免大 PDF 拖拽卡顿。
    if (rafId !== null) return
    rafId = requestAnimationFrame(() => {
      rafId = null
      const canvas = canvasRef.value
      if (canvas && totalPages.value) {
        void renderPage(currentPage.value, canvas, newWidth - 22)
      }
    })
  }
  function end(): void {
    if (rafId !== null) cancelAnimationFrame(rafId)
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
  }

  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', end)
}

// —— 翻页按钮 ——
function onGoPrev(): void {
  const canvas = canvasRef.value
  if (canvas && fileNode.value) {
    goPrev(canvas, fileNode.value.box[0] - 22)
  }
}
function onGoNext(): void {
  const canvas = canvasRef.value
  if (canvas && fileNode.value) {
    goNext(canvas, fileNode.value.box[0] - 22)
  }
}

// —— 翻页控件是否显示（多页 + 非 loading） ——
const showPagination = computed(() =>
  totalPages.value > 1 && !loading.value && !error.value
)
</script>

<template>
  <div
    class="file-card"
    @pointerdown="startDrag"
    @dblclick="openInSystem(fileNode?.fileName)"
    :title="fileNode?.fileName
      ? t('dragHint')
      : t('dragHintEmpty')"
  >
    <!-- 图标区：canvas 预览 PDF 第一页 -->
    <div class="file-card__icon">
      <canvas ref="canvasRef" class="file-card__canvas" />

      <!-- 状态叠层 -->
      <div v-if="loading" class="file-card__pdf-status">加载中…</div>
      <div v-else-if="error" class="file-card__pdf-status file-card__pdf-status--error">预览失败</div>
      <div v-else-if="!fileName" class="file-card__pdf-status">📄</div>

      <!-- 翻页控件 -->
      <div v-if="showPagination" class="file-card__pager">
        <button
          class="file-card__page-btn"
          :disabled="currentPage <= 1"
          @click.stop="onGoPrev"
          @pointerdown.stop
          @dblclick.stop
          aria-label="上一页"
        >‹</button>
        <span class="file-card__page-indicator">{{ currentPage }}/{{ totalPages }}</span>
        <button
          class="file-card__page-btn"
          :disabled="currentPage >= totalPages"
          @click.stop="onGoNext"
          @pointerdown.stop
          @dblclick.stop
          aria-label="下一页"
        >›</button>
      </div>
    </div>

    <!-- 文件名 -->
    <div class="file-card__name-row">
      <span v-if="fileName" class="file-card__name" :title="fileName">
        {{ fileName }}
      </span>
      <span v-else class="file-card__name file-card__name--empty">{{ t('emptyFile') }}</span>
      <span v-if="fileSize" class="file-card__size">
        {{ formatSize(fileSize) }}
      </span>
    </div>

    <!-- resize handle：右下角，拖拽改宽度 -->
    <div
      class="file-card__resize-handle"
      @pointerdown.stop.prevent="onResizePointerDown"
      :title="t('resizeHint')"
    />

    <!-- 帮助入口：悬浮在卡片右上角 -->
    <button
      class="file-card__help"
      type="button"
      :title="t('helpTitle')"
      @pointerdown.stop
      @dblclick.stop
      @click.stop="showHelp = true"
    >?</button>

  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
    <PdfFileHelpDialog />
  </HelpDialog>
</template>

<style scoped lang="less">
.file-card {
  box-sizing: border-box;
  width: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  padding: 10px 10px 8px;
  background: @color-surface;
  border: 1px solid @node-border-color;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  cursor: grab;
  user-select: none;

  &:active { cursor: grabbing; }

  &__icon {
    width: 100%;
    position: relative;
    border-radius: 6px;
    overflow: hidden;
    background: #f4f5f7;
    border: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    // 预览区高度由 node.recalcHeight() 根据 PDF 页面比例 + 卡片宽度算出
  }

  &__canvas {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    background: #fff;
    pointer-events: none;
  }

  &__pdf-status {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: rgba(0, 0, 0, 0.5);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    opacity: 0.6;

    &--error { color: #e53e3e; }
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

    &:hover:not(:disabled) { background: rgba(255, 255, 255, 0.15); }
    &:disabled { opacity: 0.3; cursor: not-allowed; }
  }

  &__page-indicator {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.85);
    min-width: 36px;
    text-align: center;
  }

  &__name-row {
    width: 100%;
    text-align: center;
    font-size: 12px;
    line-height: 1.3;
    min-height: 14px;
    padding: 0 4px 4px;
  }

  &__name {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: @color-text;
    font-weight: 500;

    &--empty {
      color: @color-text-weak;
      font-style: italic;
      font-weight: 400;
    }
  }

  &__size {
    display: block;
    color: @color-text-weak;
    font-size: 11px;
  }

  &__resize-handle {
    position: absolute;
    right: 2px;
    bottom: 2px;
    width: 12px;
    height: 12px;
    cursor: nwse-resize;
    background: transparent;
    border-right: 2px solid #b0b7c3;
    border-bottom: 2px solid #b0b7c3;
    border-bottom-right-radius: 4px;
    transition: border-color 0.15s ease, background 0.15s ease;

    &:hover {
      border-color: #4a7cff;
      background: rgba(74, 124, 255, 0.08);
    }
    &:active {
      border-color: #2d5de0;
      background: rgba(74, 124, 255, 0.18);
    }
  }

  &__help {
    all: unset;
    position: absolute;
    top: 6px;
    right: 6px;
    cursor: pointer;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #f3f4f6;
    color: #6b7280;
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: #dbeafe;
      color: #2563eb;
    }
  }
}
</style>
