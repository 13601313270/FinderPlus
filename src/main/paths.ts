import { app } from 'electron'
import { join, basename } from 'node:path'
import { mkdirSync, existsSync, readdirSync, renameSync, rmSync } from 'node:fs'

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
