import { StringValue } from '../../engine/data/StringValue'
import { InputPort } from '../../engine/port/InputPort'
import { Node } from '../../engine/node/Node'

/**
 * 字符串展示节点：把上游送来的字符串显示出来。
 * 没有输出端口——它的产出就是「展示」这件事本身，UI 直接读 text。
 */
export class TextDisplayNode extends Node {
  static readonly TYPE = 'text-display'
  readonly type = TextDisplayNode.TYPE

  /** 输入端口：只接受字符串 */
  readonly textInput = new InputPort('text', { accepts: [StringValue], label: '文本' })

  private displayed = ''

  constructor(id: string) {
    super(id)
    this.addInput(this.textInput)
  }

  /** 当前展示的内容。没接输入、或上游还没算过时是空串 */
  get text(): string {
    return this.displayed
  }

  /** 收到通知就刷新展示，这是它唯一要做的事 */
  onInputChanged(): void {
    const [first] = this.textInput.value
    this.displayed = first instanceof StringValue ? first.value : ''
    this.notifyChanged()
  }

  saveState(): Record<string, unknown> {
    // displayed 是上游派生出来的，恢复时上游 commit 会自动刷回来，不用存
    return {}
  }

  readState(_state: Record<string, unknown>): void {
    // 啥也不做——派生状态等上游恢复后自然会刷新
  }
}