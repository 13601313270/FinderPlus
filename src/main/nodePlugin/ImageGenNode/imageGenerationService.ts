/**
 * 共享图片生成服务：ImageGenNode 和 ImgFileNode 共用的纯 API 调用逻辑。
 *
 * 抽离出 ImageGenNode，避免 ImgFileNode 重绘功能复制大段代码。
 * 只负责「发请求 → 轮询异步任务 → 构造 File」等纯操作，
 * 不关心节点状态管理、端口 commit、业务校验（这些留在各节点里）。
 */
import { base64ToBytes, bytesToBase64 } from '../../engine/data/base64'
import {
  buildImageRequestHeaders,
  buildImageRequestBody,
  extractImageResult,
  extractImageErrorMessage,
  extractTaskId,
  extractTaskStatus,
  type ResolvedImageEndpoint,
  type ExtractedImage
} from './providers'

/** 百炼异步任务的轮询间隔 / 总超时 */
export const IMAGE_TASK_POLL_INTERVAL_MS = 2500
export const IMAGE_TASK_TIMEOUT_MS = 120_000

/**
 * 参考图文件大小上限：百炼对单次请求体有 ~10MB 限制。
 * 7MB 原始文件 → base64 后约 9.3MB，留出 prompt / JSON 结构余量。
 */
export const MAX_REFERENCE_IMAGE_BYTES = 7 * 1024 * 1024

/**
 * 可中断的 sleep：传 signal 后，abort 会立刻 reject AbortError。
 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timeoutId = setTimeout(resolve, ms)
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timeoutId)
        reject(new DOMException('Aborted', 'AbortError'))
      }, { once: true })
    }
  })
}

/**
 * 发请求取图片数据。
 * 同步协议一次拿结果；百炼异步协议要先提交任务再轮询。
 *
 * @param isStale 轮询期间判断当前请求是否已过期（被后续请求取代 / cancel），
 *                调用方传入自己的 stale 判断逻辑。
 */
export async function requestImage(
  endpoint: ResolvedImageEndpoint,
  prompt: string,
  size: string,
  referenceImages: readonly string[] | undefined,
  isStale: () => boolean,
  signal: AbortSignal
): Promise<{ result?: ExtractedImage; error?: string; cancelled?: boolean }> {
  const res = await fetch(endpoint.requestUrl, {
    method: 'POST',
    headers: buildImageRequestHeaders(endpoint),
    body: JSON.stringify(buildImageRequestBody(endpoint, prompt, size, referenceImages)),
    signal
  })
  const data = await res.json().catch(() => undefined)

  if (!res.ok) {
    return { error: extractImageErrorMessage(data) ?? `请求失败（${res.status} ${res.statusText}）` }
  }
  if (endpoint.shape !== 'dashscope-async') {
    return { result: extractImageResult(endpoint.shape, data) }
  }

  const taskId = extractTaskId(data)
  if (!taskId) {
    return { error: extractImageErrorMessage(data) ?? '任务已提交但响应里没有 task_id' }
  }
  return waitForTask(endpoint, taskId, isStale, signal)
}

/**
 * 轮询异步任务直到 成功 / 失败 / 超时。
 * 每轮都通过 isStale 检查是否过期。
 */
export async function waitForTask(
  endpoint: ResolvedImageEndpoint,
  taskId: string,
  isStale: () => boolean,
  signal: AbortSignal
): Promise<{ result?: ExtractedImage; error?: string; cancelled?: boolean }> {
  const deadline = Date.now() + IMAGE_TASK_TIMEOUT_MS
  while (Date.now() < deadline) {
    await sleep(IMAGE_TASK_POLL_INTERVAL_MS, signal)
    if (isStale()) return { cancelled: true }

    const res = await fetch(`${endpoint.taskUrlPrefix}${taskId}`, {
      headers: { Authorization: `Bearer ${endpoint.key}` },
      signal
    })
    const data = await res.json().catch(() => undefined)
    if (!res.ok) {
      return { error: extractImageErrorMessage(data) ?? `查询任务失败（${res.status} ${res.statusText}）` }
    }

    const taskStatus = extractTaskStatus(data)
    if (taskStatus === 'SUCCEEDED') {
      return { result: extractImageResult('dashscope-async', data) }
    }
    if (taskStatus === 'FAILED' || taskStatus === 'UNKNOWN') {
      return { error: extractImageErrorMessage(data) ?? `任务失败（${taskStatus}）` }
    }
    // PENDING / RUNNING → 继续等
  }
  const timeoutSec = Math.round(IMAGE_TASK_TIMEOUT_MS / 1000)
  return { error: `生成超时（超过 ${timeoutSec} 秒），任务仍在后台执行，可稍后在百炼控制台查看` }
}

/**
 * b64_json 形态：base64 → 字节 → File。
 * OpenAI 图像接口默认返回 PNG，故按 image/png 标记。
 */
export function buildFileFromBase64(b64: string, suggestedName?: string): { file: File; hash: string } {
  const bytes = base64ToBytes(b64)
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  const name = suggestedName || `image-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.png`
  return {
    file: new File([ab], name, { type: 'image/png' }),
    hash: djb2(b64)
  }
}

/** url 形态：URL 有效期有限，立刻拉成字节再落成 File */
export async function buildFileFromUrl(url: string, signal?: AbortSignal, suggestedName?: string): Promise<{ file: File; hash: string }> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`下载生成图失败（${res.status} ${res.statusText}）`)
  const blob = await res.blob()
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  const mime = blob.type || 'image/png'
  const ext = mime.includes('/') ? mime.split('/')[1] : 'png'
  const name = suggestedName || `image-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`
  return {
    file: new File([ab], name, { type: mime }),
    hash: djb2(bytesToBase64(bytes))
  }
}

// —— 内部依赖 ——
function djb2(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0
  }
  return (hash >>> 0).toString(36)
}
