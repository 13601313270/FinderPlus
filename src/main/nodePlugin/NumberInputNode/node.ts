import { NumberValue } from '../../engine/data/NumberValue'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'

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
  readonly numberOutput = new OutputPort('number', 'number')

  private content = 0

  constructor(id: string) {
    super(id)
    this.addOutput(this.numberOutput)
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
  onInputChanged(): void {}
}
