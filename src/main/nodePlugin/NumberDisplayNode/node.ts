import { NumberValue } from '../../engine/data/NumberValue'
import { InputPort } from '../../engine/port/InputPort'
import { Node } from '../../engine/node/Node'

/**
 * 数字展示节点：把上游送来的数字显示出来。
 * 没有输出端口——它的产出就是「展示」这件事本身，UI 直接读 number。
 *
 * 形状上和 TextDisplayNode 是同一类（单输入 + 无输出），差别只在值类型：
 * 输入端口声明只接受 NumberValue，收到后原样显示。
 */
export class NumberDisplayNode extends Node {
  static readonly TYPE = 'number-display'
  readonly type = NumberDisplayNode.TYPE

  /** 输入端口：只接受数字 */
  readonly numberInput = new InputPort('number', {
    accepts: [NumberValue],
    label: {
      zh: '数字',
      en: 'Number',
      ja: '数値',
      ko: '숫자',
      es: 'Número',
      ar: 'رقم',
      fr: 'Nombre',
      pt: 'Número',
      ru: 'Число',
      hi: 'संख्या',
      id: 'Angka',
      de: 'Zahl',
      vi: 'Số',
      tr: 'Sayı',
      it: 'Numero'
    }
  })

  /** null 表示还没收到过值（区别于数字 0） */
  private displayed: number | null = null

  /** 数字的显示颜色，用户可在设置覆层里改；默认沿用正文色 */
  private textColor = '#1f2329'

  constructor(id: string) {
    super(id)
    this.addInput(this.numberInput)
    // 内容区硬约束：手柄 + 数字展示区，数字短，比文本展示矮一些
    this.setBox(220, 110)
  }

  /** 拖入文件落点命中本节点时被调用；本节点不接收文件，返回 false */
  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 本节点不接收文件，不处理
  }

  /** 当前展示的数值。没接输入、或上游还没算过时是 null */
  get number(): number | null {
    return this.displayed
  }

  /** 数字的显示颜色 */
  get numberColor(): string {
    return this.textColor
  }

  /** 用户在设置覆层里改了颜色：写回并通知渲染层重绘 */
  setNumberColor(color: string): void {
    if (!color || color === this.textColor) return
    this.textColor = color
    this.notifyChanged()
  }

  /** 收到通知就刷新展示，这是它唯一要做的事 */
  inputPortReceiveValue(_ports: InputPort[]): void {
    const [first] = this.numberInput.value
    this.displayed = first instanceof NumberValue ? first.value : null
    this.notifyChanged()
  }

  saveState(): Record<string, unknown> {
    // displayed 是上游派生出来的，恢复时上游 commit 会自动刷回来，不用存；
    // textColor 和 box（用户拖右下角调整过的大小）是本节点自己的状态，必须存。
    return {
      textColor: this.textColor,
      box: this.box as readonly [number, number]
    }
  }

  readState(state: Record<string, unknown>): void {
    const color = state.textColor
    if (typeof color === 'string') this.setNumberColor(color)
    // 恢复用户调整过的尺寸（老数据缺该字段时保留构造时的默认 box）
    const box = state.box
    if (Array.isArray(box) && box.length === 2 && box.every((v) => typeof v === 'number')) {
      this.setBox(box[0], box[1])
    }
    // displayed 等上游恢复后自然会刷新
  }
}
