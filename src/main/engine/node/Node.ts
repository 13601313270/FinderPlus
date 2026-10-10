import type { InputPort } from '../port/InputPort'
import type { MethodPort } from '../port/MethodPort'
import type { OutputPort } from '../port/OutputPort'
import type { Scene } from '../graph/Scene'
import type { Edge } from '../graph/Edge'

/**
 * 节点运行状态四态：
 *
 * - **stable**：节点的输出端口值与输入端口值匹配。不管中间经历了什么，
 *   现在 OutputPort.commit 里的值，就是用当前 InputPort 里的值算出来的。
 * - **dirty**：输入端口值变了（上游推送 / 断边 / 新连线），但输出端口
 *   还是旧值。典型场景：手动节点（ImageGenNode）收到新 prompt 但还没点生成；
 *   CommandNode 的 resolvedCommand 已重算但 textOutput 还没 commit。
 * - **running**：节点正在异步重算（如 LLM fetch、图片生成 API 调用中），
 *   期间输入再变不会打断；子类在 run 结束时显式调 completeRun()（成功）
 *   或 failRun()（失败/无产出）。多输出节点（CodeNode）在最后一个回调收口。
 * - **error**：异步 run 结束但没有产出（计算报错、API 挂了、脚本抛异常）。
 *   输入没变、输出也没变——不是「输入→输出」的因果链断了，而是「计算」环节挂了。
 *   error 期间上游再推值，会先转为 dirty（输入真的变了）；子类也可以直接 beginRun
 *   从 error 再跑一次。
 *
 * 状态转换由两类驱动者协作：
 *   InputPort  → _onInputPortChanged  → markDirty / error→dirty
 *   子类       → beginRun / completeRun / failRun
 *
 * 这不是「运行时错误/加载中/空闲」那种一次性 status 字段——
 * 那是子类自己的 UI 内部状态（status: 'loading' | 'done' | 'error'），
 * 而 nodeState 是**引擎层的因果关系描述**，渲染层可以据此画出 dirty 标记、
 * running 动画、error 红框等视觉提示。
 */
export type NodeState = 'stable' | 'dirty' | 'running' | 'error'

/** InputPort 触发 _onInputPortChanged 的四种来源，与 InputPort 的四个入口一一对应 */
export type InputPortChangeSource = 'receive' | 'receiveClear' | 'bindEdge' | 'unbindEdge'

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
  private readonly methods: MethodPort[] = []

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

  /** @ts-expect-error 先写入不读取——后续 _onInputPortChanged 的 fingerprint 比对会用到 */
  private stableInputFingerprint: string | null = null

  /**
   * 当前脏的输入端口 id 集合——Node 处于 dirty 状态时，这里就是"哪些输入变了导致脏"。
   * running 期间端口被锁住，变化先缓冲在 InputPort.pendingNotify，completeRun/failRun
   * 解锁 flush 时才把这些端口加进来。
   * 成功 completeRun 且无 flush 变化时清空——所有端口值都被"消化"了。
   */
  private readonly dirtyInputs = new Set<string>()

  private computeInputFingerprint(): string {
    return this.inputPorts
      .map(p => {
        const fps = p.value.map(v => v.fingerprint).join('|')
        return `${p.id}:${fps}`
      })
      .join('::')
  }

  /** 对外只读的节点运行状态 */
  get state(): NodeState {
    return this.nodeState
  }

  /**
   * 查询脏的输入端口 id 集合。渲染层据此给端口加视觉标记。
   * 返回的是只读快照（new Set 包装），防止外部修改内部状态。
   */
  getDirtyInputPortIds(): ReadonlySet<string> {
    return new Set(this.dirtyInputs)
  }

  /**
   * 输入端口变化的统一入口：脏标记 + 通知子类，一个事务，外部只调这一个。
   *
   * InputPort 的四个入口（receive / receiveClear / bindEdge / unbindEdge）
   * 都走这里——"输入变了 → 子类要知道"是不可分割的业务语义，
   * 拆成两个独立调用方容易漏调其中一个。
   *
   * 默认行为会做脏标记（dirtyInputs + nodeState → dirty + notifyChanged）。
   * 子类可以 override 跳过脏标记——典型如 BufferNode/QueueNode/StackNode，
   * 它们是状态容器（入队/出队），输入≠计算输出，没有"脏"这个概念。
   * 源头节点（无输入端口）不会被调到这里，不需要 override。
   *
   * @param ports 触发本次变化的端口列表（通常只有一个）。
   * @param source 触发来源：上游推值 / 上游清空 / 新连线 / 断边。
   */
  _onInputPortChanged(ports: InputPort[], source: InputPortChangeSource): void {
    // bindEdge 只是新连线建立，源头节点可能不补送值（如 TextInputNode 的 auto-send: false）。
    // 此时输入端口只是多了一个 undefined 占位，没有实际值变化——跳过脏标记，等真正 receive 再说。
    if (source !== 'bindEdge') {
      ports.forEach(p => this.dirtyInputs.add(p.id))
      if (this.nodeState !== 'dirty') {
        // error 态收到新输入 → 真的"输入变了"，从 error 进 dirty
        this.nodeState = 'dirty'
        this.notifyChanged()
      }
    }
    this.inputPortReceiveValue(ports, source)
  }

  /**
   * 标为 running：子类开始异步重算前调（比如发 LLM 请求、调图片生成 API）。
   * 必须成对——结束后调 completeRun()（成功产出）或 failRun()（失败/无产出）。
   * 同步重算（CommandNode.inputPortReceiveValue 里的 recompute）不需要调，
   * 因为它没有异步间隙。
   *
   * 从 stable / dirty / error 都可以进 running（语义分别是"开始算之前的"、
   * "开始算新的"和"失败后重试"）。
   */
  protected beginRun(): void {
    if (this.nodeState === 'running') return
    // 锁住所有输入端口——running 期间上游变化被缓冲，解锁时统一 flush
    this.inputs.forEach(p => p.lock())
    this.nodeState = 'running'
    this.notifyChanged()
  }

  /**
   * 成功结束 run（或同步消化完输入）→ stable（如果期间输入没变）或 dirty（如果变了）。
   *
   * 不管之前是 running（异步节点成功收口）、dirty（同步节点消化完输入），
   * 还是 error（失败后手动重试成功），调 completeRun 都意味着
   * "输入已被消化、输出（或 UI 展示）已更新"。
   *
   * 解锁所有输入端口，把锁定期间缓冲的变化一次性派发。
   * 同步节点（展示/CommandNode 的同步 recompute）不需要调 beginRun 直接调这个。
   */
  protected completeRun(): void {
    // 先解锁端口，收集期间缓冲的变化（同步节点从未 lock 过，flush 回来是空数组）
    const dirtyPorts = this.flushLockedInputPorts()
    this.stableInputFingerprint = this.computeInputFingerprint()
    if (dirtyPorts.length === 0) {
      // 消化完毕、期间没新变化 → stable，清空脏集合
      this.dirtyInputs.clear()
      this.nodeState = 'stable'
    } else {
      // 刚消化完又有新变化进来了 → dirty，把 flush 出来的也加进脏集合
      dirtyPorts.forEach(p => this.dirtyInputs.add(p.id))
      this.nodeState = 'dirty'
    }
    this.notifyChanged()
    if (dirtyPorts.length > 0) {
      // 解锁出来的新变化 → 再通知子类消化一次（递归到稳定或再变 dirty）
      this.inputPortReceiveValue(dirtyPorts, 'receive')
    }
  }

  /**
   * 结束 run 但没产出 → error。
   * 典型场景：CodeNode 脚本抛异常、LLMNode API 返回错误、ImageGenNode 生成失败。
   * 输入没变，所以不该进 dirty；进 error 让渲染层画红框提示。
   * 同步节点也能用——比如尝试解析失败了。
   *
   * error 期间上游再推值，会在 _onInputPortChanged 里自动转 dirty（输入真的变了）；
   * 子类也可以 beginRun 从 error 再跑一次。
   */
  protected failRun(): void {
    if (this.nodeState !== 'stable') {
      const dirtyPorts = this.flushLockedInputPorts()
      dirtyPorts.forEach(p => this.dirtyInputs.add(p.id))
      if (dirtyPorts.length === 0) {
        // 计算挂了，但期间没有新输入 → error
        this.nodeState = 'error'
      } else {
        // 计算挂了 + 期间上游推了新值 → dirty（输入真的变了）
        this.nodeState = 'dirty'
      }
      this.notifyChanged()
      if (dirtyPorts.length > 0) {
        this.inputPortReceiveValue(dirtyPorts, 'receive')
      }
    }
  }

  /**
   * 解锁所有输入端口，收集锁定期间有变化的端口。
   * 每个端口调 unlockAndFlush() → 返回 true 表示有 pending 变化。
   */
  private flushLockedInputPorts(): InputPort[] {
    const dirty: InputPort[] = []
    this.inputs.forEach(p => {
      if (p.unlockAndFlush()) dirty.push(p)
    })
    return dirty
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

  get methodPorts(): readonly MethodPort[] {
    return this.methods
  }

  /**
   * 按 id 找一个「终点类端口」——普通输入端口或方法端口。
   * 边的 endPort 既可能是 InputPort 也可能是 MethodPort，调用方不用关心它混在哪个数组里。
   * 找不到返回 undefined。
   */
  findInputLikePort(portId: string): InputPort | undefined {
    return this.inputs.find(p => p.id === portId) ?? this.methods.find(p => p.id === portId)
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
   * 子类登记方法端口；运行时也可追加，会自动 notifyChanged 刷新 UI。
   *
   * 方法端口**不**加入 inputs 数组——它在渲染层位于底部而非左侧，
   * 断边逻辑由 Scene.disconnectNodeEdges 额外覆盖 methodPorts 来保证。
   */
  protected addMethod(port: MethodPort): void {
    port.setOwner(this)
    this.methods.push(port)
    this.notifyChanged()
  }

  /**
   * 运行时移除方法端口。自动断开所有 incoming 边（通过 Scene.removeEdge）。
   */
  protected removeMethod(port: MethodPort): void {
    const idx = this.methods.indexOf(port)
    if (idx === -1) return

    this.methods.splice(idx, 1)

    // 断边：MethodPort 继承 InputPort，也有 allBindEdge
    this.disconnectPortEdges(port.allBindEdge)
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

    // 断边
    this.disconnectPortEdges(port.allBindEdge)
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
   * 本节点的某个输出端口刚被连上一条新边。
   * EdgeBinder.connect 完成绑定时调用——边两端都已挂好，端口里有值的话子类按需补送。
   *
   * 默认行为：如果该输出端口当前有值，就 transferData 给下游。
   * 子类可以 override 关掉这个自动补送（比如 TextInputNode 的 auto-send: false 模式），
   * 或者加额外逻辑（比如手动节点连上就自动 commit 一次当前暂存值）。
   *
   * 这是通知钩子，不强制返回值——要不要发、发什么，由子类自己决定。
   */
  onOutputPortBind(outputPort: OutputPort, edge: Edge): void {
    if (outputPort.value !== undefined) {
      edge.transferData(outputPort.value)
    }
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
   * @param source 触发来源：上游推值 / 上游清空 / 新连线 / 断边。
   *              子类可据不同来源做差异化处理——比如 bindEdge 时只对齐端口类型，
   *              不立即重算；receive 时才触发完整计算。
   *
   * 可以返回 Promise——需要异步 IPC（如落盘）的节点 await 即可，基类不强同步。
   */
  abstract inputPortReceiveValue(ports: InputPort[], source: InputPortChangeSource): Promise<void> | void

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
   * 节点就绪钩子，异步。画布启动时由 bootstrapScene 在 addNode + readState + connect 全部完成后
   * 统一 await 一轮——此时端口已就绪、状态已恢复、边已重建，子类可以做最后一层异步初始化，
   * 比如 FileNode 子类从磁盘补读文件内容并 commit 输出端口。
   *
   * 基类空实现：大部分节点不需要额外初始化。节点自己抛出的错误会被 bootstrap 吞掉并打印警告，
   * 不应中断整个画布的加载（单个节点初始化失败不该拖垮整张画布）。
   */
  onReady(): Promise<void> | void {
    // 默认什么也不做
  }

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