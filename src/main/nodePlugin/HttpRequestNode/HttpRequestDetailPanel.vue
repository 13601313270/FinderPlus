<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { HttpRequestNode, type HttpMethod, type HeaderEntry } from './node'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'

/**
 * HTTP 请求节点的详情面板中间栏：
 * - 方法下拉 + URL 输入
 * - Headers KV 列表
 * - Body textarea
 * - 超时输入
 * - 端口增删按钮
 *
 * 接收 props: { nodeId }，自己到 workspaceScene 拿节点实例。
 * 改节点状态的方式跟画布上的 render.vue 完全一样——
 * node.setMethod() / setUrlTemplate() / setHeaders() / addHeader() / ... → notifyChanged → 画布卡片和 OUTPUT 栏都会同步。
 */
const props = defineProps<{ nodeId: string }>()

const t = useLocalizedMessages(messages)

const httpNode = computed(() => {
  const n = workspaceScene.getNode(props.nodeId)
  return n instanceof HttpRequestNode ? n : undefined
})

// —— 本地镜像状态（与节点实时同步）——
const method = ref<HttpMethod>('GET')
const urlTemplate = ref('')
const headers = ref<HeaderEntry[]>([])
const resolvedHeaders = ref<HeaderEntry[]>([])
const bodyText = ref('')
const timeout = ref(15000)
const inputCount = ref(1)
const outputMode = ref<'text' | 'image' | 'audio'>('text')
const status = ref<'idle' | 'running' | 'done' | 'error'>('idle')

const allowsBody = computed(() => method.value !== 'GET' && method.value !== 'HEAD')
const running = computed(() => status.value === 'running')
const hasUrl = computed(() => urlTemplate.value.trim().length > 0)

let offChanged: (() => void) | undefined

onMounted(() => {
  const node = httpNode.value
  if (!node) return
  sync(node)
  offChanged = node.onChanged(() => {
    if (httpNode.value) sync(httpNode.value)
  })
})

onUnmounted(() => {
  offChanged?.()
})

function sync(node: HttpRequestNode): void {
  method.value = node.displayMethod
  urlTemplate.value = node.displayUrlTemplate
  headers.value = node.displayHeaders.map((h) => ({ key: h.key, value: h.value }))
  resolvedHeaders.value = node.displayResolvedHeaders.map((h) => ({ key: h.key, value: h.value }))
  bodyText.value = node.displayBody
  timeout.value = node.displayTimeout
  inputCount.value = node.inputCount
  outputMode.value = node.displayOutputMode
  status.value = node.displayStatus
}

// 当 panel 激活时（nodeId 变化）重新 sync
watch(() => props.nodeId, () => {
  const node = httpNode.value
  if (node) sync(node)
})

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
function onOutputModeChange(e: Event): void {
  httpNode.value?.setOutputMode((e.target as HTMLSelectElement).value as 'text' | 'image' | 'audio')
}
function onAddPort(): void { httpNode.value?.addInputPort() }
function onRemovePort(): void { httpNode.value?.removeLastInputPort() }
function onSend(): void { httpNode.value?.run() }
</script>

<template>
  <div class="detail-panel">

    <!-- 方法 + 输出类型 + 超时（一行） -->
    <div class="detail-panel__row">
      <div class="detail-panel__section detail-panel__section--flex">
        <label class="detail-panel__label">{{ t('labelMethod') }}</label>
        <select
          class="detail-panel__method"
          :value="method"
          @change="onMethodChange"
        >
          <option v-for="m in httpNode?.availableMethods ?? []" :key="m" :value="m">{{ m }}</option>
        </select>
      </div>

      <div class="detail-panel__section detail-panel__section--flex">
        <label class="detail-panel__label">{{ t('outputModeLabel') }}</label>
        <select
          class="detail-panel__method"
          :value="outputMode"
          @change="onOutputModeChange"
        >
          <option value="text">{{ t('outputModeText') }}</option>
          <option value="image">{{ t('outputModeImage') }}</option>
          <option value="audio">{{ t('outputModeAudio') }}</option>
        </select>
      </div>

      <div class="detail-panel__section detail-panel__section--flex">
        <label class="detail-panel__label">{{ t('timeoutLabel') }}</label>
        <input
          class="detail-panel__timeout"
          type="number"
          min="1000" max="600000" step="1000"
          :value="timeout"
          @input="onTimeoutInput"
        />
      </div>
    </div>

    <!-- URL 输入 -->
    <div class="detail-panel__section">
      <label class="detail-panel__label">URL</label>
      <input
        class="detail-panel__url"
        type="text"
        :value="urlTemplate"
        placeholder="https://api.example.com/$1/$2"
        @input="onUrlInput"
      />
    </div>

    <!-- Headers KV 列表 -->
    <div class="detail-panel__section">
      <label class="detail-panel__label">{{ t('headersLabel') }}</label>
      <div
        v-for="(h, idx) in headers"
        :key="idx"
        class="detail-panel__kv"
      >
        <input
          class="detail-panel__kv-key"
          type="text"
          :value="h.key"
          placeholder="Content-Type"
          @input="(e: Event) => onHeaderKeyInput(idx, e)"
        />
        <span class="detail-panel__kv-colon">:</span>
        <input
          class="detail-panel__kv-val"
          type="text"
          :value="h.value"
          placeholder="application/json"
          @input="(e: Event) => onHeaderValueInput(idx, e)"
        />
        <button
          class="detail-panel__kv-del"
          type="button"
          :title="t('deleteHeaderHint')"
          @click="onRemoveHeader(idx)"
        >－</button>
        <!-- 模板替换后的最终值预览 -->
        <div
          v-if="(h.value.includes('$') || h.key.includes('$')) && resolvedHeaders[idx]"
          class="detail-panel__kv-resolved"
        >
          {{ resolvedHeaders[idx]!.key }}: {{ resolvedHeaders[idx]!.value }}
        </div>
      </div>
      <button
        class="detail-panel__kv-add"
        type="button"
        @click="onAddHeader"
      >{{ t('addHeader') }}</button>
    </div>

    <!-- Body -->
    <div class="detail-panel__section">
      <label class="detail-panel__label">
        {{ allowsBody ? t('bodyLabelOptional') : t('bodyLabelDisabled', { method }) }}
      </label>
      <textarea
        class="detail-panel__textarea"
        rows="4"
        :value="bodyText"
        :disabled="!allowsBody"
        :placeholder="allowsBody ? t('bodyPlaceholder') : t('bodyPlaceholderDisabled', { method })"
        @input="onBodyInput"
      />
    </div>

    <!-- 端口增删 -->
    <div class="detail-panel__section">
      <label class="detail-panel__label">{{ t('portsCount', { n: inputCount }) }}</label>
      <div class="detail-panel__ports-actions">
        <button
          class="detail-panel__btn"
          type="button"
          :disabled="!httpNode || inputCount <= 1"
          @click="onRemovePort"
        >－</button>
        <button
          class="detail-panel__btn detail-panel__btn--primary"
          type="button"
          :disabled="!httpNode"
          @click="onAddPort"
        >＋</button>
      </div>
    </div>

    <!-- 发送按钮 -->
    <button
      class="detail-panel__send"
      type="button"
      :disabled="running || !hasUrl || !httpNode"
      @click="onSend"
    >
      {{ running ? t('sending') : t('send') }}
    </button>

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

  &__row {
    display: flex;
    gap: 10px;

    > * { flex: 1; min-width: 0; }
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: 6px;

    // 同行紧凑模式：label 和控件横排，给外层 __row 用
    &--flex {
      flex-direction: row;
      align-items: center;
      gap: 6px;

      .detail-panel__label { flex-shrink: 0; }
      .detail-panel__method,
      .detail-panel__timeout { flex: 1; min-width: 0; }
    }
  }

  &__label {
    font-size: 12px;
    font-weight: 600;
    color: #374151;
  }

  // —— 方法 select ——
  &__method {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background: #fff;
    font-size: 13px;
    font-weight: 600;
    color: #374151;
    outline: none;
    cursor: pointer;

    &:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12); }
  }

  // —— URL input ——
  &__url {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 13px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    outline: none;

    &:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12); }
  }

  // —— Headers KV ——
  &__kv {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  &__kv-resolved {
    flex: 0 0 100%;
    padding-left: 126px; // 与 kv-val 左对齐（kv-key 120px + colon 6px）
    font-size: 11px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #9ca3af;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__kv-key {
    flex: 0 0 120px;
    min-width: 0;
    box-sizing: border-box;
    padding: 7px 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    outline: none;

    &:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12); }
  }

  &__kv-colon {
    flex-shrink: 0;
    font-size: 14px;
    color: #9ca3af;
    line-height: 1;
  }

  &__kv-val {
    flex: 1;
    min-width: 0;
    box-sizing: border-box;
    padding: 7px 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    outline: none;

    &:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12); }
  }

  &__kv-del {
    all: unset;
    cursor: pointer;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    line-height: 1;
    color: #9ca3af;
    transition: border-color 0.15s, color 0.15s;

    &:hover { border-color: #ef4444; color: #ef4444; }
  }

  &__kv-add {
    all: unset;
    cursor: pointer;
    align-self: flex-start;
    margin-top: 2px;
    padding: 6px 12px;
    border: 1px dashed #d1d5db;
    border-radius: 6px;
    font-size: 12px;
    color: #6b7280;
    transition: color 0.15s, border-color 0.15s, background 0.15s;

    &:hover {
      color: #2563eb;
      border-color: #2563eb;
      background: #eff6ff;
    }
  }

  // —— Body textarea ——
  &__textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 13px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    line-height: 1.6;
    resize: vertical;
    outline: none;

    &:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12); }
    &:disabled {
      background: #f3f4f6;
      color: #9ca3af;
      cursor: not-allowed;
    }
  }

  // —— 超时 ——
  &__timeout {
    width: 120px;
    box-sizing: border-box;
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 13px;
    text-align: center;
    outline: none;

    &:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12); }
  }

  // —— 端口按钮 ——
  &__ports-actions {
    display: flex;
    gap: 8px;
  }

 // —— 端口按钮 ——
  &__btn {
    all: unset;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 16px;
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

  // —— 发送按钮 ——
  &__send {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    box-sizing: border-box;
    height: 36px;
    font-size: 13px;
    font-weight: 600;
    color: #fff;
    background: #3b82f6;
    border-radius: 8px;
    white-space: nowrap;
    margin-top: auto;
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
</style>
