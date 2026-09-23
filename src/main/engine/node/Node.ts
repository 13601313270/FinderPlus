import type { InputPort } from '../port/InputPort'
import type { OutputPort } from '../port/OutputPort'

/**
 * 节点基类：一堆端口 + 自己的一套参数，外加「什么时候算」的自主权。
 *
 * - 端口在子类的字段里声明，构造时用 addInput / addOutput 登记给基类。
 *   于是引擎和 UI 不必知道具体节点的形状，遍历 inputPorts / outputPorts 就够了。
 * - 节点有哪些操作、什么时候做，由节点自己定：参数变了、或输入端口通知它，它才动手。
 *   所以基类不规定操作入口——节点种类多了以后，有的节点不止一个操作（比如两个按钮各自干活），
 *   硬塞一个统一的 run() 会走不通；基类只保证「收到通知」这一个入口。
 */
export abstract class Node {
  /** 节点种类标识。端口形状、UI 图标、序列化都靠它区分 */
  abstract readonly type: string

  private readonly inputs: InputPort[] = []
  private readonly outputs: OutputPort[] = []

  /** 节点在画布上的坐标。引擎只负责存与通知，怎么拖由渲染组件决定 */
  private positionValue: [number, number] = [0, 0]

  /** 变化订阅者。UI 靠它把引擎里的普通字段同步成 Vue 响应式状态 */
  private readonly listeners = new Set<() => void>()

  constructor(readonly id: string) {}

  /** 节点当前位置（只读元组，防止外部直接改值绕过通知） */
  get position(): readonly [number, number] {
    return this.positionValue
  }

  /** 更新节点位置并通知观察者。拖拽的最终落点都走这里 */
  setPosition(x: number, y: number): void {
    this.positionValue = [x, y]
    this.notifyChanged()
  }

  /** 订阅节点变化，返回取消订阅函数 */
  onChanged(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  /** 通知所有订阅者「我的可见状态变了」。子类在状态更新的收尾调用 */
  protected notifyChanged(): void {
    this.listeners.forEach((fn) => fn())
  }

  get inputPorts(): readonly InputPort[] {
    return this.inputs
  }

  get outputPorts(): readonly OutputPort[] {
    return this.outputs
  }

  /** 子类构造时登记自己的输入端口 */
  protected addInput(port: InputPort): void {
    port.setOwner(this)
    this.inputs.push(port)
  }

  /** 子类构造时登记自己的输出端口 */
  protected addOutput(port: OutputPort): void {
    this.outputs.push(port)
  }

  /**
   * 输入端口的通知入口：有新值送来、或连线增删时被端口调用。
   *
   * 基类不给默认实现——收到通知之后做什么、要不要做，各节点差别太大：
   * 展示类要刷新界面，计算类要重算，源头节点压根收不到通知。
   * 所以这里只负责「把通知接住」，具体动作交给子类。
   */
  abstract onInputChanged(): void

  /**
   * 把节点的**内部运行状态**序列化成一个 plain object。
   *
   * 只存节点自己独有的字段（比如 TextInputNode 的 content、NumberInputNode 的 number）。
   * 基类字段（id、type、position、端口形状）由外层持久化层统一读写，子类不用管。
   *
   * 返回值必须是 JSON-safe 的（string / number / boolean / null / array / 嵌套 object），
   * 不能包含 class instance、function、undefined。
   */
  abstract saveState(): Record<string, unknown>

  /**
   * 从 saveState 返回的 plain object 里恢复节点内部状态。
   *
   * 实现时要考虑：
   * - 字段可能缺失（老版本存的数据），要给默认值或做类型守卫；
   * - 恢复源头节点的值时**应该触发输出 commit**——下游需要收到值才能正常显示；
   * - 恢复展示/计算节点的值通常是冗余的（连好边后上游 commit 会自动刷新），
   *   但写进去可以让「断开状态下也能看到上次结果」。
   */
  abstract readState(state: Record<string, unknown>): void
}