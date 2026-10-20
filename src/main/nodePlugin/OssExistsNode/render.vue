<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { OssExistsNode } from './node'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useNodeDetail } from '@renderer/composables/useNodeDetail'
import NodeHeader from '@renderer/components/NodeHeader.vue'
import GearIcon from '@renderer/components/icons/GearIcon.vue'
import aliyunLogo from '@renderer/assets/images/aliyun.png'

const props = defineProps<{ id: string }>()

const ossNode = shallowRef<OssExistsNode | undefined>(undefined)
const nodeTitle = useNodeTitle(() => ossNode.value, '?')
const { openNodeDetail } = useNodeDetail()

const status = ref<'idle' | 'running' | 'done' | 'error'>('idle')
const lastError = ref('')
const lastExists = ref<boolean | null>(null)
const autoSend = ref(false)
const hasConfig = ref(false)

let unsubscribe: (() => void) | undefined

function syncFromNode(node: OssExistsNode): void {
  status.value = node.displayStatus
  lastError.value = node.displayLastError
  lastExists.value = node.displayLastExists
  autoSend.value = node.displayAutoSend
  hasConfig.value = node.hasConfig
}

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof OssExistsNode) {
    ossNode.value = found
    syncFromNode(found)
    unsubscribe = found.onChanged(() => syncFromNode(found))
  }
})

onUnmounted(() => { unsubscribe?.() })

function onCheck(): void { ossNode.value?.run() }

const running = computed(() => status.value === 'running')
const isError = computed(() => status.value === 'error')
</script>

<template>
  <div class="oss-exists-card">
    <NodeHeader :title="nodeTitle">
      <template #actions>
        <button
          v-if="ossNode"
          class="oss-exists-card__gear"
          type="button"
          title="OSS 配置"
          @pointerdown.stop
          @click.stop="openNodeDetail(id)"
        >
          <GearIcon />
        </button>
      </template>
    </NodeHeader>

    <!-- —— 内容区 —— -->
    <div class="oss-exists-card__body">
      <div class="oss-exists-card__row">
        <!-- 阿里云 logo -->
        <img
          class="oss-exists-card__logo"
          :class="{
            'oss-exists-card__logo--spin': running,
            'oss-exists-card__logo--error': isError,
            'oss-exists-card__logo--yes': lastExists === true,
            'oss-exists-card__logo--no': lastExists === false && status === 'done'
          }"
          :src="aliyunLogo"
          alt="OSS"
          :title="hasConfig
            ? (status === 'running' ? '检查中…' : (isError ? `失败: ${lastError}` : (lastExists === true ? '文件存在' : (lastExists === false ? '文件不存在' : '待检查'))))
            : '未配置'"
        />

        <span
          class="oss-exists-card__label"
          :class="{
            'oss-exists-card__label--error': isError,
            'oss-exists-card__label--yes': lastExists === true,
            'oss-exists-card__label--no': lastExists === false && status === 'done'
          }"
        >
          {{ isError ? '失败' : (lastExists === true ? '存在' : (lastExists === false && status === 'done' ? '不存在' : 'OSS')) }}
        </span>
      </div>
      <div v-if="isError && lastError" class="oss-exists-card__err" :title="lastError">
        {{ lastError }}
      </div>
    </div>
    <div class="tools">
      <!-- 手动检查按钮（仅 autoSend 关闭时显示） -->
      <button
        v-if="ossNode && !autoSend && hasConfig"
        class="oss-exists-card__send"
        type="button"
        :disabled="running"
        @pointerdown.stop
        @click.stop="onCheck"
      >
        {{ running ? '…' : '✓' }}
      </button>
    </div>
  </div>
</template>

<style scoped lang="less">
.oss-exists-card {
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
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-height: 0;
  }

  &__row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  &__err {
    max-width: 160px;
    font-size: 10px;
    line-height: 1.3;
    color: #dc2626;
    text-align: center;
    word-break: break-all;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
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
    &--error {
      border: 1.5px solid #fca5a5;
      background: #fef2f2;
    }
    &--yes {
      border: 1.5px solid #86efac;
      background: #f0fdf4;
    }
    &--no {
      border: 1.5px solid #fde68a;
      background: #fefce8;
    }
  }

  &__label {
    font-size: 14px;
    font-weight: 700;
    color: #1f2937;
    letter-spacing: 0.5px;

    &--error { color: #dc2626; }
    &--yes { color: #16a34a; }
    &--no { color: #ca8a04; }
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
