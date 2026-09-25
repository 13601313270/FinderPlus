import { FileValue } from '../../engine/data/FileValue'
import { InputPort } from '../../engine/port/InputPort'
import { Node } from '../../engine/node/Node'

/**
 * 文件信息展示节点：把上游送来的 FileValue 的元信息（name / size / type）显示出来。
 * 没有输出端口——它的产出就是「展示」这件事本身，UI 直接读字段。
 *
 * 输入端口 accepts 只列 FileValue，因为 FileValue 本身就能接住所有子类
 * （canBindEdge 用 prototype instanceof 检查，TxtFileValue 是 FileValue 子类，
 * 能被 [FileValue] 接受，无需重复声明）。
 */
export class FileInfoNode extends Node {
  static readonly TYPE = 'file-info'
  readonly type = FileInfoNode.TYPE

  /** 输入端口：接受 FileValue 及其所有子类（如 TxtFileValue） */
  readonly fileInput = new InputPort('file', { accepts: [FileValue], label: '文件' })

  private fileName = ''
  private fileSize = 0
  private fileType = ''

  constructor(id: string) {
    super(id)
    this.addInput(this.fileInput)
  }

  /** 当前展示的文件名。没接输入、或上游还没算过时是空串 */
  get displayFileName(): string {
    return this.fileName
  }

  /** 当前展示的文件大小（字节） */
  get displayFileSize(): number {
    return this.fileSize
  }

  /** 当前展示的文件 MIME 类型 */
  get displayFileType(): string {
    return this.fileType
  }

  /** 收到通知就刷新展示，这是它唯一要做的事 */
  onInputChanged(): void {
    const [first] = this.fileInput.value
    if (first instanceof FileValue) {
      this.fileName = first.file.name
      this.fileSize = first.file.size
      this.fileType = first.file.type
    } else {
      this.fileName = ''
      this.fileSize = 0
      this.fileType = ''
    }
    this.notifyChanged()
  }

  saveState(): Record<string, unknown> {
    // 都是上游派生出来的，恢复时上游 commit 会自动刷回来，不用存
    return {}
  }

  readState(_state: Record<string, unknown>): void {
    // 啥也不做——派生状态等上游恢复后自然会刷新
  }
}
