<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { HttpRequestNode, type HeaderEntry } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { useNodeDetail } from '@renderer/composables/useNodeDetail'
import { messages } from './i18n'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import GearIcon from '@renderer/components/icons/GearIcon.vue'
import HttpRequestHelpDialog from './HttpRequestHelpDialog.vue'

/**
 * HTTP 请求节点的渲染组件（只画卡片内容）。
 *
 * 卡片内只显示预览 / 摘要 / 结果区 / 发送按钮；
 * 完整的方法/URL/headers/body/超时/端口增删通过右上角齿轮按钮打开右侧 detail panel 编辑。
 *
 * 编辑控件改了会直接写回节点（detail panel 用同样的 node.setXxx() 路径），
 * 这里只负责从节点 sync 一份镜像状态来渲染预览 + 结果。
 */
const props = defineProps<{ id: string }>()

const httpNode = shallowRef<HttpRequestNode | undefined>(undefined)

// 卡片标题走插件 manifest 的多语言 title，未配当前语言时由 resolveNodeTitle 兜底
const nodeTitle = useNodeTitle(() => httpNode.value, '?')

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)

const { openNodeDetail } = useNodeDetail()

// —— 帮助浮层开关 ——
const showHelp = ref(false)

// —— 本地镜像状态（与节点实时同步，仅用于渲染预览和结果）——
const method = ref<string>('GET')
const urlTemplate = ref('')
const headers = ref<HeaderEntry[]>([])
const bodyText = ref('')
const resolvedUrl = ref('')
const inputCount = ref(1)
const status = ref<'idle' | 'running' | 'done' | 'error'>('idle')
const lastStatus = ref(0)
const lastBody = ref('')
const lastError = ref('')

let unsubscribe: (() => void) | undefined

function syncFromNode(node: HttpRequestNode): void {
  method.value = node.displayMethod
  urlTemplate.value = node.displayUrlTemplate
  headers.value = node.displayHeaders.map((h) => ({ key: h.key, value: h.value }))
  bodyText.value = node.displayBody
  resolvedUrl.value = node.displayResolvedUrl
  inputCount.value = node.inputCount
  status.value = node.displayStatus
  lastStatus.value = node.displayLastStatus
  lastBody.value = node.displayLastBody
  lastError.value = node.displayLastError
}

const running = computed(() => status.value === 'running')
const hasUrl = computed(() => urlTemplate.value.trim().length > 0)
const allowsBody = computed(() => method.value !== 'GET' && method.value !== 'HEAD')
const headerCount = computed(() => headers.value.length)

function onSend(): void { httpNode.value?.run() }

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof HttpRequestNode) {
    httpNode.value = found
    syncFromNode(found)
    unsubscribe = found.onChanged(() => syncFromNode(found))
  }
})

onUnmounted(() => { unsubscribe?.() })
</script>

<template>
  <div class="node">
    <!-- 头部：拖动 + type 标签 + 帮助 + 齿轮打开 detail panel -->
    <NodeHeader :title="nodeTitle" @help="showHelp = true">
      <template #actions>
        <button
          v-if="httpNode"
          class="node__gear"
          type="button"
          :title="t('editConfigHint')"
          @pointerdown.stop
          @click.stop="openNodeDetail(id)"
        >
          <GearIcon />
        </button>
      </template>
    </NodeHeader>

    <!-- —— 方法+URL 预览行 —— -->
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

    <!-- —— headers/body/端口数摘要 —— -->
    <div v-if="httpNode" class="http-summary">
      <span>{{ t('headersSummary', { n: headerCount }) }}</span>
      <span>body: {{ bodyText ? (allowsBody ? t('bodySet') : t('bodyNotSent', { method })) : t('bodyNone') }}</span>
      <span>{{ t('portSummary', { n: inputCount }) }}</span>
    </div>

    <!-- —— 结果区 —— -->
    <div
      v-if="httpNode"
      class="http-result"
      :class="{
        'http-result--empty': status === 'idle' || (status !== 'running' && !lastBody && !lastError),
        'http-result--error': status === 'error',
        'http-result--running': status === 'running',
        'http-result--server-error': status === 'done' && lastStatus >= 400,
      }"
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
        <!-- <div v-if="lastBody">{{ lastBody }}</div>
        <div v-else class="http-result__empty">{{ t('noResponseBody') }}</div> -->
      </template>
      <template v-else>{{ t('clickToSend') }}</template>
    </div>

    <!-- —— 发送按钮 —— -->
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
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  padding-top: 0;
  background: @color-surface;
  border: 1px solid @node-border-color;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;

  &__gear {
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

// —— 预览：方法 + URL 一行 ——
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
