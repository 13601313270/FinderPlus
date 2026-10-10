<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { HumanReviewNode } from './node'
import type { Value } from '../../engine/data/Value'
import { viewport } from '@renderer/canvas/viewport'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'
import { resolveRenderer } from '@renderer/components/valueRenderers'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import HumanReviewHelpDialog from './HumanReviewHelpDialog.vue'
import JsonTreeNode from '@renderer/components/JsonTreeNode.vue'

const props = defineProps<{ id: string }>()

const reviewNode = shallowRef<HumanReviewNode | undefined>(undefined)

// 卡片标题走插件 manifest 的多语言 title，未配当前语言时由 resolveNodeTitle 兜底
const nodeTitle = useNodeTitle(() => reviewNode.value, '?')

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)

// 帮助浮层开关（弹窗壳由 HelpDialog 负责）
const showHelp = ref(false)

// 全屏弹窗开关
const showFullscreen = ref(false)

// 拒绝理由对话框
const showRejectDialog = ref(false)
const rejectReasonInput = ref('')

// —— 从节点同步到渲染层的状态 ——
const currentLabel = ref('')
const pendingCount = ref(0)
const hasCurrent = ref(false)

/** 当前审核项的 Value 实例（传给 renderer 组件当 prop，renderer 靠 instance.constructor.VALUE_NAME 分发） */
const currentValue = ref<Value | undefined>(undefined)
/** 当前审核项的 kind（即 VALUE_NAME，字符串，便于模板做 === 判断） */
const currentKind = ref<string>('')

// —— 全屏弹窗专用（renderer 组件 detail 模式只有缩略图/预览，全屏需要自己控制大图/完整文本） ——
const fsImageUrl = ref<string | null>(null)
let fsRevokeUrl: (() => void) | null = null
const fsTextContent = ref<string>('')

/** 从 currentValue 取 File（img-file / txt-file / file / pdf-file 通用） */
const fsFile = computed<File | undefined>(() => {
  const cv = currentValue.value as { file?: File } | undefined
  return cv?.file
})

/** 从 currentValue 取 JsonValue 的 value 字段 */
const fsJsonContent = computed<unknown>(() => {
  const cv = currentValue.value as { value?: unknown } | undefined
  return cv?.value
})

/** 字节数 → 可读体积 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

/** 释放全屏图片 objectURL */
function clearFsImage(): void {
  if (fsRevokeUrl) {
    fsRevokeUrl()
    fsRevokeUrl = null
  }
  fsImageUrl.value = null
}

/** File → 文本（Promise） */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

// 无待审核项时 node 侧返回空串，这里兜底成多语言占位文案（读 language，切语言会重算）
const labelText = computed(() => (hasCurrent.value ? currentLabel.value : t('awaitingInput')))

let unsubscribe: (() => void) | undefined

/** 同步节点状态到渲染层：核心只存 currentValue（Value 实例）和 currentKind */
function syncCurrent() {
  const n = reviewNode.value
  if (!n) return
  currentLabel.value = n.currentLabel
  pendingCount.value = n.pendingCount
  hasCurrent.value = n.hasCurrent
  const cv = n.currentValue
  currentValue.value = cv
  currentKind.value = cv ? ((cv.constructor as unknown) as { VALUE_NAME: string }).VALUE_NAME : ''

  // —— 全屏弹窗的定制数据（卡片内 renderer 组件自己管，这里只给全屏用） ——
  clearFsImage()
  fsTextContent.value = ''
  if (cv && currentKind.value === 'img-file') {
    const file = (cv as { file?: File }).file
    if (file) {
      fsImageUrl.value = URL.createObjectURL(file)
      fsRevokeUrl = () => URL.revokeObjectURL(fsImageUrl.value!)
    }
  } else if (cv && currentKind.value === 'txt-file') {
    const file = (cv as { file?: File }).file
    if (file) {
      readFileAsText(file).then((text) => {
        fsTextContent.value = text
      }).catch(() => {
        fsTextContent.value = '(Failed to read file)'
      })
    }
  }
}

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof HumanReviewNode) {
    reviewNode.value = found
    syncCurrent()
    unsubscribe = found.onChanged(syncCurrent)
  }
  document.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  unsubscribe?.()
  clearFsImage()
  document.removeEventListener('keydown', onKeyDown)
})

function onKeyDown(e: KeyboardEvent): void {
  if (showFullscreen.value && e.key === 'Escape') {
    showFullscreen.value = false
  }
}

function onFsMaskClick(): void {
  showFullscreen.value = false
}

function onFsDialogClick(e: MouseEvent): void {
  e.stopPropagation()
}

function onApprove(): void {
  reviewNode.value?.approve()
}

function onReject(): void {
  if (!hasCurrent.value) return
  rejectReasonInput.value = ''
  showRejectDialog.value = true
}

function onRejectConfirm(): void {
  showRejectDialog.value = false
  reviewNode.value?.reject(rejectReasonInput.value)
  rejectReasonInput.value = ''
}

function onRejectCancel(): void {
  showRejectDialog.value = false
  rejectReasonInput.value = ''
}

/**
 * review 区域 wheel 事件：当 JSON 树可滚动时，阻止 wheel 事件冒泡到画布视口（否则滚 JSON 树会同时平移画布）。
 * 逻辑同 JsonDisplayNode 的 onNodeWheel：顶部不能再滚时才允许向上冒泡，底部不能再滚时才允许向下冒泡。
 */
function onReviewWheel(e: WheelEvent): void {
  const el = e.currentTarget as HTMLElement
  const { scrollTop, scrollHeight, clientHeight } = el
  const atTop = scrollTop <= 0
  const atBottom = scrollTop + clientHeight >= scrollHeight

  const scrollingUp = e.deltaY < 0
  const scrollingDown = e.deltaY > 0

  if ((scrollingUp && atTop) || (scrollingDown && atBottom)) return
  e.stopPropagation()
}

// —— resize handle 拖拽 ——
const MIN_WIDTH = 220
const MAX_WIDTH = 600
const MIN_HEIGHT = 180
const MAX_HEIGHT = 500

function onResizePointerDown(e: PointerEvent): void {
  const n = reviewNode.value
  if (!n) return
  e.stopPropagation()
  e.preventDefault()

  const startClientX = e.clientX
  const startClientY = e.clientY
  const [startWidth, startHeight] = n.box

  function move(ev: PointerEvent): void {
    const cur = reviewNode.value
    if (!cur) { end(); return }
    const scale = viewport.scale || 1
    const deltaW = (ev.clientX - startClientX) / scale
    const deltaH = (ev.clientY - startClientY) / scale
    const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(startWidth + deltaW)))
    const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(startHeight + deltaH)))
    cur.setBox(newWidth, newHeight)
  }
  function end(): void {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
  }

  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', end)
}
</script>

<template>
  <div class="node">
    <NodeHeader
      :title="nodeTitle"
      @help="showHelp = true"
    >
      <template #actions>
        <button
          class="node__fs"
          type="button"
          :title="t('fullscreenBtnTitle')"
          :disabled="!hasCurrent"
          @click.stop="showFullscreen = true"
        >⛶</button>
      </template>
    </NodeHeader>

    <div class="review" @wheel="onReviewWheel">
      <div class="review__label">{{ t('reviewLabel') }}</div>

      <!-- 无值 → 占位文案 -->
      <div v-if="!hasCurrent" class="review__value">{{ labelText }}</div>
      <!-- null 值 → 直接显示 (null)，不用 NullValueRenderer（它的 prop 类型要求 { isNull: true } 收窄，模板里做不到） -->
      <div v-else-if="currentValue?.isNull" class="review__value">(null)</div>
      <!-- 有值 → 按 kind 从注册表找 renderer -->
      <component v-else :is="resolveRenderer(currentKind)" :value="currentValue!" context="tooltip" />

      <div class="review__queue" v-if="pendingCount > 0">
        {{ t('queueRemaining', { n: pendingCount }) }}
      </div>
      <div class="review__queue review__queue--empty" v-else>{{ t('queueEmpty') }}</div>
    </div>

    <div class="actions">
      <button
        class="actions__btn actions__btn--approve"
        type="button"
        :disabled="!hasCurrent"
        @click="onApprove"
      >
        {{ t('approve') }}
      </button>
      <button
        class="actions__btn actions__btn--reject"
        type="button"
        :disabled="!hasCurrent"
        @click="onReject"
      >
        {{ t('reject') }}
      </button>
    </div>

    <div
      class="node__resize-handle"
      @pointerdown.stop.prevent="onResizePointerDown"
      title="拖动调整节点大小"
    />
  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
    <HumanReviewHelpDialog />
  </HelpDialog>

  <!-- 全屏审核弹窗 -->
  <Teleport to="body">
    <div v-if="showFullscreen" class="fs-mask" @click="onFsMaskClick">
      <div class="fs-dialog" @click="onFsDialogClick">
        <div class="fs-header">
          <h3 class="fs-title">{{ t('fullscreenTitle') }}</h3>
          <div class="fs-header-info">
            <span v-if="hasCurrent" class="fs-type-badge">{{ currentKind }}</span>
            <span v-if="pendingCount > 0" class="fs-pending">{{ t('queueRemaining', { n: pendingCount }) }}</span>
          </div>
          <button class="fs-close" type="button" @click="showFullscreen = false">×</button>
        </div>

        <div class="fs-body">
          <!-- 无待审核项 -->
          <div v-if="!hasCurrent" class="fs-empty">
            {{ t('fullscreenNoData') }}
          </div>

          <!-- 图片 -->
          <template v-else-if="currentKind === 'img-file'">
            <div class="fs-meta">
              <span>{{ fsFile?.name }}</span>
              <span v-if="fsFile">{{ formatSize(fsFile.size) }}</span>
              <span v-if="fsFile">{{ fsFile.type }}</span>
            </div>
            <div class="fs-image-wrap">
              <img v-if="fsImageUrl" class="fs-image" :src="fsImageUrl" :alt="fsFile?.name" />
            </div>
          </template>

          <!-- JSON -->
          <template v-else-if="currentKind === 'json'">
            <div class="fs-meta">
              <span>{{ currentLabel }}</span>
            </div>
            <div class="fs-json">
              <JsonTreeNode :value="fsJsonContent" :default-expanded="true" />
            </div>
          </template>

          <!-- 文本文件 -->
          <template v-else-if="currentKind === 'txt-file'">
            <div class="fs-meta">
              <span>{{ fsFile?.name }}</span>
              <span v-if="fsFile">{{ formatSize(fsFile.size) }}</span>
            </div>
            <pre class="fs-text">{{ fsTextContent }}</pre>
          </template>

          <!-- 其他文件类（file / pdf-file / img-file-collection 等） -->
          <template v-else-if="['file', 'pdf-file', 'img-file-collection'].includes(currentKind)">
            <div class="fs-meta">
              <span>{{ fsFile?.name ?? currentLabel }}</span>
              <span v-if="fsFile">{{ formatSize(fsFile.size) }}</span>
              <span v-if="fsFile">{{ fsFile.type }}</span>
            </div>
            <div class="fs-file-placeholder">📄 {{ fsFile?.name ?? currentLabel }}</div>
          </template>

          <!-- null 值 -->
          <template v-else-if="currentValue?.isNull">
            <pre class="fs-text fs-text--simple">(null)</pre>
          </template>

          <!-- 简单值（String / Number / Bool）或兜底 UnknownValueRenderer 的内容（直接用 displayLabel） -->
          <template v-else>
            <div class="fs-meta">
              <span>{{ currentKind }}</span>
            </div>
            <pre class="fs-text fs-text--simple">{{ currentLabel }}</pre>
          </template>
        </div>

        <div class="fs-footer">
          <button
            class="fs-btn fs-btn--reject"
            type="button"
            :disabled="!hasCurrent"
            @click="onReject"
          >{{ t('reject') }}</button>
          <button
            class="fs-btn fs-btn--approve"
            type="button"
            :disabled="!hasCurrent"
            @click="onApprove"
          >{{ t('approve') }}</button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 拒绝理由对话框 -->
  <Teleport to="body">
    <div v-if="showRejectDialog" class="fs-mask" @click="onRejectCancel">
      <div class="rd-dialog" @click.stop>
        <div class="rd-header">
          <h3 class="rd-title">{{ t('rejectReasonTitle') }}</h3>
        </div>
        <div class="rd-body">
          <textarea
            class="rd-textarea"
            v-model="rejectReasonInput"
            :placeholder="t('rejectReasonPlaceholder')"
            rows="5"
          ></textarea>
        </div>
        <div class="rd-footer">
          <button class="rd-btn rd-btn--cancel" type="button" @click="onRejectCancel">
            {{ t('rejectReasonCancel') }}
          </button>
          <button class="rd-btn rd-btn--confirm" type="button" @click="onRejectConfirm">
            {{ t('rejectReasonConfirm') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 8px;
  padding-top: 0;
  overflow: hidden;
  position: relative;

  &__header {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px 48px 6px 22px;
    border-bottom: 1px dashed @node-border-color;
    flex-shrink: 0;
  }

  &__header-btns {
    position: absolute;
    right: 2px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    gap: 2px;
  }

  &__handle {
    cursor: grab;
    user-select: none;
    font-size: 12px;
    color: @color-text-weak;
    text-align: center;

    &:active {
      cursor: grabbing;
    }
  }

  &__fs {
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
    font-size: 11px;
    line-height: 1;
    transition: background 0.15s, color 0.15s;

    &:hover:not(:disabled) {
      background: #dbeafe;
      color: #2563eb;
    }

    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
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
  }
}

.review {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  margin-top: 4px;
  border: 1px solid #e5e8ee;
  border-radius: 6px;
  margin-bottom: 8px;
  overflow: auto;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;

  &__label {
    font-size: 11px;
    color: @color-text-weak;
  }

  &__value {
    font-size: 13px;
    color: @color-text;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: inherit;
  }

  &__queue {
    margin-top: 2px;
    font-size: 11px;
    color: #6b7280;

    & strong {
      color: #3b82f6;
    }

    &--empty {
      font-style: italic;
      color: #9aa2ad;
    }
  }
}

.actions {
  display: flex;
  gap: 6px;

  &__btn {
    flex: 1;
    padding: 6px 0;
    border: 1px solid;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    &:not(:disabled):active {
      transform: translateY(1px);
    }

    &--approve {
      background: #22c55e;
      border-color: #16a34a;
      color: #fff;

      &:not(:disabled):hover {
        background: #16a34a;
      }
    }

    &--reject {
      background: #fff;
      border-color: #ef4444;
      color: #ef4444;

      &:not(:disabled):hover {
        background: #fef2f2;
      }
    }
  }
}
</style>

<!-- 全屏审核弹窗样式：非 scoped，因为 Teleport 到 body -->
<style lang="less">
.fs-mask {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fsFadeIn 0.15s ease;
}

.fs-dialog {
  width: 90vw;
  height: 90vh;
  max-width: 1400px;
  max-height: 900px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  animation: fsPopIn 0.2s ease;
  overflow: hidden;
  user-select: text;
}

.fs-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #fafbfc;
}

.fs-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.fs-header-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.fs-type-badge {
  padding: 2px 10px;
  border-radius: 12px;
  background: #eef3ff;
  color: #4a7cff;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.fs-pending {
  font-size: 12px;
  color: #6b7280;
}

.fs-close {
  all: unset;
  cursor: pointer;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: #9ca3af;
  font-size: 22px;
  line-height: 1;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: #f3f4f6;
    color: #374151;
  }
}

.fs-body {
  flex: 1;
  overflow: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fs-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 8px 14px;
  background: #f3f4f6;
  border-radius: 6px;
  font-size: 12px;
  color: #6b7280;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;

  span {
    white-space: nowrap;
  }
}

.fs-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9aa2ad;
  font-size: 15px;
  font-style: italic;
}

.fs-image-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f4f5f7;
  border-radius: 8px;
  min-height: 200px;
  overflow: auto;
}

.fs-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
}

.fs-json {
  flex: 1;
  overflow: auto;
  padding: 14px 16px;
  background: #fafbfc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.fs-text {
  flex: 1;
  overflow: auto;
  padding: 16px 18px;
  background: #1e1e1e;
  border-radius: 8px;
  color: #e0e0e0;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;

  &.fs-text--simple {
    background: #fafbfc;
    color: #1a1a1a;
    border: 1px solid #e5e7eb;
    white-space: pre-wrap;
  }
}

.fs-file-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border-radius: 8px;
  color: #6b7280;
  font-size: 14px;
  gap: 8px;
}

.fs-footer {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 14px 20px;
  border-top: 1px solid #e5e7eb;
  background: #fafbfc;
}

.fs-btn {
  padding: 10px 28px;
  border: 1px solid;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  min-width: 100px;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:not(:disabled):active {
    transform: translateY(1px);
  }
}

.fs-btn--approve {
  background: #22c55e;
  border-color: #16a34a;
  color: #fff;

  &:not(:disabled):hover {
    background: #16a34a;
  }
}

.fs-btn--reject {
  background: #fff;
  border-color: #ef4444;
  color: #ef4444;

  &:not(:disabled):hover {
    background: #fef2f2;
  }
}

@keyframes fsFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fsPopIn {
  from { opacity: 0; transform: translateY(-12px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* 拒绝理由对话框样式 */
.rd-dialog {
  width: 480px;
  max-width: 90vw;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  animation: fsPopIn 0.2s ease;
  overflow: hidden;
}

.rd-header {
  flex-shrink: 0;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #fafbfc;
}

.rd-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.rd-body {
  flex: 1;
  padding: 20px;
}

.rd-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
  font-family: inherit;
  resize: vertical;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;

  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  }
}

.rd-footer {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid #e5e7eb;
  background: #fafbfc;
}

.rd-btn {
  padding: 8px 22px;
  border: 1px solid;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  min-width: 80px;

  &:not(:disabled):active {
    transform: translateY(1px);
  }
}

.rd-btn--cancel {
  background: #fff;
  border-color: #d1d5db;
  color: #374151;

  &:not(:disabled):hover {
    background: #f3f4f6;
  }
}

.rd-btn--confirm {
  background: #ef4444;
  border-color: #dc2626;
  color: #fff;

  &:not(:disabled):hover {
    background: #dc2626;
  }
}
</style>
