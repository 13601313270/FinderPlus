import { reactive } from 'vue'
import type * as monaco from 'monaco-editor'

/**  Monaco 支持的语言 id（和 vite-plugin-monaco-editor 打包的 worker 子集对应） */
export type MonacoLanguage = 'json' | 'html' | 'css' | 'javascript' | 'typescript' | 'plaintext'

/** 打开编辑器的参数 */
export interface OpenMonacoOptions {
  /** 弹窗顶部标题栏显示的文字（如"编辑 config.json"） */
  title?: string
  /** 语言 id，默认 plaintext */
  language?: MonacoLanguage
  /** 初始内容 */
  content: string
  /** 只读模式：隐藏保存按钮，内容不可编辑。默认 false */
  readOnly?: boolean
  /** 编辑完成点击保存后的回调；只读模式不触发 */
  onSave?: (content: string) => void | Promise<void>
}

/** 内部响应式状态——MonacoHost watch 这个来驱动编辑器 */
interface MonacoState {
  visible: boolean
  title: string
  language: MonacoLanguage
  content: string
  readOnly: boolean
  onSave: ((content: string) => void | Promise<void>) | null
}

/** 全局唯一状态对象。reactive 让 Vue 组件能自动订阅变化 */
const state = reactive<MonacoState>({
  visible: false,
  title: '',
  language: 'plaintext',
  content: '',
  readOnly: false,
  onSave: null
})

/** MonacoHost 挂载后注入编辑器 model；Service 不直接 import monaco，避免循环依赖 */
let editorModelRef: monaco.editor.ITextModel | null = null
export function __setEditorModel(model: monaco.editor.ITextModel | null): void {
  editorModelRef = model
}

/**
 * 全局 Monaco 编辑器服务——画布内唯一实例，平时 hidden，需要时唤醒。
 *
 * 使用：
 * ```ts
 * import { globalMonaco } from '@renderer/services/globalMonaco'
 * globalMonaco.open({
 *   title: '编辑 config.json',
 *   language: 'json',
 *   content: node.content,
 *   onSave: (c) => node.applyContent(c)
 * })
 * ```
 */
export const globalMonaco = {
  /** 当前响应式状态（供 MonacoHost 和需要订阅的组件用） */
  state,

  /** 打开编辑器；同一个编辑器实例复用，内容/语言/只读模式都在这里切换 */
  open(opts: OpenMonacoOptions): void {
    state.title = opts.title ?? ''
    state.language = opts.language ?? 'plaintext'
    state.content = opts.content
    state.readOnly = !!opts.readOnly
    state.onSave = opts.onSave ?? null
    state.visible = true
  },

  /** 关闭编辑器；不销毁实例，下次 open 直接复用 */
  close(): void {
    state.visible = false
    state.onSave = null
  },

  /**
   * 保存当前内容——由 MonacoHost 的保存按钮触发。
   * 内部读取编辑器 model 的最新内容（用户可能改过但还没回写 state），
   * 然后调 onSave 回调。
   */
  save(): void {
    if (!editorModelRef || state.readOnly) return
    const text = editorModelRef.getValue()
    void Promise.resolve(state.onSave?.(text))
  },

  /**
   * 从文件扩展名推断 Monaco 语言 id。
   * 找不到匹配的返回 'plaintext'。
   */
  languageFromExtension(ext: string): MonacoLanguage {
    const lower = ext.toLowerCase().replace(/^\./, '')
    switch (lower) {
      case 'json': return 'json'
      case 'html':
      case 'htm':
      case 'xml': return 'html'
      case 'css':
      case 'scss':
      case 'less': return 'css'
      case 'js':
      case 'jsx':
      case 'mjs': return 'javascript'
      case 'ts':
      case 'tsx': return 'typescript'
      default: return 'plaintext'
    }
  }
}
