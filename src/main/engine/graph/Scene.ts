import type { Node } from '../node/Node'
import type { Edge } from './Edge'
import { EdgeBinder, type ConnectResult } from './EdgeBinder'
import type { OutputPort } from '../port/OutputPort'
import type { InputPort } from '../port/InputPort'
import type { NodeStorage } from '../storage/NodeStorage'

/**
 * 场景：引擎的顶层容器，装下所有节点和它们之间的连线。
 * 命名避开「Canvas」，不跟浏览器 / H5 的 canvas 歧义。
 *
 * - 按节点 id 建索引（Map），getNode 是 O(1)；
 * - 连线逻辑收口在内部的 EdgeBinder，这里只负责把边收进自己的集合，
 *   connect / removeEdge 只是「登记 / 注销」，真正的绑定解绑仍走 EdgeBinder。
 * - removeNode 前先断开该节点牵涉的所有边，不留悬空引用。
 * - **图结构变化**（节点 / 连线的增删）由 onChanged 对外广播：引擎里这些集合都是
 *   普通字段，Vue 追踪不到，UI 靠这个订阅把「有哪些边」同步成响应式状态。
 *   节点的位置变化不走这里，那是 Node.onChanged 的职责。
 *
 * —— 持久化 ——
 * Scene 可选挂一个 NodeStorage（通过 attachStorage）。挂上后：
 * - addNode / removeNode / connect / removeEdge 里自动调 storage 做增删落库；
 * - 每个已登记节点的 Node.onChanged 都会 debounce 调 storage.saveNode，
 *   位置变化、参数变化都从这一条路进 DB，不需要渲染进程写 AutoSaver。
 * 存储实现（SqliteStorage）在 main 进程，渲染进程里的 Scene 没挂 storage 就空转，
 * 纯逻辑容器照常工作。
 */
export class Scene {
  private readonly nodesById = new Map<string, Node>()
  private readonly edges = new Set<Edge>()
  private readonly edgesBinder = new EdgeBinder()

  /** 结构变化订阅者。UI 靠它知道「图变了，重新读一次集合」 */
  private readonly listeners = new Set<() => void>()

  /** 可选的持久化实现。未挂时所有存库调用空转 */
  private storage?: NodeStorage

  /** 每个节点的 debounce 定时器（节点 onChanged → debounce → saveNode） */
  private readonly persistTimers = new Map<string, ReturnType<typeof setTimeout>>()

  /** 已登记持久化的节点集合（避免对同一节点重复注册 onChanged） */
  private readonly persistRegistered = new Set<string>()

  /** 订阅图结构变化（节点 / 连线增删），返回取消订阅函数 */
  onChanged(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  /**
   * 挂持久化实现。挂上后：
   * - 当前已有的所有节点都会注册 onChanged → debounce → saveNode；
   * - 之后 addNode 自动做同样注册；
   * - 增删节点/边会立刻调用 storage 做对应操作。
   */
  attachStorage(storage: NodeStorage): void {
    this.storage = storage
    // 已有节点全部登记
    for (const node of this.nodesById.values()) {
      this.registerNodePersistence(node)
    }
  }

  addNode(node: Node): void {
    if (this.nodesById.has(node.id)) {
      throw new Error(`[Scene] duplicate node id: ${node.id}`)
    }
    node.bindScene(this)
    this.nodesById.set(node.id, node)
    this.storage?.saveNode(node)
    this.registerNodePersistence(node)
    this.notifyChanged()
  }

  removeNode(node: Node): void {
    if (!this.nodesById.has(node.id)) return
    this.disconnectNodeEdges(node)
    this.nodesById.delete(node.id)
    this.storage?.deleteNode(node.id)
    this.unregisterNodePersistence(node.id)
    this.notifyChanged()
  }

  /** 按 id 取节点，找不到返回 undefined，由调用方兜底 */
  getNode(id: string): Node | undefined {
    return this.nodesById.get(id)
  }

  hasNode(id: string): boolean {
    return this.nodesById.has(id)
  }

  /** 所有节点的只读快照，供遍历 / 序列化 */
  get allNodes(): readonly Node[] {
    return [...this.nodesById.values()]
  }

  /** 建立连线：委托给内部 EdgeBinder，成环检测由上层在调用前自行判断。
   *  edgeId 可选传入——从 DB 恢复时必须用存储的 id，正常连边不传则自动生成。 */
  connect(startPort: OutputPort, endPort: InputPort, edgeId?: string): ConnectResult {
    const result = this.edgesBinder.connect(startPort, endPort, edgeId)
    if (result.ok) {
      this.edges.add(result.edge)
      const startNodeId = startPort.getOwner()?.id ?? ''
      const endNodeId = endPort.getOwner()?.id ?? ''
      this.storage?.saveEdge({
        edge: result.edge,
        startNodeId,
        startPortId: startPort.id,
        endNodeId,
        endPortId: endPort.id
      })
      this.notifyChanged()
    }
    return result
  }

  /** 断开连线并注销该边 */
  removeEdge(edge: Edge): void {
    this.edgesBinder.disconnect(edge)
    this.edges.delete(edge)
    this.storage?.deleteEdge(edge)
    this.notifyChanged()
  }

  get allEdges(): readonly Edge[] {
    return [...this.edges]
  }

  /** 保存视口：平移 + 缩放 */
  saveViewport(x: number, y: number, scale: number): void {
    this.storage?.saveViewport(x, y, scale)
  }

  /** 广播「图结构变了」。只报「变了」这个事实，具体变更由订阅方自己重读集合 */
  private notifyChanged(): void {
    this.listeners.forEach((fn) => fn())
  }

  /** 断开与某节点端口相连的所有边。节点移除前必须做，避免悬空引用 */
  private disconnectNodeEdges(node: Node): void {
    const portSet = new Set([...node.outputPorts, ...node.inputPorts])
    const toRemove = [...this.edges].filter(
      (edge) => portSet.has(edge.startPort) || portSet.has(edge.endPort)
    )
    for (const edge of toRemove) this.removeEdge(edge)
  }

  /**
   * 给节点挂一个 debounced 的 saveNode。节点 onChanged 触发（位置变 / 参数变）时
   * 不清前一个定时器、重置 200ms 后落库，避免拖拽时高频写磁盘。
   */
  private registerNodePersistence(node: Node): void {
    if (this.persistRegistered.has(node.id)) return
    this.persistRegistered.add(node.id)

    node.onChanged(() => {
      const existing = this.persistTimers.get(node.id)
      if (existing) clearTimeout(existing)
      const timer = setTimeout(() => {
        this.persistTimers.delete(node.id)
        if (this.nodesById.has(node.id)) {
          this.storage?.saveNode(node)
        }
      }, 200)
      this.persistTimers.set(node.id, timer)
    })
  }

  /** 节点被 removeNode 调用时，清掉它的 debounce 定时器和注册记录 */
  private unregisterNodePersistence(nodeId: string): void {
    const timer = this.persistTimers.get(nodeId)
    if (timer) {
      clearTimeout(timer)
      this.persistTimers.delete(nodeId)
    }
    this.persistRegistered.delete(nodeId)
  }
}