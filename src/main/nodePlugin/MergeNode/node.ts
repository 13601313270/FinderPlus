import { BoolValue } from '../../engine/data/BoolValue'
import { FileValue } from '../../engine/data/FileValue'
import { ImgFileValue } from '../../engine/data/ImgFileValue'
import { JsonValue } from '../../engine/data/JsonValue'
import { NumberValue } from '../../engine/data/NumberValue'
import { StringValue } from '../../engine/data/StringValue'
import { InputPort } from '../../engine/port/InputPort'
import type { InputPortChangeSource } from '../../engine/node/Node'
import { OutputPort } from '../../engine/port/OutputPort'
import { Node } from '../../engine/node/Node'
import { outLabel } from './i18n'

/** 汇流节点可选的数据类型（与 BufferNode 完全一致） */
export type MergeKind = 'number' | 'string' | 'bool' | 'file' | 'imgfile' | 'json'

/** kind → Value 子类（所有输入 accepts 与输出 valueClass 共用这一处真相） */
const KIND_CLASSES = {
  number: NumberValue,
  string: StringValue,
  bool: BoolValue,
  file: FileValue,
  imgfile: ImgFileValue,
  json: JsonValue
} as const

/** 所有合法 kind，readState 反序列化校验用 */
const ALL_KINDS: readonly MergeKind[] = ['number', 'string', 'bool', 'file', 'imgfile', 'json']

const NODE_WIDTH = 150
const BASE_HEIGHT = 60
const PER_PORT_HEIGHT = 34

/** 输入端口最小数量 */
const MIN_PORT_COUNT = 1

/**
 * 汇流（Merge）节点：多个独立输入端口 → 一个输出端口，逐值即时透传。
 *
 * - 数据类型由用户在节点上选择，选定后所有输入端口的 accepts 和输出端口的 valueClass 同步重建。
 * - 每个输入端口是独立的（multiple=false），接受一条上游连线。
 * - 每个输入端口可独立增删，底部有 +/- 按钮。
 * - 某个输入端口收到新值 → 立即 force=true commit 到输出端口，不等其他输入、不做批量合并。
 * - 不使用 multiple:true——每个输入都是独立端口，渲染层和连线校验都更直观。
 *
 * 没有计算语义，纯粹的多入一出中继。
 */
export class MergeNode extends Node {
  static readonly TYPE = 'merge'
  readonly type = MergeNode.TYPE

  /** 当前选定的数据类型（持久化） */
  private kindValue: MergeKind = 'number'

  /** 当前输入端口数量 */
  private portCount: number

  /** 所有输入端口（独立的，不是 multiple） */
  private readonly inputPortsList: InputPort[] = []

  /** 唯一的输出端口 */
  private outputPort: OutputPort

  constructor(id: string, initialCount = MIN_PORT_COUNT) {
    super(id)
    this.portCount = Math.max(MIN_PORT_COUNT, initialCount)
    this.outputPort = this.buildOutputPort(this.kindValue)
    this.addOutput(this.outputPort)
    for (let i = 0; i < this.portCount; i++) {
      this.addInputPort(i)
    }
    this.updateBox()
  }

  isPositionAcceptFileDrop(_relativeX: number, _relativeY: number): boolean {
    return false
  }

  onFileDrop(_sourcePath: string): void {
    // 本节点不接收文件拖入
  }

  // —— 渲染层读的状态 ——

  /** 当前选定的数据类型 */
  get displayKind(): MergeKind {
    return this.kindValue
  }

  /** 当前输入端口数量 */
  get displayPortCount(): number {
    return this.portCount
  }

  // —— 用户操作 ——

  /** 切换数据类型：所有输入端口和输出端口同步重建 */
  setKind(kind: MergeKind): void {
    if (kind === this.kindValue) return
    this.kindValue = kind
    this.rebuildAllPorts()
    this.notifyChanged()
  }

  /** 在末尾追加一个输入端口 */
  addInputPortAtEnd(): void {
    this.addInputPort(this.portCount)
    this.portCount++
    this.updateBox()
    this.notifyChanged()
  }

  /** 移除第 index 个输入端口（会全部重建以保持 id 连续） */
  removeInputPortAt(index: number): void {
    if (this.portCount <= MIN_PORT_COUNT) return
    if (index < 0 || index >= this.portCount) return

    // 先全部从 Node 注销（removeInput 会自动断边）
    for (const p of this.inputPortsList) this.removeInput(p)
    this.inputPortsList.length = 0

    // 重建——跳过被移除的那一个，新的 id 从 0 连续
    const newCount = this.portCount - 1
    this.portCount = newCount
    for (let i = 0; i < this.portCount; i++) {
      this.addInputPort(i)
    }
    this.updateBox()
    this.notifyChanged()
  }

  // —— 输入：逐值即时透传 ——

  /** 跳过脏标记——Merge 是透传节点，输入变 = 立即透传，没有"脏"这个中间态 */
  _onInputPortChanged(ports: InputPort[], source: InputPortChangeSource): void {
    this.inputPortReceiveValue(ports, source)
  }

  inputPortReceiveValue(ports: InputPort[], _source: InputPortChangeSource): void {
    for (const port of ports) {
      const [value] = port.value
      if (value === undefined) continue
      // force=true：不同输入端口送来同值时不应被 OutputPort 的指纹排重误杀
      this.outputPort.commit(value, { force: true })
    }
    this.notifyChanged()
  }

  // —— 端口构建 ——

  private buildInputPort(index: number, kind: MergeKind): InputPort {
    return new InputPort(`in_${index}`, {
      accepts: [KIND_CLASSES[kind]],
      label: { zh: `入 ${index + 1}`, en: `In ${index + 1}` }
    })
  }

  private buildOutputPort(kind: MergeKind): OutputPort {
    return new OutputPort('out', KIND_CLASSES[kind], outLabel)
  }

  /**
   * 构建并登记一个输入端口。id 由 index 决定（in_0, in_1, ...）。
   */
  private addInputPort(index: number): void {
    const port = this.buildInputPort(index, this.kindValue)
    this.inputPortsList.push(port)
    this.addInput(port)
  }

  /** 按当前 kind 重建所有输入端口（断开旧边、顺序保持）。输出端口已在构造函数建好。 */
  private rebuildAllInputs(): void {
    // 全从 Node 注销
    for (const p of this.inputPortsList) this.removeInput(p)
    this.inputPortsList.length = 0
    // 重建
    for (let i = 0; i < this.portCount; i++) {
      this.addInputPort(i)
    }
  }

  /** 切换 kind 时用——输入和输出都按新 kind 重建 */
  private rebuildAllPorts(): void {
    // 输出端口
    this.removeOutput(this.outputPort)
    this.outputPort = this.buildOutputPort(this.kindValue)
    this.addOutput(this.outputPort)
    // 输入端口
    this.rebuildAllInputs()
  }

  /** 按当前端口数量更新内容区高度 */
  private updateBox(): void {
    this.setBox(NODE_WIDTH, BASE_HEIGHT + this.portCount * PER_PORT_HEIGHT)
  }

  // —— 持久化 ——

  saveState(): Record<string, unknown> {
    return { kind: this.kindValue, portCount: this.portCount }
  }

  readState(state: Record<string, unknown>): void {
    // 先处理 kind
    const kind = state.kind
    let kindChanged = false
    if (typeof kind === 'string' && ALL_KINDS.includes(kind as MergeKind) && kind !== this.kindValue) {
      this.kindValue = kind as MergeKind
      kindChanged = true
    }

    // 再处理 portCount
    const stored = state.portCount
    const newCount = typeof stored === 'number' && stored >= MIN_PORT_COUNT ? stored : this.portCount

    if (kindChanged || newCount !== this.portCount) {
      // 全部重建
      this.removeOutput(this.outputPort)
      this.outputPort = this.buildOutputPort(this.kindValue)
      this.addOutput(this.outputPort)
      this.portCount = newCount
      this.rebuildAllInputs()
      this.updateBox()
      this.notifyChanged()
    }
  }
}
