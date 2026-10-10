import { BoolValue } from '../../engine/data/BoolValue'
import { FileValue } from '../../engine/data/FileValue'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { JsonValue } from '../../engine/data/JsonValue'
import { NumberValue } from '../../engine/data/NumberValue'
import { StringValue } from '../../engine/data/StringValue'
import { TxtFileValue } from '../../engine/data/TxtFileValue'
import { InputPort } from '../../engine/port/InputPort'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node, type InputPortChangeSource } from '../../engine/node/Node'
import { inLabel, outLabel } from './i18n'

/**
 * 透传节点（Wire）：极简的接线卡子，接受任何类型的数据、原样透传出去。
 *
 * - 一个 InputPort，accepts 覆盖所有内置 Value 子类
 * - 一个 OutputPort，**连线建立时就按上游 startPort.valueClass 对齐类型**
 *   （不依赖上游是否已经 commit 值——跟 HumanReviewNode 同构）
 *   连线断开 → 输出端口删除
 * - 有值就 commit 透传；没值（刚连线还没收到值）就只对齐端口
 *
 * 外观：小方块（90×50），只有标题 + 当前类型标签，无任何可交互控件。
 *
 * 设计同 HumanReviewNode：无上游 → 无输出端口；有连线 → 从 edge.startPort.valueClass
 * 推断上游类型，立即 create / rebuild OutputPort。
 */
export class WireNode extends Node {
  static readonly TYPE = 'wire'
  readonly type = WireNode.TYPE

  /** 所有内置 Value 子类（FileValue 覆盖 ImgFileValue / TxtFileValue 的继承链） */
  private static readonly ALL_VALUE_CLASSES = [
    StringValue, NumberValue, BoolValue, JsonValue, FileValue, ImgFileValue, TxtFileValue
  ]

  /** 输入端口：接受任何 Value（继承链覆盖所有内置类型） */
  private readonly inputPort: InputPort

  /** 输出端口：有连线时存在，valueClass 跟随上游 startPort 类型动态重建 */
  private outputPort: OutputPort | undefined

  constructor(id: string) {
    super(id)
    this.inputPort = new InputPort('in', {
      accepts: WireNode.ALL_VALUE_CLASSES,
      label: inLabel,
      isHiddenLabel: true,
    })
    this.addInput(this.inputPort)
    // 注意：构造时不加输出端口——等上游连上才动态创建（跟 HumanReviewNode 一致）
    this.setBox(70, 30)
  }

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 不接收文件
  }

  // —— 渲染层读的状态 ——

  /** 当前输出端口的类型标签名（UI 显示用）；还没建 outputPort 时返回空串 */
  get displayTypeName(): string {
    return this.outputPort?.outputValueName ?? ''
  }

  /** 是否已有输出端口（渲染层用来决定右侧端口列显隐） */
  get hasOutputPort(): boolean {
    return this.outputPort !== undefined
  }

  // —— 输入：先对齐端口类型，再透传值 ——

  inputPortReceiveValue(_ports: InputPort[], _source: InputPortChangeSource): void {
    try {
      const hasEdges = this.inputPort.incomingEdgeCount > 0
      const upstreamClass = this.resolveUpstreamValueClass()

      if (!hasEdges) {
        // 上游完全断开 → 删输出端口
        this.deleteOutputPort()
        this.notifyChanged()
        return
      }

      // —— 按上游连线的类型对齐输出端口（不依赖值是否已到达） ——
      if (upstreamClass) {
        if (!this.outputPort) {
          this.createOutputPort(upstreamClass)
        } else if (this.outputPort.valueClass !== upstreamClass) {
          this.rebuildOutputPort(upstreamClass)
        }
      }

      // —— 透传值 ——
      const [value] = this.inputPort.value
      if (value === undefined) {
        // 有连线但还没值 → 只对齐端口
        this.notifyChanged()
        return
      }
      this.outputPort!.commit(value, { force: true })
      this.notifyChanged()
    } finally {
      this.completeRun()
    }
  }

  /** 从 allBindEdge 推算上游 OutputPort 的类型（不要求值已到达） */
  private resolveUpstreamValueClass(): OutputPort['valueClass'] | undefined {
    for (const edge of this.inputPort.allBindEdge) {
      return edge.startPort.valueClass
    }
    return undefined
  }

  /** 按给定 valueClass 创建输出端口（首次有连线时） */
  private createOutputPort(valueClass: OutputPort['valueClass']): void {
    this.outputPort = new OutputPort('out', valueClass, outLabel)
    this.addOutput(this.outputPort)
  }

  /** 上游类型变了 → 拆旧建新（旧下游边随 removeOutput 自动断开） */
  private rebuildOutputPort(valueClass: OutputPort['valueClass']): void {
    if (!this.outputPort) return
    this.removeOutput(this.outputPort)
    this.outputPort = undefined
    this.createOutputPort(valueClass)
  }

  /** 上游全断 → 删输出端口 */
  private deleteOutputPort(): void {
    if (this.outputPort) {
      this.removeOutput(this.outputPort)
      this.outputPort = undefined
    }
  }

  // —— 持久化 ——

  saveState(): Record<string, unknown> {
    // 无配置字段；outputPort 由上游连线动态重建
    return {}
  }

  readState(_state: Record<string, unknown>): void {
    // 端口在构造函数里已经建好了，边接上后上游类型一来就会对齐
  }
}
