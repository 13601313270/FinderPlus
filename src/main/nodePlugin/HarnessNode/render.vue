<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { HarnessNode, type CanvasToolBinding } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import { manualBeginDrag } from '@renderer/composables/useNodePosition'
import type { Node } from '../../engine/node/Node'
import GearIcon from '@renderer/components/icons/GearIcon.vue'
import { useNodeDetail } from '@renderer/composables/useNodeDetail'
import { viewport } from '@renderer/canvas/viewport'

const props = defineProps<{ id: string }>()

const t = useLocalizedMessages(messages)

const harnessNode = shallowRef<HarnessNode | undefined>(undefined)

const nodeTitle = useNodeTitle(() => harnessNode.value, '?')

const { openNodeDetail } = useNodeDetail()

const status = ref<'idle' | 'loading' | 'done' | 'error'>('idle')
const result = ref('')
const hasModel = ref(false)
const modelSummary = ref<{ displayLabel: string; state: string; id: string } | null>(null)
const canvasTools = ref<Array<CanvasToolBinding & { childNode: Node | null }>>([])
const promptConnected = ref(false)
const systemConnected = ref(false)
const localPrompt = ref('')
const localSystem = ref('')
const attachedImages = ref<File[]>([])

/** 图片选择回调：点 "+" 按钮触发（原生文件选择器） */
function onPickImages(files: FileList | null) {
  if (!files || files.length === 0) return
  for (const f of files) {
    if (f.type.startsWith('image/')) attachedImages.value.push(f)
  }
}

/** 移除某张已选图片 */
function removeImage(i: number) {
  attachedImages.value.splice(i, 1)
}

/** 暴露给 template：File → object URL */
function urlOf(file: File): string {
  return URL.createObjectURL(file)
}

/** 本地草稿变更 → 组装 MultiModalValue → commit 到 promptInput 触发执行 */
function commitLocalDraft() {
  const parts: Array<{ type: 'text'; text: string } | { type: 'image'; file: File }> = []
  const text = localPrompt.value.trim()
  if (text) parts.push({ type: 'text', text })
  for (const f of attachedImages.value) parts.push({ type: 'image', file: f })
  if (parts.length === 0) return
  harnessNode.value?.commitPromptMm(parts)
}

let unsubscribe: (() => void) | undefined

// 内置工具名称（硬编码，与 node.ts registerBuiltinTools 一致）
const builtinToolNames = ['json_parse', 'json_get', 'regex_extract', 'url_encode', 'string_replace']

// 槽位拖入高亮态
const modelDropActive = ref(false)
const toolDropActive = ref(false)

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof HarnessNode) {
    harnessNode.value = found
    syncFromNode()
    unsubscribe = found.onChanged(() => syncFromNode())
  }
})

onUnmounted(() => {
  unsubscribe?.()
})

function syncFromNode() {
  const n = harnessNode.value
  if (!n) return
  status.value = n.displayStatus
  result.value = n.displayResult
  hasModel.value = n.hasModel

  // Model 摘要
  const mn = n.modelNode
  if (mn) {
    modelSummary.value = {
      displayLabel: (mn as any).displayLabel ?? mn.id,
      state: mn.state,
      id: mn.id
    }
  } else {
    modelSummary.value = null
  }

  // Tool 摘要：从 children[] 里拿 canvasBindings 对应的子节点
  const bindings = n.canvasTools
  canvasTools.value = bindings.map(b => {
    const child = n.children.find(c => c.id === b.nodeId)
    return { ...b, childNode: child ?? null }
  })

  promptConnected.value = n.promptConnected
  systemConnected.value = n.systemConnected
  localPrompt.value = n.displayPrompt
  localSystem.value = n.displaySystem
}

function onPromptInput(val: string) {
  localPrompt.value = val
  harnessNode.value?.setPrompt(val)
}

function onSystemInput(val: string) {
  localSystem.value = val
  harnessNode.value?.setSystem(val)
}

function onStopClick() {
  harnessNode.value?.cancelRun()
}

function onReleaseModel() {
  const n = harnessNode.value
  if (n && n.modelNode) {
    n.removeChild(n.modelNode)
  }
}

function onReleaseTool(toolName: string) {
  const n = harnessNode.value
  if (!n) return
  const binding = n.canvasTools.find(b => b.toolName === toolName)
  if (!binding) return
  const child = n.children.find(c => c.id === binding.nodeId)
  if (child) {
    n.removeChild(child)
  } else {
    // 兜底：如果节点不在 children 里（被删了），只清 binding
    n.removeTool(toolName)
  }
}

/**
 * 子节点卡片被拖走：pointerdown 时先从 HarnessNode 释放（containerNode 清除 →
 * App.vue filter 放行 → 子节点在画布上可见），然后手动启动 pointer 链路。
 * 松手时 App.vue 的 onGlobalPointerUp 会统一结算（命中目标节点就 onNodeDrop，
 * 没命中就当普通移动留在画布上）。
 */
function startChildDrag(childNode: any, e: PointerEvent) {
  if (!childNode) return
  const n = harnessNode.value
  if (!n) return
  e.stopPropagation()
  n.removeChild(childNode as Node)
  requestAnimationFrame(() => {
    manualBeginDrag(childNode, e)
  })
}

// —— 槽位拖入视觉态 ——
function onSlotDragOver(e: DragEvent, which: 'model' | 'tool') {
  e.preventDefault()
  if (which === 'model') modelDropActive.value = true
  else toolDropActive.value = true
}
function onSlotDragLeave(which: 'model' | 'tool') {
  if (which === 'model') modelDropActive.value = false
  else toolDropActive.value = false
}

// —— 子节点图标：按 type 映射 emoji 图标（简化版）——
function nodeTypeEmoji(type: string): string {
  if (type === 'llm') return '🧠'
  if (type.includes('http')) return '🌐'
  if (type.includes('code')) return '💻'
  if (type.includes('table') || type.includes('sql')) return '🗄️'
  if (type.includes('image')) return '🖼️'
  if (type.includes('audio')) return '🔊'
  if (type.includes('text')) return '📝'
  if (type.includes('json')) return '📦'
  return '🔧'
}

// —— 子节点状态颜色 ——
function stateColor(state: string): string {
  switch (state) {
    case 'running': return '#3b82f6'
    case 'error': return '#ef4444'
    case 'dirty': return '#f59e0b'
    default: return '#22c55e'
  }
}

// —— resize handle ——
const MIN_W = 320
const MIN_H = 280
let resizing = false
let resizeStartX = 0
let resizeStartY = 0
let resizeStartW = 0
let resizeStartH = 0

function onResizeStart(e: PointerEvent): void {
  if (!harnessNode.value) return
  e.stopPropagation()
  e.preventDefault()
  resizing = true
  resizeStartX = e.clientX
  resizeStartY = e.clientY
  const [w, h] = harnessNode.value.box
  resizeStartW = w || 360
  resizeStartH = h || 420
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  window.addEventListener('pointermove', onResizeMove)
  window.addEventListener('pointerup', onResizeEnd)
}

function onResizeMove(e: PointerEvent): void {
  if (!resizing || !harnessNode.value) return
  const scale = viewport.scale || 1
  const dw = (e.clientX - resizeStartX) / scale
  const dh = (e.clientY - resizeStartY) / scale
  harnessNode.value.setBox(
    Math.max(MIN_W, Math.round(resizeStartW + dw)),
    Math.max(MIN_H, Math.round(resizeStartH + dh))
  )
}

function onResizeEnd(): void {
  resizing = false
  window.removeEventListener('pointermove', onResizeMove)
  window.removeEventListener('pointerup', onResizeEnd)
}

// —— Tool 编辑弹窗 ——
const editingTool = ref<{ toolName: string; toolNameInput: string; descInput: string } | null>(null)

function openToolEditor(binding: CanvasToolBinding) {
  editingTool.value = {
    toolName: binding.toolName,
    toolNameInput: binding.toolName,
    descInput: binding.description
  }
}

function saveToolEditor() {
  if (!editingTool.value) return
  const cur = editingTool.value
  const trimmedName = cur.toolNameInput.trim()
  const trimmedDesc = cur.descInput.trim()
  if (!trimmedName || !trimmedDesc) return
  harnessNode.value?.updateToolBinding(cur.toolName, {
    toolName: trimmedName,
    description: trimmedDesc
  })
  editingTool.value = null
}

function closeToolEditor() {
  editingTool.value = null
}
</script>

<template>
  <div class="harness-node">
    <NodeHeader :title="nodeTitle">
      <template #actions>
        <button class="node__gear" type="button" @pointerdown.stop @click.stop="openNodeDetail(id)">
          <GearIcon />
        </button>
      </template>
    </NodeHeader>

    <!-- ── 卡槽区 ── -->

    <!-- Model 卡槽 -->
    <div
      class="card-slot"
      :class="{
        'card-slot--drop-active': modelDropActive,
        'card-slot--filled': hasModel,
        'card-slot--empty': !hasModel
      }"
      @dragover="(e) => onSlotDragOver(e, 'model')"
      @dragleave="onSlotDragLeave('model')"
    >
      <div class="card-slot__label">
        <span class="card-slot__badge card-slot__badge--model">Model</span>
      </div>
      <template v-if="hasModel && modelSummary">
        <div class="embedded-node" @pointerdown.stop="startChildDrag(harnessNode?.modelNode ?? null, $event)">
          <span class="embedded-node__emoji">🧠</span>
          <div class="embedded-node__info">
            <div class="embedded-node__name">{{ modelSummary.displayLabel }}</div>
            <div
              class="embedded-node__status"
              :style="{ color: stateColor(modelSummary.state) }"
            >● {{ modelSummary.state }}</div>
          </div>
          <button class="embedded-node__release" type="button"
            @pointerdown.stop
            @click.stop="onReleaseModel" title="释放回画布">↩</button>
        </div>
      </template>
      <template v-else>
        <div class="card-slot__drop-hint">{{ t('modelHint') }}</div>
      </template>
    </div>

    <!-- Tools 卡槽 -->
    <div class="card-slot card-slot--tool" :class="{ 'card-slot--drop-active': toolDropActive }"
      @dragover="(e) => onSlotDragOver(e, 'tool')"
      @dragleave="onSlotDragLeave('tool')"
    >
      <div class="card-slot__label">
        <span class="card-slot__badge card-slot__badge--tools">Tools</span>
        <span v-if="canvasTools.length > 0" class="card-slot__count">{{ canvasTools.length }}</span>
      </div>
      <template v-if="canvasTools.length > 0">
        <div class="embedded-nodes-grid">
          <div v-for="tool in canvasTools" :key="tool.toolName" class="embedded-node embedded-node--compact"
               @pointerdown.stop="startChildDrag(tool.childNode, $event)">
            <span class="embedded-node__emoji">
              {{ nodeTypeEmoji(tool.childNode?.type ?? '') }}
            </span>
            <div class="embedded-node__info">
              <div class="embedded-node__name" :title="tool.toolName">{{ tool.toolName }}</div>
              <div v-if="tool.childNode" class="embedded-node__status" :style="{ color: stateColor(tool.childNode.state) }">
                ● {{ tool.childNode.state }}
              </div>
            </div>
            <button class="embedded-node__edit" type="button"
              @pointerdown.stop
              @click.stop="openToolEditor(tool)" title="编辑 tool 名称和描述">⚙</button>
            <button class="embedded-node__release" type="button"
              @pointerdown.stop
              @click.stop="onReleaseTool(tool.toolName)" title="释放回画布">↩</button>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="card-slot__drop-hint">{{ t('toolHint') }}</div>
      </template>
    </div>

    <!-- 内置工具（只读 tag） -->
    <div class="builtin-row">
      <span class="builtin-row__label">{{ t('builtinHeader') }}:</span>
      <span v-for="n in builtinToolNames" :key="n" class="builtin-row__tag">{{ n }}</span>
    </div>

    <!-- ── Prompt 区 ── -->
    <div class="prompt-area">
      <textarea
        v-if="!systemConnected"
        v-model="localSystem"
        class="textarea textarea--system"
        placeholder="System"
        rows="1"
        @input="(e) => onSystemInput((e.target as HTMLTextAreaElement).value)"
      />
      <textarea
        v-if="!promptConnected"
        v-model="localPrompt"
        class="textarea textarea--prompt"
        :placeholder="t('promptPlaceholder')"
        rows="2"
        @input="(e) => onPromptInput((e.target as HTMLTextAreaElement).value)"
      />
      <!-- 多模态输入区（本地草稿才显示） -->
      <template v-if="!promptConnected">
        <!-- 已选图片预览 -->
        <div v-if="attachedImages.length > 0" class="image-previews">
          <div v-for="(f, i) in attachedImages" :key="i" class="image-chip">
            <img :src="urlOf(f)" class="image-chip-thumb" />
            <button class="image-chip-x" @click="removeImage(i)">×</button>
          </div>
        </div>
        <!-- 图片选择按钮 + 发送按钮 -->
        <div class="draft-actions">
          <label class="btn btn--pick" :title="t('pickImage')">
            <input type="file" accept="image/*" multiple hidden @change="(e) => onPickImages((e.target as HTMLInputElement).files)" />
            ＋ {{ t('pickImage') }}
          </label>
          <button class="btn btn--send" :disabled="status === 'loading' || (!localPrompt.trim() && attachedImages.length === 0) || !hasModel" @click="commitLocalDraft">
            {{ status === 'loading' ? t('loading') : t('send') }}
          </button>
        </div>
      </template>
    </div>

    <!-- ── 结果区 ── -->
    <div
      class="result-box"
      :class="{
        'result-box--loading': status === 'loading',
        'result-box--error': status === 'error',
        'result-box--empty': !result && status !== 'loading'
      }"
    >
      <template v-if="status === 'loading'">
        <span class="spinner" /> {{ t('loading') }}
      </template>
      <template v-else-if="status === 'error'">
        ⚠ {{ result }}
      </template>
      <template v-else-if="result">
        <pre class="result-text">{{ result }}</pre>
      </template>
      <template v-else-if="!hasModel">
        <span class="placeholder">{{ t('waitingModel') }}</span>
      </template>
      <template v-else>
        <span class="placeholder">{{ t('promptPlaceholder') }}</span>
      </template>
    </div>

    <!-- ── 取消按钮（只有 loading 时出现） ── -->
    <div v-if="status === 'loading'" class="footer">
      <button class="btn btn--danger" type="button" @click="onStopClick">{{ t('stop') }}</button>
    </div>

    <!-- ── resize handle（右下角） ── -->
    <div class="resize-handle" @pointerdown="onResizeStart" title="拖动调整尺寸" />

    <!-- ── Tool 编辑弹窗 ── -->
    <Teleport to="body">
      <div v-if="editingTool" class="harness-modal-backdrop" @click.self="closeToolEditor">
        <div class="harness-modal">
          <div class="harness-modal__header">
            <span>Tool 配置</span>
            <button class="harness-modal__close" type="button" @click="closeToolEditor">✕</button>
          </div>
          <div class="harness-modal__body">
            <label class="harness-field">
              <span class="harness-field__label">Tool Name（LLM 调用时的函数名）</span>
              <input v-model="editingTool.toolNameInput" class="harness-input" spellcheck="false" />
            </label>
            <label class="harness-field">
              <span class="harness-field__label">Description（告诉 LLM 这个工具能干啥）</span>
              <textarea v-model="editingTool.descInput" class="harness-input harness-textarea--tool-desc" rows="6" spellcheck="false" />
            </label>
          </div>
          <div class="harness-modal__footer">
            <button class="btn harness-btn--ghost" type="button" @click="closeToolEditor">取消</button>
            <button class="btn btn--primary" type="button" @click="saveToolEditor">保存</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="less">
.harness-node {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px 8px;
}

// ── 卡槽 ──
.card-slot {
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  padding: 6px 8px;
  transition: border-color 0.15s, background 0.15s;

  &--drop-active {
    border-color: #3b82f6;
    background: #eff6ff;
    border-style: solid;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
  &--filled { border-style: solid; border-color: #22c55e; background: #f0fdf4; }
  &--tool {
    min-height: 40px;
    flex-shrink: 0;
  }

  &__label {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }
  &__badge {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.5px;
    padding: 1px 8px;
    border-radius: 3px;
    color: #fff;
    &--model { background: linear-gradient(135deg, #6366f1, #8b5cf6); }
    &--tools { background: linear-gradient(135deg, #0ea5e9, #06b6d4); }
  }
  &__count { font-size: 11px; color: #64748b; font-weight: 600; }
  &__drop-hint {
    font-size: 11px;
    color: #94a3b8;
    font-style: italic;
    text-align: center;
    padding: 6px 0;
  }
}

// ── 被嵌入的子节点卡片 ──
.embedded-node {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: #fff;
  border-radius: 6px;
  border: 1px solid #e2e8f0;

  &--compact {
    flex: 1 1 calc(50% - 4px);
    min-width: 120px;
    padding: 4px 6px;
  }

  &__emoji { font-size: 18px; line-height: 1; flex-shrink: 0; }
  &__info { flex: 1; min-width: 0; }
  &__name {
    font-size: 12px;
    font-weight: 600;
    color: #1e293b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  &__status {
    font-size: 10px;
    font-family: ui-monospace, Menlo, monospace;
  }
  &__edit {
    all: unset;
    cursor: pointer;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    font-size: 12px;
    color: #94a3b8;
    &:hover { background: #dbeafe; color: #2563eb; }
    flex-shrink: 0;
  }
  &__release {
    all: unset;
    cursor: pointer;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    font-size: 14px;
    color: #94a3b8;
    &:hover { background: #fee2e2; color: #dc2626; }
    flex-shrink: 0;
  }
}

.embedded-nodes-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

// ── 内置工具 ──
.builtin-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 3px;
  font-size: 10px;
  &__label { color: #94a3b8; font-weight: 600; }
  &__tag {
    padding: 1px 6px;
    border-radius: 3px;
    background: #f1f5f9;
    color: #64748b;
    font-family: ui-monospace, Menlo, monospace;
  }
}

// ── Prompt ──
.prompt-area { display: flex; flex-direction: column; gap: 4px; }
.textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 8px;
  font-size: 12px;
  font-family: inherit;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  outline: none;
  resize: none;
  line-height: 1.4;
  transition: border-color 0.15s;
  &:focus { border-color: #3b82f6; }
  &--system { background: #fafafa; color: #64748b; }
  &--prompt { min-height: 48px; }
}

// ── 结果 ──
.result-box {
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  min-height: 40px;
  max-height: 120px;
  overflow: auto;
  display: flex;
  gap: 6px;
  align-items: flex-start;

  &--loading { color: #3b82f6; align-items: center; border-color: #bfdbfe; background: #f0f9ff; }
  &--error { color: #dc2626; border-color: #fecaca; background: #fef2f2; }
  &--empty { color: #94a3b8; font-style: italic; }

  .spinner {
    width: 10px; height: 10px;
    border: 2px solid #bfdbfe; border-top-color: #3b82f6;
    border-radius: 50%;
    animation: harness-spin 0.7s linear infinite;
    flex-shrink: 0;
  }
  .result-text { margin: 0; font-family: inherit; white-space: pre-wrap; word-break: break-all; }
  .placeholder { color: #cbd5e1; font-style: italic; }
}

// ── Footer ──
.footer { display: flex; justify-content: flex-end; }

// ── Resize Handle ──
.resize-handle {
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 14px;
  height: 14px;
  cursor: nwse-resize;
  z-index: 10;
  background:
    linear-gradient(135deg, transparent 0 50%, #94a3b8 50% 60%, transparent 60% 70%, #94a3b8 70% 80%, transparent 80% 90%, #94a3b8 90% 100%);
  border-radius: 2px;
  pointer-events: auto;
  opacity: 0.5;
  transition: opacity 0.15s;

  &:hover { opacity: 1; }
}

.btn {
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  font-size: 12px;
  font-weight: 500;
  color: #fff;
  border-radius: 6px;
  height: 28px;
  transition: background 0.15s;

  &--primary {
    background: #3b82f6;
    &:hover:not(:disabled) { background: #2563eb; }
    &:disabled { cursor: not-allowed; background: #93c5fd; }
  }
  &--danger {
    background: #ef4444;
    &:hover { background: #dc2626; }
  }
}

// ── 多模态输入区 ──
.image-previews {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}
.image-chip {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}
.image-chip-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.image-chip-x {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(0,0,0,0.6);
  color: #fff;
  font-size: 11px;
  line-height: 16px;
  text-align: center;
  cursor: pointer;
  border: none;
  padding: 0;
}
.draft-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
  gap: 8px;
}
.btn--pick {
  background: #f1f5f9;
  color: #475569;
  height: 24px;
  padding: 0 10px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  border: 1px dashed #cbd5e1;
  flex-shrink: 0;
  &:hover { background: #e2e8f0; }
}
.btn--send {
  background: #6366f1;
  color: #fff;
  height: 24px;
  padding: 0 14px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  &:hover:not(:disabled) { background: #4f46e5; }
  &:disabled { cursor: not-allowed; background: #a5b4fc; }
}
</style>

<!-- Teleport 到 body 的弹窗样式，必须非 scoped -->
<style lang="less">
.harness-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  pointer-events: auto;
}
.harness-modal {
  background: #fff;
  border-radius: 10px;
  width: 420px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 80vh;
  font-family: inherit;
}
.harness-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  border-bottom: 1px solid #e2e8f0;
}
.harness-modal__close {
  all: unset;
  cursor: pointer;
  font-size: 18px;
  color: #94a3b8;
  padding: 2px 6px;
  border-radius: 4px;
  &:hover { background: #f1f5f9; color: #334155; }
}
.harness-modal__body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}
.harness-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid #e2e8f0;
  background: #fafafa;
}
.harness-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.harness-field__label {
  font-size: 11px;
  font-weight: 600;
  color: #475569;
}
.harness-input {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 10px;
  font-size: 12px;
  font-family: ui-monospace, Menlo, monospace;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  outline: none;
  transition: border-color 0.15s;
  &:focus { border-color: #3b82f6; }
}
.harness-textarea--tool-desc {
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  font-size: 12px;
  line-height: 1.5;
}
.harness-btn--ghost {
  background: transparent;
  color: #64748b;
  &:hover { background: #f1f5f9; color: #334155; }
}

.node__gear {
  all: unset;
  cursor: pointer;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f3f4f6;
  color: #6b7280;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;

  svg {
    width: 12px;
    height: 12px;
  }

  &:hover {
    background: #dbeafe;
    color: #2563eb;
  }
}

@keyframes harness-spin { to { transform: rotate(360deg); } }
</style>
