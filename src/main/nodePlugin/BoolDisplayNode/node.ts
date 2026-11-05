import { BoolValue } from '../../engine/data/BoolValue'
import { InputPort } from '../../engine/port/InputPort'
import { Node } from '../../engine/node/Node'

/**
 * 布尔值展示节点：把上游送来的布尔值用红绿灯视觉呈现。
 *
 * true → 绿灯（亮）
 * false → 红灯（亮）
 * 未收到值 → 灰灯（暗）
 *
 * 没有输出端口——它的产出就是「视觉展示」这件事本身，UI 直接读 displayed。
 * 形状上和 NumberDisplayNode / TextDisplayNode 是同一类（单输入 + 无输出），
 * 差别在展示语义：数值是大小、文本是内容、布尔是状态灯。
 */
export class BoolDisplayNode extends Node {
  static readonly TYPE = 'bool-display'
  readonly type = BoolDisplayNode.TYPE

  /** 输入端口：只接受布尔值 */
  readonly boolInput = new InputPort('bool', {
    accepts: [BoolValue],
    label: {
      zh: '布尔',
      en: 'Boolean',
      ja: 'ブール',
      ko: '불리언',
      es: 'Booleano',
      ar: 'منطقي',
      fr: 'Booléen',
      pt: 'Booleano',
      ru: 'Логическое',
      hi: 'बूलियन',
      id: 'Boolean',
      de: 'Boolesch',
      vi: 'Boolean',
      tr: 'Mantıksal',
      it: 'Booleano'
    }
  })

  /** null 表示还没收到过值（区别于 false） */
  private displayed: boolean | null = null

  constructor(id: string) {
    super(id)
    this.addInput(this.boolInput)
    // 内容区硬约束：红绿灯 + 标签 ≈ 130px 高
    this.setBox(150, 130)
  }

  /** 拖入文件落点命中本节点时被调用；本节点不接收文件，返回 false */
  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 本节点不接收文件，不处理
  }

  /** 当前展示的布尔状态。null 表示还没接收到上游值 */
  get bool(): boolean | null {
    return this.displayed
  }

  /** 收到输入就刷新灯的状态 */
  inputPortReceiveValue(_ports: InputPort[]): void {
    const [first] = this.boolInput.value
    this.displayed = first instanceof BoolValue && !first.isNull ? first.value! : null
    this.notifyChanged()
    // 同步节点：展示出来就算消化完输入 → 回 stable
    this.completeRun()
  }
}
