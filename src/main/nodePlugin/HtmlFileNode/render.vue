<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { HtmlFileNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useFileDragOut } from '@renderer/composables/useFileDragOut'
import { useFileOpenInSystem } from '@renderer/composables/useFileOpenInSystem'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { useNodeDetail } from '@renderer/composables/useNodeDetail'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import { messages } from './i18n'
import HtmlFileHelpDialog from './HtmlFileHelpDialog.vue'
import GearIcon from '@renderer/components/icons/GearIcon.vue'
import { viewport } from '@renderer/canvas/viewport'
import { globalMonaco } from '@renderer/services/globalMonaco'

/** 预览模式下 box 尺寸允许的最小边界（图标模式默认尺寸） */
const MIN_BOX_W = 180
const MIN_BOX_H = 122

const props = defineProps<{ id: string }>()

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)
const { openNodeDetail } = useNodeDetail()

// 帮助浮层开关（弹窗壳由 HelpDialog 负责）
const showHelp = ref(false)

const fileNode = computed(() => {
  const node = workspaceScene.getNode(props.id)
  return node instanceof HtmlFileNode ? node : undefined
})

// —— 拖拽：窗口内移动（useNodePosition）+ 拖出外部（useFileDragOut）——
// 文件类节点独有的"拖出到桌面/文件夹"能力抽成了 useFileDragOut，
// 10 种文件节点共用同一份实现，这里只传 getter。
const { dragOutOpts, cleanup: cleanupDragOut } = useFileDragOut(() => fileNode.value)
const { startDrag } = useNodePosition(() => fileNode.value, dragOutOpts)

// —— 双击图标：用系统默认应用打开文件 ——
const { openInSystem } = useFileOpenInSystem()

// —— Vue 响应式包装的节点状态 ——
// Node 基类用 onChanged/notifyChanged 广播变化，但 Vue 追踪不了普通 class 字段。
// 所以这里用 ref 包一层，订阅 node.onChanged 时把字段刷进 ref，模板改读这些 ref 就能跟着变。
const fileName = ref('')
const fileSize = ref(0)
const previewEnabled = ref(false)
const htmlContent = ref('')
const filePath = ref('')
const previewUrl = ref('')

let unsubscribe: (() => void) | undefined
watch(
  fileNode,
  (n) => {
    unsubscribe?.()
    unsubscribe = n?.onChanged(() => {
      fileName.value = n.fileName
      fileSize.value = n.fileSize
      previewEnabled.value = n.previewEnabledStatus
      htmlContent.value = n.content
      filePath.value = n.fileName
    })
    if (n) {
      fileName.value = n.fileName
      fileSize.value = n.fileSize
      previewEnabled.value = n.previewEnabledStatus
      htmlContent.value = n.content
      filePath.value = n.fileName
    } else {
      fileName.value = ''
      fileSize.value = 0
      previewEnabled.value = false
      htmlContent.value = ''
      filePath.value = ''
      previewUrl.value = ''
    }
  },
  { immediate: true, flush: 'sync' }
)

onUnmounted(() => {
  unsubscribe?.()
  cleanupDragOut()
})

/** 格式化文件大小 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

/** 唤醒全局 Monaco 编辑器，HTML 语法高亮模式 */
function onEdit(): void {
  const node = fileNode.value
  if (!node) return
  globalMonaco.open({
    title: node.fileName || node.type,
    language: 'html',
    content: node.content,
    readOnly: false,
    onSave: (text) => {
      node.applyContent(text)
    }
  })
}

// —— 预览模式右下角 resize handle ——

function onResizePointerDown(e: PointerEvent): void {
  const node = fileNode.value
  if (!node) return
  e.stopPropagation();   // 不冒泡到 NodeShell 的位置拖拽
  e.preventDefault();
  (e.target as HTMLElement).setPointerCapture(e.pointerId)

  const startClientX = e.clientX
  const startClientY = e.clientY
  const startW = node.box[0]
  const startH = node.box[1]

  function move(ev: PointerEvent): void {
    const n = fileNode.value
    if (!n) { end(); return }
    const scale = viewport.scale || 1
    const newW = Math.max(MIN_BOX_W, startW + (ev.clientX - startClientX) / scale)
    const newH = Math.max(MIN_BOX_H, startH + (ev.clientY - startClientY) / scale)
    n.setBox(newW, newH)
  }
  function end(): void {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
  }

  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', end)
}

// —— iframe 预览 URL 构造（与 HtmlFileDetailPanel 同源，复用同一套逻辑）——

/**
 * 把绝对路径换算成 file:// 目录 URL（保留末尾 /），
 * 让 temp HTML 里的相对路径（./style.css）仍然指向原始 HTML 所在目录。
 */
function computeBaseDirUrl(absPath: string): string | null {
  if (!absPath) return null
  const normalized = absPath.replace(/\\/g, '/')
  const lastSlash = normalized.lastIndexOf('/')
  if (lastSlash < 0) return null
  return 'file://' + normalized.slice(0, lastSlash + 1)
}

/**
 * 构造要写入临时文件的完整 HTML：在 <head> 里插入 <base> 标签，
 * base href 指向原始 HTML 文件所在目录，这样里面的相对路径能正确解析。
 */
function buildPreviewHtml(raw: string, originalPath: string): string {
  if (!raw) return ''
  const baseUrl = computeBaseDirUrl(originalPath)
  if (!baseUrl) return raw
  if (/<head[\s>]/i.test(raw)) {
    return raw.replace(/<head([\s>])/i, `<head$1<base href="${baseUrl}">`)
  }
  if (/<html[\s>]/i.test(raw)) {
    return raw.replace(/<html([\s>])/i, `<html$1<head><base href="${baseUrl}"></head>`)
  }
  return `<base href="${baseUrl}">${raw}`
}

/**
 * 内容 / 路径 / 预览开关变化时，异步写 temp 文件并拿到 file:// URL。
 * 只在预览开启时才生成 URL，避免图标模式下做无用功。
 */
const contentStamp = computed(() => ({ c: htmlContent.value, p: filePath.value, on: previewEnabled.value }))
watch(contentStamp, async ({ c, p, on }) => {
  if (!on || !c) {
    previewUrl.value = ''
    return
  }
  const withBase = buildPreviewHtml(c, p)
  // @ts-ignore — 只在 renderer 里执行，window.fileApi 一定存在
  previewUrl.value = await window.fileApi.writePreviewHtml(props.id, withBase)
}, { immediate: true })
</script>

<template>
  <!-- 图标模式（默认） -->
  <div v-if="!previewEnabled" class="file-card" @pointerdown="startDrag" @dblclick="openInSystem(fileNode?.fileName)"
    :title="fileNode?.fileName
      ? t('dragHint')
      : t('dragHintEmpty')">
    <!-- 图标区：像系统文件图标一样，上面有个折角小三角 -->
    <div class="file-card__icon">
      <svg class="file-card__icon-svg" viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- 文件主体 -->
        <path d="M6 6C6 3.79 7.79 2 10 2H38L58 22V66C58 68.21 56.21 70 54 70H10C7.79 70 6 68.21 6 66V6Z" fill="#fff"
          stroke="#c5cbd4" stroke-width="1.5" />
        <!-- 折角三角 -->
        <path d="M38 2L58 22H44C41.79 22 40 20.21 40 18V2Z" fill="#eef3ff" stroke="#c5cbd4" stroke-width="1.5" />
        <!-- 类型标签 -->
        <text x="32" y="52" text-anchor="middle" font-size="10" font-weight="600" fill="#e44d26"
          font-family="Helvetica, Arial, sans-serif">
          HTML
        </text>
      </svg>
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

    <div class="buttons">
      <!-- 右上角按钮组：编辑 · 预览详情 · 帮助 -->
      <button class="file-card__btn" type="button" :disabled="!fileNode" :title="t('editHint')" @pointerdown.stop
        @dblclick.stop @click.stop="onEdit">
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M11 2.5l2.5 2.5-7 7H4.5V9.5l6.5-7z" />
        </svg>
      </button>
      <button class="file-card__btn" type="button" :title="t('previewTitle')" @pointerdown.stop @dblclick.stop
        @click.stop="openNodeDetail(props.id)">
        <GearIcon />
      </button>
      <button class="file-card__btn" type="button" :title="t('helpTitle')" @pointerdown.stop @dblclick.stop
        @click.stop="showHelp = true">?</button>
      <!-- <button v-if="httpNode" class="node__gear" type="button" :title="t('editConfigHint')" @pointerdown.stop
        @click.stop="openNodeDetail(id)">
        <GearIcon />
      </button> -->
    </div>
  </div>

  <!-- 预览模式 -->
  <div v-else class="file-card file-card--preview" @pointerdown="startDrag" :title="fileName || t('dragHintEmpty')">
    <!-- 顶部工具栏：文件名 + 按钮 -->
    <div class="file-card__toolbar">
      <span class="file-card__toolbar-name" :title="fileName">
        {{ fileName || t('emptyFile') }}
      </span>
    </div>

    <!-- iframe 预览区 -->
    <div class="file-card__preview-body">
      <template v-if="!previewUrl">
        <div class="file-card__preview-empty">{{ t('emptyFile') }}</div>
      </template>
      <template v-else>
        <iframe class="file-card__preview-frame" :src="previewUrl"
          sandbox="allow-scripts allow-forms allow-popups allow-same-origin" />
      </template>
    </div>
    <div class="buttons">
      <!-- 右上角按钮组：编辑 · 帮助 -->
      <button class="file-card__btn file-card__btn--dark" type="button" :disabled="!fileNode" :title="t('editHint')"
        style="right: 28px" @pointerdown.stop @dblclick.stop @click.stop="onEdit">
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M11 2.5l2.5 2.5-7 7H4.5V9.5l6.5-7z" />
        </svg>
      </button>
      <button class="file-card__btn" type="button" :title="t('previewTitle')" @pointerdown.stop @dblclick.stop
        @click.stop="openNodeDetail(props.id)">
        <GearIcon />
      </button>
      <button class="file-card__btn file-card__btn--dark" type="button" :title="t('helpTitle')" @pointerdown.stop
        @dblclick.stop @click.stop="showHelp = true">?</button>
    </div>

    <!-- resize handle：预览模式右下角，拖拽调整 box 尺寸 -->
    <div class="file-card__resize-handle" @pointerdown.stop.prevent="onResizePointerDown" />
  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
    <HtmlFileHelpDialog />
  </HelpDialog>
</template>

<style scoped lang="less">
.file-card {
  box-sizing: border-box; // box 是内容区外包壳宽，border+padding 算在 box 内
  width: 100%; // 填满 NodeShell 的 .node-content（由 node.box 硬约束定宽高）
  height: 100%;
  overflow: hidden; // 内容超不出 box（文件名已 ellipsis）
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 10px 8px;
  position: relative; // 供右上角悬浮帮助按钮定位
  cursor: grab;
  user-select: none;

  &:active {
    cursor: grabbing;
  }

  &__icon {
    width: 64px;
    height: 72px;
  }

  &__icon-svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  &__name-row {
    width: 100%;
    text-align: center;
    font-size: 12px;
    line-height: 1.3;
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

  &__btn {
    all: unset;
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

    &:hover:not(:disabled) {
      background: #dbeafe;
      color: #2563eb;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.4;
    }

    // 预览模式下按钮压在 iframe 上，换成半透明深色调更协调
    &--dark {
      background: rgba(255, 255, 255, 0.85);
      color: #374151;
      backdrop-filter: blur(4px);

      &:hover:not(:disabled) {
        background: #fff;
        color: #1d4ed8;
      }
    }
  }

  // —— 预览模式 ——
  &--preview {
    padding: 0;
    gap: 0;
    background: #f4f5f7;
  }

  &__toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 80px 6px 8px;
    background: #fff;
    border-bottom: 1px solid #e5e7eb;
    flex-shrink: 0;
    cursor: grab;
  }

  &__toolbar-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11px;
    font-weight: 500;
    color: #374151;
    line-height: 18px;
  }

  &__preview-body {
    width: 100%;
    flex: 1;
    min-height: 0; // 让 flex 子项正确收缩
    position: relative;
    overflow: hidden;
  }

  &__preview-frame {
    width: 100%;
    height: 100%;
    border: none;
    display: block;
    background: #fff;
  }

  &__preview-empty {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #9ca3af;
    font-size: 12px;
    font-style: italic;
    padding: 8px;
  }

  .buttons {
    background-color: rgb(0 0 0 / 31%);
    position: absolute;
    top: 4px;
    right: 6px;
    display: flex;
    gap: 4px;
    padding: 2px 4px;
    border-radius: 6px;
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
    border-right: 2px solid rgba(128, 128, 128, 0.6);
    border-bottom: 2px solid rgba(128, 128, 128, 0.6);
    border-bottom-right-radius: 4px;
    transition: border-color 0.15s ease, background 0.15s ease;

    &:hover {
      border-color: #4a7cff;
    }

    &:active {
      border-color: #2563eb;
      background: rgba(74, 124, 255, 0.08);
    }
  }
}
</style>
