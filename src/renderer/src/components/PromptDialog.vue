<script setup lang="ts">
/**
 * 全局替代 window.prompt / window.confirm / window.alert 的自定义组件。
 *
 * 用法（ imperative，无需 import 或 inject）：
 *   const value = await window.showPrompt('输入名字', '默认值')
 *   const ok     = await window.showConfirm('确定删除？', '删除后不可恢复')
 *   await window.showAlert('保存成功')
 *
 * 组件只需要在 App.vue 根层挂一次，mount 时 hook 原生 API。
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

type DialogMode = 'prompt' | 'confirm' | 'alert'

interface DialogState {
  visible: boolean
  mode: DialogMode
  title: string
  body?: string
  defaultValue?: string
  placeholder?: string
  confirmText: string
  cancelText: string
  resolve: ((value: unknown) => void) | null
}

const state = ref<DialogState>({
  visible: false,
  mode: 'alert',
  title: '',
  body: undefined,
  defaultValue: '',
  placeholder: '',
  confirmText: '确定',
  cancelText: '取消',
  resolve: null,
})

const inputRef = ref<HTMLInputElement | null>(null)
let restorePrompt: (() => void) | null = null
let restoreConfirm: (() => void) | null = null
let restoreAlert: (() => void) | null = null

function show(
  mode: DialogMode,
  title: string,
  body?: string,
  opts?: { defaultValue?: string; placeholder?: string; confirmText?: string; cancelText?: string }
): Promise<unknown> {
  return new Promise((resolve) => {
    state.value = {
      visible: true,
      mode,
      title,
      body,
      defaultValue: opts?.defaultValue ?? '',
      placeholder: opts?.placeholder ?? '',
      confirmText: opts?.confirmText ?? '确定',
      cancelText: opts?.cancelText ?? '取消',
      resolve,
    }
  })
}

function handleConfirm(): void {
  const s = state.value
  const result = s.mode === 'prompt' ? s.defaultValue : true
  close(result)
}

function handleCancel(): void {
  close(state.value.mode === 'prompt' ? null : false)
}

function close(value: unknown): void {
  const resolve = state.value.resolve
  state.value.visible = false
  state.value.resolve = null
  // 延迟 resolve 等过渡动画播完
  queueMicrotask(() => resolve?.(value))
}

// ESC 关闭 / Enter 确认 —— 全局监听
function onGlobalKeydown(e: KeyboardEvent): void {
  if (!state.value.visible) return
  if (e.key === 'Escape') { e.preventDefault(); handleCancel() }
  else if (e.key === 'Enter' && state.value.mode !== 'alert' && !(e.target instanceof HTMLInputElement && e.shiftKey)) {
    // 注意：prompt 的 input 自己监听了 Enter，这里跳过避免双触发
    if (e.target instanceof HTMLInputElement) return
    e.preventDefault(); handleConfirm()
  }
}

// prompt 时自动聚焦输入框
watch(
  () => state.value.visible && state.value.mode === 'prompt',
  (needFocus) => {
    if (needFocus) {
      setTimeout(() => inputRef.value?.focus(), 50)
    }
  }
)

// 注册全局键盘
onMounted(() => window.addEventListener('keydown', onGlobalKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKeydown))

// —— 挂 imperative API 到 window（不 hook 原生 API，因为原生 prompt/confirm/alert 是同步阻塞的，
// 无法优雅地替换为 Promise 异步版本。所有调用方必须显式使用 await window.showPrompt(...)）——

window.showPrompt = (
  title: string,
  defaultValue = '',
  opts?: { placeholder?: string; body?: string; confirmText?: string; cancelText?: string }
): Promise<string | null> =>
  show('prompt', title, opts?.body, {
    defaultValue,
    placeholder: opts?.placeholder,
    confirmText: opts?.confirmText,
    cancelText: opts?.cancelText,
  }) as Promise<string | null>

window.showConfirm = (
  title: string,
  body?: string,
  opts?: { confirmText?: string; cancelText?: string }
): Promise<boolean> =>
  show('confirm', title, body, { confirmText: opts?.confirmText, cancelText: opts?.cancelText }) as Promise<boolean>

window.showAlert = (title: string, body?: string, opts?: { confirmText?: string }): Promise<void> =>
  show('alert', title, body, { confirmText: opts?.confirmText }) as Promise<void>

// 暴露给模板
const isPrompt = () => state.value.mode === 'prompt'
const isConfirm = () => state.value.mode === 'confirm'
const isAlert = () => state.value.mode === 'alert'
</script>

<template>
  <Teleport to="body">
    <Transition name="pd-fade">
      <div v-if="state.visible" class="pd-mask" @click="state.mode !== 'alert' && handleCancel()">
        <div class="pd-dialog" role="dialog" aria-modal="true" @click.stop>
          <h3 class="pd-title">{{ state.title }}</h3>
          <p v-if="state.body" class="pd-body">{{ state.body }}</p>

          <!-- prompt 输入框 -->
          <div v-if="isPrompt()" class="pd-input-wrap">
            <input
              ref="inputRef"
              v-model="state.defaultValue"
              type="text"
              class="pd-input"
              :placeholder="state.placeholder"
              @keydown.enter.prevent="handleConfirm"
              @keydown.esc.prevent="handleCancel"
            />
          </div>

          <!-- 按钮区 -->
          <div class="pd-actions">
            <button
              v-if="!isAlert()"
              class="pd-btn pd-btn--ghost"
              type="button"
              @click="handleCancel"
            >{{ state.cancelText }}</button>
            <button
              class="pd-btn pd-btn--primary"
              type="button"
              @click="handleConfirm"
            >{{ state.confirmText }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pd-mask {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(17, 24, 39, 0.55);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pdMaskIn 0.15s ease;
}

.pd-dialog {
  min-width: 360px;
  max-width: 480px;
  padding: 22px 24px 18px;
  background: #ffffff;
  border-radius: 14px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.08);
  animation: pdPopIn 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.pd-title {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  line-height: 1.4;
}

.pd-body {
  margin: 0 0 14px;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.55;
  white-space: pre-wrap;
}

.pd-input-wrap {
  margin: 12px 0 4px;
}

.pd-input {
  width: 100%;
  box-sizing: border-box;
  padding: 9px 12px;
  font-size: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.pd-input:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
}

.pd-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.pd-btn {
  all: unset;
  cursor: pointer;
  padding: 7px 16px;
  font-size: 13px;
  border-radius: 7px;
  transition: background 0.12s ease, color 0.12s ease;
}
.pd-btn--ghost {
  color: #6b7280;
}
.pd-btn--ghost:hover {
  background: #f3f4f6;
  color: #374151;
}
.pd-btn--primary {
  background: #4f46e5;
  color: #fff;
  font-weight: 500;
}
.pd-btn--primary:hover {
  background: #4338ca;
}

.pd-fade-enter-active,
.pd-fade-leave-active { transition: opacity 0.15s ease; }
.pd-fade-enter-from,
.pd-fade-leave-to { opacity: 0; }

@keyframes pdMaskIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes pdPopIn {
  from { opacity: 0; transform: scale(0.94) translateY(-4px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
</style>
