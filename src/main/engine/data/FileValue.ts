import { Value } from './Value'

/**
 * 文件传输子：直接包裹一个 File。
 * 名称、类型、体积、字节访问都在 File 自身，不再额外引入句柄或描述信息。
 */
export class FileValue extends Value {
  readonly kind = 'file' as const

  constructor(readonly file: File) {
    super()
  }

  /**
   * 指纹只能取 File 的元信息：File 的字节是异步读的，而端口比对必须同步。
   * 刻意不含 lastModified：Node 里新建 File 会带上当前时间，会把「没变」误判成「变了」。
   * 代价：同名同类型同体积但内容不同时指纹不变（例如原地覆盖一张同尺寸的图）。
   */
  get fingerprint(): string {
    return `file:${this.file.name}:${this.file.type}:${this.file.size}`
  }

  /** 纯数据形式：File 本身不可 JSON 化，这里只给出元信息 */
  toJSON(): { kind: 'file'; name: string; type: string; size: number } {
    return { kind: 'file', name: this.file.name, type: this.file.type, size: this.file.size }
  }
}