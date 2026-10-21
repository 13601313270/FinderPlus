<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { S2VNode } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import GearIcon from '@renderer/components/icons/GearIcon.vue'
import { useNodeDetail } from '@renderer/composables/useNodeDetail'
import { messages } from './i18n'

const nodeTitle = useNodeTitle(S2VNode.TYPE)
const t = useLocalizedMessages(messages)
const { openNodeDetail } = useNodeDetail()

const props = defineProps<{ id: string }>()

const node = shallowRef<S2VNode | undefined>(undefined)
const status = ref<'idle' | 'uploading' | 'detecting' | 'submitting' | 'polling' | 'done' | 'error'>('idle')
const errorMessage = ref('')
const statusHint = ref('')
const hasDashscopeKey = ref(true)
const hasWorkspaceId = ref(true)
const imageConnected = ref(false)
const audioConnected = ref(false)

let previewUrl: string | null = null
let lastPreviewHash = ''
const previewVideoUrl = ref<string | null>(null)
let unsubscribe: (() => void) | undefined

const isLoading = computed(() =>
  status.value === 'uploading' || status.value === 'detecting' ||
  status.value === 'submitting' || status.value === 'polling'
)

function refresh(): void {
  const n = node.value
  if (!n) return
  status.value = n.displayStatus
  errorMessage.value = n.displayError
  statusHint.value = n.displayStatusHint
  hasDashscopeKey.value = n.hasDashscopeKey
  hasWorkspaceId.value = n.hasWorkspaceId
  imageConnected.value = n.imageInput.incomingEdgeCount > 0
  audioConnected.value = n.audioInput.incomingEdgeCount > 0

  const f = n.previewFile
  const h = n.previewHash
  if (h !== lastPreviewHash) {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      previewUrl = null
    }
    if (f) {
      previewUrl = URL.createObjectURL(f)
      previewVideoUrl.value = previewUrl
      lastPreviewHash = h
    } else {
      previewVideoUrl.value = null
      lastPreviewHash = ''
    }
  }
}

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof S2VNode) {
    node.value = found
    unsubscribe = found.onChanged(() => refresh())
    refresh()
  }
})

onBeforeUnmount(() => {
  unsubscribe?.()
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl)
    previewUrl = null
  }
})

function onGenerate(): void { node.value?.manualTrigger() }
function onCancel(): void { node.value?.cancel() }
</script>

<template>
  <div class="s2v-card">
    <NodeHeader :title="nodeTitle">
      <template #actions>
        <button
          class="s2v-config-btn"
          type="button"
          :title="t('openDetailTitle')"
          @click.stop="openNodeDetail(props.id)"
        >
          <GearIcon />
        </button>
      </template>
    </NodeHeader>

    <!-- 鉴权警告 -->
    <template v-if="!isLoading && status !== 'done'">
      <div v-if="!hasDashscopeKey" class="s2v-warning">
        {{ t('apiKeyMissing') }}
      </div>
      <div v-else-if="!hasWorkspaceId" class="s2v-warning">
        {{ t('workspaceIdMissing') }}
      </div>
    </template>

    <!-- 端口连接提示 -->
    <template v-if="!isLoading && status !== 'done' && hasDashscopeKey && hasWorkspaceId">
      <div v-if="!imageConnected || !audioConnected" class="s2v-hint">
        <div v-if="!imageConnected">◯ {{ t('imagePortLabel') }}</div>
        <div v-if="!audioConnected">◯ {{ t('audioPortLabel') }}</div>
      </div>
    </template>

    <div style="flex-grow: 1;"></div>

    <!-- 加载状态提示 -->
    <div v-if="isLoading" class="s2v-status">
      <span class="s2v-spinner" />
      <span class="s2v-status-text">{{ statusHint || t('statusPolling') }}</span>
    </div>

    <!-- 生成 / 取消按钮 -->
    <div v-else-if="status !== 'done'" class="s2v-action">
      <button
        class="s2v-btn s2v-btn--generate"
        type="button"
        :disabled="!hasWorkspaceId"
        @click="onGenerate"
      >{{ t('generateButton') }}</button>
    </div>
    <div v-else class="s2v-action">
      <button
        class="s2v-btn s2v-btn--cancel"
        type="button"
        @click="onCancel"
      >×</button>
    </div>

    <!-- 错误提示 -->
    <div v-if="status === 'error' && errorMessage" class="s2v-error">
      {{ errorMessage }}
    </div>

    <!-- 视频预览 -->
    <div v-if="status === 'done' && previewVideoUrl" class="s2v-preview">
      <video :src="previewVideoUrl" controls preload="auto" />
    </div>
  </div>
</template>

<style scoped lang="less">
.s2v-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 8px 8px;
  height: 100%;
  box-sizing: border-box;
  overflow: auto;
}

.s2v-config-btn {
  all: unset;
  cursor: pointer;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f3f4f6;
  color: #6b7280;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;

  svg { width: 11px; height: 11px; }

  &:hover { background: #dbeafe; color: #2563eb; }
}

.s2v-warning {
  font-size: 11px;
  color: #b45309;
  background: #fef3c7;
  padding: 6px 8px;
  border-radius: 4px;
  line-height: 1.4;
}

.s2v-hint {
  font-size: 11px;
  color: #6b7280;
  background: #f9fafb;
  padding: 6px 8px;
  border-radius: 4px;
  line-height: 1.6;
}

.s2v-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #eff6ff;
  border-radius: 4px;
  font-size: 11px;
  color: #1d4ed8;
}

.s2v-status-text { flex: 1; }

.s2v-action {
  display: flex;
  gap: 8px;
}

.s2v-btn {
  flex: 1;
  padding: 7px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;

  &--generate {
    background: #4f46e5;
    color: #fff;

    &:hover:not(:disabled) { background: #4338ca; }
    &:disabled {
      background: #d1d5db;
      cursor: not-allowed;
    }
  }

  &--cancel {
    background: #f3f4f6;
    color: #374151;
    flex: 0 0 auto;
    width: 32px;
    &:hover { background: #e5e7eb; }
  }
}

.s2v-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #bfdbfe;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: s2v-spin 0.8s linear infinite;
  flex-shrink: 0;
}

.s2v-error {
  font-size: 11px;
  color: #dc2626;
  background: #fef2f2;
  padding: 6px 8px;
  border-radius: 4px;
  line-height: 1.4;
}

.s2v-preview {
  display: flex;
  padding-top: 4px;
  border-top: 1px dashed #e5e7eb;

  video {
    width: 100%;
    max-height: 160px;
    border-radius: 4px;
  }
}

@keyframes s2v-spin {
  to { transform: rotate(360deg); }
}
</style>
