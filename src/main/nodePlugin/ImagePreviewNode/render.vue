<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { ImagePreviewNode } from './node'
import { ImgFileNode } from '../ImgFileNode/node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { setLastDragPath } from '@renderer/composables/useFileDragOut'
import { viewport } from '@renderer/canvas/viewport'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import ImagePreviewHelpDialog from './ImagePreviewHelpDialog.vue'
import { messages } from './i18n'

// 卡片头部标题走插件 manifest 的多语言 title，未配当前语言时由 resolveNodeTitle 兜底
const nodeTitle = useNodeTitle(ImagePreviewNode.TYPE)

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)

const props = defineProps<{ id: string }>()

const node = computed(() => {
  const n = workspaceScene.getNode(props.id)
  return n instanceof ImagePreviewNode ? n : undefined
})

// 帮助浮层开关（弹窗壳由 HelpDialog 负责）
const showHelp = ref(false)

/**
 * 引擎里的 imageInput.value 是普通 TypeScript 数组属性，
 * Vue 的 computed 追踪不到它的变化。所以用 ref 存 previewFile，
 * 订阅 node.onChanged 时主动从端口取值刷进来——跟 FileInfoNode.render.vue /
 * ImgFileNode.render.vue 完全同模式。
 */
const previewFile = ref<File | undefined>(undefined)

/** 从 imageInput.value 里取第一个 ImgFileValue 的 file */
function refreshPreviewFile(n: ImagePreviewNode | undefined): void {
  if (!n) {
    previewFile.value = undefined
    return
  }
  const [first] = n.imageInput.value
  previewFile.value = first instanceof ImgFileValue ? first.file : undefined
}

/** 字节数 → 可读体积（B / KB / MB） */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

/** File → 展示用格式名（优先 MIME 子类型，回退文件扩展名） */
function formatFor(file: File): string {
  const sub = file.type.startsWith('image/') ? file.type.slice(6).split('+')[0] : ''
  if (sub) return sub.toUpperCase()
  const dot = file.name.lastIndexOf('.')
  return dot > 0 ? file.name.slice(dot + 1).toUpperCase() : t('formatUnknown')
}

/** 文件大小文案 */
const sizeText = computed(() => (previewFile.value ? formatSize(previewFile.value.size) : '--'))

/** 图片格式文案 */
const formatText = computed(() => (previewFile.value ? formatFor(previewFile.value) : '--'))

// —— 订阅 node.onChanged：节点输入变化时主动刷新 previewFile ——
let unsubscribe: (() => void) | undefined
watch(
  node,
  (n) => {
    unsubscribe?.()
    unsubscribe = n?.onChanged(() => refreshPreviewFile(n))
    refreshPreviewFile(n)
  },
  { immediate: true, flush: 'sync' }
)

/** File → base64 字符串（给 writeBuffer 用） */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/** 预览图专属拖拽：画布内移动节点，越界超时 writeBuffer + startDrag 导出 */
const { startDrag: startPreviewDrag } = useNodePosition(
  () => node.value,
  {
    enableDragOut: true,
    confirmDelayMs: 300,
    onDragOut: async (startPos) => {
      const file = previewFile.value
      const currentNode = node.value
      if (!file || !currentNode) return
      // 还原节点到按下前的位置（越界前已经跟着鼠标移动过了）
      currentNode.setPosition(startPos[0], startPos[1])
      // writeBuffer + startDrag 交给 OS
      const base64 = await fileToBase64(file)
      const written = await window.fileApi.writeBuffer(file.name, base64)
      const fullPath = await window.fileApi.startDrag(written.fileName)
      setLastDragPath(fullPath)
    }
  }
)

// —— resize handle 拖拽：右下角双向自由调整宽高，不锁比例 ——
const MIN_WIDTH = 220
const MAX_WIDTH = 800
const MIN_HEIGHT = 120
const MAX_HEIGHT = 600

function onResizePointerDown(e: PointerEvent): void {
  const n = node.value
  if (!n) return
  e.stopPropagation()
  e.preventDefault()

  const startClientX = e.clientX
  const startClientY = e.clientY
  const [startWidth, startHeight] = n.box

  function move(ev: PointerEvent): void {
    const cur = node.value
    if (!cur) { end(); return }
    const scale = viewport.scale || 1
    const deltaW = (ev.clientX - startClientX) / scale
    const deltaH = (ev.clientY - startClientY) / scale
    const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + deltaW))
    const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight + deltaH))
    cur.setBox(newWidth, newHeight)
  }
  function end(): void {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
  }

  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', end)
}

/**
 * 点击"新建图片文件节点"按钮：在当前节点旁边新建 ImgFileNode。
 * - writeBuffer 把 File 落盘到画布目录
 * - 新节点位置 = 当前节点 position + [30, 30] 偏移
 */
async function handleCreateImgNode(): Promise<void> {
  const file = previewFile.value
  const currentNode = node.value
  if (!file || !currentNode) return

  const base64 = await fileToBase64(file)
  const written = await window.fileApi.writeBuffer(file.name, base64)

  const [cx, cy] = currentNode.position
  const newNode = new ImgFileNode(
    `${ImgFileNode.TYPE}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  )
  newNode.setPosition(cx + 30, cy + 30)
  newNode.setFile(written.fileName, written.size)
  workspaceScene.addNode(newNode)
}

// —— 图片 objectURL；卸载或 File 变时 revoke 防泄漏 ——
const imageUrl = ref<string | null>(null)
let revokeUrl: (() => void) | null = null

/** 图片天然宽高（像素）；没图或还没 load 时是 null */
const naturalSize = ref<{ w: number; h: number } | null>(null)

/** 释放当前 objectURL */
function clearImage(): void {
  if (revokeUrl) {
    revokeUrl()
    revokeUrl = null
  }
  imageUrl.value = null
  naturalSize.value = null
}

/** 更新 objectURL：File 变时重建 */
watch(previewFile, (file) => {
  clearImage()
  if (file) {
    const url = URL.createObjectURL(file)
    imageUrl.value = url
    revokeUrl = () => URL.revokeObjectURL(url)
  }
}, { immediate: true })

/** img load 后拿到天然宽高 */
function onImgLoad(e: Event): void {
  const img = e.target as HTMLImageElement
  if (img.naturalWidth && img.naturalHeight) {
    naturalSize.value = { w: img.naturalWidth, h: img.naturalHeight }
  }
}

onUnmounted(() => {
  unsubscribe?.()
  clearImage()
})
</script>

<template>
  <div class="preview-card">
    <!-- 头部类型标签：与缩小图片尺寸节点区分；也可拖动移动节点 -->
    <div class="preview-card__header" @pointerdown.stop.prevent="startPreviewDrag">
      <span class="preview-card__header-title">{{ nodeTitle }}</span>
      <button
        class="preview-card__help"
        type="button"
        :title="t('helpTitle')"
        @pointerdown.stop
        @click.stop="showHelp = true"
      >?</button>
    </div>

    <!-- 预览图区域：画布内拖拽 = 移动节点；越界 = writeBuffer + startDrag 导出 -->
    <div class="preview-card__image-area" @pointerdown.stop.prevent="startPreviewDrag" :title="previewFile
      ? t('dragHint')
      : t('needSourceHint')">
      <img v-if="imageUrl" class="preview-card__img" :src="imageUrl" :alt="t('altPreview')" draggable="false" @load="onImgLoad" />
      <!-- 无图占位 -->
      <div v-else class="preview-card__placeholder">
        <svg class="preview-card__icon-svg" viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 6C6 3.79 7.79 2 10 2H38L58 22V66C58 68.21 56.21 70 54 70H10C7.79 70 6 68.21 6 66V6Z"
            fill="#f4f5f7" stroke="#c5cbd4" stroke-width="1.5" />
          <path d="M38 2L58 22H44C41.79 22 40 20.21 40 18V2Z" fill="#eef3ff" stroke="#c5cbd4" stroke-width="1.5" />
          <path d="M16 50L26 40L34 48L44 34L52 50H16Z" fill="#c5d4ff" stroke="#4a7cff" stroke-width="1.5"
            stroke-linejoin="round" />
          <circle cx="44" cy="28" r="4" fill="#4a7cff" />
        </svg>
        <span class="preview-card__placeholder-text">{{ t('waitingInput') }}</span>
      </div>
    </div>

    <!-- 底部信息栏：尺寸 / 大小 / 格式（上行）+ "新建图片文件节点" 按钮（下行） -->
    <div class="preview-card__footer" v-if="previewFile">
      <div class="preview-card__stats">
        <span v-if="naturalSize" class="preview-card__stat">
          {{ naturalSize.w }}×{{ naturalSize.h }}px
        </span>
        <span v-else class="preview-card__stat preview-card__stat--empty">{{ t('loading') }}</span>
        <span class="preview-card__stat">{{ sizeText }}</span>
        <span class="preview-card__stat preview-card__stat--format">{{ formatText }}</span>
      </div>

      <button class="preview-card__create-btn" type="button" @click="handleCreateImgNode" :title="t('createNodeHint')">
        {{ t('createNode') }}
      </button>
    </div>

    <!-- resize handle：右下角，拖拽改宽度（保持图片区 16:10 比例） -->
    <div class="preview-card__resize-handle" @pointerdown.stop.prevent="onResizePointerDown" :title="t('resizeHint')" />
  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
    <ImagePreviewHelpDialog />
  </HelpDialog>
</template>

<style scoped lang="less">
.preview-card {
  box-sizing: border-box; // box 是内容区外包壳宽，border+padding 算在 box 内
  width: 100%; // 填满 NodeShell 的 .node-content（由 node.box 硬约束定宽高）
  height: 100%;
  overflow: auto; // 底部信息栏出现时超出 box 可滚
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  background: @color-surface;
  border: 1px solid #d5d9e0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  user-select: none;

  &__header {
    flex-shrink: 1;
    min-height: 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    margin: 6px 6px 0 6px;
    padding-bottom: 2px;
    border-bottom: 1px dashed #d5d9e0;
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  &__header-title {
    font-size: 11px;
    font-weight: 600;
    color: #4a7cff;
    letter-spacing: 0.5px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &__help {
    all: unset;
    cursor: pointer;
    flex-shrink: 0;
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

  &__image-area {
    width: 100%;
    flex: 1 1 auto; // 随 box 高度自由伸缩，图片按 object-fit: contain 在里面自适应
    min-height: 40px;
    overflow: hidden;
    background: #f4f5f7;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  &__img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    display: block;
    pointer-events: none;
  }

  &__placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    color: @color-text-weak;
  }

  &__icon-svg {
    width: 48px;
    height: 54px;
    display: block;
    flex-shrink: 0;
  }

  &__placeholder-text {
    font-size: 11px;
    color: #9aa1ad;
    font-style: italic;
  }

  // 纵向排布：尺寸/大小/格式一行在上，按钮在下（节点窄，横排会挤）
  &__footer {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 4px 6px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: #fafbfc;
    margin: 6px;
  }

  // 尺寸 / 大小 / 格式 一行
  &__stats {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  &__stat {
    font-size: 11px;
    color: #7a828f;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;

    &--empty {
      color: #b6bcc7;
      font-style: italic;
    }

    // 格式做成小徽标，与尺寸/大小区分
    &--format {
      padding: 1px 5px;
      border: 1px solid #b9c8ff;
      border-radius: 3px;
      background: #f4f6ff;
      color: #4a7cff;
      font-weight: 600;
    }
  }

  &__create-btn {
    width: 100%;
    flex-shrink: 0;
    padding: 4px 10px;
    border: 1px solid #4a7cff;
    border-radius: 4px;
    background: #4a7cff;
    color: #fff;
    font-size: 11px;
    line-height: 1.3;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, transform 0.08s ease;

    &:hover {
      background: #3d6ce0;
      border-color: #3d6ce0;
    }

    &:active {
      transform: translateY(1px);
    }
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
}
</style>
