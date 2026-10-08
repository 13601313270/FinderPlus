<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { bytesToBase64 } from '../../engine/data/base64'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { ImageToPdfNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import { messages } from './i18n'
import ImageToPdfHelpDialog from './ImageToPdfHelpDialog.vue'

const props = defineProps<{ id: string }>()

const t = useLocalizedMessages(messages)
const showHelp = ref(false)

const node = computed(() => {
  const n = workspaceScene.getNode(props.id)
  return n instanceof ImageToPdfNode ? n : undefined
})

// —— 拖拽：窗口内移动 ——
const { startDrag } = useNodePosition(() => node.value)

// —— 卡片状态 ——
const connectedCount = ref(0)
const totalPorts = ref(1)
const isGenerating = ref(false)
const lastFileName = ref('')

let unsubscribe: (() => void) | undefined
watch(
  node,
  (n) => {
    unsubscribe?.()
    unsubscribe = n?.onChanged(() => {
      connectedCount.value = n.connectedImageCount
      totalPorts.value = n.inputPorts.length
    })
    if (n) {
      connectedCount.value = n.connectedImageCount
      totalPorts.value = n.inputPorts.length
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

/**
 * 生成 PDF 并 commit 到输出端口。
 * - 收集所有已连接端口的图片（按端口顺序）
 * - 用 pdf-lib 每张图作为一页，A4 页面 + contain 等比缩放居中
 * - 生成完成调 node.setOutput()
 */
async function generatePdf(): Promise<void> {
  const n = node.value
  if (!n) return

  const images = n.getConnectedImages()
  if (images.length === 0) return

  isGenerating.value = true
  try {
    const { PDFDocument } = await import('pdf-lib')
    const pdfDoc = await PDFDocument.create()

    // A4 页面尺寸（PDF points）：595.28 × 841.89
    const A4_WIDTH = 595.28
    const A4_HEIGHT = 841.89
    const PAGE_MARGIN = 20 // 页面边距

    for (const { file } of images) {
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)

      // 根据 MIME 选择 embed 方法
      const mime = file.type
      let embeddedImg
      if (mime === 'image/jpeg' || mime === 'image/jpg') {
        embeddedImg = await pdfDoc.embedJpg(bytes)
      } else if (mime === 'image/png') {
        embeddedImg = await pdfDoc.embedPng(bytes)
      } else {
        // 其他格式（WebP/GIF/BMP等）先转 PNG：用 Canvas 解码后 toBlob
        const pngBytes = await convertToPngBytes(file)
        embeddedImg = await pdfDoc.embedPng(pngBytes)
      }

      // 创建页面并 contain 模式绘制
      const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT])
      const usableW = A4_WIDTH - PAGE_MARGIN * 2
      const usableH = A4_HEIGHT - PAGE_MARGIN * 2
      const imgAspect = embeddedImg.width / embeddedImg.height
      const pageAspect = usableW / usableH

      let drawW: number
      let drawH: number
      if (imgAspect > pageAspect) {
        // 图片更宽 → 按页面可用宽度缩放
        drawW = usableW
        drawH = usableW / imgAspect
      } else {
        // 图片更高或相等 → 按页面可用高度缩放
        drawH = usableH
        drawW = usableH * imgAspect
      }

      const cx = PAGE_MARGIN + (usableW - drawW) / 2
      const cy = PAGE_MARGIN + (usableH - drawH) / 2

      page.drawImage(embeddedImg, {
        x: cx,
        y: cy,
        width: drawW,
        height: drawH
      })
    }

    // 保存为 base64（用项目已有工具，内部是循环 String.fromCharCode 逐个调用，
    // 避免对大 Uint8Array 做 spread 展开触发栈溢出）
    const pdfBytes = await pdfDoc.save()
    const base64 = bytesToBase64(pdfBytes)

    const fileName = `output_${Date.now()}.pdf`
    n.setOutput(base64, fileName)
    lastFileName.value = fileName
  } catch (err) {
    console.error('[ImageToPdfNode] PDF 生成失败：', err)
  } finally {
    isGenerating.value = false
  }
}

/**
 * 把非 PNG/JPG 图片文件转成 PNG 的 Uint8Array。
 * 用 Canvas 解码 → toBlob('image/png') → 读 ArrayBuffer。
 */
function convertToPngBytes(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas context 不可用')); return }
      ctx.drawImage(img, 0, 0)
      canvas.toBlob(async (blob) => {
        if (!blob) { reject(new Error('toBlob 返回 null')); return }
        const buf = await blob.arrayBuffer()
        resolve(new Uint8Array(buf))
      }, 'image/png')
    }
    img.onerror = () => reject(new Error(`图片解码失败：${file.name}`))
    img.src = URL.createObjectURL(file)
  })
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

    <!-- 端口信息 -->
    <div class="node-card__info">
      <span class="node-card__count">
        {{ t('imagesConnected', { connected: connectedCount, total: totalPorts }) }}
      </span>
    </div>

    <!-- 生成按钮 -->
    <button
      class="node-card__btn"
      type="button"
      :disabled="connectedCount === 0 || isGenerating"
      @click.stop="generatePdf"
    >
      <span v-if="isGenerating">{{ t('generating') }}</span>
      <span v-else>{{ t('generateBtn') }}</span>
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
  gap: 6px;
  padding: 10px 10px 8px;
  background: @color-surface;
  border: 1px solid @node-border-color;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  position: relative;
  cursor: grab;
  user-select: none;
  &:active { cursor: grabbing; }

  &__icon {
    width: 56px;
    height: 56px;
  }

  &__icon-svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  &__info {
    text-align: center;
  }

  &__count {
    font-size: 11px;
    color: @color-text-weak;
  }

  &__btn {
    all: unset;
    padding: 4px 12px;
    font-size: 12px;
    font-weight: 500;
    color: #fff;
    background: #4a7cff;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.15s;

    &:hover:not(:disabled) { background: #2d5de0; }
    &:disabled {
      background: #c5cbd4;
      cursor: not-allowed;
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
