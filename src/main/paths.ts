import { app } from 'electron'
import { join, basename, extname } from 'node:path'
import { mkdirSync, existsSync, readdirSync, renameSync, rmSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs'

/** 画布文件根目录：文稿/CanvasDesk/我的画布 */
export function getCanvasRootDir(): string {
  return join(app.getPath('documents'), 'CanvasDesk', '我的画布')
}

/**
 * 某画布的文件目录：根目录下的子目录
 *   getCanvasDir('default') → 文稿/CanvasDesk/我的画布/default
 *   getCanvasDir('my-flow') → 文稿/CanvasDesk/我的画布/my-flow
 *
 * canvasId 默认 'default'，不传保持现有行为。
 */
export function getCanvasDir(canvasId: string = 'default'): string {
  return join(getCanvasRootDir(), canvasId)
}

/** 启动时递归创建某画布目录，不存在就建、存在不报错 */
export function ensureCanvasDir(canvasId: string = 'default'): void {
  mkdirSync(getCanvasDir(canvasId), { recursive: true })
}

/**
 * 向后兼容迁移：v1 时期所有文件直接放在画布根目录，
 * v2 起按 canvasId 分子目录（default/、xxx/…）。
 *
 * 如果根目录下发现文件（非子目录）且不存在 default/ 子目录，
 * 自动把这些文件搬进 default/ —— 一次性迁移，不丢用户数据。
 *
 * 返回 true 表示本次启动做了迁移，false 表示无需迁移。
 */
export function migrateLegacyRootFiles(): boolean {
  const root = getCanvasRootDir()
  const defaultDir = getCanvasDir('default')

  if (!existsSync(root)) return false
  if (existsSync(defaultDir)) return false // 已经有 default/ 子目录，说明迁移过或本来就是新结构

  // 根目录下有文件吗？子目录不动——子目录可能是用户手动建的、也可能是旧版残留
  const entries = readdirSync(root, { withFileTypes: true })
  const files = entries.filter((e) => e.isFile())

  if (files.length === 0) return false

  // 建 default/，把文件逐个搬进去
  mkdirSync(defaultDir, { recursive: true })
  for (const f of files) {
    const src = join(root, f.name)
    const dst = join(defaultDir, f.name)
    try {
      renameSync(src, dst)
    } catch (err) {
      console.warn('[paths] 迁移文件到 default/ 失败，跳过：', f.name, err)
    }
  }
  console.info(`[paths] 已迁移 ${files.length} 个旧文件到 default/ 子目录`)
  return true
}

/**
 * 节点文件目录（通用）：画布下按 nodeId 分，扁平一层。
 *   getNodeDir('default', 'abc123')
 *     → 文稿/CanvasDesk/我的画布/default/abc123/
 *
 * nodeId 本身在全画布唯一，不再需要额外的 nodeType 层级。
 */
export function getNodeDir(canvasId: string, nodeId: string): string {
  return join(getCanvasDir(canvasId), nodeId)
}

/** 确保某节点文件目录存在（mkdir -p 等价）。不存在就建，存在不报错 */
export function ensureNodeDir(canvasId: string, nodeId: string): string {
  const dir = getNodeDir(canvasId, nodeId)
  mkdirSync(dir, { recursive: true })
  return dir
}

/**
 * 删除某节点的整个文件目录（递归、强制）。
 * 目录不存在时不报错（幂等）。
 *
 * @returns true 表示确实删了东西，false 表示目录本来就不存在
 */
export function removeNodeDir(canvasId: string, nodeId: string): boolean {
  const dir = getNodeDir(canvasId, nodeId)
  if (!existsSync(dir)) return false
  rmSync(dir, { recursive: true, force: true })
  return true
}

/** 从路径字符串里安全地取最后一段作为文件名（防止 path traversal） */
export function safeBasename(p: string): string {
  const name = basename(p)
  // basename('../../../etc/passwd') → 'passwd'，天然防 traversal
  if (!name || name === '.' || name === '..') return ''
  return name
}

/** 安全化子目录名：只允许 [a-zA-Z0-9_-]，其他字符替换成 _。空串返回 ''（调用方自己处理） */
export function safeSubdirName(name: string): string {
  if (!name) return ''
  return name.replace(/[^a-zA-Z0-9_-]/g, '_')
}

/** saveFileToNodeDir 的返回值 */
export interface SavedFile {
  /** 相对于节点目录的相对路径，如 'a1b2c3.png' — 存入 SQLite TEXT 列的就是它 */
  relPath: string
  /** 最终存的文件名（带扩展名，就是 relPath 本身） */
  fileName: string
  /** 文件字节数 */
  size: number
  /** 扩展名小写，如 'png' / 'pdf' / '' */
  ext: string
}

/**
 * 把一段二进制存进节点目录（直接平铺，不按列名分子目录）。
 *
 *   saveFileToNodeDir('default', 'node_abc', 'photo.png', buf)
 *     → 存到 canvasDir/default/node_abc/<随机id>.png
 *     → 返回 { relPath: '<随机id>.png', fileName, size, ext }
 *
 * 文件名用短随机 id 重命名，避免原始文件名含特殊字符或跨用户冲突。
 */
export function saveFileToNodeDir(
  canvasId: string,
  nodeId: string,
  originalFileName: string,
  data: ArrayBuffer | Uint8Array | Buffer
): SavedFile {
  const ext = extname(originalFileName).toLowerCase() // '.png' / '.pdf' / ''
  const safeExt = ext.replace(/[^a-z0-9.]/g, '')       // 再保险一次

  // 随机 id + 安全扩展名
  const randId = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
  const fileName = randId + safeExt                   // 'a1b2c3d4e5f6.png'
  const relPath = fileName                            // 平铺：没有列名子目录

  const nodeDir = ensureNodeDir(canvasId, nodeId)
  const absPath = join(nodeDir, fileName)
  const buf = data instanceof ArrayBuffer ? Buffer.from(data) : Buffer.from(data)
  writeFileSync(absPath, buf)

  return {
    relPath,
    fileName,
    size: buf.byteLength,
    ext: safeExt.replace('.', '')
  }
}

/**
 * 读节点目录下的文件。
 * relPath 是 saveFileToNodeDir 返回的相对路径（如 'avatar/a1b2c3.png'）。
 *
 * @returns { ok: true, data, fileName, mime, size } 或 { ok: false, error }
 */
export function readFileFromNodeDir(
  canvasId: string,
  nodeId: string,
  relPath: string
): { ok: true; data: Buffer; fileName: string; mime: string; size: number } | { ok: false; error: string } {
  // relPath 里不能带 .. —— 防 traversal
  if (/[\\]|\.\./.test(relPath)) {
    return { ok: false, error: '非法路径' }
  }

  const nodeDir = getNodeDir(canvasId, nodeId)
  const absPath = join(nodeDir, relPath)

  // 二次确认：解析后的绝对路径必须还在 nodeDir 下
  const resolved = require('node:path').resolve(absPath)
  const resolvedNodeDir = require('node:path').resolve(nodeDir)
  if (!resolved.startsWith(resolvedNodeDir + require('node:path').sep)) {
    return { ok: false, error: '路径越界' }
  }

  if (!existsSync(absPath)) {
    return { ok: false, error: '文件不存在' }
  }

  try {
    const data = readFileSync(absPath)
    const fileName = basename(absPath)
    const mime = guessMime(fileName)
    return { ok: true, data, fileName, mime, size: data.byteLength }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * 删除节点目录下的一个文件（不删除列子目录本身）。
 * relPath 非法 / 文件不存在都返回 false + 说明（不抛异常，幂等）。
 */
export function deleteFileFromNodeDir(
  canvasId: string,
  nodeId: string,
  relPath: string
): { ok: true } | { ok: false; error: string } {
  if (/[\\]|\.\./.test(relPath)) {
    return { ok: false, error: '非法路径' }
  }

  const nodeDir = getNodeDir(canvasId, nodeId)
  const absPath = join(nodeDir, relPath)

  const resolved = require('node:path').resolve(absPath)
  const resolvedNodeDir = require('node:path').resolve(nodeDir)
  if (!resolved.startsWith(resolvedNodeDir + require('node:path').sep)) {
    return { ok: false, error: '路径越界' }
  }

  if (!existsSync(absPath)) {
    return { ok: false, error: '文件不存在' }
  }

  try {
    unlinkSync(absPath)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/** 根据扩展名猜 mime type —— 覆盖常见图片/文档/音视频格式 */
function guessMime(fileName: string): string {
  const ext = extname(fileName).toLowerCase().replace('.', '')
  const map: Record<string, string> = {
    // 图片
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', heic: 'image/heic', heif: 'image/heif',
    // 文档
    pdf: 'application/pdf', txt: 'text/plain', md: 'text/markdown', csv: 'text/csv',
    json: 'application/json', html: 'text/html', htm: 'text/html', xml: 'application/xml',
    // 音视频
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4',
    mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo', webm: 'video/webm',
  }
  return map[ext] ?? 'application/octet-stream'
}
