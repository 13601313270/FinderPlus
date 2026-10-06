/// <reference types="vite/client" />

// —— 全局 PromptDialog 组件挂到 window 上的 imperative API ——
interface Window {
  showPrompt: (
    title: string,
    defaultValue?: string,
    opts?: { placeholder?: string; body?: string; confirmText?: string; cancelText?: string }
  ) => Promise<string | null>

  showConfirm: (
    title: string,
    body?: string,
    opts?: { confirmText?: string; cancelText?: string }
  ) => Promise<boolean>

  showAlert: (
    title: string,
    body?: string,
    opts?: { confirmText?: string }
  ) => Promise<void>
}
