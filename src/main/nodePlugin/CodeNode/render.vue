<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { CodeNode, type CodeInputKind, type CodeInputMeta, type CodeReturnKind } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'

/**
 * 代码节点的渲染组件。
 *
 * 主视图直接内联编辑：输入端口管理区 + 代码编辑区 + 返回类型下拉 + 结果区 + 执行按钮。
 *
 * 输入端口由用户自定义变量名，函数体里直接用这个变量名引用。
 * 端口值在 run() 前从 InputPort 取出、解包成原始值/File，交给 preload 的 codeApi.run(body, args)。
 *
 * 返回类型下拉决定输出端口挂哪种 Value——切一下，右侧端口类型标签就跟着变。
 *
 * 定位、两侧端口由 NodeShell 兜底；节点不在场景里时退化为只读。
 */
const props = defineProps<{ id: string }>()

const codeNode = shallowRef<CodeNode | undefined>(undefined)
const code = ref('')
const returnKind = ref<CodeReturnKind>('number')
const resultText = ref('')
const errorText = ref('')
const status = ref<'idle' | 'running' | 'done' | 'error'>('idle')
const inputs = ref<readonly CodeInputMeta[]>([])
const autoRun = ref(false)
// 每个端口名输入框对应的临时校验错误（key 是 port id）
const nameErrors = ref<Record<string, string>>({})

let unsubscribe: (() => void) | undefined

const { startDrag } = useNodePosition(() => codeNode.value)

/** 把节点里的状态同步到本地 ref */
function syncFromNode(node: CodeNode): void {
  code.value = node.displayCode
  returnKind.value = node.returnKind
  resultText.value = node.displayResult
  errorText.value = node.displayError
  status.value = node.displayStatus
  inputs.value = node.displayInputs
  autoRun.value = node.displayAutoRun
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
const hasInputs = computed(() => inputs.value.length > 0)

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

/** 切换自动执行开关 */
function onAutoRunToggle(e: Event): void {
  codeNode.value?.setAutoRun((e.target as HTMLInputElement).checked)
}

/** 添加输入端口 */
function onAddInput(): void {
  codeNode.value?.addCodeInput()
}

/** 删除输入端口 */
function onRemoveInput(id: string): void {
  nameErrors.value[id] = ''
  delete nameErrors.value[id]
  codeNode.value?.removeCodeInput(id)
}

/** 编辑端口名 */
function onInputNameChange(id: string, e: Event): void {
  const node = codeNode.value
  if (!node) return
  const value = (e.target as HTMLInputElement).value
  const err = node.validateInputName(value, id)
  if (err) {
    nameErrors.value[id] = err
  } else {
    nameErrors.value[id] = ''
    delete nameErrors.value[id]
    node.setInputName(id, value)
  }
}

/** 切换输入端口类型 */
function onInputKindChange(id: string, e: Event): void {
  codeNode.value?.setInputKind(id, (e.target as HTMLSelectElement).value as CodeInputKind)
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

    <!-- 输入端口管理区 -->
    <div class="inputs">
      <div class="inputs__header">
        <span class="inputs__title">输入</span>
        <button
          class="inputs__add"
          type="button"
          :disabled="!codeNode"
          title="添加一个输入端口"
          @click="onAddInput"
        >
          +
        </button>
      </div>
      <div v-if="!hasInputs" class="inputs__empty">
        点击 + 添加输入端口
      </div>
      <div v-else class="inputs__list">
        <div
          v-for="input in inputs"
          :key="input.id"
          class="inputs__row"
          :class="{ 'inputs__row--error': nameErrors[input.id] }"
        >
          <!-- 类型选择：和下方"返回类型"行同构 -->
          <div class="code-row inputs__subrow">
            <span class="code-row__label">类型</span>
            <select
              class="code-select"
              :value="input.kind"
              :disabled="!codeNode"
              title="选择此输入接受的 Value 类型"
              @change="(e) => onInputKindChange(input.id, e)"
            >
              <option value="number">number</option>
              <option value="string">string</option>
              <option value="bool">bool</option>
              <option value="file">file</option>
            </select>
          </div>
          <!-- 变量名输入 -->
          <div class="code-row inputs__subrow">
            <span class="code-row__label">变量名</span>
            <input
              class="code-input"
              type="text"
              :value="input.name"
              :disabled="!codeNode"
              maxlength="32"
              @input="(e) => onInputNameChange(input.id, e)"
            />
          </div>
          <!-- 删除按钮：和当前输入同行的右侧 -->
          <button
            class="inputs__remove"
            type="button"
            :disabled="!codeNode"
            title="删除此输入端口"
            @click="onRemoveInput(input.id)"
          >
            ×
          </button>
          <span v-if="nameErrors[input.id]" class="inputs__errmsg">{{ nameErrors[input.id] }}</span>
        </div>
      </div>
    </div>

    <!-- 代码编辑区：只写函数体，用 return 返回结果 -->
    <textarea
      class="code-editor"
      spellcheck="false"
      :value="code"
      :disabled="!codeNode"
      :placeholder="hasInputs
        ? '写函数体，用 return 返回结果。\n直接用上方定义的变量名访问输入值，例如：\nreturn price * qty'
        : '写函数体，用 return 返回结果，例如：\nconst nums = [1, 2, 3]\nreturn nums.reduce((a, b) => a + b, 0)'"
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
        <option value="file">file</option>
        <option value="imgfile">img file</option>
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

    <!-- 主操作：自动执行开关 + 执行按钮 -->
    <div class="node__actions">
      <label class="auto-run">
        <input
          type="checkbox"
          class="auto-run__checkbox"
          :checked="autoRun"
          :disabled="!codeNode"
          @change="onAutoRunToggle"
        />
        <span class="auto-run__slider" aria-hidden="true" />
        <span class="auto-run__label">自动</span>
      </label>
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

  // 底部操作区：自动开关 + 执行按钮横向并排
  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  &__run {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    box-sizing: border-box;
    height: 34px;
    font-size: 13px;
    font-weight: 500;
    color: #fff;
    background: #3b82f6;
    border-radius: 6px;
    white-space: nowrap;
    min-width: 0;
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

// —— 输入端口管理区 ——
.inputs {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__title {
    font-size: 12px;
    color: @color-text-weak;
    user-select: none;
  }

  &__add {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 4px;
    background: #f3f4f6;
    color: #374151;
    font-size: 14px;
    font-weight: 700;
    line-height: 1;
    transition: background 0.15s;

    &:hover:not(:disabled) {
      background: #e5e7eb;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }

  &__empty {
    font-size: 11px;
    color: #9aa2ad;
    font-style: italic;
    padding: 2px 0;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 6px;

    &--error {
      .code-input {
        border-color: #fecaca;
        background: #fef2f2;
      }
    }
  }

  // 每行里的两个子 row（类型 + 变量名）并排
  &__subrow {
    flex: 1;
    gap: 6px;
    min-width: 0;

    // 子 row 里的控件不再 flex:1（因为外层 code-row 已经给了），而是按实际宽度
    .code-select,
    .code-input {
      flex: 1;
      min-width: 0;
    }
  }

  &__remove {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 4px;
    color: #9aa2ad;
    font-size: 14px;
    line-height: 1;
    flex-shrink: 0;

    &:hover:not(:disabled) {
      color: #dc2626;
      background: #fee2e2;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.3;
    }
  }

  &__errmsg {
    font-size: 10px;
    color: #dc2626;
    width: 100%;
    margin-top: 2px;
  }
}

// —— 跟 .code-select 同风格的文本输入框 ——
.code-input {
  box-sizing: border-box;
  padding: 5px 8px;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #1f2937;
  border: 1px solid #d5d9e0;
  border-radius: 6px;
  background: @color-surface;
  outline: none;
  cursor: text;
  transition: border-color 0.15s, background 0.15s;

  &:focus {
    border-color: #3b82f6;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

// —— 自动执行 switch ——
.auto-run {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;

  &__checkbox {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
    pointer-events: none;

    &:checked + .auto-run__slider {
      background: #3b82f6;

      &::after {
        transform: translateX(14px);
      }
    }

    &:disabled + .auto-run__slider {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__slider {
    position: relative;
    display: inline-block;
    width: 32px;
    height: 18px;
    background: #d1d5db;
    border-radius: 9px;
    transition: background 0.15s;

    &::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
      transition: transform 0.15s;
    }
  }

  &__label {
    font-size: 11px;
    color: @color-text-weak;
    line-height: 1;
  }
}
</style>
