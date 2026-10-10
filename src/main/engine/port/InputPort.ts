import { Value, type ValueKind } from '../data/Value'
import type { Edge } from '../graph/Edge'
import type { Node } from '../node/Node'
import type { LocalizedText } from '../../../shared/language'
import { OutputPort } from './OutputPort'

/** 任何带 VALUE_NAME 静态属性的 Value 子类 */
type ValueClass = { readonly VALUE_NAME: ValueKind; prototype: Value; new (...args: any[]): Value }

export type InputPortBindRejectReason = 'kind-not-allowed'

export type EdgeBindingEvent =
  | { readonly kind: 'bind'; readonly edge: Edge }
  | { readonly kind: 'unbind'; readonly edge: Edge }

/** 订阅边绑定/解绑事件的回调签名 */
export type EdgeBindingListener = (event: EdgeBindingEvent) => void

export interface InputPortOptions {
  /**
   * 允许接入的 Value 子类列表。必须显式声明，空数组就是不接受任何类型——
   * 即使是透传、日志这类端口，也得给自己划出范围。
   */
  readonly accepts: readonly ValueClass[]
  /** 必填：没有任何输入（含默认值）时，节点不应运行 */
  readonly required?: boolean
  /** 未接线时可采用的值，是否采用由节点自己决定 */
  readonly defaultValue?: Value
  /** 端口文本标记（多语言），UI 显示用；可只配若干语言，未命中的语言兜底到英语。不填则显示端口的 id */
  readonly label?: LocalizedText
  /** 隐藏端口 label 文字（圆点仍然显示）。典型场景：节点内部已有文字说明每个端口的含义 */
  readonly isHiddenLabel?: boolean
}

/** 输入端口：节点接收值的入口 */
export class InputPort {
  /** 所属节点，由 Node 登记端口时注入；没人认领时，通知就没人接 */
  protected owner: Node | undefined

  /**
   * 边绑定/解绑事件的订阅者集合。外部通过 onEdgeBinding 订阅，返回的解绑函数成对使用
   */
  private readonly bindingListeners = new Set<EdgeBindingListener>()

  /** 最近一次 receive 写入的值（不管来自哪条 Edge），undefined 表示上游还没送来过任何值 */
  lastReceiveValue: Value | undefined

  /** lastReceiveValue 的来源 Edge——unbindEdge / receiveClear 时靠它判断要不要清槽位 */
  lastReceiveEdge: Edge | undefined

  /** 本端口绑定的所有 Edge（拓扑关系） */
  allBindEdge: Set<Edge> = new Set()

  /** 端口多语言标签（可运行时修改，NodeShell 画布上的端口名显示用它） */
  protected labelValue: LocalizedText | undefined

  /**
   * 锁定态：所属 Node 进入 running 时由 Node.beginRun 调用 lock() 置 true。
   * 锁定期间 incoming 照常更新（值是实时的），但不立即通知 Node——
   * 等 Node.completeRun/failRun 调 unlockAndFlush() 时统一派发。
   *
   * protected 以便 MethodPort 等子类能绕过 fingerprint 去重重写 receive。
   */
  protected locked: boolean = false

  /**
   * 锁定期间是否有变化发生（receive / receiveClear / bindEdge / unbindEdge）。
   * 解锁时 Node 根据它决定要不要把本端口加进 _onInputPortChanged 的参数列表。
   *
   * protected 以便 MethodPort 等子类能绕过 fingerprint 去重重写 receive。
   */
  protected pendingNotify: boolean = false

  /** 只读：当前是否处于锁定态（渲染层可能需要知道） */
  get isLocked(): boolean {
    return this.locked
  }

  /** 是否有解锁后待通知的变化（Node.unlockInputPorts 遍历用） */
  hasPendingChange(): boolean {
    return this.pendingNotify
  }

  /** Node.beginRun 调 — 锁定本端口，开始缓冲输入变化 */
  lock(): void {
    this.locked = true
    this.pendingNotify = false
  }

  /**
   * Node.completeRun / failRun 调 — 解锁本端口。
   * 返回 true 表示锁定期间有变化，Node 应把本端口纳入 flush 列表。
   */
  unlockAndFlush(): boolean {
    this.locked = false
    const hadPending = this.pendingNotify
    this.pendingNotify = false
    return hadPending
  }

  constructor(
    readonly id: string,
    private readonly options: InputPortOptions
  ) {
    this.labelValue = options.label
  }

  /** 运行时替换端口标签（多语言）；NodeShell 画布上显示的端口名会跟着变 */
  setLabel(label: LocalizedText): void {
    this.labelValue = label
  }

  /** 接受的类型标签名列表（从 Value 子类的静态 VALUE_NAME 提取，供 UI 展示） */
  get acceptValueNames(): readonly string[] {
    return this.options.accepts.map(cls => cls.VALUE_NAME)
  }

  get required(): boolean {
    return this.options.required ?? false
  }

  get defaultValue(): Value | undefined {
    return this.options.defaultValue
  }

  get isHiddenLabel(): boolean {
    return this.options.isHiddenLabel ?? false
  }

  /** 默认值的渲染层可读标签，没有默认值则返回 undefined */
  get defaultValueLabel(): string | undefined {
    return this.options.defaultValue?.displayLabel
  }

  /** 当前接入的边数量（渲染层用来判断"有没有接 Edge"） */
  get incomingEdgeCount(): number {
    return this.allBindEdge.size
  }

  /**
   * 渲染层 tooltip 展示用：当前生效值的 displayLabel 列表。
   * 上游有值就上游，上游空就 defaultValue，都没有返回空数组。
   */
  get currentValues(): readonly string[] {
    return this.value.map(v => v.displayLabel)
  }

  /**
   * 渲染层 tooltip 图片预览用：当前生效值里所有 FileValue 子类携带的 File 对象。
   * 无文件值返回空数组；不区分图片/文本，renderer 自己按 mimeType 过滤。
   *
   * @deprecated 请直接读 value 给 ValueRenderer，由各 renderer 自己处理图片预览
   */
  get currentValueFiles(): readonly File[] {
    const out: File[] = []
    for (const v of this.value) {
      const f = (v as { file?: File | undefined }).file
      if (f) out.push(f)
    }
    return out
  }

  /** 端口多语言标签；渲染层按当前语言解析，未配置时由渲染层回退到 id */
  get label(): LocalizedText | undefined {
    return this.labelValue
  }

  /**
   * 实际生效的值：上游有值就上游，上游空就 defaultValue，都没有返回空数组。
   * 节点应读这个，不用关心值是连来的还是默认的。
   */
  get value(): readonly Value[] {
    if (this.lastReceiveValue !== undefined) return [this.lastReceiveValue]
    return this.defaultValue ? [this.defaultValue] : []
  }

  /** 必填是否已满足；引擎的禁跑校验和节点自查共用这一处判断 */
  isSatisfied(): boolean {
    return !this.required || this.lastReceiveValue !== undefined || this.defaultValue !== undefined
  }

  /**
   * 接收上游送来（或重算后重发）的值，force=true 时跳过 fingerprint 比对直接通知节点。
   * 手动触发场景（按钮/快捷键）应透传 force=true，避免两层排重卡掉"再跑一次"的语义。
   */
  receive(edge: Edge, value: Value, force = false): void {
    const changed = force || this.lastReceiveValue?.fingerprint !== value.fingerprint
    this.lastReceiveValue = value
    this.lastReceiveEdge = edge
    if (changed) {
      if (this.locked) {
        this.pendingNotify = true
      } else {
        this.owner?._onInputPortChanged([this], 'receive')
      }
    }
  }

  receiveClear(edge: Edge): void {
    // 只有被清空的 edge 恰好是槽位里值的来源，才清槽位并通知
    if (this.lastReceiveValue !== undefined && this.lastReceiveEdge === edge) {
      this.lastReceiveValue = undefined
      this.lastReceiveEdge = undefined
      if (this.locked) {
        this.pendingNotify = true
      } else {
        this.owner?._onInputPortChanged([this], 'receiveClear')
      }
    }
    // 不是来源 edge，值保留——不触发通知
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

    return { result: true };
  }

  /** 绑定Edge：只挂拓扑关系，不清值；上游 onOutputPortBind 会按需补送 */
  bindEdge(edge: Edge) {
    this.allBindEdge.add(edge)
    if (this.locked) {
      this.pendingNotify = true
    } else {
      this.owner?._onInputPortChanged([this], 'bindEdge')
    }
    this.notifyEdgeBinding('bind', edge)
  }

  // 解绑Edge。edge 不在 allBindEdge 里就直接返回，不触发通知
  unbindEdge(edge: Edge): { result: true } | { result: false, message: string } {
    if (!this.allBindEdge.has(edge)) {
      return { result: false, message: 'edge not bound to this port' }
    }
    this.allBindEdge.delete(edge)
    const wasValueSource = this.lastReceiveEdge === edge
    if (wasValueSource) {
      // 解绑的 edge 是槽位值的来源——清槽位 + 走脏标记通知下游节点
      this.lastReceiveValue = undefined
      this.lastReceiveEdge = undefined
      if (this.locked) {
        this.pendingNotify = true
      } else {
        this.owner?._onInputPortChanged([this], 'unbindEdge')
      }
    }
    // 不是来源 edge：拓扑变化由 notifyEdgeBinding → owner.notifyChanged() 覆盖（UI 刷新），
    // 不走脏标记路径——值没变，不该触发节点重算
    this.notifyEdgeBinding('unbind', edge)
    return { result: true };
  }

  /**
   * 订阅本端口的边绑定 / 解绑事件，返回取消订阅函数。
   * 回调里带 kind 字段区分 bind / unbind，以及对应的 edge。
   */
  onEdgeBinding(fn: EdgeBindingListener): () => void {
    this.bindingListeners.add(fn)
    return () => {
      this.bindingListeners.delete(fn)
    }
  }

  private notifyEdgeBinding(kind: 'bind' | 'unbind', edge: Edge): void {
    const event: EdgeBindingEvent = kind === 'bind'
      ? { kind: 'bind', edge }
      : { kind: 'unbind', edge }
    this.bindingListeners.forEach((fn) => fn(event))
    // 同时通知所属节点：节点子类的 render 可能依赖 incomingEdgeCount 等派生状态
    this.owner?.notifyChanged()
  }
}
