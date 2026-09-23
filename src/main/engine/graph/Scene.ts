import type { Node } from '../node/Node'
import type { Edge } from './Edge'
import { EdgeBinder, type ConnectResult } from './EdgeBinder'
import type { OutputPort } from '../port/OutputPort'
import type { InputPort } from '../port/InputPort'

/**
 * 场景：引擎的顶层容器，装下所有节点和它们之间的连线。
 * 命名避开「Canvas」，不跟浏览器 / H5 的 canvas 歧义。
 *
 * - 按节点 id 建索引（Map），getNode 是 O(1)；
 * - 连线逻辑收口在内部的 EdgeBinder，这里只负责把边收进自己的集合，
 *   connect / removeEdge 只是「登记 / 注销」，真正的绑定解绑仍走 EdgeBinder。
 * - removeNode 前先断开该节点牵涉的所有边，不留悬空引用。
 */
export class Scene {
  private readonly nodesById = new Map<string, Node>()
  private readonly edges = new Set<Edge>()
  private readonly edgesBinder = new EdgeBinder()

  addNode(node: Node): void {
    if (this.nodesById.has(node.id)) {
      throw new Error(`[Scene] duplicate node id: ${node.id}`)
    }
    this.nodesById.set(node.id, node)
  }

  removeNode(node: Node): void {
    if (!this.nodesById.has(node.id)) return
    this.disconnectNodeEdges(node)
    this.nodesById.delete(node.id)
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

  /** 建立连线：委托给内部 EdgeBinder，成环检测由上层在调用前自行判断 */
  connect(startPort: OutputPort, endPort: InputPort): ConnectResult {
    const result = this.edgesBinder.connect(startPort, endPort)
    if (result.ok) this.edges.add(result.edge)
    return result
  }

  /** 断开连线并注销该边 */
  removeEdge(edge: Edge): void {
    this.edgesBinder.disconnect(edge)
    this.edges.delete(edge)
  }

  get allEdges(): readonly Edge[] {
    return [...this.edges]
  }

  /** 断开与某节点端口相连的所有边。节点移除前必须做，避免悬空引用 */
  private disconnectNodeEdges(node: Node): void {
    const portSet = new Set([...node.outputPorts, ...node.inputPorts])
    const toRemove = [...this.edges].filter(
      (edge) => portSet.has(edge.startPort) || portSet.has(edge.endPort)
    )
    for (const edge of toRemove) this.removeEdge(edge)
  }
}