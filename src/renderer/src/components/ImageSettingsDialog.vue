<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import {
  IMAGE_PROVIDERS,
  type ImageModelPreset,
  type ImageProviderId
} from '../../../main/nodePlugin/ImageGenNode/providers'
import { useImageSettings } from '@renderer/composables/useImageSettings'

/**
 * 图像生成全局设置弹窗（与 LLM 设置弹窗相互独立，Key 分开存）：
 * - Provider 下拉
 * - 当前 Provider 的 API Key
 * - 模型下拉：只列预设模型——因为尺寸选项跟模型绑定，见 providers.ts
 */
const { visible, draftProvider, draftKeys, draftModels, closeSettings, saveSettings, clearKey } =
  useImageSettings()

const providers = Object.entries(IMAGE_PROVIDERS) as [ImageProviderId, typeof IMAGE_PROVIDERS[ImageProviderId]][]

const currentPreset = computed(() => IMAGE_PROVIDERS[draftProvider.value])

const modelOptions = computed(
  () => Object.entries(currentPreset.value.models) as [string, ImageModelPreset][]
)

/** 当前选中模型（空串表示用预设默认）支持的尺寸 */
const currentSizes = computed<readonly string[]>(() => {
  const model = draftModels.value[draftProvider.value] || currentPreset.value.defaultModel
  return currentPreset.value.models[model]?.sizes ?? []
})

function onMaskClick(): void {
  closeSettings()
}

function onDialogClick(e: MouseEvent): void {
  e.stopPropagation()
}

function onKeyDown(e: KeyboardEvent): void {
  if (!visible.value) return
  if (e.key === 'Escape') {
    closeSettings()
  } else if (e.key === 'Enter' && e.metaKey) {
    saveSettings()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="img-dialog__mask" @click="onMaskClick">
      <div class="img-dialog" @click="onDialogClick">
        <h3 class="img-dialog__title">图像生成配置</h3>

        <label class="img-dialog__label" for="img-provider">服务商</label>
        <select id="img-provider" v-model="draftProvider" class="img-dialog__select">
          <option v-for="[key, preset] in providers" :key="key" :value="key">
            {{ preset.label }}
          </option>
        </select>

        <label class="img-dialog__label" for="img-key-input">
          API Key
          <span class="img-dialog__preset-hint">端点: {{ currentPreset.url }}</span>
        </label>
        <input
          id="img-key-input"
          v-model="draftKeys[draftProvider]"
          class="img-dialog__input"
          type="password"
          :placeholder="`${currentPreset.label} API Key`"
          autocomplete="off"
          spellcheck="false"
        />

        <label class="img-dialog__label" for="img-model-select">
          模型
          <span class="img-dialog__preset-hint">默认: {{ currentPreset.defaultModel }}</span>
        </label>
        <select id="img-model-select" v-model="draftModels[draftProvider]" class="img-dialog__select">
          <option value="">{{ currentPreset.defaultModel }}（预设默认）</option>
          <option v-for="[id, preset] in modelOptions" :key="id" :value="id">
            {{ id }} · {{ preset.sizes.length }} 种尺寸{{ preset.shape === 'dashscope-async' ? ' · 异步任务（较慢）' : '' }}
          </option>
        </select>

        <p class="img-dialog__hint">该模型可用尺寸：{{ currentSizes.join(' / ') }}</p>
        <p class="img-dialog__hint">
          配置保存在 localStorage 中（键 canvasdesk.image.config），与 LLM 的 Key 互不影响。
        </p>

        <div class="img-dialog__actions">
          <button
            class="img-dialog__btn img-dialog__btn--ghost"
            type="button"
            @click="clearKey(draftProvider)"
          >清除 Key</button>
          <button class="img-dialog__btn img-dialog__btn--ghost" type="button"
            @click="closeSettings">取消</button>
          <button class="img-dialog__btn img-dialog__btn--primary" type="button"
            @click="saveSettings">保存</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="less">
.img-dialog {
  &__mask {
    position: fixed;
    inset: 0;
    z-index: 2000;
    background: rgba(0, 0, 0, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.15s ease;
  }

  & {
    width: 440px;
    padding: 20px 24px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    gap: 10px;
    animation: popIn 0.18s ease;
  }

  &__title {
    margin: 0 0 4px;
    font-size: 16px;
    font-weight: 600;
    color: #1a1a1a;
  }

  &__label {
    margin-top: 4px;
    font-size: 12px;
    font-weight: 500;
    color: #374151;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__preset-hint {
    font-size: 10px;
    font-weight: 400;
    color: #9ca3af;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  &__input,
  &__select {
    width: 100%;
    padding: 8px 10px;
    font-size: 13px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
    background: #fff;

    &:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
    }
  }

  &__select {
    font-family: inherit;
  }

  &__hint {
    margin: 2px 0 0;
    font-size: 11px;
    color: #9ca3af;
  }

  &__actions {
    margin-top: 12px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  &__btn {
    padding: 6px 14px;
    font-size: 12px;
    border-radius: 6px;
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.15s;

    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    &--ghost {
      background: #fff;
      border-color: #d1d5db;
      color: #374151;

      &:hover:not(:disabled) {
        background: #f3f4f6;
      }
    }

    &--primary {
      background: #3b82f6;
      color: #fff;
      border-color: #3b82f6;

      &:hover:not(:disabled) {
        background: #2563eb;
        border-color: #2563eb;
      }
    }
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes popIn {
  from { opacity: 0; transform: translateY(-8px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
