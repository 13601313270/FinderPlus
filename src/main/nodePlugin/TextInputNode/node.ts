import { StringValue } from '../../engine/data/StringValue'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'

/**
 * 字符串输入框节点：源头节点，框里写什么就往外送什么。
 * 没有输入端口，只有一个字符串输出。
 */
export class TextInputNode extends Node {
  readonly type = 'text-input'

  /** 输出端口：字符串 */
  readonly textOutput = new OutputPort('text', 'string')

  private content = ''

  constructor(id: string) {
    super(id)
    this.addOutput(this.textOutput)
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
}