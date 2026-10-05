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
 *
 * null 值：file 不传即为 isNull=true，contentHash 也不必传。
 */
export class FileValue extends Value {
  static override readonly VALUE_NAME: ValueKind = 'file'

  /** 内容 hash 指纹：文件内容相同则 hash 相同；isNull 时为固定标记 */
  readonly fingerprint: string

  /**
   * @param file        不传即为 null 值（isNull=true）；其他参数也不必传
   * @param contentHash 调用方预先算好的文件内容 hash；isNull=true 时忽略
   */
  constructor(
    readonly file?: File,
    contentHash?: string
  ) {
    super(file === undefined)
    this.fingerprint = file === undefined ? 'file:null' : `file:${contentHash}`
  }

  override get displayLabel(): string {
    return this.isNull ? '(null)' : this.file?.name ?? '(null)'
  }
}
