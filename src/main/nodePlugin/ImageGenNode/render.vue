<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { workspaceScene } from '../../engine/graph/SceneRegistry'
import { ImageGenNode } from './node'
import { IMAGE_PROVIDERS, type ImageModelPreset, type ImageProviderId } from './providers'
import { useNodePosition } from '@renderer/composables/useNodePosition'
import { useImageSettings } from '@renderer/composables/useImageSettings'
import { useNodeTitle } from '@renderer/composables/useNodeTitle'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'
import HelpDialog from '@renderer/components/HelpDialog.vue'
import ImageGenHelpDialog from './ImageGenHelpDialog.vue'

// 卡片头部标题走插件 manifest 的多语言 title，未配当前语言时由 resolveNodeTitle 兜底
const nodeTitle = useNodeTitle(ImageGenNode.TYPE)

// 卡片内文案走节点本地的 i18n.ts（放在节点文件夹里，便于插件化替换），跟随界面语言
const t = useLocalizedMessages(messages)

/**
 * 文生图节点的渲染组件：
 * - 节点配置行：provider 下拉 + model 下拉（对齐 LLMNode）
 * - 预览区：生成中显示 spinner，生成完直接内联缩略图，失败显示错误文案
 * - 底部操作栏：尺寸下拉（上游接了尺寸线时置灰，以端口值为准）+ 生成按钮
 *
 * 提示词由上游端口提供，所以节点里没有 prompt 输入框。
 */
const props = defineProps<{ id: string }>()

const { hasKey } = useImageSettings()

const providers = Object.entries(IMAGE_PROVIDERS) as [ImageProviderId, typeof IMAGE_PROVIDERS[ImageProviderId]][]

const node = shallowRef<ImageGenNode | undefined>(undefined)
const status = ref<'idle' | 'loading' | 'done' | 'error'>('idle')

// 节点级配置（从 ImageGenNode 实例读写）
const provider = ref<ImageProviderId>('siliconflow')
const model = ref('')

// 帮助浮层开关（弹窗壳由 HelpDialog 负责）
const showHelp = ref(false)
const errorMessage = ref('')
const promptConnected = ref(false)
const sizeConnected = ref(false)
const sizeOptions = ref<readonly string[]>([])
const size = ref('')
const modelLabel = ref('')

const { startDrag } = useNodePosition(() => node.value)

let unsubscribe: (() => void) | undefined

// —— 缩略图 objectURL；只在 File 变化时重建，避免拖节点时反复建/销 ——
const imageUrl = ref<string | null>(null)
let revokeUrl: (() => void) | null = null
let lastFile: File | null = null

function clearImage(): void {
  if (revokeUrl) {
    revokeUrl()
    revokeUrl = null
  }
  imageUrl.value = null
}

/** 把节点上的派生状态同步到本地 ref（Vue 追踪不到引擎里的普通字段） */
function syncFromNode(): void {
  const n = node.value
  if (!n) return
  status.value = n.displayStatus
  errorMessage.value = n.displayError
  promptConnected.value = n.displayPromptConnected
  sizeConnected.value = n.displaySizeConnected
  sizeOptions.value = n.displaySizeOptions
  size.value = n.displaySize
  modelLabel.value = n.displayModelLabel
  if (n.displayProvider !== provider.value) provider.value = n.displayProvider
  if (n.displayModel !== model.value) model.value = n.displayModel

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

/** 下拉候选：模型支持的尺寸，外加当前生效值（上游可能传入预设外的尺寸） */
const sizeChoices = computed<readonly string[]>(() => {
  const list = [...sizeOptions.value]
  if (size.value && !list.includes(size.value)) list.unshift(size.value)
  return list
})

/** 当前 provider 的模型选项列表 */
const currentPreset = computed(() => IMAGE_PROVIDERS[provider.value])
const modelOptions = computed(
  () => Object.entries(currentPreset.value.models) as [string, ImageModelPreset][]
)

/** 当前 provider 是否已配全局 Key —— 决定齿轮 tooltip */
const currentProviderKeyOk = computed(() => hasKey(provider.value))

const placeholder = computed(() => {
  if (!node.value) return t('nodeMissing')
  if (!currentProviderKeyOk.value) return t('needApiKey')
  if (!promptConnected.value) return t('needPrompt')
  return t('ready')
})

// —— 自定义 model 下拉 ——
const modelDropdownOpen = ref(false)
const modelSelectRef = ref<HTMLElement | null>(null)

function toggleModelDropdown(e: MouseEvent): void {
  e.stopPropagation()
  modelDropdownOpen.value = !modelDropdownOpen.value
}

function selectModel(id: string): void {
  modelDropdownOpen.value = false
  onModelChange(id)
}

function onDocPointerDown(e: PointerEvent): void {
  if (!modelDropdownOpen.value) return
  if (modelSelectRef.value && !modelSelectRef.value.contains(e.target as Node)) {
    modelDropdownOpen.value = false
  }
}

onMounted(() => {
  const found = workspaceScene.getNode(props.id)
  if (found instanceof ImageGenNode) {
    node.value = found
    provider.value = found.displayProvider
    model.value = found.displayModel
    syncFromNode()
    unsubscribe = found.onChanged(() => syncFromNode())
  }
  document.addEventListener('pointerdown', onDocPointerDown, true)
})

onBeforeUnmount(() => {
  unsubscribe?.()
  clearImage()
  document.removeEventListener('pointerdown', onDocPointerDown, true)
})

function onProviderChange(val: ImageProviderId): void {
  provider.value = val
  node.value?.setProvider(val)
}

function onModelChange(val: string): void {
  model.value = val
  node.value?.setModel(val)
}

function onSizeChange(e: Event): void {
  node.value?.setSize((e.target as HTMLSelectElement).value)
}

function onGenClick(): void {
  node.value?.manualTrigger()
}
</script>

<template>
  <div class="node">
    <div class="node__header" @pointerdown="startDrag">
      <span class="node__handle" :title="t('dragHint')">{{ nodeTitle }}</span>
      <div class="node__header-actions">
        <!-- <button
          v-if="node"
          class="node__gear"
          type="button"
          :title="currentProviderKeyOk ? t('gearConfigured') : t('gearConfigure')"
          @pointerdown.stop
          @click.stop="onGearClick"
        >
          <GearIcon />
        </button> -->
        <button
          class="node__help"
          type="button"
          :title="t('helpTitle')"
          @pointerdown.stop
          @click.stop="showHelp = true"
        >?</button>
      </div>
    </div>

    <!-- 节点级配置行：provider + model（对齐 LLMNode） -->
    <div v-if="node" class="node__config-row">
      <select
        class="node__provider-select"
        :value="provider"
        @change="(e) => onProviderChange((e.target as HTMLSelectElement).value as ImageProviderId)"
      >
        <option v-for="[key, preset] in providers" :key="key" :value="key">
          {{ preset.label }}
        </option>
      </select>
      <div ref="modelSelectRef" class="node__model-select" :title="model || `默认: ${currentPreset.defaultModel}`">
        <button
          type="button"
          class="node__model-trigger"
          @click="toggleModelDropdown"
        >
          <span class="node__model-label">{{ model || `${currentPreset.defaultModel}（预设默认）` }}</span>
          <span class="node__model-caret" :class="{ 'is-open': modelDropdownOpen }">▾</span>
        </button>
        <div
          v-if="modelDropdownOpen"
          class="node__model-menu"
          @click.stop
        >
          <div
            class="node__model-option"
            :class="{ 'is-active': !model }"
            @click="selectModel('')"
          >
            <span class="node__model-option-name">{{ currentPreset.defaultModel }}（预设默认）</span>
            <span class="node__model-option-ref">-</span>
          </div>
          <div
            v-for="[id, preset] in modelOptions"
            :key="id"
            class="node__model-option"
            :class="{ 'is-active': model === id }"
            @click="selectModel(id)"
          >
            <span class="node__model-option-name">
              {{ id }}{{ preset.shape === 'dashscope-async' ? ' · 异步（较慢）' : '' }}
            </span>
            <span v-if="preset.maxReferenceImages" class="node__model-option-ref">参考图 × {{ preset.maxReferenceImages }}</span>
            <span v-else class="node__model-option-ref">-</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 预览区 -->
    <div
      class="igen-preview"
      :class="{
        'igen-preview--empty': !imageUrl && status !== 'loading',
        'igen-preview--error': status === 'error',
        'igen-preview--loading': status === 'loading'
      }"
    >
      <template v-if="status === 'loading'">
        <span class="igen-preview__spinner" />
        <span class="igen-preview__loading-text">{{ t('generating') }}</span>
      </template>
      <img
        v-else-if="imageUrl"
        class="igen-preview__img"
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

    <!-- 底部操作栏：左尺寸下拉 + 右生成按钮 -->
    <div class="node__bottom" v-if="node">
      <select
        class="igen-size"
        :value="size"
        :disabled="sizeConnected"
        :title="sizeConnected ? t('sizeFromUpstream', { size }) : t('currentModel', { model: modelLabel })"
        @change="onSizeChange"
      >
        <option v-for="s in sizeChoices" :key="s" :value="s">{{ s }}</option>
      </select>
      <button
        class="node__send"
        type="button"
        :disabled="status === 'loading'"
        @click="onGenClick"
      >
        {{ status === 'loading' ? t('generating') : t('generate') }}
      </button>
    </div>
  </div>

  <!-- 帮助弹窗 -->
  <HelpDialog :visible="showHelp" :title="t('helpDialogTitle')" @close="showHelp = false">
    <ImageGenHelpDialog />
  </HelpDialog>
</template>

<style scoped lang="less">
.node {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  overflow: visible;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background: @color-surface;
  border: 1px solid @node-border-color;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px dashed @node-border-color;
    padding-bottom: 4px;
    cursor: grab;
    user-select: none;

    &:active {
      cursor: grabbing;
    }
  }

  &__handle {
    font-size: 12px;
    color: @color-text-weak;
    padding: 2px 0;
  }

  // 右侧按钮组：齿轮 + 帮助，靠右对齐（head 已 space-between，auto 双保险）
  &__header-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-left: auto;
  }

  // —— 节点配置行 ——
  &__config-row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  &__provider-select {
    font-size: 11px;
    padding: 3px 6px;
    border: 1px solid @node-border-color;
    border-radius: 4px;
    background: #fff;
    color: #374151;
    outline: none;
    cursor: pointer;
    width: 100px;
    flex-shrink: 0;

    &:focus {
      border-color: #3b82f6;
    }
  }

  &__model-select {
    flex: 1;
    min-width: 0;
    position: relative;
  }

  &__model-trigger {
    all: unset;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    font-size: 11px;
    padding: 3px 6px;
    border: 1px solid @node-border-color;
    border-radius: 4px;
    background: #fff;
    color: #374151;
    cursor: pointer;
    box-sizing: border-box;
    gap: 4px;

    &:hover {
      border-color: #9ca3af;
    }

    &:active,
    &:focus {
      border-color: #3b82f6;
    }
  }

  &__model-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
  }

  &__model-caret {
    font-size: 9px;
    color: #9ca3af;
    flex-shrink: 0;
    transition: transform 0.15s;

    &.is-open {
      transform: rotate(180deg);
    }
  }

  &__model-menu {
    position: absolute;
    top: calc(100% + 2px);
    left: 0;
    right: 0;
    z-index: 1000;
    max-height: 240px;
    overflow-y: auto;
    background: #fff;
    border: 1px solid @node-border-color;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    padding: 4px;
    box-sizing: border-box;
  }

  &__model-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 5px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;

    &:hover,
    &.is-active {
      background: #eff6ff;
    }

    &.is-active {
      color: #1d4ed8;
    }
  }

  &__model-option-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__model-option-ref {
    flex-shrink: 0;
    font-size: 10px;
    color: #6b7280;
    background: #f3f4f6;
    padding: 1px 6px;
    border-radius: 3px;
    white-space: nowrap;
  }

  &__help {
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
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: #dbeafe;
      color: #2563eb;
    }
  }

  &__gear {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 4px;
    color: #6b7280;
    transition: color 0.15s, background 0.15s;

    &:hover {
      color: #111827;
      background: #f3f4f6;
    }

    &:active {
      background: #e5e7eb;
    }
  }

  &__bottom {
    display: flex;
    align-items: stretch;
    gap: 6px;
    flex-shrink: 0;
  }

  &__send {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 18px;
    font-size: 13px;
    font-weight: 500;
    color: #fff;
    background: #3b82f6;
    border-radius: 6px;
    white-space: nowrap;
    transition: background 0.15s;
    height: 32px;

    &:hover:not(:disabled) {
      background: #2563eb;
    }

    &:active:not(:disabled) {
      background: #1d4ed8;
    }

    &:disabled {
      cursor: not-allowed;
      background: #93c5fd;
    }
  }
}

.igen-size {
  flex: 1;
  box-sizing: border-box;
  height: 32px;
  padding: 0 6px;
  font-size: 12px;
  font-family: inherit;
  color: #1f2937;
  border: 1px solid @node-border-color;
  border-radius: 6px;
  outline: none;
  background: #fff;
  cursor: pointer;

  &:focus {
    border-color: #3b82f6;
  }

  &:disabled {
    cursor: not-allowed;
    color: #9aa2ad;
    background: #f3f4f6;
  }
}

.igen-preview {
  padding: 6px;
  border: 1px solid @node-border-color;
  border-radius: 6px;
  font-size: 12px;
  flex: 1;
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  overflow: hidden;
  background: #f4f5f7;
  color: #1f2937;

  &__img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    display: block;
    background: #fff;
  }

  &--empty {
    color: #9aa2ad;
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
    width: 12px;
    height: 12px;
    border: 2px solid #bfdbfe;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  &__loading-text {
    font-size: 12px;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
