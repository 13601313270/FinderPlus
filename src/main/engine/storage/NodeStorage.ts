import type { Node } from '../node/Node'
import type { Edge } from '../graph/Edge'

/**
 * 节点存储接口：Scene 在节点/边增删改时调它，实现类（如 SqliteStorage）做具体落盘。
 *
 * engine 层只声明契约，不知道 SQLite、sql.js、文件系统这些东西——
 * 想换 IndexedDB / JSON / 远程 API，写一个新实现类就行，Scene 不动。
 *
 * 所有方法的参数都用 engine 自身的类型（Node / Edge），不引入 main 进程依赖。
 * Scene 调时给 storage?.xxx()，storage 未挂就空转，渲染进程里的 Scene 不受影响。
 */
export interface NodeStorage {
  /** 新增或更新节点（UPSERT：按 id 冲突则更新） */
  saveNode(node: Node): void
  /** 删除节点（DB 层可 CASCADE 级联删相关边） */
  deleteNode(nodeId: string): void

  /** 新增或更新边。两端 node_id + port_id 由 Scene 传入——它们在 Scene.connect 时就知道 */
  saveEdge(params: {
    edge: Edge
    startNodeId: string
    startPortId: string
    endNodeId: string
    endPortId: string
  }): void
  /** 删除边 */
  deleteEdge(edge: Edge): void

  /** 保存视口（平移 + 缩放） */
  saveViewport(x: number, y: number, scale: number): void

  /** 批量清空画布的所有节点和边（一次调用，DB 层自己做事务） */
  clearAll?(): void
}
