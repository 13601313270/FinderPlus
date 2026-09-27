import { Value, type ValueKind } from './Value'

/**
 * 文件传输子：直接包裹一个 File。
 * 名称、类型、体积、字节访问都在 File 自身，不再额外引入句柄或描述信息。
 *
 * 指纹由调用方在构造时传入内容 hash，确保指纹精确反映文件内容变化——
 * 同名同类型同体积但内容不同的文件，hash 必然不同，不会被误判成"没变"。
 *
 * 调用方责任：构造 FileValue 之前必须已读取文件字节并计算好内容 hash
 * （如 SHA-256 或更快的 djb2/xxhash 等）。
 */
export class FileValue extends Value {
  static override readonly VALUE_NAME: ValueKind = 'file'

  /** 内容 hash 指纹：文件内容相同则 hash 相同 */
  readonly fingerprint: string

  constructor(
    readonly file: File,
    /** 调用方预先算好的文件内容 hash；设为必填是为了杜绝 name/type/size 三元组的不严谨兜底 */
    contentHash: string
  ) {
    super()
    this.fingerprint = `file:${contentHash}`
  }

  override get displayLabel(): string {
    return this.file.name
  }
}
