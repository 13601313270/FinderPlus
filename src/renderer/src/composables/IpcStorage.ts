import type { Node } from '../../../main/engine/node/Node'
import type { Edge } from '../../../main/engine/graph/Edge'
import type { NodeStorage } from '../../../main/engine/storage/NodeStorage'

/**
 * IpcStorage：渲染进程里的 NodeStorage 实现，
 * 内部全部通过 preload 暴露的 window.canvasDeskDb 走 IPC，
 * 主进程接收到调用后转成 SqliteStorage 真正落盘。
 *
 * Scene 完全不知道 DB 存在——它只知道有个 storage 接口可以调。
 * 换一种存储实现（比如远程 API）只要再写一个实现类、换 attachStorage 参数就行。
 *
 * 注意：所有方法都是同步签名（符合 NodeStorage interface），但内部 IPC 是异步的。
 * 主进程 SqliteStorage 每次持久化调完 persist() 再 resolve，
 * 所以返回 true 时磁盘上已经更新好了。Scene 不关心这个时序——它只是触发保存。
 *
 * canvasId 在构造时绑定，实例化后不可变。默认 'default' 保持向后兼容。
 */
export class IpcStorage implements NodeStorage {
  constructor(private readonly canvasId: string = 'default') {}

  saveNode(node: Node): void {
    window.canvasDeskDb.saveNode({
      id: node.id,
      type: node.type,
      posX: node.position[0],
      posY: node.position[1],
      paramsJson: JSON.stringify(node.saveState()),
      canvasId: this.canvasId
    })
  }

  deleteNode(nodeId: string): void {
    window.canvasDeskDb.deleteNode({ nodeId, canvasId: this.canvasId })
  }

  saveEdge(params: {
    edge: Edge
    startNodeId: string
    startPortId: string
    endNodeId: string
    endPortId: string
  }): void {
    window.canvasDeskDb.saveEdge({
      id: params.edge.id,
      startNodeId: params.startNodeId,
      startPortId: params.startPortId,
      endNodeId: params.endNodeId,
      endPortId: params.endPortId,
      canvasId: this.canvasId
    })
  }

  deleteEdge(edge: Edge): void {
    window.canvasDeskDb.deleteEdge({ edgeId: edge.id, canvasId: this.canvasId })
  }

  saveViewport(x: number, y: number, scale: number): void {
    window.canvasDeskDb.saveViewport({ x, y, scale, canvasId: this.canvasId })
  }

  clearAll(): void {
    window.canvasDeskDb.clearCanvas({ canvasId: this.canvasId })
  }
}
