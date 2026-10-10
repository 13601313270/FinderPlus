<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { CrawlerNode } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { useNodeDetail } from '@renderer/composables/useNodeDetail'
import { messages } from './i18n'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import GearIcon from '@renderer/components/icons/GearIcon.vue'
import CrawlerHelpDialog from './CrawlerHelpDialog.vue'

const props = defineProps<{ id: string }>()

const crawlerNode = shallowRef<CrawlerNode | undefined>(undefined)

const nodeTitle = useNodeTitle(() => crawlerNode.value, '?')
const t = useLocalizedMessages(messages)
const { openNodeDetail } = useNodeDetail()

const showHelp = ref(false)

// —— 本地镜像状态（简化版：只展示预览和结果）——
const resolvedUrl = ref('')
const selector = ref('')
const status = ref<'idle' | 'running' | 'done' | 'error'>('idle')
const lastStatus = ref(0)
const lastCount = ref(0)
const lastError = ref('')
const lastResultsPreview = ref('')

let unsubscribe: (() => void) | undefined

function syncFromNode(node: CrawlerNode): void {
  resolvedUrl.value = node.displayResolvedUrl
  selector.value = node.displaySelector
  status.value = node.displayStatus
  lastStatus.value = node.displayLastStatus
  lastCount.value = node.displayLastCount
  lastError.value = node.displayLastError
  lastResultsPreview.value = node.displayLastResultsPreview
}

const running = computed(() => status.value === 'running')
const hasConfig = computed(() => resolvedUrl.value.trim().length > 0)

function onScrape(): void { crawlerNode.value?.run() }

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof CrawlerNode) {
    crawlerNode.value = found
    syncFromNode(found)
    unsubscribe = found.onChanged(() => syncFromNode(found))
  }
})

onUnmounted(() => { unsubscribe?.() })
</script>

<template>
  <div class="node">
    <NodeHeader :title="nodeTitle" @help="showHelp = true">
      <template #actions>
        <button
          v-if="crawlerNode"
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

    <!-- —— URL 预览行 —— -->
    <div
      v-if="crawlerNode"
      class="crawler-preview"
      :class="{ 'crawler-preview--empty': !hasConfig }"
    >
      <span class="crawler-preview__url" :title="resolvedUrl">
        {{ resolvedUrl || t('urlEmptyHint') }}
      </span>
    </div>

    <!-- —— CSS 选择器预览 —— -->
    <div v-if="crawlerNode" class="crawler-css">
      <span class="crawler-css__label">CSS</span>
      <span class="crawler-css__sel">
        {{ selector || t('selectorEmptyHint') }}
      </span>
    </div>

    <!-- —— 结果区 —— -->
    <div
      v-if="crawlerNode"
      class="crawler-result"
      :class="{
        'crawler-result--empty': status === 'idle' || (status !== 'running' && !lastError && lastCount === 0),
        'crawler-result--error': status === 'error',
        'crawler-result--running': status === 'running',
      }"
    >
      <template v-if="status === 'running'">
        <span class="crawler-result__spinner" />
        <span>{{ t('scraping') }}</span>
      </template>
      <template v-else-if="status === 'error'">
        <div class="crawler-result__meta">{{ t('networkError') }}</div>
        <div class="crawler-result__body">{{ lastError }}</div>
      </template>
      <template v-else-if="status === 'done'">
        <div class="crawler-result__meta">
          {{ t('doneStatus', { code: lastStatus, count: lastCount }) }}
        </div>
        <div v-if="lastResultsPreview" class="crawler-result__body crawler-result__body--preview">
          {{ lastResultsPreview }}
        </div>
        <div v-else-if="lastCount === 0" class="crawler-result__empty">{{ t('noResult') }}</div>
      </template>
      <template v-else>{{ t('clickToSend') }}</template>
    </div>

    <!-- —— 抓取按钮 —— -->
    <button
      v-if="crawlerNode"
      class="node__run"
      type="button"
      :disabled="running || !hasConfig"
      :title="hasConfig ? t('sendHint') : t('sendHintNoUrl')"
      @click="onScrape"
    >
      {{ running ? t('scraping') : t('scrape') }}
    </button>
  </div>

  <HelpDialog :visible="showHelp" :title="t('helpTitle')" @close="showHelp = false">
    <CrawlerHelpDialog />
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

    svg { width: 12px; height: 12px; }

    &:hover { background: #dbeafe; color: #2563eb; }
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
    &:disabled { cursor: not-allowed; background: #93c5fd; }
  }
}

.crawler-preview {
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

  &__url {
    min-width: 0; flex: 1; color: #4b5563;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  &--empty {
    color: #9aa2ad; font-style: italic; font-family: inherit;
  }
}

.crawler-css {
  flex-shrink: 0;
  font-size: 10px;
  display: flex;
  gap: 4px;

  &__label {
    font-weight: 600;
    color: #6b7280;
    letter-spacing: 0.5px;
  }

  &__sel {
    min-width: 0;
    color: #4b5563;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
}

.crawler-result {
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
    color: #9aa2ad; font-style: italic; font-family: inherit;
    align-items: center; justify-content: center;
  }

  &--error {
    color: #dc2626; border-color: #fecaca; background: #fef2f2;
  }

  &--running {
    flex-direction: row; align-items: center; gap: 5px;
    color: #3b82f6; font-family: inherit;
  }

  &__meta { font-size: 10px; color: #6b7280; font-family: inherit; flex-shrink: 0; }
  &__empty { color: #9ca3af; font-style: italic; font-family: inherit; }

  &__body {
    font-family: inherit;
    color: inherit;

    &--preview {
      font-size: 10px;
      color: #4b5563;
    }
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

@keyframes spin { to { transform: rotate(360deg); } }
</style>
