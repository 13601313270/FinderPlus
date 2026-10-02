import { BoolValue } from '../../engine/data/BoolValue'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'
import type { InputPort } from '../../engine/port/InputPort'

/**
 * 布尔开关节点：源头节点，开关拨到哪边就往外送哪个布尔值。
 * 没有输入端口，只有一个布尔输出。
 *
 * 形状上和 NumberInputNode 是同一类（源头 + 单输出），差别只在值的类型标签：
 * 输出端口声明 'bool'，提交 BoolValue——下游能不能接，由引擎按类型判定，节点自己不管。
 */
export class BoolInputNode extends Node {
  static readonly TYPE = 'bool-input'
  readonly type = BoolInputNode.TYPE

  /** 输出端口：布尔 */
  readonly boolOutput = new OutputPort('bool', BoolValue, {
    zh: '布尔',
    en: 'Boolean',
    ja: 'ブール',
    ko: '불리언',
    es: 'Booleano',
    ar: 'منطقي',
    fr: 'Booléen',
    pt: 'Booleano',
    ru: 'Логическое'
  })

  private content = false

  constructor(id: string) {
    super(id)
    this.addOutput(this.boolOutput)
    // 内容区硬约束：手柄 + 开关 + padding ≈ 76px 高，宽 220px
    this.setBox(120, 68)
  }

  /** 拖入文件落点命中本节点时被调用；本节点不接收文件，返回 false */
  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 本节点不接收文件，不处理
  }

  /** 开关当前状态，UI 直接读它 */
  get bool(): boolean {
    return this.content
  }

  /** 开关拨动后把新值提交出去——这就是「节点自己的节奏」 */
  setBool(value: boolean): void {
    if (value === this.content) return
    this.content = value
    this.boolOutput.commit(new BoolValue(value))
    // 顺带通知观察者：卡片里的开关状态靠这里刷新
    this.notifyChanged()
  }

  /** 拨动开关：翻转当前状态 */
  toggle(): void {
    this.setBool(!this.content)
  }

  /** 没有输入端口，永远收不到通知 */
  inputPortReceiveValue(_ports: InputPort[]): void {}

  saveState(): Record<string, unknown> {
    return { content: this.content }
  }

  readState(state: Record<string, unknown>): void {
    // 恢复源头值 → 显式 commit，下游才能收到（哪怕恢复值与默认值相同）
    const v = typeof state.content === 'boolean' ? state.content : false
    this.content = v
    this.boolOutput.commit(new BoolValue(v))
    this.notifyChanged()
  }
}