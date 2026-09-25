import { StringValue } from '../../engine/data/StringValue'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'

/**
 * 字符串输入框节点：源头节点，框里写什么就往外送什么。
 * 没有输入端口，只有一个字符串输出。
 */
export class TextInputNode extends Node {
  static readonly TYPE = 'text-input'
  readonly type = TextInputNode.TYPE

  /** 输出端口：字符串 */
  readonly textOutput = new OutputPort('text', StringValue)

  private content = ''

  constructor(id: string) {
    super(id)
    this.addOutput(this.textOutput)
    // 内容区硬约束：手柄 + 输入框 + padding ≈ 86px 高，宽 220px
    this.setBox(220, 86)
  }

  /** 拖入文件落点命中本节点时被调用；本节点不接收文件，返回 false */
  isPositionAcceptFileDrop(relativeX: number, relativeY: number): boolean {
    return false
  }

  onFileDrop(sourcePath: string): void {
    // 本节点不接收文件，不处理
  }

  /** 框里的内容，UI 直接读它 */
  get text(): string {
    return this.content
  }

  /** 输入框内容变了，节点自己把新值提交出去——这就是「节点自己的节奏」 */
  setText(text: string): void {
    if (text === this.content) return
    this.content = text
    this.textOutput.commit(new StringValue(text))
  }

  /** 没有输入端口，永远收不到通知 */
  onInputChanged(): void {}

  saveState(): Record<string, unknown> {
    return { content: this.content }
  }

  readState(state: Record<string, unknown>): void {
    // 恢复源头值 → 触发 commit，下游才能收到
    const text = typeof state.content === 'string' ? state.content : ''
    this.setText(text)
  }
}