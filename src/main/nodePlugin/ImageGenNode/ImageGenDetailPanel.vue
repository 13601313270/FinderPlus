<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { ImageGenNode } from './node'
import {
  IMAGE_PROVIDERS,
  fetchImageModels,
  readImageEndpoint,
  resolveImageModelList,
  type ImageProviderId
} from './providers'
import { useImageSettings } from '@renderer/composables/useImageSettings'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'
import ImageRedrawDialog from './ImageRedrawDialog.vue'

/**
 * 图片生成节点的详情面板中间栏——全功能交互都在这里完成：
 * Provider / 模型选择、尺寸选择、生成/停止、结果预览、重绘。
 * 画布上的卡片（render.vue）只负责状态展示 + 快捷生成入口。
 */
const props = defineProps<{ nodeId: string }>()

const t = useLocalizedMessages(messages)
const { hasKey, getProviderKey } = useImageSettings()

const providers = Object.entries(IMAGE_PROVIDERS) as [ImageProviderId, typeof IMAGE_PROVIDERS[ImageProviderId]][]

const node = shallowRef<ImageGenNode | undefined>(undefined)

// —— 远程模型列表加载状态 ——
const modelListLoading = ref(false)
const modelListError = ref('')
/** 每次远程 fetch 完 +1，强迫 modelOptions computed 重算 */
const modelListVersion = ref(0)
/** 远程拉取结果的统计信息，供 UI 提示 */
const modelListInfo = ref('')

// —— 从 node 同步到本地的状态（detailPanel 自己订阅 onChanged）——
const status = ref<'idle' | 'loading' | 'done' | 'error'>('idle')
const errorMessage = ref('')
const promptConnected = ref(false)
const sizeConnected = ref(false)
const sizeOptions = ref<readonly string[]>([])
const size = ref('')
const provider = ref<ImageProviderId>('siliconflow')
const model = ref('')

let offChanged: (() => void) | undefined

// —— 预览图 objectURL ——
const imageUrl = ref<string | null>(null)
let revokeUrl: (() => void) | null = null
let lastFile: File | null = null

// —— 重绘弹窗 ——
const showRedrawDialog = ref(false)

function clearImage(): void {
  if (revokeUrl) {
    revokeUrl()
    revokeUrl = null
  }
  imageUrl.value = null
}

function syncFromNode(): void {
  const n = node.value
  if (!n) return
  status.value = n.displayStatus
  errorMessage.value = n.displayError
  promptConnected.value = n.displayPromptConnected
  sizeConnected.value = n.displaySizeConnected
  sizeOptions.value = n.displaySizeOptions
  size.value = n.displaySize
  provider.value = n.displayProvider
  model.value = n.displayModel

  const file = n.displayFile ?? null
  if (file !== lastFile) {
    lastFile = file
    clearImage()
    if (file) {
      const url = URL.createObjectURL(file)
      imageUrl.value = url
      revokeUrl = () => URL.revokeObjectURL(url)
    }
  }
}

onMounted(() => {
  const found = workspaceScene.getNode(props.nodeId)
  if (found instanceof ImageGenNode) {
    node.value = found
    syncFromNode()
    offChanged = found.onChanged(() => syncFromNode())
  }
})

onBeforeUnmount(() => {
  offChanged?.()
  clearImage()
})

watch(() => props.nodeId, () => {
  const found = workspaceScene.getNode(props.nodeId)
  if (found instanceof ImageGenNode) {
    node.value = found
    syncFromNode()
    offChanged?.()
    offChanged = found.onChanged(() => syncFromNode())
  }
})

// —— 派生 computed ——

/** 当前 provider 是否已配全局 Key —— 决定鉴权警告 */
const providerKeyOk = computed(() => hasKey(provider.value))

/** 当前 provider 的预设 */
const currentPreset = computed(() => IMAGE_PROVIDERS[provider.value])

/** 当前 provider 下的模型选项（远程 + 本地合并） */
const modelOptions = computed(() => {
  // 读一下 modelListVersion 强迫自己在远程 fetch 完后重算
  void modelListVersion.value
  return resolveImageModelList(provider.value)
})

/** 当前 provider 是否有 modelsUrl 支持远程拉取 */
const supportsRemoteModels = computed(() => !!currentPreset.value.modelsUrl)

/** 下拉候选：当前模型支持的尺寸 + 当前生效值（上游可能传入预设外的尺寸） */
const sizeChoices = computed<readonly string[]>(() => {
  const list = [...sizeOptions.value]
  if (size.value && !list.includes(size.value)) list.unshift(size.value)
  return list
})

/** 当前生效模型名（空串 = 预设默认） */
const effectiveModelLabel = computed(() => {
  const ep = readImageEndpoint(provider.value, model.value)
  return ep.model
})

const placeholder = computed(() => {
  if (!node.value) return t('nodeMissing')
  if (!providerKeyOk.value) return t('needApiKey')
  if (!promptConnected.value) return t('needPrompt')
  return t('ready')
})

// —— 事件处理 ——

function onProviderChange(v: ImageProviderId): void {
  provider.value = v
  model.value = ''
  node.value?.setProvider(v)
  // 切换 provider 时自动尝试远程拉取（有 key 才拉）
  refreshCurrentModels()
}

function onModelChange(v: string): void {
  model.value = v
  node.value?.setModel(v)
}

function onSizeChange(e: Event): void {
  node.value?.setSize((e.target as HTMLSelectElement).value)
}

function onGenClick(): void {
  node.value?.manualTrigger()
}

async function onStopClick(): Promise<void> {
  const confirmed = await window.showConfirm(t('stopConfirmTitle'), t('stopConfirmBody'))
  if (!confirmed) return
  node.value?.cancel()
}

// —— 远程模型列表刷新 ——

async function refreshCurrentModels(): Promise<void> {
  const pid = provider.value
  const preset = IMAGE_PROVIDERS[pid]
  if (!preset.modelsUrl) {
    modelListInfo.value = ''
    return
  }
  const key = getProviderKey(pid)
  if (!key.trim()) {
    modelListError.value = ''
    modelListInfo.value = ''
    return
  }
  modelListLoading.value = true
  modelListError.value = ''
  modelListInfo.value = ''
  try {
    const { ids, error } = await fetchImageModels(pid, key)
    modelListError.value = error ?? ''
    if (!error) {
      modelListInfo.value = ids.length > 0
        ? `远程 ${ids.length} 个生图模型`
        : '远程未返回任何生图模型（可能 API Key 权限不足）'
    }
    // 强迫 modelOptions computed 重算（远程缓存已更新）
    modelListVersion.value++
  } finally {
    modelListLoading.value = false
  }
}

// provider 变化时也尝试拉一次（onProviderChange 内部已调，这里兜底覆盖节点初始化时的首次触发）
watch(provider, () => {
  refreshCurrentModels()
})
</script>

<template>
  <div class="detail-panel">
    <!-- 鉴权警告 -->
    <div v-if="!providerKeyOk" class="detail-panel__warn">
      {{ t('needApiKey') }}
    </div>

    <!-- —— 配置行 —— -->
    <div class="detail-panel__section">
      <label class="detail-panel__label">{{ t('providerLabel') }}</label>
      <select
        class="detail-panel__select"
        :value="provider"
        @change="(e: Event) => onProviderChange((e.target as HTMLSelectElement).value as ImageProviderId)"
      >
        <option v-for="[key, preset] in providers" :key="key" :value="key">
          {{ preset.label }}
        </option>
      </select>
    </div>

    <div class="detail-panel__section">
      <label class="detail-panel__label">
        {{ t('modelLabel') }}
        <button
          v-if="supportsRemoteModels"
          class="detail-panel__refresh"
          type="button"
          :disabled="modelListLoading || !providerKeyOk"
          :title="providerKeyOk ? t('refreshModels') : t('needApiKey')"
          @click="refreshCurrentModels"
        >
          <span :class="['detail-panel__refresh-icon', { 'detail-panel__refresh-icon--spin': modelListLoading }]">↻</span>
        </button>
      </label>
      <select
        class="detail-panel__select"
        :value="model"
        @change="(e: Event) => onModelChange((e.target as HTMLSelectElement).value)"
      >
        <option value="">
          {{ currentPreset.defaultModel }}（{{ t('presetDefault') }}）
        </option>
        <option
          v-for="[id, preset] in modelOptions"
          :key="id"
          :value="id"
        >
          {{ id }}{{ preset.shape === 'dashscope-async' ? ' · ' + t('asyncTag') : '' }}{{ preset.maxReferenceImages ? ' · ' + t('refImagesTag', { n: preset.maxReferenceImages }) : '' }}
        </option>
      </select>
      <div v-if="modelListError" class="detail-panel__hint detail-panel__hint--error">
        {{ modelListError }}
      </div>
      <div v-else-if="modelListInfo" class="detail-panel__hint detail-panel__hint--info">
        {{ modelListInfo }}
      </div>
      <div class="detail-panel__hint">
        {{ t('effectiveModel', { model: effectiveModelLabel }) }}
      </div>
    </div>

    <!-- —— 预览区（主视觉） —— -->
    <div
      class="detail-panel__preview"
      :class="{
        'detail-panel__preview--empty': !imageUrl && status !== 'loading',
        'detail-panel__preview--error': status === 'error',
        'detail-panel__preview--loading': status === 'loading'
      }"
    >
      <!-- 重绘按钮 -->
      <button
        v-if="imageUrl && status === 'done'"
        class="detail-panel__redraw"
        type="button"
        @click="showRedrawDialog = true"
        :title="t('redrawButton')"
      >
        {{ t('redrawButton') }}
      </button>

      <template v-if="status === 'loading'">
        <span class="detail-panel__spinner" />
        <span class="detail-panel__loading-text">{{ t('generating') }}</span>
      </template>
      <img
        v-else-if="imageUrl"
        class="detail-panel__img"
        :src="imageUrl"
        :alt="t('resultAlt')"
        draggable="false"
      />
      <template v-else-if="status === 'error'">
        {{ errorMessage }}
      </template>
      <template v-else>
        {{ placeholder }}
      </template>
    </div>

    <!-- —— 底部操作栏：尺寸 + 生成/停止 —— -->
    <div v-if="node" class="detail-panel__action">
      <select
        class="detail-panel__size"
        :value="size"
        :disabled="sizeConnected"
        :title="sizeConnected ? t('sizeFromUpstream', { size }) : t('currentModel', { model: effectiveModelLabel })"
        @change="onSizeChange"
      >
        <option v-for="s in sizeChoices" :key="s" :value="s">{{ s }}</option>
      </select>
      <button
        v-if="status === 'loading'"
        class="detail-panel__btn detail-panel__btn--stop"
        type="button"
        @click="onStopClick"
      >
        {{ t('stop') }}
      </button>
      <button
        v-else
        class="detail-panel__btn"
        type="button"
        @click="onGenClick"
      >
        {{ t('generate') }}
      </button>
    </div>

    <!-- 重绘弹窗 -->
    <ImageRedrawDialog
      v-if="node && imageUrl"
      :visible="showRedrawDialog"
      :initial-provider="node.displayProvider"
      :initial-model="node.displayModel"
      :original-image-url="imageUrl"
      :generate-fn="(prompt, prov, mdl) => node!.generateRedraw(prompt, prov, mdl)"
      :apply-fn="(file, hash) => node!.applyRedrawResult(file, hash)"
      :cancel-callback="() => node!.cancelRedraw()"
      @close="showRedrawDialog = false"
    />
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
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__refresh {
    all: unset;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 4px;
    color: #6b7280;
    font-size: 13px;
    line-height: 1;
    transition: background 0.12s, color 0.12s;

    &:hover:not(:disabled) {
      background: #e5e7eb;
      color: #2563eb;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.4;
    }
  }

  &__refresh-icon {
    display: inline-block;
    line-height: 1;

    &--spin {
      animation: dpSpin 0.7s linear infinite;
    }
  }

  &__select {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
    background: #fff;
    color: #1f2937;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    cursor: pointer;

    &:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }
  }

  &__hint {
    font-size: 11px;
    color: #9ca3af;
    line-height: 1.4;

    &--error {
      color: #dc2626;
    }

    &--info {
      color: #2563eb;
    }
  }

  &__warn {
    font-size: 11px;
    color: #b45309;
    background: #fef3c7;
    padding: 6px 8px;
    border-radius: 4px;
    line-height: 1.4;
  }

  // —— 预览区 ——
  &__preview {
    flex: 1;
    min-height: 200px;
    padding: 12px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    text-align: center;
    overflow: hidden;
    background: #f4f5f7;
    color: #1f2937;
    position: relative;

    .detail-panel__redraw {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 2;
      cursor: pointer;
      padding: 4px 10px;
      font-size: 12px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.9);
      color: #374151;
      border: 1px solid rgba(0, 0, 0, 0.1);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: background 0.12s, color 0.12s;

      &:hover {
        background: #4f46e5;
        color: #fff;
        border-color: #4f46e5;
      }

      &:active {
        background: #4338ca;
      }
    }

    .detail-panel__img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      display: block;
      background: #fff;
      border-radius: 4px;
    }

    &--empty {
      color: #9ca3af;
      font-style: italic;
    }

    &--error {
      color: #dc2626;
      border-color: #fecaca;
      background: #fef2f2;
    }

    &--loading {
      color: #3b82f6;
    }

    &__spinner {
      width: 16px;
      height: 16px;
      border: 2.5px solid #bfdbfe;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: dpSpin 0.7s linear infinite;
      flex-shrink: 0;
    }

    &__loading-text {
      font-size: 13px;
    }
  }

  // —— 底部操作栏 ——
  &__action {
    display: flex;
    align-items: stretch;
    gap: 8px;
    flex-shrink: 0;
  }

  &__size {
    flex: 1;
    box-sizing: border-box;
    height: 38px;
    padding: 0 10px;
    font-size: 13px;
    font-family: inherit;
    color: #1f2937;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    outline: none;
    background: #fff;
    cursor: pointer;

    &:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }

    &:disabled {
      cursor: not-allowed;
      color: #9aa2ad;
      background: #f3f4f6;
    }
  }

  &__btn {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 28px;
    font-size: 14px;
    font-weight: 500;
    color: #fff;
    background: #3b82f6;
    border-radius: 6px;
    white-space: nowrap;
    transition: background 0.15s;
    height: 38px;
    flex-shrink: 0;

    &:hover:not(:disabled) {
      background: #2563eb;
    }

    &:active:not(:disabled) {
      background: #1d4ed8;
    }

    &--stop {
      background: #ef4444;

      &:hover {
        background: #dc2626;
      }

      &:active {
        background: #b91c1c;
      }
    }
  }
}

@keyframes dpSpin {
  to {
    transform: rotate(360deg);
  }
}
</style>
