<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { HttpRequestNode, type HttpMethod, type HeaderEntry } from './node'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'
import ChevronIcon from '@renderer/components/icons/ChevronIcon.vue'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import HttpRequestHelpDialog from './HttpRequestHelpDialog.vue'

/**
 * HTTP 请求节点的渲染组件。
 *
 * 两种状态内嵌切换（不弹窗）：
 * - 折叠态：方法 + URL 预览 + 发送 + 结果区，最小信息不臃肿
 * - 展开态：折叠态的基础上追加方法下拉 / URL 输入 / Headers KV / Body / 超时 / 端口增删
 *
 * 头部齿轮图标是展开/折叠 toggle；编辑控件改了就**直接写回节点**，不走草稿态。
 */
const props = defineProps<{ id: string }>()

const httpNode = shallowRef<HttpRequestNode | undefined>(undefined)

// 卡片标题走插件 manifest 的多语言 title，未配当前语言时由 resolveNodeTitle 兜底
const nodeTitle = useNodeTitle(() => httpNode.value, '?')

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)

// —— 帮助浮层开关 ——
const showHelp = ref(false)

// —— 本地镜像状态（与节点实时同步）——
const method = ref<HttpMethod>('GET')
const urlTemplate = ref('')
const headers = ref<HeaderEntry[]>([])
const bodyText = ref('')
const timeout = ref(15000)
const resolvedUrl = ref('')
const inputCount = ref(1)
const status = ref<'idle' | 'running' | 'done' | 'error'>('idle')
const lastStatus = ref(0)
const lastBody = ref('')
const lastError = ref('')

/** 展开/折叠：跟 node.collapsed 语义相反（node.collapsed=true = 折叠中 = UI expanded=false） */
const expanded = ref(false)

let unsubscribe: (() => void) | undefined

const { startDrag } = useNodePosition(() => httpNode.value)

function syncFromNode(node: HttpRequestNode): void {
  method.value = node.displayMethod
  urlTemplate.value = node.displayUrlTemplate
  // 浅拷贝一份，UI 改值时节点有机会比较差异
  headers.value = node.displayHeaders.map((h) => ({ key: h.key, value: h.value }))
  bodyText.value = node.displayBody
  timeout.value = node.displayTimeout
  resolvedUrl.value = node.displayResolvedUrl
  inputCount.value = node.inputCount
  status.value = node.displayStatus
  lastStatus.value = node.displayLastStatus
  lastBody.value = node.displayLastBody
  lastError.value = node.displayLastError
  // node.collapsed 语义：true = 折叠中 → UI expanded=false
  expanded.value = !node.displayCollapsed
}

const running = computed(() => status.value === 'running')
const hasUrl = computed(() => urlTemplate.value.trim().length > 0)
const allowsBody = computed(() => method.value !== 'GET' && method.value !== 'HEAD')
const headerCount = computed(() => headers.value.length)

// —— 事件：改了就直接写回节点 ——

function onMethodChange(e: Event): void {
  const select = e.target as HTMLSelectElement
  httpNode.value?.setMethod(select.value as HttpMethod)
}
function onUrlInput(e: Event): void {
  httpNode.value?.setUrlTemplate((e.target as HTMLInputElement).value)
}

function onHeaderKeyInput(idx: number, e: Event): void {
  headers.value[idx]!.key = (e.target as HTMLInputElement).value
  httpNode.value?.setHeaders(headers.value)
}
function onHeaderValueInput(idx: number, e: Event): void {
  headers.value[idx]!.value = (e.target as HTMLInputElement).value
  httpNode.value?.setHeaders(headers.value)
}
function onAddHeader(): void {
  httpNode.value?.addHeader()
}
function onRemoveHeader(idx: number): void {
  httpNode.value?.removeHeader(idx)
}

function onBodyInput(e: Event): void {
  httpNode.value?.setBodyText((e.target as HTMLTextAreaElement).value)
}
function onTimeoutInput(e: Event): void {
  const v = Number((e.target as HTMLInputElement).value)
  if (Number.isFinite(v)) httpNode.value?.setTimeoutMs(v)
}
function onAddPort(): void { httpNode.value?.addInputPort() }
function onRemovePort(): void { httpNode.value?.removeLastInputPort() }
function onSend(): void { httpNode.value?.run() }
function toggleExpand(): void {
  // expanded=true → 点击后要折叠 → node.collapsed=true
  httpNode.value?.setCollapsed(expanded.value)
}

// —— 动态高度 ——
const rootEl = ref<HTMLDivElement | null>(null)
const COLLAPSED_MIN = 150
const COLLAPSED_MAX = 260
const EXPANDED_MIN = 380
const EXPANDED_MAX = 720

function adjustBoxHeight(): void {
  nextTick(() => {
    const el = rootEl.value
    const node = httpNode.value
    if (!el || !node) return
    const needed = Math.round(el.scrollHeight)
    if (expanded.value) {
      node.setBox(node.box[0], Math.min(EXPANDED_MAX, Math.max(EXPANDED_MIN, needed)))
    } else {
      node.setBox(node.box[0], Math.min(COLLAPSED_MAX, Math.max(COLLAPSED_MIN, needed)))
    }
  })
}

watch([
  expanded, method, urlTemplate, headers, bodyText, timeout,
  resolvedUrl, inputCount, status, lastBody, lastError
], adjustBoxHeight)

// —— 滚动接力：textarea / 结果区 / 根容器 自己能滚时 stopPropagation，
// 到顶/底了才放行让画布接管平移。分两个函数：
//   onWheel     —— 子元素（textarea / 结果区）用：直接对 e.currentTarget 判断
//   onRootWheel —— 根容器用：根容器自身就是滚动体，也是 e.currentTarget
//
// 两者逻辑一致，拆出来只是代码更清晰。
function onWheel(e: WheelEvent): void {
  const el = e.currentTarget as HTMLElement
  if (shouldStopWheel(el, e)) e.stopPropagation()
}

function onRootWheel(e: WheelEvent): void {
  const el = e.currentTarget as HTMLElement
  // 根容器只有在"内容溢出需要滚"且"还没到边界"时才拦截；
  // 折叠态内容不溢出，el.scrollHeight === el.clientHeight，此时不应拦截，画布照常平移。
  if (el.scrollHeight <= el.clientHeight) return
  if (shouldStopWheel(el, e)) e.stopPropagation()
}

/**
 * 滚动接力核心：当前元素还能往滚轮方向滚 → stopPropagation 不让画布抢；
 * 到了边界 → 放行，让外层（画布）接管。
 */
function shouldStopWheel(el: HTMLElement, e: WheelEvent): boolean {
  const { scrollTop, scrollHeight, clientHeight } = el
  const atTop = scrollTop <= 0
  const atBottom = scrollTop + clientHeight >= scrollHeight
  const scrollingUp = e.deltaY < 0
  const scrollingDown = e.deltaY > 0
  if ((scrollingUp && atTop) || (scrollingDown && atBottom)) return false
  return true
}

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof HttpRequestNode) {
    httpNode.value = found
    syncFromNode(found)
    unsubscribe = found.onChanged(() => syncFromNode(found))
    adjustBoxHeight()
  }
})

onUnmounted(() => { unsubscribe?.() })
</script>

<template>
  <div
    ref="rootEl"
    class="node"
    :class="{ 'node--expanded': expanded }"
    @wheel="onRootWheel"
  >
    <!-- 头部：拖动 + type 标签 + 帮助 + 展开/收起 toggle -->
    <NodeHeader :title="nodeTitle" :title-hint="t('dragHint')" :drag-handler="startDrag" :help-title="t('helpHint')" @help="showHelp = true">
      <template #actions>
        <button
          v-if="httpNode"
          class="node__toggle"
          type="button"
          :title="expanded ? t('collapseConfig') : t('expandConfig')"
          @pointerdown.stop
          @click.stop="toggleExpand"
        >
          <!-- expanded=false(折叠)时指向下=展开按钮；expanded=true(展开)时指向上=收起按钮 -->
          <ChevronIcon :direction="expanded ? 'up' : 'down'" :size="12" />
          <span class="node__toggle-text">{{ expanded ? t('collapse') : t('expand') }}</span>
        </button>
      </template>
    </NodeHeader>

    <!-- —— 折叠态可见：方法+URL 预览行 —— -->
    <div
      v-if="httpNode"
      class="http-preview"
      :class="{ 'http-preview--empty': !hasUrl }"
    >
      <span class="http-preview__method">{{ method }}</span>
      <span class="http-preview__sep">·</span>
      <span class="http-preview__url" :title="resolvedUrl || urlTemplate">
        {{ resolvedUrl || urlTemplate || t('urlEmptyHint') }}
      </span>
    </div>

    <!-- —— 折叠态可见：headers/body/端口数摘要 —— -->
    <div v-if="httpNode && hasUrl" class="http-summary">
      <span>{{ t('headersSummary', { n: headerCount }) }}</span>
      <span>body: {{ bodyText ? (allowsBody ? t('bodySet') : t('bodyNotSent', { method })) : t('bodyNone') }}</span>
      <span>{{ t('portSummary', { n: inputCount }) }}</span>
    </div>

    <!-- —— 展开态才渲染的配置区（内嵌编辑，改了直接写回节点） —— -->
    <template v-if="httpNode && expanded">

      <!-- 方法 + URL 输入 -->
      <div class="http-edit-row">
        <label class="http-edit-row__label">{{ t('labelMethod') }}</label>
        <select
          class="http-method"
          :value="method"
          @change="onMethodChange"
        >
          <option v-for="m in httpNode.availableMethods" :key="m" :value="m">{{ m }}</option>
        </select>
      </div>
      <div class="http-edit-row">
        <label class="http-edit-row__label">URL</label>
        <input
          class="http-url"
          type="text"
          :value="urlTemplate"
          placeholder="https://api.example.com/$1/$2"
          @input="onUrlInput"
        />
      </div>

      <!-- Headers KV 列表（每行一个 header：key + value + 删除按钮） -->
      <div class="http-block">
        <div class="http-block__label">{{ t('headersLabel') }}</div>
        <div
          v-for="(h, idx) in headers"
          :key="idx"
          class="http-kv"
        >
          <input
            class="http-kv__key"
            type="text"
            :value="h.key"
            placeholder="Content-Type"
            @input="(e: Event) => onHeaderKeyInput(idx, e)"
          />
          <span class="http-kv__colon">:</span>
          <input
            class="http-kv__val"
            type="text"
            :value="h.value"
            placeholder="application/json"
            @input="(e: Event) => onHeaderValueInput(idx, e)"
          />
          <button
            class="http-kv__del"
            type="button"
            :title="t('deleteHeaderHint')"
            @click="onRemoveHeader(idx)"
          >－</button>
        </div>
        <button
          class="http-kv__add"
          type="button"
          @click="onAddHeader"
        >{{ t('addHeader') }}</button>
      </div>

      <!-- Body -->
      <div class="http-block">
        <div class="http-block__label">
          {{ allowsBody ? t('bodyLabelOptional') : t('bodyLabelDisabled', { method }) }}
        </div>
        <textarea
          class="http-textarea"
          rows="3"
          :value="bodyText"
          :disabled="!allowsBody"
          :placeholder="allowsBody ? t('bodyPlaceholder') : t('bodyPlaceholderDisabled', { method })"
          @wheel="onWheel"
          @input="onBodyInput"
        />
      </div>

      <!-- 超时 -->
      <div class="http-edit-row">
        <label class="http-edit-row__label">{{ t('timeoutLabel') }}</label>
        <input
          class="http-timeout"
          type="number"
          min="1000" max="60000" step="1000"
          :value="timeout"
          @input="onTimeoutInput"
        />
      </div>

      <!-- 端口增删 -->
      <div class="http-ports">
        <span class="http-ports__count">{{ t('portsCount', { n: inputCount }) }}</span>
        <div class="http-ports__actions">
          <button
            class="http-ports__btn" type="button"
            :disabled="!httpNode || inputCount <= 1"
            @click="onRemovePort"
          >－</button>
          <button
            class="http-ports__btn" type="button"
            :disabled="!httpNode"
            @click="onAddPort"
          >＋</button>
        </div>
      </div>
    </template>

    <!-- —— 折叠态/展开态都可见：结果区 —— -->
    <div
      v-if="httpNode"
      class="http-result"
      :class="{
        'http-result--empty': status === 'idle' || (status !== 'running' && !lastBody && !lastError),
        'http-result--error': status === 'error',
        'http-result--running': status === 'running',
        'http-result--server-error': status === 'done' && lastStatus >= 400,
        'http-result--compact': !expanded
      }"
      @wheel="onWheel"
    >
      <template v-if="status === 'running'">
        <span class="http-result__spinner" />
        <span>{{ t('requesting') }}</span>
      </template>
      <template v-else-if="status === 'error'">
        <div class="http-result__meta">{{ t('networkError') }}</div>
        <div>{{ lastError }}</div>
      </template>
      <template v-else-if="status === 'done'">
        <div class="http-result__meta">{{ t('statusCode', { code: lastStatus }) }}</div>
        <div v-if="lastBody">{{ lastBody }}</div>
        <div v-else class="http-result__empty">{{ t('noResponseBody') }}</div>
      </template>
      <template v-else>{{ t('clickToSend') }}</template>
    </div>

    <!-- —— 折叠态/展开态都可见：发送按钮 —— -->
    <button
      v-if="httpNode"
      class="node__run"
      type="button"
      :disabled="running || !hasUrl"
      :title="hasUrl ? t('sendHint') : t('sendHintNoUrl')"
      @click="onSend"
    >
      {{ running ? t('sending') : t('send') }}
    </button>
  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpTitle')" @close="showHelp = false">
    <HttpRequestHelpDialog />
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
  gap: 6px;
  padding: 8px;
  padding-top: 0;
  background: @color-surface;
  border: 1px solid @node-border-color;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px dashed @node-border-color;
    padding-bottom: 3px;
    cursor: grab;
    user-select: none;

    &:active { cursor: grabbing; }
  }

  &__handle {
    font-size: 11px;
    color: @color-text-weak;
    padding: 2px 0;
  }

  &__header-right {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  &__toggle {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 2px 5px;
    border-radius: 4px;
    font-size: 11px;
    color: #6b7280;
    transition: color 0.15s, background 0.15s;

    &:hover {
      color: #111827;
      background: #f3f4f6;
    }
  }

  &__toggle-text { line-height: 1; }

  &__run {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    box-sizing: border-box;
    height: 30px;
    font-size: 12px;
    font-weight: 500;
    color: #fff;
    background: #3b82f6;
    border-radius: 6px;
    white-space: nowrap;
    flex-shrink: 0;
    transition: background 0.15s;

    &:hover:not(:disabled) { background: #2563eb; }
    &:active:not(:disabled) { background: #1d4ed8; }
    &:disabled {
      cursor: not-allowed;
      background: #93c5fd;
    }
  }
}

// —— 折叠态预览：方法 + URL 一行 ——
.http-preview {
  flex-shrink: 0;
  padding: 5px 7px;
  border: 1px solid @node-border-color;
  border-radius: 6px;
  background: #f8fafc;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  line-height: 1.5;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;

  &__method { flex-shrink: 0; font-weight: 600; color: #111827; }
  &__sep { flex-shrink: 0; color: #9ca3af; }
  &__url {
    min-width: 0; flex: 1; color: #4b5563;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  &--empty {
    color: #9aa2ad; font-style: italic; font-family: inherit;
  }
}

// —— 摘要行 ——
.http-summary {
  flex-shrink: 0;
  display: flex;
  gap: 10px;
  font-size: 10px;
  color: @color-text-weak;

  span { white-space: nowrap; }
}

// —— 展开态：行内 label + 控件 ——
.http-edit-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;

  &__label {
    flex-shrink: 0;
    width: 60px;
    font-size: 11px;
    color: #6b7280;
  }
}

.http-method {
  flex-shrink: 0;
  width: 84px;
  padding: 3px 6px;
  border: 1px solid @node-border-color;
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  cursor: pointer;
  outline: none;

  &:focus { border-color: #3b82f6; }
}

.http-url {
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  padding: 4px 7px;
  border: 1px solid @node-border-color;
  border-radius: 6px;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  outline: none;

  &:focus { border-color: #3b82f6; }
}

.http-timeout {
  width: 90px;
  padding: 3px 6px;
  border: 1px solid @node-border-color;
  border-radius: 6px;
  font-size: 12px;
  text-align: right;
  outline: none;

  &:focus { border-color: #3b82f6; }
}

// —— 展开态：headers / body 块 ——
.http-block {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex-shrink: 0;

  &__label {
    font-size: 11px;
    color: #6b7280;
    font-weight: 500;
  }
}

// —— Headers KV 行 ——
.http-kv {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;

  &__key {
    flex: 0 0 96px;
    min-width: 0;
    box-sizing: border-box;
    padding: 3px 6px;
    border: 1px solid @node-border-color;
    border-radius: 5px;
    font-size: 11px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    outline: none;

    &:focus { border-color: #3b82f6; }
  }

  &__colon {
    flex-shrink: 0;
    font-size: 13px;
    color: #9ca3af;
    line-height: 1;
  }

  &__val {
    flex: 1;
    min-width: 0;
    box-sizing: border-box;
    padding: 3px 6px;
    border: 1px solid @node-border-color;
    border-radius: 5px;
    font-size: 11px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    outline: none;

    &:focus { border-color: #3b82f6; }
  }

  &__del {
    all: unset;
    cursor: pointer;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border: 1px solid @node-border-color;
    border-radius: 4px;
    font-size: 13px;
    line-height: 1;
    color: #9ca3af;

    &:hover { border-color: #ef4444; color: #ef4444; }
  }

  &__add {
    all: unset;
    cursor: pointer;
    align-self: flex-start;
    margin-top: 2px;
    padding: 3px 8px;
    border: 1px dashed @node-border-color;
    border-radius: 5px;
    font-size: 11px;
    color: #6b7280;
    transition: color 0.15s, border-color 0.15s, background 0.15s;

    &:hover {
      color: #3b82f6;
      border-color: #3b82f6;
      background: #eff6ff;
    }
  }
}

.http-textarea {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  padding: 5px 7px;
  border: 1px solid @node-border-color;
  border-radius: 6px;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  line-height: 1.5;
  outline: none;

  &:focus { border-color: #3b82f6; }
  &:disabled {
    background: #f3f4f6;
    color: #9ca3af;
    cursor: not-allowed;
  }
}

// —— 端口增删 ——
.http-ports {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
  font-size: 11px;
  color: #6b7280;

  &__count {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__actions { display: flex; gap: 4px; flex-shrink: 0; }

  &__btn {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: 1px solid @node-border-color;
    border-radius: 4px;
    font-size: 13px;
    line-height: 1;
    color: #374151;

    &:hover:not(:disabled) {
      border-color: #3b82f6;
      color: #3b82f6;
    }
    &:disabled { cursor: not-allowed; opacity: 0.4; }
  }
}

// —— 结果区 ——
.http-result {
  padding: 6px 8px;
  border: 1px solid @node-border-color;
  border-radius: 6px;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  flex: 1;
  min-height: 40px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  color: #1f2937;
  overflow: auto;

  &--compact { max-height: 100px; }

  &--empty {
    color: #9aa2ad;
    font-style: italic;
    font-family: inherit;
    align-items: center;
    justify-content: center;
  }

  &--error {
    color: #dc2626;
    border-color: #fecaca;
    background: #fef2f2;
  }

  &--server-error {
    color: #b45309;
    border-color: #fde68a;
    background: #fffbeb;
  }

  &--running {
    justify-content: flex-start;
    color: #3b82f6;
    font-family: inherit;
    flex-direction: row;
  }

  &__meta {
    font-size: 10px;
    color: #6b7280;
    font-family: inherit;
    flex-shrink: 0;
  }

  &__empty {
    color: #9ca3af;
    font-style: italic;
    font-family: inherit;
  }

  &__spinner {
    width: 11px; height: 11px;
    border: 2px solid #bfdbfe;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
