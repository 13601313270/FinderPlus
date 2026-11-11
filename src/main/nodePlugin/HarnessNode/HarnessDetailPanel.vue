<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { HarnessNode, type HarnessMessage } from './node'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'

const props = defineProps<{ nodeId: string }>()

const t = useLocalizedMessages(messages)

const nodeRef = shallowRef<HarnessNode | undefined>(undefined)
const trajectory = shallowRef<readonly HarnessMessage[]>([])
const iteration = shallowRef(0)
const status = shallowRef<'idle' | 'loading' | 'done' | 'error'>('idle')
const maxIterations = shallowRef(10)

// 用户决策模式：ask / auto
const userDecisionMode = ref<'ask' | 'auto'>('ask')
function onChangeMode(v: 'ask' | 'auto') {
  console.log('[HarnessDetailPanel] onChangeMode called, v=', v, 'nodeRef=', !!nodeRef.value)
  userDecisionMode.value = v
  nodeRef.value?.setUserDecisionMode(v)
  console.log('[HarnessDetailPanel] after set, userDecisionMode.value=', userDecisionMode.value, 'node.userDecisionMode=', nodeRef.value?.userDecisionMode)
}

// 内置工具开关（只展示 5 个常用纯函数工具；define_tool/remove_tool/ask_user 不由这里控制）
const BUILTIN_SWITCHES = ['json_parse', 'json_get', 'regex_extract', 'url_encode', 'string_replace'] as const
type BuiltinSwitchName = typeof BUILTIN_SWITCHES[number]
const builtinSwitches = ref<Record<BuiltinSwitchName, boolean>>({
  json_parse: true, json_get: true, regex_extract: true, url_encode: true, string_replace: true
})
function onToggleBuiltin(name: BuiltinSwitchName) {
  const next = !builtinSwitches.value[name]
  builtinSwitches.value[name] = next
  nodeRef.value?.setBuiltinEnabled(name, next)
}

// 工具名 → 中文 label
const BUILTIN_LABELS: Record<BuiltinSwitchName, string> = {
  json_parse: 'JSON 解析',
  json_get: 'JSON 取值',
  regex_extract: '正则提取',
  url_encode: 'URL 编码/解码',
  string_replace: '字符串替换'
}

// ── Prompt 编辑区（从 render.vue 迁移来） ──
const hasModel = ref(false)
const promptConnected = ref(false)
const systemConnected = ref(false)
const localPrompt = ref('')
const localSystem = ref('')
const attachedImages = ref<File[]>([])

function onPromptInput(val: string) {
  localPrompt.value = val
  nodeRef.value?.setPrompt(val)
}

function onSystemInput(val: string) {
  localSystem.value = val
  nodeRef.value?.setSystem(val)
}

function onPickImages(files: FileList | null) {
  if (!files || files.length === 0) return
  for (const f of files) {
    if (f.type.startsWith('image/')) attachedImages.value.push(f)
  }
}

function removeImage(i: number) {
  attachedImages.value.splice(i, 1)
}

function urlOf(file: File): string {
  return URL.createObjectURL(file)
}

function commitLocalDraft() {
  const parts: Array<{ type: 'text'; text: string } | { type: 'image'; file: File }> = []
  const text = localPrompt.value.trim()
  if (text) parts.push({ type: 'text', text })
  for (const f of attachedImages.value) parts.push({ type: 'image', file: f })
  if (parts.length === 0) return
  nodeRef.value?.commitPromptMm(parts)
}

let unsubscribe: (() => void) | undefined

function sync() {
  const n = nodeRef.value
  if (!n) return
  trajectory.value = n.displayTrajectory
  iteration.value = n.displayIteration
  status.value = n.status
  maxIterations.value = n.displayMaxIterations
  userDecisionMode.value = n.userDecisionMode
  console.log('[HarnessDetailPanel] sync, userDecisionMode=', n.userDecisionMode)
  // 内置工具开关同步
  for (const name of BUILTIN_SWITCHES) {
    builtinSwitches.value[name] = n.getBuiltinEnabled(name)
  }
  // prompt 编辑区同步
  hasModel.value = n.hasModel
  promptConnected.value = n.promptConnected
  systemConnected.value = n.systemConnected
  localPrompt.value = n.displayPrompt
  localSystem.value = n.displaySystem
}

onMounted(() => {
  console.log('[HarnessDetailPanel] onMounted, props.nodeId=', props.nodeId, 'workspaceScene=', !!workspaceScene)
  const n = workspaceScene?.getNode(props.nodeId)
  console.log('[HarnessDetailPanel] getNode result=', n, 'is HarnessNode?', n instanceof HarnessNode)
  if (n instanceof HarnessNode) {
    nodeRef.value = n
    sync()
    unsubscribe = n.onChanged(sync)
  }
})

onUnmounted(() => { unsubscribe?.() })

/** 把原始 messages 分组为 UI 友好的三段：tool_call / tool_result / final */
const groups = computed(() => {
  const out: Array<{ kind: 'tool_call' | 'tool_result' | 'final'; content: string; meta?: string }> = []
  let i = 0
  const msgs = trajectory.value
  while (i < msgs.length) {
    const m = msgs[i]
    if (m.role === 'assistant') {
      if (m.tool_calls && m.tool_calls.length > 0) {
        for (const tc of m.tool_calls) {
          out.push({ kind: 'tool_call', content: tc.function.name, meta: tc.function.arguments })
        }
      } else if (m.content) {
        out.push({ kind: 'final', content: extractText(m.content) })
      }
      i++
    } else if (m.role === 'tool') {
      out.push({ kind: 'tool_result', content: extractText(m.content), meta: m.name })
      i++
    } else {
      i++
    }
  }
  return out
})

function extractText(content: string | Array<{ type: string; [k: string]: unknown }> | undefined): string {
  if (!content) return ''
  if (typeof content === 'string') return content
  return content
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
    .map(p => p.text).join('\n')
}
</script>

<template>
  <div class="harness-detail">
    <!-- ── 用户决策模式 ── -->
    <div class="mode-row">
      <span class="mode-row__label">决策模式</span>
      <label class="mode-row__opt" :class="{ 'mode-row__opt--on': userDecisionMode === 'ask' }">
        <input type="radio" name="decisionMode" value="ask" :checked="userDecisionMode === 'ask'" @change="onChangeMode('ask')" />
        <span>📋 询问用户</span>
      </label>
      <label class="mode-row__opt" :class="{ 'mode-row__opt--on': userDecisionMode === 'auto' }">
        <input type="radio" name="decisionMode" value="auto" :checked="userDecisionMode === 'auto'" @change="onChangeMode('auto')" />
        <span>🤖 自动决策</span>
      </label>
      <span class="mode-row__hint">
        {{ userDecisionMode === 'ask' ? 'AI 遇到需要决策时会弹窗让你选' : 'AI 遇到 ask_user 时自动取第一个选项继续' }}
      </span>
    </div>

    <!-- ── 内置工具开关 ── -->
    <div class="builtin-switch-row">
      <span class="builtin-switch-row__label">内置工具</span>
      <div class="builtin-switch-list">
        <button
          v-for="name in BUILTIN_SWITCHES"
          :key="name"
          type="button"
          class="builtin-switch-chip"
          :class="{ 'builtin-switch-chip--off': !builtinSwitches[name] }"
          :title="name"
          @click="onToggleBuiltin(name)"
        >
          <span class="builtin-switch-chip__dot" />
          <span>{{ BUILTIN_LABELS[name] }}</span>
        </button>
      </div>
    </div>

    <!-- ── Prompt 编辑区 ── -->
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
      <template v-if="!promptConnected">
        <div v-if="attachedImages.length > 0" class="image-previews">
          <div v-for="(f, i) in attachedImages" :key="i" class="image-chip">
            <img :src="urlOf(f)" class="image-chip-thumb" />
            <button class="image-chip-x" @click="removeImage(i)">×</button>
          </div>
        </div>
        <div class="draft-actions">
          <label class="btn btn--pick" :title="t('pickImage')">
            <input type="file" accept="image/*" multiple hidden @change="(e) => onPickImages((e.target as HTMLInputElement).files)" />
            ＋ {{ t('pickImage') }}
          </label>
          <button
            class="btn btn--send"
            :disabled="status === 'loading' || (!localPrompt.trim() && attachedImages.length === 0) || !hasModel"
            @click="commitLocalDraft"
          >
            {{ status === 'loading' ? t('loading') : t('send') }}
          </button>
        </div>
      </template>
    </div>

    <!-- ── 执行轨迹 ── -->
    <div class="traj-section">
      <div v-if="trajectory.length === 0" class="empty">
        执行轨迹将在此显示
      </div>
      <template v-else>
        <div class="harness-detail__header">
          <span>执行轨迹</span>
          <span class="harness-detail__iter">
            {{ status === 'loading' ? '运行中…' : status === 'error' ? '出错' : '完成' }}
            · {{ iteration }}/{{ maxIterations }}
          </span>
        </div>
        <div class="harness-detail__body">
          <div
            v-for="(g, idx) in groups"
            :key="idx"
            class="traj-row"
            :class="{
              'traj-row--tool-call': g.kind === 'tool_call',
              'traj-row--tool-result': g.kind === 'tool_result',
              'traj-row--final': g.kind === 'final'
            }"
          >
            <span class="traj-row__icon">
              {{ g.kind === 'tool_call' ? '🔧' : g.kind === 'tool_result' ? '📦' : '✅' }}
            </span>
            <span class="traj-row__name" v-if="g.meta">{{ g.meta }}</span>
            <span class="traj-row__content">{{ g.content }}</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="less">
.harness-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

// ── 用户决策模式 ──
.mode-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
  background: #fff;
  flex-wrap: wrap;
}
.mode-row__label {
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  flex-shrink: 0;
}
.mode-row__opt {
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  color: #64748b;
  background: #f1f5f9;
  border: 1px solid transparent;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
  input { display: none; }
  &:hover { background: #e2e8f0; }
  &--on {
    background: #eff6ff;
    color: #1d4ed8;
    border-color: #bfdbfe;
  }
}
.mode-row__hint {
  font-size: 11px;
  color: #94a3b8;
  margin-left: auto;
  flex-shrink: 0;
}

// ── 内置工具开关 ──
.builtin-switch-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid #e2e8f0;
  background: #fff;
}
.builtin-switch-row__label {
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  flex-shrink: 0;
  padding-top: 3px;
}
.builtin-switch-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  flex: 1;
}
.builtin-switch-chip {
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 9px;
  border-radius: 10px;
  font-size: 11px;
  color: #166534;
  background: #dcfce7;
  border: 1px solid #86efac;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
  &:hover { background: #bbf7d0; }
  &--off {
    background: #f1f5f9;
    color: #94a3b8;
    border-color: #e2e8f0;
    &:hover { background: #e2e8f0; color: #64748b; }
  }
  &__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #16a34a;
    flex-shrink: 0;
  }
  &--off &__dot {
    background: #cbd5e1;
  }
}

// ── Prompt 编辑区 ──
.prompt-area {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
  background: #fafafa;
}
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

// ── 执行轨迹区 ──
.traj-section {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.harness-detail__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  flex-shrink: 0;
}
.harness-detail__iter {
  font-size: 11px;
  font-weight: 400;
  color: #64748b;
  font-family: ui-monospace, Menlo, monospace;
}
.harness-detail__body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 12px;
}

/* ── trajectory row ── */
.traj-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.5;

  &--tool-call {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
  }
  &--tool-result {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
  }
  &--final {
    background: #fef3c7;
    border: 1px solid #fde68a;
  }
}
.traj-row__icon {
  flex-shrink: 0;
  font-size: 13px;
  margin-top: 1px;
}
.traj-row__name {
  font-family: ui-monospace, Menlo, monospace;
  font-size: 10px;
  color: #64748b;
  background: rgba(0,0,0,0.04);
  padding: 1px 5px;
  border-radius: 3px;
  flex-shrink: 0;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.traj-row__content {
  flex: 1;
  min-width: 0;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 120px;
  overflow: auto;
  font-family: inherit;
}
</style>
