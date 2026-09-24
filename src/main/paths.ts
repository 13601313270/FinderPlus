import { app } from 'electron'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'

/**
 * 画布文件根目录：文稿/CanvasDesk/我的画布
 *
 * 所有文件类型节点（txt、图片、CSV…）选中的文件都会被复制到这里，
 * 保证应用独立拥有一份副本，不依赖用户原始路径。
 */
export function getCanvasDir(): string {
  return join(app.getPath('documents'), 'CanvasDesk', '我的画布')
}

/** 启动时递归创建画布目录，不存在就建、存在不报错 */
export function ensureCanvasDir(): void {
  mkdirSync(getCanvasDir(), { recursive: true })
}
