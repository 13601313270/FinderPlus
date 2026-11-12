<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { OssExistsNode } from './node'
import { useOssBuckets } from '@renderer/composables/useOssBuckets'

/**
 * OSS 文件存在性检查节点详情面板：
 * - Bucket 下拉选择（引用全局配置）
 * - 自动发送开关
 * - 手动检查按钮 + 结果展示
 */
const props = defineProps<{ nodeId: string }>()

const ossNode = computed(() => {
  const n = workspaceScene.getNode(props.nodeId)
  return n instanceof OssExistsNode ? n : undefined
})

const { buckets: ossBuckets } = useOssBuckets()

// —— 表单镜像状态 ——
const bucketId = ref('')
const autoSend = ref(false)

// —— 运行时状态 ——
const status = ref<'idle' | 'running' | 'done' | 'error'>('idle')
const lastError = ref('')
const lastExists = ref<boolean | null>(null)
const lastObjectKey = ref('')
const lastMeta = ref<{ size?: number; lastModified?: string; etag?: string; contentType?: string } | null>(null)

let offChanged: (() => void) | undefined

onMounted(() => {
  const node = ossNode.value
  if (!node) return
  sync(node)
  offChanged = node.onChanged(() => {
    if (ossNode.value) sync(ossNode.value)
  })
})

onUnmounted(() => { offChanged?.() })

function sync(node: OssExistsNode): void {
  bucketId.value = node.displayBucketId
  autoSend.value = node.displayAutoSend
  status.value = node.displayStatus
  lastError.value = node.displayLastError
  lastExists.value = node.displayLastExists
  lastObjectKey.value = node.displayLastObjectKey
  lastMeta.value = node.displayLastMeta
}

const running = computed(() => status.value === 'running')
const hasConfig = computed(() => ossNode.value?.hasConfig ?? false)

function onCheck(): void { ossNode.value?.run() }

// —— 事件：改了就直接写回节点 ——
function onBucketId(e: Event): void { ossNode.value?.setBucketId((e.target as HTMLSelectElement).value) }
function onAutoSend(e: Event): void { ossNode.value?.setAutoSend((e.target as HTMLInputElement).checked) }
</script>

<template>
  <div class="detail-panel">

    <!-- Bucket 选择 -->
    <div class="detail-panel__section">
      <label class="detail-panel__label">Bucket *</label>
      <select class="detail-panel__input" :value="bucketId" @change="onBucketId">
        <option value="">请选择 Bucket…</option>
        <option v-for="b in ossBuckets" :key="b.id" :value="b.id">{{ b.name }}（{{ b.bucket }}）</option>
      </select>
      <p v-if="ossBuckets.length === 0" class="detail-panel__hint">
        尚未配置任何 Bucket，请在「设置 → OSS Bucket」中新增。
      </p>
    </div>

    <div>
      <label class="detail-panel__switch">
        <input type="checkbox" :checked="autoSend" @change="onAutoSend" />
        <span class="detail-panel__switch-track" />
        <span class="detail-panel__switch-label">自动检查（Key 变更即触发）</span>
      </label>
    </div>

    <!-- 分隔线 -->
    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 4px 0;" />

    <!-- 检查按钮 + 结果 -->
    <div class="detail-panel__section">
      <button class="detail-panel__scrape" type="button"
        :disabled="running || !hasConfig || !ossNode" @click="onCheck">
        <span v-if="running" class="detail-panel__spinner" />
        {{ running ? '检查中…' : '检查文件是否存在' }}
      </button>

      <div class="detail-panel__result" :class="{
        'detail-panel__result--empty': status === 'idle',
        'detail-panel__result--error': status === 'error',
        'detail-panel__result--yes': status === 'done' && lastExists === true,
        'detail-panel__result--no': status === 'done' && lastExists === false,
      }">
        <template v-if="status === 'running'">…检查中</template>
        <template v-else-if="status === 'error'">{{ lastError }}</template>
        <template v-else-if="status === 'done'">
          <div v-if="lastObjectKey" class="detail-panel__result-meta">Key: {{ lastObjectKey }}</div>
          <div v-if="lastExists === true" class="detail-panel__result-status detail-panel__result-status--yes">✓ 存在</div>
          <div v-else-if="lastExists === false" class="detail-panel__result-status detail-panel__result-status--no">✗ 不存在</div>
          <template v-if="lastExists === true && lastMeta">
            <div v-if="lastMeta.size" class="detail-panel__result-meta">大小: {{ lastMeta.size }} bytes</div>
            <div v-if="lastMeta.contentType" class="detail-panel__result-meta">类型: {{ lastMeta.contentType }}</div>
            <div v-if="lastMeta.lastModified" class="detail-panel__result-meta">修改时间: {{ lastMeta.lastModified }}</div>
            <div v-if="lastMeta.etag" class="detail-panel__result-meta">ETag: {{ lastMeta.etag }}</div>
          </template>
        </template>
        <template v-else>配置好 Bucket 后，输入 Key 或点击检查</template>
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

  &__hint {
    margin: 0;
    font-size: 11px;
    color: #d97706;
  }

  &__switch {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    user-select: none;

    input {
      position: absolute;
      width: 0; height: 0;
      opacity: 0;
      pointer-events: none;
    }

    &-track {
      position: relative;
      width: 36px;
      height: 20px;
      flex-shrink: 0;
      background: #d1d5db;
      border-radius: 10px;
      transition: background 0.2s;

      &::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 16px;
        height: 16px;
        background: #fff;
        border-radius: 50%;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        transition: transform 0.2s;
      }
    }

    input:checked + &-track {
      background: #2563eb;
      &::after { transform: translateX(16px); }
    }

    input:focus-visible + &-track {
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.3);
    }

    &:hover input:not(:checked) + &-track {
      background: #9ca3af;
    }

    &-label {
      font-size: 12px;
      color: #374151;
      line-height: 1.4;
    }
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

    &:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12); }
  }

  select.detail-panel__input {
    font-family: inherit;
    background: #fff;
    cursor: pointer;
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

    &:hover:not(:disabled) { background: #1d4ed8; }
    &:active:not(:disabled) { background: #1e40af; }
    &:disabled { cursor: not-allowed; background: #93c5fd; }
  }

  &__spinner {
    width: 12px; height: 12px;
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

    &--empty { color: #9aa2ad; font-style: italic; font-family: inherit; align-items: center; justify-content: center; }
    &--error { border-color: #fecaca; background: #fef2f2; color: #dc2626; }
    &--yes { border-color: #bbf7d0; background: #f0fdf4; }
    &--no { border-color: #fde68a; background: #fefce8; }
  }

  &__result-meta { font-size: 11px; color: #6b7280; font-family: inherit; flex-shrink: 0; }

  &__result-status {
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    flex-shrink: 0;

    &--yes { color: #16a34a; }
    &--no { color: #ca8a04; }
  }
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
