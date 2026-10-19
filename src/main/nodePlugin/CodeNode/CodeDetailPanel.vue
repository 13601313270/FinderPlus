<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { Codemirror } from 'vue-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { bracketMatching, foldGutter, foldKeymap, indentOnInput } from '@codemirror/language'
import { lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from '@codemirror/view'
import { highlightSelectionMatches } from '@codemirror/search'
import { keymap } from '@codemirror/view'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { CodeNode, type CodeInputKind, type CodePortKind, type CodePortNameError, type CodeInputMeta, type CodeOutputMeta, type CodeStatus } from './node'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'
import { LLM_PROVIDERS, resolveLLMEndpoint, getProviderKey, type LLMProvider } from '@renderer/composables/useLLMSettings'

/** CodeMirror basic setup：行号 + 历史 + 括号匹配 + 折叠等 */
const cmExtensions = [
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  foldGutter(),
  drawSelection(),
  dropCursor(),
  indentOnInput(),
  bracketMatching(),
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  keymap.of([
    ...defaultKeymap,
    ...historyKeymap,
    ...foldKeymap
  ]),
  javascript()
]

const props = defineProps<{ nodeId: string }>()

const t = useLocalizedMessages(messages)

const codeNode = shallowRef<CodeNode | undefined>(undefined)
const code = ref('')
const resultText = ref('')
const errorText = ref('')
const status = ref<CodeStatus>('idle')
const autoRun = ref(false)
const inputs = ref<readonly CodeInputMeta[]>([])
const outputs = ref<readonly CodeOutputMeta[]>([])

// 每个端口名输入框对应的临时校验错误（key 是 port id）
const inputNameErrors = ref<Record<string, CodePortNameError>>({})
const outputNameErrors = ref<Record<string, CodePortNameError>>({})

// 复制按钮的瞬时反馈
const copyHint = ref<string>('')

// —— 依赖管理状态 ——
type PkgItem = { name: string; version: string }
const installedPackages = ref<PkgItem[]>([])
const installInput = ref('')
const installing = ref(false)
const installError = ref('')
const installLog = ref('')

// —— AI 生成状态 ——
const aiExpanded = ref(false)
const aiPrompt = ref('')
const aiProvider = ref<LLMProvider>('deepseek')
const aiModel = ref('')
const aiLoading = ref(false)
const aiError = ref('')
let aiAbortController: AbortController | null = null
let aiRequestId = 0

let offChanged: (() => void) | undefined

function syncFromNode(node: CodeNode): void {
  code.value = node.displayCode
  resultText.value = node.displayResult
  errorText.value = node.displayError
  status.value = node.displayStatus
  autoRun.value = node.displayAutoRun
  inputs.value = [...node.displayInputs]
  outputs.value = [...node.displayOutputs]
}

onMounted(() => {
  const found = workspaceScene.getNode(props.nodeId)
  if (found instanceof CodeNode) {
    codeNode.value = found
    syncFromNode(found)
    offChanged = found.onChanged(() => syncFromNode(found))
  }
  // 加载已装的 npm 包列表（所有 CodeNode 共享）
  void refreshPackages()
})

onUnmounted(() => {
  offChanged?.()
})

// —— 依赖管理 ——

async function refreshPackages(): Promise<void> {
  try {
    const list = await window.codeApi.listPackages()
    installedPackages.value = list
  } catch { /* 首次启动时主进程 IPC 可能还没 ready，忽略 */ }
}

async function onInstallPackage(): Promise<void> {
  const pkg = installInput.value.trim()
  if (!pkg || installing.value) return
  installing.value = true
  installError.value = ''
  installLog.value = ''
  try {
    const result = await window.codeApi.installPackage(pkg)
    if (result.ok) {
      installInput.value = ''
      installLog.value = result.stdout.trim()
      await refreshPackages()
    } else {
      installError.value = `${result.error}${result.stderr ? '\n' + result.stderr : ''}`
    }
  } catch (err) {
    installError.value = err instanceof Error ? err.message : String(err)
  } finally {
    installing.value = false
  }
}

async function onUninstallPackage(name: string): Promise<void> {
  try {
    const result = await window.codeApi.uninstallPackage(name)
    if (result.ok) {
      await refreshPackages()
    } else {
      installError.value = result.error
    }
  } catch (err) {
    installError.value = err instanceof Error ? err.message : String(err)
  }
}

const hasInputs = computed(() => inputs.value.length > 0)
const hasOutputs = computed(() => outputs.value.length > 0)
const hasCode = computed(() => code.value.trim().length > 0)
const running = computed(() => status.value === 'running')

function onRun(): void {
  codeNode.value?.run(true)
}

/** CodeMirror 内容变更：实时写回节点（不执行） */
function onCodeUpdate(value: string): void {
  code.value = value
  codeNode.value?.setCode(value)
}

// —— 输入端口操作 ——

function onAddInput(): void {
  codeNode.value?.addCodeInput()
}

function onRemoveInput(id: string): void {
  delete inputNameErrors.value[id]
  codeNode.value?.removeCodeInput(id)
}

function onInputNameChange(id: string, e: Event): void {
  const node = codeNode.value
  if (!node) return
  const value = (e.target as HTMLInputElement).value
  const err = node.validateInputName(value, id)
  if (err) {
    inputNameErrors.value[id] = err
  } else {
    delete inputNameErrors.value[id]
    node.setInputName(id, value)
  }
}

function onInputKindChange(id: string, e: Event): void {
  codeNode.value?.setInputKind(id, (e.target as HTMLSelectElement).value as CodeInputKind)
}

// —— 输出端口操作 ——

function onAddOutput(): void {
  codeNode.value?.addCodeOutput()
}

function onRemoveOutput(id: string): void {
  delete outputNameErrors.value[id]
  codeNode.value?.removeCodeOutput(id)
}

function onOutputNameChange(id: string, e: Event): void {
  const node = codeNode.value
  if (!node) return
  const value = (e.target as HTMLInputElement).value
  const err = node.validateOutputName(value, id)
  if (err) {
    outputNameErrors.value[id] = err
  } else {
    delete outputNameErrors.value[id]
    node.setOutputName(id, value)
  }
}

function onOutputKindChange(id: string, e: Event): void {
  codeNode.value?.setOutputKind(id, (e.target as HTMLSelectElement).value as CodePortKind)
}

/** 把端口名校验失败原因翻译成当前语言的文案 */
function errText(err: CodePortNameError | undefined): string {
  if (!err) return ''
  switch (err.kind) {
    case 'empty': return t('errNameEmpty')
    case 'invalid-ident': return t('errNameInvalid')
    case 'reserved': return t('errNameReserved', { name: err.name })
    case 'duplicate-input': return t('errNameDuplicateInput', { name: err.name })
    case 'duplicate-output': return t('errNameDuplicateOutput', { name: err.name })
    case 'conflict-input': return t('errNameConflictInput', { name: err.name })
  }
}

/** 滚动接力：编辑区还能往当前方向滚时才 stop 事件 */
function onEditorWheel(e: WheelEvent): void {
  const target = e.target as HTMLElement
  const scroller = target.closest('.cm-scroller') as HTMLElement | null
  if (!scroller) return
  const { scrollTop, scrollHeight, clientHeight } = scroller
  const atTop = scrollTop <= 0
  const atBottom = scrollTop + clientHeight >= scrollHeight

  const scrollingUp = e.deltaY < 0
  const scrollingDown = e.deltaY > 0

  if ((scrollingUp && atTop) || (scrollingDown && atBottom)) return
  e.stopPropagation()
}

/** 复制 callOutputPort 函数签名到剪贴板 */
function onCopyCallOutputPort(): void {
  const text = t('snippetCall')
  navigator.clipboard?.writeText(text)
  copyHint.value = 'callOutputPort'
  setTimeout(() => { copyHint.value = '' }, 1200)
}

// —— AI 生成辅助 ——

/** 当前 provider 是否已配置 API Key（computed 用闭包捕获 aiProvider） */
const aiKeyConfigured = computed(() => getProviderKey(aiProvider.value).length > 0)

/** 根据当前端口元数据拼 system prompt，让 AI 知道有哪些变量可用 */
function buildSystemPrompt(): string {
  const inputLines = inputs.value.length > 0
    ? inputs.value.map(i => `  - ${i.name} (${i.kind})`).join('\n')
    : '  （无）'
  const outputLines = outputs.value.length > 0
    ? outputs.value.map(o => `  - ${o.name} (${o.kind})`).join('\n')
    : '  - result (number)'

  return `你是 CanvasDesk 代码节点助手。请根据用户需求，生成一段可直接运行的 JS 函数体。

## 重要规则
- 只输出纯 JS 代码，不要写 function 包裹、不要用 \`\`\`js/\`\`\` 包裹，不要写解释文字
- 代码里直接用输入端口变量名引用上游数据
- 提交输出时调用 callOutputPort(端口名, 值)；也可以直接 return 一个值，会自动提交到第一个输出端口
- 支持顶层 await，可直接 require('包名') 引入已安装的 npm 依赖
- Node API（process, Buffer）和 Web API（fetch, File）都可用

## 当前输入端口（函数体里直接用这些变量名）：
${inputLines}

## 可用输出端口（callOutputPort 里用这些名字）：
${outputLines}`
}

/** 清理 AI 返回里的 ```js ... ``` 包裹，返回纯代码 */
function stripCodeFence(text: string): string {
  const trimmed = text.trim()
  const fenceMatch = trimmed.match(/^```(?:js|javascript)?\s*\n([\s\S]*?)```\s*$/)
  if (fenceMatch) return fenceMatch[1]!.trim()
  return trimmed
}

/** 折叠/展开 AI 面板 */
function toggleAi(): void {
  aiExpanded.value = !aiExpanded.value
  aiError.value = ''
}

/** 取消进行中的 AI 生成 */
function onCancelAi(): void {
  aiAbortController?.abort()
  aiAbortController = null
}

/** 调 LLM API 生成代码 */
async function onGenerateCode(): Promise<void> {
  const prompt = aiPrompt.value.trim()
  if (!prompt || aiLoading.value) return

  const key = getProviderKey(aiProvider.value)
  if (!key) {
    aiError.value = t('aiErrNoKey')
    return
  }

  // —— 覆盖确认：如果编辑区已有代码，先弹 confirm ——
  const existing = code.value.trim()
  if (existing && !confirm(t('aiConfirmOverwrite'))) {
    return
  }

  const { url, model } = resolveLLMEndpoint(aiProvider.value, aiModel.value)
  const myRequestId = ++aiRequestId
  aiLoading.value = true
  aiError.value = ''

  const controller = new AbortController()
  aiAbortController = controller

  try {
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: prompt }
      ],
      stream: false
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    })

    if (aiRequestId !== myRequestId) return // stale 丢弃

    const data = await res.json()

    if (!res.ok) {
      aiError.value = (data?.error?.message as string | undefined) ?? `请求失败（${res.status} ${res.statusText}）`
      return
    }

    const content: unknown = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string') {
      aiError.value = '响应格式异常：未拿到 content 字段'
      return
    }

    const generated = stripCodeFence(content)
    code.value = generated
    codeNode.value?.setCode(generated)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    if (aiRequestId !== myRequestId) return // stale 丢弃
    aiError.value = err instanceof Error ? err.message : String(err)
  } finally {
    if (aiAbortController === controller) aiAbortController = null
    if (aiRequestId === myRequestId) aiLoading.value = false
  }
}
</script>

<template>
  <div class="code-detail">
    <!-- 输入端口管理区 -->
    <div class="inputs">
      <div class="inputs__header">
        <span class="inputs__title">{{ t('inputsTitle') }}</span>
        <button class="inputs__add" type="button" :disabled="!codeNode" :title="t('addInputHint')"
          @click="onAddInput">+</button>
      </div>
      <div v-if="!hasInputs" class="inputs__empty">{{ t('inputsEmpty') }}</div>
      <div v-else class="inputs__list">
        <div v-for="input in inputs" :key="input.id" class="inputs__row"
          :class="{ 'inputs__row--error': inputNameErrors[input.id] }">
          <div style="display: flex;align-items: center;gap: 6px;width: 100%;">
            <div class="code-row inputs__subrow">
              <span class="code-row__label">{{ t('typeLabel') }}</span>
              <select class="code-select" :value="input.kind" :disabled="!codeNode" :title="t('inputKindHint')"
                @change="(e) => onInputKindChange(input.id, e)">
                <option value="number">number</option>
                <option value="string">string</option>
                <option value="bool">bool</option>
                <option value="file">file</option>
                <option value="json">json</option>
              </select>
            </div>
            <div class="code-row inputs__subrow">
              <span class="code-row__label">{{ t('varNameLabel') }}</span>
              <input class="code-input" type="text" :value="input.name" :disabled="!codeNode" maxlength="32"
                @input="(e) => onInputNameChange(input.id, e)" />
            </div>
            <button class="inputs__remove" type="button" :disabled="!codeNode" :title="t('removeInputHint')"
              @click="onRemoveInput(input.id)">×</button>
          </div>
          <div v-if="inputNameErrors[input.id]">
            <span class="inputs__errmsg">{{ errText(inputNameErrors[input.id])
              }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 输出端口管理区 -->
    <div class="inputs">
      <div class="inputs__header">
        <span class="inputs__title">{{ t('outputsTitle') }}</span>
        <button class="inputs__add" type="button" :disabled="!codeNode" :title="t('addOutputHint')"
          @click="onAddOutput">+</button>
      </div>
      <div v-if="!hasOutputs" class="inputs__empty">{{ t('outputsEmpty') }}</div>
      <div v-else class="inputs__list">
        <div v-for="output in outputs" :key="output.id" class="inputs__row"
          :class="{ 'inputs__row--error': outputNameErrors[output.id] }">
          <div style="display: flex;align-items: center;gap: 6px;width: 100%;">
            <div class="code-row inputs__subrow">
              <span class="code-row__label">{{ t('typeLabel') }}</span>
              <select class="code-select" :value="output.kind" :disabled="!codeNode" :title="t('outputKindHint')"
                @change="(e) => onOutputKindChange(output.id, e)">
                <option value="number">number</option>
                <option value="string">string</option>
                <option value="bool">bool</option>
                <option value="file">file</option>
                <option value="imgfile">img file</option>
                <option value="json">json</option>
              </select>
            </div>
            <div class="code-row inputs__subrow">
              <span class="code-row__label">{{ t('portNameLabel') }}</span>
              <input class="code-input" type="text" :value="output.name" :disabled="!codeNode" maxlength="32"
                @input="(e) => onOutputNameChange(output.id, e)" />
            </div>
            <button class="inputs__remove" type="button" :disabled="!codeNode || outputs.length <= 1"
              :title="t('removeOutputHint')" @click="onRemoveOutput(output.id)">×</button>
          </div>
          <div v-if="outputNameErrors[output.id]">
            <span class="inputs__errmsg">{{ errText(outputNameErrors[output.id])
            }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 用法提示 -->
    <div class="code-hint">
      <div class="code-hint__line">
        <span class="code-hint__line-content">
          <span class="code-hint__key">callOutputPort</span>
          <span class="code-hint__paren">(</span>
          <span class="code-hint__str">{{ t('snippetPortName') }}</span>
          <span class="code-hint__comma">,</span>
          <span class="code-hint__ident">{{ t('snippetValue') }}</span>
          <span class="code-hint__paren">)</span>
        </span>
        <button class="code-hint__copy" type="button" :title="t('copyHint')" @click="onCopyCallOutputPort">
          <span class="code-hint__copy-icon">📋</span>
          <span v-if="copyHint === 'callOutputPort'" class="code-hint__copy-tip">{{ t('copied') }}</span>
        </button>
      </div>
      <div v-if="hasOutputs" class="code-hint__ports">
        <span class="code-hint__ports-label">{{ t('availablePorts') }}</span>
        <span v-for="o in outputs" :key="o.id" class="code-hint__port-tag"
          :title="t('portKindHint', { kind: o.kind })">{{ o.name }}<span class="code-hint__port-kind">:{{ o.kind
          }}</span></span>
      </div>
      <div class="code-hint__line code-hint__line-req">
        <span class="code-hint__line-content">
          <span class="code-hint__key">require</span>
          <span class="code-hint__paren">(</span>
          <span class="code-hint__str">'lodash-es'</span>
          <span class="code-hint__paren">)</span>
        </span>
      </div>
    </div>

    <!-- 依赖管理：全局一次安装，所有 CodeNode 共享 -->
    <div class="code-deps">
      <div class="code-deps__header">
        <span class="code-deps__title">npm 依赖</span>
        <span class="code-deps__count">{{ installedPackages.length }}</span>
      </div>

      <!-- 已装包列表 -->
      <div v-if="installedPackages.length > 0" class="code-deps__list">
        <div v-for="pkg in installedPackages" :key="pkg.name" class="code-deps__row">
          <span class="code-deps__pkg">{{ pkg.name }}</span>
          <span class="code-deps__ver">v{{ pkg.version }}</span>
          <button class="code-deps__remove" type="button" title="卸载" @click="onUninstallPackage(pkg.name)">×</button>
        </div>
      </div>
      <div v-else class="code-deps__empty">尚未安装任何包（所有 CodeNode 共享）</div>

      <!-- 安装输入 -->
      <div class="code-deps__install">
        <input class="code-input code-deps__input" type="text" :value="installInput" :disabled="installing"
          placeholder="包名，如 lodash-es 或 @scope/pkg" @keyup.enter="onInstallPackage"
          @input="installInput = ($event.target as HTMLInputElement).value" />
        <button class="code-deps__btn" type="button" :disabled="installing || !installInput.trim()"
          @click="onInstallPackage">{{ installing ? '安装中…' : '安装' }}</button>
      </div>

      <div v-if="installError" class="code-deps__err">{{ installError }}</div>
      <pre v-if="installLog" class="code-deps__log">{{ installLog }}</pre>
    </div>

    <!-- AI 生成代码面板 -->
    <div class="code-ai">
      <button class="code-ai__toggle" type="button" @click="toggleAi">
        <span class="code-ai__toggle-icon">✨</span>
        <span class="code-ai__toggle-text">{{ t('aiToggle') }}</span>
        <span class="code-ai__toggle-arrow">{{ aiExpanded ? '▲' : '▼' }}</span>
      </button>

      <div v-if="aiExpanded" class="code-ai__panel">
        <textarea v-model="aiPrompt" class="code-ai__textarea" :placeholder="t('aiPromptPlaceholder')" maxlength="1000"
          rows="3" />

        <div class="code-ai__controls">
          <select v-model="aiProvider" class="code-select code-ai__provider" :disabled="aiLoading">
            <option v-for="(preset, key) in LLM_PROVIDERS" :key="key" :value="key">{{ preset.label }}</option>
          </select>
          <input v-model="aiModel" class="code-input code-ai__model" type="text" :disabled="aiLoading"
            :placeholder="t('aiModelPlaceholder')" maxlength="64" />
        </div>

        <div v-if="!aiKeyConfigured" class="code-ai__warn">
          {{ t('aiNoKey') }}
        </div>

        <div v-if="aiError" class="code-ai__err">{{ aiError }}</div>

        <div class="code-ai__actions">
          <button class="code-ai__gen" type="button"
            :disabled="aiLoading || !aiPrompt.trim() || !aiKeyConfigured || !codeNode" @click="onGenerateCode">
            {{ aiLoading ? t('aiGenerating') : t('aiGenerate') }}
          </button>
          <button v-if="aiLoading" class="code-ai__cancel" type="button" @click="onCancelAi">{{ t('aiCancel')
          }}</button>
        </div>
      </div>
    </div>

    <!-- 代码编辑区 -->
    <div class="code-editor-wrapper" @wheel.passive="onEditorWheel">
      <Codemirror :model-value="code" :disabled="!codeNode" :extensions="cmExtensions"
        @update:model-value="onCodeUpdate" />
    </div>

    <!-- 底部操作栏：状态标签 + 自动执行 + 执行按钮 -->
    <div class="detail-panel__actions">
      <button class="detail-panel__run" type="button" :disabled="running || !hasCode"
        :title="hasCode ? t('runHint') : t('runHintNoCode')" @click="onRun">
        {{ running ? t('running') : t('run') }}
      </button>
    </div>
  </div>
</template>

<style scoped lang="less">
.code-detail {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  box-sizing: border-box;
  height: 100%;

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
      color: #6b7280;
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
      flex-direction: column;
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

  .code-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;

    &__label {
      font-size: 12px;
      color: #6b7280;
      user-select: none;
      flex-shrink: 0;
    }
  }

  .code-select,
  .code-input {
    box-sizing: border-box;
    padding: 5px 8px;
    font-size: 12px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #1f2937;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: #fff;
    outline: none;
    transition: border-color 0.15s;

    &:focus {
      border-color: #3b82f6;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .code-select {
    cursor: pointer;
  }

  .code-hint {
    flex-shrink: 0;
    padding: 6px 10px;
    border: 1px dashed #d1d5db;
    border-radius: 6px;
    background: #fafbfc;
    display: flex;
    flex-direction: column;
    gap: 4px;

    &__line {
      display: flex;
      align-items: center;
      gap: 6px;

      &-req {
        margin-top: 2px;
        padding-top: 2px;
        border-top: 1px dashed #e5e7eb;
      }

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

  .code-deps {
    flex-shrink: 0;
    padding: 8px 10px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: #fff;
    display: flex;
    flex-direction: column;
    gap: 6px;

    &__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    &__title {
      font-size: 12px;
      font-weight: 500;
      color: #374151;
    }

    &__count {
      font-size: 10px;
      color: #9aa2ad;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      background: #f3f4f6;
      padding: 1px 6px;
      border-radius: 10px;
    }

    &__list {
      max-height: 120px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    &__row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      padding: 2px 0;
    }

    &__pkg {
      flex: 1;
      color: #1f2937;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }

    &__ver {
      color: #6b7280;
      font-size: 10px;
      flex-shrink: 0;
    }

    &__remove {
      all: unset;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 3px;
      color: #9aa2ad;
      font-size: 13px;
      line-height: 1;
      flex-shrink: 0;
      transition: color 0.15s, background 0.15s;

      &:hover {
        color: #dc2626;
        background: #fee2e2;
      }
    }

    &__empty {
      font-size: 11px;
      color: #9aa2ad;
      font-style: italic;
      padding: 2px 0;
    }

    &__install {
      display: flex;
      gap: 6px;

      .code-deps__input {
        flex: 1;
      }
    }

    &__btn {
      all: unset;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 5px 12px;
      font-size: 12px;
      font-weight: 500;
      color: #fff;
      background: #3b82f6;
      border-radius: 6px;
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

    &__err {
      font-size: 11px;
      color: #dc2626;
      padding: 4px 6px;
      background: #fef2f2;
      border-radius: 4px;
      border: 1px solid #fecaca;
      white-space: pre-wrap;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      max-height: 80px;
      overflow-y: auto;
    }

    &__log {
      font-size: 10px;
      color: #374151;
      padding: 4px 6px;
      background: #f3f4f6;
      border-radius: 4px;
      margin: 0;
      white-space: pre-wrap;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      max-height: 80px;
      overflow-y: auto;
    }
  }

  // —— AI 生成面板 ——
  .code-ai {
    flex-shrink: 0;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: #fff;
    overflow: hidden;

    &__toggle {
      all: unset;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 500;
      color: #374151;
      background: #fafbfc;
      transition: background 0.15s;

      &:hover {
        background: #f3f4f6;
      }

      &-icon {
        font-size: 14px;
        line-height: 1;
      }

      &-text {
        flex: 1;
        text-align: left;
      }

      &-arrow {
        font-size: 9px;
        color: #9aa2ad;
      }
    }

    &__panel {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 10px 12px 12px;
      border-top: 1px solid #e5e7eb;
    }

    &__textarea {
      box-sizing: border-box;
      width: 100%;
      resize: vertical;
      padding: 8px 10px;
      font-size: 12px;
      color: #1f2937;
      font-family: inherit;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      background: #fff;
      outline: none;
      transition: border-color 0.15s;

      &:focus {
        border-color: #3b82f6;
      }

      &::placeholder {
        color: #9aa2ad;
      }
    }

    &__controls {
      display: flex;
      gap: 6px;

      .code-ai__provider {
        flex: 1;
      }

      .code-ai__model {
        flex: 1;
      }
    }

    &__warn {
      font-size: 11px;
      color: #d97706;
      padding: 4px 8px;
      background: #fffbeb;
      border-radius: 4px;
      border: 1px solid #fde68a;
    }

    &__err {
      font-size: 11px;
      color: #dc2626;
      padding: 4px 8px;
      background: #fef2f2;
      border-radius: 4px;
      border: 1px solid #fecaca;
      white-space: pre-wrap;
    }

    &__actions {
      display: flex;
      gap: 6px;
    }

    &__gen {
      all: unset;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      height: 28px;
      font-size: 12px;
      font-weight: 500;
      color: #fff;
      background: #3b82f6;
      border-radius: 6px;
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

    &__cancel {
      all: unset;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 28px;
      padding: 0 12px;
      font-size: 12px;
      color: #dc2626;
      border-radius: 6px;
      border: 1px solid #fecaca;
      background: #fff;
      transition: background 0.15s;

      &:hover {
        background: #fef2f2;
      }
    }
  }

  .code-editor-wrapper {
    width: 100%;
    box-sizing: border-box;
    flex: 1;
    min-height: 180px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: #f8fafc;
    overflow: hidden;

    &:focus-within {
      border-color: #3b82f6;
    }

    :deep(.cm-editor) {
      height: 100%;
      font-size: 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      background: transparent;

      &.cm-focused {
        outline: none;
      }
    }

    :deep(.cm-scroller) {
      font-family: inherit;
      line-height: 1.5;
      height: 100%;
      overflow: auto;
    }

    :deep(.cm-content) {
      padding: 8px 0;
    }

    :deep(.cm-gutters) {
      background: transparent;
      border-right: 1px solid #e5e7eb;
      color: #9aa2ad;
      user-select: none;
    }

    :deep(.cm-activeLineGutter) {
      background: transparent;
      color: #374151;
    }

    :deep(.cm-activeLine) {
      background: #f0f4ff;
    }

    :deep(.cm-cursor) {
      border-left-color: #1f2937;
    }

    :deep(.cm-keyword) {
      color: #b91c1c;
    }

    :deep(.cm-string) {
      color: #047857;
    }

    :deep(.cm-number) {
      color: #7c3aed;
    }

    :deep(.cm-comment) {
      color: #9aa2ad;
      font-style: italic;
    }

    :deep(.cm-def) {
      color: #1d4ed8;
    }

    :deep(.cm-variable) {
      color: #1f2937;
    }

    :deep(.cm-property) {
      color: #0369a1;
    }

    :deep(.cm-operator) {
      color: #6b7280;
    }

    :deep(.cm-punctuation) {
      color: #6b7280;
    }

    :deep(.cm-bracket) {
      color: #6b7280;
    }

    :deep(.cm-tag) {
      color: #b91c1c;
    }

    :deep(.cm-attribute) {
      color: #7c3aed;
    }

    :deep(.cm-atom) {
      color: #7c3aed;
    }

    :deep(.cm-meta) {
      color: #9aa2ad;
    }

    :deep(.cm-editor.cm-disabled) {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  // —— 底部操作栏 ——
  .detail-panel__actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
    padding-top: 4px;
    border-top: 1px solid #f0f0f0;
  }

  .detail-panel__status {
    font-size: 11px;
    padding: 2px 8px;
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

  .detail-panel__run {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
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

  // —— autoRun 开关（复用 render.vue 样式逻辑，命名加前缀防冲突） ——
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

      &:checked+.auto-run__slider {
        background: #3b82f6;

        &::after {
          transform: translateX(14px);
        }
      }

      &:disabled+.auto-run__slider {
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
      color: #6b7280;
      line-height: 1;
    }
  }
}
</style>
