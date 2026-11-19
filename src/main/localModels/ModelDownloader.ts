/**
 * 通用模型下载器——LLM + 文生图共用。
 *
 * 底层用 node-llama-cpp 自带的 createModelDownloader（底层是 ipull）：
 *   - 4 连接并行下载
 *   - 自动 Range 续传
 *   - 自动重试 / 重定向
 *   - HF 镜像自动切换
 *
 * 为什么能给图片模型用？
 *   createModelDownloader 是个纯下载工具——只要给它 URL + 输出目录，
 *   它不关心下载的是 GGUF 大语言模型还是 GGUF 图片模型。
 */

import { getLlmModelsDir, getImageModelsDir } from './modelsDir'

// 缓存动态 import 的 node-llama-cpp 模块（它是纯 ESM，必须 await import()）
let _nodeLlamaCpp: typeof import('node-llama-cpp') | null = null
async function getNlc() {
  if (!_nodeLlamaCpp) _nodeLlamaCpp = await import(/* @vite-ignore */ 'node-llama-cpp')
  return _nodeLlamaCpp
}

export type DownloadSource = 'hf-mirror' | 'hf-official'

export const DOWNLOAD_SOURCE_OPTIONS: { value: DownloadSource; label: string; hint: string }[] = [
  {
    value: 'hf-mirror',
    label: '国内镜像（推荐）',
    hint: 'hf-mirror.com · 大陆直连最快'
  },
  {
    value: 'hf-official',
    label: 'HuggingFace 官方',
    hint: 'huggingface.co · 需科学上网'
  }
]

/** 构造 HF 直链 URL（huggingface.co / hf-mirror.com） */
function buildModelUri(source: DownloadSource, repo: string, file: string): string {
  const base = source === 'hf-official' ? 'https://huggingface.co' : 'https://hf-mirror.com'
  return `${base}/${repo}/resolve/main/${file}`
}

/** 模型类型——决定下载到哪个子目录、用哪个 Runner */
export type ModelType = 'llm' | 'image'

/** 模型目录解析器——根据 type 返回对应子目录 */
export function getModelDirByType(type: ModelType): string {
  return type === 'llm' ? getLlmModelsDir() : getImageModelsDir()
}

export interface ModelCatalogEntry {
  /** 模型类型——决定下载目录和运行引擎 */
  type: ModelType
  label: string
  id: string
  sizeGb: number
  ramGb: number
  /** 可选的描述文字（图片模型用来说明特点） */
  description?: string
  /** 最终落盘文件名 */
  fileName: string
  /** 构造完整 URL（根据源动态生成） */
  buildUri: (source: DownloadSource) => string
}

// ================ LLM 推荐模型 ================

export const RECOMMENDED_LLM_MODELS: readonly ModelCatalogEntry[] = [
  {
    type: 'llm',
    label: 'Qwen 2.5 1.5B Instruct (中文好)',
    id: 'qwen2.5-1.5b',
    sizeGb: 1.1,
    ramGb: 2,
    fileName: 'qwen2.5-1.5b-instruct.Q4_K_M.gguf',
    buildUri: (s) => buildModelUri(s, 'bartowski/Qwen2.5-1.5B-Instruct-GGUF', 'Qwen2.5-1.5B-Instruct-Q4_K_M.gguf')
  },
  {
    type: 'llm',
    label: 'Meta Llama 3.2 1B Instruct (英文好)',
    id: 'llama3.2-1b',
    sizeGb: 0.7,
    ramGb: 1.5,
    fileName: 'llama-3.2-1b-instruct.Q4_K_M.gguf',
    buildUri: (s) => buildModelUri(s, 'bartowski/Llama-3.2-1B-Instruct-GGUF', 'Llama-3.2-1B-Instruct-Q4_K_M.gguf')
  },
  {
    type: 'llm',
    label: 'Qwen 2.5 3B Instruct (效果更好)',
    id: 'qwen2.5-3b',
    sizeGb: 2.0,
    ramGb: 4,
    fileName: 'qwen2.5-3b-instruct.Q4_K_M.gguf',
    buildUri: (s) => buildModelUri(s, 'bartowski/Qwen2.5-3B-Instruct-GGUF', 'Qwen2.5-3B-Instruct-Q4_K_M.gguf')
  }
]

// ================ 图片推荐模型 ================
// 所有仓库/文件名都已在 huggingface.co 上验证存在
//
// 量化版本说明：
//   Q4_0      — 最小，速度最快，质量略降
//   Q4_K_S    — 小尺寸 K-quant，平衡性最好（推荐）
//   Q4_K_M    — 中尺寸 K-quant，质量更好
//   Q8_0      — 接近原始精度，但体积翻倍

export const RECOMMENDED_IMAGE_MODELS: readonly ModelCatalogEntry[] = [
  {
    type: 'image',
    label: 'Qwen-Image-2.1 Q4_0',
    id: 'qwen-image-2.1',
    sizeGb: 4.0,
    ramGb: 6,
    description: '阿里通义千问团队开源，7B 参数，原生支持中文 prompt 与图片文字渲染，当前中文友好度最佳',
    fileName: 'qwen_image_2.1-Q4_0.gguf',
    buildUri: (s) => buildModelUri(s, 'leejet/Qwen-Image-2.1-GGUF', 'qwen_image_2.1-Q4_0.gguf')
  },
  {
    type: 'image',
    label: 'FLUX.2-klein Q4_0',
    id: 'flux2-klein',
    sizeGb: 2.3,
    ramGb: 4,
    description: '当前最强开源文生图，4B 参数，推荐首选',
    fileName: 'flux-2-klein-4b-Q4_0.gguf',
    buildUri: (s) => buildModelUri(s, 'leejet/FLUX.2-klein-4B-GGUF', 'flux-2-klein-4b-Q4_0.gguf')
  },
  {
    type: 'image',
    label: 'FLUX.1-schnell Q4_K_M',
    id: 'flux1-schnell',
    sizeGb: 2.2,
    ramGb: 3.5,
    description: '4 步快速出图，质量很好，日常使用首选',
    fileName: 'flux1-schnell-Q4_K_M.gguf',
    buildUri: (s) => buildModelUri(s, 'unsloth/FLUX.1-schnell-GGUF', 'flux1-schnell-Q4_K_M.gguf')
  },
  {
    type: 'image',
    label: 'FLUX.1-dev Q4_K_S',
    id: 'flux1-dev',
    sizeGb: 3.0,
    ramGb: 4,
    description: 'Dev 版创意能力更强，适合精细控制（非商业许可）',
    fileName: 'flux1-dev-Q4_K_S.gguf',
    buildUri: (s) => buildModelUri(s, 'city96/FLUX.1-dev-gguf', 'flux1-dev-Q4_K_S.gguf')
  },
  {
    type: 'image',
    label: 'SD 1.5 Q4_0',
    id: 'sd-1.5',
    sizeGb: 1.48,
    ramGb: 3.5,
    description: '经典老牌，生态最全，LoRA/ControlNet 适配最多；对中文 prompt 理解较弱，建议配合 negativePrompt 使用',
    fileName: 'stable-diffusion-v1-5-pruned-emaonly-Q4_0.gguf',
    buildUri: (s) => buildModelUri(s, 'second-state/stable-diffusion-v1-5-GGUF', 'stable-diffusion-v1-5-pruned-emaonly-Q4_0.gguf')
  },
  {
    type: 'image',
    label: 'SDXL Turbo Q8_0',
    id: 'sdxl-turbo',
    sizeGb: 4.0,
    ramGb: 6,
    description: '1 步极速出图，风格化略弱；唯一的量化版本是 Q8_0（较大）',
    fileName: 'sd_xl_turbo_1.0.q8_0.gguf',
    buildUri: (s) => buildModelUri(s, 'OlegSkutte/sdxl-turbo-GGUF', 'sd_xl_turbo_1.0.q8_0.gguf')
  }
]

/** 向后兼容导出——原有 LLM 代码引用的是这个 */
export const RECOMMENDED_MODELS = RECOMMENDED_LLM_MODELS

/** 按 type 查 catalog */
export function getCatalogByType(type: ModelType): readonly ModelCatalogEntry[] {
  return type === 'llm' ? RECOMMENDED_LLM_MODELS : RECOMMENDED_IMAGE_MODELS
}

/** 按 id 查 catalog entry（跨两种类型） */
export function findCatalogEntry(id: string): ModelCatalogEntry | undefined {
  return [...RECOMMENDED_LLM_MODELS, ...RECOMMENDED_IMAGE_MODELS].find(m => m.id === id)
}

// ================ 下载引擎（LLM + Image 共用） ================

export interface DownloadProgress {
  received: number
  total: number | null
  percent: number
  speed: number
}

export type DownloadResult =
  | { ok: true; path: string; size: number; skipped?: boolean }
  | { ok: false; error: string }

export interface ActiveDownload {
  cancel: () => void
  progress: DownloadProgress
}

const activeDownloads = new Map<string, ActiveDownload>()

/**
 * 下载任意类型的模型（LLM / Image 共用同一套引擎）。
 *
 * @param catalogEntry  推荐目录条目（带 type 字段决定下载到哪个子目录）
 * @param source        'hf-mirror'（默认）或 'hf-official'
 * @param onProgress    进度回调（可选）
 */
export function downloadModel(
  catalogEntry: ModelCatalogEntry,
  source: DownloadSource,
  onProgress?: (p: DownloadProgress) => void
): Promise<DownloadResult> {
  return new Promise(async (resolve) => {
    if (activeDownloads.has(catalogEntry.id)) {
      resolve({ ok: false, error: '该模型正在下载中' })
      return
    }

    const modelsDir = getModelDirByType(catalogEntry.type)
    const hfEndpoint = source === 'hf-official' ? 'https://huggingface.co' : 'https://hf-mirror.com'

    const active: ActiveDownload = {
      cancel: () => { /* 下面赋值 */ },
      progress: { received: 0, total: null, percent: 0, speed: 0 }
    }
    activeDownloads.set(catalogEntry.id, active)

    let downloader: any = null
    const abortController = new AbortController()
    let cancelled = false

    active.cancel = () => {
      cancelled = true
      abortController.abort()
      downloader?.cancel({ deleteTempFile: false })
    }

    let lastProgress = { received: 0, time: Date.now() }

    try {
      console.log(`[本地模型(${catalogEntry.type})] 开始下载:`, catalogEntry.id, '源:', source)

      const nlc = await getNlc()
      downloader = await nlc.createModelDownloader({
        modelUri: catalogEntry.buildUri(source),
        dirPath: modelsDir,
        fileName: catalogEntry.fileName,
        skipExisting: true,
        parallelDownloads: 4,
        endpoints: { huggingFace: hfEndpoint },
        onProgress: ({ totalSize, downloadedSize }) => {
          const now = Date.now()
          const speed = totalSize > 0 && now - lastProgress.time >= 400
            ? ((downloadedSize - lastProgress.received) * 1000) / (now - lastProgress.time)
            : 0
          lastProgress = { received: downloadedSize, time: now }

          const percent = totalSize > 0 ? Math.round((downloadedSize / totalSize) * 100) : 0
          const p: DownloadProgress = {
            received: downloadedSize,
            total: totalSize || null,
            percent,
            speed
          }
          active.progress = p
          onProgress?.(p)
        }
      })

      // skipExisting 命中 → 直接返回
      if (downloader.totalSize > 0 && downloader.downloadedSize >= downloader.totalSize) {
        console.log(`[本地模型(${catalogEntry.type})] 已存在，跳过:`, catalogEntry.id)
        const path = `${modelsDir}/${catalogEntry.fileName}`
        activeDownloads.delete(catalogEntry.id)
        resolve({ ok: true, path, size: downloader.downloadedSize, skipped: true })
        return
      }

      const finalPath = await downloader.download({ signal: abortController.signal })

      if (cancelled) {
        activeDownloads.delete(catalogEntry.id)
        resolve({ ok: false, error: '下载已取消' })
        return
      }

      const total = downloader.downloadedSize || downloader.totalSize
      active.progress = {
        received: total,
        total: total || null,
        percent: 100,
        speed: 0
      }
      onProgress?.(active.progress)

      console.log(`[本地模型(${catalogEntry.type})] ✓ 完成:`, catalogEntry.id, finalPath, total, 'bytes')
      activeDownloads.delete(catalogEntry.id)
      resolve({ ok: true, path: finalPath, size: total })
    } catch (err) {
      console.error(`[本地模型(${catalogEntry.type})] ✗ 失败:`, catalogEntry.id, (err as Error).message)
      activeDownloads.delete(catalogEntry.id)
      if (cancelled) {
        resolve({ ok: false, error: '下载已取消' })
      } else {
        resolve({ ok: false, error: (err as Error).message })
      }
    }
  })
}

export function cancelDownload(id: string): boolean {
  const dl = activeDownloads.get(id)
  if (!dl) return false
  dl.cancel()
  activeDownloads.delete(id)
  return true
}

export function getActiveDownloads(): string[] {
  return [...activeDownloads.keys()]
}

/** 获取所有活跃下载及其当前进度（用于 renderer 重新挂载时恢复状态） */
export function getActiveDownloadsWithProgress(): Array<{ id: string; progress: DownloadProgress }> {
  return [...activeDownloads.entries()].map(([id, dl]) => ({ id, progress: { ...dl.progress } }))
}
