import type { Value } from '../data/Value'
import type { Edge } from '../graph/Edge'
import type { Node } from '../node/Node'
import type { InputPort } from './InputPort'

/**
 * 输入端口管理器：挂在 Node 上，只负责**批量**数据的接收和通知合并。
 *
 * 与单条 Edge 路径完全解耦：
 * - 单条路径：OutputPort.commit → Edge.transferData → InputPort.receive（不走 Manager）
 * - 批量路径：EdgeBatch.transferData → InputPortManager.receiveBatch（只走 Manager）
 *
 * 这样两条路径互不干扰，Manager 只处理批量合并逻辑。
 */
export class InputPortManager {
  constructor(readonly owner: Node) {}

  /**
   * 批量入口：上游节点一次性提交多条边时调这个。
   * edges 和 values 长度必须一致，按索引一一对应。
   *
   * 内部先把所有值写入各 InputPort，然后统一做一次通知合并——
   * 把所有实际变化了的端口收集起来，一次性派发给 owner._onInputPortChanged([p1, p2, ...], 'receive')。
   */
  receiveBatch(edges: Edge[], values: Value[], force = false): void {
    if (edges.length !== values.length) {
      throw new Error('[InputPortManager.receiveBatch] edges 和 values 长度不一致')
    }

    // 第一步：先把所有值写入 InputPort，收集哪些端口实际变化了
    const changedPorts = new Set<InputPort>()
    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i]!
      const value = values[i]!
      const port = edge.endPort
      const changed = force || port.incoming.get(edge)?.fingerprint !== value.fingerprint
      port.incoming.set(edge, value)
      if (changed) {
        changedPorts.add(port)
      }
    }

    // 第二步：一次性通知下游节点
    if (changedPorts.size > 0) {
      const ports = [...changedPorts]
      this.owner._onInputPortChanged(ports, 'receive')
    }
  }

  /** 批量清空入口（对称预留） */
  receiveClearBatch(edges: Edge[]): void {
    const changedPorts = new Set<InputPort>()
    for (const edge of edges) {
      const port = edge.endPort
      const hadValue = port.incoming.get(edge) !== undefined
      port.incoming.set(edge, undefined)
      if (hadValue) {
        changedPorts.add(port)
      }
    }
    if (changedPorts.size > 0) {
      this.owner._onInputPortChanged([...changedPorts], 'receiveClear')
    }
  }

  /** 遍历当前所有输入端口，供外部查询 */
  getAllInputPorts(): readonly InputPort[] {
    return this.owner.inputPorts
  }
}
