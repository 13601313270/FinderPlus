<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { LLM_PROVIDERS, useLLMSettings, type LLMProvider } from '@renderer/composables/useLLMSettings'

/**
 * LLM 全局设置弹窗：
 * - Provider 下拉（DeepSeek / OpenAI）
 * - 根据当前 Provider 显示对应的 API Key 输入框
 * - Model 输入框（datalist 候选 + 拉取按钮；失败时降级自由输入）
 */

const {
  visible,
  draftProvider,
  draftKeys,
  draftModels,
  modelLists,
  modelsLoading,
  modelsError,
  closeSettings,
  saveSettings,
  clearKey,
  fetchModels
} = useLLMSettings()

const providers = Object.entries(LLM_PROVIDERS) as [LLMProvider, typeof LLM_PROVIDERS[LLMProvider]][]

const currentPreset = computed(() => LLM_PROVIDERS[draftProvider.value])
const currentModels = computed(() => modelLists.value[draftProvider.value] ?? [])

async function onFetchModels(): Promise<void> {
  await fetchModels(draftProvider.value, draftKeys.value[draftProvider.value])
}

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
    <div v-if="visible" class="llm-dialog__mask" @click="onMaskClick">
      <div class="llm-dialog" @click="onDialogClick">
        <h3 class="llm-dialog__title">LLM 配置</h3>

        <!-- Provider 下拉 -->
        <label class="llm-dialog__label" for="llm-provider">服务商</label>
        <select id="llm-provider" v-model="draftProvider" class="llm-dialog__select">
          <option v-for="[key, preset] in providers" :key="key" :value="key">
            {{ preset.label }}
          </option>
        </select>

        <!-- Key 输入 -->
        <label class="llm-dialog__label" for="llm-key-input">
          API Key
          <span class="llm-dialog__preset-hint">端点: {{ currentPreset.url }}</span>
        </label>
        <input
          id="llm-key-input"
          v-model="draftKeys[draftProvider]"
          class="llm-dialog__input"
          type="password"
          :placeholder="`${currentPreset.label} API Key`"
          autocomplete="off"
          spellcheck="false"
        />

        <!-- Model 输入 + 拉取按钮 -->
        <label class="llm-dialog__label" for="llm-model-input">
          Model
          <span class="llm-dialog__preset-hint">留空使用默认: {{ currentPreset.defaultModel }}</span>
        </label>
        <div class="llm-dialog__model-row">
          <input
            id="llm-model-input"
            v-model="draftModels[draftProvider]"
            class="llm-dialog__input llm-dialog__input--model"
            type="text"
            :placeholder="currentPreset.defaultModel"
            :list="`llm-model-list-${draftProvider}`"
            autocomplete="off"
            spellcheck="false"
          />
          <button
            class="llm-dialog__btn llm-dialog__btn--ghost llm-dialog__btn--fetch"
            type="button"
            :disabled="modelsLoading"
            :title="modelsLoading ? '拉取中…' : '从服务商拉取模型列表'"
            @click="onFetchModels"
          >{{ modelsLoading ? '拉取中…' : '拉取可用模型' }}</button>
          <!-- datalist 候选 -->
          <datalist :id="`llm-model-list-${draftProvider}`">
            <option v-for="m in currentModels" :key="m" :value="m" />
          </datalist>
        </div>
        <p v-if="modelsError" class="llm-dialog__error">{{ modelsError }}</p>
        <p v-else-if="currentModels.length > 0" class="llm-dialog__hint">
          已拉到 {{ currentModels.length }} 个可用模型，可从下拉候选中选，也可手动输入。
        </p>

        <p class="llm-dialog__hint">
          配置保存在浏览器 localStorage 中，清除浏览器数据会一并清除。
        </p>

        <div class="llm-dialog__actions">
          <button
            class="llm-dialog__btn llm-dialog__btn--ghost"
            type="button"
            @click="clearKey(draftProvider)"
          >清除 Key</button>
          <button class="llm-dialog__btn llm-dialog__btn--ghost" type="button"
            @click="closeSettings">取消</button>
          <button class="llm-dialog__btn llm-dialog__btn--primary" type="button"
            @click="saveSettings">保存</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="less">
.llm-dialog {
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

  // Model 输入 + 拉取按钮 同行
  &__model-row {
    display: flex;
    gap: 6px;
    align-items: stretch;
  }

  &__input--model {
    flex: 1;
  }

  &__hint {
    margin: 2px 0 0;
    font-size: 11px;
    color: #9ca3af;
  }

  &__error {
    margin: 2px 0 0;
    font-size: 11px;
    color: #dc2626;
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

    &--fetch {
      padding: 6px 10px;
      white-space: nowrap;
      font-family: inherit;
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
