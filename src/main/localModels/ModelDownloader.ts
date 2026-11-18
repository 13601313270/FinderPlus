/**
 * 模型下载：从 HuggingFace（或国内镜像）拉取 GGUF 文件到本地 models 目录。
 *
 * 特性：
 *   - 多连接分片并行下载（默认 4 片，服务器支持 Range 时自动开启）
 *   - 每片独立断点续传 + 自动重试 3 次
 *   - 合并阶段用流拼接（不占内存）
 *   - 跟随重定向
 *   - 进度回调（聚合所有分片的总进度）
 *   - 全局可取消（所有分片一起停）
 */

import { createWriteStream, createReadStream, existsSync, statSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import https from 'node:https'
import http from 'node:http'
import { getModelsDir } from './LlmRunner'

/** 并行分片数。hf-mirror 单 IP 建议 4，多了可能被限速 */
const PARALLEL_CHUNKS = 4
/** 每片最大重试次数 */
const MAX_RETRIES_PER_CHUNK = 3
/** 重试间隔 ms */
const RETRY_DELAY = 1200
/** socket 空闲超时 ms */
const SOCKET_TIMEOUT = 180_000

const HF_OFFICIAL = 'https://huggingface.co'
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
  label: string
  id: string
  sizeGb: number
  ramGb: number
  hfRepo: string
  hfFileName: string
  fileName: string
}

function buildDownloadUrl(entry: ModelCatalogEntry, source: DownloadSource): string {
  const base = source === 'hf-official' ? HF_OFFICIAL : HF_MIRROR
  return `${base}/${entry.hfRepo}/resolve/main/${entry.hfFileName}`
}

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

export interface DownloadProgress {
  /** 所有分片累计已下载字节 */
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

// ————————————————————————————————————————————
// 分片下载核心
// ————————————————————————————————————————————

interface ChunkTask {
  index: number
  start: number
  end: number       // inclusive
  expectedSize: number
  partPath: string  // .part.N
  received: number   // 当前已收字节（含续传）
  aborted: boolean
}

/** HEAD 请求探测文件大小 + 是否支持 Range */
function probeFile(urlObj: URL): Promise<{ total: number; acceptRanges: boolean; finalUrl: URL }> {
  return new Promise((resolve, reject) => {
    const lib = urlObj.protocol === 'https:' ? https : http
    const req = lib.request({
      method: 'HEAD',
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      headers: { 'User-Agent': 'CanvasDesk-LocalModel/1.0' }
    }, (res) => {
      res.resume()
      // 跟随 302
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redir = new URL(res.headers.location, urlObj.origin)
        probeFile(redir).then(resolve, reject)
        return
      }
      const total = Number(res.headers['content-length']) || 0
      const acceptRanges = (res.headers['accept-ranges'] ?? '').includes('bytes')
      resolve({ total, acceptRanges, finalUrl: urlObj })
    })
    req.on('error', reject)
    req.end()
  })
}

/** 单个分片下载（支持续传 + 重试） */
function downloadChunk(task: ChunkTask, urlObj: URL, onBytes: (n: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    if (task.aborted) { reject(new Error('aborted')); return }

    // 续传：看 .part.N 已有多少
    try {
      if (existsSync(task.partPath)) {
        task.received = statSync(task.partPath).size
      }
    } catch { task.received = 0 }

    if (task.received >= task.expectedSize) {
      // 这片已经下完了
      resolve()
      return
    }

    let attempt = 0
    let req: http.ClientRequest | null = null

    const tryOnce = () => {
      attempt++
      const lib = urlObj.protocol === 'https:' ? https : http

      const headers: Record<string, string> = {
        'User-Agent': 'CanvasDesk-LocalModel/1.0',
        'Accept-Encoding': 'identity',
        // Range: bytes=<start+已有>-<end>
        'Range': `bytes=${task.start + task.received}-${task.end}`
      }

      req = lib.get({
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        headers
      }, (res) => {
        if (task.aborted) { res.destroy(); reject(new Error('aborted')); return }

        // 跟随 302 重定向
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redir = new URL(res.headers.location, urlObj.origin)
          res.resume()
          console.log(`[chunk ${task.index}] 跟随重定向 →`, redir.hostname)
          downloadChunk(task, redir, onBytes).then(resolve, reject)
          return
        }

        if (res.statusCode === 416) {
          // 范围不可满足 → 已完整
          res.resume()
          resolve()
          return
        }

        if (res.statusCode !== 206) {
          // 服务器不支持 Range，只能串行单连接（外层会 fallback）
          res.destroy()
          reject(new Error(`Range not supported (HTTP ${res.statusCode})`))
          return
        }

        // 追加写
        const writeStream = createWriteStream(task.partPath, { flags: 'a' })
        let chunkBytes = 0

        res.on('data', (chunk: Buffer) => {
          if (task.aborted) { res.destroy(); return }
          chunkBytes += chunk.length
          task.received += chunk.length
          onBytes(chunk.length)
        })

        res.on('end', () => {
          writeStream.end(() => resolve())
        })

        res.on('error', (err) => {
          console.warn(`[chunk ${task.index}] stream error:`, err.message)
          writeStream.destroy()
          maybeRetry(err)
        })
      })

      req.setTimeout(SOCKET_TIMEOUT, () => {
        req?.destroy(new Error('chunk socket timeout'))
      })

      req.on('error', maybeRetry)
    }

    function maybeRetry(err: Error) {
      if (task.aborted) { reject(new Error('aborted')); return }
      if (attempt <= MAX_RETRIES_PER_CHUNK) {
        console.warn(`[chunk ${task.index}] retry ${attempt}/${MAX_RETRIES_PER_CHUNK}:`, err.message)
        setTimeout(() => { if (!task.aborted) tryOnce() }, RETRY_DELAY)
        return
      }
      reject(err)
    }

    tryOnce()
  })
}

/** 串行单连接下载（Range 不支持时的 fallback） */
function downloadSerial(
  tmpPath: string,
  urlObj: URL,
  resumeFrom: number,
  onBytes: (n: number) => void,
  isAborted: () => boolean
): Promise<number> {
  return new Promise((resolve, reject) => {
    let attempt = 0

    const tryOnce = () => {
      attempt++
      const lib = urlObj.protocol === 'https:' ? https : http
      const headers: Record<string, string> = {
        'User-Agent': 'CanvasDesk-LocalModel/1.0',
        'Accept-Encoding': 'identity'
      }
      if (resumeFrom > 0) headers['Range'] = `bytes=${resumeFrom}-`

      const req = lib.get({
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        headers
      }, (res) => {
        if (isAborted()) { res.destroy(); reject(new Error('aborted')); return }

        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redir = new URL(res.headers.location, urlObj.origin)
          res.resume()
          downloadSerial(tmpPath, redir, resumeFrom, onBytes, isAborted).then(resolve, reject)
          return
        }

        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 400) {
          res.destroy()
          maybeRetry(new Error(`HTTP ${res.statusCode ?? '?'}`))
          return
        }

        const isResume = res.statusCode === 206
        const writeStream = createWriteStream(tmpPath, { flags: isResume ? 'a' : 'w' })

        res.on('data', (chunk: Buffer) => {
          if (isAborted()) { res.destroy(); return }
          resumeFrom += chunk.length
          onBytes(chunk.length)
        })
        res.on('end', () => writeStream.end(() => resolve(resumeFrom)))
        res.on('error', (err) => { writeStream.destroy(); maybeRetry(err) })
      })

      req.setTimeout(SOCKET_TIMEOUT, () => req?.destroy(new Error('socket timeout')))
      req.on('error', maybeRetry)
    }

    function maybeRetry(err: Error) {
      if (isAborted()) { reject(new Error('aborted')); return }
      if (attempt <= MAX_RETRIES_PER_CHUNK) {
        setTimeout(tryOnce, RETRY_DELAY)
      } else {
        reject(err)
      }
    }

    tryOnce()
  })
}

/** 合并多个分片 → 目标文件（流拼接，不占内存） */
function mergeChunks(chunkPaths: string[], targetPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const out = createWriteStream(targetPath)
    let i = 0

    function pipeNext() {
      if (i >= chunkPaths.length) { out.end(() => resolve()); return }
      const src = createReadStream(chunkPaths[i])
      src.pipe(out, { end: false })
      src.on('end', () => { i++; pipeNext() })
      src.on('error', reject)
    }
    pipeNext()
  })
}

// ————————————————————————————————————————————
// 主入口
// ————————————————————————————————————————————

export function downloadModel(
  catalogEntry: ModelCatalogEntry,
  source: DownloadSource,
  onProgress?: (p: DownloadProgress) => void
): Promise<DownloadResult> {
  return new Promise(async (resolve) => {
    const modelsDir = getModelsDir()
    const targetPath = join(modelsDir, catalogEntry.fileName)

    if (existsSync(targetPath)) {
      resolve({ ok: true, path: targetPath, size: statSync(targetPath).size })
      return
    }
    if (activeDownloads.has(catalogEntry.id)) {
      resolve({ ok: false, error: '该模型正在下载中' })
      return
    }

    const aborted = { v: false }
    const cancel = () => { aborted.v = true }

    const active: ActiveDownload = {
      cancel,
      progress: { received: 0, total: null, percent: 0, speed: 0 }
    }
    activeDownloads.set(catalogEntry.id, active)

    let lastProgress = { received: 0, time: Date.now() }
    const pushProgress = () => {
      const now = Date.now()
      if (now - lastProgress.time < 400) return
      const received = active.progress.received
      const speed = ((received - lastProgress.received) * 1000) / (now - lastProgress.time)
      lastProgress.received = received
      lastProgress.time = now
      const total = active.progress.total
      active.progress.speed = speed
      active.progress.percent = total ? Math.min(99, Math.round((received / total) * 100)) : 0
      onProgress?.({ ...active.progress })
    }

    const urlObj = new URL(buildDownloadUrl(catalogEntry, source))
    console.log('[本地模型] 探测:', catalogEntry.id, '源:', source, '→', urlObj.href)

    let fileTotal = 0
    let acceptRanges = false
    let finalUrlObj = urlObj

    try {
      const probe = await probeFile(urlObj)
      fileTotal = probe.total
      acceptRanges = probe.acceptRanges && probe.total > 0
      finalUrlObj = probe.finalUrl
      console.log('[本地模型] HEAD:', fileTotal, 'bytes, Range:', acceptRanges ? '支持' : '不支持', '→ final:', finalUrlObj.href)
    } catch (e) {
      console.warn('[本地模型] HEAD 探测失败，退回到串行:', (e as Error).message)
    }

    try {
      if (acceptRanges && fileTotal > 0) {
        // —— 并行分片 ——
        const chunkSize = Math.ceil(fileTotal / PARALLEL_CHUNKS)
        const tasks: ChunkTask[] = []
        const chunkPaths: string[] = []

        for (let i = 0; i < PARALLEL_CHUNKS; i++) {
          const start = i * chunkSize
          const end = Math.min(start + chunkSize - 1, fileTotal - 1)
          const expectedSize = end - start + 1
          const partPath = `${targetPath}.part.${i}`
          tasks.push({
            index: i, start, end, expectedSize, partPath,
            received: 0, aborted: false
          })
          chunkPaths.push(partPath)
        }

        // 恢复已下载的分片状态
        let alreadyDone = 0
        for (const t of tasks) {
          try {
            if (existsSync(t.partPath)) {
              const sz = statSync(t.partPath).size
              t.received = sz
              if (sz >= t.expectedSize) alreadyDone += sz
            }
          } catch { /* ignore */ }
        }

        active.progress.total = fileTotal
        active.progress.received = alreadyDone
        lastProgress.received = alreadyDone

        // 启动所有分片（用 finalUrlObj 避免再次 302）
        const chunkPromises = tasks.map((t) =>
          downloadChunk(t, finalUrlObj, (n) => {
            if (aborted.v) return
            active.progress.received += n
            pushProgress()
          })
        )

        // 等待所有分片完成
        for (let i = 0; i < chunkPromises.length; i++) {
          try {
            await chunkPromises[i]
          } catch (err) {
            if (aborted.v) { throw new Error('用户取消') }
            throw err
          }
        }

        if (aborted.v) {
          cleanupChunks(chunkPaths)
          resolve({ ok: false, error: '下载已取消' })
          activeDownloads.delete(catalogEntry.id)
          return
        }

        // 合并分片
        console.log('[本地模型] 合并', PARALLEL_CHUNKS, '分片 →', targetPath)
        await mergeChunks(chunkPaths, targetPath)
        cleanupChunks(chunkPaths)
      } else {
        // —— 串行 fallback ——
        console.log('[本地模型] 串行下载（不支持 Range 或 HEAD 失败）')
        const tmpPath = targetPath + '.part'
        let resumeFrom = 0
        try { if (existsSync(tmpPath)) resumeFrom = statSync(tmpPath).size } catch { /* ignore */ }
        active.progress.received = resumeFrom
        active.progress.total = fileTotal || null
        lastProgress.received = resumeFrom

        await downloadSerial(tmpPath, finalUrlObj, resumeFrom, (n) => {
          if (aborted.v) return
          active.progress.received += n
          pushProgress()
        }, () => aborted.v)

        if (aborted.v) {
          try { unlinkSync(tmpPath) } catch { /* ignore */ }
          resolve({ ok: false, error: '下载已取消' })
          activeDownloads.delete(catalogEntry.id)
          return
        }

        const fs = require('node:fs') as typeof import('node:fs')
        fs.renameSync(tmpPath, targetPath)
      }

      // 100% 最终进度
      const total = statSync(targetPath).size
      active.progress.received = total
      active.progress.percent = 100
      active.progress.total = total
      active.progress.speed = 0
      onProgress?.({ ...active.progress })

      console.log('[本地模型] ✓ 完成:', catalogEntry.id, total, 'bytes')
      resolve({ ok: true, path: targetPath, size: total })
    } catch (err) {
      console.error('[本地模型] ✗ 失败:', catalogEntry.id, (err as Error).message)
      resolve({ ok: false, error: (err as Error).message })
    } finally {
      activeDownloads.delete(catalogEntry.id)
    }
  })
}

function cleanupChunks(paths: string[]) {
  for (const p of paths) {
    try { unlinkSync(p) } catch { /* ignore */ }
  }
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
