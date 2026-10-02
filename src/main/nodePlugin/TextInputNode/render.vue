<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { debounce } from 'lodash-es'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { TextInputNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { viewport } from '@renderer/canvas/viewport'
import { messages } from './i18n'
import HelpDialog from '@renderer/components/HelpDialog.vue'
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
})

onUnmounted(() => {
  offChanged?.()
  debouncedSend.cancel()
})

// 只要拖拽（落点写回 node.position）；位置本身由外壳跟随 node.position 展示。
const { startDrag } = useNodePosition(() => inputNode.value)

/** 输入框敲字 → 更新草稿；开着自动发送时排一次防抖提交 */
function onInput(e: Event): void {
  const target = e.target as HTMLTextAreaElement
  inputNode.value?.setText(target.value)
  if (autoSend.value) debouncedSend()
}

/** 发送按钮 / 快捷键 → 立刻把草稿 commit 到输出端口 */
function onSend(): void {
  debouncedSend.cancel()
  inputNode.value?.commitText()
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

/**
 * 滚动接力：textarea 还能往当前方向滚时才 stop 事件，
 * 滚到顶/底了就放行让画布接管平移。
 */
function onTextareaWheel(e: WheelEvent): void {
  const el = e.currentTarget as HTMLTextAreaElement
  const { scrollTop, scrollHeight, clientHeight } = el
  const atTop = scrollTop <= 0
  const atBottom = scrollTop + clientHeight >= scrollHeight

  const scrollingUp = e.deltaY < 0
  const scrollingDown = e.deltaY > 0

  if ((scrollingUp && atTop) || (scrollingDown && atBottom)) return

  e.stopPropagation()
}

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
    <div class="node__header" @pointerdown="startDrag">
      <span class="node__handle" :title="t('dragHint')">{{ nodeTitle }}</span>
      <div class="node__header-actions">
        <button
          class="node__help"
          type="button"
          :title="t('helpTitle')"
          @pointerdown.stop
          @click.stop="showHelp = true"
        >?</button>
      </div>
    </div>
    <textarea
      class="render-input"
      :value="textValue"
      :disabled="!inputNode"
      :placeholder="inputNode ? t('placeholderMultiline') : t('nodeMissing')"
      @wheel="onTextareaWheel"
      @input="onInput"
      @keydown="onKeydown"
    />
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
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box; // box 是内容区外包壳宽，border+padding 算在 box 内
  width: 100%; // 填满 NodeShell 的 .node-content（由 node.box 硬约束定宽高）
  height: 100%;
  overflow: auto; // 内容超出 box 时可滚
  position: relative; // 给 resize handle 当定位锚点
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  background: @color-surface;
  border: 1px solid #d5d9e0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: grab;
    user-select: none;
    border-bottom: 1px dashed #d5d9e0;
    padding-bottom: 4px;

    &:active {
      cursor: grabbing;
    }
  }

  &__handle {
    font-size: 12px;
    color: @color-text-weak;
    padding: 2px 0;
  }

  &__header-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-left: auto;
  }

  &__help {
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

.render-input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid #d5d9e0;
  border-radius: 6px;
  font-size: 14px;
  flex-shrink: 1;
  flex-grow: 1;
  resize: none; // 原生 resize 关掉，由右下角 handle 统一管理
  font-family: inherit;

  &:disabled {
    opacity: 0.5;
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
</style>
