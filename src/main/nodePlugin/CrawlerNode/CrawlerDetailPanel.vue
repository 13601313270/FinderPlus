<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { CrawlerNode, type ExtractMode } from './node'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'

/**
 * 爬虫节点的详情面板中间栏：
 * - URL 输入
 * - CSS 选择器
 * - 提取模式下拉 + attrName 条件显示
 * - Headers JSON
 * - 超时输入
 * - 端口增删
 */
const props = defineProps<{ nodeId: string }>()

const t = useLocalizedMessages(messages)

const crawlerNode = computed(() => {
  const n = workspaceScene.getNode(props.nodeId)
  return n instanceof CrawlerNode ? n : undefined
})

const urlTemplate = ref('')
const selector = ref('')
const extractMode = ref<ExtractMode>('text')
const attrName = ref('')
const headersText = ref('')
const userAgent = ref('')
const timeout = ref(15000)
const inputCount = ref(1)

// —— 运行时状态（给 detail panel 里的抓取按钮 + 结果区用）——
const status = ref<'idle' | 'running' | 'done' | 'error'>('idle')
const lastStatus = ref(0)
const lastCount = ref(0)
const lastError = ref('')
const lastResultsPreview = ref('')

const running = computed(() => status.value === 'running')
const hasUrl = computed(() => urlTemplate.value.trim().length > 0)

const needsAttr = computed(() => extractMode.value === 'attr')

let offChanged: (() => void) | undefined

onMounted(() => {
  const node = crawlerNode.value
  if (!node) return
  sync(node)
  offChanged = node.onChanged(() => {
    if (crawlerNode.value) sync(crawlerNode.value)
  })
})

onUnmounted(() => {
  offChanged?.()
})

function sync(node: CrawlerNode): void {
  urlTemplate.value = node.displayUrlTemplate
  selector.value = node.displaySelector
  extractMode.value = node.displayExtractMode
  attrName.value = node.displayAttrName
  headersText.value = node.displayHeadersText
  userAgent.value = node.displayUserAgent
  timeout.value = node.displayTimeout
  inputCount.value = node.inputCount
  status.value = node.displayStatus
  lastStatus.value = node.displayLastStatus
  lastCount.value = node.displayLastCount
  lastError.value = node.displayLastError
  lastResultsPreview.value = node.displayLastResultsPreview
}

function onScrape(): void { crawlerNode.value?.run() }

watch(() => props.nodeId, () => {
  const node = crawlerNode.value
  if (node) sync(node)
})

// —— 事件：改了就直接写回节点 ——

function onUrlInput(e: Event): void {
  crawlerNode.value?.setUrlTemplate((e.target as HTMLInputElement).value)
}
function onSelectorInput(e: Event): void {
  crawlerNode.value?.setSelector((e.target as HTMLInputElement).value)
}
function onModeChange(e: Event): void {
  crawlerNode.value?.setExtractMode((e.target as HTMLSelectElement).value as ExtractMode)
}
function onAttrInput(e: Event): void {
  crawlerNode.value?.setAttrName((e.target as HTMLInputElement).value)
}
function onHeadersInput(e: Event): void {
  crawlerNode.value?.setHeadersText((e.target as HTMLTextAreaElement).value)
}
function onUserAgentInput(e: Event): void {
  crawlerNode.value?.setUserAgent((e.target as HTMLInputElement).value)
}
function onTimeoutInput(e: Event): void {
  const v = Number((e.target as HTMLInputElement).value)
  if (Number.isFinite(v)) crawlerNode.value?.setTimeoutMs(v)
}
function onAddPort(): void { crawlerNode.value?.addInputPort() }
function onRemovePort(): void { crawlerNode.value?.removeLastInputPort() }

function modeLabel(mode: ExtractMode): string {
  switch (mode) {
    case 'text': return t('extractModeText')
    case 'html': return t('extractModeHtml')
    case 'attr': return t('extractModeAttr')
  }
}
</script>

<template>
  <div class="detail-panel">

    <!-- URL -->
    <div class="detail-panel__section">
      <label class="detail-panel__label">URL</label>
      <input class="detail-panel__input" type="text" :value="urlTemplate" placeholder="https://example.com/$1"
        @input="onUrlInput" />
    </div>

    <!-- CSS 选择器 -->
    <div class="detail-panel__section">
      <label class="detail-panel__label">{{ t('selectorPlaceholder') }}</label>
      <input class="detail-panel__input" type="text" :value="selector" placeholder="留空输出整个 HTML"
        @input="onSelectorInput" />
    </div>

    <div style="display: flex;gap: 8px;">
      <!-- 提取模式 + attrName -->
      <div class="detail-panel__section">
        <label class="detail-panel__label">{{ t('modeTitle') }}</label>
        <div class="detail-panel__mode-row">
          <select class="detail-panel__select" :value="extractMode" @change="onModeChange">
            <option v-for="m in crawlerNode?.availableModes ?? []" :key="m" :value="m">
              {{ modeLabel(m) }}
            </option>
          </select>
          <input v-if="needsAttr" class="detail-panel__input detail-panel__input--sm" type="text" :value="attrName"
            placeholder="href / src / ..." @input="onAttrInput" />
        </div>
      </div>

      <!-- 超时 -->
      <div class="detail-panel__section">
        <label class="detail-panel__label">超时 (ms)</label>
        <input class="detail-panel__timeout" type="number" min="1000" max="60000" step="1000" :value="timeout"
          @input="onTimeoutInput" />
      </div>

      <!-- User-Agent -->
      <div class="detail-panel__section">
        <label class="detail-panel__label">User-Agent（留空用内置 Chrome）</label>
        <input class="detail-panel__input" type="text" :value="userAgent" placeholder="Mozilla/5.0 ..."
          @input="onUserAgentInput" />
      </div>
    </div>

    <!-- Headers JSON -->
    <div class="detail-panel__section">
      <label class="detail-panel__label">Headers (JSON，可选)</label>
      <textarea class="detail-panel__textarea" rows="3" :value="headersText" placeholder='{"Accept-Language": "zh-CN"}'
        @input="onHeadersInput" />
    </div>

    <!-- 端口增删 -->
    <div class="detail-panel__section">
      <label class="detail-panel__label">输入端口：{{ inputCount }}（$1…$N 引用到 URL 模板）</label>
      <div class="detail-panel__ports-actions">
        <button class="detail-panel__btn" type="button" :disabled="!crawlerNode || inputCount <= 1"
          @click="onRemovePort">－</button>
        <button class="detail-panel__btn detail-panel__btn--primary" type="button" :disabled="!crawlerNode"
          @click="onAddPort">＋</button>
      </div>
    </div>

    <!-- 抓取按钮 + 结果区 -->
    <div class="detail-panel__section">
      <button class="detail-panel__scrape" type="button" :disabled="running || !hasUrl || !crawlerNode"
        @click="onScrape">
        <span v-if="running" class="detail-panel__spinner" />
        {{ running ? t('scraping') : t('scrape') }}
      </button>

      <div class="detail-panel__result" :class="{
        'detail-panel__result--empty': status === 'idle' || (!running && !lastError && lastCount === 0),
        'detail-panel__result--error': status === 'error',
      }">
        <template v-if="status === 'running'">…</template>
        <template v-else-if="status === 'error'">{{ lastError }}</template>
        <template v-else-if="status === 'done'">
          <div class="detail-panel__result-meta">
            {{ t('doneStatus', { code: lastStatus, count: lastCount }) }}
          </div>
          <div v-if="lastCount === 0" class="detail-panel__result-empty">{{ t('noResult') }}</div>
        </template>
        <template v-else>{{ t('clickToSend') }}</template>
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

  &__label {
    font-size: 12px;
    font-weight: 600;
    color: #374151;
  }

  &__input {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 13px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    outline: none;

    &:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }

    &--sm {
      flex: 0 0 140px;
    }
  }

  &__mode-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  &__select {
    width: 100px;
    padding: 7px 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: #fff;
    font-size: 13px;
    outline: none;
    cursor: pointer;

    &:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }
  }

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

    &:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }
  }

  &__timeout {
    width: 80px;
    box-sizing: border-box;
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 13px;
    text-align: center;
    outline: none;

    &:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }
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

  &__scrape {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    box-sizing: border-box;
    height: 36px;
    background: #2563eb;
    color: #fff;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    transition: background 0.15s;

    &:hover:not(:disabled) {
      background: #1d4ed8;
    }

    &:active:not(:disabled) {
      background: #1e40af;
    }

    &:disabled {
      cursor: not-allowed;
      background: #93c5fd;
    }
  }

  &__spinner {
    width: 12px;
    height: 12px;
    border: 2px solid #bfdbfe;
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  &__result {
    box-sizing: border-box;
    padding: 10px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #fafafa;
    font-size: 12px;
    line-height: 1.6;
    color: #374151;
    min-height: 60px;
    white-space: pre-wrap;
    word-break: break-all;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;

    &--empty {
      color: #9aa2ad;
      font-style: italic;
      font-family: inherit;
      align-items: center;
      justify-content: center;
    }

    &--error {
      border-color: #fecaca;
      background: #fef2f2;
      color: #dc2626;
    }
  }

  &__result-meta {
    font-size: 11px;
    color: #6b7280;
    font-family: inherit;
    flex-shrink: 0;
  }

  &__result-pre {
    margin: 0;
    font-size: 11px;
    color: #4b5563;
    font-family: inherit;
    white-space: pre-wrap;
    word-break: break-all;
  }

  &__result-empty {
    color: #9ca3af;
    font-style: italic;
    font-family: inherit;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
