import { Value, type ValueKind } from '../data/Value'
import type { Edge } from '../graph/Edge'
import type { Node } from '../node/Node'
import { OutputPort } from './OutputPort'

/** 任何带 VALUE_NAME 静态属性的 Value 子类 */
type ValueClass = { readonly VALUE_NAME: ValueKind; prototype: Value; new (...args: any[]): Value }

export type InputPortBindRejectReason = 'kind-not-allowed' | 'single-port-occupied'

export interface InputPortOptions {
  /**
   * 允许接入的 Value 子类列表。必须显式声明，空数组就是不接受任何类型——
   * 即使是透传、日志这类端口，也得给自己划出范围。
   */
  readonly accepts: readonly ValueClass[]
  /** 必填：没有任何输入（含默认值）时，节点不应运行 */
  readonly required?: boolean
  /** 多值：允许多条连线接入，值按无序集合语义看待 */
  readonly multiple?: boolean
  /** 未接线时可采用的值，是否采用由节点自己决定 */
  readonly defaultValue?: Value
  /** 端口文本标记，UI 显示用；不填则回退到 id */
  readonly label?: string
}

/** 输入端口：节点接收值的入口 */
export class InputPort {
  /** 所属节点，由 Node 登记端口时注入；没人认领时，通知就没人接 */
  private owner: Node | undefined

  /**
   * 边 -> 该边最后一次送来的值。
   * 值为 undefined 表示「连线已建立，但上游还没送来过值」。
   *
   * 连线的增删由 EdgeBinder 收口（它得同时改两端，只有它知道全貌）；
   * 而值的写入是单点操作，不涉及多指针一致，所以 receive 自己管。
   */
  readonly incoming = new Map<Edge, Value | undefined>()

  constructor(
    readonly id: string,
    private readonly options: InputPortOptions
  ) { }

  /** 接受的类型标签名列表（从 Value 子类的静态 VALUE_NAME 提取，供 UI 展示） */
  get acceptValueNames(): readonly string[] {
    return this.options.accepts.map(cls => cls.VALUE_NAME)
  }

  get required(): boolean {
    return this.options.required ?? false
  }

  get multiple(): boolean {
    return this.options.multiple ?? false
  }

  get defaultValue(): Value | undefined {
    return this.options.defaultValue
  }

  get label(): string {
    return this.options.label ?? this.id
  }

  /** 多值端口取值：无序集合，只含算出来有值的那些 */
  get value(): readonly Value[] {
    const list: Value[] = []
    this.incoming.forEach((value) => {
      if (value !== undefined) list.push(value)
    })
    return list
  }

  /** 必填是否已满足；引擎的禁跑校验和节点自查共用这一处判断 */
  isSatisfied(): boolean {
    return !this.required || this.value.length > 0 || this.defaultValue !== undefined
  }

  /**
   * 接收上游送来（或重算后重发）的值，返回本次是否真的变了。
   * 只有真的变了才置脏——上游算完发现没变，下游就不会被打扰。
   */
  receive(edge: Edge, value: Value): void {
    const changed = this.incoming.get(edge)?.fingerprint !== value.fingerprint
    this.incoming.set(edge, value)
    if (changed) {
      this.owner?.inputPortReceiveValue([this])
    }
  }

  /**
   * 接收上游发来的"清空值"信号。
   * 与 unbindEdge（断边时整条边关系一起删掉）不同——receiveClear 只清值、
   * 保留边本身。场景：中间节点的 OutputPort.clear() 沿 edges 派发清空，
   * 下游的边还在（连线没断），只是上游这次不再产出任何值。
   *
   * 只有这条边之前**确实有值**时才触发 inputPortReceiveValue——否则重复清没意义。
   */
  receiveClear(edge: Edge): void {
    const hadValue = this.incoming.get(edge) !== undefined
    this.incoming.set(edge, undefined)
    if (hadValue) {
      this.owner?.inputPortReceiveValue([this])
    }
  }

  /** 认领：由 Node 登记端口时调用 */
  setOwner(owner: Node): void {
    this.owner = owner
  }

  /** 取所属节点，可能为 undefined（极端情况下端口未被 Node 认领） */
  getOwner(): Node | undefined {
    return this.owner
  }

  /**
   * 能不能接入某种类型。连线前的校验只跟「端口规则 + 上游类型」有关，跟边本身无关——
   * 所以这里收的是 OutputPort，不是整条 Edge：UI 拖拽连线时也能拿它做实时判定，
   * 不必自己抄一遍规则，更不必先造一条边。
   *
   * 用类引用 + prototype chain 比较：输出端口的 valueClass 等于或继承自 accepts 里的某个类就算通过，
   * 例如 accepts: [FileValue] 可以接住 OutputPort(TxtFileValue) 的输出。
   */
  canBindEdge(startPort: OutputPort): { result: true } | { result: false, message: InputPortBindRejectReason } {
    const outCls = startPort.valueClass
    const allowed = this.options.accepts.some(
      cls => outCls === cls || outCls.prototype instanceof cls
    )
    if (!allowed) {
      return { result: false, message: 'kind-not-allowed' }
    }

    if (this.multiple === false && this.incoming.size > 0) {
      return { result: false, message: 'single-port-occupied' }
    }
    return { result: true };
  }

  /** 绑定Edge，设置值为undefined */
  bindEdge(edge: Edge) {
    this.incoming.set(edge, undefined)
    this.owner?.inputPortReceiveValue([this])
  }

  // 解绑Edge，清空值为undefined
  unbindEdge(edge: Edge): { result: true } | { result: false, message: string } {
    this.incoming.delete(edge)
    this.owner?.inputPortReceiveValue([this])
    return { result: true };
  }
}
