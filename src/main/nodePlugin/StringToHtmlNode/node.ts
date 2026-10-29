import { djb2 } from '../../engine/data/hash'
import { HtmlFileValue } from '../../engine/data/HtmlFileValue'
import { StringValue } from '../../engine/data/StringValue'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'
import { inLabel, outLabel } from './i18n'

/**
 * 字符串转 HTML 文件节点：把上游传来的 StringValue 包装成 HtmlFileValue 输出。
 *
 * - 输入端口固定接受 StringValue
 * - 输出端口固定输出 HtmlFileValue（构造临时 File 对象 + djb2 hash）
 * - 无配置项，无持久化状态
 */
export class StringToHtmlNode extends Node {
  static readonly TYPE = 'string-to-html'
  readonly type = StringToHtmlNode.TYPE

  /** 输入端口：只接 StringValue */
  private readonly inputPort: InputPort

  /** 输出端口：固定 HtmlFileValue */
  private readonly outputPort: OutputPort

  constructor(id: string) {
    super(id)
    this.inputPort = new InputPort('in', {
      accepts: [StringValue],
      label: inLabel,
      isHiddenLabel: true
    })
    this.addInput(this.inputPort)

    this.outputPort = new OutputPort('out', HtmlFileValue, outLabel)
    this.addOutput(this.outputPort)

    this.setBox(120, 50)
  }

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 不接收文件
  }

  /** 输入端口收到 StringValue → 包装成 HtmlFileValue 输出 */
  inputPortReceiveValue(): void {
    try {
      const [value] = this.inputPort.value
      if (value instanceof StringValue && !value.isNull) {
        const text = value.value ?? ''
        const file = new File([text], `${this.id}.html`, { type: 'text/html;charset=utf-8' })
        const hash = djb2(text)
        this.outputPort.commit(new HtmlFileValue(file, hash))
      } else {
        // 上游断连或 null 值 → 推送一个 null HtmlFileValue
        this.outputPort.commit(new HtmlFileValue())
      }
      this.notifyChanged()
    } finally {
      this.completeRun()
    }
  }

  saveState(): Record<string, unknown> {
    return { ...super.saveState() }
  }

  readState(_state: Record<string, unknown>): void {
    super.readState(_state)
  }
}
