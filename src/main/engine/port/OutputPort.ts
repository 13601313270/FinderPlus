import type { Value, ValueKind } from '../data/Value'
import type { Edge } from '../graph/Edge'
import type { Node } from '../node/Node'
import type { LocalizedText } from '../../../shared/language'

/** 任何带 VALUE_NAME 静态属性的 Value 子类 */
type ValueClass = { readonly VALUE_NAME: ValueKind; prototype: Value; new (...args: any[]): Value }

export type EdgeConnectionEvent =
  | { readonly kind: 'connect'; readonly edge: Edge }
  | { readonly kind: 'disconnect'; readonly edge: Edge }

/** 订阅边接入/接出事件的回调签名 */
export type EdgeConnectionListener = (event: EdgeConnectionEvent) => void

/**
 * 输出端口：节点产出值的出口。
 * 端口不持有字节，只记住「我的值是什么、是否过期、通向哪些连线」。
 */
export class OutputPort {
  /**
   * 挂在本端口上的下游连线。值只有一份，边可以有多条。
   *
   * 连线的增删一律通过 addEdge / removeEdge（由 EdgeBinder 调用），
   * 内部会派发 connect / disconnect 事件。
   */
  readonly edges = new Set<Edge>()

  /** 边接入/接出事件的订阅者集合 */
  private readonly connectionListeners = new Set<EdgeConnectionListener>()

  /** 当前值，undefined 表示该节点从未计算过 */
  private currentValue: Value | undefined

  /** 所属节点，由 Node 登记端口时注入 */
  private owner: Node | undefined

  /** 本端口产出的 Value 子类 */
  readonly valueClass: ValueClass

  /** 本端口产出的类型标签名（valueClass.VALUE_NAME 的快捷访问，供 UI 展示） */
  readonly outputValueName: ValueKind

  private labelValue: LocalizedText

  constructor(
    readonly id: string,
    /** 本端口产出的 Value 子类，端口自动从其静态 VALUE_NAME 取类型标签 */
    valueClass: ValueClass,
    /** 端口文本标记（多语言），UI 显示用；可只配若干语言，未命中的语言兜底到英语 */
    label: LocalizedText
  ) {
    this.valueClass = valueClass
    this.outputValueName = valueClass.VALUE_NAME
    this.labelValue = label
  }

  get label(): LocalizedText {
    return this.labelValue
  }

  /** 运行时更新端口标签（多语言）（CodeNode 等需要动态改名时用） */
  setLabel(name: LocalizedText): void {
    this.labelValue = name
  }

  get value(): Value | undefined {
    return this.currentValue
  }

  /**
   * 渲染层 tooltip 展示用：当前产出值的 displayLabel。
   * 没有产出过值（节点没跑过 / clear 过）时返回 undefined。
   */
  get currentValueLabel(): string | undefined {
    return this.currentValue?.displayLabel
  }

  /**
   * 渲染层 tooltip 图片预览用：如果当前产出值是 FileValue 子类，返回它携带的 File 对象。
   * 非文件值 / 还没产出值时均为 undefined。
   */
  get currentValueFile(): File | undefined {
    return (this.currentValue as { file?: File | undefined } | undefined)?.file
  }

  /** 认领：由 Node 登记端口时调用。让端口能反查所属节点（Edge 存 DB 时需要 start_node_id） */
  setOwner(owner: Node): void {
    this.owner = owner
  }

  /** 取所属节点，可能为 undefined（极端情况下端口未被 Node 认领） */
  getOwner(): Node | undefined {
    return this.owner
  }

  /**
   * 接入一条下游边，供 EdgeBinder.connect 调用。内部派发 connect 事件。
   * 边已存在则忽略，不重复通知。
   */
  addEdge(edge: Edge): void {
    if (this.edges.has(edge)) return
    this.edges.add(edge)
    this.notifyConnection('connect', edge)
  }

  /**
   * 接出一条下游边，供 EdgeBinder.disconnect 调用。内部派发 disconnect 事件。
   * 边不存在则忽略，不触发通知。
   */
  removeEdge(edge: Edge): void {
    if (!this.edges.has(edge)) return
    this.edges.delete(edge)
    this.notifyConnection('disconnect', edge)
  }

  /**
   * 订阅本端口的边接入 / 接出事件，返回取消订阅函数。
   * 回调里带 kind 字段区分 connect / disconnect，以及对应的 edge。
   */
  onEdgeConnection(fn: EdgeConnectionListener): () => void {
    this.connectionListeners.add(fn)
    return () => {
      this.connectionListeners.delete(fn)
    }
  }

  private notifyConnection(kind: 'connect' | 'disconnect', edge: Edge): void {
    const event: EdgeConnectionEvent = kind === 'connect'
      ? { kind: 'connect', edge }
      : { kind: 'disconnect', edge }
    this.connectionListeners.forEach((fn) => fn(event))
  }

  /**
   * 提交一次计算结果，返回「本次是否真的变了」——按指纹比对，而不是按引用。
   * 引擎只在 changed 时沿 edges 向后派发，这就是整条脏传播链的起点。
   *
   * @param opts.force 手动触发场景传 true，绕过 fingerprint 比对直接派发。
   *   典型：TextInputNode 点发送、BufferNode 点"出"、HumanReviewNode 点同意/拒绝。
   *   自动计算节点（LLM、HTTP、图片处理等）一律用默认 false，靠指纹排重防连锁重算。
   */
  commit(value: Value, opts?: { force?: boolean }): boolean {
    const changed = opts?.force === true || this.currentValue?.fingerprint !== value.fingerprint
    this.currentValue = value
    if (changed) {
      // 通知 Edge 有新的值；force 向下透传到 InputPort.receive，让整条链路跳过排重
      this.edges.forEach(edge => edge.transferData(value, opts?.force === true))
      // 注意：**不在此处回 stable**——节点可能有多个 OutputPort，也可能在 running 期间多次 commit
      // （如 CodeNode 在用户代码的 Promise.then/setTimeout 里不断 callOutputPort）。
      // 何时从 running 回到 stable，由子类自己在 run 结束时显式调 completeRun()。
    }
    return changed
  }

  /**
   * 清空当前值并沿 edges 向后派发"清空"信号。
   * 给中间节点用：上游值消失时（断边/上游节点被删），中间节点不仅要
   * 让自己的输入端变空，还要通知下游清空它缓存的那个旧值。
   *
   * 已空则跳过——防止重复触发下游不必要的刷新。
   */
  clear(): void {
    if (this.currentValue === undefined) return
    this.currentValue = undefined
    this.edges.forEach(edge => edge.transferClear())
  }
}
