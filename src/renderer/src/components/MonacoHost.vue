<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import * as monaco from 'monaco-editor'
import { globalMonaco, __setEditorModel } from '@renderer/services/globalMonaco'

const containerEl = ref<HTMLElement | null>(null)
const wrapperEl = ref<HTMLElement | null>(null)

let editor: monaco.editor.IStandaloneCodeEditor | null = null
let model: monaco.editor.ITextModel | null = null

/** 编辑器当前内容（本地持有，不回写 state.content，避免双向回滚） */
const editorContent = ref('')

let lastDisposable: monaco.IDisposable | null = null

onMounted(() => {
  if (!containerEl.value) return

  model = monaco.editor.createModel(globalMonaco.state.content, globalMonaco.state.language)
  editor = monaco.editor.create(containerEl.value, {
    model,
    readOnly: globalMonaco.state.readOnly,
    theme: 'vs-dark',
    automaticLayout: false, // 手动 layout（visible 变 true 时），避免 hidden 状态下尺寸为 0
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    fontSize: 13,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace',
    lineNumbers: 'on',
    wordWrap: 'on',
    tabSize: 2,
    scrollBeyondLastColumn: 0
  })

  __setEditorModel(model)

  // 内容变更 → 只存本地，不回写 state.content
  lastDisposable = editor.onDidChangeModelContent(() => {
    editorContent.value = editor!.getValue()
  })

  // 初始值同步
  editorContent.value = globalMonaco.state.content
})

onBeforeUnmount(() => {
  lastDisposable?.dispose()
  lastDisposable = null
  editor?.dispose()
  model?.dispose()
  editor = null
  model = null
  __setEditorModel(null)
})

// —— watch：响应 globalMonaco.state 变化 ——

watch(
  () => globalMonaco.state.visible,
  async (visible) => {
    if (!visible) return
    // 容器从 hidden 变 visible，DOM 刚展开时尺寸还没就绪 → nextTick 再 layout
    await nextTick()
    editor?.layout()
    editor?.focus()
  }
)

watch(
  () => globalMonaco.state.language,
  (lang) => {
    if (model) monaco.editor.setModelLanguage(model, lang)
  }
)

watch(
  () => globalMonaco.state.readOnly,
  (ro) => {
    editor?.updateOptions({ readOnly: ro })
  }
)

/**
 * 内容同步：只在"模型当前值 ≠ state.content"时覆盖。
 * 外部 open 时传入新内容 → 覆盖编辑器
 * 用户正在编辑 → 内容和 model 一致，不会触发覆盖（因为 onDidChangeModelContent 里存了本地 ref，
 * 但 state.content 保持 open 时的值不变，直到 save 后才可能被外部更新）
 */
watch(
  () => globalMonaco.state.content,
  (newContent) => {
    if (!model) return
    if (model.getValue() !== newContent) {
      editorContent.value = newContent
      const selections = editor?.getSelection() ?? undefined
      const cursorPos = editor?.getPosition() ?? undefined
      model.setValue(newContent)
      // 保持光标位置（如果在有效范围内）
      if (cursorPos) {
        editor?.setPosition(cursorPos)
      }
      if (selections) {
        editor?.setSelection(selections)
      }
    }
  }
)

// —— 关闭 ——

function handleClose(): void {
  globalMonaco.close()
}

/** ESC 关闭 */
function onKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    e.preventDefault()
    handleClose()
  }
  // Ctrl/Cmd + S → 保存
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    handleSave()
  }
}

/** 点击 overlay 空白处关闭（点击面板内部不关闭） */
function onOverlayClick(e: MouseEvent): void {
  if (e.target === wrapperEl.value) {
    handleClose()
  }
}

// —— 保存 ——

const showUnsavedHint = ref(false)
let unsavedHintTimer: ReturnType<typeof setTimeout> | undefined

function handleSave(): void {
  globalMonaco.save()
  showUnsavedHint.value = true
  clearTimeout(unsavedHintTimer)
  unsavedHintTimer = setTimeout(() => {
    showUnsavedHint.value = false
  }, 1200)
}
</script>

<template>
  <!-- 全屏遮罩 + 居中面板 -->
  <div
    v-show="globalMonaco.state.visible"
    ref="wrapperEl"
    class="monaco-overlay"
    @pointerdown="onOverlayClick"
    @keydown="onKeyDown"
  >
    <div class="monaco-panel" @pointerdown.stop>
      <!-- 顶部工具栏 -->
      <div class="monaco-toolbar">
        <div class="monaco-toolbar__title">
          <span class="monaco-toolbar__label">{{ globalMonaco.state.title }}</span>
          <span class="monaco-toolbar__lang">{{ globalMonaco.state.language }}</span>
          <span v-if="globalMonaco.state.readOnly" class="monaco-toolbar__readonly">只读</span>
        </div>
        <div class="monaco-toolbar__actions">
          <button
            v-if="!globalMonaco.state.readOnly"
            class="monaco-toolbar__save"
            type="button"
            @click.stop="handleSave"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M3 2h9l1 1v9a2 2 0 0 1-2 2H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
              <path d="M5 2v4h6V2M7 10h2" />
            </svg>
            <span>{{ showUnsavedHint ? '已保存' : '保存' }}</span>
          </button>
          <button
            class="monaco-toolbar__close"
            type="button"
            title="关闭 (Esc)"
            @click.stop="handleClose"
          >
            ×
          </button>
        </div>
      </div>

      <!-- Monaco 编辑器容器 -->
      <div class="monaco-body">
        <div ref="containerEl" class="monaco-editor-host" />
      </div>

      <!-- 底部状态栏 -->
      <div class="monaco-statusbar">
        <span class="monaco-statusbar__cursor">行 1, 列 1</span>
        <span class="monaco-statusbar__hint">Ctrl/Cmd+S 保存 · Esc 关闭</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.monaco-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

.monaco-panel {
  width: 80vw;
  height: 80vh;
  max-width: 1400px;
  max-height: 900px;
  background: #1e1e1e;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  border: 1px solid #3a3d41;
}

.monaco-toolbar {
  flex-shrink: 0;
  height: 40px;
  background: #252526;
  border-bottom: 1px solid #3a3d41;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;

  &__title {
    display: flex;
    align-items: center;
    gap: 8px;
    overflow: hidden;
  }

  &__label {
    color: #e0e0e0;
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 400px;
  }

  &__lang {
    color: #9cdcfe;
    font-size: 11px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    background: rgba(156, 220, 254, 0.15);
    border-radius: 3px;
    padding: 1px 6px;
    flex-shrink: 0;
  }

  &__readonly {
    color: #dcdcaa;
    font-size: 11px;
    background: rgba(220, 220, 170, 0.15);
    border-radius: 3px;
    padding: 1px 6px;
    flex-shrink: 0;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  &__save {
    all: unset;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 12px;
    border-radius: 4px;
    background: #0e639c;
    color: #fff;
    font-size: 12px;
    transition: background 0.15s;

    &:hover {
      background: #1177bb;
    }

    &:active {
      background: #0a4a74;
    }

    svg {
      flex-shrink: 0;
    }
  }

  &__close {
    all: unset;
    cursor: pointer;
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    color: #ccc;
    font-size: 18px;
    line-height: 1;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: #ea1123;
      color: #fff;
    }
  }
}

.monaco-body {
  flex: 1;
  min-height: 0; // 关键：让子元素能正确计算高度
  position: relative;
}

.monaco-editor-host {
  position: absolute;
  inset: 0;
}

// —— Monaco 内置的 DOM 样式微调（vs-dark theme 基础上微调背景和边框） ——
:deep(.monaco-editor) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace;
}

:deep(.monaco-editor .margin) {
  background: #1e1e1e !important;
}

.monaco-statusbar {
  flex-shrink: 0;
  height: 22px;
  background: #007acc;
  color: #fff;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;

  &__cursor {
    opacity: 0.85;
  }

  &__hint {
    opacity: 0.7;
  }
}
</style>
