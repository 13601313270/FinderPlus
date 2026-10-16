<script setup lang="ts">
/**
 * 通用图生图重绘弹窗：ImageGenNode 和 ImgFileNode 共用。
 *
 * 通过回调与外部解耦：
 * - generateFn(prompt, provider?, model?) → 生成预览图，返回 {file, hash} 或 {error}
 * - applyFn(file, hash) → 用户点"确认替换"后调用，外部负责落盘/commit
 * - cancelCallback() → 弹窗关闭时调用（如中断正在进行的生成）
 * - initialProvider / initialModel → 弹窗内模型下拉的初始值
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { IMAGE_PROVIDERS, readImageEndpoint, type ImageModelPreset, type ImageProviderId } from './providers'
import { useImageSettings } from '@renderer/composables/useImageSettings'
import { useLocalizedMessages } from '@renderer/composables/useLocalizedMessages'
import { messages } from './i18n'

const t = useLocalizedMessages(messages)
const { hasKey } = useImageSettings()

interface GenerateResult {
  file: File
  hash: string
}

const props = defineProps<{
  visible: boolean
  initialProvider: ImageProviderId
  initialModel: string
  originalImageUrl: string
  generateFn: (prompt: string, provider?: ImageProviderId, model?: string) => Promise<GenerateResult | { error: string }>
  applyFn: (file: File, hash: string) => void
  cancelCallback?: () => void
}>()

const emit = defineEmits<{
  close: []
}>()

const providers = Object.entries(IMAGE_PROVIDERS) as [ImageProviderId, typeof IMAGE_PROVIDERS[ImageProviderId]][]

// —— 弹窗内临时的 provider/model（跟节点状态解耦）——
const tempProvider = ref<ImageProviderId>(props.initialProvider)
const tempModel = ref<string>(props.initialModel)

// —— prompt 输入 ——
const prompt = ref('')

// —— 生成状态 ——
const loading = ref(false)
const errorMessage = ref('')
const previewFile = ref<File | null>(null)
const previewHash = ref('')
const previewUrl = ref<string | null>(null)
let previewRevokeUrl: (() => void) | null = null

function clearPreview(): void {
  if (previewRevokeUrl) {
    previewRevokeUrl()
    previewRevokeUrl = null
  }
  previewUrl.value = null
  previewFile.value = null
  previewHash.value = ''
}

// 弹窗关闭时清理
watch(() => props.visible, (v) => {
  if (!v) {
    props.cancelCallback?.()
    clearPreview()
    prompt.value = ''
    errorMessage.value = ''
    loading.value = false
    // 重置 provider/model 为初始值（外部可能已更新）
    tempProvider.value = props.initialProvider
    tempModel.value = props.initialModel
  }
})

onBeforeUnmount(() => {
  props.cancelCallback?.()
  clearPreview()
})

// —— 模型下拉 ——
const modelDropdownOpen = ref(false)
const modelSelectRef = ref<HTMLElement | null>(null)

function toggleModelDropdown(e: MouseEvent): void {
  e.stopPropagation()
  modelDropdownOpen.value = !modelDropdownOpen.value
}

function selectModel(id: string): void {
  modelDropdownOpen.value = false
  tempModel.value = id
}

function onDocPointerDown(e: PointerEvent): void {
  if (!modelDropdownOpen.value) return
  if (modelSelectRef.value && !modelSelectRef.value.contains(e.target as Node)) {
    modelDropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDown, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown, true)
})

// —— 计算属性 ——
const currentPreset = computed(() => IMAGE_PROVIDERS[tempProvider.value])
const modelOptions = computed(
  () => Object.entries(currentPreset.value.models) as [string, ImageModelPreset][]
)

const tempEndpoint = computed(() => readImageEndpoint(tempProvider.value, tempModel.value))
const modelSupportsRef = computed(() => tempEndpoint.value.maxReferenceImages > 0)
const modelHasKey = computed(() => hasKey(tempProvider.value))

const canGenerate = computed(() =>
  !loading.value &&
  prompt.value.trim().length > 0 &&
  modelSupportsRef.value &&
  modelHasKey.value
)

// —— 事件处理 ——
function onProviderChange(val: ImageProviderId): void {
  tempProvider.value = val
  tempModel.value = ''
}

async function onGenerate(): Promise<void> {
  if (!canGenerate.value) return
  loading.value = true
  errorMessage.value = ''
  clearPreview()

  try {
    const result = await props.generateFn(
      prompt.value,
      tempProvider.value,
      tempModel.value
    )
    if ('error' in result) {
      errorMessage.value = result.error
    } else {
      previewFile.value = result.file
      previewHash.value = result.hash
      previewUrl.value = URL.createObjectURL(result.file)
      previewRevokeUrl = () => URL.revokeObjectURL(previewUrl.value!)
    }
  } finally {
    loading.value = false
  }
}

function onConfirm(): void {
  if (!previewFile.value) return
  props.applyFn(previewFile.value, previewHash.value)
  emit('close')
}

function onCancel(): void {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="rd-fade">
      <div v-if="visible" class="rd-mask" @click="onCancel">
        <div class="rd-dialog" role="dialog" aria-modal="true" @click.stop>
          <h3 class="rd-title">{{ t('redrawDialogTitle') }}</h3>

          <!-- provider + model 选择（临时，不保存） -->
          <div class="rd-model-row">
            <select
              class="rd-provider-select"
              :value="tempProvider"
              @change="(e) => onProviderChange((e.target as HTMLSelectElement).value as ImageProviderId)"
            >
              <option v-for="[key, preset] in providers" :key="key" :value="key">
                {{ preset.label }}
              </option>
            </select>
            <div ref="modelSelectRef" class="rd-model-select">
              <button
                type="button"
                class="rd-model-trigger"
                @click="toggleModelDropdown"
              >
                <span class="rd-model-label">{{ tempModel || `${currentPreset.defaultModel}（预设默认）` }}</span>
                <span class="rd-model-caret" :class="{ 'is-open': modelDropdownOpen }">▾</span>
              </button>
              <div v-if="modelDropdownOpen" class="rd-model-menu" @click.stop>
                <div
                  class="rd-model-option"
                  :class="{ 'is-active': !tempModel }"
                  @click="selectModel('')"
                >
                  <span class="rd-model-option-name">{{ currentPreset.defaultModel }}（预设默认）</span>
                  <span class="rd-model-option-ref">-</span>
                </div>
                <div
                  v-for="[id, preset] in modelOptions"
                  :key="id"
                  class="rd-model-option"
                  :class="{ 'is-active': tempModel === id }"
                  @click="selectModel(id)"
                >
                  <span class="rd-model-option-name">
                    {{ id }}{{ preset.shape === 'dashscope-async' ? ' · 异步（较慢）' : '' }}
                  </span>
                  <span v-if="preset.maxReferenceImages" class="rd-model-option-ref">参考图 × {{ preset.maxReferenceImages }}</span>
                  <span v-else class="rd-model-option-ref">-</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 模型不支持图生图时的警告 -->
          <div v-if="!modelSupportsRef" class="rd-warning">
            {{ t('redrawNoSupport') }}
          </div>

          <!-- prompt 输入 -->
          <div class="rd-prompt-area">
            <label class="rd-prompt-label">{{ t('redrawPromptLabel') }}</label>
            <textarea
              v-model="prompt"
              class="rd-prompt-input"
              :placeholder="t('redrawPromptPlaceholder')"
              rows="3"
            />
          </div>

          <!-- 图片对比区 -->
          <div class="rd-compare">
            <div class="rd-image-col">
              <div class="rd-image-label">{{ t('redrawOriginal') }}</div>
              <div class="rd-image-box">
                <img :src="originalImageUrl" class="rd-img" alt="original" />
              </div>
            </div>
            <div class="rd-image-col">
              <div class="rd-image-label">{{ t('redrawPreview') }}</div>
              <div class="rd-image-box">
                <template v-if="loading">
                  <span class="rd-spinner" />
                  <span class="rd-loading-text">{{ t('redrawGenerating') }}</span>
                </template>
                <img v-else-if="previewUrl" :src="previewUrl" class="rd-img" alt="redraw preview" />
                <template v-else-if="errorMessage">
                  <span class="rd-error-text">{{ errorMessage }}</span>
                </template>
                <template v-else>
                  <span class="rd-empty-hint">{{ t('redrawPromptPlaceholder') }}</span>
                </template>
              </div>
            </div>
          </div>

          <!-- 底部按钮 -->
          <div class="rd-actions">
            <button
              class="rd-btn rd-btn--ghost"
              type="button"
              :disabled="loading"
              @click="onCancel"
            >{{ t('redrawCancel') }}</button>
            <button
              v-if="!previewUrl"
              class="rd-btn rd-btn--primary"
              type="button"
              :disabled="!canGenerate"
              @click="onGenerate"
            >
              <span v-if="loading" class="rd-btn-spinner" />
              {{ loading ? t('redrawGenerating') : t('redrawGenerate') }}
            </button>
            <template v-else>
              <button
                class="rd-btn rd-btn--ghost"
                type="button"
                @click="clearPreview"
              >{{ t('redrawGenerate') }}（重新）</button>
              <button
                class="rd-btn rd-btn--confirm"
                type="button"
                @click="onConfirm"
              >{{ t('redrawConfirm') }}</button>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="less">
.rd-mask {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(17, 24, 39, 0.55);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: rdMaskIn 0.15s ease;
}

.rd-dialog {
  width: 640px;
  max-width: 90vw;
  padding: 22px 24px 18px;
  background: #ffffff;
  border-radius: 14px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.08);
  animation: rdPopIn 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
  max-height: 90vh;
  overflow-y: auto;
}

.rd-title {
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  line-height: 1.4;
}

// —— provider/model 选择行 ——
.rd-model-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}

.rd-provider-select {
  font-size: 11px;
  padding: 3px 6px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: #fff;
  color: #374151;
  outline: none;
  cursor: pointer;
  width: 140px;
  flex-shrink: 0;

  &:focus { border-color: #3b82f6; }
}

.rd-model-select {
  flex: 1;
  min-width: 0;
  position: relative;
}

.rd-model-trigger {
  all: unset;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  font-size: 11px;
  padding: 3px 6px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: #fff;
  color: #374151;
  cursor: pointer;
  box-sizing: border-box;
  gap: 4px;

  &:hover { border-color: #9ca3af; }
  &:active, &:focus { border-color: #3b82f6; }
}

.rd-model-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.rd-model-caret {
  font-size: 9px;
  color: #9ca3af;
  flex-shrink: 0;
  transition: transform 0.15s;

  &.is-open { transform: rotate(180deg); }
}

.rd-model-menu {
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  right: 0;
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  padding: 4px;
  box-sizing: border-box;
}

.rd-model-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;

  &:hover, &.is-active { background: #eff6ff; }
  &.is-active { color: #1d4ed8; }
}

.rd-model-option-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rd-model-option-ref {
  flex-shrink: 0;
  font-size: 10px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 1px 6px;
  border-radius: 3px;
  white-space: nowrap;
}

// —— 警告 ——
.rd-warning {
  font-size: 12px;
  color: #b45309;
  background: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 10px;
  line-height: 1.5;
}

// —— prompt ——
.rd-prompt-area {
  margin-bottom: 12px;
}

.rd-prompt-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 4px;
}

.rd-prompt-input {
  width: 100%;
  box-sizing: border-box;
  padding: 9px 12px;
  font-size: 13px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  outline: none;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
  }
}

// —— 图片对比区 ——
.rd-compare {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
}

.rd-image-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rd-image-label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  text-align: center;
}

.rd-image-box {
  aspect-ratio: 1;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

.rd-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
}

.rd-empty-hint {
  font-size: 11px;
  color: #9ca3af;
  text-align: center;
  padding: 8px;
  font-style: italic;
  line-height: 1.5;
}

.rd-error-text {
  font-size: 12px;
  color: #dc2626;
  text-align: center;
  padding: 8px;
}

.rd-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #bfdbfe;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.rd-loading-text {
  font-size: 12px;
  color: #3b82f6;
  margin-top: 6px;
}

// —— 按钮 ——
.rd-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.rd-btn {
  all: unset;
  cursor: pointer;
  padding: 7px 16px;
  font-size: 13px;
  border-radius: 7px;
  transition: background 0.12s ease, color 0.12s ease;
  display: flex;
  align-items: center;
  gap: 4px;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

.rd-btn--ghost {
  color: #6b7280;
  &:hover:not(:disabled) {
    background: #f3f4f6;
    color: #374151;
  }
}

.rd-btn--primary {
  background: #4f46e5;
  color: #fff;
  font-weight: 500;
  &:hover:not(:disabled) { background: #4338ca; }
}

.rd-btn--confirm {
  background: #10b981;
  color: #fff;
  font-weight: 500;
  &:hover { background: #059669; }
}

.rd-btn-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.rd-fade-enter-active,
.rd-fade-leave-active { transition: opacity 0.15s ease; }
.rd-fade-enter-from,
.rd-fade-leave-to { opacity: 0; }

@keyframes rdMaskIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes rdPopIn {
  from { opacity: 0; transform: scale(0.94) translateY(-4px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
