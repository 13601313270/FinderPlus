<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { FileValue } from '../../engine/data/FileValue'
import { AnyFileNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useFileDragOut } from '@renderer/composables/useFileDragOut'
import { useFileOpenInSystem } from '@renderer/composables/useFileOpenInSystem'

const props = defineProps<{ id: string }>()

const fileNode = computed(() => {
  const node = workspaceScene.getNode(props.id)
  return node instanceof AnyFileNode ? node : undefined
})

// —— 拖拽：窗口内移动（useNodePosition）+ 拖出外部（useFileDragOut）——
const { dragOutOpts, cleanup: cleanupDragOut } = useFileDragOut(() => fileNode.value)
const { startDrag } = useNodePosition(() => fileNode.value, dragOutOpts)

// —— 双击图标：用系统默认应用打开文件 ——
const { openInSystem } = useFileOpenInSystem()

// —— 文件名 / 文件大小 的 Vue 响应式包装 ——
const fileName = ref('')
const fileSize = ref(0)

let unsubscribe: (() => void) | undefined
watch(
  fileNode,
  (n) => {
    unsubscribe?.()
    unsubscribe = n?.onChanged(() => {
      fileName.value = n.fileName
      fileSize.value = n.fileSize
    })
    if (n) {
      fileName.value = n.fileName
      fileSize.value = n.fileSize
    } else {
      fileName.value = ''
      fileSize.value = 0
    }
  },
  { immediate: true, flush: 'sync' }
)

onUnmounted(() => {
  unsubscribe?.()
  cleanupDragOut()
})

/** base64 → Uint8Array（显式用 ArrayBuffer 构造，规避新版 TS 的 ArrayBufferLike 泛型差异） */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const len = binary.length
  const bytes = new Uint8Array(new ArrayBuffer(len))
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** 计算 SHA-256 hex 摘要（用 Web Crypto API） */
async function sha256Hex(bytes: Uint8Array): Promise<string> {
  // 新版 TS 的 Uint8Array 泛型与旧 DOM BufferSource 定义不兼容，强转
  const buf = await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource)
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/** 文件后缀 → 推测 MIME（无后缀返回空串，File 构造时可省略） */
function guessMime(name: string): string {
  const map: Record<string, string> = {
    '.pdf': 'application/pdf', '.zip': 'application/zip',
    '.json': 'application/json', '.xml': 'application/xml',
    '.html': 'text/html', '.htm': 'text/html',
    '.css': 'text/css', '.md': 'text/markdown',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
    '.mp4': 'video/mp4', '.mov': 'video/quicktime',
    '.txt': 'text/plain', '.csv': 'text/csv',
  }
  const lastDot = name.lastIndexOf('.')
  if (lastDot < 0) return ''
  return map[name.slice(lastDot).toLowerCase()] ?? ''
}

/** 读取文件字节、构造 FileValue 并 commit 到 fileOutput */
async function commitFileValue(node: AnyFileNode): Promise<void> {
  try {
    const base64 = await window.fileApi.readBinary(node.fileName)
    const bytes = base64ToBytes(base64)
    const hash = await sha256Hex(bytes)
    const mime = guessMime(node.fileName)
    // 新版 TS 的 Uint8Array 泛型与旧 DOM BlobPart 定义不兼容，强转
    const file = new File([bytes as unknown as BlobPart], node.fileName, mime ? { type: mime } : undefined)
    node.fileOutput.commit(new FileValue(file, hash))
  } catch { /* 文件可能已被用户删了，静默忽略 */ }
}

// 挂载时：如果已有 fileName（拖拽进来的 / 持久化恢复的），读内容 commit FileValue
onMounted(async () => {
  const node = fileNode.value
  if (node?.fileName) {
    await commitFileValue(node)
  }
})

/** 格式化文件大小 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

/** 从文件名提取后缀缩写（如 'report.pdf' → 'PDF'，无后缀 → 'FILE'） */
function extLabel(name: string): string {
  if (!name) return 'FILE'
  const lastDot = name.lastIndexOf('.')
  if (lastDot <= 0 || lastDot === name.length - 1) return 'FILE'
  return name.slice(lastDot + 1).toUpperCase()
}

const fileExt = computed(() => extLabel(fileName.value))
</script>

<template>
  <div
    class="file-card"
    @pointerdown="startDrag"
    @dblclick="openInSystem(fileNode?.fileName)"
    :title="fileNode?.fileName
      ? '拖动节点 · 拖出窗口移动文件 · 双击用系统默认应用打开'
      : '拖动节点（未选文件）'"
  >
    <!-- 图标区：像系统文件图标一样，上面有个折角小三角 -->
    <div class="file-card__icon">
      <svg class="file-card__icon-svg" viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- 文件主体 -->
        <path
          d="M6 6C6 3.79 7.79 2 10 2H38L58 22V66C58 68.21 56.21 70 54 70H10C7.79 70 6 68.21 6 66V6Z"
          fill="#fff"
          stroke="#c5cbd4"
          stroke-width="1.5"
        />
        <!-- 折角三角 -->
        <path d="M38 2L58 22H44C41.79 22 40 20.21 40 18V2Z" fill="#eef3ff" stroke="#c5cbd4" stroke-width="1.5" />
        <!-- 类型标签（动态显示文件后缀缩写） -->
        <text x="32" y="52" text-anchor="middle" font-size="10" font-weight="600" fill="#8a6fff" font-family="Helvetica, Arial, sans-serif">
          {{ fileExt }}
        </text>
      </svg>
    </div>

    <!-- 文件名 -->
    <div class="file-card__name-row">
      <span v-if="fileName" class="file-card__name" :title="fileName">
        {{ fileName }}
      </span>
      <span v-else class="file-card__name file-card__name--empty">未选择文件</span>
      <span v-if="fileSize" class="file-card__size">
        {{ formatSize(fileSize) }}
      </span>
    </div>

  </div>
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
  background: @color-surface;
  border: 1px solid #d5d9e0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  cursor: grab;
  user-select: none;
  &:active { cursor: grabbing; }

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
}
</style>
