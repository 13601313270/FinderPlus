import { base64ToBytes } from '../../engine/data/base64'
import { djb2 } from '../../engine/data/hash'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { OutputPort } from '../../engine/port/OutputPort'
import { FileNode } from '../FileNode/node'
import { inferImageMime } from './mime'

/** 图片后缀集合，供 acceptsExtension 使用 */
const ACCEPTED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'])

/**
 * 图片文件节点：选中图片文件后由渲染端读取二进制（base64），
 * 节点负责构造 ImgFileValue 并从 fileOutput 送出。
 *
 * 与 TxtFileNode 的差异：
 * - 图片二进制内容不持久化（base64 太大，不适合塞进 SQLite）——
 *   持久化只存 fileName，恢复时由 render.vue 的 watch(fileName) 触发兜底读回
 * - 只有单 fileOutput（ImgFileValue，kind = 'img-file'），
 *   没有额外的派生值端口（图片不像文本那样有天然的 string 表示）
 */
export class ImgFileNode extends FileNode {
  static readonly TYPE = 'img-file'

  static override acceptsExtension(ext: string): boolean {
    return ACCEPTED_EXTS.has(ext)
  }

  readonly type = ImgFileNode.TYPE

  /** 文件输出（ImgFileValue，kind = 'img-file'） */
  readonly fileOutput = new OutputPort('file', ImgFileValue, '文件')

  constructor(id: string) {
    super(id)
    this.addOutput(this.fileOutput)
  }

  /**
   * 写入图片二进制内容并 commit fileOutput。
   * 由 render.vue 在读完文件后调用（选文件按钮点击、或持久化恢复时自动读回）。
   *
   * @param base64  文件二进制的 base64 编码（由 fileApi.readBinary 返回）
   */
  setContent(base64: string): void {
    if (!this.fileName) return
    const mime = inferImageMime(this.fileName)
    // base64 → 原始字节 → new File
    const bytes = base64ToBytes(base64)
    // 显式取 slice 后的纯 ArrayBuffer，避免 TS 5.x 把 Uint8Array<ArrayBufferLike> 卡在 File 构造上
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    const file = new File([ab], this.fileName, { type: mime })
    const hash = djb2(base64)
    this.fileOutput.commit(new ImgFileValue(file, hash))
    this.notifyChanged()
  }
}
