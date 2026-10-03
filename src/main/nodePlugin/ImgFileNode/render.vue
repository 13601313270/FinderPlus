<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { base64ToBlob } from '../../engine/data/base64'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { ImgFileNode } from './node'
import { MIN_PREVIEW_WIDTH, MAX_PREVIEW_WIDTH } from './node'
import { inferImageMime } from './mime'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useFileDragOut } from '@renderer/composables/useFileDragOut'
import { useFileOpenInSystem } from '@renderer/composables/useFileOpenInSystem'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { viewport } from '@renderer/canvas/viewport'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import { messages } from './i18n'
import ImgFileHelpDialog from './ImgFileHelpDialog.vue'

const props = defineProps<{ id: string }>()

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)

// 帮助浮层开关（弹窗壳由 HelpDialog 负责）
const showHelp = ref(false)

const fileNode = computed(() => {
  const node = workspaceScene.getNode(props.id)
  return node instanceof ImgFileNode ? node : undefined
})

// —— 拖拽：窗口内移动 + 拖出外部 ——
const { dragOutOpts, cleanup: cleanupDragOut } = useFileDragOut(() => fileNode.value)
const { startDrag } = useNodePosition(() => fileNode.value, dragOutOpts)

// —— 双击图标：用系统默认应用打开文件 ——
const { openInSystem } = useFileOpenInSystem()

// —— 文件名 / 文件大小 / 卡片宽度 的 Vue 响应式包装 ——
const fileName = ref('')
const fileSize = ref(0)
// 文件被输入端口替换的计数：同名文件替换时 fileName 不变，靠它触发缩略图重建
const fileRevision = ref(0)

// —— 缩略图 URL（createObjectURL）；卸载或 fileName 变时 revoke 防泄漏 ——
const thumbnailUrl = ref<string | null>(null)
let revokeUrl: (() => void) | null = null

// —— 图片天然宽高比（width / height）。没图时用 4:3 兜底 ——
const aspectRatio = ref(4 / 3)

/** 释放当前缩略图 URL，并重置图片比例兜底占位 SVG */
function clearThumbnail(): void {
  if (revokeUrl) {
    revokeUrl()
    revokeUrl = null
  }
  thumbnailUrl.value = null
  aspectRatio.value = 4 / 3
}

/** 格式化文件大小 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

// —— 订阅 node.onChanged，把 node 字段刷进 Vue ref ——
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
      clearThumbnail()
    }
  },
  { immediate: true, flush: 'sync' }
)

// —— fileName / 替换计数 变化 → 重建缩略图 ——
let seqCounter = 0
watch([fileName, fileRevision], async ([newName]) => {
  clearThumbnail()
  if (!newName) return
  const mySeq = ++seqCounter
  const node = fileNode.value
  if (!node) return
  try {
    const b64 = await window.fileApi.readBinary(newName)
    if (mySeq !== seqCounter) return
    node.setContent(b64)
    const mime = inferImageMime(newName)
    const blob = base64ToBlob(b64, mime)
    const url = URL.createObjectURL(blob)
    thumbnailUrl.value = url
    revokeUrl = () => URL.revokeObjectURL(url)
  } catch { /* 文件可能已被用户删了，静默忽略 */ }
}, { immediate: true })

// —— 图片 load：算出天然比例，图标区的 aspect-ratio 跟着变 ——
function onImgLoad(e: Event): void {
  const img = e.target as HTMLImageElement
  if (img.naturalWidth && img.naturalHeight) {
    aspectRatio.value = img.naturalWidth / img.naturalHeight
    // 把天然宽高回写到节点，供右键菜单的"信息"弹窗展示
    fileNode.value?.setNaturalSize(img.naturalWidth, img.naturalHeight)
  }
}

// —— resize handle 拖拽：保持图片比例，只改宽度 ——
function onResizePointerDown(e: PointerEvent): void {
  if (!fileNode.value) return
  e.stopPropagation()   // 不冒泡到 NodeShell 的位置拖拽
  e.preventDefault()

  const startClientX = e.clientX
  const startWidth = fileNode.value?.box[0]

  function move(ev: PointerEvent): void {
    const node = fileNode.value
    if (!node) { end(); return }
    const scale = viewport.scale || 1
    // 屏幕像素差 → 世界尺寸增量（鼠标在屏幕上拖 delta，世界里就是 delta / scale）
    const deltaWorld = (ev.clientX - startClientX) / scale
    const newWidth = Math.min(MAX_PREVIEW_WIDTH, Math.max(MIN_PREVIEW_WIDTH, startWidth + deltaWorld))
    node.setBox(newWidth, node.box[1]) // 先写宽度，recalcHeight 会按新宽度重算高度
    node.recalcHeight()
  }
  function end(): void {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
  }

  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', end)
}

onUnmounted(() => {
  unsubscribe?.()
  cleanupDragOut()
  clearThumbnail()
})
</script>

<template>
  <div class="file-card" @pointerdown="startDrag" @dblclick="openInSystem(fileNode?.fileName)" :title="fileNode?.fileName
    ? t('dragHint')
    : t('dragHintEmpty')">
    <!-- 图标区：内嵌缩略图，CSS aspect-ratio 保持原图比例 -->
    <div class="file-card__icon" :style="{ aspectRatio: aspectRatio }">
      <img v-if="thumbnailUrl" class="file-card__img" :src="thumbnailUrl" :alt="t('altPreview')" draggable="false"
        @load="onImgLoad" />
      <!-- 没有缩略图时显示占位图标 -->
      <svg v-else class="file-card__icon-svg" viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 6C6 3.79 7.79 2 10 2H38L58 22V66C58 68.21 56.21 70 54 70H10C7.79 70 6 68.21 6 66V6Z" fill="#fff"
          stroke="#c5cbd4" stroke-width="1.5" />
        <path d="M38 2L58 22H44C41.79 22 40 20.21 40 18V2Z" fill="#eef3ff" stroke="#c5cbd4" stroke-width="1.5" />
        <text x="32" y="52" text-anchor="middle" font-size="10" font-weight="600" fill="#4a7cff"
          font-family="Helvetica, Arial, sans-serif">
          IMG
        </text>
      </svg>
    </div>

    <!-- 文件名 + 格式/像素 -->
    <div class="file-card__name-row">
      <span v-if="fileName" class="file-card__name" :title="fileName">
        {{ fileName }}
      </span>
      <span v-else class="file-card__name file-card__name--empty">{{ t('emptyFile') }}</span>
      <div class="info">
        <span v-if="fileSize || true" class="file-card__size">
          {{ formatSize(fileSize) }}
        </span>
        <span style="flex-grow: 1;"></span>
        <!-- 格式 + 原始像素：文件名下方一行，弱色 -->
        <span v-if="fileName && fileNode?.displayFormat" class="file-card__meta">
          {{ fileNode.displayFormat }}
          <template v-if="fileNode.naturalWidth && fileNode.naturalHeight">
            · {{ fileNode.naturalWidth }}×{{ fileNode.naturalHeight }}px
          </template>
        </span>
      </div>
    </div>

    <!-- resize handle：右下角，拖拽改宽度（保持原图比例） -->
    <div class="file-card__resize-handle" @pointerdown.stop.prevent="onResizePointerDown" :title="t('resizeHint')" />

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
    <ImgFileHelpDialog />
  </HelpDialog>
</template>

<style scoped lang="less">
.file-card {
  box-sizing: border-box; // 宽度走在 NodeShell 的 box 宽里，border+padding 算在内
  width: 100%; // 填满 .node-content（由 node.box 宽硬约束，resize handle 改的就是它）
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  background: @color-surface;
  border: 1px solid #d5d9e0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  cursor: grab;
  user-select: none;

  &:active {
    cursor: grabbing;
  }

  &__icon {
    width: 100%;
    // aspect-ratio 由模板绑定：初始 4/3，图片 load 后换成天然比例
    border-radius: 6px;
    overflow: hidden;
    background: #f4f5f7;
    border: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__img {
    width: 100%;
    height: 100%;
    // 保持原图比例，不裁剪不拉伸；容器用 aspect-ratio 已经按比例了，
    // 这里 contain 主要是兜住 svg/webp 这类可能和容器比例微小偏差的场景
    object-fit: contain;
    display: block;
    pointer-events: none;
    background: #fff;
  }

  &__icon-svg {
    width: 64px;
    height: 72px;
    display: block;
    flex-shrink: 0;
  }

  &__name-row {
    width: 100%;
    text-align: center;
    font-size: 12px;
    line-height: 1.3;
    min-height: 14px;
    padding: 0 4px 4px;

    .info {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
    }
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
    flex-shrink: 0;
    color: @color-text-weak;
    font-size: 11px;
  }

  &__meta {
    display: block;
    color: #9aa1ad;
    flex-shrink: 0;
    font-size: 10px;
  }

  &__resize-handle {
    position: absolute;
    right: 2px;
    bottom: 2px;
    width: 12px;
    height: 12px;
    cursor: nwse-resize;
    // 小三角：右下边框 + 圆角
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
