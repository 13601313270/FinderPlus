<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { BackgroundRemoveNode } from './node'
import { ImgFileNode } from '../ImgFileNode/node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import BackgroundRemoveHelpDialog from './BackgroundRemoveHelpDialog.vue'
import { removeBackground } from '@imgly/background-removal'

// 卡片头部标题走插件 manifest 的多语言 title，未配当前语言时由 resolveNodeTitle 兜底
const nodeTitle = useNodeTitle(BackgroundRemoveNode.TYPE)

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)

const props = defineProps<{ id: string }>()

const node = computed(() => {
  const n = workspaceScene.getNode(props.id)
  return n instanceof BackgroundRemoveNode ? n : undefined
})

// —— 拖拽：抠图节点自身也参与画布移动 ——
const { startDrag } = useNodePosition(() => node.value)

// —— 帮助浮层开关（弹窗壳由 HelpDialog 负责）——
const showHelp = ref(false)

// —— 抠图结果预览（objectURL）；卸载或结果变时 revoke 防泄漏 ——
const resultUrl = ref<string | null>(null)
let revokeUrl: (() => void) | null = null

function clearResult(): void {
  if (revokeUrl) {
    revokeUrl()
    revokeUrl = null
  }
  resultUrl.value = null
}

/** 从 node.imageOutput 当前值刷预览图 */
function refreshResult(n: BackgroundRemoveNode | undefined): void {
  clearResult()
  if (!n) return
  const value = n.imageOutput.value
  if (value instanceof ImgFileValue) {
    const url = URL.createObjectURL(value.file)
    resultUrl.value = url
    revokeUrl = () => URL.revokeObjectURL(url)
  }
}

// —— 处理中状态 ——
const processing = ref(false)
// 下载/推理进度文案：缓存「key + 参数」而非成品字符串，
// 这样切语言时 computed 会用当前语言重新解析，文案不会停留在旧语言
const progressState = ref<{ key: keyof typeof messages; params?: { pct: number } } | null>(null)
const progressText = computed(() =>
  progressState.value ? t(progressState.value.key, progressState.value.params) : null
)

/**
 * 执行一次抠图：File → removeBackground → Blob → node.setOutput。
 * 同时支持两种触发路径：端口输入（响应式）和拖入节点（一次性）。
 */
async function runRemoveBg(n: BackgroundRemoveNode, file: File): Promise<void> {
  processing.value = true
  progressState.value = { key: 'preparing' }

  try {
    const blob = await removeBackground(file, {
      model: 'isnet_fp16',
      device: 'gpu',
      output: { format: 'image/png' },
      progress: (_key: string, current: number, total: number) => {
        const pct = Math.round((current / total) * 100)
        progressState.value = { key: 'processing', params: { pct } }
      }
    })

    const dot = file.name.lastIndexOf('.')
    const baseName = dot > 0 ? file.name.slice(0, dot) : file.name
    const fileName = `${baseName}-nobg.png`

    n.setOutput(blob, fileName)
    progressState.value = null
  } catch (err) {
    console.warn('[BackgroundRemoveNode] 抠图失败：', err)
    progressState.value = { key: 'failed' }
  } finally {
    processing.value = false
  }
}

/**
 * 检查是否需要抠图：读 processSource 判断有无可用源，再用 fingerprint 去重。
 */
function handleRemove(n: BackgroundRemoveNode | undefined): void {
  if (!n || processing.value) return
  const src = n.processSource
  if (!src) return

  const isPending = n.pendingSource !== undefined // 拖入路径有触发信号
  const fpChanged = src.fingerprint !== n.lastProcessedFp

  // 去重：源文件没变 + 不是拖入触发 → 跳过
  if (!fpChanged && !isPending) return

  void runRemoveBg(n, src.file).finally(() => {
    n.markProcessed(src.fingerprint)
    // 拖入路径处理完清信号（端口路径不清，保持响应式）
    if (isPending) n.clearPending()
  })
}

// —— 订阅 node.onChanged：结果刷新 + 收到触发信号（拖入或端口值变）触发抠图 ——
let unsubscribe: (() => void) | undefined
watch(
  node,
  (n) => {
    unsubscribe?.()
    unsubscribe = n?.onChanged(() => {
      refreshResult(n)
      handleRemove(n)
    })
    refreshResult(n)
    handleRemove(n)
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

/**
 * 点击「生成图片文件节点」：以抠图结果为基础新建一个 ImgFileNode。
 */
async function handleCreateImgNode(): Promise<void> {
  const currentNode = node.value
  if (!currentNode) return
  const value = currentNode.imageOutput.value
  const file = value instanceof ImgFileValue ? value.file : undefined
  if (!file) return

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

onUnmounted(() => {
  unsubscribe?.()
  clearResult()
})
</script>

<template>
  <div class="remove-bg-card" @pointerdown="startDrag"
    :title="t('dragHint')">
    <!-- 头部类型标签 -->
    <div class="remove-bg-card__header">
      <span class="remove-bg-card__header-title">{{ nodeTitle }}</span>
      <button class="remove-bg-card__help" type="button" :title="t('helpTitle')" @pointerdown.stop
        @click.stop="showHelp = true">?</button>
    </div>

    <!-- 抠图结果预览区 -->
    <div class="remove-bg-card__image-area">
      <img v-if="resultUrl" class="remove-bg-card__img" :src="resultUrl" :alt="t('resultAlt')"
        draggable="false" />
      <!-- 处理中占位 -->
      <div v-else-if="processing" class="remove-bg-card__placeholder">
        <div class="remove-bg-card__spinner"></div>
        <span class="remove-bg-card__placeholder-text">{{ progressText || t('processingFallback') }}</span>
      </div>
      <!-- 无结果占位 -->
      <div v-else class="remove-bg-card__placeholder">
        <svg class="remove-bg-card__icon-svg" viewBox="0 0 64 64" fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="10" width="48" height="44" rx="6" fill="#f4f5f7" stroke="#c5cbd4"
            stroke-width="1.5" />
          <path d="M14 46L26 34L34 42L44 30L52 46H14Z" fill="#ffe0c0" stroke="#ff8c42" stroke-width="1.5"
            stroke-linejoin="round" />
          <circle cx="40" cy="20" r="4" fill="#ff8c42" />
          <!-- 斜线表示抠掉背景 -->
          <line x1="14" y1="14" x2="50" y2="50" stroke="#e74c3c" stroke-width="2.5" stroke-linecap="round" />
        </svg>
        <span class="remove-bg-card__placeholder-text">{{ t('emptyPlaceholder') }}</span>
      </div>
    </div>

    <!-- 底部信息栏 -->
    <div class="remove-bg-card__footer">
      <span v-if="processing" class="remove-bg-card__hint remove-bg-card__hint--processing">
        {{ progressText }}
      </span>
      <span v-else-if="resultUrl" class="remove-bg-card__hint remove-bg-card__hint--active">
        {{ t('done') }}
      </span>
      <span v-else class="remove-bg-card__hint">{{ t('hint') }}</span>
      <button v-if="resultUrl && !processing" class="remove-bg-card__create-btn" type="button"
        @pointerdown.stop @click="handleCreateImgNode" :title="t('createNodeHint')">
        {{ t('createNode') }}
      </button>
    </div>
  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
    <BackgroundRemoveHelpDialog />
  </HelpDialog>
</template>

<style scoped lang="less">
.remove-bg-card {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  padding: 10px;
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
    padding-bottom: 2px;
    border-bottom: 1px dashed #d5d9e0;
  }

  &__header-title {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: 11px;
    font-weight: 600;
    color: #ff8c42;
    letter-spacing: 0.5px;
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
    aspect-ratio: 16 / 10;
    border-radius: 6px;
    overflow: hidden;
    background:
      linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
      linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
      linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
    background-size: 16px 16px;
    background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
    background-color: #fafbfc;
    border: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
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

  &__spinner {
    width: 28px;
    height: 28px;
    border: 3px solid #e5e7eb;
    border-top-color: #ff8c42;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  &__icon-svg {
    width: 40px;
    height: 40px;
    display: block;
    flex-shrink: 0;
  }

  &__placeholder-text {
    font-size: 11px;
    color: #9aa1ad;
    font-style: italic;
  }

  &__footer {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: #fafbfc;
  }

  &__hint {
    flex: 1;
    font-size: 11px;
    color: #7a828f;
    text-align: left;
    line-height: 1.4;

    &--active {
      color: #2d6a3f;
    }

    &--processing {
      color: #ff8c42;
    }
  }

  &__create-btn {
    flex-shrink: 0;
    padding: 4px 10px;
    border: 1px solid #ff8c42;
    border-radius: 4px;
    background: #ff8c42;
    color: #fff;
    font-size: 11px;
    line-height: 1.3;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, transform 0.08s ease;

    &:hover {
      background: #e67d3a;
      border-color: #e67d3a;
    }

    &:active {
      transform: translateY(1px);
    }
  }
}
</style>
