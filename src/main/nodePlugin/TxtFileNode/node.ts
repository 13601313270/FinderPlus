import { StringValue } from '../../engine/data/StringValue'
import { OutputPort } from '../../engine/port/OutputPort'
import { FileNode } from '../FileNode/node'

/**
 * TXT 文件节点：选中 .txt 文件后由渲染端读取内容，节点负责持有内容并从输出端口送出。
 *
 * 输出端口叫 `content`，值的 type 是 'string'——和 TextInputNode 的 textOutput 同形状，
 * 所以下游任何接 string 的节点都能直接接上这个文件节点。
 */
export class TxtFileNode extends FileNode {
  static readonly TYPE = 'txt-file'
  static override readonly EXTENSIONS = ['.txt']

  readonly type = TxtFileNode.TYPE

  /** 文本内容输出 */
  readonly contentOutput = new OutputPort('content', 'string', '文本')

  /** 当前文本内容；空节点初始化为空串 */
  private contentValue = ''

  constructor(id: string) {
    super(id)
    this.addOutput(this.contentOutput)
  }

  /** 节点对外暴露的文本内容 */
  get content(): string {
    return this.contentValue
  }

  /**
   * 写入内容并 commit 输出端口。
   * 由 render.vue 在读完文件后调用（选文件按钮点击、或持久化恢复时自动读回）。
   */
  setContent(text: string): void {
    if (text === this.contentValue) return
    this.contentValue = text
    this.contentOutput.commit(new StringValue(text))
    this.notifyChanged()
  }

  saveState(): Record<string, unknown> {
    return { ...super.saveState(), content: this.contentValue }
  }

  readState(state: Record<string, unknown>): void {
    super.readState(state)
    const text = typeof state.content === 'string' ? state.content : ''
    // 持久化的 content 直接恢复并 commit（和 readState 里恢复源头值的惯例一致）
    if (text) {
      this.contentValue = text
      this.contentOutput.commit(new StringValue(text))
    }
  }
}
