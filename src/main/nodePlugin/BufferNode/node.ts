import { BoolValue } from '../../engine/data/BoolValue'
import { FileValue } from '../../engine/data/FileValue'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { JsonValue } from '../../engine/data/JsonValue'
import { NumberValue } from '../../engine/data/NumberValue'
import { StringValue } from '../../engine/data/StringValue'
import type { Value } from '../../engine/data/Value'
import { InputPort } from '../../engine/port/InputPort'
import { MethodPort } from '../../engine/port/MethodPort'
import type { InputPortChangeSource } from '../../engine/node/Node'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'
import { inLabel, outLabel } from './i18n'

/** 缓冲区可选的数据类型（进出共用同一套 Value 子类） */
export type BufferKind = 'number' | 'string' | 'bool' | 'file' | 'imgfile' | 'json'

/** kind → Value 子类（输入 accepts 与输出 valueClass 共用这一处真相） */
const KIND_CLASSES = {
  number: NumberValue,
  string: StringValue,
  bool: BoolValue,
  file: FileValue,
  imgfile: ImgFileValue,
  json: JsonValue
} as const

/** 所有合法 kind，readState 反序列化校验用 */
const ALL_KINDS: readonly BufferKind[] = ['number', 'string', 'bool', 'file', 'imgfile', 'json']

/** 内容区尺寸：选中类型 + 计数 + 「出」按钮 */
const NODE_WIDTH = 190
const NODE_HEIGHT = 135

/**
 * 缓冲区节点抽象基类：给栈 / 队列两种结构共用的一套读写逻辑。
 *
 * - 数据类型由用户在节点上选择，选定后**输入端口与输出端口同步重建**：
 *   输入端口只接该类型的 Value，输出端口也只产出该类型的 Value。
 * - 「入」是自动的：上游送来新值就入缓冲区，不需要点按钮。
 * - 「出」由节点上的按钮触发一次，取出一项 commit 到输出端口。
 *   具体取哪一项由子类决定（FIFO 取队首，LIFO 取栈顶）——这是两个子类唯一的差异。
 * - 节点上显示当前缓冲区内的数据数量。
 *
 * 缓冲区内容不持久化：恢复后上游重新 commit 会把它再送进来（与 HumanReviewNode 一致），
 * 只持久化用户选择的 kind。
 */
export abstract class BufferNode extends Node {
  /** 当前选定的数据类型（持久化） */
  private kindValue: BufferKind = 'number'

  /** 输入端口：上游送值入口 */
  private inputPort: InputPort

  /** 输出端口：「出」操作把取出的值 commit 到这里 */
  private outputPort: OutputPort

  /** 方法端口：外部连线触发 take() 操作 */
  private methodPort: MethodPort

  /** 已进入缓冲区的数据，按进入顺序排列 */
  private readonly items: Value[] = []

  /**
   * 上一次入缓冲区的数据引用。
   * InputPort.receive 已按指纹去重（同值不重复通知），这里再挡一道 bind/unbind 引起的空通知，
   * 避免连线增删把同一个值重复入队。
   */
  private lastEnqueued: Value | undefined

  constructor(id: string) {
    super(id)
    this.inputPort = this.buildInputPort(this.kindValue)
    this.outputPort = this.buildOutputPort(this.kindValue)
    this.methodPort = new MethodPort('take', { label: outLabel })
    this.addInput(this.inputPort)
    this.addOutput(this.outputPort)
    this.addMethod(this.methodPort)
    // 方法端口被触发 → 执行 take()
    this.methodPort.onTrigger(() => this.take())
    this.setBox(NODE_WIDTH, NODE_HEIGHT)
  }

  /** 「出」操作取哪一项：FIFO 返回队首 0，LIFO 返回栈顶末尾 */
  protected abstract takeIndex(): number

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 本节点不接收文件拖入
  }

  // —— 渲染层读的状态 ——

  /** 当前选定的数据类型 */
  get displayKind(): BufferKind {
    return this.kindValue
  }

  /** 缓冲区内的数据数量 */
  get count(): number {
    return this.items.length
  }

  /** 缓冲区是否为空（用于「出」按钮 enable/disable） */
  get isEmpty(): boolean {
    return this.items.length === 0
  }

  // —— 用户操作 ——

  /** 切换数据类型：输入 / 输出端口同步重建，旧连接随端口移除自动断开 */
  setKind(kind: BufferKind): void {
    if (kind === this.kindValue) return
    this.kindValue = kind
    this.items.length = 0
    this.lastEnqueued = undefined
    this.rebuildPorts(kind)
    this.notifyChanged()
  }

  /** 出操作：取出一项 commit 到输出端口 */
  take(): void {
    if (this.items.length === 0) return
    const [value] = this.items.splice(this.takeIndex(), 1)
    if (value !== undefined) {
      this.outputPort.commit(value)
    }
    this.notifyChanged()
  }

  // —— 输入：自动入缓冲区 ——

  /**
   * 跳过脏标记——BufferNode 是状态容器（入队/出队），不是"输入→计算→输出"的节点。
   * 上游推值进队列 ≠ 输出应该跟着变（输出是用户点"出"才取的），所以没有 dirty 语义。
   */
  _onInputPortChanged(ports: InputPort[], source: InputPortChangeSource): void {
    this.inputPortReceiveValue(ports, source)
  }

  inputPortReceiveValue(_ports: InputPort[], _source: InputPortChangeSource): void {
    const [value] = this.inputPort.value
    if (value === undefined) {
      // 上游断开 / 清空：允许同一个值再次送进来时重新入缓冲区
      this.lastEnqueued = undefined
      return
    }
    if (value === this.lastEnqueued) return
    this.lastEnqueued = value
    this.items.push(value)
    this.notifyChanged()
  }

  // —— 端口构建 ——

  private buildInputPort(kind: BufferKind): InputPort {
    return new InputPort('in', {
      accepts: [KIND_CLASSES[kind]],
      label: inLabel
    })
  }

  private buildOutputPort(kind: BufferKind): OutputPort {
    return new OutputPort('out', KIND_CLASSES[kind], outLabel)
  }

  /** 按给定 kind 拆旧建新输入 / 输出端口（同 id，便于边重建时按 id 匹配） */
  private rebuildPorts(kind: BufferKind): void {
    this.removeInput(this.inputPort)
    this.removeOutput(this.outputPort)
    this.inputPort = this.buildInputPort(kind)
    this.outputPort = this.buildOutputPort(kind)
    this.addInput(this.inputPort)
    this.addOutput(this.outputPort)
  }

  // —— 持久化 ——

  /** 只存用户选择的 kind；缓冲区内容由上游重新 commit 自动重建 */
  saveState(): Record<string, unknown> {
    return { kind: this.kindValue }
  }

  readState(state: Record<string, unknown>): void {
    const kind = state.kind
    if (typeof kind === 'string' && ALL_KINDS.includes(kind as BufferKind) && kind !== this.kindValue) {
      this.kindValue = kind as BufferKind
      this.rebuildPorts(this.kindValue)
      this.notifyChanged()
    }
  }
}