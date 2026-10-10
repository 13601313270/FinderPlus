<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { OssNode } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useNodeDetail } from '@renderer/composables/useNodeDetail'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import GearIcon from '@renderer/components/icons/GearIcon.vue'
import aliyunLogo from '@renderer/assets/images/aliyun.png'

const props = defineProps<{ id: string }>()

const ossNode = shallowRef<OssNode | undefined>(undefined)
const nodeTitle = useNodeTitle(() => ossNode.value, '?')
const { openNodeDetail } = useNodeDetail()

const lastUrl = ref('')
const status = ref<'idle' | 'running' | 'done' | 'error'>('idle')
const autoSend = ref(false)
const hasConfig = ref(false)
const copied = ref(false)

let unsubscribe: (() => void) | undefined

function syncFromNode(node: OssNode): void {
  lastUrl.value = node.displayLastUrl
  status.value = node.displayStatus
  autoSend.value = node.displayAutoSend
  hasConfig.value = node.hasConfig
}

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof OssNode) {
    ossNode.value = found
    syncFromNode(found)
    unsubscribe = found.onChanged(() => syncFromNode(found))
  }
})

onUnmounted(() => { unsubscribe?.() })

async function onCopyUrl(): Promise<void> {
  if (!lastUrl.value) return
  try {
    await navigator.clipboard.writeText(lastUrl.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch {
    // ignore
  }
}

function onUpload(): void { ossNode.value?.run() }

const running = computed(() => status.value === 'running')
</script>

<template>
  <div class="oss-card">
    <NodeHeader :title="nodeTitle">
      <template #actions>
        <button
          v-if="ossNode"
          class="oss-card__gear"
          type="button"
          title="OSS 配置"
          @pointerdown.stop
          @click.stop="openNodeDetail(id)"
        >
          <GearIcon />
        </button>
      </template>
    </NodeHeader>

    <!-- —— 极简内容区 —— -->
    <div class="oss-card__body">

      <!-- 阿里云 logo -->
      <img
        class="oss-card__logo"
        :class="{ 'oss-card__logo--spin': running }"
        :src="aliyunLogo"
        alt="OSS"
        :title="hasConfig ? (status === 'done' ? '已上传' : (status === 'error' ? '上传失败' : (status === 'running' ? '上传中…' : '待上传'))) : '未配置'"
      />

      <span class="oss-card__label">OSS</span>
    </div>
    <div class="tools">
      <!-- 复制按钮（有 URL 时才显示） -->
      <button
        v-if="ossNode && lastUrl"
        class="oss-card__copy"
        type="button"
        :title="lastUrl"
        @pointerdown.stop
        @click.stop="onCopyUrl"
      >
        {{ copied ? '✓' : '复制' }}
      </button>

      <!-- 手动上传按钮（仅 autoSend 关闭时显示） -->
      <button
        v-if="ossNode && !autoSend && hasConfig"
        class="oss-card__send"
        type="button"
        :disabled="running"
        @pointerdown.stop
        @click.stop="onUpload"
      >
        {{ running ? '…' : '↑' }}
      </button>
    </div>
  </div>
</template>

<style scoped lang="less">
.oss-card {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 6px 8px 8px;
  padding-top: 0;
  overflow: hidden;

  &__gear {
    all: unset;
    cursor: pointer;
    width: 20px; height: 20px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%;
    background: #f3f4f6; color: #6b7280;
    transition: background 0.15s, color 0.15s;
    flex-shrink: 0;
    svg { width: 12px; height: 12px; }
    &:hover { background: #dbeafe; color: #2563eb; }
  }

  &__body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 0;
  }

  .tools {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  &__logo {
    flex-shrink: 0;
    width: 36px; height: 36px;
    object-fit: contain;
    display: block;
    border-radius: 8px;

    &--spin { animation: spin 0.8s linear infinite; }
  }

  &__label {
    font-size: 14px;
    font-weight: 700;
    color: #1f2937;
    letter-spacing: 0.5px;
  }

  &__copy {
    all: unset;
    cursor: pointer;
    padding: 3px 8px;
    font-size: 11px;
    font-weight: 500;
    color: #fff;
    background: #10b981;
    border-radius: 4px;
    transition: background 0.15s;
    &:hover { background: #059669; }
    &:active { background: #047857; }
  }

  &__send {
    all: unset;
    cursor: pointer;
    width: 24px; height: 24px;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px;
    font-weight: 700;
    color: #fff;
    background: #3b82f6;
    border-radius: 50%;
    flex-shrink: 0;
    transition: background 0.15s;
    &:hover:not(:disabled) { background: #2563eb; }
    &:active:not(:disabled) { background: #1d4ed8; }
    &:disabled { cursor: not-allowed; background: #93c5fd; }
  }
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
