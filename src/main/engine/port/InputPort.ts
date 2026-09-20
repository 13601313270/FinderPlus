import type { Value, ValueKind } from '../data/Value'
import type { Edge } from '../graph/Edge'

export type InputPortBindRejectReason = 'kind-not-allowed' | 'single-port-occupied'

export interface InputPortOptions {
  /**
   * 允许接入的值类型。必须显式声明，空数组就是不接受任何类型——
   * 即使是透传、日志这类端口，也得给自己划出范围。
   */
  readonly accepts: readonly ValueKind[]
  /** 必填：没有任何输入（含默认值）时，节点不应运行 */
  readonly required?: boolean
  /** 多值：允许多条连线接入，值按无序集合语义看待 */
  readonly multiple?: boolean
  /** 未接线时可采用的值，是否采用由节点自己决定 */
  readonly defaultValue?: Value
}

/** 输入端口：节点接收值的入口 */
export class InputPort {
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

  get accepts(): readonly ValueKind[] {
    return this.options.accepts
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
      // 通知节点
    }
  }

  /** 是否能绑定Edge */
  canBindEdge(edge: Edge): { result: true } | { result: false, message: InputPortBindRejectReason } {
    // 检查值类型是否符合要求
    const kind = edge.startPort.kind
    if (!this.accepts.includes(kind)) {
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
    // 通知节点
  }

  // 解绑Edge，清空值为undefined
  unbindEdge(edge: Edge): { result: true } | { result: false, message: string } {
    this.incoming.delete(edge)
    // 通知节点
    return { result: true };
  }
}