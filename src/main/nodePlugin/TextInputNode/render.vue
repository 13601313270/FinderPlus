<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { TextInputNode } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
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

/**
 * 引擎字段是普通类字段，Vue 追踪不到，所以走 Node.onChanged 这条桥刷进本地 ref。
 */
const isMultiline = ref(false)
const textValue = ref('')

let offChanged: (() => void) | undefined

onMounted(() => {
  const node = inputNode.value
  if (!node) return
  isMultiline.value = node.isMultiline
  textValue.value = node.text
  offChanged = node.onChanged(() => {
    isMultiline.value = node.isMultiline
    textValue.value = node.text
  })
})

onUnmounted(() => {
  offChanged?.()
  document.removeEventListener('click', onDocClick, true)
})

// 只要拖拽（落点写回 node.position）；位置本身由外壳跟随 node.position 展示。
const { startDrag } = useNodePosition(() => inputNode.value)

/** 输入框敲字 → 只更新草稿，不 commit 到输出端口 */
function onInput(e: Event): void {
  const target = e.target as HTMLInputElement | HTMLTextAreaElement
  inputNode.value?.setText(target.value)
}

/** 发送按钮 / 快捷键 → 把草稿 commit 到输出端口 */
function onSend(): void {
  inputNode.value?.commitText()
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
      <span class="node__handle" title="拖动节点">{{ inputNode?.type ?? '?' }}</span>
      <button
        v-if="inputNode"
        ref="gearBtn"
        class="node__gear"
        type="button"
        title="节点设置"
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
      :placeholder="inputNode ? '输入文本…  (Ctrl+Enter 发送)' : '节点不存在'"
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
      :placeholder="inputNode ? '输入文本…  (Enter 发送)' : '节点不存在'"
      @input="onInput"
      @keydown="onKeydown"
    />
    <div class="node__footer">
      <button
        class="node__send"
        type="button"
        :disabled="!inputNode"
        @click="onSend"
      >
        发送
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
        <span class="ti-option__label">多行输入</span>
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
    justify-content: flex-end;
    flex-shrink: 0;
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
