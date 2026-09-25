import { base64ToBytes } from '../../engine/data/base64'
import { djb2 } from '../../engine/data/hash'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { OutputPort } from '../../engine/port/OutputPort'
import { FileNode } from '../FileNode/node'
import { inferImageMime } from './mime'

/** 图片后缀集合，供 acceptsExtension 使用 */
const ACCEPTED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'])

/** 卡片默认宽度（世界像素）——图片区保持原图比例，高度随宽度推导 */
export const DEFAULT_PREVIEW_WIDTH = 200
/** 卡片最小宽度（用户拖 handle 不能再缩小） */
export const MIN_PREVIEW_WIDTH = 100
/** 卡片最大宽度（用户拖 handle 封顶） */
export const MAX_PREVIEW_WIDTH = 800

/**
 * 图片文件节点：选中图片文件后由渲染端读取二进制（base64），
 * 节点负责构造 ImgFileValue 并从 fileOutput 送出。
 *
 * 与 TxtFileNode 的差异：
 * - 图片二进制内容不持久化（base64 太大，不适合塞进 SQLite）——
 *   持久化只存 fileName + previewWidth，恢复时由 render.vue 的 watch(fileName) 触发兜底读回
 * - 只有单 fileOutput（ImgFileValue，kind = 'img-file'），
 *   没有额外的派生值端口（图片不像文本那样有天然的 string 表示）
 * - previewWidth 是节点专属字段：图片卡片右下角有 resize handle，宽度由用户拖出来，
 *   高度 = 宽度 × 图片原始比例 + 文件名行高度，引擎只存宽度这一个自由度
 */
export class ImgFileNode extends FileNode {
  static readonly TYPE = 'img-file'

  static override acceptsExtension(ext: string): boolean {
    return ACCEPTED_EXTS.has(ext)
  }

  readonly type = ImgFileNode.TYPE

  /** 文件输出（ImgFileValue，kind = 'img-file'） */
  readonly fileOutput = new OutputPort('file', ImgFileValue, '文件')

  /** 图片天然宽度（像素）。render.vue 的 img load 时回写；0 表示尚未加载 */
  private naturalWidthValue = 0
  /** 图片天然高度（像素）。render.vue 的 img load 时回写；0 表示尚未加载 */
  private naturalHeightValue = 0

  constructor(id: string) {
    super(id)
    this.addOutput(this.fileOutput)
    // 宽度走基类 box（用户可拖 handle 调）；高度维 0 = 不约束，随图片比例撑开
    this.setBox(DEFAULT_PREVIEW_WIDTH, 0)
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

  /** 当前图片天然宽度（像素）；0 表示尚未加载 */
  get naturalWidth(): number {
    return this.naturalWidthValue
  }

  /** 当前图片天然高度（像素）；0 表示尚未加载 */
  get naturalHeight(): number {
    return this.naturalHeightValue
  }

  /**
   * 写入图片天然宽高，由 render.vue 的 img load 事件触发。
   * 只存不 commit——宽高是展示层的辅助信息，不影响下游数据流转。
   */
  setNaturalSize(width: number, height: number): void {
    if (width === this.naturalWidthValue && height === this.naturalHeightValue) return
    this.naturalWidthValue = width
    this.naturalHeightValue = height
  }

  /**
   * 图片类型（MIME），从文件名后缀推断。render.vue 展示用。
   */
  get imageType(): string {
    return this.fileName ? inferImageMime(this.fileName) : ''
  }

  /**
   * 展示用格式名（JPEG / PNG / GIF / WebP / BMP），从 MIME 转。未知 MIME 兜底返回原 MIME。
   */
  get displayFormat(): string {
    const mime = this.imageType
    if (!mime) return ''
    const map: Record<string, string> = {
      'image/jpeg': 'JPEG',
      'image/png': 'PNG',
      'image/gif': 'GIF',
      'image/webp': 'WebP',
      'image/bmp': 'BMP'
    }
    return map[mime] ?? mime
  }

  saveState(): Record<string, unknown> {
    // 持久化键名保持 'previewWidth'（老存档兼容），值来自基类 box 宽
    return {
      ...super.saveState(),
      box: this.box
    }
  }

  readState(state: Record<string, unknown>): void {
    super.readState(state)
    const box = state.box as [number, number]
    if (box !== undefined) {
      this.setBox(Math.min(MAX_PREVIEW_WIDTH, Math.max(MIN_PREVIEW_WIDTH, Math.round(box[0]))), box[1])
    }
  }

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }
  
  onFileDrop(_sourcePath: string): void {
    // 本节点不接收文件，不处理
  }
}
