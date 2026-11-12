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

  // —— 全局命令行弹窗工具 ——

  /** 打开命令执行弹窗（纯展示模式，必须传入命令），fire-and-forget */
  openCommandDialog: (command: string, opts?: { title?: string }) => void

  /** 执行命令并等待完成，返回 stdout / stderr / code。内部会自动打开弹窗展示实时输出 */
  runCommand: (command: string, opts?: { title?: string }) => Promise<{ stdout: string; stderr: string; code: number }>
}
