import type { InputPort } from '../port/InputPort'
import type { OutputPort } from '../port/OutputPort'
import type { Scene } from '../graph/Scene'

/**
 * 节点运行状态三态：
 *
 * - **stable**：节点的输出端口值与输入端口值匹配。不管中间经历了什么，
 *   现在 OutputPort.commit 里的值，就是用当前 InputPort 里的值算出来的。
 * - **dirty**：输入端口值变了（上游推送 / 断边 / 新连线），但输出端口
 *   还是旧值。典型场景：手动节点（ImageGenNode）收到新 prompt 但还没点生成；
 *   CommandNode 的 resolvedCommand 已重算但 textOutput 还没 commit。
 * - **running**：节点正在异步重算（如 LLM fetch、图片生成 API 调用中），
 *   期间输入再变不会打断；子类在 run 结束时显式调 completeRun()（成功）
 *   或 failRun()（失败/无产出）。多输出节点（CodeNode）在最后一个回调收口。
 *
 * 状态转换由两类驱动者协作：
 *   InputPort  → _onInputPortChanged  → markDirty       （值变了就标）
 *   子类       → beginRun / completeRun / failRun         （run 生命周期）
 *
 * 这不是「运行时错误/加载中/空闲」那种一次性 status 字段——
 * 那是子类自己的 UI 内部状态（status: 'loading' | 'done' | 'error'），
 * 而 nodeState 是**引擎层的因果关系描述**，渲染层可以据此画出 dirty 标记、
 * running 动画等视觉提示。
 */
export type NodeState = 'stable' | 'dirty' | 'running'

/**
 * 节点右键菜单项描述符。run 必填——所有操作的执行函数都由节点自己声明，
 * 避免 App.vue 维护一个按 id 分发的 handler Map（节点种类一多就无限膨胀）。
 *
 * 通用操作（如 delete）的 run 在基类 contextMenuItems 里给默认实现，
 * 子类专属操作（如 TextInputNode 的"清空"）直接在自己的 override 里追加，
 * App.vue 不再需要感知任何具体操作。
 */
export interface NodeMenuItem {
  /** 操作唯一标识 */
  readonly id: string
  /** 菜单显示文案 */
  readonly label: string
  /** 是否为危险操作（删除等，UI 会高亮成红色） */
  readonly danger?: boolean
  /** 点击时的执行函数，必填——同步或异步均可 */
  readonly run: () => void | Promise<void>
}

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

  /**
   * 节点在画布上的坐标，语义是**相对直接父容器的局部坐标**：
   * 被容器节点（FolderNode 等）收养时，存的是相对该容器的偏移；
   * 顶级节点（无 containerNode）的父容器就是画布根部，此时局部坐标 == 世界坐标。
   *
   * 靠 DOM 嵌套让浏览器逐级累加渲染，几何/命中测量才需要世界坐标——
   * 那走 `worldPosition` getter 沿容器链累加，不要在本类里做过深的 offset 拼接。
   * 引擎只负责存与通知，怎么拖由渲染组件决定。
   */
  private positionValue: [number, number] = [0, 0]

  /**
   * 内容区宽高（世界像素，只算 NodeShell 中间内容区，不含左右端口列）。
   * 任一维为 0 表示「该轴不约束、随内容撑开」。由子类构造时用 setBox 声明自己的框。
   */
  private boxValue: [number, number] = [0, 0]

  /** 变化订阅者。UI 靠它把引擎里的普通字段同步成 Vue 响应式状态 */
  private readonly listeners = new Set<() => void>()

  /**
   * 引擎层因果状态：stable = 输出匹配当前输入，dirty = 输入变了但输出没跟上，
   * running = 正在异步重算。具体转换时机见 markDirty / beginRun / markStable。
   */
  private nodeState: NodeState = 'stable'

  /** 对外只读的节点运行状态 */
  get state(): NodeState {
    return this.nodeState
  }

  /**
   * 标为 dirty：内部方法，只允许 _onInputPortChanged 和 failRun 调。
   * 外部（InputPort / 子类）不应直接调——脏标记的完整事务由基类统一收口。
   */
  private markDirty(): void {
    if (this.nodeState === 'dirty') return
    this.nodeState = 'dirty'
    console.log('markDirty', this.type, this.nodeState)
    this.notifyChanged()
  }

  /**
   * 标为 running：子类开始异步重算前调（比如发 LLM 请求、调图片生成 API）。
   * 必须成对——结束后调 completeRun()（成功产出）或 failRun()（失败/无产出）。
   * 同步重算（CommandNode.inputPortReceiveValue 里的 recompute）不需要调，
   * 因为它没有异步间隙。
   *
   * 从 stable 或 dirty 都可以进 running（语义分别是"开始算之前的"和"开始算新的"）。
   */
  protected beginRun(): void {
    if (this.nodeState === 'running') return
    this.nodeState = 'running'
    this.notifyChanged()
  }

  /**
   * 成功结束异步 run：running → stable。
   *
   * 子类在 run 完成（包括所有 OutputPort.commit 都已提交）时调用。
   * 多输出节点（CodeNode）在最后一个回调（onComplete/onError）里调，
   * 而不是每个 commit 之后——因为 commit 可能被异步触发多次。
   *
   * 如果 running 期间输入又变了（InputPort 会 markDirty），
   * 这里回的 stable 会被后续的 dirty 覆盖——这是预期行为。
   */
  protected completeRun(): void {
    if (this.nodeState === 'running') {
      this.nodeState = 'stable'
      this.notifyChanged()
    }
  }

  /**
   * 失败结束异步 run：running → dirty。
   *
   * commit 没成功（API 报错 / Stale-call 守卫丢弃 / 用户取消）时调。
   * 语义：刚才那次尝试没产出新值，输出端口还是旧快照，
   * 所以节点回到 dirty（输入可能已变，也可能没变；保守标 dirty 让用户决定要不要再跑）。
   */
  protected failRun(): void {
    if (this.nodeState === 'running') {
      this.markDirty()
    }
  }

  /**
   * 输入端口变化的统一入口：脏标记 + 通知子类，一个事务，外部只调这一个。
   *
   * InputPort 的四个入口（receive / receiveClear / bindEdge / unbindEdge）
   * 都走这里——"输入变了 = 节点脏了 + 子类要知道"是不可分割的业务语义，
   * 拆成两个独立调用方容易漏调其中一个。
   *
   * @param ports 触发本次变化的端口列表（通常只有一个）。
   */
  _onInputPortChanged(ports: InputPort[]): void {
    this.markDirty()
    this.inputPortReceiveValue(ports)
  }

  /** 所属 Scene 引用，由 Scene.addNode 时注入。右键菜单的通用操作（如删除）、
   * 以及容器节点（FolderNode）的收养/释放都需要它 */
  protected sceneRef?: Scene

  /**
   * 容器归属标记：被容器节点（如 FolderNode）收养时指向该容器，孤儿为 undefined。
   * 装载/释放由容器节点（FolderNode）显式管理，不走 setter 派发——它只是归属标记，
   * 不是核心状态，不需要通知观察者。子节点仍留在同一 Scene（扁平收养），
   * position 也随之成为**相对本容器的局部坐标**，世界坐标靠 worldPosition 沿此链累加。
   * 边按端口对象引用连接，收养/释放都不破坏边。
   */
  containerNode?: Node

  constructor(readonly id: string) { }

  /** 节点当前位置（只读元组，防止外部直接改值绕过通知）。相对直接父容器的局部坐标 */
  get position(): readonly [number, number] {
    return this.positionValue
  }

  /**
   * 世界坐标 = 自身局部坐标 + 沿 containerNode 祖先链逐级累加的局部坐标。
   * 顶级节点（无容器）时直接等于 position。几何测量（连线/命中/小地图）都用它，
   * 不要手搓逐层 offset。
   */
  get worldPosition(): readonly [number, number] {
    let x = this.positionValue[0]
    let y = this.positionValue[1]
    let parent = this.containerNode
    while (parent) {
      const [px, py] = parent.positionValue
      x += px
      y += py
      parent = parent.containerNode
    }
    return [x, y]
  }

  /** 更新节点位置并通知观察者。拖拽的最终落点都走这里 */
  setPosition(x: number, y: number): void {
    this.positionValue = [x, y]
    this.notifyChanged()
  }

  /** 内容区宽高（只读元组，0 表示该轴不约束）。硬约束渲染靠它 */
  get box(): readonly [number, number] {
    return this.boxValue
  }

  /**
   * 设置内容区宽高并通知观察者。子类构造时声明自己的框、或尺寸变化时调用。
   * 求整避免 sub-pixel 造成连线/小地图抖动；负值夹到 0。
   */
  setBox(width: number, height: number): void {
    const w = Math.max(0, Math.round(width))
    const h = Math.max(0, Math.round(height))
    if (w === this.boxValue[0] && h === this.boxValue[1]) return
    this.boxValue = [w, h]
    this.notifyChanged()
  }

  /** 订阅节点变化，返回取消订阅函数 */
  onChanged(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  /** 通知所有订阅者「我的可见状态变了」。子类和引擎内部组件（InputPort 绑定/解绑）都会调用 */
  notifyChanged(): void {
    this.listeners.forEach((fn) => fn())
  }

  get inputPorts(): readonly InputPort[] {
    return this.inputs
  }

  get outputPorts(): readonly OutputPort[] {
    return this.outputs
  }

  /** 子类构造时登记自己的输入端口；运行时也可追加，会自动 notifyChanged 刷新 UI */
  protected addInput(port: InputPort): void {
    port.setOwner(this)
    this.inputs.push(port)
    this.notifyChanged()
  }

  /**
   * 子类登记输出端口；运行时也可追加，会自动 notifyChanged 刷新 UI。
   *
   * @param port 要登记的端口
   * @param index 可选——指定插入位置。不传时默认 push 到末尾；
   *   动态端口重建时用它把新端口插回原索引位置，保持 outputs 数组顺序稳定。
   */
  protected addOutput(port: OutputPort, index?: number): void {
    port.setOwner(this)
    if (index !== undefined) {
      this.outputs.splice(index, 0, port)
    } else {
      this.outputs.push(port)
    }
    this.notifyChanged()
  }

  /**
   * 运行时移除输入端口。自动断开所有 incoming 边（通过 Scene.removeEdge）。
   * Scene 未绑定时仅从数组移除——端口无 Scene 引用，无法自行断边。
   */
  protected removeInput(port: InputPort): void {
    const idx = this.inputs.indexOf(port)
    if (idx === -1) return

    // 从数组移除
    this.inputs.splice(idx, 1)

    // 断边（InputPort.incoming 是 Map，取 .keys() 拿到 Edge 迭代器）
    this.disconnectPortEdges(port.incoming.keys())
    this.notifyChanged()
  }

  /**
   * 运行时移除输出端口。自动断开所有下游边（通过 Scene.removeEdge）。
   */
  protected removeOutput(port: OutputPort): void {
    const idx = this.outputs.indexOf(port)
    if (idx === -1) return

    this.outputs.splice(idx, 1)
    this.disconnectPortEdges(port.edges)
    this.notifyChanged()
  }

  /**
   * 批量断开一组 Edge，委托 sceneRef.removeEdge。
   * 供 removeInput / removeOutput 共用——两端口存储的边引用类型不同但 Edge 是同一个类。
   */
  private disconnectPortEdges(edges: Iterable<import('../graph/Edge').Edge>): void {
    const scene = this.sceneRef
    if (!scene) return
    for (const edge of edges) {
      scene.removeEdge(edge)
    }
  }

  /**
   * 外部文件拖入画布、落点命中本节点内容区时被调用（渲染进程在 drop 时触达）。
   *
   * @param relativeX 相对节点位置的 X 坐标
   * @param relativeY 相对节点位置的 Y 坐标
   * @returns true = 本节点劫持该文件（渲染进程不再新建节点）；false = 不处理
   *
   * 引擎层只拿结果：文件复制由渲染进程经 IPC copyPath 完成，节点不碰 Electron。
   */
  abstract isPositionAcceptFileDrop(relativeX: number, relativeY: number): boolean
  abstract onFileDrop(sourcePath: string): void

  public isInFileDropZoneValue: boolean = false
  public setIsInFileDropZoneValue(newValue: boolean) {
    this.isInFileDropZoneValue = newValue
    this.notifyChanged()
  }

  /** 节点拖拽悬停态底层值（独立于文件悬停态 isInFileDropZoneValue）。对外用 get isInNodeDropZone */
  public isInNodeDropZoneValue: boolean = false

  testIsInFileDropZone(relativeX: number, relativeY: number): boolean {
    const newValue = this.isPositionAcceptFileDrop(relativeX, relativeY)
    const hasChange = newValue !== this.isInFileDropZoneValue
    if (hasChange) {
      this.setIsInFileDropZoneValue(newValue)
    }
    return newValue
  }

  /**
   * 节点拖入判定：另一个节点（source）被拖到本节点上时，本节点决定是否接受它。
   *
   * 与文件拖入（isPositionAcceptFileDrop/onFileDrop）对称但接收的是 **Node 实例本身**——
   * 接受方持有被拖节点的引用，可实时订阅它并从其输出端口读数据。
   *
   * 默认拒绝（返回 false）。需要接受节点拖入的节点（如图片压缩节点）override 它。
   */
  isPositionAcceptNodeDrop(_source: Node): boolean {
    return false
  }

  /**
   * 节点 drop 结算：被拖节点（source）松手落在本节点上、且接受判定通过时被调用。
   *
   * @param source  被拖节点
   * @param startPos source 在拖拽开始前的局部坐标（相对其父容器）——目标节点自行决定
   *                 是否还原：像 ImageCompressNode 这种"一次性工作"节点应还原位置，
   *                 FolderNode 这种"收养"节点则不还原（子节点归位到槽位就是新位置）
   * @returns true = 本节点接管该被拖节点（不再视为普通移动）；false = 不处理
   */
  onNodeDrop(_source: Node, _startPos: readonly [number, number]): boolean {
    return false
  }

  /** 节点拖拽悬停态：dragover 划过本节点且愿意接受时为 true。与文件悬停态（isInFileDropZoneValue）独立 */
  get isInNodeDropZone(): boolean {
    return this.isInNodeDropZoneValue
  }

  /** 供子类/渲染层写入悬停态；有变化才写并通知观察者 */
  setIsInNodeDropZoneValue(newValue: boolean): void {
    if (newValue === this.isInNodeDropZoneValue) return
    this.isInNodeDropZoneValue = newValue
    this.notifyChanged()
  }

  /**
   * 节点拖入的接受判定 + 悬停态联动（仿 testIsInFileDropZone）：
   * 算 isPositionAcceptNodeDrop(source) → 有变化才写悬停态 → 返回是否接受。
   * 拖拽 move 时对候选目标调用，实现方不需自己维护悬停态。
   */
  testAcceptNodeDrop(source: Node): boolean {
    const ok = this.isPositionAcceptNodeDrop(source)
    this.setIsInNodeDropZoneValue(ok)
    return ok
  }

  /** 渲染层用：拖拽离开目标或 drop 结束时清除悬停态 */
  clearNodeDropActive(): void {
    this.setIsInNodeDropZoneValue(false)
  }

  // —— 被拖节点自身的"即将被接走"视觉态 ——

  /** 我（作为被拖节点）正被某个可接收节点悬停命中 */
  public nodeDropAcceptedValue: boolean = false

  /** App 在 pointermove 扫描到有目标接受我时调 true，否则清 false；有变化才 notifyChanged */
  setNodeDropAccepted(newValue: boolean): void {
    if (newValue === this.nodeDropAcceptedValue) return
    this.nodeDropAcceptedValue = newValue
    this.notifyChanged()
  }

  /** pointerup 之后清除（无论成功被收养还是拖走） */
  clearNodeDropAccepted(): void {
    this.setNodeDropAccepted(false)
  }


  /**
   * 绑定所属 Scene，由 Scene.addNode 调用。
   * 节点自身不应主动调它——节点跟 Scene 的关系是 Scene 主动接管的。
   */
  bindScene(scene: Scene): void {
    this.sceneRef = scene
  }

  /**
   * 输入端口的通知入口：有新值送来、或连线增删时被端口调用。
   *
   * 基类不给默认实现——收到通知之后做什么、要不要做，各节点差别太大：
   * 展示类要刷新界面，计算类要重算，源头节点压根收不到通知。
   * 所以这里只负责「把通知接住」，具体动作交给子类。
   *
   * @param ports 触发本次通知的端口列表（通常只有一个；未来需要多个端口联动判定
   *              时可以一次传多个，比如"图片+尺寸两个端口都齐了才算就绪"）。
   *
   * 可以返回 Promise——需要异步 IPC（如落盘）的节点 await 即可，基类不强同步。
   */
  abstract inputPortReceiveValue(ports: InputPort[]): Promise<void> | void

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

  /**
   * 删除前钩子，异步。Scene.removeNode 会先 await 它再真正断开边、删记录、落库。
   * 子类 override 做清理工作——比如 FileNode 需要先删文件系统里的文件，
   * 或者展示节点需要弹确认框。
   *
   * 基类空实现：大部分节点没有异步清理需求，不强制 override。
   * 这里不做 try/catch，子类抛出的错误会中断删除流程（Scene 会直接冒泡），
   * 让调用方决定要不要吞。
   */
  beforeDestroy(): Promise<void> | void {
    // 默认什么也不做
  }

  /**
   * 右键菜单项声明。子类按需要 override，在 super 返回的基础上追加自己的项。
   *
   * 默认包含「删除节点」——run 依赖 bindScene 注入的 sceneRef。
   * 子类如果有专属操作（如 TextInputNode 的「清空内容」），override 时追加即可，
   * 不需要改动 App.vue。
   */
  contextMenuItems(): NodeMenuItem[] {
    return [
      {
        id: 'delete',
        label: '删除节点',
        danger: true,
        run: async () => {
          const scene = this.sceneRef
          if (scene) await scene.removeNode(this)
        }
      }
    ]
  }
}