<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { CodeNode, type CodeReturnKind } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'

/**
 * 代码节点的渲染组件。
 *
 * 主视图直接内联编辑：代码编辑区 + 返回类型下拉 + 结果区 + 执行按钮。
 * 返回类型下拉决定输出端口挂哪种 Value——切一下，右侧端口类型标签就跟着变。
 *
 * 执行在主进程（渲染进程 CSP 禁 eval），这里只经 node.run() 触发。
 * 定位、两侧端口由 NodeShell 兜底；节点不在场景里时退化为只读。
 */
const props = defineProps<{ id: string }>()

const codeNode = shallowRef<CodeNode | undefined>(undefined)
const code = ref('')
const returnKind = ref<CodeReturnKind>('number')
const resultText = ref('')
const errorText = ref('')
const status = ref<'idle' | 'running' | 'done' | 'error'>('idle')

let unsubscribe: (() => void) | undefined

const { startDrag } = useNodePosition(() => codeNode.value)

/** 把节点里的状态同步到本地 ref */
function syncFromNode(node: CodeNode): void {
  code.value = node.displayCode
  returnKind.value = node.returnKind
  resultText.value = node.displayResult
  errorText.value = node.displayError
  status.value = node.displayStatus
}

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof CodeNode) {
    codeNode.value = found
    syncFromNode(found)
    unsubscribe = found.onChanged(() => syncFromNode(found))
  }
})

onUnmounted(() => {
  unsubscribe?.()
})

const hasCode = computed(() => code.value.trim().length > 0)
const running = computed(() => status.value === 'running')

const STATUS_LABELS = {
  idle: '空闲',
  running: '执行中',
  done: '完成',
  error: '出错'
} as const

const statusLabel = computed(() => STATUS_LABELS[status.value])

/** 编辑区 input：实时写回节点（不执行） */
function onCodeInput(e: Event): void {
  const value = (e.target as HTMLTextAreaElement).value
  code.value = value
  codeNode.value?.setCode(value)
}

/** 返回类型下拉 change：切输出端口类型 */
function onKindChange(e: Event): void {
  codeNode.value?.setReturnKind((e.target as HTMLSelectElement).value as CodeReturnKind)
}

function onRun(): void {
  codeNode.value?.run()
}

/**
 * 滚动接力：编辑区还能往当前方向滚时才 stop 事件，
 * 滚到顶/底了就放行让画布接管平移。
 */
function onEditorWheel(e: WheelEvent): void {
  const el = e.currentTarget as HTMLTextAreaElement
  const { scrollTop, scrollHeight, clientHeight } = el
  const atTop = scrollTop <= 0
  const atBottom = scrollTop + clientHeight >= scrollHeight

  const scrollingUp = e.deltaY < 0
  const scrollingDown = e.deltaY > 0

  if ((scrollingUp && atTop) || (scrollingDown && atBottom)) return
  e.stopPropagation()
}
</script>

<template>
  <div class="node">
    <div class="node__header" @pointerdown="startDrag">
      <span class="node__handle" title="拖动节点（整个头部可拖）">{{ codeNode?.type ?? '?' }}</span>
      <span class="node__status" :class="`node__status--${status}`">{{ statusLabel }}</span>
    </div>

    <!-- 代码编辑区：只写函数体，用 return 返回结果 -->
    <textarea
      class="code-editor"
      spellcheck="false"
      :value="code"
      :disabled="!codeNode"
      placeholder="写函数体，用 return 返回结果，例如：&#10;const nums = [1, 2, 3]&#10;return nums.reduce((a, b) => a + b, 0)"
      @wheel="onEditorWheel"
      @input="onCodeInput"
    />

    <!-- 返回类型：决定输出端口挂哪种 Value -->
    <div class="code-row">
      <span class="code-row__label">返回类型</span>
      <select
        class="code-select"
        :value="returnKind"
        :disabled="!codeNode"
        title="选择返回值类型，输出端口会跟着变"
        @change="onKindChange"
      >
        <option value="number">number</option>
        <option value="string">string</option>
        <option value="bool">bool</option>
      </select>
    </div>

    <!-- 结果区 -->
    <div
      class="code-output"
      :class="{
        'code-output--empty': !resultText && !errorText && status !== 'running',
        'code-output--error': status === 'error',
        'code-output--running': status === 'running'
      }"
    >
      <template v-if="status === 'running'">
        <span class="code-output__spinner" />
        <span>执行中…</span>
      </template>
      <template v-else-if="errorText">{{ errorText }}</template>
      <template v-else-if="status === 'done'">{{ resultText }}</template>
      <template v-else>{{ codeNode ? '（点击执行运行代码）' : '节点不存在' }}</template>
    </div>

    <!-- 主操作：执行 -->
    <button
      class="node__run"
      type="button"
      :disabled="running || !hasCode"
      :title="hasCode ? '执行代码' : '请先在编辑区写代码'"
      @click="onRun"
    >
      {{ running ? '执行中…' : '执行' }}
    </button>
  </div>
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box; // box 是内容区外包壳宽，border+padding 算在 box 内
  width: 100%; // 填满 NodeShell 的 .node-content（由 node.box 硬约束定宽高）
  height: 100%;
  overflow: auto; // 内容超出 box 时可滚
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background: @color-surface;
  border: 1px solid #d5d9e0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px dashed #d5d9e0;
    padding-bottom: 4px;
    cursor: grab;
    user-select: none;

    &:active {
      cursor: grabbing;
    }
  }

  &__handle {
    font-size: 12px;
    color: @color-text-weak;
    padding: 2px 0;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__status {
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 4px;
    background: #f3f4f6;
    color: #6b7280;
    flex-shrink: 0;

    &--running {
      background: #dbeafe;
      color: #2563eb;
    }

    &--done {
      background: #dcfce7;
      color: #16a34a;
    }

    &--error {
      background: #fee2e2;
      color: #dc2626;
    }
  }

  &__run {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    box-sizing: border-box;
    height: 34px;
    font-size: 13px;
    font-weight: 500;
    color: #fff;
    background: #3b82f6;
    border-radius: 6px;
    white-space: nowrap;
    flex-shrink: 0;
    transition: background 0.15s;

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

.code-editor {
  width: 100%;
  box-sizing: border-box;
  flex: 1;
  min-height: 96px;
  resize: vertical;
  padding: 8px 10px;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  line-height: 1.5;
  color: #1f2937;
  border: 1px solid #d5d9e0;
  border-radius: 6px;
  background: #f8fafc;
  outline: none;
  transition: border-color 0.15s, background 0.15s;

  &:focus {
    border-color: #3b82f6;
    background: @color-surface;
  }

  &:disabled {
    opacity: 0.5;
  }

  &::placeholder {
    color: #9aa2ad;
  }
}

.code-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;

  &__label {
    font-size: 12px;
    color: @color-text-weak;
    user-select: none;
  }
}

.code-select {
  flex: 1;
  box-sizing: border-box;
  padding: 5px 8px;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #1f2937;
  border: 1px solid #d5d9e0;
  border-radius: 6px;
  background: @color-surface;
  outline: none;
  cursor: pointer;

  &:focus {
    border-color: #3b82f6;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.code-output {
  padding: 8px 10px;
  border: 1px solid #d5d9e0;
  border-radius: 6px;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: pre-wrap;
  word-break: break-all;
  flex-shrink: 0;
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1f2937;
  overflow: auto;

  &--empty {
    color: #9aa2ad;
    font-style: italic;
    font-family: inherit;
  }

  &--error {
    color: #dc2626;
    border-color: #fecaca;
    background: #fef2f2;
  }

  &--running {
    justify-content: flex-start;
    color: #3b82f6;
    font-family: inherit;
  }

  &__spinner {
    width: 12px;
    height: 12px;
    border: 2px solid #bfdbfe;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>