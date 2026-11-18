/**
 * 本地 LLM 推理引擎封装（node-llama-cpp）。
 *
 * 单例模式：整个主进程只初始化一次 llama 引擎，模型按需 load / unload。
 *
 * 依赖：node-llama-cpp（原生 binding，需保留在 node_modules 原样不能被 bundle）
 * 打包配置：electron-builder.yml 的 asarUnpack + electron.vite.config.ts 的 external
 */

import { existsSync, mkdirSync, readdirSync, statSync, rmSync } from 'node:fs'
import { join, basename } from 'node:path'
import { app } from 'electron'

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

/** LlamaChatSession 的 prompt 返回结构 */
interface LlamaChatResponse {
  response: string
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

/** 模型存储目录：~/Library/Application Support/Finder+/models（Mac） */
let modelsDir: string | null = null

/** 获取模型目录（首次调用时创建）。导出给 ModelDownloader 用 */
export function getModelsDir(): string {
  if (modelsDir) return modelsDir
  modelsDir = join(app.getPath('userData'), 'models')
  if (!existsSync(modelsDir)) {
    mkdirSync(modelsDir, { recursive: true })
  }
  return modelsDir
}

// —— 引擎状态 ——

/** 当前已加载的模型实例（null = 未加载） */
let currentModel: LlamaModel | null = null
/** 当前模型文件路径 */
let currentModelPath: string | null = null
/** 当前 context + session */
let currentContext: LlamaContext | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let currentSession: any = null

/** 是否正在推理（用于防止并发请求） */
let busy = false

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
 * 同一个路径则跳过重复加载（已在内存里）。
 * 不同路径则先 unload 旧的再 load 新的。
 */
export async function loadModel(modelPath: string): Promise<{ ok: true; modelName: string } | { ok: false; error: string }> {
  try {
    if (currentModelPath === modelPath && currentModel) {
      return { ok: true, modelName: basename(modelPath) }
    }

    // 先卸载旧的
    unloadModelInternal()

    const llama = await getLlama()
    currentModel = await llama.loadModel({ modelPath })
    currentModelPath = modelPath

    // 创建 context（默认 2048 token 上下文）
    currentContext = await currentModel.createContext({ contextSize: 2048 })

    return { ok: true, modelName: basename(modelPath) }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  }
}

/** 卸载当前模型（释放 GPU/内存） */
export function unloadModel(): void {
  unloadModelInternal()
}

function unloadModelInternal(): void {
  try {
    // 先 dispose session（如果有）
    if (currentSession && typeof currentSession.dispose === 'function') {
      currentSession.dispose()
    }
    currentSession = null

    // dispose context sequence
    if (currentContext) {
      try {
        // LlamaContext 没有直接 dispose，sequence 才有
      } catch { /* 忽略 */ }
    }

    currentModel = null
    currentModelPath = null
    currentContext = null
  } catch { /* 清理失败静默忽略 */ }
}

/** 当前加载的模型文件名 */
export function getLoadedModel(): string | null {
  return currentModelPath ? basename(currentModelPath) : null
}

/** 是否有模型在内存里 */
export function isModelLoaded(): boolean {
  return currentModel !== null
}

/** 是否正在推理 */
export function isBusy(): boolean {
  return busy
}

export type ChatResult =
  | { ok: true; content: string }
  | { ok: false; error: string }

/**
 * 单轮对话：system prompt + user prompt → assistant 回复。
 * 每次调用重新创建 session（简单模式，不保留连续对话历史）。
 */
export async function chat(system: string, prompt: string): Promise<ChatResult> {
  if (!currentModel || !currentContext) {
    return { ok: false, error: '本地模型未加载，请先在设置里选择并加载一个模型' }
  }
  if (busy) {
    return { ok: false, error: '模型正在忙，请稍后再试' }
  }

  busy = true
  try {
    const SessionClass = await getChatSessionClass()
    const session = new SessionClass({
      contextSequence: currentContext.getSequence(),
      systemPrompt: system || 'You are a helpful assistant.'
    })
    currentSession = session

    const result = await session.prompt(prompt) as LlamaChatResponse
    const content = result?.response ?? ''

    return { ok: true, content }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  } finally {
    busy = false
    currentSession = null
  }
}

/**
 * 流式对话：逐 token 回调。
 * 暂不实现，需要时再加。
 */
// export async function chatStream(...) { ... }

/**
 * 删除本地模型文件。
 * 注意：如果该模型正在使用中，会先卸载再删除。
 */
export function deleteModel(modelName: string): { ok: true } | { ok: false; error: string } {
  const dir = getModelsDir()
  const targetPath = join(dir, modelName)
  if (!existsSync(targetPath)) {
    return { ok: false, error: `模型文件不存在：${modelName}` }
  }

  // 如果正在加载这个模型，先卸载
  if (currentModelPath === targetPath) {
    unloadModelInternal()
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
  unloadModelInternal()
}
