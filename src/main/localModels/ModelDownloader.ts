/**
 * 模型下载——直接用 node-llama-cpp 自带的 createModelDownloader（底层是 ipull，成熟的多连接下载器）。
 *
 * 比自己写 http 下载靠谱得多：自动 Range 续传、自动重试、4 连接并行、HF 镜像配置。
 */

import { getModelsDir } from './LlmRunner'

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

/**
 * 构造 modelUri —— 优先用 https:// 直链 URL，避开 hf: scheme 的 API manifest 探测。
 * hf-mirror.com 对 HF /api/models 返回 503，所以直接指文件最稳。
 */
function buildModelUri(source: DownloadSource, repo: string, file: string): string {
  const base = source === 'hf-official' ? 'https://huggingface.co' : 'https://hf-mirror.com'
  return `${base}/${repo}/resolve/main/${file}`
}

export interface ModelCatalogEntry {
  label: string
  id: string
  sizeGb: number
  ramGb: number
  /** 最终落盘文件名 */
  fileName: string
  /** 构造完整 URL modelUri（根据源动态生成） */
  buildUri: (source: DownloadSource) => string
}

export const RECOMMENDED_MODELS: readonly ModelCatalogEntry[] = [
  {
    label: 'Qwen 2.5 1.5B Instruct (中文好)',
    id: 'qwen2.5-1.5b',
    sizeGb: 1.1,
    ramGb: 2,
    fileName: 'qwen2.5-1.5b-instruct.Q4_K_M.gguf',
    buildUri: (s) => buildModelUri(s, 'bartowski/Qwen2.5-1.5B-Instruct-GGUF', 'Qwen2.5-1.5B-Instruct-Q4_K_M.gguf')
  },
  {
    label: 'Meta Llama 3.2 1B Instruct (英文好)',
    id: 'llama3.2-1b',
    sizeGb: 0.7,
    ramGb: 1.5,
    fileName: 'llama-3.2-1b-instruct.Q4_K_M.gguf',
    buildUri: (s) => buildModelUri(s, 'bartowski/Llama-3.2-1B-Instruct-GGUF', 'Llama-3.2-1B-Instruct-Q4_K_M.gguf')
  },
  {
    label: 'Qwen 2.5 3B Instruct (效果更好)',
    id: 'qwen2.5-3b',
    sizeGb: 2.0,
    ramGb: 4,
    fileName: 'qwen2.5-3b-instruct.Q4_K_M.gguf',
    buildUri: (s) => buildModelUri(s, 'bartowski/Qwen2.5-3B-Instruct-GGUF', 'Qwen2.5-3B-Instruct-Q4_K_M.gguf')
  }
]

export interface DownloadProgress {
  received: number
  total: number | null
  percent: number
  speed: number
}

export type DownloadResult =
  | { ok: true; path: string; size: number }
  | { ok: false; error: string }

export interface ActiveDownload {
  cancel: () => void
  progress: DownloadProgress
}

const activeDownloads = new Map<string, ActiveDownload>()

/**
 * 下载一个模型（用 node-llama-cpp 自带的 ipull 下载器）。
 *
 * 自动处理：4 连接并行、Range 续传、重试、重定向、已存在跳过。
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

    const modelsDir = getModelsDir()
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
      console.log('[本地模型] 开始下载:', catalogEntry.id, '源:', source, 'endpoint:', hfEndpoint)

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

      // 如果 skipExisting 命中了 → 直接返回
      if (downloader.totalSize > 0 && downloader.downloadedSize >= downloader.totalSize) {
        console.log('[本地模型] 已存在，跳过下载:', catalogEntry.id)
        const path = `${modelsDir}/${catalogEntry.fileName}`
        activeDownloads.delete(catalogEntry.id)
        resolve({ ok: true, path, size: downloader.downloadedSize })
        return
      }

      const finalPath = await downloader.download({ signal: abortController.signal })

      if (cancelled) {
        activeDownloads.delete(catalogEntry.id)
        resolve({ ok: false, error: '下载已取消' })
        return
      }

      // 100% 最终进度
      const total = downloader.downloadedSize || downloader.totalSize
      active.progress = {
        received: total,
        total: total || null,
        percent: 100,
        speed: 0
      }
      onProgress?.(active.progress)

      console.log('[本地模型] ✓ 完成:', catalogEntry.id, finalPath, total, 'bytes')
      activeDownloads.delete(catalogEntry.id)
      resolve({ ok: true, path: finalPath, size: total })
    } catch (err) {
      console.error('[本地模型] ✗ 失败:', catalogEntry.id, (err as Error).message)
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
