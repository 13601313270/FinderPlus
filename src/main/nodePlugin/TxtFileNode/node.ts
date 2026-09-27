import { djb2 } from '../../engine/data/hash'
import { TxtFileValue } from '../../engine/data/TxtFileValue'
import { StringValue } from '../../engine/data/StringValue'
import { OutputPort } from '../../engine/port/OutputPort'
import { FileNode } from '../FileNode/node'

/**
 * TXT 文件节点：选中 .txt 文件后由渲染端读取内容，节点负责持有内容并从两个输出端口送出。
 *
 * - contentOutput：文本内容（string），跟 TextInputNode 的 textOutput 同形状，
 *   下游任何接 string 的节点都能直接接上
 * - fileOutput：TxtFileValue（FileValue 子类，kind = 'txt-file'），
 *   下游接 'txt-file' 或 'file' 类型的节点都能连上
 */
export class TxtFileNode extends FileNode {
  static readonly TYPE = 'txt-file'

  static override acceptsExtension(ext: string): boolean {
    return ext === '.txt'
  }

  readonly type = TxtFileNode.TYPE

  /** 文本内容输出（string） */
  readonly contentOutput = new OutputPort('content', StringValue, '文本')

  /** 文件输出（TxtFileValue，kind = 'txt-file'） */
  readonly fileOutput = new OutputPort('file', TxtFileValue, '文件')

  /** 当前文本内容；空节点初始化为空串 */
  private contentValue = ''

  constructor(id: string) {
    super(id)
    this.addOutput(this.contentOutput)
    this.addOutput(this.fileOutput)
    // 内容区硬约束：文件图标 72px + 文件名行 + padding ≈ 122px 高，宽 180px
    this.setBox(180, 122)
  }

  /** 节点对外暴露的文本内容 */
  get content(): string {
    return this.contentValue
  }

  /**
   * 写入内容并 commit 两个输出端口。
   * 由 render.vue 在读完文件后调用（选文件按钮点击、或持久化恢复时自动读回）。
   */
  setContent(text: string): void {
    if (text === this.contentValue) return
    this.contentValue = text
    this.contentOutput.commit(new StringValue(text))

    // 构造 TxtFileValue：用文本内容 new File + djb2 算 hash
    if (this.fileName) {
      const file = new File([text], this.fileName, { type: 'text/plain;charset=utf-8' })
      const hash = djb2(text)
      this.fileOutput.commit(new TxtFileValue(file, hash))
    }

    this.notifyChanged()
  }

  saveState(): Record<string, unknown> {
    return { ...super.saveState(), content: this.contentValue }
  }

  readState(state: Record<string, unknown>): void {
    super.readState(state)
    const text = typeof state.content === 'string' ? state.content : ''
    if (text) {
      this.contentValue = text
      this.contentOutput.commit(new StringValue(text))
      // 持久化恢复时 fileName 已由 super.readState 恢复，构造 TxtFileValue commit
      if (this.fileName) {
        const file = new File([text], this.fileName, { type: 'text/plain;charset=utf-8' })
        const hash = djb2(text)
        this.fileOutput.commit(new TxtFileValue(file, hash))
      }
    }
  }
}
