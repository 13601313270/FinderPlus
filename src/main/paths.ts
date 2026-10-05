import { app } from 'electron'
import { join } from 'node:path'
import { mkdirSync, existsSync, readdirSync, renameSync } from 'node:fs'

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
