<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { CodeNode, type CodeInputKind, type CodeInputMeta, type CodePortKind, type CodeOutputMeta } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import CodeHelpDialog from './CodeHelpDialog.vue'

/**
 * 代码节点的渲染组件。
 *
 * 主视图：输入端口管理区 + 输出端口管理区 + 用法提示 + 代码编辑区 + 结果区 + 执行按钮。
 *
 * 输入端口由用户自定义变量名，函数体里直接用这个变量名引用。
 * 输出端口由用户自定义端口名，函数体里通过 callOutputPort("端口名", 值) 提交。
 *
 * 定位、两侧端口由 NodeShell 兜底；节点不在场景里时退化为只读。
 */
const props = defineProps<{ id: string }>()

const codeNode = shallowRef<CodeNode | undefined>(undefined)

// 卡片标题走插件 manifest 的多语言 title，未配当前语言时由 resolveNodeTitle 兜底
const nodeTitle = useNodeTitle(() => codeNode.value, '?')
const code = ref('')
const resultText = ref('')
const errorText = ref('')
const status = ref<'idle' | 'running' | 'done' | 'error'>('idle')
const inputs = ref<readonly CodeInputMeta[]>([])
const outputs = ref<readonly CodeOutputMeta[]>([])
const autoRun = ref(false)
// 每个端口名输入框对应的临时校验错误（key 是 port id）
const inputNameErrors = ref<Record<string, string>>({})
const outputNameErrors = ref<Record<string, string>>({})
// 帮助浮层开关（状态保留在 render.vue，HelpDialog 组件负责弹窗壳）
const showHelp = ref(false)
// 配置弹窗开关（输入端口 + 输出端口 + 代码编辑）
const showConfig = ref(false)
// 复制按钮的瞬时反馈：哪个刚复制了就短暂显示"已复制"
const copyHint = ref<string>('')

let unsubscribe: (() => void) | undefined

const { startDrag } = useNodePosition(() => codeNode.value)

/** 把节点里的状态同步到本地 ref */
function syncFromNode(node: CodeNode): void {
  code.value = node.displayCode
  resultText.value = node.displayResult
  errorText.value = node.displayError
  status.value = node.displayStatus
  // 浅拷贝一份，不然 displayInputs/displayOutputs 返回的是 node 内部同一个数组引用，
  // add/remove 时 Vue 检测不到 value 变化（引用相同不会触发更新）
  inputs.value = [...node.displayInputs]
  outputs.value = [...node.displayOutputs]
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
const hasOutputs = computed(() => outputs.value.length > 0)

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

function onRun(): void {
  codeNode.value?.run()
}

/** 切换自动执行开关 */
function onAutoRunToggle(e: Event): void {
  codeNode.value?.setAutoRun((e.target as HTMLInputElement).checked)
}

// —— 输入端口操作 ——

/** 添加输入端口 */
function onAddInput(): void {
  codeNode.value?.addCodeInput()
}

/** 删除输入端口 */
function onRemoveInput(id: string): void {
  inputNameErrors.value[id] = ''
  delete inputNameErrors.value[id]
  codeNode.value?.removeCodeInput(id)
}

/** 编辑输入端口变量名 */
function onInputNameChange(id: string, e: Event): void {
  const node = codeNode.value
  if (!node) return
  const value = (e.target as HTMLInputElement).value
  const err = node.validateInputName(value, id)
  if (err) {
    inputNameErrors.value[id] = err
  } else {
    inputNameErrors.value[id] = ''
    delete inputNameErrors.value[id]
    node.setInputName(id, value)
  }
}

/** 切换输入端口类型 */
function onInputKindChange(id: string, e: Event): void {
  codeNode.value?.setInputKind(id, (e.target as HTMLSelectElement).value as CodeInputKind)
}

// —— 输出端口操作 ——

/** 添加输出端口 */
function onAddOutput(): void {
  codeNode.value?.addCodeOutput()
}

/** 删除输出端口 */
function onRemoveOutput(id: string): void {
  outputNameErrors.value[id] = ''
  delete outputNameErrors.value[id]
  codeNode.value?.removeCodeOutput(id)
}

/** 编辑输出端口名 */
function onOutputNameChange(id: string, e: Event): void {
  const node = codeNode.value
  if (!node) return
  const value = (e.target as HTMLInputElement).value
  const err = node.validateOutputName(value, id)
  if (err) {
    outputNameErrors.value[id] = err
  } else {
    outputNameErrors.value[id] = ''
    delete outputNameErrors.value[id]
    node.setOutputName(id, value)
  }
}

/** 切换输出端口类型 */
function onOutputKindChange(id: string, e: Event): void {
  codeNode.value?.setOutputKind(id, (e.target as HTMLSelectElement).value as CodePortKind)
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

/** 复制 callOutputPort 函数签名到剪贴板 */
function onCopyCallOutputPort(): void {
  const text = 'callOutputPort("端口名", 值)'
  navigator.clipboard?.writeText(text)
  copyHint.value = 'callOutputPort'
  setTimeout(() => { copyHint.value = '' }, 1200)
}
function onNodeWheel(e: WheelEvent): void {
  const el = e.currentTarget as HTMLElement
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
      <span class="node__handle" title="拖动节点（整个头部可拖）">{{ nodeTitle }}</span>
      <div class="node__header-right">
        <span class="node__status" :class="`node__status--${status}`">{{ statusLabel }}</span>
        <button
          class="node__help"
          type="button"
          title="使用说明"
          @click.stop="showHelp = true"
        >?</button>
      </div>
    </div>

    <!-- 配置入口按钮：点击打开「配置函数」弹窗（含端口配置 + 代码编辑） -->
    <button
      class="node__config-btn"
      type="button"
      :disabled="!codeNode"
      title="配置端口与代码"
      @click.stop="showConfig = true"
    >配置函数</button>

    <!-- 结果区（常驻画布） -->
    <div
      class="code-output"
      @wheel="onNodeWheel"
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

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" title="代码节点使用说明" @close="showHelp = false">
    <CodeHelpDialog />
  </HelpDialog>

  <!-- 配置弹窗：输入端口 + 输出端口 + 用法提示 + 代码编辑 -->
  <HelpDialog :visible="showConfig" title="配置函数" width="680" @close="showConfig = false">

    <!-- 输入端口管理区 -->
    <div class="inputs">
      <div class="inputs__header">
        <span class="inputs__title">输入端口</span>
        <button
          class="inputs__add"
          type="button"
          :disabled="!codeNode"
          title="添加一个输入端口"
          @click="onAddInput"
        >+</button>
      </div>
      <div v-if="!hasInputs" class="inputs__empty">点击 + 添加输入端口</div>
      <div v-else class="inputs__list">
        <div
          v-for="input in inputs"
          :key="input.id"
          class="inputs__row"
          :class="{ 'inputs__row--error': inputNameErrors[input.id] }"
        >
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
              <option value="json">json</option>
            </select>
          </div>
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
          <button
            class="inputs__remove"
            type="button"
            :disabled="!codeNode"
            title="删除此输入端口"
            @click="onRemoveInput(input.id)"
          >×</button>
          <span v-if="inputNameErrors[input.id]" class="inputs__errmsg">{{ inputNameErrors[input.id] }}</span>
        </div>
      </div>
    </div>

    <!-- 输出端口管理区 -->
    <div class="inputs">
      <div class="inputs__header">
        <span class="inputs__title">输出端口</span>
        <button
          class="inputs__add"
          type="button"
          :disabled="!codeNode"
          title="添加一个输出端口"
          @click="onAddOutput"
        >+</button>
      </div>
      <div v-if="!hasOutputs" class="inputs__empty">至少保留一个输出端口</div>
      <div v-else class="inputs__list">
        <div
          v-for="output in outputs"
          :key="output.id"
          class="inputs__row"
          :class="{ 'inputs__row--error': outputNameErrors[output.id] }"
        >
          <div class="code-row inputs__subrow">
            <span class="code-row__label">类型</span>
            <select
              class="code-select"
              :value="output.kind"
              :disabled="!codeNode"
              title="选择此输出产出的 Value 类型"
              @change="(e) => onOutputKindChange(output.id, e)"
            >
              <option value="number">number</option>
              <option value="string">string</option>
              <option value="bool">bool</option>
              <option value="file">file</option>
              <option value="imgfile">img file</option>
              <option value="json">json</option>
            </select>
          </div>
          <div class="code-row inputs__subrow">
            <span class="code-row__label">端口名</span>
            <input
              class="code-input"
              type="text"
              :value="output.name"
              :disabled="!codeNode"
              maxlength="32"
              @input="(e) => onOutputNameChange(output.id, e)"
            />
          </div>
          <button
            class="inputs__remove"
            type="button"
            :disabled="!codeNode || outputs.length <= 1"
            title="删除此输出端口（至少保留一个）"
            @click="onRemoveOutput(output.id)"
          >×</button>
          <span v-if="outputNameErrors[output.id]" class="inputs__errmsg">{{ outputNameErrors[output.id] }}</span>
        </div>
      </div>
    </div>

    <!-- 用法提示 -->
    <div class="code-hint">
      <div class="code-hint__line">
        <span class="code-hint__line-content">
          <span class="code-hint__key">callOutputPort</span>
          <span class="code-hint__paren">(</span>
          <span class="code-hint__str">"端口名"</span>
          <span class="code-hint__comma">,</span>
          <span class="code-hint__ident">值</span>
          <span class="code-hint__paren">)</span>
        </span>
        <button
          class="code-hint__copy"
          type="button"
          title="复制函数签名"
          @click="onCopyCallOutputPort"
        >
          <span class="code-hint__copy-icon">📋</span>
          <span v-if="copyHint === 'callOutputPort'" class="code-hint__copy-tip">已复制</span>
        </button>
      </div>
      <div v-if="hasOutputs" class="code-hint__ports">
        <span class="code-hint__ports-label">可用端口：</span>
        <span
          v-for="o in outputs"
          :key="o.id"
          class="code-hint__port-tag"
          :title="`类型: ${o.kind}`"
        >{{ o.name }}<span class="code-hint__port-kind">:{{ o.kind }}</span></span>
      </div>
    </div>

    <!-- 代码编辑区 -->
    <textarea
      class="code-editor"
      spellcheck="false"
      :value="code"
      :disabled="!codeNode"
      :placeholder="hasInputs
        ? '写函数体，通过 callOutputPort(\'端口名\', 值) 提交。\n直接用上方输入的变量名访问，例如：\ncallOutputPort(\'result\', price * qty)\n\nsetTimeout / Promise.then 里的延迟调用也能正常触发'
        : '写函数体，通过 callOutputPort(\'端口名\', 值) 提交，例如：\ncallOutputPort(\'result\', [1,2,3].reduce((a,b)=>a+b,0))\n\nsetTimeout / Promise.then 里的延迟调用也能正常触发'"
      @wheel="onEditorWheel"
      @input="onCodeInput"
    />
  </HelpDialog>
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  overflow: auto;
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

  &__header-right {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  &__help {
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
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: #dbeafe;
      color: #2563eb;
    }
  }

  &__config-btn {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 28px;
    border-radius: 5px;
    background: #f0f4ff;
    border: 1px dashed #93c5fd;
    color: #3b82f6;
    font-size: 12px;
    font-weight: 500;
    transition: background 0.15s, border-color 0.15s;
    box-sizing: border-box;

    &:hover:not(:disabled) {
      background: #dbeafe;
      border-color: #60a5fa;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }

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

  &__subrow {
    flex: 1;
    gap: 6px;
    min-width: 0;

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

.code-hint {
  flex-shrink: 0;
  padding: 6px 10px;
  border: 1px dashed #d5d9e0;
  border-radius: 6px;
  background: #fafbfc;
  display: flex;
  flex-direction: column;
  gap: 4px;

  &__line {
    display: flex;
    align-items: center;
    gap: 6px;

    &-content {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      line-height: 1.4;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      min-width: 0;
    }
  }

  &__copy {
    all: unset;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    color: #9aa2ad;
    flex-shrink: 0;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: #eef2ff;
      color: #3b82f6;
    }

    &-icon {
      font-size: 11px;
      line-height: 1;
    }

    &-tip {
      color: #16a34a;
    }
  }

  &__key {
    color: #b91c1c;
    font-weight: 600;
  }

  &__paren {
    color: #6b7280;
  }

  &__str {
    color: #047857;
  }

  &__comma {
    color: #6b7280;
  }

  &__ident {
    color: #1d4ed8;
  }

  &__ports {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
  }

  &__ports-label {
    font-size: 10px;
    color: #9aa2ad;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  &__port-tag {
    display: inline-flex;
    align-items: center;
    padding: 1px 6px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    color: #374151;
    background: #eef2ff;
    border: 1px solid #c7d2fe;
    border-radius: 4px;
    line-height: 1.4;

    &-kind {
      margin-left: 3px;
      color: #9aa2ad;
      font-size: 9px;
    }
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
  height: 23px;

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
