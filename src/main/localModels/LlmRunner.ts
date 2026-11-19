/**
 * 本地 LLM 推理引擎封装（node-llama-cpp）。
 *
 * 多模型并行：主进程可以同时加载多个 GGUF 模型，各自独立 context。
 * 每个 LLMNode 调用时必须指定 modelPath，引擎按路径路由到对应实例。
 *
 * 依赖：node-llama-cpp（原生 binding，需保留在 node_modules 原样不能被 bundle）
 * 打包配置：electron-builder.yml 的 asarUnpack + electron.vite.config.ts 的 external
 */

import { existsSync, readdirSync, statSync, rmSync } from 'node:fs'
import { join, basename } from 'node:path'
import { getLlmModelsDir } from './modelsDir'

// ESM 动态导入——node-llama-cpp 是纯 ESM 包，主进程代码（electron-vite 编译）里只能用动态 import
// @vite-ignore：阻止 vite/esbuild 尝试静态解析 node-llama-cpp 内部的平台子包
let getLlamaPromise: Promise<LlamaInstance> | null = null

async function getLlama(): Promise<LlamaInstance> {
  if (getLlamaPromise) return getLlamaPromise
  getLlamaPromise = (async () => {
    const mod = await import(/* @vite-ignore */ 'node-llama-cpp')
    const instance = await mod.getLlama()
    return instance as unknown as LlamaInstance
  })()
  return getLlamaPromise
}

/** node-llama-cpp 的实例类型（简化版，只用到我们需要的部分） */
interface LlamaInstance {
  loadModel: (opts: { modelPath: string; contextSize?: number; gpuLayers?: number }) => Promise<LlamaModel>
}

interface LlamaModel {
  createContext: (opts?: { contextSize?: number }) => Promise<LlamaContext>
}

interface LlamaContext {
  getSequence: () => LlamaContextSequence
}

interface LlamaContextSequence {
  dispose: () => void
}

// 用 any 绕过 LlamaChatSession 的类型检查——我们只关心它能 call 就行
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let LlamaChatSessionClass: any = null

async function getChatSessionClass(): Promise<any> {
  if (LlamaChatSessionClass) return LlamaChatSessionClass
  // @vite-ignore：阻止 vite/esbuild 尝试静态解析 node-llama-cpp 内部的平台子包
  const mod = await import(/* @vite-ignore */ 'node-llama-cpp')
  LlamaChatSessionClass = mod.LlamaChatSession
  return LlamaChatSessionClass
}

// —— 模型存储目录 ——

/** LLM 模型目录（委托给共享模块）。导出给 ModelDownloader 用 */
export function getModelsDir(): string {
  return getLlmModelsDir()
}

// —— 多模型实例管理 ——

/** 每个已加载模型的运行时状态 */
interface LoadedModel {
  model: LlamaModel
  context: LlamaContext
  /** 当前活跃的 chat session（每次 chat 会新建一个） */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentSession: any | null
  /** 是否正在推理（该模型实例内防并发） */
  busy: boolean
  /** 当前推理的 AbortController——让外部可以中途 abort session.prompt() */
  currentAbortController: AbortController | null
}

/** 所有已加载模型，key = 模型完整路径 */
const loadedModels = new Map<string, LoadedModel>()

// —— 公开 API ——

export interface LocalModelInfo {
  /** 模型文件名（含 .gguf） */
  name: string
  /** 完整磁盘路径 */
  path: string
  /** 文件大小（字节） */
  size: number
  /** 文件大小人类可读 */
  sizeHuman: string
}

/** 列出本地已下载的 GGUF 模型 */
export function listLocalModels(): LocalModelInfo[] {
  const dir = getModelsDir()
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter(f => f.endsWith('.gguf'))
    .map(name => {
      const path = join(dir, name)
      const size = statSync(path).size
      return {
        name,
        path,
        size,
        sizeHuman: formatBytes(size)
      }
    })
    .sort((a, b) => b.size - a.size) // 大的排前面
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/**
 * 加载一个 GGUF 模型到内存。
 * 同一个路径已在内存则跳过；不同路径则新增一个实例（不卸载其他模型）。
 */
export async function loadModel(modelPath: string): Promise<{ ok: true; modelName: string } | { ok: false; error: string }> {
  try {
    // 已加载则跳过
    if (loadedModels.has(modelPath)) {
      return { ok: true, modelName: basename(modelPath) }
    }

    const llama = await getLlama()
    const model = await llama.loadModel({ modelPath })
    const context = await model.createContext({ contextSize: 2048 })

    loadedModels.set(modelPath, {
      model,
      context,
      currentSession: null,
      busy: false,
      currentAbortController: null
    })

    return { ok: true, modelName: basename(modelPath) }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  }
}

/** 卸载指定模型（释放 GPU/内存）。不传 path 则卸载全部 */
export function unloadModel(modelPath?: string): void {
  if (modelPath) {
    disposeModelInstance(modelPath)
  } else {
    // 卸载全部
    for (const p of [...loadedModels.keys()]) {
      disposeModelInstance(p)
    }
  }
}

function disposeModelInstance(modelPath: string): void {
  const entry = loadedModels.get(modelPath)
  if (!entry) return
  try {
    if (entry.currentSession && typeof entry.currentSession.dispose === 'function') {
      entry.currentSession.dispose()
    }
  } catch { /* 忽略 */ }
  loadedModels.delete(modelPath)
}

/** 当前所有已加载模型的文件名列表 */
export function getLoadedModels(): string[] {
  return [...loadedModels.keys()].map(p => basename(p))
}

/** 指定模型是否已加载 */
export function isModelLoaded(modelPath: string): boolean {
  return loadedModels.has(modelPath)
}

/** 是否有任何模型在推理中（所有实例的 busy 合并） */
export function isAnyBusy(): boolean {
  for (const entry of loadedModels.values()) {
    if (entry.busy) return true
  }
  return false
}

export type ChatResult =
  | { ok: true; content: string }
  | { ok: false; error: string }

/**
 * 中止指定模型当前正在进行的推理。
 * 供 renderer 侧点击"停止"按钮时通过 IPC 调用。
 * 如果模型当前没在推理，此函数静默 no-op。
 */
export function abortChat(modelPath: string): void {
  const entry = loadedModels.get(modelPath)
  if (!entry || !entry.currentAbortController) return
  try {
    entry.currentAbortController.abort()
  } catch { /* 忽略 */ }
}

/**
 * 单轮对话：指定模型路径，system prompt + user prompt → assistant 回复。
 * 每次调用重新创建 session（简单模式，不保留连续对话历史）。
 *
 * 注意：LlamaChatSession.prompt() 直接返回 responseText 字符串（不是对象）。
 *
 * 中止机制：内部创建 AbortController，外部通过 abortChat(modelPath) 触发 abort，
 * session.prompt({ signal, stopOnAbortSignal: true }) 会提前退出并抛 AbortError。
 * AbortError 会被 rethrow（不包装成 { ok: false }），让 IPC invoke 正常 reject，
 * renderer 侧据此区分"用户主动取消"和"真正出错"两种情况。
 */
export async function chat(modelPath: string, system: string, prompt: string): Promise<ChatResult> {
  const entry = loadedModels.get(modelPath)
  if (!entry) {
    return { ok: false, error: `模型未加载：${basename(modelPath)}。请先在设置里加载该模型。` }
  }
  if (entry.busy) {
    return { ok: false, error: '模型正在忙，请稍后再试' }
  }

  entry.busy = true
  const abortController = new AbortController()
  entry.currentAbortController = abortController
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let session: any = null
  try {
    const SessionClass = await getChatSessionClass()
    session = new SessionClass({
      contextSequence: entry.context.getSequence(),
      systemPrompt: system || 'You are a helpful assistant.',
      autoDisposeSequence: true // 让 session.dispose() 时自动释放 contextSequence，归还到池子里
    })
    entry.currentSession = session

    // session.prompt() 直接返回 responseText 字符串（node-llama-cpp v3 API）
    // signal 让 abortController.abort() 能中途打断生成
    const responseText = await session.prompt(prompt, {
      signal: abortController.signal,
      stopOnAbortSignal: true
    }) as unknown as string

    return { ok: true, content: responseText ?? '' }
  } catch (err) {
    // AbortError 表示用户主动取消——rethrow 让 IPC invoke reject，由 renderer 侧静默处理
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err
    }
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  } finally {
    // 必须 dispose session，这样 autoDisposeSequence=true 才会触发 sequence.dispose()
    // 把 sequence 归还到 context 的池子里，否则下一次 getSequence() 会报 "No sequences left"
    if (session && typeof session.dispose === 'function') {
      try { session.dispose() } catch { /* 忽略 */ }
    }
    entry.currentSession = null
    entry.currentAbortController = null
    entry.busy = false
  }
}

/**
 * 删除本地模型文件。
 * 注意：如果该模型正在内存里，会先卸载再删除。
 */
export function deleteModel(modelName: string): { ok: true } | { ok: false; error: string } {
  const dir = getModelsDir()
  const targetPath = join(dir, modelName)
  if (!existsSync(targetPath)) {
    return { ok: false, error: `模型文件不存在：${modelName}` }
  }

  // 如果正在加载这个模型，先卸载
  if (loadedModels.has(targetPath)) {
    disposeModelInstance(targetPath)
  }

  try {
    rmSync(targetPath)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  }
}

/** 关闭引擎（应用退出时调用） */
export function dispose(): void {
  // 卸载全部
  for (const p of [...loadedModels.keys()]) {
    disposeModelInstance(p)
  }
}
