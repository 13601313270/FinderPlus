/**
 * 本地文生图推理引擎封装（stable-diffusion-cpp-node-api）。
 *
 * 多模型并行：主进程可以同时加载多个 GGUF 图片模型，各自独立 context。
 * 每个 ImageGenNode 调用时指定 modelPath，引擎按路径路由到对应实例。
 *
 * 依赖：stable-diffusion-cpp-node-api（原生 binding，有 darwin-arm64 预编译）
 * 打包配置：electron-builder.yml 的 asarUnpack + electron.vite.config.ts 的 external
 */

import { existsSync, readdirSync, statSync, rmSync } from 'node:fs'
import { join, basename } from 'node:path'
import { getImageModelsDir } from './modelsDir'

// —— 动态导入稳定扩散引擎 ——
// 必须 await import() 避免 vite 静态解析原生 binding
//
// ⚠️ 关键坑：底层包是 CJS module.exports = {...}
// Node ESM import() 会把它提升为两层：
//   顶层：StableDiffusionContext / UpscalerContext / AdetailerContext / convert
//   .default：setLogCallback / setProgressCallback / version / getSystemInfo / extractMetaData
// 所以我们统一用 .default 拿完整对象
type SdModule = {
  StableDiffusionContext: any
  UpscalerContext: any
  AdetailerContext: any
  convert: (opts: any) => Promise<any>
  setLogCallback: (cb: ((data: any) => void) | null) => void
  setProgressCallback: (cb: ((data: any) => void) | null, opts?: any) => void
  extractMetaData: (path: string) => Promise<any>
  version: () => string
  getSystemInfo: () => string
}
let getSdPromise: Promise<SdModule> | null = null
async function getSd(): Promise<SdModule> {
  if (getSdPromise) return getSdPromise
  getSdPromise = (async () => {
    // 动态 import —— ESM 层包装 CJS
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import(/* @vite-ignore */ 'stable-diffusion-cpp-node-api')
    // .default 里有完整的 CJS module.exports
    // 顶层提升的只有类 + convert；free functions 全在 .default 下
    return (mod.default ?? mod) as SdModule
  })()
  return getSdPromise
}

/** 每个已加载图片模型的运行时状态 */
interface LoadedImageModel {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any // StableDiffusionContext
  /** 是否正在推理（该模型实例内防并发） */
  busy: boolean
  /** 当前推理的 AbortController——让外部可以中途 abort */
  currentAbortController: AbortController | null
  /** 模型的版本名（e.g. "SDXL", "Flux"），加载后填入 */
  versionName: string
}

/** 所有已加载图片模型，key = 模型完整路径 */
const loadedImageModels = new Map<string, LoadedImageModel>()

// —— 公开 API ——

export interface LocalImageModelInfo {
  /** 模型文件名（含 .gguf / .safetensors） */
  name: string
  /** 完整磁盘路径 */
  path: string
  /** 文件大小（字节） */
  size: number
  /** 文件大小人类可读 */
  sizeHuman: string
}

/** 列出本地 image/ 目录下的图片模型文件（gguf / safetensors） */
export function listLocalImageModels(): LocalImageModelInfo[] {
  const dir = getImageModelsDir()
  if (!existsSync(dir)) return []
  const exts = ['.gguf', '.safetensors', '.ckpt']
  return readdirSync(dir)
    .filter(f => exts.some(ext => f.toLowerCase().endsWith(ext)))
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
    .sort((a, b) => b.size - a.size)
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export type LoadImageModelResult =
  | { ok: true; modelName: string; versionName: string }
  | { ok: false; error: string }

/**
 * 加载一个图片模型到内存。
 * GGUF 单文件模型直接 modelPath 即可；
 * FLUX 等多组件模型需要额外指定 t5xxlPath / vaePath 等（暂不在此处理）。
 */
export async function loadImageModel(
  modelPath: string,
  opts?: { nThreads?: number; wtype?: string }
): Promise<LoadImageModelResult> {
  try {
    if (loadedImageModels.has(modelPath)) {
      const entry = loadedImageModels.get(modelPath)!
      return { ok: true, modelName: basename(modelPath), versionName: entry.versionName }
    }

    const sd = await getSd()

    // 设置日志回调——让主进程知道引擎在做什么
    sd.setLogCallback(({ level, text }) => {
      if (level >= 2) console.warn(`[ImageRunner] ${text}`)
    })

    const ctx = await sd.StableDiffusionContext.create({
      modelPath,
      nThreads: opts?.nThreads,
      wtype: opts?.wtype as any,
      // 自动检测 GPU backend（macOS 下 Metal 会被自动启用）
      autoFit: true
    })

    const versionName = ctx.getModelVersionName?.() ?? 'Unknown'

    loadedImageModels.set(modelPath, {
      ctx,
      busy: false,
      currentAbortController: null,
      versionName
    })

    console.log(`[ImageRunner] ✓ 加载成功: ${basename(modelPath)} (${versionName})`)
    return { ok: true, modelName: basename(modelPath), versionName }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[ImageRunner] ✗ 加载失败: ${msg}`)
    return { ok: false, error: msg }
  }
}

/** 卸载指定图片模型（不传 path 则卸载全部） */
export function unloadImageModel(modelPath?: string): void {
  if (modelPath) {
    disposeImageModelInstance(modelPath)
  } else {
    for (const p of [...loadedImageModels.keys()]) {
      disposeImageModelInstance(p)
    }
  }
}

function disposeImageModelInstance(modelPath: string): void {
  const entry = loadedImageModels.get(modelPath)
  if (!entry) return
  try {
    if (entry.currentAbortController && !entry.currentAbortController.signal.aborted) {
      entry.currentAbortController.abort()
    }
    if (entry.ctx && typeof entry.ctx.close === 'function') {
      entry.ctx.close()
    }
  } catch { /* 忽略 */ }
  loadedImageModels.delete(modelPath)
}

/** 当前所有已加载图片模型的文件名列表 */
export function getLoadedImageModels(): string[] {
  return [...loadedImageModels.keys()].map(p => basename(p))
}

/** 指定模型是否已加载 */
export function isImageModelLoaded(modelPath: string): boolean {
  return loadedImageModels.has(modelPath)
}

/** 是否有任何图片模型在推理中 */
export function isAnyImageBusy(): boolean {
  for (const entry of loadedImageModels.values()) {
    if (entry.busy) return true
  }
  return false
}

export interface GenerateImageOptions {
  prompt: string
  width?: number
  height?: number
  /** 采样步数，默认 20（Turbo 模型用 1~4 步） */
  steps?: number
  /** CFG scale，默认 7.0 */
  cfg?: number
  /** 负向提示词 */
  negativePrompt?: string
  /** 随机种子，不传则用当前时间 */
  seed?: number
  /** 进度回调——每 step 触发一次 */
  onProgress?: (step: number, steps: number) => void
}

export type GenerateImageResult =
  | { ok: true; width: number; height: number; data: Buffer }
  | { ok: false; error: string }

/**
 * 文生图：指定模型路径 + 提示词 → PNG Buffer。
 *
 * 中止机制：内部创建 AbortController，外部通过 abortImage(modelPath) 触发 abort，
 * ctx.generateImage({ signal }) 会提前退出并抛 AbortError。
 */
export async function generateImage(
  modelPath: string,
  options: GenerateImageOptions
): Promise<GenerateImageResult> {
  const entry = loadedImageModels.get(modelPath)
  if (!entry) {
    return { ok: false, error: `图片模型未加载：${basename(modelPath)}。请先在设置里加载。` }
  }
  if (entry.busy) {
    return { ok: false, error: '图片模型正在忙，请稍后再试' }
  }

  const sd = await getSd()
  entry.busy = true

  const abortController = new AbortController()
  entry.currentAbortController = abortController

  console.log(`[ImageRunner] 🎨 generateImage: model=${basename(modelPath)} prompt="${options.prompt}" width=${options.width} height=${options.height} steps=${options.steps ?? 20} cfg=${options.cfg ?? 7.0}`)

  // 设置进度回调——stable-diffusion.cpp 在多个内部阶段都会触发：
  //   clip encoding (step 0/196)、graph build (step 0/686)、tensor load、
  //   UNet sampling (step 0/20)、VAE decode ...
  // 我们只关心 UNet sampling——它的特征是 steps 接近用户请求的 sampleSteps (±2)
  // 过滤掉其他阶段的"噪声"进度，避免 UI 显示混乱的 0/196 这种 step
  const expectedSteps = options.steps ?? 20
  let lastProgressReported = -1
  sd.setProgressCallback(({ step, steps }) => {
    // 只关心 UNet sampling：steps 接近 expectedSteps 且 step 递增
    if (steps >= expectedSteps - 2 && steps <= expectedSteps + 2 && step > lastProgressReported) {
      lastProgressReported = step
      console.log(`[ImageRunner] 🔄 step ${step}/${steps}`)
      options.onProgress?.(step, steps)
    }
  })

  try {
    const images = await entry.ctx.generateImage({
      prompt: options.prompt,
      width: options.width ?? 512,
      height: options.height ?? 512,
      negativePrompt: options.negativePrompt,
      seed: options.seed ?? Math.floor(Math.random() * 2147483647),
      sampleParams: {
        sampleSteps: options.steps ?? 20,
        guidance: { txtCfg: options.cfg ?? 7.0 }
      },
      signal: abortController.signal
    })

    if (!images || images.length === 0) {
      return { ok: false, error: '引擎返回空结果' }
    }

    const img = images[0]
    console.log(`[ImageRunner] ✓ 生成完成: ${img.width}x${img.height}`)
    return { ok: true, width: img.width, height: img.height, data: img.data }
  } catch (err) {
    // AbortError 表示用户主动取消——rethrow 让 IPC invoke reject，由 renderer 侧静默处理
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err
    }
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  } finally {
    sd.setProgressCallback(null)
    entry.currentAbortController = null
    entry.busy = false
  }
}

/** 中止指定模型当前正在进行的推理。给 renderer 侧点击"停止"按钮用 */
export function abortImage(modelPath: string): void {
  const entry = loadedImageModels.get(modelPath)
  if (!entry) return
  try {
    if (entry.ctx && typeof entry.ctx.abort === 'function') {
      entry.ctx.abort()
    }
    if (entry.currentAbortController && !entry.currentAbortController.signal.aborted) {
      entry.currentAbortController.abort()
    }
  } catch { /* 忽略 */ }
}

/** 删除本地图片模型文件 */
export function deleteImageModel(modelName: string): { ok: true } | { ok: false; error: string } {
  const dir = getImageModelsDir()
  const targetPath = join(dir, modelName)
  if (!existsSync(targetPath)) {
    return { ok: false, error: `模型文件不存在：${modelName}` }
  }

  // 如果正在加载这个模型，先卸载
  if (loadedImageModels.has(targetPath)) {
    disposeImageModelInstance(targetPath)
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
export function disposeImage(): void {
  for (const p of [...loadedImageModels.keys()]) {
    disposeImageModelInstance(p)
  }
}
