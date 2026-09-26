import type { InputPort } from '../port/InputPort'
import type { OutputPort } from '../port/OutputPort'
import type { Scene } from '../graph/Scene'

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
    port.setOwner(this)
    this.outputs.push(port)
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
   * @returns true = 本节点接管该被拖节点（不再视为普通移动）；false = 不处理
   */
  onNodeDrop(_source: Node): boolean {
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