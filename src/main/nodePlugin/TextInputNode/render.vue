<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { debounce } from 'lodash-es'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { TextInputNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'
import GearIcon from '@renderer/components/icons/GearIcon.vue'

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
const isMultiline = ref(false)
const textValue = ref('')
/** 自动发送开关状态（同步自节点） */
const autoSend = ref(false)

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
  isMultiline.value = node.isMultiline
  textValue.value = node.text
  autoSend.value = node.isAutoSend
  offChanged = node.onChanged(() => {
    isMultiline.value = node.isMultiline
    textValue.value = node.text
    autoSend.value = node.isAutoSend
  })
})

onUnmounted(() => {
  offChanged?.()
  debouncedSend.cancel()
  document.removeEventListener('click', onDocClick, true)
})

// 只要拖拽（落点写回 node.position）；位置本身由外壳跟随 node.position 展示。
const { startDrag } = useNodePosition(() => inputNode.value)

/** 输入框敲字 → 更新草稿；开着自动发送时排一次防抖提交 */
function onInput(e: Event): void {
  const target = e.target as HTMLInputElement | HTMLTextAreaElement
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

/** 快捷键：单行 Enter 直接发；多行 Ctrl/Cmd+Enter 发，单独 Enter 换行 */
function onKeydown(e: KeyboardEvent): void {
  if (isMultiline.value) {
    // 多行：Ctrl/Cmd+Enter 发送
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      onSend()
    }
  } else {
    // 单行：Enter 直接发送
    if (e.key === 'Enter') {
      e.preventDefault()
      onSend()
    }
  }
}

// —— 设置面板（popover）——
const gearBtn = ref<HTMLButtonElement | null>(null)
const popoverVisible = ref(false)
const popoverPos = ref<{ top: number; left: number }>({ top: 0, left: 0 })

function onGearClick(e: MouseEvent): void {
  e.stopPropagation()
  if (popoverVisible.value) {
    popoverVisible.value = false
    document.removeEventListener('click', onDocClick, true)
    return
  }
  nextTick(() => {
    const rect = gearBtn.value?.getBoundingClientRect()
    if (rect) {
      popoverPos.value = {
        top: rect.bottom + 6,
        left: rect.right - 180 // 面板右对齐齿轮，避免超出屏幕
      }
    }
    popoverVisible.value = true
    document.addEventListener('click', onDocClick, true)
  })
}

function onDocClick(e: MouseEvent): void {
  // 点击 popover 内部不关闭（checkbox 操作需要），点击外部关闭
  const pop = document.querySelector('.ti-popover')
  if (pop && pop.contains(e.target as Node)) return
  popoverVisible.value = false
  document.removeEventListener('click', onDocClick, true)
}

function onMultilineToggle(e: Event): void {
  const target = e.target as HTMLInputElement
  if (target.checked !== isMultiline.value) {
    inputNode.value?.toggleMultiline()
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

  // 上滚但已到顶、或下滚但已到底 → 放行给画布
  if ((scrollingUp && atTop) || (scrollingDown && atBottom)) return

  // 还能滚 → 拦住，不让画布接管
  e.stopPropagation()
}
</script>

<template>
  <div class="node">
    <div class="node__header" @pointerdown="startDrag">
      <span class="node__handle" :title="t('dragHint')">{{ nodeTitle }}</span>
      <button
        v-if="inputNode"
        ref="gearBtn"
        class="node__gear"
        type="button"
        :title="t('nodeSettings')"
        @pointerdown.stop
        @click.stop="onGearClick"
      >
        <GearIcon />
      </button>
    </div>
    <textarea
      v-if="isMultiline"
      class="render-input"
      rows="4"
      :value="textValue"
      :disabled="!inputNode"
      :placeholder="inputNode ? t('placeholderMultiline') : t('nodeMissing')"
      @wheel="onTextareaWheel"
      @input="onInput"
      @keydown="onKeydown"
    />
    <input
      v-else
      class="render-input"
      type="text"
      :value="textValue"
      :disabled="!inputNode"
      :placeholder="inputNode ? t('placeholderSingle') : t('nodeMissing')"
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
  </div>

  <!-- 设置面板：Teleport 到 body，避免被父容器 overflow clip -->
  <Teleport to="body">
    <div
      v-if="popoverVisible"
      class="ti-popover"
      :style="{ top: popoverPos.top + 'px', left: popoverPos.left + 'px' }"
      @click.stop
    >
      <label class="ti-option">
        <input type="checkbox" :checked="isMultiline" @change="onMultilineToggle" />
        <span class="ti-option__label">{{ t('multiline') }}</span>
      </label>
    </div>
  </Teleport>
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box; // box 是内容区外包壳宽，border+padding 算在 box 内
  width: 100%; // 填满 NodeShell 的 .node-content（由 node.box 硬约束定宽高）
  height: 100%;
  overflow: auto; // 内容超出 box 时可滚
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

  &__gear {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 4px;
    color: #6b7280;
    transition: color 0.15s, background 0.15s;

    &:hover {
      color: #111827;
      background: #f3f4f6;
    }

    &:active {
      background: #e5e7eb;
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

// 开关选中态：轨道变蓝、滑块右移（input 在轨道前面，用相邻兄弟选择器）
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

  &:disabled {
    opacity: 0.5;
  }

  // textarea 允许垂直拖拽调整高度
  textarea& {
    resize: vertical;
    font-family: inherit;
  }
}

// 设置面板 popover（Teleport 到 body，所以不用 scoped 的话会穿透）
.ti-popover {
  position: fixed;
  z-index: 2000;
  min-width: 180px;
  padding: 8px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);

  &::before {
    // 小三角指向齿轮
    content: '';
    position: absolute;
    top: -5px;
    right: 10px;
    width: 8px;
    height: 8px;
    background: #fff;
    border-left: 1px solid #e5e7eb;
    border-top: 1px solid #e5e7eb;
    transform: rotate(45deg);
  }
}

.ti-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #1f2937;
  transition: background 0.12s;

  &:hover {
    background: #f3f4f6;
  }

  input[type='checkbox'] {
    width: 14px;
    height: 14px;
    cursor: pointer;
  }

  &__label {
    user-select: none;
  }
}
</style>
