import { NumberValue } from '../../engine/data/NumberValue'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'
import type { InputPort } from '../../engine/port/InputPort'

/**
 * 数字输入框节点：源头节点，框里写几就往外送几。
 * 没有输入端口，只有一个数字输出。
 *
 * 形状上和 TextInputNode 是同一类（源头 + 单输出），差别只在值的类型标签：
 * 输出端口声明 'number'，提交 NumberValue——下游能不能接，由引擎按 kind 判定，节点自己不管。
 */
export class NumberInputNode extends Node {
  static readonly TYPE = 'number-input'
  readonly type = NumberInputNode.TYPE

  /** 输出端口：数字 */
  readonly numberOutput = new OutputPort('number', NumberValue)

  private content = 0

  constructor(id: string) {
    super(id)
    this.addOutput(this.numberOutput)
    // 内容区硬约束：手柄 + 输入框 + padding ≈ 80px 高，宽 220px
    this.setBox(220, 77)
  }

  /** 拖入文件落点命中本节点时被调用；本节点不接收文件，返回 false */
  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 本节点不接收文件，不处理
  }

  /** 框里的当前数值，UI 直接读它 */
  get number(): number {
    return this.content
  }

  /** 框里的数字变了，节点自己把新值提交出去——这就是「节点自己的节奏」 */
  setNumber(value: number): void {
    if (value === this.content) return
    this.content = value
    this.numberOutput.commit(new NumberValue(value))
    // 顺带通知观察者：卡片里那个「输出」读数是靠这里刷新的
    this.notifyChanged()
  }

  /** 没有输入端口，永远收不到通知 */
  inputPortReceiveValue(_ports: InputPort[]): void {}

  saveState(): Record<string, unknown> {
    return { content: this.content }
  }

  readState(state: Record<string, unknown>): void {
    // 恢复源头值 → 触发 commit，下游才能收到
    const n = typeof state.content === 'number' ? state.content : 0
    this.setNumber(n)
  }
}
