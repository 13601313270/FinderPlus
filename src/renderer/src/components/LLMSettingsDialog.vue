<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useLLMSettings } from '@renderer/composables/useLLMSettings'

/**
 * LLM 全局设置弹窗：
 * - Teleport 到 body，不受画布容器 overflow 限制
 * - 点击遮罩 / 按 Esc 关闭；点遮罩不保存、点保存按钮才写入 localStorage
 * - 所有 LLMNode 共享这份 Key
 */

const { visible, draftKey, closeSettings, saveApiKey, clearApiKey } = useLLMSettings()

function onMaskClick(): void {
  closeSettings()
}

function onDialogClick(e: MouseEvent): void {
  // 点弹窗内部不关闭
  e.stopPropagation()
}

function onKeyDown(e: KeyboardEvent): void {
  if (!visible.value) return
  if (e.key === 'Escape') {
    closeSettings()
  } else if (e.key === 'Enter' && e.metaKey) {
    saveApiKey()
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
        <h3 class="llm-dialog__title">LLM API Key</h3>
        <p class="llm-dialog__desc">
          所有 LLM 节点共享这一份 Key。Key 只存在你本机的应用存储空间，不会上传到任何服务器。
        </p>

        <label class="llm-dialog__label" for="llm-key-input">API Key</label>
        <input
          id="llm-key-input"
          v-model="draftKey"
          class="llm-dialog__input"
          type="password"
          placeholder="sk-..."
          autocomplete="off"
          spellcheck="false"
        />

        <p class="llm-dialog__hint">
          Key 保存在浏览器 localStorage 中，清除浏览器数据会一并清除。
        </p>

        <div class="llm-dialog__actions">
          <button class="llm-dialog__btn llm-dialog__btn--ghost" type="button"
            @click="clearApiKey">清除</button>
          <button class="llm-dialog__btn llm-dialog__btn--ghost" type="button"
            @click="closeSettings">取消</button>
          <button class="llm-dialog__btn llm-dialog__btn--primary" type="button"
            @click="saveApiKey">保存</button>
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
    width: 420px;
    padding: 20px 24px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    gap: 12px;
    animation: popIn 0.18s ease;
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #1a1a1a;
  }

  &__desc {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: #6b7280;
  }

  &__label {
    margin-top: 8px;
    font-size: 12px;
    font-weight: 500;
    color: #374151;
  }

  &__input {
    width: 100%;
    padding: 8px 10px;
    font-size: 13px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;

    &:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
    }
  }

  &__hint {
    margin: -2px 0 0;
    font-size: 11px;
    color: #9ca3af;
  }

  &__actions {
    margin-top: 16px;
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

    &--ghost {
      background: #fff;
      border-color: #d1d5db;
      color: #374151;

      &:hover {
        background: #f3f4f6;
      }
    }

    &--primary {
      background: #3b82f6;
      color: #fff;
      border-color: #3b82f6;

      &:hover {
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
