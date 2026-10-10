<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { debounce } from 'lodash-es'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { TextInputNode } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { viewport } from '@renderer/canvas/viewport'
import { messages } from './i18n'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import TextInputHelpDialog from './TextInputHelpDialog.vue'

/**
 * 文本输入节点的渲染组件（只画卡片内容）。
 *
 * 定位、两侧端口这些所有节点共用的东西由 NodeShell 兜底，这里不碰：
 * - 卡片不再自己 `position: absolute`，直接填满外壳；
 * - 端口圆点由 NodeShell 里的 <NodePorts> 统一画，不必每个 render.vue 再放一份。
 *
 * id 指明它控制场景里的哪个节点；引擎是纯逻辑，渲染进程能直接握住同一份
 * Scene 单例，所以这里用 workspaceScene.getNode(id) 取活引用，不用走 IPC。
 * 节点不在场景里（id 对不上或已被删）时退化为禁用输入框。
 *
 * 永远是多行 textarea；尺寸由右下角 handle 拖拽调整。
 */
const props = defineProps<{ id: string }>()

const inputNode = computed(() => {
  const node = workspaceScene.getNode(props.id)
  return node instanceof TextInputNode ? node : undefined
})

// 卡片标题走插件 manifest 的多语言 title，未配当前语言时由 resolveNodeTitle 兜底
const nodeTitle = useNodeTitle(() => inputNode.value, '?')

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)

/**
 * 引擎字段是普通类字段，Vue 追踪不到，所以走 Node.onChanged 这条桥刷进本地 ref。
 */
const textValue = ref('')
/** 自动发送开关状态（同步自节点） */
const autoSend = ref(false)

// 帮助浮层开关（弹窗壳由 HelpDialog 负责）
const showHelp = ref(false)

// 大窗口编辑弹窗开关
const showEdit = ref(false)

// —— 虚拟滚动条相关状态 ——
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const contentScrollTop = ref(0)
const contentScrollHeight = ref(0)
const contentClientHeight = ref(0)

/** 内容是否可滚动（有溢出才显示滚动条） */
const isScrollable = () => contentScrollHeight.value > contentClientHeight.value + 1

/** 刷新滚动指标：scrollTop/scrollHeight/clientHeight */
function updateScrollMetrics(): void {
  const el = textareaRef.value
  if (!el) return
  contentScrollTop.value = el.scrollTop
  contentScrollHeight.value = el.scrollHeight
  contentClientHeight.value = el.clientHeight
}

// —— ResizeObserver：尺寸变化时更新滚动指标 ——
let resizeObserver: ResizeObserver | undefined

// —— 虚拟滚动条拖动 ——
let scrollDragActive = false
let scrollDragStartY = 0
let scrollDragStartTop = 0

function onThumbPointerDown(e: PointerEvent): void {
  e.stopPropagation()
  e.preventDefault()
  if (!textareaRef.value) return

  scrollDragActive = true
  scrollDragStartY = e.clientY
  scrollDragStartTop = textareaRef.value.scrollTop

  window.addEventListener('pointermove', onScrollThumbMove)
  window.addEventListener('pointerup', onScrollThumbEnd)
}

/** track 的实际高度（留出上下各 2px 的呼吸空间） */
function trackHeightPx(): number {
  return Math.max(0, contentClientHeight.value - 4)
}

function onScrollThumbMove(e: PointerEvent): void {
  if (!scrollDragActive || !textareaRef.value) return
  const el = textareaRef.value

  const scale = viewport.scale || 1
  const fullScroll = contentScrollHeight.value - contentClientHeight.value
  const thumbHeightPx = thumbHeight()

  const trackUsable = trackHeightPx() - thumbHeightPx
  if (trackUsable <= 0) return
  const ratio = fullScroll / trackUsable

  const delta = (e.clientY - scrollDragStartY) / scale
  el.scrollTop = Math.max(0, Math.min(fullScroll, scrollDragStartTop + delta * ratio))
  updateScrollMetrics()
}

function onScrollThumbEnd(): void {
  scrollDragActive = false
  window.removeEventListener('pointermove', onScrollThumbMove)
  window.removeEventListener('pointerup', onScrollThumbEnd)
}

/** 滚动条 thumb 的像素高度（映射到 track 高度） */
function thumbHeight(): number {
  if (contentScrollHeight.value <= 0 || contentClientHeight.value <= 0) return 0
  const ratio = contentClientHeight.value / contentScrollHeight.value
  const min = 20
  return Math.max(min, trackHeightPx() * ratio)
}

/** 滚动条 thumb 的 top 偏移（映射滚动比例） */
function thumbTop(): number {
  const fullScroll = contentScrollHeight.value - contentClientHeight.value
  if (fullScroll <= 0) return 0
  const trackUsable = trackHeightPx() - thumbHeight()
  return (contentScrollTop.value / fullScroll) * trackUsable
}

let offChanged: (() => void) | undefined

/**
 * 自动发送：停止输入 500ms 后把草稿 commit 到输出端口。
 * 只在开关打开时被 onInput 触发；组件卸载时 cancel 掉定时器。
 */
const debouncedSend = debounce(() => {
  inputNode.value?.commitText()
}, 500)

onMounted(() => {
  const node = inputNode.value
  if (!node) return
  textValue.value = node.text
  autoSend.value = node.isAutoSend
  offChanged = node.onChanged(() => {
    textValue.value = node.text
    autoSend.value = node.isAutoSend
  })

  // 虚拟滚动条：绑定 scroll 监听 + ResizeObserver，刷新滚动指标
  nextTick(() => {
    const el = textareaRef.value
    if (!el) return
    el.addEventListener('scroll', updateScrollMetrics, { passive: true })
    resizeObserver = new ResizeObserver(updateScrollMetrics)
    resizeObserver.observe(el)
    updateScrollMetrics()
  })
})

// 文本变了（内容变长/变短）也要刷新滚动指标
watch(textValue, () => {
  nextTick(updateScrollMetrics)
})

onUnmounted(() => {
  offChanged?.()
  debouncedSend.cancel()
  resizeObserver?.disconnect()
  textareaRef.value?.removeEventListener('scroll', updateScrollMetrics)
  onScrollThumbEnd()
})


/** 输入框敲字 → 更新草稿；开着自动发送时排一次防抖提交 */
function onInput(e: Event): void {
  const target = e.target as HTMLTextAreaElement
  inputNode.value?.setText(target.value)
  if (autoSend.value) debouncedSend()
}

/** 发送按钮 / 快捷键 → 立刻把草稿 commit 到输出端口 */
function onSend(): void {
  debouncedSend.cancel()
  inputNode.value?.commitText(true)
}

/** 自动发送开关 → 写回节点（关闭时取消可能已排队的自动提交） */
function onAutoSendToggle(e: Event): void {
  const target = e.target as HTMLInputElement
  if (target.checked === autoSend.value) return
  debouncedSend.cancel()
  inputNode.value?.toggleAutoSend()
}

/** 快捷键：Ctrl/Cmd+Enter 发送，单独 Enter 换行 */
function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    onSend()
  }
}

// —— 大窗口编辑弹窗相关 ——
const editTextareaRef = ref<HTMLTextAreaElement | null>(null)

/** 弹窗里的 textarea 快捷键：Ctrl/Cmd+Enter 发送并关闭 */
function onEditKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    onSend()
    showEdit.value = false
  }
}

/** 弹窗底部发送按钮：发送后关闭弹窗 */
function onSendAndClose(): void {
  onSend()
  showEdit.value = false
}

/** 弹窗打开后自动 focus textarea，方便立刻输入 */
watch(showEdit, (val) => {
  if (!val) return
  nextTick(() => editTextareaRef.value?.focus())
})

// —— 右下角拖拽调整尺寸 ——
let resizing = false
let resizeStartX = 0
let resizeStartY = 0
let resizeStartW = 0
let resizeStartH = 0

function onResizeStart(e: PointerEvent): void {
  if (!inputNode.value) return
  e.stopPropagation()
  e.preventDefault()
  resizing = true
  resizeStartX = e.clientX
  resizeStartY = e.clientY
  const [w, h] = inputNode.value.displayBox
  resizeStartW = w
  resizeStartH = h
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  window.addEventListener('pointermove', onResizeMove)
  window.addEventListener('pointerup', onResizeEnd)
}

function onResizeMove(e: PointerEvent): void {
  if (!resizing || !inputNode.value) return
  const scale = viewport.scale || 1
  const dw = (e.clientX - resizeStartX) / scale
  const dh = (e.clientY - resizeStartY) / scale
  inputNode.value.resizeBox(resizeStartW + dw, resizeStartH + dh)
}

function onResizeEnd(): void {
  resizing = false
  window.removeEventListener('pointermove', onResizeMove)
  window.removeEventListener('pointerup', onResizeEnd)
}
</script>

<template>
  <div class="node">
    <NodeHeader :title="nodeTitle" @help="showHelp = true">
      <template #actions>
        <button
          class="node__edit-btn"
          type="button"
          :title="t('editHint')"
          @pointerdown.stop
          @click.stop="showEdit = true"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </template>
    </NodeHeader>
    <div class="render-input-container">
      <textarea
        ref="textareaRef"
        class="render-input"
        :value="textValue"
        :disabled="!inputNode"
        :placeholder="inputNode ? t('placeholderMultiline') : t('nodeMissing')"
        @input="onInput"
        @keydown="onKeydown"
      />
      <!-- 虚拟滚动条：只在有溢出时显示，thumb 可拖动 -->
      <div
        v-if="isScrollable()"
        class="virtual-scroll-track"
      >
        <div
          class="virtual-scroll-thumb"
          :style="{ height: thumbHeight() + 'px', transform: 'translateY(' + thumbTop() + 'px)' }"
          @pointerdown.stop.prevent="onThumbPointerDown"
        />
      </div>
    </div>
    <div class="node__footer">
      <label class="node__switch" :title="autoSend ? t('autoSendOn') : t('autoSendOff')">
        <span class="node__switch-label">{{ t('autoSend') }}</span>
        <input
          class="node__switch-input"
          type="checkbox"
          :checked="autoSend"
          :disabled="!inputNode"
          @change="onAutoSendToggle"
        />
        <span class="node__switch-track"><span class="node__switch-thumb" /></span>
      </label>
      <button
        class="node__send"
        type="button"
        :disabled="!inputNode || autoSend"
        :title="autoSend ? t('autoSendDisabled') : t('sendHint')"
        @click="onSend"
      >
        {{ t('send') }}
      </button>
    </div>

    <!-- 右下角拖拽调整尺寸 handle -->
    <div
      class="node__resize-handle"
      title="拖拽调整尺寸"
      @pointerdown="onResizeStart"
    />
  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
    <TextInputHelpDialog />
  </HelpDialog>

  <!-- 大窗口编辑：width 90vw，内部 textarea 原生可滚 -->
  <HelpDialog :visible="showEdit" :title="t('editDialogTitle')" width="90vw" @close="showEdit = false">
    <div class="edit-dialog-body">
      <textarea
        class="edit-textarea"
        :value="textValue"
        :disabled="!inputNode"
        :placeholder="inputNode ? t('placeholderMultiline') : t('nodeMissing')"
        @input="onInput"
        @keydown="onEditKeydown"
        ref="editTextareaRef"
      />
      <div class="edit-dialog-footer">
        <span class="edit-dialog-hint">Ctrl/Cmd + Enter 发送并关闭</span>
        <button
          class="node__send"
          type="button"
          :disabled="!inputNode || autoSend"
          :title="autoSend ? t('autoSendDisabled') : t('sendHint')"
          @click="onSendAndClose"
        >{{ t('send') }}</button>
      </div>
    </div>
  </HelpDialog>
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box; // box 是内容区外包壳宽，border+padding 算在 box 内
  width: 100%; // 填满 NodeShell 的 .node-content（由 node.box 硬约束定宽高）
  height: 100%;
  overflow: hidden; // 外层不滚，滚动能力在内部 textarea 里
  position: relative; // 给 resize handle 当定位锚点
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  padding-top: 0;

  &__edit-btn {
    all: unset;
    align-self: center;
    flex-shrink: 0;
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
    transition: background 0.15s ease, color 0.15s ease;

    svg {
      width: 12px;
      height: 12px;
    }

    &:hover {
      background: #dbeafe;
      color: #2563eb;
    }
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-shrink: 0;
  }

  &__switch {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    user-select: none;
    flex-shrink: 0;

    &-label {
      font-size: 11px;
      color: @color-text-weak;
    }

    &-input {
      position: absolute;
      width: 0;
      height: 0;
      opacity: 0;
      pointer-events: none;
    }

    &-track {
      position: relative;
      width: 28px;
      height: 16px;
      border-radius: 8px;
      background: #cbd5e1;
      transition: background 0.15s;
      flex-shrink: 0;
    }

    &-thumb {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #fff;
      transition: transform 0.15s;
    }
  }

  &__send {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 16px;
    font-size: 13px;
    font-weight: 500;
    color: #fff;
    background: #3b82f6;
    border-radius: 6px;
    white-space: nowrap;
    transition: background 0.15s;
    height: 28px;

    &:hover:not(:disabled) {
      background: #2563eb;
    }

    &:active:not(:disabled) {
      background: #1d4ed8;
    }

    &:disabled {
      cursor: not-allowed;
      background: #93c5fd;
    }
  }
}

// 开关选中态：轨道变蓝、滑块右移
.node__switch-input:checked + .node__switch-track {
  background: @color-primary;
}

.node__switch-input:checked + .node__switch-track .node__switch-thumb {
  transform: translateX(12px);
}

.node__switch-input:disabled + .node__switch-track {
  opacity: 0.5;
}

// 外层容器：position relative 用来锚定绝对定位的虚拟滚动条
.render-input-container {
  position: relative;
  flex: 1;
  min-height: 0; // flex 子项允许收缩，否则 overflow 不生效
}

.render-input {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  padding-right: 12px; // 给滚动条留一点呼吸空间
  border: 1px solid @node-border-color;
  border-radius: 6px;
  font-size: 14px;
  resize: none; // 原生 resize 关掉，由右下角 handle 统一管理
  font-family: inherit;
  overflow-y: hidden;
  // 隐藏原生滚动条，保留滚动功能
  scrollbar-width: none;          // Firefox
  &::-webkit-scrollbar {          // Chrome / Safari / Electron
    display: none;
  }

  &:focus {
    outline: none;
    border-color: #2563eb;
  }

  &:disabled {
    opacity: 0.5;
  }
}

// 虚拟滚动条轨道：绝对定位贴在右侧
.virtual-scroll-track {
  position: absolute;
  top: 2px;
  right: 2px;
  bottom: 2px;
  width: 6px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.12);
  pointer-events: none; // 轨道本身不吃事件，只让 thumb 可点
  opacity: 1;
  transition: background 0.15s;

  &:hover {
    background: rgba(0, 0, 0, 0.18);
  }
}

.virtual-scroll-thumb {
  position: absolute;
  left: 0;
  width: 100%;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.32);
  cursor: pointer;
  pointer-events: auto;

  &:hover {
    background: rgba(0, 0, 0, 0.48);
  }

  &:active {
    background: rgba(0, 0, 0, 0.6);
  }
}

// —— 右下角 resize handle ——
.node__resize-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 14px;
  height: 14px;
  cursor: nwse-resize;
  pointer-events: auto;
  z-index: 10;
  background: linear-gradient(
    135deg,
    transparent 0%,
    transparent 40%,
    #b4bcc7 40%,
    #b4bcc7 50%,
    transparent 50%,
    transparent 60%,
    #b4bcc7 60%,
    #b4bcc7 70%,
    transparent 70%
  );
  border-bottom-right-radius: 8px;

  &:hover {
    background: linear-gradient(
      135deg,
      transparent 0%,
      transparent 35%,
      #6b7280 35%,
      #6b7280 45%,
      transparent 45%,
      transparent 55%,
      #6b7280 55%,
      #6b7280 65%,
      transparent 65%
    );
  }
}

// —— 大窗口编辑弹窗 ——
.edit-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 70vh; // 让 textarea 撑满 dialog body 的可用空间
}

.edit-textarea {
  flex: 1;
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  border: 1px solid @node-border-color;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
  font-family: inherit;
  resize: none;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;

  &:focus {
    outline: none;
    border-color: #2563eb;
  }

  &:disabled {
    opacity: 0.5;
  }
}

.edit-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.edit-dialog-hint {
  font-size: 12px;
  color: #9aa2ad;
}
</style>
