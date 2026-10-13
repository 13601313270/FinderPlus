<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { BrowserNode, type ScriptItem } from './node'

/**
 * 浏览器节点的详情面板：
 * - 输入端口增删（$1…$N 占位符在 URL 模板里引用）
 * - 用户自定义脚本（增删改；每段脚本在 render.vue 里渲染成按钮）
 *
 * URL 编辑已在 render.vue 的地址栏提供，这里不重复。
 */
const props = defineProps<{ nodeId: string }>()

const browserNode = computed(() => {
  const n = workspaceScene.getNode(props.nodeId)
  return n instanceof BrowserNode ? n : undefined
})

const inputCount = ref(1)
const homeUrl = ref('')
const resolvedUrl = ref('')
const scripts = ref<ScriptItem[]>([])

// 脚本编辑状态
const editingId = ref<string | null>(null)
const editingName = ref('')
const editingCode = ref('')

let offChanged: (() => void) | undefined

onMounted(() => {
  const node = browserNode.value
  if (!node) return
  sync(node)
  offChanged = node.onChanged(() => {
    if (browserNode.value) sync(browserNode.value)
  })
})

onUnmounted(() => { offChanged?.() })

function sync(node: BrowserNode): void {
  inputCount.value = node.inputCount
  homeUrl.value = node.displayHomeUrl
  resolvedUrl.value = node.displayResolvedUrl
  scripts.value = node.getScripts()
}

watch(() => props.nodeId, () => {
  const node = browserNode.value
  if (node) sync(node)
  editingId.value = null
})

function onAddPort(): void { browserNode.value?.addInputPort() }
function onRemovePort(): void { browserNode.value?.removeLastInputPort() }

// —— 脚本编辑 ——

function startNewScript(): void {
  editingId.value = '__new__'
  editingName.value = ''
  editingCode.value = ''
}

function startEditScript(s: ScriptItem): void {
  editingId.value = s.id
  editingName.value = s.name
  editingCode.value = s.code
}

function cancelEdit(): void {
  editingId.value = null
  editingName.value = ''
  editingCode.value = ''
}

function saveScript(): void {
  if (!browserNode.value) return
  const name = editingName.value.trim() || '未命名'
  const code = editingCode.value.trim()
  if (!code) return

  if (editingId.value === '__new__') {
    browserNode.value.addScript(name, code)
  } else if (editingId.value) {
    browserNode.value.updateScript(editingId.value, { name, code })
  }
  cancelEdit()
}

function deleteScript(id: string): void {
  browserNode.value?.deleteScript(id)
  if (editingId.value === id) cancelEdit()
}
</script>

<template>
  <div class="detail-panel">

    <!-- 当前 URL 预览（只读，编辑去节点卡片的地址栏） -->
    <div class="detail-panel__section">
      <label class="detail-panel__label">起始 URL（在节点卡片地址栏编辑）</label>
      <div class="detail-panel__preview">{{ homeUrl || '—' }}</div>
    </div>

    <div class="detail-panel__section">
      <label class="detail-panel__label">占位符解析结果（$1…$N → 输入端口当前值）</label>
      <div class="detail-panel__preview">{{ resolvedUrl || '—' }}</div>
    </div>

    <!-- 端口增删 -->
    <div class="detail-panel__section">
      <label class="detail-panel__label">
        输入端口：{{ inputCount }}
        <span class="detail-panel__hint">（URL 里用 $1、$2 … 引用）</span>
      </label>
      <div class="detail-panel__ports-actions">
        <button
          class="detail-panel__btn"
          type="button"
          :disabled="!browserNode || inputCount <= 1"
          @click="onRemovePort"
        >－</button>
        <button
          class="detail-panel__btn detail-panel__btn--primary"
          type="button"
          :disabled="!browserNode"
          @click="onAddPort"
        >＋</button>
      </div>
    </div>

    <!-- —— 用户脚本管理 —— -->
    <div class="detail-panel__section">
      <div class="detail-panel__section-header">
        <label class="detail-panel__label">
          自定义脚本
          <span class="detail-panel__hint">（每段在节点卡片上渲染成按钮）</span>
        </label>
        <button
          class="detail-panel__btn detail-panel__btn--primary detail-panel__btn--sm"
          type="button"
          :disabled="!browserNode || editingId === '__new__'"
          @click="startNewScript"
        >新增</button>
      </div>

      <!-- 已有脚本列表 -->
      <div v-if="scripts.length > 0" class="detail-panel__scripts-list">
        <div
          v-for="s in scripts"
          :key="s.id"
          class="detail-panel__script-item"
        >
          <span class="detail-panel__script-name">{{ s.name }}</span>
          <span class="detail-panel__script-code">{{ s.code.slice(0, 60) }}{{ s.code.length > 60 ? '…' : '' }}</span>
          <div class="detail-panel__script-actions">
            <button
              class="detail-panel__btn detail-panel__btn--sm"
              type="button"
              :disabled="editingId !== null"
              @click="startEditScript(s)"
            >编辑</button>
            <button
              class="detail-panel__btn detail-panel__btn--sm"
              type="button"
              :disabled="editingId !== null"
              @click="deleteScript(s.id)"
            >删除</button>
          </div>
        </div>
      </div>

      <!-- 编辑/新增表单 -->
      <div v-if="editingId !== null" class="detail-panel__script-editor">
        <input
          v-model="editingName"
          class="detail-panel__input"
          type="text"
          placeholder="按钮名称（如：抓取标题）"
          maxlength="24"
        />
        <textarea
          v-model="editingCode"
          class="detail-panel__textarea"
          rows="4"
          placeholder="在网页上下文执行的 JS 代码，例如：return document.title"
          maxlength="10000"
        />
        <div class="detail-panel__editor-actions">
          <button
            class="detail-panel__btn detail-panel__btn--primary"
            type="button"
            :disabled="!editingCode.trim()"
            @click="saveScript"
          >保存</button>
          <button
            class="detail-panel__btn"
            type="button"
            @click="cancelEdit"
          >取消</button>
        </div>
      </div>

      <div v-else-if="scripts.length === 0" class="detail-panel__empty-hint">
        暂无脚本。新增后节点卡片上会出现一排按钮，点击即可在 webview 页面上下文执行 JS。
      </div>
    </div>

  </div>
</template>

<style scoped lang="less">
.detail-panel {
  box-sizing: border-box;
  height: 100%;
  padding: 16px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;

  &__section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  &__label {
    font-size: 12px;
    font-weight: 600;
    color: #374151;
  }

  &__hint {
    font-size: 11px;
    font-weight: 400;
    color: #9ca3af;
    margin-left: 4px;
  }

  &__preview {
    padding: 8px 10px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: #fafafa;
    font-size: 12px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #4b5563;
    word-break: break-all;
    white-space: pre-wrap;
    min-height: 32px;
  }

  &__ports-actions {
    display: flex;
    gap: 8px;
  }

  &__btn {
    all: unset;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    height: 32px;
    padding: 0 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
    line-height: 1;
    color: #374151;
    transition: border-color 0.15s, color 0.15s, background 0.15s;

    &:hover:not(:disabled) {
      border-color: #2563eb;
      color: #2563eb;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.4;
    }

    &--sm {
      min-width: 0;
      height: 26px;
      padding: 0 8px;
      font-size: 12px;
    }

    &--primary {
      background: #2563eb;
      color: #fff;
      border-color: #2563eb;

      &:hover:not(:disabled) {
        background: #1d4ed8;
        border-color: #1d4ed8;
        color: #fff;
      }
    }
  }

  // —— 脚本列表 ——

  &__scripts-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__script-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: #fafafa;
  }

  &__script-name {
    font-size: 12px;
    font-weight: 600;
    color: #1f2937;
    flex-shrink: 0;
    min-width: 60px;
  }

  &__script-code {
    flex: 1;
    min-width: 0;
    font-size: 11px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #6b7280;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__script-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  // —— 脚本编辑器 ——

  &__script-editor {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    border: 1px solid #bfdbfe;
    border-radius: 6px;
    background: #eff6ff;
  }

  &__input {
    box-sizing: border-box;
    width: 100%;
    padding: 6px 8px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 13px;
    outline: none;
    &:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,0.1); }
  }

  &__textarea {
    box-sizing: border-box;
    width: 100%;
    padding: 8px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 12px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    resize: vertical;
    outline: none;
    min-height: 80px;
    &:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,0.1); }
  }

  &__editor-actions {
    display: flex;
    gap: 6px;
  }

  &__empty-hint {
    font-size: 11px;
    color: #9ca3af;
    line-height: 1.5;
    padding: 8px 10px;
    border: 1px dashed #d1d5db;
    border-radius: 6px;
    text-align: center;
  }
}
</style>
