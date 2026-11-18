/**
 * 模型下载：从 HuggingFace（或国内镜像）拉取 GGUF 文件到本地 models 目录。
 *
 * 支持跨平台 http(s) 下载 + 进度回调。
 * 失败时部分文件会留在磁盘（.part 后缀），下次下载会自动重试。
 */

import { createWriteStream, existsSync } from 'node:fs'
import { join } from 'node:path'
import https from 'node:https'
import http from 'node:http'
import { getModelsDir } from './LlmRunner'

/** HuggingFace 官方域名（给科学上网/海外用户） */
const HF_OFFICIAL = 'https://huggingface.co'
/** HuggingFace 国内镜像（大陆默认选这个） */
const HF_MIRROR = 'https://hf-mirror.com'

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

export interface ModelCatalogEntry {
  /** 展示名 */
  label: string
  /** 内部 ID（比如 qwen2.5:1.5b） */
  id: string
  /** GGUF 大小（GB，展示用） */
  sizeGb: number
  /** 推荐内存（GB，展示用） */
  ramGb: number
  /** HuggingFace repo 路径 */
  hfRepo: string
  /** GGUF 文件名（repo 里的那个） */
  hfFileName: string
  /** 最终落盘文件名 */
  fileName: string
}

/** 构造不同源的下载 URL */
function buildDownloadUrl(entry: ModelCatalogEntry, source: DownloadSource): string {
  const base = source === 'hf-official' ? HF_OFFICIAL : HF_MIRROR
  return `${base}/${entry.hfRepo}/resolve/main/${entry.hfFileName}`
}

/** 内置推荐模型目录——M 系列 Mac 能流畅跑的小模型 */
export const RECOMMENDED_MODELS: readonly ModelCatalogEntry[] = [
  {
    label: 'Qwen 2.5 1.5B Instruct (中文好)',
    id: 'qwen2.5-1.5b',
    sizeGb: 1.1,
    ramGb: 2,
    hfRepo: 'bartowski/Qwen2.5-1.5B-Instruct-GGUF',
    hfFileName: 'Qwen2.5-1.5B-Instruct-Q4_K_M.gguf',
    fileName: 'qwen2.5-1.5b-instruct.Q4_K_M.gguf'
  },
  {
    label: 'Meta Llama 3.2 1B Instruct (英文好)',
    id: 'llama3.2-1b',
    sizeGb: 0.7,
    ramGb: 1.5,
    hfRepo: 'bartowski/Llama-3.2-1B-Instruct-GGUF',
    hfFileName: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    fileName: 'llama-3.2-1b-instruct.Q4_K_M.gguf'
  },
  {
    label: 'Gemma 3 1B Instruct (Google 出品)',
    id: 'gemma3-1b',
    sizeGb: 0.7,
    ramGb: 1.5,
    hfRepo: 'bartowski/gemma-3-1b-it-GGUF',
    hfFileName: 'gemma-3-1b-it-Q4_K_M.gguf',
    fileName: 'gemma-3-1b-it.Q4_K_M.gguf'
  },
  {
    label: 'Qwen 2.5 3B Instruct (效果更好)',
    id: 'qwen2.5-3b',
    sizeGb: 2.0,
    ramGb: 4,
    hfRepo: 'bartowski/Qwen2.5-3B-Instruct-GGUF',
    hfFileName: 'Qwen2.5-3B-Instruct-Q4_K_M.gguf',
    fileName: 'qwen2.5-3b-instruct.Q4_K_M.gguf'
  }
]

/** 下载进度回调 */
export interface DownloadProgress {
  /** 已下载字节数 */
  received: number
  /** 总字节数（不知道时为 null） */
  total: number | null
  /** 0-100 百分比 */
  percent: number
  /** 当前速度（bytes/s，近 2 秒平均） */
  speed: number
}

export type DownloadResult =
  | { ok: true; path: string; size: number }
  | { ok: false; error: string }

/** 进行中的下载（支持取消） */
export interface ActiveDownload {
  /** 取消函数 */
  cancel: () => void
  /** 当前进度 */
  progress: DownloadProgress
}

// 正在进行的下载表
const activeDownloads = new Map<string, ActiveDownload>()

/**
 * 下载一个模型。
 * @param catalogEntry  模型目录条目
 * @param onProgress    进度回调（可选）
 * @returns 下载结果
 */
export function downloadModel(
  catalogEntry: ModelCatalogEntry,
  source: DownloadSource,
  onProgress?: (p: DownloadProgress) => void
): Promise<DownloadResult> {
  return new Promise((resolve) => {
    const modelsDir = getModelsDir()
    const targetPath = join(modelsDir, catalogEntry.fileName)

    // 文件已存在 → 直接返回成功
    if (existsSync(targetPath)) {
      resolve({ ok: true, path: targetPath, size: 0 })
      return
    }

    // 防重入：同一个文件正在下载就别重复开
    if (activeDownloads.has(catalogEntry.id)) {
      resolve({ ok: false, error: '该模型正在下载中' })
      return
    }

    const tmpPath = targetPath + '.part'

    let aborted = false
    let req: http.ClientRequest | null = null

    const cancel = () => {
      aborted = true
      req?.destroy()
    }

    const active: ActiveDownload = {
      cancel,
      progress: { received: 0, total: null, percent: 0, speed: 0 }
    }
    activeDownloads.set(catalogEntry.id, active)

    const lastProgress = { received: 0, time: Date.now() }

    const url = new URL(buildDownloadUrl(catalogEntry, source))
    const lib = url.protocol === 'https:' ? https : http

    console.log('[本地模型] 开始下载:', catalogEntry.id, '源:', source, '→', url.href)
    console.log('[本地模型] 保存到:', targetPath)

    req = lib.get({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      headers: { 'User-Agent': 'CanvasDesk-LocalModel/1.0' },
      // 整体超时设成 60 秒（DNS + TCP 握手阶段），不是整个下载时间
      timeout: 60000
    }, (res) => {
      console.log('[本地模型] 收到响应:', res.statusCode, '位置:', res.headers.location ?? '(无重定向)')

      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // 跟随重定向（镜像经常 302）
        const redirectedUrl = new URL(res.headers.location, url.origin)
        console.log('[本地模型] 跟随重定向 →', redirectedUrl.href)
        res.resume()
        lib.get({
          hostname: redirectedUrl.hostname,
          port: redirectedUrl.port || (redirectedUrl.protocol === 'https:' ? 443 : 80),
          path: redirectedUrl.pathname + redirectedUrl.search,
          headers: { 'User-Agent': 'CanvasDesk-LocalModel/1.0' }
        }, (redRes) => handleResponse(redRes)).on('error', handleError)
        return
      }

      handleResponse(res)
    })

    function handleResponse(res: http.IncomingMessage) {
      console.log('[本地模型] 最终响应:', res.statusCode, 'content-length:', res.headers['content-length'] ?? 'unknown')

      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        handleError(new Error(`HTTP ${res.statusCode ?? '无状态码'}`))
        return
      }

      const total = Number(res.headers['content-length']) || null
      const writeStream = createWriteStream(tmpPath)

      res.pipe(writeStream)

      let received = 0
      res.on('data', (chunk: Buffer) => {
        if (aborted) {
          res.destroy()
          return
        }
        received += chunk.length

        // 每 500ms 推送一次进度
        const now = Date.now()
        if (now - lastProgress.time >= 500) {
          const speed = ((received - lastProgress.received) * 1000) / (now - lastProgress.time)
          lastProgress.received = received
          lastProgress.time = now

          const percent = total != null ? Math.round((received / total) * 100) : 0
          const p: DownloadProgress = { received, total, percent, speed }
          active.progress = p
          onProgress?.(p)
        }
      })

      writeStream.on('finish', () => {
        writeStream.close()
        if (aborted) {
          handleError(new Error('下载已取消'))
          return
        }
        // 把 .part 重命名成正式文件
        const fs = require('node:fs') as typeof import('node:fs')
        fs.renameSync(tmpPath, targetPath)
        activeDownloads.delete(catalogEntry.id)
        console.log('[本地模型] 下载完成:', catalogEntry.id, '总大小:', received, '字节')
        resolve({ ok: true, path: targetPath, size: received })
      })
    }

    function handleError(err: Error) {
      console.error('[本地模型] 下载失败:', catalogEntry.id, err.message)
      activeDownloads.delete(catalogEntry.id)
      // 清理残留 .part
      try { require('node:fs').unlinkSync(tmpPath) } catch { /* 忽略 */ }
      if (aborted) {
        resolve({ ok: false, error: '下载已取消' })
      } else {
        resolve({ ok: false, error: err.message })
      }
    }

    req.on('error', handleError)
    req.on('timeout', () => {
      console.error('[本地模型] 请求超时（60s）:', catalogEntry.id)
      req?.destroy(new Error('连接超时（60 秒内未能完成 DNS/TCP 建立）'))
    })
  })
}

/** 取消一个进行中的下载 */
export function cancelDownload(id: string): boolean {
  const dl = activeDownloads.get(id)
  if (!dl) return false
  dl.cancel()
  activeDownloads.delete(id)
  return true
}

/** 查询一个下载是否在进行中 */
export function getActiveDownloads(): string[] {
  return [...activeDownloads.keys()]
}
